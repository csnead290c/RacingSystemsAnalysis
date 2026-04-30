<?php
/**
 * Authentication API
 * Endpoints: login, register, me, update, preferences, request_password_reset, reset_password
 */

// Global error handler to return JSON errors instead of empty 500s
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Server error',
        'debug' => [
            'message' => $errstr,
            'file' => basename($errfile),
            'line' => $errline
        ]
    ]);
    exit;
});

set_exception_handler(function($e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'Server error',
        'debug' => [
            'message' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine()
        ]
    ]);
    exit;
});

if (!defined('RSA_CONFIG_LOADED')) {
    require_once 'config.php';
}
require_once 'functions.php';
require_once __DIR__ . '/lib/capabilities.php';
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
    case 'request_password_reset':
        handleRequestPasswordReset($pdo);
        break;
    case 'reset_password':
        handleResetPassword($pdo);
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
    
    // Rate limit: 10 attempts per IP per 15 minutes
    $ip = rsa_getClientIp();
    if (!rsa_checkRateLimit($pdo, "login:ip:{$ip}", 10, 900)) {
        rsa_jsonResponse(['error' => 'Too many login attempts. Please wait 15 minutes.'], 429);
    }
    // Rate limit: 5 attempts per email per 15 minutes
    if (!rsa_checkRateLimit($pdo, "login:email:{$email}", 5, 900)) {
        rsa_jsonResponse(['error' => 'Too many login attempts for this email. Please wait 15 minutes.'], 429);
    }
    
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    if (!$user || !password_verify($password, $user['password_hash'])) {
        rsa_jsonResponse(['error' => 'Invalid email or password'], 401);
    }
    
    // Check lifecycle status - block suspended and deleted users
    $status = $user['status'] ?? 'active';
    if ($status === 'suspended') {
        rsa_jsonResponse(['error' => 'Your account has been suspended. Please contact support.'], 403);
    }
    if ($status === 'deleted') {
        rsa_jsonResponse(['error' => 'This account is no longer active.'], 403);
    }
    if ($status === 'invited') {
        rsa_jsonResponse(['error' => 'Please complete your account setup using the invite link.'], 403);
    }
    
    $token = rsa_generateToken($user['id'], $user['email'], $user['role']);
    
    // Get resolved plan using capability system
    $plan = rsa_getUserPlan($pdo, $user['id']);
    
    // Get products: merge DB products with plan-based products
    $dbProducts = json_decode($user['products'] ?? '[]', true) ?: [];
    $planProducts = rsa_getProductsForPlanId($plan);
    $allProducts = array_values(array_unique(array_merge($dbProducts, $planProducts)));
    
    rsa_jsonResponse([
        'success' => true,
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'plan' => $plan,
            'products' => $allProducts
        ]
    ]);
}

function handleRegister($pdo) {
    // Ensure we always return JSON even on fatal errors
    ob_start();
    
    try {
        $input = rsa_getJsonInput();
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $name = $input['name'] ?? '';
        $inviteCode = $input['invite_code'] ?? null;
        
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
        
        // Validate invite code if provided
        $plan = 'free';
        $inviteCodeId = null;
        if ($inviteCode) {
            try {
                $stmt = $pdo->prepare("
                    SELECT id, plan, max_uses, uses_count, expires_at, revoked_at 
                    FROM invite_codes 
                    WHERE code = ?
                ");
                $stmt->execute([$inviteCode]);
                $invite = $stmt->fetch();
                
                if (!$invite) {
                    rsa_jsonResponse(['error' => 'Invalid invite code'], 400);
                }
                
                if ($invite['revoked_at']) {
                    rsa_jsonResponse(['error' => 'Invite code has been revoked'], 400);
                }
                
                if ($invite['expires_at'] && strtotime($invite['expires_at']) < time()) {
                    rsa_jsonResponse(['error' => 'Invite code has expired'], 400);
                }
                
                if ($invite['uses_count'] >= $invite['max_uses']) {
                    rsa_jsonResponse(['error' => 'Invite code has reached maximum uses'], 400);
                }
                
                $plan = $invite['plan'];
                $inviteCodeId = $invite['id'];
            } catch (PDOException $e) {
                // invite_codes table may not exist - ignore invite code
                error_log("Invite code lookup failed (table may not exist): " . $e->getMessage());
            }
        }
        
        // Create user with plan
        $hash = password_hash($password, PASSWORD_DEFAULT);
        
        // Try with plan column first, fall back to without if column doesn't exist
        try {
            $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, plan, products) VALUES (?, ?, ?, 'user', ?, '[]')");
            $stmt->execute([$email, $hash, $name, $plan]);
        } catch (PDOException $colErr) {
            // plan column may not exist yet - try without it
            if (strpos($colErr->getMessage(), 'plan') !== false || strpos($colErr->getMessage(), 'Unknown column') !== false) {
                $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, 'user', '[]')");
                $stmt->execute([$email, $hash, $name]);
            } else {
                throw $colErr; // Re-throw if it's a different error
            }
        }
        
        $userId = $pdo->lastInsertId();
        
        // Record invite code use if applicable
        if ($inviteCodeId) {
            $stmt = $pdo->prepare("UPDATE invite_codes SET uses_count = uses_count + 1 WHERE id = ?");
            $stmt->execute([$inviteCodeId]);
            
            $stmt = $pdo->prepare("INSERT INTO invite_code_uses (invite_code_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $inviteCodeId,
                $userId,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);
        }
        
        $token = rsa_generateToken($userId, $email, 'user');
        
        // Get products based on plan
        $planProducts = rsa_getProductsForPlanId($plan);
        
        rsa_jsonResponse([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $userId,
                'email' => $email,
                'name' => $name,
                'role' => 'user',
                'plan' => $plan,
                'products' => $planProducts
            ]
        ], 201);
    } catch (PDOException $e) {
        error_log("Registration DB error: " . $e->getMessage());
        rsa_jsonResponse([
            'error' => 'Registration failed: database error',
            'debug' => $e->getMessage()
        ], 500);
    } catch (Exception $e) {
        error_log("Registration error: " . $e->getMessage());
        rsa_jsonResponse([
            'error' => 'Registration failed',
            'debug' => $e->getMessage()
        ], 500);
    }
}

function handleMe($pdo) {
    $auth = rsa_requireAuth();
    
    $stmt = $pdo->prepare("SELECT id, email, name, role, products FROM users WHERE id = ?");
    $stmt->execute([$auth['user_id']]);
    $user = $stmt->fetch();
    
    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }
    
    // Get resolved plan using capability system
    $plan = rsa_getUserPlan($pdo, $user['id']);
    
    // Get products: merge DB products with plan-based products
    $dbProducts = json_decode($user['products'] ?? '[]', true) ?: [];
    $planProducts = rsa_getProductsForPlanId($plan);
    $allProducts = array_values(array_unique(array_merge($dbProducts, $planProducts)));
    
    rsa_jsonResponse([
        'user' => [
            'id' => $user['id'],
            'email' => $user['email'],
            'name' => $user['name'],
            'role' => $user['role'],
            'plan' => $plan,
            'products' => $allProducts
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

/**
 * Request a password reset — sends email with one-time token.
 * Always returns generic success to prevent email enumeration.
 */
function handleRequestPasswordReset($pdo) {
    $input = rsa_getJsonInput();
    $email = trim($input['email'] ?? '');

    if (!$email) {
        rsa_jsonResponse(['error' => 'Email is required'], 400);
    }

    // Rate limit: 3 reset requests per email per 15 minutes
    $ip = rsa_getClientIp();
    if (!rsa_checkRateLimit($pdo, "reset:email:{$email}", 3, 900)) {
        // Return success anyway to not leak whether the email exists
        rsa_jsonResponse(['success' => true, 'message' => 'If that email is registered, a reset link has been sent.']);
    }
    // Rate limit: 10 reset requests per IP per 15 minutes
    if (!rsa_checkRateLimit($pdo, "reset:ip:{$ip}", 10, 900)) {
        rsa_jsonResponse(['success' => true, 'message' => 'If that email is registered, a reset link has been sent.']);
    }

    // Look up user (don't reveal if not found)
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Invalidate any existing unused tokens for this user
        $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL")
            ->execute([$user['id']]);

        // Generate a secure random token
        $rawToken = bin2hex(random_bytes(32)); // 64 hex chars
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = date('Y-m-d H:i:s', time() + 3600); // 60 minutes

        // Store hashed token in DB
        $stmt = $pdo->prepare("
            INSERT INTO password_resets (user_id, token_hash, expires_at, request_ip, created_at)
            VALUES (?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$user['id'], $tokenHash, $expiresAt, $ip]);

        // Send email with the raw (unhashed) token
        rsa_sendPasswordResetEmail($user['email'], $user['name'] ?: 'User', $rawToken);
    }

    // Always return success
    rsa_jsonResponse(['success' => true, 'message' => 'If that email is registered, a reset link has been sent.']);
}

/**
 * Reset password using a valid one-time token.
 */
function handleResetPassword($pdo) {
    $input = rsa_getJsonInput();
    $rawToken = $input['token'] ?? '';
    $newPassword = $input['newPassword'] ?? '';

    if (!$rawToken || !$newPassword) {
        rsa_jsonResponse(['error' => 'Token and new password are required'], 400);
    }

    if (strlen($newPassword) < 6) {
        rsa_jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
    }

    // Rate limit redemption attempts by IP
    $ip = rsa_getClientIp();
    if (!rsa_checkRateLimit($pdo, "redeem:ip:{$ip}", 10, 900)) {
        rsa_jsonResponse(['error' => 'Too many attempts. Please wait 15 minutes.'], 429);
    }

    // Hash the incoming token and look it up
    $tokenHash = hash('sha256', $rawToken);
    $stmt = $pdo->prepare("
        SELECT pr.id, pr.user_id, pr.expires_at, pr.used_at, u.email, u.role
        FROM password_resets pr
        JOIN users u ON u.id = pr.user_id
        WHERE pr.token_hash = ?
    ");
    $stmt->execute([$tokenHash]);
    $reset = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$reset) {
        rsa_jsonResponse(['error' => 'Invalid or expired reset link'], 400);
    }

    if ($reset['used_at'] !== null) {
        rsa_jsonResponse(['error' => 'This reset link has already been used'], 400);
    }

    if (strtotime($reset['expires_at']) < time()) {
        rsa_jsonResponse(['error' => 'This reset link has expired. Please request a new one.'], 400);
    }

    // All good — update password and mark token as used
    $hash = password_hash($newPassword, PASSWORD_DEFAULT);
    $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
        ->execute([$hash, $reset['user_id']]);
    $pdo->prepare("UPDATE password_resets SET used_at = NOW() WHERE id = ?")
        ->execute([$reset['id']]);

    // Generate a fresh login token so the user is immediately signed in
    $loginToken = rsa_generateToken($reset['user_id'], $reset['email'], $reset['role']);

    rsa_jsonResponse([
        'success' => true,
        'message' => 'Password has been reset successfully.',
        'token' => $loginToken,
        'user' => [
            'id' => $reset['user_id'],
            'email' => $reset['email'],
            'role' => $reset['role'],
        ],
    ]);
}
