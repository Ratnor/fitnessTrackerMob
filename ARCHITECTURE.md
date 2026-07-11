# Architecture

## The one-sentence version

A **local-first** Next.js PWA: the code is delivered by Vercel, but every piece of data lives in **IndexedDB on the phone that logged it** — there is no server, no account, and no network dependency after the app loads.

## Where data lives (the answer to "where is my stuff?")

| What | Where | Reachable by |
|---|---|---|
| Workouts, body readings, diet, notes, pantry, health snapshots | IndexedDB database `fitness-tracker` inside the installed PWA on **your iPhone** | Only that phone. Not Vercel, not GitHub, not the Mac. |
| Seed history (data up to 2026-07-07) | `src/data/*.json` in the git repo | Anyone with repo access — **this is the one place personal data is in code** |
| App code | GitHub → built by Vercel → cached on-device by the service worker | Public URL (obscure but unauthenticated) |
| Coach exports | Wherever you share them (Claude conversation, clipboard) | You |

Consequences: deleting the PWA from the home screen eventually deletes the on-device data (the weekly Coach export is your backup). Your Mac's browser at the same URL has a completely separate, empty database — data does not sync between devices. Corrections to on-device data can't be made "from outside"; they ship as one-time repair migrations in `src/db/seed.ts` (guarded, idempotent — see `applyOneTimeRepairs`).

## Layers

```
┌─────────────────────────── iPhone (PWA) ───────────────────────────┐
│                                                                     │
│  app/            page.tsx (Today) · logger · food · body ·          │
│  (UI pages)      import · coach · debug                             │
│        │                                                            │
│  src/services/   ScheduleService (week map, day types)              │
│  (business       WorkoutService (targets, ghosts, progress)         │
│   logic)         SessionLogService (write-on-set, drafts, cardio)   │
│                  HealthService (recovery green/amber/red)           │
│                  BodyService (trends, recomp signal, upsert)        │
│                  CoachService (context assembly for Claude)         │
│        │                                                            │
│  src/repositories/   one class per store, thin CRUD over idb        │
│        │                                                            │
│  src/db/         openDatabase() — schema v1 · seed.ts — seed+repair │
│        │                                                            │
│  IndexedDB       workouts(id) body(d) health(d) diet(d)             │
│                  pantry(item) notes(d)                              │
└─────────────────────────────────────────────────────────────────────┘

External flows:
  VeSync/RENPHO/Watch → Apple Health → iOS Shortcut (JSON to clipboard)
      → /import (parse, round, stale-detect) → health + body stores
  /coach → assembles last 7 sessions + trends + pantry → iOS Share Sheet → Claude
  git push → GitHub → Vercel build → phone pulls update on next open
```

Rules that keep it sane: pages never touch IndexedDB directly (always through a repository), services own all business logic (recovery thresholds, progression targets, staleness fingerprints), and every write happens at the moment of user action (write-on-set-completion — the app can die at any time and lose nothing).

## Portability — could someone else use this?

**Current state: the engine is generic; the driver profile is hardcoded.** Someone cloning today would get an app that ships **Ratna's** training history, weekly schedule, exercise targets, protein goals, and coach persona.

Personal things baked into code:

| What | Where |
|---|---|
| Training/body/diet/pantry history (seed) | `src/data/*.json` |
| Weekly schedule (BJJ Mon/Wed/Fri, Push Tue…) | `ScheduleService` `WEEK` map |
| Exercise targets per split | `WorkoutService` `SPLIT_GUIDE` |
| Protein targets (130/160), quick-add foods | `app/food/page.tsx`, `app/page.tsx` |
| Coach identity, rules, conventions | `CoachService.assemble()` |
| One-time data repairs | `src/db/seed.ts` |

**To share with a friend today** (works, ~30 min, no code changes beyond deletion): fork the repo → delete the contents of `src/data/*.json` (replace with empty `sessions`/`readings`/`entries` arrays — **do this first; it's your personal history**) → remove `applyOneTimeRepairs` internals → edit the `WEEK` map, `SPLIT_GUIDE`, and CoachService text for their life → push to their GitHub → import to their Vercel → install from their URL. They need: GitHub account, Vercel free tier, iPhone with Shortcuts, and their own scale/tape/watch feeding Apple Health.

**To make it properly portable** (a "v2" project, roughly the size of two phases):

1. **Extract a profile module** — one `src/config/profile.ts` holding schedule, targets, protein goals, quick-adds, coach persona. Half a day; removes 90% of the coupling.
2. **First-run onboarding** — empty-state flow that asks for schedule + targets and stores them in a new IndexedDB `settings` store (schema v2 bump), with a settings page to edit later. This is the real work — a day or two.
3. **Ship without seed** — seed becomes an optional "import history" JSON paste, using the existing Import pattern.
4. Optional polish: JSON backup/restore of all stores (also solves your migrate-to-a-new-iPhone story), and making the Coach prompt template user-editable.

Steps 1–2 turn "clone and edit my life out of the code" into "clone, deploy, answer three questions."
