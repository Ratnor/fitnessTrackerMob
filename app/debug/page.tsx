"use client";

import { useEffect, useState } from "react";
import { seedIfEmpty, type SeedResult } from "@/src/db/seed";
import { WorkoutRepository } from "@/src/repositories/WorkoutRepository";
import { BodyRepository } from "@/src/repositories/BodyRepository";
import type { BodyReading, LastSet } from "@/src/types";

const workoutRepo = new WorkoutRepository();
const bodyRepo = new BodyRepository();

export default function Debug() {
  const [seed, setSeed] = useState<SeedResult | null>(null);
  const [latestBody, setLatestBody] = useState<BodyReading | null>(null);
  const [lastIncline, setLastIncline] = useState<LastSet | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await seedIfEmpty();
        setSeed(result);
        setLatestBody(await bodyRepo.getLatest());
        setLastIncline(
          await workoutRepo.getLastSetForExercise("Incline DB Press")
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold">Debug</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Data layer verification (Phase 1)
      </p>

      {error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {seed && (
        <>
          <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
              IndexedDB · fitness-tracker
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <li>Workouts: <b>{seed.counts.workouts}</b></li>
              <li>Body: <b>{seed.counts.body}</b></li>
              <li>Diet: <b>{seed.counts.diet}</b></li>
              <li>Notes: <b>{seed.counts.notes}</b></li>
              <li>Pantry: <b>{seed.counts.pantry}</b></li>
              <li>Health: <b>{seed.counts.health}</b></li>
            </ul>
          </section>

          {latestBody && (
            <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Latest body reading
              </h2>
              <p className="mt-2 text-lg font-semibold">
                {latestBody.w} lb
                <span className="ml-2 text-sm font-normal text-neutral-400">
                  {latestBody.d}
                </span>
              </p>
            </section>
          )}

          {lastIncline && (
            <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Ghost check · Incline DB Press
              </h2>
              <p className="mt-2 text-lg font-semibold">
                {lastIncline.sets.map(([w, r]) => `${w}×${r}`).join(", ")}
              </p>
              <p className="text-sm text-neutral-400">
                Last session {lastIncline.date} ({lastIncline.equipment})
              </p>
            </section>
          )}
        </>
      )}
    </main>
  );
}
