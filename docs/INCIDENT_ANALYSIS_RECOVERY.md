# Incident Analysis — Production Recovery Runbook

## Symptom Pattern

- The Incident Analysis page at `/parity/analysis/:incidentId` loads its shell (layout, panels, toolbar).
- No data appears. Save returns "Internal server error".
- CSV upload and video upload fail silently or with a 500.
- Browser DevTools Network tab shows the first API call (`getSession`) returning HTTP 500.

## Root Cause

Migration v16 was not run on production. The 5 `incident_analysis_*` database tables do not exist, so every query in the backend fails with a PDO exception.

## Recovery Steps

### 1. Deploy

Push to `main`. The GitHub Actions workflow will:
- Build the frontend (`npm run build`)
- Copy `api/` into `dist/` (includes `incident-analysis.php` and `migrate-v16-incident-analysis.php`)
- Deploy via FTP to SiteGround (`dangerous-clean-slate: false` — existing server files are preserved)

No special deploy config needed. The migration script and endpoint are deployed automatically.

### 2. Run Diagnose (confirm the problem)

```
GET https://racingsystemsanalysis.com/api/incident-analysis.php?action=diagnose
Authorization: Bearer <ADMIN_TOKEN>
```

**How to read the output:**

| Field | Meaning |
|-------|---------|
| `"ok": false` | At least one check failed |
| `"missing_tables": [...]` | These tables don't exist yet |
| `"fix": "Run migration..."` | Exact next step |
| `"checks" → "table:*"` | Per-table pass/fail |
| `"checks" → "dir:*"` | Upload directory exists + writable |
| `"checks" → "cap:*"` | User has required capabilities |
| `"checks" → "php:upload_max_filesize"` | Server's max upload size |

If `ok` is `true`, skip to step 4.

### 3. Run Migration v16

```
GET https://racingsystemsanalysis.com/api/migrate-v16-incident-analysis.php
Authorization: Bearer <ADMIN_TOKEN>
```

**Expected output** (plain text):
```
=== Migration v16: Incident Analysis ===

── incident_analysis_sessions ──
  Table incident_analysis_sessions OK

── incident_analysis_datasets ──
  Table incident_analysis_datasets OK

── incident_analysis_channels ──
  Table incident_analysis_channels OK

── incident_analysis_videos ──
  Table incident_analysis_videos OK

── incident_analysis_measurements ──
  Table incident_analysis_measurements OK

  Created uploads directory: /path/to/uploads/incident_analysis
  Created .htaccess in uploads directory

=== Migration v16 complete ===
```

**If you see "Forbidden: admin role required":** your token does not have `admin` or `owner` role.

**Safe to run multiple times.** All `CREATE TABLE` statements use `IF NOT EXISTS`.

### 4. Run Diagnose Again (confirm the fix)

```
GET https://racingsystemsanalysis.com/api/incident-analysis.php?action=diagnose
Authorization: Bearer <ADMIN_TOKEN>
```

Expected: `"ok": true, "summary": "All checks passed — module is ready"`

### 5. Smoke Test (5 minutes)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open any incident's Analyze page | Page loads, shows "Incident Analysis #N", "Session #M", no errors |
| 2 | Click Save | "Saved ✓" flash appears, no error |
| 3 | Upload a small CSV | Upload status shows filename, left panel shows dataset + channels, chart shows data |
| 4 | Toggle channels on/off | Chart updates, click Save again — succeeds |
| 5 | Upload a small MP4 video | Right panel shows video player, video plays |
| 6 | Reload page | Session restores: same datasets, channels, videos, visible channel selections |

If all 6 steps pass: **module is live**.

## Next Likely Blocker: Video Upload Size Limits

After migration, the most likely issue is that large video uploads fail silently.

**Symptom:** Video upload appears to start but returns a 400 error with `"File upload failed (code: 1)"`. Code 1 means `UPLOAD_ERR_INI_SIZE` — the file exceeds PHP's `upload_max_filesize`.

**Check current limits** via the diagnose endpoint — look at:
- `php:upload_max_filesize` — must be at least `512M` for 500MB video uploads
- `php:post_max_size` — must be larger than `upload_max_filesize`

**Fix** (SiteGround): Create or edit `api/.user.ini`:
```ini
upload_max_filesize = 512M
post_max_size = 520M
max_execution_time = 300
```

Or via SiteGround Site Tools > PHP Settings if `.user.ini` is not supported.

Small CSV uploads (< 50MB) will work regardless of this setting.

## Files Involved

| File | Role |
|------|------|
| `api/incident-analysis.php` | All API endpoints + diagnose |
| `api/migrate-v16-incident-analysis.php` | Creates the 5 tables + upload directory |
| `api/config.php` | DB credentials (NOT in git — must exist on server) |
| `api/.htaccess` | Passes Authorization header to PHP |
| `src/pages/IncidentAnalysis.tsx` | Frontend workspace |
| `src/services/incidentAnalysisApi.ts` | API client |

## Database Tables (created by migration v16)

| Table | Purpose |
|-------|---------|
| `incident_analysis_sessions` | One per incident, stores layout/view state |
| `incident_analysis_datasets` | Uploaded CSV files linked to a session |
| `incident_analysis_channels` | Parsed channel metadata per dataset |
| `incident_analysis_videos` | Uploaded video files linked to a session |
| `incident_analysis_measurements` | Cursor measurements (time deltas) |

All have `ON DELETE CASCADE` foreign keys, so deleting a session cleans up everything.
