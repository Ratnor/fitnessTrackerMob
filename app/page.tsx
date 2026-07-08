"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { seedIfEmpty } from "@/src/db/seed";
import { WorkoutRepository } from "@/src/repositories/WorkoutRepository";
import { HealthRepository } from "@/src/repositories/HealthRepository";
import { DietRepository } from "@/src/repositories/DietRepository";
import {
  ScheduleService,
  localDateString,
  type DayPlan,
} from "@/src/services/ScheduleService";
import {
  WorkoutService,
  type TodayTargets,
} from "@/src/services/WorkoutService";
import {
  HealthService,
  type RecoveryStatus,
  type Signal,
} from "@/src/services/HealthService";

const PROTEIN_TARGET = 130;
const PROTEIN_IDEAL = 160;

const scheduleService = new ScheduleService();
const workoutService = new WorkoutService(new WorkoutRepository());
const healthService = new HealthService(new HealthRepository());
const dietRepo = new DietRepository();

const BADGE_STYLE: Record<string, string> = {
  PUSH: "bg-emerald-900 text-emerald-300 border-emerald-700",
  PULL: "bg-sky-900 text-sky-300 border-sky-700",
  LEGS: "bg-violet-900 text-violet-300 border-violet-700",
  BJJ: "bg-amber-900 text-amber-300 border-amber-700",
  REST: "bg-neutral-800 text-neutral-300 border-neutral-600",
};

const SIGNAL_DOT: Record<Signal, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  unknown: "bg-neutral-600",
};

const SIGNAL_BORDER: Record<Signal, string> = {
  green: "border-emerald-800",
  amber: "border-amber-700",
  red: "border-red-800",
  unknown: "border-neutral-800",
};

export default function TodayDashboard() {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [recovery, setRecovery] = useState<RecoveryStatus | null>(null);
  const [targets, setTargets] = useState<TodayTargets | null>(null);
  const [proteinToday, setProteinToday] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await seedIfEmpty();

        const today = new Date();
        const dayPlan = scheduleService.getDayPlan(today);
        setPlan(dayPlan);

        setRecovery(await healthService.getRecoveryStatus());

        if (dayPlan.split) {
          setTargets(await workoutService.getTodayTargets(dayPlan.split));
        }

        const diet = await dietRepo.getByDate(localDateString(today));
        setProteinToday(
          diet ? diet.meals.reduce((s, m) => s + m.p, 0) || diet.p_tot : 0
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const dateLabel = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const proteinPct = Math.min(100, (proteinToday / PROTEIN_TARGET) * 100);

  return (
    <main className="mx-auto max-w-md px-4 py-8 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="mt-0.5 text-sm text-neutral-400">{dateLabel}</p>
        </div>
        {plan && (
          <span
            className={`rounded-full border px-4 py-1.5 text-sm font-bold tracking-wide ${BADGE_STYLE[plan.dayType]}`}
          >
            {plan.dayType}
          </span>
        )}
      </header>

      {error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Recovery card */}
      {recovery && (
        <section
          className={`mt-6 rounded-xl border bg-neutral-900 p-4 ${SIGNAL_BORDER[recovery.overall]}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-3 w-3 rounded-full ${SIGNAL_DOT[recovery.overall]}`}
            />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Recovery{recovery.date ? ` · ${recovery.date}` : ""}
            </h2>
          </div>
          <p className="mt-2 text-sm">{recovery.summary}</p>
          {recovery.overall !== "unknown" && (
            <ul className="mt-3 space-y-1.5 text-sm text-neutral-300">
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${SIGNAL_DOT[recovery.hrv.signal]}`} />
                HRV {recovery.hrv.value ?? "—"} ms
                {recovery.hrv.avg7 != null && (
                  <span className="text-neutral-500">
                    (7d avg {recovery.hrv.avg7.toFixed(0)})
                  </span>
                )}
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${SIGNAL_DOT[recovery.restingHr.signal]}`} />
                Resting HR {recovery.restingHr.value ?? "—"} bpm
                {recovery.restingHr.avg7 != null && (
                  <span className="text-neutral-500">
                    (7d avg {recovery.restingHr.avg7.toFixed(0)})
                  </span>
                )}
              </li>
              <li className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${SIGNAL_DOT[recovery.sleep.signal]}`} />
                Sleep {recovery.sleep.hours ?? "—"} h
              </li>
            </ul>
          )}
        </section>
      )}

      {/* Day plan / training card */}
      {plan && (
        <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            {plan.headline}
          </h2>

          {targets && (
            <div className="mt-3 space-y-3">
              {targets.exercises.map((ex) => (
                <div
                  key={ex.name}
                  className="rounded-lg bg-neutral-950 px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-semibold">{ex.name}</span>
                    {ex.lastSets && (
                      <span className="whitespace-nowrap text-sm text-neutral-400">
                        {ex.lastSets.map(([w, r]) => `${w}×${r}`).join(" ")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {ex.target}
                    {ex.lastDate && ` · last ${ex.lastDate}`}
                  </p>
                </div>
              ))}
              {targets.lastSessionDate && (
                <p className="text-xs text-neutral-500">
                  Last {targets.split} session: {targets.lastSessionDate}
                </p>
              )}
            </div>
          )}

          <ul className="mt-3 space-y-1 text-sm text-neutral-400">
            {plan.notes.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Protein card */}
      <section className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Protein
          </h2>
          <span className="text-sm">
            <b>{proteinToday}</b>
            <span className="text-neutral-500">
              {" "}/ {PROTEIN_TARGET}g (ideal {PROTEIN_IDEAL})
            </span>
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full transition-all ${
              proteinToday >= PROTEIN_TARGET ? "bg-emerald-500" : "bg-sky-500"
            }`}
            style={{ width: `${proteinPct}%` }}
          />
        </div>
        {proteinToday === 0 && (
          <p className="mt-2 text-xs text-neutral-500">
            Nothing logged today — shake is the anchor: delayed is fine,
            skipped is not.
          </p>
        )}
      </section>

      <footer className="mt-8 text-center">
        <Link href="/debug" className="text-xs text-neutral-600 underline">
          data layer debug
        </Link>
      </footer>
    </main>
  );
}
