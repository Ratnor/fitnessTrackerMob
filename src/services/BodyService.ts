import type { IBodyRepository } from "@/src/repositories/BodyRepository";
import type { BodyReading } from "@/src/types";

export interface TrendPoint {
  d: string;
  v: number;
}

export interface RecompSignal {
  signal: "recomp" | "muscle_gain" | "surplus" | "insufficient_data";
  text: string;
}

/**
 * Recomp signal logic per dev plan Phase 4:
 *  weight flat/down + waist decreasing = recomp working
 *  weight up + waist stable            = likely muscle gain
 *  weight up + waist up                = surplus
 * The app surfaces the numbers; Claude interprets nuance.
 */
export class BodyService {
  constructor(private readonly body: IBodyRepository) {}

  async getWeightTrend(days = 30): Promise<TrendPoint[]> {
    const all = await this.body.getAll();
    return all.slice(-days).map((r) => ({ d: r.d, v: r.w }));
  }

  async getWaistTrend(): Promise<TrendPoint[]> {
    const all = await this.body.getAll();
    return all
      .filter((r) => r.waist != null)
      .map((r) => ({ d: r.d, v: r.waist as number }));
  }

  async getRecompSignal(): Promise<RecompSignal> {
    const all = await this.body.getAll();
    const withWaist = all.filter((r) => r.waist != null);
    if (all.length < 4 || withWaist.length < 2) {
      return {
        signal: "insufficient_data",
        text: "Need ≥2 waist measurements and a few weigh-ins for a recomp signal — keep the Wednesday tape ritual going.",
      };
    }

    const half = Math.floor(all.length / 2);
    const wOld = average(all.slice(0, half).map((r) => r.w));
    const wNew = average(all.slice(half).map((r) => r.w));
    const wDelta = wNew - wOld;

    const wh = Math.floor(withWaist.length / 2);
    const waistOld = average(
      withWaist.slice(0, wh).map((r) => r.waist as number)
    );
    const waistNew = average(
      withWaist.slice(wh).map((r) => r.waist as number)
    );
    const waistDelta = waistNew - waistOld;

    const weightUp = wDelta > 0.7; // ~1lb threshold over window
    const waistDown = waistDelta < -0.4; // cm
    const waistUp = waistDelta > 0.4;

    if (!weightUp && waistDown)
      return {
        signal: "recomp",
        text: `Weight ${fmtDelta(wDelta)} lb, waist ${fmtDelta(waistDelta)} cm — recomp is working.`,
      };
    if (weightUp && !waistUp && !waistDown)
      return {
        signal: "muscle_gain",
        text: `Weight ${fmtDelta(wDelta)} lb with waist stable — likely muscle gain.`,
      };
    if (weightUp && waistUp)
      return {
        signal: "surplus",
        text: `Weight ${fmtDelta(wDelta)} lb and waist ${fmtDelta(waistDelta)} cm — running a surplus.`,
      };
    return {
      signal: "insufficient_data",
      text: `Weight ${fmtDelta(wDelta)} lb, waist ${fmtDelta(waistDelta)} cm — mixed signal, keep measuring.`,
    };
  }

  /** Merge new fields into an existing reading for the date, or create one. */
  async upsertReading(
    partial: Partial<BodyReading> & { d: string; w?: number }
  ): Promise<BodyReading> {
    const all = await this.body.getAll();
    const existing = all.find((r) => r.d === partial.d);
    const merged: BodyReading = {
      waist: null,
      hip: null,
      ...existing,
      ...stripUndefined(partial),
      w: partial.w ?? existing?.w ?? 0,
      d: partial.d,
    };
    await this.body.save(merged);
    return merged;
  }
}

function average(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function fmtDelta(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
}

function stripUndefined<T extends object>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}
