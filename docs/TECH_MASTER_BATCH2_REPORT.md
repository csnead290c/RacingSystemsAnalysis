# NHRA Tech Master — Phase 1 Batch 2 Report

**Date:** 2026-03-12
**Status:** Complete
**Scope:** Event Entries operational workflow, roster import, identity matching, provisional records

---

## Section A — What Was Implemented

### A.1 API Extensions

#### Identity Matching (tm-identities.php)
- **`matchPerson`** — exact normalized_name match, then fuzzy LIKE word-overlap suggestions with match_score ranking
- **`matchOrg`** — exact UPPER(name)/short_name match, then LIKE suggestions
- **`matchVehicle`** — LIKE search on description + chassis_serial

#### Roster Import (tm-entries.php)
- **`rosterPreview`** — parses pasted CSV/TSV text, auto-detects delimiter, detects header row, matches each row's driver/team against existing persons/orgs, reports exact/suggestions/none per row, flags duplicates
- **`rosterCommit`** — accepts resolved rows with identity decisions, creates provisional persons/orgs on demand, inserts event_entries in batch
- **`getDetail`** — full entry detail with all joined identity fields, change history, tech case count, and linkage status object (person_linked, org_linked, vehicle_linked, fully_linked, scale_ready, etc.)
- **`listCategories`** — distinct category/class_index breakdown with entry counts per event

#### No schema changes. All new functionality uses existing Batch 1 tables.

### A.2 TypeScript API Client Extensions (techMasterApi.ts)

**New Types (13):**
- `IdentityMatchResult<T>`, `PersonMatchResult`, `OrgMatchResult`
- `RosterRawRow`, `RosterPersonMatch`, `RosterOrgMatch`, `RosterPreviewRow`, `RosterPreviewResponse`
- `RosterCommitRow`, `RosterCommitResult`
- `EntryLinkage`, `EntryChangeRecord`, `EntryDetailResponse`, `CategoryInfo`

**New API Methods (7):**
- `matchPerson()`, `matchOrg()`, `matchVehicle()`
- `rosterPreview()`, `rosterCommit()`
- `getEntryDetail()`, `listCategories()`

### A.3 UI Components

#### EventEntriesPanel (`src/pages/tech/EventEntriesPanel.tsx`)
- Event selector dropdown (loads all event instances)
- Category/class filter dropdown (populated from entry data)
- Entry table with columns: #, Driver, Team, Vehicle, Category, Class, Status, Linkage
- Linkage badges: Linked (green), Partial (blue), Person Only (orange), Unlinked (red)
- Status badges: active (green), registered (blue), withdrawn (gray), disqualified (red)
- Admin actions: "Add Entry" + "Import Roster" buttons
- Row click opens detail drawer

#### RosterImportModal (`src/pages/tech/RosterImportModal.tsx`)
- Step 1 (Paste): textarea with format hint, auto-detect CSV/TSV
- Step 2 (Preview): per-row match indicators (exact/suggestions/none), suggestion pickers, duplicate detection, summary badges
- Step 3 (Commit): creates entries with resolved or provisional identities
- Step 4 (Done): success summary with count

#### EntryDetailDrawer (`src/pages/tech/EntryDetailDrawer.tsx`)
- Side panel (420px) with full entry detail
- Sections: Event, Entry, Identity Linkage, Readiness, Change History
- Linkage rows show linked/unlinked status with provisional/verified badges
- Readiness badges: Fully Linked, Scale Ready
- Change history list with field, old→new, timestamp, reason

#### AddEntryForm (`src/pages/tech/AddEntryForm.tsx`)
- Modal form with competition number, category, class, driver name, team name, notes
- Driver name: on-blur identity matching → exact match auto-link, suggestions picker, or create provisional
- Team name: same matching workflow
- Creates provisional persons/orgs as needed before entry creation

#### TechMasterShell Updates
- Default tab changed to "Event Entries" (the operational workflow)
- Entries tab replaced stub with full EventEntriesPanel
- Modal/drawer state management for detail, roster import, add entry
- Refresh key pattern for entries panel after mutations
- Tab order: Entries first, then Overview, Persons, Orgs, Vehicles, Events, Cases

---

## Section B — Compatibility & Safety

### No Breaking Changes
- **No schema migrations** — all new functionality uses existing Batch 1 tables
- **No existing file modifications** beyond TechMasterShell.tsx (which was a stub)
- **No capability changes** — uses existing `nhra.tech.read` / `nhra.tech.admin`
- **No parity regressions** — parity code completely untouched

### Identity Matching Strategy
- **Exact match first** — normalized_name comparison (persons) or UPPER(name) (orgs)
- **Fuzzy suggestions only** — word-overlap LIKE queries, never auto-applied
- **No automatic merges** — user must explicitly select or create provisional
- **Provisional records** clearly marked with `status: 'provisional'` and notes

### Roster Import Safety
- Preview step shows all matches before any writes
- Duplicate detection against existing event entries
- Per-row error handling — one bad row doesn't abort the batch
- Header row auto-detection prevents header import as data

---

## Section C — Verification

| Check | Result |
|-------|--------|
| `tsc --noEmit` | Clean (0 errors) |
| `vitest run` | 2275 passed, 85 files, 0 failures |
| `vite build` | Success (4.88s) |
| TechMasterShell chunk | 37.64 kB gzip: 8.84 kB |
| Existing tests intact | All 2275 pass unchanged |
| No parity changes | Confirmed — no parity files touched |

---

## Section D — Files Changed / Created

### New Files (4)
| File | Purpose |
|------|---------|
| `src/pages/tech/EventEntriesPanel.tsx` | Operational entries list with event selection, filters, linkage badges |
| `src/pages/tech/RosterImportModal.tsx` | Bulk paste/CSV import with identity matching preview + commit |
| `src/pages/tech/EntryDetailDrawer.tsx` | Side panel with full entry detail, linkage status, change history |
| `src/pages/tech/AddEntryForm.tsx` | Manual entry creation with identity search/match/provisional |

### Modified Files (3)
| File | Changes |
|------|---------|
| `api/tm-identities.php` | +3 actions: matchPerson, matchOrg, matchVehicle |
| `api/tm-entries.php` | +4 actions: rosterPreview, rosterCommit, getDetail, listCategories; +2 helper functions |
| `src/services/techMasterApi.ts` | +13 types, +7 API methods |
| `src/pages/TechMasterShell.tsx` | Wired 4 new components, replaced entries stub, modal/drawer state |

### Report
| File | Purpose |
|------|---------|
| `docs/TECH_MASTER_BATCH2_REPORT.md` | This report |

---

## Batch 2 Endpoint Summary

### tm-identities.php (Batch 1: 5 actions → Batch 2: 8 actions)
| Action | Method | Cap | New? |
|--------|--------|-----|------|
| list | GET | read | |
| get | GET | read | |
| search | GET | read | |
| create | POST | admin | |
| update | POST | admin | |
| **matchPerson** | GET | read | ✓ |
| **matchOrg** | GET | read | ✓ |
| **matchVehicle** | GET | read | ✓ |

### tm-entries.php (Batch 1: 5 actions → Batch 2: 9 actions)
| Action | Method | Cap | New? |
|--------|--------|-----|------|
| listForEvent | GET | read | |
| get | GET | read | |
| create | POST | admin | |
| update | POST | admin | |
| bulkCreate | POST | admin | |
| **rosterPreview** | POST | read | ✓ |
| **rosterCommit** | POST | admin | ✓ |
| **getDetail** | GET | read | ✓ |
| **listCategories** | GET | read | ✓ |

---

## What Batch 3 Can Build On

1. **Scale MVP** — entries now have `scale_ready` flag in linkage; entry selection UI is operational
2. **Identity resolution** — provisional records are surfaced; batch promotion from provisional → active
3. **Tech case workflow** — CasesTab still a stub; Batch 3 can wire it to entry-level case creation
4. **Bridge linkage** — parity_runs.event_entry_id can now be populated using matched person/competition data
5. **Bulk data quality** — category/class breakdown per event enables validation workflows
