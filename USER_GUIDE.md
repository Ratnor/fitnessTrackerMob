# Fitness Tracker — User Guide

A local-first fitness tracker PWA. All data lives in IndexedDB **on your phone** — no server, no account, no API keys. It works offline; the Vercel URL only delivers the app itself.

## Install

Open the Vercel URL in Safari on iPhone → Share → **Add to Home Screen**. The icon opens full-screen like a native app. Updates arrive automatically when you open the app online; after big changes, force-quit and reopen. If you open the URL in a plain browser tab, a banner reminds you to install.

## Offline

A service worker caches the app shell, so the installed app opens and works with **no connection** — gym wifi dead zones included. All logging (sets, food, body) works offline because data lives on-device; only the Coach share and app updates need a connection.

## The screens

### Today (home)

What matters this morning, driven by your weekly schedule (Mon/Wed/Fri BJJ · Tue Push · Thu Legs · Sat Pull · Sun Rest):

- **Day badge** — PUSH / PULL / LEGS / BJJ / REST.
- **Recovery card** — green/amber/red from the latest Apple Health snapshot (HRV vs 7-day average, resting HR, sleep). Grey until you've imported health data. Red means shorten the session or rest.
- **Training card** — gym days: each exercise with its current target and ghost numbers (your last sets). BJJ days: dinner-by-18:30 and afternoon-fueling reminders.
- **Protein bar** — today's grams vs the 130g target (160 ideal).

### Log gym (`/logger`) — during your workout

1. Tap **Start session** on a gym day (or "Log gym"). Today's exercises are pre-listed; tap one.
2. Ghost numbers show what you did last time. Weight/reps are prefilled — adjust with −/+ and hit **Log set**.
3. **Every set saves instantly.** If the app closes mid-workout, reopen it — nothing is lost.
4. The rest timer starts automatically (90s compounds, 60s isolation), vibrates when done, tap to skip.
5. The screen stays awake during the session. Use the warm-up checkbox for warm-up sets; "undo" removes a mistyped set. "Other exercise…" adds anything not on the list.

### Food (`/food`) — protein logging

- **Quick add** chips for staples: full shake (79g), 2 eggs (14g), Greek yogurt (17g), chicken breast 4oz (35g), cottage cheese (25g).
- For anything else: pick a meal label, describe the food, enter your protein estimate, **Log meal**. Estimates are fine — consistency beats precision.
- Example: sourdough slice + cream cheese + 2 sunny-side eggs + chilli oil → "breakfast", ~20g.
- The Today protein bar updates immediately.

### Body (`/body`) — Wednesday morning ritual

Before food and water: scale, then tape at navel (relaxed).

- Enter weight (lb), waist (cm), hip (cm) — any subset — and **Save reading**. One reading per day; a second save the same day merges into it.
- **Recomp signal**: weight flat + waist down = recomp working · weight up + waist stable = likely muscle · weight up + waist up = surplus. It needs a few waist readings before it says anything useful.
- Trend charts: last 30 weight readings, all waist readings.
- BF% from the scale is a **trend signal only** — the BIA algorithm skews for your body type; never read it as an absolute number.

### Import (`/import`) — Apple Health → tracker

Your VeSync scale, RENPHO tape, and Apple Watch all write into Apple Health. The **Health Export** Shortcut (build it once — see `SHORTCUT_GUIDE.md`) reads Health and puts a JSON on your clipboard.

Run Shortcut → open Import → paste → **Preview** → **Save**. This feeds the Recovery card (HRV/RHR/sleep) and merges weight/waist into Body trends. Do it each morning after the weigh-in.

### Coach (`/coach`) — one-tap Claude handoff

Tap **Ask the coach** on the Today screen. The app assembles your last 7 workout sessions, last 14 body readings, recovery snapshots, last 7 diet days, recent session notes, and pantry status into a single Claude-ready prompt (with your coaching rules and data conventions baked in — no file uploads needed).

- **Ask the coach** opens the iOS Share Sheet → tap Claude → the conversation starts with full context; type your question at the end.
- **Copy to clipboard** if you'd rather paste into Claude.ai yourself (also the automatic fallback on desktop browsers).
- The preview shows a token estimate; it warns if the context somehow exceeds the 8k budget.
- This export is also your de-facto **data backup** — do it at least weekly.

### Debug (`/debug`)

Store counts and data-layer checks. If something looks wrong, this shows whether the data actually landed in IndexedDB.

## Daily rhythm (target)

| When | What | Where |
|---|---|---|
| Wake | Weigh-in (+ tape on Wednesdays) | Scale/tape → Health |
| After weigh-in | Run Health Export → paste | Import |
| Post-gym | Shake → tap the 79g quick-add | Food |
| During gym | Log sets as you go | Log gym |
| Meals | Log with protein estimate | Food |
| Evening check | Protein bar green? | Today |

## Non-negotiables (from your coach rules)

1. Protein shake — delayed is fine, skipped is not.
2. Morning weigh-in — 60 seconds, same conditions.
3. Dinner before 18:30 on BJJ days — and a real afternoon snack before class.

## Data & privacy

Everything is stored in the browser's IndexedDB under the PWA. Deleting the app from the Home Screen can eventually clear its data — export via the Coach screen (Phase 5) or keep the weekly Claude sync as your backup. No data ever leaves the device unless you share it.
