import type { IWorkoutRepository } from "@/src/repositories/WorkoutRepository";
import type { WorkoutSession, Equipment, SetEntry } from "@/src/types";
import { localDateString } from "@/src/services/ScheduleService";

/** Compound movements rest 90s; everything else (isolation) rests 60s. */
const COMPOUNDS = new Set([
  "Incline DB Press",
  "Bench Press",
  "Incline Bench Press",
  "OHP Seated",
  "Leg Press",
  "RDL",
  "BSS",
  "Bent Over Row",
  "Seated Row",
  "Lat Pulldown",
  "T Bar Row",
  "M-Torture High Row",
]);

export const REST_COMPOUND_S = 90;
export const REST_ISOLATION_S = 60;

export function restSecondsFor(exercise: string): number {
  return COMPOUNDS.has(exercise) ? REST_COMPOUND_S : REST_ISOLATION_S;
}

/**
 * Mutates today's WorkoutSession with immediate persistence.
 * Every logSet()/logWarmup() call writes the full session to IndexedDB —
 * if the app dies mid-workout, everything logged so far survives.
 */
export class SessionLogService {
  constructor(private readonly workouts: IWorkoutRepository) {}

  /** Resume today's session if it exists, else create + persist a new one. */
  async getOrCreateToday(
    split: string,
    time: string = new Date().getHours() < 12 ? "AM" : "PM"
  ): Promise<WorkoutSession> {
    const id = localDateString();
    const existing = await this.workouts.getById(id);
    if (existing) return existing;

    const session: WorkoutSession = {
      id,
      d: id,
      time,
      split,
      cardio: null,
      ex: [],
    };
    await this.workouts.save(session);
    return session;
  }

  /** Append a working set; creates the exercise entry on first set. Persists immediately. */
  async logSet(
    session: WorkoutSession,
    exercise: string,
    equipment: Equipment,
    weight: number,
    reps: number
  ): Promise<WorkoutSession> {
    const set: SetEntry = [weight, reps];
    let ex = session.ex.find((e) => e.n === exercise);
    if (!ex) {
      ex = { n: exercise, e: equipment, sets: [] };
      session.ex.push(ex);
    }
    ex.sets.push(set);
    await this.workouts.save(session);
    return session;
  }

  /** Append a warm-up set. Persists immediately. */
  async logWarmup(
    session: WorkoutSession,
    exercise: string,
    equipment: Equipment,
    weight: number,
    reps: number
  ): Promise<WorkoutSession> {
    let ex = session.ex.find((e) => e.n === exercise);
    if (!ex) {
      ex = { n: exercise, e: equipment, sets: [] };
      session.ex.push(ex);
    }
    ex.wu = [...(ex.wu ?? []), [weight, reps]];
    await this.workouts.save(session);
    return session;
  }

  /** Remove the most recent working set for an exercise (fat-finger undo). */
  async undoLastSet(
    session: WorkoutSession,
    exercise: string
  ): Promise<WorkoutSession> {
    const ex = session.ex.find((e) => e.n === exercise);
    if (ex && ex.sets.length > 0) {
      ex.sets.pop();
      if (ex.sets.length === 0 && (!ex.wu || ex.wu.length === 0)) {
        session.ex = session.ex.filter((e) => e.n !== exercise);
      }
      await this.workouts.save(session);
    }
    return session;
  }

  /** Attach a session note (e.g. at finish). Persists immediately. */
  async setNote(
    session: WorkoutSession,
    note: string
  ): Promise<WorkoutSession> {
    session.note = note || undefined;
    await this.workouts.save(session);
    return session;
  }
}
