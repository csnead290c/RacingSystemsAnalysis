<?php
/**
 * Debug endpoint to check vehicles in database
 */

require_once 'config.php';
require_once 'functions.php';
rsa_setCorsHeaders();

$pdo = getDB();
$auth = rsa_getAuthUser();

// Get all vehicles for debugging
$stmt = $pdo->query("SELECT uuid, user_id, name, is_public, created_at FROM vehicles ORDER BY created_at DESC LIMIT 20");
$allVehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get vehicles for current user
$userId = $auth['user_id'] ?? 0;
$stmt = $pdo->prepare("SELECT uuid, user_id, name, is_public, created_at FROM vehicles WHERE user_id = ? OR is_public = 1 ORDER BY created_at DESC");
$stmt->execute([$userId]);
$userVehicles = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get user info
$userInfo = null;
if ($userId) {
    $stmt = $pdo->prepare("SELECT id, email, name, role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $userInfo = $stmt->fetch(PDO::FETCH_ASSOC);
}

rsa_jsonResponse([
    'auth' => $auth,
    'user_info' => $userInfo,
    'user_id_queried' => $userId,
    'all_vehicles_in_db' => $allVehicles,
    'vehicles_for_user' => $userVehicles,
    'all_count' => count($allVehicles),
    'user_count' => count($userVehicles),
]);
