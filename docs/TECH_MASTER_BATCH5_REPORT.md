# NHRA Tech Master — Phase 1, Batch 5: Fuel MVP

**Date**: March 12, 2026
**Status**: DEPLOYED & ACTIVATED IN PRODUCTION

---

## SECTION A — What Was Implemented

### Schema Changes (Migration v25)

**`fuel_records`** — 28-column detail table linked to tech_cases + event_entries + optional parity_runs

| Column | Type | Purpose |
|--------|------|---------|
| id, uuid | PK + unique | Standard identity |
| tech_case_id | FK → tech_cases | Backbone linkage |
| event_entry_id | FK → event_entries | Operational parent |
| check_type | ENUM(spot_check, pre_run, post_run, random, confiscation) | Type of fuel check |
| fuel_type_declared | ENUM(nitromethane, methanol, gasoline, diesel, e85, other) | Declared fuel |
| sample_id | VARCHAR(100) | Physical sample tracking |
| sg_measured / sg_expected_min / sg_expected_max / sg_result | DECIMAL(8,4) + ENUM | Specific gravity measurement + rule comparison |
| dielectric_measured / dielectric_expected_min / dielectric_expected_max / dielectric_result | DECIMAL(8,4) + ENUM | Dielectric measurement + rule comparison |
| temperature_f | DECIMAL(6,2) | Sample temperature |
| overall_result | ENUM(pass, fail, review) | Computed overall outcome |
| is_official | TINYINT | Official/unofficial flag |
| linked_run_id | FK → parity_runs (SET NULL) | Optional run linkage |
| link_method / link_confidence | VARCHAR + ENUM | Run-link provenance |
| measured_at | TIMESTAMP | Measurement timestamp |
| operator_id, test_station, notes, created_by | Support fields | Operator tracking |

Indexes: `uk_fr_uuid`, `idx_fr_entry`, `idx_fr_case`, `idx_fr_measured`, `idx_fr_run`

**`fuel_rules`** — Class-scoped fuel compliance rules

| Column | Type | Purpose |
|--------|------|---------|
| category, class_index, season_year | VARCHAR + INT | Rule scope (unique key) |
| fuel_type_required | ENUM | Required fuel type |
| sg_min, sg_max | DECIMAL(8,4) | Allowed SG range |
| dielectric_min, dielectric_max | DECIMAL(8,4) | Allowed dielectric range |
| temperature_compensate | TINYINT | Temperature compensation flag |
| is_active | TINYINT | Active/inactive toggle |

**Seed rules** (6 rows):
- TOP FUEL / TF — nitromethane, SG 0.9800–1.1500
- FUNNY CAR / FC — nitromethane, SG 0.9800–1.1500
- PRO STOCK / PS — gasoline, SG 0.7100–0.7700 (temp compensated)
- PRO STOCK MOTORCYCLE / PSM — gasoline, SG 0.7100–0.7700 (temp compensated)
- TOP ALCOHOL / TAD — methanol, SG 0.7900–0.8100
- TOP ALCOHOL / TAFC — methanol, SG 0.7900–0.8100

### APIs Added

**`api/tm-fuel.php`** — 9 actions:

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| createRecord | POST | admin | Create fuel check with auto tech_case, run-linking, compliance evaluation, finding generation |
| listByEvent | GET | read | Fuel records for an event with entry/person joins |
| listByEntry | GET | read | Fuel records for a specific entry |
| getRecord | GET | read | Single record detail with findings |
| compliance | GET | read | Compliance check with rule, findings, open flag count |
| updateRunLink | POST | admin | Manual run-link reassignment |
| listRules | GET | read | Active fuel rules, filterable by category |
| upsertRule | POST | admin | Create/update fuel rule (ON DUPLICATE KEY) |
| entryFuelStatus | GET | read | Fuel readiness summary for an entry |

### Auto-Generated Findings (7 types)

| Flag | Severity | Condition |
|------|----------|-----------|
| sg_out_of_range | high | SG measurement outside rule's min/max range |
| dielectric_out_of_range | high | Dielectric reading outside rule's min/max range |
| no_rule_configured | medium | No fuel rule exists for the entry's category/class |
| fuel_type_mismatch | high | Declared fuel type ≠ required fuel type |
| missing_sg_measurement | medium | SG not measured but rule has SG range defined |
| no_run_linked | info | No parity run linked (pre_run / post_run check types) |
| duplicate_close_interval | low | Repeat fuel check within 10 minutes for same entry |

### Run-Linking Strategy

Same 3-tier strategy as Scale:
1. **auto_fk** (high): Direct `parity_runs.event_entry_id` match
2. **auto_name** (medium): `race_lookup` + `UPPER(driver_name)` match
3. **auto_carnum** (low): `race_lookup` + `car_number` match
4. **unlinked** (none): No candidate found

### TypeScript Extensions

**Types added** (11):
- `FuelCheckType`, `FuelType`, `FuelTestResult`, `FuelOverallResult`
- `FuelRecord`, `FuelRule`, `FuelCreateParams`, `FuelCreateResponse`
- `FuelComplianceResponse`, `EntryFuelStatusResponse`

**API methods added** (9):
- `createFuelRecord`, `listFuelByEvent`, `listFuelByEntry`, `getFuelRecord`
- `getFuelCompliance`, `updateFuelRunLink`
- `listFuelRules`, `upsertFuelRule`, `getEntryFuelStatus`

### UI Components

**`src/pages/tech/FuelWorkspacePanel.tsx`** — Full event-scoped fuel check workspace:
- Event selector dropdown
- Class filter
- Entry selector table (car #, driver, team, class, status)
- Context badges: fuel rule info (fuel type, SG range, dielectric range), or "No fuel rule configured" warning
- Check type selector (Spot Check, Pre-Run, Post-Run, Random, Confiscation)
- Fuel type declared selector
- Sample ID input
- SG measurement with live in-range/out-of-range feedback
- Dielectric measurement with live in-range/out-of-range feedback
- Temperature input
- Test station + notes
- Save with immediate compliance feedback (PASS/FAIL/REVIEW with flag descriptions)
- Fuel check history table: car #, driver, class, check type badge, SG + mini-result, dielectric + mini-result, overall result badge, run link, timestamp

**TechMasterShell** — Fuel tab added as 3rd tab (after Event Entries and Scale)

### Endpoint Totals After Batch 5

| API File | Actions |
|----------|---------|
| tm-identities.php | 8 |
| tm-events.php | 6 |
| tm-entries.php | 15 |
| tm-techcases.php | 10 |
| tm-scale.php | 10 |
| **tm-fuel.php** | **9** |
| **Total** | **58** |

---

## SECTION B — Operational Fit Check

### How the Fuel MVP Matches Actual Trackside Workflow

1. **Fuel sample capture**: Operator selects event → filters by class → picks entry by car number/driver → records check type, declared fuel, SG/dielectric measurements, temperature, sample ID, notes. Timestamp is automatic.

2. **Measured values**: SG and dielectric are the two primary measured fields, matching real NHRA fuel testing equipment. Temperature is captured for future temperature-compensation support. Sample ID allows tracking of physical samples.

3. **Rule-driven compliance**: Rules are class-scoped with SG range, dielectric range, required fuel type. Evaluation is automatic at save time. Live in-range/out-of-range feedback shows before save.

4. **Findings/flags**: 7 finding types cover the practical compliance scenarios (out-of-range, fuel type mismatch, missing measurement, no rule, duplicates). Findings use the same `tech_findings` backbone as Scale.

5. **History**: Event-scoped fuel check history with all relevant columns, color-coded result badges, and check type badges. Records for the selected entry are highlighted.

6. **Attachments**: Backbone relationship is ready via `tech_cases → tech_attachments`. No attachment UX was built in this batch (per scope).

### Limitations

- **Temperature compensation**: The `temperature_compensate` flag exists on rules but no actual compensation formula is applied yet. This is a future enhancement.
- **Multi-reading support**: Only one SG and one dielectric reading per record. Future batches could add repeat-reading averaging.
- **No fuel lab workflow**: Sample chain-of-custody, lab assignment, and multi-step analysis are not modeled.
- **No confiscation workflow**: While `confiscation` is a check type, there's no confiscated-sample management.
- **Dielectric rules**: No seed rules include dielectric ranges. Dielectric rules can be added via `upsertRule` when real ranges are known.

### What Future Modules Can Reuse

- **Event/entry selection pattern**: Event selector → class filter → entry table is now used by both Scale and Fuel.
- **Run-linking strategy**: The 3-tier auto-link + manual override pattern is shared.
- **Finding generation pattern**: Auto-generate findings from tech_findings backbone with severity levels.
- **Rule/config pattern**: Category + class_index + season_year scoped rules with upsert.
- **Compliance evaluation**: Rule lookup → measurement comparison → result computation → finding generation.
- **UI patterns**: Context badges, result badges, check-type badges, history tables.

---

## SECTION C — Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 2275 tests pass, 3 todo (85 test files) |
| `npm run build` | ✅ Successful (4.31s) |
| Parity still works | ✅ No parity files modified |
| Batch 1/2/3/4 workflows | ✅ No regressions — all existing API files unchanged |
| Fuel types compile | ✅ 11 new types, 9 new API methods in techMasterApi.ts |
| FuelWorkspacePanel renders | ✅ Included in TechMasterShell chunk (80KB) |

### Sample Fuel Scenarios Validated (schema-level)

- TF entry + SG 1.0320 → rule found (0.9800–1.1500) → PASS, no flags
- PS entry + SG 0.7800 → rule found (0.7100–0.7700) → FAIL, `sg_out_of_range` flag
- PS entry + declared methanol → rule requires gasoline → FAIL, `fuel_type_mismatch` flag
- Unknown class entry → no rule → REVIEW, `no_rule_configured` flag
- Pre-run check with no run link → `no_run_linked` flag
- Repeat check within 10 min → `duplicate_close_interval` flag

### Not Fully Verified

- End-to-end UI workflow on production was not tested with a real fuel check save (would require logging in as admin and creating a record). Schema and API structure are verified.

---

## SECTION D — Production Activation

### Files Deployed

| File | Type |
|------|------|
| `api/tm-fuel.php` | New — Fuel API (9 actions) |
| `api/migrate-v25-tm-fuel.php` | New — Migration script |
| `dist/index.html` | Updated — new chunk references |
| `dist/assets/*` | Updated — new build with FuelWorkspacePanel |
| `dist/sw.js` | Updated |

### Migration Run

```
=== Migration v25: Fuel MVP ===
fuel_records: created/exists
fuel_rules: created/exists
fuel_rules: seeded 6 new rules
=== Migration v25 Complete ===
```

Executed via SSH CLI: `php api/migrate-v25-tm-fuel.php`

### Production Verification

| Check | Result |
|-------|--------|
| `fuel_records` table | ✅ Created, 28 columns |
| `fuel_rules` table | ✅ Created, 6 seed rules |
| Seed rules correct | ✅ TF/FC/PS/PSM/TAD/TAFC with correct SG ranges |
| Main JS bundle | ✅ 200 application/javascript |
| TechMasterShell chunk | ✅ 200 application/javascript |
| tm-fuel.php responds | ✅ 401 (auth required — correct behavior) |
| No nested assets dir | ✅ Verified after deploy |

### Prod-Only Issues Found/Fixed

1. **Nested assets directory**: `scp -r dist/assets/` creates `assets/assets/` when target dir exists. Fixed by moving contents up and removing nested dir. This is a recurring SCP behavior — future deploys should use `scp dist/assets/* remote:assets/` pattern.

2. **Migration auth**: Initial `rsa_requireAuth()` was called before CLI check, blocking SSH CLI execution. Fixed by moving CLI detection before auth gate.

---

## SECTION E — Next Recommended Batch

### Recommendation: **Batch 6 — Body/Chassis/General Tech Foundation**

**Justification:**

With Scale (Batch 3) and Fuel (Batch 5) now live as the first two sibling modules on the Tech Master backbone, the next highest-value step is to establish the **Body/Chassis/General Tech** module. This is the third and broadest inspection type at any NHRA tech station.

**Scope would include:**

1. **General inspection record schema** — A flexible detail table supporting body/chassis measurements (wheelbase, wing height, ground clearance, body template compliance, etc.) with a type-driven measurement approach rather than fixed columns.

2. **Inspection checklist/template MVP** — A lightweight checklist definition system where category/class-scoped inspection items can be defined and checked off during tech inspection.

3. **General tech API** — CRUD for inspection records, checklist evaluation, findings generation for non-conformance.

4. **General tech UI** — Event-scoped inspection capture under the existing `/tech` shell.

5. **Cross-module status summary** — A per-entry "tech readiness" view showing Scale status + Fuel status + General Tech status in one glance.

**Why not tech cards or dossier yet:**
- Tech cards require parsing/template infrastructure that would broaden scope significantly
- Dossier/history views require cross-event query patterns not yet needed
- Body/chassis tech is the natural third module that completes the core inspection workflow
- The cross-module status summary provides immediate operational value

**Alternative candidates considered:**
- *Tech card audit workspace* — too broad for one batch, requires template engine
- *Cross-module reporting bridge* — useful but premature without a third module
- *Body/chassis foundation* — **selected** as it completes the core tech station trifecta
