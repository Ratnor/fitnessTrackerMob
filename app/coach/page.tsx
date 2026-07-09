"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { seedIfEmpty } from "@/src/db/seed";
import { WorkoutRepository } from "@/src/repositories/WorkoutRepository";
import { BodyRepository } from "@/src/repositories/BodyRepository";
import { HealthRepository } from "@/src/repositories/HealthRepository";
import { DietRepository } from "@/src/repositories/DietRepository";
import { PantryRepository } from "@/src/repositories/PantryRepository";
import { NotesRepository } from "@/src/repositories/NotesRepository";
import { CoachService, estimateTokens } from "@/src/services/CoachService";
import { ScheduleService } from "@/src/services/ScheduleService";

const coachService = new CoachService(
  new WorkoutRepository(),
  new BodyRepository(),
  new HealthRepository(),
  new DietRepository(),
  new PantryRepository(),
  new NotesRepository()
);
const scheduleService = new ScheduleService();

export default function Coach() {
  const [context, setContext] = useState<string | null>(null);
  const [tokens, setTokens] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await seedIfEmpty();
        const data = await coachService.gather(scheduleService.getDayPlan());
        const text = coachService.assemble(data);
        setContext(text);
        setTokens(estimateTokens(text));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function copyToClipboard() {
    if (!context) return;
    await navigator.clipboard.writeText(context);
    showToast("Copied — paste into Claude.ai");
  }

  async function share() {
    if (!context) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: context });
      } catch {
        // user cancelled the share sheet — not an error
      }
    } else {
      await copyToClipboard();
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Coach</h1>
        <Link href="/" className="text-sm text-neutral-400 underline">
          Done
        </Link>
      </header>

      <p className="mt-2 text-sm text-neutral-400">
        One tap assembles your last 7 sessions, body + recovery trends, diet,
        and pantry into a Claude-ready prompt. Share it to the Claude app, ask
        your question, get coached.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {context && (
        <>
          <button
            onClick={share}
            className="mt-5 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white active:bg-emerald-500"
          >
            Ask the coach
          </button>
          <button
            onClick={copyToClipboard}
            className="mt-2 w-full rounded-xl border border-neutral-700 bg-neutral-800 py-3 font-semibold active:bg-neutral-700"
          >
            Copy to clipboard
          </button>

          {toast && (
            <div className="mt-3 rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-center text-sm text-emerald-300">
              {toast}
            </div>
          )}

          <section className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
                Preview
              </h2>
              <span
                className={`text-xs ${tokens > 8000 ? "text-red-400" : "text-neutral-500"}`}
              >
                ~{tokens.toLocaleString()} tokens
                {tokens > 8000 && " — over 8k budget!"}
              </span>
            </div>
            <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-[10px] leading-relaxed text-neutral-400">
              {context}
            </pre>
          </section>
        </>
      )}
    </main>
  );
}
