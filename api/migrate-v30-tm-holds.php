<?php
/**
 * Migration v30: Tech Master Entry Holds + Escalation
 * Batch 11: Dossier Print/Export + Compliance Escalation Workflow
 *
 * Creates:
 * - entry_holds: lightweight hold/escalation state per entry
 * - entry_hold_history: audit trail for hold placement/removal
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Depends on: v29 (required_module_config, finding_status_history)
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

echo "=== Migration v30 — Entry Holds + Escalation ===\n\n";
flush();

// ── 1. entry_holds ──────────────────────────────────────────────────────

echo "1. Creating entry_holds table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS entry_holds (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            event_entry_id    INT NOT NULL,
            hold_type         ENUM('compliance_hold','tech_hold','escalation','flag') NOT NULL DEFAULT 'tech_hold',
            reason            VARCHAR(500) NOT NULL,
            notes             TEXT NULL,
            placed_by         INT NOT NULL,
            placed_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            cleared_by        INT NULL,
            cleared_at        DATETIME NULL,
            is_active         TINYINT(1) NOT NULL DEFAULT 1,
            created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            INDEX idx_eh_entry (event_entry_id),
            INDEX idx_eh_active (is_active),
            INDEX idx_eh_type (hold_type),
            INDEX idx_eh_placed (placed_at),
            CONSTRAINT fk_eh_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. entry_hold_history ───────────────────────────────────────────────

echo "2. Creating entry_hold_history table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS entry_hold_history (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            entry_hold_id     INT NOT NULL,
            action            ENUM('placed','cleared','modified') NOT NULL,
            old_reason        VARCHAR(500) NULL,
            new_reason        VARCHAR(500) NULL,
            notes             TEXT NULL,
            changed_by        INT NOT NULL,
            changed_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_ehh_hold (entry_hold_id),
            INDEX idx_ehh_action (action),
            INDEX idx_ehh_changed (changed_at),
            CONSTRAINT fk_ehh_hold FOREIGN KEY (entry_hold_id) REFERENCES entry_holds(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v30 complete ===\n";
