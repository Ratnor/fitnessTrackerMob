import { openDatabase } from "@/src/db";
import type { WorkoutSession, LastSet } from "@/src/types";

export interface IWorkoutRepository {
  save(session: WorkoutSession): Promise<void>;
  getAll(): Promise<WorkoutSession[]>;
  getById(id: string): Promise<WorkoutSession | undefined>;
  getLastSetForExercise(name: string): Promise<LastSet | null>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

export class WorkoutRepository implements IWorkoutRepository {
  async save(session: WorkoutSession): Promise<void> {
    const db = await openDatabase();
    await db.put("workouts", session);
  }

  /** All sessions sorted ascending by date (id is YYYY-MM-DD). */
  async getAll(): Promise<WorkoutSession[]> {
    const db = await openDatabase();
    const all = await db.getAll("workouts");
    return all.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getById(id: string): Promise<WorkoutSession | undefined> {
    const db = await openDatabase();
    return db.get("workouts", id);
  }

  /** Most recent working sets for a named exercise (ghost numbers). */
  async getLastSetForExercise(name: string): Promise<LastSet | null> {
    const sessions = await this.getAll();
    for (let i = sessions.length - 1; i >= 0; i--) {
      const ex = sessions[i].ex.find((e) => e.n === name);
      if (ex) {
        return {
          date: sessions[i].d,
          exercise: ex.n,
          equipment: ex.e,
          sets: ex.sets,
          note: ex.note,
        };
      }
    }
    return null;
  }

  async delete(id: string): Promise<void> {
    const db = await openDatabase();
    await db.delete("workouts", id);
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("workouts");
  }
}
