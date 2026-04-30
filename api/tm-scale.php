<?php
/**
 * Tech Master — Scale MVP API
 *
 * Endpoints for scale_records, scale_rules, compliance checking, run-linking.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST).
 *
 * Actions:
 *   POST ?action=createRecord              — create a scale record (combined/driver/car)
 *   GET  ?action=listByEvent&eventInstanceId=N  — scale records for an event
 *   GET  ?action=listByEntry&eventEntryId=N     — scale records for an entry
 *   GET  ?action=getRecord&id=N                 — single scale record detail
 *   GET  ?action=driverReference&eventEntryId=N — active driver reference weight
 *   GET  ?action=compliance&scaleRecordId=N     — compliance check for a record
 *   POST ?action=updateRunLink                  — manual run-link reassignment
 *   GET  ?action=listRules                      — list active scale rules
 *   POST ?action=upsertRule                     — create/update a scale rule
 *   GET  ?action=entryScaleStatus&eventEntryId=N — scale readiness summary for entry
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

$auth = rsa_requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

switch ($action) {
    case 'createRecord':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreateRecord($pdo, $userId);
        break;
    case 'listByEvent':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListByEvent($pdo);
        break;
    case 'listByEntry':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListByEntry($pdo);
        break;
    case 'getRecord':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGetRecord($pdo);
        break;
    case 'driverReference':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleDriverReference($pdo);
        break;
    case 'compliance':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleCompliance($pdo);
        break;
    case 'updateRunLink':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateRunLink($pdo, $userId);
        break;
    case 'listRules':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListRules($pdo);
        break;
    case 'upsertRule':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpsertRule($pdo, $userId);
        break;
    case 'entryScaleStatus':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleEntryScaleStatus($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Handlers ────────────────────────────────────────────────────────────

/**
 * Create a scale record. Automatically:
 * - Creates a tech_case (case_type='scale') for the entry
 * - Inserts the scale_record detail row
 * - Attempts auto-linking to the nearest prior run
 * - Generates compliance findings/flags
 */
function handleCreateRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();

    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $mode = tm_requireParam($body, 'measurement_mode');
    if (!in_array($mode, ['combined', 'driver_only', 'car_only'])) {
        tm_error("Invalid measurement_mode: must be combined, driver_only, or car_only", 400);
    }

    // Verify entry exists and load its details
    $entry = loadEntry($pdo, $entryId);

    // Validate mode-specific required fields
    $totalWeight = isset($body['measured_total_weight']) ? (float)$body['measured_total_weight'] : null;
    $driverWeight = isset($body['measured_driver_weight']) ? (float)$body['measured_driver_weight'] : null;
    $carWeight = isset($body['measured_car_weight']) ? (float)$body['measured_car_weight'] : null;
    $rearAxleWeight = isset($body['measured_rear_axle_weight']) ? (float)$body['measured_rear_axle_weight'] : null;

    if ($mode === 'combined' && $totalWeight === null) {
        tm_error('measured_total_weight is required for combined mode', 400);
    }
    if ($mode === 'driver_only' && $driverWeight === null) {
        tm_error('measured_driver_weight is required for driver_only mode', 400);
    }
    if ($mode === 'car_only' && $carWeight === null) {
        tm_error('measured_car_weight is required for car_only mode', 400);
    }

    // For car_only: derive total from car weight + active driver reference
    $derivedTotal = null;
    $driverRef = null;
    if ($mode === 'car_only') {
        $driverRef = getActiveDriverReference($pdo, $entryId);
        if ($driverRef !== null && $carWeight !== null) {
            $derivedTotal = round($carWeight + $driverRef, 2);
        }
    }

    // 1. Create tech_case
    $caseUuid = tm_uuid();
    $pdo->prepare("
        INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, operator_id, location, summary, created_by)
        VALUES (?, ?, 'scale', 'closed', NOW(), ?, ?, ?, ?)
    ")->execute([
        $caseUuid,
        $entryId,
        tm_optionalInt($body, 'operator_id'),
        tm_optionalParam($body, 'scale_station'),
        "Scale: $mode",
        $userId,
    ]);
    $caseId = (int)$pdo->lastInsertId();

    // Close case immediately (scale records are point-in-time)
    $pdo->prepare("UPDATE tech_cases SET status = 'closed', closed_at = NOW() WHERE id = ?")->execute([$caseId]);

    // 2. Attempt run-linking
    $linkedRunId = null;
    $linkMethod = 'unlinked';
    $linkConfidence = 'none';
    if ($mode !== 'driver_only') {
        $runLink = findNearestPriorRun($pdo, $entry);
        if ($runLink) {
            $linkedRunId = $runLink['id'];
            $linkMethod = $runLink['method'];
            $linkConfidence = $runLink['confidence'];
        }
    }

    // 3. Insert scale_record
    $recordUuid = tm_uuid();
    $isOfficial = (int)($body['is_official'] ?? 1);

    $pdo->prepare("
        INSERT INTO scale_records
            (uuid, tech_case_id, event_entry_id, measurement_mode,
             measured_total_weight, measured_driver_weight, measured_car_weight,
             measured_rear_axle_weight, derived_total_weight, is_official,
             linked_run_id, link_method, link_confidence, measured_at, operator_id, scale_station,
             notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    ")->execute([
        $recordUuid,
        $caseId,
        $entryId,
        $mode,
        $totalWeight,
        $driverWeight,
        $carWeight,
        $rearAxleWeight,
        $derivedTotal,
        $isOfficial,
        $linkedRunId,
        $linkMethod,
        $linkConfidence,
        tm_optionalInt($body, 'operator_id'),
        tm_optionalParam($body, 'scale_station'),
        tm_optionalParam($body, 'notes'),
        $userId,
    ]);
    $recordId = (int)$pdo->lastInsertId();

    // 4. Generate compliance findings
    $flags = generateScaleFindings($pdo, $recordId, $caseId, $entry, $mode, [
        'total' => $totalWeight,
        'driver' => $driverWeight,
        'car' => $carWeight,
        'rear_axle' => $rearAxleWeight,
        'derived_total' => $derivedTotal,
        'driver_ref' => $driverRef,
        'linked_run_id' => $linkedRunId,
        'link_method' => $linkMethod,
    ], $userId);

    tm_json([
        'id' => $recordId,
        'uuid' => $recordUuid,
        'tech_case_id' => $caseId,
        'measurement_mode' => $mode,
        'derived_total_weight' => $derivedTotal,
        'linked_run_id' => $linkedRunId,
        'link_method' => $linkMethod,
        'link_confidence' => $linkConfidence,
        'flags' => $flags,
    ], 201);
}

function handleListByEvent(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventInstanceId) tm_error('Missing eventInstanceId', 400);

    $stmt = $pdo->prepare("
        SELECT sr.*,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name,
               o.name AS org_name
        FROM scale_records sr
        JOIN event_entries ee ON sr.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE ee.event_instance_id = ?
        ORDER BY sr.measured_at DESC
    ");
    $stmt->execute([$eventInstanceId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['records' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventInstanceId]);
}

function handleListByEntry(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $stmt = $pdo->prepare("
        SELECT sr.*
        FROM scale_records sr
        WHERE sr.event_entry_id = ?
        ORDER BY sr.measured_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['records' => $rows, 'count' => count($rows)]);
}

function handleGetRecord(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $stmt = $pdo->prepare("
        SELECT sr.*,
               ee.competition_number, ee.class_index, ee.category, ee.event_instance_id,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_description,
               ei.name AS event_name
        FROM scale_records sr
        JOIN event_entries ee ON sr.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE sr.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Scale record not found', 404);

    // Include findings from the tech case
    $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $fStmt->execute([(int)$row['tech_case_id']]);
    $row['findings'] = $fStmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['record' => $row]);
}

function handleDriverReference(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $weight = getActiveDriverReference($pdo, $entryId);

    // Also return the full record for context
    $stmt = $pdo->prepare("
        SELECT sr.id, sr.measured_driver_weight, sr.measured_at, sr.is_official
        FROM scale_records sr
        WHERE sr.event_entry_id = ? AND sr.measurement_mode = 'driver_only' AND sr.is_official = 1
        ORDER BY sr.measured_at DESC
        LIMIT 1
    ");
    $stmt->execute([$entryId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);

    tm_json([
        'driver_weight' => $weight,
        'has_reference' => $weight !== null,
        'reference_record' => $record ?: null,
    ]);
}

function handleCompliance(PDO $pdo): void {
    $recordId = (int)($_GET['scaleRecordId'] ?? 0);
    if (!$recordId) tm_error('Missing scaleRecordId', 400);

    // Load record
    $stmt = $pdo->prepare("
        SELECT sr.*, ee.category, ee.class_index
        FROM scale_records sr
        JOIN event_entries ee ON sr.event_entry_id = ee.id
        WHERE sr.id = ?
    ");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$record) tm_error('Scale record not found', 404);

    // Load applicable rule
    $rule = getScaleRule($pdo, $record['category'], $record['class_index']);

    // Load findings for this case
    $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $fStmt->execute([(int)$record['tech_case_id']]);
    $findings = $fStmt->fetchAll(PDO::FETCH_ASSOC);

    $effectiveWeight = $record['measured_total_weight'] ?? $record['derived_total_weight'];
    $underMin = false;
    $underRear = false;
    if ($rule && $rule['min_total_weight'] && $effectiveWeight !== null) {
        $underMin = (float)$effectiveWeight < (float)$rule['min_total_weight'];
    }
    if ($rule && $rule['min_rear_axle_weight'] && $record['measured_rear_axle_weight'] !== null) {
        $underRear = (float)$record['measured_rear_axle_weight'] < (float)$rule['min_rear_axle_weight'];
    }

    $result = $underMin || $underRear ? 'fail' : 'pass';
    $openFlags = count(array_filter($findings, fn($f) => $f['disposition'] === 'open'));
    if ($openFlags > 0) $result = 'review';

    tm_json([
        'record_id' => $recordId,
        'result' => $result,
        'effective_weight' => $effectiveWeight !== null ? (float)$effectiveWeight : null,
        'rule' => $rule,
        'under_minimum_total' => $underMin,
        'under_minimum_rear' => $underRear,
        'findings' => $findings,
        'open_flag_count' => $openFlags,
    ]);
}

function handleUpdateRunLink(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recordId = (int)tm_requireParam($body, 'scale_record_id');
    $runId = isset($body['run_id']) ? (int)$body['run_id'] : null;

    $check = $pdo->prepare("SELECT id FROM scale_records WHERE id = ?");
    $check->execute([$recordId]);
    if (!$check->fetch()) tm_error('Scale record not found', 404);

    if ($runId) {
        $runCheck = $pdo->prepare("SELECT id FROM parity_runs WHERE id = ?");
        $runCheck->execute([$runId]);
        if (!$runCheck->fetch()) tm_error('Run not found', 404);
    }

    $method = $runId ? 'manual' : 'unlinked';
    $pdo->prepare("UPDATE scale_records SET linked_run_id = ?, link_method = ? WHERE id = ?")
        ->execute([$runId, $method, $recordId]);

    tm_json(['updated' => true, 'id' => $recordId, 'linked_run_id' => $runId, 'link_method' => $method]);
}

function handleListRules(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $activeOnly = ($_GET['activeOnly'] ?? '1') === '1';

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND category = ?'; $params[] = $category; }
    if ($activeOnly) { $where .= ' AND is_active = 1'; }

    $stmt = $pdo->prepare("SELECT * FROM scale_rules WHERE $where ORDER BY category, class_index");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['rules' => $rows, 'count' => count($rows)]);
}

function handleUpsertRule(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $category = tm_requireParam($body, 'category');
    $classIndex = tm_requireParam($body, 'class_index');
    $seasonYear = isset($body['season_year']) ? (int)$body['season_year'] : null;

    $pdo->prepare("
        INSERT INTO scale_rules (category, class_index, season_year, min_total_weight, min_rear_axle_weight, rear_axle_required, driver_weigh_required, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            min_total_weight = VALUES(min_total_weight),
            min_rear_axle_weight = VALUES(min_rear_axle_weight),
            rear_axle_required = VALUES(rear_axle_required),
            driver_weigh_required = VALUES(driver_weigh_required),
            notes = VALUES(notes)
    ")->execute([
        $category,
        $classIndex,
        $seasonYear,
        isset($body['min_total_weight']) ? (float)$body['min_total_weight'] : null,
        isset($body['min_rear_axle_weight']) ? (float)$body['min_rear_axle_weight'] : null,
        (int)($body['rear_axle_required'] ?? 0),
        (int)($body['driver_weigh_required'] ?? 0),
        tm_optionalParam($body, 'notes'),
    ]);

    tm_json(['upserted' => true, 'category' => $category, 'class_index' => $classIndex]);
}

function handleEntryScaleStatus(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $entry = loadEntry($pdo, $entryId);
    $rule = getScaleRule($pdo, $entry['category'], $entry['class_index']);
    $driverRef = getActiveDriverReference($pdo, $entryId);

    // Latest official combined or car_only record
    $latestStmt = $pdo->prepare("
        SELECT * FROM scale_records
        WHERE event_entry_id = ? AND measurement_mode IN ('combined','car_only') AND is_official = 1
        ORDER BY measured_at DESC LIMIT 1
    ");
    $latestStmt->execute([$entryId]);
    $latestRecord = $latestStmt->fetch(PDO::FETCH_ASSOC);

    $totalRecords = $pdo->prepare("SELECT COUNT(*) FROM scale_records WHERE event_entry_id = ?");
    $totalRecords->execute([$entryId]);
    $recordCount = (int)$totalRecords->fetchColumn();

    $effectiveWeight = null;
    if ($latestRecord) {
        $effectiveWeight = $latestRecord['measured_total_weight'] ?? $latestRecord['derived_total_weight'];
    }

    $needsDriverRef = $rule && $rule['driver_weigh_required'] && $driverRef === null;
    $underMin = false;
    if ($rule && $rule['min_total_weight'] && $effectiveWeight !== null) {
        $underMin = (float)$effectiveWeight < (float)$rule['min_total_weight'];
    }

    tm_json([
        'entry_id' => $entryId,
        'rule' => $rule,
        'driver_reference_weight' => $driverRef,
        'needs_driver_reference' => $needsDriverRef,
        'latest_record' => $latestRecord,
        'effective_weight' => $effectiveWeight !== null ? (float)$effectiveWeight : null,
        'under_minimum' => $underMin,
        'record_count' => $recordCount,
        'scale_status' => $recordCount === 0 ? 'not_weighed' : ($underMin ? 'under_minimum' : 'weighed'),
    ]);
}

// ── Helper functions ────────────────────────────────────────────────────

function loadEntry(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT ee.*, ei.race_lookup, ei.start_date_local, ei.end_date_local,
               p.display_name AS person_name, p.normalized_name
        FROM event_entries ee
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        WHERE ee.id = ?
    ");
    $stmt->execute([$entryId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Event entry not found', 404);
    return $row;
}

function getActiveDriverReference(PDO $pdo, int $entryId): ?float {
    $stmt = $pdo->prepare("
        SELECT measured_driver_weight FROM scale_records
        WHERE event_entry_id = ? AND measurement_mode = 'driver_only' AND is_official = 1
        ORDER BY measured_at DESC LIMIT 1
    ");
    $stmt->execute([$entryId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? (float)$row['measured_driver_weight'] : null;
}

function getScaleRule(PDO $pdo, ?string $category, ?string $classIndex): ?array {
    if (!$category || !$classIndex) return null;

    // Try exact match first (with season), then without season
    $stmt = $pdo->prepare("
        SELECT * FROM scale_rules
        WHERE category = ? AND class_index = ? AND is_active = 1
        ORDER BY season_year DESC
        LIMIT 1
    ");
    $stmt->execute([$category, $classIndex]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Find the nearest prior parity_run for this event entry.
 * Returns: { id, method, confidence } or null.
 *
 * Strategy priority:
 *   1. Direct FK link (event_entry_id on parity_runs) → high confidence
 *   2. race_lookup + UPPER(driver_name) match → medium confidence
 *   3. race_lookup + car_number match → low confidence
 */
function findNearestPriorRun(PDO $pdo, array $entry): ?array {
    $entryId = (int)$entry['id'];

    // Strategy 1: Direct FK link (event_entry_id on parity_runs) — HIGH
    $stmt = $pdo->prepare("
        SELECT id, run_timestamp_utc FROM parity_runs
        WHERE event_entry_id = ?
        ORDER BY run_timestamp_utc DESC LIMIT 1
    ");
    $stmt->execute([$entryId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($row) return ['id' => (int)$row['id'], 'method' => 'auto_fk', 'confidence' => 'high'];

    // Strategy 2: race_lookup + driver_name — MEDIUM
    $raceLookup = $entry['race_lookup'] ?? null;
    $normalizedName = $entry['normalized_name'] ?? null;
    $compNum = $entry['competition_number'] ?? null;

    if ($raceLookup && $normalizedName) {
        $stmt = $pdo->prepare("
            SELECT id, run_timestamp_utc FROM parity_runs
            WHERE race_lookup = ? AND UPPER(driver_name) = ?
            ORDER BY run_timestamp_utc DESC LIMIT 1
        ");
        $stmt->execute([$raceLookup, $normalizedName]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return ['id' => (int)$row['id'], 'method' => 'auto_name', 'confidence' => 'medium'];
    }

    // Strategy 3: race_lookup + car_number — LOW
    if ($raceLookup && $compNum) {
        $stmt = $pdo->prepare("
            SELECT id, run_timestamp_utc FROM parity_runs
            WHERE race_lookup = ? AND car_number = ?
            ORDER BY run_timestamp_utc DESC LIMIT 1
        ");
        $stmt->execute([$raceLookup, $compNum]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) return ['id' => (int)$row['id'], 'method' => 'auto_carnum', 'confidence' => 'low'];
    }

    return null;
}

/**
 * Generate compliance findings for a scale record.
 * Returns array of flag descriptions generated.
 */
function generateScaleFindings(PDO $pdo, int $recordId, int $caseId, array $entry, string $mode, array $weights, int $userId): array {
    $flags = [];
    $rule = getScaleRule($pdo, $entry['category'], $entry['class_index']);

    $insertFinding = $pdo->prepare("
        INSERT INTO tech_findings (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
    ");

    // Flag 1: Missing driver reference when car_only
    if ($mode === 'car_only' && $weights['driver_ref'] === null) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'medium',
            'Car-only weigh with no active driver reference weight. Derived total cannot be computed.',
            null, 'Driver reference weigh required', $userId]);
        $flags[] = 'missing_driver_reference';
    }

    // Flag 2: Under minimum total weight
    $effectiveWeight = $weights['total'] ?? $weights['derived_total'];
    if ($rule && $rule['min_total_weight'] && $effectiveWeight !== null) {
        if ((float)$effectiveWeight < (float)$rule['min_total_weight']) {
            $deficit = round((float)$rule['min_total_weight'] - (float)$effectiveWeight, 2);
            $insertFinding->execute([tm_uuid(), $caseId, 'discrepancy', 'high',
                "Under minimum total weight by {$deficit} lbs.",
                (string)$effectiveWeight, (string)$rule['min_total_weight'], $userId]);
            $flags[] = 'under_minimum_total';
        }
    }

    // Flag 3: Under minimum rear axle weight
    if ($rule && $rule['min_rear_axle_weight'] && $weights['rear_axle'] !== null) {
        if ((float)$weights['rear_axle'] < (float)$rule['min_rear_axle_weight']) {
            $deficit = round((float)$rule['min_rear_axle_weight'] - (float)$weights['rear_axle'], 2);
            $insertFinding->execute([tm_uuid(), $caseId, 'discrepancy', 'high',
                "Under minimum rear axle weight by {$deficit} lbs.",
                (string)$weights['rear_axle'], (string)$rule['min_rear_axle_weight'], $userId]);
            $flags[] = 'under_minimum_rear_axle';
        }
    }

    // Flag 4: Missing rear axle when required
    if ($rule && $rule['rear_axle_required'] && $mode !== 'driver_only' && $weights['rear_axle'] === null) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'low',
            'Rear axle weight required by class rules but not recorded.',
            null, 'Rear axle weight required', $userId]);
        $flags[] = 'missing_rear_axle';
    }

    // Flag 5: No run linked / ambiguous
    if ($mode !== 'driver_only' && $weights['link_method'] === 'unlinked') {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'info',
            'No parity run linked to this scale record. Manual linking may be needed.',
            null, null, $userId]);
        $flags[] = 'no_run_linked';
    }

    // Flag 6: Duplicate / suspiciously close repeat within 5 minutes
    if ($mode !== 'driver_only') {
        $dupStmt = $pdo->prepare("
            SELECT COUNT(*) FROM scale_records
            WHERE event_entry_id = ? AND measurement_mode IN ('combined','car_only')
              AND is_official = 1 AND id != ?
              AND ABS(TIMESTAMPDIFF(SECOND, measured_at, NOW())) < 300
        ");
        $dupStmt->execute([(int)$entry['id'], $recordId]);
        $dupCount = (int)$dupStmt->fetchColumn();
        if ($dupCount > 0) {
            $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'low',
                'Repeat weighing within 5 minutes of a previous record for this entry.',
                null, null, $userId]);
            $flags[] = 'duplicate_close_interval';
        }
    }

    return $flags;
}
