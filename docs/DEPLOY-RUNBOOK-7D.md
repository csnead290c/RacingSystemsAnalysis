# Production Deploy Runbook — Phases 6–7D (Incidents + IDR Viewer)

**Date**: March 2026  
**Deployer**: Clinton (owner)  
**Target**: racingsystemsanalysis.com (SiteGround)  
**SSH**: `u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com` port `18765`  
**Web root**: `/home/customer/www/racingsystemsanalysis.com/public_html/`  
**DB**: MySQL `dblqju17k9ccug` user `u456volfzsgxu`

---

## File Inventory

### Modified Backend Files (upload required)
| Local Path | Prod Path | What Changed |
|---|---|---|
| `api/parity.php` | `public_html/api/parity.php` | `refreshEventData` endpoint, `incident_count` LEFT JOIN in `runsWithWeather` + `runsByDriver` |
| `api/lib/capabilities.php` | `public_html/api/lib/capabilities.php` | Added `incidents.read/create/edit.own/edit.all` to ROLE_CAPABILITIES |

### New Backend Files (upload required)
| Local Path | Prod Path | Purpose |
|---|---|---|
| `api/incidents.php` | `public_html/api/incidents.php` | Full incident + links CRUD API |
| `api/migrate-v15-incidents.php` | `public_html/api/migrate-v15-incidents.php` | Migration: creates 4 tables + seeds incident_types |

### Frontend (built from source, uploaded as dist/)
All frontend changes compile into `dist/`. Modified source files:
- `src/app/App.tsx` — `/parity/idr` route
- `src/pages/IncidentDrawer.tsx` — new component
- `src/pages/ParityIdrViewer.tsx` — new component
- `src/pages/ParityPortal.tsx` — incident icons in EventRunsPanel + DriverDrilldownPanel
- `src/pages/ParityReport.tsx` — incident icons in QualTable
- `src/services/incidentsApi.ts` — new API client
- `src/services/parityApi.ts` — `refreshEventData` + `incident_count` types
- `src/domain/config/capabilities.ts` — incident cap keys

---

## 1. PRE-DEPLOY CHECKLIST

```
[ ] 1.1  Local repo is on main branch, no unmerged changes from others
         git pull origin main

[ ] 1.2  Commit all work
         git add -A && git commit -m "Phase 7D: Incidents + IDR Viewer"

[ ] 1.3  TypeScript compiles clean
         npx tsc --noEmit

[ ] 1.4  Unit tests pass (exclude integration tests that need live API)
         npx vitest run --exclude 'src/integration-tests/**'
         Expected: 1899+ passed, 4 known @testing-library/dom failures only

[ ] 1.5  Production build succeeds
         npm run build
         Verify: dist/ directory contains index.html, assets/, etc.

[ ] 1.6  Back up current production backend files (do this BEFORE uploading)
         ssh -p 18765 u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com
         cd /home/customer/www/racingsystemsanalysis.com/public_html/api
         cp parity.php parity.php.bak-pre7d
         cp lib/capabilities.php lib/capabilities.php.bak-pre7d
```

---

## 2. BACKEND DEPLOY (SSH/SCP)

Upload order matters — capabilities first (so new caps exist when incidents.php is called).

```
[ ] 2.1  Upload capabilities.php (adds incident capability constants)
         scp -P 18765 api/lib/capabilities.php \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/api/lib/capabilities.php

[ ] 2.2  Upload parity.php (incident_count joins + refreshEventData)
         scp -P 18765 api/parity.php \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/api/parity.php

[ ] 2.3  Upload incidents.php (new file — CRUD endpoints)
         scp -P 18765 api/incidents.php \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/api/incidents.php

[ ] 2.4  Upload migration script (new file)
         scp -P 18765 api/migrate-v15-incidents.php \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/api/migrate-v15-incidents.php

[ ] 2.5  Verify parity endpoint is alive (safe GET, no auth needed to get HTTP 401)
         curl -s -o /dev/null -w "%{http_code}" \
           "https://racingsystemsanalysis.com/api/parity.php?action=listRuns"
         Expected: 401 (auth required) — proves PHP is executing, not a 500
```

---

## 3. MIGRATION

The migration uses `CREATE TABLE IF NOT EXISTS` — safe to run multiple times.

```
[ ] 3.1  SSH into the server
         ssh -p 18765 u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com

[ ] 3.2  Run the migration (as a web request — uses config.php DB creds)
         curl -s "https://racingsystemsanalysis.com/api/migrate-v15-incidents.php" \
           -H "Authorization: Bearer <YOUR_AUTH_TOKEN>"
         Expected output:
           === Migration v15: Incident Tables ===
           ── incident_types ──
             Table incident_types OK
             Seeded N default incident types
           ── run_incidents ──
             Table run_incidents OK
           ── incident_media ──
             Table incident_media OK
           ── incident_links ──
             Table incident_links OK
           === Migration v15 complete ===

         NOTE: If the migration requires admin role (like other migrations),
         use the owner's auth token. Check the migration script header for the
         exact gate — it uses requireAdminRole().

[ ] 3.3  Verify tables exist and types are seeded (MySQL CLI or phpMyAdmin)
         -- Connect to MySQL
         mysql -u u456volfzsgxu -p dblqju17k9ccug

         -- Check tables exist
         SHOW TABLES LIKE 'incident%';
         SHOW TABLES LIKE 'run_incidents';
         -- Expected: incident_types, run_incidents, incident_media, incident_links

         -- Check incident_types seeded
         SELECT id, `key`, label, is_active FROM incident_types ORDER BY sort_order;
         -- Expected: 8+ rows (crash, fire, explosion, mechanical, tire, oil_down, record, other)

         -- Check run_incidents table structure
         DESCRIBE run_incidents;
         -- Should have: id, run_id, incident_type_id, occurred_at_utc, lane,
         --   track_segment, severity, summary, details, created_by, updated_by, etc.

         -- Check incident_links table structure  
         DESCRIBE incident_links;
         -- Should have: id, incident_id, link_type, ref, meta_json, created_by, created_at

[ ] 3.4  Verify incidents endpoint is alive
         curl -s -o /dev/null -w "%{http_code}" \
           "https://racingsystemsanalysis.com/api/incidents.php?action=listIncidentTypes"
         Expected: 401 (auth required) — proves PHP is executing
```

---

## 4. FRONTEND DEPLOY

The GitHub Actions workflow deploys automatically on push to main. Alternatively, deploy manually:

### Option A: Automatic (push to GitHub)
```
[ ] 4.1  Push to main — GitHub Actions builds and FTP-deploys
         git push origin main
         Monitor: https://github.com/<repo>/actions
         Wait for green checkmark (typically 2-3 minutes)
```

### Option B: Manual SCP
```
[ ] 4.1  Build locally
         npm run build

[ ] 4.2  Upload frontend assets
         # Remove old assets (hashed filenames change each build)
         ssh -p 18765 u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com \
           "rm -rf /home/customer/www/racingsystemsanalysis.com/public_html/assets/"

         # Upload new assets
         scp -P 18765 -r dist/assets \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/assets

         # Upload index.html (must be no-cache)
         scp -P 18765 dist/index.html \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/index.html

         # Upload .htaccess (use the production version)
         scp -P 18765 .htaccess-production \
           u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com:/home/customer/www/racingsystemsanalysis.com/public_html/.htaccess

[ ] 4.3  Verify routes resolve
         curl -s -o /dev/null -w "%{http_code}" "https://racingsystemsanalysis.com/parity"
         Expected: 200

         curl -s -o /dev/null -w "%{http_code}" "https://racingsystemsanalysis.com/parity/idr?type=idr_session&ref=test"
         Expected: 200
```

---

## 5. POST-DEPLOY SMOKE TEST

Perform these tests logged in as the owner (Clinton) in a browser.

```
[ ] 5.1  PARITY DASHBOARD LOADS
         Navigate to https://racingsystemsanalysis.com/parity
         Confirm: Dashboard tab loads without errors.
         Confirm: "Refresh Event Data" button visible in admin tools.

[ ] 5.2  REFRESH EVENT DATA
         Go to Admin Tools → click "Refresh Event Data"
         Confirm: it completes without error, event list updates.

[ ] 5.3  INCIDENT COLUMN VISIBLE
         Navigate to Dashboard → Event Runs tab
         Select an event with runs.
         Confirm: "Inc" column header visible in the runs table.
         Confirm: Runs with 0 incidents show a small "＋" icon.

[ ] 5.4  CREATE AN INCIDENT
         Click the "＋" icon on any run row.
         Confirm: IncidentDrawer slides open.
         Click "+ Add Incident".
         Fill in:
           - Type: select any (e.g., "Mechanical Failure")
           - Summary: "Test incident from prod smoke test"
           - Severity: 2
         Click "Create Incident".
         Confirm: Incident appears in the list.
         Confirm: The run row now shows ⚠️ with count "1".

[ ] 5.5  ADD AN EXTERNAL URL LINK
         In the incident card, click "▸ Links".
         Click "+ Add Link".
         Fill in:
           - Link Type: External URL
           - Reference: https://www.nhra.com
         Click "Save Link".
         Confirm: Link appears with clickable URL.
         Click the URL — confirm it opens nhra.com in a new tab.

[ ] 5.6  ADD AN IDR SESSION LINK
         Click "+ Add Link" again.
         Fill in:
           - Link Type: IDR Session
           - Reference: test-session-001
         Click "Save Link".
         Confirm: Link appears with "IDR Session" badge.
         Confirm: "Open IDR Viewer" button appears.

[ ] 5.7  IDR VIEWER ROUTE
         Click "Open IDR Viewer" on the IDR session link.
         Confirm: Navigates to /parity/idr?type=idr_session&ref=test-session-001&incidentId=...
         Confirm: Page shows "IDR Viewer" header, type badge, ref value.
         Confirm: "← Back to Parity Dashboard" link works.

[ ] 5.8  DELETE LINK
         Navigate back to /parity, reopen the incident drawer.
         Expand links on the test incident.
         Click "✕" on the test IDR session link.
         Confirm: Link disappears.

[ ] 5.9  EDIT INCIDENT
         Click "Edit" on the test incident.
         Change summary to "Updated smoke test".
         Click "Save Changes".
         Confirm: Summary updates in the list.

[ ] 5.10 DELETE INCIDENT
         Click "Delete" → "Confirm" on the test incident.
         Confirm: Incident removed.
         Confirm: Run row count returns to 0 (＋ icon).

[ ] 5.11 DRIVER DRILLDOWN
         Navigate to Driver History tab.
         Search for a driver and select them.
         Confirm: "Inc" column visible in driver runs table.
         Confirm: ＋ / ⚠️ icons work, drawer opens.

[ ] 5.12 PARITY REPORT (if accessible)
         Navigate to a Parity Report with qual data.
         Confirm: "Inc" column visible in qual runs table.
         Confirm: Icons work, drawer opens.

[ ] 5.13 OWNERSHIP ENFORCEMENT
         (If a second user account is available)
         Log in as a non-admin user.
         Open the drawer on a run — create an incident.
         Confirm: User sees Edit/Delete on their own incident.
         Switch back to owner account.
         Confirm: Owner sees Edit/Delete on ALL incidents (edit.all).

[ ] 5.14 CLEANUP
         Delete any test incidents created during smoke testing.
```

---

## 6. ROLLBACK PLAN

### 6A. Backend Rollback (if incidents cause errors)

```
# Restore backed-up files
ssh -p 18765 u488-nj6h9i3qcmud@ssh.racingsystemsanalysis.com
cd /home/customer/www/racingsystemsanalysis.com/public_html/api

# Restore parity.php
cp parity.php.bak-pre7d parity.php

# Restore capabilities.php
cp lib/capabilities.php.bak-pre7d lib/capabilities.php

# Remove new files (incidents won't be callable without the PHP file)
rm -f incidents.php
# Leave migrate-v15-incidents.php — it's inert unless called directly
```

**Important**: Do NOT drop the `incident_types`, `run_incidents`, `incident_media`, or `incident_links` tables. They have foreign keys and the data is harmless. Removing the PHP endpoints is sufficient to disable the feature.

### 6B. Frontend Rollback

```
# Re-deploy from previous commit
git checkout 43fb3139  # pre-incidents commit
npm run build
# Then re-upload dist/ via SCP (Option B above)
# Or: git revert HEAD && git push  (triggers CI/CD)
```

### 6C. Quick Feature Disable (without full rollback)

If incidents work but you want to hide them temporarily:

1. **Remove incident capabilities from all roles** — edit `api/lib/capabilities.php`, remove the 4 `incidents.*` entries from `ROLE_CAPABILITIES`. The UI hides all incident icons when `incidents.read` is denied.

2. **Or**: Return 501 from incidents.php temporarily:
```php
// Add at line 35 of incidents.php, before the switch:
rsa_jsonResponse(['error' => 'Incidents temporarily disabled'], 501);
```

---

## 7. RECOMMENDED PRODUCTION LOGGING

The existing pattern in `api/parity.php` and `api/incidents.php` uses PHP's `error_log()` in catch blocks. This is sufficient. The key log points already present:

- `incidents.php` line ~88: `error_log('incidents.php unhandled exception [...]: ' . $e->getMessage())`
- `parity.php`: similar catch-all error_log

**Optional enhancement** (can do later, not blocking deploy):
Add a one-liner at the top of `handleRefreshEventData` to log usage:
```php
error_log("refreshEventData called by userId=$userId for raceLookup=" . ($_GET['race_lookup'] ?? 'none'));
```

SiteGround PHP error logs are viewable at:
- Site Tools → Statistics → Error Log
- Or via SSH: `tail -f ~/www/racingsystemsanalysis.com/logs/error.log`

---

## Summary of Deploy Sequence

| Step | Action | Time |
|------|--------|------|
| 1 | Pre-deploy checks (tests, build) | 2 min |
| 2 | SSH backup of current backend files | 1 min |
| 3 | SCP upload: capabilities.php → parity.php → incidents.php → migration | 1 min |
| 4 | Verify backend endpoint alive (curl) | 30 sec |
| 5 | Run migration v15 (curl) | 30 sec |
| 6 | Verify migration (SQL queries) | 1 min |
| 7 | Push to main (triggers CI/CD frontend deploy) OR manual SCP | 2-3 min |
| 8 | Verify /parity and /parity/idr routes | 30 sec |
| 9 | Smoke test (steps 5.1–5.14) | 10 min |
| **Total** | | **~20 min** |
