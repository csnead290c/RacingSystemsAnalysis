<?php
/**
 * Shared API Functions
 * These functions are used by all API endpoints
 * 
 * IMPORTANT: These functions use unique names with rsa_ prefix to avoid
 * conflicts with any functions defined in config.php
 */

// Auth functions with unique names to avoid conflicts
function rsa_setCorsHeaders() {
    $origin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : '*';
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control, Pragma, Expires');
    header('Content-Type: application/json');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

function rsa_jsonResponse($data, $code = 200) {
    // Discard any stray output (PHP warnings/notices) that would corrupt JSON
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($code);
    header('Content-Type: application/json');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    echo json_encode($data);
    exit;
}

function rsa_getJsonInput() {
    $input = file_get_contents('php://input');
    return json_decode($input, true) ?? [];
}

function rsa_generateToken($userId, $email, $role) {
    $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_me';
    $header = base64_encode(json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64_encode(json_encode([
        'user_id' => $userId,
        'email' => $email,
        'role' => $role,
        'exp' => time() + (7 * 24 * 60 * 60), // 7 days
    ]));
    $signature = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    return "$header.$payload.$signature";
}

function rsa_verifyToken($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    
    list($header, $payload, $signature) = $parts;
    
    $data = json_decode(base64_decode($payload), true);
    if (!$data) return null;
    
    $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_me';
    $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
    
    if ($signature !== $expectedSig) return null;
    if (($data['exp'] ?? 0) < time()) return null;
    
    return $data;
}

function rsa_getAuthUser() {
    $header = '';
    
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }
    
    if (!preg_match('/Bearer\s+(.+)/', $header, $matches)) {
        return null;
    }
    return rsa_verifyToken($matches[1]);
}

function rsa_requireAuth() {
    $auth = rsa_getAuthUser();
    if (!$auth) {
        rsa_jsonResponse(['error' => 'Unauthorized'], 401);
    }
    return $auth;
}

// ── Rate Limiting ─────────────────────────────────────────────────────

/**
 * Check and enforce a rate limit.
 * @param PDO    $pdo        Database handle
 * @param string $key        Rate limit key (e.g., "login:ip:1.2.3.4" or "reset:email:foo@bar.com")
 * @param int    $maxAttempts Maximum attempts allowed within the window
 * @param int    $windowSec  Window size in seconds
 * @return bool  true if within limit, false if exceeded
 */
function rsa_checkRateLimit(PDO $pdo, string $key, int $maxAttempts, int $windowSec): bool {
    $windowStart = date('Y-m-d H:i:s', time() - $windowSec);

    // Clean old entries
    $pdo->prepare("DELETE FROM rate_limits WHERE window_start < ?")->execute([$windowStart]);

    // Count attempts in window
    $stmt = $pdo->prepare("SELECT SUM(attempts) as total FROM rate_limits WHERE rate_key = ? AND window_start >= ?");
    $stmt->execute([$key, $windowStart]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $total = (int)($row['total'] ?? 0);

    if ($total >= $maxAttempts) {
        return false; // Rate limited
    }

    // Record this attempt
    $stmt = $pdo->prepare("INSERT INTO rate_limits (rate_key, attempts, window_start) VALUES (?, 1, NOW())");
    $stmt->execute([$key]);

    return true; // Within limit
}

/**
 * Get the client IP address.
 */
function rsa_getClientIp(): string {
    return $_SERVER['HTTP_X_FORWARDED_FOR']
        ?? $_SERVER['HTTP_X_REAL_IP']
        ?? $_SERVER['REMOTE_ADDR']
        ?? '0.0.0.0';
}

/**
 * Send a password reset email using PHP mail().
 * @return bool Whether the email was sent successfully
 */
function rsa_sendPasswordResetEmail(string $toEmail, string $userName, string $resetToken): bool {
    $frontendUrl = defined('FRONTEND_URL') ? FRONTEND_URL : 'https://racingsystemsanalysis.com';
    $resetLink = $frontendUrl . '/reset-password?token=' . urlencode($resetToken);

    $subject = 'Password Reset — Racing Systems Analysis';
    $body = <<<EMAIL
Hi {$userName},

We received a request to reset your password for Racing Systems Analysis.

Click the link below to set a new password (expires in 60 minutes):

{$resetLink}

If you didn't request this, you can safely ignore this email.

— Racing Systems Analysis
EMAIL;

    $headers = implode("\r\n", [
        'From: Racing Systems Analysis <noreply@racingsystemsanalysis.com>',
        'Reply-To: noreply@racingsystemsanalysis.com',
        'Content-Type: text/plain; charset=UTF-8',
        'X-Mailer: RSA-Auth/1.0',
    ]);

    return mail($toEmail, $subject, $body, $headers);
}

// Wrapper functions that use our rsa_ versions
// These will be defined if config.php doesn't define them
if (!function_exists('setCorsHeaders')) {
    function setCorsHeaders() { return rsa_setCorsHeaders(); }
}
if (!function_exists('jsonResponse')) {
    function jsonResponse($data, $code = 200) { return rsa_jsonResponse($data, $code); }
}
if (!function_exists('getJsonInput')) {
    function getJsonInput() { return rsa_getJsonInput(); }
}
if (!function_exists('generateToken')) {
    function generateToken($userId, $email, $role) { return rsa_generateToken($userId, $email, $role); }
}
if (!function_exists('verifyToken')) {
    function verifyToken($token) { return rsa_verifyToken($token); }
}
if (!function_exists('getAuthUser')) {
    function getAuthUser() { return rsa_getAuthUser(); }
}
if (!function_exists('requireAuth')) {
    function requireAuth() { return rsa_requireAuth(); }
}
