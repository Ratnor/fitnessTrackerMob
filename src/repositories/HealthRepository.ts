import { openDatabase } from "@/src/db";
import type { HealthSnapshot } from "@/src/types";

export interface IHealthRepository {
  save(snapshot: HealthSnapshot): Promise<void>;
  getAll(): Promise<HealthSnapshot[]>;
  getLatest(): Promise<HealthSnapshot | null>;
  getByDateRange(from: string, to: string): Promise<HealthSnapshot[]>;
  count(): Promise<number>;
}

export class HealthRepository implements IHealthRepository {
  async save(snapshot: HealthSnapshot): Promise<void> {
    const db = await openDatabase();
    await db.put("health", snapshot);
  }

  async getAll(): Promise<HealthSnapshot[]> {
    const db = await openDatabase();
    const all = await db.getAll("health");
    return all.sort((a, b) => a.d.localeCompare(b.d));
  }

  async getLatest(): Promise<HealthSnapshot | null> {
    const all = await this.getAll();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  /** Inclusive range, dates as YYYY-MM-DD strings. */
  async getByDateRange(from: string, to: string): Promise<HealthSnapshot[]> {
    const db = await openDatabase();
    const all = await db.getAll(
      "health",
      IDBKeyRange.bound(from, to)
    );
    return all.sort((a, b) => a.d.localeCompare(b.d));
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("health");
  }
}
