<?php
/**
 * Tech Master — Dossier / Reporting Bridge API
 *
 * Batch 9: Cross-module read/aggregation layer.
 * All endpoints are GET (read-only). No schema changes.
 *
 * Actions:
 *   GET  entryDossier        — unified cross-module dossier for one event entry
 *   GET  eventCompliance     — event-level compliance dashboard
 *   GET  findingsAggregate   — cross-module findings with filter/group support
 *   GET  entryExport         — export-ready entry technical summary (flat JSON)
 *   GET  eventExport         — export-ready event compliance summary (flat JSON)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/tm-helpers.php';

rsa_setCorsHeaders();

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$auth   = rsa_requireAuth();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'OPTIONS') { http_response_code(204); exit; }

switch ($action) {
    case 'entryDossier':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryDossier($pdo);
        break;
    case 'eventCompliance':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEventCompliance($pdo);
        break;
    case 'findingsAggregate':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleFindingsAggregate($pdo);
        break;
    case 'entryExport':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEntryExport($pdo);
        break;
    case 'eventExport':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEventExport($pdo);
        break;
    case 'eventComplianceCSV':
        if ($method !== 'GET') tm_error('GET required', 405);
        tm_requireRead($pdo, $auth);
        handleEventComplianceCSV($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY DOSSIER — unified cross-module view for one event entry
// ═══════════════════════════════════════════════════════════════════════════

function handleEntryDossier(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    // ── Entry header ──
    $entry = dossierLoadEntry($pdo, $entryId);
    if (!$entry) tm_error('Entry not found', 404);

    $header = [
        'entry_id'           => (int)$entry['id'],
        'event_instance_id'  => (int)$entry['event_instance_id'],
        'event_name'         => $entry['event_name'] ?? null,
        'event_start_date'   => $entry['start_date_local'] ?? null,
        'competition_number' => $entry['competition_number'] ?? null,
        'category'           => $entry['category'] ?? null,
        'class_index'        => $entry['class_index'] ?? null,
        'entry_status'       => $entry['entry_status'] ?? null,
        'person_id'          => $entry['person_id'] ? (int)$entry['person_id'] : null,
        'person_name'        => $entry['person_name'] ?? null,
        'org_id'             => $entry['org_id'] ? (int)$entry['org_id'] : null,
        'org_name'           => $entry['org_name'] ?? null,
        'vehicle_id'         => $entry['vehicle_id'] ? (int)$entry['vehicle_id'] : null,
        'vehicle_desc'       => $entry['vehicle_desc'] ?? null,
    ];

    // ── Scale ──
    $scale = dossierScaleStatus($pdo, $entryId);

    // ── Fuel ──
    $fuel = dossierFuelStatus($pdo, $entryId);

    // ── Inspection ──
    $inspection = dossierInspectionStatus($pdo, $entryId);

    // ── Tech Card ──
    $techcard = dossierTechCardStatus($pdo, $entryId);

    // ── Teardown ──
    $teardown = dossierTeardownStatus($pdo, $entryId);

    // ── Aggregated findings ──
    $findings = dossierEntryFindings($pdo, $entryId);

    // ── Required module config ──
    $reqModules = dossierRequiredModules($pdo, $entry['category'] ?? '', $entry['class_index'] ?? '');

    // ── Overall readiness ──
    $issues = [];
    if ($scale['status'] === 'not_weighed') $issues[] = 'no_scale_record';
    if ($scale['status'] === 'under_minimum') $issues[] = 'scale_under_minimum';
    if ($fuel['status'] === 'not_checked') $issues[] = 'no_fuel_record';
    if ($fuel['status'] === 'has_failure') $issues[] = 'fuel_failure';
    if ($inspection['status'] === 'not_inspected') $issues[] = 'no_inspection';
    if ($inspection['status'] === 'has_failure') $issues[] = 'inspection_failure';
    if ($techcard['status'] === 'no_declaration') $issues[] = 'no_tech_card';
    if ($techcard['status'] === 'missing') $issues[] = 'tech_card_missing';
    if ($techcard['status'] === 'discrepancy_found') $issues[] = 'tech_card_discrepancy';
    if ($teardown['overall_result'] === 'fail') $issues[] = 'teardown_failure';
    if ($findings['open_count'] > 0) $issues[] = 'open_findings';

    // Apply required-module checks
    dossierApplyRequiredModules($issues, $reqModules, [
        'scale'      => $scale['status'],
        'fuel'       => $fuel['status'],
        'inspection' => $inspection['status'],
        'techcard'   => $techcard['status'],
        'teardown'   => $teardown['status'],
    ]);

    $readiness = empty($issues) ? 'clear' : 'has_issues';
    if (in_array('fuel_failure', $issues) || in_array('inspection_failure', $issues) ||
        in_array('scale_under_minimum', $issues) || in_array('teardown_failure', $issues)) {
        $readiness = 'critical';
    }
    // Required-module missing escalates to critical if any required module is missing
    $reqMissingFlags = array_filter($issues, fn($f) => str_starts_with($f, 'required_module_missing_'));
    if (!empty($reqMissingFlags)) $readiness = 'critical';

    tm_json([
        'entry'      => $header,
        'scale'      => $scale,
        'fuel'       => $fuel,
        'inspection' => $inspection,
        'techcard'   => $techcard,
        'teardown'   => $teardown,
        'findings'   => $findings,
        'readiness'  => $readiness,
        'issues'     => $issues,
        'generated_at' => date('c'),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT COMPLIANCE — event-level compliance dashboard
// ═══════════════════════════════════════════════════════════════════════════

function handleEventCompliance(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    $classFilter = $_GET['classFilter'] ?? '';

    // All active entries for event
    $sql = "
        SELECT ee.id, ee.competition_number, ee.class_index, ee.category, ee.entry_status,
               p.display_name AS person_name
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        WHERE ee.event_instance_id = ? AND ee.entry_status IN ('registered','active')
    ";
    $params = [$eventId];
    if ($classFilter) {
        $sql .= " AND ee.class_index = ?";
        $params[] = $classFilter;
    }
    $sql .= " ORDER BY ee.competition_number";
    $entryStmt = $pdo->prepare($sql);
    $entryStmt->execute($params);
    $entries = $entryStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($entries)) {
        tm_json([
            'eventInstanceId' => $eventId,
            'total_entries' => 0,
            'entries' => [],
            'summary' => complianceSummaryCounts([]),
            'class_filter' => $classFilter,
            'generated_at' => date('c'),
        ]);
        return;
    }

    $entryIds = array_column($entries, 'id');
    $placeholders = implode(',', array_fill(0, count($entryIds), '?'));

    // ── Batch: Scale status ──
    $scaleStmt = $pdo->prepare("
        SELECT event_entry_id,
               COUNT(*) AS cnt,
               SUM(CASE WHEN (measured_total_weight IS NOT NULL OR derived_total_weight IS NOT NULL) THEN 1 ELSE 0 END) AS weighed
        FROM scale_records
        WHERE event_entry_id IN ($placeholders)
        GROUP BY event_entry_id
    ");
    $scaleStmt->execute($entryIds);
    $scaleMap = [];
    foreach ($scaleStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $scaleMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'weighed' => (int)$r['weighed']];
    }

    // ── Batch: Fuel status ──
    $fuelStmt = $pdo->prepare("
        SELECT event_entry_id,
               COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails
        FROM fuel_records
        WHERE event_entry_id IN ($placeholders)
        GROUP BY event_entry_id
    ");
    $fuelStmt->execute($entryIds);
    $fuelMap = [];
    foreach ($fuelStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $fuelMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'fails' => (int)$r['fails']];
    }

    // ── Batch: Inspection status ──
    $inspStmt = $pdo->prepare("
        SELECT event_entry_id,
               COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails,
               SUM(CASE WHEN overall_result = 'incomplete' THEN 1 ELSE 0 END) AS incomplete
        FROM inspection_records
        WHERE event_entry_id IN ($placeholders)
        GROUP BY event_entry_id
    ");
    $inspStmt->execute($entryIds);
    $inspMap = [];
    foreach ($inspStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $inspMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'fails' => (int)$r['fails'], 'incomplete' => (int)$r['incomplete']];
    }

    // ── Batch: Tech Card status ──
    $cardStmt = $pdo->prepare("
        SELECT d.event_entry_id, d.card_status
        FROM techcard_declarations d
        WHERE d.event_entry_id IN ($placeholders)
        ORDER BY d.revision DESC
    ");
    $cardStmt->execute($entryIds);
    $cardMap = [];
    foreach ($cardStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($cardMap[$eid])) $cardMap[$eid] = $r['card_status']; // latest revision
    }

    // ── Batch: Teardown status ──
    $tdStmt = $pdo->prepare("
        SELECT event_entry_id, teardown_status, overall_result
        FROM teardown_records
        WHERE event_entry_id IN ($placeholders)
        ORDER BY created_at DESC
    ");
    $tdStmt->execute($entryIds);
    $tdMap = [];
    foreach ($tdStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($tdMap[$eid])) $tdMap[$eid] = $r; // latest record
    }

    // ── Batch: Open findings count per entry ──
    $findStmt = $pdo->prepare("
        SELECT tc.event_entry_id, COUNT(*) AS open_count
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        WHERE tc.event_entry_id IN ($placeholders) AND tf.disposition = 'open'
        GROUP BY tc.event_entry_id
    ");
    $findStmt->execute($entryIds);
    $findingsMap = [];
    foreach ($findStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $findingsMap[(int)$r['event_entry_id']] = (int)$r['open_count'];
    }

    // ── Load required-module configs (batch by distinct category/class) ──
    $reqModuleCache = [];
    foreach ($entries as $e) {
        $key = ($e['category'] ?? '') . '/' . ($e['class_index'] ?? '');
        if (!isset($reqModuleCache[$key])) {
            $reqModuleCache[$key] = dossierRequiredModules($pdo, $e['category'] ?? '', $e['class_index'] ?? '');
        }
    }

    // ── Build per-entry compliance row ──
    $rows = [];
    foreach ($entries as $e) {
        $eid = (int)$e['id'];

        $s = $scaleMap[$eid] ?? null;
        $scaleStatus = $s ? ((int)$s['cnt'] === 0 ? 'not_weighed' : 'weighed') : 'not_weighed';

        $f = $fuelMap[$eid] ?? null;
        $fuelStatus = !$f ? 'not_checked' : ((int)$f['fails'] > 0 ? 'has_failure' : 'checked_ok');

        $i = $inspMap[$eid] ?? null;
        $inspStatus = !$i ? 'not_inspected'
            : ((int)$i['fails'] > 0 ? 'has_failure'
            : ((int)$i['incomplete'] > 0 ? 'has_incomplete' : 'inspected_ok'));

        $cardStatus = $cardMap[$eid] ?? 'no_declaration';

        $td = $tdMap[$eid] ?? null;
        $tdStatus = $td ? $td['teardown_status'] : 'no_teardown';
        $tdResult = $td ? $td['overall_result'] : null;

        $openFindings = $findingsMap[$eid] ?? 0;

        // Derive issue flags
        $issueFlags = [];
        if ($scaleStatus === 'not_weighed') $issueFlags[] = 'no_scale';
        if ($fuelStatus === 'not_checked') $issueFlags[] = 'no_fuel';
        if ($fuelStatus === 'has_failure') $issueFlags[] = 'fuel_fail';
        if ($inspStatus === 'not_inspected') $issueFlags[] = 'no_inspection';
        if ($inspStatus === 'has_failure') $issueFlags[] = 'insp_fail';
        if ($cardStatus === 'no_declaration' || $cardStatus === 'missing') $issueFlags[] = 'no_techcard';
        if ($cardStatus === 'discrepancy_found') $issueFlags[] = 'techcard_discrepancy';
        if ($tdResult === 'fail') $issueFlags[] = 'teardown_fail';
        if ($openFindings > 0) $issueFlags[] = 'open_findings';

        // Apply required-module checks
        $reqKey = ($e['category'] ?? '') . '/' . ($e['class_index'] ?? '');
        $reqMods = $reqModuleCache[$reqKey] ?? [];
        dossierApplyRequiredModules($issueFlags, $reqMods, [
            'scale'      => $scaleStatus,
            'fuel'       => $fuelStatus,
            'inspection' => $inspStatus,
            'techcard'   => $cardStatus,
            'teardown'   => $tdStatus,
        ]);

        $readiness = empty($issueFlags) ? 'clear' : 'has_issues';
        $hasCritical = array_intersect($issueFlags, ['fuel_fail', 'insp_fail', 'teardown_fail']);
        if (!empty($hasCritical)) $readiness = 'critical';
        // Required-module missing escalates to critical
        $reqMissingFlags = array_filter($issueFlags, fn($f) => str_starts_with($f, 'required_module_missing_'));
        if (!empty($reqMissingFlags)) $readiness = 'critical';

        $rows[] = [
            'entry_id'           => $eid,
            'competition_number' => $e['competition_number'],
            'class_index'        => $e['class_index'],
            'category'           => $e['category'],
            'person_name'        => $e['person_name'],
            'scale_status'       => $scaleStatus,
            'fuel_status'        => $fuelStatus,
            'inspection_status'  => $inspStatus,
            'techcard_status'    => $cardStatus,
            'teardown_status'    => $tdStatus,
            'teardown_result'    => $tdResult,
            'open_findings'      => $openFindings,
            'readiness'          => $readiness,
            'issues'             => $issueFlags,
        ];
    }

    tm_json([
        'eventInstanceId' => $eventId,
        'total_entries' => count($rows),
        'entries' => $rows,
        'summary' => complianceSummaryCounts($rows),
        'class_filter' => $classFilter,
        'generated_at' => date('c'),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS AGGREGATE — cross-module findings with filtering
// ═══════════════════════════════════════════════════════════════════════════

function handleFindingsAggregate(PDO $pdo): void {
    $eventId  = (int)($_GET['eventInstanceId'] ?? 0);
    $entryId  = (int)($_GET['eventEntryId'] ?? 0);
    $module   = $_GET['module'] ?? '';   // scale, fuel, inspection, techcard_audit, teardown, or '' (all)
    $severity = $_GET['severity'] ?? ''; // info, low, medium, high, critical, or '' (all)
    $status   = $_GET['status'] ?? '';   // open, resolved, deferred, penalized, waived, or '' (all)
    $limit    = min((int)($_GET['limit'] ?? 200), 500);
    $offset   = (int)($_GET['offset'] ?? 0);

    if (!$eventId && !$entryId) tm_error('Provide eventInstanceId or eventEntryId');

    $where = [];
    $params = [];

    if ($entryId) {
        $where[] = "tc.event_entry_id = ?";
        $params[] = $entryId;
    } elseif ($eventId) {
        $where[] = "ee.event_instance_id = ?";
        $params[] = $eventId;
    }

    if ($module) {
        $where[] = "tc.case_type = ?";
        $params[] = $module;
    }
    if ($severity) {
        $where[] = "tf.severity = ?";
        $params[] = $severity;
    }
    if ($status) {
        $where[] = "tf.disposition = ?";
        $params[] = $status;
    }

    $whereSQL = implode(' AND ', $where);

    // Count total
    $countSQL = "
        SELECT COUNT(*)
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        WHERE $whereSQL
    ";
    $countStmt = $pdo->prepare($countSQL);
    $countStmt->execute($params);
    $totalCount = (int)$countStmt->fetchColumn();

    // Fetch findings with context
    $dataSQL = "
        SELECT tf.id, tf.uuid, tf.tech_case_id, tf.finding_type, tf.severity, tf.description,
               tf.measured_value, tf.expected_value, tf.disposition, tf.follow_up_required,
               tf.resolved_at, tf.notes, tf.created_at,
               tc.case_type, tc.status AS case_status, tc.event_entry_id,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        WHERE $whereSQL
        ORDER BY
            FIELD(tf.severity, 'critical', 'high', 'medium', 'low', 'info'),
            FIELD(tf.disposition, 'open', 'deferred', 'resolved', 'penalized', 'waived'),
            tf.created_at DESC
        LIMIT ? OFFSET ?
    ";
    $params[] = $limit;
    $params[] = $offset;
    $dataStmt = $pdo->prepare($dataSQL);
    $dataStmt->execute($params);
    $findings = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast ints
    foreach ($findings as &$f) {
        $f['id'] = (int)$f['id'];
        $f['tech_case_id'] = (int)$f['tech_case_id'];
        $f['event_entry_id'] = (int)$f['event_entry_id'];
        $f['follow_up_required'] = (int)$f['follow_up_required'];
    }
    unset($f);

    // Severity breakdown
    $breakdownParams = array_slice($params, 0, -2); // without limit/offset
    $breakdownSQL = "
        SELECT tf.severity, tf.disposition, COUNT(*) AS cnt
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        WHERE $whereSQL
        GROUP BY tf.severity, tf.disposition
    ";
    $breakdownStmt = $pdo->prepare($breakdownSQL);
    $breakdownStmt->execute($breakdownParams);
    $breakdown = $breakdownStmt->fetchAll(PDO::FETCH_ASSOC);

    // Module breakdown
    $moduleSQL = "
        SELECT tc.case_type, COUNT(*) AS cnt
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        WHERE $whereSQL
        GROUP BY tc.case_type
    ";
    $moduleStmt = $pdo->prepare($moduleSQL);
    $moduleStmt->execute($breakdownParams);
    $moduleCounts = [];
    foreach ($moduleStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $moduleCounts[$r['case_type']] = (int)$r['cnt'];
    }

    tm_json([
        'findings'      => $findings,
        'total_count'   => $totalCount,
        'returned'      => count($findings),
        'offset'        => $offset,
        'limit'         => $limit,
        'breakdown'     => $breakdown,
        'by_module'     => $moduleCounts,
        'filters'       => [
            'eventInstanceId' => $eventId ?: null,
            'eventEntryId'    => $entryId ?: null,
            'module'          => $module ?: null,
            'severity'        => $severity ?: null,
            'status'          => $status ?: null,
        ],
        'generated_at'  => date('c'),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// ENTRY EXPORT — export-ready entry technical summary
// ═══════════════════════════════════════════════════════════════════════════

function handleEntryExport(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId');

    $entry = dossierLoadEntry($pdo, $entryId);
    if (!$entry) tm_error('Entry not found', 404);

    $scale      = dossierScaleStatus($pdo, $entryId);
    $fuel       = dossierFuelStatus($pdo, $entryId);
    $inspection = dossierInspectionStatus($pdo, $entryId);
    $techcard   = dossierTechCardStatus($pdo, $entryId);
    $teardown   = dossierTeardownStatus($pdo, $entryId);
    $findings   = dossierEntryFindings($pdo, $entryId);

    // Declaration fields (if present)
    $declFields = [];
    if ($techcard['latest_declaration_id']) {
        $fieldStmt = $pdo->prepare("SELECT field_key, field_label, declared_value FROM techcard_declaration_fields WHERE declaration_id = ? ORDER BY sort_order");
        $fieldStmt->execute([$techcard['latest_declaration_id']]);
        $declFields = $fieldStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Flatten for export
    $export = [
        'entry_id'            => (int)$entry['id'],
        'event_name'          => $entry['event_name'] ?? null,
        'event_date'          => $entry['start_date_local'] ?? null,
        'competition_number'  => $entry['competition_number'] ?? null,
        'category'            => $entry['category'] ?? null,
        'class_index'         => $entry['class_index'] ?? null,
        'driver_name'         => $entry['person_name'] ?? null,
        'team_name'           => $entry['org_name'] ?? null,
        // Module statuses
        'scale_status'        => $scale['status'],
        'scale_effective_weight' => $scale['effective_weight'],
        'scale_record_count'  => $scale['record_count'],
        'fuel_status'         => $fuel['status'],
        'fuel_record_count'   => $fuel['record_count'],
        'inspection_status'   => $inspection['status'],
        'inspection_record_count' => $inspection['record_count'],
        'techcard_status'     => $techcard['status'],
        'techcard_revision'   => $techcard['latest_revision'],
        'teardown_status'     => $teardown['status'],
        'teardown_result'     => $teardown['overall_result'],
        // Findings summary
        'total_findings'      => $findings['total_count'],
        'open_findings'       => $findings['open_count'],
        'critical_findings'   => $findings['critical_count'],
        'high_findings'       => $findings['high_count'],
        // Declaration fields
        'declaration_fields'  => $declFields,
        // Open finding details
        'open_finding_details' => $findings['open_findings_list'],
        'generated_at'        => date('c'),
    ];

    tm_json($export);
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT EXPORT — export-ready event compliance summary
// ═══════════════════════════════════════════════════════════════════════════

function handleEventExport(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');

    // Event header
    $evStmt = $pdo->prepare("SELECT id, name, race_lookup, start_date_local, end_date_local, track_name, sanctioning_body FROM event_instances WHERE id = ?");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) tm_error('Event not found', 404);

    // Re-use event compliance logic (inline rather than double-calling the handler)
    $entryStmt = $pdo->prepare("
        SELECT ee.id FROM event_entries ee
        WHERE ee.event_instance_id = ? AND ee.entry_status IN ('registered','active')
    ");
    $entryStmt->execute([$eventId]);
    $entryIds = $entryStmt->fetchAll(PDO::FETCH_COLUMN);
    $entryCount = count($entryIds);

    // Aggregate findings for event
    $findingsStmt = $pdo->prepare("
        SELECT tf.severity, tf.disposition, COUNT(*) AS cnt
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        WHERE tc.event_entry_id IN (SELECT id FROM event_entries WHERE event_instance_id = ?)
        GROUP BY tf.severity, tf.disposition
    ");
    $findingsStmt->execute([$eventId]);
    $findingsBreakdown = $findingsStmt->fetchAll(PDO::FETCH_ASSOC);

    $totalFindings = 0;
    $openFindings = 0;
    $criticalOpen = 0;
    $highOpen = 0;
    foreach ($findingsBreakdown as $fb) {
        $cnt = (int)$fb['cnt'];
        $totalFindings += $cnt;
        if ($fb['disposition'] === 'open') {
            $openFindings += $cnt;
            if ($fb['severity'] === 'critical') $criticalOpen += $cnt;
            if ($fb['severity'] === 'high') $highOpen += $cnt;
        }
    }

    // Count entries missing each module
    $missingScale = 0; $missingFuel = 0; $missingInsp = 0; $missingCard = 0;
    $failedFuel = 0; $failedInsp = 0; $failedTeardown = 0; $cardDiscrepancy = 0;

    if (!empty($entryIds)) {
        $ph = implode(',', array_fill(0, count($entryIds), '?'));

        $hasScale = $pdo->prepare("SELECT DISTINCT event_entry_id FROM scale_records WHERE event_entry_id IN ($ph)");
        $hasScale->execute($entryIds);
        $withScale = $hasScale->fetchAll(PDO::FETCH_COLUMN);
        $missingScale = $entryCount - count($withScale);

        $hasFuel = $pdo->prepare("SELECT event_entry_id, SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails FROM fuel_records WHERE event_entry_id IN ($ph) GROUP BY event_entry_id");
        $hasFuel->execute($entryIds);
        $fuelRows = $hasFuel->fetchAll(PDO::FETCH_ASSOC);
        $withFuel = array_column($fuelRows, 'event_entry_id');
        $missingFuel = $entryCount - count($withFuel);
        foreach ($fuelRows as $fr) { if ((int)$fr['fails'] > 0) $failedFuel++; }

        $hasInsp = $pdo->prepare("SELECT event_entry_id, SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails FROM inspection_records WHERE event_entry_id IN ($ph) GROUP BY event_entry_id");
        $hasInsp->execute($entryIds);
        $inspRows = $hasInsp->fetchAll(PDO::FETCH_ASSOC);
        $withInsp = array_column($inspRows, 'event_entry_id');
        $missingInsp = $entryCount - count($withInsp);
        foreach ($inspRows as $ir) { if ((int)$ir['fails'] > 0) $failedInsp++; }

        $hasCard = $pdo->prepare("SELECT DISTINCT event_entry_id FROM techcard_declarations WHERE event_entry_id IN ($ph)");
        $hasCard->execute($entryIds);
        $withCard = $hasCard->fetchAll(PDO::FETCH_COLUMN);
        $missingCard = $entryCount - count($withCard);

        $discStmt = $pdo->prepare("SELECT COUNT(DISTINCT event_entry_id) FROM techcard_declarations WHERE event_entry_id IN ($ph) AND card_status = 'discrepancy_found'");
        $discStmt->execute($entryIds);
        $cardDiscrepancy = (int)$discStmt->fetchColumn();

        $tdFail = $pdo->prepare("SELECT COUNT(DISTINCT event_entry_id) FROM teardown_records WHERE event_entry_id IN ($ph) AND overall_result = 'fail'");
        $tdFail->execute($entryIds);
        $failedTeardown = (int)$tdFail->fetchColumn();
    }

    tm_json([
        'event_id'           => (int)$event['id'],
        'event_name'         => $event['name'],
        'race_lookup'        => $event['race_lookup'],
        'start_date'         => $event['start_date_local'],
        'end_date'           => $event['end_date_local'],
        'track_name'         => $event['track_name'],
        'total_entries'      => $entryCount,
        'missing_scale'      => $missingScale,
        'missing_fuel'       => $missingFuel,
        'missing_inspection' => $missingInsp,
        'missing_techcard'   => $missingCard,
        'failed_fuel'        => $failedFuel,
        'failed_inspection'  => $failedInsp,
        'failed_teardown'    => $failedTeardown,
        'techcard_discrepancy' => $cardDiscrepancy,
        'total_findings'     => $totalFindings,
        'open_findings'      => $openFindings,
        'critical_open'      => $criticalOpen,
        'high_open'          => $highOpen,
        'findings_breakdown' => $findingsBreakdown,
        'generated_at'       => date('c'),
    ]);
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Load entry with joins
// ═══════════════════════════════════════════════════════════════════════════

function dossierLoadEntry(PDO $pdo, int $entryId): ?array {
    $stmt = $pdo->prepare("
        SELECT ee.*,
               ei.name AS event_name, ei.race_lookup, ei.start_date_local, ei.end_date_local,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_desc
        FROM event_entries ee
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        WHERE ee.id = ?
    ");
    $stmt->execute([$entryId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Per-module status for one entry
// ═══════════════════════════════════════════════════════════════════════════

function dossierScaleStatus(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN (measured_total_weight IS NOT NULL OR derived_total_weight IS NOT NULL) THEN 1 ELSE 0 END) AS weighed
        FROM scale_records WHERE event_entry_id = ?
    ");
    $stmt->execute([$entryId]);
    $s = $stmt->fetch(PDO::FETCH_ASSOC);

    $latestStmt = $pdo->prepare("
        SELECT id, measured_total_weight, derived_total_weight, measured_at, is_official, measurement_mode
        FROM scale_records
        WHERE event_entry_id = ? AND measurement_mode IN ('combined','car_only') AND is_official = 1
        ORDER BY measured_at DESC LIMIT 1
    ");
    $latestStmt->execute([$entryId]);
    $latest = $latestStmt->fetch(PDO::FETCH_ASSOC);

    $effectiveWeight = null;
    if ($latest) {
        $effectiveWeight = $latest['measured_total_weight'] ?? $latest['derived_total_weight'];
        if ($effectiveWeight !== null) $effectiveWeight = (float)$effectiveWeight;
        $latest['id'] = (int)$latest['id'];
        $latest['is_official'] = (int)$latest['is_official'];
    }

    $status = ((int)$s['cnt'] === 0) ? 'not_weighed' : 'weighed';

    return [
        'status'           => $status,
        'record_count'     => (int)$s['cnt'],
        'effective_weight' => $effectiveWeight,
        'latest_record'    => $latest,
    ];
}

function dossierFuelStatus(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails
        FROM fuel_records WHERE event_entry_id = ?
    ");
    $stmt->execute([$entryId]);
    $f = $stmt->fetch(PDO::FETCH_ASSOC);

    $latestStmt = $pdo->prepare("
        SELECT id, fuel_type_detected, overall_result, measured_at, is_official
        FROM fuel_records WHERE event_entry_id = ? AND is_official = 1
        ORDER BY measured_at DESC LIMIT 1
    ");
    $latestStmt->execute([$entryId]);
    $latest = $latestStmt->fetch(PDO::FETCH_ASSOC);

    if ($latest) {
        $latest['id'] = (int)$latest['id'];
        $latest['is_official'] = (int)$latest['is_official'];
    }

    $status = ((int)$f['cnt'] === 0) ? 'not_checked'
        : ((int)$f['fails'] > 0 ? 'has_failure' : 'checked_ok');

    return [
        'status'        => $status,
        'record_count'  => (int)$f['cnt'],
        'fail_count'    => (int)$f['fails'],
        'latest_record' => $latest ?: null,
    ];
}

function dossierInspectionStatus(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT COUNT(*) AS cnt,
               SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails,
               SUM(CASE WHEN overall_result = 'incomplete' THEN 1 ELSE 0 END) AS incomplete,
               SUM(CASE WHEN overall_result = 'pass' THEN 1 ELSE 0 END) AS passes
        FROM inspection_records WHERE event_entry_id = ?
    ");
    $stmt->execute([$entryId]);
    $i = $stmt->fetch(PDO::FETCH_ASSOC);

    $latestStmt = $pdo->prepare("
        SELECT ir.id, ir.overall_result, ir.completed_at, ir.inspection_area,
               it.label AS template_label
        FROM inspection_records ir
        LEFT JOIN inspection_templates it ON ir.template_id = it.id
        WHERE ir.event_entry_id = ?
        ORDER BY ir.created_at DESC LIMIT 1
    ");
    $latestStmt->execute([$entryId]);
    $latest = $latestStmt->fetch(PDO::FETCH_ASSOC);
    if ($latest) $latest['id'] = (int)$latest['id'];

    $status = ((int)$i['cnt'] === 0) ? 'not_inspected'
        : ((int)$i['fails'] > 0 ? 'has_failure'
        : ((int)$i['incomplete'] > 0 ? 'has_incomplete' : 'inspected_ok'));

    return [
        'status'           => $status,
        'record_count'     => (int)$i['cnt'],
        'pass_count'       => (int)$i['passes'],
        'fail_count'       => (int)$i['fails'],
        'incomplete_count' => (int)$i['incomplete'],
        'latest_record'    => $latest ?: null,
    ];
}

function dossierTechCardStatus(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT d.id, d.card_status, d.revision, d.received_at, d.audited_at,
               (SELECT COUNT(*) FROM techcard_artifacts WHERE declaration_id = d.id) AS artifact_count,
               (SELECT COUNT(*) FROM techcard_declaration_fields WHERE declaration_id = d.id) AS field_count
        FROM techcard_declarations d
        WHERE d.event_entry_id = ?
        ORDER BY d.revision DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $status = 'no_declaration';
    $latest = null;
    $latestId = null;
    $latestRev = null;
    if (!empty($rows)) {
        $latest = $rows[0];
        $latestId = (int)$latest['id'];
        $latestRev = (int)$latest['revision'];
        $latest['artifact_count'] = (int)$latest['artifact_count'];
        $latest['field_count'] = (int)$latest['field_count'];
        $status = $latest['card_status'];
    }

    return [
        'status'                  => $status,
        'declaration_count'       => count($rows),
        'latest_declaration_id'   => $latestId,
        'latest_revision'         => $latestRev,
        'latest_declaration'      => $latest,
    ];
}

function dossierTeardownStatus(PDO $pdo, int $entryId): array {
    $stmt = $pdo->prepare("
        SELECT tr.id, tr.teardown_status, tr.overall_result, tr.bay_assignment,
               tr.started_at, tr.completed_at,
               tt.label AS template_label,
               (SELECT COUNT(*) FROM teardown_observed_items WHERE teardown_record_id = tr.id) AS item_count
        FROM teardown_records tr
        LEFT JOIN teardown_templates tt ON tr.template_id = tt.id
        WHERE tr.event_entry_id = ?
        ORDER BY tr.created_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $status = 'no_teardown';
    $overallResult = null;
    $latest = null;
    if (!empty($rows)) {
        $latest = $rows[0];
        $latest['id'] = (int)$latest['id'];
        $latest['item_count'] = (int)$latest['item_count'];
        $status = $latest['teardown_status'];
        $overallResult = $latest['overall_result'];
    }

    return [
        'status'         => $status,
        'overall_result' => $overallResult,
        'record_count'   => count($rows),
        'latest_record'  => $latest,
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Aggregated findings for one entry
// ═══════════════════════════════════════════════════════════════════════════

function dossierEntryFindings(PDO $pdo, int $entryId): array {
    // Counts by severity + disposition
    $stmt = $pdo->prepare("
        SELECT tf.severity, tf.disposition, tc.case_type, COUNT(*) AS cnt
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        WHERE tc.event_entry_id = ?
        GROUP BY tf.severity, tf.disposition, tc.case_type
    ");
    $stmt->execute([$entryId]);
    $breakdown = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalCount = 0;
    $openCount = 0;
    $criticalCount = 0;
    $highCount = 0;
    $byModule = [];
    foreach ($breakdown as $b) {
        $cnt = (int)$b['cnt'];
        $totalCount += $cnt;
        if ($b['disposition'] === 'open') {
            $openCount += $cnt;
            if ($b['severity'] === 'critical') $criticalCount += $cnt;
            if ($b['severity'] === 'high') $highCount += $cnt;
        }
        $mod = $b['case_type'];
        if (!isset($byModule[$mod])) $byModule[$mod] = 0;
        $byModule[$mod] += $cnt;
    }

    // Fetch open findings detail list
    $openStmt = $pdo->prepare("
        SELECT tf.id, tf.finding_type, tf.severity, tf.description, tf.measured_value, tf.expected_value,
               tf.disposition, tf.follow_up_required, tf.created_at,
               tc.case_type
        FROM tech_findings tf
        JOIN tech_cases tc ON tf.tech_case_id = tc.id
        WHERE tc.event_entry_id = ? AND tf.disposition = 'open'
        ORDER BY FIELD(tf.severity, 'critical', 'high', 'medium', 'low', 'info'), tf.created_at DESC
        LIMIT 50
    ");
    $openStmt->execute([$entryId]);
    $openList = $openStmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($openList as &$f) {
        $f['id'] = (int)$f['id'];
        $f['follow_up_required'] = (int)$f['follow_up_required'];
    }
    unset($f);

    return [
        'total_count'         => $totalCount,
        'open_count'          => $openCount,
        'critical_count'      => $criticalCount,
        'high_count'          => $highCount,
        'by_module'           => $byModule,
        'breakdown'           => $breakdown,
        'open_findings_list'  => $openList,
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Compliance summary counts
// ═══════════════════════════════════════════════════════════════════════════

function complianceSummaryCounts(array $rows): array {
    $total = count($rows);
    $clear = 0; $hasIssues = 0; $critical = 0;
    $noScale = 0; $noFuel = 0; $noInsp = 0; $noCard = 0;
    $fuelFail = 0; $inspFail = 0; $tdFail = 0; $cardDisc = 0;
    $withOpenFindings = 0;

    foreach ($rows as $r) {
        if ($r['readiness'] === 'clear') $clear++;
        elseif ($r['readiness'] === 'critical') $critical++;
        else $hasIssues++;

        if ($r['scale_status'] === 'not_weighed') $noScale++;
        if ($r['fuel_status'] === 'not_checked') $noFuel++;
        if ($r['inspection_status'] === 'not_inspected') $noInsp++;
        if (in_array($r['techcard_status'], ['no_declaration', 'missing'])) $noCard++;
        if ($r['fuel_status'] === 'has_failure') $fuelFail++;
        if ($r['inspection_status'] === 'has_failure') $inspFail++;
        if ($r['teardown_result'] === 'fail') $tdFail++;
        if ($r['techcard_status'] === 'discrepancy_found') $cardDisc++;
        if ($r['open_findings'] > 0) $withOpenFindings++;
    }

    return [
        'total'               => $total,
        'clear'               => $clear,
        'has_issues'          => $hasIssues,
        'critical'            => $critical,
        'missing_scale'       => $noScale,
        'missing_fuel'        => $noFuel,
        'missing_inspection'  => $noInsp,
        'missing_techcard'    => $noCard,
        'fuel_failure'        => $fuelFail,
        'inspection_failure'  => $inspFail,
        'teardown_failure'    => $tdFail,
        'techcard_discrepancy' => $cardDisc,
        'with_open_findings'  => $withOpenFindings,
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Load required modules for a category/class
// ═══════════════════════════════════════════════════════════════════════════

function dossierRequiredModules(PDO $pdo, string $category, string $classIndex, string $context = 'pre_race'): array {
    // Check if required_module_config table exists (backward compat)
    try {
        $stmt = $pdo->prepare("
            SELECT module_key FROM required_module_config
            WHERE category = ? AND class_index IN (?, '*') AND context = ? AND is_required = 1
        ");
        $stmt->execute([$category, $classIndex, $context]);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        return $rows ?: [];
    } catch (Throwable $e) {
        // Table may not exist yet (pre-migration); fall back to empty
        return [];
    }
}

function dossierApplyRequiredModules(array &$issues, array $requiredModules, array $statusMap): void {
    $moduleToMissing = [
        'scale'      => ['status' => 'not_weighed', 'flag' => 'required_module_missing_scale'],
        'fuel'       => ['status' => 'not_checked', 'flag' => 'required_module_missing_fuel'],
        'inspection' => ['status' => 'not_inspected', 'flag' => 'required_module_missing_inspection'],
        'techcard'   => ['status' => 'no_declaration', 'flag' => 'required_module_missing_techcard'],
        'teardown'   => ['status' => 'no_teardown', 'flag' => 'required_module_missing_teardown'],
    ];
    foreach ($requiredModules as $mod) {
        $def = $moduleToMissing[$mod] ?? null;
        if (!$def) continue;
        $currentStatus = $statusMap[$mod] ?? null;
        if ($currentStatus === $def['status']) {
            // Only add if not already flagged by generic logic
            if (!in_array($def['flag'], $issues)) {
                $issues[] = $def['flag'];
            }
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT COMPLIANCE CSV — CSV export for event compliance dashboard
// ═══════════════════════════════════════════════════════════════════════════

function handleEventComplianceCSV(PDO $pdo): void {
    $eventId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventId) tm_error('Missing eventInstanceId');
    $classFilter = $_GET['classFilter'] ?? '';

    // Get event name for filename
    $evStmt = $pdo->prepare("SELECT name, start_date_local FROM event_instances WHERE id = ?");
    $evStmt->execute([$eventId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) tm_error('Event not found', 404);

    // Get compliance data (reuse logic from handleEventCompliance)
    $sql = "
        SELECT ee.id, ee.competition_number, ee.class_index, ee.category, ee.entry_status,
               p.display_name AS person_name, o.name AS org_name
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE ee.event_instance_id = ? AND ee.entry_status IN ('registered','active')
    ";
    $params = [$eventId];
    if ($classFilter) {
        $sql .= " AND ee.class_index = ?";
        $params[] = $classFilter;
    }
    $sql .= " ORDER BY ee.competition_number";
    $entryStmt = $pdo->prepare($sql);
    $entryStmt->execute($params);
    $entries = $entryStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($entries)) {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="compliance_empty.csv"');
        echo "No entries found\n";
        exit;
    }

    $entryIds = array_column($entries, 'id');
    $placeholders = implode(',', array_fill(0, count($entryIds), '?'));

    // Batch queries (same as handleEventCompliance)
    $scaleStmt = $pdo->prepare("SELECT event_entry_id, COUNT(*) AS cnt, SUM(CASE WHEN (measured_total_weight IS NOT NULL OR derived_total_weight IS NOT NULL) THEN 1 ELSE 0 END) AS weighed FROM scale_records WHERE event_entry_id IN ($placeholders) GROUP BY event_entry_id");
    $scaleStmt->execute($entryIds);
    $scaleMap = [];
    foreach ($scaleStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $scaleMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'weighed' => (int)$r['weighed']];
    }

    $fuelStmt = $pdo->prepare("SELECT event_entry_id, COUNT(*) AS cnt, SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails FROM fuel_records WHERE event_entry_id IN ($placeholders) GROUP BY event_entry_id");
    $fuelStmt->execute($entryIds);
    $fuelMap = [];
    foreach ($fuelStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $fuelMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'fails' => (int)$r['fails']];
    }

    $inspStmt = $pdo->prepare("SELECT event_entry_id, COUNT(*) AS cnt, SUM(CASE WHEN overall_result = 'fail' THEN 1 ELSE 0 END) AS fails, SUM(CASE WHEN overall_result = 'incomplete' THEN 1 ELSE 0 END) AS incomplete FROM inspection_records WHERE event_entry_id IN ($placeholders) GROUP BY event_entry_id");
    $inspStmt->execute($entryIds);
    $inspMap = [];
    foreach ($inspStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $inspMap[(int)$r['event_entry_id']] = ['cnt' => (int)$r['cnt'], 'fails' => (int)$r['fails'], 'incomplete' => (int)$r['incomplete']];
    }

    $cardStmt = $pdo->prepare("SELECT d.event_entry_id, d.card_status FROM techcard_declarations d WHERE d.event_entry_id IN ($placeholders) ORDER BY d.revision DESC");
    $cardStmt->execute($entryIds);
    $cardMap = [];
    foreach ($cardStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($cardMap[$eid])) $cardMap[$eid] = $r['card_status'];
    }

    $tdStmt = $pdo->prepare("SELECT event_entry_id, teardown_status, overall_result FROM teardown_records WHERE event_entry_id IN ($placeholders) ORDER BY created_at DESC");
    $tdStmt->execute($entryIds);
    $tdMap = [];
    foreach ($tdStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($tdMap[$eid])) $tdMap[$eid] = $r;
    }

    $findStmt = $pdo->prepare("SELECT tc.event_entry_id, COUNT(*) AS open_count FROM tech_findings tf JOIN tech_cases tc ON tf.tech_case_id = tc.id WHERE tc.event_entry_id IN ($placeholders) AND tf.disposition = 'open' GROUP BY tc.event_entry_id");
    $findStmt->execute($entryIds);
    $findingsMap = [];
    foreach ($findStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $findingsMap[(int)$r['event_entry_id']] = (int)$r['open_count'];
    }

    // Load holds
    $holdStmt = $pdo->prepare("SELECT event_entry_id, hold_type, reason FROM entry_holds WHERE event_entry_id IN ($placeholders) AND is_active = 1");
    $holdStmt->execute($entryIds);
    $holdMap = [];
    foreach ($holdStmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $eid = (int)$r['event_entry_id'];
        if (!isset($holdMap[$eid])) $holdMap[$eid] = $r;
    }

    // Required modules cache
    $reqModuleCache = [];
    foreach ($entries as $e) {
        $key = ($e['category'] ?? '') . '/' . ($e['class_index'] ?? '');
        if (!isset($reqModuleCache[$key])) {
            $reqModuleCache[$key] = dossierRequiredModules($pdo, $e['category'] ?? '', $e['class_index'] ?? '');
        }
    }

    // Build CSV
    $filename = 'compliance_' . preg_replace('/[^a-z0-9_-]/i', '_', $event['name']) . '_' . date('Ymd') . '.csv';
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $out = fopen('php://output', 'w');
    fputcsv($out, ['Entry #', 'Driver', 'Team', 'Category', 'Class', 'Scale', 'Fuel', 'Inspection', 'Tech Card', 'Teardown', 'Open Findings', 'Readiness', 'Hold Status', 'Hold Reason', 'Issues']);

    foreach ($entries as $e) {
        $eid = (int)$e['id'];

        $s = $scaleMap[$eid] ?? null;
        $scaleStatus = $s ? ((int)$s['cnt'] === 0 ? 'not_weighed' : 'weighed') : 'not_weighed';

        $f = $fuelMap[$eid] ?? null;
        $fuelStatus = !$f ? 'not_checked' : ((int)$f['fails'] > 0 ? 'has_failure' : 'checked_ok');

        $i = $inspMap[$eid] ?? null;
        $inspStatus = !$i ? 'not_inspected' : ((int)$i['fails'] > 0 ? 'has_failure' : ((int)$i['incomplete'] > 0 ? 'has_incomplete' : 'inspected_ok'));

        $cardStatus = $cardMap[$eid] ?? 'no_declaration';

        $td = $tdMap[$eid] ?? null;
        $tdStatus = $td ? $td['teardown_status'] : 'no_teardown';
        $tdResult = $td ? $td['overall_result'] : null;

        $openFindings = $findingsMap[$eid] ?? 0;

        $hold = $holdMap[$eid] ?? null;
        $holdStatus = $hold ? $hold['hold_type'] : '';
        $holdReason = $hold ? $hold['reason'] : '';

        // Derive issues
        $issueFlags = [];
        if ($scaleStatus === 'not_weighed') $issueFlags[] = 'no_scale';
        if ($fuelStatus === 'not_checked') $issueFlags[] = 'no_fuel';
        if ($fuelStatus === 'has_failure') $issueFlags[] = 'fuel_fail';
        if ($inspStatus === 'not_inspected') $issueFlags[] = 'no_inspection';
        if ($inspStatus === 'has_failure') $issueFlags[] = 'insp_fail';
        if ($cardStatus === 'no_declaration' || $cardStatus === 'missing') $issueFlags[] = 'no_techcard';
        if ($cardStatus === 'discrepancy_found') $issueFlags[] = 'techcard_discrepancy';
        if ($tdResult === 'fail') $issueFlags[] = 'teardown_fail';
        if ($openFindings > 0) $issueFlags[] = 'open_findings';

        // Apply required modules
        $reqKey = ($e['category'] ?? '') . '/' . ($e['class_index'] ?? '');
        $reqMods = $reqModuleCache[$reqKey] ?? [];
        dossierApplyRequiredModules($issueFlags, $reqMods, [
            'scale' => $scaleStatus, 'fuel' => $fuelStatus, 'inspection' => $inspStatus,
            'techcard' => $cardStatus, 'teardown' => $tdStatus,
        ]);

        $readiness = empty($issueFlags) ? 'clear' : 'has_issues';
        $hasCritical = array_intersect($issueFlags, ['fuel_fail', 'insp_fail', 'teardown_fail']);
        if (!empty($hasCritical)) $readiness = 'critical';
        $reqMissingFlags = array_filter($issueFlags, fn($f) => str_starts_with($f, 'required_module_missing_'));
        if (!empty($reqMissingFlags)) $readiness = 'critical';

        fputcsv($out, [
            $e['competition_number'],
            $e['person_name'] ?? '',
            $e['org_name'] ?? '',
            $e['category'] ?? '',
            $e['class_index'] ?? '',
            $scaleStatus,
            $fuelStatus,
            $inspStatus,
            $cardStatus,
            $tdStatus . ($tdResult ? " ($tdResult)" : ''),
            $openFindings,
            $readiness,
            $holdStatus,
            $holdReason,
            implode('; ', $issueFlags),
        ]);
    }

    fclose($out);
    exit;
}
