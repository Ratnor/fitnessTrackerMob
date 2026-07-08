import { openDatabase } from "@/src/db";
import type { NoteEntry } from "@/src/types";

export interface INotesRepository {
  save(entry: NoteEntry): Promise<void>;
  getAll(): Promise<NoteEntry[]>;
  getByDate(d: string): Promise<NoteEntry | undefined>;
  count(): Promise<number>;
}

export class NotesRepository implements INotesRepository {
  async save(entry: NoteEntry): Promise<void> {
    const db = await openDatabase();
    await db.put("notes", entry);
  }

  async getAll(): Promise<NoteEntry[]> {
    const db = await openDatabase();
    const all = await db.getAll("notes");
    return all.sort((a, b) => a.d.localeCompare(b.d));
  }

  async getByDate(d: string): Promise<NoteEntry | undefined> {
    const db = await openDatabase();
    return db.get("notes", d);
  }

  async count(): Promise<number> {
    const db = await openDatabase();
    return db.count("notes");
  }
}
