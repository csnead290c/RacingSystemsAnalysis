<?php
/**
 * Debug Authentication - REMOVE AFTER DEBUGGING
 */

require_once 'config.php';
require_once 'functions.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Get the Authorization header using all methods
$headers = [];
$headers['HTTP_AUTHORIZATION'] = $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET';
$headers['REDIRECT_HTTP_AUTHORIZATION'] = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? 'NOT SET';

if (function_exists('apache_request_headers')) {
    $apacheHeaders = apache_request_headers();
    $headers['apache_Authorization'] = $apacheHeaders['Authorization'] ?? 'NOT SET';
}

// Try to get the token
$authHeader = '';
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $authHeader = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $h = apache_request_headers();
    $authHeader = $h['Authorization'] ?? $h['authorization'] ?? '';
}

$token = '';
if (preg_match('/Bearer\s+(.+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Try to verify the token
$verified = null;
$verifyError = null;
if ($token) {
    try {
        $secret = defined('JWT_SECRET') ? JWT_SECRET : 'NOT DEFINED';
        $parts = explode('.', $token);
        
        if (count($parts) === 3) {
            list($header, $payload, $signature) = $parts;
            $expectedSig = base64_encode(hash_hmac('sha256', "$header.$payload", $secret, true));
            
            $verified = [
                'parts_count' => count($parts),
                'signature_matches' => ($signature === $expectedSig),
                'expected_sig_preview' => substr($expectedSig, 0, 20) . '...',
                'actual_sig_preview' => substr($signature, 0, 20) . '...',
                'payload_decoded' => json_decode(base64_decode($payload), true),
                'jwt_secret_length' => strlen($secret),
                'jwt_secret_preview' => substr($secret, 0, 5) . '...',
            ];
        } else {
            $verifyError = 'Token does not have 3 parts';
        }
    } catch (Exception $e) {
        $verifyError = $e->getMessage();
    }
}

// Check which functions are being used
$functionSources = [];
$functionSources['getDB_exists'] = function_exists('getDB');
$functionSources['verifyToken_exists'] = function_exists('verifyToken');
$functionSources['requireAuth_exists'] = function_exists('requireAuth');

echo json_encode([
    'headers_found' => $headers,
    'auth_header_used' => $authHeader ? substr($authHeader, 0, 50) . '...' : 'NONE',
    'token_extracted' => $token ? 'YES (' . strlen($token) . ' chars)' : 'NO',
    'verification' => $verified,
    'verify_error' => $verifyError,
    'function_checks' => $functionSources,
    'php_version' => PHP_VERSION,
], JSON_PRETTY_PRINT);
