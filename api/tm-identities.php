<?php
/**
 * Tech Master — Identity CRUD API
 *
 * Endpoints for persons, organizations, vehicle_assets, components.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST/PUT).
 *
 * Actions:
 *   GET  ?action=list&type=person|organization|vehicle|component  — list with optional search
 *   GET  ?action=get&type=...&id=N                                — get by ID
 *   GET  ?action=search&type=person&q=...                         — search by name
 *   POST ?action=create&type=...                                  — create
 *   POST ?action=update&type=...                                  — update
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
$type   = $_GET['type'] ?? '';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// ── Routing ─────────────────────────────────────────────────────────────

switch ($action) {
    case 'list':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleList($pdo, $type);
        break;
    case 'get':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGet($pdo, $type);
        break;
    case 'search':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleSearch($pdo, $type);
        break;
    case 'create':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreate($pdo, $type, $userId);
        break;
    case 'update':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdate($pdo, $type, $userId);
        break;
    case 'matchPerson':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleMatchPerson($pdo);
        break;
    case 'matchOrg':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleMatchOrg($pdo);
        break;
    case 'matchVehicle':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleMatchVehicle($pdo);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Table mapping ───────────────────────────────────────────────────────

function resolveTable(string $type): string {
    $map = [
        'person'       => 'persons',
        'organization' => 'organizations',
        'vehicle'      => 'vehicle_assets',
        'component'    => 'components',
    ];
    if (!isset($map[$type])) tm_error("Unknown type: $type", 400);
    return $map[$type];
}

// ── Handlers ────────────────────────────────────────────────────────────

function handleList(PDO $pdo, string $type): void {
    $table = resolveTable($type);
    $limit = min((int)($_GET['limit'] ?? 100), 500);
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    $status = $_GET['status'] ?? null;

    $where = [];
    $params = [];
    if ($status) {
        $where[] = 'status = ?';
        $params[] = $status;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $stmt = $pdo->prepare("SELECT * FROM `$table` $whereClause ORDER BY id DESC LIMIT ? OFFSET ?");
    foreach ($params as $i => $p) $stmt->bindValue($i + 1, $p);
    $stmt->bindValue(count($params) + 1, $limit, PDO::PARAM_INT);
    $stmt->bindValue(count($params) + 2, $offset, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Count
    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` $whereClause");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    tm_json(['items' => $rows, 'total' => $total, 'type' => $type]);
}

function handleGet(PDO $pdo, string $type): void {
    $table = resolveTable($type);
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id parameter', 400);

    $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Not found', 404);

    tm_json(['item' => $row, 'type' => $type]);
}

function handleSearch(PDO $pdo, string $type): void {
    $table = resolveTable($type);
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) tm_error('Search query must be at least 2 characters', 400);

    $limit = min((int)($_GET['limit'] ?? 20), 100);

    // Determine search column based on type
    $searchCol = match($type) {
        'person'       => 'normalized_name',
        'organization' => 'name',
        'vehicle'      => 'description',
        'component'    => 'description',
        default        => 'id',
    };

    $nameCol = match($type) {
        'person'       => 'display_name',
        'organization' => 'name',
        default        => null,
    };

    // Search normalized + display name for persons
    if ($type === 'person') {
        $stmt = $pdo->prepare("
            SELECT * FROM persons
            WHERE normalized_name LIKE ? OR display_name LIKE ?
            ORDER BY display_name LIMIT ?
        ");
        $pattern = '%' . strtoupper($q) . '%';
        $stmt->execute([$pattern, '%' . $q . '%', $limit]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM `$table` WHERE `$searchCol` LIKE ? ORDER BY id DESC LIMIT ?");
        $stmt->bindValue(1, '%' . $q . '%');
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
    }

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    tm_json(['items' => $rows, 'query' => $q, 'type' => $type]);
}

function handleCreate(PDO $pdo, string $type, int $userId): void {
    $body = tm_readBody();
    $uuid = tm_uuid();

    switch ($type) {
        case 'person':
            $displayName = tm_requireParam($body, 'display_name');
            $normalizedName = strtoupper(trim($displayName));
            $stmt = $pdo->prepare("
                INSERT INTO persons (uuid, display_name, normalized_name, first_name, last_name, nhra_license_id, person_type, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid,
                $displayName,
                $normalizedName,
                tm_optionalParam($body, 'first_name'),
                tm_optionalParam($body, 'last_name'),
                tm_optionalParam($body, 'nhra_license_id'),
                tm_optionalParam($body, 'person_type', 'driver'),
                tm_optionalParam($body, 'status', 'active'),
                tm_optionalParam($body, 'notes'),
            ]);
            break;

        case 'organization':
            $name = tm_requireParam($body, 'name');
            $stmt = $pdo->prepare("
                INSERT INTO organizations (uuid, name, short_name, nhra_entrant_id, org_type, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid,
                $name,
                tm_optionalParam($body, 'short_name'),
                tm_optionalParam($body, 'nhra_entrant_id'),
                tm_optionalParam($body, 'org_type', 'team'),
                tm_optionalParam($body, 'status', 'active'),
                tm_optionalParam($body, 'notes'),
            ]);
            break;

        case 'vehicle':
            $stmt = $pdo->prepare("
                INSERT INTO vehicle_assets (uuid, chassis_serial, body_type, description, current_org_id, primary_category, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid,
                tm_optionalParam($body, 'chassis_serial'),
                tm_optionalParam($body, 'body_type'),
                tm_optionalParam($body, 'description'),
                tm_optionalInt($body, 'current_org_id'),
                tm_optionalParam($body, 'primary_category'),
                tm_optionalParam($body, 'status', 'active'),
                tm_optionalParam($body, 'notes'),
            ]);
            break;

        case 'component':
            $componentType = tm_requireParam($body, 'component_type');
            $stmt = $pdo->prepare("
                INSERT INTO components (uuid, serial_number, component_type, manufacturer, description, current_vehicle_id, status, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $uuid,
                tm_optionalParam($body, 'serial_number'),
                $componentType,
                tm_optionalParam($body, 'manufacturer'),
                tm_optionalParam($body, 'description'),
                tm_optionalInt($body, 'current_vehicle_id'),
                tm_optionalParam($body, 'status', 'active'),
                tm_optionalParam($body, 'notes'),
            ]);
            break;

        default:
            tm_error("Unknown type: $type", 400);
    }

    $id = (int)$pdo->lastInsertId();
    tm_json(['id' => $id, 'uuid' => $uuid, 'type' => $type], 201);
}

function handleUpdate(PDO $pdo, string $type, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $table = resolveTable($type);

    // Verify exists
    $check = $pdo->prepare("SELECT id FROM `$table` WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) tm_error('Not found', 404);

    // Build SET clause from allowed fields per type
    $allowed = match($type) {
        'person'       => ['display_name', 'first_name', 'last_name', 'nhra_license_id', 'person_type', 'status', 'notes'],
        'organization' => ['name', 'short_name', 'nhra_entrant_id', 'org_type', 'status', 'notes'],
        'vehicle'      => ['chassis_serial', 'body_type', 'description', 'current_org_id', 'primary_category', 'status', 'notes'],
        'component'    => ['serial_number', 'component_type', 'manufacturer', 'description', 'current_vehicle_id', 'status', 'notes'],
        default        => [],
    };

    $sets = [];
    $params = [];
    foreach ($allowed as $col) {
        if (array_key_exists($col, $body)) {
            $sets[] = "`$col` = ?";
            $params[] = $body[$col];
        }
    }

    // For persons, auto-update normalized_name when display_name changes
    if ($type === 'person' && array_key_exists('display_name', $body)) {
        $sets[] = "`normalized_name` = ?";
        $params[] = strtoupper(trim($body['display_name']));
    }

    if (empty($sets)) tm_error('No updatable fields provided', 400);

    $params[] = $id;
    $sql = "UPDATE `$table` SET " . implode(', ', $sets) . " WHERE id = ?";
    $pdo->prepare($sql)->execute($params);

    tm_json(['updated' => true, 'id' => $id, 'type' => $type]);
}

// ── Identity matching handlers ─────────────────────────────────────────

/**
 * Match a person by name.
 * Returns: exact match (if any), fuzzy suggestions, and match_status.
 * match_status: 'exact' | 'suggestions' | 'none'
 */
function handleMatchPerson(PDO $pdo): void {
    $name = trim($_GET['name'] ?? '');
    if (strlen($name) < 2) tm_error('name must be at least 2 characters', 400);

    $normalized = strtoupper(trim($name));
    $limit = min((int)($_GET['limit'] ?? 10), 50);

    // 1. Exact normalized match
    $exact = $pdo->prepare("SELECT * FROM persons WHERE normalized_name = ? LIMIT 1");
    $exact->execute([$normalized]);
    $exactRow = $exact->fetch(PDO::FETCH_ASSOC);

    if ($exactRow) {
        tm_json([
            'match_status' => 'exact',
            'exact' => $exactRow,
            'suggestions' => [],
        ]);
    }

    // 2. Fuzzy suggestions via LIKE on normalized_name and display_name
    $suggestions = [];
    $words = preg_split('/\s+/', $normalized);
    if (count($words) > 0) {
        // Try LIKE with each word
        $likeConditions = [];
        $likeParams = [];
        foreach ($words as $w) {
            if (strlen($w) >= 2) {
                $likeConditions[] = 'normalized_name LIKE ?';
                $likeParams[] = '%' . $w . '%';
            }
        }
        if (!empty($likeConditions)) {
            $sql = "SELECT *, "
                . "CASE WHEN normalized_name = ? THEN 100 "
                . "WHEN normalized_name LIKE ? THEN 80 "
                . "ELSE 50 END AS match_score "
                . "FROM persons WHERE " . implode(' OR ', $likeConditions)
                . " ORDER BY match_score DESC, display_name LIMIT ?";
            $stmt = $pdo->prepare($sql);
            $idx = 1;
            $stmt->bindValue($idx++, $normalized);
            $stmt->bindValue($idx++, $normalized . '%');
            foreach ($likeParams as $p) $stmt->bindValue($idx++, $p);
            $stmt->bindValue($idx, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
    }

    tm_json([
        'match_status' => count($suggestions) > 0 ? 'suggestions' : 'none',
        'exact' => null,
        'suggestions' => $suggestions,
        'query' => $name,
    ]);
}

/**
 * Match an organization by name.
 */
function handleMatchOrg(PDO $pdo): void {
    $name = trim($_GET['name'] ?? '');
    if (strlen($name) < 2) tm_error('name must be at least 2 characters', 400);

    $normalized = strtoupper(trim($name));
    $limit = min((int)($_GET['limit'] ?? 10), 50);

    // Exact match on name (case-insensitive via UPPER)
    $exact = $pdo->prepare("SELECT * FROM organizations WHERE UPPER(name) = ? LIMIT 1");
    $exact->execute([$normalized]);
    $exactRow = $exact->fetch(PDO::FETCH_ASSOC);

    if ($exactRow) {
        tm_json(['match_status' => 'exact', 'exact' => $exactRow, 'suggestions' => []]);
    }

    // Fuzzy via LIKE
    $stmt = $pdo->prepare("SELECT * FROM organizations WHERE UPPER(name) LIKE ? OR UPPER(short_name) LIKE ? ORDER BY name LIMIT ?");
    $pattern = '%' . $normalized . '%';
    $stmt->execute([$pattern, $pattern, $limit]);
    $suggestions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json([
        'match_status' => count($suggestions) > 0 ? 'suggestions' : 'none',
        'exact' => null,
        'suggestions' => $suggestions,
        'query' => $name,
    ]);
}

/**
 * Match a vehicle by description or chassis serial.
 */
function handleMatchVehicle(PDO $pdo): void {
    $q = trim($_GET['q'] ?? '');
    if (strlen($q) < 2) tm_error('q must be at least 2 characters', 400);

    $limit = min((int)($_GET['limit'] ?? 10), 50);

    $stmt = $pdo->prepare("
        SELECT * FROM vehicle_assets
        WHERE UPPER(description) LIKE ? OR UPPER(chassis_serial) LIKE ?
        ORDER BY description LIMIT ?
    ");
    $pattern = '%' . strtoupper($q) . '%';
    $stmt->execute([$pattern, $pattern, $limit]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json([
        'match_status' => count($rows) > 0 ? 'suggestions' : 'none',
        'suggestions' => $rows,
        'query' => $q,
    ]);
}
