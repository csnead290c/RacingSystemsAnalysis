# Canonical Weather Provenance - Production Deployment Checklist

## A) DEPLOY FILE LIST

### Files to Deploy to Production Server

**Backend (PHP):**
```
✓ api/migrate-v6d-canonical-provenance.php (NEW)
✓ api/parity.php (MODIFIED)
✓ api/verify-provenance-migration.php (NEW - verification helper)
```

**Frontend (Built Assets):**
```
✓ dist/index.html
✓ dist/assets/* (all files from npm run build)
```

**Deployment Command:**
```bash
# Build frontend first
npm run build

# Upload to production server (adjust path/method as needed)
scp -r dist/* user@server:/path/to/production/
scp api/migrate-v6d-canonical-provenance.php user@server:/path/to/production/api/
scp api/parity.php user@server:/path/to/production/api/
scp api/verify-provenance-migration.php user@server:/path/to/production/api/
```

---

## B) PRODUCTION MIGRATION EXECUTION

### Step 1: SSH to Production Server

```bash
ssh user@your-production-server.com
cd /path/to/rsa/production
```

### Step 2: Run Migration

```bash
php api/migrate-v6d-canonical-provenance.php
```

### Expected Success Output

```
=== Parity Weather Canonical Provenance Migration ===
Checking if columns already exist...
Adding canonical_source_kind column...
Adding canonical_source_detail column...
Adding sample_count column...
Adding sample_sources_json column...
Adding index on canonical_source_kind...
Migration completed successfully.
```

### Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `ERROR 1060: Duplicate column name` | Migration already run | ✓ Safe to proceed - skip to verification |
| `ERROR 1142: ALTER command denied` | Insufficient DB permissions | Contact DBA or use elevated user |
| `ERROR 1146: Table doesn't exist` | Wrong database or table name | Check DB connection in `api/db.php` |
| `PDOException: Connection refused` | DB server down or wrong credentials | Verify DB server and credentials |

### Step 3: Verify Migration

**Option A: Direct MySQL CLI**
```sql
-- Verify columns exist
DESCRIBE parity_weather_canonical;

-- Expected new columns:
-- canonical_source_kind    varchar(32)  NO      unknown
-- canonical_source_detail  text         YES     NULL
-- sample_count             int          NO      0
-- sample_sources_json      text         YES     NULL

-- Verify index
SHOW INDEX FROM parity_weather_canonical WHERE Key_name = 'idx_canonical_source_kind';
```

**Option B: API Verification Endpoint**
```bash
curl https://your-domain.com/api/verify-provenance-migration.php
```

**Expected Response:**
```json
{
    "status": "success",
    "message": "Migration verified successfully",
    "columnsExist": true,
    "indexExists": true,
    "stats": {
        "total": "1234",
        "populated": "0",
        "with_samples": "0"
    }
}
```

Note: `populated` will be 0 until canonical rebuild runs.

---

## C) CANONICAL REBUILD & VERIFICATION

### Step 1: Rebuild Canonical Weather

**UI Steps:**
1. Navigate to: **Parity Portal → Weather tab**
2. Scroll to: **"Build Canonical Weather"** section
3. Click: **"Build Canonical (all samples)"** button
4. Wait for completion (shows `bucketsProcessed` count)

**Expected Result:**
```json
{
  "bucketsProcessed": 2456,
  "message": "Canonical weather built successfully"
}
```

### Step 2: Verify Provenance Population

**SQL Verification:**
```sql
-- Spot-check 5 recent canonical rows
SELECT 
    timestamp_utc,
    temp_f,
    canonical_source_kind,
    canonical_source_detail,
    sample_count,
    sample_sources_json
FROM parity_weather_canonical
ORDER BY timestamp_utc DESC
LIMIT 5;

-- Expected:
-- canonical_source_kind: 'station', 'csv_backfill', 'open_meteo_backfill', or 'mixed'
-- sample_count: > 0
-- sample_sources_json: valid JSON like [{"source":"open_meteo_backfill","count":5}]

-- Statistics by source
SELECT 
    canonical_source_kind,
    COUNT(*) as count,
    AVG(sample_count) as avg_samples,
    MIN(timestamp_utc) as earliest,
    MAX(timestamp_utc) as latest
FROM parity_weather_canonical
GROUP BY canonical_source_kind
ORDER BY count DESC;
```

**API Verification:**
```bash
# Re-run verification endpoint
curl https://your-domain.com/api/verify-provenance-migration.php

# Now stats.populated should be > 0
```

**Expected Response After Rebuild:**
```json
{
    "status": "success",
    "stats": {
        "total": "2456",
        "populated": "2456",
        "with_samples": "2456"
    },
    "sampleRows": [
        {
            "timestamp_utc": "2024-10-15 14:30:00",
            "canonical_source_kind": "open_meteo_backfill",
            "canonical_source_detail": "open_meteo_backfill=5",
            "sample_count": "5",
            "sample_sources_json": "[{\"source\":\"open_meteo_backfill\",\"count\":5}]"
        }
    ]
}
```

---

## D) UI VERIFICATION CHECKLIST

### Runs+Weather Table Verification

**Steps:**
1. Navigate to: **Parity Portal → Runs + Weather tab**
2. Select a race with weather data (e.g., recent NHRA event)
3. Click "Query Runs"

**Checklist:**
- [ ] **Source column visible** in table header (after Δs column)
- [ ] **Source badges render** for each run with weather:
  - Blue badge for single sources (Station, CSV, Open-Meteo)
  - Orange badge for mixed sources
  - Badge shows source name (e.g., "Open-Meteo", "CSV", "Station", "Mixed")
- [ ] **Sample count displays** when > 1 (e.g., "Open-Meteo (5)")
- [ ] **Tooltip shows on hover** with detailed breakdown (canonical_source_detail)
- [ ] **"—" displays** for runs without weather

**Screenshot Locations to Verify:**
- Source column header
- Source badge for single source
- Source badge for mixed source (if any)
- Tooltip on hover

### CSV Export Verification

**Steps:**
1. In Runs+Weather table, click "Export CSV"
2. Open downloaded CSV file

**Checklist:**
- [ ] **Weather_Timestamp_UTC** column exists
- [ ] **Weather_Source_Kind** column exists
- [ ] **Weather_Sample_Count** column exists
- [ ] Values populated correctly (matching UI display)

**Expected CSV Headers:**
```
Driver,Class,Round,Lane,RT,ft1320,mph1320,Temp_F,RH%,Press_inHg,Weather_Delta_s,Weather_Timestamp_UTC,Weather_Source_Kind,Weather_Sample_Count,HPC,HPC_Reason,Corr_1320ft,Corr_1320mph,...
```

**Sample CSV Row:**
```
John Force,FC,Q1,L,0.042,3.850,330.5,76.5,65.0,29.920,120,2024-10-15 14:30:00,open_meteo_backfill,5,1.0234,...
```

---

## E) SAFETY GUARDS IMPLEMENTED

### Graceful Degradation

The system now includes safety checks that prevent fatal errors if migration hasn't been run:

**1. Canonical Build Protection:**
- Checks for provenance columns before attempting to build
- Returns clear error message if columns missing:
  ```json
  {
    "error": "Provenance columns do not exist in parity_weather_canonical"
  }
  ```

**2. Runs+Weather API Protection:**
- Detects missing columns at runtime
- Falls back to query without provenance fields
- Returns default values (`canonical_source_kind: 'unknown'`, `sample_count: 0`)
- Frontend displays "—" for missing data

**3. Migration Idempotency:**
- Migration checks if columns exist before adding
- Safe to run multiple times
- No data loss on re-run

### Testing Safety Guards

**Before Migration:**
```bash
# This should return error about missing columns
curl -X POST https://your-domain.com/api/parity.php?action=weatherBuildCanonical \
  -H "Content-Type: application/json" \
  -d '{}'

# This should work but return 'unknown' for all sources
curl "https://your-domain.com/api/parity.php?action=runsWithWeather&raceLookup=2024-PHX-1"
```

**After Migration + Rebuild:**
```bash
# This should succeed
curl -X POST https://your-domain.com/api/parity.php?action=weatherBuildCanonical \
  -H "Content-Type: application/json" \
  -d '{}'

# This should return actual source kinds
curl "https://your-domain.com/api/parity.php?action=runsWithWeather&raceLookup=2024-PHX-1"
```

---

## F) ROLLBACK PLAN

If issues arise, rollback procedure:

### 1. Revert Backend
```bash
# Restore previous version of api/parity.php
git checkout HEAD~1 api/parity.php
scp api/parity.php user@server:/path/to/production/api/
```

### 2. Revert Frontend
```bash
# Rebuild from previous commit
git checkout HEAD~1
npm run build
# Deploy previous dist/
```

### 3. Remove Migration (Optional)
```sql
-- Only if you need to completely remove the columns
ALTER TABLE parity_weather_canonical 
  DROP COLUMN canonical_source_kind,
  DROP COLUMN canonical_source_detail,
  DROP COLUMN sample_count,
  DROP COLUMN sample_sources_json,
  DROP INDEX idx_canonical_source_kind;
```

---

## G) POST-DEPLOYMENT VALIDATION

### Final Checklist

- [ ] Migration completed successfully
- [ ] Verification endpoint returns `columnsExist: true`
- [ ] Canonical rebuild completed with `bucketsProcessed > 0`
- [ ] Verification shows `populated > 0` and `with_samples > 0`
- [ ] UI displays Source column with badges
- [ ] Tooltips show source breakdown
- [ ] CSV export includes provenance columns
- [ ] No console errors in browser
- [ ] No PHP errors in server logs

### Monitoring

**Check server logs for:**
```bash
# PHP error log
tail -f /var/log/php/error.log | grep -i provenance

# Application log
tail -f /path/to/app/logs/app.log | grep -i canonical
```

**Expected:** No errors related to provenance or canonical weather.

---

## H) SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue: Source column shows all "unknown"**
- **Cause:** Canonical rebuild hasn't run or failed
- **Fix:** Run "Build Canonical (all samples)" in Weather tab

**Issue: Tooltip doesn't show**
- **Cause:** `canonical_source_detail` is NULL
- **Fix:** Rebuild canonical weather

**Issue: Mixed badge shows for single source**
- **Cause:** Multiple samples from different sources in same bucket
- **Expected:** This is correct behavior - shows data quality

**Issue: CSV export missing provenance columns**
- **Cause:** Frontend not deployed or cached
- **Fix:** Hard refresh (Cmd+Shift+R), clear cache, redeploy frontend

### Contact

For issues during deployment, contact:
- **Developer:** Clinton Snead
- **Deployment Docs:** This file
- **Code Reference:** `/docs/PROVENANCE_DEPLOYMENT_CHECKLIST.md`

---

## I) SUCCESS CRITERIA

Deployment is successful when:

✅ Migration runs without errors  
✅ All 4 provenance columns exist in DB  
✅ Index on `canonical_source_kind` exists  
✅ Canonical rebuild populates provenance fields  
✅ UI displays Source column with color-coded badges  
✅ Tooltips show source breakdown  
✅ CSV export includes 3 new provenance columns  
✅ No errors in browser console or server logs  
✅ System works with and without provenance data (graceful degradation)

**Estimated Deployment Time:** 15-30 minutes

**Last Updated:** 2026-02-25
