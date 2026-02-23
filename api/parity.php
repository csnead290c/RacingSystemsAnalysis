<?php
/**
 * NHRA Tech Parity API
 *
 * Endpoints:
 *   POST ?action=ingest              — Fetch & ingest NHRA run results from OData feed
 *   GET  ?action=runs                — Query normalized parity runs
 *   GET  ?action=peek                — Lightweight probe: detect JSON shape + first row keys/sample
 *   GET  ?action=suggestRaceLookups  — Scan candidate dates for a year to find valid events
 *   GET  ?action=imports             — List import history
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
    default:
        rsa_jsonResponse(['error' => 'Invalid action. Use: ingest, runs, peek, suggestRaceLookups, imports'], 400);
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
