"use client";

import { useState } from "react";
import Link from "next/link";
import { HealthRepository } from "@/src/repositories/HealthRepository";
import { BodyRepository } from "@/src/repositories/BodyRepository";
import { BodyService } from "@/src/services/BodyService";
import type { HealthSnapshot } from "@/src/types";

const healthRepo = new HealthRepository();
const bodyService = new BodyService(new BodyRepository());

/** Shortcut export format — dev plan §1.4 */
interface ShortcutExport {
  date?: string;
  recovery?: {
    hrv_ms?: number;
    hrv_7day_avg?: number;
    resting_hr_bpm?: number;
    sleep_hours?: number;
    sleep_deep_hours?: number;
    sleep_rem_hours?: number;
    respiratory_rate?: number;
  };
  body?: {
    weight_lb?: number;
    body_fat_pct?: number;
    muscle_mass_lb?: number;
    waist_cm?: number;
  };
  activity_yesterday?: {
    active_kcal?: number;
    steps?: number;
    exercise_min?: number;
    bjj_logged?: boolean;
  };
  fitness?: { vo2max?: number };
}

export default function Import() {
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState<ShortcutExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  function parse() {
    setError(null);
    setSavedMsg(null);
    try {
      const obj = JSON.parse(raw) as ShortcutExport;
      if (!obj.date || !/^\d{4}-\d{2}-\d{2}$/.test(obj.date)) {
        throw new Error('Missing or invalid "date" (expected YYYY-MM-DD)');
      }
      setParsed(obj);
    } catch (e) {
      setParsed(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function save() {
    if (!parsed?.date) return;
    const r = parsed.recovery ?? {};
    const a = parsed.activity_yesterday ?? {};

    const snapshot: HealthSnapshot = {
      d: parsed.date,
      hrv_ms: r.hrv_ms ?? null,
      hrv_7day_avg: r.hrv_7day_avg ?? null,
      resting_hr_bpm: r.resting_hr_bpm ?? null,
      sleep_hours: r.sleep_hours ?? null,
      sleep_deep_hours: r.sleep_deep_hours ?? null,
      sleep_rem_hours: r.sleep_rem_hours ?? null,
      respiratory_rate: r.respiratory_rate ?? null,
      active_kcal: a.active_kcal ?? null,
      steps: a.steps ?? null,
      exercise_min: a.exercise_min ?? null,
      bjj_logged: a.bjj_logged ?? false,
      vo2max: parsed.fitness?.vo2max ?? null,
    };
    await healthRepo.save(snapshot);

    let bodyMsg = "";
    const b = parsed.body;
    if (b && (b.weight_lb != null || b.waist_cm != null)) {
      await bodyService.upsertReading({
        d: parsed.date,
        ...(b.weight_lb != null ? { w: b.weight_lb } : {}),
        ...(b.body_fat_pct != null ? { bf: b.body_fat_pct } : {}),
        ...(b.muscle_mass_lb != null ? { mm: b.muscle_mass_lb } : {}),
        ...(b.waist_cm != null ? { waist: b.waist_cm } : {}),
        note: "imported via Apple Health Shortcut",
      });
      bodyMsg = " + body reading";
    }

    setSavedMsg(`Saved health snapshot${bodyMsg} for ${parsed.date} ✓`);
    setParsed(null);
    setRaw("");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Import · Apple Health</h1>
        <Link href="/" className="text-sm text-neutral-400 underline">
          Done
        </Link>
      </header>

      <p className="mt-2 text-sm text-neutral-400">
        Run the <b>Health Export</b> Shortcut (see SHORTCUT_GUIDE.md), then
        paste the JSON from your clipboard here.
      </p>

      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        placeholder='{"date":"2026-07-08","recovery":{...},"body":{...}}'
        rows={8}
        className="mt-4 w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-xs"
      />

      <button
        onClick={parse}
        disabled={!raw.trim()}
        className="mt-3 w-full rounded-xl border border-neutral-700 bg-neutral-800 py-3 font-bold disabled:opacity-40"
      >
        Preview
      </button>

      {error && (
        <div className="mt-3 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-sm text-emerald-300">
          {savedMsg}
        </div>
      )}

      {parsed && (
        <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Preview · {parsed.date}
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            {parsed.recovery?.hrv_ms != null && (
              <li>HRV {parsed.recovery.hrv_ms} ms</li>
            )}
            {parsed.recovery?.resting_hr_bpm != null && (
              <li>Resting HR {parsed.recovery.resting_hr_bpm} bpm</li>
            )}
            {parsed.recovery?.sleep_hours != null && (
              <li>Sleep {parsed.recovery.sleep_hours} h</li>
            )}
            {parsed.body?.weight_lb != null && (
              <li>Weight {parsed.body.weight_lb} lb</li>
            )}
            {parsed.body?.waist_cm != null && (
              <li>Waist {parsed.body.waist_cm} cm</li>
            )}
            {parsed.body?.body_fat_pct != null && (
              <li>BF {parsed.body.body_fat_pct}% (trend only)</li>
            )}
            {parsed.activity_yesterday?.steps != null && (
              <li>Steps yesterday {parsed.activity_yesterday.steps}</li>
            )}
            {parsed.activity_yesterday?.bjj_logged && <li>BJJ logged ✓</li>}
            {parsed.fitness?.vo2max != null && (
              <li>VO2 max {parsed.fitness.vo2max}</li>
            )}
          </ul>
          <button
            onClick={save}
            className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white active:bg-emerald-500"
          >
            Save to tracker
          </button>
        </section>
      )}
    </main>
  );
}
