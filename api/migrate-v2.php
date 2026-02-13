<?php
/**
 * Database Migration v2 — Normalized Subscriptions + Capabilities
 *
 * Run this ONCE to add the new tables for:
 *   - subscriptions (normalized from users table)
 *   - user_capabilities (admin grants / trials)
 *   - webhook_events (idempotency)
 *   - audit_log (accountability)
 *
 * Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN with duplicate check).
 *
 * Usage:
 *   php api/migrate-v2.php          (CLI)
 *   https://example.com/api/migrate-v2.php  (browser — protect in production!)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: text/plain');

echo "=== RSA Database Migration v2 ===\n\n";

if (!file_exists(__DIR__ . '/config.php')) {
    echo "ERROR: config.php not found!\n";
    exit(1);
}

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

echo "1. Connecting to database...\n";
try {
    $pdo = getDB();
    echo "   OK\n\n";
} catch (Exception $e) {
    echo "   FAILED: " . $e->getMessage() . "\n";
    exit(1);
}

// ── Helper ──────────────────────────────────────────────────────────────

function addColumnSafe(PDO $pdo, string $table, string $colDef): void {
    $colName = explode(' ', trim($colDef))[0];
    try {
        $pdo->exec("ALTER TABLE $table ADD COLUMN $colDef");
        echo "   Added column: $table.$colName\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "   Exists: $table.$colName\n";
        } else {
            throw $e;
        }
    }
}

function addIndexSafe(PDO $pdo, string $name, string $ddl): void {
    try {
        $pdo->exec($ddl);
        echo "   Added index: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "   Exists: $name\n";
        } else {
            throw $e;
        }
    }
}

// ── 2. capability_version on users ──────────────────────────────────────

echo "2. Adding capability_version to users...\n";
addColumnSafe($pdo, 'users', 'capability_version INT DEFAULT 1');
addColumnSafe($pdo, 'users', 'last_capability_sync TIMESTAMP NULL');
echo "   OK\n\n";

// ── 3. subscriptions table ──────────────────────────────────────────────

echo "3. Creating subscriptions table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS subscriptions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            stripe_subscription_id VARCHAR(255) NOT NULL,
            stripe_customer_id VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL DEFAULT 'active',
            plan_id VARCHAR(50) NOT NULL,
            price_id VARCHAR(255) NOT NULL DEFAULT '',
            billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly',
            current_period_start TIMESTAMP NULL,
            current_period_end TIMESTAMP NULL,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            canceled_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

            UNIQUE KEY uk_stripe_sub (stripe_subscription_id),
            INDEX idx_sub_user (user_id),
            INDEX idx_sub_status (status),
            INDEX idx_sub_stripe_customer (stripe_customer_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 4. user_capabilities table ──────────────────────────────────────────

echo "4. Creating user_capabilities table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_capabilities (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            capability_key VARCHAR(100) NOT NULL,
            source VARCHAR(50) NOT NULL DEFAULT 'admin_grant',
            granted_by INT NULL,
            reason VARCHAR(500) NULL,
            expires_at TIMESTAMP NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_ucap_user (user_id),
            INDEX idx_ucap_expires (expires_at),
            UNIQUE KEY uk_user_cap (user_id, capability_key, source),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 5. webhook_events table ─────────────────────────────────────────────

echo "5. Creating webhook_events table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS webhook_events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            stripe_event_id VARCHAR(255) NOT NULL,
            event_type VARCHAR(100) NOT NULL,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            payload JSON NULL,
            error TEXT NULL,

            UNIQUE KEY uk_event (stripe_event_id),
            INDEX idx_we_type (event_type),
            INDEX idx_we_processed (processed_at)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 6. audit_log table ──────────────────────────────────────────────────

echo "6. Creating audit_log table...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS audit_log (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            actor_user_id INT NULL,
            action VARCHAR(100) NOT NULL,
            target_user_id INT NULL,
            metadata JSON NULL,
            ip_address VARCHAR(45) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            INDEX idx_al_actor (actor_user_id),
            INDEX idx_al_target (target_user_id),
            INDEX idx_al_action (action),
            INDEX idx_al_created (created_at)
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 7. Backfill subscriptions from users table ──────────────────────────

echo "7. Backfilling subscriptions from users table...\n";
try {
    $stmt = $pdo->query("
        SELECT id, stripe_customer_id, subscription_id, subscription_plan,
               subscription_status, subscription_period_end
        FROM users
        WHERE subscription_id IS NOT NULL
          AND subscription_id != ''
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $inserted = 0;
    $skipped = 0;

    foreach ($rows as $row) {
        // Check if already backfilled
        $check = $pdo->prepare("SELECT id FROM subscriptions WHERE stripe_subscription_id = ?");
        $check->execute([$row['subscription_id']]);
        if ($check->fetch()) {
            $skipped++;
            continue;
        }

        $ins = $pdo->prepare("
            INSERT INTO subscriptions
                (user_id, stripe_subscription_id, stripe_customer_id, status, plan_id,
                 current_period_end)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $row['id'],
            $row['subscription_id'],
            $row['stripe_customer_id'] ?? '',
            $row['subscription_status'] ?? 'active',
            $row['subscription_plan'] ?? 'free',
            $row['subscription_period_end'],
        ]);
        $inserted++;
    }

    echo "   Backfilled: $inserted new, $skipped already existed\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

// ── 8. Feature flags table (optional) ───────────────────────────────────

echo "8. Creating feature_flags table (optional)...\n";
try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS feature_flags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            flag_key VARCHAR(100) UNIQUE NOT NULL,
            enabled BOOLEAN DEFAULT FALSE,
            targeting_rules JSON NULL,
            description VARCHAR(500) NULL,
            updated_by INT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    echo "   OK\n\n";
} catch (PDOException $e) {
    echo "   FAILED: " . $e->getMessage() . "\n\n";
}

echo "=== Migration v2 Complete ===\n";
echo "Tables: subscriptions, user_capabilities, webhook_events, audit_log, feature_flags\n";
echo "Columns: users.capability_version, users.last_capability_sync\n";
