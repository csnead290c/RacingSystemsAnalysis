<?php
/**
 * Run History API
 * CRUD operations for saved simulation runs
 */

require_once 'config.php';
require_once 'functions.php';
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
    
    // Server-side capability enforcement: viewing run history requires data.runLog
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'data.runLog');
    
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
    
    // Server-side capability enforcement: saving runs requires data.runLog
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'data.runLog');
    
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
    
    // Rich-record / hybrid-sync fields (all optional, backward compatible)
    $runData = $input['run_data'] ?? null;          // full RunRecordV1 payload
    $clientId = $input['client_id'] ?? null;        // stable client id for offline dedupe
    $runKind = normalizeRunKind($input['run_kind'] ?? 'logged');
    $correctedEt = isset($input['corrected_et']) ? (float)$input['corrected_et'] : null;
    $correctionFactor = isset($input['correction_factor']) ? (float)$input['correction_factor'] : null;
    $weatherSource = $input['weather_source'] ?? null;
    
    if (!$vehicleName || !$raceLength) {
        rsa_jsonResponse(['error' => 'Vehicle name and race length required'], 400);
    }
    
    // Idempotent upsert: if a (user_id, client_id) record already exists,
    // update it (last-write-wins) instead of inserting a duplicate. This makes
    // the offline pending-queue sync safe to retry.
    if ($clientId !== null && $clientId !== '') {
        $existing = $pdo->prepare("SELECT uuid FROM run_history WHERE user_id = ? AND client_id = ? LIMIT 1");
        $existing->execute([$auth['user_id'], $clientId]);
        $existingUuid = $existing->fetchColumn();
        if ($existingUuid) {
            updateRunRow($pdo, $existingUuid, $auth['user_id'], [
                'vehicle_uuid' => $vehicleUuid,
                'vehicle_name' => $vehicleName,
                'race_length' => $raceLength,
                'run_kind' => $runKind,
                'env_data' => $envData,
                'run_data' => $runData,
                'result_et' => $resultEt,
                'result_mph' => $resultMph,
                'corrected_et' => $correctedEt,
                'correction_factor' => $correctionFactor,
                'weather_source' => $weatherSource,
                'hp_adjust' => $hpAdjust,
                'weight_adjust' => $weightAdjust,
                'notes' => $notes,
            ]);
            $row = fetchRunByUuid($pdo, $existingUuid, $auth['user_id']);
            rsa_jsonResponse(['success' => true, 'run' => formatRun($row)], 200);
        }
    }
    
    $uuid = generateUUID();
    
    $stmt = $pdo->prepare("
        INSERT INTO run_history 
        (uuid, client_id, user_id, vehicle_uuid, vehicle_name, race_length, run_kind, env_data, run_data, result_et, result_mph, corrected_et, correction_factor, weather_source, hp_adjust, weight_adjust, notes) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $uuid,
        ($clientId !== '' ? $clientId : null),
        $auth['user_id'],
        $vehicleUuid,
        $vehicleName,
        $raceLength,
        $runKind,
        json_encode($envData),
        $runData !== null ? json_encode($runData) : null,
        $resultEt,
        $resultMph,
        $correctedEt,
        $correctionFactor,
        $weatherSource,
        $hpAdjust,
        $weightAdjust,
        $notes
    ]);
    
    $row = fetchRunByUuid($pdo, $uuid, $auth['user_id']);
    rsa_jsonResponse(['success' => true, 'run' => formatRun($row)], 201);
}

function handlePut($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'data.runLog');
    
    $uuid = $_GET['id'] ?? null;
    if (!$uuid) {
        rsa_jsonResponse(['error' => 'Run ID required'], 400);
    }
    
    $row = fetchRunByUuid($pdo, $uuid, $auth['user_id']);
    if (!$row) {
        rsa_jsonResponse(['error' => 'Run not found'], 404);
    }
    
    $input = rsa_getJsonInput();
    updateRunRow($pdo, $uuid, $auth['user_id'], [
        'vehicle_uuid' => $input['vehicle_id'] ?? $row['vehicle_uuid'],
        'vehicle_name' => $input['vehicle_name'] ?? $row['vehicle_name'],
        'race_length' => $input['race_length'] ?? $row['race_length'],
        'run_kind' => normalizeRunKind($input['run_kind'] ?? ($row['run_kind'] ?? 'logged')),
        'env_data' => $input['env'] ?? json_decode($row['env_data'], true),
        'run_data' => array_key_exists('run_data', $input) ? $input['run_data'] : (isset($row['run_data']) ? json_decode($row['run_data'], true) : null),
        'result_et' => $input['result_et'] ?? $row['result_et'],
        'result_mph' => $input['result_mph'] ?? $row['result_mph'],
        'corrected_et' => array_key_exists('corrected_et', $input) ? $input['corrected_et'] : $row['corrected_et'],
        'correction_factor' => array_key_exists('correction_factor', $input) ? $input['correction_factor'] : $row['correction_factor'],
        'weather_source' => $input['weather_source'] ?? ($row['weather_source'] ?? null),
        'hp_adjust' => $input['hp_adjust'] ?? $row['hp_adjust'],
        'weight_adjust' => $input['weight_adjust'] ?? $row['weight_adjust'],
        'notes' => $input['notes'] ?? $row['notes'],
    ]);
    
    $updated = fetchRunByUuid($pdo, $uuid, $auth['user_id']);
    rsa_jsonResponse(['success' => true, 'run' => formatRun($updated)]);
}

function normalizeRunKind($kind) {
    $kind = is_string($kind) ? strtolower(trim($kind)) : 'logged';
    return in_array($kind, ['logged', 'prediction'], true) ? $kind : 'logged';
}

function fetchRunByUuid($pdo, $uuid, $userId) {
    $stmt = $pdo->prepare("SELECT * FROM run_history WHERE uuid = ? AND user_id = ?");
    $stmt->execute([$uuid, $userId]);
    return $stmt->fetch();
}

function updateRunRow($pdo, $uuid, $userId, array $f) {
    $stmt = $pdo->prepare("
        UPDATE run_history SET
            vehicle_uuid = ?, vehicle_name = ?, race_length = ?, run_kind = ?,
            env_data = ?, run_data = ?, result_et = ?, result_mph = ?,
            corrected_et = ?, correction_factor = ?, weather_source = ?,
            hp_adjust = ?, weight_adjust = ?, notes = ?
        WHERE uuid = ? AND user_id = ?
    ");
    $stmt->execute([
        $f['vehicle_uuid'],
        $f['vehicle_name'],
        $f['race_length'],
        $f['run_kind'],
        json_encode($f['env_data']),
        $f['run_data'] !== null ? json_encode($f['run_data']) : null,
        $f['result_et'],
        $f['result_mph'],
        $f['corrected_et'],
        $f['correction_factor'],
        $f['weather_source'],
        $f['hp_adjust'],
        $f['weight_adjust'],
        $f['notes'],
        $uuid,
        $userId,
    ]);
}

function handleDelete($pdo, $auth) {
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    
    // Server-side capability enforcement: deleting runs requires data.runLog
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, 'data.runLog');
    
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
        'client_id' => $row['client_id'] ?? null,
        'vehicle_id' => $row['vehicle_uuid'],
        'vehicle_name' => $row['vehicle_name'],
        'race_length' => $row['race_length'],
        'run_kind' => $row['run_kind'] ?? 'logged',
        'env' => json_decode($row['env_data'], true),
        'run_data' => isset($row['run_data']) && $row['run_data'] !== null ? json_decode($row['run_data'], true) : null,
        'result' => [
            'et_s' => (float)$row['result_et'],
            'mph' => (float)$row['result_mph']
        ],
        'corrected_et' => isset($row['corrected_et']) && $row['corrected_et'] !== null ? (float)$row['corrected_et'] : null,
        'correction_factor' => isset($row['correction_factor']) && $row['correction_factor'] !== null ? (float)$row['correction_factor'] : null,
        'weather_source' => $row['weather_source'] ?? null,
        'hp_adjust' => (int)$row['hp_adjust'],
        'weight_adjust' => (int)$row['weight_adjust'],
        'notes' => $row['notes'],
        'timestamp' => strtotime($row['created_at']) * 1000,
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'] ?? $row['created_at']
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
