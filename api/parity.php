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
    case 'probeOData':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleProbeOData($pdo);
        break;
    case 'purgeEventRuns':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handlePurgeEventRuns($pdo, $auth);
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
    case 'topByTrack':
        if ($method !== 'GET') {
            rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        }
        handleTopByTrack($pdo);
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
    // ── Body Style endpoints ─────────────────────────────────────────────
    case 'listBodyStyles':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListBodyStyles($pdo);
        break;
    case 'upsertBodyStyle':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpsertBodyStyle($pdo, $auth);
        break;
    case 'deleteBodyStyle':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteBodyStyle($pdo, $auth);
        break;
    // ── Driver Body Style endpoints ──────────────────────────────────────
    case 'listDriverBodyStyles':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListDriverBodyStyles($pdo);
        break;
    case 'upsertDriverBodyStyle':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpsertDriverBodyStyle($pdo, $auth);
        break;
    case 'deleteDriverBodyStyle':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteDriverBodyStyle($pdo, $auth);
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
    case 'slopeAnalysis':
        requireAdminRole($auth);
        handleSlopeAnalysis($pdo, $auth);
        break;
    case 'importStationCsv':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleImportStationCsv($pdo, $auth);
        break;
    case 'updateRun':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpdateRun($pdo, $auth);
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
    case 'tempestCurrentWeather':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleTempestCurrentWeather();
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
    case 'incrementalComparison':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleIncrementalComparison($pdo);
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
    case 'refreshEventData':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleRefreshEventData($pdo, $userId, $auth);
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
    case 'eventCategories':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleEventCategories($pdo);
        break;
    // ── Anomaly analysis endpoints ────────────────────────────────────────
    case 'anomalyAnalysis':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleAnomalyAnalysis($pdo);
        break;
    case 'anomalyDetail':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleAnomalyDetail($pdo);
        break;
    // ── Multi-event parity analysis ──────────────────────────────────────
    case 'multiEventParity':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleMultiEventParity($pdo);
        break;
    case 'eventOutlierAnalysis':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleEventOutlierAnalysis($pdo);
        break;
    case 'performancePrediction':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handlePerformancePrediction($pdo);
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

    // Upsert each run: INSERT new rows or merge-update partial rows
    $rowsInserted = 0;
    $rowsUpdated = 0;
    $rowsSkipped = 0;

    foreach ($rows as $raw) {
        $normalized = parity_normalizeRow($raw, $raceLookup);
        $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);

        // The normalizer returns local wall-clock time in 'run_timestamp_utc' (legacy key).
        // We now store it correctly in run_time_local and compute true UTC.
        $localTime = $normalized['run_timestamp_utc']; // This is actually local time
        $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;

        $result = parity_upsertRun($pdo, $normalized, $rowHash, $importId, $raceLookup, $utcTime, $localTime);
        if ($result === 'inserted') $rowsInserted++;
        elseif ($result === 'updated') $rowsUpdated++;
        else $rowsSkipped++;
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
        'rowsUpdated' => $rowsUpdated,
        'rowsSkipped' => $rowsSkipped,
        'rowsDeduped' => $rowsUpdated + $rowsSkipped,
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

    // Optional filters: category (preferred) or classIndex (legacy)
    if (!empty($_GET['category'])) {
        parity_applyCategoryFilter(trim($_GET['category']), $where, $params);
    } elseif (!empty($_GET['classIndex'])) {
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
// GET ?action=probeOData&raceLookup=YYYYMMDD
// Fetch ALL pages from OData (no DB write) and compare vs what's already stored.
// Returns per-round and per-class breakdowns so missing data is immediately visible.
// ============================================================================

function handleProbeOData(PDO $pdo): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup must be YYYYMMDD format'], 400);
    }

    try {
        $result = parity_fetchODataResults($raceLookup);
        $rows = $result['rows'];
    } catch (Exception $e) {
        rsa_jsonResponse(['error' => 'OData fetch failed: ' . $e->getMessage()], 502);
    }

    // Build OData breakdowns
    $odataByRound = [];
    $odataByClass = [];
    $odataByCategory = [];
    foreach ($rows as $raw) {
        $n = parity_normalizeRow($raw, $raceLookup);
        $round = $n['round'] ?? '(none)';
        $class = $n['class_index'] ?? '(none)';
        $cat   = $n['category']    ?? '(none)';
        $odataByRound[$round]    = ($odataByRound[$round]    ?? 0) + 1;
        $odataByClass[$class]    = ($odataByClass[$class]    ?? 0) + 1;
        $odataByCategory[$cat]   = ($odataByCategory[$cat]   ?? 0) + 1;
    }
    ksort($odataByRound);
    ksort($odataByClass);

    // DB breakdowns
    $dbTotal = 0;
    $dbByRound = [];
    $dbByClass = [];

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
    $stmt->execute([$raceLookup]);
    $dbTotal = (int)$stmt->fetchColumn();

    $stmt = $pdo->prepare("SELECT round, COUNT(*) AS cnt FROM parity_runs WHERE race_lookup = ? GROUP BY round ORDER BY round");
    $stmt->execute([$raceLookup]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $dbByRound[$row['round'] ?? '(none)'] = (int)$row['cnt'];
    }

    $stmt = $pdo->prepare("SELECT class_index, COUNT(*) AS cnt FROM parity_runs WHERE race_lookup = ? GROUP BY class_index ORDER BY class_index");
    $stmt->execute([$raceLookup]);
    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        $dbByClass[$row['class_index'] ?? '(none)'] = (int)$row['cnt'];
    }

    // Round comparison (merged)
    $allRounds = array_unique(array_merge(array_keys($odataByRound), array_keys($dbByRound)));
    sort($allRounds);
    $roundComparison = [];
    foreach ($allRounds as $r) {
        $odata = $odataByRound[$r] ?? 0;
        $db    = $dbByRound[$r]    ?? 0;
        $roundComparison[] = ['round' => $r, 'odata' => $odata, 'db' => $db, 'missing' => $odata - $db];
    }

    // Class comparison (merged)
    $allClasses = array_unique(array_merge(array_keys($odataByClass), array_keys($dbByClass)));
    sort($allClasses);
    $classComparison = [];
    foreach ($allClasses as $c) {
        $odata = $odataByClass[$c] ?? 0;
        $db    = $dbByClass[$c]    ?? 0;
        $classComparison[] = ['class' => $c, 'odata' => $odata, 'db' => $db, 'missing' => $odata - $db];
    }

    $odataTotal  = count($rows);
    $totalMissing = $odataTotal - $dbTotal;

    rsa_jsonResponse([
        'raceLookup'      => $raceLookup,
        'odataTotal'      => $odataTotal,
        'dbTotal'         => $dbTotal,
        'totalMissing'    => $totalMissing,
        'roundComparison' => $roundComparison,
        'classComparison' => $classComparison,
        'odataByCategory' => $odataByCategory,
    ]);
}

// ============================================================================
// POST ?action=purgeEventRuns
// Body: { "raceLookup": "YYYYMMDD", "confirm": true }
// Admin only. Deletes ALL parity_runs and parity_run_imports for a race_lookup.
// Use before re-ingesting to get a completely clean slate.
// ============================================================================

function handlePurgeEventRuns(PDO $pdo, array $auth): void {
    requireAdminRole($auth);

    $input = rsa_getJsonInput();
    $raceLookup = trim($input['raceLookup'] ?? '');
    $confirm    = (bool)($input['confirm'] ?? false);

    if (!preg_match('/^\d{8}$/', $raceLookup)) {
        rsa_jsonResponse(['error' => 'raceLookup must be YYYYMMDD format'], 400);
    }

    // Without confirm, return counts only (dry-run)
    if (!$confirm) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
        $stmt->execute([$raceLookup]);
        $runCount = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM parity_run_imports WHERE race_lookup = ?");
        $stmt->execute([$raceLookup]);
        $importCount = (int)$stmt->fetchColumn();

        rsa_jsonResponse([
            'raceLookup'  => $raceLookup,
            'confirm'     => false,
            'runCount'    => $runCount,
            'importCount' => $importCount,
            'message'     => "Dry run: would delete $runCount runs and $importCount import records. Send confirm=true to proceed.",
        ]);
        return;
    }

    // Delete in order (imports first to avoid FK issues if any)
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("DELETE FROM parity_runs WHERE race_lookup = ?");
        $stmt->execute([$raceLookup]);
        $runsDeleted = $stmt->rowCount();

        $stmt = $pdo->prepare("DELETE FROM parity_run_imports WHERE race_lookup = ?");
        $stmt->execute([$raceLookup]);
        $importsDeleted = $stmt->rowCount();

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        rsa_jsonResponse(['error' => 'Purge failed: ' . $e->getMessage()], 500);
    }

    rsa_jsonResponse([
        'raceLookup'    => $raceLookup,
        'runsDeleted'   => $runsDeleted,
        'importsDeleted'=> $importsDeleted,
        'message'       => "Purged $runsDeleted runs and $importsDeleted import records. Re-ingest to repopulate.",
    ]);
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
    $allowedMetrics = ['mph1320', 'ft1320', 'corrected_ft1320', 'ft60', 'ft330', 'ft660', 'mph660', 'ft1000', 'mph1000'];
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

    // ── Standard metrics (ft*, mph*) ──
    $agg = (strpos($metric, 'mph') === 0) ? 'MAX' : 'MIN';

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
// GET ?action=topByTrack&classIndex=TF&metric=ft1320&startRaceLookup=&endRaceLookup=
//     &includeDQ=0&minRunCount=1
// Aggregate best/avg value per track for bar chart comparison.
// ============================================================================

function handleTopByTrack(PDO $pdo): void {
    $classIndex = trim($_GET['classIndex'] ?? '');
    $metric = trim($_GET['metric'] ?? '');

    if (!$classIndex) {
        rsa_jsonResponse(['error' => 'classIndex is required'], 400);
    }
    $allowedMetrics = ['mph1320', 'ft1320', 'ft60', 'ft330', 'ft660', 'mph660', 'ft1000', 'mph1000'];
    if (!in_array($metric, $allowedMetrics, true)) {
        rsa_jsonResponse(['error' => 'metric must be one of: ' . implode(', ', $allowedMetrics)], 400);
    }

    $includeDQ  = (int)($_GET['includeDQ'] ?? 0);
    $minRunCount = max(1, (int)($_GET['minRunCount'] ?? 1));
    $includeBad = (int)($_GET['includeBad'] ?? 0);

    $agg = (strpos($metric, 'mph') === 0) ? 'MAX' : 'MIN';

    $expanded = parity_expandClassIndex($pdo, $classIndex);
    $ph = implode(',', array_fill(0, count($expanded), '?'));
    $where = ["r.class_index IN ($ph)", "r.{$metric} IS NOT NULL", "r.{$metric} > 0",
              "ec.track_name IS NOT NULL AND ec.track_name != ''"];
    $params = $expanded;

    if (!$includeDQ)  $where[] = '(r.dq_flag IS NULL OR r.dq_flag = 0)';
    if (!$includeBad) $where[] = 'NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ("bad","exclude"))';
    if (!empty($_GET['startRaceLookup'])) { $where[] = 'r.race_lookup >= ?'; $params[] = $_GET['startRaceLookup']; }
    if (!empty($_GET['endRaceLookup']))   { $where[] = 'r.race_lookup <= ?'; $params[] = $_GET['endRaceLookup']; }

    $whereClause = implode(' AND ', $where);

    $sql = "
        SELECT ec.track_name AS trackName,
               {$agg}(r.{$metric}) AS bestValue,
               AVG(r.{$metric}) AS avgValue,
               COUNT(DISTINCT r.race_lookup) AS eventCount,
               COUNT(*) AS runCount
        FROM parity_runs r
        LEFT JOIN parity_event_catalog ec ON ec.race_lookup = r.race_lookup
        WHERE {$whereClause}
        GROUP BY ec.track_name
        HAVING COUNT(*) >= {$minRunCount}
        ORDER BY {$agg}(r.{$metric}) ASC
        LIMIT 100
    ";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['bestValue'] = (float)$r['bestValue'];
        $r['avgValue']  = round((float)$r['avgValue'], 4);
        $r['eventCount'] = (int)$r['eventCount'];
        $r['runCount']   = (int)$r['runCount'];
    }

    rsa_jsonResponse([
        'classIndex' => $classIndex,
        'metric'     => $metric,
        'aggregation' => $agg,
        'includeDQ'  => (bool)$includeDQ,
        'minRunCount' => $minRunCount,
        'rows'       => $rows,
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

        $inserted = 0;
        $updated = 0;
        $skipped = 0;
        foreach ($rows as $raw) {
            $normalized = parity_normalizeRow($raw, $raceLookup);
            $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);
            $localTime = $normalized['run_timestamp_utc'];
            $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;
            $res = parity_upsertRun($pdo, $normalized, $rowHash, $importId, $raceLookup, $utcTime, $localTime);
            if ($res === 'inserted') $inserted++;
            elseif ($res === 'updated') $updated++;
            else $skipped++;
        }

        $pdo->prepare("UPDATE parity_run_imports SET row_count = ? WHERE id = ?")->execute([$inserted, $importId]);

        $entry['rowsInserted'] = $inserted;
        $entry['rowsUpdated'] = $updated;
        $entry['rowsSkipped'] = $skipped;
        $entry['rowsDeduped'] = $updated + $skipped;
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

    // Detect wind columns (once per call)
    $hasWindCols = false;
    try {
        $colChk = $pdo->query("SHOW COLUMNS FROM parity_weather_samples LIKE 'wind_speed_mph'");
        $hasWindCols = $colChk->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }

    // Prepare insert with parameterized source
    if ($hasWindCols) {
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_weather_samples
                (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, wind_speed_mph, wind_dir_deg, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
    } else {
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_weather_samples
                (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
    }

    $daysChecked = 0;
    $daysFetched = 0;
    $daysNoData = 0;
    $rowsInserted = 0;
    $rowsDeduped = 0;
    $errors = [];
    $stationStats = array_fill_keys($config['station_ids'], ['inserted' => 0, 'deduped' => 0, 'errors' => []]);

    // Iterate each day in range
    $current = new DateTime($fromDate);
    $end = new DateTime($toDate);
    $isFirstFetch = true;

    while ($current <= $end) {
        $daysChecked++;
        $dateStr = $current->format('Y-m-d');

        // Check existing rows for this day (count across all tempest sources)
        $range = parity_localDateToUtcRange($dateStr, $tz);
        $utcStart = gmdate('Y-m-d H:i:s', $range['start_epoch']);
        $utcEnd = gmdate('Y-m-d H:i:s', $range['end_epoch']);

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM parity_weather_samples
            WHERE event_id = ? AND timestamp_utc BETWEEN ? AND ?
              AND source LIKE 'tempest%'
        ");
        $countStmt->execute([$eventId, $utcStart, $utcEnd]);
        $existing = (int)$countStmt->fetchColumn();

        // Require minRowsPerDay * number of stations to consider the day fully covered
        $stationCount = count($config['station_ids']);
        if ($existing >= $minRowsPerDay * $stationCount) {
            $current->modify('+1 day');
            continue;
        }

        // Throttle between day fetches (skip delay on first fetch)
        if (!$isFirstFetch) {
            usleep($throttleMs * 1000);
        }
        $isFirstFetch = false;

        // Fetch from ALL stations for this day
        $daysFetched++;
        $allStations = parity_fetchAllTempestStations(
            $range['start_epoch'],
            $range['end_epoch'],
            $config,
            300 // 300ms between station fetches
        );

        $dayHadData = false;
        foreach ($allStations['stations'] as $sid => $stationData) {
            if ($stationData['error']) {
                $errors[] = "station $sid $dateStr: " . $stationData['error'];
                $stationStats[$sid]['errors'][] = "$dateStr: " . $stationData['error'];
                continue;
            }

            if (!empty($stationData['samples'])) $dayHadData = true;
            $sourceTag = "tempest_$sid";

            foreach ($stationData['samples'] as $s) {
                $tsUtc = gmdate('Y-m-d H:i:s', $s['timestamp_epoch']);
                $utcDt = new DateTimeImmutable("@{$s['timestamp_epoch']}");
                $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
                $localStr = $localDt->format('Y-m-d H:i:s');
                $tempF = parity_cToF($s['temp_c']);

                try {
                    if ($hasWindCols) {
                        $stmtInsert->execute([
                            $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                            $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                            $s['wind_speed_mph'] ?? null, $s['wind_dir_deg'] ?? null,
                            $sourceTag,
                        ]);
                    } else {
                        $stmtInsert->execute([
                            $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                            $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                            $sourceTag,
                        ]);
                    }
                    $rowsInserted++;
                    $stationStats[$sid]['inserted']++;
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Duplicate') !== false) {
                        $rowsDeduped++;
                        $stationStats[$sid]['deduped']++;
                    } else {
                        throw $e;
                    }
                }
            }
        }

        if (!$dayHadData) $daysNoData++;
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
        'stationStats' => $stationStats,
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
    // Detect wind columns in samples
    $hasWindSampleCols = false;
    try {
        $wColChk = $pdo->query("SHOW COLUMNS FROM parity_weather_samples LIKE 'wind_speed_mph'");
        $hasWindSampleCols = $wColChk->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }
    $hasWindCanonicalCols = false;
    try {
        $wcColChk = $pdo->query("SHOW COLUMNS FROM parity_weather_canonical LIKE 'wind_speed_mph'");
        $hasWindCanonicalCols = $wcColChk->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }
    $propagateWind = $hasWindSampleCols && $hasWindCanonicalCols;

    if ($propagateWind) {
        $stmtSample = $pdo->prepare("
            SELECT temp_f, rh_pct, station_pressure_raw, wind_speed_mph, wind_dir_deg, timestamp_utc,
                   ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
            FROM parity_weather_samples
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY delta_s ASC
            LIMIT 1
        ");
    } else {
        $stmtSample = $pdo->prepare("
            SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc,
                   ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
            FROM parity_weather_samples
            WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY delta_s ASC
            LIMIT 1
        ");
    }

    // Query to get ALL samples in bucket window for provenance calculation
    $stmtAllSamples = $pdo->prepare("
        SELECT source, COUNT(*) as count
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
        GROUP BY source
    ");

    if ($propagateWind) {
        $stmtUpsert = $pdo->prepare("
            INSERT INTO parity_weather_canonical
                (timestamp_utc, temp_f, rh_pct, pressure_inhg, wind_speed_mph, wind_dir_deg,
                 canonical_source_kind, canonical_source_detail, sample_count, sample_sources_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                temp_f = VALUES(temp_f), rh_pct = VALUES(rh_pct), pressure_inhg = VALUES(pressure_inhg),
                wind_speed_mph = VALUES(wind_speed_mph), wind_dir_deg = VALUES(wind_dir_deg),
                canonical_source_kind = VALUES(canonical_source_kind),
                canonical_source_detail = VALUES(canonical_source_detail),
                sample_count = VALUES(sample_count), sample_sources_json = VALUES(sample_sources_json)
        ");
    } else {
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
    }

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

        // Wind from nearest sample (direct carry-through)
        $windSpeedMph = null;
        $windDirDeg = null;
        if ($propagateWind && isset($sample['wind_speed_mph'])) {
            $windSpeedMph = $sample['wind_speed_mph'] !== null ? round((float)$sample['wind_speed_mph'], 2) : null;
            $windDirDeg = $sample['wind_dir_deg'] !== null ? (int)$sample['wind_dir_deg'] : null;
        }

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

        if ($propagateWind) {
            $stmtUpsert->execute([
                $bucketTs, $tempF, $rhPct, $pressInhg, $windSpeedMph, $windDirDeg,
                $sourceKind, $sourceDetail, $totalSamples, $sourcesJson
            ]);
        } else {
            $stmtUpsert->execute([
                $bucketTs, $tempF, $rhPct, $pressInhg,
                $sourceKind, $sourceDetail, $totalSamples, $sourcesJson
            ]);
        }
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

    // Category filter (human-readable, preferred) or classIndex (legacy)
    if (!empty($_GET['category'])) {
        parity_applyCategoryFilter(trim($_GET['category']), $where, $params);
    } elseif (!empty($_GET['classIndex'])) {
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

    // Query runs — include run_time_local for UI display + incident_count
    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local, r.category, r.class_index,
               r.round, r.lane, r.driver_name, r.car_number, r.dial_in, r.rt,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.mov, r.place, r.source_ref,
               COALESCE(ic.cnt, 0) AS incident_count
        FROM parity_runs r
        LEFT JOIN (SELECT run_id, COUNT(*) AS cnt FROM run_incidents GROUP BY run_id) ic ON ic.run_id = r.id
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
        $run['incident_count'] = (int)($run['incident_count'] ?? 0);

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
// GET ?action=eventCategories&eventId=N
// Returns distinct (category, class_index) pairs + run counts for the event.
// Used by the class/category selector to build "Recommended + All" dropdown.
// ============================================================================

function handleEventCategories(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    if ($eventId <= 0) {
        rsa_jsonResponse(['error' => 'eventId is required'], 400);
    }

    // Resolve race_lookup for this event
    $stmt = $pdo->prepare("SELECT race_lookup FROM parity_events WHERE id = ?");
    $stmt->execute([$eventId]);
    $raceLookup = $stmt->fetchColumn();
    if (!$raceLookup) {
        rsa_jsonResponse(['error' => "Event $eventId not found"], 404);
    }

    // Get distinct (category, class_index) pairs with run counts
    $stmt = $pdo->prepare("
        SELECT category, class_index, COUNT(*) AS run_count
        FROM parity_runs
        WHERE race_lookup = ? AND class_index IS NOT NULL AND class_index != ''
        GROUP BY category, class_index
        ORDER BY category, class_index
    ");
    $stmt->execute([$raceLookup]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as &$r) {
        $r['run_count'] = (int)$r['run_count'];
    }

    rsa_jsonResponse([
        'eventId' => $eventId,
        'categories' => $rows,
    ]);
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
// POST ?action=refreshEventData
// Body: { eventId: int }
// Orchestrates: timing ingest → Tempest backfill → Open-Meteo backfill → canonical rebuild.
// Always forces re-fetch; relies on dedupe indexes to prevent duplicates.
// ============================================================================

function handleRefreshEventData(PDO $pdo, int $userId, array $auth): void {
    $role = rsa_getUserRole($pdo, $userId);
    if (!rsa_hasCap($pdo, $userId, $role, 'nhra.parity')) {
        rsa_jsonResponse(['error' => 'Forbidden: nhra.parity required'], 403);
    }
    set_time_limit(600); // 10 min for the full pipeline

    $input = rsa_getJsonInput();
    $eventId = (int)($input['eventId'] ?? 0);
    if ($eventId <= 0) {
        rsa_jsonResponse(['error' => 'eventId is required'], 400);
    }

    $t0 = microtime(true);

    // ── Load event + track ──────────────────────────────────────────────
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, e.start_date_local, e.end_date_local,
               t.id AS track_id, t.timezone_iana, t.latitude, t.longitude
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) {
        rsa_jsonResponse(['error' => "Event $eventId not found"], 404);
    }

    $tz = $event['timezone_iana'];
    $startLocal = $event['start_date_local'];
    $endLocal = $event['end_date_local'];

    // Fallback: if end_date_local is missing, use start + 4 days
    if (empty($endLocal)) {
        $endLocal = (new DateTime($startLocal))->modify('+4 days')->format('Y-m-d');
    }

    // Cap end to today in the event's timezone (can't fetch future weather)
    $todayLocal = (new DateTime('now', new DateTimeZone($tz)))->format('Y-m-d');
    if ($endLocal > $todayLocal) {
        $endLocal = $todayLocal;
    }

    // Convert to UTC for weather API calls
    $tzObj = new DateTimeZone($tz);
    $startDt = new DateTimeImmutable("$startLocal 00:00:00", $tzObj);
    $endDt = new DateTimeImmutable("$endLocal 23:59:59", $tzObj);
    $startUtc = $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');
    $endUtc = $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d H:i:s');

    // ── Step 1: Timing data ingest ──────────────────────────────────────
    $timingResult = ['fetched' => 0, 'inserted' => 0, 'updated' => 0, 'skipped' => 0, 'deduped' => 0, 'errors' => []];
    $raceLookup = $event['race_lookup'] ?? '';

    if (!empty($raceLookup) && preg_match('/^\d{8}$/', $raceLookup)) {
        try {
            $odataResult = parity_fetchODataResults($raceLookup);
            $rows = $odataResult['rows'];
            $timingResult['fetched'] = count($rows);

            if (!empty($rows)) {
                $requestedAt = gmdate('Y-m-d H:i:s');
                $importUuid = parity_generateUUID();
                $fetchedAt = gmdate('Y-m-d H:i:s');

                $stmt = $pdo->prepare("
                    INSERT INTO parity_run_imports (uuid, race_lookup, requested_at_utc, fetched_at_utc, status, row_count, source_url, created_by_user_id)
                    VALUES (?, ?, ?, ?, 'success', ?, ?, ?)
                ");
                $stmt->execute([$importUuid, $raceLookup, $requestedAt, $fetchedAt, count($rows), $odataResult['url'], $userId]);
                $importId = (int)$pdo->lastInsertId();

                // Resolve track timezone for local→UTC conversion
                $trackTz = $tz;

                foreach ($rows as $raw) {
                    $normalized = parity_normalizeRow($raw, $raceLookup);
                    $rowHash = parity_computeRowHash($raceLookup, $normalized, $raw);
                    $localTime = $normalized['run_timestamp_utc'];
                    $utcTime = ($localTime !== null) ? parity_localToUtc($localTime, $trackTz) : null;
                    try {
                        $res = parity_upsertRun($pdo, $normalized, $rowHash, $importId, $raceLookup, $utcTime, $localTime);
                        if ($res === 'inserted') $timingResult['inserted']++;
                        elseif ($res === 'updated') $timingResult['updated']++;
                        else $timingResult['skipped']++;
                    } catch (Exception $e) {
                        $timingResult['errors'][] = $e->getMessage();
                    }
                }

                $timingResult['deduped'] = $timingResult['updated'] + $timingResult['skipped'];
                $pdo->prepare("UPDATE parity_run_imports SET row_count = ? WHERE id = ?")->execute([$timingResult['inserted'], $importId]);
            }
        } catch (Exception $e) {
            $timingResult['errors'][] = $e->getMessage();
        }
    } else {
        $timingResult['errors'][] = 'No valid race_lookup on event — skipping timing ingest';
    }
    error_log("refreshEventData[$eventId]: Step 1 timing complete — inserted={$timingResult['inserted']} updated={$timingResult['updated']} errors=" . count($timingResult['errors']));

    // ── Step 2: Tempest weather backfill (multi-station) ────────────────
    $tempestResult = ['daysFetched' => 0, 'inserted' => 0, 'deduped' => 0, 'errors' => [], 'stations' => []];
    try {
        $config = parity_getTempestConfig();
        $stationIds = $config['station_ids'];
        $tempestResult['stations'] = array_fill_keys($stationIds, ['inserted' => 0, 'deduped' => 0, 'errors' => []]);

        // Detect wind columns
        $hasWindColsStep2 = false;
        try {
            $colChk2 = $pdo->query("SHOW COLUMNS FROM parity_weather_samples LIKE 'wind_speed_mph'");
            $hasWindColsStep2 = $colChk2->rowCount() > 0;
        } catch (Exception $e) { /* ignore */ }

        // Prepare insert with parameterized source
        if ($hasWindColsStep2) {
            $stmtInsert = $pdo->prepare("
                INSERT INTO parity_weather_samples
                    (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, wind_speed_mph, wind_dir_deg, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
        } else {
            $stmtInsert = $pdo->prepare("
                INSERT INTO parity_weather_samples
                    (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
        }

        $current = new DateTime($startLocal);
        $end = new DateTime($endLocal);
        $isFirstDay = true;

        while ($current <= $end) {
            $dateStr = $current->format('Y-m-d');
            $range = parity_localDateToUtcRange($dateStr, $tz);

            // Throttle between day fetches (skip delay on first day)
            if (!$isFirstDay) {
                usleep(100 * 1000); // 100ms between days
            }
            $isFirstDay = false;

            $tempestResult['daysFetched']++;

            // Fetch from ALL stations for this day
            $allStations = parity_fetchAllTempestStations(
                $range['start_epoch'],
                $range['end_epoch'],
                $config,
                300 // 300ms between station fetches
            );

            foreach ($allStations['stations'] as $sid => $stationData) {
                if ($stationData['error']) {
                    $tempestResult['stations'][$sid]['errors'][] = "$dateStr: " . $stationData['error'];
                    $tempestResult['errors'][] = "station $sid $dateStr: " . $stationData['error'];
                    continue;
                }

                $sourceTag = "tempest_$sid";

                foreach ($stationData['samples'] as $s) {
                    $tsUtc = gmdate('Y-m-d H:i:s', $s['timestamp_epoch']);
                    $utcDt = new DateTimeImmutable("@{$s['timestamp_epoch']}");
                    $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
                    $localStr = $localDt->format('Y-m-d H:i:s');
                    $tempF = parity_cToF($s['temp_c']);

                    try {
                        if ($hasWindColsStep2) {
                            $stmtInsert->execute([
                                $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                                $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                                $s['wind_speed_mph'] ?? null, $s['wind_dir_deg'] ?? null,
                                $sourceTag,
                            ]);
                        } else {
                            $stmtInsert->execute([
                                $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                                $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                                $sourceTag,
                            ]);
                        }
                        $tempestResult['inserted']++;
                        $tempestResult['stations'][$sid]['inserted']++;
                    } catch (PDOException $e) {
                        if (strpos($e->getMessage(), 'Duplicate') !== false) {
                            $tempestResult['deduped']++;
                            $tempestResult['stations'][$sid]['deduped']++;
                        } else {
                            $tempestResult['errors'][] = $e->getMessage();
                            $tempestResult['stations'][$sid]['errors'][] = $e->getMessage();
                        }
                    }
                }
            }

            $current->modify('+1 day');
        }
    } catch (RuntimeException $e) {
        $tempestResult['errors'][] = 'Tempest config: ' . $e->getMessage();
    }
    error_log("refreshEventData[$eventId]: Step 2 Tempest complete — inserted={$tempestResult['inserted']} deduped={$tempestResult['deduped']} errors=" . count($tempestResult['errors']));

    // ── Step 3: Open-Meteo backfill ──────────────────────────────────────
    $openMeteoResult = ['fetched' => 0, 'inserted' => 0, 'deduped' => 0, 'errors' => []];
    $lat = (float)($event['latitude'] ?? 0);
    $lon = (float)($event['longitude'] ?? 0);

    if ($lat !== 0.0 && $lon !== 0.0) {
        require_once __DIR__ . '/parity_weather_provider.php';
        try {
            $startUtcIso = $startDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
            $endUtcIso = $endDt->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s\Z');
            $samples = fetchOpenMeteoWeather($lat, $lon, $startUtcIso, $endUtcIso);
            $openMeteoResult['fetched'] = count($samples);

            $hasWindColsOM = false;
            try {
                $colChkOM = $pdo->query("SHOW COLUMNS FROM parity_weather_samples LIKE 'wind_speed_mph'");
                $hasWindColsOM = $colChkOM->rowCount() > 0;
            } catch (Exception $e) { /* ignore */ }

            if ($hasWindColsOM) {
                $omInsert = $pdo->prepare("
                    INSERT INTO parity_weather_samples
                        (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, wind_speed_mph, wind_dir_deg, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open_meteo_backfill')
                ");
            } else {
                $omInsert = $pdo->prepare("
                    INSERT INTO parity_weather_samples
                        (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open_meteo_backfill')
                ");
            }

            foreach ($samples as $sample) {
                $tempC = ($sample['tempF'] - 32) * 5.0 / 9.0;
                $pressureMbar = $sample['baroInHg'] / 0.02953;

                try {
                    $utcDt = new DateTimeImmutable($sample['timestampUtc'], new DateTimeZone('UTC'));
                    $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
                    $localStr = $localDt->format('Y-m-d H:i:s');
                    $tsUtcFmt = $utcDt->format('Y-m-d H:i:s');
                } catch (Exception $e) {
                    $openMeteoResult['errors'][] = 'timestamp parse: ' . $e->getMessage();
                    continue;
                }

                try {
                    if ($hasWindColsOM) {
                        $omInsert->execute([
                            $tsUtcFmt, $eventId, (int)$event['track_id'], $localStr,
                            round($tempC, 4), round($sample['tempF'], 4),
                            round($sample['humidityPct'], 2), round($pressureMbar, 4),
                            isset($sample['windSpeedMph']) ? round($sample['windSpeedMph'], 2) : null,
                            $sample['windDirDeg'] ?? null,
                        ]);
                    } else {
                        $omInsert->execute([
                            $tsUtcFmt, $eventId, (int)$event['track_id'], $localStr,
                            round($tempC, 4), round($sample['tempF'], 4),
                            round($sample['humidityPct'], 2), round($pressureMbar, 4),
                        ]);
                    }
                    $openMeteoResult['inserted']++;
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Duplicate') !== false) {
                        $openMeteoResult['deduped']++;
                    } else {
                        $openMeteoResult['errors'][] = $e->getMessage();
                    }
                }
            }
        } catch (Exception $e) {
            $openMeteoResult['errors'][] = $e->getMessage();
        }
    } else {
        $openMeteoResult['errors'][] = 'Track has no lat/lon coordinates — skipping Open-Meteo';
    }
    error_log("refreshEventData[$eventId]: Step 3 Open-Meteo complete — fetched={$openMeteoResult['fetched']} inserted={$openMeteoResult['inserted']} errors=" . count($openMeteoResult['errors']));

    // ── Step 4: Rebuild canonical weather ────────────────────────────────
    $canonicalResult = ['bucketsProcessed' => 0, 'errors' => []];
    try {
        $r = weatherRebuildCanonicalRange($pdo, $startUtc, $endUtc, 30);
        $canonicalResult['bucketsProcessed'] = $r['bucketsProcessed'] ?? 0;
    } catch (Exception $e) {
        $canonicalResult['errors'][] = $e->getMessage();
    }
    error_log("refreshEventData[$eventId]: Step 4 canonical complete — buckets={$canonicalResult['bucketsProcessed']} errors=" . count($canonicalResult['errors']));

    // ── Return structured results ────────────────────────────────────────
    $durationMs = (int)((microtime(true) - $t0) * 1000);

    rsa_jsonResponse([
        'ok' => true,
        'event_id' => $eventId,
        'event_name' => $event['event_name'],
        'range' => ['startLocal' => $startLocal, 'endLocal' => $endLocal, 'timezone' => $tz],
        'timing' => $timingResult,
        'tempest' => $tempestResult,
        'open_meteo' => $openMeteoResult,
        'canonical' => $canonicalResult,
        'duration_ms' => $durationMs,
    ]);
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

/**
 * Slope correction factor for ET — DR Pro Book p. 11-2 (Patrick Hale, 2014).
 * ET.2 = ET.1 × (1 − slopeGradePct/100) ^ (−3.1 / WT^0.33)
 * slopeGradePct: positive = downhill (finish lower), negative = uphill.
 */
function parity_slopeFactorET(float $slopeGradePct, float $wt): float {
    if ($slopeGradePct == 0.0 || $wt <= 0.0) return 1.0;
    $base = 1.0 - $slopeGradePct / 100.0;
    if ($base <= 0.0) return 1.0;
    return pow($base, -3.1 / pow($wt, 0.33));
}

/**
 * Slope correction factor for MPH — DR Pro Book p. 11-2.
 * MPH.2 = MPH.1 × (1 − slopeGradePct/100) ^ (3.5 / WT^0.33)
 */
function parity_slopeFactorMPH(float $slopeGradePct, float $wt): float {
    if ($slopeGradePct == 0.0 || $wt <= 0.0) return 1.0;
    $base = 1.0 - $slopeGradePct / 100.0;
    if ($base <= 0.0) return 1.0;
    return pow($base, 3.5 / pow($wt, 0.33));
}

/**
 * Default racecar weight (lbs) by category for slope correction.
 */
function parity_defaultWeight(string $category): float {
    static $W = [
        'TOP FUEL'              => 2250.0,
        'FUNNY CAR'             => 2350.0,
        'PRO STOCK'             => 2350.0,
        'PRO STOCK MOTORCYCLE'  => 700.0,
        'TOP ALCOHOL DRAGSTER'  => 1650.0,
        'TOP ALCOHOL FUNNY CAR' => 2350.0,
        'PRO MOD'               => 2650.0,
    ];
    return $W[strtoupper(trim($category))] ?? 2350.0;
}

// ============================================================================
// Shared: category filter with class_index consistency guard
//
// Filters by r.category = ? AND, for known NHRA pro categories, excludes
// runs whose class_index clearly belongs to a *different* known pro category.
// Guards against occasional NHRA OData feed errors where category/class_index
// disagree.  Runs with null/empty class_index are always kept.
// ============================================================================

function parity_applyCategoryFilter(string $category, array &$where, array &$params): void {
    static $CAT_CLASS_MAP = [
        'TOP FUEL'               => ['TF', 'TFH', 'TFM'],
        'FUNNY CAR'              => ['FC', 'NFC'],
        'PRO STOCK'              => ['PRO', 'PS'],
        'PRO STOCK MOTORCYCLE'   => ['PSM'],
        'PRO MOD'                => ['PM'],
        'TOP ALCOHOL DRAGSTER'   => ['TAD'],
        'TOP ALCOHOL FUNNY CAR'  => ['TAFC'],
        'TOP DRAGSTER'           => ['TD'],
        'TOP SPORTSMAN'          => ['TS'],
    ];

    $where[]  = 'UPPER(r.category) = ?';
    $params[] = strtoupper(trim($category));

    $cat = strtoupper(trim($category));
    if (!isset($CAT_CLASS_MAP[$cat])) return;

    // Collect class_index values that belong to OTHER known categories
    $conflicting = [];
    foreach ($CAT_CLASS_MAP as $otherCat => $classes) {
        if ($otherCat !== $cat) {
            $conflicting = array_merge($conflicting, $classes);
        }
    }
    if (empty($conflicting)) return;

    $ph = implode(',', array_fill(0, count($conflicting), '?'));
    $where[]  = "(r.class_index IS NULL OR r.class_index = '' OR r.class_index NOT IN ($ph))";
    $params   = array_merge($params, $conflicting);
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

    $hasWindColsJob = false;
    try {
        $colChkJob = $pdo->query("SHOW COLUMNS FROM parity_weather_samples LIKE 'wind_speed_mph'");
        $hasWindColsJob = $colChkJob->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }

    if ($hasWindColsJob) {
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_weather_samples
                (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, wind_speed_mph, wind_dir_deg, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
    } else {
        $stmtInsert = $pdo->prepare("
            INSERT INTO parity_weather_samples
                (timestamp_utc, event_id, track_id, event_local_time, temp_c, temp_f, rh_pct, station_pressure_raw, source)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
    }

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

        // Check existing rows (count across all tempest sources)
        $range = parity_localDateToUtcRange($dateStr, $tz);
        $utcStart = gmdate('Y-m-d H:i:s', $range['start_epoch']);
        $utcEnd = gmdate('Y-m-d H:i:s', $range['end_epoch']);

        $countStmt = $pdo->prepare("
            SELECT COUNT(*) FROM parity_weather_samples
            WHERE event_id = ? AND timestamp_utc BETWEEN ? AND ?
              AND source LIKE 'tempest%'
        ");
        $countStmt->execute([$eventId, $utcStart, $utcEnd]);
        $existing = (int)$countStmt->fetchColumn();

        $stationCount = count($config['station_ids']);
        if ($existing >= $minRowsPerDay * $stationCount) {
            $stmtUpdateItem->execute(['skipped', 0, "Already has $existing rows across $stationCount stations", 0, 0, 0, $item['id']]);
            continue;
        }

        // Throttle
        if (!$isFirst) {
            usleep($throttleMs * 1000);
        }
        $isFirst = false;

        // Fetch from ALL stations
        $allStations = parity_fetchAllTempestStations(
            $range['start_epoch'],
            $range['end_epoch'],
            $config,
            300 // 300ms between station fetches
        );

        $totalFetched = 0;
        $inserted = 0;
        $deduped = 0;
        $itemErrors = [];

        foreach ($allStations['stations'] as $sid => $stationData) {
            if ($stationData['error']) {
                $itemErrors[] = "station $sid: " . $stationData['error'];
                continue;
            }

            $totalFetched += count($stationData['samples']);
            $sourceTag = "tempest_$sid";

            foreach ($stationData['samples'] as $s) {
                $tsUtc = gmdate('Y-m-d H:i:s', $s['timestamp_epoch']);
                $utcDt = new DateTimeImmutable("@{$s['timestamp_epoch']}");
                $localDt = $utcDt->setTimezone(new DateTimeZone($tz));
                $localStr = $localDt->format('Y-m-d H:i:s');
                $tempF = parity_cToF($s['temp_c']);

                try {
                    if ($hasWindColsJob) {
                        $stmtInsert->execute([
                            $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                            $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                            $s['wind_speed_mph'] ?? null, $s['wind_dir_deg'] ?? null,
                            $sourceTag,
                        ]);
                    } else {
                        $stmtInsert->execute([
                            $tsUtc, $eventId, (int)$event['track_id'], $localStr,
                            $s['temp_c'], $tempF, $s['rh_pct'], $s['station_pressure_raw'],
                            $sourceTag,
                        ]);
                    }
                    $inserted++;
                } catch (PDOException $e) {
                    if (strpos($e->getMessage(), 'Duplicate') !== false) {
                        $deduped++;
                    } else {
                        $itemErrors[] = "station $sid: insert failed: " . $e->getMessage();
                    }
                }
            }
        }

        if ($totalFetched === 0 && empty($itemErrors)) {
            $stmtUpdateItem->execute(['no_data', 200, null, 0, 0, 0, $item['id']]);
        } elseif ($totalFetched === 0 && !empty($itemErrors)) {
            $stmtUpdateItem->execute(['error', 0, implode('; ', $itemErrors), 0, 0, 0, $item['id']]);
            $stmtUpdateJob->execute([$dateStr, implode('; ', $itemErrors), $jobId]);
        } else {
            $errorNote = !empty($itemErrors) ? implode('; ', $itemErrors) : null;
            $stmtUpdateItem->execute(['ok', 200, $errorNote, $totalFetched, $inserted, $deduped, $item['id']]);
        }
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
    $limit       = min((int)($_GET['limit'] ?? 50), 2000);
    $offset      = max((int)($_GET['offset'] ?? 0), 0);

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

    // 1) Count total matching rows
    $countParams = $params;
    $stmtCount = $pdo->prepare("
        SELECT COUNT(*) AS cnt
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        WHERE $whereClause
    ");
    $stmtCount->execute($countParams);
    $totalCount = (int)$stmtCount->fetchColumn();

    // 2) Fetch page of rows
    $params[] = $limit;
    $params[] = $offset;

    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc,
               r.class_index, r.round, r.lane, r.driver_name, r.car_number,
               r.rt, r.ft60, r.ft330, r.ft660, r.mph660,
               r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               r.win_flag, r.dq_flag, r.place,
               e.event_name, t.track_name,
               COALESCE(ic.cnt, 0) AS incident_count
        FROM parity_runs r
        LEFT JOIN parity_run_flags f ON f.run_id = r.id AND f.flag_type IN ('bad','exclude')
        LEFT JOIN parity_events e ON e.race_lookup = r.race_lookup
        LEFT JOIN parity_tracks t ON t.id = e.track_id
        LEFT JOIN (SELECT run_id, COUNT(*) AS cnt FROM run_incidents GROUP BY run_id) ic ON ic.run_id = r.id
        WHERE $whereClause
        ORDER BY r.race_lookup DESC, r.run_timestamp_utc DESC
        LIMIT ? OFFSET ?
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
            'incident_count'    => (int)($r['incident_count'] ?? 0),
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
        'total'      => $totalCount,
        'limit'      => $limit,
        'offset'     => $offset,
    ]);
}

// ============================================================================
// GET ?action=listTracksWithStats
// Returns: tracks with event count, total run count, weather sample count
// ============================================================================

function handleListTracksWithStats(PDO $pdo): void {
    $stmt = $pdo->prepare("
        SELECT t.id, t.track_name, t.timezone_iana, t.street, t.city, t.state, t.zip,
               t.latitude, t.longitude, t.slope_grade_pct, t.created_at,
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
        $r['latitude'] = $r['latitude'] !== null ? (float)$r['latitude'] : null;
        $r['longitude'] = $r['longitude'] !== null ? (float)$r['longitude'] : null;
        $r['slope_grade_pct'] = $r['slope_grade_pct'] !== null ? (float)$r['slope_grade_pct'] : null;
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
    // slope_grade_pct handled separately (numeric, allow null)
    if (array_key_exists('slope_grade_pct', $input)) {
        $sets[] = "slope_grade_pct = ?";
        $params[] = $input['slope_grade_pct'] !== null && $input['slope_grade_pct'] !== ''
            ? round((float)$input['slope_grade_pct'], 3) : null;
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
    $stmt = $pdo->query("SELECT id, name, category, t_power, d_power, friction_factor, fuel_type, color_hex, created_at, updated_at FROM parity_engine_combos ORDER BY name");
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
    $id       = isset($input['id']) ? (int)$input['id'] : null;
    $name     = trim($input['name'] ?? '');
    $category = trim($input['category'] ?? 'Default');
    $colorHex = trim($input['colorHex'] ?? '#888888');
    $fuelType = trim($input['fuelType'] ?? 'Gasoline Carbureted');
    $tPower   = (float)($input['tPower'] ?? 0);
    $dPower   = (float)($input['dPower'] ?? 0);
    $ff       = (float)($input['FF'] ?? 0);

    if ($name === '') rsa_jsonResponse(['error' => 'name is required'], 400);
    if ($fuelType === '') rsa_jsonResponse(['error' => 'fuelType is required'], 400);

    // Auto-calculate HPC parameters based on fuel type unless manual override provided
    $fuelParams = getFuelTypeHpcParams($fuelType);
    $autoCalculate = !isset($input['tPower']) && !isset($input['dPower']) && !isset($input['FF']);
    
    if ($autoCalculate) {
        $tPower = $fuelParams['tPower'];
        $dPower = $fuelParams['dPower'];
        $ff = $fuelParams['FF'];
    } else {
        // Validate manual parameters if provided
        if (!is_finite($tPower) || !is_finite($dPower) || !is_finite($ff)) {
            rsa_jsonResponse(['error' => 'tPower, dPower, and FF must be finite numbers'], 400);
        }
    }

    if ($id) {
        // Check name uniqueness (exclude self)
        $chk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE name=? AND id!=?");
        $chk->execute([$name, $id]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Engine combo name already exists'], 409);
        $pdo->prepare("UPDATE parity_engine_combos SET name=?, category=?, t_power=?, d_power=?, friction_factor=?, fuel_type=?, color_hex=? WHERE id=?")
            ->execute([$name, $category, $tPower, $dPower, $ff, $fuelType, $colorHex, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        $chk = $pdo->prepare("SELECT id FROM parity_engine_combos WHERE name=?");
        $chk->execute([$name]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Engine combo name already exists'], 409);
        $pdo->prepare("INSERT INTO parity_engine_combos (name, category, t_power, d_power, friction_factor, fuel_type, color_hex) VALUES (?,?,?,?,?,?,?)")
            ->execute([$name, $category, $tPower, $dPower, $ff, $fuelType, $colorHex]);
        rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

/** Helper: Get HPC parameters for fuel type */
function getFuelTypeHpcParams(string $fuelType): array {
    static $map = [
        'Gasoline' => ['tPower' => 0.6, 'dPower' => 1.0, 'FF' => 15],
        'Gasoline Carbureted' => ['tPower' => 0.6, 'dPower' => 1.0, 'FF' => 15],
        'Gasoline Injector' => ['tPower' => 0.6, 'dPower' => 1.0, 'FF' => 14.5],
        'Methanol' => ['tPower' => 0.3, 'dPower' => 1.0, 'FF' => 13],
        'Methanol Injector' => ['tPower' => 0.3, 'dPower' => 1.0, 'FF' => 12.5],
        'Nitromethane' => ['tPower' => 0.5, 'dPower' => 0.85, 'FF' => 5.5],
        'Supercharged Gasoline' => ['tPower' => 0.6, 'dPower' => 0.95, 'FF' => 9],
        'Supercharged Methanol' => ['tPower' => 0.3, 'dPower' => 0.95, 'FF' => 7.8],
        'Supercharged Nitro' => ['tPower' => 0.5, 'dPower' => 0.95, 'FF' => 8.25],
    ];
    return $map[$fuelType] ?? $map['Gasoline Carbureted'];
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
// GET ?action=listBodyStyles
// ============================================================================

function handleListBodyStyles(PDO $pdo): void {
    $stmt = $pdo->query("SELECT id, name, category, body_style_num, cd, frontal_area, lift_coef, overhang_in, color_hex, created_at, updated_at FROM parity_body_styles ORDER BY name");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['body_style_num'] = $r['body_style_num'] !== null ? (int)$r['body_style_num'] : null;
        $r['cd'] = (float)$r['cd'];
        $r['frontal_area'] = (float)$r['frontal_area'];
        $r['lift_coef'] = (float)$r['lift_coef'];
        $r['overhang_in'] = (float)$r['overhang_in'];
    }
    rsa_jsonResponse(['bodyStyles' => $rows]);
}

// ============================================================================
// POST ?action=upsertBodyStyle   body: { id?, name, category?, bodyStyleNum?, cd, frontalArea, liftCoef, overhangIn, colorHex? }
// ============================================================================

function handleUpsertBodyStyle(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id           = isset($input['id']) ? (int)$input['id'] : null;
    $name         = trim($input['name'] ?? '');
    $category     = trim($input['category'] ?? 'Default');
    $bodyStyleNum = isset($input['bodyStyleNum']) ? (int)$input['bodyStyleNum'] : null;
    $cd           = (float)($input['cd'] ?? 0);
    $frontalArea  = (float)($input['frontalArea'] ?? 0);
    $liftCoef     = (float)($input['liftCoef'] ?? 0);
    $overhangIn   = (float)($input['overhangIn'] ?? 0);
    $colorHex     = trim($input['colorHex'] ?? '#888888');

    if ($name === '') rsa_jsonResponse(['error' => 'name is required'], 400);
    if (!is_finite($cd) || !is_finite($frontalArea) || !is_finite($liftCoef) || !is_finite($overhangIn)) {
        rsa_jsonResponse(['error' => 'cd, frontalArea, liftCoef, overhangIn must be finite numbers'], 400);
    }

    if ($id) {
        $chk = $pdo->prepare("SELECT id FROM parity_body_styles WHERE name=? AND id!=?");
        $chk->execute([$name, $id]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Body style name already exists'], 409);
        $pdo->prepare("UPDATE parity_body_styles SET name=?, category=?, body_style_num=?, cd=?, frontal_area=?, lift_coef=?, overhang_in=?, color_hex=? WHERE id=?")
            ->execute([$name, $category, $bodyStyleNum, $cd, $frontalArea, $liftCoef, $overhangIn, $colorHex, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        $chk = $pdo->prepare("SELECT id FROM parity_body_styles WHERE name=?");
        $chk->execute([$name]);
        if ($chk->fetch()) rsa_jsonResponse(['error' => 'Body style name already exists'], 409);
        $pdo->prepare("INSERT INTO parity_body_styles (name, category, body_style_num, cd, frontal_area, lift_coef, overhang_in, color_hex) VALUES (?,?,?,?,?,?,?,?)")
            ->execute([$name, $category, $bodyStyleNum, $cd, $frontalArea, $liftCoef, $overhangIn, $colorHex]);
        rsa_jsonResponse(['ok' => true, 'id' => (int)$pdo->lastInsertId()]);
    }
}

// ============================================================================
// POST ?action=deleteBodyStyle   body: { id }
// ============================================================================

function handleDeleteBodyStyle(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) rsa_jsonResponse(['error' => 'id is required'], 400);

    $chk = $pdo->prepare("SELECT COUNT(*) FROM parity_driver_body_styles WHERE body_style_id=?");
    $chk->execute([$id]);
    if ((int)$chk->fetchColumn() > 0) {
        rsa_jsonResponse(['error' => 'Cannot delete: body style is referenced by driver assignments'], 409);
    }

    $pdo->prepare("DELETE FROM parity_body_styles WHERE id=?")->execute([$id]);
    rsa_jsonResponse(['ok' => true]);
}

// ============================================================================
// GET ?action=listDriverBodyStyles   optional: ?driverName=...&classIndex=...
// ============================================================================

function handleListDriverBodyStyles(PDO $pdo): void {
    $where = ['1=1'];
    $params = [];
    if (!empty($_GET['driverName'])) {
        $where[] = 'dbs.driver_name LIKE ?';
        $params[] = '%' . trim($_GET['driverName']) . '%';
    }
    if (!empty($_GET['classIndex'])) {
        $where[] = 'dbs.class_index = ?';
        $params[] = trim($_GET['classIndex']);
    }
    $whereClause = implode(' AND ', $where);
    $stmt = $pdo->prepare("
        SELECT dbs.id, dbs.driver_name, dbs.class_index, dbs.body_style_id,
               bs.name AS body_style_name, bs.cd, bs.frontal_area, bs.lift_coef, bs.overhang_in,
               dbs.effective_from_utc, dbs.effective_to_utc, dbs.created_at, dbs.updated_at
        FROM parity_driver_body_styles dbs
        JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
        WHERE $whereClause
        ORDER BY dbs.driver_name, dbs.class_index, dbs.effective_from_utc DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($rows as &$r) {
        $r['id'] = (int)$r['id'];
        $r['body_style_id'] = (int)$r['body_style_id'];
        $r['cd'] = (float)$r['cd'];
        $r['frontal_area'] = (float)$r['frontal_area'];
        $r['lift_coef'] = (float)$r['lift_coef'];
        $r['overhang_in'] = (float)$r['overhang_in'];
    }
    rsa_jsonResponse(['driverBodyStyles' => $rows]);
}

// ============================================================================
// POST ?action=upsertDriverBodyStyle
// body: { id?, driverName, classIndex, bodyStyleId, effectiveFromUtc, effectiveToUtc? }
// ============================================================================

function handleUpsertDriverBodyStyle(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id              = isset($input['id']) ? (int)$input['id'] : null;
    $driverName      = strtoupper(trim($input['driverName'] ?? ''));
    $classIndex      = strtoupper(trim($input['classIndex'] ?? ''));
    $bodyStyleId     = (int)($input['bodyStyleId'] ?? 0);
    $effectiveFrom   = trim($input['effectiveFromUtc'] ?? '');
    $effectiveTo     = isset($input['effectiveToUtc']) && trim($input['effectiveToUtc']) !== '' ? trim($input['effectiveToUtc']) : null;

    if ($driverName === '' || $classIndex === '' || !$bodyStyleId || $effectiveFrom === '') {
        rsa_jsonResponse(['error' => 'driverName, classIndex, bodyStyleId, effectiveFromUtc are required'], 400);
    }

    // Validate body style exists
    $bsChk = $pdo->prepare("SELECT id FROM parity_body_styles WHERE id=?");
    $bsChk->execute([$bodyStyleId]);
    if (!$bsChk->fetch()) rsa_jsonResponse(['error' => 'Body style not found'], 404);

    if ($id) {
        if ($effectiveTo !== null && $effectiveTo <= $effectiveFrom) {
            rsa_jsonResponse(['error' => 'effectiveToUtc must be after effectiveFromUtc'], 400);
        }
        $pdo->prepare("UPDATE parity_driver_body_styles SET driver_name=?, class_index=?, body_style_id=?, effective_from_utc=?, effective_to_utc=? WHERE id=?")
            ->execute([$driverName, $classIndex, $bodyStyleId, $effectiveFrom, $effectiveTo, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        // New assignment — close any open prior assignment for this driver+class, then insert
        $pdo->beginTransaction();
        try {
            // Close open assignments
            $pdo->prepare("
                UPDATE parity_driver_body_styles
                SET effective_to_utc = ?
                WHERE driver_name = ? AND class_index = ?
                  AND effective_from_utc < ?
                  AND (effective_to_utc IS NULL OR effective_to_utc > ?)
            ")->execute([$effectiveFrom, $driverName, $classIndex, $effectiveFrom, $effectiveFrom]);

            // Find next assignment to set end date
            $nextStmt = $pdo->prepare("
                SELECT effective_from_utc FROM parity_driver_body_styles
                WHERE driver_name = ? AND class_index = ? AND effective_from_utc > ?
                ORDER BY effective_from_utc ASC LIMIT 1
            ");
            $nextStmt->execute([$driverName, $classIndex, $effectiveFrom]);
            $next = $nextStmt->fetch(PDO::FETCH_ASSOC);
            $endDate = $next ? $next['effective_from_utc'] : null;

            $pdo->prepare("INSERT INTO parity_driver_body_styles (driver_name, class_index, body_style_id, effective_from_utc, effective_to_utc) VALUES (?,?,?,?,?)")
                ->execute([$driverName, $classIndex, $bodyStyleId, $effectiveFrom, $endDate]);
            $newId = (int)$pdo->lastInsertId();
            $pdo->commit();
            rsa_jsonResponse(['ok' => true, 'id' => $newId]);
        } catch (Exception $e) {
            $pdo->rollBack();
            rsa_jsonResponse(['error' => 'Insert failed: ' . $e->getMessage()], 500);
        }
    }
}

// ============================================================================
// POST ?action=deleteDriverBodyStyle   body: { id }
// ============================================================================

function handleDeleteDriverBodyStyle(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $id = (int)($input['id'] ?? 0);
    if (!$id) rsa_jsonResponse(['error' => 'id is required'], 400);
    $pdo->prepare("DELETE FROM parity_driver_body_styles WHERE id=?")->execute([$id]);
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

    if ($id) {
        // Direct update of an existing row (admin timeline editor)
        if ($effectiveTo !== null && $effectiveTo <= $effectiveFrom) {
            rsa_jsonResponse(['error' => 'effectiveToUtc must be after effectiveFromUtc'], 400);
        }
        $pdo->prepare("UPDATE parity_driver_combos SET driver_name=?, class_index=?, engine_combo_id=?, effective_from_utc=?, effective_to_utc=? WHERE id=?")
            ->execute([$driverName, $classIndex, $engineComboId, $effectiveFrom, $effectiveTo, $id]);
        rsa_jsonResponse(['ok' => true, 'id' => $id]);
    } else {
        // New assignment — use timeline insert to handle overlaps cleanly
        $pdo->beginTransaction();
        try {
            $result = parity_timelineInsertCombo($pdo, $driverName, $classIndex, $engineComboId, $effectiveFrom);
            $pdo->commit();
            rsa_jsonResponse(['ok' => true, 'timeline' => $result]);
        } catch (Exception $e) {
            $pdo->rollBack();
            rsa_jsonResponse(['error' => 'Timeline insert failed: ' . $e->getMessage()], 500);
        }
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
    $replaced = 0;
    $skipped = 0;
    $errors = [];

    $pdo->beginTransaction();
    try {
        foreach ($items as $i => $item) {
            $driverName    = strtoupper(trim($item['driverName'] ?? ''));
            $classIndex    = strtoupper(trim($item['classIndex'] ?? ''));
            $engineComboId = (int)($item['engineComboId'] ?? 0);
            $effectiveFrom = trim($item['effectiveFromUtc'] ?? '');

            if ($driverName === '' || $classIndex === '' || !$engineComboId || $effectiveFrom === '') {
                $errors[] = "Item $i: missing required fields";
                $skipped++;
                continue;
            }

            $result = parity_timelineInsertCombo($pdo, $driverName, $classIndex, $engineComboId, $effectiveFrom);
            $created  += $result['created'];
            $closed   += $result['closed'];
            $replaced += $result['replaced'];
            $skipped  += $result['skipped'];
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
        'replaced' => $replaced,
        'skipped' => $skipped,
        'errors' => $errors,
    ]);
}

/**
 * Timeline Insert for driver combo assignments.
 *
 * Semantics: start-inclusive, end-exclusive.
 *   effective_from_utc = inclusive start
 *   effective_to_utc   = exclusive end (NULL = open/unbounded)
 *
 * Given (driver, class, combo, effectiveFrom):
 * 1) If an assignment starts exactly at effectiveFrom → replace it (update combo).
 * 2) If an assignment is active at effectiveFrom (started before, ends after or is open)
 *    → close it at effectiveFrom (set effective_to_utc = effectiveFrom).
 * 3) Find the next assignment that starts after effectiveFrom → new assignment ends there.
 *    If none, new assignment is open-ended (NULL).
 * 4) Insert the new assignment with [effectiveFrom, nextStart) or [effectiveFrom, NULL).
 *
 * Returns: ['created' => 0|1, 'closed' => 0|1, 'replaced' => 0|1, 'skipped' => 0|1]
 */
function parity_timelineInsertCombo(PDO $pdo, string $driverName, string $classIndex, int $engineComboId, string $effectiveFrom): array {
    $result = ['created' => 0, 'closed' => 0, 'replaced' => 0, 'skipped' => 0];

    // 1) Check for exact-match: assignment starting exactly at effectiveFrom
    $stmtExact = $pdo->prepare("
        SELECT id, engine_combo_id
        FROM parity_driver_combos
        WHERE driver_name = ? AND class_index = ? AND effective_from_utc = ?
        LIMIT 1
    ");
    $stmtExact->execute([$driverName, $classIndex, $effectiveFrom]);
    $exact = $stmtExact->fetch(PDO::FETCH_ASSOC);

    if ($exact) {
        if ((int)$exact['engine_combo_id'] === $engineComboId) {
            // Already has the same combo at this exact point — skip
            $result['skipped'] = 1;
            return $result;
        }
        // Replace: update the combo on the existing row (preserves its effective_to_utc)
        $pdo->prepare("UPDATE parity_driver_combos SET engine_combo_id = ? WHERE id = ?")
            ->execute([$engineComboId, $exact['id']]);
        $result['replaced'] = 1;
        return $result;
    }

    // 2) Find the assignment active at effectiveFrom
    //    Active means: started before effectiveFrom AND (ends after effectiveFrom OR is open)
    $stmtActive = $pdo->prepare("
        SELECT id, engine_combo_id, effective_from_utc, effective_to_utc
        FROM parity_driver_combos
        WHERE driver_name = ? AND class_index = ?
          AND effective_from_utc < ?
          AND (effective_to_utc IS NULL OR effective_to_utc > ?)
        ORDER BY effective_from_utc DESC
        LIMIT 1
    ");
    $stmtActive->execute([$driverName, $classIndex, $effectiveFrom, $effectiveFrom]);
    $active = $stmtActive->fetch(PDO::FETCH_ASSOC);

    if ($active && (int)$active['engine_combo_id'] === $engineComboId) {
        // The active assignment already has the same combo — skip
        $result['skipped'] = 1;
        return $result;
    }

    // Close the active assignment at effectiveFrom (end-exclusive)
    if ($active) {
        $pdo->prepare("UPDATE parity_driver_combos SET effective_to_utc = ? WHERE id = ?")
            ->execute([$effectiveFrom, $active['id']]);
        $result['closed'] = 1;
    }

    // 3) Find the next assignment that starts after effectiveFrom
    $stmtNext = $pdo->prepare("
        SELECT effective_from_utc
        FROM parity_driver_combos
        WHERE driver_name = ? AND class_index = ?
          AND effective_from_utc > ?
        ORDER BY effective_from_utc ASC
        LIMIT 1
    ");
    $stmtNext->execute([$driverName, $classIndex, $effectiveFrom]);
    $next = $stmtNext->fetch(PDO::FETCH_ASSOC);
    $newEnd = $next ? $next['effective_from_utc'] : null;

    // 4) Insert the new assignment
    $pdo->prepare("
        INSERT INTO parity_driver_combos (driver_name, class_index, engine_combo_id, effective_from_utc, effective_to_utc)
        VALUES (?, ?, ?, ?, ?)
    ")->execute([$driverName, $classIndex, $engineComboId, $effectiveFrom, $newEnd]);
    $result['created'] = 1;

    return $result;
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
// Shared: Rebuild canonical for a UTC time range with best-available logic.
// Multi-station cross-validation: fetches ALL tempest station samples per bucket,
// uses MEDIAN consensus when multiple stations report, flags outliers.
// Falls back to Open-Meteo only when no tempest stations have data.
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
    // Outlier thresholds: when a station deviates from median by more than this, it's excluded
    $OUTLIER_TEMP_F = 5.0;     // °F — tighter than old 10°F suspect threshold
    $OUTLIER_RH_PCT = 10.0;    // % — tighter than old 20% (catches the humidity drift)
    $OUTLIER_PRESS_INHG = 0.3; // inHg — tighter than old 0.5
    // Delta thresholds for suspect flagging (max spread across all stations)
    $DELTA_TEMP_SUSPECT = 10.0;    // °F
    $DELTA_RH_SUSPECT = 15.0;     // % — lowered from 20 to catch humidity issues earlier
    $DELTA_PRESS_SUSPECT = 0.5;    // inHg

    // Prepare queries
    // Get ALL tempest station samples nearest to bucket (one per source, closest in time)
    // This picks up tempest, tempest_156136, tempest_187092, tempest_136782, station, etc.
    $stmtStations = $pdo->prepare("
        SELECT temp_f, rh_pct, station_pressure_raw, timestamp_utc, source,
               ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) AS delta_s
        FROM parity_weather_samples
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
          AND (source LIKE 'tempest%' OR source = 'station')
        ORDER BY delta_s ASC
    ");

    // Get backup samples (Open-Meteo, CSV) nearest to bucket
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
    $consensusUsed = 0;
    $backupUsed = 0;
    $suspectCount = 0;
    $sanityFailed = 0;
    $outlierExcluded = 0;

    // Sanity check for a single reading
    $passesSanity = function($tf, $rh, $pi) use ($TEMP_MIN, $TEMP_MAX, $RH_MIN, $RH_MAX, $PRESS_MIN_INHG, $PRESS_MAX_INHG) {
        if ($tf === null || $rh === null || $pi === null) return false;
        if ($tf < $TEMP_MIN || $tf > $TEMP_MAX) return false;
        if ($rh < $RH_MIN || $rh > $RH_MAX) return false;
        if ($pi < $PRESS_MIN_INHG || $pi > $PRESS_MAX_INHG) return false;
        return true;
    };

    for ($epoch = $startEpoch; $epoch <= $endEpoch; $epoch += $bucketSeconds) {
        $bucketTs = gmdate('Y-m-d H:i:s', $epoch);

        // ── Fetch ALL tempest/station samples near this bucket ──
        $stmtStations->execute([$bucketTs, $bucketTs, $tolerance, $bucketTs, $tolerance]);
        $allStationRows = $stmtStations->fetchAll(PDO::FETCH_ASSOC);

        // Dedupe: keep only the closest sample per source
        $bestPerSource = [];
        foreach ($allStationRows as $row) {
            $src = $row['source'];
            if (!isset($bestPerSource[$src]) || (int)$row['delta_s'] < (int)$bestPerSource[$src]['delta_s']) {
                $bestPerSource[$src] = $row;
            }
        }

        // Parse each station's readings and apply per-station sanity
        $stationReadings = []; // [ ['source'=>..., 'tempF'=>..., 'rhPct'=>..., 'pressInhg'=>..., 'ok'=>bool], ... ]
        foreach ($bestPerSource as $src => $row) {
            $tf = ($row['temp_f'] !== null) ? (float)$row['temp_f'] : null;
            $rh = ($row['rh_pct'] !== null) ? (float)$row['rh_pct'] : null;
            $pm = ($row['station_pressure_raw'] !== null) ? (float)$row['station_pressure_raw'] : null;
            $pi = $pm !== null ? round($pm * 0.02953, 4) : null;
            $ok = $passesSanity($tf, $rh, $pi);
            $stationReadings[] = ['source' => $src, 'tempF' => $tf, 'rhPct' => $rh, 'pressInhg' => $pi, 'ok' => $ok];
        }

        // Filter to sane station readings
        $saneStations = array_filter($stationReadings, function($r) { return $r['ok']; });
        $saneStations = array_values($saneStations);

        // ── Fetch backup (Open-Meteo / CSV) ──
        $stmtBackup->execute([$bucketTs, $bucketTs, $tolerance, $bucketTs, $tolerance]);
        $backupSample = $stmtBackup->fetch(PDO::FETCH_ASSOC);
        $buTempF = $backupSample ? ($backupSample['temp_f'] !== null ? (float)$backupSample['temp_f'] : null) : null;
        $buRhPct = $backupSample ? ($backupSample['rh_pct'] !== null ? (float)$backupSample['rh_pct'] : null) : null;
        $buPressMb = $backupSample ? ($backupSample['station_pressure_raw'] !== null ? (float)$backupSample['station_pressure_raw'] : null) : null;
        $buPressInhg = $buPressMb !== null ? round($buPressMb * 0.02953, 4) : null;
        $backupOk = $backupSample && $passesSanity($buTempF, $buRhPct, $buPressInhg);

        if (count($saneStations) === 0 && !$backupOk) {
            // Try any station reading even if partially sane
            $anyStation = !empty($stationReadings) ? $stationReadings[0] : null;
            if ($anyStation && $anyStation['tempF'] !== null) {
                // Use it as suspect
                $useTempF = $anyStation['tempF'];
                $useRhPct = $anyStation['rhPct'];
                $usePressInhg = $anyStation['pressInhg'];
                $sourceKind = 'station_suspect';
                $sanityFailed++;
            } elseif ($backupSample && $buTempF !== null) {
                $useTempF = $buTempF;
                $useRhPct = $buRhPct;
                $usePressInhg = $buPressInhg;
                $sourceKind = 'backup_suspect';
                $sanityFailed++;
            } else {
                continue; // nothing usable
            }
        } elseif (count($saneStations) === 0 && $backupOk) {
            // No tempest data, use backup
            $useTempF = $buTempF;
            $useRhPct = $buRhPct;
            $usePressInhg = $buPressInhg;
            $sourceKind = 'backup';
            $backupUsed++;
        } elseif (count($saneStations) === 1) {
            // Single station — use it directly
            $s = $saneStations[0];
            $useTempF = $s['tempF'];
            $useRhPct = $s['rhPct'];
            $usePressInhg = $s['pressInhg'];
            $sourceKind = 'station';
            $stationUsed++;
        } else {
            // ── MULTI-STATION CONSENSUS (2+ stations) ──
            // Step 1: Compute median for each field across all sane stations
            $allTemp = array_map(function($r) { return $r['tempF']; }, $saneStations);
            $allRh = array_map(function($r) { return $r['rhPct']; }, $saneStations);
            $allPress = array_map(function($r) { return $r['pressInhg']; }, $saneStations);

            $medianTemp = parity_median($allTemp);
            $medianRh = parity_median($allRh);
            $medianPress = parity_median($allPress);

            // Step 2: Exclude outliers — stations that deviate from median beyond threshold
            $filteredStations = [];
            foreach ($saneStations as $s) {
                $isOutlier = false;
                if ($medianTemp !== null && abs($s['tempF'] - $medianTemp) > $OUTLIER_TEMP_F) $isOutlier = true;
                if ($medianRh !== null && abs($s['rhPct'] - $medianRh) > $OUTLIER_RH_PCT) $isOutlier = true;
                if ($medianPress !== null && abs($s['pressInhg'] - $medianPress) > $OUTLIER_PRESS_INHG) $isOutlier = true;

                if (!$isOutlier) {
                    $filteredStations[] = $s;
                } else {
                    $outlierExcluded++;
                }
            }

            // If all stations were excluded as outliers, fall back to the full set median
            if (empty($filteredStations)) {
                $filteredStations = $saneStations;
            }

            // Step 3: Compute final values from filtered set
            $finalTemp = array_map(function($r) { return $r['tempF']; }, $filteredStations);
            $finalRh = array_map(function($r) { return $r['rhPct']; }, $filteredStations);
            $finalPress = array_map(function($r) { return $r['pressInhg']; }, $filteredStations);

            $useTempF = round(parity_median($finalTemp), 2);
            $useRhPct = round(parity_median($finalRh), 2);
            $usePressInhg = round(parity_median($finalPress), 4);
            $sourceKind = 'consensus';
            $consensusUsed++;

            // Step 4: Check if the spread across stations is suspect
            $spreadTemp = max($allTemp) - min($allTemp);
            $spreadRh = max($allRh) - min($allRh);
            $spreadPress = max($allPress) - min($allPress);

            if ($spreadTemp > $DELTA_TEMP_SUSPECT ||
                $spreadRh > $DELTA_RH_SUSPECT ||
                $spreadPress > $DELTA_PRESS_SUSPECT) {
                $sourceKind = 'consensus_suspect';
                $suspectCount++;
            }
        }

        // Compute deltas (max spread across tempest stations, or station-vs-backup)
        $deltaTempF = null;
        $deltaRhPct = null;
        $deltaPressInhg = null;
        if (count($saneStations) >= 2) {
            $allTemp = array_map(function($r) { return $r['tempF']; }, $saneStations);
            $allRh = array_map(function($r) { return $r['rhPct']; }, $saneStations);
            $allPress = array_map(function($r) { return $r['pressInhg']; }, $saneStations);
            $deltaTempF = round(max($allTemp) - min($allTemp), 2);
            $deltaRhPct = round(max($allRh) - min($allRh), 2);
            $deltaPressInhg = round(max($allPress) - min($allPress), 4);
        } elseif (count($saneStations) === 1 && $backupOk) {
            $s = $saneStations[0];
            $deltaTempF = round($s['tempF'] - $buTempF, 2);
            $deltaRhPct = round($s['rhPct'] - $buRhPct, 2);
            $deltaPressInhg = round($s['pressInhg'] - $buPressInhg, 4);
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
        'consensusUsed' => $consensusUsed,
        'backupUsed' => $backupUsed,
        'suspectCount' => $suspectCount,
        'outlierExcluded' => $outlierExcluded,
        'sanityFailed' => $sanityFailed,
    ];
}

// ============================================================================
// POST ?action=updateTrackCoords
// Body: { trackId, latitude, longitude, slope_grade_pct? }
// ============================================================================

function handleUpdateTrackCoords(PDO $pdo, array $auth): void {
    requireAdminRole($auth);
    $input = rsa_getJsonInput();
    $trackId = (int)($input['trackId'] ?? 0);
    $lat = isset($input['latitude']) ? (float)$input['latitude'] : null;
    $lon = isset($input['longitude']) ? (float)$input['longitude'] : null;
    $slope = array_key_exists('slope_grade_pct', $input)
        ? ($input['slope_grade_pct'] !== null ? (float)$input['slope_grade_pct'] : null)
        : false; // false = not provided, don't update

    if ($trackId <= 0) rsa_jsonResponse(['error' => 'trackId is required'], 400);
    if ($lat === null || $lon === null) rsa_jsonResponse(['error' => 'latitude and longitude are required'], 400);
    if ($lat < -90 || $lat > 90) rsa_jsonResponse(['error' => 'latitude must be -90..90'], 400);
    if ($lon < -180 || $lon > 180) rsa_jsonResponse(['error' => 'longitude must be -180..180'], 400);

    if ($slope !== false) {
        $stmt = $pdo->prepare("UPDATE parity_tracks SET latitude = ?, longitude = ?, slope_grade_pct = ? WHERE id = ?");
        $stmt->execute([$lat, $lon, $slope, $trackId]);
    } else {
        $stmt = $pdo->prepare("UPDATE parity_tracks SET latitude = ?, longitude = ? WHERE id = ?");
        $stmt->execute([$lat, $lon, $trackId]);
    }

    if ($stmt->rowCount() === 0) {
        rsa_jsonResponse(['error' => 'Track not found or no change'], 404);
    }

    rsa_jsonResponse(['ok' => true, 'trackId' => $trackId, 'latitude' => $lat, 'longitude' => $lon,
                      'slope_grade_pct' => $slope !== false ? $slope : null]);
}

// ============================================================================
// GET ?action=slopeAnalysis&eventId=N&category=X&metric=Y&classIndex=Z
// Admin-only. Returns runs with raw, weather-corrected, and slope+weather
// corrected values so the analyst can evaluate the slope formula impact.
// ============================================================================

function handleSlopeAnalysis(PDO $pdo, array $auth): void {
    $eventId   = (int)($_GET['eventId']   ?? 0);
    $category  = trim($_GET['category']   ?? '');
    $metric    = trim($_GET['metric']     ?? 'et_1320');
    $classIndex = trim($_GET['classIndex'] ?? '');
    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId required'], 400);
    if ($category === '') rsa_jsonResponse(['error' => 'category required'], 400);

    $colMap = [
        'et_1320' => 'ft1320', 'mph_1320' => 'mph1320', 'rt' => 'rt',
        't60' => 'ft60', 't330' => 'ft330', 't660' => 'ft660',
        'mph_660' => 'mph660', 't1000' => 'ft1000', 'mph_1000' => 'mph1000',
    ];
    if (!array_key_exists($metric, $colMap)) rsa_jsonResponse(['error' => 'Invalid metric'], 400);
    $dbCol = $colMap[$metric];
    $isLowerBetter = !in_array($metric, ['mph_1320', 'mph_660', 'mph_1000']);

    // Load event + track slope
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.race_lookup,
               t.track_name, t.city, t.state, t.timezone_iana, t.slope_grade_pct
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id = ?
    ");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) rsa_jsonResponse(['error' => 'Event not found'], 404);

    $slopeGrade = ($event['slope_grade_pct'] !== null) ? (float)$event['slope_grade_pct'] : null;
    $weight     = parity_defaultWeight($category);
    $sfET       = $slopeGrade !== null ? parity_slopeFactorET($slopeGrade, $weight)  : null;
    $sfMPH      = $slopeGrade !== null ? parity_slopeFactorMPH($slopeGrade, $weight) : null;

    // Load runs
    $rParams = [$event['race_lookup']];
    $rWhere  = ['r.race_lookup = ?', 'r.category = ?'];
    $rParams[] = $category;
    if ($classIndex !== '') { $rWhere[] = 'r.class_index = ?'; $rParams[] = $classIndex; }
    $runStmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.driver_name, r.class_index, r.round, r.run_timestamp_utc,
               r.{$dbCol} AS raw_val, r.ft1320, r.mph1320
        FROM parity_runs r
        WHERE " . implode(' AND ', $rWhere) . "
        AND r.{$dbCol} IS NOT NULL AND r.{$dbCol} > 0
        ORDER BY r.run_timestamp_utc
    ");
    $runStmt->execute($rParams);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Load engine combos (keyed by id)
    $engineCombos = [];
    foreach ($pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos")->fetchAll(PDO::FETCH_ASSOC) as $ec) {
        $engineCombos[(int)$ec['id']] = $ec;
    }

    // Load driver combo assignments
    $driverCombos = $pdo->query("
        SELECT dc.driver_name, dc.class_index, dc.engine_combo_id, ec.name AS engine_combo_name,
               dc.effective_from_utc, dc.effective_to_utc
        FROM parity_driver_combos dc
        JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Load class defaults
    $classDefaults = $pdo->query("
        SELECT cd.class_index, cd.engine_combo_id, ec.name AS engine_combo_name,
               cd.effective_from_utc, cd.effective_to_utc
        FROM parity_class_defaults cd
        JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    // Weather query — use canonical table, 60-minute window
    $weatherWindow = 60;
    $stmtWeather = $pdo->prepare("
        SELECT temp_f, rh_pct, pressure_inhg
        FROM parity_weather_canonical
        WHERE timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
          AND temp_f IS NOT NULL AND rh_pct IS NOT NULL AND pressure_inhg IS NOT NULL
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, timestamp_utc, ?)) ASC
        LIMIT 1
    ");

    $rows = [];
    foreach ($runs as $run) {
        $rawVal = (float)$run['raw_val'];

        // Resolve engine combo for this run via driver assignment → class default fallback
        $comboId   = null;
        $comboLabel = 'Unknown';
        $runTs = $run['run_timestamp_utc'] ?? '';
        $dn = strtoupper(trim($run['driver_name'] ?? ''));
        $ci = strtoupper(trim($run['class_index'] ?? ''));

        // 1) Driver-specific assignment
        $bestFrom = '';
        foreach ($driverCombos as $dc) {
            if (strtoupper($dc['driver_name']) !== $dn) continue;
            if (strtoupper($dc['class_index']) !== $ci) continue;
            if ($runTs < $dc['effective_from_utc']) continue;
            if ($dc['effective_to_utc'] !== null && $runTs >= $dc['effective_to_utc']) continue;
            if ($dc['effective_from_utc'] >= $bestFrom) {
                $bestFrom  = $dc['effective_from_utc'];
                $comboId   = (int)$dc['engine_combo_id'];
                $comboLabel = $dc['engine_combo_name'];
            }
        }
        // 2) Class default fallback
        if ($comboId === null) {
            $bestFrom = '';
            foreach ($classDefaults as $cd) {
                if (strtoupper($cd['class_index']) !== $ci) continue;
                $from = $cd['effective_from_utc'] ?? '';
                if ($from !== '' && $runTs < $from) continue;
                if ($cd['effective_to_utc'] !== null && $runTs >= $cd['effective_to_utc']) continue;
                if ($from >= $bestFrom) {
                    $bestFrom   = $from;
                    $comboId    = (int)$cd['engine_combo_id'];
                    $comboLabel = $cd['engine_combo_name'];
                }
            }
        }

        // Weather correction
        $hpc = null;
        $wxVal = null;
        if ($run['run_timestamp_utc'] && $comboId && isset($engineCombos[$comboId])) {
            $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
            $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
            if ($wx) {
                $ec = $engineCombos[$comboId];
                $T  = (float)$wx['temp_f']; $H = (float)$wx['rh_pct'] / 100; $BP = (float)$wx['pressure_inhg'];
                $theta = ($T + 459.67) / 519.67;
                $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
                $delta = ($BP - $vp) / 29.92;
                $FF  = (float)$ec['friction_factor'];
                $hpc = (1 + $FF / 100) * (pow($theta, (float)$ec['t_power']) / pow($delta, (float)$ec['d_power'])) - $FF / 100;
                if (!($hpc > 0 && is_finite($hpc))) $hpc = null;
                else $wxVal = $isLowerBetter ? $rawVal * pow($hpc, -0.33) : $rawVal * pow($hpc, 0.33);
            }
        }

        // Slope + weather corrected
        $slopeWxVal = null;
        if ($sfET !== null && $sfMPH !== null) {
            $sf = $isLowerBetter ? $sfET : $sfMPH;
            $base = $wxVal ?? $rawVal;
            $slopeWxVal = round($base * $sf, 4);
        }

        $rows[] = [
            'runId'       => (int)$run['id'],
            'driver'      => $run['driver_name'],
            'classIndex'  => $run['class_index'],
            'round'       => $run['round'],
            'combo'       => $comboLabel,
            'rawVal'      => round($rawVal, 4),
            'wxVal'       => $wxVal !== null ? round($wxVal, 4) : null,
            'slopeWxVal'  => $slopeWxVal,
            'hpc'         => $hpc !== null ? round($hpc, 6) : null,
        ];
    }

    rsa_jsonResponse([
        'eventId'     => $eventId,
        'eventName'   => $event['event_name'],
        'trackName'   => $event['track_name'],
        'category'    => $category,
        'metric'      => $metric,
        'isLowerBetter' => $isLowerBetter,
        'slopeGradePct' => $slopeGrade,
        'weightLbs'   => $weight,
        'sfET'        => $sfET !== null ? round($sfET, 6) : null,
        'sfMPH'       => $sfMPH !== null ? round($sfMPH, 6) : null,
        'runs'        => $rows,
        'runCount'    => count($rows),
    ]);
}

// ============================================================================
// GET ?action=tempestCurrentWeather
// Returns current observations from all configured Tempest stations.
// No DB access needed — purely live API calls.
// ============================================================================

function handleTempestCurrentWeather(): void {
    try {
        $config = parity_getTempestConfig();
    } catch (RuntimeException $e) {
        rsa_jsonResponse(['error' => 'Tempest config: ' . $e->getMessage()], 500);
        return;
    }

    $stationIds = $config['station_ids'];
    $apiKey = $config['api_key'];
    $stations = [];
    $isFirst = true;

    foreach ($stationIds as $sid) {
        if (!$isFirst) usleep(200 * 1000); // 200ms throttle between calls
        $isFirst = false;

        // Use the station observation endpoint — returns current/latest observation
        $url = "https://swd.weatherflow.com/swd/rest/observations/station/{$sid}?api_key={$apiKey}";
        $r = parity_httpGetFull($url);

        if ($r['body'] === false || $r['httpCode'] < 200 || $r['httpCode'] >= 300) {
            $stations[] = parity_emptyStationResult($sid, "HTTP {$r['httpCode']}");
            continue;
        }

        $json = json_decode($r['body'], true);
        if (!$json) {
            $stations[] = parity_emptyStationResult($sid, 'Invalid JSON');
            continue;
        }

        // The station observation endpoint can return data in multiple formats:
        // Format A (historical/bucketed): { obs: [[ts,v1,v2,...]], ob_fields: ["timestamp","air_temperature",...] }
        // Format B (current station): { obs: [{ timestamp: N, air_temperature: N, ... }] }
        // Format C (station meta wrapper): { station: {...}, obs: [...], ... }
        $obs = $json['obs'] ?? [];
        $fields = $json['ob_fields'] ?? $json['fields'] ?? [];

        // If obs is empty, check for station_meta + obs combination
        if (empty($obs) && isset($json['station'])) {
            // Some station endpoints wrap differently
            $obs = $json['station']['obs'] ?? [];
        }

        if (empty($obs)) {
            $stations[] = parity_emptyStationResult($sid, 'No observations (keys: ' . implode(',', array_keys($json)) . ')');
            continue;
        }

        $latest = $obs[count($obs) - 1];

        // Detect format: if $latest is an associative array (object), use direct key access
        if (is_array($latest) && !empty($latest) && !isset($latest[0]) && array_keys($latest) !== range(0, count($latest) - 1)) {
            // Format B: obs is an array of objects with named keys
            $epoch = $latest['timestamp'] ?? $latest['time_epoch'] ?? null;
            $tempC = $latest['air_temperature'] ?? $latest['air_temp'] ?? null;
            $rh = $latest['relative_humidity'] ?? $latest['rh'] ?? null;
            $pressMb = $latest['station_pressure'] ?? $latest['pressure'] ?? null;

            if ($epoch !== null) $epoch = (int)$epoch;
            if ($tempC !== null) $tempC = (float)$tempC;
            if ($rh !== null) $rh = (float)$rh;
            if ($pressMb !== null) $pressMb = (float)$pressMb;
        } elseif (!empty($fields)) {
            // Format A: obs is array of numeric arrays, fields gives column names
            $fieldMap = [];
            foreach ($fields as $i => $name) {
                $fieldMap[strtolower($name)] = $i;
            }

            $tsIdx = $fieldMap['timestamp'] ?? $fieldMap['time_epoch'] ?? null;
            $tempIdx = $fieldMap['air_temperature'] ?? $fieldMap['air_temp'] ?? $fieldMap['temperature'] ?? null;
            $rhIdx = $fieldMap['relative_humidity'] ?? $fieldMap['rh'] ?? null;
            $pressIdx = $fieldMap['station_pressure'] ?? $fieldMap['pressure'] ?? $fieldMap['barometric_pressure'] ?? null;

            $epoch = ($tsIdx !== null && isset($latest[$tsIdx])) ? (int)$latest[$tsIdx] : null;
            $tempC = ($tempIdx !== null && isset($latest[$tempIdx]) && $latest[$tempIdx] !== null) ? (float)$latest[$tempIdx] : null;
            $rh = ($rhIdx !== null && isset($latest[$rhIdx]) && $latest[$rhIdx] !== null) ? (float)$latest[$rhIdx] : null;
            $pressMb = ($pressIdx !== null && isset($latest[$pressIdx]) && $latest[$pressIdx] !== null) ? (float)$latest[$pressIdx] : null;
        } else {
            // No fields and obs is numeric arrays — try positional fallback for Tempest obs_st layout
            // obs_st: [timestamp, wind_lull, wind_avg, wind_gust, wind_dir, wind_sample_interval,
            //          station_pressure, air_temperature, relative_humidity, illuminance, uv, solar_radiation,
            //          rain_over_prev_min, precip_type, avg_strike_dist, strike_count, battery, report_interval,
            //          local_day_rain, rain_final, local_day_rain_final, precip_analysis_type]
            $epoch = isset($latest[0]) ? (int)$latest[0] : null;
            $pressMb = isset($latest[6]) ? (float)$latest[6] : null;
            $tempC = isset($latest[7]) ? (float)$latest[7] : null;
            $rh = isset($latest[8]) ? (float)$latest[8] : null;
        }

        $tempF = $tempC !== null ? round($tempC * 9.0 / 5.0 + 32.0, 2) : null;
        $pressInhg = $pressMb !== null ? round($pressMb * 0.02953, 4) : null;

        $stations[] = [
            'stationId' => $sid,
            'error' => null,
            'temp_c' => $tempC !== null ? round($tempC, 2) : null,
            'temp_f' => $tempF,
            'rh_pct' => $rh !== null ? round($rh, 1) : null,
            'station_pressure_mb' => $pressMb !== null ? round($pressMb, 2) : null,
            'pressure_inhg' => $pressInhg,
            'timestamp_epoch' => $epoch,
            'timestamp_utc' => $epoch ? gmdate('Y-m-d H:i:s', $epoch) : null,
        ];
    }

    rsa_jsonResponse([
        'stations' => $stations,
        'fetchedAt' => gmdate('Y-m-d H:i:s'),
    ]);
}

/** Helper: empty station result with error message */
function parity_emptyStationResult(string $sid, string $error): array {
    return [
        'stationId' => $sid, 'error' => $error,
        'temp_f' => null, 'rh_pct' => null, 'pressure_inhg' => null,
        'temp_c' => null, 'station_pressure_mb' => null,
        'timestamp_epoch' => null, 'timestamp_utc' => null,
    ];
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
            'et'        => ($correctionFactor && $run['ft1320'] !== null)
                            ? round((float)$run['ft1320'] * pow($correctionFactor, -0.33), 4)
                            : ($run['ft1320'] !== null ? round((float)$run['ft1320'], 4) : null),
            'mph'       => ($correctionFactor && $run['mph1320'] !== null)
                            ? round((float)$run['mph1320'] * pow($correctionFactor, 0.33), 2)
                            : ($run['mph1320'] !== null ? round((float)$run['mph1320'], 2) : null),
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

        // totalAvg = average of runs within TOTAL_AVG_WITHIN_PCT of quickest (outlier filter)
        $TOTAL_AVG_WITHIN_PCT = 0.02; // 2% — easy to tune
        $totalAvg = null;
        $countTotalAvg = 0;
        if ($bestValue !== null && $countActive > 0) {
            $cutoff = $bestValue * (1 + $TOTAL_AVG_WITHIN_PCT);
            $filtered = $isLowerBetter
                ? array_filter($activeValues, fn($v) => $v <= $cutoff)
                : array_filter($activeValues, fn($v) => $v >= $bestValue * (1 - $TOTAL_AVG_WITHIN_PCT));
            $filtered = array_values($filtered);
            $countTotalAvg = count($filtered);
            if ($countTotalAvg > 0) {
                $totalAvg = round(array_sum($filtered) / $countTotalAvg, 4);
            }
        }

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
            'countTotalAvg'     => $countTotalAvg,
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
    $eventIdsRaw = trim($_GET['eventIds'] ?? '');
    $classIndex = trim($_GET['classIndex'] ?? '');
    $category = trim($_GET['category'] ?? '');
    $metric = trim($_GET['metric'] ?? 'et_1320');
    $mode = trim($_GET['mode'] ?? 'raw');
    $topN = max(1, min(20, (int)($_GET['topN'] ?? 4)));
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $includeFlagged = (bool)($_GET['includeFlagged'] ?? false);
    $includeUnknown = (bool)($_GET['includeUnknown'] ?? false);
    $groupBy = trim($_GET['groupBy'] ?? 'engineCombo');

    if (!in_array($groupBy, ['engineCombo', 'bodyStyle'])) rsa_jsonResponse(['error' => 'groupBy must be engineCombo or bodyStyle'], 400);
    // Support multi-event via eventIds (comma-separated) or single eventId
    $isMultiEvent = ($eventIdsRaw !== '');
    $eventIdList = [];
    if ($isMultiEvent) {
        $eventIdList = array_filter(array_map('intval', explode(',', $eventIdsRaw)), fn($id) => $id > 0);
        if (empty($eventIdList)) rsa_jsonResponse(['error' => 'eventIds must contain valid IDs'], 400);
        if (count($eventIdList) > 20) rsa_jsonResponse(['error' => 'Maximum 20 events allowed'], 400);
    } else {
        if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId or eventIds is required'], 400);
        $eventIdList = [$eventId];
    }
    if ($category === '' && $classIndex === '') rsa_jsonResponse(['error' => 'classIndex or category is required'], 400);

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

    // Load event(s)
    $evPH = implode(',', array_fill(0, count($eventIdList), '?'));
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.end_date_local, e.race_lookup,
               t.track_name, t.timezone_iana, t.city, t.state, t.latitude, t.longitude, t.slope_grade_pct
        FROM parity_events e JOIN parity_tracks t ON t.id = e.track_id WHERE e.id IN ($evPH)
        ORDER BY e.start_date_local DESC
    ");
    $evStmt->execute($eventIdList);
    $allEvents = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($allEvents)) rsa_jsonResponse(['error' => 'No events found'], 404);
    $raceLookups = array_filter(array_column($allEvents, 'race_lookup'));
    if (empty($raceLookups)) rsa_jsonResponse(['error' => 'No events have race_lookup'], 400);
    // For single event, use the event directly; for multi, build a summary
    $event = $allEvents[0]; // newest event for coords/timezone
    $eventId = (int)$event['id'];
    $raceLookupPH = implode(',', array_fill(0, count($raceLookups), '?'));

    // Category filter takes priority over classIndex
    $useCategory = ($category !== '');
    $classIndices = [];
    $classPlaceholders = '';
    if (!$useCategory) {
        $classIndices = parity_expandClassIndex($pdo, $classIndex);
        $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));
    }

    // When filtering by category, derive classIndex from actual runs so write paths (combo assignment) work
    $derivedClassIndex = $classIndex;

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

    // Load body style assignments if grouping by body style
    $driverBodyStyles = [];
    if ($groupBy === 'bodyStyle') {
        $driverBodyStyles = $pdo->query("
            SELECT dbs.driver_name, dbs.class_index, dbs.body_style_id, bs.name AS body_style_name,
                   dbs.effective_from_utc, dbs.effective_to_utc
            FROM parity_driver_body_styles dbs JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    // Session scope filter
    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // Fetch runs — use IN clause for multi-event race_lookups
    if ($useCategory) {
        $params = array_merge($raceLookups, [$category]);
        $classFilter = "r.category = ?";
    } else {
        $params = array_merge($raceLookups, $classIndices);
        $classFilter = "r.class_index IN ($classPlaceholders)";
    }
    $runStmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.run_timestamp_utc, r.driver_name, r.class_index,
               r.round, r.lane, r.car_number, r.rt, r.race_lookup,
               r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               COALESCE(r.dq_flag, 0) AS dq_flag,
               e.id AS event_id
        FROM parity_runs r
        JOIN parity_events e ON e.race_lookup = r.race_lookup
        WHERE r.race_lookup IN ($raceLookupPH) AND $classFilter
          AND COALESCE(r.dq_flag, 0) = 0 AND r.$dbCol IS NOT NULL AND r.$dbCol > 0
          $sessionFilter
        ORDER BY r.$dbCol $sortDir
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // When filtering by category, derive classIndex from actual run data so write paths (combo assignment) work
    if ($useCategory && !empty($runs) && $derivedClassIndex === '') {
        $derivedClassIndex = $runs[0]['class_index'] ?? '';
    }

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

        // Always resolve engine combo (needed for weather correction)
        $comboName = 'Unknown';
        $comboId = null;
        $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
        if ($resolved) {
            $comboName = $resolved['name'];
            $comboId = $resolved['id'];
        }

        // Resolve group label based on groupBy
        $groupLabel = 'Unknown';
        $groupId = null;
        if ($groupBy === 'bodyStyle') {
            $bsResolved = resolveBodyStyleForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverBodyStyles);
            if ($bsResolved) {
                $groupLabel = $bsResolved['name'];
                $groupId = $bsResolved['id'];
                $totalMapped++;
            } else {
                $totalUnmapped++;
                $dn = $run['driver_name'] ?? '(blank)';
                $unknownDriverCounts[$dn] = ($unknownDriverCounts[$dn] ?? 0) + 1;
            }
        } else {
            if ($resolved) {
                $groupLabel = $comboName;
                $groupId = $comboId;
                $totalMapped++;
            } else {
                $totalUnmapped++;
                $dn = $run['driver_name'] ?? '(blank)';
                $unknownDriverCounts[$dn] = ($unknownDriverCounts[$dn] ?? 0) + 1;
            }
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
            'classIndex' => $run['class_index'],
            'round' => $run['round'], 'lane' => $run['lane'], 'carNumber' => $run['car_number'],
            'timestamp' => $run['run_timestamp_utc'],
            'rawValue' => round($rawValue, 4), 'value' => round($value, 4),
            'correctionFactor' => $correctionFactor ? round($correctionFactor, 6) : null,
            'excluded' => $excluded, 'flagged' => $isFlagged, 'dqFlag' => (int)$run['dq_flag'],
            'weather' => $wxSnapshot,
            'engineCombo' => $groupLabel, 'engineComboId' => $groupId,
            'actualEngineCombo' => $comboName, // always the real engine combo regardless of groupBy
            'eventId' => isset($run['event_id']) ? (int)$run['event_id'] : null,
            'et' => ($correctionFactor && $run['ft1320'] !== null)
                ? round((float)$run['ft1320'] * pow($correctionFactor, -0.33), 4)
                : ($run['ft1320'] !== null ? round((float)$run['ft1320'], 4) : null),
            'mph' => ($correctionFactor && $run['mph1320'] !== null)
                ? round((float)$run['mph1320'] * pow($correctionFactor, 0.33), 2)
                : ($run['mph1320'] !== null ? round((float)$run['mph1320'], 2) : null),
        ];

        if (!isset($comboRuns[$groupLabel])) $comboRuns[$groupLabel] = ['id' => $groupId, 'runs' => []];
        $comboRuns[$groupLabel]['runs'][] = $entry;
        $allRunsFlat[] = $entry;
    }

    // Filter allEvents to only include events that have runs for this category
    $eventIdsWithRuns = array_unique(array_filter(array_column($allRunsFlat, 'eventId')));
    $allEvents = array_filter($allEvents, fn($ev) => in_array((int)$ev['id'], $eventIdsWithRuns));
    $allEvents = array_values($allEvents); // Re-index array

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
            'eventId' => $eventId, 'eventIds' => array_map('intval', array_column($allEvents, 'id')),
            'isMultiEvent' => $isMultiEvent, 'eventCount' => count($allEvents),
            'classIndex' => $derivedClassIndex, 'category' => $category,
            'metric' => $metric, 'groupBy' => $groupBy,
            'mode' => $mode, 'topN' => $topN, 'sessionScope' => $sessionScope,
            'includeFlagged' => $includeFlagged, 'includeUnknown' => $includeUnknown,
            'isLowerBetter' => $isLowerBetter,
        ],
        'event' => $isMultiEvent ? [
            'event_name' => count($allEvents) . ' Events Combined',
            'track_name' => 'Multiple',
            'city' => null, 'state' => null,
            'start_date_local' => end($allEvents)['start_date_local'],
            'end_date_local' => $allEvents[0]['end_date_local'],
        ] : [
            'event_name' => $event['event_name'], 'track_name' => $event['track_name'],
            'city' => $event['city'], 'state' => $event['state'],
            'start_date_local' => $event['start_date_local'], 'end_date_local' => $event['end_date_local'],
        ],
        'allEvents' => $isMultiEvent ? array_map(fn($ev) => [
            'id' => (int)$ev['id'], 'event_name' => $ev['event_name'],
            'event_code' => $ev['event_code'] ?? null,
            'track_name' => $ev['track_name'], 'start_date_local' => $ev['start_date_local'],
        ], $allEvents) : null,
        'trust' => [
            'weatherCoveragePct' => $weatherCoveragePct, 'correctedCoveragePct' => $correctedCoveragePct,
            'totalRunsInScope' => $totalRunsInScope, 'runsWithWeather' => $runsWithWeather,
            'runsWithCorrected' => $runsWithCorrected,
            'hasTrackCoords' => ($event['latitude'] !== null && $event['longitude'] !== null),
            'hasSlopeData'  => !empty(array_filter(array_column($allEvents, 'slope_grade_pct'), fn($v) => $v !== null)),
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
        // totalAvg = average of runs within 2% of quickest (outlier filter)
        $TOTAL_AVG_WITHIN_PCT = 0.02;
        $totalAvg = null;
        $countTotalAvg = 0;
        if ($bestValue !== null && $countActive > 0) {
            $cutoff = $bestValue * (1 + $TOTAL_AVG_WITHIN_PCT);
            $filtered = $isLowerBetter
                ? array_filter($activeValues, fn($v) => $v <= $cutoff)
                : array_filter($activeValues, fn($v) => $v >= $bestValue * (1 - $TOTAL_AVG_WITHIN_PCT));
            $filtered = array_values($filtered);
            $countTotalAvg = count($filtered);
            if ($countTotalAvg > 0) {
                $totalAvg = round(array_sum($filtered) / $countTotalAvg, 4);
            }
        }
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
            'countTotalAvg' => $countTotalAvg,
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
        'groupBy' => $p['groupBy'],
        'includeFlagged' => $p['includeFlagged'], 'includeUnknown' => $p['includeUnknown'],
        'isLowerBetter' => $p['isLowerBetter'],
        'isMultiEvent' => $p['isMultiEvent'] ?? false,
        'eventIds' => $p['eventIds'] ?? [],
        'eventCount' => $p['eventCount'] ?? 1,
        'event' => $d['event'], 'allEvents' => $d['allEvents'] ?? null,
        'trust' => $d['trust'], 'mapping' => $d['mapping'],
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

    // Always load body style assignments (used for secondary-group display)
    $driverBodyStyles = $pdo->query("
        SELECT dbs.driver_name, dbs.class_index, dbs.body_style_id, bs.name AS body_style_name,
               dbs.effective_from_utc, dbs.effective_to_utc
        FROM parity_driver_body_styles dbs JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
    ")->fetchAll(PDO::FETCH_ASSOC);

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
    // Always resolve body style (needed for secondary-group display in all categories)
    foreach ($qualOrder as $idx => &$qr) {
        $qr['qualPosition'] = $idx + 1;
        $bsResolved = resolveBodyStyleForRun($qr['driver'], $qr['classIndex'] ?? '', $qr['timestamp'] ?? '', $driverBodyStyles);
        $qr['bodyStyle']   = $bsResolved ? $bsResolved['name'] : null;
        $qr['bodyStyleId'] = $bsResolved ? (int)$bsResolved['id'] : null;
    }
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
    $category = trim($_GET['category'] ?? '');
    $metric = trim($_GET['metric'] ?? 'et_1320');
    $mode = trim($_GET['mode'] ?? 'raw');
    $topN = max(1, min(20, (int)($_GET['topN'] ?? 4)));
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $groupBy = trim($_GET['groupBy'] ?? 'engineCombo');
    if (!in_array($groupBy, ['engineCombo', 'bodyStyle'])) $groupBy = 'engineCombo';
    $year = isset($_GET['year']) ? (int)$_GET['year'] : null;
    $startDate = trim($_GET['startDate'] ?? '');
    $endDate = trim($_GET['endDate'] ?? '');

    if ($category === '' && $classIndex === '') rsa_jsonResponse(['error' => 'classIndex or category is required'], 400);

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
               t.track_name, t.city, t.state, t.slope_grade_pct
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

    // Category filter takes priority over classIndex
    $useCategory = ($category !== '');
    $classIndices = [];
    $classPlaceholders = '';
    if (!$useCategory) {
        $classIndices = parity_expandClassIndex($pdo, $classIndex);
        $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));
    }

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
    $driverBodyStyles = [];
    if ($groupBy === 'bodyStyle') {
        $driverBodyStyles = $pdo->query("
            SELECT dbs.driver_name, dbs.class_index, dbs.body_style_id, bs.name AS body_style_name,
                   dbs.effective_from_utc, dbs.effective_to_utc
            FROM parity_driver_body_styles dbs JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

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

        if ($useCategory) {
            $params = [$raceLookup, $category];
            $classFilter = "r.category = ?";
        } else {
            $params = array_merge([$raceLookup], $classIndices);
            $classFilter = "r.class_index IN ($classPlaceholders)";
        }
        $runStmt = $pdo->prepare("
            SELECT r.id, r.run_timestamp_utc, r.driver_name, r.class_index, r.$dbCol AS metric_val,
                   r.ft1320, r.mph1320, COALESCE(r.dq_flag, 0) AS dq_flag
            FROM parity_runs r
            WHERE r.race_lookup = ? AND $classFilter
              AND COALESCE(r.dq_flag, 0) = 0 AND r.$dbCol IS NOT NULL AND r.$dbCol > 0
              AND NOT EXISTS (SELECT 1 FROM parity_run_flags f WHERE f.run_id = r.id AND f.flag_type IN ('bad','exclude'))
              $sessionFilter
        ");
        $runStmt->execute($params);
        $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by combo or body style
        $comboValues = []; // groupName => [values]
        foreach ($runs as $run) {
            if ($groupBy === 'bodyStyle') {
                $resolved = resolveBodyStyleForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverBodyStyles);
                if (!$resolved) continue;
                $comboName = $resolved['name'];
                $comboId = null; // body styles don't use HPC correction
            } else {
                $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
                if (!$resolved) continue;
                $comboName = $resolved['name'];
                $comboId = $resolved['id'];
            }
            $allComboNames[$comboName] = true;

            $value = (float)$run['metric_val'];

            // Apply correction if needed (engine combo correction only; body style has no HPC)
            if ($mode === 'corrected' && $groupBy === 'engineCombo' && $run['run_timestamp_utc'] && $comboId !== null && isset($engineCombos[$comboId])) {
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
            // totalAvg = average of runs within 2% of quickest (outlier filter)
            $TOTAL_AVG_WITHIN_PCT = 0.02;
            $cutoff = $best * (1 + $TOTAL_AVG_WITHIN_PCT);
            $filtered = $isLowerBetter
                ? array_filter($vals, fn($v) => $v <= $cutoff)
                : array_filter($vals, fn($v) => $v >= $best * (1 - $TOTAL_AVG_WITHIN_PCT));
            $filtered = array_values($filtered);
            $totalAvg = count($filtered) > 0 ? round(array_sum($filtered) / count($filtered), 4) : null;
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
        'groupBy' => $groupBy,
        'isLowerBetter' => $isLowerBetter,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'events' => $outEvents,
        'combos' => $comboNamesSorted,
        'matrix' => $matrix, // eventId => groupName => {best, avgTopN, totalAvg, count}
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
    $eventIdsRaw = trim($_GET['eventIds'] ?? '');
    $classIndex = trim($_GET['classIndex'] ?? '');
    $category = trim($_GET['category'] ?? '');
    $sessionScope = trim($_GET['sessionScope'] ?? 'both');
    $mode = trim($_GET['mode'] ?? 'raw');
    $groupBy = trim($_GET['groupBy'] ?? 'engineCombo'); // 'engineCombo' or 'bodyStyle'
    $includeFlagged = (bool)($_GET['includeFlagged'] ?? false);
    $includeUnknown = (bool)($_GET['includeUnknown'] ?? false);
    if (!in_array($groupBy, ['engineCombo', 'bodyStyle'])) $groupBy = 'engineCombo';

    // Support multi-event via eventIds (comma-separated) or single eventId
    $eventIdList = [];
    if ($eventIdsRaw !== '') {
        $eventIdList = array_filter(array_map('intval', explode(',', $eventIdsRaw)), fn($id) => $id > 0);
        if (empty($eventIdList)) rsa_jsonResponse(['error' => 'eventIds must contain valid IDs'], 400);
    } else {
        if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId or eventIds is required'], 400);
        $eventIdList = [$eventId];
    }
    if ($category === '' && $classIndex === '') rsa_jsonResponse(['error' => 'classIndex or category is required'], 400);
    if (!in_array($sessionScope, ['qual', 'elim', 'both'])) rsa_jsonResponse(['error' => 'sessionScope must be qual, elim, or both'], 400);
    if (!in_array($mode, ['raw', 'corrected'])) $mode = 'raw';

    // Load event(s)
    $evPH = implode(',', array_fill(0, count($eventIdList), '?'));
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup
        FROM parity_events e WHERE e.id IN ($evPH)
    ");
    $evStmt->execute($eventIdList);
    $allEvents = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($allEvents)) rsa_jsonResponse(['error' => 'No events found'], 404);
    $raceLookups = array_filter(array_column($allEvents, 'race_lookup'));
    if (empty($raceLookups)) rsa_jsonResponse(['error' => 'No events have race_lookup'], 400);
    $raceLookupPH = implode(',', array_fill(0, count($raceLookups), '?'));

    $useCategory = ($category !== '');
    $classIndices = [];
    $classPlaceholders = '';
    if (!$useCategory) {
        $classIndices = parity_expandClassIndex($pdo, $classIndex);
        $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));
    }

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

    // Load body style assignments when grouping by body style
    $driverBodyStyles = [];
    if ($groupBy === 'bodyStyle') {
        $driverBodyStyles = $pdo->query("
            SELECT dbs.driver_name, dbs.class_index, dbs.body_style_id, bs.name AS body_style_name,
                   dbs.effective_from_utc, dbs.effective_to_utc
            FROM parity_driver_body_styles dbs JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
        ")->fetchAll(PDO::FETCH_ASSOC);
    }

    // Engine combos indexed by id (needed for corrected mode)
    $engineCombos = [];
    if ($mode === 'corrected') {
        $ecRows = $pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($ecRows as $ec) { $engineCombos[(int)$ec['id']] = $ec; }
    }

    // Weather lookup for corrected mode
    $weatherWindow = 30;
    $stmtWeather = null;
    if ($mode === 'corrected') {
        $stmtWeather = $pdo->prepare("
            SELECT cw.temp_f, cw.rh_pct, cw.pressure_inhg
            FROM parity_weather_canonical cw
            WHERE ABS(TIMESTAMPDIFF(MINUTE, cw.timestamp_utc, ?)) <= ?
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, cw.timestamp_utc, ?)) ASC LIMIT 1
        ");
    }

    $sessionFilter = '';
    if ($sessionScope === 'qual')      $sessionFilter = " AND r.round LIKE 'Q%'";
    elseif ($sessionScope === 'elim')  $sessionFilter = " AND r.round NOT LIKE 'Q%'";

    // Fetch ALL runs with incremental columns (no metric filter — we need all columns)
    if ($useCategory) {
        $params = array_merge($raceLookups, [$category]);
        $classFilter = "r.category = ?";
    } else {
        $params = array_merge($raceLookups, $classIndices);
        $classFilter = "r.class_index IN ($classPlaceholders)";
    }
    $runStmt = $pdo->prepare("
        SELECT r.id, r.run_timestamp_utc, r.driver_name, r.class_index,
               r.round, r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000, r.ft1320, r.mph1320,
               COALESCE(r.dq_flag, 0) AS dq_flag
        FROM parity_runs r
        WHERE r.race_lookup IN ($raceLookupPH) AND $classFilter
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
        ['label' => 'Last 1/8 ET',  'key' => 'backhalf_et',  'dbCol' => null, 'isLower' => true],
        ['label' => 'Last 1/8 MPH', 'key' => 'backhalf_mph', 'dbCol' => null, 'isLower' => false],
    ];

    // Group values by combo → incremental
    $comboIncrementals = []; // comboName => key => [values]
    $allComboNames = [];

    foreach ($runs as $run) {
        $runId = (int)$run['id'];
        $isFlagged = isset($flaggedIds[$runId]);
        if ($isFlagged && !$includeFlagged) continue;

        if ($groupBy === 'bodyStyle') {
            $resolved = resolveBodyStyleForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverBodyStyles);
            $comboName = $resolved ? $resolved['name'] : 'Unknown';
            $comboId = 0; // body styles don't use HPC correction
        } else {
            $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
            $comboName = $resolved ? $resolved['name'] : 'Unknown';
            $comboId = $resolved ? (int)$resolved['id'] : 0;
        }
        if ($comboName === 'Unknown' && !$includeUnknown) continue;

        // Compute HPC for corrected mode
        $hpc = null;
        if ($mode === 'corrected' && $comboId && isset($engineCombos[$comboId]) && $stmtWeather && $run['run_timestamp_utc']) {
            $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
            $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
            if ($wx && $wx['temp_f'] !== null && $wx['rh_pct'] !== null && $wx['pressure_inhg'] !== null) {
                $T = (float)$wx['temp_f']; $H = (float)$wx['rh_pct'] / 100; $BP = (float)$wx['pressure_inhg'];
                $ec = $engineCombos[$comboId];
                $tPow = (float)$ec['t_power']; $dPow = (float)$ec['d_power']; $FF = (float)$ec['friction_factor'];
                $theta = ($T + 459.67) / 519.67;
                $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
                $dap = $BP - $vp;
                $delta = $dap / 29.92;
                $h = (1 + $FF / 100) * (pow($theta, $tPow) / pow($delta, $dPow)) - $FF / 100;
                if ($h > 0 && is_finite($h)) $hpc = $h;
            }
        }

        $allComboNames[$comboName] = true;
        if (!isset($comboIncrementals[$comboName])) $comboIncrementals[$comboName] = [];

        foreach ($incrementals as $inc) {
            $val = null;
            // Calculate backhalf values
            if ($inc['key'] === 'backhalf_et') {
                if ($run['ft660'] !== null && $run['ft1320'] !== null) {
                    $val = (float)$run['ft1320'] - (float)$run['ft660'];
                }
            } elseif ($inc['key'] === 'backhalf_mph') {
                if ($run['mph1320'] !== null && $run['mph660'] !== null) {
                    $val = (float)$run['mph1320'] - (float)$run['mph660'];
                }
            } else {
                $val = $run[$inc['dbCol']];
            }
            
            if ($val !== null && (float)$val > 0) {
                $raw = (float)$val;
                if ($hpc !== null) {
                    $raw = $inc['isLower'] ? $raw * pow($hpc, -0.33) : $raw * pow($hpc, 0.33);
                }
                $comboIncrementals[$comboName][$inc['key']][] = $raw;
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
    $eventIdsRaw = trim($_GET['eventIds'] ?? '');
    $classIndex = trim($_GET['classIndex'] ?? '');
    $category = trim($_GET['category'] ?? '');

    // Support multi-event via eventIds (comma-separated) or single eventId
    $eventIdList = [];
    if ($eventIdsRaw !== '') {
        $eventIdList = array_filter(array_map('intval', explode(',', $eventIdsRaw)), fn($id) => $id > 0);
        if (empty($eventIdList)) rsa_jsonResponse(['error' => 'eventIds must contain valid IDs'], 400);
    } else {
        if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId or eventIds is required'], 400);
        $eventIdList = [$eventId];
    }
    if ($category === '' && $classIndex === '') rsa_jsonResponse(['error' => 'classIndex or category is required'], 400);

    // Load event(s) + track timezone
    $evPH = implode(',', array_fill(0, count($eventIdList), '?'));
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.race_lookup, t.latitude, t.longitude, t.timezone_iana
        FROM parity_events e
        JOIN parity_tracks t ON t.id = e.track_id
        WHERE e.id IN ($evPH)
        ORDER BY e.start_date_local DESC
    ");
    $evStmt->execute($eventIdList);
    $allEvents = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    if (empty($allEvents)) rsa_jsonResponse(['error' => 'No events found'], 404);
    $raceLookups = array_filter(array_column($allEvents, 'race_lookup'));
    if (empty($raceLookups)) rsa_jsonResponse(['error' => 'No events have race_lookup'], 400);
    $event = $allEvents[0]; // newest event for timezone
    $raceLookupPH = implode(',', array_fill(0, count($raceLookups), '?'));
    $trackTz = $event['timezone_iana'] ?? 'America/New_York';

    $useCategory = ($category !== '');
    if ($useCategory) {
        $params = array_merge($raceLookups, [$category]);
        $classFilter = "r.category = ?";
    } else {
        $classIndices = parity_expandClassIndex($pdo, $classIndex);
        $classPlaceholders = implode(',', array_fill(0, count($classIndices), '?'));
        $params = array_merge($raceLookups, $classIndices);
        $classFilter = "r.class_index IN ($classPlaceholders)";
    }

    // Fetch runs with timestamps, rounds, and local time.
    // Exclude orphan runs (missing run_time_local) from confidence denominators
    // — these have unverified UTC timestamps and would poison weather matching.
    $runStmt = $pdo->prepare("
        SELECT r.run_timestamp_utc, r.run_time_local, r.round
        FROM parity_runs r
        WHERE r.race_lookup IN ($raceLookupPH) AND $classFilter
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.run_timestamp_utc IS NOT NULL
          AND r.run_time_local IS NOT NULL
          AND r.round IS NOT NULL AND r.round != ''
        ORDER BY r.round, r.run_time_local
    ");
    $runStmt->execute($params);
    $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

    // Detect wind columns in canonical
    $wxHasWind = false;
    try {
        $wxColChk = $pdo->query("SHOW COLUMNS FROM parity_weather_canonical LIKE 'wind_speed_mph'");
        $wxHasWind = $wxColChk->rowCount() > 0;
    } catch (Exception $e) { /* ignore */ }

    // Weather lookup — returns offset_seconds for diagnostics
    $weatherWindow = 30;
    if ($wxHasWind) {
        $stmtWeather = $pdo->prepare("
            SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg, wc.wind_speed_mph, wc.wind_dir_deg,
                   ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) AS offset_seconds
            FROM parity_weather_canonical wc
            WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
        ");
    } else {
        $stmtWeather = $pdo->prepare("
            SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg,
                   ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) AS offset_seconds
            FROM parity_weather_canonical wc
            WHERE wc.timestamp_utc BETWEEN DATE_SUB(?, INTERVAL ? MINUTE) AND DATE_ADD(?, INTERVAL ? MINUTE)
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, wc.timestamp_utc, ?)) ASC LIMIT 1
        ");
    }

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
            'wind_speed_mph' => ($wxHasWind && isset($wx['wind_speed_mph']) && $wx['wind_speed_mph'] !== null) ? (float)$wx['wind_speed_mph'] : null,
            'wind_dir_deg' => ($wxHasWind && isset($wx['wind_dir_deg']) && $wx['wind_dir_deg'] !== null) ? (int)$wx['wind_dir_deg'] : null,
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

        // Wind: arithmetic avg speed, vector avg direction
        $windVals = array_filter(array_column($samples, 'wind_speed_mph'), fn($v) => $v !== null);
        $avgWindSpeed = count($windVals) > 0 ? round(array_sum($windVals) / count($windVals), 1) : null;
        $dirVals = array_filter(array_column($samples, 'wind_dir_deg'), fn($v) => $v !== null);
        if (count($dirVals) > 0) {
            $sinSum = 0; $cosSum = 0;
            foreach ($dirVals as $d) { $sinSum += sin(deg2rad($d)); $cosSum += cos(deg2rad($d)); }
            $avgWindDir = (int)round(rad2deg(atan2($sinSum, $cosSum)));
            if ($avgWindDir < 0) $avgWindDir += 360;
        } else {
            $avgWindDir = null;
        }

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
            $localTimeHint = ($first === $last) ? $first : $first . '–' . $last;
        }

        $rows[] = [
            'session' => $round,
            'runCount' => $n,
            'temp_f' => round($avgTemp, 1),
            'rh_pct' => round($avgRH, 1),
            'pressure_inhg' => round($avgPress, 3),
            'density_alt_ft' => (int)$densityAlt,
            'hpc' => round($hpc, 4),
            'wind_speed_mph' => $avgWindSpeed,
            'wind_dir_deg' => $avgWindDir,
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

/** Resolve body style for a run using driver body style assignments. */
function resolveBodyStyleForRun(?string $driverName, ?string $classIndex, ?string $runTs, array $driverBodyStyles): ?array {
    if (!$driverName || !$classIndex || !$runTs) return null;
    $dn = strtoupper($driverName);
    $ci = strtoupper($classIndex);
    $ts = strtotime($runTs);
    if ($ts === false) return null;

    $best = null;
    $bestFrom = 0;
    foreach ($driverBodyStyles as $dbs) {
        if (strtoupper($dbs['driver_name']) !== $dn) continue;
        if (strtoupper($dbs['class_index']) !== $ci) continue;
        $from = strtotime($dbs['effective_from_utc']);
        if ($ts < $from) continue;
        if ($dbs['effective_to_utc'] !== null) {
            $to = strtotime($dbs['effective_to_utc']);
            if ($ts >= $to) continue;
        }
        if ($from >= $bestFrom) {
            $bestFrom = $from;
            $best = ['id' => (int)$dbs['body_style_id'], 'name' => $dbs['body_style_name']];
        }
    }
    return $best;
}

// ============================================================================
// GET ?action=incrementalComparison
// Returns incremental time report matching NHRA Compulink printout format.
// Each row = one run with cumulative splits, incremental segments, and MPH.
// Sorted by 60ft time ascending (position number = sort rank).
// ============================================================================

function handleIncrementalComparison(PDO $pdo): void {
    $eventId = (int)($_GET['eventId'] ?? 0);
    $category = trim($_GET['category'] ?? '');
    $classIndex = trim($_GET['classIndex'] ?? '');
    $session = trim($_GET['session'] ?? ''); // 'qualifying' | 'elimination' | ''
    $mode = trim($_GET['mode'] ?? 'raw');    // 'raw' | 'corrected'

    if ($eventId <= 0) rsa_jsonResponse(['error' => 'eventId is required'], 400);
    if ($category === '' && $classIndex === '') rsa_jsonResponse(['error' => 'category or classIndex is required'], 400);
    if ($session !== '' && !in_array($session, ['qualifying', 'elimination'])) rsa_jsonResponse(['error' => 'session must be qualifying or elimination'], 400);
    if (!in_array($mode, ['raw', 'corrected'])) $mode = 'raw';

    // Load event to get race_lookup
    $evStmt = $pdo->prepare("SELECT race_lookup FROM parity_events WHERE id = ?");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event || !$event['race_lookup']) rsa_jsonResponse(['error' => 'Event not found or has no race_lookup'], 404);
    $raceLookup = $event['race_lookup'];

    // Build filters
    $params = [$raceLookup];
    $filters = [];
    if ($category !== '') {
        $filters[] = "r.category = ?";
        $params[] = $category;
    } else {
        $filters[] = "r.class_index = ?";
        $params[] = $classIndex;
    }
    if ($session !== '') {
        if ($session === 'qualifying') {
            $filters[] = "UPPER(r.round) LIKE 'Q%'";
        } else {
            $filters[] = "UPPER(r.round) NOT LIKE 'Q%'";
        }
    }
    $filterClause = $filters ? 'AND ' . implode(' AND ', $filters) : '';

    // ── Combo / body-style lookups (always needed for labels; also correction) ──
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
    $driverBodyStyles = $pdo->query("
        SELECT dbs.driver_name, dbs.class_index, dbs.body_style_id, bs.name AS body_style_name,
               dbs.effective_from_utc, dbs.effective_to_utc
        FROM parity_driver_body_styles dbs JOIN parity_body_styles bs ON bs.id = dbs.body_style_id
    ")->fetchAll(PDO::FETCH_ASSOC);

    $engineCombos = [];
    $stmtWeather = null;
    $weatherWindow = 30;
    if ($mode === 'corrected') {
        $ecRows = $pdo->query("SELECT id, name, t_power, d_power, friction_factor FROM parity_engine_combos")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($ecRows as $ec) { $engineCombos[(int)$ec['id']] = $ec; }
        $stmtWeather = $pdo->prepare("
            SELECT cw.temp_f, cw.rh_pct, cw.pressure_inhg
            FROM parity_weather_canonical cw
            WHERE ABS(TIMESTAMPDIFF(MINUTE, cw.timestamp_utc, ?)) <= ?
            ORDER BY ABS(TIMESTAMPDIFF(SECOND, cw.timestamp_utc, ?)) ASC LIMIT 1
        ");
    }

    // Fetch every run with valid ft1320
    $sql = "SELECT r.id, r.driver_name, r.car_number, r.class_index, r.lane,
                   r.round, r.run_timestamp_utc,
                   r.ft60, r.ft330, r.ft660, r.mph660,
                   r.ft1000, r.mph1000, r.ft1320, r.mph1320, r.dq_flag
            FROM parity_runs r
            WHERE r.race_lookup = ?
            $filterClause
            AND r.ft1320 IS NOT NULL AND r.ft1320 > 0
            ORDER BY r.ft60 ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast numeric fields & apply corrections
    $timeFields = ['ft60','ft330','ft660','ft1000','ft1320'];   // lower-is-better
    $mphFields  = ['mph660','mph1000','mph1320'];                // higher-is-better
    $numFields  = array_merge($timeFields, $mphFields);

    foreach ($runs as &$run) {
        foreach ($numFields as $f) {
            $run[$f] = $run[$f] !== null ? (float)$run[$f] : null;
        }

        // Apply HPC correction
        if ($mode === 'corrected' && $run['run_timestamp_utc']) {
            $resolved = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
            $comboId = $resolved ? (int)$resolved['id'] : 0;
            if ($comboId && isset($engineCombos[$comboId]) && $stmtWeather) {
                $stmtWeather->execute([$run['run_timestamp_utc'], $weatherWindow, $run['run_timestamp_utc']]);
                $wx = $stmtWeather->fetch(PDO::FETCH_ASSOC);
                if ($wx && $wx['temp_f'] !== null && $wx['rh_pct'] !== null && $wx['pressure_inhg'] !== null) {
                    $T = (float)$wx['temp_f']; $H = (float)$wx['rh_pct'] / 100; $BP = (float)$wx['pressure_inhg'];
                    $ec = $engineCombos[$comboId];
                    $tPow = (float)$ec['t_power']; $dPow = (float)$ec['d_power']; $FF = (float)$ec['friction_factor'];
                    $theta = ($T + 459.67) / 519.67;
                    $vp = $H * (29.98 / exp(35.83 * (212 - $T) / pow($T + 459.67, 1.152)));
                    $dap = $BP - $vp;
                    $delta = $dap / 29.92;
                    $h = (1 + $FF / 100) * (pow($theta, $tPow) / pow($delta, $dPow)) - $FF / 100;
                    if ($h > 0 && is_finite($h)) {
                        foreach ($timeFields as $tf) {
                            if ($run[$tf] !== null) $run[$tf] = round($run[$tf] * pow($h, -0.33), 4);
                        }
                        foreach ($mphFields as $mf) {
                            if ($run[$mf] !== null) $run[$mf] = round($run[$mf] * pow($h, 0.33), 4);
                        }
                    }
                }
            }
        }
    }
    unset($run);

    // Build rows matching printout columns
    $rows = [];
    $pos = 0;
    foreach ($runs as $run) {
        $pos++;
        $ft60  = $run['ft60'];
        $ft330 = $run['ft330'];
        $ft660 = $run['ft660'];
        $ft1000 = $run['ft1000'];
        $ft1320 = $run['ft1320'];

        // Incremental segments (cumulative-to-cumulative)
        $inc60_330   = ($ft60 !== null && $ft330 !== null)  ? round($ft330 - $ft60, 4)   : null;
        $inc330_660  = ($ft330 !== null && $ft660 !== null)  ? round($ft660 - $ft330, 4)  : null;
        $inc660_1000 = ($ft660 !== null && $ft1000 !== null) ? round($ft1000 - $ft660, 4) : null;
        $inc1000_1320= ($ft1000 !== null && $ft1320 !== null)? round($ft1320 - $ft1000, 4): null;
        // Last 1/8 = 660ft to 1320ft
        $last18      = ($ft660 !== null && $ft1320 !== null) ? round($ft1320 - $ft660, 4) : null;
        // Last 1/8 MPH increase = mph1320 - mph660
        $last18mph   = ($run['mph660'] !== null && $run['mph1320'] !== null) ? round($run['mph1320'] - $run['mph660'], 2) : null;

        // Resolve engine combo and body style names
        $resolvedCombo = resolveComboForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverCombos, $classDefaults);
        $resolvedBody  = resolveBodyStyleForRun($run['driver_name'], $run['class_index'], $run['run_timestamp_utc'], $driverBodyStyles);

        $rows[] = [
            'pos'          => $pos,
            'lane'         => $run['lane'],
            'carNumber'    => $run['car_number'],
            'driverName'   => $run['driver_name'],
            'round'        => $run['round'],
            'dqFlag'       => (bool)$run['dq_flag'],
            'runId'        => (int)$run['id'],
            'engineComboName' => $resolvedCombo ? $resolvedCombo['name'] : null,
            'bodyStyleName'   => $resolvedBody  ? $resolvedBody['name']  : null,
            'ft60'         => $ft60,
            'inc60_330'    => $inc60_330,
            'ft330'        => $ft330,
            'inc330_660'   => $inc330_660,
            'ft660'        => $ft660,
            'mph660'       => $run['mph660'],
            'inc660_1000'  => $inc660_1000,
            'ft1000'       => $ft1000,
            'mph1000'      => $run['mph1000'],
            'inc1000_1320' => $inc1000_1320,
            'last18'       => $last18,
            'last18mph'    => $last18mph,
            'ft1320'       => $ft1320,
            'mph1320'      => $run['mph1320'],
        ];
    }

    rsa_jsonResponse([
        'eventId'  => $eventId,
        'category' => $category ?: $classIndex,
        'session'  => $session,
        'mode'     => $mode,
        'totalRuns'=> count($rows),
        'rows'     => $rows,
    ]);
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

// ============================================================================
// POST ?action=updateRun
// Admin-only: Edit individual run fields (ET splits, MPH, RT, etc.)
// Body: { runId, fields: { ft60?, ft330?, ft660?, mph660?, ft1000?, mph1000?, ft1320?, mph1320?, rt? } }
// ============================================================================
function handleUpdateRun(PDO $pdo, ?array $auth): void {
    if (!$auth) rsa_jsonResponse(['error' => 'Authentication required'], 401);
    $caps = $auth['capabilities'] ?? [];
    if (!in_array('nhra.parity.admin', $caps)) {
        rsa_jsonResponse(['error' => 'Forbidden: nhra.parity.admin required'], 403);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) rsa_jsonResponse(['error' => 'Invalid JSON body'], 400);

    $runId = (int)($body['runId'] ?? 0);
    $fields = $body['fields'] ?? [];
    if ($runId <= 0) rsa_jsonResponse(['error' => 'runId is required'], 400);
    if (!is_array($fields) || empty($fields)) rsa_jsonResponse(['error' => 'fields object is required and must be non-empty'], 400);

    // Whitelist of editable columns by type
    $numericFields = ['rt', 'ft60', 'ft330', 'ft660', 'mph660', 'ft1000', 'mph1000', 'ft1320', 'mph1320', 'dial_in', 'mov'];
    $stringFields  = ['driver_name', 'car_number', 'lane', 'round', 'category', 'class_index'];
    $boolFields    = ['win_flag', 'dq_flag'];
    $allowed = array_merge($numericFields, $stringFields, $boolFields);

    $setClauses = [];
    $params = [];
    foreach ($fields as $col => $val) {
        if (!in_array($col, $allowed)) {
            rsa_jsonResponse(['error' => "Field '$col' is not editable"], 400);
        }
        if (in_array($col, $numericFields)) {
            if ($val === null || $val === '') {
                $setClauses[] = "$col = NULL";
            } else {
                $numVal = (float)$val;
                if ($numVal < -100 || $numVal > 1000) {
                    rsa_jsonResponse(['error' => "Field '$col' value out of range (-100 to 1000)"], 400);
                }
                $setClauses[] = "$col = ?";
                $params[] = round($numVal, 4);
            }
        } elseif (in_array($col, $stringFields)) {
            if ($val === null || $val === '') {
                $setClauses[] = "$col = NULL";
            } else {
                $trimmed = trim((string)$val);
                if (strlen($trimmed) > 255) {
                    rsa_jsonResponse(['error' => "Field '$col' exceeds max length (255)"], 400);
                }
                $setClauses[] = "$col = ?";
                $params[] = $trimmed;
            }
        } elseif (in_array($col, $boolFields)) {
            if ($val === null) {
                $setClauses[] = "$col = NULL";
            } else {
                $setClauses[] = "$col = ?";
                $params[] = $val ? 1 : 0;
            }
        }
    }

    // Verify run exists and capture old values for audit
    $oldStmt = $pdo->prepare("SELECT id, driver_name, race_lookup, " . implode(', ', $allowed) . " FROM parity_runs WHERE id = ?");
    $oldStmt->execute([$runId]);
    $oldRun = $oldStmt->fetch(PDO::FETCH_ASSOC);
    if (!$oldRun) rsa_jsonResponse(['error' => 'Run not found'], 404);

    // Apply update
    $params[] = $runId;
    $sql = "UPDATE parity_runs SET " . implode(', ', $setClauses) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Audit log
    if (function_exists('rsa_audit')) {
        $changes = [];
        foreach ($fields as $col => $val) {
            $oldVal = $oldRun[$col] ?? null;
            $changes[$col] = ['old' => $oldVal, 'new' => $val];
        }
        rsa_audit($pdo, $auth['user_id'] ?? 0, 'parity.updateRun', [
            'runId' => $runId,
            'driver' => $oldRun['driver_name'],
            'raceLookup' => $oldRun['race_lookup'],
            'changes' => $changes,
        ]);
    }

    rsa_jsonResponse([
        'ok' => true,
        'runId' => $runId,
        'updatedFields' => array_keys($fields),
    ]);
}

// ============================================================================
// ANOMALY ANALYSIS ENGINE
// ============================================================================
//
// Server-side timing-data confidence and anomaly detection.
// Three layers:
//   Layer 1: Hard integrity checks (missing splits, non-monotonic, zero/negative)
//   Layer 2: Local shape / adjacent-split consistency
//   Layer 3: Historical baseline comparison (robust stats, hierarchical peers)
//
// Mirrors the TypeScript engine in src/domain/parity/anomalyEngine.ts but
// runs server-side as the authoritative source of truth.
//
// NITRO CLASS CONVENTION:
// Top Fuel and Funny Car run to 1000 ft. The timing system often reports
// the effective finish time/mph in ft1320/mph1320 fields with ft1000 blank.
// This is a known convention, NOT corrupt data.
// ============================================================================

// ── Nitro Class Detection ────────────────────────────────────────────────

function anomaly_isNitroClass(array $run): bool {
    $cat = strtoupper(trim($run['category'] ?? ''));
    $cls = strtoupper(trim($run['class_index'] ?? ''));
    return in_array($cat, ['TOP FUEL', 'FUNNY CAR'], true)
        || in_array($cls, ['TF', 'FC', 'TFD'], true);
}

// ── Normalized Finish Model ──────────────────────────────────────────────

function anomaly_resolveFinish(array $run): array {
    $nitro = anomaly_isNitroClass($run);
    $g = function(string $f) use ($run): ?float {
        $v = $run[$f] ?? null;
        return ($v !== null && (float)$v > 0) ? (float)$v : null;
    };

    if ($nitro) {
        $ft1000 = $g('ft1000');
        $mph1000 = $g('mph1000');
        $ft1320 = $g('ft1320');
        $mph1320 = $g('mph1320');

        if ($ft1000 !== null) {
            return [
                'effectiveFinishDistance' => 1000,
                'effectiveFinishTime' => $ft1000,
                'effectiveFinishMph' => $mph1000 ?? $mph1320,
                'finishTimeField' => 'ft1000',
                'finishMphField' => $mph1000 !== null ? 'mph1000' : 'mph1320',
                'isNitro' => true,
            ];
        }
        return [
            'effectiveFinishDistance' => 1000,
            'effectiveFinishTime' => $ft1320,
            'effectiveFinishMph' => $mph1320,
            'finishTimeField' => 'ft1320',
            'finishMphField' => 'mph1320',
            'isNitro' => true,
        ];
    }

    return [
        'effectiveFinishDistance' => 1320,
        'effectiveFinishTime' => $g('ft1320'),
        'effectiveFinishMph' => $g('mph1320'),
        'finishTimeField' => 'ft1320',
        'finishMphField' => 'mph1320',
        'isNitro' => false,
    ];
}

// ── Timing Fields & Intervals ────────────────────────────────────────────

/** Cumulative split field names in track-distance order */
function anomaly_cumulativeFields(): array {
    return ['ft60', 'ft330', 'ft660', 'ft1000', 'ft1320'];
}

/** All timing fields we analyze */
function anomaly_timingFields(): array {
    return ['ft60', 'ft330', 'ft660', 'ft1000', 'ft1320', 'mph660', 'mph1320', 'rt'];
}

/** Full-quarter interval segments */
function anomaly_intervalSegmentsFull(): array {
    return [
        ['key' => 't_0_60',      'label' => '0–60 ft',     'from' => null,     'to' => 'ft60'],
        ['key' => 't_60_330',    'label' => '60–330 ft',   'from' => 'ft60',   'to' => 'ft330'],
        ['key' => 't_330_660',   'label' => '330–660 ft',  'from' => 'ft330',  'to' => 'ft660'],
        ['key' => 't_660_1000',  'label' => '660–1000 ft', 'from' => 'ft660',  'to' => 'ft1000'],
        ['key' => 't_1000_1320', 'label' => '1000–ET',     'from' => 'ft1000', 'to' => 'ft1320'],
    ];
}

/** Nitro class interval segments — uses 660–finish */
function anomaly_intervalSegmentsNitro(): array {
    return [
        ['key' => 't_0_60',       'label' => '0–60 ft',     'from' => null,    'to' => 'ft60'],
        ['key' => 't_60_330',     'label' => '60–330 ft',   'from' => 'ft60',  'to' => 'ft330'],
        ['key' => 't_330_660',    'label' => '330–660 ft',  'from' => 'ft330', 'to' => 'ft660'],
        ['key' => 't_660_finish', 'label' => '660–Finish',  'from' => 'ft660', 'to' => '_finish'],
    ];
}

/** Get class-aware interval segments for a run */
function anomaly_getIntervalSegments(array $run): array {
    return anomaly_isNitroClass($run) ? anomaly_intervalSegmentsNitro() : anomaly_intervalSegmentsFull();
}

/** Backward-compat alias */
function anomaly_intervalSegments(): array {
    return anomaly_intervalSegmentsFull();
}

/** Penalty weights by severity */
function anomaly_severityPenalty(string $sev): int {
    return ['critical' => 25, 'high' => 15, 'medium' => 8, 'low' => 3, 'info' => 0][$sev] ?? 0;
}

function anomaly_confidenceBand(int $score): string {
    if ($score >= 80) return 'High';
    if ($score >= 55) return 'Medium';
    if ($score >= 30) return 'Low';
    return 'Critical';
}

/** Compute derived intervals from a run row */
function anomaly_computeIntervals(array $run): array {
    $g = function(string $f) use ($run): ?float {
        $v = $run[$f] ?? null;
        return ($v !== null && (float)$v > 0) ? (float)$v : null;
    };
    $sub = function(?float $a, ?float $b): ?float {
        return ($a !== null && $b !== null && $a > $b) ? round($a - $b, 6) : null;
    };
    $finish = anomaly_resolveFinish($run);
    return [
        't_0_60'       => $g('ft60'),
        't_60_330'     => $sub($g('ft330'), $g('ft60')),
        't_330_660'    => $sub($g('ft660'), $g('ft330')),
        't_660_1000'   => $sub($g('ft1000'), $g('ft660')),
        't_1000_1320'  => $sub($g('ft1320'), $g('ft1000')),
        't_660_finish' => $sub($finish['effectiveFinishTime'], $g('ft660')),
    ];
}

// ── Robust Statistics ────────────────────────────────────────────────────

function anomaly_median(array $sorted): float {
    $n = count($sorted);
    if ($n === 0) return 0;
    if ($n % 2 === 1) return $sorted[intdiv($n, 2)];
    return ($sorted[$n / 2 - 1] + $sorted[$n / 2]) / 2;
}

function anomaly_mad(array $values): array {
    if (empty($values)) return ['median' => 0, 'mad' => 0];
    sort($values);
    $med = anomaly_median($values);
    $deviations = array_map(fn($v) => abs($v - $med), $values);
    sort($deviations);
    return ['median' => $med, 'mad' => anomaly_median($deviations)];
}

function anomaly_iqrBounds(array $values, float $k = 1.5): array {
    sort($values);
    $n = count($values);
    $q1 = $values[(int)floor($n * 0.25)];
    $q3 = $values[(int)floor($n * 0.75)];
    $iqr = $q3 - $q1;
    return ['q1' => $q1, 'q3' => $q3, 'lower' => $q1 - $k * $iqr, 'upper' => $q3 + $k * $iqr];
}

function anomaly_modifiedZScore(float $value, float $med, float $madVal): float {
    if ($madVal == 0) return 0;
    return 0.6745 * ($value - $med) / $madVal;
}

// ── Layer 1: Hard Integrity ──────────────────────────────────────────────

function anomaly_layer1(array $run, array $intervals): array {
    $flags = [];
    $nitro = anomaly_isNitroClass($run);
    $finish = anomaly_resolveFinish($run);
    $timingFields = anomaly_timingFields();

    $g = function(string $f) use ($run): ?float {
        $v = $run[$f] ?? null;
        return ($v !== null) ? (float)$v : null;
    };

    // Missing intermediate splits — nitro: ft1000 blank is OK
    $expectedChain = $nitro
        ? ['ft60', 'ft330', 'ft660']
        : ['ft60', 'ft330', 'ft660', 'ft1000', 'ft1320'];

    $splits = [];
    foreach ($expectedChain as $f) {
        $splits[] = ['field' => $f, 'val' => $g($f)];
    }
    $lastPresent = -1;
    for ($i = count($splits) - 1; $i >= 0; $i--) {
        if ($splits[$i]['val'] !== null) { $lastPresent = $i; break; }
    }
    if ($finish['effectiveFinishTime'] !== null && $lastPresent < 0) $lastPresent = 0;
    if ($lastPresent > 0) {
        for ($i = 0; $i < $lastPresent; $i++) {
            if ($splits[$i]['val'] === null) {
                $flags[] = [
                    'code' => 'MISSING_SPLIT_VALUE', 'severity' => 'high',
                    'field' => $splits[$i]['field'],
                    'explanation' => "{$splits[$i]['field']} is missing but later splits exist",
                ];
            }
        }
    }

    // Zero or negative timing (rt excluded — can be negative for fouls)
    foreach ($timingFields as $f) {
        if ($f === 'rt') continue;
        $v = $g($f);
        if ($v !== null && $v <= 0) {
            $flags[] = [
                'code' => 'ZERO_OR_NEGATIVE_TIMING', 'severity' => 'critical',
                'field' => $f, 'value' => $v,
                'explanation' => "$f = $v is zero or negative",
            ];
        }
    }

    // Non-monotonic cumulative splits — class-aware pairs
    $pairs = $nitro
        ? [['ft60','ft330'],['ft330','ft660']]
        : [['ft60','ft330'],['ft330','ft660'],['ft660','ft1000'],['ft1000','ft1320']];

    // For nitro, also check ft660 < finish
    if ($nitro && $finish['effectiveFinishTime'] !== null && $g('ft660') !== null) {
        $ft660 = $g('ft660');
        if ($finish['effectiveFinishTime'] <= $ft660) {
            $flags[] = [
                'code' => 'NON_MONOTONIC_SPLITS', 'severity' => 'critical',
                'field' => $finish['finishTimeField'],
                'value' => $finish['effectiveFinishTime'],
                'expected' => "> $ft660 (ft660)",
                'explanation' => "Finish time ({$finish['effectiveFinishTime']}) in {$finish['finishTimeField']} is not greater than ft660 ($ft660)",
            ];
        }
    }
    foreach ($pairs as [$earlier, $later]) {
        $vE = $g($earlier);
        $vL = $g($later);
        if ($vE !== null && $vL !== null && $vL <= $vE) {
            $flags[] = [
                'code' => 'NON_MONOTONIC_SPLITS', 'severity' => 'critical',
                'field' => $later, 'value' => $vL,
                'expected' => "> $vE ($earlier)",
                'explanation' => "$later ($vL) is not greater than $earlier ($vE)",
            ];
        }
    }

    // Invalid derived intervals — class-aware segments
    foreach (anomaly_getIntervalSegments($run) as $seg) {
        $v = $intervals[$seg['key']] ?? null;
        if ($v !== null && $v <= 0) {
            $flags[] = [
                'code' => 'INVALID_INTERVAL', 'severity' => 'critical',
                'field' => $seg['key'], 'value' => $v,
                'explanation' => "Interval {$seg['label']} = " . round($v, 4) . "s is not positive",
            ];
        }
    }

    // Duplicate split values — use expected chain + finish
    $dupFields = [];
    foreach ($expectedChain as $f) {
        $dupFields[] = ['field' => $f, 'val' => $g($f)];
    }
    if ($finish['effectiveFinishTime'] !== null) {
        $dupFields[] = ['field' => $finish['finishTimeField'], 'val' => $finish['effectiveFinishTime']];
    }
    $presentSplits = array_values(array_filter($dupFields, fn($s) => $s['val'] !== null));
    for ($i = 0; $i < count($presentSplits); $i++) {
        for ($j = $i + 1; $j < count($presentSplits); $j++) {
            if ($presentSplits[$i]['val'] == $presentSplits[$j]['val'] && $presentSplits[$i]['field'] !== $presentSplits[$j]['field']) {
                $flags[] = [
                    'code' => 'DUPLICATE_SPLIT_VALUES', 'severity' => 'high',
                    'field' => "{$presentSplits[$i]['field']}/{$presentSplits[$j]['field']}",
                    'value' => $presentSplits[$i]['val'],
                    'explanation' => "{$presentSplits[$i]['field']} and {$presentSplits[$j]['field']} have identical values ({$presentSplits[$i]['val']})",
                ];
            }
        }
    }

    // Incomplete run — use normalized finish
    if ($finish['effectiveFinishTime'] === null && $g('ft60') === null) {
        $flags[] = [
            'code' => 'INCOMPLETE_RUN_DATA', 'severity' => 'medium',
            'explanation' => 'Run has no timing data (no 60 ft, no finish ET)',
        ];
    } elseif ($finish['effectiveFinishTime'] === null) {
        $flags[] = [
            'code' => 'INCOMPLETE_RUN_DATA', 'severity' => 'medium',
            'explanation' => 'Run has no finish ET — likely an aborted or partial run',
        ];
    }

    return $flags;
}

// ── Layer 2: Shape Consistency ───────────────────────────────────────────

function anomaly_layer2(array $run, array $intervals): array {
    $flags = [];
    $segments = anomaly_getIntervalSegments($run);

    $present = [];
    foreach ($segments as $seg) {
        $v = $intervals[$seg['key']] ?? null;
        if ($v !== null && $v > 0) {
            $present[] = ['key' => $seg['key'], 'val' => $v, 'label' => $seg['label']];
        }
    }

    if (count($present) < 3) return $flags;

    // Check each interval against neighbors
    $nitro = anomaly_isNitroClass($run);
    for ($i = 0; $i < count($present); $i++) {
        // Skip shape ratio for nitro's final segment — the 660→finish gap is
        // structurally much shorter than earlier segments (1000 ft race vs 1320 ft)
        if ($nitro && $present[$i]['key'] === 't_660_finish') continue;

        $neighbors = [];
        if ($i > 0 && !($nitro && $present[$i - 1]['key'] === 't_660_finish')) $neighbors[] = $present[$i - 1]['val'];
        if ($i < count($present) - 1 && !($nitro && $present[$i + 1]['key'] === 't_660_finish')) $neighbors[] = $present[$i + 1]['val'];
        if (empty($neighbors)) continue;

        $avgNeighbor = array_sum($neighbors) / count($neighbors);
        $ratio = $present[$i]['val'] / $avgNeighbor;

        if ($ratio > 3.0 || $ratio < 0.15) {
            $flags[] = [
                'code' => 'SEGMENT_SHAPE_INCONSISTENT', 'severity' => 'high',
                'field' => $present[$i]['key'], 'value' => $present[$i]['val'],
                'expected' => '~' . round($avgNeighbor, 4) . 's based on adjacent segments',
                'explanation' => "{$present[$i]['label']} (" . round($present[$i]['val'], 4) . "s) is " . round($ratio, 1) . "x adjacent segments — likely isolated timing error",
            ];
        } elseif ($ratio > 2.2 || $ratio < 0.25) {
            $flags[] = [
                'code' => 'SEGMENT_SHAPE_INCONSISTENT', 'severity' => 'medium',
                'field' => $present[$i]['key'], 'value' => $present[$i]['val'],
                'expected' => '~' . round($avgNeighbor, 4) . 's based on adjacent segments',
                'explanation' => "{$present[$i]['label']} (" . round($present[$i]['val'], 4) . "s) is " . round($ratio, 1) . "x adjacent segments — somewhat unusual",
            ];
        }
    }

    // mph vs finish mph consistency — use normalized finish
    $finish = anomaly_resolveFinish($run);
    $mph660 = isset($run['mph660']) ? (float)$run['mph660'] : null;
    $finishMph = $finish['effectiveFinishMph'];
    if ($mph660 !== null && $finishMph !== null && $mph660 > 0 && $finishMph > 0) {
        if ($finishMph < $mph660 * 0.5) {
            $flags[] = [
                'code' => 'MPH_ET_INCONSISTENT', 'severity' => 'medium',
                'field' => $finish['finishMphField'], 'value' => $finishMph,
                'expected' => '>= ~' . round($mph660 * 0.7, 1) . ' mph based on 660 mph',
                'explanation' => "Finish mph ($finishMph) is less than half of 660 mph ($mph660) — possible timing/recording issue or mid-track shutoff",
            ];
        }
    }

    return $flags;
}

// ── Layer 3: Historical Baseline ─────────────────────────────────────────

/** Build baseline stats from clean peer population */
function anomaly_buildBaselines(array $cleanRuns): array {
    $stats = [];
    $timingFields = anomaly_timingFields();

    foreach ($timingFields as $f) {
        $values = [];
        foreach ($cleanRuns as $r) {
            $v = $r[$f] ?? null;
            if ($v !== null && (float)$v > 0) $values[] = (float)$v;
        }
        if (count($values) < 3) continue;
        $m = anomaly_mad($values);
        $bounds = anomaly_iqrBounds($values, 2.0);
        $stats[$f] = array_merge(['field' => $f, 'n' => count($values)], $m, $bounds);
    }

    // Derived interval baselines — build for ALL interval keys (full + nitro)
    $allIntervals = array_map('anomaly_computeIntervals', $cleanRuns);
    $allSegments = array_merge(anomaly_intervalSegmentsFull(), anomaly_intervalSegmentsNitro());
    $seenKeys = [];
    foreach ($allSegments as $seg) {
        if (isset($seenKeys[$seg['key']])) continue;
        $seenKeys[$seg['key']] = true;
        $values = [];
        foreach ($allIntervals as $iv) {
            $v = $iv[$seg['key']] ?? null;
            if ($v !== null && $v > 0) $values[] = $v;
        }
        if (count($values) < 3) continue;
        $m = anomaly_mad($values);
        $bounds = anomaly_iqrBounds($values, 2.0);
        $stats[$seg['key']] = array_merge(['field' => $seg['key'], 'n' => count($values)], $m, $bounds);
    }

    return $stats;
}

/** Select peer population with hierarchical fallback */
function anomaly_selectPeers(array $targetRun, array $allRuns, array $cleanIds): array {
    $category = $targetRun['category'] ?? null;
    $raceLookup = $targetRun['race_lookup'] ?? null;
    $driver = $targetRun['driver_name'] ?? null;
    $classIdx = $targetRun['class_index'] ?? null;
    $combo = ($driver && $classIdx) ? "$driver|$classIdx" : $driver;
    $targetId = (int)$targetRun['id'];

    $clean = array_filter($allRuns, fn($r) => (int)$r['id'] !== $targetId && isset($cleanIds[(int)$r['id']]));

    $resolveCombo = function(array $r) {
        $d = $r['driver_name'] ?? null;
        $c = $r['class_index'] ?? null;
        return ($d && $c) ? "$d|$c" : $d;
    };

    // combo+category+event
    if ($combo && $category && $raceLookup) {
        $peers = array_filter($clean, fn($r) =>
            $resolveCombo($r) === $combo && ($r['category'] ?? null) === $category && ($r['race_lookup'] ?? null) === $raceLookup
        );
        if (count($peers) >= 5) return ['peers' => array_values($peers), 'scope' => 'combo+category+event'];
    }
    // combo+category (cross-event)
    if ($combo && $category) {
        $peers = array_filter($clean, fn($r) =>
            $resolveCombo($r) === $combo && ($r['category'] ?? null) === $category
        );
        if (count($peers) >= 5) return ['peers' => array_values($peers), 'scope' => 'combo+category'];
    }
    // category+event
    if ($category && $raceLookup) {
        $peers = array_filter($clean, fn($r) =>
            ($r['category'] ?? null) === $category && ($r['race_lookup'] ?? null) === $raceLookup
        );
        if (count($peers) >= 5) return ['peers' => array_values($peers), 'scope' => 'category+event'];
    }
    // category only
    if ($category) {
        $peers = array_filter($clean, fn($r) => ($r['category'] ?? null) === $category);
        if (count($peers) >= 3) return ['peers' => array_values($peers), 'scope' => 'category'];
    }

    return ['peers' => [], 'scope' => 'none'];
}

function anomaly_layer3(array $run, array $intervals, array $baselines, array $baselineInfo): array {
    $flags = [];
    if ($baselineInfo['quality'] === 'none') return $flags;

    $soften = function(string $base) use ($baselineInfo): string {
        if ($baselineInfo['quality'] === 'weak') {
            if ($base === 'high') return 'medium';
            if ($base === 'medium') return 'low';
        }
        if ($baselineInfo['quality'] === 'moderate') {
            if ($base === 'high') return 'high'; // no change for moderate
        }
        return $base;
    };

    // Timing fields
    foreach (anomaly_timingFields() as $f) {
        $v = $run[$f] ?? null;
        if ($v === null || (float)$v <= 0) continue;
        $v = (float)$v;
        $bl = $baselines[$f] ?? null;
        if (!$bl) continue;

        $z = anomaly_modifiedZScore($v, $bl['median'], $bl['mad']);
        $absZ = abs($z);

        if ($absZ > 5.0) {
            $flags[] = [
                'code' => 'OUTLIER_FIELD', 'severity' => $soften('high'),
                'field' => $f, 'value' => $v, 'zScore' => round($z, 2),
                'expected' => round($bl['lower'], 4) . '–' . round($bl['upper'], 4) . " (median " . round($bl['median'], 4) . ", n={$bl['n']})",
                'explanation' => "$f = $v is a strong outlier (z=" . round($z, 1) . ") vs {$baselineInfo['scope']} peers",
            ];
        } elseif ($absZ > 3.5) {
            $flags[] = [
                'code' => 'OUTLIER_FIELD', 'severity' => $soften('medium'),
                'field' => $f, 'value' => $v, 'zScore' => round($z, 2),
                'expected' => round($bl['lower'], 4) . '–' . round($bl['upper'], 4) . " (median " . round($bl['median'], 4) . ", n={$bl['n']})",
                'explanation' => "$f = $v is an outlier (z=" . round($z, 1) . ") vs {$baselineInfo['scope']} peers",
            ];
        }
    }

    // Interval baselines — class-aware segments
    foreach (anomaly_getIntervalSegments($run) as $seg) {
        $v = $intervals[$seg['key']] ?? null;
        if ($v === null || $v <= 0) continue;
        $bl = $baselines[$seg['key']] ?? null;
        if (!$bl) continue;

        $z = anomaly_modifiedZScore($v, $bl['median'], $bl['mad']);
        $absZ = abs($z);

        if ($absZ > 5.0) {
            $flags[] = [
                'code' => 'OUTLIER_INTERVAL', 'severity' => $soften('high'),
                'field' => $seg['key'], 'value' => $v, 'zScore' => round($z, 2),
                'expected' => round($bl['lower'], 4) . '–' . round($bl['upper'], 4) . " (median " . round($bl['median'], 4) . ", n={$bl['n']})",
                'explanation' => "Interval {$seg['label']} = " . round($v, 4) . "s is a strong outlier (z=" . round($z, 1) . ") vs peers",
            ];
        } elseif ($absZ > 3.5) {
            $flags[] = [
                'code' => 'OUTLIER_INTERVAL', 'severity' => $soften('medium'),
                'field' => $seg['key'], 'value' => $v, 'zScore' => round($z, 2),
                'expected' => round($bl['lower'], 4) . '–' . round($bl['upper'], 4) . " (median " . round($bl['median'], 4) . ", n={$bl['n']})",
                'explanation' => "Interval {$seg['label']} = " . round($v, 4) . "s is an outlier (z=" . round($z, 1) . ") vs peers",
            ];
        }
    }

    return $flags;
}

// ── Scoring & narrative ──────────────────────────────────────────────────

function anomaly_computeScore(array $flags): int {
    $score = 100;
    foreach ($flags as $f) {
        $score -= anomaly_severityPenalty($f['severity']);
    }
    return max(0, min(100, $score));
}

function anomaly_computeFieldScores(array $flags): array {
    $fieldMap = [];
    foreach (anomaly_timingFields() as $f) $fieldMap[$f] = [];
    // Include all interval keys (both full-quarter and nitro)
    $allSegs = array_merge(anomaly_intervalSegmentsFull(), anomaly_intervalSegmentsNitro());
    $seen = [];
    foreach ($allSegs as $seg) {
        if (!isset($seen[$seg['key']])) { $fieldMap[$seg['key']] = []; $seen[$seg['key']] = true; }
    }

    foreach ($flags as $flag) {
        $field = $flag['field'] ?? null;
        if (!$field) continue;
        $parts = explode('/', $field);
        foreach ($parts as $p) {
            if (!isset($fieldMap[$p])) $fieldMap[$p] = [];
            $fieldMap[$p][] = $flag;
        }
    }

    $results = [];
    foreach ($fieldMap as $field => $fieldFlags) {
        $score = 100;
        foreach ($fieldFlags as $f) {
            $score -= anomaly_severityPenalty($f['severity']);
        }
        $score = max(0, min(100, $score));
        if (!empty($fieldFlags) || $score < 100) {
            $results[] = [
                'field' => $field,
                'score' => $score,
                'band' => anomaly_confidenceBand($score),
                'flagCount' => count($fieldFlags),
            ];
        }
    }
    return $results;
}

// ── Off-Pace / Representative Run Detection ──────────────────────────────

function anomaly_detectOffPace(array $run, array $baselines, array $l1Flags): array {
    // If the run has hard integrity failures, it's not off-pace — it's broken
    $hasHardFails = false;
    foreach ($l1Flags as $f) {
        if ($f['severity'] === 'critical' || $f['severity'] === 'high') { $hasHardFails = true; break; }
    }
    if ($hasHardFails) {
        return ['representative' => true, 'reason' => null, 'excludedFromBaseline' => true, 'exclusionReason' => 'integrity failure'];
    }

    $finish = anomaly_resolveFinish($run);
    $finishET = $finish['effectiveFinishTime'];
    $finishMph = $finish['effectiveFinishMph'];
    $etField = $finish['finishTimeField'];
    $mphField = $finish['finishMphField'];
    $etBl = $baselines[$etField] ?? null;
    $mphBl = $baselines[$mphField] ?? null;

    if (!$etBl && !$mphBl) {
        return ['representative' => true, 'reason' => null, 'excludedFromBaseline' => false, 'exclusionReason' => null];
    }

    $reasons = [];

    // Require BOTH z-score AND absolute % deviation to prevent false positives
    // in very tight fields (e.g. Pro Stock where MAD ≈ 0.012s)
    if ($finishET !== null && $etBl) {
        $z = anomaly_modifiedZScore($finishET, $etBl['median'], $etBl['mad']);
        $pctSlower = ($finishET - $etBl['median']) / $etBl['median'];
        if ($z > 4.0 && $pctSlower > 0.02) {
            $reasons[] = "Finish ET " . round($finishET, 3) . "s is " . round($z, 1) . "σ slower than peer median " . round($etBl['median'], 3) . "s";
        }
    }

    if ($finishMph !== null && $mphBl) {
        $z = anomaly_modifiedZScore($finishMph, $mphBl['median'], $mphBl['mad']);
        $pctLower = ($mphBl['median'] - $finishMph) / $mphBl['median'];
        if ($z < -4.0 && $pctLower > 0.03) {
            $reasons[] = "Finish MPH " . round($finishMph, 1) . " is " . round(abs($z), 1) . "σ below peer median " . round($mphBl['median'], 1);
        }
    }

    if (!empty($reasons)) {
        return [
            'representative' => false,
            'reason' => implode('; ', $reasons),
            'excludedFromBaseline' => true,
            'exclusionReason' => 'off-pace run — not representative of competitive field',
        ];
    }

    return ['representative' => true, 'reason' => null, 'excludedFromBaseline' => false, 'exclusionReason' => null];
}

// ── Trap-Speed Derived Timestamps ─────────────────────────────────────────
// The reported MPH is based on the last 66 ft before the timing point.
// 660 MPH → delta for 594→660 ft;  finish MPH → delta for (finish-66)→finish.

function anomaly_computeTrapDerived(array $run): array {
    $finish = anomaly_resolveFinish($run);
    $g = function($f) use ($run) { return isset($run[$f]) && $run[$f] > 0 ? (float)$run[$f] : null; };
    $mphToFps = function($mph) { return $mph * 5280 / 3600; };
    $flags = [];

    $t_594 = null;
    $delta_594_660 = null;
    $t_finish_minus_66 = null;
    $delta_finishMinus66_finish = null;

    // 660 trap speed → 594→660 micro-segment
    $mph660 = $g('mph660');
    $ft660 = $g('ft660');
    if ($mph660 !== null && $mph660 > 10 && $ft660 !== null) {
        $fps = $mphToFps($mph660);
        $delta_594_660 = round(66 / $fps, 6);
        $t_594 = round($ft660 - $delta_594_660, 6);

        $ft330 = $g('ft330');
        if ($ft330 !== null && $ft660 > $ft330) {
            $t_330_660 = $ft660 - $ft330;
            $ratio = $delta_594_660 / $t_330_660;
            if ($ratio > 0.35) {
                $flags[] = ['segment' => '594→660', 'issue' => "Trap-derived 594→660 (" . round($delta_594_660,4) . "s) is " . round($ratio*100) . "% of the 330→660 interval — mph660 may be implausibly low", 'severity' => 'low'];
            }
        }
    }

    // Finish trap speed → (finish-66)→finish micro-segment
    $finishMph = $finish['effectiveFinishMph'];
    $finishET = $finish['effectiveFinishTime'];
    if ($finishMph !== null && $finishMph > 10 && $finishET !== null) {
        $fps = $mphToFps($finishMph);
        $delta_finishMinus66_finish = round(66 / $fps, 6);
        $t_finish_minus_66 = round($finishET - $delta_finishMinus66_finish, 6);

        $ft660v = $g('ft660');
        if ($ft660v !== null && $finishET > $ft660v) {
            $t_660_finish = $finishET - $ft660v;
            $finishDist = $finish['effectiveFinishDistance'];
            $segmentDist = $finishDist - 660;
            $expectedRatio = 66 / $segmentDist;
            $actualRatio = $delta_finishMinus66_finish / $t_660_finish;
            if ($actualRatio > $expectedRatio * 2.5) {
                $flags[] = ['segment' => ($finishDist-66) . '→' . $finishDist, 'issue' => "Trap-derived last-66ft (" . round($delta_finishMinus66_finish,4) . "s) is " . round($actualRatio*100) . "% of 660→finish — finish mph may be implausibly low", 'severity' => 'low'];
            }
        }
    }

    return [
        't_594' => $t_594,
        'delta_594_660' => $delta_594_660,
        't_finish_minus_66' => $t_finish_minus_66,
        'delta_finishMinus66_finish' => $delta_finishMinus66_finish,
        'trapConsistencyFlags' => $flags,
    ];
}

function anomaly_classify(array $flags, string $band, array $baselineInfo): string {
    // Classify the run into one of four trust categories
    $hardCodes = ['MISSING_SPLIT_VALUE','NON_MONOTONIC_SPLITS','INVALID_INTERVAL','ZERO_OR_NEGATIVE_TIMING','DUPLICATE_SPLIT_VALUES'];
    $shapeCodes = ['SEGMENT_SHAPE_INCONSISTENT','MPH_ET_INCONSISTENT'];
    $outlierCodes = ['OUTLIER_FIELD','OUTLIER_INTERVAL'];

    $hardFlags = array_filter($flags, fn($f) => in_array($f['code'], $hardCodes));
    $shapeFlags = array_filter($flags, fn($f) => in_array($f['code'], $shapeCodes));
    $outlierFlags = array_filter($flags, fn($f) => in_array($f['code'], $outlierCodes));
    $incomplete = array_filter($flags, fn($f) => $f['code'] === 'INCOMPLETE_RUN_DATA');

    if (!empty($incomplete) && $band === 'Critical') return 'incomplete_record';
    if (!empty($hardFlags)) return 'probable_timing_issue';
    if (!empty($shapeFlags) && count($shapeFlags) >= 1 && $band !== 'High') return 'isolated_suspicious_increment';
    if (!empty($outlierFlags) && empty($hardFlags) && empty($shapeFlags)) return 'unusual_but_plausible';
    if ($band === 'High') return 'clean';
    return 'review_recommended';
}

function anomaly_generateNarrative(array $partial): string {
    $parts = [];
    $classification = $partial['classification'];
    $isCompetitive = $partial['competitiveRun'] ?? false;

    if ($classification === 'clean') {
        $parts[] = 'Run data appears consistent and reliable.';
        if ($isCompetitive) $parts[] = 'Competitive-pace run.';
        if ($partial['flagCount'] > 0) $parts[] = "{$partial['flagCount']} minor note(s) found.";
        return implode(' ', $parts);
    }

    if ($classification === 'incomplete_record') {
        $parts[] = 'Run record is incomplete or corrupt — insufficient timing data for analysis.';
        return implode(' ', $parts);
    }

    $hardCodes = ['MISSING_SPLIT_VALUE','NON_MONOTONIC_SPLITS','INVALID_INTERVAL','ZERO_OR_NEGATIVE_TIMING','DUPLICATE_SPLIT_VALUES'];
    $shapeCodes = ['SEGMENT_SHAPE_INCONSISTENT','MPH_ET_INCONSISTENT'];
    $hardFlags = array_filter($partial['flags'], fn($f) => in_array($f['code'], $hardCodes));
    $shapeFlags = array_filter($partial['flags'], fn($f) => in_array($f['code'], $shapeCodes));

    // Competitive run context — issues in fast runs are more significant
    if ($isCompetitive && (!empty($hardFlags) || !empty($shapeFlags))) {
        $parts[] = '⚠ Competitive-pace run with data concerns — higher priority for review.';
    }

    if ($classification === 'probable_timing_issue') {
        $hardCount = count($hardFlags);
        $parts[] = "$hardCount integrity issue(s) detected: probable timing-data problem.";
    }

    if ($classification === 'isolated_suspicious_increment') {
        $parts[] = 'One or more timing increments appear inconsistent with adjacent segments — possible isolated sensor or recording error.';
    }

    if ($classification === 'unusual_but_plausible') {
        if (!($partial['representativeRun'] ?? true)) {
            $parts[] = 'Run values are unusual compared to peers but may reflect genuine performance rather than a timing error.';
        } else {
            $parts[] = 'Run is unusual but may reflect genuine performance rather than timing error.';
        }
    }

    if ($classification === 'review_recommended') {
        $parts[] = 'Run has multiple minor concerns that warrant review.';
    }

    // Suspect fields
    $suspects = $partial['suspectFields'] ?? [];
    if (count($suspects) === 1) {
        $parts[] = "Issue appears isolated to {$suspects[0]}.";
    } elseif (count($suspects) > 1 && count($suspects) <= 3) {
        $parts[] = "Suspect fields: " . implode(', ', $suspects) . ".";
    }

    // Trap-speed consistency notes
    $trapFlags = $partial['trapDerived']['trapConsistencyFlags'] ?? [];
    if (!empty($trapFlags)) {
        $issue = explode('—', $trapFlags[0]['issue'])[0];
        $parts[] = "Trap-speed check: " . trim($issue) . ".";
    }

    // Baseline quality caveat
    $bq = $partial['baseline']['quality'] ?? 'none';
    if ($bq === 'weak') {
        $parts[] = 'Historical baseline is weak — outlier conclusions have reduced confidence.';
    } elseif ($bq === 'none') {
        $parts[] = 'No historical baseline available for comparison.';
    }

    return implode(' ', $parts) ?: 'Run analyzed with no specific findings.';
}

// ── Full single-run analysis ─────────────────────────────────────────────

function anomaly_analyzeRun(array $run, array $allRuns, array $cleanIds, int $hardFailCount, array $offPaceIds = [], array $offPaceReasons = [], array $hardFailIds = [], ?float $competitiveMedianET = null): array {
    $intervals = anomaly_computeIntervals($run);
    $finish = anomaly_resolveFinish($run);
    $trapDerived = anomaly_computeTrapDerived($run);
    $l1 = anomaly_layer1($run, $intervals);
    $l2 = anomaly_layer2($run, $intervals);

    // Select peers and build baselines
    $peerResult = anomaly_selectPeers($run, $allRuns, $cleanIds);
    $peers = $peerResult['peers'];
    $scope = $peerResult['scope'];
    $baselines = count($peers) >= 3 ? anomaly_buildBaselines($peers) : [];

    $peerCount = count($peers);
    $quality = $peerCount >= 15 ? 'strong' : ($peerCount >= 5 ? 'moderate' : ($peerCount >= 3 ? 'weak' : 'none'));
    $baselineInfo = [
        'scope' => $scope,
        'sampleSize' => $peerCount,
        'quality' => $quality,
        'hardFailsExcluded' => $hardFailCount,
    ];
    if ($quality === 'weak') {
        $baselineInfo['warning'] = "Only $peerCount clean peer runs available — outlier detection has reduced confidence";
    }

    $l3 = anomaly_layer3($run, $intervals, $baselines, $baselineInfo);

    // Off-pace detection
    $runId = (int)$run['id'];
    $offPace = anomaly_detectOffPace($run, $baselines, $l1);
    $isOffPace = isset($offPaceIds[$runId]) || !$offPace['representative'];

    // Off-pace flag (info severity)
    $offPaceFlags = [];
    if ($isOffPace) {
        $offPaceFlags[] = [
            'code' => 'OFF_PACE_RUN', 'severity' => 'info',
            'explanation' => $offPace['reason'] ?? ($offPaceReasons[$runId] ?? 'Run is significantly off the competitive pace'),
        ];
    }

    // Baseline quality flags
    $qualityFlags = [];
    if ($quality === 'weak' && !empty($l3)) {
        $qualityFlags[] = [
            'code' => 'BASELINE_QUALITY_WEAK', 'severity' => 'info',
            'explanation' => "Historical baseline uses only $peerCount peers ($scope) — outlier conclusions have reduced confidence",
        ];
    }
    if ($quality === 'none') {
        $qualityFlags[] = [
            'code' => 'BASELINE_SAMPLE_TOO_SMALL', 'severity' => 'info',
            'explanation' => 'No suitable peer group found — historical comparison skipped',
        ];
    }

    $allFlags = array_merge($l1, $l2, $l3, $offPaceFlags, $qualityFlags);
    $score = anomaly_computeScore($allFlags);

    // Off-pace but internally coherent → floor score at Medium band
    if ($isOffPace && !isset($hardFailIds[$runId])) {
        $hasHardInteg = false;
        foreach ($l1 as $f) {
            if ($f['severity'] === 'critical' || $f['severity'] === 'high') { $hasHardInteg = true; break; }
        }
        if (!$hasHardInteg) {
            $score = max($score, 55);
        }
    }

    $band = anomaly_confidenceBand($score);
    $fieldScores = anomaly_computeFieldScores($allFlags);

    $suspectFields = [];
    foreach ($fieldScores as $fs) {
        if ($fs['score'] < 80) $suspectFields[] = $fs['field'];
    }
    usort($suspectFields, function($a, $b) use ($fieldScores) {
        $sa = 100; $sb = 100;
        foreach ($fieldScores as $fs) {
            if ($fs['field'] === $a) $sa = $fs['score'];
            if ($fs['field'] === $b) $sb = $fs['score'];
        }
        return $sa <=> $sb;
    });

    // Primary reason
    $sorted = $allFlags;
    usort($sorted, fn($a, $b) => anomaly_severityPenalty($b['severity']) <=> anomaly_severityPenalty($a['severity']));
    $primary = !empty($sorted) ? $sorted[0] : null;

    $classification = anomaly_classify($allFlags, $band, $baselineInfo);

    // Off-pace + coherent → unusual_but_plausible (not probable_timing_issue)
    if ($isOffPace && $classification === 'probable_timing_issue') {
        $hasRealInteg = false;
        foreach ($l1 as $f) { if ($f['severity'] === 'critical') { $hasRealInteg = true; break; } }
        if (!$hasRealInteg) $classification = 'unusual_but_plausible';
    }

    // Baseline exclusion reason
    $isExcluded = isset($hardFailIds[$runId]) || !isset($cleanIds[$runId]) || $isOffPace;
    $exclusionReason = null;
    if (isset($hardFailIds[$runId])) $exclusionReason = 'integrity failure';
    elseif (!isset($cleanIds[$runId]) && !$isOffPace) $exclusionReason = 'medium-suspect shape flags';
    elseif ($isOffPace) $exclusionReason = $offPace['exclusionReason'] ?? 'off-pace run';

    // Competitive run determination: representative + finish ET <= competitive median
    $isRepresentative = !$isOffPace;
    $competitiveRun = false;
    $competitiveWeight = 0.0;
    if ($isRepresentative && $finish['effectiveFinishTime'] !== null && $competitiveMedianET !== null) {
        $competitiveRun = $finish['effectiveFinishTime'] <= $competitiveMedianET;
        $competitiveWeight = $competitiveRun ? 1.0 : 0.5;
    } elseif ($isRepresentative) {
        $competitiveWeight = 0.5;
    }

    $partial = [
        'runId' => $runId,
        'runUuid' => $run['uuid'] ?? '',
        'overallScore' => $score,
        'band' => $band,
        'classification' => $classification,
        'flagCount' => count($allFlags),
        'suspectFields' => $suspectFields,
        'primaryReasonCode' => $primary ? $primary['code'] : null,
        'primaryReasonText' => $primary ? $primary['explanation'] : 'No issues detected',
        'flags' => $allFlags,
        'fieldScores' => $fieldScores,
        'intervals' => $intervals,
        'trapDerived' => $trapDerived,
        'baseline' => $baselineInfo,
        'finish' => $finish,
        'representativeRun' => $isRepresentative,
        'representativeRunReason' => $isOffPace ? ($offPace['reason'] ?? ($offPaceReasons[$runId] ?? 'Off competitive pace')) : null,
        'excludedFromBaseline' => $isExcluded,
        'baselineExclusionReason' => $exclusionReason,
        'competitiveRun' => $competitiveRun,
        'competitiveWeight' => $competitiveWeight,
    ];

    $partial['narrative'] = anomaly_generateNarrative($partial);

    return $partial;
}

// ── Rollup computation ───────────────────────────────────────────────────

function anomaly_computeRollups(array $runResults, array $runMap): array {
    $byLane = [];
    $byRound = [];
    $byField = [];
    $classifications = ['clean' => 0, 'unusual_but_plausible' => 0, 'isolated_suspicious_increment' => 0,
                        'probable_timing_issue' => 0, 'incomplete_record' => 0, 'review_recommended' => 0];

    foreach ($runResults as $r) {
        $run = $runMap[(int)$r['runId']] ?? null;
        $lane = $run['lane'] ?? 'unknown';
        $round = $run['round'] ?? 'unknown';
        $classification = $r['classification'];

        // Classify
        if (isset($classifications[$classification])) $classifications[$classification]++;

        // By lane
        if (!isset($byLane[$lane])) $byLane[$lane] = ['total' => 0, 'flagged' => 0, 'criticalOrLow' => 0, 'avgScore' => 0, 'scoreSum' => 0];
        $byLane[$lane]['total']++;
        $byLane[$lane]['scoreSum'] += $r['overallScore'];
        if ($r['flagCount'] > 0) $byLane[$lane]['flagged']++;
        if ($r['band'] === 'Critical' || $r['band'] === 'Low') $byLane[$lane]['criticalOrLow']++;

        // By round
        if (!isset($byRound[$round])) $byRound[$round] = ['total' => 0, 'flagged' => 0, 'criticalOrLow' => 0, 'avgScore' => 0, 'scoreSum' => 0];
        $byRound[$round]['total']++;
        $byRound[$round]['scoreSum'] += $r['overallScore'];
        if ($r['flagCount'] > 0) $byRound[$round]['flagged']++;
        if ($r['band'] === 'Critical' || $r['band'] === 'Low') $byRound[$round]['criticalOrLow']++;

        // By field
        foreach ($r['suspectFields'] as $f) {
            $byField[$f] = ($byField[$f] ?? 0) + 1;
        }
    }

    // Compute averages
    foreach ($byLane as &$v) { $v['avgScore'] = $v['total'] > 0 ? round($v['scoreSum'] / $v['total'], 1) : 0; unset($v['scoreSum']); }
    foreach ($byRound as &$v) { $v['avgScore'] = $v['total'] > 0 ? round($v['scoreSum'] / $v['total'], 1) : 0; unset($v['scoreSum']); }
    unset($v);

    arsort($byField);

    return [
        'byLane' => $byLane,
        'byRound' => $byRound,
        'byField' => $byField,
        'classifications' => $classifications,
    ];
}

// ============================================================================
// GET ?action=anomalyAnalysis&raceLookup=YYYYMMDD[&category=Top Fuel][&limit=2000]
// Returns: summary, rollups, per-run anomaly results
// ============================================================================

function handleAnomalyAnalysis(PDO $pdo): void {
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if (!$raceLookup) rsa_jsonResponse(['error' => 'raceLookup is required'], 400);

    // Build WHERE
    $where = ['r.race_lookup = ?'];
    $params = [$raceLookup];
    if (!empty($_GET['category'])) {
        $where[] = 'r.category = ?';
        $params[] = trim($_GET['category']);
    } elseif (!empty($_GET['classIndex'])) {
        $expanded = parity_expandClassIndex($pdo, trim($_GET['classIndex']));
        $ph = implode(',', array_fill(0, count($expanded), '?'));
        $where[] = "r.class_index IN ($ph)";
        $params = array_merge($params, $expanded);
    }
    $whereClause = implode(' AND ', $where);
    $limit = min((int)($_GET['limit'] ?? 2000), 5000);

    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local,
               r.category, r.class_index, r.round, r.lane, r.driver_name, r.car_number,
               r.rt, r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.dial_in
        FROM parity_runs r
        WHERE $whereClause
        ORDER BY COALESCE(r.run_time_local, r.run_timestamp_utc, r.created_at) ASC
        LIMIT $limit
    ");
    $stmt->execute($params);
    $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast numeric fields
    foreach ($runs as &$run) {
        foreach (['rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320','dial_in'] as $f) {
            if ($run[$f] !== null) $run[$f] = (float)$run[$f];
        }
        $run['id'] = (int)$run['id'];
    }
    unset($run);

    // Build run lookup
    $runMap = [];
    foreach ($runs as $r) $runMap[(int)$r['id']] = $r;

    // Phase 1: Layer 1 on all runs to find hard failures
    $hardFailIds = [];
    $allIntervals = [];
    $allL1Flags = [];
    foreach ($runs as $r) {
        $iv = anomaly_computeIntervals($r);
        $allIntervals[(int)$r['id']] = $iv;
        $l1 = anomaly_layer1($r, $iv);
        $allL1Flags[(int)$r['id']] = $l1;
        $hasCriticalOrHigh = false;
        foreach ($l1 as $f) {
            if ($f['severity'] === 'critical' || $f['severity'] === 'high') { $hasCriticalOrHigh = true; break; }
        }
        if ($hasCriticalOrHigh) $hardFailIds[(int)$r['id']] = true;
    }

    // Phase 1b: Also exclude medium-confidence suspect runs from baselines
    // (runs with medium-severity L1 flags or >2 flags total from L1+L2)
    $suspectIds = [];
    foreach ($runs as $r) {
        $rid = (int)$r['id'];
        if (isset($hardFailIds[$rid])) continue;
        $l1 = $allL1Flags[$rid];
        $iv = $allIntervals[$rid];
        $l2 = anomaly_layer2($r, $iv);
        $combined = array_merge($l1, $l2);
        $mediumCount = count(array_filter($combined, fn($f) => $f['severity'] === 'medium'));
        if ($mediumCount >= 2 || count($combined) >= 3) {
            $suspectIds[$rid] = true;
        }
    }

    // Initial clean population: exclude hard fails AND medium-suspect runs
    $initialCleanIds = [];
    foreach ($runs as $r) {
        $rid = (int)$r['id'];
        if (!isset($hardFailIds[$rid]) && !isset($suspectIds[$rid])) {
            $initialCleanIds[$rid] = true;
        }
    }

    // Phase 2b: Off-pace detection
    $offPaceIds = [];
    $offPaceReasons = [];
    $initialCleanRuns = array_filter($runs, fn($r) => isset($initialCleanIds[(int)$r['id']]));
    $prelimBaselines = count($initialCleanRuns) >= 5 ? anomaly_buildBaselines(array_values($initialCleanRuns)) : [];
    foreach ($runs as $r) {
        $rid = (int)$r['id'];
        if (isset($hardFailIds[$rid]) || isset($suspectIds[$rid])) continue;
        $l1 = $allL1Flags[$rid] ?? [];
        $op = anomaly_detectOffPace($r, $prelimBaselines, $l1);
        if (!$op['representative']) {
            $offPaceIds[$rid] = true;
            if ($op['reason']) $offPaceReasons[$rid] = $op['reason'];
        }
    }

    // Phase 2c: Final clean population (exclude hard-fails + medium-suspects + off-pace)
    $cleanIds = [];
    foreach ($runs as $r) {
        $rid = (int)$r['id'];
        if (!isset($hardFailIds[$rid]) && !isset($suspectIds[$rid]) && !isset($offPaceIds[$rid])) {
            $cleanIds[$rid] = true;
        }
    }
    $totalExcluded = count($hardFailIds) + count($suspectIds) + count($offPaceIds);

    // Phase 2d: Compute competitive median from representative (clean, non-off-pace) runs
    $repFinishETs = [];
    foreach ($runs as $r) {
        $rid = (int)$r['id'];
        if (!isset($cleanIds[$rid])) continue;
        $f = anomaly_resolveFinish($r);
        if ($f['effectiveFinishTime'] !== null) $repFinishETs[] = $f['effectiveFinishTime'];
    }
    sort($repFinishETs);
    $competitiveMedianET = !empty($repFinishETs) ? anomaly_median($repFinishETs) : null;

    // Phase 3: Analyze each run
    $results = [];
    foreach ($runs as $r) {
        $results[] = anomaly_analyzeRun($r, $runs, $cleanIds, $totalExcluded, $offPaceIds, $offPaceReasons, $hardFailIds, $competitiveMedianET);
    }

    // Summary
    $bandCounts = ['High' => 0, 'Medium' => 0, 'Low' => 0, 'Critical' => 0];
    $fieldFlagCounts = [];
    $representativeCount = 0;
    $offPaceCount = 0;
    $competitiveCount = 0;
    $competitiveIssueCount = 0;
    foreach ($results as $r) {
        $bandCounts[$r['band']]++;
        if ($r['representativeRun']) $representativeCount++; else $offPaceCount++;
        if ($r['competitiveRun']) {
            $competitiveCount++;
            if ($r['band'] !== 'High') $competitiveIssueCount++;
        }
        foreach ($r['suspectFields'] as $f) {
            $fieldFlagCounts[$f] = ($fieldFlagCounts[$f] ?? 0) + 1;
        }
    }
    arsort($fieldFlagCounts);
    $mostFlaggedField = !empty($fieldFlagCounts) ? array_key_first($fieldFlagCounts) : null;
    $mostFlaggedCount = $mostFlaggedField ? $fieldFlagCounts[$mostFlaggedField] : 0;

    // Rollups
    $rollups = anomaly_computeRollups($results, $runMap);

    // Strip full flags from list response (keep only in detail endpoint)
    $runsSummary = array_map(function($r) {
        return [
            'runId' => $r['runId'],
            'runUuid' => $r['runUuid'],
            'overallScore' => $r['overallScore'],
            'band' => $r['band'],
            'classification' => $r['classification'],
            'flagCount' => $r['flagCount'],
            'suspectFields' => $r['suspectFields'],
            'primaryReasonCode' => $r['primaryReasonCode'],
            'primaryReasonText' => $r['primaryReasonText'],
            'fieldScores' => $r['fieldScores'],
            'intervals' => $r['intervals'],
            'baseline' => $r['baseline'],
            'narrative' => $r['narrative'],
            'finish' => $r['finish'],
            'representativeRun' => $r['representativeRun'],
            'representativeRunReason' => $r['representativeRunReason'],
            'excludedFromBaseline' => $r['excludedFromBaseline'],
            'baselineExclusionReason' => $r['baselineExclusionReason'],
            'competitiveRun' => $r['competitiveRun'],
            'competitiveWeight' => $r['competitiveWeight'],
            'trapDerived' => $r['trapDerived'],
            // Run context for display
            'driverName' => null,
            'category' => null,
            'lane' => null,
            'round' => null,
            'ft1320' => null,
            'mph1320' => null,
        ];
    }, $results);

    // Attach run context
    foreach ($runsSummary as &$rs) {
        $run = $runMap[$rs['runId']] ?? null;
        if ($run) {
            $rs['driverName'] = $run['driver_name'];
            $rs['category'] = $run['category'];
            $rs['lane'] = $run['lane'];
            $rs['round'] = $run['round'];
            $rs['ft1320'] = $run['ft1320'];
            $rs['mph1320'] = $run['mph1320'];
        }
    }
    unset($rs);

    rsa_jsonResponse([
        'summary' => [
            'runsAnalyzed' => count($results),
            'highCount' => $bandCounts['High'],
            'mediumCount' => $bandCounts['Medium'],
            'lowCount' => $bandCounts['Low'],
            'criticalCount' => $bandCounts['Critical'],
            'mostFlaggedField' => $mostFlaggedField,
            'mostFlaggedFieldCount' => $mostFlaggedCount,
            'baselineExcluded' => $totalExcluded,
            'representativeCount' => $representativeCount,
            'offPaceCount' => $offPaceCount,
            'competitiveCount' => $competitiveCount,
            'competitiveIssueCount' => $competitiveIssueCount,
        ],
        'rollups' => $rollups,
        'runs' => $runsSummary,
    ]);
}

// ============================================================================
// GET ?action=anomalyDetail&runId=123&raceLookup=YYYYMMDD
// Returns full anomaly detail for a single run including all flags
// ============================================================================

function handleAnomalyDetail(PDO $pdo): void {
    $runId = (int)($_GET['runId'] ?? 0);
    $raceLookup = trim($_GET['raceLookup'] ?? '');
    if ($runId <= 0) rsa_jsonResponse(['error' => 'runId is required'], 400);
    if (!$raceLookup) rsa_jsonResponse(['error' => 'raceLookup is required'], 400);

    // Fetch the target run
    $stmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc, r.run_time_local,
               r.category, r.class_index, r.round, r.lane, r.driver_name, r.car_number,
               r.rt, r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320, r.win_flag, r.dq_flag, r.dial_in
        FROM parity_runs r
        WHERE r.id = ?
    ");
    $stmt->execute([$runId]);
    $targetRun = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$targetRun) rsa_jsonResponse(['error' => 'Run not found'], 404);

    // Cast numeric
    foreach (['rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320','dial_in'] as $f) {
        if ($targetRun[$f] !== null) $targetRun[$f] = (float)$targetRun[$f];
    }
    $targetRun['id'] = (int)$targetRun['id'];

    // Fetch peer population (same event + optional category)
    $category = $targetRun['category'];
    $peerWhere = ['r.race_lookup = ?'];
    $peerParams = [$raceLookup];
    if ($category) {
        $peerWhere[] = 'r.category = ?';
        $peerParams[] = $category;
    }
    $peerWhereClause = implode(' AND ', $peerWhere);
    $peerStmt = $pdo->prepare("
        SELECT r.id, r.uuid, r.race_lookup, r.run_timestamp_utc,
               r.category, r.class_index, r.round, r.lane, r.driver_name, r.car_number,
               r.rt, r.ft60, r.ft330, r.ft660, r.mph660, r.ft1000, r.mph1000,
               r.ft1320, r.mph1320
        FROM parity_runs r
        WHERE $peerWhereClause
        LIMIT 3000
    ");
    $peerStmt->execute($peerParams);
    $allRuns = $peerStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($allRuns as &$pr) {
        foreach (['rt','ft60','ft330','ft660','mph660','ft1000','mph1000','ft1320','mph1320'] as $f) {
            if ($pr[$f] !== null) $pr[$f] = (float)$pr[$f];
        }
        $pr['id'] = (int)$pr['id'];
    }
    unset($pr);

    // Identify hard failures across population
    $hardFailIds = [];
    $suspectIds = [];
    $allL1Flags = [];
    foreach ($allRuns as $r) {
        $rid = (int)$r['id'];
        $iv = anomaly_computeIntervals($r);
        $l1 = anomaly_layer1($r, $iv);
        $allL1Flags[$rid] = $l1;
        $hasCritHigh = false;
        foreach ($l1 as $f) {
            if ($f['severity'] === 'critical' || $f['severity'] === 'high') { $hasCritHigh = true; break; }
        }
        if ($hasCritHigh) { $hardFailIds[$rid] = true; continue; }
        $l2 = anomaly_layer2($r, $iv);
        $combined = array_merge($l1, $l2);
        $medCount = count(array_filter($combined, fn($f) => $f['severity'] === 'medium'));
        if ($medCount >= 2 || count($combined) >= 3) $suspectIds[$rid] = true;
    }

    // Initial clean
    $initialCleanIds = [];
    foreach ($allRuns as $r) {
        $rid = (int)$r['id'];
        if (!isset($hardFailIds[$rid]) && !isset($suspectIds[$rid])) $initialCleanIds[$rid] = true;
    }

    // Off-pace detection
    $offPaceIds = [];
    $offPaceReasons = [];
    $initialCleanRuns = array_filter($allRuns, fn($r) => isset($initialCleanIds[(int)$r['id']]));
    $prelimBaselines = count($initialCleanRuns) >= 5 ? anomaly_buildBaselines(array_values($initialCleanRuns)) : [];
    foreach ($allRuns as $r) {
        $rid = (int)$r['id'];
        if (isset($hardFailIds[$rid]) || isset($suspectIds[$rid])) continue;
        $op = anomaly_detectOffPace($r, $prelimBaselines, $allL1Flags[$rid] ?? []);
        if (!$op['representative']) {
            $offPaceIds[$rid] = true;
            if ($op['reason']) $offPaceReasons[$rid] = $op['reason'];
        }
    }

    // Final clean population
    $cleanIds = [];
    foreach ($allRuns as $r) {
        $rid = (int)$r['id'];
        if (!isset($hardFailIds[$rid]) && !isset($suspectIds[$rid]) && !isset($offPaceIds[$rid])) $cleanIds[$rid] = true;
    }
    $totalExcluded = count($hardFailIds) + count($suspectIds) + count($offPaceIds);

    // Competitive median
    $repFinishETs = [];
    foreach ($allRuns as $r) {
        $rid = (int)$r['id'];
        if (!isset($cleanIds[$rid])) continue;
        $f = anomaly_resolveFinish($r);
        if ($f['effectiveFinishTime'] !== null) $repFinishETs[] = $f['effectiveFinishTime'];
    }
    sort($repFinishETs);
    $competitiveMedianET = !empty($repFinishETs) ? anomaly_median($repFinishETs) : null;

    // Full analysis
    $result = anomaly_analyzeRun($targetRun, $allRuns, $cleanIds, $totalExcluded, $offPaceIds, $offPaceReasons, $hardFailIds, $competitiveMedianET);

    rsa_jsonResponse([
        'run' => $targetRun,
        'analysis' => $result,
    ]);
}

// ============================================================================
// GET ?action=multiEventParity
// Aggregates driver performance across multiple events with optional outlier
// detection and event omission.  Produces a virtual qualifying grid.
// ============================================================================

function handleMultiEventParity(PDO $pdo): void {
    $eventIds       = json_decode($_GET['eventIds'] ?? '[]', true);
    $omittedIds     = json_decode($_GET['omittedEventIds'] ?? '[]', true);
    $category       = trim($_GET['category'] ?? '');
    $classIndex     = trim($_GET['classIndex'] ?? '');
    $minRuns        = max(1, (int)($_GET['minRunsPerDriver'] ?? 2));
    $weightRecency  = ($_GET['weightByRecency'] ?? 'true') === 'true';

    if (!is_array($eventIds) || count($eventIds) === 0) {
        rsa_jsonResponse(['error' => 'eventIds is required (JSON array)'], 400);
    }
    if (!is_array($omittedIds)) $omittedIds = [];

    $effectiveIds = array_values(array_diff(array_map('intval', $eventIds), array_map('intval', $omittedIds)));
    if (count($effectiveIds) === 0) {
        rsa_jsonResponse(['error' => 'No effective events after omissions'], 400);
    }

    // Resolve race_lookups for effective events
    $ph = implode(',', array_fill(0, count($effectiveIds), '?'));
    $evStmt = $pdo->prepare("
        SELECT id, event_name, season_year, start_date_local, end_date_local, race_lookup
        FROM parity_events WHERE id IN ($ph) ORDER BY start_date_local
    ");
    $evStmt->execute($effectiveIds);
    $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    $raceLookups = array_filter(array_column($events, 'race_lookup'));
    if (empty($raceLookups)) {
        rsa_jsonResponse(['error' => 'No race_lookup found for selected events'], 400);
    }
    $rlPh = implode(',', array_fill(0, count($raceLookups), '?'));

    // Build class/category filter
    $classFilter = '';
    $classParams = [];
    if ($category !== '') {
        $classFilter = 'AND r.category = ?';
        $classParams[] = $category;
    } elseif ($classIndex !== '') {
        $classFilter = 'AND r.class_index = ?';
        $classParams[] = $classIndex;
    }

    // Fetch aggregated driver data across all effective events
    $sql = "
        SELECT r.driver_name, r.car_number, r.class_index, r.race_lookup,
               COUNT(*) AS total_runs,
               MIN(r.ft1320) AS best_et,
               AVG(r.ft1320) AS avg_et,
               STDDEV(r.ft1320) AS et_stddev
        FROM parity_runs r
        WHERE r.race_lookup IN ($rlPh)
          $classFilter
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.ft1320 IS NOT NULL AND r.ft1320 > 0
        GROUP BY r.driver_name, r.car_number, r.class_index
        HAVING total_runs >= ?
        ORDER BY best_et ASC
    ";
    $params = array_merge($raceLookups, $classParams, [$minRuns]);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $driverRows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Build race_lookup→event map
    $rlToEvent = [];
    foreach ($events as $ev) {
        if ($ev['race_lookup']) $rlToEvent[$ev['race_lookup']] = $ev;
    }

    // For each driver, fetch their top 4 runs and per-event participation
    $topRunStmt = $pdo->prepare("
        SELECT r.ft1320, r.race_lookup
        FROM parity_runs r
        WHERE r.race_lookup IN ($rlPh)
          AND r.driver_name = ? AND r.class_index = ?
          AND COALESCE(r.dq_flag, 0) = 0
          AND r.ft1320 IS NOT NULL AND r.ft1320 > 0
        ORDER BY r.ft1320 ASC LIMIT 4
    ");

    $qualifyingGrid = [];
    foreach ($driverRows as $d) {
        $topRunStmt->execute(array_merge($raceLookups, [$d['driver_name'], $d['class_index']]));
        $topRuns = $topRunStmt->fetchAll(PDO::FETCH_ASSOC);
        if (count($topRuns) < $minRuns) continue;

        $topETs = array_map(function($r) { return (float)$r['ft1320']; }, $topRuns);
        $avgQualET = array_sum($topETs) / count($topETs);

        // Determine participating events
        $partEvents = [];
        foreach ($topRuns as $tr) {
            if (isset($rlToEvent[$tr['race_lookup']])) {
                $eid = (int)$rlToEvent[$tr['race_lookup']]['id'];
                $partEvents[$eid] = true;
            }
        }
        // Also count from all runs (not just top 4)
        $allEventsStmt = $pdo->prepare("
            SELECT DISTINCT r.race_lookup FROM parity_runs r
            WHERE r.race_lookup IN ($rlPh)
              AND r.driver_name = ? AND r.class_index = ?
              AND COALESCE(r.dq_flag, 0) = 0 AND r.ft1320 IS NOT NULL AND r.ft1320 > 0
        ");
        $allEventsStmt->execute(array_merge($raceLookups, [$d['driver_name'], $d['class_index']]));
        $allEventRLs = $allEventsStmt->fetchAll(PDO::FETCH_COLUMN);
        $participatingEventIds = [];
        foreach ($allEventRLs as $rl) {
            if (isset($rlToEvent[$rl])) $participatingEventIds[] = (int)$rlToEvent[$rl]['id'];
        }
        $participatingEventIds = array_values(array_unique($participatingEventIds));

        // Recency weight
        $recencyWeight = 1.0;
        if ($weightRecency && !empty($events)) {
            $weights = [];
            foreach ($participatingEventIds as $eid) {
                foreach ($events as $ev) {
                    if ((int)$ev['id'] === $eid && $ev['start_date_local']) {
                        $daysAgo = (time() - strtotime($ev['start_date_local'])) / 86400;
                        if ($daysAgo <= 30) $weights[] = 1.2;
                        elseif ($daysAgo <= 90) $weights[] = 1.1;
                        elseif ($daysAgo <= 180) $weights[] = 1.0;
                        else $weights[] = 0.9;
                    }
                }
            }
            if (!empty($weights)) $recencyWeight = array_sum($weights) / count($weights);
        }

        $stdDev = (float)($d['et_stddev'] ?? 0);
        $consistencyScore = ($stdDev > 0 && $avgQualET > 0) ? ((int)$d['total_runs'] - ($stdDev / $avgQualET) * (int)$d['total_runs']) : (float)$d['total_runs'];
        $weightedPerf = $avgQualET * (1.0 / $recencyWeight); // lower is better; recent drivers get reduced ET
        $perfScore = mepa_performanceScore($avgQualET, $stdDev, $recencyWeight);

        $qualifyingGrid[] = [
            'position'               => 0,
            'driverName'             => $d['driver_name'],
            'carNumber'              => $d['car_number'],
            'classIndex'             => $d['class_index'],
            'totalRuns'              => (int)$d['total_runs'],
            'bestET'                 => round((float)$d['best_et'], 4),
            'avgET'                  => round((float)$d['avg_et'], 4),
            'stdDev'                 => round($stdDev, 4),
            'qualifyingRuns'         => array_map(function($v) { return round($v, 4); }, $topETs),
            'avgQualifyingET'        => round($avgQualET, 4),
            'participatingEvents'    => $participatingEventIds,
            'participatingEventCount'=> count($participatingEventIds),
            'recencyWeight'          => round($recencyWeight, 3),
            'consistencyScore'       => round($consistencyScore, 2),
            'weightedPerformance'    => round($weightedPerf, 4),
            'performanceScore'       => round($perfScore, 2),
        ];
    }

    // Sort by weighted performance
    usort($qualifyingGrid, function($a, $b) {
        return $a['weightedPerformance'] <=> $b['weightedPerformance'];
    });
    foreach ($qualifyingGrid as $i => &$entry) {
        $entry['position'] = $i + 1;
    }
    unset($entry);

    // Parity analysis
    $parityAnalysis = mepa_compositeParity($qualifyingGrid);

    // Performance clusters
    $clusters = mepa_performanceClusters($qualifyingGrid);

    // Per-event stats
    $eventStats = [];
    foreach ($events as $ev) {
        $rl = $ev['race_lookup'];
        if (!$rl) continue;
        $esStmt = $pdo->prepare("
            SELECT COUNT(*) AS total_runs, AVG(r.ft1320) AS avg_et,
                   STDDEV(r.ft1320) AS et_stddev, MIN(r.ft1320) AS best_et, MAX(r.ft1320) AS worst_et
            FROM parity_runs r
            WHERE r.race_lookup = ? AND COALESCE(r.dq_flag,0) = 0
              AND r.ft1320 IS NOT NULL AND r.ft1320 > 0 $classFilter
        ");
        $esStmt->execute(array_merge([$rl], $classParams));
        $es = $esStmt->fetch(PDO::FETCH_ASSOC);
        $eventStats[] = [
            'id'        => (int)$ev['id'],
            'name'      => $ev['event_name'],
            'date'      => $ev['start_date_local'],
            'totalRuns' => (int)($es['total_runs'] ?? 0),
            'avgET'     => round((float)($es['avg_et'] ?? 0), 4),
            'stdDev'    => round((float)($es['et_stddev'] ?? 0), 4),
            'bestET'    => round((float)($es['best_et'] ?? 0), 4),
            'worstET'   => round((float)($es['worst_et'] ?? 0), 4),
        ];
    }

    // Date range
    $dates = array_filter(array_column($events, 'start_date_local'));
    $endDates = array_filter(array_column($events, 'end_date_local'));

    rsa_jsonResponse([
        'virtualSession' => [
            'totalEntries'   => count($qualifyingGrid),
            'totalRuns'      => (int)array_sum(array_column($driverRows, 'total_runs')),
            'dateRange'      => [
                'start' => !empty($dates) ? min($dates) : null,
                'end'   => !empty($endDates) ? max($endDates) : null,
            ],
            'selectedEvents'  => count($eventIds),
            'omittedEvents'   => count($omittedIds),
            'effectiveEvents' => count($effectiveIds),
            'events'          => $eventStats,
        ],
        'qualifyingGrid'      => $qualifyingGrid,
        'parityAnalysis'      => $parityAnalysis,
        'performanceClusters' => $clusters,
        'filters' => [
            'category'          => $category,
            'classIndex'        => $classIndex,
            'minRunsPerDriver'  => $minRuns,
            'weightByRecency'   => $weightRecency,
        ],
    ]);
}

// ============================================================================
// GET ?action=eventOutlierAnalysis&eventIds=[1,2,3]
// Analyzes selected events against historical baselines to detect outliers.
// ============================================================================

function handleEventOutlierAnalysis(PDO $pdo): void {
    $eventIds = json_decode($_GET['eventIds'] ?? '[]', true);
    if (!is_array($eventIds) || count($eventIds) === 0) {
        rsa_jsonResponse(['error' => 'eventIds is required (JSON array)'], 400);
    }
    $eventIds = array_map('intval', $eventIds);

    // Historical baseline: all events in last 2 years
    $histStmt = $pdo->query("
        SELECT e.id, e.event_name, e.start_date_local, e.race_lookup
        FROM parity_events e
        WHERE e.start_date_local >= DATE_SUB(CURDATE(), INTERVAL 2 YEAR)
          AND e.race_lookup IS NOT NULL
        ORDER BY e.start_date_local
    ");
    $histEvents = $histStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get run stats per historical event
    $histStats = [];
    foreach ($histEvents as $he) {
        $rs = $pdo->prepare("
            SELECT COUNT(*) AS total_runs, AVG(ft1320) AS avg_et, STDDEV(ft1320) AS et_stddev
            FROM parity_runs
            WHERE race_lookup = ? AND COALESCE(dq_flag,0)=0 AND ft1320 IS NOT NULL AND ft1320 > 0
        ");
        $rs->execute([$he['race_lookup']]);
        $s = $rs->fetch(PDO::FETCH_ASSOC);
        if ((int)$s['total_runs'] > 0) {
            $histStats[] = [
                'id' => (int)$he['id'],
                'avg_et' => (float)$s['avg_et'],
                'total_runs' => (int)$s['total_runs'],
                'et_stddev' => (float)$s['et_stddev'],
            ];
        }
    }

    if (empty($histStats)) {
        rsa_jsonResponse(['error' => 'No historical data available for baseline'], 400);
    }

    // Historical baselines
    $histAvgETs = array_column($histStats, 'avg_et');
    $histRunCounts = array_column($histStats, 'total_runs');
    $histMeanET = array_sum($histAvgETs) / count($histAvgETs);
    $histStdET  = mepa_stdDev($histAvgETs);
    $histMeanRuns = array_sum($histRunCounts) / count($histRunCounts);

    // Weather baselines from canonical weather
    $wxBaseline = $pdo->query("
        SELECT AVG(temp_f) AS avg_temp, AVG(rh_pct) AS avg_rh, AVG(pressure_inhg) AS avg_bp
        FROM parity_weather_canonical
        WHERE temp_f IS NOT NULL AND rh_pct IS NOT NULL AND pressure_inhg IS NOT NULL
    ")->fetch(PDO::FETCH_ASSOC);
    $histAvgTemp = (float)($wxBaseline['avg_temp'] ?? 70);
    $histAvgRH   = (float)($wxBaseline['avg_rh'] ?? 50);
    $histAvgBP   = (float)($wxBaseline['avg_bp'] ?? 29.92);

    // Analyze each requested event
    $ph = implode(',', array_fill(0, count($eventIds), '?'));
    $evStmt = $pdo->prepare("
        SELECT e.id, e.event_name, e.start_date_local, e.race_lookup
        FROM parity_events e WHERE e.id IN ($ph)
    ");
    $evStmt->execute($eventIds);
    $targetEvents = $evStmt->fetchAll(PDO::FETCH_ASSOC);

    $results = [];
    foreach ($targetEvents as $te) {
        // Run stats
        $rs = $pdo->prepare("
            SELECT COUNT(*) AS total_runs, AVG(ft1320) AS avg_et, MIN(ft1320) AS best_et, MAX(ft1320) AS worst_et
            FROM parity_runs WHERE race_lookup = ? AND COALESCE(dq_flag,0)=0 AND ft1320 IS NOT NULL AND ft1320 > 0
        ");
        $rs->execute([$te['race_lookup']]);
        $runStats = $rs->fetch(PDO::FETCH_ASSOC);
        $totalRuns = (int)($runStats['total_runs'] ?? 0);
        $avgET = (float)($runStats['avg_et'] ?? 0);

        // Weather for this event's time range
        $wxStmt = $pdo->prepare("
            SELECT AVG(wc.temp_f) AS avg_temp, AVG(wc.rh_pct) AS avg_rh, AVG(wc.pressure_inhg) AS avg_bp
            FROM parity_weather_canonical wc
            JOIN parity_runs r ON ABS(TIMESTAMPDIFF(MINUTE, wc.timestamp_utc, r.run_timestamp_utc)) <= 30
            WHERE r.race_lookup = ?
            LIMIT 500
        ");
        // This join could be expensive; use a simpler approach via event dates
        $wxStmt2 = $pdo->prepare("
            SELECT AVG(wc.temp_f) AS avg_temp, AVG(wc.rh_pct) AS avg_rh, AVG(wc.pressure_inhg) AS avg_bp
            FROM parity_weather_canonical wc
            WHERE wc.timestamp_utc BETWEEN ? AND ?
              AND wc.temp_f IS NOT NULL
        ");
        $startTs = $te['start_date_local'] . ' 00:00:00';
        $endTs   = $te['start_date_local'] ? (date('Y-m-d', strtotime($te['start_date_local'] . ' +5 days')) . ' 23:59:59') : null;
        $avgTemp = null; $avgRH = null; $avgBP = null;
        if ($endTs) {
            $wxStmt2->execute([$startTs, $endTs]);
            $wx = $wxStmt2->fetch(PDO::FETCH_ASSOC);
            $avgTemp = $wx['avg_temp'] !== null ? (float)$wx['avg_temp'] : null;
            $avgRH   = $wx['avg_rh'] !== null ? (float)$wx['avg_rh'] : null;
            $avgBP   = $wx['avg_bp'] !== null ? (float)$wx['avg_bp'] : null;
        }

        // Outlier factor detection
        $factors = [
            'weatherExtreme'      => false,
            'trackCondition'      => false,
            'participationAnomaly'=> false,
            'performanceAnomaly'  => false,
            'technicalIssues'     => false,
        ];

        // Weather outlier
        if ($avgTemp !== null && $histStdET > 0) {
            $tempDeviation = abs($avgTemp - $histAvgTemp);
            $factors['weatherExtreme'] = $tempDeviation > 25 || ($avgRH !== null && ($avgRH > 90 || $avgRH < 15)) || ($avgBP !== null && abs($avgBP - 29.92) > 1.0);
        }

        // Performance outlier
        if ($avgET > 0 && $histStdET > 0) {
            $perfZScore = abs($avgET - $histMeanET) / $histStdET;
            $factors['performanceAnomaly'] = $perfZScore > 2;
        }

        // Participation anomaly
        $factors['participationAnomaly'] = $totalRuns < ($histMeanRuns * 0.5);

        // Track condition: high internal stddev relative to historical
        $internalStdDev = 0;
        if ($totalRuns > 2) {
            $sdStmt = $pdo->prepare("SELECT STDDEV(ft1320) AS sd FROM parity_runs WHERE race_lookup = ? AND COALESCE(dq_flag,0)=0 AND ft1320 IS NOT NULL AND ft1320 > 0");
            $sdStmt->execute([$te['race_lookup']]);
            $internalStdDev = (float)($sdStmt->fetchColumn() ?? 0);
            $histInternalSDs = array_column($histStats, 'et_stddev');
            $avgHistSD = !empty($histInternalSDs) ? (array_sum($histInternalSDs) / count($histInternalSDs)) : 0;
            $factors['trackCondition'] = $avgHistSD > 0 && ($internalStdDev > $avgHistSD * 2);
        }

        // Score
        $weights = [
            'weatherExtreme' => 0.3, 'trackCondition' => 0.25,
            'participationAnomaly' => 0.2, 'performanceAnomaly' => 0.2,
            'technicalIssues' => 0.05,
        ];
        $score = 0;
        foreach ($factors as $f => $isOutlier) {
            $score += $isOutlier ? $weights[$f] * 100 : 0;
        }

        $recommendation = 'include';
        if ($score >= 70) $recommendation = 'exclude';
        elseif ($score >= 40) $recommendation = 'review';

        $results[] = [
            'eventId'        => (int)$te['id'],
            'eventName'      => $te['event_name'],
            'eventDate'      => $te['start_date_local'],
            'outlierScore'   => min(round($score, 1), 100),
            'outlierFactors' => $factors,
            'recommendation' => $recommendation,
            'metrics' => [
                'avgET'       => round($avgET, 4),
                'totalRuns'   => $totalRuns,
                'avgTemp'     => $avgTemp !== null ? round($avgTemp, 1) : null,
                'avgHumidity' => $avgRH !== null ? round($avgRH, 1) : null,
                'avgPressure' => $avgBP !== null ? round($avgBP, 3) : null,
            ],
        ];
    }

    rsa_jsonResponse($results);
}

// ── Multi-event parity helper functions ──────────────────────────────────

function mepa_stdDev(array $values): float {
    if (count($values) < 2) return 0;
    $mean = array_sum($values) / count($values);
    $variance = array_sum(array_map(function($v) use ($mean) { return pow($v - $mean, 2); }, $values)) / count($values);
    return sqrt($variance);
}

function mepa_performanceScore(float $avgET, float $stdDev, float $recencyWeight): float {
    if ($avgET <= 0) return 0;
    $consistencyPenalty = ($stdDev / $avgET) * 100;
    $baseScore = max(0, 100 - $consistencyPenalty);
    return $baseScore * $recencyWeight;
}

function mepa_compositeParity(array $grid): array {
    if (empty($grid)) {
        return ['parityIndex' => 0, 'meanET' => 0, 'standardDeviation' => 0, 'outlierThreshold' => 0, 'eliteThreshold' => 0, 'outlierCount' => 0, 'eliteCount' => 0, 'totalEntries' => 0];
    }
    $avgETs = array_column($grid, 'avgQualifyingET');
    $mean = array_sum($avgETs) / count($avgETs);
    $stdDev = mepa_stdDev($avgETs);
    $parityIndex = $mean > 0 ? ($stdDev / $mean) * 100 : 0;
    $outlierThreshold = $mean + (2 * $stdDev);
    $eliteThreshold = $mean - $stdDev;

    $outlierCount = count(array_filter($avgETs, function($et) use ($outlierThreshold) { return $et > $outlierThreshold; }));
    $eliteCount = count(array_filter($avgETs, function($et) use ($eliteThreshold) { return $et < $eliteThreshold; }));

    return [
        'parityIndex'       => round($parityIndex, 3),
        'meanET'            => round($mean, 4),
        'standardDeviation' => round($stdDev, 4),
        'outlierThreshold'  => round($outlierThreshold, 4),
        'eliteThreshold'    => round($eliteThreshold, 4),
        'outlierCount'      => $outlierCount,
        'eliteCount'        => $eliteCount,
        'totalEntries'      => count($grid),
    ];
}

function mepa_performanceClusters(array $grid): array {
    $clusters = ['elite' => [], 'competitive' => [], 'inconsistent' => [], 'struggling' => []];
    if (empty($grid)) return $clusters;

    $avgETs = array_column($grid, 'avgQualifyingET');
    $mean = array_sum($avgETs) / count($avgETs);
    $stdDev = mepa_stdDev($avgETs);
    if ($stdDev <= 0) $stdDev = 0.001;

    $eliteThreshold = $mean - $stdDev;
    $highVarianceThreshold = $stdDev * 0.8;

    foreach ($grid as $d) {
        $avgET = $d['avgQualifyingET'];
        $consistency = $d['stdDev'];
        $eventCount = $d['participatingEventCount'];

        if ($avgET <= $eliteThreshold && $consistency < $highVarianceThreshold && $eventCount >= 3) {
            $clusters['elite'][] = $d;
        } elseif ($avgET <= $mean && $consistency < ($stdDev * 1.2)) {
            $clusters['competitive'][] = $d;
        } elseif ($consistency > $highVarianceThreshold) {
            $clusters['inconsistent'][] = $d;
        } else {
            $clusters['struggling'][] = $d;
        }
    }
    return $clusters;
}

// Weather calculation function for performance prediction
function parity_computeWeather(float $tempF, float $rhFraction, float $pressureInHg): array {
    // Calculate density altitude and correction factor
    // Using standard weather formulas for drag racing
    
    // Convert to metric for calculations
    $tempC = ($tempF - 32) * 5/9;
    $tempK = $tempC + 273.15;
    $pressurePa = $pressureInHg * 3386.39; // inHg to Pa
    
    // Calculate vapor pressure
    $svp = 610.78 * exp($tempC / ($tempC + 237.3) * 17.27); // Saturation vapor pressure in Pa
    $vp = $svp * $rhFraction; // Actual vapor pressure in Pa
    $dap = $pressurePa - $vp; // Dry air pressure in Pa
    
    // Air density (kg/m³)
    $Rd = 287.05; // Gas constant for dry air
    $Rv = 461.5; // Gas constant for water vapor
    $airDensity = ($dap / ($Rd * $tempK)) + ($vp / ($Rv * $tempK));
    
    // Standard sea level density
    $standardDensity = 1.225; // kg/m³ at 15°C, 1013.25 hPa
    
    // Density altitude calculation
    $densityAltitude = 44330 * (1 - pow($airDensity / $standardDensity, 0.235));
    
    // Correction factor (simplified for drag racing)
    $correctionFactor = sqrt($standardDensity / $airDensity);
    
    return [
        'densityAltitude' => $densityAltitude,
        'correctionFactor' => $correctionFactor,
        'airDensity' => $airDensity,
        'vaporPressure' => $vp,
        'dryAirPressure' => $dap
    ];
}

function handlePerformancePrediction(PDO $pdo): void {
    $category = $_GET['category'] ?? '';
    $trackId = isset($_GET['trackId']) ? (int)$_GET['trackId'] : null;
    $useTrackHistory = isset($_GET['useTrackHistory']) ? $_GET['useTrackHistory'] === '1' : false;
    
    if (empty($category)) {
        rsa_jsonResponse(['error' => 'category is required'], 400);
    }
    
    $response = [
        'category' => $category,
        'trackId' => $trackId,
        'trackName' => null,
        'currentWeather' => null,
        'baseline' => null,
        'prediction' => null,
        'trackHistory' => null,
    ];
    
    // Get track info if trackId provided
    if ($trackId) {
        $trackStmt = $pdo->prepare("SELECT track_name FROM parity_tracks WHERE id = ?");
        $trackStmt->execute([$trackId]);
        $track = $trackStmt->fetch(PDO::FETCH_ASSOC);
        $response['trackName'] = $track['track_name'] ?? null;
    }
    
    // Get current weather for the track (most recent canonical sample)
    $weatherQuery = $trackId 
        ? "SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg, wc.timestamp_utc
           FROM parity_weather_canonical wc
           JOIN parity_tracks t ON 1=1
           WHERE wc.temp_f IS NOT NULL AND wc.rh_pct IS NOT NULL AND wc.pressure_inhg IS NOT NULL
           ORDER BY wc.timestamp_utc DESC LIMIT 1"
        : "SELECT wc.temp_f, wc.rh_pct, wc.pressure_inhg, wc.timestamp_utc
           FROM parity_weather_canonical wc
           WHERE wc.temp_f IS NOT NULL AND wc.rh_pct IS NOT NULL AND wc.pressure_inhg IS NOT NULL
           ORDER BY wc.timestamp_utc DESC LIMIT 1";
    
    $currentWeather = $pdo->query($weatherQuery)->fetch(PDO::FETCH_ASSOC);
    
    if ($currentWeather) {
        // Calculate weather metrics
        $weather = parity_computeWeather($currentWeather['temp_f'], $currentWeather['rh_pct'] / 100, $currentWeather['pressure_inhg']);
        $response['currentWeather'] = [
            'temp_f' => $currentWeather['temp_f'],
            'rh_pct' => $currentWeather['rh_pct'],
            'pressure_inhg' => $currentWeather['pressure_inhg'],
            'densityAltitude' => $weather['densityAltitude'],
            'correctionFactor' => $weather['correctionFactor'],
            'timestamp' => $currentWeather['timestamp_utc'],
        ];
    }
    
    // ── Pass 1: rough stats for initial outlier bounds ────────────────────
    $roughStmt = $pdo->prepare("
        SELECT AVG(ft1320) AS avg_et,  STDDEV(ft1320) AS sd_et,
               AVG(mph1320) AS avg_mph, STDDEV(mph1320) AS sd_mph
        FROM parity_runs
        WHERE category = ?
          AND COALESCE(dq_flag,0)=0
          AND ft1320  BETWEEN 3.0 AND 15.0
          AND mph1320 BETWEEN 50  AND 400
    ");
    $roughStmt->execute([$category]);
    $rough = $roughStmt->fetch(PDO::FETCH_ASSOC);

    // Rough 3σ cut to remove the most extreme junk before refining
    if ($rough && (float)$rough['avg_et'] > 0 && (float)$rough['sd_et'] > 0) {
        $r3EtMin  = max(3.0,  (float)$rough['avg_et']  - 3.0 * (float)$rough['sd_et']);
        $r3EtMax  = min(15.0, (float)$rough['avg_et']  + 3.0 * (float)$rough['sd_et']);
        $r3MphMin = max(50.0, (float)$rough['avg_mph'] - 3.0 * (float)$rough['sd_mph']);
        $r3MphMax = min(400.0,(float)$rough['avg_mph'] + 3.0 * (float)$rough['sd_mph']);
    } else {
        $r3EtMin = 3.0; $r3EtMax = 15.0; $r3MphMin = 50.0; $r3MphMax = 400.0;
    }

    // ── Pass 2: refined stats within rough bounds ────────────────────────
    $refStmt = $pdo->prepare("
        SELECT AVG(ft1320) AS avg_et,  STDDEV(ft1320) AS sd_et,
               AVG(mph1320) AS avg_mph, STDDEV(mph1320) AS sd_mph
        FROM parity_runs
        WHERE category = ?
          AND COALESCE(dq_flag,0)=0
          AND ft1320  BETWEEN ? AND ?
          AND mph1320 BETWEEN ? AND ?
    ");
    $refStmt->execute([$category, $r3EtMin, $r3EtMax, $r3MphMin, $r3MphMax]);
    $refined = $refStmt->fetch(PDO::FETCH_ASSOC);

    $sigma = 2.0;
    if ($refined && (float)$refined['avg_et'] > 0 && (float)$refined['sd_et'] > 0) {
        $etMin  = max(3.0,  (float)$refined['avg_et']  - $sigma * (float)$refined['sd_et']);
        $etMax  = min(15.0, (float)$refined['avg_et']  + $sigma * (float)$refined['sd_et']);
        $mphMin = max(50.0, (float)$refined['avg_mph'] - $sigma * (float)$refined['sd_mph']);
        $mphMax = min(400.0,(float)$refined['avg_mph'] + $sigma * (float)$refined['sd_mph']);
    } else {
        $etMin = $r3EtMin; $etMax = $r3EtMax; $mphMin = $r3MphMin; $mphMax = $r3MphMax;
    }

    // ── Pass 3: best run within outlier-cleaned bounds ────────────────────
    if ($useTrackHistory && $trackId) {
        $baselineQuery = "
            SELECT r.ft1320 AS best_et, r.mph1320 AS best_mph, cnt.sample_count,
                   cnt.avg_et, cnt.avg_mph
            FROM parity_runs r
            JOIN parity_events e ON r.race_lookup = e.race_lookup
            JOIN (
                SELECT COUNT(*) AS sample_count, AVG(r2.ft1320) AS avg_et, AVG(r2.mph1320) AS avg_mph
                FROM parity_runs r2
                JOIN parity_events e2 ON r2.race_lookup = e2.race_lookup
                WHERE e2.track_id = ? AND r2.category = ?
                  AND COALESCE(r2.dq_flag,0)=0
                  AND r2.ft1320  BETWEEN ? AND ?
                  AND r2.mph1320 BETWEEN ? AND ?
            ) cnt ON 1=1
            WHERE e.track_id = ? AND r.category = ?
              AND COALESCE(r.dq_flag,0)=0
              AND r.ft1320  BETWEEN ? AND ?
              AND r.mph1320 BETWEEN ? AND ?
            ORDER BY r.ft1320 ASC LIMIT 1
        ";
        $baselineStmt = $pdo->prepare($baselineQuery);
        $baselineStmt->execute([$trackId, $category, $etMin, $etMax, $mphMin, $mphMax,
                                  $trackId, $category, $etMin, $etMax, $mphMin, $mphMax]);
        $baselineData = $baselineStmt->fetch(PDO::FETCH_ASSOC);

        if ($baselineData && $baselineData['best_et']) {
            $response['baseline'] = [
                'method'      => 'track_history',
                'baseET'      => (float)$baselineData['best_et'],
                'baseMPH'     => (float)$baselineData['best_mph'],
                'sampleCount' => (int)$baselineData['sample_count'],
                'description' => "Best run at {$response['trackName']}",
            ];
            $response['trackHistory'] = [
                'averageET'   => (float)$baselineData['avg_et'],
                'averageMPH'  => (float)$baselineData['avg_mph'],
                'sampleCount' => (int)$baselineData['sample_count'],
            ];
        }
    } else {
        $baselineQuery = "
            SELECT r.ft1320 AS best_et, r.mph1320 AS best_mph, cnt.sample_count
            FROM parity_runs r
            JOIN (
                SELECT COUNT(*) AS sample_count
                FROM parity_runs
                WHERE category = ?
                  AND COALESCE(dq_flag,0)=0
                  AND ft1320  BETWEEN ? AND ?
                  AND mph1320 BETWEEN ? AND ?
            ) cnt ON 1=1
            WHERE r.category = ?
              AND COALESCE(r.dq_flag,0)=0
              AND r.ft1320  BETWEEN ? AND ?
              AND r.mph1320 BETWEEN ? AND ?
            ORDER BY r.ft1320 ASC LIMIT 1
        ";
        $baselineStmt = $pdo->prepare($baselineQuery);
        $baselineStmt->execute([$category, $etMin, $etMax, $mphMin, $mphMax,
                                  $category, $etMin, $etMax, $mphMin, $mphMax]);
        $baselineData = $baselineStmt->fetch(PDO::FETCH_ASSOC);

        if ($baselineData && $baselineData['best_et']) {
            $response['baseline'] = [
                'method'      => 'best_run',
                'baseET'      => (float)$baselineData['best_et'],
                'baseMPH'     => (float)$baselineData['best_mph'],
                'sampleCount' => (int)$baselineData['sample_count'],
                'description' => 'Best run from all events',
            ];
        }
    }

    // ── Per-driver predictions ────────────────────────────────────────────
    // Best clean run per driver within outlier bounds, then apply same CF
    $driverStmt = $pdo->prepare("
        SELECT r.driver_name, r.car_number, r.class_index, r.run_timestamp_utc,
               r.ft1320 AS best_et, r.mph1320 AS best_mph
        FROM parity_runs r
        JOIN (
            SELECT driver_name, MIN(ft1320) AS min_et
            FROM parity_runs
            WHERE category = ?
              AND COALESCE(dq_flag,0)=0
              AND ft1320  BETWEEN ? AND ?
              AND mph1320 BETWEEN ? AND ?
            GROUP BY driver_name
        ) best ON r.driver_name = best.driver_name AND r.ft1320 = best.min_et
        WHERE r.category = ?
          AND COALESCE(r.dq_flag,0)=0
          AND r.mph1320 BETWEEN ? AND ?
        ORDER BY r.ft1320 ASC
        LIMIT 30
    ");
    $driverStmt->execute([$category, $etMin, $etMax, $mphMin, $mphMax,
                           $category, $mphMin, $mphMax]);
    $driverRows = $driverStmt->fetchAll(PDO::FETCH_ASSOC);

    $response['driverPredictions'] = [];
    if ($currentWeather && !empty($driverRows)) {
        $cf = $response['currentWeather']['correctionFactor'] ?? 1.0;
        foreach ($driverRows as $dr) {
            $bET  = (float)$dr['best_et'];
            $bMPH = (float)$dr['best_mph'];
            $pET  = $bET  * $cf;
            $pMPH = $bMPH / $cf;
            $response['driverPredictions'][] = [
                'driverName'   => $dr['driver_name'],
                'carNumber'    => $dr['car_number'],
                'baselineET'   => $bET,
                'baselineMPH'  => $bMPH,
                'predictedET'  => $pET,
                'predictedMPH' => $pMPH,
                'adjustmentET' => $pET  - $bET,
                'adjustmentMPH'=> $pMPH - $bMPH,
            ];
        }
    }

    // ── Group by engine combo ─────────────────────────────────────────────
    // Load all driver combos + class defaults (same resolution logic as other handlers)
    $response['comboPredictions'] = [];
    if (!empty($response['driverPredictions'])) {
        $allDC = $pdo->query("
            SELECT dc.driver_name, dc.class_index, dc.engine_combo_id,
                   ec.name AS engine_combo_name, dc.effective_from_utc, dc.effective_to_utc
            FROM parity_driver_combos dc
            JOIN parity_engine_combos ec ON ec.id = dc.engine_combo_id
        ")->fetchAll(PDO::FETCH_ASSOC);

        $allCD = $pdo->query("
            SELECT cd.class_index, cd.engine_combo_id,
                   ec.name AS engine_combo_name, cd.effective_from_utc, cd.effective_to_utc
            FROM parity_class_defaults cd
            JOIN parity_engine_combos ec ON ec.id = cd.engine_combo_id
        ")->fetchAll(PDO::FETCH_ASSOC);

        // Resolve combo for a driver/class/timestamp (mirrors resolution in other handlers)
        $resolveCombo = function($driverName, $classIndex, $runTs) use ($allDC, $allCD) {
            $dn = strtoupper(trim($driverName));
            $ci = strtoupper(trim($classIndex));
            $comboId = null; $comboName = null; $bestFrom = '';
            foreach ($allDC as $dc) {
                if (strtoupper($dc['driver_name']) !== $dn) continue;
                if (strtoupper($dc['class_index'])  !== $ci) continue;
                if ($runTs && $runTs < $dc['effective_from_utc']) continue;
                if ($dc['effective_to_utc'] !== null && $runTs && $runTs >= $dc['effective_to_utc']) continue;
                if ($dc['effective_from_utc'] >= $bestFrom) {
                    $bestFrom  = $dc['effective_from_utc'];
                    $comboId   = (int)$dc['engine_combo_id'];
                    $comboName = $dc['engine_combo_name'];
                }
            }
            if ($comboId === null) { // class default fallback
                $bestFrom = '';
                foreach ($allCD as $cd) {
                    if (strtoupper($cd['class_index']) !== $ci) continue;
                    if ($runTs && $runTs < $cd['effective_from_utc']) continue;
                    if ($cd['effective_to_utc'] !== null && $runTs && $runTs >= $cd['effective_to_utc']) continue;
                    if ($cd['effective_from_utc'] >= $bestFrom) {
                        $bestFrom  = $cd['effective_from_utc'];
                        $comboId   = (int)$cd['engine_combo_id'];
                        $comboName = $cd['engine_combo_name'];
                    }
                }
            }
            return $comboId ? ['comboId' => $comboId, 'comboName' => $comboName] : null;
        };

        // Group driverPredictions by combo (already ET ASC so first per combo = best)
        $comboPredictions = [];
        foreach ($driverRows as $dr) {
            $ci = $resolveCombo($dr['driver_name'], $dr['class_index'] ?? '', $dr['run_timestamp_utc'] ?? '');
            if (!$ci) continue;
            $cid = $ci['comboId'];
            if (!isset($comboPredictions[$cid])) {
                // find matching driverPrediction entry
                $dp = null;
                foreach ($response['driverPredictions'] as $d) {
                    if ($d['driverName'] === $dr['driver_name']) { $dp = $d; break; }
                }
                if (!$dp) continue;
                $comboPredictions[$cid] = [
                    'comboId'      => $cid,
                    'comboName'    => $ci['comboName'],
                    'baselineET'   => $dp['baselineET'],
                    'baselineMPH'  => $dp['baselineMPH'],
                    'predictedET'  => $dp['predictedET'],
                    'predictedMPH' => $dp['predictedMPH'],
                    'adjustmentET' => $dp['adjustmentET'],
                    'adjustmentMPH'=> $dp['adjustmentMPH'],
                    'bestDriver'   => $dp['driverName'],
                ];
            }
        }

        usort($comboPredictions, function($a, $b) { return $a['baselineET'] <=> $b['baselineET']; });
        $response['comboPredictions'] = array_values($comboPredictions);
    }

    // ── Overall prediction ────────────────────────────────────────────────
    if ($response['baseline'] && $response['currentWeather']) {
        $cf = $response['currentWeather']['correctionFactor'];
        $bET  = $response['baseline']['baseET'];
        $bMPH = $response['baseline']['baseMPH'];
        $response['prediction'] = [
            'predictedET'   => $bET  * $cf,
            'predictedMPH'  => $bMPH / $cf,
            'adjustmentET'  => $bET  * $cf - $bET,
            'adjustmentMPH' => $bMPH / $cf - $bMPH,
        ];
    } elseif (!$response['currentWeather']) {
        $response['error'] = 'No current weather data available';
    } elseif (!$response['baseline']) {
        $response['error'] = 'No baseline performance data found for this category';
    }

    rsa_jsonResponse($response);
}
