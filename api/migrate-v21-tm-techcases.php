<?php
/**
 * Migration v21: Tech Master Tech Cases — tech_cases, tech_findings, tech_attachments
 *
 * Part of the NHRA Tech Master Phase 1 backbone.
 * Creates the shared inspection/finding/attachment pipeline.
 *
 * Safe to run multiple times (CREATE TABLE IF NOT EXISTS).
 * Depends on: v20 (event_entries)
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

echo "=== Migration v21: Tech Master Tech Cases ===\n\n";
flush();

// ── 1. tech_cases ───────────────────────────────────────────────────────

echo "1. Creating tech_cases table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tech_cases (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            uuid             VARCHAR(36) NOT NULL,
            event_entry_id   INT NOT NULL,
            case_type        VARCHAR(50) NOT NULL,
            status           ENUM('open','in_progress','closed','cancelled') NOT NULL DEFAULT 'open',
            opened_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            closed_at        DATETIME NULL,
            operator_id      INT NULL,
            location         VARCHAR(100) NULL,
            summary          VARCHAR(500) NULL,
            notes            TEXT NULL,
            created_by       INT NOT NULL,
            created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_tc_uuid (uuid),
            INDEX idx_tc_entry (event_entry_id),
            INDEX idx_tc_type (case_type),
            INDEX idx_tc_status (status),
            INDEX idx_tc_opened (opened_at),
            INDEX idx_tc_operator (operator_id),
            CONSTRAINT fk_tc_entry FOREIGN KEY (event_entry_id) REFERENCES event_entries(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 2. tech_findings ────────────────────────────────────────────────────

echo "2. Creating tech_findings table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tech_findings (
            id                INT AUTO_INCREMENT PRIMARY KEY,
            uuid              VARCHAR(36) NOT NULL,
            tech_case_id      INT NOT NULL,
            finding_type      VARCHAR(50) NOT NULL,
            severity          ENUM('info','low','medium','high','critical') NOT NULL DEFAULT 'info',
            description       TEXT NOT NULL,
            measured_value    VARCHAR(255) NULL,
            expected_value    VARCHAR(255) NULL,
            disposition       ENUM('open','resolved','deferred','penalized','waived') NOT NULL DEFAULT 'open',
            resolved_at       DATETIME NULL,
            resolved_by       INT NULL,
            follow_up_required TINYINT(1) NOT NULL DEFAULT 0,
            notes             TEXT NULL,
            created_by        INT NOT NULL,
            created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_tf_uuid (uuid),
            INDEX idx_tf_case (tech_case_id),
            INDEX idx_tf_type (finding_type),
            INDEX idx_tf_disposition (disposition),
            INDEX idx_tf_followup (follow_up_required),
            CONSTRAINT fk_tf_case FOREIGN KEY (tech_case_id) REFERENCES tech_cases(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 3. tech_attachments ─────────────────────────────────────────────────

echo "3. Creating tech_attachments table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tech_attachments (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            uuid            VARCHAR(36) NOT NULL,
            parent_type     VARCHAR(30) NOT NULL,
            parent_id       INT NOT NULL,
            file_name       VARCHAR(255) NOT NULL,
            file_type       VARCHAR(50) NOT NULL,
            file_path       VARCHAR(1024) NOT NULL,
            file_size_bytes INT NULL,
            caption         VARCHAR(500) NULL,
            uploaded_by     INT NOT NULL,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UNIQUE KEY uk_ta_uuid (uuid),
            INDEX idx_ta_parent (parent_type, parent_id),
            INDEX idx_ta_uploaded (uploaded_by)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v21 Complete ===\n";
echo "Tables: tech_cases, tech_findings, tech_attachments\n";
