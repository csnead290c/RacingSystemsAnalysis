# NHRA Tech Master Program — Architecture & Product Plan

**Date:** 2026-03-11
**Status:** Architecture proposal — do not implement yet
**Foundation:** Existing RSA parity suite (events, runs, weather, combos, incidents)

---

## SECTION A — EXECUTIVE ARCHITECTURE SUMMARY

### What the System Is

The NHRA Tech Master Program is a **sanctioning-body technical operations platform** that tracks the full lifecycle of competition entries — from declarations and credentialing through inspections, findings, and dispositions — across all NHRA event types, locations, categories, and seasons.

It is not a run-data tool. Run/performance data (the existing parity module) is one input stream among many. The system's primary job is to give NHRA technical staff a **complete, auditable record** of what was declared, what was inspected, what was found, and what was resolved — for any driver, team, vehicle, or entry — across time.

### Primary Operational Object: Event Entry

The **Event Entry** is the center of gravity for operational workflows. It represents:

> "This driver, driving for this team, in this vehicle configuration, entered this category/class at this event, with this competition number."

Every tech action — scale check, fuel check, body inspection, teardown, incident — attaches to an Event Entry. This is how it works in the physical world: NHRA tech staff interact with *entries at events*, not with abstract driver or vehicle records.

However, Event Entry is **transient and event-scoped**. It must not replace long-lived identities.

### Long-Lived Identity Objects

Four independent identity spines persist across events and seasons:

| Identity | What It Tracks | Why It's Separate |
|----------|---------------|-------------------|
| **Person / Driver** | Individual humans who drive, crew, or own entries | A driver changes teams, cars, and categories over time |
| **Team / Entrant / Organization** | The business entity that fields entries | A team has multiple drivers, multiple cars, and persists across seasons |
| **Vehicle / Asset** | The physical car/chassis as a durable object | A car outlives any single driver assignment and carries its own tech history |
| **Component** | Major serialized parts (engines, transmissions, bodies) | Parts move between vehicles; serialized tracking requires independence |

### Declarations vs Inspections

The system enforces a hard boundary:

- **Declarations** = what the team *said* was true (tech cards, compliance forms, declared specs/serials)
- **Inspections / Findings** = what NHRA *observed, measured, or ruled*

These are never stored in the same table. A declaration is an input; an inspection is an independent verification. Findings reference both but belong to neither.

### Why Parity Becomes a Module

The existing parity suite covers run ingestion, weather correction, anomaly detection, and performance reporting. This is valuable but narrow. In the Tech Master model, parity becomes the **Run Data / Performance** module — one of ~10 modules that share a common backbone of identities, event entries, and tech cases.

This means parity's existing `parity_events`, `parity_tracks`, and `parity_runs` tables become *consumers* of the shared event and entry model rather than owning their own parallel identity system.

---

## SECTION B — CORE DOMAIN MODEL

### B.1 — Person / Driver

- **Purpose:** Long-lived record of an individual human
- **Scope:** Lifetime — survives across teams, vehicles, seasons
- **Key fields:** UUID, legal name, display name, NHRA license/credential IDs, contact, status
- **Key relationships:** Has many Event Entries (as driver), has many Team Memberships, has many Declarations, has many Tech Cases (as subject)
- **Why separate:** A driver who switches from Don Schumacher Racing to John Force Racing mid-season must carry their full history with them. Folding driver into team or vehicle loses this.

### B.2 — Team / Entrant / Organization

- **Purpose:** Long-lived record of the business entity that fields entries
- **Scope:** Lifetime — persists across seasons, drivers, vehicles
- **Key fields:** UUID, org name, owner(s), NHRA entrant IDs, status
- **Key relationships:** Has many Event Entries (as entrant), has many Team Memberships (drivers over time), has many Vehicles (ownership/assignment), has many Declarations
- **Why separate:** A team that runs 3 cars with 5 different drivers over a season is a single entity with a unified compliance history. Folding team into driver or vehicle loses this organizational view.

### B.3 — Vehicle / Asset

- **Purpose:** Long-lived record of a physical car/chassis
- **Scope:** Lifetime of the physical asset — survives driver changes, team transfers, renumbering
- **Key fields:** UUID, chassis serial/VIN, body type, primary description, current_team_id (nullable), status
- **Key relationships:** Has many Event Entries (as vehicle), has many Component Installations (over time), has many Tech Cases, has many Declarations
- **Why separate:** Competition number 13 in Top Fuel this year is not the same *thing* as competition number 13 last year. The physical car has its own teardown history, body measurement history, and compliance trail. Race number is a *label*, not an identity.

### B.4 — Component / Serialized Part

- **Purpose:** Track major serialized parts that move between vehicles
- **Scope:** Lifetime of the part
- **Key fields:** UUID, serial number, component type (engine, transmission, body, supercharger, etc.), manufacturer, status
- **Key relationships:** Has many Installation History records (which vehicle, date range), has many Tech Cases (inspections of this specific part)
- **Why separate:** An engine block with serial #12345 might be in car A at Pomona and car B at Gainesville. Teardown findings attach to the *engine*, not just the car it happened to be in.

### B.5 — Season

- **Purpose:** Calendar boundary for scheduling, eligibility, and reporting
- **Scope:** One per competition year
- **Key fields:** Year, start/end dates, status (upcoming/active/completed)
- **Key relationships:** Contains many Event Instances

### B.6 — Event Type

- **Purpose:** Classification template for events
- **Scope:** Reference data
- **Key fields:** Code, label (National, Divisional, Regional, Specialty, Test), default config
- **Why separate:** Avoids hard-coding event type into event instances. Allows adding new event types without schema changes.

### B.7 — Event Instance

- **Purpose:** A specific occurrence of an event at a place and time
- **Scope:** One per actual event (e.g., "2026 Winternationals at Pomona, Feb 6–9")
- **Key fields:** UUID, event_type_id, season_id, track_id, name, start_date, end_date, status, location metadata
- **Key relationships:** Belongs to Season, belongs to Track, has many Event Entries, has many Sessions
- **Critical:** Multiple Event Instances can be active simultaneously. The database must never assume a single "current event."

### B.8 — Session / Run

- **Purpose:** Individual pass down the track within an event
- **Scope:** Event-scoped, immutable after recording
- **Key fields:** UUID, event_entry_id, session_type (qualifying/eliminations/test), round, lane, timestamp, all timing splits, weather snapshot
- **Key relationships:** Belongs to Event Entry, has optional Weather Snapshot, has many Tech Cases (post-run inspections)
- **Note:** This is the evolution of the existing `parity_runs` table. The key change is that runs link to Event Entries rather than being identified solely by `driver_name + race_lookup`.

### B.9 — Event Entry

- **Purpose:** The operational junction — "this driver, this team, this vehicle, this class, this event"
- **Scope:** Event-scoped (one per entry per event)
- **Key fields:** UUID, event_instance_id, person_id (driver), team_id (entrant), vehicle_id, category, class_index, competition_number, entry_status
- **Key relationships:** Belongs to Event Instance, Person, Team, Vehicle. Has many Sessions/Runs, Declarations, Tech Cases, Findings
- **Why it's the center:** Every operational action at an event targets an entry. Scale checks, fuel checks, tech cards, teardowns — all happen to "entry #13 in Top Fuel at this event." The Event Entry is the natural anchor.
- **Critical design rule:** Event Entry *references* long-lived identities but does not *replace* them. Querying "all entries for driver X" crosses events; querying "all tech cases for vehicle Y" crosses entries.

### B.10 — Event Entry Assignments (History)

- **Purpose:** Track changes to an entry during an event (driver swap, renumber)
- **Scope:** Event-scoped, time-bounded
- **Key fields:** event_entry_id, field_changed, old_value, new_value, effective_from, changed_by, reason
- **Why needed:** Mid-event driver changes or renumbering must be recorded, not silently overwritten. The entry at 10am may have a different driver than the entry at 3pm.

### B.11 — Declarations

- **Purpose:** Store what the team declared — tech cards, compliance forms, declared specs
- **Scope:** Event-scoped (attached to Event Entry) but auditable across time
- **Key fields:** UUID, event_entry_id, declaration_type (tech_card, compliance_form, equipment_declaration), declared_data (structured JSON or typed columns per type), submitted_at, submitted_by, version
- **Key relationships:** Belongs to Event Entry. Referenced by Tech Cases (for comparison)
- **Critical:** Declarations are *input*. They are never modified by inspection results. If a team declares engine serial #12345, and NHRA finds #12346 during teardown, both facts are stored independently.

### B.12 — Tech Case / Inspection

- **Purpose:** A single inspection, check, or audit action performed by NHRA staff
- **Scope:** Event-scoped, but queryable across all events for any identity
- **Key fields:** UUID, event_entry_id, tech_case_type (scale, fuel, body, chassis, teardown, general_tech, incident_investigation), status (open/in_progress/closed), opened_at, closed_at, operator_id, location/station, notes
- **Key relationships:** Belongs to Event Entry. Has many Findings. Has many Attachments. May reference a Declaration (what was being verified). May reference specific Components.
- **Why a shared backbone:** All inspection types share the same lifecycle (open → findings → disposition → close). Module-specific detail goes in linked detail tables, not in the tech case itself.

### B.13 — Finding / Discrepancy

- **Purpose:** A specific observation, measurement, or ruling from a tech case
- **Scope:** Belongs to a Tech Case, but queryable across identities
- **Key fields:** UUID, tech_case_id, finding_type (discrepancy, observation, measurement, violation, confiscation), severity, description, measured_value, expected_value, disposition (resolved/unresolved/deferred/penalized), resolved_at, resolved_by, follow_up_required
- **Key relationships:** Belongs to Tech Case. May reference Component (e.g., specific engine found out of spec). Has many Attachments.
- **Why separate from Tech Case:** A single teardown may produce 0, 1, or 15 findings. Findings have their own lifecycle (open → resolved) independent of the case.

### B.14 — Attachment / Evidence

- **Purpose:** Photos, documents, videos, PDFs, scanned tech cards
- **Scope:** Linked to any entity via polymorphic reference
- **Key fields:** UUID, parent_type (tech_case, finding, declaration, event_entry, vehicle, component), parent_id, file_type, file_path, uploaded_at, uploaded_by, caption
- **Why generic:** Evidence can attach to anything. A photo of a cracked block attaches to a finding. A scanned tech card attaches to a declaration. A chassis cert attaches to a vehicle.

---

## SECTION C — IDENTITY AND HISTORY STRATEGY

### The Core Problem

NHRA technical operations involve entities that change relationships constantly:

- A driver moves from Team A to Team B mid-season
- A team replaces their driver in car #7 between Pomona and Phoenix
- A car gets a new engine between events
- A competition number is reassigned to a different physical vehicle
- The same driver runs Pro Stock at nationals and Stock at divisionals

A system that identifies entries by `driver_name + car_number` or `team_name + class` will produce **broken history** the moment any of these changes happen.

### The Solution: Independent Identity Spines + Junction Records

```
Person ──────┐
             ├──→ Event Entry ──→ Tech Cases ──→ Findings
Team ────────┤         │
             │         ├──→ Declarations
Vehicle ─────┘         ├──→ Sessions/Runs
                       └──→ Attachments
```

Each identity (Person, Team, Vehicle) is a **stable, long-lived row** with its own UUID. The Event Entry is the **junction** that connects them at a specific event. History queries work by following the Event Entry join:

| Question | Query Path |
|----------|------------|
| What events has driver X entered? | `Person → Event Entries → Event Instances` |
| What teams has driver X driven for? | `Person → Event Entries → Teams` (distinct) |
| What drivers have used vehicle Y? | `Vehicle → Event Entries → Persons` (distinct) |
| What team fielded entry #13 at Pomona 2026? | `Event Instance (Pomona 2026) → Event Entries (comp_number=13) → Team` |
| All tech findings for vehicle Y? | `Vehicle → Event Entries → Tech Cases → Findings` |
| All incidents involving driver X? | `Person → Event Entries → Tech Cases (type=incident) → Findings` |
| Full compliance trail for team Z? | `Team → Event Entries → Declarations + Tech Cases + Findings` |

### Why Not Driver-Centric

If the system treats `driver_name` as the primary key (as current parity does with `parity_runs.driver_name`):
- Vehicle history is lost when a driver leaves
- Team compliance trail fragments when drivers rotate
- A driver running multiple classes appears as one blob

### Why Not Vehicle-Centric

If the system treats vehicle/car-number as the primary key:
- Driver performance history is lost when they switch cars
- Team history fragments when they sell a car
- Renumbering breaks all continuity

### Why Not Team-Centric

If the system treats team as the primary key:
- Individual driver accountability disappears
- Vehicle-specific findings (cracked block, out-of-spec body) lose precision
- Multi-car teams become impossible to track at the entry level

### The Answer: All Three, Connected Through Event Entry

Event Entry is the only place where Person + Team + Vehicle + Class + Event converge. By making it the operational junction, every identity gets its own clean history, and cross-cutting queries work naturally.

### Handling Mid-Event Changes

The `event_entry_assignments` history table records when a field on an Event Entry changes during an event. This means:

- If driver A is replaced by driver B in car #7 mid-event, the entry gets a new assignment record. Both drivers' histories reflect their participation.
- If a competition number changes, the old and new numbers are both recorded.
- Queries for "who was driving this entry during round 2?" can resolve to the correct person using timestamps.

---

## SECTION D — MULTI-EVENT / MULTI-LOCATION OPERATING MODEL

### Event Types

| Type | Characteristics | Volume |
|------|----------------|--------|
| **National** | All professional and sportsman categories, 20–24/year, multi-day | Primary |
| **Divisional** | Regional competition, sportsman-heavy, hundreds/year | High volume |
| **Regional** | Club-level, local tracks | Very high volume |
| **Specialty** | All-Star callouts, match races, manufacturer tests | Irregular |

### Concurrent Events

On any given weekend, NHRA may have:
- 1 national event (e.g., Gainesville)
- 3–6 divisional events in different states
- Dozens of regional events

**The database must never have a "current event" column or singleton.** Every query must include an `event_instance_id` filter. "Active event" is a **UI preference** stored per-user or per-session, never a database-level assumption.

### What Must Change From Current Parity

The existing parity system has several single-event assumptions that must be eliminated:

| Current Assumption | Problem | Required Change |
|-------------------|---------|-----------------|
| `parity_events` has one "active" event at a time in the UI | Can't view two events side by side | Event selection becomes a filter, not a global state |
| `race_lookup` is the primary event identifier on runs | Loosely structured string, not a FK | Runs must FK to `event_instances.id` |
| Weather backfill targets one event | Can't batch-process concurrent events | Backfill must accept event_instance_id parameter |
| `parity_runs.driver_name` is a free-text string | No link to a person identity | Runs must eventually FK to `event_entries.id` (and through it, to `persons.id`) |
| Event catalog is flat | No event type, no season context | Events must have type, season, and track FKs |

### Event-Scoped Dashboards

The UI should support:
- **Event Selector** — dropdown/filter showing all events the user has access to, grouped by type and date
- **Multi-event views** — driver/team/vehicle dossiers that span events naturally
- **Event dashboard** — a single-event operational view showing all entries, active tech cases, open findings
- **Cross-event reports** — parity trends, compliance summaries, seasonal rollups

### Operator Workflows

- An operator at Gainesville and an operator at a divisional in Denver must be able to work simultaneously without data conflicts
- Each operator's "active event" is a client-side preference
- All writes include `event_instance_id` — there is no ambiguity about which event a tech case belongs to

---

## SECTION E — DECLARATIONS VS INSPECTIONS VS FINDINGS

### Three-Layer Model

```
┌─────────────────────────────────────────────────┐
│  DECLARATIONS (team-submitted)                  │
│  "We declare engine serial #12345, weight 2330" │
└──────────────────────┬──────────────────────────┘
                       │ referenced by
┌──────────────────────▼──────────────────────────┐
│  TECH CASES / INSPECTIONS (NHRA-performed)      │
│  "Scale check at 2:15pm, operator: Smith"       │
│  "Teardown of entry #13, bay 3"                 │
└──────────────────────┬──────────────────────────┘
                       │ produces
┌──────────────────────▼──────────────────────────┐
│  FINDINGS / DISPOSITIONS (NHRA-determined)      │
│  "Underweight by 12 lbs — penalty assessed"     │
│  "Serial mismatch — confiscated, open fix"      │
└─────────────────────────────────────────────────┘
```

### Layer 1: Declarations

| Attribute | Detail |
|-----------|--------|
| **Source** | Team / entrant |
| **Examples** | Tech cards, equipment declarations, compliance forms, weight declarations |
| **Mutability** | Immutable once submitted; new versions create new records |
| **Storage** | Per-declaration-type structured data (not a generic blob) |
| **Attached to** | Event Entry |
| **Key principle** | Declarations are *claims*. They may be accurate or inaccurate. The system stores them as-is. |

Tech cards deserve special note: they may never be *directly entered* into this system by teams. Instead, NHRA staff may scan/photograph physical cards and store them as attachments on a Declaration record, then selectively key in declared values for comparison.

### Layer 2: Tech Cases / Inspections

| Attribute | Detail |
|-----------|--------|
| **Source** | NHRA technical staff |
| **Examples** | Scale check, fuel sample, body template, chassis inspection, teardown, general tech, incident investigation |
| **Lifecycle** | Created → In Progress → Findings recorded → Closed |
| **Storage** | Shared backbone table (`tech_cases`) with module-specific detail in linked tables |
| **Attached to** | Event Entry (and optionally specific Component) |
| **Key principle** | An inspection is an *action performed*, regardless of whether it finds anything wrong. |

### Layer 3: Findings / Dispositions

| Attribute | Detail |
|-----------|--------|
| **Source** | Result of a Tech Case |
| **Examples** | Discrepancy, underweight, expired tag, mismatched serial, out-of-spec measurement, confiscated part, open fix |
| **Lifecycle** | Created → Disposition assigned → Resolved/Deferred/Penalized |
| **Storage** | `findings` table with typed severity and disposition |
| **Attached to** | Tech Case (and transitively to Event Entry, Person, Team, Vehicle) |
| **Key principle** | Findings are *facts determined by NHRA*. They have their own resolution lifecycle. A single tech case can produce zero or many findings. |

### Why Not Collapse These

If declarations and findings are in the same table:
- You can't distinguish "team said 2330 lbs" from "NHRA measured 2318 lbs"
- Audit trails become ambiguous — who said what?
- Compliance reporting conflates claims with verified facts

If tech cases and findings are in the same table:
- A clean inspection (no findings) has no natural representation
- Multi-finding cases require awkward array columns or multiple rows that duplicate case metadata
- Finding resolution lifecycle gets tangled with case lifecycle

---

## SECTION F — TECH MODULE FRAMEWORK

Each module plugs into the shared backbone (identities, event entries, tech cases, findings, attachments) and adds module-specific detail.

### F.1 — Event Entries Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Manage the roster of entries per event — who is entered, in what class, with what number, driving for whom, in which vehicle |
| **Shared objects** | Person, Team, Vehicle, Event Instance |
| **Module-specific** | Entry status workflow, competition number assignment, credential checks |
| **Phase** | **Phase 1** — required foundation |

### F.2 — Parity / Run Data Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Ingest, normalize, correct, and analyze run/performance data |
| **Shared objects** | Event Entry (replaces driver_name+race_lookup), Event Instance, Session/Run |
| **Module-specific** | OData ingestion, weather correction, HPC computation, anomaly detection, parity reports |
| **Phase** | **Phase 1** — already built, needs integration with shared backbone |
| **Migration note** | Existing `parity_runs` rows will need a backfill to link to Event Entry IDs once the entry model exists. Until then, the existing `driver_name + race_lookup` linkage continues to work. |

### F.3 — Scale Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record weigh-ins, compare to declared/minimum weights, flag discrepancies |
| **Shared objects** | Event Entry, Tech Case, Finding |
| **Module-specific** | `scale_readings` detail table: measured_weight, scale_station_id, with_driver (bool), fuel_state, timestamp. Weight rules per class (minimum weight table). |
| **Phase** | **Phase 2** — first new operational module |

### F.4 — Fuel Check Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record fuel samples, test results, flag non-compliant fuel |
| **Shared objects** | Event Entry, Tech Case, Finding |
| **Module-specific** | `fuel_samples` detail table: sample_id, fuel_type_declared, specific_gravity, dielectric, additive_flags, test_method, timestamp |
| **Phase** | **Phase 3** — sibling to scale, same backbone |

### F.5 — Tech Card Audit Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Store, index, and audit team-submitted tech cards; compare declared specs against inspection results |
| **Shared objects** | Event Entry, Declaration, Attachment |
| **Module-specific** | `tech_card_entries` detail table: card_type, declared fields (structured per category), scan/photo attachments, keyed values for comparison |
| **Phase** | **Phase 4** — depends on declaration model |

### F.6 — Body / Chassis Inspection Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record body template measurements, chassis certifications, dimensional checks |
| **Shared objects** | Event Entry, Vehicle, Component, Tech Case, Finding |
| **Module-specific** | `body_measurements` detail table: measurement_point, measured_value, spec_min, spec_max, template_id. `chassis_certs`: cert_number, expiry, issuer |
| **Phase** | **Phase 5** |

### F.7 — General Tech Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Catch-all for tech inspections that don't fit scale/fuel/body/teardown |
| **Shared objects** | Event Entry, Tech Case, Finding, Attachment |
| **Module-specific** | `general_tech_details`: inspection_area, checklist_template_id, notes. Flexible but typed. |
| **Phase** | **Phase 5** — parallel with body/chassis |

### F.8 — Teardown Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Full engine/drivetrain teardown audits with serialized part verification |
| **Shared objects** | Event Entry, Vehicle, Component, Tech Case, Finding, Declaration (for comparison) |
| **Module-specific** | `teardown_details`: bay_assignment, parts_inventory (array of component_id + serial + condition), measurement_sets, photos. Comparison logic against declared components. |
| **Phase** | **Phase 6** — most complex module |

### F.9 — Incidents Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Record and investigate on-track incidents, crashes, mechanical failures |
| **Shared objects** | Event Entry, Session/Run, Tech Case, Finding, Attachment |
| **Module-specific** | Existing `run_incidents` + `incident_analysis_*` tables. Telemetry workspace. Video evidence. |
| **Phase** | **Phase 1** — already built, needs backbone integration |

### F.10 — Rule Compliance / Open Fixes Module

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track open compliance items, required fixes, deadlines, and resolution |
| **Shared objects** | Person, Team, Vehicle, Finding (as source) |
| **Module-specific** | `compliance_items`: finding_id (source), required_action, deadline, status (open/in_progress/verified/waived), verified_by, verified_at |
| **Phase** | **Phase 6** — depends on findings pipeline |

### F.11 — Reports / Dossiers / History Views

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Cross-cutting views: driver 360, team 360, vehicle 360, event summary, seasonal compliance |
| **Shared objects** | All identities, all tech cases, all findings |
| **Module-specific** | Read-only aggregation views, PDF export, dashboards |
| **Phase** | **Phase 7** — requires data from earlier phases to be meaningful |

---

## SECTION G — RECOMMENDED DATA ARCHITECTURE

### G.1 — First-Class Relational Tables

These entities should be proper relational tables with UUIDs, foreign keys, and indexes — not JSON blobs or EAV patterns.

**Identity tables (long-lived):**

| Table | PK | Key FKs | Notes |
|-------|-----|---------|-------|
| `persons` | id / uuid | — | Drivers, crew, owners |
| `teams` | id / uuid | — | Entrant organizations |
| `vehicles` | id / uuid | current_team_id (nullable) | Physical cars/chassis |
| `components` | id / uuid | current_vehicle_id (nullable) | Serialized major parts |
| `tracks` | id / uuid | — | Physical facilities (evolves from `parity_tracks`) |

**Season/Event tables:**

| Table | PK | Key FKs | Notes |
|-------|-----|---------|-------|
| `seasons` | id | — | One per competition year |
| `event_types` | id | — | Reference: national, divisional, regional, specialty |
| `event_instances` | id / uuid | season_id, event_type_id, track_id | Specific occurrence (evolves from `parity_events`) |

**Operational tables (event-scoped):**

| Table | PK | Key FKs | Notes |
|-------|-----|---------|-------|
| `event_entries` | id / uuid | event_instance_id, person_id, team_id, vehicle_id | The central junction |
| `sessions` | id / uuid | event_entry_id | Individual runs (evolves from `parity_runs`) |
| `declarations` | id / uuid | event_entry_id | Team-submitted claims |
| `tech_cases` | id / uuid | event_entry_id | Inspections/checks |
| `findings` | id / uuid | tech_case_id | Observations/rulings |
| `attachments` | id / uuid | parent_type, parent_id | Polymorphic file references |

### G.2 — Time-Bounded Assignment / History Tables

These track relationships that change over time. Each row has `effective_from` and `effective_to` (nullable = current).

| Table | Tracks | Example |
|-------|--------|---------|
| `team_memberships` | Person ↔ Team over time | "Driver X was with Team A from 2024-01 to 2025-06" |
| `vehicle_assignments` | Vehicle ↔ Team over time | "Car #7 was with Team B from 2025-03 to present" |
| `component_installations` | Component ↔ Vehicle over time | "Engine #12345 was in Vehicle X from event A to event B" |
| `event_entry_changes` | Field changes on an entry during an event | "Driver changed from A to B at 2:15pm" |
| `driver_combos` | Driver ↔ Engine Combo over time | Already exists as `parity_driver_combos` — fits this pattern |

**Design rule:** Never overwrite a relationship. Append a new row with a new `effective_from` and close the previous row's `effective_to`.

### G.3 — Snapshot / Version Records

Some data must be captured as a point-in-time snapshot because the source can change.

| Need | Approach |
|------|----------|
| Vehicle configuration at time of entry | `event_entries.vehicle_config_snapshot` — JSON blob of weight, engine, body, key specs at entry time |
| Weather at time of run | `sessions.weather_snapshot` — temp, humidity, pressure, wind (already exists as weather join in parity) |
| Declaration versions | `declarations.version` — integer, new version creates new row, old versions are immutable |
| Tech card scan at submission time | Attachment with timestamp — the physical card is a frozen artifact |

**Design rule:** Snapshots are immutable. Current state lives on the identity table; historical state lives in snapshots. Never update a snapshot in place.

### G.4 — Module-Specific Detail Tables (Not EAV)

Each tech module gets its own detail table linked to `tech_cases` via FK. This is better than a generic EAV (Entity-Attribute-Value) pattern because:

- Scale readings have specific columns (weight, station, fuel state) — EAV would make these stringly typed
- Fuel samples have specific columns (specific gravity, dielectric) — EAV loses type safety
- Body measurements have specific columns (measurement point, spec min/max) — EAV makes range validation impossible
- Teardown inventories have structured part lists — EAV cannot represent nested structure

| Detail Table | Links To | Key Columns |
|-------------|----------|-------------|
| `scale_readings` | tech_cases.id | measured_weight, scale_station, with_driver, fuel_state |
| `fuel_samples` | tech_cases.id | sample_id, fuel_type, specific_gravity, dielectric, additives |
| `body_measurements` | tech_cases.id | measurement_point, value, spec_min, spec_max, template_id |
| `teardown_details` | tech_cases.id | bay_id, parts_json, measurement_sets_json |
| `general_tech_details` | tech_cases.id | inspection_area, checklist_id, notes |
| `incident_details` | tech_cases.id | run_id, incident_type, telemetry_session_id (bridges to existing `incident_analysis_*` tables) |

**Design rule:** Prefer typed detail tables over EAV. Add new detail tables for new modules. The shared `tech_cases` backbone handles lifecycle; the detail table handles domain-specific data.

### G.5 — Where Generic Backbone Makes Sense

The **tech case → findings → attachments** pipeline is intentionally generic because:

- Every inspection type follows the same lifecycle: open → work → findings → close
- Findings from any module (scale, fuel, teardown) share the same disposition workflow
- Attachments can belong to anything — a finding, a case, a declaration, a vehicle
- Cross-cutting queries ("all open findings for team X") must span modules

This is the correct place for generalization. The alternative — separate `scale_findings`, `fuel_findings`, `teardown_findings` tables — would make cross-cutting queries require N-way UNIONs that grow with every module added.

### G.6 — What Must NOT Be Modeled As

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| **Single giant table** | A `tech_events` table with 200 nullable columns for every module collapses into an unmaintainable mess. Scale readings and teardown inventories have nothing in common at the column level. |
| **Single event assumption** | A `current_event_id` setting or any table without `event_instance_id` breaks the moment two events happen on the same weekend. |
| **Driver-only system** | `driver_name` as the only identity key loses vehicle history, team history, and breaks on driver changes. |
| **Car-number-only system** | Competition numbers are reassigned constantly. Number 13 in 2025 is not the same car as number 13 in 2026. |
| **Pure EAV for module data** | `key VARCHAR, value VARCHAR` loses type safety, makes validation impossible, and turns every query into a pivot. Use it only for truly dynamic user-defined fields, not for core module data. |
| **Flattened tech cards** | A single `tech_card` table with 150 columns for every possible declared field is rigid and category-specific. Use typed declaration subtypes or structured JSON within a typed declaration record. |

---

## SECTION H — RECORD VIEWS / DOSSIER VIEWS

### H.1 — Driver 360 View

**Audience:** Tech director, series official, competition director

**Content:**

| Section | Data Source | What's Shown |
|---------|-----------|--------------|
| **Profile** | `persons` | Name, license IDs, credential status, photo |
| **Event History** | `event_entries → event_instances` | Table of all events entered, by season. Category, class, team, competition number, vehicle for each |
| **Performance** | `sessions` (from parity runs) | Season stats: events, rounds, best ET, best MPH, win/loss, parity trends |
| **Team History** | `event_entries → teams` | Timeline of team affiliations with date ranges |
| **Vehicle History** | `event_entries → vehicles` | Timeline of vehicles driven |
| **Declarations** | `event_entries → declarations` | Recent and historical tech card submissions, equipment declarations |
| **Tech Cases** | `event_entries → tech_cases` | All inspections involving this driver, by type and date |
| **Findings** | `tech_cases → findings` | All findings/discrepancies, with disposition status |
| **Incidents** | `tech_cases (type=incident)` | Incident history with links to analysis sessions |
| **Open Items** | `findings (disposition=unresolved)` | Any open compliance items, required fixes, deadlines |
| **Attachments** | `attachments` | Photos, scanned cards, documents across all linked records |

### H.2 — Team / Entrant 360 View

**Audience:** Tech director, series administrator

| Section | Data Source | What's Shown |
|---------|-----------|--------------|
| **Profile** | `teams` | Org name, owner, entrant IDs, status |
| **Entries** | `event_entries` | All entries this team has fielded, by season/event. Shows driver, vehicle, class for each |
| **Driver Roster** | `team_memberships` | Current and historical driver affiliations |
| **Vehicle Fleet** | `vehicle_assignments` | Current and historical vehicles |
| **Compliance Summary** | `tech_cases + findings` | Aggregated: total inspections, findings rate, open items, resolution rate |
| **Declarations** | `event_entries → declarations` | All tech cards and equipment declarations submitted |
| **Open Items** | `findings (unresolved)` | All unresolved findings across all entries |

### H.3 — Vehicle / Asset 360 View

**Audience:** Tech inspector, teardown crew, safety official

| Section | Data Source | What's Shown |
|---------|-----------|--------------|
| **Identity** | `vehicles` | Chassis serial, body type, description, current team |
| **Component History** | `component_installations` | What parts are currently installed, and installation timeline |
| **Entry History** | `event_entries` | All events this vehicle has been entered in, with driver/team/class for each |
| **Weight History** | `scale_readings` (via tech_cases) | Chart of weigh-in measurements over time |
| **Body/Chassis History** | `body_measurements` (via tech_cases) | Measurement trends, certification status |
| **Teardown History** | `teardown_details` (via tech_cases) | All teardowns, parts inventories, findings |
| **Findings** | `tech_cases → findings` | All findings ever associated with this vehicle |
| **Certifications** | `chassis_certs` | SFI, NHRA chassis certs, expiry dates |
| **Attachments** | `attachments` | Photos, docs, scans linked to this vehicle or its tech cases |

### H.4 — Event Entry Dossier View

**Audience:** Tech inspector at the event, operational staff

| Section | Data Source | What's Shown |
|---------|-----------|--------------|
| **Entry Summary** | `event_entries` | Driver, team, vehicle, class, competition number, entry status |
| **Configuration Snapshot** | `event_entries.vehicle_config_snapshot` | Declared/recorded specs at time of entry |
| **Declarations** | `declarations` | All tech cards and declarations for this entry |
| **Runs** | `sessions` | All runs made by this entry at this event, with timing splits |
| **Active Tech Cases** | `tech_cases (status=open/in_progress)` | Any in-progress inspections |
| **Completed Tech Cases** | `tech_cases (status=closed)` | All completed inspections at this event |
| **Findings** | `findings` | All findings for this entry at this event |
| **Scale History** | `scale_readings` | All weigh-ins for this entry at this event |
| **Fuel History** | `fuel_samples` | All fuel checks for this entry at this event |
| **Entry Changes** | `event_entry_changes` | Any mid-event changes (driver swap, renumber) |
| **Attachments** | `attachments` | All photos/docs for this entry at this event |

---

## SECTION I — SCALE AND FUEL IN THE BIGGER SYSTEM

### Why Scale First

Scale is the ideal first operational module because:

1. **High frequency** — every professional entry gets weighed multiple times per event
2. **Simple data model** — a reading is: weight + timestamp + station + operator + conditions
3. **Clear pass/fail** — compare measured weight against minimum weight rules per class
4. **Immediate value** — eliminates paper-based weight tracking, provides instant history
5. **Forces the backbone** — building scale correctly requires Event Entries, Tech Cases, and Findings to work, which validates the shared architecture for all future modules

### Scale Data Flow

```
Event Entry (driver/team/vehicle/class)
    │
    ├──→ Tech Case (type=scale, operator=Smith, station=Scale-1, 2:15pm)
    │        │
    │        ├──→ Scale Reading (measured_weight=2318, with_driver=true, fuel_state=full)
    │        │
    │        ├──→ Finding (type=underweight, measured=2318, minimum=2330, severity=violation)
    │        │    └──→ Disposition: penalty assessed
    │        │
    │        └──→ Attachment (photo of scale display)
    │
    └──→ Declaration (tech_card: declared_weight=2330)
              ↑
              │ (comparison: declared 2330 vs measured 2318 → discrepancy)
```

### How Scale Connects to Other Objects

| Connection | How |
|-----------|-----|
| **Event Entry** | Every scale reading belongs to a tech case on an event entry |
| **Runs** | Scale can happen pre-qualifying, post-run, or at any point. Timestamp allows correlation with specific runs |
| **Timestamps** | Every reading has a UTC timestamp. Weight trends over an event (pre-qual vs post-final) are queryable |
| **Operators** | The `tech_cases.operator_id` records who performed the weigh-in |
| **Findings** | Underweight, overweight, discrepancy vs declared → all go to `findings` with typed dispositions |
| **Attachments** | Scale display photos, printouts → attach to the tech case or finding |
| **History views** | Vehicle 360 shows weight trend across events. Driver 360 shows compliance rate. Team 360 shows all entries' scale results |

### Why Fuel Next

Fuel is the natural sibling to scale because:

1. It follows the exact same backbone pattern (tech case → reading → finding)
2. It's similarly high-frequency (fuel checks happen regularly for professional classes)
3. The detail table is different (specific gravity, dielectric vs weight) but the lifecycle is identical
4. Building fuel second validates that the backbone truly generalizes

### Fuel Data Flow

```
Event Entry
    │
    ├──→ Tech Case (type=fuel, operator=Jones, station=Fuel-Lab, 3:30pm)
    │        │
    │        ├──→ Fuel Sample (sample_id=F-2026-0142, specific_gravity=0.881, dielectric=OK)
    │        │
    │        ├──→ Finding (type=non_compliant_fuel, additive_detected=true, severity=violation)
    │        │    └──→ Disposition: disqualified
    │        │
    │        └──→ Attachment (lab report PDF)
    │
    └──→ Declaration (tech_card: declared_fuel_type=VP Racing C12)
```

### What Scale/Fuel Must NOT Do

- **Must not create their own entry model.** They use `event_entries`.
- **Must not create their own findings model.** They use `findings`.
- **Must not hard-code for one event.** Every reading includes `event_instance_id` (via event entry FK).
- **Must not block future modules.** The backbone they validate must work for body/chassis/teardown/general tech without redesign.

---

## SECTION J — RISKS / ARCHITECTURAL PITFALLS

### J.1 — Treating Race Number as Vehicle Identity

**Risk:** Using competition number (e.g., "TF 13") as the primary way to identify a car.

**Why it fails:** Competition numbers are reassigned between events, between seasons, and sometimes mid-season. The physical car that carries number 13 at Pomona may carry number 7 at Gainesville, or may be retired entirely while the number is given to a new chassis. Any system that uses number as identity will corrupt vehicle history.

**Mitigation:** Vehicle identity is chassis serial / UUID. Competition number is an *attribute of the Event Entry*, not of the Vehicle.

### J.2 — Over-Centering on Driver Identity

**Risk:** Making driver name the primary key for everything (as current parity does with `parity_runs.driver_name`).

**Why it fails:** When a driver switches teams, the team's vehicle and compliance history appear to move with the driver. When two drivers share a car across events, the car's history splits across two disconnected driver records. Teardown findings on an engine are really about the *engine in the car*, not about who happened to drive it that day.

**Mitigation:** Driver is one of four identity spines. Event Entry connects them. Queries can follow any spine.

### J.3 — Over-Centering on Vehicle/Team Identity

**Risk:** Making vehicle or team the primary key for all tech operations.

**Why it fails:** Drivers carry their own credential, performance, and safety history. A team's compliance record includes all their drivers and cars — but a specific driver's DQ history follows *them*, not the team they happened to be with. Collapsing everything under team or vehicle loses individual accountability.

**Mitigation:** Same as J.2 — four independent spines.

### J.4 — Assuming One Event at a Time

**Risk:** Using a global "current event" setting, or building tables/queries without event_instance_id.

**Why it fails:** NHRA runs national and divisional events simultaneously. A tech director at HQ may need to monitor compliance at Gainesville and a divisional in Denver on the same weekend. Any code that assumes a single active event will break.

**Mitigation:** Every event-scoped record has `event_instance_id` FK. "Active event" is a UI filter, never a database state.

### J.5 — Flattening Tech Cards Into Giant Fixed Tables

**Risk:** Creating a `tech_cards` table with 150+ columns covering every possible declared field for every category.

**Why it fails:** Different categories have radically different tech card fields. Pro Stock Motorcycle and Top Fuel have almost nothing in common. A fixed-column table either has hundreds of NULLable columns (unmaintainable) or forces you to add columns every time a rule change adds a new declaration field (fragile).

**Mitigation:** Declarations use a `declaration_type` discriminator with structured JSON or per-type detail tables. The JSON is typed per declaration type (not a generic blob) and validated on write.

### J.6 — Losing Historical State on Changes

**Risk:** Updating records in place when teams/drivers/parts change.

**Why it fails:** If you UPDATE the driver on an event entry instead of recording the change, you lose the fact that a different driver was running that car in earlier rounds. If you UPDATE a component installation, you lose the record of what engine was in the car during the event where a specific finding was made.

**Mitigation:** Time-bounded assignment tables (Section G.2). Never overwrite; always append with effective dates.

### J.7 — Overbuilding a Universal Form Engine Too Early

**Risk:** Trying to build a generic "form builder" that handles all declaration types, inspection checklists, and finding templates as configurable forms before the actual modules exist.

**Why it fails:** You don't yet know what scale readings look like vs body measurements vs teardown inventories. A premature form engine either over-generalizes (EAV hell) or under-generalizes (can't handle the next module). You end up spending months building a platform instead of delivering operational value.

**Mitigation:** Build each module's detail tables as typed, specific tables. Extract common patterns (tech case lifecycle, finding disposition) into shared backbone. Only consider a form engine after 3+ modules reveal genuine shared patterns that warrant it.

### J.8 — Failing to Separate Declarations from Inspection Outcomes

**Risk:** Storing "declared weight = 2330" and "measured weight = 2318" in the same row or table.

**Why it fails:** You can't audit the delta if both values are in one record that gets updated. You can't answer "what did they declare?" independently of "what did we find?" You can't detect systematic discrepancies between declared and actual values across entries.

**Mitigation:** Declarations and findings are always in separate tables with independent lifecycles. Comparison logic is application-layer, not storage-layer.

---

## SECTION K — RECOMMENDED BUILD SEQUENCE

### Phase 1: Foundation (Shared Backbone)

**Scope:** Identity tables, multi-event model, event entries, shared tech case/finding/attachment backbone

**Delivers:**
- `persons`, `teams`, `vehicles`, `components` tables
- `seasons`, `event_types`, `event_instances` tables (evolving from `parity_events`)
- `event_entries` junction table
- `tech_cases`, `findings`, `attachments` backbone tables
- `declarations` table structure
- Time-bounded assignment tables (`team_memberships`, `vehicle_assignments`, etc.)
- Migration/bridge layer to link existing parity data to new identity model

**Why first:** Everything else depends on this. No module can be built correctly without the entry model and tech case backbone.

**Estimated scope:** Largest phase — schema design, migration scripts, API layer, basic admin UI for managing identities and entries.

### Phase 2: Scale Module

**Scope:** First operational module plugging into Phase 1 backbone

**Delivers:**
- `scale_readings` detail table
- Weight rules reference table (min weights per class per season)
- Scale check workflow: create tech case → record reading → auto-detect underweight → create finding
- Event-scoped scale dashboard
- Scale history on Vehicle 360 and Event Entry dossier

**Why second:** Highest-frequency operational need. Validates that the backbone actually works. Simple enough to deliver quickly.

### Phase 3: Fuel Module

**Scope:** Second operational module — sibling to scale

**Delivers:**
- `fuel_samples` detail table
- Fuel check workflow: sample → test → finding
- Fuel compliance rules per class
- Fuel history views

**Why third:** Same backbone as scale, different detail table. Proves the architecture generalizes. Next-highest operational frequency.

### Phase 4: Tech Card Audit Workspace

**Scope:** Declaration capture and comparison infrastructure

**Delivers:**
- Declaration type framework (structured per category)
- Tech card scanning/attachment workflow
- Keyed-value entry for declared specs
- Comparison view: declared vs inspected (linking declarations to tech case findings)

**Why fourth:** Declarations are an input to many downstream modules (teardown comparison, weight comparison). Building this before body/chassis/teardown means those modules can compare against declared values from day one.

### Phase 5: Body / Chassis / General Tech

**Scope:** Physical inspection modules

**Delivers:**
- `body_measurements` detail table + template system
- `chassis_certs` tracking
- `general_tech_details` for unstructured inspections
- Dimensional trend views on Vehicle 360

**Why fifth:** These are lower-frequency than scale/fuel but important for compliance. They benefit from the declaration comparison infrastructure built in Phase 4.

### Phase 6: Teardown + Compliance Workflows

**Scope:** Most complex inspection type + open-fix tracking

**Delivers:**
- `teardown_details` with structured parts inventory
- Serial number verification against declarations and component registry
- `compliance_items` table for open fixes, deadlines, and resolution tracking
- Compliance dashboard per team, per vehicle

**Why sixth:** Teardown is the most data-rich inspection type. It depends on component tracking (Phase 1), declarations (Phase 4), and benefits from the patterns established by scale/fuel/body. Compliance workflows depend on the findings pipeline being mature.

### Phase 7: Full Dossier / Reporting Views

**Scope:** Cross-cutting views and advanced reporting

**Delivers:**
- Driver 360 view (Section H.1)
- Team 360 view (Section H.2)
- Vehicle 360 view (Section H.3)
- Event summary dashboards
- Seasonal compliance reports
- PDF export for dossiers
- Cross-module query views

**Why last:** Reporting views are read-only aggregations. They only become valuable when multiple modules are populating data. Building them after Phases 1–6 means they launch with rich, real data.

### Bridge: Parity Module Integration

The existing parity module (runs, weather, anomalies, reports) continues to work throughout all phases. It integrates incrementally:

| Phase | Parity Integration Step |
|-------|------------------------|
| Phase 1 | Create `event_instances` from existing `parity_events`. Create bridge view so parity queries work against both old and new tables. |
| Phase 1 | Add optional `event_entry_id` FK to `parity_runs`. Existing `driver_name + race_lookup` continues to work as fallback. |
| Phase 2+ | New runs ingested after Phase 1 get entry-linked automatically. Historical runs get backfilled as entries are retroactively created. |
| Phase 7 | Parity performance data appears in Driver 360 and Vehicle 360 views alongside tech data. |

### Bridge: Incidents Module Integration

The existing incident tables (`run_incidents`, `incident_analysis_*`) integrate similarly:

| Phase | Incidents Integration Step |
|-------|---------------------------|
| Phase 1 | Create `tech_cases` records bridged from existing `run_incidents`. Incidents become a tech case type. |
| Phase 1 | `incident_analysis_sessions` get an optional `tech_case_id` FK for forward-linking. |
| Phase 5+ | Incident investigations can reference body/chassis findings in the same event. |

---

## SECTION L — FIRST IMPLEMENTATION PLANNING BATCH

**This section defines what must be decided and designed before any code is written. It is not an implementation plan — it is a planning batch.**

### L.1 — Architectural Decisions to Lock

| # | Decision | Options | Recommendation | Why Lock Now |
|---|----------|---------|----------------|-------------|
| 1 | UUID format for identity tables | UUIDv4 vs ULID vs auto-increment+UUID | UUIDv4 (consistent with existing RSA pattern in `engines`, `vehicles`) | Every table depends on this |
| 2 | Event Entry as operational center | Yes (recommended) vs run-centric vs inspection-centric | Yes — Event Entry | Foundation for all modules |
| 3 | Shared `tech_cases` backbone vs per-module case tables | Shared backbone (recommended) vs separate `scale_cases`, `fuel_cases`, etc. | Shared backbone with typed detail tables | Determines the entire findings/attachment model |
| 4 | Declaration storage model | Typed JSON per declaration_type vs per-type detail tables vs EAV | Typed JSON with validation schemas per type | Affects tech card audit and all comparison logic |
| 5 | History table pattern | Time-bounded rows (recommended) vs event-log/audit-log vs temporal SQL | Time-bounded effective_from/effective_to rows | Affects all identity-relationship tracking |
| 6 | Parity bridge strategy | Hard migration (break old queries) vs bridge views (both work) vs new parallel tables | Bridge views — old parity queries continue, new queries use new model | Prevents breaking production parity during buildout |
| 7 | Multi-event enforcement | `event_instance_id` required FK on all event-scoped tables (recommended) vs optional | Required FK | Prevents single-event assumptions from creeping in |

### L.2 — Core Schema Areas in Batch 1

The first implementation batch should produce migration scripts for:

1. **Identity tables:** `persons`, `teams`, `vehicles`, `components`
2. **Season/Event tables:** `seasons`, `event_types`, `event_instances` (with bridge from `parity_events`)
3. **Entry table:** `event_entries` with FKs to all identities
4. **Assignment history tables:** `team_memberships`, `vehicle_assignments`, `component_installations`, `event_entry_changes`
5. **Tech backbone tables:** `tech_cases`, `findings`, `attachments`, `declarations`
6. **Bridge views:** Read-compatible views so existing parity code continues to work

### L.3 — Existing Parity Files That Must Be Revisited

| File / Area | What Changes | When |
|-------------|-------------|------|
| `parity_events` / `parity_tracks` | Evolve into or bridge to `event_instances` / `tracks` | Batch 1 schema design |
| `parity_runs.driver_name` / `race_lookup` | Add optional `event_entry_id` FK; keep old columns for backward compat | Batch 1 migration |
| `api/parity.php` action handlers | Gradually accept `event_entry_id` alongside legacy identifiers | Post-batch-1, incremental |
| `src/services/parityApi.ts` | Add entry-aware endpoints alongside existing ones | Post-batch-1, incremental |
| `src/domain/parity/nhraMapper.ts` | `NormalizedParityRun` gets optional `event_entry_id` | Post-batch-1 |
| `src/domain/parity/weatherCorrection.ts` | Combo resolution can use entry→vehicle→component instead of driver name | Phase 2+ |
| `src/pages/ParityPortal.tsx` | Event selector evolves to use `event_instances` model | Post-batch-1 UI work |
| `run_incidents` / `incident_analysis_*` | Bridge to `tech_cases` backbone | Batch 1 bridge layer |

### L.4 — What Should Explicitly NOT Be Built in Batch 1

| Item | Why Not Yet |
|------|------------|
| Scale module detail tables | Need backbone first; scale is Phase 2 |
| Fuel module | Phase 3 |
| Tech card form builder or declaration type schemas | Phase 4; premature optimization risk |
| Body/chassis measurement templates | Phase 5 |
| Teardown detail tables | Phase 6; most complex module |
| Dossier/360 views | Phase 7; no data to show yet |
| Universal form engine | Possibly never; see Risk J.7 |
| Driver/team/vehicle auto-import from NHRA systems | Useful later, but batch 1 should support manual entry first |
| Public API or external integrations | Way too early |
| Mobile/tablet-optimized inspection UI | UI refinement after workflows are proven |

### L.5 — Batch 1 Success Criteria

Batch 1 is complete when:

1. Identity tables exist and accept CRUD operations
2. Event instances can be created with type, season, and track
3. Event entries can be created linking person + team + vehicle + class + event
4. A tech case can be created against an event entry
5. A finding can be recorded against a tech case
6. An attachment can be uploaded to any supported parent
7. Existing parity runs, events, and incident data continue to query correctly via bridge views
8. A proof-of-concept query can answer: "Show all tech cases for vehicle X across all events" — demonstrating the cross-cutting identity model works

---

## APPENDIX — RELATIONSHIP DIAGRAM (TEXT)

```
                    ┌──────────┐
                    │  Season  │
                    └────┬─────┘
                         │ has many
                    ┌────▼─────────┐
                    │ Event Instance│◄─── Event Type
                    └────┬─────────┘
                         │ has many
                    ┌────▼─────────┐
    Person ────────►│ Event Entry  │◄──────── Team
                    │              │
    Vehicle ───────►│  (junction)  │
                    └──┬──┬──┬──┬──┘
                       │  │  │  │
            ┌──────────┘  │  │  └──────────┐
            ▼             ▼  ▼             ▼
        Sessions    Declarations  Tech Cases  Attachments
        (Runs)                      │
                                    ▼
                                 Findings ──► Compliance Items
                                    │
                                    ▼
                                Attachments

    Component ──► Component Installations ──► Vehicle (time-bounded)
```

---

**End of Architecture Proposal**

This document defines the system model. Implementation begins only after architectural decisions in Section L.1 are locked and the first schema batch is designed.
