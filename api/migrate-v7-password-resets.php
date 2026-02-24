<?php
/**
 * Migration v7: Password Resets + Rate Limits tables
 * Safe to re-run — uses IF NOT EXISTS.
 *
 * Run: php api/migrate-v7-password-resets.php
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

$pdo = getDB();

echo "=== Migration v7: password_resets + rate_limits ===\n\n";

// ── password_resets ───────────────────────────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS password_resets (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL,
        token_hash  VARCHAR(128) NOT NULL,
        expires_at  DATETIME NOT NULL,
        used_at     DATETIME DEFAULT NULL,
        request_ip  VARCHAR(45) DEFAULT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pr_token (token_hash),
        INDEX idx_pr_user (user_id),
        INDEX idx_pr_expires (expires_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
echo "✓ password_resets table ready\n";

// ── rate_limits ───────────────────────────────────────────────────────
$pdo->exec("
    CREATE TABLE IF NOT EXISTS rate_limits (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        rate_key    VARCHAR(255) NOT NULL,
        attempts    INT NOT NULL DEFAULT 1,
        window_start DATETIME NOT NULL,
        INDEX idx_rl_key (rate_key),
        INDEX idx_rl_window (window_start)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
echo "✓ rate_limits table ready\n";

echo "\nMigration v7 complete.\n";
