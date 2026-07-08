import { openDatabase } from "@/src/db";
import type { DietEntry } from "@/src/types";

export interface IDietRepository {
  save(entry: DietEntry): Promise<void>;
  getAll(): Promise<DietEntry[]>;
  getByDate(d: string): Promise<DietEntry | undefined>;
  count(): Promise<number>;
}

export class DietRepository implements IDietRepository {
  async save(entry: DietEntry): Promise<void> {
    const db = await openDatabase();
    await db.put("diet", entry);
  }

  async getAll(): Promise<DietEntry[]> {
    const db = await openDatabase();
    const all = await db.getAll("diet");
    return all.sort((a, b) => a.d.localeCompare(b.d));
  }

  async getByDate(d: string): Promise<DietEntry | undefined> {
    const db = await openDatabase();
    return db.get("diet", d);
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("diet");
  }
}
