<?php
/**
 * Migration v19: Tech Master Identities — persons, organizations, vehicle_assets, components
 *
 * Part of the NHRA Tech Master Phase 1 backbone.
 * Creates the four long-lived identity tables.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Depends on: nothing directly (but logically follows v17/v18)
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$auth = rsa_getAuthUser();
if (!$auth || !in_array($auth['role'] ?? '', ['admin', 'owner'])) {
    http_response_code(403);
    echo "Forbidden: admin role required.\n";
    exit(1);
}

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "=== Migration v19: Tech Master Identities ===\n\n";
flush();

// ── 1. persons ──────────────────────────────────────────────────────────

echo "1. Creating persons table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS persons (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            uuid             VARCHAR(36) NOT NULL,
            display_name     VARCHAR(255) NOT NULL,
            normalized_name  VARCHAR(255) NOT NULL,
            first_name       VARCHAR(100) NULL,
            last_name        VARCHAR(100) NULL,
            nhra_license_id  VARCHAR(100) NULL,
            person_type      VARCHAR(100) NOT NULL DEFAULT 'driver',
            status           ENUM('active','inactive','deceased') NOT NULL DEFAULT 'active',
            notes            TEXT NULL,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_p_uuid (uuid),
            INDEX idx_p_normalized (normalized_name),
            INDEX idx_p_license (nhra_license_id),
            INDEX idx_p_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. organizations ────────────────────────────────────────────────────

echo "2. Creating organizations table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS organizations (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            uuid             VARCHAR(36) NOT NULL,
            name             VARCHAR(255) NOT NULL,
            short_name       VARCHAR(100) NULL,
            nhra_entrant_id  VARCHAR(100) NULL,
            org_type         VARCHAR(50) NOT NULL DEFAULT 'team',
            status           ENUM('active','inactive','dissolved') NOT NULL DEFAULT 'active',
            notes            TEXT NULL,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_o_uuid (uuid),
            INDEX idx_o_name (name),
            INDEX idx_o_entrant (nhra_entrant_id),
            INDEX idx_o_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. vehicle_assets ───────────────────────────────────────────────────

echo "3. Creating vehicle_assets table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vehicle_assets (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            uuid             VARCHAR(36) NOT NULL,
            chassis_serial   VARCHAR(100) NULL,
            body_type        VARCHAR(100) NULL,
            description      VARCHAR(500) NULL,
            current_org_id   INT NULL,
            primary_category VARCHAR(100) NULL,
            status           ENUM('active','retired','destroyed','unknown') NOT NULL DEFAULT 'active',
            notes            TEXT NULL,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_va_uuid (uuid),
            INDEX idx_va_org (current_org_id),
            INDEX idx_va_serial (chassis_serial),
            INDEX idx_va_status (status),
            CONSTRAINT fk_va_org FOREIGN KEY (current_org_id) REFERENCES organizations(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. components ───────────────────────────────────────────────────────

echo "4. Creating components table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS components (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            uuid              VARCHAR(36) NOT NULL,
            serial_number     VARCHAR(100) NULL,
            component_type    VARCHAR(50) NOT NULL,
            manufacturer      VARCHAR(255) NULL,
            description       VARCHAR(500) NULL,
            current_vehicle_id INT NULL,
            status            ENUM('active','retired','confiscated','unknown') NOT NULL DEFAULT 'active',
            notes             TEXT NULL,
            created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_c_uuid (uuid),
            INDEX idx_c_vehicle (current_vehicle_id),
            INDEX idx_c_serial_type (component_type, serial_number),
            INDEX idx_c_status (status),
            CONSTRAINT fk_c_vehicle FOREIGN KEY (current_vehicle_id) REFERENCES vehicle_assets(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v19 Complete ===\n";
echo "Tables: persons, organizations, vehicle_assets, components\n";
