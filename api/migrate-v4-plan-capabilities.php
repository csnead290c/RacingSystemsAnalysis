<?php
/**
 * Migration v4: plan_capabilities table
 *
 * Creates a DB-backed plan→capability mapping table so admins can
 * edit tier entitlements from the Admin Portal without code deploys.
 *
 * Seeds the table from the current code-level PLAN_CAPABILITIES mapping.
 *
 * Usage:
 *   php api/migrate-v4-plan-capabilities.php
 *
 * Safe to re-run (idempotent — uses IF NOT EXISTS and INSERT IGNORE).
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/capabilities.php';

$pdo = getDB();

echo "=== Migration v4: plan_capabilities table ===\n\n";

// 1. Create table
echo "Creating plan_capabilities table...\n";
$pdo->exec("
    CREATE TABLE IF NOT EXISTS plan_capabilities (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        plan_id     VARCHAR(32)  NOT NULL,
        capability_key VARCHAR(64) NOT NULL,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_plan_cap (plan_id, capability_key),
        INDEX idx_plan_id (plan_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
");
echo "  ✓ plan_capabilities table ready\n\n";

// 2. Seed from code-level PLAN_CAPABILITIES (INSERT IGNORE = idempotent)
echo "Seeding from code-level PLAN_CAPABILITIES...\n";
$insertStmt = $pdo->prepare("
    INSERT IGNORE INTO plan_capabilities (plan_id, capability_key)
    VALUES (?, ?)
");

$seeded = 0;
foreach (PLAN_CAPABILITIES as $planId => $caps) {
    foreach ($caps as $cap) {
        $insertStmt->execute([$planId, $cap]);
        if ($insertStmt->rowCount() > 0) {
            $seeded++;
        }
    }
    $count = count($caps);
    echo "  {$planId}: {$count} capabilities\n";
}
echo "  ✓ Seeded {$seeded} new rows (existing rows preserved)\n\n";

// 3. Verify
$stmt = $pdo->query("SELECT plan_id, COUNT(*) as cnt FROM plan_capabilities GROUP BY plan_id ORDER BY plan_id");
echo "Current plan_capabilities state:\n";
while ($row = $stmt->fetch()) {
    echo "  {$row['plan_id']}: {$row['cnt']} capabilities\n";
}

echo "\n=== Migration v4 complete ===\n";
