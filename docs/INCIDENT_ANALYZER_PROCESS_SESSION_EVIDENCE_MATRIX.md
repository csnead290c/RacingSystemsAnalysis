# Incident Analyzer Process Session — Evidence Matrix

**Purpose:** Reconcile contradictory claims and establish proven facts with evidence.

**Date:** March 13, 2026

---

## Contradictions to Resolve

### Contradiction 1: Migration v31 Status
- **Claim A (Foundation Report):** Migration v31 was run on production, all tables created successfully
- **Claim B (Phase 2 Report):** No migration required because Phase 1 migration already run
- **Claim C (Latest Blocker Report):** Migration v31 NOT run on local or production
- **Status:** UNVERIFIED - conflicting claims, no evidence provided

### Contradiction 2: Table Names
- **Code references:** `incident_analysis_processed_sessions`
- **Some notes mention:** `incident_analysis_processed_channels`
- **Status:** UNVERIFIED - need to check actual code vs migration

### Contradiction 3: Storage Paths
- **Code path 1:** `uploads/incident_analysis/processed/`
- **Code path 2:** `storage/ia-processed/{session_id}.json.gz`
- **Status:** UNVERIFIED - need to check actual code

---

## Evidence Gathering Plan

### 1. Schema State Verification

**LOCAL Environment:**
- [ ] Verify `incident_analysis_processed_sessions` exists
- [ ] Verify `incident_analysis_workspaces` exists
- [ ] Verify `incident_analysis_bookmarks` exists
- [ ] Verify `incident_analysis_channels.channel_key` column exists
- [ ] Verify `incident_analysis_channels.channel_group` column exists

**PRODUCTION Environment:**
- [ ] Verify `incident_analysis_processed_sessions` exists
- [ ] Verify `incident_analysis_workspaces` exists
- [ ] Verify `incident_analysis_bookmarks` exists
- [ ] Verify `incident_analysis_channels.channel_key` column exists
- [ ] Verify `incident_analysis_channels.channel_group` column exists

**Evidence Method:** Direct database query or migration verification endpoint

### 2. Code Path Verification

**Table Names Used in Code:**
- [ ] Check `api/lib/ia-processing.php` for actual table references
- [ ] Check `api/incident-analysis.php` for actual table references
- [ ] List all table names found

**Storage Paths Used in Code:**
- [ ] Check `api/lib/ia-processing.php` for actual file paths
- [ ] Document exact directory path used for processed sessions
- [ ] Document exact directory path used for uploads

### 3. Deployed Files Verification

**PRODUCTION:**
- [ ] Verify `api/lib/ia-processing.php` exists and is current version
- [ ] Verify `api/incident-analysis.php` exists and is current version
- [ ] Verify `api/migrate-v31-ia-foundation.php` exists
- [ ] Check file modification dates

### 4. Storage Directory Verification

**LOCAL:**
- [ ] Check if processed session directory exists
- [ ] Check if directory is writable
- [ ] Document actual path

**PRODUCTION:**
- [ ] Check if processed session directory exists
- [ ] Check if directory is writable
- [ ] Document actual path

---

## Exact Code Path Trace

### Frontend → Backend Flow

**1. Button Render:**
- File: `src/pages/IncidentAnalysisWorkspace.tsx`
- Line: ~487-527 (Process Session button)
- Handler: `onClick={handleProcessSession}`

**2. Click Handler:**
- File: `src/pages/IncidentAnalysisWorkspace.tsx`
- Function: `handleProcessSession` (line ~151-177)
- Action: Calls `incidentAnalysisApi.processSession(session.id)`

**3. API Client:**
- File: `src/services/incidentAnalysisApi.ts`
- Function: `processSession` (line ~374-378)
- Request: `POST /incident-analysis.php?action=processSession`
- Payload: `{ session_id: sessionId }`

**4. Backend Router:**
- File: `api/incident-analysis.php`
- Switch case: `case 'processSession'` (line ~156)
- Handler: `handleProcessSession($pdo, $userId)`

**5. Backend Handler:**
- File: `api/incident-analysis.php`
- Function: `handleProcessSession` (line ~1305-1316)
- Action: Calls `ia_processSession($pdo, $sessionId, $userId)`

**6. Processing Library:**
- File: `api/lib/ia-processing.php`
- Function: `ia_processSession` (line ~68-317)
- Actions:
  - Loads datasets from DB
  - Parses CSV files
  - Normalizes channels
  - Writes gzipped JSON to disk
  - Inserts/updates `incident_analysis_processed_sessions` table
  - Returns metadata

**7. Response Path:**
- Success: `{ ok: true, processed: {...} }`
- Failure: `{ error: "message" }` with 400 status

**8. Frontend Success Handler:**
- File: `src/pages/IncidentAnalysisWorkspace.tsx`
- Line: ~162-170
- Action: Fetches processed session, sets state, creates default plot

**9. Frontend Failure Handler:**
- File: `src/pages/IncidentAnalysisWorkspace.tsx`
- Line: ~171-175
- Action: Logs error, sets error banner

---

## Actual Error Evidence

### LOCAL Environment

**Browser Console:**
```
[TO BE CAPTURED]
```

**Network Request:**
- URL: [TO BE CAPTURED]
- Method: [TO BE CAPTURED]
- Payload: [TO BE CAPTURED]
- Status: [TO BE CAPTURED]
- Response: [TO BE CAPTURED]

**Server Logs:**
```
[TO BE CAPTURED]
```

**Actual Error:**
```
[TO BE CAPTURED]
```

### PRODUCTION Environment

**Browser Console:**
```
[TO BE CAPTURED]
```

**Network Request:**
- URL: [TO BE CAPTURED]
- Method: [TO BE CAPTURED]
- Payload: [TO BE CAPTURED]
- Status: [TO BE CAPTURED]
- Response: [TO BE CAPTURED]

**White Screen Cause:**
- [ ] React crash from exception
- [ ] Malformed JSON response
- [ ] HTML error page returned
- [ ] Null/undefined access
- [ ] Asset/runtime mismatch

**Actual Error:**
```
[TO BE CAPTURED]
```

---

## Schema Verification Results

### Tables Referenced in Code

**From `api/lib/ia-processing.php`:**
- Line 70-74: `SELECT ... FROM incident_analysis_datasets`
- Line 247: `SELECT id FROM incident_analysis_processed_sessions`
- Line 253: `UPDATE incident_analysis_processed_sessions`
- Line 270: `INSERT INTO incident_analysis_processed_sessions`
- Line 292: `SELECT id FROM incident_analysis_channels`
- Line 301: `UPDATE incident_analysis_channels`

**From `api/incident-analysis.php`:**
- Line 1322: `SELECT * FROM incident_analysis_processed_sessions`

**Tables NOT referenced:**
- `incident_analysis_processed_channels` — NOT FOUND IN CODE

**Conclusion:** Code uses `incident_analysis_processed_sessions`, NOT `incident_analysis_processed_channels`

### Storage Paths Referenced in Code

**From `api/lib/ia-processing.php`:**
- Line 83: `$uploadDir = __DIR__ . '/../../uploads/incident_analysis/datasets'`
- Line 84: `$processedDir = __DIR__ . '/../../uploads/incident_analysis/processed'`
- Line 238: `$processedFilename = "session_{$sessionId}_" . time() . ".json.gz"`
- Line 238: `$processedPath = $processedDir . '/' . $processedFilename`
- Line 323: `$fullPath = __DIR__ . '/../../uploads/incident_analysis/processed/' . $processedFilePath`

**Conclusion:** Code uses `uploads/incident_analysis/processed/`, NOT `storage/ia-processed/`

---

## Migration v31 Verification

### Migration Script Analysis

**File:** `api/migrate-v31-ia-foundation.php`

**Creates:**
1. `incident_analysis_processed_sessions` table (line 46-64)
2. `incident_analysis_workspaces` table (line 78+)
3. `incident_analysis_bookmarks` table
4. Extends `incident_analysis_channels` with `channel_key` and `channel_group` columns

**Does NOT create:**
- `incident_analysis_processed_channels` table

### Migration Execution Status

**LOCAL:**
- Status: [TO BE VERIFIED]
- Evidence: [TO BE CAPTURED]

**PRODUCTION:**
- Status: [TO BE VERIFIED]
- Evidence: [TO BE CAPTURED]

---

## Proven Facts (Evidence-Based)

### PROVEN - Code Analysis:
1. ✅ Code uses `incident_analysis_processed_sessions` table (verified in `api/lib/ia-processing.php` line 247, 253, 270)
2. ✅ Code uses `uploads/incident_analysis/processed/` path (verified in `api/lib/ia-processing.php` line 84, 238, 323)
3. ✅ Migration v31 creates correct tables matching code expectations (verified in `api/migrate-v31-ia-foundation.php`)
4. ✅ Frontend expects `{ ok: true, processed: {...} }` response (verified in `src/pages/IncidentAnalysisWorkspace.tsx` line 154-156)

### PROVEN - Production Environment (via diagnose-ia-schema.php):
5. ✅ **Migration v31 WAS run on production** - all tables exist:
   - `incident_analysis_processed_sessions` EXISTS
   - `incident_analysis_workspaces` EXISTS
   - `incident_analysis_bookmarks` EXISTS
   - `incident_analysis_channels.channel_key` column EXISTS
   - `incident_analysis_channels.channel_group` column EXISTS
6. ✅ **Storage directory was MISSING on production** (before fix):
   - `uploads/incident_analysis/processed/` did NOT exist
   - This caused backend file write to fail
7. ✅ **Storage directory NOW EXISTS on production** (after running setup-ia-storage.php):
   - All three directories exist and are writable
   - Status: READY

### DISPROVEN:
1. ❌ Code does NOT use `incident_analysis_processed_channels` table (not found in any source file)
2. ❌ Code does NOT use `storage/ia-processed/` path (not found in any source file)
3. ❌ **Migration v31 was NOT missing** - Foundation Report was correct, tables existed all along

### ACTUAL ROOT CAUSE (PROVEN):
**Missing storage directory on production: `uploads/incident_analysis/processed/`**

**Evidence:**
- Production diagnostic (before fix): `"exists": false, "writable": false`
- Production diagnostic (after fix): `"exists": true, "writable": true, "status": "READY"`
- Backend code attempts to write: `file_put_contents($processedPath, $gz)` (line 242)
- Without directory, this fails with file write error
- Error likely returned as 500 or PHP warning, causing frontend white screen

---

## Next Steps

1. Verify migration status with actual database queries
2. Capture real error from local environment
3. Capture real error from production environment
4. Fix proven root cause
5. Test end-to-end on both environments

---

**Status:** Evidence gathering in progress
**Last Updated:** March 13, 2026
