<?php
/**
 * Tech Master — Event Entries API
 *
 * Endpoints for event_entries CRUD + assignment history.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST).
 *
 * Actions:
 *   GET  ?action=listForEvent&eventInstanceId=N           — entries for an event
 *   GET  ?action=get&id=N                                 — get entry by ID
 *   POST ?action=create                                   — create entry
 *   POST ?action=update                                   — update entry (records change audit)
 *   POST ?action=bulkCreate                               — bulk create entries
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
    case 'listForEvent':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListForEvent($pdo);
        break;
    case 'get':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGet($pdo);
        break;
    case 'create':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreate($pdo, $userId);
        break;
    case 'update':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdate($pdo, $userId);
        break;
    case 'bulkCreate':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleBulkCreate($pdo, $userId);
        break;
    case 'rosterPreview':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleRosterPreview($pdo);
        break;
    case 'rosterCommit':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleRosterCommit($pdo, $userId);
        break;
    case 'getDetail':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGetDetail($pdo);
        break;
    case 'listCategories':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListCategories($pdo);
        break;
    case 'deriveFromRuns':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleDeriveFromRuns($pdo, $userId);
        break;
    case 'backfillRunLinks':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleBackfillRunLinks($pdo, $userId);
        break;
    case 'derivationStatus':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleDerivationStatus($pdo);
        break;
    case 'linkReview':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleLinkReview($pdo);
        break;
    case 'manualLink':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleManualLink($pdo, $userId);
        break;
    case 'markReviewed':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleMarkReviewed($pdo, $userId);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Handlers ────────────────────────────────────────────────────────────

function handleListForEvent(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventInstanceId) tm_error('Missing eventInstanceId', 400);

    $classFilter = $_GET['classIndex'] ?? null;

    $where = 'ee.event_instance_id = ?';
    $params = [$eventInstanceId];

    if ($classFilter) {
        $where .= ' AND ee.class_index = ?';
        $params[] = $classFilter;
    }

    $stmt = $pdo->prepare("
        SELECT ee.*,
               p.display_name AS person_name,
               o.name AS org_name,
               va.description AS vehicle_description
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        WHERE $where
        ORDER BY ee.class_index, ee.competition_number
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['entries' => $rows, 'count' => count($rows), 'eventInstanceId' => $eventInstanceId]);
}

function handleGet(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $stmt = $pdo->prepare("
        SELECT ee.*,
               p.display_name AS person_name, p.normalized_name,
               o.name AS org_name,
               va.description AS vehicle_description, va.chassis_serial,
               ei.name AS event_name, ei.race_lookup
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE ee.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Entry not found', 404);

    tm_json(['entry' => $row]);
}

function handleCreate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $uuid = tm_uuid();

    $eventInstanceId = (int)tm_requireParam($body, 'event_instance_id');

    // Verify event exists
    $check = $pdo->prepare("SELECT id FROM event_instances WHERE id = ?");
    $check->execute([$eventInstanceId]);
    if (!$check->fetch()) tm_error('Event instance not found', 404);

    $stmt = $pdo->prepare("
        INSERT INTO event_entries (uuid, event_instance_id, person_id, org_id, vehicle_id, category, class_index, competition_number, entry_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $eventInstanceId,
        tm_optionalInt($body, 'person_id'),
        tm_optionalInt($body, 'org_id'),
        tm_optionalInt($body, 'vehicle_id'),
        tm_optionalParam($body, 'category'),
        tm_optionalParam($body, 'class_index'),
        tm_optionalParam($body, 'competition_number'),
        tm_optionalParam($body, 'entry_status', 'registered'),
        tm_optionalParam($body, 'notes'),
    ]);

    $id = (int)$pdo->lastInsertId();
    tm_json(['id' => $id, 'uuid' => $uuid], 201);
}

function handleUpdate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    // Load current state for change audit
    $check = $pdo->prepare("SELECT * FROM event_entries WHERE id = ?");
    $check->execute([$id]);
    $current = $check->fetch(PDO::FETCH_ASSOC);
    if (!$current) tm_error('Entry not found', 404);

    $allowed = ['person_id', 'org_id', 'vehicle_id', 'category', 'class_index', 'competition_number', 'entry_status', 'notes'];
    $sets = [];
    $params = [];
    $changes = [];

    foreach ($allowed as $col) {
        if (array_key_exists($col, $body) && (string)($body[$col] ?? '') !== (string)($current[$col] ?? '')) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
            $changes[] = [
                'field_name' => $col,
                'old_value' => $current[$col] !== null ? (string)$current[$col] : null,
                'new_value' => $body[$col] !== null ? (string)$body[$col] : null,
                'reason' => tm_optionalParam($body, 'change_reason'),
            ];
        }
    }

    if (empty($sets)) tm_error('No changes detected', 400);

    $params[] = $id;
    $pdo->prepare("UPDATE event_entries SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    // Record change audit
    $auditStmt = $pdo->prepare("
        INSERT INTO event_entry_changes (event_entry_id, field_name, old_value, new_value, reason, changed_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    foreach ($changes as $c) {
        $auditStmt->execute([
            $id,
            $c['field_name'],
            $c['old_value'],
            $c['new_value'],
            $c['reason'],
            $userId,
        ]);
    }

    tm_json(['updated' => true, 'id' => $id, 'changesRecorded' => count($changes)]);
}

function handleBulkCreate(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $entries = $body['entries'] ?? [];
    if (!is_array($entries) || empty($entries)) tm_error('entries array required', 400);

    $eventInstanceId = (int)tm_requireParam($body, 'event_instance_id');

    // Verify event exists
    $check = $pdo->prepare("SELECT id FROM event_instances WHERE id = ?");
    $check->execute([$eventInstanceId]);
    if (!$check->fetch()) tm_error('Event instance not found', 404);

    $stmt = $pdo->prepare("
        INSERT INTO event_entries (uuid, event_instance_id, person_id, org_id, vehicle_id, category, class_index, competition_number, entry_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    $results = [];
    foreach ($entries as $i => $entry) {
        try {
            $uuid = tm_uuid();
            $stmt->execute([
                $uuid,
                $eventInstanceId,
                tm_optionalInt($entry, 'person_id'),
                tm_optionalInt($entry, 'org_id'),
                tm_optionalInt($entry, 'vehicle_id'),
                tm_optionalParam($entry, 'category'),
                tm_optionalParam($entry, 'class_index'),
                tm_optionalParam($entry, 'competition_number'),
                tm_optionalParam($entry, 'entry_status', 'registered'),
                tm_optionalParam($entry, 'notes'),
            ]);
            $results[] = ['row' => $i, 'status' => 'created', 'id' => (int)$pdo->lastInsertId(), 'uuid' => $uuid];
        } catch (PDOException $e) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => $e->getMessage()];
        }
    }

    $created = count(array_filter($results, fn($r) => $r['status'] === 'created'));
    tm_json(['results' => $results, 'created' => $created, 'total' => count($entries)], 201);
}

// ── Roster import handlers ──────────────────────────────────────────────

/**
 * Parse a roster text (CSV/TSV/pasted) and match identities.
 * Returns preview rows with match_status per identity field.
 *
 * Expected input: { event_instance_id, roster_text, delimiter? }
 * Each row: competition_number, driver_name, team_name, vehicle_desc, category, class_index
 */
function handleRosterPreview(PDO $pdo): void {
    $body = tm_readBody();
    $eventInstanceId = (int)tm_requireParam($body, 'event_instance_id');
    $rosterText = trim($body['roster_text'] ?? '');
    if (!$rosterText) tm_error('roster_text is required', 400);

    // Verify event exists
    $check = $pdo->prepare("SELECT id, name FROM event_instances WHERE id = ?");
    $check->execute([$eventInstanceId]);
    $event = $check->fetch(PDO::FETCH_ASSOC);
    if (!$event) tm_error('Event instance not found', 404);

    $delimiter = $body['delimiter'] ?? null;
    $lines = preg_split('/\r?\n/', $rosterText);
    $lines = array_filter($lines, fn($l) => trim($l) !== '');

    // Auto-detect delimiter if not specified
    if (!$delimiter) {
        $firstLine = reset($lines);
        if (str_contains($firstLine, '\t')) $delimiter = '\t';
        elseif (substr_count($firstLine, ',') >= 2) $delimiter = ',';
        else $delimiter = ',';
    }

    // Check if first line is a header
    $headerCandidates = ['number', 'driver', 'team', 'vehicle', 'category', 'class', 'comp', 'car', 'name', 'org'];
    $firstLine = strtolower(reset($lines));
    $isHeader = false;
    foreach ($headerCandidates as $h) {
        if (str_contains($firstLine, $h)) { $isHeader = true; break; }
    }
    if ($isHeader) array_shift($lines);

    // Preload all persons and orgs for matching
    $allPersons = $pdo->query("SELECT id, display_name, normalized_name FROM persons WHERE status = 'active'")->fetchAll(PDO::FETCH_ASSOC);
    $allOrgs = $pdo->query("SELECT id, name, short_name FROM organizations WHERE status = 'active'")->fetchAll(PDO::FETCH_ASSOC);

    // Check for existing entries in this event
    $existingStmt = $pdo->prepare("SELECT competition_number FROM event_entries WHERE event_instance_id = ?");
    $existingStmt->execute([$eventInstanceId]);
    $existingNumbers = array_column($existingStmt->fetchAll(PDO::FETCH_ASSOC), 'competition_number');
    $existingSet = array_flip(array_filter($existingNumbers));

    $preview = [];
    foreach (array_values($lines) as $rowIdx => $line) {
        $cols = str_getcsv($line, $delimiter);
        $cols = array_map('trim', $cols);

        // Map columns: number, driver, team, vehicle, category, class
        $compNum    = $cols[0] ?? '';
        $driverName = $cols[1] ?? '';
        $teamName   = $cols[2] ?? '';
        $vehicleDesc= $cols[3] ?? '';
        $category   = $cols[4] ?? '';
        $classIndex = $cols[5] ?? '';

        // Match person
        $personMatch = matchPersonLocal($driverName, $allPersons);
        // Match org
        $orgMatch = matchOrgLocal($teamName, $allOrgs);

        $isDuplicate = isset($existingSet[$compNum]) && $compNum !== '';

        $preview[] = [
            'row' => $rowIdx,
            'raw' => [
                'competition_number' => $compNum,
                'driver_name' => $driverName,
                'team_name' => $teamName,
                'vehicle_description' => $vehicleDesc,
                'category' => $category,
                'class_index' => $classIndex,
            ],
            'person_match' => $personMatch,
            'org_match' => $orgMatch,
            'is_duplicate' => $isDuplicate,
            'needs_review' => $personMatch['status'] !== 'exact' || $orgMatch['status'] !== 'exact',
        ];
    }

    $exactCount = count(array_filter($preview, fn($r) => !$r['needs_review'] && !$r['is_duplicate']));
    $reviewCount = count(array_filter($preview, fn($r) => $r['needs_review'] && !$r['is_duplicate']));
    $dupCount = count(array_filter($preview, fn($r) => $r['is_duplicate']));

    tm_json([
        'event' => $event,
        'rows' => $preview,
        'total' => count($preview),
        'exact_matches' => $exactCount,
        'needs_review' => $reviewCount,
        'duplicates' => $dupCount,
    ]);
}

function matchPersonLocal(string $name, array $allPersons): array {
    if (trim($name) === '') return ['status' => 'empty', 'person_id' => null, 'display_name' => null];

    $normalized = strtoupper(trim($name));

    // Exact match
    foreach ($allPersons as $p) {
        if ($p['normalized_name'] === $normalized) {
            return ['status' => 'exact', 'person_id' => (int)$p['id'], 'display_name' => $p['display_name']];
        }
    }

    // Fuzzy suggestions: any word overlap
    $words = preg_split('/\s+/', $normalized);
    $suggestions = [];
    foreach ($allPersons as $p) {
        foreach ($words as $w) {
            if (strlen($w) >= 2 && str_contains($p['normalized_name'], $w)) {
                $suggestions[] = ['id' => (int)$p['id'], 'display_name' => $p['display_name']];
                break;
            }
        }
        if (count($suggestions) >= 5) break;
    }

    if (count($suggestions) > 0) {
        return ['status' => 'suggestions', 'person_id' => null, 'display_name' => null, 'suggestions' => $suggestions];
    }

    return ['status' => 'none', 'person_id' => null, 'display_name' => null];
}

function matchOrgLocal(string $name, array $allOrgs): array {
    if (trim($name) === '') return ['status' => 'empty', 'org_id' => null, 'name' => null];

    $normalized = strtoupper(trim($name));

    foreach ($allOrgs as $o) {
        if (strtoupper($o['name']) === $normalized || ($o['short_name'] && strtoupper($o['short_name']) === $normalized)) {
            return ['status' => 'exact', 'org_id' => (int)$o['id'], 'name' => $o['name']];
        }
    }

    $suggestions = [];
    foreach ($allOrgs as $o) {
        if (str_contains(strtoupper($o['name']), $normalized) || str_contains($normalized, strtoupper($o['name']))) {
            $suggestions[] = ['id' => (int)$o['id'], 'name' => $o['name']];
        }
        if (count($suggestions) >= 5) break;
    }

    if (count($suggestions) > 0) {
        return ['status' => 'suggestions', 'org_id' => null, 'name' => null, 'suggestions' => $suggestions];
    }

    return ['status' => 'none', 'org_id' => null, 'name' => null];
}

/**
 * Commit roster rows. Accepts resolved rows with identity decisions.
 * Each row has: competition_number, driver_name, team_name, vehicle_description,
 *               category, class_index, person_id, org_id, vehicle_id,
 *               create_person, create_org (booleans to create provisionally)
 */
function handleRosterCommit(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $eventInstanceId = (int)tm_requireParam($body, 'event_instance_id');
    $rows = $body['rows'] ?? [];
    if (!is_array($rows) || empty($rows)) tm_error('rows array required', 400);

    $check = $pdo->prepare("SELECT id FROM event_instances WHERE id = ?");
    $check->execute([$eventInstanceId]);
    if (!$check->fetch()) tm_error('Event instance not found', 404);

    $insertEntry = $pdo->prepare("
        INSERT INTO event_entries (uuid, event_instance_id, person_id, org_id, vehicle_id, category, class_index, competition_number, entry_status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $insertPerson = $pdo->prepare("
        INSERT INTO persons (uuid, display_name, normalized_name, person_type, status, notes)
        VALUES (?, ?, ?, 'driver', 'provisional', 'Auto-created from roster import')
    ");
    $insertOrg = $pdo->prepare("
        INSERT INTO organizations (uuid, name, org_type, status, notes)
        VALUES (?, ?, 'team', 'provisional', 'Auto-created from roster import')
    ");

    $results = [];
    foreach ($rows as $i => $row) {
        try {
            $personId = isset($row['person_id']) ? (int)$row['person_id'] : null;
            $orgId = isset($row['org_id']) ? (int)$row['org_id'] : null;
            $vehicleId = isset($row['vehicle_id']) ? (int)$row['vehicle_id'] : null;

            // Create provisional person if requested
            if (!$personId && !empty($row['create_person']) && !empty($row['driver_name'])) {
                $puuid = tm_uuid();
                $dname = trim($row['driver_name']);
                $insertPerson->execute([$puuid, $dname, strtoupper($dname)]);
                $personId = (int)$pdo->lastInsertId();
            }

            // Create provisional org if requested
            if (!$orgId && !empty($row['create_org']) && !empty($row['team_name'])) {
                $ouuid = tm_uuid();
                $insertOrg->execute([$ouuid, trim($row['team_name'])]);
                $orgId = (int)$pdo->lastInsertId();
            }

            $uuid = tm_uuid();
            $insertEntry->execute([
                $uuid,
                $eventInstanceId,
                $personId ?: null,
                $orgId ?: null,
                $vehicleId ?: null,
                tm_optionalParam($row, 'category'),
                tm_optionalParam($row, 'class_index'),
                tm_optionalParam($row, 'competition_number'),
                'registered',
                tm_optionalParam($row, 'notes'),
            ]);
            $entryId = (int)$pdo->lastInsertId();
            $results[] = ['row' => $i, 'status' => 'created', 'entry_id' => $entryId, 'person_id' => $personId, 'org_id' => $orgId];
        } catch (PDOException $e) {
            $results[] = ['row' => $i, 'status' => 'error', 'error' => $e->getMessage()];
        }
    }

    $created = count(array_filter($results, fn($r) => $r['status'] === 'created'));
    tm_json(['results' => $results, 'created' => $created, 'total' => count($rows)], 201);
}

// ── Entry detail handler ────────────────────────────────────────────────

/**
 * Get full entry detail including linked identities, change history, and tech case count.
 */
function handleGetDetail(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $stmt = $pdo->prepare("
        SELECT ee.*,
               p.display_name AS person_name, p.normalized_name, p.person_type, p.status AS person_status,
               p.nhra_license_id, p.first_name AS person_first_name, p.last_name AS person_last_name,
               o.name AS org_name, o.short_name AS org_short_name, o.org_type, o.status AS org_status,
               va.description AS vehicle_description, va.chassis_serial, va.body_type,
               va.primary_category AS vehicle_category, va.status AS vehicle_status,
               ei.name AS event_name, ei.race_lookup, ei.start_date_local, ei.end_date_local
        FROM event_entries ee
        LEFT JOIN persons p ON ee.person_id = p.id
        LEFT JOIN organizations o ON ee.org_id = o.id
        LEFT JOIN vehicle_assets va ON ee.vehicle_id = va.id
        JOIN event_instances ei ON ee.event_instance_id = ei.id
        WHERE ee.id = ?
    ");
    $stmt->execute([$id]);
    $entry = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$entry) tm_error('Entry not found', 404);

    // Change history
    $histStmt = $pdo->prepare("
        SELECT * FROM event_entry_changes WHERE event_entry_id = ? ORDER BY changed_at DESC LIMIT 50
    ");
    $histStmt->execute([$id]);
    $changes = $histStmt->fetchAll(PDO::FETCH_ASSOC);

    // Tech case count
    $tcStmt = $pdo->prepare("SELECT COUNT(*) FROM tech_cases WHERE event_entry_id = ?");
    $tcStmt->execute([$id]);
    $techCaseCount = (int)$tcStmt->fetchColumn();

    // Linkage status
    $linkage = [
        'person_linked' => $entry['person_id'] !== null,
        'person_provisional' => $entry['person_status'] === 'provisional',
        'org_linked' => $entry['org_id'] !== null,
        'org_provisional' => $entry['org_status'] === 'provisional',
        'vehicle_linked' => $entry['vehicle_id'] !== null,
        'vehicle_provisional' => $entry['vehicle_status'] === 'provisional',
        'fully_linked' => $entry['person_id'] !== null && $entry['org_id'] !== null,
        'tech_case_count' => $techCaseCount,
        'scale_ready' => $entry['person_id'] !== null && $entry['entry_status'] !== 'withdrawn',
    ];

    tm_json(['entry' => $entry, 'changes' => $changes, 'linkage' => $linkage]);
}

/**
 * List distinct categories/classes in use for a given event.
 */
function handleListCategories(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventInstanceId) tm_error('Missing eventInstanceId', 400);

    $stmt = $pdo->prepare("
        SELECT DISTINCT category, class_index, COUNT(*) as entry_count
        FROM event_entries
        WHERE event_instance_id = ?
        GROUP BY category, class_index
        ORDER BY category, class_index
    ");
    $stmt->execute([$eventInstanceId]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['categories' => $rows, 'eventInstanceId' => $eventInstanceId]);
}

// ── Batch 4: Historical Entry Derivation ─────────────────────────────────

/**
 * Derive event entries from parity_runs for a given event.
 *
 * For each distinct (UPPER(driver_name), car_number, category, class_index)
 * found in parity_runs for this event's race_lookup, create an event_entry
 * if one does not already exist with the same source_driver_name.
 *
 * Also creates provisional persons for new driver names.
 * Idempotent: safe to run multiple times.
 *
 * Input: { event_instance_id } or { all: true } for all events with runs.
 */
function handleDeriveFromRuns(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $all = !empty($body['all']);
    $eventInstanceId = $all ? null : (int)($body['event_instance_id'] ?? 0);
    $dryRun = !empty($body['dry_run']);

    if (!$all && !$eventInstanceId) tm_error('event_instance_id or all:true required', 400);

    // Get events to process
    if ($all) {
        $evStmt = $pdo->query("
            SELECT ei.id, ei.race_lookup FROM event_instances ei
            WHERE ei.race_lookup IS NOT NULL AND ei.race_lookup != ''
            ORDER BY ei.start_date_local DESC
        ");
        $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $evStmt = $pdo->prepare("SELECT id, race_lookup FROM event_instances WHERE id = ?");
        $evStmt->execute([$eventInstanceId]);
        $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($events)) tm_error('Event instance not found', 404);
        if (empty($events[0]['race_lookup'])) tm_error('Event has no race_lookup — cannot derive entries from runs', 400);
    }

    $totalCreated = 0;
    $totalSkipped = 0;
    $totalPersonsCreated = 0;
    $eventResults = [];

    $insertEntry = $pdo->prepare("
        INSERT INTO event_entries
            (uuid, event_instance_id, person_id, category, class_index, competition_number,
             entry_status, derivation_source, source_driver_name)
        VALUES (?, ?, ?, ?, ?, ?, 'active', 'run_derived', ?)
    ");

    $insertPerson = $pdo->prepare("
        INSERT INTO persons (uuid, display_name, normalized_name, person_type, status, notes)
        VALUES (?, ?, ?, 'driver', 'active', 'Auto-created from run data derivation')
    ");

    foreach ($events as $ev) {
        $eid = (int)$ev['id'];
        $rl = $ev['race_lookup'];

        // Get distinct driver entries from parity_runs for this event
        $runStmt = $pdo->prepare("
            SELECT UPPER(TRIM(driver_name)) AS norm_name,
                   MAX(driver_name) AS display_name,
                   MAX(car_number) AS car_number,
                   MAX(category) AS category,
                   MAX(class_index) AS class_index,
                   COUNT(*) AS run_count
            FROM parity_runs
            WHERE race_lookup = ? AND driver_name IS NOT NULL AND TRIM(driver_name) != ''
            GROUP BY UPPER(TRIM(driver_name))
            ORDER BY norm_name
        ");
        $runStmt->execute([$rl]);
        $distinctDrivers = $runStmt->fetchAll(PDO::FETCH_ASSOC);

        // Load existing entries for dedup
        $existStmt = $pdo->prepare("
            SELECT source_driver_name, person_id, id FROM event_entries
            WHERE event_instance_id = ? AND source_driver_name IS NOT NULL
        ");
        $existStmt->execute([$eid]);
        $existingByName = [];
        foreach ($existStmt->fetchAll(PDO::FETCH_ASSOC) as $ex) {
            $existingByName[strtoupper(trim($ex['source_driver_name']))] = $ex;
        }

        // Also check by person normalized_name (for manually/roster-created entries)
        $existPersonStmt = $pdo->prepare("
            SELECT ee.id, p.normalized_name FROM event_entries ee
            JOIN persons p ON ee.person_id = p.id
            WHERE ee.event_instance_id = ? AND ee.source_driver_name IS NULL
        ");
        $existPersonStmt->execute([$eid]);
        foreach ($existPersonStmt->fetchAll(PDO::FETCH_ASSOC) as $ep) {
            if ($ep['normalized_name']) {
                $existingByName[$ep['normalized_name']] = $ep;
            }
        }

        // Preload all persons for matching
        $allPersons = $pdo->query("SELECT id, normalized_name FROM persons WHERE status IN ('active','inactive')")->fetchAll(PDO::FETCH_ASSOC);
        $personsByNorm = [];
        foreach ($allPersons as $p) {
            $personsByNorm[$p['normalized_name']] = (int)$p['id'];
        }

        $created = 0;
        $skipped = 0;
        $personsCreated = 0;

        foreach ($distinctDrivers as $d) {
            $normName = $d['norm_name'];

            // Skip if entry already exists for this driver at this event
            if (isset($existingByName[$normName])) {
                $skipped++;
                continue;
            }

            if ($dryRun) {
                $created++;
                continue;
            }

            // Find or create person
            $personId = $personsByNorm[$normName] ?? null;
            if ($personId === null) {
                $puuid = tm_uuid();
                $displayName = $d['display_name'];
                $insertPerson->execute([$puuid, $displayName, $normName]);
                $personId = (int)$pdo->lastInsertId();
                $personsByNorm[$normName] = $personId;
                $personsCreated++;
            }

            // Create the event entry
            $euuid = tm_uuid();
            $insertEntry->execute([
                $euuid,
                $eid,
                $personId,
                $d['category'],
                $d['class_index'],
                $d['car_number'],
                $normName,
            ]);
            $entryId = (int)$pdo->lastInsertId();

            // Track for dedup within same batch
            $existingByName[$normName] = ['id' => $entryId, 'source_driver_name' => $normName];
            $created++;
        }

        $totalCreated += $created;
        $totalSkipped += $skipped;
        $totalPersonsCreated += $personsCreated;

        if ($created > 0 || $skipped > 0) {
            $eventResults[] = [
                'event_instance_id' => $eid,
                'race_lookup' => $rl,
                'distinct_drivers' => count($distinctDrivers),
                'entries_created' => $created,
                'entries_skipped' => $skipped,
                'persons_created' => $personsCreated,
            ];
        }
    }

    tm_json([
        'dry_run' => $dryRun,
        'events_processed' => count($events),
        'total_entries_created' => $totalCreated,
        'total_entries_skipped' => $totalSkipped,
        'total_persons_created' => $totalPersonsCreated,
        'event_results' => $eventResults,
    ]);
}

/**
 * Backfill parity_runs.event_entry_id from derived event entries.
 *
 * For each event with run-derived entries, match runs to entries by:
 *   UPPER(TRIM(parity_runs.driver_name)) = event_entries.source_driver_name
 *   AND parity_runs.race_lookup = event_instances.race_lookup
 *
 * Only links where there is exactly ONE matching entry (high confidence).
 * Skips runs that already have event_entry_id set.
 * Idempotent: safe to run multiple times.
 *
 * Input: { event_instance_id } or { all: true }
 */
function handleBackfillRunLinks(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $all = !empty($body['all']);
    $eventInstanceId = $all ? null : (int)($body['event_instance_id'] ?? 0);
    $dryRun = !empty($body['dry_run']);

    if (!$all && !$eventInstanceId) tm_error('event_instance_id or all:true required', 400);

    // Get events to process
    if ($all) {
        $evStmt = $pdo->query("
            SELECT ei.id, ei.race_lookup FROM event_instances ei
            WHERE ei.race_lookup IS NOT NULL AND ei.race_lookup != ''
            ORDER BY ei.start_date_local DESC
        ");
        $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $evStmt = $pdo->prepare("SELECT id, race_lookup FROM event_instances WHERE id = ?");
        $evStmt->execute([$eventInstanceId]);
        $events = $evStmt->fetchAll(PDO::FETCH_ASSOC);
        if (empty($events)) tm_error('Event instance not found', 404);
    }

    $totalLinked = 0;
    $totalSkipped = 0;
    $totalAmbiguous = 0;
    $eventResults = [];

    foreach ($events as $ev) {
        $eid = (int)$ev['id'];
        $rl = $ev['race_lookup'];
        if (!$rl) continue;

        // Load entries for this event, indexed by source_driver_name
        $entryStmt = $pdo->prepare("
            SELECT ee.id, ee.source_driver_name, p.normalized_name
            FROM event_entries ee
            LEFT JOIN persons p ON ee.person_id = p.id
            WHERE ee.event_instance_id = ?
        ");
        $entryStmt->execute([$eid]);
        $entriesByNorm = [];
        foreach ($entryStmt->fetchAll(PDO::FETCH_ASSOC) as $entry) {
            $key = $entry['source_driver_name'] ?? $entry['normalized_name'] ?? null;
            if ($key) {
                $normKey = strtoupper(trim($key));
                if (!isset($entriesByNorm[$normKey])) {
                    $entriesByNorm[$normKey] = [];
                }
                $entriesByNorm[$normKey][] = (int)$entry['id'];
            }
        }

        // Find unlinked runs for this event
        $runStmt = $pdo->prepare("
            SELECT id, driver_name FROM parity_runs
            WHERE race_lookup = ? AND event_entry_id IS NULL
              AND driver_name IS NOT NULL AND TRIM(driver_name) != ''
        ");
        $runStmt->execute([$rl]);
        $runs = $runStmt->fetchAll(PDO::FETCH_ASSOC);

        $linked = 0;
        $skipped = 0;
        $ambiguous = 0;

        $updateStmt = $pdo->prepare("UPDATE parity_runs SET event_entry_id = ? WHERE id = ?");

        foreach ($runs as $run) {
            $normDriver = strtoupper(trim($run['driver_name']));
            $candidates = $entriesByNorm[$normDriver] ?? [];

            if (count($candidates) === 1) {
                // High confidence: exactly one entry matches
                if (!$dryRun) {
                    $updateStmt->execute([$candidates[0], (int)$run['id']]);
                }
                $linked++;
            } elseif (count($candidates) > 1) {
                // Ambiguous: multiple entries for same driver name — skip
                $ambiguous++;
            } else {
                // No matching entry
                $skipped++;
            }
        }

        $totalLinked += $linked;
        $totalSkipped += $skipped;
        $totalAmbiguous += $ambiguous;

        if ($linked > 0 || $ambiguous > 0) {
            $eventResults[] = [
                'event_instance_id' => $eid,
                'race_lookup' => $rl,
                'total_unlinked_runs' => count($runs),
                'runs_linked' => $linked,
                'runs_skipped_no_entry' => $skipped,
                'runs_ambiguous' => $ambiguous,
            ];
        }
    }

    tm_json([
        'dry_run' => $dryRun,
        'events_processed' => count($events),
        'total_runs_linked' => $totalLinked,
        'total_runs_skipped' => $totalSkipped,
        'total_runs_ambiguous' => $totalAmbiguous,
        'event_results' => $eventResults,
    ]);
}

/**
 * Get derivation/linkage status for an event or all events.
 */
function handleDerivationStatus(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);

    if ($eventInstanceId) {
        // Single event status
        $ev = $pdo->prepare("SELECT id, race_lookup, name FROM event_instances WHERE id = ?");
        $ev->execute([$eventInstanceId]);
        $event = $ev->fetch(PDO::FETCH_ASSOC);
        if (!$event) tm_error('Event not found', 404);

        $rl = $event['race_lookup'];

        // Count runs
        $totalRuns = 0;
        $linkedRuns = 0;
        $unlinkedRuns = 0;
        if ($rl) {
            $r = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ?");
            $r->execute([$rl]);
            $totalRuns = (int)$r->fetchColumn();

            $r2 = $pdo->prepare("SELECT COUNT(*) FROM parity_runs WHERE race_lookup = ? AND event_entry_id IS NOT NULL");
            $r2->execute([$rl]);
            $linkedRuns = (int)$r2->fetchColumn();
            $unlinkedRuns = $totalRuns - $linkedRuns;
        }

        // Count entries by source
        $eStmt = $pdo->prepare("
            SELECT derivation_source, COUNT(*) as cnt
            FROM event_entries WHERE event_instance_id = ?
            GROUP BY derivation_source
        ");
        $eStmt->execute([$eventInstanceId]);
        $entrySources = [];
        $totalEntries = 0;
        foreach ($eStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $entrySources[$row['derivation_source'] ?? 'unknown'] = (int)$row['cnt'];
            $totalEntries += (int)$row['cnt'];
        }

        // Entries missing person link
        $noPersonStmt = $pdo->prepare("SELECT COUNT(*) FROM event_entries WHERE event_instance_id = ? AND person_id IS NULL");
        $noPersonStmt->execute([$eventInstanceId]);
        $entriesNoPerson = (int)$noPersonStmt->fetchColumn();

        tm_json([
            'event_instance_id' => $eventInstanceId,
            'event_name' => $event['name'],
            'race_lookup' => $rl,
            'total_runs' => $totalRuns,
            'linked_runs' => $linkedRuns,
            'unlinked_runs' => $unlinkedRuns,
            'link_rate' => $totalRuns > 0 ? round($linkedRuns / $totalRuns * 100, 1) : null,
            'total_entries' => $totalEntries,
            'entries_by_source' => $entrySources,
            'entries_no_person' => $entriesNoPerson,
        ]);
    } else {
        // Summary across all events with runs
        $stmt = $pdo->query("
            SELECT ei.id, ei.name, ei.race_lookup, ei.start_date_local,
                   (SELECT COUNT(*) FROM parity_runs pr WHERE pr.race_lookup = ei.race_lookup) AS total_runs,
                   (SELECT COUNT(*) FROM parity_runs pr WHERE pr.race_lookup = ei.race_lookup AND pr.event_entry_id IS NOT NULL) AS linked_runs,
                   (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_instance_id = ei.id) AS total_entries,
                   (SELECT COUNT(*) FROM event_entries ee WHERE ee.event_instance_id = ei.id AND ee.derivation_source = 'run_derived') AS derived_entries
            FROM event_instances ei
            WHERE ei.race_lookup IS NOT NULL AND ei.race_lookup != ''
            ORDER BY ei.start_date_local DESC
            LIMIT 50
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add computed fields
        foreach ($rows as &$row) {
            $total = (int)$row['total_runs'];
            $linked = (int)$row['linked_runs'];
            $row['unlinked_runs'] = $total - $linked;
            $row['link_rate'] = $total > 0 ? round($linked / $total * 100, 1) : null;
        }
        unset($row);

        $globalTotalRuns = array_sum(array_column($rows, 'total_runs'));
        $globalLinkedRuns = array_sum(array_column($rows, 'linked_runs'));

        tm_json([
            'events' => $rows,
            'count' => count($rows),
            'global_total_runs' => $globalTotalRuns,
            'global_linked_runs' => $globalLinkedRuns,
            'global_link_rate' => $globalTotalRuns > 0 ? round($globalLinkedRuns / $globalTotalRuns * 100, 1) : null,
        ]);
    }
}

// ── Batch 4: Link Review Workflow ────────────────────────────────────────

/**
 * Review problematic linkage items for an event.
 *
 * Modes:
 *   ?mode=unlinked_runs — runs without event_entry_id
 *   ?mode=weak_entries  — entries with no person or provisional person
 *   ?mode=unlinked_scale — scale records with link_method = 'unlinked'
 *   ?mode=ambiguous_runs — runs where driver_name matches multiple entries
 *
 * All require eventInstanceId.
 */
function handleLinkReview(PDO $pdo): void {
    $eventInstanceId = (int)($_GET['eventInstanceId'] ?? 0);
    if (!$eventInstanceId) tm_error('Missing eventInstanceId', 400);

    $mode = $_GET['mode'] ?? 'unlinked_runs';
    $limit = min((int)($_GET['limit'] ?? 100), 500);

    // Get event race_lookup
    $evStmt = $pdo->prepare("SELECT id, race_lookup FROM event_instances WHERE id = ?");
    $evStmt->execute([$eventInstanceId]);
    $event = $evStmt->fetch(PDO::FETCH_ASSOC);
    if (!$event) tm_error('Event not found', 404);
    $rl = $event['race_lookup'];

    switch ($mode) {
        case 'unlinked_runs':
            if (!$rl) { tm_json(['items' => [], 'count' => 0, 'mode' => $mode]); return; }
            $stmt = $pdo->prepare("
                SELECT r.id, r.driver_name, r.car_number, r.category, r.class_index,
                       r.round, r.lane, r.run_timestamp_utc, r.ft1320, r.mph1320
                FROM parity_runs r
                WHERE r.race_lookup = ? AND r.event_entry_id IS NULL
                  AND r.driver_name IS NOT NULL AND TRIM(r.driver_name) != ''
                ORDER BY r.driver_name, r.run_timestamp_utc
                LIMIT ?
            ");
            $stmt->execute([$rl, $limit]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Group by driver and suggest candidate entries
            $entryStmt = $pdo->prepare("
                SELECT ee.id, ee.source_driver_name, ee.competition_number, ee.class_index, ee.category,
                       p.display_name AS person_name, p.normalized_name
                FROM event_entries ee
                LEFT JOIN persons p ON ee.person_id = p.id
                WHERE ee.event_instance_id = ?
            ");
            $entryStmt->execute([$eventInstanceId]);
            $allEntries = $entryStmt->fetchAll(PDO::FETCH_ASSOC);

            // Build entry lookup by normalized driver name
            $entryMap = [];
            foreach ($allEntries as $e) {
                $key = strtoupper(trim($e['source_driver_name'] ?? $e['normalized_name'] ?? ''));
                if ($key) $entryMap[$key][] = $e;
            }

            // Annotate each unlinked run with candidate entries
            foreach ($items as &$item) {
                $normDriver = strtoupper(trim($item['driver_name']));
                $item['candidate_entries'] = $entryMap[$normDriver] ?? [];
                $item['reason'] = empty($item['candidate_entries']) ? 'no_matching_entry' : 'not_yet_linked';
            }
            unset($item);

            tm_json(['items' => $items, 'count' => count($items), 'mode' => $mode, 'eventInstanceId' => $eventInstanceId]);
            break;

        case 'weak_entries':
            $stmt = $pdo->prepare("
                SELECT ee.id, ee.source_driver_name, ee.competition_number, ee.category, ee.class_index,
                       ee.derivation_source, ee.entry_status,
                       p.display_name AS person_name, p.status AS person_status, p.id AS person_id,
                       (SELECT COUNT(*) FROM parity_runs pr WHERE pr.event_entry_id = ee.id) AS linked_run_count
                FROM event_entries ee
                LEFT JOIN persons p ON ee.person_id = p.id
                WHERE ee.event_instance_id = ?
                  AND (ee.person_id IS NULL OR p.status = 'provisional')
                ORDER BY ee.source_driver_name
                LIMIT ?
            ");
            $stmt->execute([$eventInstanceId, $limit]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                if ($item['person_id'] === null) {
                    $item['reason'] = 'no_person_linked';
                } else {
                    $item['reason'] = 'provisional_person';
                }
            }
            unset($item);

            tm_json(['items' => $items, 'count' => count($items), 'mode' => $mode, 'eventInstanceId' => $eventInstanceId]);
            break;

        case 'unlinked_scale':
            $stmt = $pdo->prepare("
                SELECT sr.id, sr.measurement_mode, sr.measured_total_weight, sr.link_method,
                       sr.link_confidence, sr.measured_at, sr.notes,
                       ee.competition_number, ee.class_index, ee.category,
                       p.display_name AS person_name
                FROM scale_records sr
                JOIN event_entries ee ON sr.event_entry_id = ee.id
                LEFT JOIN persons p ON ee.person_id = p.id
                WHERE ee.event_instance_id = ?
                  AND (sr.link_method = 'unlinked' OR sr.link_method IS NULL)
                ORDER BY sr.measured_at DESC
                LIMIT ?
            ");
            $stmt->execute([$eventInstanceId, $limit]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($items as &$item) {
                $item['reason'] = 'no_run_linked';
            }
            unset($item);

            tm_json(['items' => $items, 'count' => count($items), 'mode' => $mode, 'eventInstanceId' => $eventInstanceId]);
            break;

        case 'ambiguous_runs':
            if (!$rl) { tm_json(['items' => [], 'count' => 0, 'mode' => $mode]); return; }
            // Find driver names that match multiple entries
            $entryStmt = $pdo->prepare("
                SELECT UPPER(TRIM(COALESCE(ee.source_driver_name, p.normalized_name))) AS norm_name,
                       COUNT(*) AS entry_count
                FROM event_entries ee
                LEFT JOIN persons p ON ee.person_id = p.id
                WHERE ee.event_instance_id = ?
                  AND COALESCE(ee.source_driver_name, p.normalized_name) IS NOT NULL
                GROUP BY norm_name
                HAVING entry_count > 1
            ");
            $entryStmt->execute([$eventInstanceId]);
            $ambiguousNames = $entryStmt->fetchAll(PDO::FETCH_ASSOC);

            $items = [];
            foreach ($ambiguousNames as $an) {
                $normName = $an['norm_name'];
                // Get runs for this driver
                $rStmt = $pdo->prepare("
                    SELECT id, driver_name, car_number, round, lane, run_timestamp_utc
                    FROM parity_runs
                    WHERE race_lookup = ? AND UPPER(TRIM(driver_name)) = ? AND event_entry_id IS NULL
                    LIMIT 10
                ");
                $rStmt->execute([$rl, $normName]);
                $runs = $rStmt->fetchAll(PDO::FETCH_ASSOC);

                // Get candidate entries
                $ceStmt = $pdo->prepare("
                    SELECT ee.id, ee.source_driver_name, ee.competition_number, ee.class_index
                    FROM event_entries ee
                    LEFT JOIN persons p ON ee.person_id = p.id
                    WHERE ee.event_instance_id = ?
                      AND UPPER(TRIM(COALESCE(ee.source_driver_name, p.normalized_name))) = ?
                ");
                $ceStmt->execute([$eventInstanceId, $normName]);
                $candidates = $ceStmt->fetchAll(PDO::FETCH_ASSOC);

                if (!empty($runs)) {
                    $items[] = [
                        'driver_name' => $normName,
                        'unlinked_run_count' => count($runs),
                        'candidate_entry_count' => (int)$an['entry_count'],
                        'sample_runs' => $runs,
                        'candidate_entries' => $candidates,
                        'reason' => 'multiple_entries_for_driver',
                    ];
                }
            }

            tm_json(['items' => $items, 'count' => count($items), 'mode' => $mode, 'eventInstanceId' => $eventInstanceId]);
            break;

        default:
            tm_error("Unknown review mode: $mode", 400);
    }
}

/**
 * Manually link a parity_run to an event_entry.
 * Input: { run_id, event_entry_id } or { run_id, event_entry_id: null } to unlink.
 */
function handleManualLink(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $runId = (int)tm_requireParam($body, 'run_id');
    $entryId = isset($body['event_entry_id']) && $body['event_entry_id'] !== null ? (int)$body['event_entry_id'] : null;

    // Verify run exists
    $rCheck = $pdo->prepare("SELECT id FROM parity_runs WHERE id = ?");
    $rCheck->execute([$runId]);
    if (!$rCheck->fetch()) tm_error('Run not found', 404);

    // Verify entry exists if linking
    if ($entryId !== null) {
        $eCheck = $pdo->prepare("SELECT id FROM event_entries WHERE id = ?");
        $eCheck->execute([$entryId]);
        if (!$eCheck->fetch()) tm_error('Event entry not found', 404);
    }

    $pdo->prepare("UPDATE parity_runs SET event_entry_id = ? WHERE id = ?")->execute([$entryId, $runId]);

    tm_json(['updated' => true, 'run_id' => $runId, 'event_entry_id' => $entryId]);
}

/**
 * Mark an entry as reviewed (update entry_status or notes).
 * Input: { id, entry_status?, notes? }
 */
function handleMarkReviewed(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $check = $pdo->prepare("SELECT id FROM event_entries WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) tm_error('Entry not found', 404);

    $sets = [];
    $params = [];

    if (isset($body['entry_status'])) {
        $allowed = ['registered', 'active', 'withdrawn', 'disqualified'];
        if (!in_array($body['entry_status'], $allowed)) tm_error('Invalid entry_status', 400);
        $sets[] = 'entry_status = ?';
        $params[] = $body['entry_status'];
    }

    if (isset($body['notes'])) {
        $sets[] = 'notes = ?';
        $params[] = $body['notes'];
    }

    if (empty($sets)) tm_error('No fields to update', 400);

    $params[] = $id;
    $pdo->prepare("UPDATE event_entries SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $id]);
}
