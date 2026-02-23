<?php
/**
 * NHRA Tech Parity API
 *
 * Endpoints:
 *   POST ?action=ingest    — Fetch & ingest NHRA run results from OData feed
 *   GET  ?action=runs      — Query normalized parity runs
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
    default:
        rsa_jsonResponse(['error' => 'Invalid action. Use: ingest, runs'], 400);
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

    rsa_jsonResponse([
        'raceLookup' => $raceLookup,
        'importId' => $importUuid,
        'rowsFetched' => count($rows),
        'rowsInserted' => $rowsInserted,
        'rowsDeduped' => $rowsDeduped,
    ]);
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

    // Get total count for this query
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE " . implode(' AND ', array_slice($where, 0, -0)));
    // Re-execute without limit/offset params
    $countParams = array_slice($params, 0, -2);
    $countWhere = implode(' AND ', array_map(fn($w) => $w, $where));
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE $countWhere");
    // We need to rebuild params without limit/offset
    $countParams = array_slice($params, 0, count($params) - 2);
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
