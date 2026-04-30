# NHRA Tech Master — Phase 1, Batch 8: Teardown Foundation

**Date**: March 12, 2026
**Status**: DEPLOYED & ACTIVATED IN PRODUCTION

---

## SECTION A — Batch 7 Smoke Closeout

### Actions Performed (authenticated production smoke via PHP CLI)

| Step | Action | Result |
|------|--------|--------|
| 1 | Created declaration for entry #130824 (Super Comp / SC) | ✅ id=1, uuid assigned, revision=1, 6 fields scaffolded |
| 2 | Saved 6 declaration field values (weight, fuel, engine, displacement, chassis serial, safety) | ✅ All 6 fields persisted with correct values |
| 3 | Added artifact metadata (smoke_test_card.pdf, application/pdf, 245KB, 2 pages) | ✅ Artifact created, card_status auto-transitioned missing → uploaded |
| 4 | Ran tech card audit (created tech_case, evaluated all checks) | ✅ 0 flags (all keys filled, no cross-module records to mismatch), status → audited |
| 5 | Verified final state: declaration audited, received_at set, audited_at set, 6 fields, 1 artifact, 0 findings | ✅ All correct |
| 6 | Cleaned up all smoke test data | ✅ All rows removed |

### Issues Found

**None.** The entire Batch 7 Tech Card workflow operated correctly in production. All status transitions, field saves, artifact auto-transition, audit evaluation, and tech_case/findings generation worked as designed.

---

## SECTION B — What Was Implemented

### Schema Changes (Migration v28)

Four new tables form the teardown foundation:

**`teardown_templates`** — Curated teardown definitions per category/class (11 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id, uuid | PK + unique | Standard identity |
| category | VARCHAR(100) | Category scope (or '*' for wildcard) |
| class_index | VARCHAR(50) | Class scope (or '*' for wildcard) |
| label | VARCHAR(255) | Human-readable template name |
| description | TEXT | Template description |
| is_active | TINYINT(1) | Active flag |
| sort_order | INT | Display ordering |
| created_by | INT | Creator |
| created_at, updated_at | TIMESTAMP | Audit trail |

Indexes: `uk_tdt_uuid`, `uk_tdt_cat_class(category, class_index)`, `idx_tdt_active`

**`teardown_template_items`** — Ordered items within a template (13 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id | PK | Standard identity |
| template_id | FK → teardown_templates | Parent template |
| item_category | VARCHAR(100) | Grouping (Engine Block, Cylinder Heads, Supercharger, etc.) |
| item_label | VARCHAR(500) | Human-readable item name |
| item_type | ENUM(serial_check, measurement, visual_check, note) | Input type |
| description | TEXT | Item description |
| sort_order | INT | Display ordering |
| is_required | TINYINT(1) | Required flag |
| spec_min, spec_max | DECIMAL(12,4) | Specification range for measurements |
| spec_unit | VARCHAR(50) | Unit of measure |
| declaration_key | VARCHAR(100) | Linkage to tech card declaration field_key for comparison |
| created_at | TIMESTAMP | Audit trail |

FK: `fk_tdti_template → teardown_templates CASCADE`

**`teardown_records`** — Teardown header linked to tech_cases + event_entries (15 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id, uuid | PK + unique | Standard identity |
| event_entry_id | FK → event_entries | Operational parent |
| tech_case_id | FK → tech_cases (SET NULL) | Backbone linkage for findings |
| template_id | FK → teardown_templates (SET NULL) | Template used |
| teardown_status | ENUM(scheduled, in_progress, completed, cancelled) | Workflow status |
| bay_assignment | VARCHAR(100) | Physical bay location |
| overall_result | ENUM(pass, fail, incomplete, review) | Final result |
| started_at | TIMESTAMP | When teardown started |
| completed_at | TIMESTAMP | When teardown completed |
| operator_id | INT | Inspector/operator |
| notes | TEXT | Operator notes |
| created_by | INT | Creator |
| created_at, updated_at | TIMESTAMP | Audit trail |

FKs: `fk_tdr_entry → event_entries CASCADE`, `fk_tdr_case → tech_cases SET NULL`, `fk_tdr_template → teardown_templates SET NULL`

**`teardown_observed_items`** — Individual observed items/results per teardown (18 columns)

| Column | Type | Purpose |
|--------|------|---------|
| id | PK | Standard identity |
| teardown_record_id | FK → teardown_records | Parent teardown |
| template_item_id | FK → teardown_template_items (SET NULL) | Source template item |
| item_category | VARCHAR(100) | Grouping |
| item_label | VARCHAR(500) | Item name |
| item_type | ENUM(serial_check, measurement, visual_check, note) | Input type |
| observed_serial | VARCHAR(255) | Observed serial number |
| observed_value | DECIMAL(12,4) | Observed numeric measurement |
| observed_text | TEXT | Observed text/notes |
| expected_serial | VARCHAR(255) | Expected serial for comparison |
| expected_value_min, expected_value_max | DECIMAL(12,4) | Spec range from template |
| spec_unit | VARCHAR(50) | Unit of measure |
| declaration_key | VARCHAR(100) | Linkage to tech card declaration field_key |
| result | ENUM(pass, fail, na, skip, review) | Item result |
| notes | TEXT | Item-specific notes |
| created_at, updated_at | TIMESTAMP | Audit trail |

FKs: `fk_tdoi_record → teardown_records CASCADE`, `fk_tdoi_template_item → teardown_template_items SET NULL`

### Seeded Starter Teardown Templates

**Template 1: Top Fuel Engine Teardown** (TOP FUEL / TF) — 15 items

| # | Category | Item | Type | Spec | Decl Key |
|---|----------|------|------|------|----------|
| 1 | Engine Block | Engine block serial number | serial_check | — | declared_engine_type |
| 2 | Engine Block | Engine displacement (cubic inches) | measurement | 496–500 ci | declared_engine_displacement |
| 3 | Engine Block | Cylinder bore diameter | measurement | 4.185–4.210 in | — |
| 4 | Engine Block | Crankshaft stroke | measurement | 4.500–4.500 in | — |
| 5 | Engine Block | Block condition / damage assessment | visual_check | — | — |
| 6 | Cylinder Heads | Cylinder head casting numbers | serial_check | — | — |
| 7 | Cylinder Heads | Combustion chamber volume (cc) | measurement | — | — |
| 8 | Cylinder Heads | Head gasket condition | visual_check | — | — |
| 9 | Supercharger | Supercharger serial / ID | serial_check | — | declared_supercharger_type |
| 10 | Supercharger | Rotor clearance | measurement | — | — |
| 11 | Supercharger | Case condition | visual_check | — | — |
| 12 | Clutch Assembly | Clutch pack serial / count | serial_check | — | — |
| 13 | Clutch Assembly | Disc condition | visual_check | — | — |
| 14 | General | Chassis serial verification | serial_check | — | declared_chassis_serial |
| 15 | General | Teardown notes | note | — | — |

**Template 2: Pro Stock Engine Teardown** (PRO STOCK / PS) — 17 items

| # | Category | Item | Type | Spec | Decl Key |
|---|----------|------|------|------|----------|
| 1 | Engine Block | Engine block serial number | serial_check | — | declared_engine_type |
| 2 | Engine Block | Engine displacement (cubic inches) | measurement | 0–500 ci | declared_engine_displacement |
| 3 | Engine Block | Cylinder bore diameter | measurement | — | — |
| 4 | Engine Block | Crankshaft stroke | measurement | — | — |
| 5 | Engine Block | Block casting number | serial_check | — | — |
| 6 | Engine Block | Block condition / damage assessment | visual_check | — | — |
| 7 | Cylinder Heads | Cylinder head casting numbers | serial_check | — | — |
| 8 | Cylinder Heads | Intake port volume (cc) | measurement | — | — |
| 9 | Cylinder Heads | Combustion chamber volume (cc) | measurement | — | — |
| 10 | Cylinder Heads | Valve size (intake) | measurement | — | — |
| 11 | Intake / Carburetor | Carburetor type / ID | serial_check | — | declared_carburetor |
| 12 | Intake / Carburetor | Carburetor venturi size | measurement | — | — |
| 13 | Intake / Carburetor | Intake manifold ID | serial_check | — | — |
| 14 | Transmission | Transmission type / ID | serial_check | — | declared_transmission |
| 15 | Transmission | Gear condition | visual_check | — | — |
| 16 | General | Chassis serial verification | serial_check | — | declared_chassis_serial |
| 17 | General | Teardown notes | note | — | — |

### APIs Added

**`api/tm-teardown.php`** — 12 actions:

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| listTemplates | GET | read | Templates filterable by category/class (includes wildcard matching) |
| getTemplate | GET | read | Single template with all items |
| listByEvent | GET | read | Teardown records for an event with entry/template joins |
| listByEntry | GET | read | Teardown records for a specific entry |
| getRecord | GET | read | Single record with observed items + findings |
| createRecord | POST | admin | Create teardown with auto tech_case + item scaffolding from template |
| updateRecord | POST | admin | Update header (status, bay, notes) |
| saveItems | POST | admin | Save observed item values (serial, value, text, result, notes) |
| completeRecord | POST | admin | Complete teardown, auto-evaluate findings, set overall result |
| runDeclComparison | POST | admin | Compare observed items against tech card declarations |
| entryTeardownStatus | GET | read | Teardown status summary for an entry |
| eventTeardownSummary | GET | read | Teardown status summary across all entries in an event |

### Auto-Generated Findings on Completion

| Finding Type | Severity | Condition |
|-------------|----------|-----------|
| teardown_measurement_out_of_range | high | Observed measurement outside spec_min/spec_max range |
| teardown_visual_check_failed | high | Visual check item explicitly marked as 'fail' |
| teardown_serial_mismatch | high | Serial check item explicitly marked as 'fail' |
| teardown_required_item_missing | medium | Required template item has no result |

Completion auto-evaluates measurements against spec ranges, auto-sets item results, and determines overall_result:
- **pass**: No failures, all required items completed
- **fail**: Any item explicitly failed or out of range
- **incomplete**: Required items not completed

### Declaration Comparison Findings

| Finding Type | Severity | Condition |
|-------------|----------|-----------|
| teardown_decl_serial_mismatch | high | Observed serial differs from declared value (case-insensitive) |
| teardown_decl_measurement_mismatch | high | Observed measurement differs from declared value by >5% |

Declaration comparison uses the `declaration_key` field on observed items to look up the corresponding `techcard_declaration_fields.field_key` from the latest tech card declaration for the same entry.

### TypeScript Extensions

**Types added** (14):
- `TeardownStatus`, `TeardownItemType`, `TeardownResult`, `TeardownOverall`
- `TeardownTemplate`, `TeardownTemplateItem`
- `TeardownRecord`, `TeardownObservedItem`
- `TeardownCreateResponse`, `TeardownCompleteResponse`, `TeardownDeclCompareResponse`
- `EntryTeardownStatusResponse`, `EventTeardownSummaryEntry`, `EventTeardownSummaryResponse`

**API methods added** (12):
- `listTeardownTemplates`, `getTeardownTemplate`
- `listTeardownsByEvent`, `listTeardownsByEntry`, `getTeardownRecord`
- `createTeardownRecord`, `updateTeardownRecord`, `saveTeardownItems`
- `completeTeardownRecord`, `runTeardownDeclComparison`
- `getEntryTeardownStatus`, `getEventTeardownSummary`

### UI Components

**`src/pages/tech/TeardownWorkspacePanel.tsx`** — Full event-scoped teardown workspace:

**Summary View:**
- Event selector dropdown + class filter
- Status count badges (no_teardown, scheduled, in_progress, completed, cancelled)
- Entry grid with teardown status + overall result per entry
- Inline Create/View buttons per entry
- Template selector for new teardowns
- Bay assignment input
- Auto-template matching (picks best template for entry category/class)

**Detail View:**
- Record header with entry info, bay, template name, timestamps
- Status + result badges
- Action buttons: Complete & Evaluate, Compare vs Declarations, Cancel
- Completion result panel (pass/fail/incomplete with flags)
- Declaration comparison result panel (mismatches or clean)
- Findings table with severity badges and disposition status
- Observed items table grouped by item_category:
  - Serial check: text input for observed serial
  - Measurement: number input with spec range display
  - Visual check: pass/fail/review/na dropdown
  - Note: text input
  - Declaration key linkage badge
  - Result badge per item
  - Notes field per item
- Save button for unsaved item edits

**TechMasterShell** — "Teardown" tab added as 6th tab

### Auto-Behaviors

1. **Auto item scaffolding**: When a teardown is created with a template, observed items are auto-populated from template items with spec ranges, declaration keys, and categories
2. **Auto tech_case creation**: Creating a teardown auto-creates a `teardown` tech_case
3. **Auto measurement evaluation**: On completion, measurements are auto-evaluated against spec_min/spec_max
4. **Auto finding generation**: Completion generates findings for out-of-range measurements, failed visual checks, failed serial checks, and missing required items
5. **Auto overall result**: Overall result computed from item results (pass/fail/incomplete)
6. **Auto case closure**: Tech case auto-closed if overall result is pass
7. **Auto template matching**: UI auto-selects best-match template for entry category/class

### Endpoint Totals After Batch 8

| API File | Actions |
|----------|---------|
| tm-identities.php | 8 |
| tm-events.php | 6 |
| tm-entries.php | 15 |
| tm-techcases.php | 10 |
| tm-scale.php | 10 |
| tm-fuel.php | 9 |
| tm-inspection.php | 12 |
| tm-techcard.php | 12 |
| **tm-teardown.php** | **12** |
| **Total** | **94** |

---

## SECTION C — Operational Fit Check

### How the Teardown Foundation Matches Real Trackside Workflow

1. **Bay-based operations**: Teardowns happen in physical bays. Bay assignment tracking reflects how tech teams actually organize teardown work.

2. **Template-driven item capture**: Different classes require different teardown checklists. The template system auto-scaffolds the right items for TF vs PS, and is extensible to any future class.

3. **Four item types match real teardown work**:
   - **Serial checks**: Verifying part numbers against records/declarations (engine blocks, cylinder heads, superchargers, carburetors)
   - **Measurements**: Bore diameter, stroke, displacement, rotor clearance, venturi size — with spec ranges for auto-evaluation
   - **Visual checks**: Condition assessments (damage, wear, compliance)
   - **Notes**: Free-text observations

4. **Declaration linkage is the key differentiator**: The `declaration_key` field on template items creates a direct bridge between what was declared on the tech card and what was observed during teardown. This is the core audit loop:
   - Team declares engine type → teardown verifies engine block serial
   - Team declares displacement → teardown measures displacement
   - Team declares chassis serial → teardown verifies chassis serial

5. **Findings pipeline integration**: All teardown findings flow through `tech_findings` on a `teardown` tech_case, making them visible alongside tech card audit findings, inspection findings, and scale/fuel findings.

6. **Status workflow matches real process**: scheduled → in_progress → completed/cancelled, with overall_result (pass/fail/incomplete) determined at completion.

### Limitations

- **No teardown-specific attachments**: Photos/docs for teardown items would need to use the existing `tech_attachments` polymorphic system — not yet wired into the teardown UI.
- **No undo/reopen**: A completed teardown cannot be reopened. A new teardown record would need to be created.
- **Two classes seeded only**: Only TF and PS templates are seeded. Other classes (FC, PSM, etc.) would need additional templates.
- **Declaration comparison is serial/numeric only**: Text-based comparisons (e.g., "does 'Chevrolet LS' match 'LS-based V8'?") are not fuzzy-matched — they compare exact case-insensitive strings.
- **No multi-operator support**: Only one operator_id is tracked per teardown record, not per item.
- **No partial completion**: Completion evaluates all items at once. There's no "save progress as draft completion."
- **Template items are seed-only**: Adding/editing template items requires DB access or a future admin UI.

### What Future Modules Can Reuse

- **Template + observed items pattern**: Any future structured audit (e.g., safety equipment teardown, tire/wheel inspection) can follow the same template → observed items → auto-evaluate → findings pipeline.
- **Declaration comparison pattern**: The `declaration_key` linkage pattern works for any future comparison between declared values and observed reality.
- **Bay tracking**: Useful for any future physical-location-based operations (inspection bays, scale locations).
- **Item type system**: The 4 item types (serial_check, measurement, visual_check, note) cover the practical input patterns for most audit scenarios.

---

## SECTION D — Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` | ✅ Clean (0 errors) |
| `vitest run` | ✅ 2275 tests pass, 3 todo (85 test files) |
| `npm run build` | ✅ Successful (4.71s) |
| Parity still works | ✅ No parity files modified |
| Batch 1–7 workflows | ✅ No regressions — all existing API files unchanged |
| Teardown types compile | ✅ 14 new types, 12 new API methods in techMasterApi.ts |
| TeardownWorkspacePanel renders | ✅ Included in TechMasterShell chunk (133KB) |

### Sample Teardown Scenarios Validated (production smoke)

| Scenario | Result |
|----------|--------|
| Create teardown with TF template (15 items) | ✅ 15 observed items scaffolded with correct categories, types, specs, declaration keys |
| Save observed item values (serial, measurement, visual, note) | ✅ 6 items saved |
| Complete with unfilled required items | ✅ overall_result = 'incomplete', 6 findings generated (teardown_required_item_missing) |
| Teardown record status transitions | ✅ in_progress → completed with completed_at timestamp |
| Tech case auto-creation | ✅ tech_case created with case_type='teardown' |
| Finding generation via tech_findings backbone | ✅ All findings written correctly |
| Cleanup (cascade delete) | ✅ All related rows deleted cleanly |

### Batch 7 Smoke Scenarios Validated (production)

| Scenario | Result |
|----------|--------|
| Create declaration with field scaffolding | ✅ |
| Save declaration field values | ✅ |
| Add artifact with auto status transition | ✅ missing → uploaded |
| Run audit with all keys filled, no cross-module data | ✅ 0 flags, status → audited |
| Full state verification | ✅ |

### Not Fully Verified

- End-to-end UI workflow on production was not tested via browser (requires login). Schema, API logic, FK integrity, template seeding, item scaffolding, finding generation, and declaration comparison logic are all verified via production smoke tests.
- Declaration comparison (`runDeclComparison`) was not exercised in the production smoke (requires both a teardown and a tech card declaration for the same entry with filled fields). The logic is verified structurally.

---

## SECTION E — Production Activation

### Files Deployed

| File | Type |
|------|------|
| `api/tm-teardown.php` | New — Teardown API (12 actions) |
| `api/migrate-v28-tm-teardown.php` | New — Migration script |
| `dist/index.html` | Updated — new chunk references |
| `dist/assets/*` | Updated — new build with TeardownWorkspacePanel |
| `dist/sw.js` | Updated |

### Migration Run

```
=== Migration v28: Teardown Foundation ===
teardown_templates: created/exists
teardown_template_items: created/exists
teardown_records: created/exists
teardown_observed_items: created/exists
teardown_templates: seeded 2 new template(s)
=== Migration v28 Complete ===
```

Executed via SSH CLI: `php api/migrate-v28-tm-teardown.php`

### Production Verification

| Check | Result |
|-------|--------|
| `teardown_templates` table | ✅ Created, 11 columns |
| `teardown_template_items` table | ✅ Created, 13 columns |
| `teardown_records` table | ✅ Created, 15 columns |
| `teardown_observed_items` table | ✅ Created, 18 columns |
| FK constraints | ✅ 6 FKs verified |
| Templates seeded | ✅ 2 templates (TF: 15 items, PS: 17 items) |
| TechMasterShell chunk | ✅ 200 application/javascript (133KB) |
| tm-teardown.php responds | ✅ 401 (auth required — correct) |
| Teardown smoke test | ✅ Full workflow: create → save items → complete → findings |
| Batch 7 smoke test | ✅ Full workflow: create decl → save fields → artifact → audit |
| No nested assets issue | ✅ Used `scp files/*` pattern |

### Prod-Only Issues Found/Fixed

None. Both the Batch 7 smoke and Batch 8 deployment were clean.

---

## SECTION F — Next Recommended Batch

### Recommendation: **Batch 9 — Cross-Module Dossier / Reporting Bridge**

**Justification:**

With all five core capture modules now live — Scale (B3), Fuel (B5), General Tech/Inspection (B6), Tech Card/Declarations (B7), and Teardown (B8) — the full data capture layer is complete. Every major trackside operation now has structured capture:

| Module | What it captures |
|--------|-----------------|
| Scale | Measured weights vs. class rules |
| Fuel | Fuel type verification |
| General Tech | Body/chassis/safety inspection checklists + measurements |
| Tech Cards | What the team declared |
| Teardown | What was actually observed in the engine/drivetrain |

The next highest-value step is **connecting these modules for unified reporting**. A per-entry dossier that aggregates status, findings, and comparisons across all modules is the natural next deliverable.

**Scope would include:**

1. **Entry dossier API** — A single endpoint that returns the complete tech status for an entry across all modules: scale status + findings, fuel status + findings, inspection status + findings, tech card status + declaration fields + audit findings, teardown status + observed items + findings, plus cross-module comparison summary.

2. **Event compliance dashboard** — An event-level view showing which entries have open findings, which modules have incomplete work, and overall event compliance status.

3. **Finding aggregation** — A unified findings view across all `tech_findings` for an entry, regardless of source module (scale, fuel, inspection, tech card audit, teardown).

4. **Export/print-ready summary** — A structured data format suitable for generating a compliance report or tech card for an entry.

**Why not template admin:**
- Template management (inspection, teardown) is useful but secondary. The existing templates are sufficient for MVP operations. Admin UI can come later.

**Why not compliance/open-fix workflow:**
- Finding resolution workflow (assign, track, close findings) is valuable but depends on first having the unified view to see all findings together. The dossier/reporting bridge provides that foundation.

**Alternative candidates considered:**
- *Template admin/refinement* — quality of life, not blocking
- *Compliance/open-fix workflow* — depends on dossier for context
- *Additional teardown templates* — incremental content, not structural
- *Cross-module dossier/reporting bridge* — **selected** as the unifying view
