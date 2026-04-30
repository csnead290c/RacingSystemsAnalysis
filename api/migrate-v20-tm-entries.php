<?php
/**
 * Migration v20: Tech Master Entries — event_entries, event_entry_changes,
 *                org_memberships, vehicle_org_assignments
 *
 * Part of the NHRA Tech Master Phase 1 backbone.
 * Creates the operational junction table and history/assignment tables.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Depends on: v18 (event_instances), v19 (persons, organizations, vehicle_assets)
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

echo "=== Migration v20: Tech Master Entries ===\n\n";
flush();

// ── 1. event_entries ────────────────────────────────────────────────────

echo "1. Creating event_entries table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS event_entries (
            id                  INT AUTO_INCREMENT PRIMARY KEY,
            uuid                VARCHAR(36) NOT NULL,
            event_instance_id   INT NOT NULL,
            person_id           INT NULL,
            org_id              INT NULL,
            vehicle_id          INT NULL,
            category            VARCHAR(100) NULL,
            class_index         VARCHAR(100) NULL,
            competition_number  VARCHAR(20) NULL,
            entry_status        ENUM('registered','active','withdrawn','disqualified') NOT NULL DEFAULT 'registered',
            notes               TEXT NULL,
            created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_ee_uuid (uuid),
            INDEX idx_ee_event (event_instance_id),
            INDEX idx_ee_person (person_id),
            INDEX idx_ee_org (org_id),
            INDEX idx_ee_vehicle (vehicle_id),
            INDEX idx_ee_event_class (event_instance_id, class_index),
            CONSTRAINT fk_ee_event FOREIGN KEY (event_instance_id) REFERENCES event_instances(id),
            CONSTRAINT fk_ee_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL,
            CONSTRAINT fk_ee_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE SET NULL,
            CONSTRAINT fk_ee_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle_assets(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. event_entry_changes ──────────────────────────────────────────────

echo "2. Creating event_entry_changes table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS event_entry_changes (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            event_entry_id  INT NOT NULL,
            field_name      VARCHAR(50) NOT NULL,
            old_value       VARCHAR(255) NULL,
            new_value       VARCHAR(255) NULL,
            reason          VARCHAR(500) NULL,
            changed_by      INT NULL,
            changed_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_eec_entry (event_entry_id),
            INDEX idx_eec_changed (changed_at),
            CONSTRAINT fk_eec_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. org_memberships ──────────────────────────────────────────────────

echo "3. Creating org_memberships table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS org_memberships (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            person_id       INT NOT NULL,
            org_id          INT NOT NULL,
            role            VARCHAR(50) NOT NULL DEFAULT 'driver',
            effective_from  DATE NOT NULL,
            effective_to    DATE NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_om_person (person_id),
            INDEX idx_om_org (org_id),
            INDEX idx_om_dates (effective_from, effective_to),
            CONSTRAINT fk_om_person FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
            CONSTRAINT fk_om_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. vehicle_org_assignments ──────────────────────────────────────────

echo "4. Creating vehicle_org_assignments table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS vehicle_org_assignments (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            vehicle_id      INT NOT NULL,
            org_id          INT NOT NULL,
            effective_from  DATE NOT NULL,
            effective_to    DATE NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_voa_vehicle (vehicle_id),
            INDEX idx_voa_org (org_id),
            CONSTRAINT fk_voa_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicle_assets(id) ON DELETE CASCADE,
            CONSTRAINT fk_voa_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v20 Complete ===\n";
echo "Tables: event_entries, event_entry_changes, org_memberships, vehicle_org_assignments\n";
