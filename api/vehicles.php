<?php
/**
 * Vehicles API
 * CRUD operations for vehicles
 */

require_once 'config.php';
require_once 'functions.php';
setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = getAuthUser();

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
        jsonResponse(['error' => 'Method not allowed'], 405);
}

function handleGet($pdo, $auth) {
    $uuid = $_GET['id'] ?? null;
    
    if ($uuid) {
        // Get single vehicle
        $stmt = $pdo->prepare("
            SELECT v.*, u.name as owner_name 
            FROM vehicles v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.uuid = ? AND (v.is_public = 1 OR v.user_id = ?)
        ");
        $stmt->execute([$uuid, $auth['user_id'] ?? 0]);
        $vehicle = $stmt->fetch();
        
        if (!$vehicle) {
            jsonResponse(['error' => 'Vehicle not found'], 404);
        }
        
        jsonResponse([
            'vehicle' => formatVehicle($vehicle)
        ]);
    } else {
        // Get all vehicles (user's + public)
        $userId = $auth['user_id'] ?? 0;
        
        $stmt = $pdo->prepare("
            SELECT v.*, u.name as owner_name 
            FROM vehicles v 
            JOIN users u ON v.user_id = u.id 
            WHERE v.user_id = ? OR v.is_public = 1
            ORDER BY v.updated_at DESC
        ");
        $stmt->execute([$userId]);
        $vehicles = $stmt->fetchAll();
        
        jsonResponse([
            'vehicles' => array_map('formatVehicle', $vehicles)
        ]);
    }
}

function handlePost($pdo, $auth) {
    if (!$auth) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $input = getJsonInput();
    $name = $input['name'] ?? '';
    $data = $input['data'] ?? [];
    $isPublic = $input['is_public'] ?? false;
    
    if (!$name) {
        jsonResponse(['error' => 'Vehicle name required'], 400);
    }
    
    // Only owner/admin can create public vehicles
    if ($isPublic && !in_array($auth['role'], ['owner', 'admin'])) {
        $isPublic = false;
    }
    
    $uuid = generateUUID();
    
    $stmt = $pdo->prepare("
        INSERT INTO vehicles (uuid, user_id, name, is_public, data) 
        VALUES (?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $auth['user_id'],
        $name,
        $isPublic ? 1 : 0,
        json_encode($data)
    ]);
    
    jsonResponse([
        'success' => true,
        'vehicle' => [
            'id' => $uuid,
            'name' => $name,
            'is_public' => $isPublic,
            'is_owner' => true,
            'data' => $data
        ]
    ], 201);
}

function handlePut($pdo, $auth) {
    if (!$auth) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        jsonResponse(['error' => 'Vehicle ID required'], 400);
    }
    
    // Check ownership
    $stmt = $pdo->prepare("SELECT * FROM vehicles WHERE uuid = ?");
    $stmt->execute([$uuid]);
    $vehicle = $stmt->fetch();
    
    if (!$vehicle) {
        jsonResponse(['error' => 'Vehicle not found'], 404);
    }
    
    // Only owner or admin can edit
    if ($vehicle['user_id'] != $auth['user_id'] && !in_array($auth['role'], ['owner', 'admin'])) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    $input = getJsonInput();
    $name = $input['name'] ?? $vehicle['name'];
    $data = $input['data'] ?? json_decode($vehicle['data'], true);
    $isPublic = $input['is_public'] ?? $vehicle['is_public'];
    
    // Only owner/admin can make public
    if ($isPublic && !in_array($auth['role'], ['owner', 'admin'])) {
        $isPublic = $vehicle['is_public'];
    }
    
    $stmt = $pdo->prepare("
        UPDATE vehicles SET name = ?, is_public = ?, data = ? WHERE uuid = ?
    ");
    $stmt->execute([$name, $isPublic ? 1 : 0, json_encode($data), $uuid]);
    
    jsonResponse(['success' => true]);
}

function handleDelete($pdo, $auth) {
    if (!$auth) {
        jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        jsonResponse(['error' => 'Vehicle ID required'], 400);
    }
    
    // Check ownership
    $stmt = $pdo->prepare("SELECT user_id FROM vehicles WHERE uuid = ?");
    $stmt->execute([$uuid]);
    $vehicle = $stmt->fetch();
    
    if (!$vehicle) {
        jsonResponse(['error' => 'Vehicle not found'], 404);
    }
    
    // Only owner or admin can delete
    if ($vehicle['user_id'] != $auth['user_id'] && !in_array($auth['role'], ['owner', 'admin'])) {
        jsonResponse(['error' => 'Permission denied'], 403);
    }
    
    $stmt = $pdo->prepare("DELETE FROM vehicles WHERE uuid = ?");
    $stmt->execute([$uuid]);
    
    jsonResponse(['success' => true]);
}

function formatVehicle($row) {
    return [
        'id' => $row['uuid'],
        'name' => $row['name'],
        'is_public' => (bool)$row['is_public'],
        'is_owner' => isset($row['user_id']),
        'owner_name' => $row['owner_name'] ?? null,
        'data' => json_decode($row['data'], true),
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at']
    ];
}

function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
