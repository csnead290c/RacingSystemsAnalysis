<?php
/**
 * Tracks API
 * CRUD operations for drag racing tracks
 * Tracks are shared across all users (managed by admins/owners)
 */

require_once 'config.php';
require_once 'functions.php';
rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = rsa_getAuthUser();

switch ($method) {
    case 'GET':
        handleGet($pdo);
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

function handleGet($pdo) {
    $trackId = $_GET['id'] ?? null;
    
    if ($trackId) {
        // Get single track
        $stmt = $pdo->prepare("SELECT * FROM tracks WHERE track_id = ? AND is_active = 1");
        $stmt->execute([$trackId]);
        $track = $stmt->fetch();
        
        if (!$track) {
            rsa_jsonResponse(['error' => 'Track not found'], 404);
        }
        
        rsa_jsonResponse(['track' => formatTrack($track)]);
    } else {
        // Get all active tracks
        $stmt = $pdo->query("SELECT * FROM tracks WHERE is_active = 1 ORDER BY state, name");
        $tracks = $stmt->fetchAll();
        
        rsa_jsonResponse([
            'tracks' => array_map('formatTrack', $tracks)
        ]);
    }
}

function handlePost($pdo, $auth) {
    // Only admins and owners can add tracks
    if (!$auth || !in_array($auth['role'], ['admin', 'owner'])) {
        rsa_jsonResponse(['error' => 'Unauthorized - admin access required'], 403);
    }
    
    $input = rsa_getJsonInput();
    
    // Validate required fields
    $required = ['name', 'city', 'state', 'lat', 'lon', 'elevation_ft'];
    foreach ($required as $field) {
        if (empty($input[$field]) && $input[$field] !== 0) {
            rsa_jsonResponse(['error' => "Missing required field: $field"], 400);
        }
    }
    
    // Generate track_id from name if not provided
    $trackId = $input['track_id'] ?? strtolower(preg_replace('/[^a-zA-Z0-9]+/', '_', $input['name']));
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO tracks (track_id, name, city, state, country, lat, lon, elevation_ft, track_length, track_angle, sanctioning, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $trackId,
            $input['name'],
            $input['city'],
            $input['state'],
            $input['country'] ?? 'USA',
            $input['lat'],
            $input['lon'],
            $input['elevation_ft'],
            $input['length'] ?? '1/4',
            $input['trackAngle'] ?? null,
            isset($input['sanctioning']) ? json_encode($input['sanctioning']) : null,
            $auth['user_id']
        ]);
        
        rsa_jsonResponse([
            'success' => true,
            'track_id' => $trackId,
            'message' => 'Track created successfully'
        ], 201);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
            rsa_jsonResponse(['error' => 'Track ID already exists'], 409);
        }
        rsa_jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handlePut($pdo, $auth) {
    // Only admins and owners can update tracks
    if (!$auth || !in_array($auth['role'], ['admin', 'owner'])) {
        rsa_jsonResponse(['error' => 'Unauthorized - admin access required'], 403);
    }
    
    $trackId = $_GET['id'] ?? null;
    if (!$trackId) {
        rsa_jsonResponse(['error' => 'Track ID required'], 400);
    }
    
    $input = rsa_getJsonInput();
    
    // Build update query dynamically
    $updates = [];
    $params = [];
    
    $allowedFields = [
        'name' => 'name',
        'city' => 'city',
        'state' => 'state',
        'country' => 'country',
        'lat' => 'lat',
        'lon' => 'lon',
        'elevation_ft' => 'elevation_ft',
        'length' => 'track_length',
        'trackAngle' => 'track_angle',
        'sanctioning' => 'sanctioning',
        'is_active' => 'is_active'
    ];
    
    foreach ($allowedFields as $inputKey => $dbKey) {
        if (isset($input[$inputKey])) {
            $value = $input[$inputKey];
            if ($inputKey === 'sanctioning') {
                $value = json_encode($value);
            }
            $updates[] = "$dbKey = ?";
            $params[] = $value;
        }
    }
    
    if (empty($updates)) {
        rsa_jsonResponse(['error' => 'No fields to update'], 400);
    }
    
    $params[] = $trackId;
    
    try {
        $stmt = $pdo->prepare("UPDATE tracks SET " . implode(', ', $updates) . " WHERE track_id = ?");
        $stmt->execute($params);
        
        if ($stmt->rowCount() === 0) {
            rsa_jsonResponse(['error' => 'Track not found'], 404);
        }
        
        rsa_jsonResponse(['success' => true, 'message' => 'Track updated successfully']);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function handleDelete($pdo, $auth) {
    // Only owners can delete tracks
    if (!$auth || $auth['role'] !== 'owner') {
        rsa_jsonResponse(['error' => 'Unauthorized - owner access required'], 403);
    }
    
    $trackId = $_GET['id'] ?? null;
    if (!$trackId) {
        rsa_jsonResponse(['error' => 'Track ID required'], 400);
    }
    
    try {
        // Soft delete - just mark as inactive
        $stmt = $pdo->prepare("UPDATE tracks SET is_active = 0 WHERE track_id = ?");
        $stmt->execute([$trackId]);
        
        if ($stmt->rowCount() === 0) {
            rsa_jsonResponse(['error' => 'Track not found'], 404);
        }
        
        rsa_jsonResponse(['success' => true, 'message' => 'Track deleted successfully']);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Database error: ' . $e->getMessage()], 500);
    }
}

function formatTrack($row) {
    return [
        'id' => $row['track_id'],
        'name' => $row['name'],
        'city' => $row['city'],
        'state' => $row['state'],
        'country' => $row['country'],
        'lat' => (float)$row['lat'],
        'lon' => (float)$row['lon'],
        'elevation_ft' => (int)$row['elevation_ft'],
        'length' => $row['track_length'],
        'trackAngle' => $row['track_angle'] !== null ? (int)$row['track_angle'] : null,
        'sanctioning' => $row['sanctioning'] ? json_decode($row['sanctioning'], true) : null,
    ];
}
