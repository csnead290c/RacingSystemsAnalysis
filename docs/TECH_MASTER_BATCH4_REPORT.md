# Tech Master — Batch 4 Report: Event Entry & Scale Linkage Hardening

**Date:** 2026-03-12
**Scope:** Historical entry derivation, run-entry backfill, scale link hardening, review tooling
**Depends on:** Batches 1–3 (v17–v23 migrations, identity/event/entry/scale foundations)

---

## Section A: What Was Built

### A1. Migration v24 — Linkage Hardening Schema

**File:** `api/migrate-v24-tm-linkage.php`

New columns:
| Table | Column | Type | Purpose |
|-------|--------|------|---------|
| `event_entries` | `derivation_source` | ENUM('manual','roster_import','run_derived') | Tracks how an entry was created |
| `event_entries` | `source_driver_name` | VARCHAR(255) | Original driver_name from parity_runs for dedup |
| `scale_records` | `link_confidence` | ENUM('high','medium','low','none') | Confidence of automatic run-link |

New indexes:
| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| `idx_ee_derive_dedup` | `event_entries` | (event_instance_id, source_driver_name) | Fast dedup during derivation |
| `idx_pr_backfill` | `parity_runs` | (race_lookup, driver_name, event_entry_id) | Fast backfill queries |

Backfill: Existing entries get `derivation_source = 'manual'`.

### A2. Historical Entry Derivation

**Endpoint:** `POST tm-entries.php?action=deriveFromRuns`
**Auth:** `nhra.tech.admin`

For a given event (or all events), queries distinct `UPPER(TRIM(driver_name))` from `parity_runs` matching the event's `race_lookup`. For each unique driver:
1. Checks if an `event_entry` already exists (by `source_driver_name` or `persons.normalized_name`)
2. If not, finds or creates a provisional `person` record
3. Creates an `event_entry` with `derivation_source = 'run_derived'`

**Properties:**
- **Idempotent:** Safe to run multiple times — skips existing entries
- **Dry run:** `{ dry_run: true }` returns counts without writing
- **Scope:** Single event via `event_instance_id` or `{ all: true }` for all events

### A3. Run-Entry Backfill

**Endpoint:** `POST tm-entries.php?action=backfillRunLinks`
**Auth:** `nhra.tech.admin`

Sets `parity_runs.event_entry_id` for unlinked runs where:
- `UPPER(TRIM(driver_name))` matches exactly ONE event entry's `source_driver_name` or person's `normalized_name`
- The run's `race_lookup` matches the entry's event

**Conservative:** Skips ambiguous matches (driver name matches multiple entries). Reports ambiguous count separately.

**Properties:** Idempotent, supports dry_run, single-event or all-event scope.

### A4. Scale Run-Linking Hardened

**File:** `api/tm-scale.php` — `findNearestPriorRun()`

Updated to return `confidence` alongside `method`:

| Strategy | Method | Confidence | Logic |
|----------|--------|------------|-------|
| FK path | `auto_fk` | `high` | `parity_runs.event_entry_id` matches entry |
| Name match | `auto_name` | `medium` | `race_lookup` + `UPPER(driver_name)` |
| Car number | `auto_carnum` | `low` | `race_lookup` + `car_number` |
| No match | — | `none` | No run found |

`handleCreateRecord` now stores `link_confidence` in `scale_records` and returns it in the response.

### A5. Review API Endpoints

**File:** `api/tm-entries.php`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `?action=derivationStatus` | GET | read | Summary of derivation/linkage across events |
| `?action=derivationStatus&eventInstanceId=N` | GET | read | Single event detail |
| `?action=linkReview&eventInstanceId=N&mode=X` | GET | read | Review items by mode |
| `?action=manualLink` | POST | admin | Manually link a run to an entry |
| `?action=markReviewed` | POST | admin | Update entry status/notes |

**Link review modes:**
- `unlinked_runs` — Runs without `event_entry_id`, annotated with candidate entries
- `weak_entries` — Entries with no person or provisional person
- `unlinked_scale` — Scale records with `link_method = 'unlinked'`
- `ambiguous_runs` — Drivers matching multiple entries (with sample runs + candidates)

### A6. TypeScript Client Extensions

**File:** `src/services/techMasterApi.ts`

New types (13):
`DerivationSource`, `LinkConfidence`, `DerivationEventResult`, `DeriveFromRunsResponse`, `BackfillEventResult`, `BackfillRunLinksResponse`, `DerivationStatusEvent`, `DerivationStatusSingle`, `DerivationStatusSummary`, `LinkReviewMode`, `LinkReviewItem`, `LinkReviewResponse`

Updated: `ScaleCreateResponse` now includes `link_confidence: LinkConfidence`.

New API methods (6):
`deriveFromRuns()`, `backfillRunLinks()`, `derivationStatus()`, `linkReview()`, `manualLink()`, `markReviewed()`

### A7. Link Review UI Panel

**File:** `src/pages/tech/LinkReviewPanel.tsx`

New tab in TechMasterShell: **Link Review** (between Scale and Overview).

Sub-tabs:
1. **Derivation Status** — Global summary cards (total runs, linked, rate) + per-event table with link rates, entry counts, derived counts
2. **Unlinked Runs** — Event-scoped table with driver, class, ET, reason, candidate entries, one-click link button (admin)
3. **Weak Entries** — Entries with no person or provisional person, with run counts
4. **Unlinked Scale** — Scale records without run links
5. **Admin Actions** (admin only) — Derive from runs and backfill with dry-run/execute buttons, scoped by event or all

### A8. Roster Import Wording

**File:** `src/pages/tech/RosterImportModal.tsx`

Updated step-1 instructions to clarify: "Paste pre-event roster data below for upcoming or current events. For historical events, use Link Review → Admin Actions to derive entries from run data."

---

## Section B: Derivation & Backfill Logic

### Derivation Flow
```
parity_runs (for race_lookup R)
  → GROUP BY UPPER(TRIM(driver_name))
  → For each unique driver:
      Check event_entries (source_driver_name) → skip if exists
      Check event_entries (person.normalized_name) → skip if exists
      Find person by normalized_name → reuse if found
      Else → create provisional person
      Create event_entry (run_derived, source_driver_name = norm_name)
```

### Backfill Flow
```
For each event with entries:
  Build map: UPPER(TRIM(source_driver_name|normalized_name)) → [entry_ids]
  For each unlinked run (event_entry_id IS NULL):
    Normalize driver_name → lookup in map
    If exactly 1 candidate → SET event_entry_id (high confidence)
    If >1 candidates → skip (ambiguous)
    If 0 candidates → skip (no entry)
```

### Safety Properties
- **Idempotent:** Both operations check for existing records before writing
- **Conservative:** Backfill only links on exact single-match (no fuzzy)
- **Auditable:** `derivation_source` tracks origin; `source_driver_name` preserves original
- **Reversible:** `manualLink(runId, null)` can unlink a run
- **Dry run:** Both operations support preview without writes

---

## Section C: Files Changed

| File | Change |
|------|--------|
| `api/migrate-v24-tm-linkage.php` | **NEW** — v24 migration |
| `api/tm-entries.php` | +6 switch cases, +6 handler functions (~650 lines) |
| `api/tm-scale.php` | Updated `findNearestPriorRun` (returns confidence), `handleCreateRecord` (stores/returns confidence) |
| `src/services/techMasterApi.ts` | +13 types, +1 updated type, +6 API methods |
| `src/pages/tech/LinkReviewPanel.tsx` | **NEW** — Review UI panel (~485 lines) |
| `src/pages/TechMasterShell.tsx` | +import, +tab definition, +render line |
| `src/pages/tech/RosterImportModal.tsx` | Updated step-1 wording |

**No changes to:** parity.php, existing migrations, incident system, capabilities, guards, any test files.

---

## Section D: Verification

### Automated
- **tsc:** 0 errors, 0 warnings
- **vitest:** 2275 passed, 0 failed (85 test files)
- **build:** Production build succeeds (TechMasterShell chunk: 64.86 kB gzip: 14.21 kB)

### Manual Steps Required After Deploy
1. **Run migration v24:** `GET /api/migrate-v24-tm-linkage.php` (admin auth required)
2. **Derive entries:** Use Link Review → Admin Actions → Dry Run first, then Execute
3. **Backfill links:** Same panel, Backfill → Dry Run first, then Execute
4. **Review:** Check Derivation Status tab for link rates, review unlinked/weak items

### Unresolved Cases (Expected)
- Drivers whose names differ between runs (typos, abbreviations) will not auto-match — requires manual linking via the review UI
- Events without `race_lookup` cannot derive entries — requires manual entry creation
- Car-number-only scale links remain `low` confidence — review recommended

### What Was NOT Built (Per Scope)
- No Fuel MVP
- No dossier/history views
- No tech-card parsing
- No generic template infrastructure
- No broad parity refactoring

---

## PRODUCTION ACTIVATION — 2026-03-12

### Section PA-A: Production Actions Taken

#### Files Deployed
| File | Method |
|------|--------|
| `api/migrate-v24-tm-linkage.php` | SCP to production |
| `api/tm-entries.php` | SCP to production (redeployed after enum fix) |
| `api/tm-scale.php` | SCP to production |
| `dist/index.html` | SCP to production |
| `dist/assets/*` | SCP to production (full replace) |
| `dist/sw.js` | SCP to production |
| `dist/manifest.webmanifest` | SCP to production |

#### Migration v24 — Executed via PHP CLI on production server
```
=== Migration v24: Tech Master Linkage Hardening ===
1. event_entries.derivation_source...  Added
2. event_entries.source_driver_name... Added
3. scale_records.link_confidence...    Added
4. idx_ee_derive_dedup...              Added
5. idx_pr_backfill...                  Added
6. Backfill derivation_source='manual'... Updated: 0 rows (no pre-existing entries)
=== Migration v24 Complete ===
```

#### Historical Derivation — Executed on production
- **Dry run first:** Confirmed 130,822 entries would be created across 342 events
- **Real execution:** Completed successfully

#### Backfill — Executed on production
- **Dry run first:** Confirmed 637,780 runs linkable, 2 skipped, 0 ambiguous
- **Real execution:** Completed successfully, matching dry-run numbers exactly

#### Bug Found & Fixed During Activation
The `handleDeriveFromRuns` in `tm-entries.php` used `'provisional'` for `persons.status` and `'confirmed'` for `event_entries.entry_status`. Neither value exists in the production ENUM columns:
- `persons.status` is `ENUM('active','inactive','deceased')` — no `'provisional'`
- `event_entries.entry_status` is `ENUM('registered','active','withdrawn','disqualified')` — no `'confirmed'`
- `persons` table has no `created_by` column

**Fix:** Changed to `'active'` for both, removed `created_by` references. Redeployed `tm-entries.php` after fix. The activation script used the correct values, so all production data is correct.

### Section PA-B: Production Results

#### Pre-Activation Baseline
| Metric | Count |
|--------|-------|
| event_instances | 368 |
| events_with_runs | 342 |
| parity_runs | 664,088 |
| event_entries | 0 |
| persons | 0 |
| distinct_drivers | 13,361 |

#### Post-Activation State
| Metric | Count |
|--------|-------|
| event_entries created | **130,822** |
| event_entries skipped | 0 |
| persons created (new) | **13,361** |
| persons reused (cross-event) | 117,461 |
| parity_runs linked | **637,780** |
| parity_runs skipped (no entry) | 2 |
| parity_runs ambiguous | 0 |
| **Link rate** | **96.04%** |

#### Derivation Source Distribution
| Source | Count |
|--------|-------|
| `run_derived` | 130,822 |

#### Person Status Distribution
| Status | Count |
|--------|-------|
| `active` | 13,361 |

#### Unlinked Runs Breakdown (26,308 total unlinked)
| Category | Count | Notes |
|----------|-------|-------|
| NULL driver_name | 26,295 | Runs with no driver data at all |
| Empty driver_name | 3 | Blank string after trim |
| With driver_name but no matching event | 8 | Orphan race_lookup `20250919` (future event not yet in `parity_events`) |
| Bogus driver_name (e.g. `"0"`) | 2 | Data quality issues in source |

#### Intentionally Refused for Safety
- **No fuzzy matching:** Only exact `UPPER(TRIM(driver_name))` match used
- **No ambiguous linking:** Runs matching multiple entries were skipped (0 cases occurred)
- **No null-name linking:** Runs with NULL/empty driver_name intentionally skipped (26,298)
- **No orphan event linking:** 8 runs for `race_lookup=20250919` have no matching `parity_events` entry

### Section PA-C: Production Verification

| Check | Status |
|-------|--------|
| `/tech` loads (HTTP 200) | ✅ |
| Event Entries load with correct data | ✅ — verified entry #19334 (Aaron Cooper, run_derived, active) |
| Link Review tab functional | ✅ — all 4 modes return expected counts |
| Scale tab functional | ✅ — 0 records (expected, no scale data captured yet) |
| Migration v24 columns exist | ✅ — `derivation_source`, `source_driver_name`, `link_confidence` |
| Migration v24 indexes exist | ✅ — `idx_ee_derive_dedup`, `idx_pr_backfill` |
| Batch 1/2/3 tables intact | ✅ — seasons(17), event_types(5), event_instances(368), scale_rules(6), tech_cases(0), tech_findings(0) |
| No regressions | ✅ |

#### Largest Events by Entry Count (sanity check)
| Event | Entries |
|-------|---------|
| Chevrolet Performance NHRA U.S. Nationals | 834 |
| Chevrolet Performance U.S. Nationals 1.5 | 829 |
| Dodge Power Brokers NHRA U.S. Nationals | 809 |
| Toyota NHRA U.S. Nationals | 791 |
| Denso Spark Plugs NHRA U.S. Nationals | 790 |

These are U.S. Nationals events (largest NHRA events) — high entry counts are expected and correct.

### Section PA-D: Recommended Next Batch

**Recommendation: Proceed directly to Fuel MVP.**

**Justification from production data:**

1. **Link rate is 96.04%** — The 3.96% unlinked population is almost entirely runs with NULL driver_name (26,295 of 26,308 unlinked). These are data-quality issues in the source parity data, not linkage logic gaps. No amount of linkage hardening will resolve missing source data.

2. **Zero ambiguous cases** — The derivation produced exactly one entry per driver per event, and the backfill found exactly one match for every run it processed. The conservative matching logic worked perfectly.

3. **Only 10 runs** have driver names but couldn't link — 8 are from a future event (`20250919`) not yet ingested, and 2 have bogus names (`"0"`). Neither case warrants a cleanup pass.

4. **Scale link_confidence is ready** — The column exists, the hardened `findNearestPriorRun` will populate it as scale records are created. No pre-existing scale data needs remediation.

5. **The Link Review UI is deployed and functional** — Any edge cases that surface during real use can be resolved via the manual linking tools already in place.

**Bottom line:** The linkage foundation is clean and complete. There is no meaningful cleanup pass that would improve the system before Fuel MVP. Proceed to Fuel.
