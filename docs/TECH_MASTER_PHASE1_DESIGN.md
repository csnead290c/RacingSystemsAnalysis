# NHRA Tech Master Program — Phase 1 Technical Design

**Date:** 2026-03-11
**Status:** Technical design — do not implement yet
**Parent:** `docs/NHRA_TECH_MASTER_ARCHITECTURE.md`
**Scope:** Phase 1 foundations only — identity tables, event model evolution, event entries, tech case backbone, bridge strategy

---

## SECTION A — PHASE 1 OBJECTIVE

### What Phase 1 Accomplishes

Phase 1 creates the **minimum shared backbone** required so that future modules (Scale, Fuel, Tech Card Audit, etc.) can be built against real foundational tables instead of ad-hoc parallel structures.

Specifically, Phase 1 delivers:

1. **Long-lived identity tables** — `persons`, `organizations`, `vehicle_assets`, `components` — with CRUD APIs
2. **Multi-event event model** — `event_types`, `event_instances` evolving from the existing `parity_events` / `parity_tracks` tables, with bridge views preserving backward compatibility
3. **Event Entry junction** — `event_entries` connecting person + organization + vehicle + class + event, replacing the implicit `driver_name + race_lookup` linkage
4. **Tech case backbone** — `tech_cases`, `tech_findings`, `tech_attachments` — the shared lifecycle pipeline that all future modules plug into
5. **Bridge layer** — nullable FKs and views that let existing parity queries, APIs, and UI continue working without modification during the transition

### What Phase 1 Does NOT Do

| Excluded | Why |
|----------|-----|
| Scale module detail tables | Phase 2 — needs backbone first |
| Fuel module | Phase 3 |
| Declaration / tech card model | Phase 4 |
| Body/chassis templates | Phase 5 |
| Teardown details | Phase 6 |
| Dossier / 360 views | Phase 7 |
| Rewrite existing parity UI | Incremental — parity UI continues to work via bridge |
| Rewrite existing parity API endpoints | Incremental — old actions keep working, new entry-aware actions added alongside |
| Auto-import drivers/teams from NHRA systems | Manual entry first |
| Mobile/tablet inspection UI | Later |
| Universal form engine | Possibly never (see architecture doc J.7) |

### Success Criteria

Phase 1 is done when:

1. Identity tables accept CRUD operations via API
2. An event instance can be created with type, season, and track
3. An event entry can be created linking person + org + vehicle + class + event
4. A tech case can be opened against an event entry
5. A finding can be recorded against a tech case
6. An attachment can be uploaded to a tech case or finding
7. Existing parity runs, events, weather, incidents, and reports continue to function identically via bridge layer
8. A proof-of-concept query works: "all tech cases for vehicle X across events"

---

## SECTION B — CURRENT-STATE TO FUTURE-STATE MAPPING

### B.1 — Events

| Aspect | Current State | Future State | Transition |
|--------|--------------|-------------|------------|
| **Table** | `parity_events` (id, event_name, season_year, track_id, start_date_local, end_date_local, race_lookup, event_code) | `event_instances` (uuid, event_type_id, season_id, track_id, name, start_date, end_date, race_lookup, status) | Add `event_instance_id` nullable FK to `parity_events`, or create `event_instances` with a 1:1 bridge from existing rows |
| **Type** | Implicit — all events are national (no type column) | Explicit `event_types` reference table (national, divisional, regional, specialty) | New table; backfill existing events as type=national |
| **Season** | `season_year INT` column on `parity_events` | Dedicated `seasons` table (id, year, status) | New table; bridge existing `season_year` values |
| **Scope assumption** | UI picks one event at a time via `selectedEventId` state | Multiple events can be active simultaneously; "selected event" is UI preference only | No DB change needed — current UI already uses `selectedEventId` as client state, not a DB column |
| **Identity** | `parity_events.id` (auto-increment INT) | `event_instances.id` (auto-increment INT) + `uuid` (VARCHAR 36) | Bridge: `parity_events` gets nullable `event_instance_id` FK |

**Recommended approach:** Create `event_instances` as a new table. Run a one-time migration that creates an `event_instances` row for every existing `parity_events` row. Add `event_instance_id` nullable FK to `parity_events` and backfill it. Existing parity code continues to use `parity_events.id`; new code uses `event_instances.id`.

### B.2 — Tracks

| Aspect | Current State | Future State | Transition |
|--------|--------------|-------------|------------|
| **Table** | `parity_tracks` (id, track_name, timezone_iana, street, city, state, zip, latitude, longitude) | Same table, possibly renamed to `tracks` in a later phase | **No change in Phase 1.** `parity_tracks` is already well-structured. `event_instances.track_id` FKs to it directly. |

**Recommended approach:** Keep `parity_tracks` as-is in Phase 1. It already has the fields needed (name, timezone, location). Renaming to `tracks` is a cosmetic change that can wait.

### B.3 — Runs

| Aspect | Current State | Future State | Transition |
|--------|--------------|-------------|------------|
| **Table** | `parity_runs` (id, uuid, import_id, race_lookup, run_timestamp_utc, category, class_index, round, lane, driver_name, car_number, timing splits, flags) | `sessions` table linked to `event_entries` via FK | **Phase 1: Add nullable `event_entry_id` FK to `parity_runs`.** Do not rename table or break existing queries. |
| **Identity** | Runs identified by `driver_name` (free text) + `race_lookup` (event date string) | Runs identified by `event_entry_id` FK | Nullable FK — old runs have NULL, new runs get populated. Existing queries on `driver_name + race_lookup` continue working. |
| **Category/Class** | `category` and `class_index` columns on each run | Same columns stay; also derivable from `event_entries.category/class_index` | No change — keeping both avoids breaking existing indexes and queries |

**Recommended approach:** `ALTER TABLE parity_runs ADD COLUMN event_entry_id INT NULL, ADD INDEX idx_pr_entry (event_entry_id), ADD CONSTRAINT fk_pr_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE SET NULL`. Existing runs continue to work via `driver_name + race_lookup`. Future runs can be linked to entries.

### B.4 — Categories / Class Aliases / Combos

| Aspect | Current State | Future State | Transition |
|--------|--------------|-------------|------------|
| **Class aliases** | `parity_class_aliases` (alias → canonical) | Same — class normalization is utility data | **No change in Phase 1** |
| **Engine combos** | `parity_engine_combos` (id, name, t_power, d_power, friction_factor) | Same — HPC parameters are parity-specific | **No change in Phase 1** |
| **Driver combos** | `parity_driver_combos` (driver_name, class_index, engine_combo_id, effective_from/to) | Eventually links to `persons.id` instead of `driver_name` string | **Phase 1: Add nullable `person_id` FK.** Existing `driver_name` continues to work. |

**Recommended approach:** `parity_driver_combos` gets a nullable `person_id` FK. Existing combo resolution logic in `weatherCorrection.ts` continues using `driver_name`. New resolution can optionally use `person_id` when available.

### B.5 — Incidents / Incident Analysis

| Aspect | Current State | Future State | Transition |
|--------|--------------|-------------|------------|
| **Tables** | `run_incidents` (run_id FK → parity_runs), `incident_media`, `incident_links`, `incident_types`, plus `incident_analysis_*` tables (v16) | Incidents become a `tech_cases` type with `incident_details` linking to existing tables | **Phase 1: Add nullable `tech_case_id` FK to `run_incidents`.** Do not restructure. |
| **Existing incidents API** | `api/incidents.php` — full CRUD, ownership model | Continues working as-is | **No change to API in Phase 1** |
| **Analysis workspace** | `incident_analysis_sessions`, `datasets`, `channels`, `videos`, `measurements` | Eventually link via `tech_case_id` | **Phase 1: Add nullable `tech_case_id` FK to `incident_analysis_sessions`** |

**Recommended approach:** Bridge only. Existing incident code is untouched. New `tech_case_id` FKs allow forward-linking when tech cases are created for incidents in future phases.

### B.6 — Parity UI Assumptions

| Current Assumption | Assessment | Phase 1 Impact |
|-------------------|------------|----------------|
| `selectedEventId` is React state (client-side) | **Already correct** — not a DB-level singleton | No change needed |
| Event dropdown shows one year at a time | **Fine** — UI filtering, not a data constraint | No change needed |
| Panels receive `event: EventWithStats \| null` prop | **Fine** — event selection is a prop, not a global | No change needed |
| `race_lookup` used as event identifier in some older actions | **Narrow but non-blocking** — newer actions use `eventId` | Incrementally migrate remaining `race_lookup` actions to `eventId` |
| `driver_name` as free-text string on runs | **Too narrow long-term** — no link to person identity | Phase 1 adds `event_entry_id` FK, which gives indirect person linkage |

**Key takeaway:** The parity UI is already designed around `selectedEventId` as client state. No UI restructuring is needed in Phase 1. The bridge is purely at the data layer.

---

## SECTION C — FOUNDATIONAL PHASE 1 SCHEMA PROPOSAL

### C.1 — `seasons`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Calendar boundary for event grouping and eligibility |
| **Key columns** | `id` INT AUTO_INCREMENT, `year` SMALLINT NOT NULL UNIQUE, `label` VARCHAR(50) NULL (e.g., "2026 NHRA Season"), `status` ENUM('upcoming','active','completed') DEFAULT 'upcoming', `created_at` TIMESTAMP |
| **Why Phase 1** | `event_instances` needs a season FK. Simple reference table. |
| **Deferred** | Season-level eligibility rules, credential tracking |

### C.2 — `event_types`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Classification of events — national, divisional, regional, specialty |
| **Key columns** | `id` INT AUTO_INCREMENT, `code` VARCHAR(30) NOT NULL UNIQUE, `label` VARCHAR(100) NOT NULL, `sort_order` SMALLINT DEFAULT 0, `is_active` TINYINT(1) DEFAULT 1, `created_at` TIMESTAMP |
| **Seed data** | national, divisional, regional, specialty, test |
| **Why Phase 1** | `event_instances` needs a type FK. Simple reference table. |
| **Deferred** | Type-specific configuration or rule sets |

### C.3 — `event_instances`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | A specific occurrence of an event at a place and time — the multi-event-safe evolution of `parity_events` |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `event_type_id` INT NOT NULL FK → event_types, `season_id` INT NULL FK → seasons, `track_id` INT NOT NULL FK → parity_tracks, `name` VARCHAR(255) NOT NULL, `event_code` VARCHAR(50) NULL, `start_date_local` DATE NOT NULL, `end_date_local` DATE NOT NULL, `race_lookup` VARCHAR(8) NULL UNIQUE, `status` ENUM('scheduled','active','completed','cancelled') DEFAULT 'scheduled', `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_ei_season` (season_id), `idx_ei_track` (track_id), `idx_ei_dates` (start_date_local, end_date_local), `uk_ei_race_lookup` (race_lookup) |
| **Why Phase 1** | Foundation for multi-event support. Every event-scoped table FKs here. |
| **Bridge** | One-time migration seeds from existing `parity_events` rows. `parity_events` gets nullable `event_instance_id` FK backfilled. |
| **Deferred** | Event-level configuration, venue details beyond track reference |

### C.4 — `persons`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Long-lived identity for any individual — primarily drivers, but also crew chiefs, team owners, officials |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `display_name` VARCHAR(255) NOT NULL, `normalized_name` VARCHAR(255) NOT NULL (uppercased, trimmed — for matching against parity_runs.driver_name), `first_name` VARCHAR(100) NULL, `last_name` VARCHAR(100) NULL, `nhra_license_id` VARCHAR(100) NULL, `person_type` SET('driver','crew','owner','official','other') DEFAULT 'driver', `status` ENUM('active','inactive','deceased') DEFAULT 'active', `notes` TEXT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `uk_p_normalized` (normalized_name) — for fast matching, `idx_p_license` (nhra_license_id) |
| **Why Phase 1** | Event entries need a person FK. Driver history queries need a stable identity. |
| **Bridge** | `normalized_name` allows matching against existing `parity_runs.driver_name` and `parity_driver_combos.driver_name` without requiring those tables to change. |
| **Deferred** | Contact info, credential tracking, photo/avatar, emergency contacts |

### C.5 — `organizations`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Long-lived identity for a team, entrant, shop, or business entity |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `name` VARCHAR(255) NOT NULL, `short_name` VARCHAR(100) NULL, `nhra_entrant_id` VARCHAR(100) NULL, `org_type` SET('team','shop','manufacturer','other') DEFAULT 'team', `status` ENUM('active','inactive','dissolved') DEFAULT 'active', `notes` TEXT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `uk_o_name` (name), `idx_o_entrant` (nhra_entrant_id) |
| **Why Phase 1** | Event entries need an organization FK. Team-level compliance history requires a stable org identity. |
| **Deferred** | Owner linkage (person_id FK), address, contact, multi-org hierarchy |

### C.6 — `vehicle_assets`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Long-lived identity for a physical car/chassis |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `chassis_serial` VARCHAR(100) NULL, `body_type` VARCHAR(100) NULL (e.g., "Camaro", "Funny Car body"), `description` VARCHAR(500) NULL, `current_org_id` INT NULL FK → organizations, `primary_category` VARCHAR(100) NULL (e.g., "Top Fuel", "Pro Stock"), `status` ENUM('active','retired','destroyed','unknown') DEFAULT 'active', `notes` TEXT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_va_org` (current_org_id), `idx_va_serial` (chassis_serial) |
| **Why Phase 1** | Event entries need a vehicle FK. Vehicle-level tech history (teardown, body, scale) requires a stable asset identity. |
| **Important:** | `chassis_serial` is NOT required to be unique — some vehicles may not have known serials initially. Uniqueness enforcement can be added when data quality improves. |
| **Deferred** | Certification tracking (SFI, NHRA chassis cert), detailed specs, photo gallery |

### C.7 — `components`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Serialized major parts that move between vehicles (engines, transmissions, superchargers, bodies) |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `serial_number` VARCHAR(100) NULL, `component_type` VARCHAR(50) NOT NULL (engine, transmission, supercharger, body, other), `manufacturer` VARCHAR(255) NULL, `description` VARCHAR(500) NULL, `current_vehicle_id` INT NULL FK → vehicle_assets, `status` ENUM('active','retired','confiscated','unknown') DEFAULT 'active', `notes` TEXT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_c_vehicle` (current_vehicle_id), `idx_c_serial_type` (component_type, serial_number) |
| **Why Phase 1** | Teardown audits and serial verification need a stable part identity. Building it now means the component_installations history table is ready when needed. |
| **Deferred** | Detailed specs, certification/tag tracking, installation history table (can be Phase 2+) |

### C.8 — `event_entries`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | The operational junction — "this person, this org, this vehicle, this class, at this event, with this competition number" |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `event_instance_id` INT NOT NULL FK → event_instances, `person_id` INT NULL FK → persons (nullable initially — entries may be created before person records exist), `org_id` INT NULL FK → organizations, `vehicle_id` INT NULL FK → vehicle_assets, `category` VARCHAR(100) NULL, `class_index` VARCHAR(100) NULL, `competition_number` VARCHAR(20) NULL, `entry_status` ENUM('registered','active','withdrawn','disqualified') DEFAULT 'registered', `notes` TEXT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_ee_event` (event_instance_id), `idx_ee_person` (person_id), `idx_ee_org` (org_id), `idx_ee_vehicle` (vehicle_id), `idx_ee_event_class` (event_instance_id, class_index), `uk_ee_event_number_class` (event_instance_id, competition_number, class_index) — prevents duplicate entry numbers within a class at an event |
| **Why Phase 1** | The entire architecture depends on this table. Tech cases, findings, scale readings, fuel samples — everything attaches to an event entry. |
| **Nullable FKs** | `person_id`, `org_id`, `vehicle_id` are all nullable because: (a) we may create entries before all identity records are populated, (b) imported/historical data may not have full identity resolution yet. The system must tolerate partial entries during transition. |
| **Deferred** | `vehicle_config_snapshot` JSON (Phase 2+), credential verification, entry fee tracking |

### C.9 — `tech_cases`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | A single inspection, check, or audit action performed by NHRA staff. Shared backbone for all modules. |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `event_entry_id` INT NOT NULL FK → event_entries, `case_type` VARCHAR(50) NOT NULL (scale, fuel, body, chassis, teardown, general_tech, incident, other), `status` ENUM('open','in_progress','closed','cancelled') DEFAULT 'open', `opened_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, `closed_at` DATETIME NULL, `operator_id` INT NULL FK → users (the NHRA staff member who performed it), `location` VARCHAR(100) NULL (e.g., "Scale 1", "Fuel Lab", "Tech Bay 3"), `summary` VARCHAR(500) NULL, `notes` TEXT NULL, `created_by` INT NOT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_tc_entry` (event_entry_id), `idx_tc_type` (case_type), `idx_tc_status` (status), `idx_tc_opened` (opened_at) |
| **Why Phase 1** | Every future module creates tech cases. Building the backbone now means Scale (Phase 2) can start immediately. |
| **Deferred** | Module-specific detail table FKs (added per module), comparison_declaration_id FK (Phase 4), component_id FK (Phase 5+) |

### C.10 — `tech_findings`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | A specific observation, measurement, or ruling from a tech case |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `tech_case_id` INT NOT NULL FK → tech_cases, `finding_type` VARCHAR(50) NOT NULL (discrepancy, violation, observation, measurement, confiscation, other), `severity` ENUM('info','low','medium','high','critical') DEFAULT 'info', `description` TEXT NOT NULL, `measured_value` VARCHAR(255) NULL, `expected_value` VARCHAR(255) NULL, `disposition` ENUM('open','resolved','deferred','penalized','waived') DEFAULT 'open', `resolved_at` DATETIME NULL, `resolved_by` INT NULL, `follow_up_required` TINYINT(1) DEFAULT 0, `notes` TEXT NULL, `created_by` INT NOT NULL, `created_at` TIMESTAMP, `updated_at` TIMESTAMP |
| **Indexes** | `idx_tf_case` (tech_case_id), `idx_tf_type` (finding_type), `idx_tf_disposition` (disposition), `idx_tf_followup` (follow_up_required) |
| **Why Phase 1** | Findings are the output of every tech module. Cross-cutting queries ("all open findings for team X") depend on this table existing. |
| **Deferred** | Component FK (Phase 5+), compliance_item linkage (Phase 6), penalty reference |

### C.11 — `tech_attachments`

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Files attached to any tech-related record — photos, documents, scanned cards, videos |
| **Key columns** | `id` INT AUTO_INCREMENT, `uuid` VARCHAR(36) UNIQUE NOT NULL, `parent_type` ENUM('tech_case','finding','event_entry','vehicle_asset','component','person','organization') NOT NULL, `parent_id` INT NOT NULL, `file_name` VARCHAR(255) NOT NULL, `file_type` VARCHAR(50) NOT NULL (image/jpeg, application/pdf, video/mp4, etc.), `file_path` VARCHAR(1024) NOT NULL, `file_size_bytes` INT NULL, `caption` VARCHAR(500) NULL, `uploaded_by` INT NOT NULL, `created_at` TIMESTAMP |
| **Indexes** | `idx_ta_parent` (parent_type, parent_id), `idx_ta_uploaded` (uploaded_by) |
| **Why Phase 1** | Scale photos, incident evidence, and scanned tech cards all need an attachment target. Building it now avoids per-module attachment solutions. |
| **Storage** | Files stored in `uploads/tech_attachments/` directory (same pattern as existing `uploads/incident_analysis/`). `.htaccess` protection. |
| **Deferred** | Thumbnail generation, virus scanning, S3/cloud storage migration |

---

## SECTION D — HISTORY / ASSIGNMENT STRATEGY

### What to Model Immediately (Phase 1)

#### D.1 — `org_memberships` (Person ↔ Organization over time)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track which drivers belong to which teams over time |
| **Key columns** | `id` INT PK, `person_id` INT NOT NULL FK → persons, `org_id` INT NOT NULL FK → organizations, `role` VARCHAR(50) DEFAULT 'driver' (driver, crew_chief, owner, crew), `effective_from` DATE NOT NULL, `effective_to` DATE NULL (null = current), `created_at` TIMESTAMP |
| **Indexes** | `idx_om_person` (person_id), `idx_om_org` (org_id), `idx_om_dates` (effective_from, effective_to) |
| **Why now** | "What teams has this driver been on?" is a fundamental query. Without this table, the only way to answer it is scanning event entries, which is slow and imprecise. |

#### D.2 — `vehicle_org_assignments` (Vehicle ↔ Organization over time)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track which vehicles belong to which teams over time |
| **Key columns** | `id` INT PK, `vehicle_id` INT NOT NULL FK → vehicle_assets, `org_id` INT NOT NULL FK → organizations, `effective_from` DATE NOT NULL, `effective_to` DATE NULL, `created_at` TIMESTAMP |
| **Indexes** | `idx_voa_vehicle` (vehicle_id), `idx_voa_org` (org_id) |
| **Why now** | "What cars does this team currently have?" and "What team has owned this car?" are basic operational queries. |

#### D.3 — Event Entry ↔ Person / Vehicle Assignment

Handled directly by the `event_entries` table columns: `person_id`, `org_id`, `vehicle_id`. These represent the **assignment at event time**. Mid-event changes are tracked by:

#### D.4 — `event_entry_changes` (Mid-event audit trail)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record changes to an event entry during an event (driver swap, renumber) |
| **Key columns** | `id` INT PK, `event_entry_id` INT NOT NULL FK → event_entries, `field_name` VARCHAR(50) NOT NULL (person_id, competition_number, vehicle_id, etc.), `old_value` VARCHAR(255) NULL, `new_value` VARCHAR(255) NULL, `reason` VARCHAR(500) NULL, `changed_by` INT NULL, `changed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP |
| **Indexes** | `idx_eec_entry` (event_entry_id), `idx_eec_changed` (changed_at) |
| **Why now** | Without this, mid-event driver swaps silently overwrite the original assignment. |

#### D.5 — Event Entry ↔ Run Linkage

Handled by the nullable `event_entry_id` FK added to `parity_runs` (Section B.3). This is a direct FK, not a history table — a run belongs to exactly one entry.

#### D.6 — Findings Linked to Identities

Findings connect to identities **through the tech case → event entry join path**:

```
Finding → Tech Case → Event Entry → Person / Organization / Vehicle
```

No additional linkage tables are needed. Cross-cutting queries use JOINs:

```sql
-- All findings for vehicle X across all events
SELECT f.* FROM tech_findings f
JOIN tech_cases tc ON f.tech_case_id = tc.id
JOIN event_entries ee ON tc.event_entry_id = ee.id
WHERE ee.vehicle_id = ?;
```

### What Can Wait

| Deferred Table | Why It Can Wait |
|---------------|----------------|
| `component_installations` (Component ↔ Vehicle over time) | Components table exists in Phase 1 but installation tracking isn't needed until Teardown module (Phase 6). `current_vehicle_id` on `components` is sufficient initially. |
| `declarations` | Not needed until Tech Card Audit (Phase 4). |
| `compliance_items` | Not needed until Compliance module (Phase 6). |

---

## SECTION E — BRIDGE STRATEGY FOR EXISTING PARITY

### Core Principle: Additive, Not Disruptive

The bridge strategy adds new tables and nullable FKs alongside existing structures. **No existing column is removed, renamed, or made non-nullable.** No existing API action changes its contract. No existing UI component changes its props.

### E.1 — New Nullable FKs on Existing Tables

| Table | New Column | FK Target | Purpose |
|-------|-----------|-----------|---------|
| `parity_events` | `event_instance_id` INT NULL | `event_instances.id` | Links legacy event to new event model |
| `parity_runs` | `event_entry_id` INT NULL | `event_entries.id` | Links runs to entry model |
| `parity_driver_combos` | `person_id` INT NULL | `persons.id` | Links combo assignments to person identity |
| `run_incidents` | `tech_case_id` INT NULL | `tech_cases.id` | Forward-links incidents to tech case backbone |
| `incident_analysis_sessions` | `tech_case_id` INT NULL | `tech_cases.id` | Forward-links analysis to tech case backbone |

All are nullable. All have indexes. None break existing queries.

### E.2 — Bridge Views (Optional, Evaluate During Implementation)

Bridge views can provide read-compatible interfaces if needed:

```sql
-- Example: view that makes event_instances look like parity_events for old code
CREATE OR REPLACE VIEW v_parity_events_bridge AS
SELECT
    pe.id, pe.event_name, pe.season_year, pe.track_id, pe.start_date_local,
    pe.end_date_local, pe.race_lookup, pe.event_code,
    ei.uuid AS event_instance_uuid,
    ei.event_type_id,
    et.code AS event_type_code
FROM parity_events pe
LEFT JOIN event_instances ei ON pe.event_instance_id = ei.id
LEFT JOIN event_types et ON ei.event_type_id = et.id;
```

**Recommendation:** Start with nullable FKs only. Add views only if a specific query compatibility issue arises during implementation. Views add maintenance overhead and should be justified by a concrete need.

### E.3 — API Transition Strategy

| Phase | API Behavior |
|-------|-------------|
| **Phase 1 (initial)** | All existing `api/parity.php` actions continue to work exactly as they do today. New actions for identity CRUD, event entry CRUD, and tech case CRUD are added in a **new file** (`api/tech-master.php` or `api/tm-*.php` files). |
| **Phase 1 (late)** | Existing parity actions that accept `eventId` (like `runsWithWeather`, `qualSheet`, `ladder`) continue to work with `parity_events.id`. They do not need to know about `event_instances.id` yet. |
| **Phase 2+** | New actions (scale, fuel) use `event_instances.id` and `event_entries.id` natively. Existing parity actions are incrementally updated to accept either ID format. |

### E.4 — UI Transition Strategy

| Phase | UI Behavior |
|-------|------------|
| **Phase 1** | `ParityPortal.tsx` and all parity panels continue to work identically. No parity UI changes in Phase 1. |
| **Phase 1 (late)** | A new admin panel is added for managing identities (persons, orgs, vehicles) and event entries. This is a separate tab/page, not a modification of existing parity panels. |
| **Phase 2+** | Scale module UI is built as a new page/panel that uses `event_instances` and `event_entries` natively. Parity panels are incrementally updated to show entry-linked data alongside existing driver-name-linked data. |

### E.5 — How Current Screens Continue to Function

| Screen / Feature | How It Works Today | How It Works During Transition |
|-----------------|-------------------|-------------------------------|
| Event selector dropdown | Queries `parity_events` via `eventsWithStats` | Unchanged — continues to query `parity_events` |
| Event Runs panel | Queries `parity_runs` by `race_lookup` or `event_id` (parity_events.id) | Unchanged |
| Qual Sheet | Queries `parity_runs` by event_id + class_index | Unchanged |
| Weather backfill | Uses `parity_events.id` + `parity_tracks.id` | Unchanged |
| Incident Analysis | Queries `run_incidents` by `run_id` FK to `parity_runs` | Unchanged — `tech_case_id` FK is nullable, ignored by existing code |
| Driver Combos panel | Uses `parity_driver_combos.driver_name` | Unchanged — `person_id` FK is nullable, ignored by existing code |
| PDF exports | Client-side `parityPdf.ts` — no backend dependency | Unchanged |

### E.6 — Avoiding "Big Bang" Rewrite

The key to avoiding a big bang is:

1. **No existing table is renamed or restructured** in Phase 1
2. **No existing API action changes its response shape** in Phase 1
3. **No existing UI component changes its props** in Phase 1
4. **New tables are created alongside** existing ones, connected by nullable FKs
5. **New API endpoints are added in new files**, not by modifying existing handlers
6. **Data flows one direction during bridge:** new tables are populated from new operations; existing tables continue to be populated by existing operations; nullable FKs connect them when both sides exist

---

## SECTION F — MULTI-EVENT UPGRADE PATH

### F.1 — Schema Changes

The schema changes that eliminate the single-event assumption are already part of Phase 1:

| Change | How It Helps |
|--------|-------------|
| `event_instances` table with no "active" column | Multiple events exist simultaneously — there is no DB-level concept of "the current event" |
| `event_entries.event_instance_id` NOT NULL FK | Every entry is scoped to an event — no ambiguity |
| `tech_cases.event_entry_id` NOT NULL FK | Every tech case is scoped to an entry (and transitively to an event) — no ambiguity |
| `parity_events.event_instance_id` nullable FK | Existing parity data links to the multi-event model without restructuring |

### F.2 — API Parameter Expectations

**Current state:** Most parity API actions already accept `eventId` as a parameter (e.g., `?action=runsWithWeather&eventId=5`). They do not rely on a server-side "current event" setting.

**Phase 1 rule:** All new API actions (tech-master endpoints) must require `event_instance_id` or `event_entry_id` as explicit parameters. No new action should have an implicit "current event" default.

**Exception:** A user-preference endpoint (`GET/POST /api/tech-master.php?action=userEventPreference`) can store the user's most recently selected event for UI convenience. This is per-user state, not system state.

### F.3 — UI State Assumptions

**Current state:** `ParityPortal.tsx` uses `selectedEventId` as React state (`useState<number | null>`). This is already correct — it's a UI convenience, not a database assumption.

**Phase 1 rule:** New UI pages (identity management, event entry management) should follow the same pattern: event selection is a component-level state variable or URL parameter, never a global store assumption.

**Recommended pattern for new pages:**

```typescript
// URL-driven event selection (shareable links)
const [searchParams] = useSearchParams();
const eventId = searchParams.get('eventId') ? Number(searchParams.get('eventId')) : null;
```

### F.4 — Filtering Defaults

| Context | Default Behavior |
|---------|-----------------|
| Event list page | Show current season's events, most recent first |
| Tech case list | If event selected, show that event's cases; if not, show all recent cases |
| Identity pages (person/org/vehicle) | Not event-scoped — show all-time data with optional event filter |
| Dossier views (Phase 7) | Not event-scoped by default — show full history |

### F.5 — Preserving User-Friendly Event Selection

The "selected event" experience stays user-friendly:

- Dropdown at top of relevant pages (same as current parity portal)
- Remembers last selection via localStorage or user preference API
- URL parameter support for deep-linking (`/tech?eventId=42`)
- "Active events" badge or section at top of list for events happening now

The critical constraint: this selection is **always a filter applied at the UI layer**, never a database column that gates queries.

---

## SECTION G — FIRST OPERATIONAL USE CASE FIT CHECK

### G.1 — Scale MVP Fit Check

The Phase 1 schema must support the eventual Scale module (Phase 2) without redesign. Here's the validation:

| Scale Requirement | How Phase 1 Supports It |
|-------------------|------------------------|
| **Manual event roster import** | `event_entries` table accepts bulk inserts: event_instance_id + person_id + org_id + vehicle_id + category + class_index + competition_number |
| **Entry selection by class + competition number** | `event_entries` has `class_index` and `competition_number` columns, with a unique constraint on (event_instance_id, competition_number, class_index) |
| **Run-linked timestamped scale records** | Scale readings will be in a `scale_readings` detail table FK'd to `tech_cases`. `tech_cases.opened_at` provides timestamp. `parity_runs.event_entry_id` FK allows correlation between runs and scale checks on the same entry. |
| **Driver-only weight** | `tech_cases` on an `event_entry` where entry has `person_id` set. Scale reading records `with_driver=true/false`. |
| **Car-only weight** | Same entry, scale reading with `with_driver=false`. |
| **Combined weight** | Two readings on the same tech case (or same entry, different cases). |
| **Rear axle weight** | `scale_readings` detail table can include `measurement_type` column (total, front_axle, rear_axle). This is a Phase 2 detail-table design decision, but Phase 1's backbone structure doesn't prevent it. |
| **Findings / flags** | `tech_findings` table: finding_type='discrepancy', measured_value='2318', expected_value='2330 (minimum)', disposition='open'. Directly linked to tech case on the event entry. |
| **Attachments / evidence** | `tech_attachments` with parent_type='tech_case' or 'finding', parent_id=case/finding id. Scale display photo, printout, etc. |

**Verdict: Phase 1 schema fully supports Scale MVP without redesign.**

### G.2 — Fuel Module Fit Check (Lighter)

| Fuel Requirement | Phase 1 Support |
|-----------------|----------------|
| Fuel sample linked to entry at event | `tech_cases` (case_type='fuel') on `event_entries` — same backbone |
| Sample metadata (specific gravity, dielectric) | `fuel_samples` detail table FK'd to `tech_cases` — Phase 3, but backbone is ready |
| Non-compliant finding | `tech_findings` — same as scale |
| Lab report attachment | `tech_attachments` — same as scale |
| History across events | Query tech_cases by case_type='fuel' joined through event_entries → same identity chain |

**Verdict: Phase 1 backbone supports Fuel without redesign.**

### G.3 — Potential Schema Corner Cases

| Concern | Assessment |
|---------|-----------|
| Entry with no person (unknown driver) | `person_id` is nullable — handled |
| Entry with no vehicle (vehicle not yet registered) | `vehicle_id` is nullable — handled |
| Multiple scale readings in one tech case | `scale_readings` detail table has its own PK; multiple rows per `tech_case_id` — handled by backbone design |
| Minimum weight varies by class + fuel state + accessories | Weight rules reference table (Phase 2) is separate from backbone — Phase 1 doesn't constrain it |
| Scale station identifier | `tech_cases.location` column stores station ID — handled |

---

## SECTION H — EXACT PHASE 1 IMPLEMENTATION BATCH BOUNDARY

### H.1 — Schema to Build (In Order)

| Order | Migration | Creates | Dependencies |
|-------|-----------|---------|-------------|
| 1 | `migrate-v17-tm-foundation.php` | `seasons`, `event_types` (with seed data) | None |
| 2 | `migrate-v18-tm-events.php` | `event_instances`, adds `event_instance_id` nullable FK to `parity_events`, backfills from existing parity_events rows | Requires v17 (seasons, event_types) |
| 3 | `migrate-v19-tm-identities.php` | `persons`, `organizations`, `vehicle_assets`, `components` | None (independent of v17/v18 but logically follows) |
| 4 | `migrate-v20-tm-entries.php` | `event_entries`, `event_entry_changes`, `org_memberships`, `vehicle_org_assignments` | Requires v18 (event_instances) + v19 (identities) |
| 5 | `migrate-v21-tm-techcases.php` | `tech_cases`, `tech_findings`, `tech_attachments` | Requires v20 (event_entries) |
| 6 | `migrate-v22-tm-bridge.php` | Adds nullable FKs: `parity_runs.event_entry_id`, `parity_driver_combos.person_id`, `run_incidents.tech_case_id`, `incident_analysis_sessions.tech_case_id` | Requires v20 + v21 |

### H.2 — New API Files

| File | Purpose | Actions |
|------|---------|---------|
| `api/tm-identities.php` | CRUD for persons, organizations, vehicle_assets, components | list, get, create, update, search |
| `api/tm-events.php` | CRUD for event_instances (alongside existing parity event management) | list, get, create, update, listTypes, listSeasons |
| `api/tm-entries.php` | CRUD for event_entries + assignment history | list, get, create, update, bulkCreate, listForEvent |
| `api/tm-techcases.php` | CRUD for tech_cases, tech_findings, tech_attachments | createCase, updateCase, closeCase, addFinding, updateFinding, addAttachment |

All new endpoints require admin/owner auth. All accept explicit `event_instance_id` or `event_entry_id` parameters — no implicit event selection.

### H.3 — New Frontend Files

| File | Purpose |
|------|---------|
| `src/services/techMasterApi.ts` | TypeScript API client for all `tm-*.php` endpoints |
| `src/pages/TechMasterAdmin.tsx` | Admin panel for identity management (persons, orgs, vehicles, components) |
| `src/pages/EventEntryManager.tsx` | Event entry roster management — create/edit entries for an event |

These are **new pages**, not modifications of existing parity pages. They can be added as new routes under `/tech-admin` or as new tabs in an admin section.

### H.4 — Existing Files Likely Affected

| File | Change | Scope |
|------|--------|-------|
| `api/lib/capabilities.php` | Add `techmaster.*` capabilities (techmaster.admin, techmaster.read) | Small — add to ROLE_CAPABILITIES |
| `src/domain/config/capabilities.ts` | Mirror new capabilities in TS | Small |
| `src/App.tsx` | Add routes for new admin pages | Small — 2-3 new route entries |
| `api/migrate-v22-tm-bridge.php` | ALTER TABLE on existing parity tables | Careful — idempotent, nullable only |

### H.5 — What Must NOT Be Touched

| Item | Why |
|------|-----|
| `api/parity.php` | All existing actions must continue to work identically |
| `api/incidents.php` | Existing incident CRUD is unchanged |
| `src/pages/ParityPortal.tsx` | No parity UI changes in Phase 1 |
| `src/services/parityApi.ts` | No changes to existing parity API client |
| `src/domain/parity/*` | No changes to parity domain logic |
| `parity_runs` columns/indexes (beyond adding FK) | No structural changes to existing columns |
| `parity_events` columns (beyond adding FK) | Same |

### H.6 — Backward Compatibility Requirements

1. All existing parity API actions return identical responses
2. All existing parity UI panels render and function identically
3. All existing tests pass without modification
4. Existing migration scripts (v6–v16) are not modified
5. New migrations are v17+ and are idempotent
6. No existing column is removed, renamed, or made non-nullable

### H.7 — Batch 1 Success Criteria

| # | Criterion | How to Verify |
|---|-----------|---------------|
| 1 | All 6 new migrations run successfully | Run v17–v22 in order; each reports OK/Exists |
| 2 | `event_instances` populated from existing parity_events | `SELECT COUNT(*) FROM event_instances` matches `SELECT COUNT(*) FROM parity_events` |
| 3 | Person CRUD works | POST/GET/PUT to `tm-identities.php?action=create/get/update&type=person` |
| 4 | Organization CRUD works | Same pattern |
| 5 | Vehicle Asset CRUD works | Same pattern |
| 6 | Event Entry CRUD works | POST to `tm-entries.php?action=create` with event_instance_id + person_id |
| 7 | Tech Case CRUD works | POST to `tm-techcases.php?action=createCase` with event_entry_id |
| 8 | Finding CRUD works | POST to `tm-techcases.php?action=addFinding` with tech_case_id |
| 9 | Attachment upload works | POST multipart to `tm-techcases.php?action=addAttachment` |
| 10 | Parity suite fully functional | Run existing parity tests; navigate parity portal; all panels work |
| 11 | Cross-identity query works | `SELECT` all tech_cases for a vehicle_id across events returns results |
| 12 | Existing tests pass | `npm test` and `npm run test:integration` unchanged |

---

## SECTION I — RISKS / OPEN DECISIONS

### I.1 — Decisions That Need Owner Input Before Coding

| # | Decision | Options | Impact if Wrong | Recommendation |
|---|----------|---------|-----------------|----------------|
| 1 | **New API file naming convention** | `tm-*.php` (tech-master prefix) vs `api/tech/*.php` (subdirectory) vs single `tech-master.php` (like `parity.php`) | Affects file organization and routing for the life of the system | `tm-*.php` prefix — consistent with current flat file structure (`parity.php`, `incidents.php`, `engines.php`), easy to find. Revisit if/when the API layer is refactored. |
| 2 | **Capability namespace** | `techmaster.*` vs `tm.*` vs `nhra.tech.*` | Affects capability key naming across PHP and TS | `techmaster.admin`, `techmaster.read` — clear, consistent with existing `nhra.parity` pattern |
| 3 | **Person matching strategy for backfill** | Exact `normalized_name` match vs fuzzy match vs manual-only linking | Affects whether existing parity runs can be auto-linked to person records | Start with exact `normalized_name` match. Manual override UI for edge cases. Fuzzy matching is too error-prone for an identity system. |
| 4 | **UI route structure** | `/tech-admin/*` as new section vs new tabs in existing admin portal vs standalone `/tech-master/*` | Affects navigation and discoverability | `/tech-admin` as a new top-level route with its own nav — keeps it separate from parity during buildout. Can merge later. |
| 5 | **`event_instances` backfill: one-time vs ongoing sync** | Run once during migration vs keep parity_events and event_instances in sync via triggers/hooks | Affects maintenance burden | One-time backfill in migration. Going forward, new events should be created in `event_instances` first, with `parity_events` row created as needed for backward compat. Decide the cutover timing when Phase 2 begins. |

### I.2 — Risks

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Identity data quality** — person/org/vehicle records will be sparse initially | Medium | All FK references from event_entries are nullable. System must work with partial data. |
| **Name matching ambiguity** — "J. Force" vs "John Force" vs "JOHN FORCE" in existing data | Medium | `persons.normalized_name` (uppercased, trimmed) plus manual merge UI. Do not attempt automated fuzzy dedup in Phase 1. |
| **Migration ordering** — v17–v22 must run after v6–v16 but some v6–v16 may not have run yet in all environments | Low | Document in migration script headers. Each new migration checks prerequisites (table existence) before proceeding. |
| **DB size growth** — new tables add overhead to a database already at 390 MB / 1000 MB | Low | Phase 1 tables are mostly empty initially (just structure + backfilled event_instances). Monitor via existing DB size snapshot system. |
| **Scope creep into parity rewrite** — temptation to "fix" existing parity code to use new tables | High | **Hard rule: no existing parity file changes in Phase 1 batch beyond the v22 bridge migration.** Parity integration is Phase 2+. |

---

**End of Phase 1 Technical Design**

This document is the technical bridge between the architecture proposal and the first safe implementation wave. Implementation begins after the open decisions in Section I.1 are resolved.
