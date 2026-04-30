<?php
/**
 * Migration v32: User Plans & NHRA Invite Codes
 * 
 * Adds explicit plan column to users table and creates invite code system
 * for NHRA Parity registration.
 */

require_once __DIR__ . '/config.php';

$pdo = getDB();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Running migration v32: User Plans & NHRA Invite Codes\n";

try {
    $pdo->beginTransaction();
    
    // ========================================================================
    // 1. Add plan column to users table
    // ========================================================================
    
    echo "Adding plan column to users table...\n";
    
    // Check if column already exists
    $stmt = $pdo->query("PRAGMA table_info(users)");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $hasPlan = false;
    foreach ($columns as $col) {
        if ($col['name'] === 'plan') {
            $hasPlan = true;
            break;
        }
    }
    
    if (!$hasPlan) {
        $pdo->exec("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'");
        echo "  ✓ Added plan column\n";
    } else {
        echo "  ℹ Plan column already exists\n";
    }
    
    // ========================================================================
    // 2. Backfill plan for existing users
    // ========================================================================
    
    echo "Backfilling plan for existing users...\n";
    
    // Free users (role='user', no products)
    $stmt = $pdo->exec("
        UPDATE users 
        SET plan = 'free' 
        WHERE role = 'user' 
        AND (products = '[]' OR products IS NULL OR products = '')
        AND plan = 'free'
    ");
    echo "  ✓ Set {$stmt} users to free plan\n";
    
    // Owner/admin keep their roles (fullAccess=true, plan doesn't matter)
    // Beta users - keep as-is for now (legacy)
    
    // ========================================================================
    // 3. Create invite_codes table
    // ========================================================================
    
    echo "Creating invite_codes table...\n";
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invite_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            plan TEXT NOT NULL,
            max_uses INTEGER DEFAULT 1,
            uses_count INTEGER DEFAULT 0,
            expires_at TEXT,
            created_by INTEGER,
            created_at TEXT DEFAULT (datetime('now')),
            revoked_at TEXT,
            notes TEXT,
            FOREIGN KEY (created_by) REFERENCES users(id)
        )
    ");
    
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_invite_code ON invite_codes(code)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_invite_plan ON invite_codes(plan)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_invite_expires ON invite_codes(expires_at)");
    
    echo "  ✓ Created invite_codes table\n";
    
    // ========================================================================
    // 4. Create invite_code_uses table (audit trail)
    // ========================================================================
    
    echo "Creating invite_code_uses table...\n";
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS invite_code_uses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invite_code_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            used_at TEXT DEFAULT (datetime('now')),
            ip_address TEXT,
            user_agent TEXT,
            FOREIGN KEY (invite_code_id) REFERENCES invite_codes(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ");
    
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_invite_use_code ON invite_code_uses(invite_code_id)");
    $pdo->exec("CREATE INDEX IF NOT EXISTS idx_invite_use_user ON invite_code_uses(user_id)");
    
    echo "  ✓ Created invite_code_uses table\n";
    
    $pdo->commit();
    
    echo "\n✅ Migration v32 completed successfully\n";
    echo "\nNext steps:\n";
    echo "1. Update backend registration to support invite codes\n";
    echo "2. Update frontend to use plan-based access\n";
    echo "3. Create admin interface for invite code management\n";
    
} catch (Exception $e) {
    $pdo->rollBack();
    echo "\n❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
