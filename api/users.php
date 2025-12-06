<?php
/**
 * Users API (Admin only)
 * Manage users, roles, and products
 */

require_once 'config.php';
require_once 'functions.php';
rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$auth = rsa_requireAuth();

// Only owner and admin can access this API
if (!in_array($auth['role'], ['owner', 'admin'])) {
    rsa_jsonResponse(['error' => 'Permission denied'], 403);
}

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

function handlePost($pdo, $auth) {
    $input = rsa_getJsonInput();
    
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $name = $input['name'] ?? '';
    $role = $input['role'] ?? 'user';
    $products = $input['products'] ?? [];
    
    if (!$email || !$password || !$name) {
        rsa_jsonResponse(['error' => 'Email, password, and name required'], 400);
    }
    
    if (strlen($password) < 6) {
        rsa_jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
    }
    
    // Only owner can create admin/owner users
    if (in_array($role, ['owner', 'admin']) && $auth['role'] !== 'owner') {
        $role = 'user';
    }
    
    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        rsa_jsonResponse(['error' => 'Email already registered'], 400);
    }
    
    // Create user
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$email, $hash, $name, $role, json_encode($products)]);
    
    $userId = $pdo->lastInsertId();
    
    rsa_jsonResponse([
        'success' => true,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
            'role' => $role,
            'products' => $products
        ]
    ], 201);
}

function handleGet($pdo, $auth) {
    $userId = $_GET['id'] ?? null;
    
    if ($userId) {
        $stmt = $pdo->prepare("SELECT id, email, name, role, products, created_at FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            rsa_jsonResponse(['error' => 'User not found'], 404);
        }
        
        $user['products'] = json_decode($user['products'], true);
        rsa_jsonResponse(['user' => $user]);
    } else {
        $stmt = $pdo->query("SELECT id, email, name, role, products, created_at FROM users ORDER BY created_at DESC");
        $users = $stmt->fetchAll();
        
        foreach ($users as &$user) {
            $user['products'] = json_decode($user['products'], true);
        }
        
        rsa_jsonResponse(['users' => $users]);
    }
}

function handlePut($pdo, $auth) {
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        rsa_jsonResponse(['error' => 'User ID required'], 400);
    }
    
    $input = rsa_getJsonInput();
    
    // Get current user
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Only owner can change roles
    $role = $input['role'] ?? $user['role'];
    if ($role !== $user['role'] && $auth['role'] !== 'owner') {
        $role = $user['role'];
    }
    
    // Prevent demoting owner
    if ($user['role'] === 'owner' && $role !== 'owner') {
        rsa_jsonResponse(['error' => 'Cannot demote owner'], 400);
    }
    
    $name = $input['name'] ?? $user['name'];
    $products = $input['products'] ?? json_decode($user['products'], true);
    
    $stmt = $pdo->prepare("UPDATE users SET name = ?, role = ?, products = ? WHERE id = ?");
    $stmt->execute([$name, $role, json_encode($products), $userId]);
    
    rsa_jsonResponse(['success' => true]);
}

function handleDelete($pdo, $auth) {
    // Only owner can delete users
    if ($auth['role'] !== 'owner') {
        rsa_jsonResponse(['error' => 'Only owner can delete users'], 403);
    }
    
    $userId = $_GET['id'] ?? null;
    if (!$userId) {
        rsa_jsonResponse(['error' => 'User ID required'], 400);
    }
    
    // Prevent self-deletion
    if ($userId == $auth['user_id']) {
        rsa_jsonResponse(['error' => 'Cannot delete yourself'], 400);
    }
    
    // Check if user exists and is not owner
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    if ($user['role'] === 'owner') {
        rsa_jsonResponse(['error' => 'Cannot delete owner'], 400);
    }
    
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    
    rsa_jsonResponse(['success' => true]);
}
