// Weekly structure from schedule.md v2.0 (2026-06-23, BJJ rotation)
// Mon BJJ · Tue Gym Push (office) · Wed BJJ · Thu Gym Legs · Fri BJJ ·
// Sat Gym Pull (shortened) · Sun REST + batch cook

export type DayType = "PUSH" | "PULL" | "LEGS" | "BJJ" | "REST";

export interface DayPlan {
  dayType: DayType;
  /** gym split key matching workouts.json split values, if a gym day */
  split: "push" | "pull" | "legs" | null;
  headline: string;
  notes: string[];
}

const WEEK: Record<number, DayPlan> = {
  0: {
    dayType: "REST",
    split: null,
    headline: "Rest + batch cook",
    notes: [
      "Protected rest — no gym",
      "Batch cook for Mon–Wed BJJ days",
      "Weekly weigh-in snapshot, same conditions",
    ],
  },
  1: {
    dayType: "BJJ",
    split: null,
    headline: "BJJ 7:00 PM",
    notes: [
      "No gym AM — rest before class",
      "Dinner on table by 18:30 (rescue meal ok)",
      "Eat a real afternoon snack — fueling rule after 06-29 episode",
    ],
  },
  2: {
    dayType: "PUSH",
    split: "push",
    headline: "Gym AM — Push (office day)",
    notes: [
      "Gym before commute",
      "No BJJ tonight — proper dinner + recovery evening",
    ],
  },
  3: {
    dayType: "BJJ",
    split: null,
    headline: "BJJ 7:00 PM",
    notes: [
      "No gym AM — rest before class",
      "Dinner on table by 18:30 (rescue meal ok)",
      "Eat a real afternoon snack — fueling rule after 06-29 episode",
    ],
  },
  4: {
    dayType: "LEGS",
    split: "legs",
    headline: "Gym AM — Legs (highest-quality session)",
    notes: [
      "No BJJ last night — protect this session",
      "Priority: leg press + RDL",
      "Core: 2 sets only — save it for BJJ",
    ],
  },
  5: {
    dayType: "BJJ",
    split: null,
    headline: "BJJ 7:00 PM",
    notes: [
      "No gym AM — rest before class",
      "Dinner on table by 18:30 (rescue meal ok)",
      "Eat a real afternoon snack — fueling rule after 06-29 episode",
    ],
  },
  6: {
    dayType: "PULL",
    split: "pull",
    headline: "Gym AM — Pull (shortened)",
    notes: [
      "BJJ last night — grip/lats pre-fatigued",
      "Pick ONE of hammer curl / T-bar",
      "Skippable if energy is very low — do not double up Sunday",
    ],
  },
};

export class ScheduleService {
  /** Day plan for a given date (defaults to today, local time). */
  getDayPlan(date: Date = new Date()): DayPlan {
    return WEEK[date.getDay()];
  }
}

/** Local-time YYYY-MM-DD (never use toISOString — UTC shifts the date). */
export function localDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
