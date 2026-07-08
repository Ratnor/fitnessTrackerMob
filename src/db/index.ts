import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  WorkoutSession,
  BodyReading,
  HealthSnapshot,
  DietEntry,
  PantryItem,
  NoteEntry,
} from "@/src/types";

export const DB_NAME = "fitness-tracker";
export const DB_VERSION = 1;

export interface FitnessDB extends DBSchema {
  workouts: { key: string; value: WorkoutSession }; // keyPath 'id'
  body: { key: string; value: BodyReading }; // keyPath 'd'
  health: { key: string; value: HealthSnapshot }; // keyPath 'd'
  diet: { key: string; value: DietEntry }; // keyPath 'd'
  pantry: { key: string; value: PantryItem }; // keyPath 'item'
  notes: { key: string; value: NoteEntry }; // keyPath 'd'
}

export type FitnessDatabase = IDBPDatabase<FitnessDB>;

let dbPromise: Promise<FitnessDatabase> | null = null;

export function openDatabase(): Promise<FitnessDatabase> {
  if (!dbPromise) {
    dbPromise = openDB<FitnessDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("workouts")) {
          db.createObjectStore("workouts", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("body")) {
          db.createObjectStore("body", { keyPath: "d" });
        }
        if (!db.objectStoreNames.contains("health")) {
          db.createObjectStore("health", { keyPath: "d" });
        }
        if (!db.objectStoreNames.contains("diet")) {
          db.createObjectStore("diet", { keyPath: "d" });
        }
        if (!db.objectStoreNames.contains("pantry")) {
          db.createObjectStore("pantry", { keyPath: "item" });
        }
        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", { keyPath: "d" });
        }
      },
    });
  }
  return dbPromise;
}
