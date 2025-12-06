<?php
/**
 * Authentication API
 * Endpoints: login, register, me
 */

require_once 'config.php';
require_once 'functions.php';
rsa_setCorsHeaders();

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        handleLogin($pdo);
        break;
    case 'register':
        handleRegister($pdo);
        break;
    case 'me':
        handleMe($pdo);
        break;
    case 'update':
        handleUpdate($pdo);
        break;
    case 'preferences':
        handlePreferences($pdo);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

function handleLogin($pdo) {
    $input = rsa_getJsonInput();
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (!$email || !$password) {
        rsa_jsonResponse(['error' => 'Email and password required'], 400);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        rsa_jsonResponse(['error' => 'Invalid email or password'], 401);
    }
    
    $token = rsa_generateToken($user['id'], $user['email'], $user['role']);
    
    rsa_jsonResponse([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'products' => json_decode($user['products'], true)
        ]
    ]);
}

function handleRegister($pdo) {
    $input = rsa_getJsonInput();
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $name = $input['name'] ?? '';
    
    if (!$email || !$password || !$name) {
        rsa_jsonResponse(['error' => 'Email, password, and name required'], 400);
    }
    
    if (strlen($password) < 6) {
        rsa_jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
    }
    
    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        rsa_jsonResponse(['error' => 'Email already registered'], 400);
    }
    
    // Create user
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, 'user', '[]')");
    $stmt->execute([$email, $hash, $name]);
    
    $userId = $pdo->lastInsertId();
    $token = rsa_generateToken($userId, $email, 'user');
    
    rsa_jsonResponse([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $userId,
            'email' => $email,
            'name' => $name,
            'role' => 'user',
            'products' => []
        ]
    ], 201);
}

function handleMe($pdo) {
    $auth = rsa_requireAuth();
    
    $stmt = $pdo->prepare("SELECT id, email, name, role, products FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    rsa_jsonResponse([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'products' => json_decode($user['products'], true)
        ]
    ]);
}

function handleUpdate($pdo) {
    $auth = rsa_requireAuth();
    $input = rsa_getJsonInput();
    
    $name = $input['name'] ?? null;
    $password = $input['password'] ?? null;
    
    $updates = [];
    $params = [];
    
    if ($name) {
        $updates[] = "name = ?";
        $params[] = $name;
    }
    
    if ($password) {
        if (strlen($password) < 6) {
            rsa_jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }
        $updates[] = "password_hash = ?";
        $params[] = password_hash($password, PASSWORD_DEFAULT);
    }
    
    if (empty($updates)) {
        rsa_jsonResponse(['error' => 'Nothing to update'], 400);
    }
    
    $params[] = $auth['user_id'];
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    rsa_jsonResponse(['success' => true]);
}

function handlePreferences($pdo) {
    $auth = rsa_requireAuth();
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Get preferences
        $stmt = $pdo->prepare("SELECT preferences FROM users WHERE id = ?");
        $stmt->execute([$auth['user_id']]);
        $row = $stmt->fetch();
        
        $preferences = $row && $row['preferences'] ? json_decode($row['preferences'], true) : [];
        rsa_jsonResponse(['preferences' => $preferences]);
    } else if ($method === 'POST') {
        // Update preferences
        $input = rsa_getJsonInput();
        
        // Get current preferences
        $stmt = $pdo->prepare("SELECT preferences FROM users WHERE id = ?");
        $stmt->execute([$auth['user_id']]);
        $row = $stmt->fetch();
        $current = $row && $row['preferences'] ? json_decode($row['preferences'], true) : [];
        
        // Merge with new preferences
        $updated = array_merge($current, $input);
        
        // Save
        $stmt = $pdo->prepare("UPDATE users SET preferences = ? WHERE id = ?");
        $stmt->execute([json_encode($updated), $auth['user_id']]);
        
        rsa_jsonResponse(['success' => true, 'preferences' => $updated]);
    } else {
        rsa_jsonResponse(['error' => 'Method not allowed'], 405);
    }
}
