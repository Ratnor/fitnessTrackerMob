# Building the "Health Export" iOS Shortcut

Goal: one tap → reads Apple Health → JSON on the clipboard → paste into the app's **Import** screen. No coding — everything happens in the iOS **Shortcuts** app.

Your data sources already flowing into Apple Health: VeSync scale (weight, BF%, muscle mass), RENPHO tape (waist), Apple Watch (HRV, resting HR, sleep), iPhone (steps).

## Target JSON (dev plan §1.4)

```json
{
  "date": "2026-07-08",
  "recovery": { "hrv_ms": 52, "resting_hr_bpm": 58, "sleep_hours": 6.8 },
  "body": { "weight_lb": 169.4, "body_fat_pct": 11.9, "muscle_mass_lb": 141.8, "waist_cm": 83.5 },
  "activity_yesterday": { "steps": 8200, "active_kcal": 480, "bjj_logged": false },
  "fitness": { "vo2max": 42.1 }
}
```

Every field is optional except `date` — the Import screen handles missing values. **Start with the simple version, expand later.**

## Version 1 — body metrics only (build this first, ~10 min)

1. Open **Shortcuts** → **+** → rename to **Health Export**.
2. Add action: **Find Health Samples** (search "health samples"). Configure:
   - Type: **Weight**
   - **No date filter** — if a "Start Date" filter appears, remove it. "Where **All** of the following are true" is just the filter-group header; with no filters it does nothing — leave it.
   - Unit: **lbs** · Group by: None · Sort by: **Start Date** · Order: **Latest First** · Limit: **Get 1 Health sample**
   - Latest First + Limit 1 = most recent reading, whenever it was taken. A date filter would return nothing on days without a fresh sample (waist is weekly!).
3. Add **three more separate Find Health Samples actions** (one per metric — do NOT use "Filter Health Samples" or add metrics as filters):
   - **Body Fat Percentage** (%)
   - **Lean Body Mass** — ⚠ set Unit to **lb** (Health often defaults to kg; the tracker stores lb)
   - **Waist Circumference** — Shortcuts' Unit picker has no cm, so use **in** and name the JSON key `waist_in`; the tracker converts to cm on import.
   All: Latest First, Limit 1, no date filter (or "in the last 30 days").
4. Add action: **Format Date** with Current Date, format `yyyy-MM-dd` (custom format).
5. Add action: **Text**, and type the JSON, inserting magic variables where values go. You'll see several identical "Health Samples" variables — they appear in the same order as your Find actions (Weight, BF%, Lean Mass, Waist). Optional: tap an inserted variable bubble → **Rename** to label it.

   ```
   {
     "date": "[Formatted Date]",
     "body": {
       "weight_lb": [Weight],
       "body_fat_pct": [Body Fat Percentage],
       "muscle_mass_lb": [Lean Body Mass],
       "waist_in": [Waist Circumference]
     }
   }
   ```

   (Tap each `[...]` spot → select the corresponding Find Health Samples variable.)
6. Add action: **Copy to Clipboard**.
7. First run: iOS asks for Health read permissions — allow each type.

Run it → open the tracker → **Import** → paste → Preview → Save.

## Version 2 — add recovery (Watch) fields

Add more **Find Health Samples** actions:

- **Heart Rate Variability** — Latest First, Limit 1 → `hrv_ms`
- **Resting Heart Rate** — Latest First, Limit 1 → `resting_hr_bpm`
- **Sleep** — this one is fiddly: Find Health Samples where Type is **Sleep Analysis**, filtered to samples where Value **is Asleep**, Start Date **is in the last 18 hours**. Then add **Statistics** → Sum of the sample **durations**, divide by 60 (**Calculate**) to get hours → `sleep_hours`.
- **Steps** — filter Start Date **is yesterday**, then **Statistics → Sum** → `steps` under `activity_yesterday`.
- **VO2 Max** — Latest First, Limit 1 → `vo2max`.

Extend the Text action's JSON with the `recovery`, `activity_yesterday`, and `fitness` blocks.

Tip: for `bjj_logged`, simplest is a **Choose from Menu** action ("BJJ yesterday?" Yes/No) that sets a variable to `true`/`false`.

## Version 3 — quality of life

- Add the Shortcut to your Home Screen next to the tracker icon, or to the Action Button.
- Add an **Open URL** action at the end pointing at `https://<your-vercel-url>/import` so it opens the Import screen automatically after copying.

## Morning routine (target state)

Step on scale → tape waist (RENPHO) → tap **Health Export** → tracker opens on Import → paste → Save. Under a minute, and the Recovery card and Body trends light up.

## Troubleshooting

- **Empty value in JSON** → that Health type has no recent sample or permission was denied (Shortcuts → shortcut → ⓘ → Privacy).
- **Import says invalid JSON** → check for a trailing comma after the last field in a block; the Text action must produce strict JSON.
- **Waist not in Health** → confirm the RENPHO app has Health write permission for Waist Circumference.
- **Lean Body Mass comes out in kg** → set Unit to lb inside that Find Health Samples action (the tracker stores lb).
- **Added a "Filter Health Samples" action by mistake** → delete it; each metric needs its own Find Health Samples action instead.
- **BMI** → don't bother exporting it; the tracker derives everything it needs from weight + waist.
