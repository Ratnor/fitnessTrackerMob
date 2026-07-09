# fitness-tracker

Local-first health tracker PWA per `../health_tracker_dev_plan.docx`.
Stack: Next.js 14 · TypeScript · Tailwind · IndexedDB (idb) · Vercel.

## Status — all 6 phases built

- **Phase 0 — Environment & Pipeline**: done, deployed on Vercel, installed as iPhone PWA.
- **Phase 1 — Data Layer**: done. 6 IndexedDB stores, repositories, idempotent seed from real history.
- **Phase 2 — Today Dashboard**: done. Day-type badge (schedule + split-swap aware), recovery status (worst-of-three HRV/RHR/sleep), training targets with ghost numbers, protein bar.
- **Phase 3 — Session Logger**: done. Write-on-set-completion, ghost numbers, auto rest timer (90/60s), wake lock, warm-ups, undo, split override chips.
- **Phase 4 — Health Import & Body**: done. Apple Health via iOS Shortcut (SHORTCUT_GUIDE.md), waist_in→cm conversion, 1-decimal rounding, body trends + recomp signal, food log with edit-in-place.
- **Phase 5 — Coach Export**: done. `/coach` assembles PROMPT.md-shaped context (~4.3k tokens) → Share Sheet → Claude; clipboard fallback.
- **Phase 6 — PWA Polish**: done. next-pwa service worker (offline app shell), install hint banner, apple-touch icon, haptics on sets/timer.

See USER_GUIDE.md for daily usage; SHORTCUT_GUIDE.md for the Health Export Shortcut.

## Run locally

```bash
cd fitness-tracker
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # npx tsc --noEmit — passes with 0 errors
```

The home page is a Phase 1 verification screen: store counts, latest body reading (2026-05-06, 171.0 lb), and the ghost-number check for Incline DB Press (2026-06-30, 40×10, 40×10, 40×10).

Note: the plan's test criterion expects the Incline DB set from 2026-06-23 — the doc predates the 2026-06-30 session. `getLastSetForExercise` correctly returns the most recent (same 40×10×3).

## Deploy (Phase 0 completion — you do this once)

1. `git init && git add . && git commit -m "Phase 0+1: scaffold + data layer"`
2. Create a GitHub repo named `fitness-tracker`, push.
3. vercel.com → Add New Project → import the repo → accept defaults → Deploy.
4. Open the Vercel URL in Safari on iPhone → Share → Add to Home Screen.
5. Verify: icon opens full-screen, seed counts show, ghost check shows 40×10×3.

After that, every `git push` auto-deploys.

## Structure

```
src/types/          All interfaces (WorkoutSession, BodyReading, HealthSnapshot, DietEntry, PantryItem, NoteEntry)
src/db/index.ts     openDatabase() — DB 'fitness-tracker' v1, stores: workouts(id), body(d), health(d), diet(d), pantry(item), notes(d)
src/db/seed.ts      seedIfEmpty() — one-time import of src/data/*.json
src/repositories/   Workout, Body, Health, Diet, Pantry, Notes — plain classes + interfaces
src/data/           Seed JSON copied from the Workout and Diet project (as of 2026-07-07)
app/page.tsx        Phase 1 verification screen (becomes Today Dashboard in Phase 2)
```

Weight conventions (from workouts.json `_meta`): machine/cable = displayed stack, leg press = lb/side, db = lb/hand, bb = plates/side excl. bar, tbar = total plates.

Pantry `restock_soon` entries are shopping notes, not inventory — intentionally not seeded into the pantry store.

## Next session (Phase 2 — Today Dashboard)

Per the plan: `WorkoutService.getTodayTargets(split)`, `HealthService.getRecoveryStatus()` (HRV/RHR/sleep → green/amber/red, worst-of-three), day-type badge from schedule, protein progress vs 130g. Recovery logic thresholds are in the dev plan §Phase 2.
