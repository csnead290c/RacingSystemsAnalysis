# NHRA Tech Master — Phase 1 Batch 3 Report

**Date:** 2026-03-12
**Status:** Complete
**Scope:** Scale MVP — first operational module on the Tech Master backbone

---

## Section A — What Was Implemented

### A.1 Schema (migration v23)

#### `scale_records`
Scale detail table hanging off `tech_cases`. One row per weighing action.

| Column | Type | Purpose |
|--------|------|---------|
| `measurement_mode` | VARCHAR(20) NOT NULL | `combined`, `driver_only`, `car_only` |
| `measured_total_weight` | DECIMAL(8,2) NULL | Direct total measurement (combined mode) |
| `measured_driver_weight` | DECIMAL(8,2) NULL | Driver-only measurement |
| `measured_car_weight` | DECIMAL(8,2) NULL | Car-only measurement |
| `measured_rear_axle_weight` | DECIMAL(8,2) NULL | Rear axle / back-half weight |
| `derived_total_weight` | DECIMAL(8,2) NULL | Computed: car_weight + active driver reference |
| `is_official` | TINYINT(1) DEFAULT 1 | Official vs practice/informational |
| `linked_run_id` | INT NULL FK → parity_runs | Post-run context linkage |
| `link_method` | VARCHAR(20) NULL | `auto_fk`, `auto_name`, `auto_carnum`, `manual`, `unlinked` |
| `measured_at` | DATETIME NOT NULL | Automatic timestamp |
| `operator_id` | INT NULL | Operator who performed the weigh |
| `scale_station` | VARCHAR(50) NULL | Physical station identifier |
| `tech_case_id` | INT NOT NULL FK → tech_cases | Backbone lifecycle link |
| `event_entry_id` | INT NOT NULL FK → event_entries | Entry context |

#### `scale_rules`
Lightweight class/rule config for minimum weight enforcement.

| Column | Type | Purpose |
|--------|------|---------|
| `category` | VARCHAR(100) NOT NULL | e.g. "Top Fuel", "Pro Stock" |
| `class_index` | VARCHAR(100) NOT NULL | e.g. "TF", "PS" |
| `season_year` | SMALLINT NULL | Season-specific rules (NULL = default) |
| `min_total_weight` | DECIMAL(8,2) NULL | Minimum total weight (NULL = not enforced) |
| `min_rear_axle_weight` | DECIMAL(8,2) NULL | Minimum rear axle weight |
| `rear_axle_required` | TINYINT(1) DEFAULT 0 | Whether rear axle measurement is mandatory |
| `driver_weigh_required` | TINYINT(1) DEFAULT 0 | Whether driver reference weigh is mandatory |
| UNIQUE KEY | `(category, class_index, season_year)` | One rule per class per season |

**Seeded rules:** TF (2330), FC (2525), PS (2350 + 1100 rear), PSM (625), TAD (2125), TAFC (2475)

### A.2 API: `tm-scale.php` (10 actions)

| Action | Method | Cap | Purpose |
|--------|--------|-----|---------|
| `createRecord` | POST | admin | Create scale record (auto-creates tech_case, auto-links run, generates findings) |
| `listByEvent` | GET | read | All scale records for an event with entry/identity joins |
| `listByEntry` | GET | read | Scale records for a specific entry |
| `getRecord` | GET | read | Single record with findings |
| `driverReference` | GET | read | Active driver reference weight for an entry |
| `compliance` | GET | read | Full compliance check: pass/fail/review with rule comparison |
| `updateRunLink` | POST | admin | Manual run-link reassignment |
| `listRules` | GET | read | Active scale rules, optionally filtered by category |
| `upsertRule` | POST | admin | Create or update a scale rule |
| `entryScaleStatus` | GET | read | Scale readiness summary for an entry |

### A.3 Run-Linking Logic

Three-tier auto-linking strategy in `findNearestPriorRun()`:

1. **`auto_fk`** — Direct: `parity_runs.event_entry_id` FK match (ideal, requires bridge backfill)
2. **`auto_name`** — Fuzzy: `race_lookup` + `UPPER(driver_name)` match
3. **`auto_carnum`** — Fuzzy: `race_lookup` + `car_number` match
4. **`unlinked`** — No candidate found; flagged for review

Manual reassignment via `updateRunLink` action. Link method is always recorded for auditability.

### A.4 Compliance Findings / Flags

Six auto-generated finding types via `generateScaleFindings()`:

| Flag | Severity | Trigger |
|------|----------|---------|
| `missing_driver_reference` | medium | Car-only weigh with no active driver reference |
| `under_minimum_total` | high | Effective weight below class minimum |
| `under_minimum_rear_axle` | high | Rear axle below class minimum |
| `missing_rear_axle` | low | Rear axle required by rules but not recorded |
| `no_run_linked` | info | No parity run linked (non-driver-only modes) |
| `duplicate_close_interval` | low | Repeat weigh within 5 minutes for same entry |

All findings are inserted into `tech_findings` via the tech case backbone. This means:
- Cross-cutting queries work: "all findings for driver X" includes scale findings
- The same disposition lifecycle (open → resolved/penalized/waived) applies
- Future Fuel module can follow the identical pattern

### A.5 TypeScript Extensions

**New types (10):** `ScaleMeasurementMode`, `ScaleLinkMethod`, `ScaleRecord`, `ScaleRule`, `ScaleCreateParams`, `ScaleCreateResponse`, `ScaleComplianceResponse`, `DriverReferenceResponse`, `EntryScaleStatusResponse`

**New API methods (11):** `createScaleRecord`, `listScaleByEvent`, `listScaleByEntry`, `getScaleRecord`, `getDriverReference`, `getScaleCompliance`, `updateScaleRunLink`, `listScaleRules`, `upsertScaleRule`, `getEntryScaleStatus`

### A.6 UI: ScaleWorkspacePanel

Event-scoped operational workspace:

- **Event selector** — dropdown with all events
- **Class filter** — filter entries by class
- **Entry selector** — scrollable table showing #, driver, team, class, status; click to select
- **Context badges** — min weight rule, rear axle min, driver reference status, unlinked warning
- **Mode selector** — Combined ⚖️ / Driver Only 🧑 / Car Only 🏎️
- **Mode-specific inputs** — total weight (combined), driver weight (driver_only), car weight + live derived total preview (car_only), rear axle (combined/car_only), scale station, notes
- **Save** — creates record, shows compliance feedback with flag list
- **Result feedback** — green (no flags) or yellow (flags), derived total, run link status, flag descriptions
- **Scale history table** — all records for the event: #, driver, class, mode badge, weight (with "derived" indicator), rear axle, run link badge, timestamp

### A.7 TechMasterShell Updates

- Added `'scale'` to Tab type
- Scale tab is the **2nd tab** (after Event Entries, before Overview)
- `ScaleWorkspacePanel` imported and rendered in the tab content

---

## Section B — Operational Fit Check

### How the Scale MVP Matches Trackside Workflow

| Workflow | Implementation | Fit |
|----------|---------------|-----|
| Combined weigh | Operator selects entry → enters total weight → optionally rear axle → save | ✅ Direct match |
| Driver-only weigh | Operator selects entry → enters driver weight → becomes active reference | ✅ Timestamped, auditable |
| Car-only weigh | Operator selects entry → enters car weight → system derives total from active driver ref | ✅ Derived total shown in form preview + stored separately |
| Post-run context | Every record is auto-timestamped; auto-links to nearest prior run | ✅ Three-tier auto-link with manual fallback |
| Compliance check | Auto-generated findings on save; pass/fail/review via compliance endpoint | ✅ Immediate feedback |
| Entry readiness | Entry selector shows status badges; unlinked/provisional entries visually flagged | ✅ Obvious but still selectable |
| Scale history | Full event history table with mode badges, weight display, run link status | ✅ Operational review |

### Limitations

1. **No offline/mobile support** — requires network connectivity; tablet-optimized layout not built
2. **No scale station management** — free-text field, not a managed entity
3. **No operator selection** — operator_id is available but no operator picker UI yet
4. **No weight trend analysis** — no charts or cross-event weight tracking
5. **No bulk scale import** — one record at a time through the form
6. **Run-linking depends on bridge FK** — `auto_fk` strategy requires `parity_runs.event_entry_id` backfill from Batch 1 bridge; until then, `auto_name` and `auto_carnum` are the active strategies
7. **Rule management** — API supports CRUD but no dedicated rule management UI yet (seeded rules cover the pro classes)

### What Must Be Done Before Fuel Can Follow Cleanly

The Scale MVP establishes the pattern that Fuel should follow:

1. **Detail table** — `fuel_samples` hangs off `tech_cases` exactly like `scale_records`
2. **Auto-findings** — same `generateXxxFindings()` pattern, inserting into `tech_findings`
3. **Entry selection** — same entry-scoped workflow
4. **Run-linking** — same `findNearestPriorRun()` function (can be extracted to shared helper)
5. **Compliance endpoint** — same pattern: load record → load rule → check → return result

No additional backbone changes needed. Fuel can be built purely additively.

---

## Section C — Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | Clean (0 errors) |
| `vitest run` | 2275 passed, 85 files, 0 failures |
| `vite build` | Success (4.53s) |
| TechMasterShell chunk | 51.36 kB gzip: 11.70 kB |
| Existing tests intact | All 2275 pass unchanged |
| No parity changes | Confirmed — no parity files touched |
| No Batch 1/2 regressions | All identity, entry, roster, detail endpoints unchanged |

### Scale Scenarios Validated (design-level)

| Scenario | Validation |
|----------|-----------|
| Combined weigh for TF entry | Creates tech_case + scale_record, checks 2330 min |
| Driver-only weigh | Stores as reference, no run link attempted |
| Car-only weigh with driver ref | Computes derived total, checks min |
| Car-only weigh without driver ref | Flags missing_driver_reference, derived_total is null |
| Under minimum total | Flags under_minimum_total with deficit in description |
| Under minimum rear axle (PS) | Flags under_minimum_rear_axle |
| Missing required rear axle (PS) | Flags missing_rear_axle |
| No run found | Flags no_run_linked |
| Repeat weigh within 5 min | Flags duplicate_close_interval |
| Manual run link reassignment | Updates link_method to 'manual' |

### Not Fully Verified (requires live DB)

- Actual run-linking against real parity_runs data
- Scale rule seed data accuracy (weights are from public NHRA rules)
- Concurrent operator scenarios
- Production performance with large event entry sets

---

## Section D — Next Recommended Batch

### Recommended: **Fuel MVP** (Batch 4)

**Justification:** The Scale MVP establishes the exact pattern that Fuel should follow. Building Fuel next:

1. **Maximizes pattern reuse** — same detail table + tech_case backbone + entry-scoped workflow + auto-findings
2. **Completes the two most frequent trackside operations** — Scale and Fuel are the two checks that happen on virtually every entry at every event
3. **Is the smallest incremental step** — Fuel is structurally simpler than Scale (no driver/car split modes, no derived weights)
4. **Defers complexity** — Tech card audit, teardown, and dossier views are all significantly larger undertakings

**Fuel MVP scope would include:**
- `fuel_samples` detail table (hanging off tech_cases)
- `fuel_rules` config table (fuel type requirements by class)
- `tm-fuel.php` API (create sample, list, compliance check)
- FuelWorkspacePanel UI (entry selection, sample capture, compliance feedback, history)
- Auto-findings: wrong fuel type, specific gravity out of range, missing sample, etc.

**Alternative consideration:** If Fuel is not the immediate priority, the next best batch would be **Scale Refinement + Parity Bridge Linkage Backfill** — running a migration to populate `parity_runs.event_entry_id` from matched driver_name/race_lookup pairs, which would activate the `auto_fk` run-linking strategy and provide a foundation for cross-domain queries.

---

## Files Changed / Created

### New Files (3)
| File | Purpose |
|------|---------|
| `api/migrate-v23-tm-scale.php` | Migration: scale_records, scale_rules tables + seed data |
| `api/tm-scale.php` | Scale MVP API: 10 actions for records, rules, compliance, run-linking |
| `src/pages/tech/ScaleWorkspacePanel.tsx` | Scale operational UI: entry selection, 3 capture modes, compliance, history |

### Modified Files (2)
| File | Changes |
|------|---------|
| `src/services/techMasterApi.ts` | +10 types/interfaces, +11 API methods for Scale |
| `src/pages/TechMasterShell.tsx` | Added Scale tab (2nd position), imported ScaleWorkspacePanel |

### Report
| File | Purpose |
|------|---------|
| `docs/TECH_MASTER_BATCH3_REPORT.md` | This report |

---

## Endpoint Summary After Batch 3

| API File | Total Actions | New in Batch 3 |
|----------|---------------|----------------|
| `tm-identities.php` | 8 | 0 |
| `tm-events.php` | 6 | 0 |
| `tm-entries.php` | 9 | 0 |
| `tm-techcases.php` | 10 | 0 |
| **`tm-scale.php`** | **10** | **10** |
| **Total** | **43** | **10** |
