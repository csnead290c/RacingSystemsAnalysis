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
require_once __DIR__ . '/parity_weather_provider.php';

// Weather correction model constants (must be defined before routing)
define('PARITY_STD_TEMP_F',     60.0);   // °F
define('PARITY_STD_PRESS_INHG', 29.92);  // inHg station pressure
define('PARITY_STD_RH_PCT',     0.0);    // %
define('PARITY_INHG_TO_MB',     33.8639);
define('PARITY_CORRECTION_MODEL_VERSION', 'v1-density-ratio');

rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// ── Auth + capability gate ──────────────────────────────────────────────
$auth = rsa_requireAuth();
$userId = rsa_requireAuthAndCap($pdo, $auth, 'nhra.parity');

// ── Routing ─────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? '';

try {

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
    case 'topByEvent':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleTopByEvent($pdo);
        break;
    case 'ingestMany':
        if ($method !== 'POST') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleIngestMany($pdo, $userId, $auth);
        break;
    case 'eventCatalog':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleEventCatalog($pdo);
        break;
    case 'upsertEventCatalog':
        if ($method !== 'POST') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleUpsertEventCatalog($pdo);
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
    // ── Schedule scraper + event-driven actions ─────────────────────────
    case 'scrapeNhraSchedule':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleScrapeNhraSchedule($pdo, $userId, $auth);
        break;
    case 'ingestEventRuns':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleIngestEventRuns($pdo, $userId, $auth);
        break;
    case 'backfillEventWeather':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillEventWeather($pdo, $userId, $auth);
        break;
    case 'flagRun':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleFlagRun($pdo, $userId);
        break;
    case 'unflagRun':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUnflagRun($pdo, $userId);
        break;
    case 'runFlags':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleRunFlags($pdo);
        break;
    case 'eventsWithStats':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleEventsWithStats($pdo);
        break;
    // ── Parity analysis + results ─────────────────────────────────────
    case 'eventParitySummary':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleEventParitySummary($pdo);
        break;
    case 'qualSheet':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleQualSheet($pdo);
        break;
    case 'ladder':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleLadder($pdo);
        break;
    // ── Backfill job actions ────────────────────────────────────────────
    case 'startBackfillRuns':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleStartBackfillRuns($pdo, $userId, $auth);
        break;
    case 'startBackfillWeather':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleStartBackfillWeather($pdo, $userId, $auth);
        break;
    case 'resumeBackfill':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleResumeBackfill($pdo, $userId, $auth);
        break;
    case 'cancelBackfill':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCancelBackfill($pdo, $auth);
        break;
    case 'backfillStatus':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillStatus($pdo);
        break;
    case 'backfillJobs':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillJobs($pdo);
        break;
    // ── Admin CRUD endpoints ─────────────────────────────────────────────
    case 'listTracksWithStats':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListTracksWithStats($pdo);
        break;
    case 'updateTrack':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpdateTrack($pdo, $auth);
        break;
    case 'mergeTracks':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleMergeTracks($pdo, $auth);
        break;
    case 'updateEvent':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpdateEvent($pdo, $auth);
        break;
    case 'bulkCreateEvents':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBulkCreateEvents($pdo, $auth);
        break;
    case 'listClassAliases':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListClassAliases($pdo);
        break;
    case 'addClassAlias':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleAddClassAlias($pdo, $auth);
        break;
    case 'deleteClassAlias':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteClassAlias($pdo, $auth);
        break;
    // ── Engine Combo endpoints ────────────────────────────────────────────
    case 'listEngineCombos':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListEngineCombos($pdo);
        break;
    case 'upsertEngineCombo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpsertEngineCombo($pdo, $auth);
        break;
    case 'deleteEngineCombo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteEngineCombo($pdo, $auth);
        break;
    // ── Driver Combo endpoints ────────────────────────────────────────────
    case 'listDriverCombos':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListDriverCombos($pdo);
        break;
    case 'upsertDriverCombo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpsertDriverCombo($pdo, $auth);
        break;
    case 'deleteDriverCombo':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteDriverCombo($pdo, $auth);
        break;
    // ── Class Default Combo endpoints ────────────────────────────────────────
    case 'listClassDefaults':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListClassDefaults($pdo);
        break;
    case 'upsertClassDefault':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpsertClassDefault($pdo, $auth);
        break;
    case 'deleteClassDefault':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteClassDefault($pdo, $auth);
        break;
    // ── Assign Combos helper endpoints ───────────────────────────────────────
    case 'driversAtEvent':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDriversAtEvent($pdo);
        break;
    case 'bulkUpsertDriverCombos':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBulkUpsertDriverCombos($pdo, $auth);
        break;
    case 'backfillWeatherCsv':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillWeatherCsv($pdo, $auth);
        break;
    case 'backfillWeatherProvider':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillWeatherProvider($pdo, $auth);
        break;
    // ── Weather reliability endpoints ────────────────────────────────────
    case 'weatherCoverage':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherCoverage($pdo);
        break;
    case 'weatherHealthBackfill':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherHealthBackfill($pdo, $auth);
        break;
    case 'weatherHealthRebuild':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherHealthRebuild($pdo, $auth);
        break;
    case 'updateTrackCoords':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpdateTrackCoords($pdo, $auth);
        break;
    case 'importStationCsv':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleImportStationCsv($pdo, $auth);
        break;
    // ── Dashboard endpoints ──────────────────────────────────────────────
    case 'eventSummary':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleEventSummary($pdo);
        break;
    case 'drivers':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDrivers($pdo);
        break;
    case 'runsByDriver':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleRunsByDriver($pdo);
        break;
    case 'weatherTimeseries':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleWeatherTimeseries($pdo);
        break;
    case 'parityByCombo':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParityByCombo($pdo);
        break;
    case 'paritySummary':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParitySummary($pdo);
        break;
    case 'parityDeltas':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParityDeltas($pdo);
        break;
    case 'parityAllRuns':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParityAllRuns($pdo);
        break;
    case 'parityQualOrder':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParityQualOrder($pdo);
        break;
    case 'rangeParityMatrix':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleRangeParityMatrix($pdo);
        break;
    case 'parityIncrementals':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParityIncrementals($pdo);
        break;
    case 'paritySessionWeather':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParitySessionWeather($pdo);
        break;
    case 'paritySmokeTest':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleParitySmokeTest($pdo, $auth);
        break;
    case 'trackCoordCoverage':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleTrackCoordCoverage($pdo, $auth);
        break;
    case 'bulkUpdateTrackCoords':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBulkUpdateTrackCoords($pdo, $auth);
        break;
    case 'batchWeatherBackfill':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBatchWeatherBackfill($pdo, $auth);
        break;
    case 'backfillRunUtcFromLocal':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleBackfillRunUtcFromLocal($pdo, $auth);
        break;
    case 'listOrphanRuns':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListOrphanRuns($pdo, $auth);
        break;
    case 'timeSmokeTest':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleTimeSmokeTest($pdo, $auth);
        break;
    case 'timeDiagnosticsSample':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleTimeDiagnosticsSample($pdo, $auth);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

} catch (Throwable $e) {
    error_log('parity.php unhandled exception [' . $action . ']: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    rsa_jsonResponse(['error' => 'Internal server error', 'detail' => $e->getMessage()], 500);
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

    // Look up track timezone for this raceLookup so we can convert local→UTC.
    // If no event is linked yet, fall back to America/New_York.
    $trackTz = 'America/New_York';
    $tzStmt = $pdo->prepare("
        SELECT t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.race_lookup = ?
        LIMIT 1
    ");
    $tzStmt->execute([$raceLookup]);
    $tzRow = $tzStmt->fetch(PDO::FETCH_ASSOC);
    if ($tzRow && !empty($tzRow['timezone_iana'])) {
        $trackTz = $tzRow['timezone_iana'];
    }

    // Prepare statements
    // NOTE: parity_runs_raw INSERT removed in v7 optimization — raw JSON was redundant
    // Dedup handled by parity_runs unique index uk_pr_race_hash(race_lookup, row_hash)
    $stmtRun = $pdo->prepare("
        INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, run_time_local, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $rowsInserted = 0;
    $rowsDeduped = 0;

    foreach ($rows as $raw) {
        $normalized = parity_normalizeRow($raw, $raceLookup);
        $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);

        // The normalizer returns local wall-clock time in 'run_timestamp_utc' (legacy key).
        // We now store it correctly in run_time_local and compute true UTC.
        $localTime = $normalized['run_timestamp_utc']; // This is actually local time
        $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;

        // Insert normalized row (skip if duplicate race_lookup + row_hash)
        try {
            $stmtRun->execute([
                parity_generateUUID(),
                $importId,
                $raceLookup,
                $utcTime,
                $localTime,
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

    $where = ['r.race_lookup = ?'];
    $params = [$raceLookup];

    // Exclude bad-flagged runs by default (pass includeBad=1 to include)
    $includeBad = (int)($_GET['includeBad'] ?? 0);
    if (!$includeBad) {
        $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
    }

    // Optional filters (expand class aliases)
    if (!empty($_GET['classIndex'])) {
        $expanded = parity_expandClassIndex($pdo, trim($_GET['classIndex']));
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $where[] = "r.class_index IN ($ph)";
        $params = array_merge($params, $expanded);
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
    if (isset($_GET['dq'])) {
        $dq = strtolower($_GET['dq']);
        if ($dq === 'exclude') {
            $where[] = '(r.dq_flag IS NULL OR r.dq_flag = 0)';
        } elseif ($dq === 'only') {
            $where[] = 'r.dq_flag = 1';
        }
        // 'include' or anything else = no filter
    }

    $limit = min((int)($_GET['limit'] ?? 500), 5000);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    $whereClause = implode(' AND ', $where);
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local, r.category, r.class_index, r.round, r.lane,
               r.driver_name, r.car_number, r.dial_in, r.rt, r.ft60, r.ft330, r.ft660, r.mph660,
               r.ft1000, r.mph1000, r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.mov, r.place,
               r.source_ref, r.created_at
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY COALESCE(r.run_time_local, r.run_timestamp_utc, r.created_at) ASC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast numeric fields
    foreach ($rows as &$row) {
        $row['id'] = (int)$row['id'];
        foreach (['dial_in','rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320','mov'] as $f) {
            if ($row[$f] !== null) $row[$f] = (float)$row[$f];
        }
        foreach (['win_flag','dq_flag'] as $f) {
            if ($row[$f] !== null) $row[$f] = (bool)(int)$row[$f];
        }
    }

    // Get total count for this query (params without limit/offset)
    $countParams = array_slice($params, 0, count($params) - 2);
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs r WHERE $whereClause");
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
// GET ?action=topByEvent&classIndex=TF&metric=mph1320&startRaceLookup=&endRaceLookup=
//     &includeDQ=0&minRunCount=1&limit=500
// DB-only: aggregate best value per event for charting
// LEFT JOINs parity_event_catalog for event names/tracks.
// ============================================================================

function handleTopByEvent(PDO $pdo): void {
    $classIndex = trim($_GET['classIndex'] ?? '');
    $metric = trim($_GET['metric'] ?? '');

    if (!$classIndex) {
        rsa_jsonResponse(['error' => 'classIndex is required (e.g. TF, FC, PS)'], 400);
    }
    $allowedMetrics = ['mph1320', 'ft1320', 'corrected_ft1320'];
    if (!in_array($metric, $allowedMetrics, true)) {
        rsa_jsonResponse(['error' => 'metric must be one of: ' . implode(', ', $allowedMetrics)], 400);
    }

    // includeDQ: 0 = exclude DQ'd runs (default), 1 = include all
    $includeDQ = (int)($_GET['includeDQ'] ?? 0);
    // minRunCount: filter out events with fewer qualifying runs (default 1)
    $minRunCount = max(1, (int)($_GET['minRunCount'] ?? 1));
    // Exclude bad-flagged runs by default
    $includeBad = (int)($_GET['includeBad'] ?? 0);

    // ── corrected_ft1320: requires per-run weather join + correction ──
    if ($metric === 'corrected_ft1320') {
        $expandedPS = parity_expandClassIndex($pdo, $classIndex);
        $phPS = implode(',', array_fill(0, count($expandedPS), '?'));
        $where = ["r.class_index IN ($phPS)", 'r.ft1320 IS NOT NULL', 'r.ft1320 > 0'];
        $params = $expandedPS;
        if (!$includeDQ) $where[] = '(r.dq_flag IS NULL OR r.dq_flag = 0)';
        if (!$includeBad) $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
        if (!empty($_GET['startRaceLookup'])) { $where[] = 'r.race_lookup >= ?'; $params[] = $_GET['startRaceLookup']; }
        if (!empty($_GET['endRaceLookup']))   { $where[] = 'r.race_lookup <= ?'; $params[] = $_GET['endRaceLookup']; }
        $whereClause = implode(' AND ', $where);

        $sql = "
            SELECT r.id, r.race_lookup, r.ft1320, r.run_timestamp_utc
            FROM parity_runs r
            WHERE {$whereClause}
            ORDER BY r.race_lookup ASC, r.ft1320 ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $allRuns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Weather join (reuse prepared stmt)
        $windowMinutes = 30;
        $stmtW = $pdo->prepare("
            SELECT temp_f, rh_pct, pressure_inhg
            FROM parity_weather_canonical
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
            LIMIT 1
        ");

        // Group by race_lookup, compute best corrected ET per event
        $eventMap = []; // raceLookup => [correctedETs]
        foreach ($allRuns as $run) {
            $rl = $run['race_lookup'];
            $ts = $run['run_timestamp_utc'];
            $et = (float)$run['ft1320'];
            $corrected = null;
            if ($ts) {
                $stmtW->execute([$ts, $windowMinutes, $ts, $windowMinutes, $ts]);
                $w = $stmtW->fetch(PDO::FETCH_ASSOC);
                if ($w) {
                    $factor = parity_correctionFactor(
                        $w['temp_f'] !== null ? (float)$w['temp_f'] : null,
                        $w['pressure_inhg'] !== null ? (float)$w['pressure_inhg'] : null,
                        $w['rh_pct'] !== null ? (float)$w['rh_pct'] : null
                    );
                    if ($factor !== null) $corrected = round($et * $factor, 4);
                }
            }
            if (!isset($eventMap[$rl])) $eventMap[$rl] = ['corrected' => [], 'actual' => []];
            if ($corrected !== null) $eventMap[$rl]['corrected'][] = $corrected;
            $eventMap[$rl]['actual'][] = $et;
        }

        // Build rows with catalog info
        $catalogStmt = $pdo->prepare("SELECT event_name, track_name, season_year FROM parity_event_catalog WHERE race_lookup = ?");
        $rows = [];
        foreach ($eventMap as $rl => $data) {
            $runCount = count($data['actual']);
            if ($runCount < $minRunCount) continue;
            $bestCorrected = count($data['corrected']) > 0 ? min($data['corrected']) : null;
            $bestActual = min($data['actual']);
            $catalogStmt->execute([$rl]);
            $cat = $catalogStmt->fetch(PDO::FETCH_ASSOC);
            $rows[] = [
                'raceLookup' => $rl,
                'value' => $bestCorrected,
                'actualValue' => $bestActual,
                'runCount' => $runCount,
                'correctedCount' => count($data['corrected']),
                'eventName' => ($cat && $cat['event_name']) ? $cat['event_name'] : null,
                'trackName' => ($cat && $cat['track_name']) ? $cat['track_name'] : null,
                'seasonYear' => ($cat && $cat['season_year'] !== null) ? (int)$cat['season_year'] : null,
            ];
        }

        rsa_jsonResponse([
            'classIndex' => $classIndex,
            'metric' => $metric,
            'aggregation' => 'MIN',
            'includeDQ' => (bool)$includeDQ,
            'minRunCount' => $minRunCount,
            'correction_model_version' => PARITY_CORRECTION_MODEL_VERSION,
            'rows' => $rows,
        ]);
        return;
    }

    // ── Standard metrics (ft1320, mph1320) ──
    $agg = $metric === 'mph1320' ? 'MAX' : 'MIN';

    $expandedStd = parity_expandClassIndex($pdo, $classIndex);
    $phStd = implode(',', array_fill(0, count($expandedStd), '?'));
    $where = ["r.class_index IN ($phStd)", "r.{$metric} IS NOT NULL", "r.{$metric} > 0"];
    $params = $expandedStd;

    if (!$includeDQ) {
        $where[] = '(r.dq_flag IS NULL OR r.dq_flag = 0)';
    }
    if (!$includeBad) {
        $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
    }

    if (!empty($_GET['startRaceLookup'])) {
        $where[] = 'r.race_lookup >= ?';
        $params[] = $_GET['startRaceLookup'];
    }
    if (!empty($_GET['endRaceLookup'])) {
        $where[] = 'r.race_lookup <= ?';
        $params[] = $_GET['endRaceLookup'];
    }

    $limit = min((int)($_GET['limit'] ?? 500), 2000);

    $whereClause = implode(' AND ', $where);

    // HAVING clause for minRunCount
    $havingClause = $minRunCount > 1 ? "HAVING COUNT(*) >= {$minRunCount}" : '';

    $params[] = $limit;

    $sql = "
        SELECT r.race_lookup AS raceLookup,
               {$agg}(r.{$metric}) AS value,
               COUNT(*) AS runCount,
               ec.event_name AS eventName,
               ec.track_name AS trackName,
               ec.season_year AS seasonYear
        FROM parity_runs r
        LEFT JOIN parity_event_catalog ec ON ec.race_lookup = r.race_lookup
        WHERE {$whereClause}
        GROUP BY r.race_lookup, ec.event_name, ec.track_name, ec.season_year
        {$havingClause}
        ORDER BY r.race_lookup ASC
        LIMIT ?
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['value'] = (float)$r['value'];
        $r['runCount'] = (int)$r['runCount'];
        $r['seasonYear'] = $r['seasonYear'] !== null ? (int)$r['seasonYear'] : null;
        if ($r['eventName'] === '' || $r['eventName'] === null) $r['eventName'] = null;
        if ($r['trackName'] === '' || $r['trackName'] === null) $r['trackName'] = null;
    }

    rsa_jsonResponse([
        'classIndex' => $classIndex,
        'metric' => $metric,
        'aggregation' => $agg,
        'includeDQ' => (bool)$includeDQ,
        'minRunCount' => $minRunCount,
        'rows' => $rows,
    ]);
}

// ============================================================================
// GET ?action=eventCatalog&startYear=2024&endYear=2025
// ============================================================================

function handleEventCatalog(PDO $pdo): void {
    $where = [];
    $params = [];

    if (!empty($_GET['startYear'])) {
        $where[] = 'season_year >= ?';
        $params[] = (int)$_GET['startYear'];
    }
    if (!empty($_GET['endYear'])) {
        $where[] = 'season_year <= ?';
        $params[] = (int)$_GET['endYear'];
    }
    if (!empty($_GET['raceLookup'])) {
        $where[] = 'race_lookup = ?';
        $params[] = $_GET['raceLookup'];
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $pdo->prepare("
        SELECT race_lookup AS raceLookup, event_name AS eventName, track_name AS trackName,
               season_year AS seasonYear, start_date_local AS startDateLocal,
               end_date_local AS endDateLocal, created_at AS createdAt, updated_at AS updatedAt
        FROM parity_event_catalog
        $whereClause
        ORDER BY race_lookup ASC
        LIMIT 500
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['seasonYear'] = (int)$r['seasonYear'];
    }

    rsa_jsonResponse(['events' => $rows, 'count' => count($rows)]);
}

// ============================================================================
// POST ?action=upsertEventCatalog
// Body: { raceLookup, eventName, trackName, seasonYear, startDateLocal?, endDateLocal? }
// ============================================================================

function handleUpsertEventCatalog(PDO $pdo): void {
    $input = rsa_getJsonInput();
    $raceLookup = trim($input['raceLookup'] ?? '');
    $eventName = trim($input['eventName'] ?? '');
    $trackName = trim($input['trackName'] ?? '');
    $seasonYear = (int)($input['seasonYear'] ?? 0);
    $startDateLocal = !empty($input['startDateLocal']) ? $input['startDateLocal'] : null;
    $endDateLocal = !empty($input['endDateLocal']) ? $input['endDateLocal'] : null;

    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup must be YYYYMMDD'], 400);
    }
    if (!$eventName) {
        rsa_jsonResponse(['error' => 'eventName is required'], 400);
    }
    if ($seasonYear < 2000 || $seasonYear > 2100) {
        rsa_jsonResponse(['error' => 'seasonYear must be between 2000 and 2100'], 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO parity_event_catalog (race_lookup, event_name, track_name, season_year, start_date_local, end_date_local)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            event_name = VALUES(event_name),
            track_name = VALUES(track_name),
            season_year = VALUES(season_year),
            start_date_local = VALUES(start_date_local),
            end_date_local = VALUES(end_date_local)
    ");
    $stmt->execute([$raceLookup, $eventName, $trackName, $seasonYear, $startDateLocal, $endDateLocal]);

    rsa_jsonResponse([
        'raceLookup' => $raceLookup,
        'eventName' => $eventName,
        'trackName' => $trackName,
        'seasonYear' => $seasonYear,
        'startDateLocal' => $startDateLocal,
        'endDateLocal' => $endDateLocal,
    ]);
}

// ============================================================================
// POST ?action=ingestMany
// Body: { "raceLookups": ["20251030","20250320",...], "force": false, "throttleMs": 500 }
// Owner/admin only — batch ingest with throttle
// ============================================================================

function handleIngestMany(PDO $pdo, int $userId, array $auth): void {
    // Require owner or admin role
    $role = $auth['role'] ?? '';
    if (!in_array($role, ['owner', 'admin'], true)) {
        rsa_jsonResponse(['error' => 'ingestMany requires owner or admin role'], 403);
    }

    $input = rsa_getJsonInput();
    $raceLookups = $input['raceLookups'] ?? [];
    $force = (bool)($input['force'] ?? false);
    $throttleMs = max(100, min(2000, (int)($input['throttleMs'] ?? 500)));

    if (!is_array($raceLookups) || empty($raceLookups)) {
        rsa_jsonResponse(['error' => 'raceLookups must be a non-empty array of YYYYMMDD strings'], 400);
    }
    if (count($raceLookups) > 100) {
        rsa_jsonResponse(['error' => 'Maximum 100 raceLookups per batch'], 400);
    }

    // Validate all formats first
    foreach ($raceLookups as $rl) {
        if (!preg_match('/^\d{8}$/', $rl)) {
            rsa_jsonResponse(['error' => "Invalid raceLookup format: $rl"], 400);
        }
    }

    // Increase time limit for batch operations
    set_time_limit(300);

    $results = [];
    foreach ($raceLookups as $idx => $raceLookup) {
        $entry = [
            'raceLookup' => $raceLookup,
            'rowsFetched' => 0,
            'rowsInserted' => 0,
            'rowsDeduped' => 0,
            'status' => 'pending',
        ];

        // Check for existing import
        if (!$force) {
            $stmt = $pdo->prepare("
                SELECT uuid, row_count FROM parity_run_imports
                WHERE race_lookup = ? AND status = 'success'
                ORDER BY fetched_at_utc DESC LIMIT 1
            ");
            $stmt->execute([$raceLookup]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                $entry['status'] = 'skipped';
                $entry['reason'] = 'already imported (use force=true to reimport)';
                $entry['existingRowCount'] = (int)$existing['row_count'];
                $results[] = $entry;
                continue;
            }
        }

        $requestedAt = gmdate('Y-m-d H:i:s');
        $importUuid = parity_generateUUID();

        try {
            $result = parity_fetchODataResults($raceLookup);
            $rows = $result['rows'];
            $sourceUrl = $result['url'];
        } catch (Exception $e) {
            $pdo->prepare("
                INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, error_message, source_url, created_by_user_id)
                VALUES (?, ?, ?, ?, 'error', 0, ?, ?, ?)
            ")->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $e->getMessage(), "https://odata.nhradata.com/api/oGetResults/GetResults/{$raceLookup}", $userId]);

            $entry['status'] = 'error';
            $entry['error'] = $e->getMessage();
            $results[] = $entry;
            if ($idx < count($raceLookups) - 1) usleep($throttleMs * 1000);
            continue;
        }

        $entry['rowsFetched'] = count($rows);

        if (empty($rows)) {
            $pdo->prepare("
                INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
                VALUES (?, ?, ?, ?, 'success', 0, ?, ?)
            ")->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $sourceUrl, $userId]);

            $entry['status'] = 'empty';
            $results[] = $entry;
            if ($idx < count($raceLookups) - 1) usleep($throttleMs * 1000);
            continue;
        }

        // Create import record
        $fetchedAt = gmdate('Y-m-d H:i:s');
        $pdo->prepare("
            INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
            VALUES (?, ?, ?, ?, 'success', ?, ?, ?)
        ")->execute([$importUuid, $raceLookup, $requestedAt, $fetchedAt, count($rows), $sourceUrl, $userId]);
        $importId = (int)$pdo->lastInsertId();

        // ── Timezone: NHRA timestamps are event-local wall-clock time. ──
        // Look up track timezone so we can compute true UTC for weather joins.
        $trackTz = 'America/New_York'; // fallback
        $tzStmt = $pdo->prepare("
            SELECT t.timezone_iana FROM parity_events e
            JOIN parity_tracks t ON t.id = e.track_id
            WHERE e.race_lookup = ? LIMIT 1
        ");
        $tzStmt->execute([$raceLookup]);
        $tzRow = $tzStmt->fetch(PDO::FETCH_ASSOC);
        if ($tzRow && !empty($tzRow['timezone_iana'])) {
            $trackTz = $tzRow['timezone_iana'];
        }

        $stmtRun = $pdo->prepare("
            INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, run_time_local, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $inserted = 0;
        $deduped = 0;
        foreach ($rows as $raw) {
            $normalized = parity_normalizeRow($raw, $raceLookup);
            $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);
            // normalizer returns local wall-clock time in 'run_timestamp_utc' (legacy key name).
            // Store local in run_time_local; compute true UTC for weather joins.
            $localTime = $normalized['run_timestamp_utc'];
            $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;
            try {
                $stmtRun->execute([
                    parity_generateUUID(), $importId, $raceLookup,
                    $utcTime, $localTime,
                    $normalized['category'], $normalized['class_index'],
                    $normalized['round'], $normalized['lane'], $normalized['driver_name'],
                    $normalized['car_number'], $normalized['dial_in'], $normalized['rt'],
                    $normalized['ft60'], $normalized['ft330'], $normalized['ft660'], $normalized['mph660'],
                    $normalized['ft1000'], $normalized['mph1000'], $normalized['ft1320'], $normalized['mph1320'],
                    $normalized['win_flag'], $normalized['dq_flag'], $normalized['mov'],
                    $normalized['place'], $normalized['source_ref'], $rowHash,
                ]);
                $inserted++;
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false) { $deduped++; } else { throw $e; }
            }
        }

        $pdo->prepare("UPDATE parity_run_imports SET row_count = ? WHERE id = ?")->execute([$inserted, $importId]);

        $entry['rowsInserted'] = $inserted;
        $entry['rowsDeduped'] = $deduped;
        $entry['status'] = 'success';
        $results[] = $entry;

        // Throttle between requests (skip after last)
        if ($idx < count($raceLookups) - 1) {
            usleep($throttleMs * 1000);
        }
    }

    $summary = [
        'total' => count($results),
        'success' => count(array_filter($results, fn($r) => $r['status'] === 'success')),
        'skipped' => count(array_filter($results, fn($r) => $r['status'] === 'skipped')),
        'empty' => count(array_filter($results, fn($r) => $r['status'] === 'empty')),
        'error' => count(array_filter($results, fn($r) => $r['status'] === 'error')),
        'totalRowsInserted' => array_sum(array_column($results, 'rowsInserted')),
    ];

    rsa_jsonResponse([
        'summary' => $summary,
        'results' => $results,
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
    $throttleMs = max(200, min(5000, (int)($input['throttleMs'] ?? 500)));

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
    $daysNoData = 0;
    $rowsInserted = 0;
    $rowsDeduped = 0;
    $errors = [];

    // Iterate each day in range
    $current = new DateTime($fromDate);
    $end = new DateTime($toDate);
    $isFirstFetch = true;

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

        // Throttle between Tempest API calls (skip delay on first fetch)
        if (!$isFirstFetch) {
            usleep($throttleMs * 1000);
        }
        $isFirstFetch = false;

        // Fetch from Tempest (now returns {samples, httpCode, attempts})
        $daysFetched++;
        try {
            $result = parity_fetchTempest(
                $range['start_epoch'],
                $range['end_epoch'],
                $config['bucket_minutes'],
                $config['station_id'],
                $config['api_key']
            );
            $samples = $result['samples'];
        } catch (RuntimeException $e) {
            $errors[] = "$dateStr: " . $e->getMessage();
            $current->modify('+1 day');
            continue;
        }

        if (empty($samples)) {
            $daysNoData++;
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
        'daysNoData' => $daysNoData,
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

    // Safety check: verify provenance columns exist
    $hasProvenanceColumns = false;
    try {
        $stmt = $pdo->query("DESCRIBE parity_weather_canonical");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $hasProvenanceColumns = in_array('canonical_source_kind', $columns) &&
                                in_array('canonical_source_detail', $columns) &&
                                in_array('sample_count', $columns) &&
                                in_array('sample_sources_json', $columns);
    } catch (Exception $e) {
        // If we can't check, assume columns don't exist
        $hasProvenanceColumns = false;
    }

    if (!$hasProvenanceColumns) {
        rsa_jsonResponse(['error' => 'Provenance columns do not exist in parity_weather_canonical'], 500);
    }

    $bucketSeconds = $bucketMinutes * 60;

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

    // Query to get nearest sample (for backward compatibility)
    $stmtSample = $pdo->prepare("
        SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc,
               ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY delta_s ASC
        LIMIT 1
    ");

    // Query to get ALL samples in bucket window for provenance calculation
    $stmtAllSamples = $pdo->prepare("
        SELECT source, COUNT(*) as count
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        GROUP BY source
    ");

    $stmtUpsert = $pdo->prepare("
        INSERT INTO parity_weather_canonical 
            (timestamp_utc, temp_f, rh_pct, pressure_inhg, canonical_source_kind, canonical_source_detail, sample_count, sample_sources_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            temp_f = VALUES(temp_f),
            rh_pct = VALUES(rh_pct),
            pressure_inhg = VALUES(pressure_inhg),
            canonical_source_kind = VALUES(canonical_source_kind),
            canonical_source_detail = VALUES(canonical_source_detail),
            sample_count = VALUES(sample_count),
            sample_sources_json = VALUES(sample_sources_json)
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

        // Compute provenance from all samples in bucket window
        $stmtAllSamples->execute([$bucketTs, $tolerance, $bucketTs, $tolerance]);
        $sourceCounts = $stmtAllSamples->fetchAll(PDO::FETCH_ASSOC);

        $totalSamples = 0;
        $sourceBreakdown = [];
        foreach ($sourceCounts as $sc) {
            $totalSamples += (int)$sc['count'];
            $sourceBreakdown[] = ['source' => $sc['source'], 'count' => (int)$sc['count']];
        }

        // Determine canonical_source_kind
        $uniqueSources = array_column($sourceCounts, 'source');
        if (count($uniqueSources) === 0) {
            $sourceKind = 'unknown';
        } elseif (count($uniqueSources) === 1) {
            $sourceKind = $uniqueSources[0];
        } else {
            $sourceKind = 'mixed';
        }

        // Build human-readable detail
        $detailParts = [];
        foreach ($sourceBreakdown as $sb) {
            $detailParts[] = "{$sb['source']}={$sb['count']}";
        }
        $sourceDetail = implode(', ', $detailParts);

        // JSON encode source breakdown
        $sourcesJson = json_encode($sourceBreakdown);

        $stmtUpsert->execute([
            $bucketTs, $tempF, $rhPct, $pressInhg,
            $sourceKind, $sourceDetail, $totalSamples, $sourcesJson
        ]);
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
        $expandedRW = parity_expandClassIndex($pdo, trim($_GET['classIndex']));
        $phRW = implode(',', array_fill(0, count($expandedRW), '?'));
        $where[] = "r.class_index IN ($phRW)";
        $params = array_merge($params, $expandedRW);
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

    // Query runs — include run_time_local for UI display
    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local, r.category, r.class_index,
               r.round, r.lane, r.driver_name, r.car_number, r.dial_in, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.mov, r.place, r.source_ref
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY COALESCE(r.run_time_local, r.run_timestamp_utc, r.created_at) ASC
        LIMIT $limit OFFSET $offset
    ");
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Safety check: verify provenance columns exist
    $hasProvenanceColumns = false;
    try {
        $stmt = $pdo->query("DESCRIBE parity_weather_canonical");
        $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
        $hasProvenanceColumns = in_array('canonical_source_kind', $columns);
    } catch (Exception $e) {
        $hasProvenanceColumns = false;
    }

    // For each run, find nearest canonical weather (with or without provenance)
    if ($hasProvenanceColumns) {
        $stmtWeather = $pdo->prepare("
            SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
                   canonical_source_kind, canonical_source_detail, sample_count, sample_sources_json,
                   TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
            FROM parity_weather_canonical
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
            LIMIT 1
        ");
    } else {
        // Fallback query without provenance columns
        $stmtWeather = $pdo->prepare("
            SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
                   TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
            FROM parity_weather_canonical
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
            LIMIT 1
        ");
    }

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
                
                // Include provenance fields only if columns exist
                if ($hasProvenanceColumns) {
                    $run['weather']['canonical_source_kind'] = $w['canonical_source_kind'] ?? 'unknown';
                    $run['weather']['canonical_source_detail'] = $w['canonical_source_detail'] ?? null;
                    $run['weather']['sample_count'] = $w['sample_count'] !== null ? (int)$w['sample_count'] : 0;
                    $run['weather']['sample_sources_json'] = $w['sample_sources_json'] ?? null;
                } else {
                    // Provide defaults for backward compatibility
                    $run['weather']['canonical_source_kind'] = 'unknown';
                    $run['weather']['canonical_source_detail'] = null;
                    $run['weather']['sample_count'] = 0;
                    $run['weather']['sample_sources_json'] = null;
                }
                
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

// ============================================================================
// US State → IANA Timezone mapping (for NHRA schedule scraper)
// ============================================================================

function stateToTimezone(string $state): array {
    $map = [
        'AL' => 'America/Chicago',     'AK' => 'America/Anchorage',   'AZ' => 'America/Phoenix',
        'AR' => 'America/Chicago',      'CA' => 'America/Los_Angeles', 'CO' => 'America/Denver',
        'CT' => 'America/New_York',     'DE' => 'America/New_York',    'FL' => 'America/New_York',
        'GA' => 'America/New_York',     'HI' => 'Pacific/Honolulu',    'ID' => 'America/Boise',
        'IL' => 'America/Chicago',      'IN' => 'America/Indiana/Indianapolis',
        'IA' => 'America/Chicago',      'KS' => 'America/Chicago',     'KY' => 'America/New_York',
        'LA' => 'America/Chicago',      'ME' => 'America/New_York',    'MD' => 'America/New_York',
        'MA' => 'America/New_York',     'MI' => 'America/Detroit',     'MN' => 'America/Chicago',
        'MS' => 'America/Chicago',      'MO' => 'America/Chicago',     'MT' => 'America/Denver',
        'NE' => 'America/Chicago',      'NV' => 'America/Los_Angeles', 'NH' => 'America/New_York',
        'NJ' => 'America/New_York',     'NM' => 'America/Denver',      'NY' => 'America/New_York',
        'NC' => 'America/New_York',     'ND' => 'America/Chicago',     'OH' => 'America/New_York',
        'OK' => 'America/Chicago',      'OR' => 'America/Los_Angeles', 'PA' => 'America/New_York',
        'RI' => 'America/New_York',     'SC' => 'America/New_York',    'SD' => 'America/Chicago',
        'TN' => 'America/Chicago',      'TX' => 'America/Chicago',     'UT' => 'America/Denver',
        'VT' => 'America/New_York',     'VA' => 'America/New_York',    'WA' => 'America/Los_Angeles',
        'WV' => 'America/New_York',     'WI' => 'America/Chicago',     'WY' => 'America/Denver',
        'DC' => 'America/New_York',
    ];
    $st = strtoupper(trim($state));
    if (isset($map[$st])) {
        return ['tz' => $map[$st], 'tz_unknown' => false];
    }
    return ['tz' => 'America/New_York', 'tz_unknown' => true];
}

// ============================================================================
// POST ?action=scrapeNhraSchedule
// Body: { yearStart: 2021, yearEnd: 2026, throttleMs?: 1000, force?: false }
// ============================================================================

function handleScrapeNhraSchedule(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $yearStart = (int)($input['yearStart'] ?? 0);
    $yearEnd = (int)($input['yearEnd'] ?? 0);
    $throttleMs = max(500, min(5000, (int)($input['throttleMs'] ?? 1000)));
    $force = (bool)($input['force'] ?? false);

    if ($yearStart < 2015 || $yearEnd > 2030 || $yearStart > $yearEnd) {
        rsa_jsonResponse(['error' => 'yearStart/yearEnd must be 2015-2030 and yearStart <= yearEnd'], 400);
    }

    $startedAt = gmdate('Y-m-d H:i:s');
    $years = range($yearStart, $yearEnd);
    $totalEventsUpserted = 0;
    $totalTracksUpserted = 0;
    $errors = [];

    // Prepare upsert statements
    $stmtFindTrack = $pdo->prepare("SELECT id, street, city, state, zip, timezone_iana FROM parity_tracks WHERE track_name = ?");
    $stmtInsertTrack = $pdo->prepare("
        INSERT INTO parity_tracks (track_name, timezone_iana, street, city, state, zip)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmtUpdateTrackAddr = $pdo->prepare("
        UPDATE parity_tracks SET street = COALESCE(NULLIF(?, ''), street),
            city = COALESCE(NULLIF(?, ''), city),
            state = COALESCE(NULLIF(?, ''), state),
            zip = COALESCE(NULLIF(?, ''), zip),
            timezone_iana = CASE WHEN timezone_iana = 'America/New_York' AND ? != '' THEN ? ELSE timezone_iana END
        WHERE id = ?
    ");
    $stmtFindEvent = $pdo->prepare("SELECT id FROM parity_events WHERE race_lookup = ?");
    $stmtInsertEvent = $pdo->prepare("
        INSERT INTO parity_events (event_name, season_year, track_id, start_date_local, end_date_local, race_lookup)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmtUpdateEvent = $pdo->prepare("
        UPDATE parity_events SET event_name = ?, season_year = ?, track_id = ?,
            start_date_local = ?, end_date_local = ?
        WHERE race_lookup = ?
    ");

    foreach ($years as $year) {
        $url = "https://www.nhra.com/schedule/$year";
        try {
            $html = parity_httpGet($url);
        } catch (Exception $e) {
            $errors[] = "Year $year: fetch failed — " . $e->getMessage();
            continue;
        }

        // Parse HTML
        $events = parseNhraScheduleHtml($html, $year);

        foreach ($events as $ev) {
            try {
                // Upsert track
                $stmtFindTrack->execute([$ev['trackName']]);
                $track = $stmtFindTrack->fetch(PDO::FETCH_ASSOC);

                if (!$track) {
                    $tzInfo = stateToTimezone($ev['state']);
                    $stmtInsertTrack->execute([
                        $ev['trackName'], $tzInfo['tz'],
                        $ev['street'], $ev['city'], $ev['state'], $ev['zip']
                    ]);
                    $trackId = (int)$pdo->lastInsertId();
                    $totalTracksUpserted++;
                    if ($tzInfo['tz_unknown']) {
                        $errors[] = "tz_unknown: '{$ev['trackName']}' state='{$ev['state']}' — defaulted to America/New_York";
                    }
                } else {
                    $trackId = (int)$track['id'];
                    // Update address if blank
                    $tzInfo = stateToTimezone($ev['state']);
                    $stmtUpdateTrackAddr->execute([
                        $ev['street'], $ev['city'], $ev['state'], $ev['zip'],
                        $tzInfo['tz'], $tzInfo['tz'],
                        $trackId
                    ]);
                }

                // Derive raceLookup from startDateLocal
                $raceLookup = str_replace('-', '', $ev['startDateLocal']);

                // Upsert event
                $stmtFindEvent->execute([$raceLookup]);
                $existing = $stmtFindEvent->fetch(PDO::FETCH_ASSOC);

                if ($existing && !$force) {
                    // Already exists — update name/dates if force
                    $stmtUpdateEvent->execute([
                        $ev['eventName'], $year, $trackId,
                        $ev['startDateLocal'], $ev['endDateLocal'],
                        $raceLookup
                    ]);
                } elseif (!$existing) {
                    $stmtInsertEvent->execute([
                        $ev['eventName'], $year, $trackId,
                        $ev['startDateLocal'], $ev['endDateLocal'],
                        $raceLookup
                    ]);
                } else {
                    // force + exists: update
                    $stmtUpdateEvent->execute([
                        $ev['eventName'], $year, $trackId,
                        $ev['startDateLocal'], $ev['endDateLocal'],
                        $raceLookup
                    ]);
                }
                $totalEventsUpserted++;
            } catch (PDOException $e) {
                $errors[] = "Event '{$ev['eventName']}' ($year): " . $e->getMessage();
            }
        }

        // Throttle between years
        if ($year < $yearEnd) {
            usleep($throttleMs * 1000);
        }
    }

    $endedAt = gmdate('Y-m-d H:i:s');

    // Log scrape
    $stmtLog = $pdo->prepare("
        INSERT INTO parity_scrape_logs (started_at, ended_at, years, events_upserted, tracks_upserted, errors_json, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmtLog->execute([
        $startedAt, $endedAt, json_encode($years),
        $totalEventsUpserted, $totalTracksUpserted,
        empty($errors) ? null : json_encode($errors),
        $userId
    ]);

    rsa_jsonResponse([
        'yearsScraped' => $years,
        'eventsUpserted' => $totalEventsUpserted,
        'tracksUpserted' => $totalTracksUpserted,
        'errors' => $errors,
        'startedAt' => $startedAt,
        'endedAt' => $endedAt,
    ]);
}

/**
 * Parse NHRA schedule HTML for a given year.
 * Extracts events with dates, tracks, and addresses from schema.org markup.
 */
function parseNhraScheduleHtml(string $html, int $year): array {
    libxml_use_internal_errors(true);
    $doc = new DOMDocument();
    $doc->loadHTML('<?xml encoding="utf-8" ?>' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();
    $xpath = new DOMXPath($doc);

    $events = [];

    // Each event block is wrapped in a container with startDate/endDate and event info
    // Strategy: find all startDate elements, then walk siblings/parents to extract event info
    $startDateNodes = $xpath->query('//*[@property="startDate"][@content]');

    for ($i = 0; $i < $startDateNodes->length; $i++) {
        $startNode = $startDateNodes->item($i);
        $startContent = $startNode->getAttribute('content');

        // Parse start date from ISO string
        $startDate = null;
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $startContent, $m)) {
            $startDate = $m[1];
        }
        if (!$startDate) continue;

        // Find the sibling/nearby endDate node
        $endDate = null;
        // endDate is typically a sibling div
        $parent = $startNode->parentNode;
        $endNodes = $xpath->query('.//*[@property="endDate"][@content]', $parent);
        if ($endNodes->length > 0) {
            $endContent = $endNodes->item(0)->getAttribute('content');
            if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $endContent, $m)) {
                $endDate = $m[1];
            }
        }
        if (!$endDate) $endDate = $startDate;

        // Walk up to find the event container (typically a parent with class containing "schedule")
        // Then find name, location, address within that container
        $container = $parent;
        // Walk up to find a reasonably large container
        for ($depth = 0; $depth < 5; $depth++) {
            if ($container->parentNode) {
                $container = $container->parentNode;
                // Check if this container has a name property descendant
                $nameNodes = $xpath->query('.//*[@property="name"][ancestor-or-self::h3]', $container);
                if ($nameNodes->length > 0) break;
            }
        }

        // Event name (h3 with property="name")
        $eventName = '';
        $nameNodes = $xpath->query('.//h3[@property="name"]//a | .//h3[contains(@class,"schedule__heading")]//a', $container);
        if ($nameNodes->length > 0) {
            $eventName = trim($nameNodes->item(0)->textContent);
        } else {
            $nameNodes = $xpath->query('.//h3[@property="name"] | .//h3[contains(@class,"schedule__heading")]', $container);
            if ($nameNodes->length > 0) {
                $eventName = trim($nameNodes->item(0)->textContent);
            }
        }

        // Track name (h4 with property="name")
        $trackName = '';
        $trackNodes = $xpath->query('.//h4[@property="name"] | .//h4[contains(@class,"schedule__location--name")]', $container);
        if ($trackNodes->length > 0) {
            $trackName = trim($trackNodes->item(0)->textContent);
        }

        // Address parts
        $street = '';
        $city = '';
        $state = '';
        $zip = '';
        $streetNodes = $xpath->query('.//*[@property="streetAddress"]', $container);
        if ($streetNodes->length > 0) $street = trim($streetNodes->item(0)->textContent);
        $cityNodes = $xpath->query('.//*[@property="addressLocality"]', $container);
        if ($cityNodes->length > 0) $city = trim($cityNodes->item(0)->textContent);
        $stateNodes = $xpath->query('.//*[@property="addressRegion"]', $container);
        if ($stateNodes->length > 0) $state = trim($stateNodes->item(0)->textContent);
        $zipNodes = $xpath->query('.//*[@property="postalCode"]', $container);
        if ($zipNodes->length > 0) $zip = trim($zipNodes->item(0)->textContent);

        if (empty($eventName) || empty($trackName)) continue;

        $events[] = [
            'eventName' => $eventName,
            'trackName' => $trackName,
            'street' => $street,
            'city' => $city,
            'state' => $state,
            'zip' => $zip,
            'startDateLocal' => $startDate,
            'endDateLocal' => $endDate,
        ];
    }

    return $events;
}

// ============================================================================
// GET ?action=eventsWithStats&seasonYear=2025
// Returns events with run counts and weather status
// ============================================================================

function handleEventsWithStats(PDO $pdo): void {
    $seasonYear = (int)($_GET['seasonYear'] ?? 0);

    $where = '';
    $params = [];
    if ($seasonYear > 0) {
        $where = 'WHERE e.season_year = ?';
        $params[] = $seasonYear;
    }

    $stmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.event_code, e.season_year, e.track_id, t.track_name, t.timezone_iana,
               t.city, t.state,
               e.start_date_local, e.end_date_local, e.race_lookup, e.created_at,
               (SELECT COUNT(*) FROM parity_runs r WHERE r.race_lookup = e.race_lookup) AS run_count,
               (SELECT COUNT(*) FROM parity_weather_samples ws WHERE ws.event_id = e.id) AS weather_sample_count
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        $where
        ORDER BY e.start_date_local DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['season_year'] = $r['season_year'] !== null ? (int)$r['season_year'] : null;
        $r['track_id'] = (int)$r['track_id'];
        $r['run_count'] = (int)$r['run_count'];
        $r['weather_sample_count'] = (int)$r['weather_sample_count'];
    }

    rsa_jsonResponse(['events' => $rows, 'count' => count($rows)]);
}

// ============================================================================
// POST ?action=ingestEventRuns
// Body: { eventId?: int, raceLookup?: string, force?: bool }
// ============================================================================

function handleIngestEventRuns(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    $raceLookup = trim($input['raceLookup'] ?? '');
    $force = (bool)($input['force'] ?? false);

    // Resolve raceLookup from eventId if needed
    if ($eventId > 0 && empty($raceLookup)) {
        $stmt = $pdo->prepare("SELECT race_lookup FROM parity_events WHERE id = ?");
        $stmt->execute([$eventId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row || empty($row['race_lookup'])) {
            rsa_jsonResponse(['error' => "Event $eventId not found or has no race_lookup"], 404);
        }
        $raceLookup = $row['race_lookup'];
    }

    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'Could not resolve raceLookup (must be YYYYMMDD)'], 400);
    }

    // Delegate to the existing ingest logic inline (same as handleIngest but without separate endpoint call)
    $requestedAt = gmdate('Y-m-d H:i:s');
    $importUuid = parity_generateUUID();

    // Check for existing
    if (!$force) {
        $stmt = $pdo->prepare("
            SELECT uuid, row_count, fetched_at_utc
            FROM parity_run_imports
            WHERE race_lookup = ? AND status = 'success' AND row_count > 0
            ORDER BY fetched_at_utc DESC LIMIT 1
        ");
        $stmt->execute([$raceLookup]);
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            rsa_jsonResponse([
                'skipped' => true,
                'raceLookup' => $raceLookup,
                'existingImportId' => $existing['uuid'],
                'existingRowCount' => (int)$existing['row_count'],
                'message' => 'Already imported. Use force=true to re-import.',
            ]);
            return;
        }
    }

    // Fetch from OData
    try {
        $result = parity_fetchODataResults($raceLookup);
        $rows = $result['rows'];
        $sourceUrl = $result['url'];
    } catch (Exception $e) {
        $stmt = $pdo->prepare("
            INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, error_message, source_url, created_by_user_id)
            VALUES (?, ?, ?, ?, 'error', 0, ?, ?, ?)
        ");
        $stmt->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $e->getMessage(), "odata/$raceLookup", $userId]);
        rsa_jsonResponse(['error' => 'OData fetch failed: ' . $e->getMessage(), 'raceLookup' => $raceLookup], 502);
    }

    if (empty($rows)) {
        $stmt = $pdo->prepare("
            INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
            VALUES (?, ?, ?, ?, 'success', 0, ?, ?)
        ");
        $stmt->execute([$importUuid, $raceLookup, $requestedAt, gmdate('Y-m-d H:i:s'), $sourceUrl, $userId]);
        rsa_jsonResponse(['raceLookup' => $raceLookup, 'rowsFetched' => 0, 'rowsInserted' => 0, 'rowsDeduped' => 0]);
        return;
    }

    $fetchedAt = gmdate('Y-m-d H:i:s');
    $stmt = $pdo->prepare("
        INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
        VALUES (?, ?, ?, ?, 'success', ?, ?, ?)
    ");
    $stmt->execute([$importUuid, $raceLookup, $requestedAt, $fetchedAt, count($rows), $sourceUrl, $userId]);
    $importId = (int)$pdo->lastInsertId();

    // ── Timezone: NHRA timestamps are event-local wall-clock time. ──
    // Look up track timezone so we can compute true UTC for weather joins.
    $trackTz = 'America/New_York'; // fallback
    $tzStmt = $pdo->prepare("
        SELECT t.timezone_iana FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.race_lookup = ? LIMIT 1
    ");
    $tzStmt->execute([$raceLookup]);
    $tzRow = $tzStmt->fetch(PDO::FETCH_ASSOC);
    if ($tzRow && !empty($tzRow['timezone_iana'])) {
        $trackTz = $tzRow['timezone_iana'];
    }

    $stmtRun = $pdo->prepare("
        INSERT INTO parity_runs (uuid, import_id, race_lookup, run_timestamp_utc, run_time_local, category, class_index, round, lane, driver_name, car_number, dial_in, rt, ft60, ft330, ft660, mph660, ft1000, mph1000, ft1320, mph1320, win_flag, dq_flag, mov, place, source_ref, row_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $rowsInserted = 0;
    $rowsDeduped = 0;

    foreach ($rows as $raw) {
        $normalized = parity_normalizeRow($raw, $raceLookup);
        $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);
        // normalizer returns local wall-clock time in 'run_timestamp_utc' (legacy key name).
        // Store local in run_time_local; compute true UTC for weather joins.
        $localTime = $normalized['run_timestamp_utc'];
        $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;
        try {
            $stmtRun->execute([
                parity_generateUUID(), $importId, $raceLookup,
                $utcTime, $localTime,
                $normalized['category'], $normalized['class_index'],
                $normalized['round'], $normalized['lane'], $normalized['driver_name'], $normalized['car_number'],
                $normalized['dial_in'], $normalized['rt'], $normalized['ft60'], $normalized['ft330'],
                $normalized['ft660'], $normalized['mph660'], $normalized['ft1000'], $normalized['mph1000'],
                $normalized['ft1320'], $normalized['mph1320'], $normalized['win_flag'], $normalized['dq_flag'],
                $normalized['mov'], $normalized['place'], $normalized['source_ref'], $rowHash,
            ]);
            $rowsInserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) { $rowsDeduped++; }
            else { throw $e; }
        }
    }

    $pdo->prepare("UPDATE parity_run_imports SET row_count = ? WHERE id = ?")->execute([$rowsInserted, $importId]);

    rsa_jsonResponse([
        'raceLookup' => $raceLookup,
        'importId' => $importUuid,
        'rowsFetched' => count($rows),
        'rowsInserted' => $rowsInserted,
        'rowsDeduped' => $rowsDeduped,
    ]);
}

// ============================================================================
// POST ?action=backfillEventWeather
// Body: { eventId: int, throttleMs?: int, minRowsPerDay?: int }
// Delegates to existing weatherBackfill logic
// ============================================================================

function handleBackfillEventWeather(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    // Delegates directly to startBackfillWeather which already accepts eventId
    handleStartBackfillWeather($pdo, $userId, $auth);
}

// ============================================================================
// Weather Correction Model v1
// Standard NHRA reference day: 60 °F, 29.92 inHg station pressure, 0 % RH.
// Correction factor = (air density at actual conditions) / (air density at std).
// Corrected ET = actual ET × correction_factor.
// Lower correction_factor → denser air → faster runs → lower corrected ET.
//
// We use the ideal-gas + humidity model:
//   ρ ∝ (P_dry) / T_abs
//   P_dry = P_station − vapor_pressure
//   vapor_pressure = (RH/100) × saturation_vapor_pressure(T)
//   saturation from Magnus formula: es = 6.1078 × 10^(7.5T/(237.3+T)) [mb]
//   Convert inHg to mb: 1 inHg = 33.8639 mb
// ============================================================================

// (constants moved to top of file)

/**
 * Compute air density ratio (actual / standard).
 * Returns correction_factor: multiply actual ET by this to get corrected ET.
 * factor > 1 → thin air (hot/low pressure) → run was slow, corrected ET will be higher
 * factor < 1 → dense air (cold/high pressure) → run was fast, corrected ET will be lower
 *
 * Actually for drag racing correction, we want:
 *   corrected = actual × (std_density / actual_density)
 * so that hot-day runs get LOWERED (what the car "would have" run on std day).
 */
function parity_correctionFactor(?float $tempF, ?float $pressInhg, ?float $rhPct): ?float {
    if ($tempF === null || $pressInhg === null) return null;
    $rh = ($rhPct !== null) ? $rhPct / 100.0 : 0.0; // fraction

    $T = $tempF;
    $BP = $pressInhg;
    $H = $rh;

    // Exact match to weatherCorrection.ts correctionFactor()
    // SVP via NHRA formula
    $svp = 29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152));
    $vp = $H * $svp;
    $dap = $BP - $vp;

    if ($dap <= 0) return null;

    $tempC = ($T - 32) * (5.0 / 9.0);
    $tempK = $tempC + 273.15;

    // CF = 1.176 * (1013.207 / (dap / 0.02953)) * sqrt(tempK / 288.706) - 0.176
    return 1.176 * (1013.20690822892 / ($dap / 0.02953)) * pow($tempK / 288.705555555556, 0.5) - 0.176;
}

/**
 * Apply correction factor to an ET value.
 * corrected_et = actual_et × factor
 */
function parity_correctET(?float $et, ?float $factor): ?float {
    if ($et === null || $factor === null) return null;
    return round($et * $factor, 4);
}

// ============================================================================
// Shared: expand a class_index to include aliases
// e.g. 'PS' → ['PS', 'PRO'] when alias PRO→PS exists
// ============================================================================

function parity_expandClassIndex(PDO $pdo, string $classIndex): array {
    if ($classIndex === '') return [];
    $classes = [$classIndex];
    $stmt = $pdo->prepare("SELECT alias FROM parity_class_aliases WHERE canonical = ?");
    $stmt->execute([$classIndex]);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $classes[] = $row['alias'];
    }
    return $classes;
}

// ============================================================================
// GET ?action=listClassAliases
// Returns all class alias mappings + distinct class_index values from runs
// ============================================================================

function handleListClassAliases(PDO $pdo): void {
    // All existing aliases
    $stmt = $pdo->query("SELECT id, canonical, alias, created_at FROM parity_class_aliases ORDER BY canonical, alias");
    $aliases = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($aliases as &$a) { $a['id'] = (int)$a['id']; }

    // Distinct class_index values in runs (for autocomplete / reference)
    $classStmt = $pdo->query("SELECT DISTINCT class_index FROM parity_runs WHERE class_index IS NOT NULL AND class_index != '' ORDER BY class_index");
    $classes = $classStmt->fetchAll(PDO::FETCH_COLUMN);

    rsa_jsonResponse(['aliases' => $aliases, 'knownClasses' => $classes]);
}

// ============================================================================
// POST ?action=addClassAlias   body: { canonical, alias }
// ============================================================================

function handleAddClassAlias(PDO $pdo, array $auth): void {
    $input = rsa_getJsonInput();
    $canonical = strtoupper(trim($input['canonical'] ?? ''));
    $alias     = strtoupper(trim($input['alias'] ?? ''));

    if ($canonical === '' || $alias === '') {
        rsa_jsonResponse(['error' => 'canonical and alias are required'], 400);
    }
    if ($canonical === $alias) {
        rsa_jsonResponse(['error' => 'canonical and alias must be different'], 400);
    }

    // Prevent duplicate
    $chk = $pdo->prepare("SELECT id FROM parity_class_aliases WHERE canonical = ? AND alias = ?");
    $chk->execute([$canonical, $alias]);
    if ($chk->fetch()) {
        rsa_jsonResponse(['error' => 'This alias already exists'], 409);
    }

    $ins = $pdo->prepare("INSERT INTO parity_class_aliases (canonical, alias) VALUES (?, ?)");
    $ins->execute([$canonical, $alias]);

    rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
}

// ============================================================================
// POST ?action=deleteClassAlias   body: { id }
// ============================================================================

function handleDeleteClassAlias(PDO $pdo, array $auth): void {
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) {
        rsa_jsonResponse(['error' => 'id is required'], 400);
    }

    $del = $pdo->prepare("DELETE FROM parity_class_aliases WHERE id = ?");
    $del->execute([$id]);

    rsa_jsonResponse(['ok' => true, 'deleted' => $del->rowCount()]);
}

// ============================================================================
// Shared: fetch runs + weather + correction for an event+class
// Returns array of run rows with weather + correction fields attached.
// Excludes flagged runs by default (pass includeBad=true to include).
// ============================================================================

function parity_fetchCorrectedRuns(PDO $pdo, int $eventId, string $classIndex, bool $includeBad = false, int $windowMinutes = 30): array {
    // Get event's raceLookup
    $stmt = $pdo->prepare("SELECT race_lookup FROM parity_events WHERE id = ?");
    $stmt->execute([$eventId]);
    $raceLookup = $stmt->fetchColumn();
    if (!$raceLookup) return [];

    $expandedClasses = parity_expandClassIndex($pdo, $classIndex);
    $placeholders = implode(',', array_fill(0, count($expandedClasses), '?'));
    $where = ['r.race_lookup = ?', "r.class_index IN ($placeholders)", 'r.ft1320 IS NOT NULL', 'r.ft1320 > 0'];
    $params = array_merge([$raceLookup], $expandedClasses);

    if (!$includeBad) {
        $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
    }
    // Exclude DQ'd runs
    $where[] = '(r.dq_flag IS NULL OR r.dq_flag = 0)';

    $whereClause = implode(' AND ', $where);

    $sql = "
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local, r.class_index,
               r.round, r.lane, r.driver_name, r.car_number, r.dial_in, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.place
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY r.ft1320 ASC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Weather join — uses run_timestamp_utc (true UTC) to match canonical weather (UTC)
    $stmtW = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
               TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
        FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
        LIMIT 1
    ");

    foreach ($runs as &$run) {
        // Cast numerics
        $run['id'] = (int)$run['id'];
        foreach (['dial_in','rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320'] as $f) {
            if ($run[$f] !== null) $run[$f] = (float)$run[$f];
        }
        foreach (['win_flag','dq_flag'] as $f) {
            if ($run[$f] !== null) $run[$f] = (bool)(int)$run[$f];
        }

        // Weather join
        $run['weather_timestamp_utc'] = null;
        $run['weather_delta_seconds'] = null;
        $run['temp_f'] = null;
        $run['rh_pct'] = null;
        $run['pressure_inhg'] = null;
        $run['correction_factor'] = null;
        $run['corrected_ft1320'] = null;
        $run['corrected_ft660'] = null;
        $run['corrected_ft60'] = null;

        $ts = $run['run_timestamp_utc'];
        if ($ts) {
            $stmtW->execute([$ts, $ts, $windowMinutes, $ts, $windowMinutes, $ts]);
            $w = $stmtW->fetch(PDO::FETCH_ASSOC);
            if ($w) {
                $tF = $w['temp_f'] !== null ? (float)$w['temp_f'] : null;
                $rh = $w['rh_pct'] !== null ? (float)$w['rh_pct'] : null;
                $pI = $w['pressure_inhg'] !== null ? (float)$w['pressure_inhg'] : null;

                $run['weather_timestamp_utc'] = $w['timestamp_utc'];
                $run['weather_delta_seconds'] = (int)$w['delta_seconds'];
                $run['temp_f'] = $tF;
                $run['rh_pct'] = $rh;
                $run['pressure_inhg'] = $pI;

                $factor = parity_correctionFactor($tF, $pI, $rh);
                $run['correction_factor'] = $factor !== null ? round($factor, 6) : null;
                $run['corrected_ft1320'] = parity_correctET($run['ft1320'], $factor);
                $run['corrected_ft660'] = parity_correctET($run['ft660'], $factor);
                $run['corrected_ft60'] = parity_correctET($run['ft60'], $factor);
            }
        }
    }

    return $runs;
}

// ============================================================================
// GET ?action=eventParitySummary&eventId=1&classIndex=TF
// Returns parity metrics: best/top3/top5 actual+corrected ET, run counts, etc.
// ============================================================================

function handleEventParitySummary(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $includeBad = (bool)($_GET['includeBad'] ?? 0);

    if ($eventId <= 0 || !$classIndex) {
        rsa_jsonResponse(['error' => 'eventId and classIndex are required'], 400);
    }

    $runs = parity_fetchCorrectedRuns($pdo, $eventId, $classIndex, $includeBad);

    // Compute metrics
    $totalRuns = count($runs);
    $weatherJoinedCount = 0;
    $correctedCount = 0;
    $actualETs = [];
    $correctedETs = [];

    foreach ($runs as $r) {
        if ($r['ft1320'] !== null) $actualETs[] = $r['ft1320'];
        if ($r['weather_timestamp_utc'] !== null) $weatherJoinedCount++;
        if ($r['corrected_ft1320'] !== null) {
            $correctedETs[] = $r['corrected_ft1320'];
            $correctedCount++;
        }
    }

    sort($actualETs);
    sort($correctedETs);

    $median = function(array $arr): ?float {
        $n = count($arr);
        if ($n === 0) return null;
        $mid = (int)floor($n / 2);
        if ($n % 2 === 0) return round(($arr[$mid - 1] + $arr[$mid]) / 2, 4);
        return $arr[$mid];
    };

    $topN = function(array $arr, int $n) use ($median): ?float {
        if (count($arr) < $n) return null;
        return $median(array_slice($arr, 0, $n));
    };

    // Load event info
    $ev = $pdo->prepare("
        SELECT e.event_name, e.start_date_local, e.end_date_local,
               t.track_name, t.city, t.state
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $ev->execute([$eventId]);
    $eventInfo = $ev->fetch(PDO::FETCH_ASSOC);

    rsa_jsonResponse([
        'eventId' => $eventId,
        'classIndex' => $classIndex,
        'event' => $eventInfo ?: null,
        'correction_model_version' => PARITY_CORRECTION_MODEL_VERSION,
        'standard_day' => [
            'temp_f' => PARITY_STD_TEMP_F,
            'pressure_inhg' => PARITY_STD_PRESS_INHG,
            'rh_pct' => PARITY_STD_RH_PCT,
        ],
        'run_count' => $totalRuns,
        'weather_joined_count' => $weatherJoinedCount,
        'corrected_count' => $correctedCount,
        'actual' => [
            'best' => !empty($actualETs) ? $actualETs[0] : null,
            'top3_median' => $topN($actualETs, 3),
            'top5_median' => $topN($actualETs, 5),
            'all_median' => $median($actualETs),
        ],
        'corrected' => [
            'best' => !empty($correctedETs) ? $correctedETs[0] : null,
            'top3_median' => $topN($correctedETs, 3),
            'top5_median' => $topN($correctedETs, 5),
            'all_median' => $median($correctedETs),
        ],
        'runs' => $runs,
    ]);
}

// ============================================================================
// GET ?action=qualSheet&eventId=1&classIndex=TF&includeCorrected=1
// Final qualifying sheet with exact NHRA rules:
//   - Qualifying rounds only (round starts with Q)
//   - DQ invalidates the entire run
//   - Best run per driver: lowest ET, then higher MPH (same run), then earliest timestamp
//   - Drivers with no valid qualifying run shown at bottom as DQ/NO VALID RUN
// ============================================================================

function handleQualSheet(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $includeCorrected = (bool)($_GET['includeCorrected'] ?? 0);
    $includeBad = (bool)($_GET['includeBad'] ?? 0);

    if ($eventId <= 0 || !$classIndex) {
        rsa_jsonResponse(['error' => 'eventId and classIndex are required'], 400);
    }

    // Resolve raceLookup for event
    $stmt = $pdo->prepare("SELECT race_lookup FROM parity_events WHERE id = ?");
    $stmt->execute([$eventId]);
    $raceLookup = $stmt->fetchColumn();
    if (!$raceLookup) {
        rsa_jsonResponse(['error' => 'Event not found'], 404);
    }

    $expandedClasses = parity_expandClassIndex($pdo, $classIndex);
    $ph = implode(',', array_fill(0, count($expandedClasses), '?'));

    // Fetch ALL qualifying-round runs for this event+class (including DQ)
    // Qualifying rounds: round starts with 'Q' (Q1, Q2, Q3, Q4)
    $where = ["r.race_lookup = ?", "r.class_index IN ($ph)", "r.round LIKE 'Q%'"];
    $params = array_merge([$raceLookup], $expandedClasses);

    if (!$includeBad) {
        $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
    }

    $whereClause = implode(' AND ', $where);

    $sql = "
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local, r.class_index,
               r.round, r.lane, r.driver_name, r.car_number, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.place
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY COALESCE(r.run_time_local, r.run_timestamp_utc) ASC
    ";
    $stmtRuns = $pdo->prepare($sql);
    $stmtRuns->execute($params);
    $allQualRuns = $stmtRuns->fetchAll(PDO::FETCH_ASSOC);

    // Cast numerics
    foreach ($allQualRuns as &$run) {
        $run['id'] = (int)$run['id'];
        foreach (['rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320'] as $f) {
            if ($run[$f] !== null) $run[$f] = (float)$run[$f];
        }
        foreach (['win_flag','dq_flag'] as $f) {
            if ($run[$f] !== null) $run[$f] = (bool)(int)$run[$f];
        }
    }
    unset($run);

    // Weather join (for corrected ET on best run)
    $windowMinutes = 30;
    $stmtW = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
               TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
        FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
        LIMIT 1
    ");

    // Group by driver, track all qualifying runs + DQ status
    $byDriver = [];
    foreach ($allQualRuns as $r) {
        $driver = $r['driver_name'] ?? '(unknown)';
        if (!isset($byDriver[$driver])) {
            $byDriver[$driver] = [
                'driver' => $driver,
                'car_number' => $r['car_number'],
                'qual_runs' => [],
                'all_dq' => true,  // assume all DQ until proven otherwise
                'total_runs' => 0,
            ];
        }
        $byDriver[$driver]['total_runs']++;

        $isDQ = !empty($r['dq_flag']);
        if ($isDQ) {
            continue; // DQ invalidates the run — skip for ranking
        }

        $byDriver[$driver]['all_dq'] = false;

        // Valid run: must have ET > 0
        if ($r['ft1320'] === null || $r['ft1320'] <= 0) continue;

        $byDriver[$driver]['qual_runs'][] = $r;
    }

    // For each driver, select best qualifying run using NHRA tiebreakers:
    //   (1) lowest ET, (2) higher MPH from same run, (3) earliest timestamp
    $validDrivers = [];
    $invalidDrivers = [];

    foreach ($byDriver as $driverData) {
        $driver = $driverData['driver'];
        $qualRuns = $driverData['qual_runs'];

        if (count($qualRuns) === 0) {
            // No valid qualifying run — DQ or no valid ET
            $invalidDrivers[] = [
                'driver' => $driver,
                'car_number' => $driverData['car_number'],
                'best_et' => null,
                'best_mph' => null,
                'best_rt' => null,
                'best_ft60' => null,
                'best_ft660' => null,
                'best_timestamp' => null,
                'corrected_best_et' => null,
                'correction_factor' => null,
                'temp_f' => null,
                'pressure_inhg' => null,
                'rh_pct' => null,
                'run_count' => $driverData['total_runs'],
                'is_valid' => false,
            ];
            continue;
        }

        // Sort qualifying runs: ET asc, MPH desc, local timestamp asc.
        // Tie-break uses run_time_local (event wall-clock time) — this is the
        // correct chronological order at the track. UTC ordering would be wrong
        // if comparing across events in different timezones.
        usort($qualRuns, function ($a, $b) {
            // (1) Lowest ET first
            $etCmp = $a['ft1320'] <=> $b['ft1320'];
            if ($etCmp !== 0) return $etCmp;
            // (2) Higher MPH (from same run) — descending
            $mphA = $a['mph1320'] ?? 0;
            $mphB = $b['mph1320'] ?? 0;
            $mphCmp = $mphB <=> $mphA;
            if ($mphCmp !== 0) return $mphCmp;
            // (3) Earliest local timestamp (who ran first at the track)
            return ($a['run_time_local'] ?? $a['run_timestamp_utc'] ?? '') <=> ($b['run_time_local'] ?? $b['run_timestamp_utc'] ?? '');
        });

        $best = $qualRuns[0];

        // Weather join for best run
        $correctedET = null;
        $corrFactor = null;
        $tempF = null;
        $pressInhg = null;
        $rhPct = null;

        $ts = $best['run_timestamp_utc'];
        if ($ts) {
            $stmtW->execute([$ts, $ts, $windowMinutes, $ts, $windowMinutes, $ts]);
            $w = $stmtW->fetch(PDO::FETCH_ASSOC);
            if ($w) {
                $tempF = $w['temp_f'] !== null ? (float)$w['temp_f'] : null;
                $rhPct = $w['rh_pct'] !== null ? (float)$w['rh_pct'] : null;
                $pressInhg = $w['pressure_inhg'] !== null ? (float)$w['pressure_inhg'] : null;
                $corrFactor = parity_correctionFactor($tempF, $pressInhg, $rhPct);
                $correctedET = parity_correctET($best['ft1320'], $corrFactor);
            }
        }

        $validDrivers[] = [
            'driver' => $driver,
            'car_number' => $driverData['car_number'],
            'best_et' => $best['ft1320'],
            'best_mph' => $best['mph1320'],
            'best_rt' => $best['rt'],
            'best_ft60' => $best['ft60'],
            'best_ft660' => $best['ft660'],
            // Display local time to the user; keep UTC for internal reference
            'best_timestamp' => $best['run_time_local'] ?? $best['run_timestamp_utc'],
            'best_timestamp_utc' => $best['run_timestamp_utc'],
            'corrected_best_et' => $correctedET,
            'correction_factor' => $corrFactor !== null ? round($corrFactor, 6) : null,
            'temp_f' => $tempF,
            'pressure_inhg' => $pressInhg,
            'rh_pct' => $rhPct,
            'run_count' => $driverData['total_runs'],
            'is_valid' => true,
        ];
    }

    // Sort valid drivers: ET asc, MPH desc, timestamp asc
    usort($validDrivers, function ($a, $b) {
        $etCmp = ($a['best_et'] ?? 999) <=> ($b['best_et'] ?? 999);
        if ($etCmp !== 0) return $etCmp;
        $mphCmp = ($b['best_mph'] ?? 0) <=> ($a['best_mph'] ?? 0);
        if ($mphCmp !== 0) return $mphCmp;
        return ($a['best_timestamp'] ?? '') <=> ($b['best_timestamp'] ?? '');
    });

    // Combine: valid drivers first (numbered), then invalid at bottom
    $sheet = [];
    $pos = 1;
    foreach ($validDrivers as $row) {
        $row['qual_pos'] = $pos++;
        $sheet[] = $row;
    }
    foreach ($invalidDrivers as $row) {
        $row['qual_pos'] = null; // no position for DQ/invalid
        $sheet[] = $row;
    }

    // Load event info
    $ev = $pdo->prepare("
        SELECT e.event_name, e.start_date_local, e.end_date_local, e.season_year,
               t.track_name, t.city, t.state
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $ev->execute([$eventId]);
    $eventInfo = $ev->fetch(PDO::FETCH_ASSOC);

    $response = [
        'eventId' => $eventId,
        'classIndex' => $classIndex,
        'event' => $eventInfo ?: null,
        'correction_model_version' => PARITY_CORRECTION_MODEL_VERSION,
        'qualifier_count' => count($validDrivers),
        'total_drivers' => count($sheet),
        'sheet' => $sheet,
    ];

    rsa_jsonResponse($response);
}

// ============================================================================
// GET ?action=ladder&eventId=1&classIndex=TF&ladderSize=16
// Elimination ladder bracket from qual sheet ordering
// ============================================================================

function handleLadder(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $ladderSize = (int)($_GET['ladderSize'] ?? 16);
    $includeBad = (bool)($_GET['includeBad'] ?? 0);

    if ($eventId <= 0 || !$classIndex) {
        rsa_jsonResponse(['error' => 'eventId and classIndex are required'], 400);
    }
    if (!in_array($ladderSize, [4, 8, 16, 32], true)) {
        rsa_jsonResponse(['error' => 'ladderSize must be 4, 8, 16, or 32'], 400);
    }

    $runs = parity_fetchCorrectedRuns($pdo, $eventId, $classIndex, $includeBad);

    // Build qual sheet (same logic as qualSheet)
    $byDriver = [];
    foreach ($runs as $r) {
        $driver = $r['driver_name'] ?? '(unknown)';
        if (!isset($byDriver[$driver]) || $r['ft1320'] < $byDriver[$driver]['best_et']) {
            $byDriver[$driver] = [
                'driver' => $driver,
                'car_number' => $r['car_number'],
                'best_et' => $r['ft1320'],
                'best_mph' => $r['mph1320'],
            ];
        }
    }
    $qualifiers = array_values($byDriver);
    usort($qualifiers, fn($a, $b) => ($a['best_et'] ?? 999) <=> ($b['best_et'] ?? 999));

    // Trim to ladder size
    $qualifiers = array_slice($qualifiers, 0, $ladderSize);
    $actualCount = count($qualifiers);

    // Pad with BYEs if fewer qualifiers than ladder size
    while (count($qualifiers) < $ladderSize) {
        $qualifiers[] = ['driver' => 'BYE', 'car_number' => null, 'best_et' => null, 'best_mph' => null];
    }

    // Number them
    foreach ($qualifiers as $i => &$q) {
        $q['seed'] = $i + 1;
    }

    // Generate first-round pairings: 1 vs N, 2 vs N-1, etc.
    $pairings = [];
    $n = count($qualifiers);
    for ($i = 0; $i < $n / 2; $i++) {
        $pairings[] = [
            'match' => $i + 1,
            'top_seed' => $qualifiers[$i],
            'bottom_seed' => $qualifiers[$n - 1 - $i],
        ];
    }

    // Load event info
    $ev = $pdo->prepare("
        SELECT e.event_name, e.start_date_local, e.end_date_local, e.season_year,
               t.track_name, t.city, t.state
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $ev->execute([$eventId]);
    $eventInfo = $ev->fetch(PDO::FETCH_ASSOC);

    rsa_jsonResponse([
        'eventId' => $eventId,
        'classIndex' => $classIndex,
        'ladderSize' => $ladderSize,
        'actualQualifiers' => $actualCount,
        'event' => $eventInfo ?: null,
        'pairings' => $pairings,
    ]);
}

// ============================================================================
// POST ?action=flagRun
// Body: { runId: int, flagType: 'bad'|'note'|'exclude', reason?: string }
// ============================================================================

function handleFlagRun(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $runId = (int)($input['runId'] ?? 0);
    $flagType = trim($input['flagType'] ?? 'bad');
    $reason = trim($input['reason'] ?? '');

    if ($runId <= 0) {
        rsa_jsonResponse(['error' => 'runId is required'], 400);
    }
    if (!in_array($flagType, ['bad', 'note', 'exclude'], true)) {
        rsa_jsonResponse(['error' => "flagType must be 'bad', 'note', or 'exclude'"], 400);
    }

    // Verify run exists
    $stmt = $pdo->prepare("SELECT id FROM parity_runs WHERE id = ?");
    $stmt->execute([$runId]);
    if (!$stmt->fetch()) {
        rsa_jsonResponse(['error' => "Run $runId not found"], 404);
    }

    // Upsert flag (unique on run_id + flag_type)
    try {
        $stmt = $pdo->prepare("
            INSERT INTO parity_run_flags (run_id, flag_type, reason, created_by_user_id)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE reason = VALUES(reason), created_by_user_id = VALUES(created_by_user_id)
        ");
        $stmt->execute([$runId, $flagType, $reason ?: null, $userId]);
        rsa_jsonResponse(['ok' => true, 'runId' => $runId, 'flagType' => $flagType]);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Failed to flag run: ' . $e->getMessage()], 500);
    }
}

// ============================================================================
// POST ?action=unflagRun
// Body: { runId: int, flagType?: string }
// If flagType provided, deletes only that flag. Otherwise deletes ALL flags for the run.
// ============================================================================

function handleUnflagRun(PDO $pdo, int $userId): void {
    $input = rsa_getJsonInput();
    $runId = (int)($input['runId'] ?? 0);
    $flagType = isset($input['flagType']) ? trim($input['flagType']) : null;

    if ($runId <= 0) {
        rsa_jsonResponse(['error' => 'runId is required'], 400);
    }

    try {
        if ($flagType) {
            $stmt = $pdo->prepare("DELETE FROM parity_run_flags WHERE run_id = ? AND flag_type = ?");
            $stmt->execute([$runId, $flagType]);
        } else {
            $stmt = $pdo->prepare("DELETE FROM parity_run_flags WHERE run_id = ?");
            $stmt->execute([$runId]);
        }
        $deleted = $stmt->rowCount();
        rsa_jsonResponse(['ok' => true, 'runId' => $runId, 'deleted' => $deleted]);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Failed to unflag run: ' . $e->getMessage()], 500);
    }
}

// ============================================================================
// GET ?action=runFlags&raceLookup=YYYYMMDD
// ============================================================================

function handleRunFlags(PDO $pdo): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (empty($raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup is required'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT f.id, f.run_id, f.flag_type, f.reason, f.created_by_user_id, f.created_at
        FROM parity_run_flags f
        JOIN parity_runs r ON r.id = f.run_id
        WHERE r.race_lookup = ?
        ORDER BY f.created_at DESC
    ");
    $stmt->execute([$raceLookup]);
    $flags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($flags as &$f) {
        $f['id'] = (int)$f['id'];
        $f['run_id'] = (int)$f['run_id'];
        $f['created_by_user_id'] = $f['created_by_user_id'] !== null ? (int)$f['created_by_user_id'] : null;
    }

    rsa_jsonResponse(['flags' => $flags, 'count' => count($flags)]);
}

// ============================================================================
// Backfill Job System — shared helpers
// ============================================================================

/**
 * Require owner/admin role. Returns role string or responds 403.
 */
function requireAdminRole(array $auth): string {
    $role = $auth['role'] ?? '';
    if (!in_array($role, ['owner', 'admin'], true)) {
        rsa_jsonResponse(['error' => 'Requires owner or admin role'], 403);
    }
    return $role;
}

/**
 * Check if there is already a running job of the given type. If so, respond 409.
 */
function ensureNoRunningJob(PDO $pdo, string $type): void {
    $stmt = $pdo->prepare("SELECT id FROM parity_backfill_jobs WHERE type = ? AND status = 'running' LIMIT 1");
    $stmt->execute([$type]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($existing) {
        rsa_jsonResponse([
            'error' => "A $type backfill job is already running (id={$existing['id']}). Cancel or wait for it to finish.",
            'existingJobId' => (int)$existing['id'],
        ], 409);
    }
}

/**
 * Create a backfill job and its items.
 * @return int  The new job ID.
 */
function createBackfillJob(PDO $pdo, string $type, int $userId, array $params, array $itemKeys): int {
    $stmt = $pdo->prepare("
        INSERT INTO parity_backfill_jobs (type, status, created_by_user_id, params_json, total_items)
        VALUES (?, 'running', ?, ?, ?)
    ");
    $stmt->execute([$type, $userId, json_encode($params), count($itemKeys)]);
    $jobId = (int)$pdo->lastInsertId();

    $stmtItem = $pdo->prepare("
        INSERT INTO parity_backfill_job_items (job_id, item_key, status)
        VALUES (?, ?, 'pending')
    ");
    foreach ($itemKeys as $key) {
        $stmtItem->execute([$jobId, $key]);
    }

    return $jobId;
}

/**
 * Load a job row by ID.
 */
function loadBackfillJob(PDO $pdo, int $jobId): ?array {
    $stmt = $pdo->prepare("SELECT * FROM parity_backfill_jobs WHERE id = ?");
    $stmt->execute([$jobId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Update job counters from items table.
 */
function refreshJobCounters(PDO $pdo, int $jobId): void {
    $pdo->prepare("
        UPDATE parity_backfill_jobs SET
            completed_count = (SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status = 'ok'),
            skipped_count   = (SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status = 'skipped'),
            no_data_count   = (SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status = 'no_data'),
            error_count     = (SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status = 'error')
        WHERE id = ?
    ")->execute([$jobId, $jobId, $jobId, $jobId, $jobId]);
}

/**
 * Process pending items for a runs backfill job.
 * Runs sequentially with throttle. Checks for cancellation between items.
 */
function processRunsBackfillItems(PDO $pdo, int $jobId, int $userId, array $params): void {
    $throttleMs = max(200, min(5000, (int)($params['throttleMs'] ?? 500)));
    $force = (bool)($params['force'] ?? false);

    set_time_limit(600); // 10 min

    $stmtPending = $pdo->prepare("
        SELECT id, item_key FROM parity_backfill_job_items
        WHERE job_id = ? AND status IN ('pending','error')
        ORDER BY item_key ASC
        LIMIT 1
    ");
    $stmtUpdateItem = $pdo->prepare("
        UPDATE parity_backfill_job_items
        SET status = ?, attempts = attempts + 1, last_http_status = ?, last_error = ?,
            rows_fetched = ?, rows_inserted = ?, rows_deduped = ?
        WHERE id = ?
    ");
    $stmtUpdateJob = $pdo->prepare("
        UPDATE parity_backfill_jobs SET current_item_key = ?, last_error = ? WHERE id = ?
    ");
    $stmtCheckCancel = $pdo->prepare("SELECT status FROM parity_backfill_jobs WHERE id = ?");

    $isFirst = true;
    while (true) {
        // Check if job was cancelled
        $stmtCheckCancel->execute([$jobId]);
        $jobStatus = $stmtCheckCancel->fetchColumn();
        if ($jobStatus !== 'running') break;

        // Get next pending item
        $stmtPending->execute([$jobId]);
        $item = $stmtPending->fetch(PDO::FETCH_ASSOC);
        if (!$item) break; // All done

        $raceLookup = $item['item_key'];
        $stmtUpdateJob->execute([$raceLookup, null, $jobId]);

        // Throttle between requests
        if (!$isFirst) {
            usleep($throttleMs * 1000);
        }
        $isFirst = false;

        // Attempt ingest
        try {
            $result = parity_fetchNhraOdata($raceLookup);
            $rows = $result['rows'];
            $rowsFetched = count($rows);

            if ($rowsFetched === 0) {
                $stmtUpdateItem->execute(['no_data', 200, null, 0, 0, 0, $item['id']]);
                continue;
            }

            // Check existing count
            $existingStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
            $existingStmt->execute([$raceLookup]);
            $existingCount = (int)$existingStmt->fetchColumn();

            if ($existingCount > 0 && !$force) {
                $stmtUpdateItem->execute(['skipped', 200, "Already has $existingCount rows", $rowsFetched, 0, 0, $item['id']]);
                continue;
            }

            // Create import record
            $importUuid = parity_generateUuid();
            $importStmt = $pdo->prepare("
                INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
                VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP(), 'success', ?, ?, ?)
            ");
            $importStmt->execute([$importUuid, $raceLookup, $rowsFetched, $result['url'], $userId]);
            $importId = (int)$pdo->lastInsertId();

            // ── Timezone: NHRA timestamps are event-local wall-clock time. ──
            // Look up track timezone so we can compute true UTC for weather joins.
            $trackTz = 'America/New_York'; // fallback
            $tzStmt2 = $pdo->prepare("
                SELECT t.timezone_iana FROM parity_events e
                JOIN parity_tracks t ON t.id = e.track_id
                WHERE e.race_lookup = ? LIMIT 1
            ");
            $tzStmt2->execute([$raceLookup]);
            $tzRow2 = $tzStmt2->fetch(PDO::FETCH_ASSOC);
            if ($tzRow2 && !empty($tzRow2['timezone_iana'])) {
                $trackTz = $tzRow2['timezone_iana'];
            }

            // Insert runs
            $inserted = 0;
            $deduped = 0;
            foreach ($rows as $raw) {
                $normalized = parity_normalizeRow($raw);
                $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);
                $runUuid = parity_generateUuid();

                // normalizer returns local wall-clock time in 'run_timestamp_utc' (legacy key name).
                // Store local in run_time_local; compute true UTC via parity_localToUtc().
                // NEVER write run_timestamp_utc directly from timing system data.
                $localTime = $normalized['run_timestamp_utc'] ?? null;
                $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;
                $normalized['run_timestamp_utc'] = $utcTime;
                $normalized['run_time_local'] = $localTime;

                try {
                    $cols = ['uuid','import_id','race_lookup','row_hash'];
                    $vals = [$runUuid, $importId, $raceLookup, $rowHash];
                    foreach ($normalized as $col => $val) {
                        $cols[] = $col;
                        $vals[] = $val;
                    }
                    $placeholders = implode(',', array_fill(0, count($cols), '?'));
                    $colList = implode(',', $cols);
                    $pdo->prepare("INSERT INTO parity_runs ($colList) VALUES ($placeholders)")->execute($vals);
                    $inserted++;
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Duplicate') !== false) {
                        $deduped++;
                    } else {
                        throw $e;
                    }
                }
            }

            $stmtUpdateItem->execute(['ok', 200, null, $rowsFetched, $inserted, $deduped, $item['id']]);

        } catch (Exception $e) {
            $errMsg = substr($e->getMessage(), 0, 500);
            $stmtUpdateItem->execute(['error', 0, $errMsg, 0, 0, 0, $item['id']]);
            $stmtUpdateJob->execute([$raceLookup, $errMsg, $jobId]);
        }
    }

    // Refresh counters and finalize
    refreshJobCounters($pdo, $jobId);

    // Check final status
    $stmtCheckCancel->execute([$jobId]);
    $finalStatus = $stmtCheckCancel->fetchColumn();
    if ($finalStatus === 'running') {
        // Check if any items still pending
        $pendingStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status IN ('pending','error')");
        $pendingStmt->execute([$jobId]);
        $pendingCount = (int)$pendingStmt->fetchColumn();

        $newStatus = $pendingCount > 0 ? 'error' : 'complete';
        $pdo->prepare("UPDATE parity_backfill_jobs SET status = ?, finished_at = NOW() WHERE id = ?")
            ->execute([$newStatus, $jobId]);
    }
}

/**
 * Process pending items for a weather backfill job.
 */
function processWeatherBackfillItems(PDO $pdo, int $jobId, array $params): void {
    $throttleMs = max(200, min(5000, (int)($params['throttleMs'] ?? 500)));
    $minRowsPerDay = (int)($params['minRowsPerDay'] ?? 24);
    $eventId = (int)$params['eventId'];

    set_time_limit(600);

    // Load event + track
    $stmt = $pdo->prepare("
        SELECT e.id, t.id AS track_id, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) {
        $pdo->prepare("UPDATE parity_backfill_jobs SET status = 'error', last_error = 'Event not found', finished_at = NOW() WHERE id = ?")
            ->execute([$jobId]);
        return;
    }

    $tz = $event['timezone_iana'];

    // Get Tempest config
    try {
        $config = parity_getTempestConfig();
    } catch (RuntimeException $e) {
        $pdo->prepare("UPDATE parity_backfill_jobs SET status = 'error', last_error = ?, finished_at = NOW() WHERE id = ?")
            ->execute([$e->getMessage(), $jobId]);
        return;
    }

    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'tempest')
    ");

    $stmtPending = $pdo->prepare("
        SELECT id, item_key FROM parity_backfill_job_items
        WHERE job_id = ? AND status IN ('pending','error')
        ORDER BY item_key ASC
        LIMIT 1
    ");
    $stmtUpdateItem = $pdo->prepare("
        UPDATE parity_backfill_job_items
        SET status = ?, attempts = attempts + 1, last_http_status = ?, last_error = ?,
            rows_fetched = ?, rows_inserted = ?, rows_deduped = ?
        WHERE id = ?
    ");
    $stmtUpdateJob = $pdo->prepare("
        UPDATE parity_backfill_jobs SET current_item_key = ?, last_error = ? WHERE id = ?
    ");
    $stmtCheckCancel = $pdo->prepare("SELECT status FROM parity_backfill_jobs WHERE id = ?");

    $isFirst = true;
    while (true) {
        // Check cancellation
        $stmtCheckCancel->execute([$jobId]);
        $jobStatus = $stmtCheckCancel->fetchColumn();
        if ($jobStatus !== 'running') break;

        $stmtPending->execute([$jobId]);
        $item = $stmtPending->fetch(PDO::FETCH_ASSOC);
        if (!$item) break;

        $dateStr = $item['item_key'];
        $stmtUpdateJob->execute([$dateStr, null, $jobId]);

        // Check existing rows
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
            $stmtUpdateItem->execute(['skipped', 0, "Already has $existing rows", 0, 0, 0, $item['id']]);
            continue;
        }

        // Throttle
        if (!$isFirst) {
            usleep($throttleMs * 1000);
        }
        $isFirst = false;

        try {
            $result = parity_fetchTempest(
                $range['start_epoch'],
                $range['end_epoch'],
                $config['bucket_minutes'],
                $config['station_id'],
                $config['api_key']
            );
            $samples = $result['samples'];
            $httpCode = $result['httpCode'];
        } catch (RuntimeException $e) {
            $stmtUpdateItem->execute(['error', 0, $e->getMessage(), 0, 0, 0, $item['id']]);
            $stmtUpdateJob->execute([$dateStr, $e->getMessage(), $jobId]);
            continue;
        }

        if (empty($samples)) {
            $stmtUpdateItem->execute(['no_data', $httpCode, null, 0, 0, 0, $item['id']]);
            continue;
        }

        $inserted = 0;
        $deduped = 0;
        foreach ($samples as $s) {
            $tsUtc = gmdate('Y-m-d H:i:s', $s['timestamp_epoch']);
            $utcDt = new DateTimeImmutable("@{$s['timestamp_epoch']}");
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $localStr = $localDt->format('Y-m-d H:i:s');
            $tempF = parity_cToF($s['temp_c']);

            try {
                $stmtInsert->execute([
                    $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                    $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                ]);
                $inserted++;
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false) {
                    $deduped++;
                } else {
                    throw $e;
                }
            }
        }

        $stmtUpdateItem->execute(['ok', $httpCode, null, count($samples), $inserted, $deduped, $item['id']]);
    }

    // Finalize
    refreshJobCounters($pdo, $jobId);
    $stmtCheckCancel->execute([$jobId]);
    $finalStatus = $stmtCheckCancel->fetchColumn();
    if ($finalStatus === 'running') {
        $pendingStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_backfill_job_items WHERE job_id = ? AND status IN ('pending','error')");
        $pendingStmt->execute([$jobId]);
        $pendingCount = (int)$pendingStmt->fetchColumn();
        $newStatus = $pendingCount > 0 ? 'error' : 'complete';
        $pdo->prepare("UPDATE parity_backfill_jobs SET status = ?, finished_at = NOW() WHERE id = ?")->execute([$newStatus, $jobId]);
    }
}

// ============================================================================
// POST ?action=startBackfillRuns
// Body: { yearStart, yearEnd, throttleMs?, force? }
// ============================================================================

function handleStartBackfillRuns(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $yearStart = (int)($input['yearStart'] ?? 0);
    $yearEnd = (int)($input['yearEnd'] ?? 0);

    if ($yearStart < 2000 || $yearEnd < $yearStart || $yearEnd > 2100) {
        rsa_jsonResponse(['error' => 'Invalid year range'], 400);
    }

    ensureNoRunningJob($pdo, 'runs');

    // Gather raceLookups via suggestRaceLookups for each year
    $allDates = [];
    for ($y = $yearStart; $y <= $yearEnd; $y++) {
        $url = "https://www.nhra.com/ODataResults/Results.svc/RoundResultsRaceLookup('{$y}0101')/?\$select=DumbyID&\$top=1&\$format=json";
        // Use suggestRaceLookups logic — scan known event start dates
        // For simplicity, we use the same NHRA OData probe approach
        $wedThursFri = [];
        $start = new DateTime("$y-01-01");
        $end = new DateTime("$y-12-31");
        while ($start <= $end) {
            $dow = (int)$start->format('N');
            if ($dow >= 3 && $dow <= 5) { // Wed=3, Thu=4, Fri=5
                $wedThursFri[] = $start->format('Ymd');
            }
            $start->modify('+1 day');
        }

        // Probe in batches — check which dates have data via peek
        // For efficiency, use the suggestRaceLookups endpoint logic:
        // just include all Wed/Thu/Fri dates as items, let the ingest handle 0-row results
        // But this creates too many items. Instead, let's use a simpler approach:
        // Actually query the NHRA OData to find which dates have results.
        $threshold = (int)($input['probeThreshold'] ?? 80);
        foreach ($wedThursFri as $rl) {
            $probeUrl = "https://www.nhra.com/ODataResults/Results.svc/RoundResultsRaceLookup('{$rl}')/?\$select=DumbyID&\$top=1&\$format=json&\$inlinecount=allpages";
            $raw = parity_httpGet($probeUrl);
            if ($raw !== false) {
                $json = json_decode($raw, true);
                $count = 0;
                if (isset($json['d']['__count'])) {
                    $count = (int)$json['d']['__count'];
                } elseif (isset($json['@odata.count'])) {
                    $count = (int)$json['@odata.count'];
                }
                if ($count >= $threshold) {
                    $allDates[] = $rl;
                }
            }
            usleep(100000); // 100ms between probes
        }
    }

    if (empty($allDates)) {
        rsa_jsonResponse(['error' => 'No events found in the given year range'], 404);
    }

    $jobId = createBackfillJob($pdo, 'runs', $userId, [
        'yearStart' => $yearStart,
        'yearEnd' => $yearEnd,
        'throttleMs' => (int)($input['throttleMs'] ?? 500),
        'force' => (bool)($input['force'] ?? false),
    ], $allDates);

    // Process items synchronously (with internal throttle + cancel checks)
    processRunsBackfillItems($pdo, $jobId, $userId, json_decode(
        json_encode(['throttleMs' => $input['throttleMs'] ?? 500, 'force' => $input['force'] ?? false]),
        true
    ));

    // Return final status
    $job = loadBackfillJob($pdo, $jobId);
    rsa_jsonResponse(['job' => formatJobRow($job)]);
}

// ============================================================================
// POST ?action=startBackfillWeather
// Body: { eventId, throttleMs?, minRowsPerDay? }
// ============================================================================

function handleStartBackfillWeather(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    if ($eventId <= 0) {
        rsa_jsonResponse(['error' => 'eventId is required'], 400);
    }

    // Load event
    $stmt = $pdo->prepare("
        SELECT e.id, e.start_date_local, e.end_date_local, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $stmt->execute([$eventId]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) {
        rsa_jsonResponse(['error' => "Event $eventId not found"], 404);
    }

    ensureNoRunningJob($pdo, 'weather');

    // Generate day items
    $tz = $event['timezone_iana'];
    $todayLocal = (new DateTime('now', new DateTimeZone($tz)))->format('Y-m-d');
    $toDate = $event['end_date_local'];
    if ($toDate > $todayLocal) $toDate = $todayLocal;

    $days = [];
    $current = new DateTime($event['start_date_local']);
    $end = new DateTime($toDate);
    while ($current <= $end) {
        $days[] = $current->format('Y-m-d');
        $current->modify('+1 day');
    }

    if (empty($days)) {
        rsa_jsonResponse(['error' => 'No days in event range (event may be in the future)'], 400);
    }

    $params = [
        'eventId' => $eventId,
        'throttleMs' => (int)($input['throttleMs'] ?? 500),
        'minRowsPerDay' => (int)($input['minRowsPerDay'] ?? 24),
    ];

    $jobId = createBackfillJob($pdo, 'weather', $userId, $params, $days);

    processWeatherBackfillItems($pdo, $jobId, $params);

    $job = loadBackfillJob($pdo, $jobId);
    rsa_jsonResponse(['job' => formatJobRow($job)]);
}

// ============================================================================
// POST ?action=resumeBackfill  { jobId }
// ============================================================================

function handleResumeBackfill(PDO $pdo, int $userId, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $jobId = (int)($input['jobId'] ?? 0);
    if ($jobId <= 0) {
        rsa_jsonResponse(['error' => 'jobId is required'], 400);
    }

    $job = loadBackfillJob($pdo, $jobId);
    if (!$job) {
        rsa_jsonResponse(['error' => 'Job not found'], 404);
    }

    if ($job['status'] === 'running') {
        rsa_jsonResponse(['error' => 'Job is already running'], 409);
    }

    // Reset error items back to pending for retry
    $pdo->prepare("
        UPDATE parity_backfill_job_items SET status = 'pending' WHERE job_id = ? AND status = 'error'
    ")->execute([$jobId]);

    // Mark job as running
    $pdo->prepare("UPDATE parity_backfill_jobs SET status = 'running', finished_at = NULL WHERE id = ?")
        ->execute([$jobId]);

    $params = json_decode($job['params_json'], true);

    if ($job['type'] === 'runs') {
        processRunsBackfillItems($pdo, $jobId, $userId, $params);
    } else {
        processWeatherBackfillItems($pdo, $jobId, $params);
    }

    $job = loadBackfillJob($pdo, $jobId);
    rsa_jsonResponse(['job' => formatJobRow($job)]);
}

// ============================================================================
// POST ?action=cancelBackfill  { jobId }
// ============================================================================

function handleCancelBackfill(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $jobId = (int)($input['jobId'] ?? 0);
    if ($jobId <= 0) {
        rsa_jsonResponse(['error' => 'jobId is required'], 400);
    }

    $job = loadBackfillJob($pdo, $jobId);
    if (!$job) {
        rsa_jsonResponse(['error' => 'Job not found'], 404);
    }

    $pdo->prepare("UPDATE parity_backfill_jobs SET status = 'cancelled', finished_at = NOW() WHERE id = ?")
        ->execute([$jobId]);
    refreshJobCounters($pdo, $jobId);

    $job = loadBackfillJob($pdo, $jobId);
    rsa_jsonResponse(['job' => formatJobRow($job)]);
}

// ============================================================================
// GET ?action=backfillStatus&jobId=...
// ============================================================================

function handleBackfillStatus(PDO $pdo): void {
    $jobId = (int)($_GET['jobId'] ?? 0);
    if ($jobId <= 0) {
        rsa_jsonResponse(['error' => 'jobId is required'], 400);
    }

    $job = loadBackfillJob($pdo, $jobId);
    if (!$job) {
        rsa_jsonResponse(['error' => 'Job not found'], 404);
    }

    // Load items
    $stmt = $pdo->prepare("
        SELECT item_key, status, attempts, last_http_status, last_error,
               rows_fetched, rows_inserted, rows_deduped, updated_at
        FROM parity_backfill_job_items
        WHERE job_id = ?
        ORDER BY item_key ASC
    ");
    $stmt->execute([$jobId]);
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($items as &$it) {
        $it['attempts'] = (int)$it['attempts'];
        $it['last_http_status'] = $it['last_http_status'] ? (int)$it['last_http_status'] : null;
        $it['rows_fetched'] = (int)$it['rows_fetched'];
        $it['rows_inserted'] = (int)$it['rows_inserted'];
        $it['rows_deduped'] = (int)$it['rows_deduped'];
    }

    rsa_jsonResponse([
        'job' => formatJobRow($job),
        'items' => $items,
    ]);
}

// ============================================================================
// GET ?action=backfillJobs
// ============================================================================

function handleBackfillJobs(PDO $pdo): void {
    $type = $_GET['type'] ?? '';
    $limit = min((int)($_GET['limit'] ?? 20), 100);

    $where = [];
    $params = [];
    if ($type) {
        $where[] = 'type = ?';
        $params[] = $type;
    }
    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;

    $stmt = $pdo->prepare("
        SELECT * FROM parity_backfill_jobs
        $whereClause
        ORDER BY created_at DESC
        LIMIT ?
    ");
    $stmt->execute($params);
    $jobs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    rsa_jsonResponse([
        'jobs' => array_map('formatJobRow', $jobs),
        'count' => count($jobs),
    ]);
}

/**
 * Format a job row for JSON response.
 */
function formatJobRow(array $job): array {
    return [
        'id' => (int)$job['id'],
        'type' => $job['type'],
        'status' => $job['status'],
        'createdByUserId' => $job['created_by_user_id'] ? (int)$job['created_by_user_id'] : null,
        'params' => json_decode($job['params_json'], true),
        'totalItems' => (int)$job['total_items'],
        'completedCount' => (int)$job['completed_count'],
        'skippedCount' => (int)$job['skipped_count'],
        'noDataCount' => (int)$job['no_data_count'],
        'errorCount' => (int)$job['error_count'],
        'currentItemKey' => $job['current_item_key'],
        'lastError' => $job['last_error'],
        'createdAt' => $job['created_at'],
        'updatedAt' => $job['updated_at'],
        'finishedAt' => $job['finished_at'],
    ];
}

// ============================================================================
// GET ?action=eventSummary&eventId=&classIndex=
// Returns: event headline stats — low ET, top MPH, winner, data health
// ============================================================================

function handleEventSummary(PDO $pdo): void {
    $eventId   = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    if (!$eventId) rsa_jsonResponse(['error' => 'eventId required'], 400);

    // Fetch event + track info
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, e.start_date_local, e.end_date_local,
               e.season_year, t.track_name, t.city, t.state
        FROM parity_events e
        LEFT JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    // Build class WHERE clause (expand aliases)
    $classWhere = '';
    $classParams = [$eventId];
    if ($classIndex !== '') {
        $expanded = parity_expandClassIndex($pdo, $classIndex);
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $classWhere = "AND r.class_index IN ($ph)";
        $classParams = array_merge($classParams, $expanded);
    }

    // Total qualifying + elim run count (exclude bad-flagged)
    $runStmt = $pdo->prepare("
        SELECT COUNT(*) AS run_count
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)
        AND f.id IS NULL
        $classWhere
    ");
    $runStmt->execute($classParams);
    $runCount = (int)$runStmt->fetchColumn();

    // Low ET (actual)
    $etStmt = $pdo->prepare("
        SELECT MIN(r.ft1320) AS low_et, MAX(r.mph1320) AS top_mph
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)
        AND f.id IS NULL
        AND r.ft1320 > 0 AND r.ft1320 IS NOT NULL
        $classWhere
    ");
    $etStmt->execute($classParams);
    $etRow = $etStmt->fetch(PDO::FETCH_ASSOC);

    // Low ET (corrected) + weather join % — use corrected runs helper
    $correctedLowEt = null;
    $weatherJoinPct = 0;
    if ($classIndex !== '') {
        $correctedRuns = parity_fetchCorrectedRuns($pdo, $eventId, $classIndex, false, 30);
        $correctedEts = array_filter(array_column($correctedRuns, 'corrected_ft1320'), fn($v) => $v !== null && $v > 0);
        if (!empty($correctedEts)) {
            $correctedLowEt = min($correctedEts);
        }
        // Weather join % = runs that have a weather timestamp / total corrected runs
        $weatherJoined = count(array_filter($correctedRuns, fn($r) => $r['weather_timestamp_utc'] !== null));
        if (count($correctedRuns) > 0) {
            $weatherJoinPct = round(($weatherJoined / count($correctedRuns)) * 100, 1);
        }
    } else {
        // All-class: use weather samples count vs run count as weather coverage proxy
        $wxStmt = $pdo->prepare("
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN r.run_timestamp_utc IS NOT NULL THEN 1 ELSE 0 END) AS with_ts
            FROM parity_runs r
            LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
            WHERE r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)
            AND f.id IS NULL
        ");
        $wxStmt->execute([$eventId]);
        $wxRow = $wxStmt->fetch(PDO::FETCH_ASSOC);
        $sampStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_weather_samples WHERE event_id = ?");
        $sampStmt->execute([$eventId]);
        $sampCount = (int)$sampStmt->fetchColumn();
        $weatherJoinPct = ($wxRow['total'] > 0 && $sampCount > 0) ? min(100, round(($sampCount / max(1, (int)$wxRow['total'])) * 100, 1)) : 0;
    }

    // Winner: highest elimination round with win_flag
    $winStmt = $pdo->prepare("
        SELECT r.driver_name, r.round, r.ft1320, r.mph1320
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)
        AND f.id IS NULL
        AND r.win_flag = 1
        $classWhere
        ORDER BY
            CASE
                WHEN UPPER(r.round) LIKE 'F%' THEN 100
                WHEN UPPER(r.round) LIKE 'E4%' OR UPPER(r.round) LIKE 'R4%' THEN 90
                WHEN UPPER(r.round) LIKE 'E3%' OR UPPER(r.round) LIKE 'R3%' THEN 80
                WHEN UPPER(r.round) LIKE 'E2%' OR UPPER(r.round) LIKE 'R2%' THEN 70
                WHEN UPPER(r.round) LIKE 'E1%' OR UPPER(r.round) LIKE 'R1%' THEN 60
                ELSE 0
            END DESC
        LIMIT 1
    ");
    $winStmt->execute($classParams);
    $winner = $winStmt->fetch(PDO::FETCH_ASSOC);

    // Flagged count (expand class aliases)
    $flagClassWhere = '';
    $flagParams = [$eventId];
    if ($classIndex !== '') {
        $expandedFlag = parity_expandClassIndex($pdo, $classIndex);
        $phFlag = implode(',', array_fill(0, count($expandedFlag), '?'));
        $flagClassWhere = "AND r.class_index IN ($phFlag)";
        $flagParams = array_merge($flagParams, $expandedFlag);
    }
    $flagStmt = $pdo->prepare("
        SELECT COUNT(DISTINCT f.run_id) AS flagged_count
        FROM parity_run_flags f
        JOIN parity_runs r ON r.id = f.run_id
        WHERE r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)
        AND f.flag_type IN ('bad','exclude')
        $flagClassWhere
    ");
    $flagStmt->execute($flagParams);
    $flaggedCount = (int)$flagStmt->fetchColumn();

    rsa_jsonResponse([
        'eventId'       => $eventId,
        'classIndex'    => $classIndex,
        'event' => [
            'event_name'       => $event['event_name'],
            'track_name'       => $event['track_name'],
            'city'             => $event['city'],
            'state'            => $event['state'],
            'start_date_local' => $event['start_date_local'],
            'end_date_local'   => $event['end_date_local'],
            'season_year'      => $event['season_year'] ? (int)$event['season_year'] : null,
        ],
        'runCount'        => $runCount,
        'lowEt_actual'    => $etRow['low_et'] !== null ? (float)$etRow['low_et'] : null,
        'lowEt_corrected' => $correctedLowEt !== null ? round($correctedLowEt, 4) : null,
        'topMph'          => $etRow['top_mph'] !== null ? (float)$etRow['top_mph'] : null,
        'winner' => $winner ? [
            'driver'  => $winner['driver_name'],
            'round'   => $winner['round'],
            'et'      => $winner['ft1320'] !== null ? (float)$winner['ft1320'] : null,
            'mph'     => $winner['mph1320'] !== null ? (float)$winner['mph1320'] : null,
        ] : null,
        'weatherJoinPct'  => $weatherJoinPct,
        'flaggedCount'    => $flaggedCount,
        'correction_model_version' => PARITY_CORRECTION_MODEL_VERSION,
    ]);
}

// ============================================================================
// GET ?action=drivers
// Returns: distinct driver list for typeahead
// ============================================================================

function handleDrivers(PDO $pdo): void {
    $classIndex = trim($_GET['classIndex'] ?? '');
    $search     = trim($_GET['search'] ?? '');
    $limit      = min((int)($_GET['limit'] ?? 200), 500);

    $where = ['1=1'];
    $params = [];

    if ($classIndex !== '') {
        $expanded = parity_expandClassIndex($pdo, $classIndex);
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $where[] = "r.class_index IN ($ph)";
        $params = array_merge($params, $expanded);
    }
    if ($search !== '') {
        $where[] = 'r.driver_name LIKE ?';
        $params[] = '%' . $search . '%';
    }

    $whereClause = implode(' AND ', $where);
    $params[] = $limit;

    $stmt = $pdo->prepare("
        SELECT r.driver_name, COUNT(*) AS run_count,
               MIN(r.ft1320) AS best_et, MAX(r.mph1320) AS best_mph,
               COUNT(DISTINCT r.race_lookup) AS event_count
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE f.id IS NULL
        AND r.driver_name IS NOT NULL AND r.driver_name != ''
        AND $whereClause
        GROUP BY r.driver_name
        ORDER BY run_count DESC
        LIMIT ?
    ");
    $stmt->execute($params);
    $drivers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    rsa_jsonResponse([
        'drivers' => array_map(function ($d) {
            return [
                'driver'     => $d['driver_name'],
                'run_count'  => (int)$d['run_count'],
                'best_et'    => $d['best_et'] !== null ? (float)$d['best_et'] : null,
                'best_mph'   => $d['best_mph'] !== null ? (float)$d['best_mph'] : null,
                'event_count' => (int)$d['event_count'],
            ];
        }, $drivers),
    ]);
}

// ============================================================================
// GET ?action=runsByDriver&driverName=&classIndex=&startDate=&endDate=&eventId=&round=&includeFlagged=
// Returns: all runs for a driver with sorting and filtering
// ============================================================================

function handleRunsByDriver(PDO $pdo): void {
    $driverName  = trim($_GET['driverName'] ?? '');
    $classIndex  = trim($_GET['classIndex'] ?? '');
    $startDate   = trim($_GET['startDate'] ?? '');
    $endDate     = trim($_GET['endDate'] ?? '');
    $eventId     = (int)($_GET['eventId'] ?? 0);
    $round       = trim($_GET['round'] ?? '');
    $session     = strtolower(trim($_GET['session'] ?? '')); // qual, elim, or empty=both
    $includeFlagged = ($_GET['includeFlagged'] ?? '0') === '1';
    $includeWeather = ($_GET['includeWeather'] ?? '0') === '1';
    $limit       = min((int)($_GET['limit'] ?? 500), 2000);

    if ($driverName === '') {
        rsa_jsonResponse(['error' => 'driverName required'], 400);
    }

    $where = ['r.driver_name = ?'];
    $params = [$driverName];

    if ($classIndex !== '') {
        $expanded = parity_expandClassIndex($pdo, $classIndex);
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $where[] = "r.class_index IN ($ph)";
        $params = array_merge($params, $expanded);
    }
    if ($startDate !== '') {
        $where[] = 'r.race_lookup >= ?';
        $params[] = $startDate;
    }
    if ($endDate !== '') {
        $where[] = 'r.race_lookup <= ?';
        $params[] = $endDate;
    }
    if ($eventId > 0) {
        $where[] = 'r.race_lookup = (SELECT race_lookup FROM parity_events WHERE id = ?)';
        $params[] = $eventId;
    }
    if ($round !== '') {
        $where[] = 'r.round = ?';
        $params[] = $round;
    }
    // Session filter: qual = Q rounds, elim = E rounds
    if ($session === 'qual') {
        $where[] = "r.round LIKE 'Q%'";
    } elseif ($session === 'elim') {
        $where[] = "r.round LIKE 'E%'";
    }
    if (!$includeFlagged) {
        $where[] = 'f.id IS NULL';
    }

    $whereClause = implode(' AND ', $where);
    $params[] = $limit;

    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc,
               r.class_index, r.round, r.lane, r.driver_name, r.car_number,
               r.rt, r.ft60, r.ft330, r.ft660, r.mph660,
               r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               r.win_flag, r.dq_flag, r.place,
               e.event_name, t.track_name
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        LEFT JOIN parity_events e ON e.race_lookup = r.race_lookup
        LEFT JOIN parity_tracks t ON t.id = e.track_id
        WHERE $whereClause
        ORDER BY r.race_lookup DESC, r.run_timestamp_utc DESC
        LIMIT ?
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Prepare weather join if requested
    $stmtW = null;
    $windowMinutes = 30;
    if ($includeWeather) {
        $stmtW = $pdo->prepare("
            SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
                   canonical_source_kind, canonical_source_detail, sample_count,
                   TIMESTAMPDIFF(SECOND, timestamp_utc, ?) AS delta_seconds
            FROM parity_weather_canonical
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
            LIMIT 1
        ");
    }

    // Compute incrementals + weather for each run
    $runs = array_map(function ($r) use ($stmtW, $windowMinutes, $includeWeather) {
        $ft60   = $r['ft60'] !== null ? (float)$r['ft60'] : null;
        $ft330  = $r['ft330'] !== null ? (float)$r['ft330'] : null;
        $ft660  = $r['ft660'] !== null ? (float)$r['ft660'] : null;
        $ft1000 = $r['ft1000'] !== null ? (float)$r['ft1000'] : null;
        $ft1320 = $r['ft1320'] !== null ? (float)$r['ft1320'] : null;

        $row = [
            'id'                => (int)$r['id'],
            'uuid'              => $r['uuid'],
            'race_lookup'       => $r['race_lookup'],
            'run_timestamp_utc' => $r['run_timestamp_utc'],
            'class_index'       => $r['class_index'],
            'round'             => $r['round'],
            'lane'              => $r['lane'],
            'driver_name'       => $r['driver_name'],
            'car_number'        => $r['car_number'],
            'rt'                => $r['rt'] !== null ? (float)$r['rt'] : null,
            'ft60'              => $ft60,
            'ft330'             => $ft330,
            'ft660'             => $ft660,
            'mph660'            => $r['mph660'] !== null ? (float)$r['mph660'] : null,
            'ft1000'            => $ft1000,
            'mph1000'           => $r['mph1000'] !== null ? (float)$r['mph1000'] : null,
            'ft1320'            => $ft1320,
            'mph1320'           => $r['mph1320'] !== null ? (float)$r['mph1320'] : null,
            'win_flag'          => $r['win_flag'] ? true : false,
            'dq_flag'           => $r['dq_flag'] ? true : false,
            'place'             => $r['place'],
            'event_name'        => $r['event_name'],
            'track_name'        => $r['track_name'],
            // Incrementals
            'inc_0_60'          => $ft60,
            'inc_60_330'        => ($ft330 !== null && $ft60 !== null && $ft330 > $ft60) ? round($ft330 - $ft60, 4) : null,
            'inc_330_660'       => ($ft660 !== null && $ft330 !== null && $ft660 > $ft330) ? round($ft660 - $ft330, 4) : null,
            'inc_660_1000'      => ($ft1000 !== null && $ft660 !== null && $ft1000 > $ft660) ? round($ft1000 - $ft660, 4) : null,
            'inc_1000_1320'     => ($ft1320 !== null && $ft1000 !== null && $ft1320 > $ft1000) ? round($ft1320 - $ft1000, 4) : null,
        ];

        // Weather join
        if ($includeWeather && $stmtW && $r['run_timestamp_utc']) {
            $ts = $r['run_timestamp_utc'];
            $stmtW->execute([$ts, $ts, $windowMinutes, $ts, $windowMinutes, $ts]);
            $w = $stmtW->fetch(\PDO::FETCH_ASSOC);
            if ($w) {
                $tempF = $w['temp_f'] !== null ? (float)$w['temp_f'] : null;
                $rhPct = $w['rh_pct'] !== null ? (float)$w['rh_pct'] : null;
                $pressInhg = $w['pressure_inhg'] !== null ? (float)$w['pressure_inhg'] : null;
                $corrFactor = parity_correctionFactor($tempF, $pressInhg, $rhPct);
                $row['weather'] = [
                    'timestamp_utc' => $w['timestamp_utc'],
                    'temp_f' => $tempF,
                    'rh_pct' => $rhPct,
                    'pressure_inhg' => $pressInhg,
                    'delta_seconds' => (int)$w['delta_seconds'],
                    'canonical_source_kind' => $w['canonical_source_kind'] ?? null,
                    'canonical_source_detail' => $w['canonical_source_detail'] ?? null,
                    'sample_count' => (int)($w['sample_count'] ?? 0),
                ];
                $row['correction_factor'] = $corrFactor !== null ? round($corrFactor, 6) : null;
                $row['corrected_ft1320'] = parity_correctET($ft1320, $corrFactor);
                $row['corrected_ft660'] = parity_correctET($ft660, $corrFactor);
                $row['corrected_ft60'] = parity_correctET($ft60, $corrFactor);
            } else {
                $row['weather'] = null;
                $row['correction_factor'] = null;
                $row['corrected_ft1320'] = null;
                $row['corrected_ft660'] = null;
                $row['corrected_ft60'] = null;
            }
        }

        return $row;
    }, $rows);

    rsa_jsonResponse([
        'driverName' => $driverName,
        'runs'       => $runs,
        'total'      => count($runs),
    ]);
}

// ============================================================================
// GET ?action=listTracksWithStats
// Returns: tracks with event count, total run count, weather sample count
// ============================================================================

function handleListTracksWithStats(PDO $pdo): void {
    $stmt = $pdo->prepare("
        SELECT t.id, t.track_name, t.timezone_iana, t.street, t.city, t.state, t.zip, t.created_at,
               COUNT(DISTINCT e.id) AS event_count,
               COALESCE(SUM(sub.run_count), 0) AS total_run_count,
               COALESCE(SUM(sub.weather_sample_count), 0) AS total_weather_samples
        FROM parity_tracks t
        LEFT JOIN parity_events e ON e.track_id = t.id
        LEFT JOIN (
            SELECT e2.id AS event_id,
                   (SELECT COUNT(*) FROM parity_runs r WHERE r.race_lookup = e2.race_lookup) AS run_count,
                   (SELECT COUNT(*) FROM parity_weather_samples ws WHERE ws.event_id = e2.id) AS weather_sample_count
            FROM parity_events e2
        ) sub ON sub.event_id = e.id
        GROUP BY t.id
        ORDER BY t.track_name ASC
    ");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['event_count'] = (int)$r['event_count'];
        $r['total_run_count'] = (int)$r['total_run_count'];
        $r['total_weather_samples'] = (int)$r['total_weather_samples'];
    }

    rsa_jsonResponse(['tracks' => $rows, 'count' => count($rows)]);
}

// ============================================================================
// POST ?action=updateTrack
// Body: { trackId, track_name?, timezone_iana?, street?, city?, state?, zip? }
// ============================================================================

function handleUpdateTrack(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $trackId = (int)($input['trackId'] ?? 0);
    if (!$trackId) rsa_jsonResponse(['error' => 'trackId required'], 400);

    // Verify track exists
    $stmt = $pdo->prepare("SELECT id FROM parity_tracks WHERE id = ?");
    $stmt->execute([$trackId]);
    if (!$stmt->fetch()) rsa_jsonResponse(['error' => 'Track not found'], 404);

    $updatable = ['track_name', 'timezone_iana', 'street', 'city', 'state', 'zip'];
    $sets = [];
    $params = [];
    foreach ($updatable as $col) {
        if (array_key_exists($col, $input)) {
            $sets[] = "$col = ?";
            $params[] = trim($input[$col]);
        }
    }

    if (empty($sets)) rsa_jsonResponse(['error' => 'No fields to update'], 400);

    $params[] = $trackId;
    $pdo->prepare("UPDATE parity_tracks SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    rsa_jsonResponse(['ok' => true, 'trackId' => $trackId]);
}

// ============================================================================
// POST ?action=mergeTracks
// Body: { sourceTrackId: int, targetTrackId: int }
// Moves all events from source track to target track, then deletes source track.
// ============================================================================

function handleMergeTracks(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $sourceId = (int)($input['sourceTrackId'] ?? 0);
    $targetId = (int)($input['targetTrackId'] ?? 0);

    if (!$sourceId || !$targetId) rsa_jsonResponse(['error' => 'sourceTrackId and targetTrackId required'], 400);
    if ($sourceId === $targetId) rsa_jsonResponse(['error' => 'Source and target must be different'], 400);

    // Verify both tracks exist
    $stmt = $pdo->prepare("SELECT id, track_name FROM parity_tracks WHERE id IN (?, ?)");
    $stmt->execute([$sourceId, $targetId]);
    $found = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
    if (!isset($found[$sourceId])) rsa_jsonResponse(['error' => "Source track $sourceId not found"], 404);
    if (!isset($found[$targetId])) rsa_jsonResponse(['error' => "Target track $targetId not found"], 404);

    // Count events being moved
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM parity_events WHERE track_id = ?");
    $stmt->execute([$sourceId]);
    $eventsMoved = (int)$stmt->fetchColumn();

    // Reassign events
    $pdo->prepare("UPDATE parity_events SET track_id = ? WHERE track_id = ?")->execute([$targetId, $sourceId]);

    // Delete source track
    $pdo->prepare("DELETE FROM parity_tracks WHERE id = ?")->execute([$sourceId]);

    rsa_jsonResponse([
        'ok' => true,
        'sourceTrackId' => $sourceId,
        'targetTrackId' => $targetId,
        'eventsMoved' => $eventsMoved,
        'sourceTrackName' => $found[$sourceId],
        'targetTrackName' => $found[$targetId],
    ]);
}

// ============================================================================
// POST ?action=updateEvent
// Body: { eventId, event_name?, season_year?, track_id?, start_date_local?, end_date_local?, race_lookup? }
// ============================================================================

function handleUpdateEvent(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    if (!$eventId) rsa_jsonResponse(['error' => 'eventId required'], 400);

    // Verify event exists
    $stmt = $pdo->prepare("SELECT id FROM parity_events WHERE id = ?");
    $stmt->execute([$eventId]);
    if (!$stmt->fetch()) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $updatable = ['event_name', 'event_code', 'season_year', 'track_id', 'start_date_local', 'end_date_local', 'race_lookup'];
    $sets = [];
    $params = [];
    foreach ($updatable as $col) {
        if (array_key_exists($col, $input)) {
            $val = $input[$col];
            if ($col === 'season_year' || $col === 'track_id') {
                $val = $val !== null ? (int)$val : null;
            } else {
                $val = trim($val);
            }
            $sets[] = "$col = ?";
            $params[] = $val;
        }
    }

    if (empty($sets)) rsa_jsonResponse(['error' => 'No fields to update'], 400);

    $params[] = $eventId;
    $pdo->prepare("UPDATE parity_events SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    rsa_jsonResponse(['ok' => true, 'eventId' => $eventId]);
}

// ============================================================================
// POST ?action=bulkCreateEvents
// Body: { events: [ { event_name, track_id, start_date_local, end_date_local, race_lookup?, season_year? }, ... ], skipDuplicates?: true, updateExisting?: false }
// Returns per-row results with status: created | duplicate_skipped | duplicate_updated | error
// ============================================================================

function handleBulkCreateEvents(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $rows = $input['events'] ?? [];
    $skipDuplicates = (bool)($input['skipDuplicates'] ?? true);
    $updateExisting = (bool)($input['updateExisting'] ?? false);

    if (!is_array($rows) || count($rows) === 0) {
        rsa_jsonResponse(['error' => 'events array is required and must not be empty'], 400);
    }
    if (count($rows) > 200) {
        rsa_jsonResponse(['error' => 'Maximum 200 events per batch'], 400);
    }

    // Pre-load all tracks for validation
    $trackStmt = $pdo->query("SELECT id FROM parity_tracks");
    $validTrackIds = [];
    foreach ($trackStmt->fetchAll(PDO::FETCH_ASSOC) as $t) {
        $validTrackIds[(int)$t['id']] = true;
    }

    // Pre-load existing events for duplicate detection (start_date + track_id)
    $existingStmt = $pdo->query("SELECT id, start_date_local, track_id, race_lookup FROM parity_events");
    $existingMap = []; // key: "YYYY-MM-DD|track_id"
    foreach ($existingStmt->fetchAll(PDO::FETCH_ASSOC) as $e) {
        $key = $e['start_date_local'] . '|' . (int)$e['track_id'];
        $existingMap[$key] = [
            'id' => (int)$e['id'],
            'race_lookup' => $e['race_lookup'],
        ];
    }

    $insertStmt = $pdo->prepare("
        INSERT INTO parity_events (event_name, track_id, start_date_local, end_date_local, race_lookup, season_year)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $updateStmt = $pdo->prepare("
        UPDATE parity_events SET event_name = ?, end_date_local = ?, race_lookup = ?, season_year = ?
        WHERE id = ?
    ");

    $results = [];
    $summary = ['created' => 0, 'duplicate_skipped' => 0, 'duplicate_updated' => 0, 'error' => 0];

    foreach ($rows as $i => $row) {
        $eventName = trim($row['event_name'] ?? '');
        $trackId = (int)($row['track_id'] ?? 0);
        $startDate = trim($row['start_date_local'] ?? '');
        $endDate = trim($row['end_date_local'] ?? '');
        $raceLookup = trim($row['race_lookup'] ?? '');
        $seasonYear = isset($row['season_year']) ? (int)$row['season_year'] : null;

        // Validation
        if (empty($eventName)) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => 'event_name is required'];
            $summary['error']++;
            continue;
        }
        if ($trackId <= 0 || !isset($validTrackIds[$trackId])) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => "Invalid track_id: $trackId"];
            $summary['error']++;
            continue;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => "Invalid start_date_local: $startDate"];
            $summary['error']++;
            continue;
        }
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => "Invalid end_date_local: $endDate"];
            $summary['error']++;
            continue;
        }

        // Auto-generate race_lookup if empty
        if (empty($raceLookup)) {
            $raceLookup = str_replace('-', '', $startDate); // YYYYMMDD
        }

        // Auto-generate season_year if null
        if ($seasonYear === null || $seasonYear === 0) {
            $seasonYear = (int)substr($startDate, 0, 4);
        }

        // Duplicate check
        $dupKey = $startDate . '|' . $trackId;
        if (isset($existingMap[$dupKey])) {
            $existingId = $existingMap[$dupKey]['id'];
            if ($updateExisting) {
                try {
                    $updateStmt->execute([$eventName, $endDate, $raceLookup, $seasonYear, $existingId]);
                    $results[] = ['row' => $i, 'status' => 'duplicate_updated', 'eventId' => $existingId, 'raceLookup' => $raceLookup];
                    $summary['duplicate_updated']++;
                } catch (PDOException $e) {
                    $results[] = ['row' => $i, 'status' => 'error', 'error' => 'Update failed: ' . $e->getMessage()];
                    $summary['error']++;
                }
            } else {
                $results[] = ['row' => $i, 'status' => 'duplicate_skipped', 'existingEventId' => $existingId];
                $summary['duplicate_skipped']++;
            }
            continue;
        }

        // Insert
        try {
            $insertStmt->execute([$eventName, $trackId, $startDate, $endDate, $raceLookup, $seasonYear]);
            $newId = (int)$pdo->lastInsertId();
            $results[] = ['row' => $i, 'status' => 'created', 'eventId' => $newId, 'raceLookup' => $raceLookup];
            $summary['created']++;
            // Add to existing map to catch intra-batch duplicates
            $existingMap[$dupKey] = ['id' => $newId, 'race_lookup' => $raceLookup];
        } catch (PDOException $e) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => 'Insert failed: ' . $e->getMessage()];
            $summary['error']++;
        }
    }

    rsa_jsonResponse([
        'ok' => true,
        'summary' => $summary,
        'results' => $results,
    ]);
}

// ============================================================================
// GET ?action=listEngineCombos
// ============================================================================

function handleListEngineCombos(PDO $pdo): void {
    $stmt = $pdo->query("SELECT id, name, t_power, d_power, friction_factor, created_at, updated_at FROM parity_engine_combos ORDER BY name");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['t_power'] = (float)$r['t_power'];
        $r['d_power'] = (float)$r['d_power'];
        $r['friction_factor'] = (float)$r['friction_factor'];
    }
    rsa_jsonResponse(['combos' => $rows]);
}

// ============================================================================
// POST ?action=upsertEngineCombo   body: { id?, name, tPower, dPower, FF }
// ============================================================================

function handleUpsertEngineCombo(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id      = isset($input['id']) ? (int)$input['id'] : null;
    $name    = trim($input['name'] ?? '');
    $tPower  = (float)($input['tPower'] ?? 0);
    $dPower  = (float)($input['dPower'] ?? 0);
    $ff      = (float)($input['FF'] ?? 0);

    if ($name === '') rsa_jsonResponse(['error' => 'name is required'], 400);
    if (!is_finite($tPower) || !is_finite($dPower) || !is_finite($ff)) {
        rsa_jsonResponse(['error' => 'tPower, dPower, and FF must be finite numbers'], 400);
    }

    if ($id) {
        // Check name uniqueness (exclude self)
        $chk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE name=? AND id!=?");
        $chk->execute([$name, $id]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Engine combo name already exists'], 409);
        $pdo->prepare("UPDATE parity_engine_combos SET name=?, t_power=?, d_power=?, friction_factor=? WHERE id=?")
            ->execute([$name, $tPower, $dPower, $ff, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        $chk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE name=?");
        $chk->execute([$name]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Engine combo name already exists'], 409);
        $pdo->prepare("INSERT INTO parity_engine_combos (name, t_power, d_power, friction_factor) VALUES (?,?,?,?)")
            ->execute([$name, $tPower, $dPower, $ff]);
        rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

// ============================================================================
// POST ?action=deleteEngineCombo   body: { id }
// ============================================================================

function handleDeleteEngineCombo(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) rsa_jsonResponse(['error' => 'id is required'], 400);

    // Check if referenced by driver combos
    $chk = $pdo->prepare("SELECT COUNT(*) FROM parity_driver_combos WHERE engine_combo_id=?");
    $chk->execute([$id]);
    if ((int)$chk->fetchColumn() > 0) {
        rsa_jsonResponse(['error' => 'Cannot delete: engine combo is referenced by driver combos'], 409);
    }

    $pdo->prepare("DELETE FROM parity_engine_combos WHERE id=?")->execute([$id]);
    rsa_jsonResponse(['ok' => true]);
}

// ============================================================================
// GET ?action=listDriverCombos   optional: ?driverName=...&classIndex=...
// ============================================================================

function handleListDriverCombos(PDO $pdo): void {
    $where = ['1=1'];
    $params = [];
    if (!empty($_GET['driverName'])) {
        $where[] = 'dc.driver_name LIKE ?';
        $params[] = '%' . trim($_GET['driverName']) . '%';
    }
    if (!empty($_GET['classIndex'])) {
        $where[] = 'dc.class_index = ?';
        $params[] = trim($_GET['classIndex']);
    }
    $whereClause = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT dc.id, dc.driver_name, dc.class_index, dc.engine_combo_id,
               ec.name AS engine_combo_name, ec.t_power, ec.d_power, ec.friction_factor,
               dc.effective_from_utc, dc.effective_to_utc, dc.created_at, dc.updated_at
        FROM parity_driver_combos dc
        JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
        WHERE $whereClause
        ORDER BY dc.driver_name, dc.class_index, dc.effective_from_utc DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['engine_combo_id'] = (int)$r['engine_combo_id'];
        $r['t_power'] = (float)$r['t_power'];
        $r['d_power'] = (float)$r['d_power'];
        $r['friction_factor'] = (float)$r['friction_factor'];
    }
    rsa_jsonResponse(['combos' => $rows]);
}

// ============================================================================
// POST ?action=upsertDriverCombo
// body: { id?, driverName, classIndex, engineComboId, effectiveFromUtc, effectiveToUtc? }
// ============================================================================

function handleUpsertDriverCombo(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id              = isset($input['id']) ? (int)$input['id'] : null;
    $driverName      = strtoupper(trim($input['driverName'] ?? ''));
    $classIndex      = strtoupper(trim($input['classIndex'] ?? ''));
    $engineComboId   = (int)($input['engineComboId'] ?? 0);
    $effectiveFrom   = trim($input['effectiveFromUtc'] ?? '');
    $effectiveTo     = isset($input['effectiveToUtc']) && trim($input['effectiveToUtc']) !== '' ? trim($input['effectiveToUtc']) : null;

    if ($driverName === '' || $classIndex === '' || !$engineComboId || $effectiveFrom === '') {
        rsa_jsonResponse(['error' => 'driverName, classIndex, engineComboId, effectiveFromUtc are required'], 400);
    }

    // Validate engine combo exists
    $ecChk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE id=?");
    $ecChk->execute([$engineComboId]);
    if (!$ecChk->fetch()) rsa_jsonResponse(['error' => 'Engine combo not found'], 404);

    // Validate date range
    if ($effectiveTo !== null && $effectiveTo <= $effectiveFrom) {
        rsa_jsonResponse(['error' => 'effectiveToUtc must be after effectiveFromUtc'], 400);
    }

    // Check for overlaps (exclude self when updating)
    $overlapWhere = "driver_name=? AND class_index=? AND effective_from_utc < ? AND (effective_to_utc IS NULL OR effective_to_utc > ?)";
    $overlapParams = [$driverName, $classIndex, $effectiveTo ?? '9999-12-31 23:59:59', $effectiveFrom];
    if ($id) {
        $overlapWhere .= " AND id != ?";
        $overlapParams[] = $id;
    }
    $olap = $pdo->prepare("SELECT id FROM parity_driver_combos WHERE $overlapWhere LIMIT 1");
    $olap->execute($overlapParams);
    if ($olap->fetch()) {
        rsa_jsonResponse(['error' => 'Overlapping effective date range for this driver/class'], 409);
    }

    if ($id) {
        $pdo->prepare("UPDATE parity_driver_combos SET driver_name=?, class_index=?, engine_combo_id=?, effective_from_utc=?, effective_to_utc=? WHERE id=?")
            ->execute([$driverName, $classIndex, $engineComboId, $effectiveFrom, $effectiveTo, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        $pdo->prepare("INSERT INTO parity_driver_combos (driver_name, class_index, engine_combo_id, effective_from_utc, effective_to_utc) VALUES (?,?,?,?,?)")
            ->execute([$driverName, $classIndex, $engineComboId, $effectiveFrom, $effectiveTo]);
        rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

// ============================================================================
// POST ?action=deleteDriverCombo   body: { id }
// ============================================================================

function handleDeleteDriverCombo(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) rsa_jsonResponse(['error' => 'id is required'], 400);
    $pdo->prepare("DELETE FROM parity_driver_combos WHERE id=?")->execute([$id]);
    rsa_jsonResponse(['ok' => true]);
}

// ============================================================================
// POST ?action=backfillWeatherCsv
// Body: { eventId, trackId, rows: [{timestampUtc, tempF, humidityPct, baroInHg}] }
// Writes CSV-parsed weather samples into parity_weather_samples with source='csv_backfill'.
// Admin-only. Deduplicates on (timestamp_utc, event_id, source).
// ============================================================================

function handleBackfillWeatherCsv(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    $trackId = (int)($input['trackId'] ?? 0);
    $rows    = $input['rows'] ?? [];

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($trackId <= 0) rsa_jsonResponse(['error' => 'trackId is required'], 400);
    if (!is_array($rows) || count($rows) === 0) rsa_jsonResponse(['error' => 'rows array is required and must not be empty'], 400);
    if (count($rows) > 10000) rsa_jsonResponse(['error' => 'Maximum 10,000 rows per request'], 400);

    // Validate event exists
    $evtChk = $pdo->prepare("SELECT e.id, t.timezone_iana FROM parity_events e JOIN parity_tracks t ON t.id=e.track_id WHERE e.id=?");
    $evtChk->execute([$eventId]);
    $evt = $evtChk->fetch(PDO::FETCH_ASSOC);
    if (!$evt) rsa_jsonResponse(['error' => "Event $eventId not found"], 404);

    $tz = $evt['timezone_iana'];

    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'csv_backfill')
    ");

    $inserted = 0;
    $deduped = 0;
    $errors = [];

    foreach ($rows as $i => $row) {
        $tsUtc = trim($row['timestampUtc'] ?? '');
        $tempF = isset($row['tempF']) ? (float)$row['tempF'] : null;
        $humPct = isset($row['humidityPct']) ? (float)$row['humidityPct'] : null;
        $baroInHg = isset($row['baroInHg']) ? (float)$row['baroInHg'] : null;

        if ($tsUtc === '' || $tempF === null || $humPct === null || $baroInHg === null) {
            $errors[] = "Row $i: missing required fields (timestampUtc, tempF, humidityPct, baroInHg)";
            continue;
        }
        if (!is_finite($tempF) || !is_finite($humPct) || !is_finite($baroInHg)) {
            $errors[] = "Row $i: non-finite numeric values";
            continue;
        }

        // Convert tempF → tempC
        $tempC = ($tempF - 32) * 5.0 / 9.0;

        // Convert inHg to mbar for station_pressure_raw (Tempest uses mbar)
        $pressureMbar = $baroInHg / 0.02953;

        // Compute local time
        try {
            $utcDt = new DateTimeImmutable($tsUtc, new DateTimeZone('UTC'));
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $localStr = $localDt->format('Y-m-d H:i:s');
            $tsUtcFmt = $utcDt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $errors[] = "Row $i: invalid timestamp '$tsUtc'";
            continue;
        }

        try {
            $stmtInsert->execute([
                $tsUtcFmt,
                $eventId,
                $trackId,
                $localStr,
                round($tempC, 4),
                round($tempF, 4),
                round($humPct, 2),
                round($pressureMbar, 4),
                // source is 'csv_backfill' from prepared statement
            ]);
            $inserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped++;
            } else {
                $errors[] = "Row $i: " . $e->getMessage();
            }
        }
    }

    rsa_jsonResponse([
        'ok' => true,
        'eventId' => $eventId,
        'trackId' => $trackId,
        'totalRows' => count($rows),
        'inserted' => $inserted,
        'deduped' => $deduped,
        'errorCount' => count($errors),
        'errors' => array_slice($errors, 0, 20), // cap error reporting
    ]);
}

// ============================================================================
// GET ?action=listClassDefaults  optional: ?classIndex=...
// ============================================================================

function handleListClassDefaults(PDO $pdo): void {
    $where = ['1=1'];
    $params = [];
    if (!empty($_GET['classIndex'])) {
        $where[] = 'cd.class_index = ?';
        $params[] = strtoupper(trim($_GET['classIndex']));
    }
    $whereClause = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT cd.id, cd.class_index, cd.engine_combo_id,
               ec.name AS engine_combo_name, ec.t_power, ec.d_power, ec.friction_factor,
               cd.effective_from_utc, cd.effective_to_utc, cd.notes,
               cd.created_at, cd.updated_at
        FROM parity_class_defaults cd
        JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
        WHERE $whereClause
        ORDER BY cd.class_index, cd.effective_from_utc DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['engine_combo_id'] = (int)$r['engine_combo_id'];
        $r['t_power'] = (float)$r['t_power'];
        $r['d_power'] = (float)$r['d_power'];
        $r['friction_factor'] = (float)$r['friction_factor'];
    }
    rsa_jsonResponse(['classDefaults' => $rows]);
}

// ============================================================================
// POST ?action=upsertClassDefault
// body: { id?, classIndex, engineComboId, effectiveFromUtc?, effectiveToUtc?, notes? }
// ============================================================================

function handleUpsertClassDefault(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id             = isset($input['id']) ? (int)$input['id'] : null;
    $classIndex     = strtoupper(trim($input['classIndex'] ?? ''));
    $engineComboId  = (int)($input['engineComboId'] ?? 0);
    $effectiveFrom  = isset($input['effectiveFromUtc']) && trim($input['effectiveFromUtc']) !== '' ? trim($input['effectiveFromUtc']) : null;
    $effectiveTo    = isset($input['effectiveToUtc']) && trim($input['effectiveToUtc']) !== '' ? trim($input['effectiveToUtc']) : null;
    $notes          = isset($input['notes']) ? trim($input['notes']) : null;

    if ($classIndex === '' || !$engineComboId) {
        rsa_jsonResponse(['error' => 'classIndex, engineComboId are required'], 400);
    }

    // Validate engine combo exists
    $ecChk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE id=?");
    $ecChk->execute([$engineComboId]);
    if (!$ecChk->fetch()) rsa_jsonResponse(['error' => 'Engine combo not found'], 404);

    if ($effectiveTo !== null && $effectiveFrom !== null && $effectiveTo <= $effectiveFrom) {
        rsa_jsonResponse(['error' => 'effectiveToUtc must be after effectiveFromUtc'], 400);
    }

    if ($id) {
        $pdo->prepare("
            UPDATE parity_class_defaults
            SET class_index=?, engine_combo_id=?, effective_from_utc=?, effective_to_utc=?, notes=?
            WHERE id=?
        ")->execute([$classIndex, $engineComboId, $effectiveFrom, $effectiveTo, $notes, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        $pdo->prepare("
            INSERT INTO parity_class_defaults (class_index, engine_combo_id, effective_from_utc, effective_to_utc, notes)
            VALUES (?, ?, ?, ?, ?)
        ")->execute([$classIndex, $engineComboId, $effectiveFrom, $effectiveTo, $notes]);
        rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

// ============================================================================
// POST ?action=deleteClassDefault   body: { id }
// ============================================================================

function handleDeleteClassDefault(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) rsa_jsonResponse(['error' => 'id is required'], 400);
    $pdo->prepare("DELETE FROM parity_class_defaults WHERE id=?")->execute([$id]);
    rsa_jsonResponse(['ok' => true]);
}

// ============================================================================
// GET ?action=driversAtEvent&eventId=&classIndex=
// Returns distinct drivers at an event/class with their run counts
// ============================================================================

function handleDriversAtEvent(PDO $pdo): void {
    $eventId    = (int)($_GET['eventId'] ?? 0);
    $classIndex = strtoupper(trim($_GET['classIndex'] ?? ''));
    if (!$eventId) rsa_jsonResponse(['error' => 'eventId required'], 400);

    // Get race_lookup for event
    $evStmt = $pdo->prepare("SELECT race_lookup, start_date_local, end_date_local FROM parity_events WHERE id = ?");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $where = ['r.race_lookup = ?'];
    $params = [$event['race_lookup']];

    if ($classIndex !== '') {
        $expanded = parity_expandClassIndex($pdo, $classIndex);
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $where[] = "r.class_index IN ($ph)";
        $params = array_merge($params, $expanded);
    }

    $whereClause = implode(' AND ', $where);

    $stmt = $pdo->prepare("
        SELECT r.driver_name,
               r.class_index,
               COUNT(*) AS run_count,
               MIN(r.run_timestamp_utc) AS first_run_utc,
               MAX(r.run_timestamp_utc) AS last_run_utc,
               MIN(r.ft1320) AS best_et,
               MAX(r.mph1320) AS best_mph
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE f.id IS NULL
        AND r.driver_name IS NOT NULL AND r.driver_name != ''
        AND $whereClause
        GROUP BY r.driver_name, r.class_index
        ORDER BY r.driver_name ASC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['run_count'] = (int)$r['run_count'];
        $r['best_et'] = $r['best_et'] !== null ? (float)$r['best_et'] : null;
        $r['best_mph'] = $r['best_mph'] !== null ? (float)$r['best_mph'] : null;
    }

    // Also get distinct classes at this event
    $clsStmt = $pdo->prepare("
        SELECT DISTINCT class_index FROM parity_runs
        WHERE race_lookup = ? AND class_index IS NOT NULL AND class_index != ''
        ORDER BY class_index
    ");
    $clsStmt->execute([$event['race_lookup']]);
    $eventClasses = $clsStmt->fetchAll(PDO::FETCH_COLUMN);

    // Check weather availability for event date range
    $weatherCount = 0;
    if ($event['start_date_local'] && $event['end_date_local']) {
        $wStmt = $pdo->prepare("
            SELECT COUNT(*) FROM parity_weather_canonical
            WHERE timestamp_utc BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)
        ");
        $wStmt->execute([$event['start_date_local'], $event['end_date_local']]);
        $weatherCount = (int)$wStmt->fetchColumn();
    }

    rsa_jsonResponse([
        'drivers' => $rows,
        'eventClasses' => $eventClasses,
        'raceLookup' => $event['race_lookup'],
        'startDate' => $event['start_date_local'],
        'endDate' => $event['end_date_local'],
        'weatherSampleCount' => $weatherCount,
    ]);
}

// ============================================================================
// POST ?action=bulkUpsertDriverCombos
// body: { items: [{ driverName, classIndex, engineComboId, effectiveFromUtc, effectiveToUtc? }] }
// For each item: closes any open prior assignment and inserts a new one.
// ============================================================================

function handleBulkUpsertDriverCombos(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $items = $input['items'] ?? [];
    if (!is_array($items) || count($items) === 0) {
        rsa_jsonResponse(['error' => 'items array required'], 400);
    }
    if (count($items) > 500) {
        rsa_jsonResponse(['error' => 'Max 500 items per request'], 400);
    }

    $created = 0;
    $closed = 0;
    $skipped = 0;
    $errors = [];

    $pdo->beginTransaction();
    try {
        $stmtFindOpen = $pdo->prepare("
            SELECT id, engine_combo_id, effective_from_utc
            FROM parity_driver_combos
            WHERE driver_name = ? AND class_index = ? AND effective_to_utc IS NULL
            ORDER BY effective_from_utc DESC LIMIT 1
        ");
        $stmtClose = $pdo->prepare("
            UPDATE parity_driver_combos SET effective_to_utc = ? WHERE id = ?
        ");
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_driver_combos (driver_name, class_index, engine_combo_id, effective_from_utc, effective_to_utc)
            VALUES (?, ?, ?, ?, ?)
        ");

        foreach ($items as $i => $item) {
            $driverName    = strtoupper(trim($item['driverName'] ?? ''));
            $classIndex    = strtoupper(trim($item['classIndex'] ?? ''));
            $engineComboId = (int)($item['engineComboId'] ?? 0);
            $effectiveFrom = trim($item['effectiveFromUtc'] ?? '');
            $effectiveTo   = isset($item['effectiveToUtc']) && trim($item['effectiveToUtc']) !== '' ? trim($item['effectiveToUtc']) : null;

            if ($driverName === '' || $classIndex === '' || !$engineComboId || $effectiveFrom === '') {
                $errors[] = "Item $i: missing required fields";
                $skipped++;
                continue;
            }

            // Check if there's already an open assignment with the same combo — skip if identical
            $stmtFindOpen->execute([$driverName, $classIndex]);
            $existing = $stmtFindOpen->fetch(PDO::FETCH_ASSOC);

            if ($existing && (int)$existing['engine_combo_id'] === $engineComboId) {
                // Already assigned same combo — skip
                $skipped++;
                continue;
            }

            // Close any open prior assignment at this timestamp
            if ($existing) {
                $stmtClose->execute([$effectiveFrom, $existing['id']]);
                $closed++;
            }

            // Insert new
            $stmtInsert->execute([$driverName, $classIndex, $engineComboId, $effectiveFrom, $effectiveTo]);
            $created++;
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        rsa_jsonResponse(['error' => 'Bulk insert failed: ' . $e->getMessage()], 500);
    }

    rsa_jsonResponse([
        'ok' => true,
        'created' => $created,
        'closed' => $closed,
        'skipped' => $skipped,
        'errors' => $errors,
    ]);
}

// ============================================================================
// GET ?action=weatherCoverage&eventId=123
// Returns coverage metrics for an event's weather data.
// ============================================================================

function handleWeatherCoverage(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);

    // Load event + track
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.id AS track_id, t.track_name, t.timezone_iana, t.latitude, t.longitude
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $tz = $event['timezone_iana'];
    $startLocal = $event['start_date_local'];
    $endLocal = $event['end_date_local'];

    // Convert event date range to UTC
    try {
        $tzObj = new DateTimeZone($tz);
        $startDt = new DateTimeImmutable("$startLocal 00:00:00", $tzObj);
        $endDt = new DateTimeImmutable("$endLocal 23:59:59", $tzObj);
        $startUtc = $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $endUtc = $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Invalid timezone: ' . $e->getMessage()], 500);
        return;
    }

    // 1) Count canonical points in event time window
    $cnStmt = $pdo->prepare("
        SELECT COUNT(*) FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN ? AND ?
    ");
    $cnStmt->execute([$startUtc, $endUtc]);
    $canonicalCount = (int)$cnStmt->fetchColumn();

    // 2) Count samples by source
    $srcStmt = $pdo->prepare("
        SELECT source, COUNT(*) as cnt
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN ? AND ?
        GROUP BY source
    ");
    $srcStmt->execute([$startUtc, $endUtc]);
    $samplesBySource = [];
    $totalSamples = 0;
    while ($row = $srcStmt->fetch(PDO::FETCH_ASSOC)) {
        $samplesBySource[$row['source']] = (int)$row['cnt'];
        $totalSamples += (int)$row['cnt'];
    }

    // 3) Count runs for this event
    $runCountTotal = 0;
    $runsCovered = 0;
    $runsUncovered = 0;
    $windowMinutes = 15;

    if ($event['race_lookup']) {
        $runStmt = $pdo->prepare("
            SELECT r.run_timestamp_utc
            FROM parity_runs r
            LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
            WHERE f.id IS NULL AND r.race_lookup = ?
              AND r.run_timestamp_utc IS NOT NULL
        ");
        $runStmt->execute([$event['race_lookup']]);
        $runTimestamps = $runStmt->fetchAll(PDO::FETCH_COLUMN);
        $runCountTotal = count($runTimestamps);

        if ($runCountTotal > 0) {
            $stmtCheck = $pdo->prepare("
                SELECT COUNT(*) FROM parity_weather_canonical
                WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ");
            foreach ($runTimestamps as $ts) {
                $stmtCheck->execute([$ts, $windowMinutes, $ts, $windowMinutes]);
                if ((int)$stmtCheck->fetchColumn() > 0) {
                    $runsCovered++;
                } else {
                    $runsUncovered++;
                }
            }
        }
    }

    // 4) Largest gap between canonical points
    $gapStmt = $pdo->prepare("
        SELECT timestamp_utc FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN ? AND ?
        ORDER BY timestamp_utc ASC
    ");
    $gapStmt->execute([$startUtc, $endUtc]);
    $timestamps = $gapStmt->fetchAll(PDO::FETCH_COLUMN);
    $largestGapMinutes = 0;
    $largestGapAt = null;
    for ($i = 1; $i < count($timestamps); $i++) {
        $gap = (strtotime($timestamps[$i]) - strtotime($timestamps[$i - 1])) / 60;
        if ($gap > $largestGapMinutes) {
            $largestGapMinutes = $gap;
            $largestGapAt = $timestamps[$i - 1];
        }
    }

    // 5) Canonical source breakdown (column may not exist yet)
    $canonicalBySource = [];
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM parity_weather_canonical LIKE 'canonical_source_kind'");
        if ($colCheck->rowCount() > 0) {
            $srcKindStmt = $pdo->prepare("
                SELECT canonical_source_kind, COUNT(*) as cnt
                FROM parity_weather_canonical
                WHERE timestamp_utc BETWEEN ? AND ?
                GROUP BY canonical_source_kind
            ");
            $srcKindStmt->execute([$startUtc, $endUtc]);
            while ($row = $srcKindStmt->fetch(PDO::FETCH_ASSOC)) {
                $canonicalBySource[$row['canonical_source_kind'] ?? 'unknown'] = (int)$row['cnt'];
            }
        } else {
            // Column doesn't exist yet — report all as 'unknown'
            if ($canonicalCount > 0) {
                $canonicalBySource['unknown'] = $canonicalCount;
            }
        }
    } catch (Exception $e) {
        if ($canonicalCount > 0) {
            $canonicalBySource['unknown'] = $canonicalCount;
        }
    }

    // 6) Track has coordinates?
    $hasCoords = ($event['latitude'] !== null && $event['longitude'] !== null
                  && (float)$event['latitude'] !== 0.0 && (float)$event['longitude'] !== 0.0);

    rsa_jsonResponse([
        'eventId' => $eventId,
        'eventName' => $event['event_name'],
        'trackName' => $event['track_name'],
        'startLocal' => $startLocal,
        'endLocal' => $endLocal,
        'startUtc' => $startUtc,
        'endUtc' => $endUtc,
        'hasTrackCoords' => $hasCoords,
        'trackLat' => $event['latitude'] ? (float)$event['latitude'] : null,
        'trackLon' => $event['longitude'] ? (float)$event['longitude'] : null,
        'canonicalCount' => $canonicalCount,
        'canonicalBySource' => $canonicalBySource,
        'totalSamples' => $totalSamples,
        'samplesBySource' => $samplesBySource,
        'runCount' => $runCountTotal,
        'runsCovered' => $runsCovered,
        'runsUncovered' => $runsUncovered,
        'coveragePct' => $runCountTotal > 0 ? round($runsCovered / $runCountTotal * 100, 1) : null,
        'windowMinutes' => $windowMinutes,
        'largestGapMinutes' => round($largestGapMinutes, 1),
        'largestGapAt' => $largestGapAt,
    ]);
}

// ============================================================================
// POST ?action=weatherHealthBackfill
// Body: { eventId, missingOnly? }
// Fetches weather from Open-Meteo for event date range, inserts as backup.
// Then auto-rebuilds canonical for that range.
// ============================================================================

function handleWeatherHealthBackfill(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    $missingOnly = (bool)($input['missingOnly'] ?? false);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);

    // Load event + track
    $evStmt = $pdo->prepare("
        SELECT e.id, e.start_date_local, e.end_date_local,
               t.id AS track_id, t.timezone_iana, t.latitude, t.longitude
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $lat = (float)($event['latitude'] ?? 0);
    $lon = (float)($event['longitude'] ?? 0);
    if ($lat === 0.0 || $lon === 0.0) {
        rsa_jsonResponse(['error' => 'Track has no lat/lon coordinates. Set them first via updateTrackCoords.'], 400);
    }

    $tz = $event['timezone_iana'];
    $startLocal = $event['start_date_local'];
    $endLocal = $event['end_date_local'];

    // Convert to UTC range
    try {
        $tzObj = new DateTimeZone($tz);
        $startDt = new DateTimeImmutable("$startLocal 00:00:00", $tzObj);
        $endDt = new DateTimeImmutable("$endLocal 23:59:59", $tzObj);
        $startUtcStr = $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
        $endUtcStr = $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Timezone error: ' . $e->getMessage()], 500);
        return;
    }

    // If missingOnly, check existing backup samples
    if ($missingOnly) {
        $checkStmt = $pdo->prepare("
            SELECT COUNT(*) FROM parity_weather_samples
            WHERE event_id = ? AND source = 'open_meteo_backfill'
              AND timestamp_utc BETWEEN ? AND ?
        ");
        $checkStmt->execute([$eventId, $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
                                        $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s')]);
        $existing = (int)$checkStmt->fetchColumn();
        if ($existing > 0) {
            rsa_jsonResponse([
                'ok' => true,
                'skipped' => true,
                'message' => "Already has $existing backup samples for this event",
                'existingBackupSamples' => $existing,
                'inserted' => 0,
                'deduped' => 0,
            ]);
            return;
        }
    }

    // Fetch from Open-Meteo
    require_once __DIR__ . '/parity_weather_provider.php';

    set_time_limit(120);
    try {
        $samples = fetchOpenMeteoWeather($lat, $lon, $startUtcStr, $endUtcStr);
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Open-Meteo fetch failed: ' . $e->getMessage()], 500);
        return;
    }

    if (empty($samples)) {
        rsa_jsonResponse([
            'ok' => true,
            'inserted' => 0,
            'deduped' => 0,
            'message' => 'No data returned from Open-Meteo for this date range',
        ]);
        return;
    }

    // Insert samples
    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open_meteo_backfill')
    ");

    $inserted = 0;
    $deduped = 0;
    $errors = [];

    foreach ($samples as $i => $sample) {
        $tsUtc = $sample['timestampUtc'];
        $tempF = $sample['tempF'];
        $humPct = $sample['humidityPct'];
        $baroInHg = $sample['baroInHg'];

        $tempC = ($tempF - 32) * 5.0 / 9.0;
        $pressureMbar = $baroInHg / 0.02953;

        try {
            $utcDt = new DateTimeImmutable($tsUtc, new DateTimeZone('UTC'));
            $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
            $localStr = $localDt->format('Y-m-d H:i:s');
            $tsUtcFmt = $utcDt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $errors[] = "Sample $i: invalid timestamp";
            continue;
        }

        try {
            $stmtInsert->execute([
                $tsUtcFmt, $eventId, (int)$event['track_id'], $localStr,
                round($tempC, 4), round($tempF, 4), round($humPct, 2), round($pressureMbar, 4),
            ]);
            $inserted++;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped++;
            } else {
                $errors[] = "Sample $i: " . $e->getMessage();
            }
        }
    }

    // Auto-rebuild canonical for this event's time range
    $rebuildResult = weatherRebuildCanonicalRange($pdo,
        $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s'),
        30
    );

    rsa_jsonResponse([
        'ok' => true,
        'inserted' => $inserted,
        'deduped' => $deduped,
        'totalFetched' => count($samples),
        'errors' => array_slice($errors, 0, 20),
        'canonicalRebuilt' => $rebuildResult['bucketsProcessed'],
    ]);
}

// ============================================================================
// POST ?action=weatherHealthRebuild
// Body: { eventId }
// Rebuild canonical weather for an event's time range using best-available logic.
// ============================================================================

function handleWeatherHealthRebuild(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);

    // Load event
    $evStmt = $pdo->prepare("
        SELECT e.start_date_local, e.end_date_local, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $tz = $event['timezone_iana'];
    try {
        $tzObj = new DateTimeZone($tz);
        $startDt = new DateTimeImmutable($event['start_date_local'] . ' 00:00:00', $tzObj);
        $endDt = new DateTimeImmutable($event['end_date_local'] . ' 23:59:59', $tzObj);
        $startUtc = $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $endUtc = $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Timezone error: ' . $e->getMessage()], 500);
        return;
    }

    $result = weatherRebuildCanonicalRange($pdo, $startUtc, $endUtc, 30);
    rsa_jsonResponse($result);
}

// ============================================================================
// Shared: Rebuild canonical for a UTC time range with best-available logic
// Station preferred, backup fallback, sanity checks, delta tracking.
// ============================================================================

function weatherRebuildCanonicalRange(PDO $pdo, string $startUtc, string $endUtc, int $bucketMinutes = 30): array {
    $bucketSeconds = $bucketMinutes * 60;
    $tolerance = $bucketMinutes;
    $startEpoch = (int)(floor(strtotime($startUtc) / $bucketSeconds) * $bucketSeconds);
    $endEpoch = strtotime($endUtc);

    // Check if delta columns exist
    $hasDeltaCols = false;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM parity_weather_canonical LIKE 'station_temp_delta'");
        $hasDeltaCols = $stmt->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }

    // Check if provenance columns exist
    $hasProvenance = false;
    try {
        $stmt = $pdo->query("SHOW COLUMNS FROM parity_weather_canonical LIKE 'canonical_source_kind'");
        $hasProvenance = $stmt->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }

    if (!$hasProvenance) {
        return ['error' => 'Provenance columns not found. Run migration v6d first.', 'bucketsProcessed' => 0];
    }

    // Sanity check thresholds
    $TEMP_MIN = -40.0;
    $TEMP_MAX = 140.0;
    $RH_MIN = 0.0;
    $RH_MAX = 100.0;
    $PRESS_MIN_INHG = 20.0;
    $PRESS_MAX_INHG = 35.0;
    // Delta thresholds for suspect flagging
    $DELTA_TEMP_SUSPECT = 10.0;    // °F
    $DELTA_RH_SUSPECT = 20.0;      // %
    $DELTA_PRESS_SUSPECT = 0.5;    // inHg

    // Prepare queries
    // Get station samples (tempest) nearest to bucket
    $stmtStation = $pdo->prepare("
        SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc, source,
               ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
          AND source IN ('tempest', 'station')
        ORDER BY delta_s ASC
        LIMIT 1
    ");

    // Get backup samples nearest to bucket
    $stmtBackup = $pdo->prepare("
        SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc, source,
               ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
          AND source LIKE '%_backfill'
        ORDER BY delta_s ASC
        LIMIT 1
    ");

    // Get ALL samples for provenance
    $stmtAllSamples = $pdo->prepare("
        SELECT source, COUNT(*) as count
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        GROUP BY source
    ");

    // Build upsert based on available columns
    if ($hasDeltaCols) {
        $stmtUpsert = $pdo->prepare("
            INSERT INTO parity_weather_canonical
                (timestamp_utc, temp_f, rh_pct, pressure_inhg,
                 canonical_source_kind, canonical_source_detail, sample_count, sample_sources_json,
                 station_temp_delta, station_humidity_delta, station_pressure_delta,
                 backup_temp_f, backup_rh_pct, backup_pressure_inhg)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                temp_f = VALUES(temp_f), rh_pct = VALUES(rh_pct), pressure_inhg = VALUES(pressure_inhg),
                canonical_source_kind = VALUES(canonical_source_kind),
                canonical_source_detail = VALUES(canonical_source_detail),
                sample_count = VALUES(sample_count),
                sample_sources_json = VALUES(sample_sources_json),
                station_temp_delta = VALUES(station_temp_delta),
                station_humidity_delta = VALUES(station_humidity_delta),
                station_pressure_delta = VALUES(station_pressure_delta),
                backup_temp_f = VALUES(backup_temp_f),
                backup_rh_pct = VALUES(backup_rh_pct),
                backup_pressure_inhg = VALUES(backup_pressure_inhg)
        ");
    } else {
        $stmtUpsert = $pdo->prepare("
            INSERT INTO parity_weather_canonical
                (timestamp_utc, temp_f, rh_pct, pressure_inhg,
                 canonical_source_kind, canonical_source_detail, sample_count, sample_sources_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                temp_f = VALUES(temp_f), rh_pct = VALUES(rh_pct), pressure_inhg = VALUES(pressure_inhg),
                canonical_source_kind = VALUES(canonical_source_kind),
                canonical_source_detail = VALUES(canonical_source_detail),
                sample_count = VALUES(sample_count),
                sample_sources_json = VALUES(sample_sources_json)
        ");
    }

    $bucketsProcessed = 0;
    $stationUsed = 0;
    $backupUsed = 0;
    $suspectCount = 0;
    $sanityFailed = 0;

    for ($epoch = $startEpoch; $epoch <= $endEpoch; $epoch += $bucketSeconds) {
        $bucketTs = gmdate('Y-m-d H:i:s', $epoch);

        // Fetch station sample
        $stmtStation->execute([$bucketTs, $bucketTs, $tolerance, $bucketTs, $tolerance]);
        $stationSample = $stmtStation->fetch(PDO::FETCH_ASSOC);

        // Fetch backup sample
        $stmtBackup->execute([$bucketTs, $bucketTs, $tolerance, $bucketTs, $tolerance]);
        $backupSample = $stmtBackup->fetch(PDO::FETCH_ASSOC);

        if (!$stationSample && !$backupSample) continue;

        // Parse values
        $stTempF = $stationSample ? ($stationSample['temp_f'] !== null ? (float)$stationSample['temp_f'] : null) : null;
        $stRhPct = $stationSample ? ($stationSample['rh_pct'] !== null ? (float)$stationSample['rh_pct'] : null) : null;
        $stPressMb = $stationSample ? ($stationSample['station_pressure_raw'] !== null ? (float)$stationSample['station_pressure_raw'] : null) : null;
        $stPressInhg = $stPressMb !== null ? round($stPressMb * 0.02953, 4) : null;

        $buTempF = $backupSample ? ($backupSample['temp_f'] !== null ? (float)$backupSample['temp_f'] : null) : null;
        $buRhPct = $backupSample ? ($backupSample['rh_pct'] !== null ? (float)$backupSample['rh_pct'] : null) : null;
        $buPressMb = $backupSample ? ($backupSample['station_pressure_raw'] !== null ? (float)$backupSample['station_pressure_raw'] : null) : null;
        $buPressInhg = $buPressMb !== null ? round($buPressMb * 0.02953, 4) : null;

        // Sanity check function
        $passesSanity = function($tf, $rh, $pi) use ($TEMP_MIN, $TEMP_MAX, $RH_MIN, $RH_MAX, $PRESS_MIN_INHG, $PRESS_MAX_INHG) {
            if ($tf === null || $rh === null || $pi === null) return false;
            if ($tf < $TEMP_MIN || $tf > $TEMP_MAX) return false;
            if ($rh < $RH_MIN || $rh > $RH_MAX) return false;
            if ($pi < $PRESS_MIN_INHG || $pi > $PRESS_MAX_INHG) return false;
            return true;
        };

        $stationOk = $stationSample && $passesSanity($stTempF, $stRhPct, $stPressInhg);
        $backupOk = $backupSample && $passesSanity($buTempF, $buRhPct, $buPressInhg);

        // Decide canonical values
        $useTempF = null;
        $useRhPct = null;
        $usePressInhg = null;
        $sourceKind = 'unknown';

        if ($stationOk) {
            $useTempF = $stTempF;
            $useRhPct = $stRhPct;
            $usePressInhg = $stPressInhg;
            $sourceKind = 'station';
            $stationUsed++;
        } elseif ($backupOk) {
            $useTempF = $buTempF;
            $useRhPct = $buRhPct;
            $usePressInhg = $buPressInhg;
            $sourceKind = 'backup';
            $backupUsed++;
        } else {
            // Neither passes sanity — use whichever is available (station first)
            if ($stationSample && $stTempF !== null) {
                $useTempF = $stTempF;
                $useRhPct = $stRhPct;
                $usePressInhg = $stPressInhg;
                $sourceKind = 'station_suspect';
            } elseif ($backupSample && $buTempF !== null) {
                $useTempF = $buTempF;
                $useRhPct = $buRhPct;
                $usePressInhg = $buPressInhg;
                $sourceKind = 'backup_suspect';
            } else {
                continue; // nothing usable
            }
            $sanityFailed++;
        }

        // Check for suspect deltas when both present
        $deltaTempF = null;
        $deltaRhPct = null;
        $deltaPressInhg = null;
        if ($stationOk && $backupOk) {
            $deltaTempF = round($stTempF - $buTempF, 2);
            $deltaRhPct = round($stRhPct - $buRhPct, 2);
            $deltaPressInhg = round($stPressInhg - $buPressInhg, 4);

            if (abs($deltaTempF) > $DELTA_TEMP_SUSPECT ||
                abs($deltaRhPct) > $DELTA_RH_SUSPECT ||
                abs($deltaPressInhg) > $DELTA_PRESS_SUSPECT) {
                $sourceKind = 'station_suspect';
                $suspectCount++;
            }
        }

        // Provenance
        $stmtAllSamples->execute([$bucketTs, $tolerance, $bucketTs, $tolerance]);
        $sourceCounts = $stmtAllSamples->fetchAll(PDO::FETCH_ASSOC);
        $totalSamples = 0;
        $sourceBreakdown = [];
        foreach ($sourceCounts as $sc) {
            $totalSamples += (int)$sc['count'];
            $sourceBreakdown[] = ['source' => $sc['source'], 'count' => (int)$sc['count']];
        }
        $detailParts = [];
        foreach ($sourceBreakdown as $sb) {
            $detailParts[] = "{$sb['source']}={$sb['count']}";
        }
        $sourceDetail = implode(', ', $detailParts);
        $sourcesJson = json_encode($sourceBreakdown);

        // Upsert
        if ($hasDeltaCols) {
            $stmtUpsert->execute([
                $bucketTs, $useTempF, $useRhPct, $usePressInhg,
                $sourceKind, $sourceDetail, $totalSamples, $sourcesJson,
                $deltaTempF, $deltaRhPct, $deltaPressInhg,
                $buTempF, $buRhPct, $buPressInhg,
            ]);
        } else {
            $stmtUpsert->execute([
                $bucketTs, $useTempF, $useRhPct, $usePressInhg,
                $sourceKind, $sourceDetail, $totalSamples, $sourcesJson,
            ]);
        }
        $bucketsProcessed++;
    }

    return [
        'ok' => true,
        'startUtc' => gmdate('Y-m-d H:i:s', $startEpoch),
        'endUtc' => $endUtc,
        'bucketMinutes' => $bucketMinutes,
        'bucketsProcessed' => $bucketsProcessed,
        'stationUsed' => $stationUsed,
        'backupUsed' => $backupUsed,
        'suspectCount' => $suspectCount,
        'sanityFailed' => $sanityFailed,
    ];
}

// ============================================================================
// POST ?action=updateTrackCoords
// Body: { trackId, latitude, longitude }
// ============================================================================

function handleUpdateTrackCoords(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $trackId = (int)($input['trackId'] ?? 0);
    $lat = isset($input['latitude']) ? (float)$input['latitude'] : null;
    $lon = isset($input['longitude']) ? (float)$input['longitude'] : null;

    if ($trackId <= 0) rsa_jsonResponse(['error' => 'trackId is required'], 400);
    if ($lat === null || $lon === null) rsa_jsonResponse(['error' => 'latitude and longitude are required'], 400);
    if ($lat < -90 || $lat > 90) rsa_jsonResponse(['error' => 'latitude must be -90..90'], 400);
    if ($lon < -180 || $lon > 180) rsa_jsonResponse(['error' => 'longitude must be -180..180'], 400);

    $stmt = $pdo->prepare("UPDATE parity_tracks SET latitude = ?, longitude = ? WHERE id = ?");
    $stmt->execute([$lat, $lon, $trackId]);

    if ($stmt->rowCount() === 0) {
        rsa_jsonResponse(['error' => 'Track not found or no change'], 404);
    }

    rsa_jsonResponse(['ok' => true, 'trackId' => $trackId, 'latitude' => $lat, 'longitude' => $lon]);
}

// ============================================================================
// GET ?action=weatherTimeseries&eventId=N
// Returns per-bucket weather timeseries with canonical, station, backup breakdown,
// deltas, and aggregate stats for the Weather Dashboard.
// ============================================================================

function handleWeatherTimeseries(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    if ($eventId <= 0) {
        rsa_jsonResponse(['error' => 'eventId is required'], 400);
    }

    // Load event + track
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.id AS track_id, t.track_name, t.timezone_iana, t.city, t.state
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) {
        rsa_jsonResponse(['error' => 'Event not found'], 404);
    }

    // Compute UTC range from local dates + timezone
    $tz = $event['timezone_iana'];
    $startLocal = $event['start_date_local'];
    $endLocal = $event['end_date_local'] ?: $startLocal;
    try {
        $tzObj = new DateTimeZone($tz);
        $startUtc = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $endUtc = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'Timezone error: ' . $e->getMessage()], 500);
    }

    // Allow startUtc/endUtc overrides
    if (!empty($_GET['startUtc'])) $startUtc = $_GET['startUtc'];
    if (!empty($_GET['endUtc'])) $endUtc = $_GET['endUtc'];

    // 1) Fetch canonical points in range
    $cnStmt = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, pressure_inhg,
               canonical_source_kind, canonical_source_detail, sample_count,
               station_temp_delta, station_humidity_delta, station_pressure_delta
        FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN ? AND ?
        ORDER BY timestamp_utc ASC
    ");
    $cnStmt->execute([$startUtc, $endUtc]);
    $canonical = $cnStmt->fetchAll(PDO::FETCH_ASSOC);

    // 2) Fetch station samples (tempest, station, station_csv_*)
    $stStmt = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, station_pressure_raw, source
        FROM parity_weather_samples
        WHERE event_id = ?
          AND timestamp_utc BETWEEN ? AND ?
          AND source NOT LIKE '%_backfill'
        ORDER BY timestamp_utc ASC
    ");
    $stStmt->execute([$eventId, $startUtc, $endUtc]);
    $stationRaw = $stStmt->fetchAll(PDO::FETCH_ASSOC);

    // 3) Fetch backup samples (open_meteo_backfill, csv_backfill)
    $bkStmt = $pdo->prepare("
        SELECT timestamp_utc, temp_f, rh_pct, station_pressure_raw, source
        FROM parity_weather_samples
        WHERE event_id = ?
          AND timestamp_utc BETWEEN ? AND ?
          AND source LIKE '%_backfill'
        ORDER BY timestamp_utc ASC
    ");
    $bkStmt->execute([$eventId, $startUtc, $endUtc]);
    $backupRaw = $bkStmt->fetchAll(PDO::FETCH_ASSOC);

    // Build lookup maps by timestamp (nearest 30-min bucket)
    $stationByTs = [];
    foreach ($stationRaw as $s) {
        $ts = $s['timestamp_utc'];
        // Round to nearest 30-min bucket for matching
        $epoch = strtotime($ts);
        $bucket = date('Y-m-d H:i:s', (int)(round($epoch / 1800) * 1800));
        $stationByTs[$bucket] = $s;
    }
    $backupByTs = [];
    foreach ($backupRaw as $b) {
        $ts = $b['timestamp_utc'];
        $epoch = strtotime($ts);
        $bucket = date('Y-m-d H:i:s', (int)(round($epoch / 1800) * 1800));
        $backupByTs[$bucket] = $b;
    }

    // Convert hPa to inHg for station/backup pressure
    $hPaToInHg = function($v) { return $v !== null ? round((float)$v * 0.02953, 4) : null; };

    // Build timeseries points from canonical
    $points = [];
    $tempSums = ['canonical' => [], 'station' => [], 'backup' => []];
    $rhSums = ['canonical' => [], 'station' => [], 'backup' => []];
    $pressSums = ['canonical' => [], 'station' => [], 'backup' => []];
    $stationCount = 0;
    $backupCount = 0;
    $prevTs = null;
    $largestGap = 0;
    $largestGapAt = null;

    foreach ($canonical as $c) {
        $ts = $c['timestamp_utc'];
        $epoch = strtotime($ts);
        $bucket = date('Y-m-d H:i:s', (int)(round($epoch / 1800) * 1800));

        $cTempF = $c['temp_f'] !== null ? (float)$c['temp_f'] : null;
        $cRhPct = $c['rh_pct'] !== null ? (float)$c['rh_pct'] : null;
        $cPressInhg = $c['pressure_inhg'] !== null ? (float)$c['pressure_inhg'] : null;
        $srcKind = $c['canonical_source_kind'] ?? 'unknown';
        $sampleCount = (int)($c['sample_count'] ?? 1);

        // Station values
        $st = $stationByTs[$bucket] ?? null;
        $sTempF = $st ? (float)$st['temp_f'] : null;
        $sRhPct = $st ? (float)$st['rh_pct'] : null;
        $sPressInhg = $st ? $hPaToInHg($st['station_pressure_raw']) : null;

        // Backup values
        $bk = $backupByTs[$bucket] ?? null;
        $bTempF = $bk ? (float)$bk['temp_f'] : null;
        $bRhPct = $bk ? (float)$bk['rh_pct'] : null;
        $bPressInhg = $bk ? $hPaToInHg($bk['station_pressure_raw']) : null;

        // Deltas (stored in canonical or computed)
        $dTemp = $c['station_temp_delta'] !== null ? (float)$c['station_temp_delta'] : (($sTempF !== null && $bTempF !== null) ? round($sTempF - $bTempF, 2) : null);
        $dHum = $c['station_humidity_delta'] !== null ? (float)$c['station_humidity_delta'] : (($sRhPct !== null && $bRhPct !== null) ? round($sRhPct - $bRhPct, 2) : null);
        $dPress = $c['station_pressure_delta'] !== null ? (float)$c['station_pressure_delta'] : (($sPressInhg !== null && $bPressInhg !== null) ? round($sPressInhg - $bPressInhg, 4) : null);

        $point = [
            'timestamp_utc' => $ts,
            'canonical_temp_f' => $cTempF,
            'canonical_rh_pct' => $cRhPct,
            'canonical_pressure_inhg' => $cPressInhg,
            'station_temp_f' => $sTempF,
            'station_rh_pct' => $sRhPct,
            'station_pressure_inhg' => $sPressInhg,
            'backup_temp_f' => $bTempF,
            'backup_rh_pct' => $bRhPct,
            'backup_pressure_inhg' => $bPressInhg,
            'station_temp_delta' => $dTemp,
            'station_humidity_delta' => $dHum,
            'station_pressure_delta' => $dPress,
            'canonical_source_kind' => $srcKind,
            'sample_count' => $sampleCount,
        ];
        $points[] = $point;

        // Track stats
        if ($cTempF !== null) $tempSums['canonical'][] = $cTempF;
        if ($cRhPct !== null) $rhSums['canonical'][] = $cRhPct;
        if ($cPressInhg !== null) $pressSums['canonical'][] = $cPressInhg;
        if ($sTempF !== null) { $tempSums['station'][] = $sTempF; $stationCount++; }
        if ($sRhPct !== null) $rhSums['station'][] = $sRhPct;
        if ($sPressInhg !== null) $pressSums['station'][] = $sPressInhg;
        if ($bTempF !== null) { $tempSums['backup'][] = $bTempF; $backupCount++; }
        if ($bRhPct !== null) $rhSums['backup'][] = $bRhPct;
        if ($bPressInhg !== null) $pressSums['backup'][] = $bPressInhg;

        // Gap tracking
        if ($prevTs !== null) {
            $gap = $epoch - strtotime($prevTs);
            if ($gap > $largestGap) {
                $largestGap = $gap;
                $largestGapAt = $prevTs;
            }
        }
        $prevTs = $ts;
    }

    // Build stats
    $statHelper = function(array $vals): array {
        if (empty($vals)) return ['min' => null, 'max' => null, 'avg' => null, 'count' => 0];
        return [
            'min' => round(min($vals), 4),
            'max' => round(max($vals), 4),
            'avg' => round(array_sum($vals) / count($vals), 4),
            'count' => count($vals),
        ];
    };

    // Source breakdown from canonical points
    $sourceBreakdown = [];
    foreach ($canonical as $c) {
        $sk = $c['canonical_source_kind'] ?? 'unknown';
        $sourceBreakdown[$sk] = ($sourceBreakdown[$sk] ?? 0) + 1;
    }

    $totalPoints = count($points);
    // Expected points at 30-min intervals
    $expectedPoints = $totalPoints > 0 ? max(1, round((strtotime($endUtc) - strtotime($startUtc)) / 1800)) : 0;
    $coveragePct = $expectedPoints > 0 ? round(($totalPoints / $expectedPoints) * 100, 1) : 0;

    $stats = [
        'pointsCount' => $totalPoints,
        'expectedPoints' => (int)$expectedPoints,
        'coveragePct' => min(100, $coveragePct),
        'stationPointsCount' => $stationCount,
        'backupPointsCount' => $backupCount,
        'largestGapMinutes' => round($largestGap / 60, 1),
        'largestGapAt' => $largestGapAt,
        'sourceBreakdown' => $sourceBreakdown,
        'temp' => [
            'canonical' => $statHelper($tempSums['canonical']),
            'station' => $statHelper($tempSums['station']),
            'backup' => $statHelper($tempSums['backup']),
        ],
        'rh' => [
            'canonical' => $statHelper($rhSums['canonical']),
            'station' => $statHelper($rhSums['station']),
            'backup' => $statHelper($rhSums['backup']),
        ],
        'pressure' => [
            'canonical' => $statHelper($pressSums['canonical']),
            'station' => $statHelper($pressSums['station']),
            'backup' => $statHelper($pressSums['backup']),
        ],
    ];

    rsa_jsonResponse([
        'eventId' => $eventId,
        'event' => [
            'event_name' => $event['event_name'],
            'track_name' => $event['track_name'],
            'city' => $event['city'],
            'state' => $event['state'],
            'start_date_local' => $event['start_date_local'],
            'end_date_local' => $event['end_date_local'],
            'timezone' => $tz,
        ],
        'startUtc' => $startUtc,
        'endUtc' => $endUtc,
        'points' => $points,
        'stats' => $stats,
    ]);
}

// ============================================================================
// GET ?action=parityByCombo&eventId=N&classIndex=TF&metric=et_1320&mode=raw&topN=4
//     &sessionScope=both&includeFlagged=0&includeUnknown=0
// Returns full event parity data:
//   combos       — per-combo aggregates (best/avgTopN/totalAvg/spread/topRuns)
//   allRuns      — truth table of every run in scope
//   deltaMatrices — pairwise comparison tables (quickest/avgTopN/totalAvg)
//   qualOrder    — qualifying order list
//   mapping      — readiness indicators (mappedPct, unknownRunCount, etc.)
//   trust        — weather/correction coverage
// ============================================================================

function handleParityByCombo(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $metric = trim($_GET['metric'] ?? 'et_1320');
    $mode = trim($_GET['mode'] ?? 'raw');
    $topN = max(1, min(20, (int)($_GET['topN'] ?? 4)));
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $includeFlagged = (bool)($_GET['includeFlagged'] ?? false);
    $includeUnknown = (bool)($_GET['includeUnknown'] ?? false);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);

    $validMetrics = ['et_1320', 'mph_1320', 'rt', 't60', 't330', 't660', 'mph_660', 't1000', 'mph_1000'];
    if (!in_array($metric, $validMetrics)) {
        rsa_jsonResponse(['error' => "Invalid metric. Valid: " . implode(', ', $validMetrics)], 400);
    }
    if (!in_array($mode, ['raw', 'corrected'])) {
        rsa_jsonResponse(['error' => 'mode must be raw or corrected'], 400);
    }
    if (!in_array($sessionScope, ['qual', 'elim', 'both'])) {
        rsa_jsonResponse(['error' => 'sessionScope must be qual, elim, or both'], 400);
    }

    $colMap = [
        'et_1320'  => 'ft1320',  'mph_1320' => 'mph1320', 'rt' => 'rt',
        't60'      => 'ft60',    't330'     => 'ft330',    't660' => 'ft660',
        'mph_660'  => 'mph660',  't1000'    => 'ft1000',   'mph_1000' => 'mph1000',
    ];
    $dbCol = $colMap[$metric];
    $isLowerBetter = !in_array($metric, ['mph_1320', 'mph_660', 'mph_1000']);
    $sortDir = $isLowerBetter ? 'ASC' : 'DESC';

    // ── Load event ──────────────────────────────────────────────────────
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.track_name, t.timezone_iana, t.city, t.state, t.latitude, t.longitude
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);
    $raceLookup = $event['race_lookup'];
    if (!$raceLookup) rsa_jsonResponse(['error' => 'Event has no race_lookup'], 400);

    // ── Expand class, load combo lookups ────────────────────────────────
    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    $engineCombos = [];
    $ecStmt = $pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos");
    foreach ($ecStmt->fetchAll(PDO::FETCH_ASSOC) as $ec) {
        $engineCombos[(int)$ec['id']] = $ec;
    }

    $driverCombos = $pdo->query("
        SELECT dc.driver_name, dc.class_index, dc.engine_combo_id, ec.name AS engine_combo_name,
               dc.effective_from_utc, dc.effective_to_utc
        FROM parity_driver_combos dc
        JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $classDefaults = $pdo->query("
        SELECT cd.class_index, cd.engine_combo_id, ec.name AS engine_combo_name,
               cd.effective_from_utc, cd.effective_to_utc
        FROM parity_class_defaults cd
        JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    // ── Session scope filter ────────────────────────────────────────────
    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // ── Fetch runs ──────────────────────────────────────────────────────
    $params = array_merge([$raceLookup], $classIndices);
    $runStmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.run_timestamp_utc, r.driver_name, r.class_index,
               r.round, r.lane, r.car_number, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               COALESCE(r.dq_flag, 0) AS dq_flag
        FROM parity_runs r
        WHERE r.race_lookup = ?
          AND r.class_index IN ($classPlaceholders)
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.$dbCol IS NOT NULL AND r.$dbCol > 0
          $sessionFilter
        ORDER BY r.$dbCol $sortDir
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // ── Flagged runs ────────────────────────────────────────────────────
    $flaggedIds = [];
    if (!empty($runs)) {
        $runIds = array_column($runs, 'id');
        $fp = implode(',', array_fill(0, count($runIds), '?'));
        $fStmt = $pdo->prepare("SELECT run_id FROM parity_run_flags WHERE run_id IN ($fp) AND flag_type IN ('bad','exclude')");
        $fStmt->execute($runIds);
        $flaggedIds = array_flip($fStmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // ── Weather prepared stmt ───────────────────────────────────────────
    $weatherWindow = 30;
    $stmtWeather = $pdo->prepare("
        SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg, wc.timestamp_utc, wc.canonical_source_kind
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
    ");

    // ── Process each run ────────────────────────────────────────────────
    $totalRunsInScope = count($runs);
    $runsWithWeather = 0;
    $runsWithCorrected = 0;
    $comboRuns = [];          // comboName => ['id'=>int|null, 'runs'=>[]]
    $allRunsFlat = [];        // truth table
    $unknownDriverCounts = []; // driver => count for mapping readiness
    $totalMapped = 0;
    $totalUnmapped = 0;

    foreach ($runs as $run) {
        $runId = (int)$run['id'];
        $isFlagged = isset($flaggedIds[$runId]);
        $excluded = $isFlagged && !$includeFlagged;
        $rawValue = (float)$run[$dbCol];

        // Resolve engine combo
        $comboName = 'Unknown';
        $comboId = null;
        $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
        if ($resolved) {
            $comboName = $resolved['name'];
            $comboId = $resolved['id'];
            $totalMapped++;
        } else {
            $totalUnmapped++;
            $dn = $run['driver_name'] ?? '(blank)';
            $unknownDriverCounts[$dn] = ($unknownDriverCounts[$dn] ?? 0) + 1;
        }

        // Weather snapshot
        $wxSnapshot = null;
        if ($run['run_timestamp_utc']) {
            $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
            $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
            if ($wx && $wx['temp_f'] !== null && $wx['rh_pct'] !== null && $wx['pressure_inhg'] !== null) {
                $wxSnapshot = [
                    'temp_f' => round((float)$wx['temp_f'], 1),
                    'rh_pct' => round((float)$wx['rh_pct'], 1),
                    'pressure_inhg' => round((float)$wx['pressure_inhg'], 3),
                    'source' => $wx['canonical_source_kind'] ?? 'unknown',
                    'timestamp_utc' => $wx['timestamp_utc'],
                ];
                $runsWithWeather++;
            }
        }

        // Correction
        $value = $rawValue;
        $correctionFactor = null;
        if ($mode === 'corrected' && $wxSnapshot && $comboId && isset($engineCombos[$comboId])) {
            $T = $wxSnapshot['temp_f'];
            $H = $wxSnapshot['rh_pct'] / 100;
            $BP = $wxSnapshot['pressure_inhg'];
            $ec = $engineCombos[$comboId];
            $tPow = (float)$ec['t_power'];
            $dPow = (float)$ec['d_power'];
            $FF = (float)$ec['friction_factor'];
            $theta = ($T + 459.67) / 519.67;
            $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
            $dap = $BP - $vp;
            $delta = $dap / 29.92;
            $hpc = (1 + $FF / 100) * (pow($theta, $tPow) / pow($delta, $dPow)) - $FF / 100;
            if ($hpc > 0 && is_finite($hpc)) {
                $correctionFactor = $hpc;
                $value = $isLowerBetter ? $rawValue * pow($hpc, -0.33) : $rawValue * pow($hpc, 0.33);
                $runsWithCorrected++;
            }
        }

        $entry = [
            'runId'     => $runId,
            'uuid'      => $run['uuid'],
            'driver'    => $run['driver_name'],
            'round'     => $run['round'],
            'lane'      => $run['lane'],
            'carNumber' => $run['car_number'],
            'timestamp' => $run['run_timestamp_utc'],
            'rawValue'  => round($rawValue, 4),
            'value'     => round($value, 4),
            'correctionFactor' => $correctionFactor ? round($correctionFactor, 6) : null,
            'excluded'  => $excluded,
            'flagged'   => $isFlagged,
            'dqFlag'    => (int)$run['dq_flag'],
            'weather'   => $wxSnapshot,
            'engineCombo' => $comboName,
            'engineComboId' => $comboId,
            'et'        => $run['ft1320'] !== null ? round((float)$run['ft1320'], 4) : null,
            'mph'       => $run['mph1320'] !== null ? round((float)$run['mph1320'], 2) : null,
        ];

        if (!isset($comboRuns[$comboName])) {
            $comboRuns[$comboName] = ['id' => $comboId, 'runs' => []];
        }
        $comboRuns[$comboName]['runs'][] = $entry;
        $allRunsFlat[] = $entry;
    }

    // ── Compute per-combo aggregates ────────────────────────────────────
    $combos = [];
    $comboAggs = []; // comboName => {best, avgTopN, totalAvg} for delta matrix

    foreach ($comboRuns as $comboName => $data) {
        // Skip unknown unless includeUnknown
        if ($comboName === 'Unknown' && !$includeUnknown) continue;

        $allComboRuns = $data['runs'];
        $activeRuns = array_values(array_filter($allComboRuns, fn($r) => !$r['excluded']));
        usort($activeRuns, fn($a, $b) => $isLowerBetter ? ($a['value'] <=> $b['value']) : ($b['value'] <=> $a['value']));

        $countTotal = count($allComboRuns);
        $countActive = count($activeRuns);
        $countExcluded = $countTotal - $countActive;

        $activeValues = array_map(fn($r) => $r['value'], $activeRuns);
        $bestValue = $countActive > 0 ? round($activeValues[0], 4) : null;

        $topNSlice = array_slice($activeValues, 0, $topN);
        $avgTopN = count($topNSlice) > 0 ? round(array_sum($topNSlice) / count($topNSlice), 4) : null;
        $countTopN = count($topNSlice);

        // totalAvg = average of ALL active values
        $totalAvg = $countActive > 0 ? round(array_sum($activeValues) / $countActive, 4) : null;

        // Spread
        $spread = null;
        if ($countTopN >= 2) {
            $lastIdx = $countTopN - 1;
            $spread = $isLowerBetter
                ? round($topNSlice[$lastIdx] - $topNSlice[0], 4)
                : round($topNSlice[0] - $topNSlice[$lastIdx], 4);
        }

        $comboWxCount = count(array_filter($activeRuns, fn($r) => $r['weather'] !== null));
        $comboCoveragePct = $countActive > 0 ? round(100 * $comboWxCount / $countActive, 1) : null;

        $topRunsForAudit = array_slice($activeRuns, 0, $topN);

        $combos[] = [
            'engineCombo'       => $comboName,
            'engineComboId'     => $data['id'],
            'bestValue'         => $bestValue,
            'avgTopN'           => $avgTopN,
            'totalAvg'          => $totalAvg,
            'spread'            => $spread,
            'countTopN'         => $countTopN,
            'countTotal'        => $countTotal,
            'countActive'       => $countActive,
            'countExcluded'     => $countExcluded,
            'weatherCoveragePct'=> $comboCoveragePct,
            'topRuns'           => $topRunsForAudit,
        ];

        $comboAggs[$comboName] = [
            'best'     => $bestValue,
            'avgTopN'  => $avgTopN,
            'totalAvg' => $totalAvg,
        ];
    }

    // Sort combos by bestValue
    usort($combos, fn($a, $b) => match(true) {
        $a['bestValue'] === null => 1,
        $b['bestValue'] === null => -1,
        default => $isLowerBetter ? ($a['bestValue'] <=> $b['bestValue']) : ($b['bestValue'] <=> $a['bestValue']),
    });

    // ── Build pairwise delta matrices ───────────────────────────────────
    $comboNames = array_keys($comboAggs);
    $buildMatrix = function(string $field) use ($comboNames, $comboAggs, $isLowerBetter) {
        $rows = [];
        for ($i = 0; $i < count($comboNames); $i++) {
            for ($j = $i + 1; $j < count($comboNames); $j++) {
                $a = $comboNames[$i]; $b = $comboNames[$j];
                $va = $comboAggs[$a][$field]; $vb = $comboAggs[$b][$field];
                $delta = null;
                if ($va !== null && $vb !== null) {
                    // For ET (lower=better): delta = A - B → negative means A faster
                    // For MPH (higher=better): delta = B - A → negative means A faster
                    $delta = $isLowerBetter ? round($va - $vb, 4) : round($vb - $va, 4);
                }
                $rows[] = ['comboA' => $a, 'comboB' => $b, 'valueA' => $va, 'valueB' => $vb, 'delta' => $delta];
            }
        }
        return $rows;
    };

    $deltaMatrices = [
        'quickest' => $buildMatrix('best'),
        'avgTopN'  => $buildMatrix('avgTopN'),
        'totalAvg' => $buildMatrix('totalAvg'),
    ];

    // ── Build qualifying order (qual runs only, ET asc, MPH desc tiebreak, ts tiebreak) ─
    $qualOrder = [];
    // Re-fetch qual runs for ordering if needed (use allRunsFlat if scope already qual)
    $qualRunsForOrder = [];
    foreach ($allRunsFlat as $r) {
        if ($r['excluded']) continue;
        // Include only Q rounds for qual order
        if ($r['round'] && strpos($r['round'], 'Q') === 0) {
            $qualRunsForOrder[] = $r;
        }
    }
    // Group by driver, pick best ET per driver
    $driverBest = [];
    foreach ($qualRunsForOrder as $r) {
        $dn = $r['driver'];
        if (!isset($driverBest[$dn]) || $r['et'] < $driverBest[$dn]['et']
            || ($r['et'] === $driverBest[$dn]['et'] && ($r['mph'] ?? 0) > ($driverBest[$dn]['mph'] ?? 0))
            || ($r['et'] === $driverBest[$dn]['et'] && ($r['mph'] ?? 0) === ($driverBest[$dn]['mph'] ?? 0) && $r['timestamp'] < $driverBest[$dn]['timestamp'])) {
            $driverBest[$dn] = $r;
        }
    }
    $qualOrder = array_values($driverBest);
    usort($qualOrder, function($a, $b) {
        // Primary: ET ascending (null last)
        if ($a['et'] === null && $b['et'] === null) return 0;
        if ($a['et'] === null) return 1;
        if ($b['et'] === null) return -1;
        if ($a['et'] !== $b['et']) return $a['et'] <=> $b['et'];
        // Secondary: MPH descending
        $mphA = $a['mph'] ?? 0; $mphB = $b['mph'] ?? 0;
        if ($mphA !== $mphB) return $mphB <=> $mphA;
        // Tertiary: timestamp ascending
        return ($a['timestamp'] ?? '') <=> ($b['timestamp'] ?? '');
    });
    // Add position
    foreach ($qualOrder as $idx => &$qr) {
        $qr['qualPosition'] = $idx + 1;
    }
    unset($qr);

    // ── Mapping readiness ───────────────────────────────────────────────
    $mappedTotal = $totalMapped + $totalUnmapped;
    $mappedPct = $mappedTotal > 0 ? round(100 * $totalMapped / $mappedTotal, 1) : null;
    // Top missing drivers sorted by count desc
    arsort($unknownDriverCounts);
    $topMissing = [];
    $idx = 0;
    foreach ($unknownDriverCounts as $dn => $cnt) {
        $topMissing[] = ['driver' => $dn, 'runCount' => $cnt];
        if (++$idx >= 10) break;
    }

    // ── Trust ───────────────────────────────────────────────────────────
    $weatherCoveragePct = $totalRunsInScope > 0 ? round(100 * $runsWithWeather / $totalRunsInScope, 1) : null;
    $correctedCoveragePct = ($mode === 'corrected' && $totalRunsInScope > 0)
        ? round(100 * $runsWithCorrected / $totalRunsInScope, 1) : null;

    // ── Response ────────────────────────────────────────────────────────
    rsa_jsonResponse([
        'eventId'        => $eventId,
        'classIndex'     => $classIndex,
        'metric'         => $metric,
        'mode'           => $mode,
        'topN'           => $topN,
        'sessionScope'   => $sessionScope,
        'includeFlagged' => $includeFlagged,
        'includeUnknown' => $includeUnknown,
        'isLowerBetter'  => $isLowerBetter,
        'event' => [
            'event_name'       => $event['event_name'],
            'track_name'       => $event['track_name'],
            'city'             => $event['city'],
            'state'            => $event['state'],
            'start_date_local' => $event['start_date_local'],
            'end_date_local'   => $event['end_date_local'],
        ],
        'trust' => [
            'weatherCoveragePct'   => $weatherCoveragePct,
            'correctedCoveragePct' => $correctedCoveragePct,
            'totalRunsInScope'     => $totalRunsInScope,
            'runsWithWeather'      => $runsWithWeather,
            'runsWithCorrected'    => $runsWithCorrected,
            'hasTrackCoords'       => ($event['latitude'] !== null && $event['longitude'] !== null),
        ],
        'mapping' => [
            'mappedPct'         => $mappedPct,
            'mappedRunCount'    => $totalMapped,
            'unknownRunCount'   => $totalUnmapped,
            'topMissingDrivers' => $topMissing,
        ],
        'combos'        => $combos,
        'deltaMatrices' => $deltaMatrices,
        'allRuns'       => $allRunsFlat,
        'qualOrder'     => $qualOrder,
        'totalRunsInClass' => $totalRunsInScope,
    ]);
}

// ============================================================================
// SHARED HELPER: Load & process event runs for parity endpoints
// Returns array with keys: event, runs (processed), meta (trust/mapping/params)
// Used by paritySummary, parityDeltas, parityAllRuns, parityQualOrder
// ============================================================================

function parity_loadEventRunData(PDO $pdo): array {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $metric = trim($_GET['metric'] ?? 'et_1320');
    $mode = trim($_GET['mode'] ?? 'raw');
    $topN = max(1, min(20, (int)($_GET['topN'] ?? 4)));
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $includeFlagged = (bool)($_GET['includeFlagged'] ?? false);
    $includeUnknown = (bool)($_GET['includeUnknown'] ?? false);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);

    $validMetrics = ['et_1320', 'mph_1320', 'rt', 't60', 't330', 't660', 'mph_660', 't1000', 'mph_1000'];
    if (!in_array($metric, $validMetrics)) rsa_jsonResponse(['error' => 'Invalid metric'], 400);
    if (!in_array($mode, ['raw', 'corrected'])) rsa_jsonResponse(['error' => 'mode must be raw or corrected'], 400);
    if (!in_array($sessionScope, ['qual', 'elim', 'both'])) rsa_jsonResponse(['error' => 'sessionScope must be qual, elim, or both'], 400);

    $colMap = [
        'et_1320'=>'ft1320','mph_1320'=>'mph1320','rt'=>'rt','t60'=>'ft60',
        't330'=>'ft330','t660'=>'ft660','mph_660'=>'mph660','t1000'=>'ft1000','mph_1000'=>'mph1000',
    ];
    $dbCol = $colMap[$metric];
    $isLowerBetter = !in_array($metric, ['mph_1320', 'mph_660', 'mph_1000']);
    $sortDir = $isLowerBetter ? 'ASC' : 'DESC';

    // Load event
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.track_name, t.timezone_iana, t.city, t.state, t.latitude, t.longitude
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);
    $raceLookup = $event['race_lookup'];
    if (!$raceLookup) rsa_jsonResponse(['error' => 'Event has no race_lookup'], 400);

    // Expand class, load combo lookups
    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    $engineCombos = [];
    foreach ($pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos")->fetchAll(PDO::FETCH_ASSOC) as $ec) {
        $engineCombos[(int)$ec['id']] = $ec;
    }
    $driverCombos = $pdo->query("
        SELECT dc.driver_name, dc.class_index, dc.engine_combo_id, ec.name AS engine_combo_name,
               dc.effective_from_utc, dc.effective_to_utc
        FROM parity_driver_combos dc JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);
    $classDefaults = $pdo->query("
        SELECT cd.class_index, cd.engine_combo_id, ec.name AS engine_combo_name,
               cd.effective_from_utc, cd.effective_to_utc
        FROM parity_class_defaults cd JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Session scope filter
    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // Fetch runs
    $params = array_merge([$raceLookup], $classIndices);
    $runStmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.run_timestamp_utc, r.driver_name, r.class_index,
               r.round, r.lane, r.car_number, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               COALESCE(r.dq_flag, 0) AS dq_flag
        FROM parity_runs r
        WHERE r.race_lookup = ? AND r.class_index IN ($classPlaceholders)
          AND COALESCE(r.dq_flag, 0) = 0 AND r.$dbCol IS NOT NULL AND r.$dbCol > 0
          $sessionFilter
        ORDER BY r.$dbCol $sortDir
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Flagged runs
    $flaggedIds = [];
    if (!empty($runs)) {
        $runIds = array_column($runs, 'id');
        $fp = implode(',', array_fill(0, count($runIds), '?'));
        $fStmt = $pdo->prepare("SELECT run_id FROM parity_run_flags WHERE run_id IN ($fp) AND flag_type IN ('bad','exclude')");
        $fStmt->execute($runIds);
        $flaggedIds = array_flip($fStmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // Weather prepared stmt
    $weatherWindow = 30;
    $stmtWeather = $pdo->prepare("
        SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg, wc.timestamp_utc, wc.canonical_source_kind
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
    ");

    // Process each run
    $totalRunsInScope = count($runs);
    $runsWithWeather = 0;
    $runsWithCorrected = 0;
    $comboRuns = [];
    $allRunsFlat = [];
    $unknownDriverCounts = [];
    $totalMapped = 0;
    $totalUnmapped = 0;

    foreach ($runs as $run) {
        $runId = (int)$run['id'];
        $isFlagged = isset($flaggedIds[$runId]);
        $excluded = $isFlagged && !$includeFlagged;
        $rawValue = (float)$run[$dbCol];

        $comboName = 'Unknown';
        $comboId = null;
        $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
        if ($resolved) {
            $comboName = $resolved['name'];
            $comboId = $resolved['id'];
            $totalMapped++;
        } else {
            $totalUnmapped++;
            $dn = $run['driver_name'] ?? '(blank)';
            $unknownDriverCounts[$dn] = ($unknownDriverCounts[$dn] ?? 0) + 1;
        }

        $wxSnapshot = null;
        if ($run['run_timestamp_utc']) {
            $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
            $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
            if ($wx && $wx['temp_f'] !== null && $wx['rh_pct'] !== null && $wx['pressure_inhg'] !== null) {
                $wxSnapshot = [
                    'temp_f' => round((float)$wx['temp_f'], 1),
                    'rh_pct' => round((float)$wx['rh_pct'], 1),
                    'pressure_inhg' => round((float)$wx['pressure_inhg'], 3),
                    'source' => $wx['canonical_source_kind'] ?? 'unknown',
                    'timestamp_utc' => $wx['timestamp_utc'],
                ];
                $runsWithWeather++;
            }
        }

        $value = $rawValue;
        $correctionFactor = null;
        if ($mode === 'corrected' && $wxSnapshot && $comboId && isset($engineCombos[$comboId])) {
            $T = $wxSnapshot['temp_f']; $H = $wxSnapshot['rh_pct'] / 100; $BP = $wxSnapshot['pressure_inhg'];
            $ec = $engineCombos[$comboId];
            $tPow = (float)$ec['t_power']; $dPow = (float)$ec['d_power']; $FF = (float)$ec['friction_factor'];
            $theta = ($T + 459.67) / 519.67;
            $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
            $dap = $BP - $vp;
            $delta = $dap / 29.92;
            $hpc = (1 + $FF / 100) * (pow($theta, $tPow) / pow($delta, $dPow)) - $FF / 100;
            if ($hpc > 0 && is_finite($hpc)) {
                $correctionFactor = $hpc;
                $value = $isLowerBetter ? $rawValue * pow($hpc, -0.33) : $rawValue * pow($hpc, 0.33);
                $runsWithCorrected++;
            }
        }

        $entry = [
            'runId' => $runId, 'uuid' => $run['uuid'], 'driver' => $run['driver_name'],
            'round' => $run['round'], 'lane' => $run['lane'], 'carNumber' => $run['car_number'],
            'timestamp' => $run['run_timestamp_utc'],
            'rawValue' => round($rawValue, 4), 'value' => round($value, 4),
            'correctionFactor' => $correctionFactor ? round($correctionFactor, 6) : null,
            'excluded' => $excluded, 'flagged' => $isFlagged, 'dqFlag' => (int)$run['dq_flag'],
            'weather' => $wxSnapshot, 'engineCombo' => $comboName, 'engineComboId' => $comboId,
            'et' => $run['ft1320'] !== null ? round((float)$run['ft1320'], 4) : null,
            'mph' => $run['mph1320'] !== null ? round((float)$run['mph1320'], 2) : null,
        ];

        if (!isset($comboRuns[$comboName])) $comboRuns[$comboName] = ['id' => $comboId, 'runs' => []];
        $comboRuns[$comboName]['runs'][] = $entry;
        $allRunsFlat[] = $entry;
    }

    // Trust
    $weatherCoveragePct = $totalRunsInScope > 0 ? round(100 * $runsWithWeather / $totalRunsInScope, 1) : null;
    $correctedCoveragePct = ($mode === 'corrected' && $totalRunsInScope > 0)
        ? round(100 * $runsWithCorrected / $totalRunsInScope, 1) : null;

    // Mapping readiness
    $mappedTotal = $totalMapped + $totalUnmapped;
    $mappedPct = $mappedTotal > 0 ? round(100 * $totalMapped / $mappedTotal, 1) : null;
    arsort($unknownDriverCounts);
    $topMissing = [];
    $idx = 0;
    foreach ($unknownDriverCounts as $dn => $cnt) {
        $topMissing[] = ['driver' => $dn, 'runCount' => $cnt];
        if (++$idx >= 10) break;
    }

    return [
        'params' => [
            'eventId' => $eventId, 'classIndex' => $classIndex, 'metric' => $metric,
            'mode' => $mode, 'topN' => $topN, 'sessionScope' => $sessionScope,
            'includeFlagged' => $includeFlagged, 'includeUnknown' => $includeUnknown,
            'isLowerBetter' => $isLowerBetter,
        ],
        'event' => [
            'event_name' => $event['event_name'], 'track_name' => $event['track_name'],
            'city' => $event['city'], 'state' => $event['state'],
            'start_date_local' => $event['start_date_local'], 'end_date_local' => $event['end_date_local'],
        ],
        'trust' => [
            'weatherCoveragePct' => $weatherCoveragePct, 'correctedCoveragePct' => $correctedCoveragePct,
            'totalRunsInScope' => $totalRunsInScope, 'runsWithWeather' => $runsWithWeather,
            'runsWithCorrected' => $runsWithCorrected,
            'hasTrackCoords' => ($event['latitude'] !== null && $event['longitude'] !== null),
        ],
        'mapping' => [
            'mappedPct' => $mappedPct, 'mappedRunCount' => $totalMapped,
            'unknownRunCount' => $totalUnmapped, 'topMissingDrivers' => $topMissing,
        ],
        'comboRuns' => $comboRuns,
        'allRunsFlat' => $allRunsFlat,
        'totalRunsInScope' => $totalRunsInScope,
    ];
}

/** Build combo aggregates from comboRuns. Returns [combos, comboAggs]. */
function parity_buildComboAggregates(array $comboRuns, bool $includeUnknown, bool $isLowerBetter, int $topN): array {
    $combos = [];
    $comboAggs = [];
    foreach ($comboRuns as $comboName => $data) {
        if ($comboName === 'Unknown' && !$includeUnknown) continue;
        $allComboRuns = $data['runs'];
        $activeRuns = array_values(array_filter($allComboRuns, fn($r) => !$r['excluded']));
        usort($activeRuns, fn($a, $b) => $isLowerBetter ? ($a['value'] <=> $b['value']) : ($b['value'] <=> $a['value']));

        $countTotal = count($allComboRuns);
        $countActive = count($activeRuns);
        $activeValues = array_map(fn($r) => $r['value'], $activeRuns);
        $bestValue = $countActive > 0 ? round($activeValues[0], 4) : null;
        $topNSlice = array_slice($activeValues, 0, $topN);
        $avgTopN = count($topNSlice) > 0 ? round(array_sum($topNSlice) / count($topNSlice), 4) : null;
        $countTopN = count($topNSlice);
        $totalAvg = $countActive > 0 ? round(array_sum($activeValues) / $countActive, 4) : null;
        $spread = null;
        if ($countTopN >= 2) {
            $lastIdx = $countTopN - 1;
            $spread = $isLowerBetter ? round($topNSlice[$lastIdx] - $topNSlice[0], 4) : round($topNSlice[0] - $topNSlice[$lastIdx], 4);
        }
        $comboWxCount = count(array_filter($activeRuns, fn($r) => $r['weather'] !== null));
        $comboCoveragePct = $countActive > 0 ? round(100 * $comboWxCount / $countActive, 1) : null;
        $topRunsForAudit = array_slice($activeRuns, 0, $topN);

        $combos[] = [
            'engineCombo' => $comboName, 'engineComboId' => $data['id'],
            'bestValue' => $bestValue, 'avgTopN' => $avgTopN, 'totalAvg' => $totalAvg,
            'spread' => $spread, 'countTopN' => $countTopN, 'countTotal' => $countTotal,
            'countActive' => $countActive, 'countExcluded' => $countTotal - $countActive,
            'weatherCoveragePct' => $comboCoveragePct, 'topRuns' => $topRunsForAudit,
        ];
        $comboAggs[$comboName] = ['best' => $bestValue, 'avgTopN' => $avgTopN, 'totalAvg' => $totalAvg];
    }
    usort($combos, fn($a, $b) => match(true) {
        $a['bestValue'] === null => 1, $b['bestValue'] === null => -1,
        default => $isLowerBetter ? ($a['bestValue'] <=> $b['bestValue']) : ($b['bestValue'] <=> $a['bestValue']),
    });
    return [$combos, $comboAggs];
}

// ============================================================================
// GET ?action=paritySummary  (FAST initial load — no allRuns, no deltas, no qualOrder)
// ============================================================================

function handleParitySummary(PDO $pdo): void {
    $d = parity_loadEventRunData($pdo);
    $p = $d['params'];
    [$combos, ] = parity_buildComboAggregates($d['comboRuns'], $p['includeUnknown'], $p['isLowerBetter'], $p['topN']);

    rsa_jsonResponse([
        'eventId' => $p['eventId'], 'classIndex' => $p['classIndex'], 'metric' => $p['metric'],
        'mode' => $p['mode'], 'topN' => $p['topN'], 'sessionScope' => $p['sessionScope'],
        'includeFlagged' => $p['includeFlagged'], 'includeUnknown' => $p['includeUnknown'],
        'isLowerBetter' => $p['isLowerBetter'],
        'event' => $d['event'], 'trust' => $d['trust'], 'mapping' => $d['mapping'],
        'combos' => $combos, 'totalRunsInClass' => $d['totalRunsInScope'],
    ]);
}

// ============================================================================
// GET ?action=parityDeltas  (on-demand delta matrices)
// ============================================================================

function handleParityDeltas(PDO $pdo): void {
    $d = parity_loadEventRunData($pdo);
    $p = $d['params'];
    [, $comboAggs] = parity_buildComboAggregates($d['comboRuns'], $p['includeUnknown'], $p['isLowerBetter'], $p['topN']);

    $comboNames = array_keys($comboAggs);
    $isLowerBetter = $p['isLowerBetter'];
    $buildMatrix = function(string $field) use ($comboNames, $comboAggs, $isLowerBetter) {
        $rows = [];
        for ($i = 0; $i < count($comboNames); $i++) {
            for ($j = $i + 1; $j < count($comboNames); $j++) {
                $a = $comboNames[$i]; $b = $comboNames[$j];
                $va = $comboAggs[$a][$field]; $vb = $comboAggs[$b][$field];
                $delta = null;
                if ($va !== null && $vb !== null) {
                    $delta = $isLowerBetter ? round($va - $vb, 4) : round($vb - $va, 4);
                }
                $rows[] = ['comboA' => $a, 'comboB' => $b, 'valueA' => $va, 'valueB' => $vb, 'delta' => $delta];
            }
        }
        return $rows;
    };

    rsa_jsonResponse([
        'eventId' => $p['eventId'], 'classIndex' => $p['classIndex'], 'metric' => $p['metric'],
        'mode' => $p['mode'], 'topN' => $p['topN'], 'sessionScope' => $p['sessionScope'],
        'isLowerBetter' => $isLowerBetter,
        'deltaMatrices' => [
            'quickest' => $buildMatrix('best'),
            'avgTopN'  => $buildMatrix('avgTopN'),
            'totalAvg' => $buildMatrix('totalAvg'),
        ],
    ]);
}

// ============================================================================
// GET ?action=parityAllRuns  (paginated truth table with server-side driver search)
//     &page=1&pageSize=50&driverSearch=kalitta
// ============================================================================

function handleParityAllRuns(PDO $pdo): void {
    $d = parity_loadEventRunData($pdo);
    $p = $d['params'];

    $page = max(1, (int)($_GET['page'] ?? 1));
    $pageSize = max(10, min(200, (int)($_GET['pageSize'] ?? 50)));
    $driverSearch = strtolower(trim($_GET['driverSearch'] ?? ''));

    $allRuns = $d['allRunsFlat'];

    // Filter by driver search if provided
    if ($driverSearch !== '') {
        $allRuns = array_values(array_filter($allRuns, function($r) use ($driverSearch) {
            return strpos(strtolower($r['driver']), $driverSearch) !== false;
        }));
    }

    $totalFiltered = count($allRuns);
    $totalPages = max(1, (int)ceil($totalFiltered / $pageSize));
    $page = min($page, $totalPages);
    $offset = ($page - 1) * $pageSize;
    $pageRuns = array_slice($allRuns, $offset, $pageSize);

    rsa_jsonResponse([
        'eventId' => $p['eventId'], 'classIndex' => $p['classIndex'], 'metric' => $p['metric'],
        'mode' => $p['mode'], 'sessionScope' => $p['sessionScope'],
        'isLowerBetter' => $p['isLowerBetter'],
        'page' => $page, 'pageSize' => $pageSize, 'totalRuns' => $totalFiltered,
        'totalPages' => $totalPages, 'driverSearch' => $driverSearch,
        'runs' => $pageRuns,
    ]);
}

// ============================================================================
// GET ?action=parityQualOrder  (lean qualifying order endpoint)
// ============================================================================

function handleParityQualOrder(PDO $pdo): void {
    $d = parity_loadEventRunData($pdo);
    $p = $d['params'];

    // Build qual order from allRunsFlat (Q rounds only, best ET per driver)
    $qualRunsForOrder = [];
    foreach ($d['allRunsFlat'] as $r) {
        if ($r['excluded']) continue;
        if ($r['round'] && strpos($r['round'], 'Q') === 0) {
            $qualRunsForOrder[] = $r;
        }
    }
    $driverBest = [];
    foreach ($qualRunsForOrder as $r) {
        $dn = $r['driver'];
        if (!isset($driverBest[$dn]) || $r['et'] < $driverBest[$dn]['et']
            || ($r['et'] === $driverBest[$dn]['et'] && ($r['mph'] ?? 0) > ($driverBest[$dn]['mph'] ?? 0))
            || ($r['et'] === $driverBest[$dn]['et'] && ($r['mph'] ?? 0) === ($driverBest[$dn]['mph'] ?? 0) && $r['timestamp'] < $driverBest[$dn]['timestamp'])) {
            $driverBest[$dn] = $r;
        }
    }
    $qualOrder = array_values($driverBest);
    usort($qualOrder, function($a, $b) {
        if ($a['et'] === null && $b['et'] === null) return 0;
        if ($a['et'] === null) return 1;
        if ($b['et'] === null) return -1;
        if ($a['et'] !== $b['et']) return $a['et'] <=> $b['et'];
        $mphA = $a['mph'] ?? 0; $mphB = $b['mph'] ?? 0;
        if ($mphA !== $mphB) return $mphB <=> $mphA;
        return ($a['timestamp'] ?? '') <=> ($b['timestamp'] ?? '');
    });
    foreach ($qualOrder as $idx => &$qr) { $qr['qualPosition'] = $idx + 1; }
    unset($qr);

    rsa_jsonResponse([
        'eventId' => $p['eventId'], 'classIndex' => $p['classIndex'], 'metric' => $p['metric'],
        'mode' => $p['mode'], 'sessionScope' => $p['sessionScope'],
        'isLowerBetter' => $p['isLowerBetter'],
        'qualOrder' => $qualOrder,
    ]);
}

// ============================================================================
// GET ?action=rangeParityMatrix&classIndex=TF&metric=et_1320&mode=raw&topN=4
//     &sessionScope=both&year=2024  OR  &startDate=2024-01-01&endDate=2024-12-31
// Returns events × combos matrix for a date range or season.
// Cell values include best, avgTopN, totalAvg per combo per event.
// ============================================================================

function handleRangeParityMatrix(PDO $pdo): void {
    $classIndex = trim($_GET['classIndex'] ?? '');
    $metric = trim($_GET['metric'] ?? 'et_1320');
    $mode = trim($_GET['mode'] ?? 'raw');
    $topN = max(1, min(20, (int)($_GET['topN'] ?? 4)));
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
    $startDate = trim($_GET['startDate'] ?? '');
    $endDate = trim($_GET['endDate'] ?? '');

    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);

    $validMetrics = ['et_1320', 'mph_1320', 'rt', 't60', 't330', 't660', 'mph_660', 't1000', 'mph_1000'];
    if (!in_array($metric, $validMetrics)) {
        rsa_jsonResponse(['error' => "Invalid metric"], 400);
    }

    // Determine date range
    if ($year) {
        $startDate = "$year-01-01";
        $endDate = "$year-12-31";
    }
    if (!$startDate || !$endDate) {
        rsa_jsonResponse(['error' => 'Provide year or startDate+endDate'], 400);
    }

    $colMap = [
        'et_1320'  => 'ft1320',  'mph_1320' => 'mph1320', 'rt' => 'rt',
        't60'      => 'ft60',    't330'     => 'ft330',    't660' => 'ft660',
        'mph_660'  => 'mph660',  't1000'    => 'ft1000',   'mph_1000' => 'mph1000',
    ];
    $dbCol = $colMap[$metric];
    $isLowerBetter = !in_array($metric, ['mph_1320', 'mph_660', 'mph_1000']);

    // Load events in range
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.event_code, e.start_date_local, e.end_date_local, e.race_lookup,
               t.track_name, t.city, t.state
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.start_date_local >= ? AND e.start_date_local <= ?
        ORDER BY e.start_date_local
    ");
    $evStmt->execute([$startDate, $endDate]);
    $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) {
        rsa_jsonResponse([
            'events' => [], 'combos' => [], 'matrix' => (object)[],
            'classIndex' => $classIndex, 'metric' => $metric, 'mode' => $mode,
            'topN' => $topN, 'sessionScope' => $sessionScope,
            'isLowerBetter' => $isLowerBetter, 'startDate' => $startDate, 'endDate' => $endDate,
        ]);
    }

    // Expand class
    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    // Load combo lookups (once, shared across events)
    $engineCombos = [];
    $ecStmt = $pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos");
    foreach ($ecStmt->fetchAll(PDO::FETCH_ASSOC) as $ec) {
        $engineCombos[(int)$ec['id']] = $ec;
    }
    $driverCombos = $pdo->query("
        SELECT dc.driver_name, dc.class_index, dc.engine_combo_id, ec.name AS engine_combo_name,
               dc.effective_from_utc, dc.effective_to_utc
        FROM parity_driver_combos dc JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);
    $classDefaults = $pdo->query("
        SELECT cd.class_index, cd.engine_combo_id, ec.name AS engine_combo_name,
               cd.effective_from_utc, cd.effective_to_utc
        FROM parity_class_defaults cd JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // Weather stmt for corrections
    $weatherWindow = 30;
    $stmtWeather = $pdo->prepare("
        SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
    ");

    $allComboNames = []; // track unique combo names
    $matrix = [];        // eventId => comboName => {best, avgTopN, totalAvg, count}

    foreach ($events as $ev) {
        $raceLookup = $ev['race_lookup'];
        if (!$raceLookup) continue;

        $params = array_merge([$raceLookup], $classIndices);
        $runStmt = $pdo->prepare("
            SELECT r.id, r.run_timestamp_utc, r.driver_name, r.class_index, r.$dbCol AS metric_val,
                   r.ft1320, r.mph1320, COALESCE(r.dq_flag, 0) AS dq_flag
            FROM parity_runs r
            WHERE r.race_lookup = ? AND r.class_index IN ($classPlaceholders)
              AND COALESCE(r.dq_flag, 0) = 0 AND r.$dbCol IS NOT NULL AND r.$dbCol > 0
              AND NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ('bad','exclude'))
              $sessionFilter
        ");
        $runStmt->execute($params);
        $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by combo
        $comboValues = []; // comboName => [values]
        foreach ($runs as $run) {
            $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
            if (!$resolved) continue; // skip unknown in range view
            $comboName = $resolved['name'];
            $comboId = $resolved['id'];
            $allComboNames[$comboName] = true;

            $value = (float)$run['metric_val'];

            // Apply correction if needed
            if ($mode === 'corrected' && $run['run_timestamp_utc'] && isset($engineCombos[$comboId])) {
                $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
                $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
                if ($wx && $wx['temp_f'] !== null && $wx['rh_pct'] !== null && $wx['pressure_inhg'] !== null) {
                    $ec = $engineCombos[$comboId];
                    $T = (float)$wx['temp_f']; $H = (float)$wx['rh_pct'] / 100; $BP = (float)$wx['pressure_inhg'];
                    $theta = ($T + 459.67) / 519.67;
                    $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
                    $delta = ($BP - $vp) / 29.92;
                    $FF = (float)$ec['friction_factor'];
                    $hpc = (1 + $FF / 100) * (pow($theta, (float)$ec['t_power']) / pow($delta, (float)$ec['d_power'])) - $FF / 100;
                    if ($hpc > 0 && is_finite($hpc)) {
                        $value = $isLowerBetter ? $value * pow($hpc, -0.33) : $value * pow($hpc, 0.33);
                    }
                }
            }

            $comboValues[$comboName][] = $value;
        }

        // Compute aggregates per combo
        $evId = (int)$ev['id'];
        $matrix[$evId] = [];
        foreach ($comboValues as $cn => $vals) {
            if ($isLowerBetter) sort($vals); else rsort($vals);
            $best = round($vals[0], 4);
            $topSlice = array_slice($vals, 0, $topN);
            $avgTopN = round(array_sum($topSlice) / count($topSlice), 4);
            $totalAvg = round(array_sum($vals) / count($vals), 4);
            $matrix[$evId][$cn] = [
                'best' => $best, 'avgTopN' => $avgTopN, 'totalAvg' => $totalAvg, 'count' => count($vals),
            ];
        }
    }

    $comboNamesSorted = array_keys($allComboNames);
    sort($comboNamesSorted);

    // Build output events list
    $outEvents = [];
    foreach ($events as $ev) {
        $evId = (int)$ev['id'];
        if (!isset($matrix[$evId])) continue;
        $outEvents[] = [
            'eventId' => $evId,
            'event_name' => $ev['event_name'],
            'event_code' => $ev['event_code'] ?? null,
            'track_name' => $ev['track_name'],
            'city' => $ev['city'],
            'state' => $ev['state'],
            'start_date_local' => $ev['start_date_local'],
        ];
    }

    rsa_jsonResponse([
        'classIndex' => $classIndex,
        'metric' => $metric,
        'mode' => $mode,
        'topN' => $topN,
        'sessionScope' => $sessionScope,
        'isLowerBetter' => $isLowerBetter,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'events' => $outEvents,
        'combos' => $comboNamesSorted,
        'matrix' => $matrix, // eventId => comboName => {best, avgTopN, totalAvg, count}
    ]);
}

// ============================================================================
// GET ?action=parityIncrementals&eventId=N&classIndex=TF&sessionScope=both
//     &includeFlagged=0&includeUnknown=0
// Returns optimal-run incrementals per combo:
//   ET rows (60ft,330ft,660ft,1000ft,1320ft) → MIN (best/lowest)
//   MPH rows (660mph,1000mph,1320mph) → MAX (best/highest)
// Raw values only (no correction for incrementals).
// ============================================================================

function handleParityIncrementals(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $includeFlagged = (bool)($_GET['includeFlagged'] ?? false);
    $includeUnknown = (bool)($_GET['includeUnknown'] ?? false);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);
    if (!in_array($sessionScope, ['qual', 'elim', 'both'])) rsa_jsonResponse(['error' => 'sessionScope must be qual, elim, or both'], 400);

    // Load event
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup
        FROM parity_events e WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);
    $raceLookup = $event['race_lookup'];
    if (!$raceLookup) rsa_jsonResponse(['error' => 'Event has no race_lookup'], 400);

    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    // Load combo lookups
    $driverCombos = $pdo->query("
        SELECT dc.driver_name, dc.class_index, dc.engine_combo_id, ec.name AS engine_combo_name,
               dc.effective_from_utc, dc.effective_to_utc
        FROM parity_driver_combos dc JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);
    $classDefaults = $pdo->query("
        SELECT cd.class_index, cd.engine_combo_id, ec.name AS engine_combo_name,
               cd.effective_from_utc, cd.effective_to_utc
        FROM parity_class_defaults cd JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // Fetch ALL runs with incremental columns (no metric filter — we need all columns)
    $params = array_merge([$raceLookup], $classIndices);
    $runStmt = $pdo->prepare("
        SELECT r.id, r.run_timestamp_utc, r.driver_name, r.class_index,
               r.round, r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               COALESCE(r.dq_flag, 0) AS dq_flag
        FROM parity_runs r
        WHERE r.race_lookup = ? AND r.class_index IN ($classPlaceholders)
          AND COALESCE(r.dq_flag, 0) = 0
          $sessionFilter
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Flagged runs
    $flaggedIds = [];
    if (!empty($runs)) {
        $runIds = array_column($runs, 'id');
        $fp = implode(',', array_fill(0, count($runIds), '?'));
        $fStmt = $pdo->prepare("SELECT run_id FROM parity_run_flags WHERE run_id IN ($fp) AND flag_type IN ('bad','exclude')");
        $fStmt->execute($runIds);
        $flaggedIds = array_flip($fStmt->fetchAll(PDO::FETCH_COLUMN));
    }

    // Incremental definitions: label, dbCol, isLowerBetter
    $incrementals = [
        ['label' => '60 ft',    'key' => 't60',      'dbCol' => 'ft60',    'isLower' => true],
        ['label' => '330 ft',   'key' => 't330',     'dbCol' => 'ft330',   'isLower' => true],
        ['label' => '660 ft',   'key' => 't660',     'dbCol' => 'ft660',   'isLower' => true],
        ['label' => '660 MPH',  'key' => 'mph660',   'dbCol' => 'mph660',  'isLower' => false],
        ['label' => '1000 ft',  'key' => 't1000',    'dbCol' => 'ft1000',  'isLower' => true],
        ['label' => '1000 MPH', 'key' => 'mph1000',  'dbCol' => 'mph1000', 'isLower' => false],
        ['label' => '1320 ft',  'key' => 't1320',    'dbCol' => 'ft1320',  'isLower' => true],
        ['label' => '1320 MPH', 'key' => 'mph1320',  'dbCol' => 'mph1320', 'isLower' => false],
    ];

    // Group values by combo → incremental
    $comboIncrementals = []; // comboName => key => [values]
    $allComboNames = [];

    foreach ($runs as $run) {
        $runId = (int)$run['id'];
        $isFlagged = isset($flaggedIds[$runId]);
        if ($isFlagged && !$includeFlagged) continue;

        $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
        $comboName = $resolved ? $resolved['name'] : 'Unknown';
        if ($comboName === 'Unknown' && !$includeUnknown) continue;

        $allComboNames[$comboName] = true;
        if (!isset($comboIncrementals[$comboName])) $comboIncrementals[$comboName] = [];

        foreach ($incrementals as $inc) {
            $val = $run[$inc['dbCol']];
            if ($val !== null && (float)$val > 0) {
                $comboIncrementals[$comboName][$inc['key']][] = (float)$val;
            }
        }
    }

    // Build result: rows = incrementals, columns = combos
    $comboNames = array_keys($allComboNames);
    sort($comboNames);

    $rows = [];
    foreach ($incrementals as $inc) {
        $row = [
            'label' => $inc['label'],
            'key' => $inc['key'],
            'isLowerBetter' => $inc['isLower'],
            'values' => [],
        ];
        foreach ($comboNames as $cn) {
            $vals = $comboIncrementals[$cn][$inc['key']] ?? [];
            if (empty($vals)) {
                $row['values'][$cn] = null;
            } else {
                $row['values'][$cn] = $inc['isLower']
                    ? round(min($vals), 4)
                    : round(max($vals), 4);
            }
        }
        $rows[] = $row;
    }

    rsa_jsonResponse([
        'eventId' => $eventId,
        'classIndex' => $classIndex,
        'sessionScope' => $sessionScope,
        'combos' => $comboNames,
        'rows' => $rows,
    ]);
}

// ============================================================================
// GET ?action=paritySessionWeather&eventId=N&classIndex=TF
// Returns per-session (Q1,Q2,...,E1,E2,...) weather averages.
// Each row: {session, temp_f, rh_pct, pressure_inhg, density_alt_ft, hpc, runCount}
// ============================================================================

function handleParitySessionWeather(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);

    // Load event + track timezone
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, t.latitude, t.longitude, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);
    $raceLookup = $event['race_lookup'];
    if (!$raceLookup) rsa_jsonResponse(['error' => 'Event has no race_lookup'], 400);
    $trackTz = $event['timezone_iana'] ?? 'America/New_York';

    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    // Fetch runs with timestamps, rounds, and local time.
    // Exclude orphan runs (missing run_time_local) from confidence denominators
    // — these have unverified UTC timestamps and would poison weather matching.
    $params = array_merge([$raceLookup], $classIndices);
    $runStmt = $pdo->prepare("
        SELECT r.run_timestamp_utc, r.run_time_local, r.round
        FROM parity_runs r
        WHERE r.race_lookup = ? AND r.class_index IN ($classPlaceholders)
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.run_timestamp_utc IS NOT NULL
          AND r.run_time_local IS NOT NULL
          AND r.round IS NOT NULL AND r.round != ''
        ORDER BY r.round, r.run_time_local
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Weather lookup — returns offset_seconds for diagnostics
    $weatherWindow = 30;
    $stmtWeather = $pdo->prepare("
        SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg,
               ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) AS offset_seconds
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
    ");

    // Group weather by session (round), track offsets and local times
    $sessionData = []; // round => [{temp, rh, press, offset_s}]
    $sessionLocalTimes = []; // round => [local_time strings]
    $totalRuns = count($runs);
    $matchedRuns = 0;
    $allOffsets = [];

    foreach ($runs as $run) {
        $round = $run['round'];
        $ts = $run['run_timestamp_utc'];
        $stmtWeather->execute([$ts, $ts, $weatherWindow, $ts, $weatherWindow, $ts]);
        $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);

        // Track local time for session label hints
        $localTime = $run['run_time_local'] ?? parity_utcToLocal($ts, $trackTz);
        if ($localTime) {
            if (!isset($sessionLocalTimes[$round])) $sessionLocalTimes[$round] = [];
            $sessionLocalTimes[$round][] = $localTime;
        }

        if (!$wx || $wx['temp_f'] === null || $wx['rh_pct'] === null || $wx['pressure_inhg'] === null) continue;

        $matchedRuns++;
        $offsetS = (int)$wx['offset_seconds'];
        $allOffsets[] = $offsetS;

        if (!isset($sessionData[$round])) $sessionData[$round] = [];
        $sessionData[$round][] = [
            'temp_f' => (float)$wx['temp_f'],
            'rh_pct' => (float)$wx['rh_pct'],
            'pressure_inhg' => (float)$wx['pressure_inhg'],
            'offset_s' => $offsetS,
        ];
    }

    // Build rows sorted by session: Q1,Q2,Q3,Q4,E1,E2,E3,E4,...
    $sessionOrder = function($a, $b) {
        $aIsQ = strpos($a, 'Q') === 0;
        $bIsQ = strpos($b, 'Q') === 0;
        if ($aIsQ !== $bIsQ) return $aIsQ ? -1 : 1;
        return $a <=> $b;
    };

    $rounds = array_keys($sessionData);
    usort($rounds, $sessionOrder);

    $rows = [];
    foreach ($rounds as $round) {
        $samples = $sessionData[$round];
        $n = count($samples);
        $avgTemp = array_sum(array_column($samples, 'temp_f')) / $n;
        $avgRH = array_sum(array_column($samples, 'rh_pct')) / $n;
        $avgPress = array_sum(array_column($samples, 'pressure_inhg')) / $n;
        $avgOffset = array_sum(array_column($samples, 'offset_s')) / $n;

        // Density altitude + correction factor — exact match to weatherCorrection.ts
        $T = $avgTemp;
        $H = $avgRH / 100;  // fraction
        $BP = $avgPress;
        // SVP via NHRA formula (matches weatherCorrection.ts saturatedVaporPressure)
        $svp = 29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152));
        $vp = $H * $svp;
        $dap = $BP - $vp;
        // Air density (matches weatherCorrection.ts airDensity)
        $ad = 1736.86 * ($BP - $vp) / ($T + 459.67);
        // DA (matches weatherCorrection.ts densityAltitude)
        $densityAlt = round(145723 * (1 - pow($ad / 100, 0.234944)), 0);
        // Correction factor (matches weatherCorrection.ts correctionFactor)
        $tempC = ($T - 32) * (5.0 / 9.0);
        $tempK = $tempC + 273.15;
        $hpc = round(1.176 * (1013.20690822892 / ($dap / 0.02953)) * pow($tempK / 288.705555555556, 0.5) - 0.176, 4);

        // Local time window for this session
        $localTimeHint = null;
        if (!empty($sessionLocalTimes[$round])) {
            $times = $sessionLocalTimes[$round];
            sort($times);
            $first = substr($times[0], 11, 5); // HH:MM
            $last = substr(end($times), 11, 5);
            $localTimeHint = ($first === $last) ? $first : "$first–$last";
        }

        $rows[] = [
            'session' => $round,
            'runCount' => $n,
            'temp_f' => round($avgTemp, 1),
            'rh_pct' => round($avgRH, 1),
            'pressure_inhg' => round($avgPress, 3),
            'density_alt_ft' => (int)$densityAlt,
            'hpc' => round($hpc, 4),
            'avgOffsetMin' => round($avgOffset / 60, 1),
            'localTimeHint' => $localTimeHint,
        ];
    }

    // Weather match confidence stats
    $pctMatched = $totalRuns > 0 ? round(100 * $matchedRuns / $totalRuns, 1) : null;
    $avgOffsetMin = count($allOffsets) > 0 ? round((array_sum($allOffsets) / count($allOffsets)) / 60, 1) : null;
    $maxOffsetMin = count($allOffsets) > 0 ? round(max($allOffsets) / 60, 1) : null;

    rsa_jsonResponse([
        'eventId' => $eventId,
        'classIndex' => $classIndex,
        'trackTimezone' => $trackTz,
        'sessions' => $rows,
        'weatherConfidence' => [
            'totalRuns' => $totalRuns,
            'matchedRuns' => $matchedRuns,
            'pctMatched' => $pctMatched,
            'avgOffsetMin' => $avgOffsetMin,
            'maxOffsetMin' => $maxOffsetMin,
        ],
    ]);
}

/** Resolve engine combo for a run using driver combos + class defaults. */
function resolveComboForRun(?string $driverName, ?string $classIndex, ?string $runTs, array $driverCombos, array $classDefaults): ?array {
    if (!$driverName || !$classIndex || !$runTs) return null;
    $dn = strtoupper($driverName);
    $ci = strtoupper($classIndex);
    $ts = strtotime($runTs);
    if ($ts === false) return null;

    // 1) Driver assignment
    $best = null;
    $bestFrom = 0;
    foreach ($driverCombos as $dc) {
        if (strtoupper($dc['driver_name']) !== $dn) continue;
        if (strtoupper($dc['class_index']) !== $ci) continue;
        $from = strtotime($dc['effective_from_utc']);
        if ($ts < $from) continue;
        if ($dc['effective_to_utc'] !== null) {
            $to = strtotime($dc['effective_to_utc']);
            if ($ts >= $to) continue;
        }
        if ($from >= $bestFrom) {
            $bestFrom = $from;
            $best = ['id' => (int)$dc['engine_combo_id'], 'name' => $dc['engine_combo_name']];
        }
    }
    if ($best) return $best;

    // 2) Class default
    $best = null;
    $bestFrom = -1;
    foreach ($classDefaults as $cd) {
        if (strtoupper($cd['class_index']) !== $ci) continue;
        $from = $cd['effective_from_utc'] ? strtotime($cd['effective_from_utc']) : 0;
        if ($cd['effective_from_utc'] && $ts < $from) continue;
        if ($cd['effective_to_utc'] !== null) {
            $to = strtotime($cd['effective_to_utc']);
            if ($ts >= $to) continue;
        }
        if ($from >= $bestFrom) {
            $bestFrom = $from;
            $best = ['id' => (int)$cd['engine_combo_id'], 'name' => $cd['engine_combo_name']];
        }
    }
    return $best;
}

// ============================================================================
// POST ?action=importStationCsv
// Body: { rows: [{timestampUtc, tempF, humidityPct, pressureHpa}], bufferHours?, source?, rebuildCanonical? }
// Maps each row to an event by timestamp window (no lat/lon), inserts into
// parity_weather_samples, optionally rebuilds canonical for affected events.
// ============================================================================

function handleImportStationCsv(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $rows = $input['rows'] ?? [];
    $bufferHours = isset($input['bufferHours']) ? (int)$input['bufferHours'] : 12;
    $source = trim($input['source'] ?? 'station_csv_2025');
    $rebuildCanonical = (bool)($input['rebuildCanonical'] ?? false);
    $previewOnly = (bool)($input['previewOnly'] ?? false);

    if (!is_array($rows) || count($rows) === 0) {
        rsa_jsonResponse(['error' => 'rows array is required and must not be empty'], 400);
    }
    if (count($rows) > 15000) {
        rsa_jsonResponse(['error' => 'Maximum 15,000 rows per request'], 400);
    }
    if ($bufferHours < 0 || $bufferHours > 48) {
        rsa_jsonResponse(['error' => 'bufferHours must be 0..48'], 400);
    }
    if ($source === '') {
        rsa_jsonResponse(['error' => 'source must not be empty'], 400);
    }

    // ── 1. Load all events and build UTC windows ────────────────────────
    $evStmt = $pdo->query("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.id AS track_id, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        ORDER BY e.start_date_local
    ");
    $allEvents = $evStmt->fetchAll(PDO::FETCH_ASSOC);

    $eventWindows = [];
    foreach ($allEvents as $ev) {
        $tz = $ev['timezone_iana'];
        try {
            $tzObj = new DateTimeZone($tz);
            $startLocal = $ev['start_date_local'];
            $endLocal = $ev['end_date_local'] ?: $startLocal;

            // If only start_date (same as end), treat as 4-day event
            if ($startLocal === $endLocal) {
                $endDt = new DateTimeImmutable("$endLocal 23:59:59", $tzObj);
                $endDt = $endDt->modify('+3 days');
                $endLocal = $endDt->format('Y-m-d');
            }

            $windowStartDt = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))
                ->modify("-{$bufferHours} hours");
            $windowEndDt = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))
                ->modify("+{$bufferHours} hours");

            // Midpoint for tiebreaking
            $midEpoch = ($windowStartDt->getTimestamp() + $windowEndDt->getTimestamp()) / 2;

            // Actual event UTC bounds (no buffer) for canonical rebuild
            $eventStartUtc = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            $eventEndUtc = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

            $eventWindows[] = [
                'id' => (int)$ev['id'],
                'name' => $ev['event_name'],
                'track_id' => (int)$ev['track_id'],
                'timezone' => $tz,
                'startLocal' => $ev['start_date_local'],
                'endLocal' => $ev['end_date_local'],
                'windowStartEpoch' => $windowStartDt->getTimestamp(),
                'windowEndEpoch' => $windowEndDt->getTimestamp(),
                'midEpoch' => $midEpoch,
                'eventStartUtc' => $eventStartUtc,
                'eventEndUtc' => $eventEndUtc,
            ];
        } catch (Exception $e) {
            // Skip events with bad timezone
            continue;
        }
    }

    // ── 2. Parse and map rows ───────────────────────────────────────────
    $mapped = [];
    $unmapped = [];
    $parseErrors = [];

    foreach ($rows as $i => $row) {
        $tsRaw = trim($row['timestampUtc'] ?? '');
        $tempF = isset($row['tempF']) ? (float)$row['tempF'] : null;
        $humPct = isset($row['humidityPct']) ? (float)$row['humidityPct'] : null;
        $pressHpa = isset($row['pressureHpa']) ? (float)$row['pressureHpa'] : null;

        // Validate
        if ($tsRaw === '' || $tempF === null || $humPct === null || $pressHpa === null) {
            $parseErrors[] = ['row' => $i, 'reason' => 'missing fields', 'ts' => $tsRaw];
            continue;
        }
        if (!is_finite($tempF) || !is_finite($humPct) || !is_finite($pressHpa)) {
            $parseErrors[] = ['row' => $i, 'reason' => 'non-finite values', 'ts' => $tsRaw];
            continue;
        }

        // Convert pressure hPa → inHg for sanity check
        $pressInhg = $pressHpa * 0.02953;
        if ($pressInhg < 20.0 || $pressInhg > 35.0) {
            $parseErrors[] = ['row' => $i, 'reason' => "pressure out of range: {$pressHpa} hPa = {$pressInhg} inHg", 'ts' => $tsRaw];
            continue;
        }
        if ($humPct < 0 || $humPct > 100) {
            $parseErrors[] = ['row' => $i, 'reason' => "humidity out of range: {$humPct}", 'ts' => $tsRaw];
            continue;
        }

        // Parse timestamp
        try {
            $dt = new DateTimeImmutable($tsRaw, new DateTimeZone('UTC'));
            $tsUtc = $dt->format('Y-m-d H:i:s');
            $tsEpoch = $dt->getTimestamp();
        } catch (Exception $e) {
            $parseErrors[] = ['row' => $i, 'reason' => "invalid timestamp: {$tsRaw}", 'ts' => $tsRaw];
            continue;
        }

        // Find matching events
        $matches = [];
        foreach ($eventWindows as $ew) {
            if ($tsEpoch >= $ew['windowStartEpoch'] && $tsEpoch <= $ew['windowEndEpoch']) {
                $matches[] = $ew;
            }
        }

        if (count($matches) === 0) {
            $unmapped[] = ['row' => $i, 'timestampUtc' => $tsUtc, 'tempF' => $tempF, 'humidityPct' => $humPct, 'pressureHpa' => $pressHpa];
            continue;
        }

        // Pick best match: closest midpoint
        $bestEvent = $matches[0];
        if (count($matches) > 1) {
            $bestDist = abs($tsEpoch - $bestEvent['midEpoch']);
            for ($j = 1; $j < count($matches); $j++) {
                $dist = abs($tsEpoch - $matches[$j]['midEpoch']);
                if ($dist < $bestDist) {
                    $bestDist = $dist;
                    $bestEvent = $matches[$j];
                }
            }
        }

        $mapped[] = [
            'row' => $i,
            'timestampUtc' => $tsUtc,
            'tempF' => $tempF,
            'humidityPct' => $humPct,
            'pressureHpa' => $pressHpa,
            'eventId' => $bestEvent['id'],
            'eventName' => $bestEvent['name'],
            'trackId' => $bestEvent['track_id'],
            'timezone' => $bestEvent['timezone'],
        ];
    }

    // ── Preview mode: return mapping without inserting ──────────────────
    if ($previewOnly) {
        rsa_jsonResponse([
            'ok' => true,
            'previewOnly' => true,
            'rowsParsed' => count($rows),
            'rowsMapped' => count($mapped),
            'rowsUnmapped' => count($unmapped),
            'parseErrors' => count($parseErrors),
            'preview' => array_slice($mapped, 0, 100),
            'unmappedExamples' => array_slice($unmapped, 0, 20),
            'parseErrorExamples' => array_slice($parseErrors, 0, 20),
            'eventsAffected' => array_values(array_unique(array_column($mapped, 'eventName'))),
        ]);
        return;
    }

    // ── 3. Insert mapped rows ───────────────────────────────────────────
    $stmtInsert = $pdo->prepare("
        INSERT INTO parity_weather_samples
            (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $inserted = 0;
    $deduped = 0;
    $insertErrors = [];
    $affectedEventIds = [];

    foreach ($mapped as $m) {
        $tempC = ($m['tempF'] - 32) * 5.0 / 9.0;

        // Compute local time
        try {
            $utcDt = new DateTimeImmutable($m['timestampUtc'], new DateTimeZone('UTC'));
            $localDt = $utcDt->setTimezone(new DateTimeZone($m['timezone']));
            $localStr = $localDt->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $insertErrors[] = "Row {$m['row']}: timezone error";
            continue;
        }

        try {
            $stmtInsert->execute([
                $m['timestampUtc'],
                $m['eventId'],
                $m['trackId'],
                $localStr,
                round($tempC, 4),
                round($m['tempF'], 4),
                round($m['humidityPct'], 2),
                round($m['pressureHpa'], 4),  // store original hPa in station_pressure_raw
                $source,
            ]);
            $inserted++;
            $affectedEventIds[$m['eventId']] = true;
        } catch (PDOException $e) {
            if (strpos($e->getMessage(), 'Duplicate') !== false) {
                $deduped++;
            } else {
                $insertErrors[] = "Row {$m['row']}: " . $e->getMessage();
            }
        }
    }

    // ── 4. Optionally rebuild canonical for affected events ─────────────
    $rebuildResults = [];
    if ($rebuildCanonical && !empty($affectedEventIds)) {
        foreach (array_keys($affectedEventIds) as $eid) {
            // Get event UTC range
            $evRangeStmt = $pdo->prepare("
                SELECT e.start_date_local, e.end_date_local, t.timezone_iana
                FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id
                WHERE e.id = ?
            ");
            $evRangeStmt->execute([$eid]);
            $evRange = $evRangeStmt->fetch(PDO::FETCH_ASSOC);
            if (!$evRange) continue;

            try {
                $tz2 = new DateTimeZone($evRange['timezone_iana']);
                $startLocal = $evRange['start_date_local'];
                $endLocal = $evRange['end_date_local'] ?: $startLocal;
                $sUtc = (new DateTimeImmutable("$startLocal 00:00:00", $tz2))
                    ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
                $eUtc = (new DateTimeImmutable("$endLocal 23:59:59", $tz2))
                    ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

                $result = weatherRebuildCanonicalRange($pdo, $sUtc, $eUtc, 30);
                $rebuildResults[$eid] = $result;
            } catch (Exception $e) {
                $rebuildResults[$eid] = ['error' => $e->getMessage()];
            }
        }
    }

    rsa_jsonResponse([
        'ok' => true,
        'source' => $source,
        'bufferHours' => $bufferHours,
        'rowsParsed' => count($rows),
        'rowsMapped' => count($mapped),
        'rowsUnmapped' => count($unmapped),
        'parseErrors' => count($parseErrors),
        'inserted' => $inserted,
        'deduped' => $deduped,
        'insertErrors' => count($insertErrors),
        'eventsAffected' => array_values(array_unique(array_column($mapped, 'eventName'))),
        'affectedEventIds' => array_map('intval', array_keys($affectedEventIds)),
        'unmappedExamples' => array_slice($unmapped, 0, 20),
        'parseErrorExamples' => array_slice($parseErrors, 0, 20),
        'insertErrorExamples' => array_slice($insertErrors, 0, 20),
        'rebuildResults' => $rebuildCanonical ? $rebuildResults : null,
        'preview' => array_slice($mapped, 0, 50),
    ]);
}

// ============================================================================
// GET ?action=paritySmokeTest
// Admin-gated verification endpoint for Qual Sheet and Driver History.
// Uses identical logic to handleQualSheet (Q%-only, best-run-per-driver,
// NHRA tiebreakers) so assertions verify the real production behavior.
// ============================================================================
function handleParitySmokeTest($pdo, $auth) {
    // Require admin role
    if (!in_array($auth['role'] ?? '', ['owner', 'admin'], true)) {
        rsa_jsonResponse(['error' => 'Admin access required'], 403);
    }

    $eventId = isset($_GET['event_id']) ? (int)$_GET['event_id'] : null;
    $classIndex = $_GET['class_index'] ?? 'TF';

    // ── 1. Select event + track info ────────────────────────────────────
    if (!$eventId) {
        $stmt = $pdo->prepare("
            SELECT e.id, e.event_name, e.race_lookup, COUNT(r.id) as run_count
            FROM parity_events e
            LEFT JOIN parity_runs r ON r.race_lookup = e.race_lookup
            GROUP BY e.id
            HAVING run_count > 0
            ORDER BY e.start_date_local DESC
            LIMIT 1
        ");
        $stmt->execute();
        $event = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$event) rsa_jsonResponse(['error' => 'No events with runs found'], 404);
        $eventId = (int)$event['id'];
    }

    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, e.start_date_local, e.end_date_local,
               e.season_year, t.track_name, t.city, t.state,
               t.latitude, t.longitude, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $eventInfo = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$eventInfo) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $raceLookup = $eventInfo['race_lookup'];
    $eventName  = $eventInfo['event_name'];

    // ── 2. Qual Sheet Check (mirrors handleQualSheet exactly) ───────────
    $expandedClasses = parity_expandClassIndex($pdo, $classIndex);
    $ph = implode(',', array_fill(0, count($expandedClasses), '?'));

    // Same WHERE as handleQualSheet: qual rounds only, exclude bad/flagged
    $sql = "
        SELECT r.id, r.driver_name, r.car_number, r.round, r.lane,
               r.ft1320, r.mph1320, r.rt, r.ft60, r.ft660,
               r.run_timestamp_utc, COALESCE(r.dq_flag, 0) AS dq_flag
        FROM parity_runs r
        WHERE r.race_lookup = ?
          AND r.class_index IN ($ph)
          AND r.round LIKE 'Q%'
          AND NOT EXISTS (
              SELECT 1 FROM parity_run_flags f
              WHERE f.run_id = r.id AND f.flag_type IN ('bad','exclude')
          )
        ORDER BY r.run_timestamp_utc ASC
    ";
    $params = array_merge([$raceLookup], $expandedClasses);
    $stmtQ = $pdo->prepare($sql);
    $stmtQ->execute($params);
    $allQualRuns = $stmtQ->fetchAll(PDO::FETCH_ASSOC);

    // Cast numerics
    foreach ($allQualRuns as &$qr) {
        $qr['id'] = (int)$qr['id'];
        $qr['dq_flag'] = (int)$qr['dq_flag'];
        foreach (['ft1320','mph1320','rt','ft60','ft660'] as $f) {
            if ($qr[$f] !== null) $qr[$f] = (float)$qr[$f];
        }
    }
    unset($qr);

    // dq_flag distribution
    $dqNullCount  = 0; // pre-COALESCE nulls — count raw
    $dqTrueCount  = 0;
    $dqFalseCount = 0;
    $rawDqStmt = $pdo->prepare("
        SELECT dq_flag, COUNT(*) as cnt
        FROM parity_runs
        WHERE race_lookup = ? AND class_index IN ($ph) AND round LIKE 'Q%'
        GROUP BY dq_flag
    ");
    $rawDqStmt->execute($params);
    foreach ($rawDqStmt->fetchAll(PDO::FETCH_ASSOC) as $dqRow) {
        if ($dqRow['dq_flag'] === null)   $dqNullCount  = (int)$dqRow['cnt'];
        elseif ((int)$dqRow['dq_flag'] === 1) $dqTrueCount  = (int)$dqRow['cnt'];
        else                                  $dqFalseCount = (int)$dqRow['cnt'];
    }

    // Group by driver — same logic as handleQualSheet
    $byDriver = [];
    foreach ($allQualRuns as $r) {
        $driver = $r['driver_name'] ?? '(unknown)';
        if (!isset($byDriver[$driver])) {
            $byDriver[$driver] = [
                'driver' => $driver,
                'car_number' => $r['car_number'],
                'qual_runs' => [],
                'all_dq' => true,
                'total_runs' => 0,
            ];
        }
        $byDriver[$driver]['total_runs']++;
        if ($r['dq_flag'] == 1) continue;
        $byDriver[$driver]['all_dq'] = false;
        if ($r['ft1320'] === null || $r['ft1320'] <= 0) continue;
        $byDriver[$driver]['qual_runs'][] = $r;
    }

    // Best run per driver with NHRA tiebreakers (ET asc, MPH desc, ts asc)
    $validDrivers = [];
    $invalidDrivers = [];
    foreach ($byDriver as $dd) {
        if (count($dd['qual_runs']) === 0) {
            $invalidDrivers[] = [
                'driver' => $dd['driver'],
                'best_et' => null, 'best_mph' => null,
                'best_timestamp' => null,
                'run_count' => $dd['total_runs'],
                'is_valid' => false,
            ];
            continue;
        }
        usort($dd['qual_runs'], function ($a, $b) {
            $c = $a['ft1320'] <=> $b['ft1320'];
            if ($c !== 0) return $c;
            $c = ($b['mph1320'] ?? 0) <=> ($a['mph1320'] ?? 0);
            if ($c !== 0) return $c;
            return ($a['run_timestamp_utc'] ?? '') <=> ($b['run_timestamp_utc'] ?? '');
        });
        $best = $dd['qual_runs'][0];
        $validDrivers[] = [
            'driver' => $dd['driver'],
            'best_et' => $best['ft1320'],
            'best_mph' => $best['mph1320'],
            'best_timestamp' => $best['run_timestamp_utc'],
            'run_count' => $dd['total_runs'],
            'is_valid' => true,
        ];
    }

    // Sort valid drivers by NHRA tiebreakers
    usort($validDrivers, function ($a, $b) {
        $c = ($a['best_et'] ?? 999) <=> ($b['best_et'] ?? 999);
        if ($c !== 0) return $c;
        $c = ($b['best_mph'] ?? 0) <=> ($a['best_mph'] ?? 0);
        if ($c !== 0) return $c;
        return ($a['best_timestamp'] ?? '') <=> ($b['best_timestamp'] ?? '');
    });

    // Build final sheet: valid first, invalid at bottom
    $sheet = [];
    $pos = 1;
    foreach ($validDrivers as $row) { $row['qual_pos'] = $pos++; $sheet[] = $row; }
    foreach ($invalidDrivers as $row) { $row['qual_pos'] = null; $sheet[] = $row; }

    // ── Assertions ──────────────────────────────────────────────────────
    $distinctRounds = array_values(array_unique(array_column($allQualRuns, 'round')));
    $onlyQualRounds = empty(array_filter($distinctRounds, fn($r) => !preg_match('/^Q\d+$/i', $r)));

    // Ordering: valid driver rows must be ET ascending
    $orderingOk = true;
    $prevET = null;
    foreach ($validDrivers as $vd) {
        if ($vd['best_et'] !== null) {
            if ($prevET !== null && $vd['best_et'] < $prevET) {
                $orderingOk = false;
                break;
            }
            $prevET = $vd['best_et'];
        }
    }

    // DQ/invalid drivers at bottom
    $dqAtBottomOk = true;
    $seenInvalid = false;
    foreach ($sheet as $row) {
        if (!$row['is_valid']) $seenInvalid = true;
        elseif ($seenInvalid) { $dqAtBottomOk = false; break; }
    }

    // Invalid drivers should have no best_mph
    $dqMphBlankOk = true;
    foreach ($invalidDrivers as $row) {
        if ($row['best_mph'] !== null && $row['best_mph'] > 0) {
            $dqMphBlankOk = false;
            break;
        }
    }

    // ── 3. Driver History Check ─────────────────────────────────────────
    // Pick top qualifier (first valid driver from sheet)
    $testDriver = null;
    foreach ($sheet as $row) {
        if ($row['is_valid']) { $testDriver = $row['driver']; break; }
    }

    $driverHistoryCheck = null;
    if ($testDriver) {
        $stmt = $pdo->prepare("
            SELECT
                r.id, r.race_lookup, r.run_timestamp_utc, r.class_index,
                r.round, r.lane,
                r.ft1320 AS et, r.mph1320 AS mph,
                COALESCE(r.dq_flag, 0) AS dq_flag,
                w.temp_f, w.rh_pct, w.pressure_inhg
            FROM parity_runs r
            LEFT JOIN parity_weather_canonical w
                ON w.timestamp_utc = (
                    SELECT wc.timestamp_utc FROM parity_weather_canonical wc
                    WHERE ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) <= 1800
                    ORDER BY ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) ASC
                    LIMIT 1
                )
            WHERE r.driver_name = ? AND r.race_lookup = ?
            ORDER BY r.run_timestamp_utc ASC
        ");
        $stmt->execute([$testDriver, $raceLookup]);
        $driverRuns = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($driverRuns as &$dr) {
            $dr['dq_flag'] = (int)$dr['dq_flag'];
            foreach (['et','mph','temp_f','rh_pct','pressure_inhg'] as $f) {
                if ($dr[$f] !== null) $dr[$f] = (float)$dr[$f];
            }
        }
        unset($dr);

        $runCount = count($driverRuns);
        $weatherLinkedCount = count(array_filter($driverRuns, fn($r) => $r['temp_f'] !== null));
        $coveragePct = $runCount > 0 ? round(100 * $weatherLinkedCount / $runCount, 1) : 0;

        $sessionCounts = [
            'qual' => count(array_filter($driverRuns, fn($r) => preg_match('/^Q\d+$/i', $r['round']))),
            'elim' => count(array_filter($driverRuns, fn($r) => preg_match('/^(E\d+|R\d+|SF|F)$/i', $r['round']))),
        ];

        $driverHistoryCheck = [
            'driver' => $testDriver,
            'totalRuns' => $runCount,
            'weatherLinkedCount' => $weatherLinkedCount,
            'coveragePct' => $coveragePct,
            'sessionCounts' => $sessionCounts,
            'sampleRuns' => array_slice($driverRuns, 0, 10),
        ];
    }

    // ── 4. Event-level weather coverage ─────────────────────────────────
    $startLocal = $eventInfo['start_date_local'];
    $endLocal   = $eventInfo['end_date_local'] ?: $startLocal;
    $tz         = $eventInfo['timezone_iana'] ?? 'America/New_York';
    $trackLat   = $eventInfo['latitude'];
    $trackLon   = $eventInfo['longitude'];

    // Count canonical weather points in event window
    try {
        $tzObj = new DateTimeZone($tz);
        $sUtc = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        $eUtc = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
            ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    } catch (Exception $ex) {
        $sUtc = "$startLocal 00:00:00";
        $eUtc = "$endLocal 23:59:59";
    }

    $wcStmt = $pdo->prepare("
        SELECT timestamp_utc FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN ? AND ?
        ORDER BY timestamp_utc ASC
    ");
    $wcStmt->execute([$sUtc, $eUtc]);
    $canonicalTimestamps = $wcStmt->fetchAll(PDO::FETCH_COLUMN);
    $canonicalCount = count($canonicalTimestamps);

    // Largest gap between consecutive canonical timestamps
    $largestGapMinutes = null;
    if ($canonicalCount >= 2) {
        $maxGap = 0;
        for ($i = 1; $i < $canonicalCount; $i++) {
            $prev = strtotime($canonicalTimestamps[$i - 1]);
            $curr = strtotime($canonicalTimestamps[$i]);
            $gap  = $curr - $prev;
            if ($gap > $maxGap) $maxGap = $gap;
        }
        $largestGapMinutes = round($maxGap / 60, 1);
    }

    // Count total runs at this event (all classes) for overall coverage
    $totalEventRuns = (int)$pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?")
        ->execute([$raceLookup]) ? 0 : 0;
    $trStmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
    $trStmt->execute([$raceLookup]);
    $totalEventRuns = (int)$trStmt->fetchColumn();

    // How many of those runs have weather within 30 min?
    $wlStmt = $pdo->prepare("
        SELECT COUNT(*) FROM parity_runs r
        WHERE r.race_lookup = ?
          AND EXISTS (
              SELECT 1 FROM parity_weather_canonical wc
              WHERE ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) <= 1800
          )
    ");
    $wlStmt->execute([$raceLookup]);
    $weatherLinkedRuns = (int)$wlStmt->fetchColumn();
    $eventCoveragePct = $totalEventRuns > 0 ? round(100 * $weatherLinkedRuns / $totalEventRuns, 1) : 0;

    // Recommended action
    $recommendedActions = [];
    $trackCoordsMissing = ($trackLat === null || $trackLon === null);
    if ($trackCoordsMissing) {
        $recommendedActions[] = 'Set track coordinates in Weather Health panel';
    }
    if ($canonicalCount === 0) {
        $recommendedActions[] = 'Run Weather Health → Backfill + Rebuild for this event';
    } elseif ($eventCoveragePct < 80) {
        $recommendedActions[] = "Weather coverage is {$eventCoveragePct}% — consider re-running backfill or importing station CSV";
    }

    $weatherCoverage = [
        'eventWindow' => ['utcStart' => $sUtc, 'utcEnd' => $eUtc],
        'canonicalPointCount' => $canonicalCount,
        'largestGapMinutes' => $largestGapMinutes,
        'totalEventRuns' => $totalEventRuns,
        'weatherLinkedRuns' => $weatherLinkedRuns,
        'eventCoveragePct' => $eventCoveragePct,
        'trackCoordsMissing' => $trackCoordsMissing,
        'recommendedActions' => $recommendedActions,
    ];

    // ── 5. Return results ───────────────────────────────────────────────
    rsa_jsonResponse([
        'ok' => true,
        'eventId' => $eventId,
        'eventName' => $eventName,
        'raceLookup' => $raceLookup,
        'classIndex' => $classIndex,
        'expandedClasses' => $expandedClasses,
        'event' => [
            'track' => $eventInfo['track_name'],
            'city' => $eventInfo['city'],
            'state' => $eventInfo['state'],
            'dates' => $startLocal . ' → ' . $endLocal,
            'season' => $eventInfo['season_year'],
        ],
        'qualSheetCheck' => [
            'totalQualRuns' => count($allQualRuns),
            'qualifierCount' => count($validDrivers),
            'totalDrivers' => count($sheet),
            'invalidDrivers' => count($invalidDrivers),
            'sampleSheet' => array_slice($sheet, 0, 20),
            'dqFlagDistribution' => [
                'nullCount' => $dqNullCount,
                'trueCount' => $dqTrueCount,
                'falseCount' => $dqFalseCount,
            ],
            'assertions' => [
                'onlyQualRounds' => $onlyQualRounds,
                'roundsFound' => $distinctRounds,
                'orderingOk' => $orderingOk,
                'dqAtBottomOk' => $dqAtBottomOk,
                'dqMphBlankOk' => $dqMphBlankOk,
            ],
        ],
        'driverHistoryCheck' => $driverHistoryCheck,
        'weatherCoverage' => $weatherCoverage,
    ]);
}

// ============================================================================
// GET ?action=trackCoordCoverage&yearFrom=2021&yearTo=2024
// Admin report: tracks used by events in year range, with coord + weather gaps
// ============================================================================
function handleTrackCoordCoverage(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $yearFrom = (int)($_GET['yearFrom'] ?? 2021);
    $yearTo   = (int)($_GET['yearTo']   ?? 2024);

    $stmt = $pdo->prepare("
        SELECT
            t.id AS track_id,
            t.track_name,
            t.timezone_iana,
            t.latitude,
            t.longitude,
            t.city,
            t.state,
            COUNT(DISTINCT e.id) AS event_count,
            GROUP_CONCAT(DISTINCT e.season_year ORDER BY e.season_year SEPARATOR ',') AS seasons,
            SUM(
                CASE WHEN NOT EXISTS (
                    SELECT 1 FROM parity_weather_canonical wc
                    WHERE ABS(TIMESTAMPDIFF(SECOND,
                        (SELECT MIN(r2.run_timestamp_utc) FROM parity_runs r2 WHERE r2.race_lookup = e.race_lookup),
                        wc.timestamp_utc)) <= 1800
                ) THEN 1 ELSE 0 END
            ) AS events_zero_weather
        FROM parity_tracks t
        JOIN parity_events e ON e.track_id = t.id
        WHERE e.season_year BETWEEN ? AND ?
        GROUP BY t.id
        ORDER BY t.latitude IS NULL DESC, event_count DESC, t.track_name ASC
    ");
    $stmt->execute([$yearFrom, $yearTo]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast types
    foreach ($rows as &$r) {
        $r['track_id'] = (int)$r['track_id'];
        $r['event_count'] = (int)$r['event_count'];
        $r['events_zero_weather'] = (int)$r['events_zero_weather'];
        $r['latitude'] = $r['latitude'] !== null ? (float)$r['latitude'] : null;
        $r['longitude'] = $r['longitude'] !== null ? (float)$r['longitude'] : null;
        $r['coordsMissing'] = ($r['latitude'] === null || $r['longitude'] === null);
    }
    unset($r);

    $totalTracks = count($rows);
    $missingCoords = count(array_filter($rows, fn($r) => $r['coordsMissing']));

    rsa_jsonResponse([
        'ok' => true,
        'yearRange' => [$yearFrom, $yearTo],
        'totalTracks' => $totalTracks,
        'missingCoords' => $missingCoords,
        'tracks' => $rows,
    ]);
}

// ============================================================================
// POST ?action=bulkUpdateTrackCoords
// Body: { tracks: [{ trackId, latitude, longitude }, ...] }
// ============================================================================
function handleBulkUpdateTrackCoords(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $tracks = $input['tracks'] ?? [];

    if (!is_array($tracks) || empty($tracks)) {
        rsa_jsonResponse(['error' => 'tracks array is required and must not be empty'], 400);
    }
    if (count($tracks) > 100) {
        rsa_jsonResponse(['error' => 'Maximum 100 tracks per batch'], 400);
    }

    $stmt = $pdo->prepare("UPDATE parity_tracks SET latitude = ?, longitude = ? WHERE id = ?");
    $updated = 0;
    $errors = [];

    foreach ($tracks as $i => $t) {
        $trackId = (int)($t['trackId'] ?? 0);
        $lat = isset($t['latitude']) ? (float)$t['latitude'] : null;
        $lon = isset($t['longitude']) ? (float)$t['longitude'] : null;

        if ($trackId <= 0) { $errors[] = "Item $i: trackId required"; continue; }
        if ($lat === null || $lon === null) { $errors[] = "Item $i (track $trackId): lat/lon required"; continue; }
        if ($lat < -90 || $lat > 90) { $errors[] = "Item $i (track $trackId): lat out of range"; continue; }
        if ($lon < -180 || $lon > 180) { $errors[] = "Item $i (track $trackId): lon out of range"; continue; }

        $stmt->execute([$lat, $lon, $trackId]);
        if ($stmt->rowCount() > 0) $updated++;
    }

    rsa_jsonResponse([
        'ok' => true,
        'submitted' => count($tracks),
        'updated' => $updated,
        'errors' => $errors,
    ]);
}

// ============================================================================
// POST ?action=batchWeatherBackfill
// Body: { yearFrom, yearTo, maxCoveragePct?, dryRun? }
// Iterates events in year range, runs weatherHealthBackfill + rebuild for each.
// ============================================================================
function handleBatchWeatherBackfill(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    set_time_limit(600);

    $input = rsa_getJsonInput();
    $yearFrom = (int)($input['yearFrom'] ?? 0);
    $yearTo   = (int)($input['yearTo']   ?? 0);
    $maxCoveragePct = (float)($input['maxCoveragePct'] ?? 80);
    $dryRun = (bool)($input['dryRun'] ?? false);

    if ($yearFrom < 2010 || $yearTo > 2030 || $yearFrom > $yearTo) {
        rsa_jsonResponse(['error' => 'Invalid year range'], 400);
    }

    // Load events in range with track info + current weather coverage
    $stmt = $pdo->prepare("
        SELECT e.id AS event_id, e.event_name, e.race_lookup,
               e.start_date_local, e.end_date_local, e.season_year,
               t.id AS track_id, t.track_name, t.latitude, t.longitude, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.season_year BETWEEN ? AND ?
        ORDER BY e.start_date_local ASC
    ");
    $stmt->execute([$yearFrom, $yearTo]);
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // For each event, compute current coverage
    $stmtRunCount = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
    $stmtCoveredCount = $pdo->prepare("
        SELECT COUNT(*) FROM parity_runs r
        WHERE r.race_lookup = ?
          AND EXISTS (
              SELECT 1 FROM parity_weather_canonical wc
              WHERE ABS(TIMESTAMPDIFF(SECOND, r.run_timestamp_utc, wc.timestamp_utc)) <= 1800
          )
    ");

    $results = [];
    $totals = ['processed' => 0, 'backfilled' => 0, 'rebuilt' => 0,
               'skipped_high_coverage' => 0, 'skipped_missing_coords' => 0,
               'skipped_no_runs' => 0, 'errors' => 0];

    require_once __DIR__ . '/parity_weather_provider.php';

    foreach ($events as $ev) {
        $eventId = (int)$ev['event_id'];
        $lat = $ev['latitude'] !== null ? (float)$ev['latitude'] : null;
        $lon = $ev['longitude'] !== null ? (float)$ev['longitude'] : null;
        $tz = $ev['timezone_iana'];

        // Check run count
        $stmtRunCount->execute([$ev['race_lookup']]);
        $runCount = (int)$stmtRunCount->fetchColumn();

        if ($runCount === 0) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'skipped', 'reason' => 'no runs'];
            $totals['skipped_no_runs']++;
            continue;
        }

        // Check current coverage
        $stmtCoveredCount->execute([$ev['race_lookup']]);
        $coveredCount = (int)$stmtCoveredCount->fetchColumn();
        $currentCoverage = round(100 * $coveredCount / $runCount, 1);

        if ($currentCoverage >= $maxCoveragePct) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'skipped', 'reason' => "coverage already {$currentCoverage}%"];
            $totals['skipped_high_coverage']++;
            continue;
        }

        // Check coords
        if ($lat === null || $lon === null || ($lat === 0.0 && $lon === 0.0)) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'skipped', 'reason' => 'missing track coordinates',
                          'track' => $ev['track_name']];
            $totals['skipped_missing_coords']++;
            continue;
        }

        $totals['processed']++;

        if ($dryRun) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'would_backfill', 'currentCoverage' => $currentCoverage,
                          'runs' => $runCount];
            continue;
        }

        // Run backfill from Open-Meteo
        $startLocal = $ev['start_date_local'];
        $endLocal = $ev['end_date_local'];
        try {
            $tzObj = new DateTimeZone($tz);
            $startUtcStr = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
            $endUtcStr = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
            $startUtcDb = (new DateTimeImmutable("$startLocal 00:00:00", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
            $endUtcDb = (new DateTimeImmutable("$endLocal 23:59:59", $tzObj))
                ->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'error', 'error' => 'tz error: ' . $e->getMessage()];
            $totals['errors']++;
            continue;
        }

        try {
            $samples = fetchOpenMeteoWeather($lat, $lon, $startUtcStr, $endUtcStr);
        } catch (Exception $e) {
            $results[] = ['eventId' => $eventId, 'event' => $ev['event_name'],
                          'status' => 'error', 'error' => 'fetch failed: ' . $e->getMessage()];
            $totals['errors']++;
            continue;
        }

        // Insert samples
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_weather_samples
                (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open_meteo_backfill')
        ");
        $inserted = 0;
        $deduped = 0;
        foreach ($samples as $sample) {
            $tsUtc = $sample['timestampUtc'];
            $tempF = $sample['tempF'];
            $humPct = $sample['humidityPct'];
            $baroInHg = $sample['baroInHg'];
            $tempC = ($tempF - 32) * 5.0 / 9.0;
            $pressureMbar = $baroInHg / 0.02953;

            try {
                $utcDt = new DateTimeImmutable($tsUtc, new DateTimeZone('UTC'));
                $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
                $tsUtcFmt = $utcDt->format('Y-m-d H:i:s');
                $localStr = $localDt->format('Y-m-d H:i:s');
            } catch (Exception $e) { continue; }

            try {
                $stmtInsert->execute([
                    $tsUtcFmt, $eventId, (int)$ev['track_id'], $localStr,
                    round($tempC, 4), round($tempF, 4), round($humPct, 2), round($pressureMbar, 4),
                ]);
                $inserted++;
            } catch (PDOException $e) {
                if (strpos($e->getMessage(), 'Duplicate') !== false) $deduped++;
            }
        }
        $totals['backfilled']++;

        // Rebuild canonical
        $rebuildResult = weatherRebuildCanonicalRange($pdo, $startUtcDb, $endUtcDb, 30);
        $totals['rebuilt']++;

        $results[] = [
            'eventId' => $eventId,
            'event' => $ev['event_name'],
            'status' => 'ok',
            'fetched' => count($samples),
            'inserted' => $inserted,
            'deduped' => $deduped,
            'canonicalBuckets' => $rebuildResult['bucketsProcessed'],
            'previousCoverage' => $currentCoverage,
        ];

        // Throttle between events to avoid hammering Open-Meteo
        usleep(300000); // 300ms
    }

    rsa_jsonResponse([
        'ok' => true,
        'dryRun' => $dryRun,
        'yearRange' => [$yearFrom, $yearTo],
        'maxCoveragePct' => $maxCoveragePct,
        'totals' => $totals,
        'events' => $results,
    ]);
}

// ============================================================================
// POST ?action=backfillRunUtcFromLocal
// Body: { "eventId": N } or { "yearFrom": 2024, "yearTo": 2025 } or { "all": true }
//
// Fixes historical runs where run_timestamp_utc actually contains local time.
// For each run:
//   1. If run_time_local is NULL, copy current run_timestamp_utc → run_time_local
//      (since it was really local time all along).
//   2. Recompute run_timestamp_utc = parity_localToUtc(run_time_local, track_tz).
//
// Admin-only. Returns counts of updated, skipped, errors.
// ============================================================================

function handleBackfillRunUtcFromLocal(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();

    $eventId = isset($input['eventId']) ? (int)$input['eventId'] : null;
    $yearFrom = isset($input['yearFrom']) ? (int)$input['yearFrom'] : null;
    $yearTo = isset($input['yearTo']) ? (int)$input['yearTo'] : null;
    $all = (bool)($input['all'] ?? false);
    $dryRun = (bool)($input['dryRun'] ?? false);

    if (!$eventId && !$yearFrom && !$all) {
        rsa_jsonResponse(['error' => 'Provide eventId, yearFrom/yearTo, or all=true'], 400);
    }

    // Build list of events with their track timezone
    $where = '';
    $params = [];
    if ($eventId) {
        $where = 'WHERE e.id = ?';
        $params = [$eventId];
    } elseif ($yearFrom) {
        $yTo = $yearTo ?? $yearFrom;
        $where = 'WHERE YEAR(e.start_date_local) BETWEEN ? AND ?';
        $params = [$yearFrom, $yTo];
    }

    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        $where
        ORDER BY e.start_date_local ASC
    ");
    $evStmt->execute($params);
    $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($events)) {
        rsa_jsonResponse(['ok' => true, 'message' => 'No events found for criteria', 'updated' => 0]);
        return;
    }

    $stmtFetchRuns = $pdo->prepare("
        SELECT id, run_timestamp_utc, run_time_local
        FROM parity_runs
        WHERE race_lookup = ? AND run_timestamp_utc IS NOT NULL
    ");

    $stmtUpdate = $pdo->prepare("
        UPDATE parity_runs SET run_time_local = ?, run_timestamp_utc = ? WHERE id = ?
    ");

    $totals = ['events' => 0, 'runs_scanned' => 0, 'updated' => 0, 'skipped_no_ts' => 0, 'errors' => 0];
    $eventResults = [];

    foreach ($events as $ev) {
        $tz = $ev['timezone_iana'] ?? 'America/New_York';
        $stmtFetchRuns->execute([$ev['race_lookup']]);
        $runs = $stmtFetchRuns->fetchAll(PDO::FETCH_ASSOC);

        $evUpdated = 0;
        $evSkipped = 0;
        $evErrors = 0;
        $sampleBefore = null;
        $sampleAfter = null;

        foreach ($runs as $run) {
            $totals['runs_scanned']++;

            // If run_time_local is already populated, use it as the source of truth.
            // Otherwise, the current run_timestamp_utc IS the local time (historical bug).
            $localTime = $run['run_time_local'] ?? $run['run_timestamp_utc'];

            if ($localTime === null) {
                $evSkipped++;
                $totals['skipped_no_ts']++;
                continue;
            }

            $utcTime = parity_localToUtc($localTime, $tz);
            if ($utcTime === null) {
                $evErrors++;
                $totals['errors']++;
                continue;
            }

            // Capture a sample for diagnostics
            if ($sampleBefore === null) {
                $sampleBefore = $run['run_timestamp_utc'];
                $sampleAfter = $utcTime;
            }

            if (!$dryRun) {
                $stmtUpdate->execute([$localTime, $utcTime, $run['id']]);
            }
            $evUpdated++;
        }

        $totals['events']++;
        $totals['updated'] += $evUpdated;

        $eventResults[] = [
            'eventId' => (int)$ev['id'],
            'event' => $ev['event_name'],
            'tz' => $tz,
            'runsScanned' => count($runs),
            'updated' => $evUpdated,
            'skipped' => $evSkipped,
            'errors' => $evErrors,
            'sampleBefore' => $sampleBefore,
            'sampleAfter' => $sampleAfter,
        ];
    }

    rsa_jsonResponse([
        'ok' => true,
        'dryRun' => $dryRun,
        'totals' => $totals,
        'events' => $eventResults,
    ]);
}

// ============================================================================
// GET ?action=listOrphanRuns
// Returns runs that lack a valid event→track→timezone path, which means
// they can't have correct run_timestamp_utc and are excluded from
// weather confidence calculations.
// ============================================================================
function handleListOrphanRuns(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $limit = min((int)($_GET['limit'] ?? 200), 1000);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    // Orphan = no matching event with a track that has timezone_iana,
    // OR run_time_local IS NULL despite having run_timestamp_utc.
    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local,
               r.class_index, r.round, r.driver_name,
               CASE
                   WHEN e.id IS NULL THEN 'no_event'
                   WHEN t.id IS NULL THEN 'no_track'
                   WHEN t.timezone_iana IS NULL OR t.timezone_iana = '' THEN 'no_timezone'
                   WHEN r.run_time_local IS NULL AND r.run_timestamp_utc IS NOT NULL THEN 'missing_local'
                   ELSE 'unknown'
               END AS orphan_reason
        FROM parity_runs r
        LEFT JOIN parity_events e ON e.race_lookup = r.race_lookup
        LEFT JOIN parity_tracks t ON t.id = e.track_id
        WHERE (
            e.id IS NULL
            OR t.id IS NULL
            OR t.timezone_iana IS NULL OR t.timezone_iana = ''
            OR (r.run_time_local IS NULL AND r.run_timestamp_utc IS NOT NULL)
        )
        ORDER BY r.id DESC
        LIMIT ? OFFSET ?
    ");
    $stmt->execute([$limit, $offset]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count total orphans
    $countStmt = $pdo->query("
        SELECT COUNT(*) FROM parity_runs r
        LEFT JOIN parity_events e ON e.race_lookup = r.race_lookup
        LEFT JOIN parity_tracks t ON t.id = e.track_id
        WHERE (
            e.id IS NULL
            OR t.id IS NULL
            OR t.timezone_iana IS NULL OR t.timezone_iana = ''
            OR (r.run_time_local IS NULL AND r.run_timestamp_utc IS NOT NULL)
        )
    ");
    $total = (int)$countStmt->fetchColumn();

    rsa_jsonResponse([
        'total' => $total,
        'limit' => $limit,
        'offset' => $offset,
        'runs' => $rows,
    ]);
}

// ============================================================================
// GET ?action=timeSmokeTest
// Automated verification: picks events with known weather and reports
// avg/max offset minutes. Fails loudly if thresholds exceeded.
// ============================================================================
function handleTimeSmokeTest(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $windowMinutes = 30;

    // Pick events that have both runs with timestamps and canonical weather
    $evStmt = $pdo->query("
        SELECT e.id, e.event_name, e.race_lookup, t.timezone_iana,
               (SELECT COUNT(*) FROM parity_runs r WHERE r.race_lookup = e.race_lookup AND r.run_timestamp_utc IS NOT NULL) AS run_count,
               (SELECT COUNT(*) FROM parity_weather_canonical wc
                JOIN parity_runs r2 ON r2.race_lookup = e.race_lookup AND r2.run_timestamp_utc IS NOT NULL
                WHERE ABS(TIMESTAMPDIFF(MINUTE, wc.timestamp_utc, r2.run_timestamp_utc)) <= $windowMinutes
                LIMIT 1) AS has_weather_match
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE t.timezone_iana IS NOT NULL AND t.timezone_iana != ''
        HAVING run_count > 50
        ORDER BY e.start_date_local DESC
        LIMIT 5
    ");
    $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);

    $stmtW = $pdo->prepare("
        SELECT ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) AS offset_sec
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC
        LIMIT 1
    ");

    $results = [];
    $overallPass = true;

    foreach ($events as $ev) {
        $tz = $ev['timezone_iana'];

        // Get a sample of runs with timestamps
        $runStmt = $pdo->prepare("
            SELECT r.id, r.run_timestamp_utc, r.run_time_local
            FROM parity_runs r
            WHERE r.race_lookup = ? AND r.run_timestamp_utc IS NOT NULL
            LIMIT 200
        ");
        $runStmt->execute([$ev['race_lookup']]);
        $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

        $offsets = [];
        $matched = 0;
        $samples = [];

        foreach ($runs as $run) {
            $ts = $run['run_timestamp_utc'];
            $stmtW->execute([$ts, $ts, $windowMinutes, $ts, $windowMinutes, $ts]);
            $w = $stmtW->fetch(PDO::FETCH_ASSOC);
            if ($w) {
                $offsetMin = round($w['offset_sec'] / 60.0, 1);
                $offsets[] = $offsetMin;
                $matched++;
            }

            // Collect samples for diagnostics — more when thresholds may be exceeded
            if (count($samples) < 10) {
                $derivedUtc = ($run['run_time_local'] !== null) ? parity_localToUtc($run['run_time_local'], $tz) : null;
                $samples[] = [
                    'run_id' => (int)$run['id'],
                    'run_time_local' => $run['run_time_local'],
                    'run_timestamp_utc' => $run['run_timestamp_utc'],
                    'derived_utc_from_local' => $derivedUtc,
                    'utc_matches' => ($derivedUtc === $run['run_timestamp_utc']),
                ];
            }
        }

        $avgOffset = !empty($offsets) ? round(array_sum($offsets) / count($offsets), 1) : null;
        $maxOffset = !empty($offsets) ? round(max($offsets), 1) : null;
        $pctMatched = count($runs) > 0 ? round($matched / count($runs) * 100, 1) : null;

        $pass = ($avgOffset === null || $avgOffset <= 20) && ($maxOffset === null || $maxOffset <= 60);
        if (!$pass) $overallPass = false;

        // Trim samples: keep all 10 for failing events, only 3 for passing
        if ($pass && count($samples) > 3) {
            $samples = array_slice($samples, 0, 3);
        }

        $results[] = [
            'eventId' => (int)$ev['id'],
            'event' => $ev['event_name'],
            'tz' => $tz,
            'runsChecked' => count($runs),
            'matched' => $matched,
            'pctMatched' => $pctMatched,
            'avgOffsetMin' => $avgOffset,
            'maxOffsetMin' => $maxOffset,
            'pass' => $pass,
            'samples' => $samples,
        ];
    }

    rsa_jsonResponse([
        'ok' => $overallPass,
        'testedEvents' => count($results),
        'allPass' => $overallPass,
        'thresholds' => ['avgOffsetMaxMin' => 20, 'maxOffsetMaxMin' => 60],
        'events' => $results,
    ]);
}

// ============================================================================
// Time/Weather Diagnostics Sample — admin-only
// Returns per-run rows with matched weather timestamp and offset for a given
// event + class. Powers the "Time/Weather Diagnostics" admin panel.
// ============================================================================
function handleTimeDiagnosticsSample(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $eventId = (int)($_GET['eventId'] ?? 0);
    $classIndex = trim($_GET['classIndex'] ?? '');
    $limit = min((int)($_GET['limit'] ?? 10), 100);

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($classIndex === '') rsa_jsonResponse(['error' => 'classIndex is required'], 400);

    // Load event + track timezone
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $raceLookup = $event['race_lookup'];
    $trackTz = $event['timezone_iana'] ?? 'America/New_York';

    $classIndices = parity_expandClassIndex($pdo, $classIndex);
    $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));

    // Fetch runs — ordered by local time for natural chronological display
    $params = array_merge([$raceLookup], $classIndices);
    $runStmt = $pdo->prepare("
        SELECT r.id, r.driver_name, r.round, r.class_index,
               r.run_time_local, r.run_timestamp_utc
        FROM parity_runs r
        WHERE r.race_lookup = ? AND r.class_index IN ($classPlaceholders)
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.run_timestamp_utc IS NOT NULL
        ORDER BY COALESCE(r.run_time_local, r.run_timestamp_utc) ASC
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Weather lookup — closest canonical observation within 30 min
    $weatherWindow = 30;
    $stmtW = $pdo->prepare("
        SELECT wc.timestamp_utc,
               wc.temp_f, wc.rh_pct, wc.pressure_inhg,
               ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) AS offset_seconds
        FROM parity_weather_canonical wc
        WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
    ");

    $totalRuns = count($runs);
    $matchedRuns = 0;
    $allOffsets = [];
    $sampleRows = [];

    foreach ($runs as $run) {
        $ts = $run['run_timestamp_utc'];
        $stmtW->execute([$ts, $ts, $weatherWindow, $ts, $weatherWindow, $ts]);
        $wx = $stmtW->fetch(PDO::FETCH_ASSOC);

        $matched = $wx && $wx['temp_f'] !== null;
        if ($matched) {
            $matchedRuns++;
            $offsetMin = round($wx['offset_seconds'] / 60.0, 1);
            $allOffsets[] = $offsetMin;
        }

        // Always collect up to $limit sample rows
        if (count($sampleRows) < $limit) {
            $sampleRows[] = [
                'run_id' => (int)$run['id'],
                'driver' => $run['driver_name'],
                'round' => $run['round'],
                'class_index' => $run['class_index'],
                'run_time_local' => $run['run_time_local'],
                'run_timestamp_utc' => $run['run_timestamp_utc'],
                'matched_weather_utc' => $matched ? $wx['timestamp_utc'] : null,
                'offset_minutes' => $matched ? round($wx['offset_seconds'] / 60.0, 1) : null,
                'wx_temp_f' => $matched ? (float)$wx['temp_f'] : null,
                'wx_rh_pct' => $matched ? (float)$wx['rh_pct'] : null,
                'wx_press_inhg' => $matched ? (float)$wx['pressure_inhg'] : null,
            ];
        }
    }

    $pctMatched = $totalRuns > 0 ? round(100 * $matchedRuns / $totalRuns, 1) : null;
    $avgOffsetMin = count($allOffsets) > 0 ? round(array_sum($allOffsets) / count($allOffsets), 1) : null;
    $maxOffsetMin = count($allOffsets) > 0 ? round(max($allOffsets), 1) : null;

    rsa_jsonResponse([
        'eventId' => $eventId,
        'eventName' => $event['event_name'],
        'classIndex' => $classIndex,
        'trackTimezone' => $trackTz,
        'totalRuns' => $totalRuns,
        'matchedRuns' => $matchedRuns,
        'pctMatched' => $pctMatched,
        'avgOffsetMin' => $avgOffsetMin,
        'maxOffsetMin' => $maxOffsetMin,
        'samples' => $sampleRows,
    ]);
}
