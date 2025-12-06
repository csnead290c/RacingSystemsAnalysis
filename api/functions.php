<?php
/**
 * Shared API Functions
 * These functions are used by all API endpoints
 * 
 * Note: All functions check if they're already defined to avoid
 * conflicts with existing config.php implementations
 */

if (!function_exists('getDB')) {
    function getDB() {
        static $pdo = null;
        if ($pdo === null) {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        }
        return $pdo;
    }
}

if (!function_exists('setCorsHeaders')) {
    function setCorsHeaders() {
        $origin = defined('ALLOWED_ORIGIN') ? ALLOWED_ORIGIN : '*';
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Content-Type: application/json');
        
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
            http_response_code(200);
            exit;
        }
    }
}

if (!function_exists('jsonResponse')) {
    function jsonResponse($data, $code = 200) {
        http_response_code($code);
        echo json_encode($data);
        exit;
    }
}

if (!function_exists('getJsonInput')) {
    function getJsonInput() {
        $input = file_get_contents('php://input');
        return json_decode($input, true) ?? [];
    }
}

if (!function_exists('generateToken')) {
    function generateToken($userId, $email, $role) {
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
}

if (!function_exists('verifyToken')) {
    function verifyToken($token) {
        $secret = defined('JWT_SECRET') ? JWT_SECRET : 'default_secret_change_me';
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;
        
        list($header, $payload, $signature) = $parts;
        $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
        
        if ($signature !== $expectedSig) return null;
        
        $data = json_decode(base64_decode($payload), true);
        if (!$data || ($data['exp'] ?? 0) < time()) return null;
        
        return $data;
    }
}

if (!function_exists('getAuthUser')) {
    function getAuthUser() {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return null;
        }
        return verifyToken($matches[1]);
    }
}

if (!function_exists('requireAuth')) {
    function requireAuth() {
        $auth = getAuthUser();
        if (!$auth) {
            jsonResponse(['error' => 'Unauthorized'], 401);
        }
        return $auth;
    }
}
