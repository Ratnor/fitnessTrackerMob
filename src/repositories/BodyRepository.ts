import { openDatabase } from "@/src/db";
import type { BodyReading } from "@/src/types";

export interface IBodyRepository {
  save(reading: BodyReading): Promise<void>;
  getAll(): Promise<BodyReading[]>;
  getLatest(): Promise<BodyReading | null>;
  count(): Promise<number>;
}

export class BodyRepository implements IBodyRepository {
  async save(reading: BodyReading): Promise<void> {
    const db = await openDatabase();
    await db.put("body", reading);
  }

  /** All readings sorted ascending by date. */
  async getAll(): Promise<BodyReading[]> {
    const db = await openDatabase();
    const all = await db.getAll("body");
    return all.sort((a, b) => a.d.localeCompare(b.d));
  }

  async getLatest(): Promise<BodyReading | null> {
    const all = await this.getAll();
    return all.length > 0 ? all[all.length - 1] : null;
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("body");
  }
}
