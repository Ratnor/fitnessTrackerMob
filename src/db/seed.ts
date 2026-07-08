import { openDatabase } from "@/src/db";
import type {
  WorkoutSession,
  BodyReading,
  DietEntry,
  NoteEntry,
  PantryItem,
} from "@/src/types";

import workoutsJson from "@/src/data/workouts.json";
import bodyJson from "@/src/data/body.json";
import dietJson from "@/src/data/diet.json";
import notesJson from "@/src/data/notes.json";
import pantryJson from "@/src/data/pantry.json";

export interface SeedResult {
  seeded: boolean;
  counts: {
    workouts: number;
    body: number;
    diet: number;
    notes: number;
    pantry: number;
    health: number;
  };
}

const PANTRY_CATEGORIES = [
  "proteins",
  "dairy",
  "produce",
  "grains_dry",
  "legumes_pulses",
  "nuts_seeds",
  "spices_indian",
  "sauces_asian",
  "oils_fats",
  "dry_pantry",
  "snacks",
] as const;

/** Flatten pantry.json category arrays into PantryItem rows. */
function flattenPantry(raw: Record<string, unknown>): PantryItem[] {
  const items: PantryItem[] = [];
  for (const category of PANTRY_CATEGORIES) {
    const arr = raw[category];
    if (Array.isArray(arr)) {
      for (const it of arr) {
        items.push({ ...(it as Omit<PantryItem, "category">), category });
      }
    }
  }
  return items;
}

/**
 * Idempotent seed: only writes historical data if the workouts store is empty.
 * Safe to call on every app load.
 */
export async function seedIfEmpty(): Promise<SeedResult> {
  const db = await openDatabase();
  const existing = await db.count("workouts");
  let seeded = false;

  if (existing === 0) {
    const sessions = workoutsJson.sessions as unknown as WorkoutSession[];
    const readings = bodyJson.readings as unknown as BodyReading[];
    const dietEntries = dietJson.entries as unknown as DietEntry[];
    const noteEntries = notesJson.entries as unknown as NoteEntry[];
    const pantryItems = flattenPantry(
      pantryJson as unknown as Record<string, unknown>
    );

    const tx = db.transaction(
      ["workouts", "body", "diet", "notes", "pantry"],
      "readwrite"
    );
    await Promise.all([
      ...sessions.map((s) => tx.objectStore("workouts").put(s)),
      ...readings.map((r) => tx.objectStore("body").put(r)),
      ...dietEntries.map((e) => tx.objectStore("diet").put(e)),
      ...noteEntries.map((e) => tx.objectStore("notes").put(e)),
      ...pantryItems.map((p) => tx.objectStore("pantry").put(p)),
    ]);
    await tx.done;
    seeded = true;
  }

  const counts = {
    workouts: await db.count("workouts"),
    body: await db.count("body"),
    diet: await db.count("diet"),
    notes: await db.count("notes"),
    pantry: await db.count("pantry"),
    health: await db.count("health"),
  };

  return { seeded, counts };
}
