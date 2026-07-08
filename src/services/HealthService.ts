import type { IHealthRepository } from "@/src/repositories/HealthRepository";

export type Signal = "green" | "amber" | "red" | "unknown";

export interface RecoveryStatus {
  overall: Signal;
  hrv: { signal: Signal; value: number | null; avg7: number | null };
  restingHr: { signal: Signal; value: number | null; avg7: number | null };
  sleep: { signal: Signal; hours: number | null };
  summary: string;
  date: string | null;
}

const SIGNAL_RANK: Record<Signal, number> = {
  green: 0,
  amber: 1,
  red: 2,
  unknown: 0, // unknown signals don't drag the overall down
};

/**
 * Recovery logic per dev plan Phase 2:
 *  HRV    — green: within 10% of 7-day avg; amber: 10–20% below; red: >20% below
 *  RHR    — green: at/below 7-day avg; amber: 1–3 bpm above; red: >3 bpm above
 *  Sleep  — green: ≥7h; amber: 6–7h; red: <6h
 *  Overall — worst of the three. Red = shorten session or rest.
 */
export class HealthService {
  constructor(private readonly health: IHealthRepository) {}

  async getRecoveryStatus(): Promise<RecoveryStatus> {
    const latest = await this.health.getLatest();

    if (!latest) {
      return {
        overall: "unknown",
        hrv: { signal: "unknown", value: null, avg7: null },
        restingHr: { signal: "unknown", value: null, avg7: null },
        sleep: { signal: "unknown", hours: null },
        summary:
          "No Apple Health data yet — the Phase 4 iOS Shortcut will feed this card.",
        date: null,
      };
    }

    const recent = await this.lastSeven(latest.d);

    // HRV
    const hrvAvg =
      latest.hrv_7day_avg ??
      this.average(recent.map((s) => s.hrv_ms).filter(isNum));
    let hrvSignal: Signal = "unknown";
    if (latest.hrv_ms != null && hrvAvg != null && hrvAvg > 0) {
      const pctBelow = ((hrvAvg - latest.hrv_ms) / hrvAvg) * 100;
      hrvSignal = pctBelow <= 10 ? "green" : pctBelow <= 20 ? "amber" : "red";
    }

    // Resting HR
    const rhrAvg = this.average(
      recent.map((s) => s.resting_hr_bpm).filter(isNum)
    );
    let rhrSignal: Signal = "unknown";
    if (latest.resting_hr_bpm != null && rhrAvg != null) {
      const above = latest.resting_hr_bpm - rhrAvg;
      rhrSignal = above <= 0 ? "green" : above <= 3 ? "amber" : "red";
    }

    // Sleep
    let sleepSignal: Signal = "unknown";
    if (latest.sleep_hours != null) {
      sleepSignal =
        latest.sleep_hours >= 7
          ? "green"
          : latest.sleep_hours >= 6
            ? "amber"
            : "red";
    }

    const signals = [hrvSignal, rhrSignal, sleepSignal];
    const known = signals.filter((s) => s !== "unknown");
    const overall: Signal =
      known.length === 0
        ? "unknown"
        : known.reduce((worst, s) =>
            SIGNAL_RANK[s] > SIGNAL_RANK[worst] ? s : worst
          );

    const summary =
      overall === "red"
        ? "Recovery is poor — shorten today's session or rest."
        : overall === "amber"
          ? "Recovery is middling — train, but don't chase PRs."
          : overall === "green"
            ? "Recovered — train as planned."
            : "Not enough data for a recovery call.";

    return {
      overall,
      hrv: { signal: hrvSignal, value: latest.hrv_ms, avg7: hrvAvg },
      restingHr: {
        signal: rhrSignal,
        value: latest.resting_hr_bpm,
        avg7: rhrAvg,
      },
      sleep: { signal: sleepSignal, hours: latest.sleep_hours },
      summary,
      date: latest.d,
    };
  }

  private async lastSeven(beforeDate: string) {
    const all = await this.health.getAll();
    return all.filter((s) => s.d < beforeDate).slice(-7);
  }

  private average(nums: number[]): number | null {
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }
}

function isNum(v: number | null): v is number {
  return v != null;
}
