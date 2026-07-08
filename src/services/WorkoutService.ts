import type { IWorkoutRepository } from "@/src/repositories/WorkoutRepository";
import type { SetEntry, Equipment } from "@/src/types";

export interface ExerciseTarget {
  name: string;
  equipment: Equipment | null;
  /** Recommended target from schedule.md session guide */
  target: string;
  /** Ghost numbers: working sets from the most recent session containing this exercise */
  lastSets: SetEntry[] | null;
  lastDate: string | null;
}

export interface TodayTargets {
  split: string;
  lastSessionDate: string | null;
  exercises: ExerciseTarget[];
}

// Recommended targets from schedule.md v2.0 — "Gym session guide by split"
const SPLIT_GUIDE: Record<string, { name: string; target: string }[]> = {
  push: [
    { name: "Incline DB Press", target: "40×10×3 — hold (Phase 1 trigger met)" },
    { name: "OHP Seated", target: "35×10×3 — rebuild before attempting 40" },
    { name: "Lateral Raise", target: "55×10×3 (machine)" },
    { name: "Triceps Pushdown", target: "99×10×3" },
    { name: "Bicep Curl", target: "77→88×10×3 — 2 clean sessions at 77 first" },
  ],
  legs: [
    { name: "Leg Press", target: "70×10×3 → next: 75×10×3" },
    { name: "RDL", target: "35×10×3 → 40×9 when 35 feels easy" },
    { name: "BSS", target: "10×8×3 — rebuild (reverted from 15)" },
    { name: "Knee Raise", target: "2 sets only — save core for BJJ" },
  ],
  pull: [
    { name: "M-Torture High Row", target: "55×10×3 → 55×12 then 60" },
    { name: "Seated Row", target: "77×10×3 (machine)" },
    { name: "Face Pull", target: "99×10×3 — rear delt health for BJJ" },
    { name: "Hammer Curl", target: "pick ONE: hammer curl or T-bar (grip fatigued)" },
  ],
};

export class WorkoutService {
  constructor(private readonly workouts: IWorkoutRepository) {}

  /** Today's training card: guide targets + ghost numbers from history. */
  async getTodayTargets(split: string): Promise<TodayTargets> {
    const guide = SPLIT_GUIDE[split] ?? [];
    const sessions = await this.workouts.getAll();
    const lastOfSplit = [...sessions]
      .reverse()
      .find((s) => s.split === split);

    const exercises: ExerciseTarget[] = [];
    for (const g of guide) {
      const last = await this.workouts.getLastSetForExercise(g.name);
      exercises.push({
        name: g.name,
        equipment: last?.equipment ?? null,
        target: g.target,
        lastSets: last?.sets ?? null,
        lastDate: last?.date ?? null,
      });
    }

    return {
      split,
      lastSessionDate: lastOfSplit?.d ?? null,
      exercises,
    };
  }

  /** Full history of working sets for one exercise, oldest → newest. */
  async getProgressForExercise(
    name: string
  ): Promise<{ date: string; sets: SetEntry[] }[]> {
    const sessions = await this.workouts.getAll();
    const out: { date: string; sets: SetEntry[] }[] = [];
    for (const s of sessions) {
      const ex = s.ex.find((e) => e.n === name);
      if (ex) out.push({ date: s.d, sets: ex.sets });
    }
    return out;
  }
}
