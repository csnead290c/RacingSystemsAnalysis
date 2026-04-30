<?php
/**
 * Migration v31: Admin Portal Overhaul
 * 
 * Separates user entitlements from billing, adds lifecycle management,
 * enables manual plan assignment, and creates proper admin operator console.
 * 
 * Key Changes:
 * 1. Add user lifecycle status (invited, active, suspended, deleted)
 * 2. Add billing_source (none, manual, stripe) to separate entitlement from payment
 * 3. Add assigned_plan for manual plan grants (independent of Stripe)
 * 4. Create user_invites table for invite workflow
 * 5. Create user_plan_assignments table for audit trail
 * 6. Add plan metadata (display_name, visibility, stripe_product_id)
 * 
 * Safe to re-run.
 */

ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Content-Type: text/plain; charset=utf-8');

echo "=== Migration v31: Admin Portal Overhaul ===\n\n";

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

try {
    $pdo = getDB();
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✓ Connected to database\n\n";
} catch (Exception $e) {
    die("✗ Database connection failed: " . $e->getMessage() . "\n");
}

// ============================================================================
// STEP 1: Add user lifecycle and billing source columns
// ============================================================================

echo "STEP 1: Adding user lifecycle columns...\n";

$userColumns = [
    "status ENUM('invited', 'active', 'suspended', 'deleted') DEFAULT 'active' AFTER role",
    "billing_source ENUM('none', 'manual', 'stripe') DEFAULT 'none' AFTER subscription_period_end",
    "assigned_plan VARCHAR(50) DEFAULT NULL AFTER billing_source",
    "assigned_plan_expires_at TIMESTAMP NULL DEFAULT NULL AFTER assigned_plan",
    "assigned_by INT NULL DEFAULT NULL AFTER assigned_plan_expires_at",
    "suspended_at TIMESTAMP NULL DEFAULT NULL AFTER assigned_by",
    "suspended_by INT NULL DEFAULT NULL AFTER suspended_at",
    "suspended_reason TEXT NULL DEFAULT NULL AFTER suspended_by",
    "deleted_at TIMESTAMP NULL DEFAULT NULL AFTER suspended_reason",
    "deleted_by INT NULL DEFAULT NULL AFTER deleted_at",
    "invite_token VARCHAR(64) NULL DEFAULT NULL AFTER deleted_by",
    "invite_expires_at TIMESTAMP NULL DEFAULT NULL AFTER invite_token",
    "invited_by INT NULL DEFAULT NULL AFTER invite_expires_at",
];

foreach ($userColumns as $col) {
    try {
        $pdo->exec("ALTER TABLE users ADD COLUMN $col");
        echo "  ✓ Added: " . explode(' ', $col)[0] . "\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            echo "  - Exists: " . explode(' ', $col)[0] . "\n";
        } else {
            echo "  ✗ Failed: " . explode(' ', $col)[0] . " - " . $e->getMessage() . "\n";
        }
    }
}

// Migrate existing users to 'active' status and set billing_source based on stripe_customer_id
echo "\n  Migrating existing users...\n";
try {
    $pdo->exec("UPDATE users SET status = 'active' WHERE status IS NULL");
    echo "  ✓ Set all NULL status to 'active'\n";
    
    $pdo->exec("UPDATE users SET billing_source = 'stripe' WHERE stripe_customer_id IS NOT NULL AND billing_source = 'none'");
    echo "  ✓ Set billing_source='stripe' for users with Stripe customer ID\n";
    
    // If they have a subscription_plan but no Stripe, mark as manual
    $pdo->exec("UPDATE users SET billing_source = 'manual' WHERE subscription_plan IS NOT NULL AND stripe_customer_id IS NULL AND billing_source = 'none'");
    echo "  ✓ Set billing_source='manual' for users with plan but no Stripe\n";
} catch (PDOException $e) {
    echo "  ✗ Migration failed: " . $e->getMessage() . "\n";
}

// Add indexes
echo "\n  Adding indexes...\n";
$userIndexes = [
    "idx_users_status" => "status",
    "idx_users_billing_source" => "billing_source",
    "idx_users_assigned_plan" => "assigned_plan",
    "idx_users_invite_token" => "invite_token",
];

foreach ($userIndexes as $name => $cols) {
    try {
        $pdo->exec("CREATE INDEX $name ON users($cols)");
        echo "  ✓ Created index: $name\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "  - Index exists: $name\n";
        } else {
            echo "  ✗ Failed: $name - " . $e->getMessage() . "\n";
        }
    }
}

// ============================================================================
// STEP 2: Create user_invites table
// ============================================================================

echo "\n\nSTEP 2: Creating user_invites table...\n";

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_invites (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            invited_by INT NOT NULL,
            assigned_role ENUM('user', 'admin', 'beta') DEFAULT 'user',
            assigned_plan VARCHAR(50) DEFAULT NULL,
            expires_at TIMESTAMP NOT NULL,
            accepted_at TIMESTAMP NULL DEFAULT NULL,
            revoked_at TIMESTAMP NULL DEFAULT NULL,
            revoked_by INT NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ui_email (email),
            INDEX idx_ui_token (token),
            INDEX idx_ui_expires (expires_at),
            FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created user_invites table\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  - Table already exists\n";
    } else {
        echo "  ✗ Failed: " . $e->getMessage() . "\n";
    }
}

// ============================================================================
// STEP 3: Create user_plan_assignments table (audit trail)
// ============================================================================

echo "\n\nSTEP 3: Creating user_plan_assignments table...\n";

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_plan_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            plan_id VARCHAR(50) NOT NULL,
            action ENUM('assigned', 'removed', 'expired') NOT NULL,
            source ENUM('manual', 'stripe', 'invite', 'system') NOT NULL,
            assigned_by INT NULL DEFAULT NULL,
            reason TEXT NULL DEFAULT NULL,
            expires_at TIMESTAMP NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_upa_user (user_id),
            INDEX idx_upa_plan (plan_id),
            INDEX idx_upa_action (action),
            INDEX idx_upa_created (created_at),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created user_plan_assignments table\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  - Table already exists\n";
    } else {
        echo "  ✗ Failed: " . $e->getMessage() . "\n";
    }
}

// ============================================================================
// STEP 4: Create plans table (if using DB-backed plans)
// ============================================================================

echo "\n\nSTEP 4: Creating/updating plans table...\n";

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS plans (
            id INT AUTO_INCREMENT PRIMARY KEY,
            plan_id VARCHAR(50) UNIQUE NOT NULL,
            display_name VARCHAR(100) NOT NULL,
            description TEXT NULL DEFAULT NULL,
            visibility ENUM('public', 'internal', 'hidden', 'archived') DEFAULT 'public',
            stripe_product_id VARCHAR(100) NULL DEFAULT NULL,
            stripe_price_id VARCHAR(100) NULL DEFAULT NULL,
            monthly_price_cents INT NULL DEFAULT NULL,
            sort_order INT DEFAULT 0,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_plans_visibility (visibility),
            INDEX idx_plans_active (is_active),
            INDEX idx_plans_sort (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created plans table\n";
    
    // Seed default plans if table is empty
    $count = $pdo->query("SELECT COUNT(*) FROM plans")->fetchColumn();
    if ($count == 0) {
        echo "  Seeding default plans...\n";
        $defaultPlans = [
            ['free', 'Free', 'Basic features for casual users', 'public', NULL, NULL, 0, 0],
            ['basic', 'Basic', 'Essential features for regular users', 'public', NULL, NULL, 999, 1],
            ['pro', 'Pro', 'Advanced features for serious racers', 'public', NULL, NULL, 1999, 2],
            ['team', 'Team', 'Multi-user team features', 'public', NULL, NULL, 4999, 3],
            ['nhra', 'NHRA', 'Internal NHRA tech inspector access', 'internal', NULL, NULL, NULL, 4],
        ];
        
        $stmt = $pdo->prepare("
            INSERT INTO plans (plan_id, display_name, description, visibility, stripe_product_id, stripe_price_id, monthly_price_cents, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        foreach ($defaultPlans as $plan) {
            $stmt->execute($plan);
            echo "    ✓ Seeded: {$plan[0]}\n";
        }
    } else {
        echo "  - Plans already seeded ($count plans exist)\n";
    }
    
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  - Table already exists\n";
    } else {
        echo "  ✗ Failed: " . $e->getMessage() . "\n";
    }
}

// Add columns to existing plans table if needed
$planColumns = [
    "display_name VARCHAR(100) DEFAULT NULL AFTER plan_id",
    "description TEXT NULL DEFAULT NULL AFTER display_name",
    "visibility ENUM('public', 'internal', 'hidden', 'archived') DEFAULT 'public' AFTER description",
    "stripe_product_id VARCHAR(100) NULL DEFAULT NULL AFTER visibility",
    "stripe_price_id VARCHAR(100) NULL DEFAULT NULL AFTER stripe_product_id",
    "monthly_price_cents INT NULL DEFAULT NULL AFTER stripe_price_id",
    "sort_order INT DEFAULT 0 AFTER monthly_price_cents",
    "is_active BOOLEAN DEFAULT TRUE AFTER sort_order",
];

foreach ($planColumns as $col) {
    try {
        $pdo->exec("ALTER TABLE plans ADD COLUMN $col");
        echo "  ✓ Added to plans: " . explode(' ', $col)[0] . "\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column') !== false) {
            // Column exists, skip
        } elseif (strpos($e->getMessage(), "doesn't exist") !== false) {
            // Table doesn't exist, skip (already handled above)
        } else {
            echo "  ✗ Failed: " . explode(' ', $col)[0] . " - " . $e->getMessage() . "\n";
        }
    }
}

// ============================================================================
// STEP 5: Update plan_capabilities table to reference plans table
// ============================================================================

echo "\n\nSTEP 5: Ensuring plan_capabilities table...\n";

try {
    // Check if plan_capabilities exists
    $tables = $pdo->query("SHOW TABLES LIKE 'plan_capabilities'")->fetchAll();
    if (count($tables) > 0) {
        echo "  ✓ plan_capabilities table exists\n";
    } else {
        echo "  Creating plan_capabilities table...\n";
        $pdo->exec("
            CREATE TABLE plan_capabilities (
                id INT AUTO_INCREMENT PRIMARY KEY,
                plan_id VARCHAR(50) NOT NULL,
                capability_key VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uk_pc_plan_cap (plan_id, capability_key),
                INDEX idx_pc_plan (plan_id),
                INDEX idx_pc_cap (capability_key)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        echo "  ✓ Created plan_capabilities table\n";
    }
} catch (PDOException $e) {
    echo "  ✗ Failed: " . $e->getMessage() . "\n";
}

// ============================================================================
// STEP 6: Create admin_actions audit table
// ============================================================================

echo "\n\nSTEP 6: Creating admin_actions audit table...\n";

try {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_actions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            actor_user_id INT NOT NULL,
            action VARCHAR(100) NOT NULL,
            target_type VARCHAR(50) NULL DEFAULT NULL,
            target_id INT NULL DEFAULT NULL,
            metadata JSON NULL DEFAULT NULL,
            ip_address VARCHAR(45) NULL DEFAULT NULL,
            user_agent TEXT NULL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_aa_actor (actor_user_id),
            INDEX idx_aa_action (action),
            INDEX idx_aa_target (target_type, target_id),
            INDEX idx_aa_created (created_at),
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");
    echo "  ✓ Created admin_actions table\n";
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'already exists') !== false) {
        echo "  - Table already exists\n";
    } else {
        echo "  ✗ Failed: " . $e->getMessage() . "\n";
    }
}

// ============================================================================
// SUMMARY
// ============================================================================

echo "\n\n=== Migration v31 Complete ===\n\n";
echo "Summary:\n";
echo "  ✓ Added user lifecycle columns (status, billing_source, assigned_plan, etc.)\n";
echo "  ✓ Created user_invites table\n";
echo "  ✓ Created user_plan_assignments audit table\n";
echo "  ✓ Created/updated plans table with metadata\n";
echo "  ✓ Ensured plan_capabilities table exists\n";
echo "  ✓ Created admin_actions audit table\n";
echo "\n";
echo "Next steps:\n";
echo "  1. Deploy updated admin.php API with new endpoints\n";
echo "  2. Deploy updated AdminPortal.tsx frontend\n";
echo "  3. Test user lifecycle workflows\n";
echo "  4. Test manual plan assignment\n";
echo "\n";
