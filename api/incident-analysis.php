<?php
/**
 * Incident Analysis API
 *
 * Endpoints:
 *   GET  ?action=getSession&incident_id=N         — Get or create analysis session for an incident
 *   POST ?action=saveSession                       — Save layout/view state
 *   POST ?action=uploadDataset                     — Upload CSV, parse channels, store file (multipart)
 *   GET  ?action=listDatasets&session_id=N         — List datasets + channels
 *   GET  ?action=getDatasetData&dataset_id=N       — Stream raw CSV data
 *   POST ?action=updateDataset                     — Update dataset metadata (time_offset, color, etc.)
 *   POST ?action=deleteDataset                     — Remove dataset + file
 *   POST ?action=uploadVideo                       — Upload video file (multipart)
 *   GET  ?action=listVideos&session_id=N           — List videos
 *   POST ?action=updateVideo                       — Update video metadata (time_offset, name)
 *   POST ?action=deleteVideo                       — Remove video + file
 *   POST ?action=saveMeasurement                   — Create or update a measurement
 *   GET  ?action=listMeasurements&session_id=N     — List measurements
 *   POST ?action=deleteMeasurement                 — Delete a measurement
 *   GET  ?action=diagnose                          — Production readiness check (all prerequisites)
 *
 * Permission model:
 *   incidents.read   — view analysis data
 *   incidents.create — create/upload/modify analysis data
 *
 * All endpoints require authentication.
 *
 * DEPLOYMENT NOTE:
 *   This module requires migration v16 (migrate-v16-incident-analysis.php).
 *   If the 500 error "table not found" appears, the migration has not been run.
 *   Use ?action=diagnose to check all prerequisites.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';

$action = $_GET['action'] ?? '';

// Constants must be defined before the try/catch dispatch block so handler functions can use them.
define('IA_UPLOAD_DIR', __DIR__ . '/../uploads/incident_analysis');
define('IA_MAX_CSV_SIZE', 50 * 1024 * 1024); // 50 MB
define('IA_MAX_VIDEO_SIZE', 500 * 1024 * 1024); // 500 MB

// For file streaming, skip JSON content-type
if ($action !== 'getDatasetData' && $action !== 'getVideoFile') {
    header('Content-Type: application/json; charset=utf-8');
}

try {

$auth = rsa_getAuthUser();
// For streaming endpoints (<video src>, <img src>), browser can't send Authorization header.
// Fall back to query-param token for getVideoFile and getDatasetData only.
if (!$auth && in_array($action, ['getVideoFile', 'getDatasetData']) && !empty($_GET['_token'])) {
    $auth = rsa_verifyToken($_GET['_token']);
}
if (!$auth) {
    rsa_jsonResponse(['error' => 'Authentication required'], 401);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$userId = rsa_resolveUserId($pdo, $auth);
$role = rsa_getUserRole($pdo, $userId);

$method = $_SERVER['REQUEST_METHOD'];

switch ($action) {
    case 'getSession':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleGetSession($pdo, $userId);
        break;
    case 'saveSession':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleSaveSession($pdo, $userId);
        break;
    case 'uploadDataset':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleUploadDataset($pdo, $userId);
        break;
    case 'listDatasets':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleListDatasets($pdo);
        break;
    case 'getDatasetData':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleGetDatasetData($pdo);
        break;
    case 'updateDataset':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleUpdateDataset($pdo, $userId);
        break;
    case 'deleteDataset':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleDeleteDataset($pdo, $userId, $role);
        break;
    case 'uploadVideo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleUploadVideo($pdo, $userId);
        break;
    case 'listVideos':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleListVideos($pdo);
        break;
    case 'updateVideo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleUpdateVideo($pdo, $userId);
        break;
    case 'deleteVideo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleDeleteVideo($pdo, $userId, $role);
        break;
    case 'getVideoFile':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleGetVideoFile($pdo);
        break;
    case 'saveMeasurement':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleSaveMeasurement($pdo, $userId);
        break;
    case 'listMeasurements':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleListMeasurements($pdo);
        break;
    case 'deleteMeasurement':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.create');
        handleDeleteMeasurement($pdo, $userId, $role);
        break;
    case 'diagnose':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        ia_requireCap($pdo, $userId, $role, 'incidents.read');
        handleDiagnose($pdo, $userId, $role);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

} catch (Throwable $e) {
    $errorContext = [
        'action' => $action ?? '',
        'class'  => get_class($e),
        'msg'    => $e->getMessage(),
        'file'   => $e->getFile(),
        'line'   => $e->getLine(),
    ];
    error_log('incident-analysis.php unhandled exception: ' . json_encode($errorContext));

    // Surface diagnostic info safely — include detail for non-production debugging.
    // The 'detail' and 'debug' keys help developers; 'error' is the user-facing message.
    $response = ['error' => 'Internal server error'];

    // Detect likely root causes and add actionable hints
    $msg = $e->getMessage();
    if (stripos($msg, "doesn't exist") !== false || stripos($msg, 'table') !== false) {
        $response['hint'] = 'Database tables may not exist. Run migration v16: /api/migrate-v16-incident-analysis.php';
        $response['error'] = 'Database table not found — migration may not have been run';
    } elseif (stripos($msg, 'Access denied') !== false || stripos($msg, 'SQLSTATE[HY000]') !== false) {
        $response['hint'] = 'Database connection or permission error. Check config.php credentials.';
    } elseif (stripos($msg, 'No such file') !== false || stripos($msg, 'Permission denied') !== false) {
        $response['hint'] = 'File system error. Check that uploads/incident_analysis/ exists and is writable.';
    }

    $response['detail'] = $msg;
    $response['debug'] = [
        'action' => $action ?? '',
        'exception' => get_class($e),
        'location' => basename($e->getFile()) . ':' . $e->getLine(),
    ];

    rsa_jsonResponse($response, 500);
}

// ============================================================================
// Helpers
// ============================================================================

// NOTE: IA_UPLOAD_DIR, IA_MAX_CSV_SIZE, IA_MAX_VIDEO_SIZE are defined near the
// top of this file (before the try/catch dispatch block) so they are available
// to all handler functions.

function ia_requireCap(PDO $pdo, int $userId, string $role, string $cap): void {
    if (!rsa_hasCap($pdo, $userId, $role, $cap)) {
        rsa_jsonResponse(['error' => 'Forbidden', 'message' => "Missing capability: $cap"], 403);
    }
}

/**
 * Verify that the given session belongs to the given user, or user is admin/owner.
 * For delete operations we require ownership or elevated role.
 */
function ia_requireSessionAccess(PDO $pdo, int $sessionId, int $userId, string $role): void {
    if (in_array($role, ['owner', 'admin'])) return;
    $stmt = $pdo->prepare("SELECT created_by FROM incident_analysis_sessions WHERE id = ?");
    $stmt->execute([$sessionId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || (int)$row['created_by'] !== $userId) {
        rsa_jsonResponse(['error' => 'Forbidden', 'message' => 'You do not own this analysis session'], 403);
    }
}

/**
 * Generate a collision-safe stored filename.
 */
function ia_safeFilename(int $sessionId, string $originalName): string {
    $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $originalName);
    return $sessionId . '_' . uniqid('', true) . '_' . $safeName;
}

/**
 * Human-readable message for PHP upload error codes.
 */
function ia_uploadErrorMessage(int $code): string {
    return match ($code) {
        UPLOAD_ERR_INI_SIZE   => 'File exceeds server upload_max_filesize (' . ini_get('upload_max_filesize') . ')',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds form MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL    => 'File was only partially uploaded (connection interrupted?)',
        UPLOAD_ERR_NO_FILE    => 'No file was selected',
        UPLOAD_ERR_NO_TMP_DIR => 'Server has no temp directory configured for uploads',
        UPLOAD_ERR_CANT_WRITE => 'Server failed to write upload to disk (permissions?)',
        UPLOAD_ERR_EXTENSION  => 'A PHP extension blocked the upload',
        default               => "Unknown upload error (code $code)",
    };
}

/**
 * Detect MIME type using finfo. Returns the MIME string or 'unknown' on failure.
 */
function ia_detectMime(string $filePath): string {
    if (!file_exists($filePath)) return 'unknown';
    try {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $mime = $finfo->file($filePath);
        return $mime ?: 'unknown';
    } catch (Throwable $e) {
        return 'unknown';
    }
}

/**
 * Check if a detected MIME type is acceptable for CSV/text uploads.
 * Broad enough for shared hosting environments where finfo can return unusual types.
 */
function ia_isAllowedCsvMime(string $mime): bool {
    $allowed = [
        'text/plain', 'text/csv', 'text/tab-separated-values',
        'text/x-csv', 'text/comma-separated-values', 'text/x-comma-separated-values',
        'application/csv', 'application/x-csv',
        'application/octet-stream', // some systems report this for .csv
        'application/vnd.ms-excel',  // Windows sometimes reports this for .csv
        'unknown', // finfo failed — fall back to extension check which already passed
    ];
    // Also accept anything starting with text/
    return in_array($mime, $allowed) || str_starts_with($mime, 'text/');
}

/**
 * Check if a detected MIME type is acceptable for video uploads.
 * Broad enough for shared hosting environments.
 */
function ia_isAllowedVideoMime(string $mime): bool {
    $allowed = [
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
        'video/x-matroska', 'video/ogg', 'video/x-m4v', 'video/3gpp',
        'video/mpeg', 'video/x-flv',
        'application/octet-stream', // some systems report this for video files
        'application/mp4',
        'unknown', // finfo failed — fall back to extension check which already passed
    ];
    // Also accept anything starting with video/
    return in_array($mime, $allowed) || str_starts_with($mime, 'video/');
}

/**
 * Detect the time column from CSV headers.
 * Returns the header name or null.
 */
function ia_detectTimeColumn(array $headers): ?string {
    $candidates = ['time', 'time_s', 'time_sec', 'time_seconds', 'timestamp', 'elapsed', 'elapsed_time',
                   't', 'seconds', 'sec', 'ms', 'milliseconds', 'time_ms', 'sample_time'];
    $headersLower = array_map('strtolower', array_map('trim', $headers));
    foreach ($candidates as $c) {
        $idx = array_search($c, $headersLower);
        if ($idx !== false) return $headers[$idx];
    }
    // Fallback: first column that contains 'time'
    foreach ($headersLower as $i => $h) {
        if (strpos($h, 'time') !== false) return $headers[$i];
    }
    return null;
}

/**
 * Detect if time values are likely in milliseconds (all values > 1000).
 */
function ia_detectTimeUnit(array $timeValues): string {
    if (empty($timeValues)) return 'seconds';
    $allLarge = true;
    foreach (array_slice($timeValues, 0, 100) as $v) {
        if (abs($v) < 100) { $allLarge = false; break; }
    }
    return $allLarge ? 'milliseconds' : 'seconds';
}

/**
 * Parse a CSV file and extract channel metadata.
 * Returns ['headers' => [...], 'channels' => [...], 'sample_count' => N, 'time_column' => str|null, 'time_unit' => str]
 */
function ia_parseCsvMetadata(string $filePath): array {
    $handle = fopen($filePath, 'r');
    if (!$handle) throw new RuntimeException("Cannot open file: $filePath");

    // Read header
    $headers = fgetcsv($handle);
    if (!$headers || count($headers) < 2) {
        fclose($handle);
        throw new RuntimeException("CSV must have at least 2 columns");
    }
    $headers = array_map('trim', $headers);

    $timeColumn = ia_detectTimeColumn($headers);
    $timeIdx = $timeColumn !== null ? array_search($timeColumn, $headers) : null;

    // Scan data for channel stats
    $channelCount = count($headers);
    $mins = array_fill(0, $channelCount, PHP_FLOAT_MAX);
    $maxs = array_fill(0, $channelCount, -PHP_FLOAT_MAX);
    $sums = array_fill(0, $channelCount, 0.0);
    $counts = array_fill(0, $channelCount, 0);
    $timeValues = [];
    $sampleCount = 0;

    while (($row = fgetcsv($handle)) !== false) {
        $sampleCount++;
        for ($i = 0; $i < min(count($row), $channelCount); $i++) {
            $val = trim($row[$i]);
            if ($val === '' || !is_numeric($val)) continue;
            $num = (float)$val;
            if ($num < $mins[$i]) $mins[$i] = $num;
            if ($num > $maxs[$i]) $maxs[$i] = $num;
            $sums[$i] += $num;
            $counts[$i]++;
            if ($i === $timeIdx && count($timeValues) < 200) {
                $timeValues[] = $num;
            }
        }
    }
    fclose($handle);

    $timeUnit = ($timeIdx !== null) ? ia_detectTimeUnit($timeValues) : 'seconds';

    $channels = [];
    for ($i = 0; $i < $channelCount; $i++) {
        if ($timeIdx !== null && $i === $timeIdx) continue; // Skip time column as a data channel
        $channels[] = [
            'name' => $headers[$i],
            'sample_count' => $counts[$i],
            'min_value' => $counts[$i] > 0 ? round($mins[$i], 6) : null,
            'max_value' => $counts[$i] > 0 ? round($maxs[$i], 6) : null,
            'mean_value' => $counts[$i] > 0 ? round($sums[$i] / $counts[$i], 6) : null,
        ];
    }

    $timeMin = null;
    $timeMax = null;
    if ($timeIdx !== null && $counts[$timeIdx] > 0) {
        $divisor = ($timeUnit === 'milliseconds') ? 1000.0 : 1.0;
        $timeMin = round($mins[$timeIdx] / $divisor, 6);
        $timeMax = round($maxs[$timeIdx] / $divisor, 6);
    }

    return [
        'headers' => $headers,
        'channels' => $channels,
        'sample_count' => $sampleCount,
        'time_column' => $timeColumn,
        'time_unit' => $timeUnit,
        'time_min' => $timeMin,
        'time_max' => $timeMax,
    ];
}

// ============================================================================
// GET ?action=getSession&incident_id=N
// ============================================================================

function handleGetSession(PDO $pdo, int $userId): void {
    $incidentId = (int)($_GET['incident_id'] ?? 0);
    if ($incidentId <= 0) rsa_jsonResponse(['error' => 'incident_id is required'], 400);

    // Verify incident exists
    $check = $pdo->prepare("SELECT id FROM run_incidents WHERE id = ?");
    $check->execute([$incidentId]);
    if (!$check->fetch()) rsa_jsonResponse(['error' => 'Incident not found'], 404);

    // Find existing session
    $stmt = $pdo->prepare("SELECT * FROM incident_analysis_sessions WHERE incident_id = ? LIMIT 1");
    $stmt->execute([$incidentId]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$session) {
        // Auto-create
        $ins = $pdo->prepare("INSERT INTO incident_analysis_sessions (incident_id, created_by) VALUES (?, ?)");
        $ins->execute([$incidentId, $userId]);
        $sessionId = (int)$pdo->lastInsertId();
        $stmt->execute([$incidentId]);
        $session = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    $session['id'] = (int)$session['id'];
    $session['incident_id'] = (int)$session['incident_id'];
    $session['created_by'] = (int)$session['created_by'];
    $session['updated_by'] = $session['updated_by'] !== null ? (int)$session['updated_by'] : null;
    $session['layout_json'] = $session['layout_json'] !== null ? json_decode($session['layout_json'], true) : null;

    rsa_jsonResponse(['session' => $session]);
}

// ============================================================================
// POST ?action=saveSession
// Body: { session_id, layout_json }
// ============================================================================

function handleSaveSession(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $sessionId = (int)($input['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    $layoutJson = $input['layout_json'] ?? null;

    $stmt = $pdo->prepare("UPDATE incident_analysis_sessions SET layout_json = ?, updated_by = ? WHERE id = ?");
    $stmt->execute([
        $layoutJson !== null ? json_encode($layoutJson) : null,
        $userId,
        $sessionId,
    ]);

    if ($stmt->rowCount() === 0) rsa_jsonResponse(['error' => 'Session not found'], 404);

    rsa_jsonResponse(['ok' => true, 'session_id' => $sessionId]);
}

// ============================================================================
// POST ?action=uploadDataset (multipart/form-data)
// Fields: session_id, file (CSV)
// ============================================================================

function handleUploadDataset(PDO $pdo, int $userId): void {
    $sessionId = (int)($_POST['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    // Verify session exists
    $check = $pdo->prepare("SELECT id FROM incident_analysis_sessions WHERE id = ?");
    $check->execute([$sessionId]);
    if (!$check->fetch()) rsa_jsonResponse(['error' => 'Session not found'], 404);

    // ── File upload validation with actionable error messages ──
    if (!isset($_FILES['file'])) {
        rsa_jsonResponse(['error' => 'No file received', 'hint' => 'The request must include a "file" field (multipart/form-data). If you see this after selecting a file, post_max_size may have been exceeded.'], 400);
    }
    if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        rsa_jsonResponse(['error' => 'File upload failed: ' . ia_uploadErrorMessage($_FILES['file']['error']), 'code' => $_FILES['file']['error']], 400);
    }

    $file = $_FILES['file'];
    if ($file['size'] > IA_MAX_CSV_SIZE) {
        rsa_jsonResponse(['error' => 'File exceeds maximum size (50 MB)', 'file_size' => $file['size'], 'limit' => IA_MAX_CSV_SIZE], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['csv', 'tsv', 'txt', 'log'])) {
        rsa_jsonResponse(['error' => 'Only CSV/TSV/TXT/LOG files are accepted', 'received_extension' => $ext], 400);
    }

    // ── Ensure target directory exists and is writable ──
    $subdir = IA_UPLOAD_DIR . '/datasets';
    if (!is_dir($subdir)) {
        if (!@mkdir($subdir, 0755, true)) {
            rsa_jsonResponse(['error' => 'Upload directory could not be created', 'hint' => 'The server cannot create uploads/incident_analysis/datasets/. Check filesystem permissions or run migration v16.'], 500);
        }
    }
    if (!is_writable($subdir)) {
        rsa_jsonResponse(['error' => 'Upload directory is not writable', 'hint' => 'uploads/incident_analysis/datasets/ exists but PHP cannot write to it. Check directory permissions.'], 500);
    }

    // ── MIME validation — broad enough for shared hosting ──
    $detectedMime = ia_detectMime($file['tmp_name']);
    if (!ia_isAllowedCsvMime($detectedMime)) {
        rsa_jsonResponse(['error' => "File content type '$detectedMime' is not a recognized text/CSV format", 'hint' => 'Ensure the file is a plain-text CSV. Binary files are not accepted.'], 400);
    }

    $storedName = ia_safeFilename($sessionId, $file['name']);
    $destPath = $subdir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        // Diagnose why move failed
        $diag = [];
        if (!file_exists($file['tmp_name'])) $diag[] = 'temp file missing (upload may have been interrupted)';
        if (!is_writable($subdir)) $diag[] = 'target directory not writable';
        $diag[] = 'tmp_dir=' . (ini_get('upload_tmp_dir') ?: sys_get_temp_dir());
        rsa_jsonResponse(['error' => 'Failed to store uploaded file', 'hint' => implode('; ', $diag)], 500);
    }

    // Parse CSV metadata
    try {
        $meta = ia_parseCsvMetadata($destPath);
    } catch (RuntimeException $e) {
        @unlink($destPath);
        rsa_jsonResponse(['error' => 'CSV parse error: ' . $e->getMessage()], 400);
    }

    // Insert dataset
    try {
        $stmt = $pdo->prepare("
            INSERT INTO incident_analysis_datasets
                (session_id, name, file_path, file_size, file_mime, time_column, time_unit, sample_count, time_min, time_max, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $sessionId,
            $file['name'],
            $storedName,
            $file['size'],
            $file['type'] ?: 'text/csv',
            $meta['time_column'],
            $meta['time_unit'],
            $meta['sample_count'],
            $meta['time_min'],
            $meta['time_max'],
            $userId,
        ]);
        $datasetId = (int)$pdo->lastInsertId();
    } catch (Throwable $e) {
        @unlink($destPath);
        rsa_jsonResponse(['error' => 'Database error saving dataset', 'detail' => $e->getMessage()], 500);
    }

    // Insert channels
    try {
        $chStmt = $pdo->prepare("
            INSERT INTO incident_analysis_channels
                (dataset_id, name, source, sample_count, min_value, max_value, mean_value, sort_order)
            VALUES (?, ?, 'imported', ?, ?, ?, ?, ?)
        ");
        foreach ($meta['channels'] as $i => $ch) {
            $chStmt->execute([
                $datasetId,
                $ch['name'],
                $ch['sample_count'],
                $ch['min_value'],
                $ch['max_value'],
                $ch['mean_value'],
                $i,
            ]);
        }
    } catch (Throwable $e) {
        rsa_jsonResponse(['error' => 'Database error saving channels', 'detail' => $e->getMessage()], 500);
    }

    rsa_jsonResponse([
        'ok' => true,
        'dataset_id' => $datasetId,
        'name' => $file['name'],
        'sample_count' => $meta['sample_count'],
        'channel_count' => count($meta['channels']),
        'time_column' => $meta['time_column'],
        'time_unit' => $meta['time_unit'],
    ], 201);
}

// ============================================================================
// GET ?action=listDatasets&session_id=N
// ============================================================================

function handleListDatasets(PDO $pdo): void {
    $sessionId = (int)($_GET['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    $stmt = $pdo->prepare("
        SELECT id, session_id, name, file_size, file_mime, time_column, time_unit,
               time_offset, sample_count, time_min, time_max, color, created_at
        FROM incident_analysis_datasets
        WHERE session_id = ?
        ORDER BY created_at ASC
    ");
    $stmt->execute([$sessionId]);
    $datasets = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Load channels per dataset
    $chStmt = $pdo->prepare("
        SELECT id, dataset_id, name, unit, source, expression, sample_count,
               min_value, max_value, mean_value, color, visible, sort_order
        FROM incident_analysis_channels
        WHERE dataset_id = ?
        ORDER BY sort_order ASC, name ASC
    ");

    foreach ($datasets as &$ds) {
        $ds['id'] = (int)$ds['id'];
        $ds['session_id'] = (int)$ds['session_id'];
        $ds['file_size'] = (int)$ds['file_size'];
        $ds['sample_count'] = (int)$ds['sample_count'];
        $ds['time_offset'] = (float)$ds['time_offset'];
        $ds['time_min'] = $ds['time_min'] !== null ? (float)$ds['time_min'] : null;
        $ds['time_max'] = $ds['time_max'] !== null ? (float)$ds['time_max'] : null;

        $chStmt->execute([$ds['id']]);
        $channels = $chStmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($channels as &$ch) {
            $ch['id'] = (int)$ch['id'];
            $ch['dataset_id'] = (int)$ch['dataset_id'];
            $ch['sample_count'] = (int)$ch['sample_count'];
            $ch['min_value'] = $ch['min_value'] !== null ? (float)$ch['min_value'] : null;
            $ch['max_value'] = $ch['max_value'] !== null ? (float)$ch['max_value'] : null;
            $ch['mean_value'] = $ch['mean_value'] !== null ? (float)$ch['mean_value'] : null;
            $ch['visible'] = (bool)(int)$ch['visible'];
            $ch['sort_order'] = (int)$ch['sort_order'];
        }
        $ds['channels'] = $channels;
    }

    rsa_jsonResponse(['datasets' => $datasets, 'session_id' => $sessionId]);
}

// ============================================================================
// GET ?action=getDatasetData&dataset_id=N
// ============================================================================

function handleGetDatasetData(PDO $pdo): void {
    $datasetId = (int)($_GET['dataset_id'] ?? 0);
    if ($datasetId <= 0) rsa_jsonResponse(['error' => 'dataset_id is required'], 400);

    $stmt = $pdo->prepare("SELECT file_path, file_mime FROM incident_analysis_datasets WHERE id = ?");
    $stmt->execute([$datasetId]);
    $ds = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ds) rsa_jsonResponse(['error' => 'Dataset not found'], 404);

    $fullPath = IA_UPLOAD_DIR . '/datasets/' . $ds['file_path'];
    if (!file_exists($fullPath)) rsa_jsonResponse(['error' => 'File not found on disk'], 404);

    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Length: ' . filesize($fullPath));
    header('Cache-Control: private, max-age=3600');
    readfile($fullPath);
    exit;
}

// ============================================================================
// POST ?action=updateDataset
// Body: { dataset_id, time_offset?, color?, name?, time_column? }
// ============================================================================

function handleUpdateDataset(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $datasetId = (int)($input['dataset_id'] ?? 0);
    if ($datasetId <= 0) rsa_jsonResponse(['error' => 'dataset_id is required'], 400);

    $sets = [];
    $params = [];

    if (array_key_exists('time_offset', $input)) {
        $sets[] = 'time_offset = ?';
        $params[] = (float)$input['time_offset'];
    }
    if (array_key_exists('color', $input)) {
        $sets[] = 'color = ?';
        $params[] = $input['color'];
    }
    if (array_key_exists('name', $input)) {
        $sets[] = 'name = ?';
        $params[] = trim($input['name']);
    }

    if (empty($sets)) rsa_jsonResponse(['error' => 'No fields to update'], 400);

    $params[] = $datasetId;
    $sql = "UPDATE incident_analysis_datasets SET " . implode(', ', $sets) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    rsa_jsonResponse(['ok' => true, 'dataset_id' => $datasetId]);
}

// ============================================================================
// POST ?action=deleteDataset
// Body: { dataset_id }
// ============================================================================

function handleDeleteDataset(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $datasetId = (int)($input['dataset_id'] ?? 0);
    if ($datasetId <= 0) rsa_jsonResponse(['error' => 'dataset_id is required'], 400);

    $stmt = $pdo->prepare("SELECT file_path, session_id FROM incident_analysis_datasets WHERE id = ?");
    $stmt->execute([$datasetId]);
    $ds = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ds) rsa_jsonResponse(['error' => 'Dataset not found'], 404);

    ia_requireSessionAccess($pdo, (int)$ds['session_id'], $userId, $role);

    // Delete file
    $fullPath = IA_UPLOAD_DIR . '/datasets/' . $ds['file_path'];
    if (file_exists($fullPath)) unlink($fullPath);

    // Cascade deletes channels via FK
    $pdo->prepare("DELETE FROM incident_analysis_datasets WHERE id = ?")->execute([$datasetId]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $datasetId]);
}

// ============================================================================
// POST ?action=uploadVideo (multipart/form-data)
// Fields: session_id, file (video)
// ============================================================================

function handleUploadVideo(PDO $pdo, int $userId): void {
    $sessionId = (int)($_POST['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    $check = $pdo->prepare("SELECT id FROM incident_analysis_sessions WHERE id = ?");
    $check->execute([$sessionId]);
    if (!$check->fetch()) rsa_jsonResponse(['error' => 'Session not found'], 404);

    // ── File upload validation with actionable error messages ──
    if (!isset($_FILES['file'])) {
        rsa_jsonResponse(['error' => 'No file received', 'hint' => 'The request must include a "file" field (multipart/form-data). If the file is large, post_max_size (' . ini_get('post_max_size') . ') may have been exceeded — when this happens PHP silently drops the entire POST body.'], 400);
    }
    if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        rsa_jsonResponse(['error' => 'File upload failed: ' . ia_uploadErrorMessage($_FILES['file']['error']), 'code' => $_FILES['file']['error']], 400);
    }

    $file = $_FILES['file'];
    if ($file['size'] > IA_MAX_VIDEO_SIZE) {
        rsa_jsonResponse(['error' => 'Video exceeds maximum size (500 MB)', 'file_size' => $file['size'], 'limit' => IA_MAX_VIDEO_SIZE], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv', 'm4v'];
    if (!in_array($ext, $videoExts)) {
        rsa_jsonResponse(['error' => 'Only video files are accepted (' . implode(', ', $videoExts) . ')', 'received_extension' => $ext], 400);
    }

    // ── Ensure target directory exists and is writable ──
    $subdir = IA_UPLOAD_DIR . '/videos';
    if (!is_dir($subdir)) {
        if (!@mkdir($subdir, 0755, true)) {
            rsa_jsonResponse(['error' => 'Upload directory could not be created', 'hint' => 'The server cannot create uploads/incident_analysis/videos/. Check filesystem permissions or run migration v16.'], 500);
        }
    }
    if (!is_writable($subdir)) {
        rsa_jsonResponse(['error' => 'Upload directory is not writable', 'hint' => 'uploads/incident_analysis/videos/ exists but PHP cannot write to it. Check directory permissions.'], 500);
    }

    // ── MIME validation — broad enough for shared hosting ──
    $detectedMime = ia_detectMime($file['tmp_name']);
    if (!ia_isAllowedVideoMime($detectedMime)) {
        rsa_jsonResponse(['error' => "File content type '$detectedMime' is not a recognized video format", 'hint' => 'Accepted: mp4, webm, mov, avi, mkv, ogv, m4v'], 400);
    }

    $storedName = ia_safeFilename($sessionId, $file['name']);
    $destPath = $subdir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        $diag = [];
        if (!file_exists($file['tmp_name'])) $diag[] = 'temp file missing (upload may have been interrupted or exceeded server limits)';
        if (!is_writable($subdir)) $diag[] = 'target directory not writable';
        $diag[] = 'tmp_dir=' . (ini_get('upload_tmp_dir') ?: sys_get_temp_dir());
        rsa_jsonResponse(['error' => 'Failed to store uploaded video', 'hint' => implode('; ', $diag)], 500);
    }

    try {
        $stmt = $pdo->prepare("
            INSERT INTO incident_analysis_videos (session_id, name, file_path, file_size, file_mime, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $sessionId,
            $file['name'],
            $storedName,
            $file['size'],
            $file['type'] ?: 'video/mp4',
            $userId,
        ]);
        $videoId = (int)$pdo->lastInsertId();
    } catch (Throwable $e) {
        @unlink($destPath);
        rsa_jsonResponse(['error' => 'Database error saving video record', 'detail' => $e->getMessage()], 500);
    }

    rsa_jsonResponse([
        'ok' => true,
        'video_id' => $videoId,
        'name' => $file['name'],
        'file_size' => $file['size'],
    ], 201);
}

// ============================================================================
// GET ?action=listVideos&session_id=N
// ============================================================================

function handleListVideos(PDO $pdo): void {
    $sessionId = (int)($_GET['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    $stmt = $pdo->prepare("
        SELECT id, session_id, name, file_path, file_size, file_mime, duration, time_offset, created_at
        FROM incident_analysis_videos
        WHERE session_id = ?
        ORDER BY created_at ASC
    ");
    $stmt->execute([$sessionId]);
    $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($videos as &$v) {
        $v['id'] = (int)$v['id'];
        $v['session_id'] = (int)$v['session_id'];
        $v['file_size'] = (int)$v['file_size'];
        $v['duration'] = $v['duration'] !== null ? (float)$v['duration'] : null;
        $v['time_offset'] = (float)$v['time_offset'];
        // Build a URL the client can use for the video src
        $v['url'] = '/api/incident-analysis.php?action=getVideoFile&video_id=' . $v['id'];
        unset($v['file_path']); // Don't expose server path
    }

    rsa_jsonResponse(['videos' => $videos, 'session_id' => $sessionId]);
}

// ============================================================================
// GET ?action=getVideoFile&video_id=N (stream video)
// ============================================================================

function handleGetVideoFile(PDO $pdo): void {
    $videoId = (int)($_GET['video_id'] ?? 0);
    if ($videoId <= 0) { http_response_code(400); echo 'video_id required'; exit; }

    $stmt = $pdo->prepare("SELECT file_path, file_mime FROM incident_analysis_videos WHERE id = ?");
    $stmt->execute([$videoId]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$v) { http_response_code(404); echo 'Video not found'; exit; }

    $fullPath = IA_UPLOAD_DIR . '/videos/' . $v['file_path'];
    if (!file_exists($fullPath)) { http_response_code(404); echo 'File not found on disk'; exit; }

    $mime = $v['file_mime'] ?: 'video/mp4';
    $size = filesize($fullPath);

    // Support range requests for video seeking
    if (isset($_SERVER['HTTP_RANGE'])) {
        $range = $_SERVER['HTTP_RANGE'];
        if (preg_match('/bytes=(\d+)-(\d*)/', $range, $m)) {
            $start = (int)$m[1];
            $end = $m[2] !== '' ? (int)$m[2] : $size - 1;
            $end = min($end, $size - 1);
            if ($start > $end || $start >= $size) {
                http_response_code(416);
                header("Content-Range: bytes */$size");
                exit;
            }
            $length = $end - $start + 1;

            http_response_code(206);
            header("Content-Type: $mime");
            header("Content-Length: $length");
            header("Content-Range: bytes $start-$end/$size");
            header('Accept-Ranges: bytes');
            header('Cache-Control: private, max-age=86400');

            $fp = fopen($fullPath, 'rb');
            fseek($fp, $start);
            $sent = 0;
            while ($sent < $length && !feof($fp)) {
                $chunk = min(8192, $length - $sent);
                echo fread($fp, $chunk);
                $sent += $chunk;
            }
            fclose($fp);
            exit;
        }
    }

    header("Content-Type: $mime");
    header("Content-Length: $size");
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=86400');
    readfile($fullPath);
    exit;
}

// ============================================================================
// POST ?action=updateVideo
// Body: { video_id, time_offset?, name? }
// ============================================================================

function handleUpdateVideo(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $videoId = (int)($input['video_id'] ?? 0);
    if ($videoId <= 0) rsa_jsonResponse(['error' => 'video_id is required'], 400);

    $sets = [];
    $params = [];

    if (array_key_exists('time_offset', $input)) {
        $sets[] = 'time_offset = ?';
        $params[] = (float)$input['time_offset'];
    }
    if (array_key_exists('name', $input)) {
        $sets[] = 'name = ?';
        $params[] = trim($input['name']);
    }
    if (array_key_exists('duration', $input)) {
        $sets[] = 'duration = ?';
        $params[] = $input['duration'] !== null ? (float)$input['duration'] : null;
    }

    if (empty($sets)) rsa_jsonResponse(['error' => 'No fields to update'], 400);

    $params[] = $videoId;
    $sql = "UPDATE incident_analysis_videos SET " . implode(', ', $sets) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    rsa_jsonResponse(['ok' => true, 'video_id' => $videoId]);
}

// ============================================================================
// POST ?action=deleteVideo
// Body: { video_id }
// ============================================================================

function handleDeleteVideo(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $videoId = (int)($input['video_id'] ?? 0);
    if ($videoId <= 0) rsa_jsonResponse(['error' => 'video_id is required'], 400);

    $stmt = $pdo->prepare("SELECT file_path, session_id FROM incident_analysis_videos WHERE id = ?");
    $stmt->execute([$videoId]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$v) rsa_jsonResponse(['error' => 'Video not found'], 404);

    ia_requireSessionAccess($pdo, (int)$v['session_id'], $userId, $role);

    $fullPath = IA_UPLOAD_DIR . '/videos/' . $v['file_path'];
    if (file_exists($fullPath)) unlink($fullPath);

    $pdo->prepare("DELETE FROM incident_analysis_videos WHERE id = ?")->execute([$videoId]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $videoId]);
}

// ============================================================================
// POST ?action=saveMeasurement
// Body: { session_id, t1, t2, label?, channel_id?, notes?, id? (for update) }
// ============================================================================

function handleSaveMeasurement(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $sessionId = (int)($input['session_id'] ?? 0);
    $t1 = $input['t1'] ?? null;
    $t2 = $input['t2'] ?? null;
    $measurementId = (int)($input['id'] ?? 0);

    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);
    if ($t1 === null || $t2 === null) rsa_jsonResponse(['error' => 't1 and t2 are required'], 400);

    $label = $input['label'] ?? null;
    $channelId = isset($input['channel_id']) ? (int)$input['channel_id'] : null;
    $notes = $input['notes'] ?? null;

    if ($measurementId > 0) {
        // Update existing
        $stmt = $pdo->prepare("
            UPDATE incident_analysis_measurements
            SET t1 = ?, t2 = ?, label = ?, channel_id = ?, notes = ?
            WHERE id = ? AND session_id = ?
        ");
        $stmt->execute([(float)$t1, (float)$t2, $label, $channelId, $notes, $measurementId, $sessionId]);
        rsa_jsonResponse(['ok' => true, 'measurement_id' => $measurementId]);
    } else {
        // Create new
        $stmt = $pdo->prepare("
            INSERT INTO incident_analysis_measurements (session_id, t1, t2, label, channel_id, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$sessionId, (float)$t1, (float)$t2, $label, $channelId, $notes, $userId]);
        $newId = (int)$pdo->lastInsertId();
        rsa_jsonResponse(['ok' => true, 'measurement_id' => $newId], 201);
    }
}

// ============================================================================
// GET ?action=listMeasurements&session_id=N
// ============================================================================

function handleListMeasurements(PDO $pdo): void {
    $sessionId = (int)($_GET['session_id'] ?? 0);
    if ($sessionId <= 0) rsa_jsonResponse(['error' => 'session_id is required'], 400);

    $stmt = $pdo->prepare("
        SELECT id, session_id, label, t1, t2, channel_id, delta_time, notes, created_by, created_at
        FROM incident_analysis_measurements
        WHERE session_id = ?
        ORDER BY t1 ASC
    ");
    $stmt->execute([$sessionId]);
    $measurements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($measurements as &$m) {
        $m['id'] = (int)$m['id'];
        $m['session_id'] = (int)$m['session_id'];
        $m['t1'] = (float)$m['t1'];
        $m['t2'] = (float)$m['t2'];
        $m['channel_id'] = $m['channel_id'] !== null ? (int)$m['channel_id'] : null;
        $m['delta_time'] = (float)$m['delta_time'];
        $m['created_by'] = (int)$m['created_by'];
    }

    rsa_jsonResponse(['measurements' => $measurements, 'session_id' => $sessionId]);
}

// ============================================================================
// POST ?action=deleteMeasurement
// Body: { measurement_id }
// ============================================================================

function handleDeleteMeasurement(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $id = (int)($input['measurement_id'] ?? 0);
    if ($id <= 0) rsa_jsonResponse(['error' => 'measurement_id is required'], 400);

    // Verify ownership via session
    $stmt = $pdo->prepare("SELECT session_id FROM incident_analysis_measurements WHERE id = ?");
    $stmt->execute([$id]);
    $m = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$m) rsa_jsonResponse(['error' => 'Measurement not found'], 404);
    ia_requireSessionAccess($pdo, (int)$m['session_id'], $userId, $role);

    $pdo->prepare("DELETE FROM incident_analysis_measurements WHERE id = ?")->execute([$id]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $id]);
}

// ============================================================================
// GET ?action=diagnose — Production readiness check
// Returns pass/fail for every prerequisite the module needs
// ============================================================================

function handleDiagnose(PDO $pdo, int $userId, string $role): void {
    $checks = [];

    // 1. Auth — if we got here, auth passed. Only expose role, not userId.
    $checks['auth'] = ['pass' => true, 'role' => $role];

    // 2. Required tables
    $requiredTables = [
        'run_incidents',
        'incident_analysis_sessions',
        'incident_analysis_datasets',
        'incident_analysis_channels',
        'incident_analysis_videos',
        'incident_analysis_measurements',
    ];
    $missingTables = [];
    foreach ($requiredTables as $table) {
        try {
            $pdo->query("SELECT 1 FROM $table LIMIT 0");
            $checks["table:$table"] = ['pass' => true];
        } catch (Throwable $e) {
            $checks["table:$table"] = ['pass' => false, 'error' => 'Table does not exist'];
            $missingTables[] = $table;
        }
    }

    // 3. Quick data health: count incidents and sessions
    try {
        $incCount = (int)$pdo->query("SELECT COUNT(*) FROM run_incidents")->fetchColumn();
        $checks['data:run_incidents_count'] = ['value' => $incCount, 'pass' => $incCount > 0];
    } catch (Throwable $e) {
        $checks['data:run_incidents_count'] = ['pass' => false, 'error' => 'Cannot query run_incidents'];
    }
    if (!in_array('incident_analysis_sessions', $missingTables)) {
        try {
            $sesCount = (int)$pdo->query("SELECT COUNT(*) FROM incident_analysis_sessions")->fetchColumn();
            $checks['data:sessions_count'] = ['value' => $sesCount];
        } catch (Throwable $e) {
            // Already caught above
        }
    }

    // 4. Upload directories — do NOT expose absolute server paths
    $uploadBase = __DIR__ . '/../uploads/incident_analysis';
    $checks['dir:uploads/incident_analysis'] = [
        'pass' => is_dir($uploadBase),
        'writable' => is_dir($uploadBase) ? is_writable($uploadBase) : false,
    ];
    $datasetDir = $uploadBase . '/datasets';
    $checks['dir:datasets'] = [
        'pass' => is_dir($datasetDir),
        'writable' => is_dir($datasetDir) ? is_writable($datasetDir) : false,
    ];
    $videoDir = $uploadBase . '/videos';
    $checks['dir:videos'] = [
        'pass' => is_dir($videoDir),
        'writable' => is_dir($videoDir) ? is_writable($videoDir) : false,
    ];

    // 5. Capabilities
    $canRead = rsa_hasCap($pdo, $userId, $role, 'incidents.read');
    $canCreate = rsa_hasCap($pdo, $userId, $role, 'incidents.create');
    $checks['cap:incidents.read'] = ['pass' => $canRead];
    $checks['cap:incidents.create'] = ['pass' => $canCreate];

    // 6. Upload security — .htaccess in upload dir
    $htaccess = $uploadBase . '/.htaccess';
    $checks['dir:htaccess'] = [
        'pass' => file_exists($htaccess),
        'detail' => file_exists($htaccess) ? 'Deny from all — direct access blocked' : 'Missing — uploads may be directly accessible',
    ];

    // 7. PHP upload system readiness
    $checks['php:file_uploads'] = [
        'pass' => (bool)ini_get('file_uploads'),
        'value' => ini_get('file_uploads'),
    ];

    // Temp directory for uploads
    $tmpDir = ini_get('upload_tmp_dir') ?: sys_get_temp_dir();
    $tmpWritable = is_dir($tmpDir) && is_writable($tmpDir);
    $checks['php:upload_tmp_dir'] = [
        'pass' => $tmpWritable,
        'value' => $tmpDir ? 'configured' : 'not set (using sys default)',
        'writable' => $tmpWritable,
    ];
    if (!$tmpWritable) {
        $checks['php:upload_tmp_dir']['hint'] = 'PHP temp directory is not writable — ALL uploads will fail';
    }

    // Upload size limits with proper byte parsing
    $uploadMax = ini_get('upload_max_filesize');
    $postMax = ini_get('post_max_size');
    $uploadBytes = ia_parseIniBytes($uploadMax);
    $postBytes = ia_parseIniBytes($postMax);

    $csvOk = $uploadBytes >= IA_MAX_CSV_SIZE;
    $videoOk = $uploadBytes >= IA_MAX_VIDEO_SIZE;
    $postOk = $postBytes >= $uploadBytes; // post_max_size must be >= upload_max_filesize

    $checks['php:upload_max_filesize'] = [
        'value' => $uploadMax,
        'bytes' => $uploadBytes,
        'csv_ok' => $csvOk,
        'video_ok' => $videoOk,
    ];
    if (!$videoOk) {
        $checks['php:upload_max_filesize']['warn'] = "Current {$uploadMax} is below 512M — video uploads over {$uploadMax} will fail. Fix: add upload_max_filesize=512M to api/.user.ini";
    }
    $checks['php:post_max_size'] = [
        'value' => $postMax,
        'bytes' => $postBytes,
        'pass' => $postOk,
    ];
    if (!$postOk) {
        $checks['php:post_max_size']['warn'] = "post_max_size ({$postMax}) should be larger than upload_max_filesize ({$uploadMax})";
    }

    // 8. Upload readiness verdicts
    $dirsOk = !empty($checks['dir:datasets']['pass']) && !empty($checks['dir:datasets']['writable'])
           && !empty($checks['dir:videos']['pass']) && !empty($checks['dir:videos']['writable']);
    $checks['verdict:csv_upload'] = [
        'pass' => $csvOk && $tmpWritable && $dirsOk && empty($missingTables),
        'detail' => !$tmpWritable ? 'BLOCKED: temp dir not writable'
                  : (!$dirsOk ? 'BLOCKED: upload directories missing or not writable'
                  : (!empty($missingTables) ? 'BLOCKED: database tables missing'
                  : (!$csvOk ? 'BLOCKED: upload_max_filesize too low' : 'Ready'))),
    ];
    $checks['verdict:video_upload'] = [
        'pass' => $videoOk && $tmpWritable && $dirsOk && empty($missingTables),
        'detail' => !$tmpWritable ? 'BLOCKED: temp dir not writable'
                  : (!$dirsOk ? 'BLOCKED: upload directories missing or not writable'
                  : (!empty($missingTables) ? 'BLOCKED: database tables missing'
                  : (!$videoOk ? "BLOCKED: upload_max_filesize ({$uploadMax}) is below 512M — large videos will fail" : 'Ready'))),
    ];

    // Summary with actionable fix
    $allPass = true;
    $warnings = [];
    foreach ($checks as $key => $c) {
        if (isset($c['pass']) && !$c['pass']) { $allPass = false; }
        if (!empty($c['warn'])) { $warnings[] = $key . ': ' . $c['warn']; }
    }

    $response = [
        'ok' => $allPass,
        'checks' => $checks,
    ];

    if (!empty($missingTables)) {
        $ia = count($missingTables);
        $response['summary'] = "$ia table(s) missing — run migration v16";
        $response['fix'] = 'Run migration: GET /api/migrate-v16-incident-analysis.php (requires admin auth)';
        $response['missing_tables'] = $missingTables;
    } elseif (!$allPass) {
        $response['summary'] = 'Some checks failed — see details';
    } else {
        $response['summary'] = 'All checks passed — module is ready';
    }

    if (!empty($warnings)) {
        $response['warnings'] = $warnings;
    }

    rsa_jsonResponse($response);
}

/**
 * Parse PHP ini byte values like '128M', '2G', '1024K' into integer bytes.
 */
function ia_parseIniBytes(string $val): int {
    $val = trim($val);
    $num = (int)$val;
    $suffix = strtolower(substr($val, -1));
    return match ($suffix) {
        'g' => $num * 1073741824,
        'm' => $num * 1048576,
        'k' => $num * 1024,
        default => $num,
    };
}
