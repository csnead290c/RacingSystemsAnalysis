<?php
/**
 * Engine Sims API — DB-backed engine simulation documents
 *
 * Endpoints:
 *   GET    /engine_sims.php              — list user's engine sims
 *   GET    /engine_sims.php?id=UUID      — get single engine sim
 *   POST   /engine_sims.php              — create new engine sim
 *   PUT    /engine_sims.php?id=UUID      — update existing engine sim
 *   DELETE /engine_sims.php?id=UUID      — delete engine sim
 *
 * Capability: library.save.engine (basic+)
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';
require_once __DIR__ . '/lib/capabilities.php';
rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = rsa_getAuthUser();

switch ($method) {
    case 'GET':
        handleGet($pdo, $auth);
        break;
    case 'POST':
        handlePost($pdo, $auth);
        break;
    case 'PUT':
        handlePut($pdo, $auth);
        break;
    case 'DELETE':
        handleDelete($pdo, $auth);
        break;
    default:
        rsa_jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);

    $uuid = $_GET['id'] ?? null;

    if ($uuid) {
        $stmt = $pdo->prepare("SELECT * FROM engine_sims WHERE uuid = ? AND user_id = ?");
        $stmt->execute([$uuid, $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            rsa_jsonResponse(['error' => 'Engine sim not found'], 404);
        }
        rsa_jsonResponse(['engine_sim' => formatEngineSim($row)]);
    } else {
        $stmt = $pdo->prepare("SELECT * FROM engine_sims WHERE user_id = ? ORDER BY updated_at DESC");
        $stmt->execute([$userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        rsa_jsonResponse(['engine_sims' => array_map('formatEngineSim', $rows)]);
    }
}

function handlePost($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $input = rsa_getJsonInput();
    $name = trim($input['name'] ?? '');
    $data = $input['data'] ?? null;

    if (!$name) {
        rsa_jsonResponse(['error' => 'Name required'], 400);
    }
    if (!$data) {
        rsa_jsonResponse(['error' => 'Data required'], 400);
    }

    $uuid = generateSimUUID();
    $stmt = $pdo->prepare("INSERT INTO engine_sims (uuid, user_id, name, data) VALUES (?, ?, ?, ?)");
    $stmt->execute([$uuid, $userId, $name, json_encode($data)]);

    $id = (int)$pdo->lastInsertId();
    $stmt = $pdo->prepare("SELECT * FROM engine_sims WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    rsa_jsonResponse(['success' => true, 'engine_sim' => formatEngineSim($row)], 201);
}

function handlePut($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        rsa_jsonResponse(['error' => 'Engine sim ID required'], 400);
    }

    $stmt = $pdo->prepare("SELECT * FROM engine_sims WHERE uuid = ? AND user_id = ?");
    $stmt->execute([$uuid, $userId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        rsa_jsonResponse(['error' => 'Engine sim not found'], 404);
    }

    $input = rsa_getJsonInput();
    $name = trim($input['name'] ?? '') ?: $row['name'];
    $data = $input['data'] ?? json_decode($row['data'], true);

    $stmt = $pdo->prepare("UPDATE engine_sims SET name = ?, data = ? WHERE id = ?");
    $stmt->execute([$name, json_encode($data), $row['id']]);

    rsa_jsonResponse(['success' => true]);
}

function handleDelete($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'library.save.engine');

    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        rsa_jsonResponse(['error' => 'Engine sim ID required'], 400);
    }

    $stmt = $pdo->prepare("SELECT id, user_id FROM engine_sims WHERE uuid = ?");
    $stmt->execute([$uuid]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        rsa_jsonResponse(['error' => 'Engine sim not found'], 404);
    }

    if ($row['user_id'] != $userId && !in_array($role, ['owner', 'admin'])) {
        rsa_jsonResponse(['error' => 'Permission denied'], 403);
    }

    $stmt = $pdo->prepare("DELETE FROM engine_sims WHERE id = ?");
    $stmt->execute([$row['id']]);

    rsa_jsonResponse(['success' => true]);
}

function formatEngineSim(array $row): array {
    return [
        'id' => $row['uuid'],
        'name' => $row['name'],
        'data' => json_decode($row['data'], true),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ];
}

function generateSimUUID(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
