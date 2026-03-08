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
 *
 * Permission model:
 *   incidents.read   — view analysis data
 *   incidents.create — create/upload/modify analysis data
 *
 * All endpoints require authentication.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';

$action = $_GET['action'] ?? '';

// For file streaming, skip JSON content-type
if ($action !== 'getDatasetData' && $action !== 'getVideoFile') {
    header('Content-Type: application/json; charset=utf-8');
}

try {

$auth = rsa_getAuthUser();
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
        handleDeleteDataset($pdo);
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
        handleDeleteVideo($pdo);
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
        handleDeleteMeasurement($pdo);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

} catch (Throwable $e) {
    error_log('incident-analysis.php unhandled exception [' . ($action ?? '') . ']: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    rsa_jsonResponse(['error' => 'Internal server error', 'detail' => $e->getMessage()], 500);
}

// ============================================================================
// Helpers
// ============================================================================

define('IA_UPLOAD_DIR', __DIR__ . '/../uploads/incident_analysis');
define('IA_MAX_CSV_SIZE', 50 * 1024 * 1024); // 50 MB
define('IA_MAX_VIDEO_SIZE', 500 * 1024 * 1024); // 500 MB

function ia_requireCap(PDO $pdo, int $userId, string $role, string $cap): void {
    if (!rsa_hasCap($pdo, $userId, $role, $cap)) {
        rsa_jsonResponse(['error' => 'Forbidden', 'message' => "Missing capability: $cap"], 403);
    }
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

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $_FILES['file']['error'] ?? 'no file';
        rsa_jsonResponse(['error' => "File upload failed (code: $errCode)"], 400);
    }

    $file = $_FILES['file'];
    if ($file['size'] > IA_MAX_CSV_SIZE) {
        rsa_jsonResponse(['error' => 'File exceeds maximum size (50 MB)'], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['csv', 'tsv', 'txt', 'log'])) {
        rsa_jsonResponse(['error' => 'Only CSV/TSV/TXT/LOG files are accepted'], 400);
    }

    // Store file
    $subdir = IA_UPLOAD_DIR . '/datasets';
    if (!is_dir($subdir)) mkdir($subdir, 0755, true);

    $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $file['name']);
    $storedName = $sessionId . '_' . time() . '_' . $safeName;
    $destPath = $subdir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        rsa_jsonResponse(['error' => 'Failed to store uploaded file'], 500);
    }

    // Parse CSV metadata
    try {
        $meta = ia_parseCsvMetadata($destPath);
    } catch (RuntimeException $e) {
        unlink($destPath);
        rsa_jsonResponse(['error' => 'CSV parse error: ' . $e->getMessage()], 400);
    }

    // Insert dataset
    $stmt = $pdo->prepare("
        INSERT INTO incident_analysis_datasets
            (session_id, name, file_path, file_size, file_mime, time_column, time_unit, sample_count, time_min, time_max, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $sessionId,
        $file['name'],
        $storedName, // relative to upload dir
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

    // Insert channels
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

function handleDeleteDataset(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $datasetId = (int)($input['dataset_id'] ?? 0);
    if ($datasetId <= 0) rsa_jsonResponse(['error' => 'dataset_id is required'], 400);

    $stmt = $pdo->prepare("SELECT file_path FROM incident_analysis_datasets WHERE id = ?");
    $stmt->execute([$datasetId]);
    $ds = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ds) rsa_jsonResponse(['error' => 'Dataset not found'], 404);

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

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errCode = $_FILES['file']['error'] ?? 'no file';
        rsa_jsonResponse(['error' => "File upload failed (code: $errCode)"], 400);
    }

    $file = $_FILES['file'];
    if ($file['size'] > IA_MAX_VIDEO_SIZE) {
        rsa_jsonResponse(['error' => 'Video exceeds maximum size (500 MB)'], 400);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogv'];
    if (!in_array($ext, $videoExts)) {
        rsa_jsonResponse(['error' => 'Only video files are accepted (' . implode(', ', $videoExts) . ')'], 400);
    }

    $subdir = IA_UPLOAD_DIR . '/videos';
    if (!is_dir($subdir)) mkdir($subdir, 0755, true);

    $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', $file['name']);
    $storedName = $sessionId . '_' . time() . '_' . $safeName;
    $destPath = $subdir . '/' . $storedName;

    if (!move_uploaded_file($file['tmp_name'], $destPath)) {
        rsa_jsonResponse(['error' => 'Failed to store uploaded video'], 500);
    }

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

// Add getVideoFile to the switch (handle it before auth for streaming)
// Actually, we need auth for video too, so add it to the switch:

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

function handleDeleteVideo(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $videoId = (int)($input['video_id'] ?? 0);
    if ($videoId <= 0) rsa_jsonResponse(['error' => 'video_id is required'], 400);

    $stmt = $pdo->prepare("SELECT file_path FROM incident_analysis_videos WHERE id = ?");
    $stmt->execute([$videoId]);
    $v = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$v) rsa_jsonResponse(['error' => 'Video not found'], 404);

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

function handleDeleteMeasurement(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $id = (int)($input['measurement_id'] ?? 0);
    if ($id <= 0) rsa_jsonResponse(['error' => 'measurement_id is required'], 400);

    $pdo->prepare("DELETE FROM incident_analysis_measurements WHERE id = ?")->execute([$id]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $id]);
}
