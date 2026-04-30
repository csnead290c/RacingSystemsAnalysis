<?php
/**
 * Tech Master — shared helpers for tm-*.php API files
 *
 * Provides UUID generation, auth gates, and common query patterns.
 */

require_once __DIR__ . '/capabilities.php';

/**
 * Generate a UUIDv4 string.
 */
function tm_uuid(): string {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Require auth + nhra.tech.read capability. Returns user ID.
 */
function tm_requireRead(PDO $pdo, array $auth): int {
    return rsa_requireAuthAndCap($pdo, $auth, 'nhra.tech.read');
}

/**
 * Require auth + nhra.tech.admin capability. Returns user ID.
 */
function tm_requireAdmin(PDO $pdo, array $auth): int {
    return rsa_requireAuthAndCap($pdo, $auth, 'nhra.tech.admin');
}

/**
 * Standard JSON error response and exit.
 */
function tm_error(string $message, int $status = 400): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode(['error' => $message]);
    exit;
}

/**
 * Standard JSON success response and exit.
 */
function tm_json(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Read JSON body from POST request.
 */
function tm_readBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        tm_error('Invalid JSON body', 400);
    }
    return $data;
}

/**
 * Require a string param from associative array, or error.
 */
function tm_requireParam(array $data, string $key): string {
    $val = $data[$key] ?? null;
    if ($val === null || $val === '') {
        tm_error("Missing required parameter: $key", 400);
    }
    return (string)$val;
}

/**
 * Optional string param with default.
 */
function tm_optionalParam(array $data, string $key, ?string $default = null): ?string {
    return isset($data[$key]) && $data[$key] !== '' ? (string)$data[$key] : $default;
}

/**
 * Optional int param with default.
 */
function tm_optionalInt(array $data, string $key, ?int $default = null): ?int {
    return isset($data[$key]) && $data[$key] !== '' ? (int)$data[$key] : $default;
}
