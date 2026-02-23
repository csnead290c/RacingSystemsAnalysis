<?php
/**
 * NHRA Tech Parity API
 *
 * Run Endpoints:
 *   POST ?action=ingest              — Fetch & ingest NHRA run results from OData feed
 *   GET  ?action=runs                — Query normalized parity runs
 *   GET  ?action=peek                — Lightweight probe: detect JSON shape + first row keys/sample
 *   GET  ?action=suggestRaceLookups  — Scan candidate dates for a year to find valid events
 *   GET  ?action=imports             — List import history
 *
 * Weather Endpoints:
 *   POST ?action=createTrack         — Create a track (name + timezone)
 *   POST ?action=createEvent         — Create an event (name + track + dates)
 *   GET  ?action=tracks              — List tracks
 *   GET  ?action=events              — List events
 *   POST ?action=weatherBackfill     — Backfill Tempest weather for event/date range
 *   POST ?action=weatherBuildCanonical — Build canonical weather from samples
 *   GET  ?action=runsWithWeather     — Query runs joined to nearest canonical weather
 *   GET  ?action=weatherSamples      — Query raw weather samples
 *   GET  ?action=weatherCanonical    — Query canonical weather points
 *
 * Capability: nhra.parity (role-based: owner/admin only)
 * All endpoints require authentication + nhra.parity capability.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';
require_once __DIR__ . '/lib/parity.php';

rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── Auth + capability gate ──────────────────────────────────────────────
$auth = rsa_requireAuth();
$userId = rsa_requireAuthAndCap($pdo, $auth, 'nhra.parity');

// ── Routing ─────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'ingest':
        if ($method !== 'POST') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleIngest($pdo, $userId);
        break;
    case 'runs':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleQueryRuns($pdo);
        break;
    case 'peek':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handlePeek();
        break;
    case 'suggestRaceLookups':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleSuggestRaceLookups();
        break;
    case 'imports':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleListImports($pdo);
        break;
    // ── Weather actions ──────────────────────────────────────────────
    case 'createTrack':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateTrack($pdo);
        break;
    case 'createEvent':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateEvent($pdo);
        break;
    case 'tracks':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListTracks($pdo);
        break;
    case 'events':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListEvents($pdo);
        break;
    case 'weatherBackfill':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherBackfill($pdo);
        break;
    case 'weatherBuildCanonical':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherBuildCanonical($pdo);
        break;
    case 'runsWithWeather':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleRunsWithWeather($pdo);
        break;
    case 'weatherSamples':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherSamples($pdo);
        break;
    case 'weatherCanonical':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherCanonical($pdo);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

// ============================================================================
// POST ?action=ingest
// Body: { "raceLookup": "YYYYMMDD", "force": false }
// ============================================================================

function handleIngest(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $raceLookup = trim($input['raceLookup'] ?? '');
    $force = (bool)($input['force'] ?? false);

    // Validate raceLookup format
    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup must be YYYYMMDD format (e.g. 20260223)'], 400);
    }

    // Check for existing successful import (unless force=true)
    if (!$force) {
        $stmt = $pdo->prepare("
            SELECT uuid, row_count, fetched_at_utc
            FROM parity_run_imports
            WHERE race_lookup = ? AND status = 'success'
            ORDER BY fetched_at_utc DESC LIMIT 1
        ");
        $stmt->execute([$raceLookup]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            rsa_jsonResponse([
                'error' => 'Import already exists for this race date. Use force=true to re-import.',
                'existingImportId' => $existing['uuid'],
                'existingRowCount' => (int)$existing['row_count'],
                'existingFetchedAt' => $existing['fetched_at_utc'],
            ], 409);
        }
    }

    $requestedAt = gmdate('Y-m-d H:i:s');
    $importUuid = parity_generateUUID();

    // Fetch from OData
    try {
        $result = parity_fetchODataResults($raceLookup);
        $rows = $result['rows'];
        $sourceUrl = $result['url'];
    } catch (Exception $e) {
        // Record failed import
        $stmt = $pdo->prepare("
            INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, error_message, source_url, created_by_user_id)
            VALUES (?, ?, ?, ?, 'error', 0, ?, ?, ?)
        ");
        $stmt->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $e->getMessage(), "https://odata.nhradata.com/api/oGetResults/GetResults/{$raceLookup}", $userId]);

        rsa_jsonResponse([
            'error' => 'OData fetch failed: ' . $e->getMessage(),
            'importId' => $importUuid,
        ], 502);
    }

    if (empty($rows)) {
        // Record empty import
        $stmt = $pdo->prepare("
            INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
            VALUES (?, ?, ?, ?, 'success', 0, ?, ?)
        ");
        $stmt->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $sourceUrl, $userId]);

        rsa_jsonResponse([
            'raceLookup' => $raceLookup,
            'importId' => $importUuid,
            'rowsFetched' => 0,
            'rowsInserted' => 0,
            'rowsDeduped' => 0,
            'hint' => 'OData returned 0 rows. raceLookup must be the first date of an NHRA event (YYYYMMDD). Non-first dates typically return 0 rows.',
            'url' => $sourceUrl,
        ]);
        return;
    }

    // Create import record
    $fetchedAt = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
        VALUES (?, ?, ?, ?, 'success', ?, ?, ?)
    ");
    $stmt->execute([$importUuid, $raceLookup, $requestedAt, $fetchedAt, count($rows), $sourceUrl, $userId]);
    $importId = (int)$pdo->lastInsertId();

    // Prepare statements
    $stmtRaw = $pdo->prepare("
        INSERT INTO parity_runs_raw (uuid, import_id, row_hash, raw_json)
        VALUES (?, ?, ?, ?)
    ");
    $stmtRun = $pdo->prepare("
        INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $rowsInserted = 0;
    $rowsDeduped = 0;

    foreach ($rows as $raw) {
        $normalized = parity_normalizeRow($raw, $raceLookup);
        $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);

        // Insert raw row (skip if duplicate hash within this import)
        try {
            $stmtRaw->execute([
                parity_generateUUID(),
                $importId,
                $rowHash,
                json_encode($raw),
            ]);
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $rowsDeduped++;
                continue;
            }
            throw $e;
        }

        // Insert normalized row (skip if duplicate race_lookup + row_hash)
        try {
            $stmtRun->execute([
                parity_generateUUID(),
                $importId,
                $raceLookup,
                $normalized['run_timestamp_utc'],
                $normalized['category'],
                $normalized['class_index'],
                $normalized['round'],
                $normalized['lane'],
                $normalized['driver_name'],
                $normalized['car_number'],
                $normalized['dial_in'],
                $normalized['rt'],
                $normalized['ft60'],
                $normalized['ft330'],
                $normalized['ft660'],
                $normalized['mph660'],
                $normalized['ft1000'],
                $normalized['mph1000'],
                $normalized['ft1320'],
                $normalized['mph1320'],
                $normalized['win_flag'],
                $normalized['dq_flag'],
                $normalized['mov'],
                $normalized['place'],
                $normalized['source_ref'],
                $rowHash,
            ]);
            $rowsInserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $rowsDeduped++;
            } else {
                throw $e;
            }
        }
    }

    // Update import row_count to reflect actual inserts
    $pdo->prepare("UPDATE parity_run_imports SET row_count = ? WHERE id = ?")
        ->execute([$rowsInserted, $importId]);

    // Compute parsed field stats from all normalized rows
    $stats = [
        'parsedTimestampCount' => 0,
        'parsedClassCount' => 0,
        'parsedDriverCount' => 0,
        'parsedFt1320Count' => 0,
        'parsedMph1320Count' => 0,
    ];
    // Re-normalize to count (we already have the rows)
    foreach ($rows as $raw) {
        $n = parity_normalizeRow($raw, $raceLookup);
        if ($n['run_timestamp_utc'] !== null) $stats['parsedTimestampCount']++;
        if ($n['class_index'] !== null) $stats['parsedClassCount']++;
        if ($n['driver_name'] !== null) $stats['parsedDriverCount']++;
        if ($n['ft1320'] !== null) $stats['parsedFt1320Count']++;
        if ($n['mph1320'] !== null) $stats['parsedMph1320Count']++;
    }

    rsa_jsonResponse(array_merge([
        'raceLookup' => $raceLookup,
        'importId' => $importUuid,
        'rowsFetched' => count($rows),
        'rowsInserted' => $rowsInserted,
        'rowsDeduped' => $rowsDeduped,
    ], $stats));
}

// ============================================================================
// GET ?action=runs&raceLookup=YYYYMMDD&classIndex=...&driverName=...
// ============================================================================

function handleQueryRuns(PDO $pdo): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (!$raceLookup) {
        rsa_jsonResponse(['error' => 'raceLookup query parameter is required'], 400);
    }

    $where = ['race_lookup = ?'];
    $params = [$raceLookup];

    // Optional filters
    if (!empty($_GET['classIndex'])) {
        $where[] = 'class_index = ?';
        $params[] = $_GET['classIndex'];
    }
    if (!empty($_GET['driverName'])) {
        $where[] = 'driver_name LIKE ?';
        $params[] = '%' . $_GET['driverName'] . '%';
    }
    if (isset($_GET['lane']) && $_GET['lane'] !== '') {
        $where[] = 'lane = ?';
        $params[] = $_GET['lane'];
    }
    if (isset($_GET['round']) && $_GET['round'] !== '') {
        $where[] = 'round = ?';
        $params[] = $_GET['round'];
    }
    if (isset($_GET['dq'])) {
        $dq = strtolower($_GET['dq']);
        if ($dq === 'exclude') {
            $where[] = '(dq_flag IS NULL OR dq_flag = 0)';
        } elseif ($dq === 'only') {
            $where[] = 'dq_flag = 1';
        }
        // 'include' or anything else = no filter
    }

    $limit = min((int)($_GET['limit'] ?? 500), 5000);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $whereClause = implode(' AND ', $where);
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare("
        SELECT uuid, race_lookup, run_timestamp_utc, category, class_index, round, lane,
               driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660,
               ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place,
               source_ref, created_at
        FROM parity_runs
        WHERE $whereClause
        ORDER BY COALESCE(run_timestamp_utc, created_at) ASC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast numeric fields
    foreach ($rows as &$row) {
        foreach (['dial_in','rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320','mov'] as $f) {
            if ($row[$f] !== null) $row[$f] = (float)$row[$f];
        }
        foreach (['win_flag','dq_flag'] as $f) {
            if ($row[$f] !== null) $row[$f] = (bool)(int)$row[$f];
        }
    }

    // Get total count for this query (params without limit/offset)
    $countParams = array_slice($params, 0, count($params) - 2);
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE $whereClause");
    $countStmt->execute($countParams);
    $total = (int)$countStmt->fetchColumn();

    rsa_jsonResponse([
        'runs' => $rows,
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'raceLookup' => $raceLookup,
    ]);
}

// ============================================================================
// GET ?action=peek&raceLookup=YYYYMMDD
// Lightweight probe: fetch first page only, report shape + keys + sample row
// ============================================================================

function handlePeek(): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup must be YYYYMMDD format (e.g. 20260223)'], 400);
    }

    $url = "https://odata.nhradata.com/api/oGetResults/GetResults/{$raceLookup}";

    $raw = parity_httpGet($url);
    if ($raw === false) {
        rsa_jsonResponse([
            'error' => 'Failed to fetch OData URL',
            'url' => $url,
        ], 502);
    }

    $json = json_decode($raw, true);
    if ($json === null) {
        rsa_jsonResponse([
            'error' => 'Invalid JSON from OData',
            'url' => $url,
            'rawPreview' => substr($raw, 0, 500),
        ], 502);
    }

    // Detect shape
    $detectedShape = 'unknown';
    $rows = [];
    $nextLink = null;

    if (isset($json['value']) && is_array($json['value'])) {
        $detectedShape = 'v4';
        $rows = $json['value'];
        $nextLink = $json['@odata.nextLink'] ?? null;
    } elseif (isset($json['d']['results']) && is_array($json['d']['results'])) {
        $detectedShape = 'v2';
        $rows = $json['d']['results'];
        $nextLink = $json['d']['__next'] ?? null;
    } elseif (isset($json['d']) && is_array($json['d'])) {
        $detectedShape = 'v2-alt';
        $rows = $json['d'];
    }

    $firstRow = $rows[0] ?? null;
    $firstRowKeys = $firstRow ? array_keys($firstRow) : [];

    // Truncate long string values in sample row for readability
    $firstRowSample = null;
    if ($firstRow) {
        $firstRowSample = [];
        foreach ($firstRow as $k => $v) {
            if (is_string($v) && strlen($v) > 200) {
                $firstRowSample[$k] = substr($v, 0, 200) . '...[truncated]';
            } else {
                $firstRowSample[$k] = $v;
            }
        }
    }

    // Also show what our mapper would produce from the first row
    $normalizedSample = null;
    if ($firstRow) {
        $normalizedSample = parity_normalizeRow($firstRow, $raceLookup);
    }

    $response = [
        'url' => $url,
        'detectedShape' => $detectedShape,
        'rowCountFirstPage' => count($rows),
        'hasNextLink' => $nextLink !== null,
        'nextLink' => $nextLink,
        'topLevelKeys' => array_keys($json),
        'firstRowKeys' => $firstRowKeys,
        'firstRowSample' => $firstRowSample,
        'normalizedSample' => $normalizedSample,
    ];

    if (count($rows) === 0) {
        $response['hint'] = 'OData returned 0 rows. raceLookup must be the first date of an NHRA event (YYYYMMDD). Non-first dates typically return 0 rows.';
    }

    rsa_jsonResponse($response);
}

// ============================================================================
// GET ?action=suggestRaceLookups&year=YYYY
// Scan candidate dates (Thursdays) for a year to find valid NHRA events.
// ============================================================================

function handleSuggestRaceLookups(): void {
    $year = (int)($_GET['year'] ?? date('Y'));
    if ($year < 2000 || $year > 2030) {
        rsa_jsonResponse(['error' => 'year must be between 2000 and 2030'], 400);
    }

    // NHRA national events typically start on a Thursday or Friday.
    // Generate all Thursdays in the year as candidates.
    $candidates = [];
    $start = new DateTime("{$year}-01-01");
    $end = new DateTime("{$year}-12-31");

    // Find first Thursday
    while ($start->format('N') != 4) { // 4 = Thursday
        $start->modify('+1 day');
    }

    while ($start <= $end) {
        $candidates[] = $start->format('Ymd');
        // Also try the next day (Friday) since some events start Friday
        $fri = clone $start;
        $fri->modify('+1 day');
        $candidates[] = $fri->format('Ymd');
        // Also try Wednesday (some events start Wed)
        $wed = clone $start;
        $wed->modify('-1 day');
        $candidates[] = $wed->format('Ymd');
        $start->modify('+7 days');
    }

    // Dedupe and sort
    $candidates = array_unique($candidates);
    sort($candidates);

    // Limit to prevent excessive requests
    $maxAttempts = min((int)($_GET['maxAttempts'] ?? 60), 120);
    $candidates = array_slice($candidates, 0, $maxAttempts);

    $found = [];
    foreach ($candidates as $date) {
        $url = "https://odata.nhradata.com/api/oGetResults/GetResults/{$date}";
        $raw = parity_httpGet($url);
        if ($raw === false) continue;

        $json = json_decode($raw, true);
        if ($json === null) continue;

        $rows = parity_extractRows($json);
        $count = count($rows);
        if ($count > 0) {
            // Get unique categories from first few rows
            $categories = [];
            foreach (array_slice($rows, 0, 50) as $r) {
                $cat = $r['Category'] ?? $r['category'] ?? null;
                if ($cat && !in_array($cat, $categories)) {
                    $categories[] = $cat;
                }
            }
            $found[] = [
                'raceLookup' => $date,
                'rowCount' => $count,
                'categories' => $categories,
            ];
        }

        // Small delay to be rate-safe
        usleep(100000); // 100ms
    }

    rsa_jsonResponse([
        'year' => $year,
        'candidatesTested' => count($candidates),
        'eventsFound' => count($found),
        'events' => $found,
    ]);
}

// ============================================================================
// GET ?action=imports
// List import history
// ============================================================================

function handleListImports(PDO $pdo): void {
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $stmt = $pdo->prepare("
        SELECT uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count,
               error_message, source_url, created_by_user_id, created_at
        FROM parity_run_imports
        ORDER BY created_at DESC
        LIMIT ?
    ");
    $stmt->execute([$limit]);
    $imports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($imports as &$imp) {
        $imp['row_count'] = (int)$imp['row_count'];
        $imp['created_by_user_id'] = $imp['created_by_user_id'] ? (int)$imp['created_by_user_id'] : null;
    }

    rsa_jsonResponse([
        'imports' => $imports,
        'total' => count($imports),
    ]);
}

// ============================================================================
// POST ?action=createTrack
// Body: { "trackName": "...", "timezoneIana": "America/New_York" }
// ============================================================================

function handleCreateTrack(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $name = trim($input['trackName'] ?? '');
    $tz = trim($input['timezoneIana'] ?? 'America/New_York');

    if (empty($name)) {
        rsa_jsonResponse(['error' => 'trackName is required'], 400);
    }

    // Validate timezone
    try {
        new DateTimeZone($tz);
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => "Invalid timezone: $tz"], 400);
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO parity_tracks (track_name, timezone_iana) VALUES (?, ?)");
        $stmt->execute([$name, $tz]);
        $id = (int)$pdo->lastInsertId();
        rsa_jsonResponse(['id' => $id, 'trackName' => $name, 'timezoneIana' => $tz]);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            rsa_jsonResponse(['error' => "Track '$name' already exists"], 409);
        }
        throw $e;
    }
}

// ============================================================================
// POST ?action=createEvent
// Body: { "eventName": "...", "trackId": 1, "startDateLocal": "2025-10-30", "endDateLocal": "2025-11-02", "raceLookup": "20251030" }
// ============================================================================

function handleCreateEvent(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $name = trim($input['eventName'] ?? '');
    $trackId = (int)($input['trackId'] ?? 0);
    $startDate = trim($input['startDateLocal'] ?? '');
    $endDate = trim($input['endDateLocal'] ?? '');
    $raceLookup = trim($input['raceLookup'] ?? '');

    if (empty($name) || $trackId <= 0 || empty($startDate) || empty($endDate)) {
        rsa_jsonResponse(['error' => 'eventName, trackId, startDateLocal, endDateLocal are required'], 400);
    }

    // Validate dates
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        rsa_jsonResponse(['error' => 'Dates must be YYYY-MM-DD format'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO parity_events (event_name, track_id, start_date_local, end_date_local, race_lookup)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$name, $trackId, $startDate, $endDate, $raceLookup ?: null]);
    $id = (int)$pdo->lastInsertId();

    rsa_jsonResponse([
        'id' => $id,
        'eventName' => $name,
        'trackId' => $trackId,
        'startDateLocal' => $startDate,
        'endDateLocal' => $endDate,
        'raceLookup' => $raceLookup ?: null,
    ]);
}

// ============================================================================
// GET ?action=tracks
// ============================================================================

function handleListTracks(PDO $pdo): void {
    $rows = $pdo->query("SELECT id, track_name, timezone_iana, created_at FROM parity_tracks ORDER BY track_name")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) { $r['id'] = (int)$r['id']; }
    rsa_jsonResponse(['tracks' => $rows]);
}

// ============================================================================
// GET ?action=events
// ============================================================================

function handleListEvents(PDO $pdo): void {
    $rows = $pdo->query("
        SELECT e.id, e.event_name, e.track_id, t.track_name, t.timezone_iana,
               e.start_date_local, e.end_date_local, e.race_lookup, e.created_at
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        ORDER BY e.start_date_local DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['track_id'] = (int)$r['track_id'];
    }
    rsa_jsonResponse(['events' => $rows]);
}

// ============================================================================
// POST ?action=weatherBackfill
// Body: { "eventId": 1, "fromDateLocal"?: "YYYY-MM-DD", "toDateLocal"?: "YYYY-MM-DD", "minRowsPerDay"?: 24 }
// ============================================================================

function handleWeatherBackfill(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    $minRowsPerDay = (int)($input['minRowsPerDay'] ?? 24);

    if ($eventId <= 0) {
        rsa_jsonResponse(['error' => 'eventId is required'], 400);
    }

    // Load event + track
    $stmt = $pdo->prepare("
        SELECT e.id, e.start_date_local, e.end_date_local,
               t.id AS track_id, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) {
        rsa_jsonResponse(['error' => "Event $eventId not found"], 404);
    }

    $tz = $event['timezone_iana'];
    $fromDate = trim($input['fromDateLocal'] ?? $event['start_date_local']);
    $toDate = trim($input['toDateLocal'] ?? $event['end_date_local']);

    // Cap toDate to today in the event's timezone
    $todayLocal = (new DateTime('now', new DateTimeZone($tz)))->format('Y-m-d');
    if ($toDate > $todayLocal) {
        $toDate = $todayLocal;
    }

    // Get Tempest config
    try {
        $config = parity_getTempestConfig();
    } catch (RuntimeException $e) {
        rsa_jsonResponse(['error' => $e->getMessage()], 500);
    }

    // Prepare insert statement
    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'tempest')
    ");

    $daysChecked = 0;
    $daysFetched = 0;
    $rowsInserted = 0;
    $rowsDeduped = 0;
    $errors = [];

    // Iterate each day in range
    $current = new DateTime($fromDate);
    $end = new DateTime($toDate);

    while ($current <= $end) {
        $daysChecked++;
        $dateStr = $current->format('Y-m-d');

        // Check existing rows for this day
        $range = parity_localDateToUtcRange($dateStr, $tz);
        $utcStart = gmdate('Y-m-d H:i:s', $range['start_epoch']);
        $utcEnd = gmdate('Y-m-d H:i:s', $range['end_epoch']);

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM parity_weather_samples
            WHERE event_id = ? AND timestamp_utc BETWEEN ? AND ?
        ");
        $countStmt->execute([$eventId, $utcStart, $utcEnd]);
        $existing = (int)$countStmt->fetchColumn();

        if ($existing >= $minRowsPerDay) {
            $current->modify('+1 day');
            continue;
        }

        // Fetch from Tempest
        $daysFetched++;
        try {
            $samples = parity_fetchTempest(
                $range['start_epoch'],
                $range['end_epoch'],
                $config['bucket_minutes'],
                $config['station_id'],
                $config['api_key']
            );
        } catch (RuntimeException $e) {
            $errors[] = "$dateStr: " . $e->getMessage();
            $current->modify('+1 day');
            continue;
        }

        foreach ($samples as $s) {
            $tsUtc = gmdate('Y-m-d H:i:s', $s['timestamp_epoch']);

            // Compute local time for this event
            $utcDt = new DateTimeImmutable("@{$s['timestamp_epoch']}");
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $localStr = $localDt->format('Y-m-d H:i:s');

            $tempF = parity_cToF($s['temp_c']);

            try {
                $stmtInsert->execute([
                    $tsUtc,
                    $eventId,
                    (int)$event['track_id'],
                    $localStr,
                    $s['temp_c'],
                    $tempF,
                    $s['rh_pct'],
                    $s['station_pressure_raw'],
                ]);
                $rowsInserted++;
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false) {
                    $rowsDeduped++;
                } else {
                    throw $e;
                }
            }
        }

        $current->modify('+1 day');
    }

    rsa_jsonResponse([
        'eventId' => $eventId,
        'fromDateLocal' => $fromDate,
        'toDateLocal' => $toDate,
        'timezone' => $tz,
        'daysChecked' => $daysChecked,
        'daysFetched' => $daysFetched,
        'rowsInserted' => $rowsInserted,
        'rowsDeduped' => $rowsDeduped,
        'errors' => $errors,
    ]);
}

// ============================================================================
// POST ?action=weatherBuildCanonical
// Body: { "startUtc"?: "2025-10-30T00:00:00Z", "endUtc"?: "2025-11-02T23:59:59Z", "bucketMinutes"?: 30 }
// ============================================================================

function handleWeatherBuildCanonical(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $bucketMinutes = (int)($input['bucketMinutes'] ?? 30);

    // Determine time range from samples if not specified
    if (!empty($input['startUtc'])) {
        $startUtc = date('Y-m-d H:i:s', strtotime($input['startUtc']));
    } else {
        $startUtc = $pdo->query("SELECT MIN(timestamp_utc) FROM parity_weather_samples")->fetchColumn();
    }
    if (!empty($input['endUtc'])) {
        $endUtc = date('Y-m-d H:i:s', strtotime($input['endUtc']));
    } else {
        $endUtc = $pdo->query("SELECT MAX(timestamp_utc) FROM parity_weather_samples")->fetchColumn();
    }

    if (!$startUtc || !$endUtc) {
        rsa_jsonResponse(['error' => 'No weather samples found. Run weatherBackfill first.'], 400);
    }

    $bucketSeconds = $bucketMinutes * 60;

    // Generate bucket timestamps
    $startEpoch = strtotime($startUtc);
    $endEpoch = strtotime($endUtc);

    // Align start to bucket boundary
    $startEpoch = (int)(floor($startEpoch / $bucketSeconds) * $bucketSeconds);

    $stmtSample = $pdo->prepare("
        SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc,
               ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY delta_s ASC
        LIMIT 1
    ");

    $stmtUpsert = $pdo->prepare("
        INSERT INTO parity_weather_canonical (timestamp_utc, temp_f, rh_pct, pressure_inhg)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            temp_f = VALUES(temp_f),
            rh_pct = VALUES(rh_pct),
            pressure_inhg = VALUES(pressure_inhg)
    ");

    $bucketsCreated = 0;
    $bucketsUpdated = 0;
    $tolerance = $bucketMinutes; // tolerance = 1 bucket width

    for ($epoch = $startEpoch; $epoch <= $endEpoch; $epoch += $bucketSeconds) {
        $bucketTs = gmdate('Y-m-d H:i:s', $epoch);

        $stmtSample->execute([$bucketTs, $bucketTs, $tolerance, $bucketTs, $tolerance]);
        $sample = $stmtSample->fetch(PDO::FETCH_ASSOC);

        if (!$sample) continue;

        $pressInhg = parity_mbToInhg(
            $sample['station_pressure_raw'] !== null ? (float)$sample['station_pressure_raw'] : null
        );
        $tempF = $sample['temp_f'] !== null ? (float)$sample['temp_f'] : null;
        $rhPct = $sample['rh_pct'] !== null ? (float)$sample['rh_pct'] : null;

        $stmtUpsert->execute([$bucketTs, $tempF, $rhPct, $pressInhg]);
        $bucketsCreated++;
    }

    rsa_jsonResponse([
        'startUtc' => gmdate('Y-m-d H:i:s', $startEpoch),
        'endUtc' => $endUtc,
        'bucketMinutes' => $bucketMinutes,
        'bucketsProcessed' => $bucketsCreated,
    ]);
}

// ============================================================================
// GET ?action=runsWithWeather&raceLookup=YYYYMMDD&windowMinutes=10&...
// ============================================================================

function handleRunsWithWeather(PDO $pdo): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (!$raceLookup) {
        rsa_jsonResponse(['error' => 'raceLookup is required'], 400);
    }

    $windowMinutes = (int)($_GET['windowMinutes'] ?? 30);

    // Build WHERE for runs (reuse existing filter logic)
    $where = ['r.race_lookup = ?'];
    $params = [$raceLookup];

    if (!empty($_GET['classIndex'])) {
        $where[] = 'r.class_index = ?';
        $params[] = $_GET['classIndex'];
    }
    if (!empty($_GET['driverName'])) {
        $where[] = 'r.driver_name LIKE ?';
        $params[] = '%' . $_GET['driverName'] . '%';
    }
    if (isset($_GET['lane']) && $_GET['lane'] !== '') {
        $where[] = 'r.lane = ?';
        $params[] = $_GET['lane'];
    }
    if (isset($_GET['round']) && $_GET['round'] !== '') {
        $where[] = 'r.round = ?';
        $params[] = $_GET['round'];
    }

    $limit = min((int)($_GET['limit'] ?? 200), 2000);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $whereClause = implode(' AND ', $where);

    // Query runs
    $stmt = $pdo->prepare("
        SELECT r.uuid, r.race_lookup, r.run_timestamp_utc, r.category, r.class_index,
               r.round, r.lane, r.driver_name, r.car_number, r.dial_in, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.mov, r.place, r.source_ref
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY COALESCE(r.run_timestamp_utc, r.created_at) ASC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each run, find nearest canonical weather
    $stmtWeather = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
               TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
        FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
        LIMIT 1
    ");

    $joinedCount = 0;
    foreach ($runs as &$run) {
        // Cast numeric fields
        foreach (['dial_in','rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320','mov'] as $f) {
            if ($run[$f] !== null) $run[$f] = (float)$run[$f];
        }
        foreach (['win_flag','dq_flag'] as $f) {
            if ($run[$f] !== null) $run[$f] = (bool)(int)$run[$f];
        }

        $run['weather'] = null;
        $ts = $run['run_timestamp_utc'];
        if ($ts) {
            $stmtWeather->execute([$ts, $ts, $windowMinutes, $ts, $windowMinutes, $ts]);
            $w = $stmtWeather->fetch(PDO::FETCH_ASSOC);
            if ($w) {
                $run['weather'] = [
                    'timestamp_utc' => $w['timestamp_utc'],
                    'temp_f' => $w['temp_f'] !== null ? (float)$w['temp_f'] : null,
                    'rh_pct' => $w['rh_pct'] !== null ? (float)$w['rh_pct'] : null,
                    'pressure_inhg' => $w['pressure_inhg'] !== null ? (float)$w['pressure_inhg'] : null,
                    'delta_seconds' => (int)$w['delta_seconds'],
                ];
                $joinedCount++;
            }
        }
    }

    // Total count
    $countParams = array_slice($params, 0);
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs r WHERE $whereClause");
    $countStmt->execute($countParams);
    $total = (int)$countStmt->fetchColumn();

    rsa_jsonResponse([
        'runs' => $runs,
        'total' => $total,
        'joinedCount' => $joinedCount,
        'windowMinutes' => $windowMinutes,
        'limit' => $limit,
        'offset' => $offset,
        'raceLookup' => $raceLookup,
    ]);
}

// ============================================================================
// GET ?action=weatherSamples&eventId=1&limit=100
// ============================================================================

function handleWeatherSamples(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $limit = min((int)($_GET['limit'] ?? 200), 2000);

    $where = [];
    $params = [];
    if ($eventId > 0) {
        $where[] = 'event_id = ?';
        $params[] = $eventId;
    }
    if (!empty($_GET['fromUtc'])) {
        $where[] = 'timestamp_utc >= ?';
        $params[] = $_GET['fromUtc'];
    }
    if (!empty($_GET['toUtc'])) {
        $where[] = 'timestamp_utc <= ?';
        $params[] = $_GET['toUtc'];
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $stmt = $pdo->prepare("
        SELECT id, timestamp_utc, event_id, track_id, event_local_time,
               temp_c, temp_f, rh_pct, station_pressure_raw, source, created_at
        FROM parity_weather_samples
        $whereClause
        ORDER BY timestamp_utc ASC
        LIMIT ?
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        if ($r['event_id'] !== null) $r['event_id'] = (int)$r['event_id'];
        if ($r['track_id'] !== null) $r['track_id'] = (int)$r['track_id'];
        foreach (['temp_c','temp_f','rh_pct','station_pressure_raw'] as $f) {
            if ($r[$f] !== null) $r[$f] = (float)$r[$f];
        }
    }

    rsa_jsonResponse(['samples' => $rows, 'count' => count($rows)]);
}

// ============================================================================
// GET ?action=weatherCanonical&limit=200
// ============================================================================

function handleWeatherCanonical(PDO $pdo): void {
    $limit = min((int)($_GET['limit'] ?? 200), 2000);
    $where = [];
    $params = [];

    if (!empty($_GET['fromUtc'])) {
        $where[] = 'timestamp_utc >= ?';
        $params[] = $_GET['fromUtc'];
    }
    if (!empty($_GET['toUtc'])) {
        $where[] = 'timestamp_utc <= ?';
        $params[] = $_GET['toUtc'];
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $stmt = $pdo->prepare("
        SELECT id, timestamp_utc, temp_f, rh_pct, pressure_inhg, created_at
        FROM parity_weather_canonical
        $whereClause
        ORDER BY timestamp_utc ASC
        LIMIT ?
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        foreach (['temp_f','rh_pct','pressure_inhg'] as $f) {
            if ($r[$f] !== null) $r[$f] = (float)$r[$f];
        }
    }

    rsa_jsonResponse(['canonical' => $rows, 'count' => count($rows)]);
}
