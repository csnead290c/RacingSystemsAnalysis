<?php
/**
 * Run Incidents API
 *
 * Endpoints:
 *   GET  ?action=listIncidentTypes                — List active incident types
 *   GET  ?action=listRunIncidents&run_id=N         — List incidents for a run
 *   POST ?action=createRunIncident                 — Create an incident on a run
 *   POST ?action=updateRunIncident                 — Update an existing incident
 *   POST ?action=deleteRunIncident                 — Delete an incident
 *   POST ?action=attachIncidentMedia               — (stub) Attach media to incident
 *   GET  ?action=listIncidentLinks&incident_id=N   — List links for an incident
 *   POST ?action=createIncidentLink                — Create a link on an incident
 *   POST ?action=deleteIncidentLink                — Delete a link
 *   POST ?action=manageIncidentTypes               — (stub) Admin CRUD for incident types
 *
 * Permission model:
 *   incidents.read       — view incidents
 *   incidents.create     — create incidents
 *   incidents.edit.own   — edit/delete own incidents (created_by = current user)
 *   incidents.edit.all   — edit/delete any incident (admin)
 *
 * All endpoints require authentication + nhra.parity capability.
 */

ini_set('display_errors', '0');
error_reporting(E_ALL);

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';

header('Content-Type: application/json; charset=utf-8');

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
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'listIncidentTypes':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListIncidentTypes($pdo, $userId, $role);
        break;
    case 'listRunIncidents':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListRunIncidents($pdo, $userId, $role);
        break;
    case 'createRunIncident':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateRunIncident($pdo, $userId, $role);
        break;
    case 'updateRunIncident':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleUpdateRunIncident($pdo, $userId, $role);
        break;
    case 'deleteRunIncident':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteRunIncident($pdo, $userId, $role);
        break;
    case 'attachIncidentMedia':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleAttachIncidentMedia($pdo, $userId, $role);
        break;
    case 'listIncidentLinks':
        if ($method !== 'GET') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleListIncidentLinks($pdo, $userId, $role);
        break;
    case 'createIncidentLink':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateIncidentLink($pdo, $userId, $role);
        break;
    case 'deleteIncidentLink':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleDeleteIncidentLink($pdo, $userId, $role);
        break;
    case 'attachIncidentLink':
        // Legacy alias — redirects to createIncidentLink
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleCreateIncidentLink($pdo, $userId, $role);
        break;
    case 'manageIncidentTypes':
        if ($method !== 'POST') rsa_jsonResponse(['error' => 'Method not allowed'], 405);
        handleManageIncidentTypes($pdo, $userId, $role);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

} catch (Throwable $e) {
    error_log('incidents.php unhandled exception [' . ($action ?? '') . ']: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
    rsa_jsonResponse(['error' => 'Internal server error', 'detail' => $e->getMessage()], 500);
}

// ============================================================================
// Permission helpers
// ============================================================================

function inc_requireCap(PDO $pdo, int $userId, string $role, string $cap): void {
    if (!rsa_hasCap($pdo, $userId, $role, $cap)) {
        rsa_jsonResponse(['error' => 'Forbidden', 'message' => "Missing capability: $cap"], 403);
    }
}

/**
 * Check if the current user can edit/delete the given incident.
 * Requires incidents.edit.own (for own) or incidents.edit.all (for any).
 */
function inc_canEditIncident(PDO $pdo, int $userId, string $role, array $incident): bool {
    if (rsa_hasCap($pdo, $userId, $role, 'incidents.edit.all')) return true;
    if (rsa_hasCap($pdo, $userId, $role, 'incidents.edit.own') && (int)$incident['created_by'] === $userId) return true;
    return false;
}

function inc_requireEditIncident(PDO $pdo, int $userId, string $role, array $incident): void {
    if (!inc_canEditIncident($pdo, $userId, $role, $incident)) {
        rsa_jsonResponse(['error' => 'Forbidden', 'message' => 'You can only edit incidents you created'], 403);
    }
}

function inc_loadIncident(PDO $pdo, int $incidentId): ?array {
    $stmt = $pdo->prepare("SELECT * FROM run_incidents WHERE id = ?");
    $stmt->execute([$incidentId]);
    return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
}

// ============================================================================
// GET ?action=listIncidentTypes
// ============================================================================

function handleListIncidentTypes(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.read');

    $stmt = $pdo->query("
        SELECT id, `key`, label, severity_min, severity_max, sort_order, is_active
        FROM incident_types
        WHERE is_active = 1
        ORDER BY sort_order ASC, label ASC
    ");
    $types = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($types as &$t) {
        $t['id'] = (int)$t['id'];
        $t['severity_min'] = $t['severity_min'] !== null ? (int)$t['severity_min'] : null;
        $t['severity_max'] = $t['severity_max'] !== null ? (int)$t['severity_max'] : null;
        $t['sort_order'] = (int)$t['sort_order'];
        $t['is_active'] = (bool)(int)$t['is_active'];
    }

    rsa_jsonResponse(['types' => $types]);
}

// ============================================================================
// GET ?action=listRunIncidents&run_id=N
// ============================================================================

function handleListRunIncidents(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.read');

    $runId = (int)($_GET['run_id'] ?? 0);
    if ($runId <= 0) {
        rsa_jsonResponse(['error' => 'run_id is required'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT ri.id, ri.run_id, ri.incident_type_id, ri.occurred_at_utc,
               ri.lane, ri.track_segment, ri.severity, ri.summary, ri.details,
               ri.created_by, ri.created_at, ri.updated_by, ri.updated_at,
               it.`key` AS incident_type_key, it.label AS incident_type_label
        FROM run_incidents ri
        JOIN incident_types it ON it.id = ri.incident_type_id
        WHERE ri.run_id = ?
        ORDER BY ri.created_at DESC
    ");
    $stmt->execute([$runId]);
    $incidents = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($incidents as &$inc) {
        $inc['id'] = (int)$inc['id'];
        $inc['run_id'] = (int)$inc['run_id'];
        $inc['incident_type_id'] = (int)$inc['incident_type_id'];
        $inc['severity'] = $inc['severity'] !== null ? (int)$inc['severity'] : null;
        $inc['created_by'] = (int)$inc['created_by'];
        $inc['updated_by'] = $inc['updated_by'] !== null ? (int)$inc['updated_by'] : null;
        $inc['can_edit'] = inc_canEditIncident($pdo, $userId, $role, $inc);
    }

    rsa_jsonResponse(['incidents' => $incidents, 'run_id' => $runId]);
}

// ============================================================================
// POST ?action=createRunIncident
// Body: { run_id, incident_type_id, severity?, summary, details?,
//         occurred_at_utc?, lane?, track_segment? }
// ============================================================================

function handleCreateRunIncident(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.create');

    $input = rsa_getJsonInput();
    $runId = (int)($input['run_id'] ?? 0);
    $typeId = (int)($input['incident_type_id'] ?? 0);
    $summary = trim($input['summary'] ?? '');

    if ($runId <= 0) rsa_jsonResponse(['error' => 'run_id is required'], 400);
    if ($typeId <= 0) rsa_jsonResponse(['error' => 'incident_type_id is required'], 400);
    if ($summary === '') rsa_jsonResponse(['error' => 'summary is required'], 400);

    // Validate run exists
    $runCheck = $pdo->prepare("SELECT id FROM parity_runs WHERE id = ?");
    $runCheck->execute([$runId]);
    if (!$runCheck->fetch()) {
        rsa_jsonResponse(['error' => "Run $runId not found"], 404);
    }

    // Validate type exists and is active
    $typeCheck = $pdo->prepare("SELECT id FROM incident_types WHERE id = ? AND is_active = 1");
    $typeCheck->execute([$typeId]);
    if (!$typeCheck->fetch()) {
        rsa_jsonResponse(['error' => "Incident type $typeId not found or inactive"], 404);
    }

    $severity = isset($input['severity']) ? (int)$input['severity'] : null;
    $details = $input['details'] ?? null;
    $occurredAt = $input['occurred_at_utc'] ?? null;
    $lane = $input['lane'] ?? null;
    $trackSegment = $input['track_segment'] ?? null;

    $stmt = $pdo->prepare("
        INSERT INTO run_incidents (run_id, incident_type_id, occurred_at_utc, lane, track_segment, severity, summary, details, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$runId, $typeId, $occurredAt, $lane, $trackSegment, $severity, $summary, $details, $userId]);
    $newId = (int)$pdo->lastInsertId();

    rsa_jsonResponse([
        'ok' => true,
        'incident_id' => $newId,
        'run_id' => $runId,
    ], 201);
}

// ============================================================================
// POST ?action=updateRunIncident
// Body: { incident_id, incident_type_id?, severity?, summary?, details?,
//         occurred_at_utc?, lane?, track_segment? }
// ============================================================================

function handleUpdateRunIncident(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $incidentId = (int)($input['incident_id'] ?? 0);
    if ($incidentId <= 0) rsa_jsonResponse(['error' => 'incident_id is required'], 400);

    $incident = inc_loadIncident($pdo, $incidentId);
    if (!$incident) rsa_jsonResponse(['error' => "Incident $incidentId not found"], 404);

    inc_requireEditIncident($pdo, $userId, $role, $incident);

    // Build SET clause from provided fields
    $sets = [];
    $params = [];

    if (isset($input['incident_type_id'])) {
        $typeId = (int)$input['incident_type_id'];
        $typeCheck = $pdo->prepare("SELECT id FROM incident_types WHERE id = ? AND is_active = 1");
        $typeCheck->execute([$typeId]);
        if (!$typeCheck->fetch()) rsa_jsonResponse(['error' => "Incident type $typeId not found or inactive"], 404);
        $sets[] = 'incident_type_id = ?';
        $params[] = $typeId;
    }
    if (array_key_exists('severity', $input)) {
        $sets[] = 'severity = ?';
        $params[] = $input['severity'] !== null ? (int)$input['severity'] : null;
    }
    if (array_key_exists('summary', $input)) {
        $summary = trim($input['summary']);
        if ($summary === '') rsa_jsonResponse(['error' => 'summary cannot be empty'], 400);
        $sets[] = 'summary = ?';
        $params[] = $summary;
    }
    if (array_key_exists('details', $input)) {
        $sets[] = 'details = ?';
        $params[] = $input['details'];
    }
    if (array_key_exists('occurred_at_utc', $input)) {
        $sets[] = 'occurred_at_utc = ?';
        $params[] = $input['occurred_at_utc'];
    }
    if (array_key_exists('lane', $input)) {
        $sets[] = 'lane = ?';
        $params[] = $input['lane'];
    }
    if (array_key_exists('track_segment', $input)) {
        $sets[] = 'track_segment = ?';
        $params[] = $input['track_segment'];
    }

    if (empty($sets)) {
        rsa_jsonResponse(['error' => 'No fields to update'], 400);
    }

    $sets[] = 'updated_by = ?';
    $params[] = $userId;
    $params[] = $incidentId;

    $sql = "UPDATE run_incidents SET " . implode(', ', $sets) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    rsa_jsonResponse(['ok' => true, 'incident_id' => $incidentId]);
}

// ============================================================================
// POST ?action=deleteRunIncident
// Body: { incident_id }
// ============================================================================

function handleDeleteRunIncident(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $incidentId = (int)($input['incident_id'] ?? 0);
    if ($incidentId <= 0) rsa_jsonResponse(['error' => 'incident_id is required'], 400);

    $incident = inc_loadIncident($pdo, $incidentId);
    if (!$incident) rsa_jsonResponse(['error' => "Incident $incidentId not found"], 404);

    inc_requireEditIncident($pdo, $userId, $role, $incident);

    $pdo->prepare("DELETE FROM run_incidents WHERE id = ?")->execute([$incidentId]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $incidentId]);
}

// ============================================================================
// POST ?action=attachIncidentMedia (stub)
// ============================================================================

function handleAttachIncidentMedia(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.create');
    rsa_jsonResponse(['error' => 'Not yet implemented — media attachments coming soon'], 501);
}

// ============================================================================
// Allowed link types
// ============================================================================

const ALLOWED_LINK_TYPES = ['external_url', 'idr_session', 'idr_file'];

// ============================================================================
// GET ?action=listIncidentLinks&incident_id=N
// ============================================================================

function handleListIncidentLinks(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.read');

    $incidentId = (int)($_GET['incident_id'] ?? 0);
    if ($incidentId <= 0) {
        rsa_jsonResponse(['error' => 'incident_id is required'], 400);
    }

    // Verify incident exists
    $incident = inc_loadIncident($pdo, $incidentId);
    if (!$incident) {
        rsa_jsonResponse(['error' => "Incident $incidentId not found"], 404);
    }

    $stmt = $pdo->prepare("
        SELECT id, incident_id, link_type, ref, meta_json, created_by, created_at
        FROM incident_links
        WHERE incident_id = ?
        ORDER BY created_at DESC
    ");
    $stmt->execute([$incidentId]);
    $links = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $canEdit = inc_canEditIncident($pdo, $userId, $role, $incident);

    foreach ($links as &$lnk) {
        $lnk['id'] = (int)$lnk['id'];
        $lnk['incident_id'] = (int)$lnk['incident_id'];
        $lnk['created_by'] = (int)$lnk['created_by'];
        $lnk['meta_json'] = $lnk['meta_json'] !== null ? json_decode($lnk['meta_json'], true) : null;
        $lnk['can_delete'] = $canEdit;
    }

    rsa_jsonResponse(['links' => $links, 'incident_id' => $incidentId]);
}

// ============================================================================
// POST ?action=createIncidentLink
// Body: { incident_id, link_type, ref, meta_json? }
// ============================================================================

function handleCreateIncidentLink(PDO $pdo, int $userId, string $role): void {
    inc_requireCap($pdo, $userId, $role, 'incidents.create');

    $input = rsa_getJsonInput();
    $incidentId = (int)($input['incident_id'] ?? 0);
    $linkType   = trim($input['link_type'] ?? '');
    $ref        = trim($input['ref'] ?? '');
    $metaJson   = $input['meta_json'] ?? null;

    if ($incidentId <= 0) rsa_jsonResponse(['error' => 'incident_id is required'], 400);
    if ($linkType === '') rsa_jsonResponse(['error' => 'link_type is required'], 400);
    if ($ref === '') rsa_jsonResponse(['error' => 'ref is required'], 400);

    if (!in_array($linkType, ALLOWED_LINK_TYPES, true)) {
        rsa_jsonResponse(['error' => 'Invalid link_type. Allowed: ' . implode(', ', ALLOWED_LINK_TYPES)], 400);
    }

    // Verify incident exists and user can edit it
    $incident = inc_loadIncident($pdo, $incidentId);
    if (!$incident) {
        rsa_jsonResponse(['error' => "Incident $incidentId not found"], 404);
    }
    inc_requireEditIncident($pdo, $userId, $role, $incident);

    $metaJsonStr = $metaJson !== null ? json_encode($metaJson) : null;

    $stmt = $pdo->prepare("
        INSERT INTO incident_links (incident_id, link_type, ref, meta_json, created_by)
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([$incidentId, $linkType, $ref, $metaJsonStr, $userId]);
    $newId = (int)$pdo->lastInsertId();

    rsa_jsonResponse([
        'ok' => true,
        'link_id' => $newId,
        'incident_id' => $incidentId,
    ], 201);
}

// ============================================================================
// POST ?action=deleteIncidentLink
// Body: { link_id }
// ============================================================================

function handleDeleteIncidentLink(PDO $pdo, int $userId, string $role): void {
    $input = rsa_getJsonInput();
    $linkId = (int)($input['link_id'] ?? 0);
    if ($linkId <= 0) rsa_jsonResponse(['error' => 'link_id is required'], 400);

    // Load link
    $stmt = $pdo->prepare("SELECT * FROM incident_links WHERE id = ?");
    $stmt->execute([$linkId]);
    $link = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$link) {
        rsa_jsonResponse(['error' => "Link $linkId not found"], 404);
    }

    // Permission check: user must be able to edit the parent incident
    $incident = inc_loadIncident($pdo, (int)$link['incident_id']);
    if (!$incident) {
        rsa_jsonResponse(['error' => 'Parent incident not found'], 404);
    }
    inc_requireEditIncident($pdo, $userId, $role, $incident);

    $pdo->prepare("DELETE FROM incident_links WHERE id = ?")->execute([$linkId]);

    rsa_jsonResponse(['ok' => true, 'deleted_id' => $linkId]);
}

// ============================================================================
// POST ?action=manageIncidentTypes (stub — admin CRUD for types)
// ============================================================================

function handleManageIncidentTypes(PDO $pdo, int $userId, string $role): void {
    if (!in_array($role, ['owner', 'admin'], true)) {
        rsa_jsonResponse(['error' => 'Requires owner or admin role'], 403);
    }
    rsa_jsonResponse(['error' => 'Not yet implemented — admin type management coming soon'], 501);
}
