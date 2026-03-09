# Incident Analysis — Smoke Test Checklist

> Developer checklist for verifying the Incident Analysis module end-to-end.
> Run after any migration, deploy, or significant code change.

## Prerequisites

- [ ] Migration `migrate-v16-incident-analysis.php` has been run (all 5 tables exist)
- [ ] `uploads/incident_analysis/` directory exists and is writable by PHP
- [ ] `.htaccess` inside `uploads/incident_analysis/` denies direct access
- [ ] User has `incidents.read` + `incidents.create` capabilities (NHRA plan or owner/admin role)

## 1. Navigation & Routing

- [ ] From Parity Portal → open an incident → click **Analyze** button
- [ ] Verify URL is `/parity/analysis/{incidentId}`
- [ ] Page loads without console errors
- [ ] "Back" button returns to `/parity`
- [ ] Direct URL navigation to `/parity/analysis/999` (non-existent) shows 404 from API
- [ ] User without `incidents.read` sees "Access denied" message

## 2. Session Management

- [ ] First visit auto-creates a session (check DB: `incident_analysis_sessions`)
- [ ] Revisiting same incident reuses the same session
- [ ] Session ID displayed in top bar matches DB
- [ ] Save button persists `layout_json` (visible channels, cursor, speed)
- [ ] Reload page — layout restores from saved `layout_json`

## 3. CSV Dataset Upload

- [ ] Upload a simple CSV (time, RPM, speed columns) — success toast, dataset appears
- [ ] Upload a quoted-field CSV (e.g., `"RPM [rev/min]"`) — parses correctly
- [ ] Upload a TSV/TXT file — accepted by extension filter
- [ ] Upload a .jpg renamed to .csv — rejected by MIME check (should get MIME error)
- [ ] Upload a file > 50 MB — rejected with size error
- [ ] Upload with no time column — dataset loads, "no time col" shown
- [ ] Verify `uploads/incident_analysis/datasets/` contains the stored file
- [ ] Verify filename uses `uniqid` format (no `time()` collisions)

## 4. Channel Display & Toggling

- [ ] After upload, channels appear in left panel with name + min/max range
- [ ] Click channel → checkbox fills, chart line appears
- [ ] Click again → checkbox empties, line removed
- [ ] Channel search filters the list (case-insensitive)
- [ ] Multiple datasets → channels grouped by dataset

## 5. Chart Rendering

- [ ] Select 2-3 channels → lines render with distinct colors
- [ ] X-axis shows time in seconds
- [ ] Hover shows tooltip with channel values
- [ ] Click chart → cursor line appears at clicked time
- [ ] Large dataset (10k+ rows) → chart responsive, no browser hang (decimation active)

## 6. Time Offset

- [ ] Change dataset time offset → chart shifts accordingly
- [ ] Offset persists after page reload (stored in DB)

## 7. Video Upload & Playback

- [ ] Upload an MP4 — success, video player appears in right panel
- [ ] Upload a non-video file (e.g., .pdf) — rejected by extension + MIME check
- [ ] Upload a file > 500 MB — rejected with size error
- [ ] Video plays in embedded player
- [ ] Video has native controls when playback is stopped
- [ ] Direct access to `uploads/incident_analysis/videos/` via browser → denied by .htaccess
- [ ] Video streaming with seek (Range headers) works

## 8. Synchronized Playback

- [ ] Click Play → video plays, cursor moves on chart
- [ ] Adjust speed (0.25×, 0.5×, 1×, 2×, 4×) → both chart cursor and video speed change
- [ ] Pause → video pauses, cursor stops
- [ ] Scrubber slider → video seeks to matching time
- [ ] Video time offset → video sync adjusts correctly

## 9. Measurement Mode

- [ ] Click "Measure" → status text shows "Click chart to set start point"
- [ ] Click chart once → start marker appears (amber line)
- [ ] Click chart again → measurement saved, green markers appear at both points
- [ ] Measurement shows in bottom bar with Δt value
- [ ] Delete measurement (✕ button) → removed from list and chart
- [ ] Cancel measurement mode → clears pending start

## 10. Delete Operations

- [ ] Delete a dataset → file removed from disk, channels removed, chart updated
- [ ] Delete a video → file removed from disk, player removed
- [ ] User A creates session, User B (non-admin) tries to delete → gets 403 Forbidden
- [ ] Admin/owner can delete any session's assets

## 11. Permission Gating

- [ ] `incidents.read` only → can view but upload/delete/save buttons are hidden
- [ ] `incidents.create` → upload, save, delete buttons visible
- [ ] No capability at all → "Access denied" page shown
- [ ] Backend enforces even if frontend is bypassed (test with curl)

## 12. Error Handling

- [ ] Upload while unauthenticated → 401 error
- [ ] API call with invalid `session_id=0` → 400 error
- [ ] API call with non-existent dataset_id → 404 error
- [ ] Error messages display in top bar (red text)

## 13. Tests

```bash
npx vitest run src/services/__tests__/incidentAnalysisApi.test.ts
```

- [ ] All 24 tests pass (10 API surface, 9 parser, 5 decimation)
- [ ] TypeScript compilation clean: `npx tsc --noEmit`
- [ ] Production build clean: `npx vite build`
