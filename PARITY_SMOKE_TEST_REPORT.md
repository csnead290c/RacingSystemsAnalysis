# Parity Smoke Test Report v2
**Date:** February 27, 2026  
**Endpoint:** `GET /api/parity.php?action=paritySmokeTest`  
**Access:** Admin-gated (`nhra.parity` cap + owner/admin role)

## What Changed (v1 → v2)

1. **Qual Sheet uses real logic** — v1 queried all rounds and relied on "frontend filters". v2 mirrors `handleQualSheet` exactly: `round LIKE 'Q%'` filter, best-run-per-driver grouping, NHRA tiebreakers (ET asc → MPH desc → timestamp asc), valid drivers ranked then invalid at bottom.
2. **dq_flag normalized** — `COALESCE(r.dq_flag, 0)` in all queries. New `dqFlagDistribution` reports raw null/true/false counts.
3. **Weather coverage section** — Event-level canonical point count, largest gap, run-to-weather join coverage %, track coords check, and actionable `recommendedActions`.
4. **Driver history improved** — Uses nearest-canonical subquery join (not range cross-join), reports `coveragePct` and `sessionCounts`.

---

## Test 1: 2025 Gatornationals (event_id=3) — Weather Available

| Field | Value |
|-------|-------|
| **Event** | AMALIE Motor Oil NHRA Gatornationals |
| **Race Lookup** | 20250306 |
| **Track** | Gainesville Raceway (lat 29.76, lon -82.27) |
| **Dates** | 2025-03-06 → 2025-03-09 |
| **Class** | TF |

### Qual Sheet Assertions — ALL PASS 

| Assertion | Result | Proof |
|-----------|--------|-------|
| **onlyQualRounds** |  true | `["Q1", "Q2"]` |
| **orderingOk** |  true | Best ETs ascending: 3.685 → 3.723 → 3.726 → … → 10.498 |
| **dqAtBottomOk** |  true | 0 invalid drivers, all 17 valid |
| **dqMphBlankOk** |  true | No invalid drivers |

### Qual Sheet Stats
- **Total qual runs:** 31
- **Qualifiers:** 17 drivers, 0 invalid
- **dq_flag distribution:** 31 NULL, 0 true, 0 false

### Top 5 Qualifiers
| Pos | Driver | ET | MPH |
|-----|--------|----|-----|
| 1 | Antron Brown | 3.685 | 334.24 |
| 2 | Steve Torrence | 3.723 | 331.61 |
| 3 | Clay Millican | 3.726 | 333.49 |
| 4 | Shawn Langdon | 3.729 | 328.94 |
| 5 | Brittany Force | 3.731 | 330.23 |

### Driver History — Antron Brown (top qualifier)
- **Total runs:** 6 (2 qual + 4 elim)
- **Weather linked:** 6/6 = **100%** 
- Sample weather: 60–73°F, 22–96% RH, 29.73–29.85 inHg

### Weather Coverage — Event Level
- **Canonical points:** 190
- **Largest gap:** 30.0 min (expected for 30-min bucket)
- **Runs with weather:** 1828/1828 = **100%** 
- **Track coords:** Present 
- **Recommended actions:** None

---

## Test 2: 2024 U.S. Nationals (event_id=98) — No Weather

| Field | Value |
|-------|-------|
| **Event** | Toyota NHRA U.S. Nationals |
| **Race Lookup** | 20240828 |
| **Track** | Lucas Oil Indianapolis Raceway Park |
| **Dates** | 2024-08-28 → 2024-08-28 |
| **Class** | TF |

### Qual Sheet Assertions — ALL PASS 

| Assertion | Result | Proof |
|-----------|--------|-------|
| **onlyQualRounds** |  true | `["Q1", "Q2", "Q3", "Q4", "Q5"]` |
| **orderingOk** |  true | Best ETs ascending: 3.693 → 3.697 → 3.709 → … → 3.927 |
| **dqAtBottomOk** |  true | 0 invalid drivers |
| **dqMphBlankOk** |  true | No invalid drivers |

### Qual Sheet Stats
- **Total qual runs:** 98
- **Qualifiers:** 20 drivers, 0 invalid
- **dq_flag distribution:** 98 NULL, 0 true, 0 false

### Top 5 Qualifiers
| Pos | Driver | ET | MPH |
|-----|--------|----|-----|
| 1 | Brittany Force | 3.693 | 333.08 |
| 2 | Tony Schumacher | 3.697 | 334.32 |
| 3 | Antron Brown | 3.709 | 335.82 |
| 4 | Steve Torrence | 3.713 | 333.91 |
| 5 | Shawn Reed | 3.714 | 329.34 |

### Driver History — Brittany Force (top qualifier)
- **Total runs:** 8 (5 qual + 3 elim)
- **Weather linked:** 0/8 = **0%** 
- All weather fields null

### Weather Coverage — Event Level
- **Canonical points:** 0
- **Largest gap:** N/A
- **Runs with weather:** 0/4658 = **0%** 
- **Track coords:** Missing 
- **Recommended actions:**
  1. `Set track coordinates in Weather Health panel`
  2. `Run Weather Health → Backfill + Rebuild for this event`

### Note on Event Window
The event dates show `2024-08-28 → 2024-08-28` (single day) but runs span 2024-08-30 through 2024-09-02. This means the `end_date_local` needs updating in the events catalog — the parity_events entry only has the race_lookup start date, not the full multi-day event window. Even with weather backfilled, the canonical points would only cover 08-28 unless the dates are corrected first.

---

## dq_flag Observations

Both events show **100% NULL** dq_flag values in qualifying runs. The NHRA OData feed may not populate this field for qualifying rounds (DQ is primarily an elimination concept). The `COALESCE(dq_flag, 0)` normalization ensures these are treated as valid (dq_flag=0) consistently.

| Event | NULL | True (1) | False (0) |
|-------|------|----------|-----------|
| 2025 Gatornationals | 31 | 0 | 0 |
| 2024 U.S. Nationals | 98 | 0 | 0 |

---

## Technical Details

### Query Logic (matches handleQualSheet)
```sql
-- Qualifying runs only, flagged runs excluded
SELECT ... COALESCE(r.dq_flag, 0) AS dq_flag
FROM parity_runs r
WHERE r.race_lookup = ? AND r.class_index IN (?)
  AND r.round LIKE 'Q%'
  AND NOT EXISTS (SELECT 1 FROM parity_run_flags f
                  WHERE f.run_id = r.id AND f.flag_type IN ('bad','exclude'))
ORDER BY r.run_timestamp_utc ASC
```
Then: group by driver → select best run (ET asc, MPH desc, ts asc) → sort drivers → invalid at bottom.

### Weather Join (driver history)
```sql
LEFT JOIN parity_weather_canonical w
  ON w.timestamp_utc = (
      SELECT wc.timestamp_utc FROM parity_weather_canonical wc
      WHERE ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) <= 1800
      ORDER BY ABS(...) ASC LIMIT 1
  )
```

### Endpoint Parameters
- `event_id` (optional) — defaults to most recent event with runs
- `class_index` (optional) — defaults to `TF`

---

## Status

 All qual sheet assertions pass for both events  
 dq_flag normalized with COALESCE  
 Weather coverage reporting with actionable recommendations  
 Endpoint live at `https://racingsystemsanalysis.com/api/parity.php?action=paritySmokeTest`  
 Admin-gated, no user credentials needed
