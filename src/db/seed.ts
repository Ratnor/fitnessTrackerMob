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
 * One-time targeted repairs for known bad records (unit bugs, export lag).
 * Every repair is guarded by an exact-match condition, so each applies at
 * most once and is a no-op on healthy data.
 */
async function applyOneTimeRepairs(
  db: Awaited<ReturnType<typeof openDatabase>>
): Promise<void> {
  // 2026-07-08: waist was imported as 33.5 (inches stored as cm).
  // The real tape reading that morning was 85.2 cm.
  const r8 = await db.get("body", "2026-07-08");
  if (r8 && r8.waist != null && Math.abs(r8.waist - 33.5) < 0.15) {
    r8.waist = 85.2;
    r8.note = "repaired: waist was imported in inches; corrected to 85.2 cm";
    await db.put("body", r8);
  }

  // 2026-07-11: export-lag artifact. The 161.8 lb weigh-in happened on
  // 2026-07-09, and the 85.2 waist belongs to 2026-07-08 (already there).
  const r11 = await db.get("body", "2026-07-11");
  if (r11 && Math.abs(r11.w - 161.8) < 0.05) {
    const r9 = await db.get("body", "2026-07-09");
    if (!r9) {
      await db.put("body", {
        d: "2026-07-09",
        w: 161.8,
        bf: r11.bf ?? null,
        mm: r11.mm ?? null,
        waist: null,
        hip: null,
        note: "repaired: weigh-in taken 07-09, was logged under 07-11 export date",
      });
    }
    await db.delete("body", "2026-07-11");
  }
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

  await applyOneTimeRepairs(db);

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
