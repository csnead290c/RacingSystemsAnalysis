<?php
/**
 * E2E Test Database Setup
 * 
 * Seeds the database with test data needed for E2E auth/access tests:
 * - Valid NHRA invite code
 * - Expired invite code
 * - Revoked invite code
 * - Cleans up test users from previous runs
 * 
 * Run this before E2E tests to ensure deterministic state.
 */

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/functions.php';

// Only allow running from CLI or with special header
if (php_sapi_name() !== 'cli' && !isset($_SERVER['HTTP_X_E2E_TEST_SETUP'])) {
    http_response_code(403);
    die('Access denied');
}

try {
    $pdo = getDB();
    
    echo "=== E2E Test Database Setup ===\n\n";
    
    // 1. Clean up test users from previous runs
    echo "1. Cleaning up test users...\n";
    $stmt = $pdo->prepare("DELETE FROM users WHERE email LIKE '%@test.rsa.local'");
    $stmt->execute();
    $deletedUsers = $stmt->rowCount();
    echo "   Deleted $deletedUsers test users\n\n";
    
    // 2. Clean up test invite codes
    echo "2. Cleaning up old test invite codes...\n";
    $stmt = $pdo->prepare("DELETE FROM invite_codes WHERE code LIKE 'nhra_E2E_TEST_%'");
    $stmt->execute();
    $deletedInvites = $stmt->rowCount();
    echo "   Deleted $deletedInvites old test invite codes\n\n";
    
    // 3. Create valid NHRA invite code for testing
    echo "3. Creating valid NHRA invite code...\n";
    $validCode = 'nhra_E2E_TEST_VALID_2026';
    $stmt = $pdo->prepare("
        INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, is_active, created_by, created_at)
        VALUES (?, 'nhra', 999, 0, DATE_ADD(NOW(), INTERVAL 1 YEAR), 1, 1, NOW())
    ");
    $stmt->execute([$validCode]);
    echo "   Created: $validCode (expires in 1 year, max 999 uses)\n\n";
    
    // 4. Create expired NHRA invite code for testing
    echo "4. Creating expired NHRA invite code...\n";
    $expiredCode = 'nhra_E2E_TEST_EXPIRED_2026';
    $stmt = $pdo->prepare("
        INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, is_active, created_by, created_at)
        VALUES (?, 'nhra', 999, 0, DATE_SUB(NOW(), INTERVAL 1 DAY), 1, 1, NOW())
    ");
    $stmt->execute([$expiredCode]);
    echo "   Created: $expiredCode (expired yesterday)\n\n";
    
    // 5. Create revoked NHRA invite code for testing
    echo "5. Creating revoked NHRA invite code...\n";
    $revokedCode = 'nhra_E2E_TEST_REVOKED_2026';
    $stmt = $pdo->prepare("
        INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, revoked_at, is_active, created_by, created_at)
        VALUES (?, 'nhra', 999, 0, DATE_ADD(NOW(), INTERVAL 1 YEAR), NOW(), 0, 1, NOW())
    ");
    $stmt->execute([$revokedCode]);
    echo "   Created: $revokedCode (revoked)\n\n";
    
    // 6. Create max-uses NHRA invite code for testing
    echo "6. Creating max-uses NHRA invite code...\n";
    $maxUsesCode = 'nhra_E2E_TEST_MAXUSES_2026';
    $stmt = $pdo->prepare("
        INSERT INTO invite_codes (code, plan, max_uses, uses_count, expires_at, is_active, created_by, created_at)
        VALUES (?, 'nhra', 1, 1, DATE_ADD(NOW(), INTERVAL 1 YEAR), 1, 1, NOW())
    ");
    $stmt->execute([$maxUsesCode]);
    echo "   Created: $maxUsesCode (1/1 uses)\n\n";
    
    // 7. Verify setup
    echo "7. Verifying setup...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM invite_codes WHERE code LIKE 'nhra_E2E_TEST_%'");
    $result = $stmt->fetch();
    echo "   Total test invite codes: {$result['count']}\n\n";
    
    echo "=== E2E Test Database Setup Complete ===\n";
    echo "\nTest invite codes ready:\n";
    echo "  Valid:    $validCode\n";
    echo "  Expired:  $expiredCode\n";
    echo "  Revoked:  $revokedCode\n";
    echo "  Max uses: $maxUsesCode\n";
    echo "\nYou can now run: npm run test:e2e\n";
    
    if (php_sapi_name() !== 'cli') {
        rsa_jsonResponse([
            'success' => true,
            'message' => 'E2E test database setup complete',
            'invite_codes' => [
                'valid' => $validCode,
                'expired' => $expiredCode,
                'revoked' => $revokedCode,
                'max_uses' => $maxUsesCode,
            ]
        ]);
    }
    
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    if (php_sapi_name() !== 'cli') {
        rsa_jsonResponse(['error' => $e->getMessage()], 500);
    }
    exit(1);
}
