# Incident Analysis — Upload Debugging Runbook

## Quick Reference

| Upload type | Max size (app) | Max size (server) | Endpoint |
|-------------|---------------|-------------------|----------|
| CSV/TSV/TXT | 50 MB | upload_max_filesize | `POST ?action=uploadDataset` |
| Video (mp4, webm, etc.) | 500 MB | upload_max_filesize | `POST ?action=uploadVideo` |

## Symptom: Upload Returns "Internal server error"

### Step 1: Run diagnose

```
GET /api/incident-analysis.php?action=diagnose
Authorization: Bearer <TOKEN>
```

Check these fields:

| Field | What it tells you |
|-------|-------------------|
| `verdict:csv_upload` | Whether CSV upload should work right now |
| `verdict:video_upload` | Whether video upload should work right now |
| `php:file_uploads` | Whether PHP allows uploads at all |
| `php:upload_tmp_dir` | Whether PHP's temp directory is writable |
| `php:upload_max_filesize` | Server's per-file size limit (bytes shown) |
| `php:post_max_size` | Server's total POST body limit |
| `dir:datasets` | Whether datasets dir exists + writable |
| `dir:videos` | Whether videos dir exists + writable |

### Step 2: Match the error

| Error message | Cause | Fix |
|---------------|-------|-----|
| `File exceeds server upload_max_filesize (256M)` | File larger than PHP's limit | Increase `upload_max_filesize` in `api/.user.ini` |
| `No file received` | POST body exceeded `post_max_size` — PHP silently drops entire body | Increase `post_max_size` in `api/.user.ini` |
| `File was only partially uploaded` | Connection interrupted during upload | Retry; check server `max_execution_time` |
| `Server has no temp directory configured` | `upload_tmp_dir` missing or misconfigured | Check PHP config or contact host |
| `Server failed to write upload to disk` | Temp dir permission issue | Check temp dir permissions |
| `Upload directory could not be created` | Parent dir not writable | Run migration v16 or `mkdir -p` via SSH |
| `Upload directory is not writable` | Dir exists but PHP can't write | `chmod 755` on the upload dir via SSH |
| `Failed to store uploaded file` | `move_uploaded_file` failed | Check hint field: temp file missing? dir not writable? |
| `File content type 'X' is not a recognized...` | MIME mismatch | File may not be what it claims; check file contents |
| `CSV parse error: ...` | File is not valid CSV | Check file format (must have header row, 2+ columns) |
| `Database error saving dataset` | DB insert failed | Check `detail` field for SQL error |

### Step 3: Fix PHP upload limits (SiteGround)

Create `api/.user.ini` on the server:

```ini
upload_max_filesize = 512M
post_max_size = 520M
max_execution_time = 300
```

Or set via SiteGround Site Tools → PHP Settings.

After changing, wait ~5 minutes for PHP to pick up the new `.user.ini` values (PHP caches these with `user_ini.cache_ttl`).

### Step 4: Fix directory permissions (SSH)

```bash
# Ensure upload dirs exist and are writable
mkdir -p ~/www/racingsystemsanalysis.com/public_html/uploads/incident_analysis/datasets
mkdir -p ~/www/racingsystemsanalysis.com/public_html/uploads/incident_analysis/videos
chmod 755 ~/www/racingsystemsanalysis.com/public_html/uploads/incident_analysis
chmod 755 ~/www/racingsystemsanalysis.com/public_html/uploads/incident_analysis/datasets
chmod 755 ~/www/racingsystemsanalysis.com/public_html/uploads/incident_analysis/videos
```

## Error Flow: What Users See

When an upload fails, the frontend shows:
1. The server's error message (e.g., "File upload failed: File exceeds server upload_max_filesize (256M)")
2. A hint if available (e.g., "Increase upload_max_filesize in api/.user.ini")
3. A retry button

The backend includes `hint` fields in error responses that the frontend extracts and displays. These hints are designed for admins, not end users.

## Common SiteGround-Specific Issues

1. **`upload_max_filesize` defaults to 128M or 256M** — not enough for large videos
2. **`.user.ini` takes ~5 min to take effect** — PHP caches it
3. **`open_basedir` restriction** — SiteGround may restrict file operations to the webroot; uploads must be under `public_html/`
4. **Process memory limits** — very large CSV parsing may hit `memory_limit`; current code streams with `fgetcsv` so this is unlikely
