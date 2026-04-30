<?php
/**
 * Tech Master — Fuel MVP API
 *
 * Endpoints for fuel_records, fuel_rules, compliance checking, run-linking.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST).
 *
 * Actions:
 *   POST ?action=createRecord              — create a fuel check record
 *   GET  ?action=listByEvent&eventInstanceId=N  — fuel records for an event
 *   GET  ?action=listByEntry&eventEntryId=N     — fuel records for an entry
 *   GET  ?action=getRecord&id=N                 — single fuel record detail
 *   GET  ?action=compliance&fuelRecordId=N      — compliance check for a record
 *   POST ?action=updateRunLink                  — manual run-link reassignment
 *   GET  ?action=listRules                      — list active fuel rules
 *   POST ?action=upsertRule                     — create/update a fuel rule
 *   GET  ?action=entryFuelStatus&eventEntryId=N — fuel readiness summary for entry
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
    case 'entryFuelStatus':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleEntryFuelStatus($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Handlers ────────────────────────────────────────────────────────────

/**
 * Create a fuel check record. Automatically:
 * - Creates a tech_case (case_type='fuel') for the entry
 * - Inserts the fuel_record detail row
 * - Attempts auto-linking to the nearest prior run
 * - Evaluates SG/dielectric against applicable rule
 * - Generates compliance findings/flags
 */
function handleCreateRecord(PDO $pdo, int $userId): void {
    $body = tm_readBody();

    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $checkType = tm_optionalParam($body, 'check_type', 'spot_check');
    $validCheckTypes = ['spot_check', 'pre_run', 'post_run', 'random', 'confiscation'];
    if (!in_array($checkType, $validCheckTypes)) {
        tm_error("Invalid check_type: must be one of " . implode(', ', $validCheckTypes), 400);
    }

    // Verify entry exists and load its details
    $entry = fuel_loadEntry($pdo, $entryId);

    // Parse measured values
    $sgMeasured = isset($body['sg_measured']) ? (float)$body['sg_measured'] : null;
    $dielectricMeasured = isset($body['dielectric_measured']) ? (float)$body['dielectric_measured'] : null;
    $temperatureF = isset($body['temperature_f']) ? (float)$body['temperature_f'] : null;
    $fuelTypeDeclared = tm_optionalParam($body, 'fuel_type_declared');
    $sampleId = tm_optionalParam($body, 'sample_id');

    // At least one measurement is required
    if ($sgMeasured === null && $dielectricMeasured === null) {
        tm_error('At least one measurement (sg_measured or dielectric_measured) is required', 400);
    }

    // Load applicable rule
    $rule = getFuelRule($pdo, $entry['category'], $entry['class_index']);

    // Evaluate SG compliance
    $sgExpMin = null; $sgExpMax = null; $sgResult = 'no_rule';
    if ($rule && $rule['sg_min'] !== null && $rule['sg_max'] !== null) {
        $sgExpMin = (float)$rule['sg_min'];
        $sgExpMax = (float)$rule['sg_max'];
        if ($sgMeasured !== null) {
            $sgResult = ($sgMeasured >= $sgExpMin && $sgMeasured <= $sgExpMax) ? 'pass' : 'fail';
        }
    }

    // Evaluate dielectric compliance
    $dielExpMin = null; $dielExpMax = null; $dielResult = 'no_rule';
    if ($rule && $rule['dielectric_min'] !== null && $rule['dielectric_max'] !== null) {
        $dielExpMin = (float)$rule['dielectric_min'];
        $dielExpMax = (float)$rule['dielectric_max'];
        if ($dielectricMeasured !== null) {
            $dielResult = ($dielectricMeasured >= $dielExpMin && $dielectricMeasured <= $dielExpMax) ? 'pass' : 'fail';
        }
    }

    // Overall result
    $overallResult = 'pass';
    if ($sgResult === 'fail' || $dielResult === 'fail') {
        $overallResult = 'fail';
    } elseif ($sgResult === 'no_rule' && $dielResult === 'no_rule') {
        $overallResult = 'review';
    }

    // 1. Create tech_case
    $caseUuid = tm_uuid();
    $fuelLabel = $fuelTypeDeclared ? ucfirst($fuelTypeDeclared) : 'Fuel';
    $pdo->prepare("
        INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, operator_id, location, summary, created_by)
        VALUES (?, ?, 'fuel', 'closed', NOW(), ?, ?, ?, ?)
    ")->execute([
        $caseUuid,
        $entryId,
        tm_optionalInt($body, 'operator_id'),
        tm_optionalParam($body, 'test_station'),
        "$fuelLabel check: $checkType",
        $userId,
    ]);
    $caseId = (int)$pdo->lastInsertId();
    $pdo->prepare("UPDATE tech_cases SET status = 'closed', closed_at = NOW() WHERE id = ?")->execute([$caseId]);

    // 2. Attempt run-linking (reuse Scale's findNearestPriorRun if available)
    $linkedRunId = null;
    $linkMethod = 'unlinked';
    $linkConfidence = 'none';
    $runLink = fuel_findNearestPriorRun($pdo, $entry);
    if ($runLink) {
        $linkedRunId = $runLink['id'];
        $linkMethod = $runLink['method'];
        $linkConfidence = $runLink['confidence'];
    }

    // 3. Insert fuel_record
    $recordUuid = tm_uuid();
    $isOfficial = (int)($body['is_official'] ?? 1);

    $pdo->prepare("
        INSERT INTO fuel_records
            (uuid, tech_case_id, event_entry_id, check_type, fuel_type_declared, sample_id,
             sg_measured, sg_expected_min, sg_expected_max, sg_result,
             dielectric_measured, dielectric_expected_min, dielectric_expected_max, dielectric_result,
             temperature_f, overall_result, is_official,
             linked_run_id, link_method, link_confidence,
             measured_at, operator_id, test_station, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                NOW(), ?, ?, ?, ?)
    ")->execute([
        $recordUuid, $caseId, $entryId, $checkType, $fuelTypeDeclared, $sampleId,
        $sgMeasured, $sgExpMin, $sgExpMax, $sgMeasured !== null ? $sgResult : null,
        $dielectricMeasured, $dielExpMin, $dielExpMax, $dielectricMeasured !== null ? $dielResult : null,
        $temperatureF, $overallResult, $isOfficial,
        $linkedRunId, $linkMethod, $linkConfidence,
        tm_optionalInt($body, 'operator_id'),
        tm_optionalParam($body, 'test_station'),
        tm_optionalParam($body, 'notes'),
        $userId,
    ]);
    $recordId = (int)$pdo->lastInsertId();

    // 4. Generate compliance findings
    $flags = generateFuelFindings($pdo, $recordId, $caseId, $entry, $rule, [
        'sg_measured' => $sgMeasured,
        'sg_result' => $sgResult,
        'sg_expected_min' => $sgExpMin,
        'sg_expected_max' => $sgExpMax,
        'dielectric_measured' => $dielectricMeasured,
        'dielectric_result' => $dielResult,
        'dielectric_expected_min' => $dielExpMin,
        'dielectric_expected_max' => $dielExpMax,
        'fuel_type_declared' => $fuelTypeDeclared,
        'linked_run_id' => $linkedRunId,
        'link_method' => $linkMethod,
        'check_type' => $checkType,
        'overall_result' => $overallResult,
    ], $userId);

    tm_json([
        'id' => $recordId,
        'uuid' => $recordUuid,
        'tech_case_id' => $caseId,
        'check_type' => $checkType,
        'overall_result' => $overallResult,
        'sg_result' => $sgMeasured !== null ? $sgResult : null,
        'dielectric_result' => $dielectricMeasured !== null ? $dielResult : null,
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
        SELECT fr.*,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name,
               o.name AS org_name
        FROM fuel_records fr
        JOIN event_entries ee ON fr.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE ee.event_instance_id = ?
        ORDER BY fr.measured_at DESC
    ");
    $stmt->execute([$eventInstanceId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['records' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventInstanceId]);
}

function handleListByEntry(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $stmt = $pdo->prepare("
        SELECT fr.*
        FROM fuel_records fr
        WHERE fr.event_entry_id = ?
        ORDER BY fr.measured_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['records' => $rows, 'count' => count($rows)]);
}

function handleGetRecord(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $stmt = $pdo->prepare("
        SELECT fr.*,
               ee.competition_number, ee.class_index, ee.category, ee.event_instance_id,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_description,
               ei.name AS event_name
        FROM fuel_records fr
        JOIN event_entries ee ON fr.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE fr.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Fuel record not found', 404);

    // Include findings from the tech case
    $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $fStmt->execute([(int)$row['tech_case_id']]);
    $row['findings'] = $fStmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['record' => $row]);
}

function handleCompliance(PDO $pdo): void {
    $recordId = (int)($_GET['fuelRecordId'] ?? 0);
    if (!$recordId) tm_error('Missing fuelRecordId', 400);

    $stmt = $pdo->prepare("
        SELECT fr.*, ee.category, ee.class_index
        FROM fuel_records fr
        JOIN event_entries ee ON fr.event_entry_id = ee.id
        WHERE fr.id = ?
    ");
    $stmt->execute([$recordId]);
    $record = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$record) tm_error('Fuel record not found', 404);

    $rule = getFuelRule($pdo, $record['category'], $record['class_index']);

    // Load findings for this case
    $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $fStmt->execute([(int)$record['tech_case_id']]);
    $findings = $fStmt->fetchAll(PDO::FETCH_ASSOC);

    $openFlags = count(array_filter($findings, fn($f) => $f['disposition'] === 'open'));

    tm_json([
        'record_id' => $recordId,
        'overall_result' => $record['overall_result'],
        'sg_result' => $record['sg_result'],
        'dielectric_result' => $record['dielectric_result'],
        'rule' => $rule,
        'findings' => $findings,
        'open_flag_count' => $openFlags,
    ]);
}

function handleUpdateRunLink(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $recordId = (int)tm_requireParam($body, 'fuel_record_id');
    $runId = isset($body['run_id']) ? (int)$body['run_id'] : null;

    $check = $pdo->prepare("SELECT id FROM fuel_records WHERE id = ?");
    $check->execute([$recordId]);
    if (!$check->fetch()) tm_error('Fuel record not found', 404);

    if ($runId) {
        $runCheck = $pdo->prepare("SELECT id FROM parity_runs WHERE id = ?");
        $runCheck->execute([$runId]);
        if (!$runCheck->fetch()) tm_error('Run not found', 404);
    }

    $method = $runId ? 'manual' : 'unlinked';
    $confidence = $runId ? 'high' : 'none';
    $pdo->prepare("UPDATE fuel_records SET linked_run_id = ?, link_method = ?, link_confidence = ? WHERE id = ?")
        ->execute([$runId, $method, $confidence, $recordId]);

    tm_json(['updated' => true, 'id' => $recordId, 'linked_run_id' => $runId, 'link_method' => $method]);
}

function handleListRules(PDO $pdo): void {
    $category = $_GET['category'] ?? null;
    $activeOnly = ($_GET['activeOnly'] ?? '1') === '1';

    $where = '1=1';
    $params = [];
    if ($category) { $where .= ' AND category = ?'; $params[] = $category; }
    if ($activeOnly) { $where .= ' AND is_active = 1'; }

    $stmt = $pdo->prepare("SELECT * FROM fuel_rules WHERE $where ORDER BY category, class_index");
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
        INSERT INTO fuel_rules (category, class_index, season_year, fuel_type_required, sg_min, sg_max, dielectric_min, dielectric_max, temperature_compensate, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            fuel_type_required = VALUES(fuel_type_required),
            sg_min = VALUES(sg_min),
            sg_max = VALUES(sg_max),
            dielectric_min = VALUES(dielectric_min),
            dielectric_max = VALUES(dielectric_max),
            temperature_compensate = VALUES(temperature_compensate),
            notes = VALUES(notes)
    ")->execute([
        $category,
        $classIndex,
        $seasonYear,
        tm_optionalParam($body, 'fuel_type_required'),
        isset($body['sg_min']) ? (float)$body['sg_min'] : null,
        isset($body['sg_max']) ? (float)$body['sg_max'] : null,
        isset($body['dielectric_min']) ? (float)$body['dielectric_min'] : null,
        isset($body['dielectric_max']) ? (float)$body['dielectric_max'] : null,
        (int)($body['temperature_compensate'] ?? 0),
        tm_optionalParam($body, 'notes'),
    ]);

    tm_json(['upserted' => true, 'category' => $category, 'class_index' => $classIndex]);
}

function handleEntryFuelStatus(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $entry = fuel_loadEntry($pdo, $entryId);
    $rule = getFuelRule($pdo, $entry['category'], $entry['class_index']);

    // Latest official fuel record
    $latestStmt = $pdo->prepare("
        SELECT * FROM fuel_records
        WHERE event_entry_id = ? AND is_official = 1
        ORDER BY measured_at DESC LIMIT 1
    ");
    $latestStmt->execute([$entryId]);
    $latestRecord = $latestStmt->fetch(PDO::FETCH_ASSOC);

    $totalRecords = $pdo->prepare("SELECT COUNT(*) FROM fuel_records WHERE event_entry_id = ?");
    $totalRecords->execute([$entryId]);
    $recordCount = (int)$totalRecords->fetchColumn();

    // Count failures
    $failStmt = $pdo->prepare("SELECT COUNT(*) FROM fuel_records WHERE event_entry_id = ? AND overall_result = 'fail'");
    $failStmt->execute([$entryId]);
    $failCount = (int)$failStmt->fetchColumn();

    $fuelStatus = 'not_checked';
    if ($recordCount > 0) {
        $fuelStatus = $failCount > 0 ? 'has_failure' : 'checked_ok';
    }

    tm_json([
        'entry_id' => $entryId,
        'rule' => $rule,
        'latest_record' => $latestRecord,
        'record_count' => $recordCount,
        'fail_count' => $failCount,
        'fuel_status' => $fuelStatus,
    ]);
}

// ── Helper functions ────────────────────────────────────────────────────

function fuel_loadEntry(PDO $pdo, int $entryId): array {
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

function getFuelRule(PDO $pdo, ?string $category, ?string $classIndex): ?array {
    if (!$category || !$classIndex) return null;

    $stmt = $pdo->prepare("
        SELECT * FROM fuel_rules
        WHERE category = ? AND class_index = ? AND is_active = 1
        ORDER BY season_year DESC
        LIMIT 1
    ");
    $stmt->execute([$category, $classIndex]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

/**
 * Find the nearest prior parity_run for this event entry.
 * Same strategy as Scale's findNearestPriorRun.
 */
function fuel_findNearestPriorRun(PDO $pdo, array $entry): ?array {
    $entryId = (int)$entry['id'];

    // Strategy 1: Direct FK link (event_entry_id on parity_runs) — HIGH
    $stmt = $pdo->prepare("
        SELECT id FROM parity_runs
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
            SELECT id FROM parity_runs
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
            SELECT id FROM parity_runs
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
 * Generate compliance findings for a fuel record.
 * Returns array of flag descriptions generated.
 */
function generateFuelFindings(PDO $pdo, int $recordId, int $caseId, array $entry, ?array $rule, array $data, int $userId): array {
    $flags = [];

    $insertFinding = $pdo->prepare("
        INSERT INTO tech_findings (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)
    ");

    // Flag 1: SG out of range
    if ($data['sg_result'] === 'fail' && $data['sg_measured'] !== null) {
        $sgStr = number_format($data['sg_measured'], 4);
        $rangeStr = number_format($data['sg_expected_min'], 4) . ' – ' . number_format($data['sg_expected_max'], 4);
        $insertFinding->execute([tm_uuid(), $caseId, 'discrepancy', 'high',
            "Specific gravity $sgStr is outside allowed range ($rangeStr).",
            $sgStr, $rangeStr, $userId]);
        $flags[] = 'sg_out_of_range';
    }

    // Flag 2: Dielectric out of range
    if ($data['dielectric_result'] === 'fail' && $data['dielectric_measured'] !== null) {
        $dielStr = number_format($data['dielectric_measured'], 4);
        $rangeStr = number_format($data['dielectric_expected_min'], 4) . ' – ' . number_format($data['dielectric_expected_max'], 4);
        $insertFinding->execute([tm_uuid(), $caseId, 'discrepancy', 'high',
            "Dielectric reading $dielStr is outside allowed range ($rangeStr).",
            $dielStr, $rangeStr, $userId]);
        $flags[] = 'dielectric_out_of_range';
    }

    // Flag 3: No applicable rule configured
    if (!$rule) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'medium',
            'No fuel rule configured for this category/class. Manual review required.',
            null, null, $userId]);
        $flags[] = 'no_rule_configured';
    }

    // Flag 4: Fuel type mismatch
    if ($rule && $rule['fuel_type_required'] && $data['fuel_type_declared']) {
        if ($data['fuel_type_declared'] !== $rule['fuel_type_required']) {
            $insertFinding->execute([tm_uuid(), $caseId, 'discrepancy', 'high',
                "Declared fuel type '{$data['fuel_type_declared']}' does not match required type '{$rule['fuel_type_required']}'.",
                $data['fuel_type_declared'], $rule['fuel_type_required'], $userId]);
            $flags[] = 'fuel_type_mismatch';
        }
    }

    // Flag 5: Missing SG measurement when rule expects it
    if ($rule && $rule['sg_min'] !== null && $data['sg_measured'] === null) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'medium',
            'Specific gravity not measured but a rule exists for this class.',
            null, 'SG measurement expected', $userId]);
        $flags[] = 'missing_sg_measurement';
    }

    // Flag 6: No run linked
    if ($data['link_method'] === 'unlinked' && in_array($data['check_type'], ['pre_run', 'post_run'])) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'info',
            'No parity run linked to this fuel check. Manual linking may be needed.',
            null, null, $userId]);
        $flags[] = 'no_run_linked';
    }

    // Flag 7: Duplicate / suspiciously close repeat within 10 minutes
    $dupStmt = $pdo->prepare("
        SELECT COUNT(*) FROM fuel_records
        WHERE event_entry_id = ? AND is_official = 1 AND id != ?
          AND ABS(TIMESTAMPDIFF(SECOND, measured_at, NOW())) < 600
    ");
    $dupStmt->execute([(int)$entry['id'], $recordId]);
    $dupCount = (int)$dupStmt->fetchColumn();
    if ($dupCount > 0) {
        $insertFinding->execute([tm_uuid(), $caseId, 'observation', 'low',
            'Repeat fuel check within 10 minutes of a previous record for this entry.',
            null, null, $userId]);
        $flags[] = 'duplicate_close_interval';
    }

    return $flags;
}
