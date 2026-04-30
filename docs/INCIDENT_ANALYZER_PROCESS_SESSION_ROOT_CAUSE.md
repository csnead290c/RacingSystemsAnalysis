# Incident Analyzer Process Session — Root Cause Investigation

**Date:** March 13, 2026  
**Status:** INVESTIGATING ACTUAL BACKEND FAILURE  
**Severity:** CRITICAL (blocking first-run entry into workspace)

---

## Previous Diagnosis (INCOMPLETE)

**What was assumed:**
- Root cause: Missing loading state variable in frontend
- Fix: Added `processing` state, spinner UI, error banner
- Conclusion: "Blocker resolved"

**What was actually fixed:**
- ✅ Frontend UX improved (loading state, spinner, error visibility)
- ❌ Backend processing still fails
- ❌ Production has additional crash path (white screen)

**The truth:**
The previous pass only made the failure **visible** on local (error banner shows "Internal server error"). It did NOT fix the actual backend processing failure.

---

## Current Observed Behavior

### LOCAL Environment
- Click "Process Session" → shows loading spinner
- Backend returns error
- Error banner displays: "Internal server error"
- User remains on process screen (cannot enter workspace)

### PRODUCTION Environment
- Click "Process Session" → ???
- Result: All-white screen
- No workspace loads
- Suggests either:
  - Frontend React crash from malformed response
  - Backend PHP fatal returning HTML instead of JSON
  - Missing asset/deployment mismatch
  - Production-only environment issue

---

## Likely Failure Layers to Investigate

### Layer 1: Backend Handler / Routing
- `processSession` action exists in switch statement
- Handler function `handleProcessSession()` is called
- Required params (`session_id`) are passed correctly
- Handler calls `ia_processSession()` helper

**Status:** Need to verify

### Layer 2: Database / Schema
- Migration v31 creates required tables:
  - `incident_analysis_processed_sessions`
  - `incident_analysis_processed_channels`
- Migration applied on local?
- Migration applied on production?
- Column names match code expectations?

**Status:** Need to verify

### Layer 3: File / Storage
- Processed session file path: `storage/ia-processed/{session_id}.json.gz`
- Directory exists and is writable?
- `ia_processSession()` writes gzipped JSON correctly?
- File path resolution correct on both environments?

**Status:** Need to verify

### Layer 4: PHP Runtime / Deployment
- `api/lib/ia-processing.php` exists on production?
- All required functions defined?
- No parse errors or fatals?
- Warnings/notices corrupting JSON output?

**Status:** Need to verify

### Layer 5: Frontend Response Handling
- Frontend expects `{ ok: true, processed: {...} }`
- What if backend returns `{ error: "..." }`?
- What if backend returns HTML (PHP fatal)?
- Does frontend crash on unexpected response?

**Status:** Need to verify

### Layer 6: Environment Differences
- Local vs production migration level
- Local vs production storage paths
- Local vs production file permissions
- Production missing newly deployed files?

**Status:** Need to verify

---

## Investigation Plan

1. **Trace exact request/response path** (frontend → backend → storage → DB)
2. **Capture actual local failure** (console, network, PHP logs, response body)
3. **Capture actual production failure** (console, network, response body)
4. **Check migration status** (local and production)
5. **Check file deployment** (`ia-processing.php` on production)
6. **Check storage directories** (exist and writable)
7. **Test backend directly** (curl/Postman to isolate frontend)
8. **Fix root cause** (not just symptoms)
9. **Harden error handling** (clean JSON, no crashes)
10. **Verify both environments** (smoke test local + production)

---

## Next Steps

Systematically investigate each layer until the actual root cause is identified.

**DO NOT PROCEED** to Phase 3 features until:
- ✅ Local Process Session succeeds
- ✅ Production Process Session succeeds
- ✅ No white screen in production
- ✅ Workspace loads after processing
- ✅ Failures handled cleanly without crashes

---

**Investigation Started:** March 13, 2026  
**Status:** IN PROGRESS
