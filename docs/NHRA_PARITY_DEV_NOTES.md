# NHRA Tech Parity — Developer Notes

## Overview

Server-side ingestion of NHRA run results from the public OData feed into normalized tables for tech parity analysis. Internal-only feature gated by the `nhra.parity` capability (owner/admin roles).

---

## Architecture

```
OData Feed (nhradata.com)
    │
    ▼
api/lib/parity.php          ← OData client + normalization mapper
    │
    ▼
api/parity.php               ← Endpoints (ingest + query)
    │
    ▼
MySQL Tables:
  parity_run_imports          ← Import audit trail
  parity_runs_raw             ← Raw JSON for replay/audit
  parity_runs                 ← Normalized run data
```

**TypeScript mirror:** `src/domain/parity/nhraMapper.ts` — identical extraction/normalization logic for client-side use and testing.

---

## Environment Variables

No additional env vars required. The OData feed URL is hardcoded:
```
https://odata.nhradata.com/api/oGetResults/GetResults/{YYYYMMDD}
```

The PHP `curl` extension must be enabled on the server (standard on most hosts).

---

## Database Setup

Run the migration (safe to re-run):
```bash
php api/migrate-v6-parity.php
```

Creates 3 tables: `parity_run_imports`, `parity_runs_raw`, `parity_runs`.

---

## Capability Gating

- **Capability:** `nhra.parity`
- **Granted to:** `owner` and `admin` roles only (via `ROLE_CAPABILITIES`)
- **NOT plan-based:** No subscription tier grants this capability
- **Server enforcement:** `rsa_requireAuthAndCap($pdo, $auth, 'nhra.parity')` at the top of `api/parity.php`
- **Can be granted via admin panel:** Use the grant-capability admin action to give `nhra.parity` to specific users

---

## API Endpoints

### POST `/api/parity.php?action=ingest`

Fetch and ingest NHRA run results from the OData feed.

**Request:**
```json
{
  "raceLookup": "20260223",
  "force": false
}
```

**curl example:**
```bash
curl -X POST "https://your-api.com/api/parity.php?action=ingest" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"raceLookup": "20260223"}'
```

**Response (success):**
```json
{
  "raceLookup": "20260223",
  "importId": "a1b2c3d4-...",
  "rowsFetched": 342,
  "rowsInserted": 340,
  "rowsDeduped": 2
}
```

**Response (already imported):** `409` with existing import info. Use `"force": true` to re-import.

**Response (403):** User lacks `nhra.parity` capability.

### GET `/api/parity.php?action=runs`

Query normalized parity runs.

**Query parameters:**
| Param | Required | Description |
|-------|----------|-------------|
| `raceLookup` | Yes | YYYYMMDD date string |
| `classIndex` | No | Exact class match (e.g. "TF", "FC") |
| `driverName` | No | Partial match (LIKE %name%) |
| `lane` | No | Exact match ("Left", "Right") |
| `round` | No | Exact match ("1", "2", etc.) |
| `dq` | No | "exclude" (hide DQs), "only" (DQs only), "include" (default) |
| `limit` | No | Max rows (default 500, max 5000) |
| `offset` | No | Pagination offset |

**curl example:**
```bash
curl "https://your-api.com/api/parity.php?action=runs&raceLookup=20260223&classIndex=TF" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "runs": [...],
  "total": 342,
  "limit": 500,
  "offset": 0,
  "raceLookup": "20260223"
}
```

---

## Row Hash & De-duplication

Each row gets a deterministic `row_hash` (SHA-256 on the server, plain string key in TS):

1. **If `source_ref` exists** (the API returns a unique row ID):
   ```
   hash(raceLookup + "|" + source_ref)
   ```

2. **Otherwise**, hash stable fields:
   ```
   hash(raceLookup + "|" + driver_name + "|" + lane + "|" + round + "|" + class_index + "|" + ft1320 + "|" + mph1320 + "|" + rt)
   ```

**De-dupe behavior:**
- `parity_runs_raw`: `UNIQUE(import_id, row_hash)` — no duplicate raw rows within the same import
- `parity_runs`: `UNIQUE(race_lookup, row_hash)` — no duplicate normalized rows across all imports for the same race date
- Re-importing with `force=true` creates a new import record but skips rows that already exist in `parity_runs`

---

## Field Alias Map

The mapper uses a configurable alias list to handle unknown/varying OData field names. Each normalized column has a priority-ordered list of candidate source field names.

**To extend when we learn exact NHRA field names:**

1. Edit `PARITY_FIELD_ALIASES` in `api/lib/parity.php` (server)
2. Edit `FIELD_ALIASES` in `src/domain/parity/nhraMapper.ts` (client mirror)
3. Add the exact field name to the **front** of the alias list for that column

Example — if the API returns `"ElapsedTime_1320"` for quarter-mile ET:
```php
// api/lib/parity.php
'ft1320' => ['ElapsedTime_1320', 'ft1320', 'QuarterMileET', '1320ft', ...],
```
```typescript
// src/domain/parity/nhraMapper.ts
ft1320: ['ElapsedTime_1320', 'ft1320', 'QuarterMileET', '1320ft', ...],
```

**Field matching is case-insensitive** as a fallback — exact match is tried first.

---

## Normalized Row Shape

```typescript
interface NormalizedParityRun {
  race_lookup: string;          // "20260223"
  run_timestamp_utc: string | null;  // ISO 8601
  category: string | null;      // "Funny Car", "Top Fuel"
  class_index: string | null;   // "FC", "TF", "PSM"
  round: string | null;         // "1", "2", "Q1"
  lane: string | null;          // "Left", "Right"
  driver_name: string | null;   // "John Force"
  car_number: string | null;    // "16"
  dial_in: number | null;       // seconds
  rt: number | null;            // reaction time (seconds)
  ft60: number | null;          // 60-foot ET (seconds)
  ft330: number | null;         // 330-foot ET (seconds)
  ft660: number | null;         // 660-foot / eighth-mile ET (seconds)
  mph660: number | null;        // eighth-mile speed (mph)
  ft1000: number | null;        // 1000-foot ET (seconds)
  mph1000: number | null;       // 1000-foot speed (mph)
  ft1320: number | null;        // quarter-mile ET (seconds)
  mph1320: number | null;       // quarter-mile speed (mph)
  win_flag: boolean | null;     // true = win
  dq_flag: boolean | null;      // true = disqualified
  mov: number | null;           // margin of victory (seconds)
  place: string | null;         // finish position
  source_ref: string | null;    // original row ID from OData (if present)
}
```

---

## Testing

```bash
# Run parity tests only
npm test -- --run src/domain/parity/

# Run full suite
npm test -- --run
```

**42 tests** covering:
- OData row extraction (v4, v2, v2-alt, empty, paged)
- Pagination link extraction
- Field alias resolution (exact, case-insensitive)
- Type parsers (float, bool, timestamp including OData `/Date()/` format)
- Full row normalization (v4-style, v2-style, sparse, empty)
- Row hash computation and de-dupe invariant
- Capability gating (all plans blocked, owner/admin allowed, fullAccess allowed)

---

## Files Changed

| File | Description |
|------|-------------|
| `api/migrate-v6-parity.php` | **NEW** — DB migration for 3 parity tables |
| `api/parity.php` | **NEW** — Ingest + query endpoints |
| `api/lib/parity.php` | **NEW** — OData client, mapper, hashing |
| `src/domain/parity/nhraMapper.ts` | **NEW** — TS mirror of mapper + OData extraction |
| `src/domain/parity/__tests__/nhraMapper.test.ts` | **NEW** — 42 tests |
| `src/domain/config/capabilities.ts` | **MODIFIED** — Added `nhra.parity` capability |
| `api/lib/capabilities.php` | **MODIFIED** — Added `nhra.parity` to role capabilities |
| `docs/NHRA_PARITY_DEV_NOTES.md` | **NEW** — This file |

---

## Future Work

- **Weather ingestion** — Second OData feed for weather data (separate tables)
- **Frontend UI** — Parity analysis dashboard (internal route, gated by `nhra.parity`)
- **Scheduled ingestion** — Cron job to auto-ingest after each NHRA event
- **Field map refinement** — Update `FIELD_ALIASES` once we see actual API response shapes
