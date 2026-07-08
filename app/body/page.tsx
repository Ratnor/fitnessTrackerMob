"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { seedIfEmpty } from "@/src/db/seed";
import { BodyRepository } from "@/src/repositories/BodyRepository";
import {
  BodyService,
  type TrendPoint,
  type RecompSignal,
} from "@/src/services/BodyService";
import { localDateString } from "@/src/services/ScheduleService";
import type { BodyReading } from "@/src/types";

const bodyRepo = new BodyRepository();
const bodyService = new BodyService(bodyRepo);

function Sparkline({
  points,
  stroke,
}: {
  points: TrendPoint[];
  stroke: string;
}) {
  if (points.length < 2)
    return (
      <p className="py-4 text-center text-xs text-neutral-600">
        Not enough data to chart yet
      </p>
    );
  const vs = points.map((p) => p.v);
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const range = max - min || 1;
  const W = 320;
  const H = 64;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((p.v - min) / range) * (H - 8) - 4;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full">
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" />
      </svg>
      <div className="flex justify-between text-[10px] text-neutral-600">
        <span>
          {points[0].d} · {points[0].v}
        </span>
        <span>
          {points[points.length - 1].d} · {points[points.length - 1].v}
        </span>
      </div>
    </div>
  );
}

export default function Body() {
  const [latest, setLatest] = useState<BodyReading | null>(null);
  const [weightTrend, setWeightTrend] = useState<TrendPoint[]>([]);
  const [waistTrend, setWaistTrend] = useState<TrendPoint[]>([]);
  const [recomp, setRecomp] = useState<RecompSignal | null>(null);
  const [saved, setSaved] = useState(false);

  // form
  const [weight, setWeight] = useState("");
  const [waist, setWaist] = useState("");
  const [hip, setHip] = useState("");
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    setLatest(await bodyRepo.getLatest());
    setWeightTrend(await bodyService.getWeightTrend(30));
    setWaistTrend(await bodyService.getWaistTrend());
    setRecomp(await bodyService.getRecompSignal());
  }, []);

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      await refresh();
    })();
  }, [refresh]);

  async function save() {
    const w = parseFloat(weight);
    const wa = parseFloat(waist);
    const hi = parseFloat(hip);
    if (isNaN(w) && isNaN(wa) && isNaN(hi)) return;

    const now = new Date();
    await bodyService.upsertReading({
      d: localDateString(now),
      ...(isNaN(w) ? {} : { w }),
      ...(isNaN(wa) ? {} : { waist: wa }),
      ...(isNaN(hi) ? {} : { hip: hi }),
      reading_time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      note: note.trim() || undefined,
    });
    setWeight("");
    setWaist("");
    setHip("");
    setNote("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await refresh();
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Body</h1>
        <Link href="/" className="text-sm text-neutral-400 underline">
          Done
        </Link>
      </header>

      {/* Manual entry — Wednesday AM ritual */}
      <section className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Log reading · {localDateString()}
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          Morning, before food & water. Tape at navel, relaxed. Weight can also
          arrive via the Import screen (Apple Health Shortcut).
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div>
            <p className="mb-1 text-center text-xs text-neutral-500">
              Weight lb
            </p>
            <input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-center text-lg font-bold"
            />
          </div>
          <div>
            <p className="mb-1 text-center text-xs text-neutral-500">
              Waist cm
            </p>
            <input
              inputMode="decimal"
              value={waist}
              onChange={(e) => setWaist(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-center text-lg font-bold"
            />
          </div>
          <div>
            <p className="mb-1 text-center text-xs text-neutral-500">Hip cm</p>
            <input
              inputMode="decimal"
              value={hip}
              onChange={(e) => setHip(e.target.value)}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-center text-lg font-bold"
            />
          </div>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="note (optional)"
          className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
        <button
          onClick={save}
          className="mt-3 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white active:bg-emerald-500"
        >
          {saved ? "Saved ✓" : "Save reading"}
        </button>
      </section>

      {/* Recomp signal */}
      {recomp && (
        <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Recomp signal
          </h2>
          <p className="mt-2 text-sm">{recomp.text}</p>
        </section>
      )}

      {/* Trends */}
      <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Weight · last 30 readings
        </h2>
        <Sparkline points={weightTrend} stroke="#38bdf8" />
      </section>

      <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Waist cm
        </h2>
        <Sparkline points={waistTrend} stroke="#34d399" />
      </section>

      {latest && (
        <p className="mt-4 text-center text-xs text-neutral-500">
          Latest: {latest.w} lb on {latest.d}
          {latest.waist != null && ` · waist ${latest.waist} cm`}
          {latest.bf != null && ` · BF ${latest.bf}% (trend only)`}
        </p>
      )}
    </main>
  );
}
