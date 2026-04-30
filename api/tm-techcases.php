<?php
/**
 * Tech Master — Tech Cases API
 *
 * Endpoints for tech_cases, tech_findings, tech_attachments.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST).
 *
 * Actions:
 *   GET  ?action=listCases&eventEntryId=N                — cases for an entry
 *   GET  ?action=listCasesByEvent&eventInstanceId=N       — cases for an event
 *   GET  ?action=getCase&id=N                             — case detail + findings
 *   POST ?action=createCase                               — create tech case
 *   POST ?action=updateCase                               — update tech case
 *   POST ?action=closeCase                                — close a tech case
 *   GET  ?action=listFindings&techCaseId=N                — findings for a case
 *   POST ?action=addFinding                               — add finding to case
 *   POST ?action=updateFinding                            — update a finding
 *   GET  ?action=listAttachments&parentType=...&parentId=N — attachments for a parent
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
    case 'listCases':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListCases($pdo);
        break;
    case 'listCasesByEvent':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListCasesByEvent($pdo);
        break;
    case 'getCase':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGetCase($pdo);
        break;
    case 'createCase':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreateCase($pdo, $userId);
        break;
    case 'updateCase':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateCase($pdo, $userId);
        break;
    case 'closeCase':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCloseCase($pdo, $userId);
        break;
    case 'listFindings':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListFindings($pdo);
        break;
    case 'addFinding':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleAddFinding($pdo, $userId);
        break;
    case 'updateFinding':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateFinding($pdo, $userId);
        break;
    case 'listAttachments':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListAttachments($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Handlers ────────────────────────────────────────────────────────────

function handleListCases(PDO $pdo): void {
    $entryId = (int)($_GET['eventEntryId'] ?? 0);
    if (!$entryId) tm_error('Missing eventEntryId', 400);

    $stmt = $pdo->prepare("
        SELECT tc.*,
               (SELECT COUNT(*) FROM tech_findings tf WHERE tf.tech_case_id = tc.id) AS finding_count
        FROM tech_cases tc
        WHERE tc.event_entry_id = ?
        ORDER BY tc.opened_at DESC
    ");
    $stmt->execute([$entryId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['cases' => $rows, 'count' => count($rows)]);
}

function handleListCasesByEvent(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventInstanceId) tm_error('Missing eventInstanceId', 400);

    $caseType = $_GET['caseType'] ?? null;
    $status = $_GET['status'] ?? null;

    $where = 'ee.event_instance_id = ?';
    $params = [$eventInstanceId];

    if ($caseType) {
        $where .= ' AND tc.case_type = ?';
        $params[] = $caseType;
    }
    if ($status) {
        $where .= ' AND tc.status = ?';
        $params[] = $status;
    }

    $stmt = $pdo->prepare("
        SELECT tc.*,
               ee.competition_number, ee.class_index, ee.category,
               p.display_name AS person_name,
               o.name AS org_name,
               (SELECT COUNT(*) FROM tech_findings tf WHERE tf.tech_case_id = tc.id) AS finding_count
        FROM tech_cases tc
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        WHERE $where
        ORDER BY tc.opened_at DESC
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['cases' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventInstanceId]);
}

function handleGetCase(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $stmt = $pdo->prepare("
        SELECT tc.*,
               ee.competition_number, ee.class_index, ee.category, ee.event_instance_id,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_description
        FROM tech_cases tc
        JOIN event_entries ee ON tc.event_entry_id = ee.id
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        WHERE tc.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Tech case not found', 404);

    // Include findings
    $fStmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $fStmt->execute([$id]);
    $findings = $fStmt->fetchAll(PDO::FETCH_ASSOC);

    // Include attachments
    $aStmt = $pdo->prepare("SELECT * FROM tech_attachments WHERE parent_type = 'tech_case' AND parent_id = ? ORDER BY created_at");
    $aStmt->execute([$id]);
    $attachments = $aStmt->fetchAll(PDO::FETCH_ASSOC);

    $row['findings'] = $findings;
    $row['attachments'] = $attachments;

    tm_json(['case' => $row]);
}

function handleCreateCase(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $uuid = tm_uuid();

    $entryId = (int)tm_requireParam($body, 'event_entry_id');
    $caseType = tm_requireParam($body, 'case_type');

    // Verify entry exists
    $check = $pdo->prepare("SELECT id FROM event_entries WHERE id = ?");
    $check->execute([$entryId]);
    if (!$check->fetch()) tm_error('Event entry not found', 404);

    $stmt = $pdo->prepare("
        INSERT INTO tech_cases (uuid, event_entry_id, case_type, status, opened_at, operator_id, location, summary, notes, created_by)
        VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $entryId,
        $caseType,
        tm_optionalParam($body, 'status', 'open'),
        tm_optionalInt($body, 'operator_id'),
        tm_optionalParam($body, 'location'),
        tm_optionalParam($body, 'summary'),
        tm_optionalParam($body, 'notes'),
        $userId,
    ]);

    $id = (int)$pdo->lastInsertId();
    tm_json(['id' => $id, 'uuid' => $uuid], 201);
}

function handleUpdateCase(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $check = $pdo->prepare("SELECT id FROM tech_cases WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) tm_error('Tech case not found', 404);

    $allowed = ['case_type', 'status', 'operator_id', 'location', 'summary', 'notes'];
    $sets = [];
    $params = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $body)) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
        }
    }
    if (empty($sets)) tm_error('No updatable fields provided', 400);

    $params[] = $id;
    $pdo->prepare("UPDATE tech_cases SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $id]);
}

function handleCloseCase(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $check = $pdo->prepare("SELECT id, status FROM tech_cases WHERE id = ?");
    $check->execute([$id]);
    $row = $check->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Tech case not found', 404);
    if ($row['status'] === 'closed') tm_error('Case already closed', 400);

    $pdo->prepare("UPDATE tech_cases SET status = 'closed', closed_at = NOW() WHERE id = ?")->execute([$id]);

    tm_json(['closed' => true, 'id' => $id]);
}

function handleListFindings(PDO $pdo): void {
    $caseId = (int)($_GET['techCaseId'] ?? 0);
    if (!$caseId) tm_error('Missing techCaseId', 400);

    $stmt = $pdo->prepare("SELECT * FROM tech_findings WHERE tech_case_id = ? ORDER BY created_at");
    $stmt->execute([$caseId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['findings' => $rows, 'count' => count($rows)]);
}

function handleAddFinding(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $uuid = tm_uuid();

    $caseId = (int)tm_requireParam($body, 'tech_case_id');
    $findingType = tm_requireParam($body, 'finding_type');
    $description = tm_requireParam($body, 'description');

    // Verify case exists
    $check = $pdo->prepare("SELECT id FROM tech_cases WHERE id = ?");
    $check->execute([$caseId]);
    if (!$check->fetch()) tm_error('Tech case not found', 404);

    $stmt = $pdo->prepare("
        INSERT INTO tech_findings (uuid, tech_case_id, finding_type, severity, description, measured_value, expected_value, disposition, follow_up_required, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $caseId,
        $findingType,
        tm_optionalParam($body, 'severity', 'info'),
        $description,
        tm_optionalParam($body, 'measured_value'),
        tm_optionalParam($body, 'expected_value'),
        tm_optionalParam($body, 'disposition', 'open'),
        (int)($body['follow_up_required'] ?? 0),
        tm_optionalParam($body, 'notes'),
        $userId,
    ]);

    $id = (int)$pdo->lastInsertId();
    tm_json(['id' => $id, 'uuid' => $uuid], 201);
}

function handleUpdateFinding(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $check = $pdo->prepare("SELECT id FROM tech_findings WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) tm_error('Finding not found', 404);

    $allowed = ['finding_type', 'severity', 'description', 'measured_value', 'expected_value', 'disposition', 'follow_up_required', 'notes'];
    $sets = [];
    $params = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $body)) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
        }
    }

    // Auto-set resolved fields
    if (array_key_exists('disposition', $body) && in_array($body['disposition'], ['resolved', 'penalized', 'waived'])) {
        $sets[] = "resolved_at = NOW()";
        $sets[] = "resolved_by = ?";
        $params[] = $userId;
    }

    if (empty($sets)) tm_error('No updatable fields provided', 400);

    $params[] = $id;
    $pdo->prepare("UPDATE tech_findings SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $id]);
}

function handleListAttachments(PDO $pdo): void {
    $parentType = $_GET['parentType'] ?? '';
    $parentId = (int)($_GET['parentId'] ?? 0);
    if (!$parentType || !$parentId) tm_error('Missing parentType or parentId', 400);

    $allowed = ['tech_case', 'finding', 'event_entry', 'vehicle_asset', 'component', 'person', 'organization'];
    if (!in_array($parentType, $allowed)) tm_error("Invalid parentType: $parentType", 400);

    $stmt = $pdo->prepare("SELECT * FROM tech_attachments WHERE parent_type = ? AND parent_id = ? ORDER BY created_at");
    $stmt->execute([$parentType, $parentId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['attachments' => $rows, 'count' => count($rows)]);
}
