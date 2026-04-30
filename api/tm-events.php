<?php
/**
 * Tech Master — Events API
 *
 * Endpoints for event_instances, seasons, event_types.
 * All require nhra.tech.read (GET) or nhra.tech.admin (POST).
 *
 * Actions:
 *   GET  ?action=listSeasons                             — list all seasons
 *   GET  ?action=listEventTypes                          — list event types
 *   GET  ?action=listEvents&seasonId=N                   — list event instances
 *   GET  ?action=getEvent&id=N                           — get event instance by ID
 *   POST ?action=createEvent                             — create event instance
 *   POST ?action=updateEvent                             — update event instance
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
    case 'listSeasons':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListSeasons($pdo);
        break;
    case 'listEventTypes':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListEventTypes($pdo);
        break;
    case 'listEvents':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleListEvents($pdo);
        break;
    case 'getEvent':
        if ($method !== 'GET') tm_error('Method not allowed', 405);
        tm_requireRead($pdo, $auth);
        handleGetEvent($pdo);
        break;
    case 'createEvent':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleCreateEvent($pdo, $userId);
        break;
    case 'updateEvent':
        if ($method !== 'POST') tm_error('Method not allowed', 405);
        $userId = tm_requireAdmin($pdo, $auth);
        handleUpdateEvent($pdo, $userId);
        break;
    default:
        tm_error("Unknown action: $action", 400);
}

// ── Handlers ────────────────────────────────────────────────────────────

function handleListSeasons(PDO $pdo): void {
    $rows = $pdo->query("SELECT * FROM seasons ORDER BY year DESC")->fetchAll(PDO::FETCH_ASSOC);
    tm_json(['seasons' => $rows]);
}

function handleListEventTypes(PDO $pdo): void {
    $rows = $pdo->query("SELECT * FROM event_types WHERE is_active = 1 ORDER BY sort_order")->fetchAll(PDO::FETCH_ASSOC);
    tm_json(['eventTypes' => $rows]);
}

function handleListEvents(PDO $pdo): void {
    $seasonId = $_GET['seasonId'] ?? null;
    $seasonYear = $_GET['seasonYear'] ?? null;
    $limit = min((int)($_GET['limit'] ?? 100), 500);

    $where = [];
    $params = [];

    if ($seasonId) {
        $where[] = 'ei.season_id = ?';
        $params[] = (int)$seasonId;
    } elseif ($seasonYear) {
        $where[] = 's.year = ?';
        $params[] = (int)$seasonYear;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';

    $stmt = $pdo->prepare("
        SELECT ei.*, et.code AS event_type_code, et.label AS event_type_label,
               pt.track_name, pt.city, pt.state, pt.timezone_iana,
               s.year AS season_year
        FROM event_instances ei
        JOIN event_types et ON ei.event_type_id = et.id
        JOIN parity_tracks pt ON ei.track_id = pt.id
        LEFT JOIN seasons s ON ei.season_id = s.id
        $whereClause
        ORDER BY ei.start_date_local DESC
        LIMIT ?
    ");
    $idx = 1;
    foreach ($params as $p) $stmt->bindValue($idx++, $p);
    $stmt->bindValue($idx, $limit, PDO::PARAM_INT);
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    tm_json(['events' => $rows, 'count' => count($rows)]);
}

function handleGetEvent(PDO $pdo): void {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) tm_error('Missing id parameter', 400);

    $stmt = $pdo->prepare("
        SELECT ei.*, et.code AS event_type_code, et.label AS event_type_label,
               pt.track_name, pt.city, pt.state, pt.timezone_iana,
               s.year AS season_year
        FROM event_instances ei
        JOIN event_types et ON ei.event_type_id = et.id
        JOIN parity_tracks pt ON ei.track_id = pt.id
        LEFT JOIN seasons s ON ei.season_id = s.id
        WHERE ei.id = ?
    ");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) tm_error('Event not found', 404);

    tm_json(['event' => $row]);
}

function handleCreateEvent(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $uuid = tm_uuid();

    $name = tm_requireParam($body, 'name');
    $trackId = (int)tm_requireParam($body, 'track_id');
    $eventTypeId = (int)tm_requireParam($body, 'event_type_id');
    $startDate = tm_requireParam($body, 'start_date_local');
    $endDate = tm_requireParam($body, 'end_date_local');

    $stmt = $pdo->prepare("
        INSERT INTO event_instances (uuid, event_type_id, season_id, track_id, name, event_code, start_date_local, end_date_local, race_lookup, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $eventTypeId,
        tm_optionalInt($body, 'season_id'),
        $trackId,
        $name,
        tm_optionalParam($body, 'event_code'),
        $startDate,
        $endDate,
        tm_optionalParam($body, 'race_lookup'),
        tm_optionalParam($body, 'status', 'scheduled'),
    ]);

    $id = (int)$pdo->lastInsertId();
    tm_json(['id' => $id, 'uuid' => $uuid], 201);
}

function handleUpdateEvent(PDO $pdo, int $userId): void {
    $body = tm_readBody();
    $id = (int)($body['id'] ?? 0);
    if (!$id) tm_error('Missing id', 400);

    $check = $pdo->prepare("SELECT id FROM event_instances WHERE id = ?");
    $check->execute([$id]);
    if (!$check->fetch()) tm_error('Event not found', 404);

    $allowed = ['name', 'event_code', 'event_type_id', 'season_id', 'track_id', 'start_date_local', 'end_date_local', 'race_lookup', 'status'];
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
    $pdo->prepare("UPDATE event_instances SET " . implode(', ', $sets) . " WHERE id = ?")->execute($params);

    tm_json(['updated' => true, 'id' => $id]);
}
