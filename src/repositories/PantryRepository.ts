import { openDatabase } from "@/src/db";
import type { PantryItem, PantryStatus } from "@/src/types";

export interface IPantryRepository {
  save(item: PantryItem): Promise<void>;
  getAll(): Promise<PantryItem[]>;
  getByStatus(status: PantryStatus): Promise<PantryItem[]>;
  count(): Promise<number>;
}

export class PantryRepository implements IPantryRepository {
  async save(item: PantryItem): Promise<void> {
    const db = await openDatabase();
    await db.put("pantry", item);
  }

  async getAll(): Promise<PantryItem[]> {
    const db = await openDatabase();
    return db.getAll("pantry");
  }

  async getByStatus(status: PantryStatus): Promise<PantryItem[]> {
    const all = await this.getAll();
    return all.filter((i) => i.status === status);
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("pantry");
  }
}
