"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { seedIfEmpty } from "@/src/db/seed";
import { DietRepository } from "@/src/repositories/DietRepository";
import { localDateString } from "@/src/services/ScheduleService";
import type { DietEntry, Meal } from "@/src/types";

const dietRepo = new DietRepository();

const PROTEIN_TARGET = 130;

// Anchor sources from diet.json _meta (corrected 2026-07-07 values)
const QUICK_ADDS: { label: string; f: string; p: number; t: string }[] = [
  {
    label: "Shake (full) · 79g",
    f: "2 scoops Allmax Isoflex + 500ml Fairlife 2%",
    p: 79,
    t: "shake",
  },
  { label: "2 eggs · 14g", f: "2 eggs", p: 14, t: "breakfast" },
  { label: "Greek yogurt cup · 17g", f: "Greek yogurt cup", p: 17, t: "snack" },
  {
    label: "Chicken breast 4oz · 35g",
    f: "chicken breast 4oz",
    p: 35,
    t: "lunch",
  },
  {
    label: "Cottage cheese cup · 25g",
    f: "cottage cheese cup",
    p: 25,
    t: "snack",
  },
];

const MEAL_LABELS = ["breakfast", "lunch", "dinner", "snack", "shake", "other"];

export default function Food() {
  const [entry, setEntry] = useState<DietEntry | null>(null);
  const [label, setLabel] = useState("breakfast");
  const [foods, setFoods] = useState("");
  const [protein, setProtein] = useState("");
  const [error, setError] = useState<string | null>(null);

  const today = localDateString();

  useEffect(() => {
    (async () => {
      await seedIfEmpty();
      const existing = await dietRepo.getByDate(today);
      setEntry(
        existing ?? {
          d: today,
          meals: [],
          p_tot: 0,
          conf: "M",
          steps: null,
          ctx: "",
        }
      );
    })();
  }, [today]);

  async function persist(next: DietEntry) {
    next.p_tot = next.meals.reduce((s, m) => s + m.p, 0);
    await dietRepo.save(next);
    setEntry({ ...next });
  }

  async function addMeal(meal: Meal) {
    if (!entry) return;
    await persist({ ...entry, meals: [...entry.meals, meal] });
  }

  async function removeMeal(index: number) {
    if (!entry) return;
    await persist({
      ...entry,
      meals: entry.meals.filter((_, i) => i !== index),
    });
  }

  async function addCustom() {
    const p = parseInt(protein, 10);
    if (!foods.trim() || isNaN(p) || p < 0) {
      setError("Describe the food and give a protein estimate (grams)");
      return;
    }
    setError(null);
    await addMeal({ t: label, f: foods.trim(), p });
    setFoods("");
    setProtein("");
  }

  const total = entry?.p_tot ?? 0;
  const pct = Math.min(100, (total / PROTEIN_TARGET) * 100);

  return (
    <main className="mx-auto max-w-md px-4 py-6 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Food · {today}</h1>
          <p className="text-xs text-neutral-500">
            estimates are fine — protein grams are what matter
          </p>
        </div>
        <Link href="/" className="text-sm text-neutral-400 underline">
          Done
        </Link>
      </header>

      {/* Running total */}
      <section className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
            Protein today
          </span>
          <span>
            <b className="text-lg">{total}</b>
            <span className="text-sm text-neutral-500"> / {PROTEIN_TARGET}g</span>
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full ${total >= PROTEIN_TARGET ? "bg-emerald-500" : "bg-sky-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {/* Quick adds */}
      <section className="mt-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Quick add
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_ADDS.map((q) => (
            <button
              key={q.label}
              onClick={() => addMeal({ t: q.t, f: q.f, p: q.p })}
              className="rounded-full border border-neutral-700 bg-neutral-800 px-3.5 py-2 text-sm active:bg-neutral-700"
            >
              {q.label}
            </button>
          ))}
        </div>
      </section>

      {/* Custom entry */}
      <section className="mt-5 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex gap-2">
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="rounded-lg border border-neutral-800 bg-neutral-950 px-2 py-2 text-sm"
          >
            {MEAL_LABELS.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input
            inputMode="numeric"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="g protein"
            className="w-24 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={foods}
          onChange={(e) => setFoods(e.target.value)}
          placeholder="What did you eat? e.g. sourdough slice + cream cheese + 2 sunny side eggs + chilli oil"
          rows={2}
          className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        <button
          onClick={addCustom}
          className="mt-2 w-full rounded-xl bg-emerald-600 py-3 font-bold text-white active:bg-emerald-500"
        >
          Log meal
        </button>
      </section>

      {/* Today's meals */}
      {entry && entry.meals.length > 0 && (
        <section className="mt-5 space-y-2">
          {entry.meals.map((m, i) => (
            <div
              key={i}
              className="flex items-start justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  {m.t}
                </p>
                <p className="mt-0.5 text-sm">{m.f}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-bold">{m.p}g</span>
                <button
                  onClick={() => removeMeal(i)}
                  className="text-xs text-neutral-500 underline"
                >
                  remove
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
