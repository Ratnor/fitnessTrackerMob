// ---------- Workouts (mirrors workouts.json) ----------

/** [weight, reps] — weight conventions per workouts.json _meta:
 *  machine/cable = displayed stack, leg_press = lb/side, db = lb/hand,
 *  bb = plates/side excl. bar, tbar = total plates, bw = 0 */
export type SetEntry = [number, number];

export type Equipment =
  | "db"
  | "cable"
  | "machine"
  | "bb"
  | "bw"
  | "plate"
  | "tbar";

export interface Cardio {
  type: string;
  km: number;
  min: number;
}

export interface Exercise {
  n: string;
  e: Equipment;
  sets: SetEntry[];
  wu?: SetEntry[];
  note?: string;
}

export interface WorkoutSession {
  id: string; // YYYY-MM-DD
  d: string;
  time: "AM" | "PM" | "midday" | string;
  split: string; // push | pull | legs | shoulders | ...
  cardio: Cardio | Cardio[] | null;
  ex: Exercise[];
  note?: string;
}

// ---------- Body (mirrors body.json) ----------

export interface BodyReading {
  d: string; // YYYY-MM-DD
  w: number; // weight lb
  bf?: number | null; // body fat % — TREND SIGNAL ONLY (BIA caveat)
  mm?: number | null; // muscle mass lb
  ffm?: number | null; // fat-free mass lb
  skm?: number | null; // skeletal muscle %
  vis?: number | null; // visceral score
  bmr?: number | null; // kcal
  waist: number | null; // cm
  hip: number | null; // cm
  reading_time?: string; // HH:MM
  note?: string;
}

// ---------- Health (Apple Health snapshot via iOS Shortcut, Section 1.4) ----------

export interface HealthSnapshot {
  d: string; // YYYY-MM-DD
  hrv_ms: number | null;
  hrv_7day_avg: number | null;
  resting_hr_bpm: number | null;
  sleep_hours: number | null;
  sleep_deep_hours: number | null;
  sleep_rem_hours: number | null;
  respiratory_rate: number | null;
  active_kcal: number | null;
  steps: number | null;
  exercise_min: number | null;
  bjj_logged: boolean;
  vo2max: number | null;
}

// ---------- Diet (mirrors diet.json) ----------

export interface Meal {
  t: string; // meal label
  f: string; // foods freetext
  p: number; // est. protein g
}

export interface DietEntry {
  d: string; // YYYY-MM-DD
  meals: Meal[];
  p_tot: number;
  conf: string; // H / M / L confidence
  steps: number | null;
  ctx: string;
}

// ---------- Pantry (flattened from pantry.json categories) ----------

export type PantryStatus = "stocked" | "low" | "out" | "unknown";

export interface PantryItem {
  item: string; // key
  category: string;
  status: PantryStatus;
  frozen?: boolean;
  source?: string;
  note?: string;
}

// ---------- Notes (mirrors notes.json) ----------

export interface NoteEntry {
  d: string; // YYYY-MM-DD
  sid: string | null;
  energy: number | null; // 1-5
  rir_feel: string | null;
  soreness: string[];
  wins: string[];
  flags: string[];
  coach_note?: string;
  free?: string;
}

// ---------- Derived ----------

export interface LastSet {
  date: string;
  exercise: string;
  equipment: Equipment;
  sets: SetEntry[];
  note?: string;
}
