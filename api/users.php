<?php
/**
 * Users API (Admin only)
 * Manage users, roles, and products
 */

require_once 'config.php';
setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = requireAuth();

// Only owner and admin can access this API
if (!in_array($auth['role'], ['owner', 'admin'])) {
    jsonResponse(['error' => 'Permission denied'], 403);
}

switch ($method) {
    case 'GET':
        handleGet($pdo, $auth);
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
    $userId = $_GET['id'] ?? null;
    
    if ($userId) {
        $stmt = $pdo->prepare("SELECT id, email, name, role, products, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            jsonResponse(['error' => 'User not found'], 404);
        }
        
        $user['products'] = json_decode($user['products'], true);
        jsonResponse(['user' => $user]);
    } else {
        $stmt = $pdo->query("SELECT id, email, name, role, products, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll();
        
        foreach ($users as &$user) {
            $user['products'] = json_decode($user['products'], true);
        }
        
        jsonResponse(['users' => $users]);
    }
}

function handlePut($pdo, $auth) {
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        jsonResponse(['error' => 'User ID required'], 400);
    }
    
    $input = getJsonInput();
    
    // Get current user
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Only owner can change roles
    $role = $input['role'] ?? $user['role'];
    if ($role !== $user['role'] && $auth['role'] !== 'owner') {
        $role = $user['role'];
    }
    
    // Prevent demoting owner
    if ($user['role'] === 'owner' && $role !== 'owner') {
        jsonResponse(['error' => 'Cannot demote owner'], 400);
    }
    
    $name = $input['name'] ?? $user['name'];
    $products = $input['products'] ?? json_decode($user['products'], true);
    
    $stmt = $pdo->prepare("UPDATE users SET name = ?, role = ?, products = ? WHERE id = ?");
    $stmt->execute([$name, $role, json_encode($products), $userId]);
    
    jsonResponse(['success' => true]);
}

function handleDelete($pdo, $auth) {
    // Only owner can delete users
    if ($auth['role'] !== 'owner') {
        jsonResponse(['error' => 'Only owner can delete users'], 403);
    }
    
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        jsonResponse(['error' => 'User ID required'], 400);
    }
    
    // Prevent self-deletion
    if ($userId == $auth['user_id']) {
        jsonResponse(['error' => 'Cannot delete yourself'], 400);
    }
    
    // Check if user exists and is not owner
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    if ($user['role'] === 'owner') {
        jsonResponse(['error' => 'Cannot delete owner'], 400);
    }
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
    jsonResponse(['success' => true]);
}
