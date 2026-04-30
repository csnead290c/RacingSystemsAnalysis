# NHRA Tech Master — Phase 1 Batch 1 Implementation Report

**Date:** 2026-03-11
**Scope:** Foundational schema, bridge FKs, new API scaffolding, minimal frontend support

---

## A. Implementation Details

### Migrations (v17–v22)

| Migration | File | Tables Created | Seeds / Backfill |
|-----------|------|----------------|------------------|
| v17 | `api/migrate-v17-tm-foundation.php` | `seasons`, `event_types` | Seasons from `parity_events.season_year`; 5 event types (national, divisional, regional, specialty, test) |
| v18 | `api/migrate-v18-tm-events.php` | `event_instances` | One-time backfill from `parity_events` → `event_instances`; nullable `event_instance_id` FK added to `parity_events` |
| v19 | `api/migrate-v19-tm-identities.php` | `persons`, `organizations`, `vehicle_assets`, `components` | None (empty, create-on-demand) |
| v20 | `api/migrate-v20-tm-entries.php` | `event_entries`, `event_entry_changes`, `org_memberships`, `vehicle_org_assignments` | None |
| v21 | `api/migrate-v21-tm-techcases.php` | `tech_cases`, `tech_findings`, `tech_attachments` | None |
| v22 | `api/migrate-v22-tm-bridge.php` | — | Nullable bridge FKs on 4 existing tables |

**Total new tables:** 15
**Bridge FKs on existing tables:** 5 columns added (all nullable, ON DELETE SET NULL)

| Existing Table | New Column | References |
|----------------|-----------|------------|
| `parity_events` | `event_instance_id` | `event_instances(id)` |
| `parity_runs` | `event_entry_id` | `event_entries(id)` |
| `parity_driver_combos` | `person_id` | `persons(id)` |
| `run_incidents` | `tech_case_id` | `tech_cases(id)` |
| `incident_analysis_sessions` | `tech_case_id` | `tech_cases(id)` |

All migrations are idempotent (CREATE TABLE IF NOT EXISTS, column existence checks, INSERT IGNORE).

### Capabilities

**New keys:** `nhra.tech.read`, `nhra.tech.admin`

| Location | Changes |
|----------|---------|
| `api/lib/capabilities.php` | Added to `PLAN_CAPABILITIES['nhra']` and `ROLE_CAPABILITIES['owner'/'admin']` |
| `src/domain/config/capabilities.ts` | Added to `CAPABILITY_KEYS`, `CAPABILITY_ALIASES`, `PLAN_CAPABILITIES.nhra`, `ROLE_CAPABILITIES.owner/admin` |

### API Files (all new, no existing files modified)

| File | Endpoint Count | Actions |
|------|---------------|---------|
| `api/lib/tm-helpers.php` | — | Shared: UUID gen, auth gates, JSON helpers |
| `api/tm-identities.php` | 5 | list, get, search, create, update (× 4 types) |
| `api/tm-events.php` | 6 | listSeasons, listEventTypes, listEvents, getEvent, createEvent, updateEvent |
| `api/tm-entries.php` | 5 | listForEvent, get, create, update, bulkCreate |
| `api/tm-techcases.php` | 10 | listCases, listCasesByEvent, getCase, createCase, updateCase, closeCase, listFindings, addFinding, updateFinding, listAttachments |

**Total new endpoints:** 26

### Frontend

| File | Purpose |
|------|---------|
| `src/services/techMasterApi.ts` | Typed API client (30 methods covering all 26 endpoints) |
| `src/pages/TechMasterShell.tsx` | Minimal `/tech` shell with 7 tabs (Overview, Persons, Organizations, Vehicles, Events, Entries, Cases) |
| `src/domain/ui/publicSurface.ts` | Added `'techMaster'` to `InternalModule` type + `'/tech'` route |
| `src/app/App.tsx` | Added lazy-loaded `/tech` route with ProtectedRoute + InternalRoute |

---

## B. Compatibility & Risk Assessment

### Zero Breaking Changes

- **No existing files modified** (beyond additive capability additions and route registration)
- **No existing columns renamed or removed**
- **No existing table schemas changed** (only nullable columns added via v22)
- **No parity.php changes** — all new endpoints in new `tm-*.php` files
- **No parity UI changes** — TechMasterShell is a standalone page

### Bridge Safety

All 5 bridge FKs are:
- **Nullable** — existing rows have NULL, no constraint violations
- **ON DELETE SET NULL** — deleting a TM entity won't cascade-delete parity data
- **Indexed** — ready for JOIN queries without table scans
- **Existence-checked** — migrations skip if column/FK already exists

### Capability Isolation

- `nhra.tech.*` caps are only granted to `nhra` plan + `owner`/`admin` roles
- Existing plans (free, basic, pro, team) are **unaffected**
- The `/tech` route is wrapped in `<InternalRoute>` — invisible to public users
- `TechMasterShell` has an additional capability gate inside the component

---

## C. Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ Clean (exit 0) |
| `npx vitest run` | ✅ **2275 passed**, 3 todo, 0 failed |
| `npx vite build` | ✅ Built in 4.47s, TechMasterShell code-split (10.89 KB) |
| Existing parity tests | ✅ All passing (no regressions) |
| Tier contract drift tests | ✅ All passing (free plan unaffected) |
| Migration idempotency | ✅ All use IF NOT EXISTS / column checks / INSERT IGNORE |

---

## D. Recommended Next Batch

### Batch 2: Operational Wiring

1. **Person matching** — auto-suggest from `parity_runs.driver_name` → `persons.normalized_name`; exact match first, fuzzy suggestions only
2. **Entry auto-creation** — on parity event import, auto-create `event_entries` from unique driver_name × class_index combinations
3. **Bridge population** — backfill `parity_runs.event_entry_id` and `parity_driver_combos.person_id` for existing data
4. **Tech Master tests** — unit tests for `techMasterApi.ts` shapes, capability contract tests for `nhra.tech.*`
5. **Scale module foundation** — `scale_readings` detail table extending `tech_cases`, first operational module

### Batch 3: UI Expansion

6. **Identity management UI** — create/edit forms for persons, orgs, vehicles, components
7. **Event entry roster UI** — per-event entry list with drag-assign from person search
8. **Tech case workflow UI** — create case → add findings → close case flow
9. **Parity integration** — show linked person/entry info in ParityPortal run views
