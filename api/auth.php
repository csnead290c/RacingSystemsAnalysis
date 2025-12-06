<?php
/**
 * Authentication API
 * Endpoints: login, register, me
 */

require_once 'config.php';
setCorsHeaders();

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
        jsonResponse(['error' => 'Invalid action'], 400);
}

function handleLogin($pdo) {
    $input = getJsonInput();
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    
    if (!$email || !$password) {
        jsonResponse(['error' => 'Email and password required'], 400);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(['error' => 'Invalid email or password'], 401);
    }
    
    $token = createToken($user['id'], $user['email'], $user['role']);
    
    jsonResponse([
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
    $input = getJsonInput();
    $email = $input['email'] ?? '';
    $password = $input['password'] ?? '';
    $name = $input['name'] ?? '';
    
    if (!$email || !$password || !$name) {
        jsonResponse(['error' => 'Email, password, and name required'], 400);
    }
    
    if (strlen($password) < 6) {
        jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
    }
    
    // Check if email exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['error' => 'Email already registered'], 400);
    }
    
    // Create user
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, 'user', '[]')");
    $stmt->execute([$email, $hash, $name]);
    
    $userId = $pdo->lastInsertId();
    $token = createToken($userId, $email, 'user');
    
    jsonResponse([
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
    $auth = requireAuth();
    
    $stmt = $pdo->prepare("SELECT id, email, name, role, products FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        jsonResponse(['error' => 'User not found'], 404);
    }
    
    jsonResponse([
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
    $auth = requireAuth();
    $input = getJsonInput();
    
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
            jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }
        $updates[] = "password_hash = ?";
        $params[] = password_hash($password, PASSWORD_DEFAULT);
    }
    
    if (empty($updates)) {
        jsonResponse(['error' => 'Nothing to update'], 400);
    }
    
    $params[] = $auth['user_id'];
    $sql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    
    jsonResponse(['success' => true]);
}

function handlePreferences($pdo) {
    $auth = requireAuth();
    $method = $_SERVER['REQUEST_METHOD'];
    
    if ($method === 'GET') {
        // Get preferences
        $stmt = $pdo->prepare("SELECT preferences FROM users WHERE id = ?");
        $stmt->execute([$auth['user_id']]);
        $row = $stmt->fetch();
        
        $preferences = $row && $row['preferences'] ? json_decode($row['preferences'], true) : [];
        jsonResponse(['preferences' => $preferences]);
    } else if ($method === 'POST') {
        // Update preferences
        $input = getJsonInput();
        
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
        
        jsonResponse(['success' => true, 'preferences' => $updated]);
    } else {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
}
