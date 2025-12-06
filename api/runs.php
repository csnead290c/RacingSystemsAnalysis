<?php
/**
 * Run History API
 * CRUD operations for saved simulation runs
 */

require_once 'config.php';
require_once 'functions.php';
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
    
    $limit = min((int)($_GET['limit'] ?? 50), 100);
    
    $stmt = $pdo->prepare("
        SELECT * FROM run_history 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    ");
    $stmt->execute([$auth['user_id'], $limit]);
    $runs = $stmt->fetchAll();
    
    rsa_jsonResponse([
        'runs' => array_map('formatRun', $runs)
    ]);
}

function handlePost($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $input = rsa_getJsonInput();
    
    $vehicleUuid = $input['vehicle_id'] ?? '';
    $vehicleName = $input['vehicle_name'] ?? '';
    $raceLength = $input['race_length'] ?? '';
    $envData = $input['env'] ?? [];
    $resultEt = $input['result_et'] ?? 0;
    $resultMph = $input['result_mph'] ?? 0;
    $hpAdjust = $input['hp_adjust'] ?? 0;
    $weightAdjust = $input['weight_adjust'] ?? 0;
    $notes = $input['notes'] ?? '';
    
    if (!$vehicleName || !$raceLength) {
        rsa_jsonResponse(['error' => 'Vehicle name and race length required'], 400);
    }
    
    $uuid = generateUUID();
    
    $stmt = $pdo->prepare("
        INSERT INTO run_history 
        (uuid, user_id, vehicle_uuid, vehicle_name, race_length, env_data, result_et, result_mph, hp_adjust, weight_adjust, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        $auth['user_id'],
        $vehicleUuid,
        $vehicleName,
        $raceLength,
        json_encode($envData),
        $resultEt,
        $resultMph,
        $hpAdjust,
        $weightAdjust,
        $notes
    ]);
    
    rsa_jsonResponse([
        'success' => true,
        'run' => [
            'id' => $uuid,
            'vehicle_name' => $vehicleName,
            'race_length' => $raceLength,
            'result_et' => $resultEt,
            'result_mph' => $resultMph,
            'hp_adjust' => $hpAdjust,
            'weight_adjust' => $weightAdjust,
            'created_at' => date('Y-m-d H:i:s')
        ]
    ], 201);
}

function handleDelete($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $uuid = $_GET['id'] ?? null;
    
    if ($uuid) {
        // Delete single run
        $stmt = $pdo->prepare("DELETE FROM run_history WHERE uuid = ? AND user_id = ?");
        $stmt->execute([$uuid, $auth['user_id']]);
    } else {
        // Clear all runs for user
        $stmt = $pdo->prepare("DELETE FROM run_history WHERE user_id = ?");
        $stmt->execute([$auth['user_id']]);
    }
    
    rsa_jsonResponse(['success' => true]);
}

function formatRun($row) {
    return [
        'id' => $row['uuid'],
        'vehicle_id' => $row['vehicle_uuid'],
        'vehicle_name' => $row['vehicle_name'],
        'race_length' => $row['race_length'],
        'env' => json_decode($row['env_data'], true),
        'result' => [
            'et_s' => (float)$row['result_et'],
            'mph' => (float)$row['result_mph']
        ],
        'hp_adjust' => (int)$row['hp_adjust'],
        'weight_adjust' => (int)$row['weight_adjust'],
        'notes' => $row['notes'],
        'timestamp' => strtotime($row['created_at']) * 1000,
        'created_at' => $row['created_at']
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
