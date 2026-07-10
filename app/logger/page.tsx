"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { seedIfEmpty } from "@/src/db/seed";
import { WorkoutRepository } from "@/src/repositories/WorkoutRepository";
import { ScheduleService } from "@/src/services/ScheduleService";
import { WorkoutService } from "@/src/services/WorkoutService";
import {
  SessionLogService,
  restSecondsFor,
} from "@/src/services/SessionLogService";
import type { WorkoutSession, Equipment, LastSet } from "@/src/types";

const workoutRepo = new WorkoutRepository();
const workoutService = new WorkoutService(workoutRepo);
const logService = new SessionLogService(workoutRepo);
const scheduleService = new ScheduleService();

const EQUIPMENT_OPTIONS: Equipment[] = [
  "db",
  "cable",
  "machine",
  "bb",
  "bw",
  "plate",
  "tbar",
];

interface ActiveExercise {
  name: string;
  equipment: Equipment;
  ghost: LastSet | null;
}

export default function Logger() {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [active, setActive] = useState<ActiveExercise | null>(null);
  const [weight, setWeight] = useState<string>("");
  const [reps, setReps] = useState<string>("");
  const [warmup, setWarmup] = useState(false);
  const [customName, setCustomName] = useState("");
  const [restLeft, setRestLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCardio, setShowCardio] = useState(false);
  const [cardioKm, setCardioKm] = useState("");
  const [cardioMin, setCardioMin] = useState("");
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // iOS requires a user gesture to unlock audio — call this from tap handlers
  function ensureAudio() {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      if (audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    } catch {
      // no audio available — vibration still fires
    }
  }

  function beep() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      [0, 0.25, 0.5].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.2);
      });
    } catch {
      // ignore
    }
  }

  // --- init: seed, resume-or-create today's session, suggest exercises ---
  useEffect(() => {
    (async () => {
      try {
        await seedIfEmpty();
        const plan = scheduleService.getDayPlan();
        const s = await logService.getOrCreateToday(plan.split ?? "push");
        setSession({ ...s });
        // Suggestions follow the SESSION's split (it may be swapped),
        // never the calendar's default for today.
        const effectiveSplit = ["push", "pull", "legs"].includes(s.split)
          ? s.split
          : (plan.split ?? "push");
        const t = await workoutService.getTodayTargets(effectiveSplit);
        setSuggested(t.exercises.map((e) => e.name));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  // --- screen wake lock: acquire on mount, reacquire on tab focus ---
  useEffect(() => {
    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request("screen");
        }
      } catch {
        // wake lock is best-effort — ignore rejection (e.g. low battery mode)
      }
    }
    acquire();
    const onVisible = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  // --- rest timer ---
  const startRest = useCallback((seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestLeft(seconds);
    timerRef.current = setInterval(() => {
      setRestLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
          beep();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- split override (missed a day? train any split today) ---
  async function changeSplit(split: string) {
    if (!session || session.split === split) return;
    const updated = await logService.setSplit(session, split);
    setSession({ ...updated });
    const t = await workoutService.getTodayTargets(split);
    setSuggested(t.exercises.map((e) => e.name));
  }

  async function saveCardio() {
    if (!session) return;
    const km = parseFloat(cardioKm);
    const min = parseFloat(cardioMin);
    if (isNaN(min) || min <= 0) return;
    const updated = await logService.setCardio(session, {
      type: "treadmill",
      km: isNaN(km) ? 0 : km,
      min,
    });
    setSession({ ...updated });
    setShowCardio(false);
    setCardioKm("");
    setCardioMin("");
  }

  // --- exercise selection ---
  async function openExercise(name: string) {
    const ghost = await workoutRepo.getLastSetForExercise(name);
    const equipment = ghost?.equipment ?? "db";
    setActive({ name, equipment, ghost });
    // Prefill from this session's last set, else ghost's first working set
    const current = session?.ex.find((e) => e.n === name);
    const lastThisSession = current?.sets[current.sets.length - 1];
    const prefill = lastThisSession ?? ghost?.sets[0];
    setWeight(prefill ? String(prefill[0]) : "");
    setReps(prefill ? String(prefill[1]) : "10");
    setWarmup(false);
  }

  // --- log a set: writes to IndexedDB immediately ---
  async function logSet() {
    if (!session || !active) return;
    ensureAudio(); // user gesture — unlocks the rest-timer beep on iOS
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (isNaN(w) || isNaN(r) || r < 0) {
      setError("Enter a valid weight and reps");
      return;
    }
    setError(null);
    const updated = warmup
      ? await logService.logWarmup(session, active.name, active.equipment, w, r)
      : await logService.logSet(session, active.name, active.equipment, w, r);
    setSession({ ...updated });
    if ("vibrate" in navigator) navigator.vibrate(50);
    if (!warmup) startRest(restSecondsFor(active.name));
    setWarmup(false);
  }

  async function undoSet() {
    if (!session || !active) return;
    const updated = await logService.undoLastSet(session, active.name);
    setSession({ ...updated });
  }

  const activeLogged = session?.ex.find((e) => e.n === active?.name);
  const totalSets = session?.ex.reduce((n, e) => n + e.sets.length, 0) ?? 0;

  function bump(setter: (v: string) => void, current: string, delta: number) {
    const v = parseFloat(current || "0") + delta;
    setter(String(Math.max(0, v)));
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            Log · {session?.split ?? "…"} day
          </h1>
          <p className="text-xs text-neutral-500">
            {session?.d} · {totalSets} sets logged · saved on every set
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-400 underline">
          Done
        </Link>
      </header>

      {error && (
        <div className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Rest timer banner */}
      {restLeft !== null && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-xl border border-sky-700 bg-sky-950 px-3 py-2.5">
          <button
            onClick={() => setRestLeft((p) => (p === null ? null : p + 30))}
            className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-300"
          >
            +30s
          </button>
          <span className="font-mono text-2xl font-bold text-sky-200">
            {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2, "0")}
          </span>
          <button
            onClick={() => {
              if (timerRef.current) clearInterval(timerRef.current);
              setRestLeft(null);
            }}
            className="rounded-lg border border-sky-700 px-3 py-2 text-sm font-semibold text-sky-300"
          >
            skip
          </button>
        </div>
      )}

      {/* Split override chips */}
      {!active && session && (
        <div className="mt-4 flex gap-2">
          {["push", "pull", "legs"].map((s) => (
            <button
              key={s}
              onClick={() => changeSplit(s)}
              className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold capitalize ${
                session.split === s
                  ? "border-emerald-600 bg-emerald-950 text-emerald-300"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Warm-up cardio */}
      {!active && session && (
        <div className="mt-4">
          {session.cardio && !Array.isArray(session.cardio) ? (
            <button
              onClick={() => {
                setShowCardio(true);
                if (session.cardio && !Array.isArray(session.cardio)) {
                  setCardioKm(String(session.cardio.km));
                  setCardioMin(String(session.cardio.min));
                }
              }}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-left text-sm text-neutral-400"
            >
              Warm-up: {session.cardio.type} {session.cardio.km} km ·{" "}
              {session.cardio.min} min <span className="text-xs">(edit)</span>
            </button>
          ) : !showCardio ? (
            <button
              onClick={() => setShowCardio(true)}
              className="w-full rounded-xl border border-dashed border-neutral-800 px-4 py-2.5 text-sm text-neutral-500"
            >
              + warm-up cardio (treadmill)
            </button>
          ) : null}
          {showCardio && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 p-3">
              <input
                inputMode="decimal"
                value={cardioKm}
                onChange={(e) => setCardioKm(e.target.value)}
                placeholder="km"
                className="w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-center"
              />
              <input
                inputMode="decimal"
                value={cardioMin}
                onChange={(e) => setCardioMin(e.target.value)}
                placeholder="min"
                className="w-full min-w-0 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-center"
              />
              <button
                onClick={saveCardio}
                className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white"
              >
                Save
              </button>
            </div>
          )}
        </div>
      )}

      {/* Exercise list */}
      {!active && session && (
        <div className="mt-5 space-y-2">
          {Array.from(
            // performed order first (as you actually trained), then
            // the not-yet-logged suggestions for this split
            new Set([...session.ex.map((e) => e.n), ...suggested])
          ).map(
            (name) => {
              const logged = session.ex.find((e) => e.n === name);
              return (
                <button
                  key={name}
                  onClick={() => openExercise(name)}
                  className="flex w-full items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3.5 text-left active:bg-neutral-800"
                >
                  <span className="font-semibold">{name}</span>
                  <span className="text-sm text-neutral-400">
                    {logged
                      ? logged.sets.map(([w, r]) => `${w}×${r}`).join(" ")
                      : "—"}
                  </span>
                </button>
              );
            }
          )}
          <div className="flex gap-2 pt-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Other exercise…"
              className="min-w-0 flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-4 py-3 text-sm"
            />
            <button
              onClick={() => {
                if (customName.trim()) {
                  openExercise(customName.trim());
                  setCustomName("");
                }
              }}
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-5 py-3 text-sm font-semibold"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Active exercise — set entry, thumb zone at bottom */}
      {active && session && (
        <div className="mt-5 flex flex-1 flex-col">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">{active.name}</h2>
            <button
              onClick={() => setActive(null)}
              className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300"
            >
              ← Exercises
            </button>
          </div>

          {/* Ghost numbers */}
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Last session{active.ghost ? ` · ${active.ghost.date}` : ""}
            </p>
            <p className="mt-1 text-lg font-semibold text-neutral-300">
              {active.ghost
                ? active.ghost.sets.map(([w, r]) => `${w}×${r}`).join("  ")
                : "No history — new exercise"}
            </p>
          </div>

          {/* Sets logged this session */}
          <div className="mt-3 min-h-[3rem]">
            {activeLogged && activeLogged.sets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {activeLogged.sets.map(([w, r], i) => (
                  <span
                    key={i}
                    className="rounded-full border border-emerald-800 bg-emerald-950 px-3 py-1 text-sm font-semibold text-emerald-300"
                  >
                    {w}×{r}
                  </span>
                ))}
                <button
                  onClick={undoSet}
                  className="rounded-full border border-neutral-700 px-3 py-1 text-sm text-neutral-400"
                >
                  undo
                </button>
              </div>
            )}
            {activeLogged?.wu && activeLogged.wu.length > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                warm-up: {activeLogged.wu.map(([w, r]) => `${w}×${r}`).join(" ")}
              </p>
            )}
          </div>

          {/* Entry controls pinned toward bottom for one-handed use */}
          <div className="mt-auto pb-2 pt-4">
            <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
              <select
                value={active.equipment}
                onChange={(e) =>
                  setActive({
                    ...active,
                    equipment: e.target.value as Equipment,
                  })
                }
                className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-1.5"
              >
                {EQUIPMENT_OPTIONS.map((eq) => (
                  <option key={eq} value={eq}>
                    {eq}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={warmup}
                  onChange={(e) => setWarmup(e.target.checked)}
                  className="h-4 w-4"
                />
                warm-up set
              </label>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-center text-xs uppercase text-neutral-500">
                  Weight
                </p>
                <div className="flex items-stretch gap-1.5">
                  <button
                    onClick={() => bump(setWeight, weight, -5)}
                    className="w-12 rounded-xl border border-neutral-700 bg-neutral-800 text-xl font-bold"
                  >
                    −
                  </button>
                  <input
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-center text-2xl font-bold"
                  />
                  <button
                    onClick={() => bump(setWeight, weight, 5)}
                    className="w-12 rounded-xl border border-neutral-700 bg-neutral-800 text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-1 text-center text-xs uppercase text-neutral-500">
                  Reps
                </p>
                <div className="flex items-stretch gap-1.5">
                  <button
                    onClick={() => bump(setReps, reps, -1)}
                    className="w-12 rounded-xl border border-neutral-700 bg-neutral-800 text-xl font-bold"
                  >
                    −
                  </button>
                  <input
                    inputMode="numeric"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    className="w-full min-w-0 rounded-xl border border-neutral-700 bg-neutral-950 py-3 text-center text-2xl font-bold"
                  />
                  <button
                    onClick={() => bump(setReps, reps, 1)}
                    className="w-12 rounded-xl border border-neutral-700 bg-neutral-800 text-xl font-bold"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={logSet}
              className="mt-3 w-full rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white active:bg-emerald-500"
            >
              {warmup ? "Log warm-up" : "Log set"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
