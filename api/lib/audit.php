<?php
/**
 * Audit Logging Helper
 *
 * Records admin actions, subscription changes, and security events
 * to the audit_log table for accountability and debugging.
 *
 * Usage:
 *   require_once __DIR__ . '/lib/audit.php';
 *   rsa_auditLog($pdo, $actorUserId, 'capability.granted', $targetUserId, [
 *       'capability' => 'engine.proMode',
 *       'expires_at' => '2026-03-13',
 *       'reason' => 'Beta tester',
 *   ]);
 */

/**
 * Write an entry to the audit log.
 *
 * @param PDO      $pdo           Database connection
 * @param int|null $actorUserId   Who performed the action (NULL for system/webhook)
 * @param string   $action        Action identifier (dot-namespaced)
 * @param int|null $targetUserId  Who was affected (NULL for system-wide actions)
 * @param array    $metadata      Action-specific details (stored as JSON)
 */
function rsa_auditLog(
    PDO $pdo,
    ?int $actorUserId,
    string $action,
    ?int $targetUserId = null,
    array $metadata = []
): void {
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;

        $stmt = $pdo->prepare("
            INSERT INTO audit_log (actor_user_id, action, target_user_id, metadata, ip_address)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $actorUserId,
            $action,
            $targetUserId,
            !empty($metadata) ? json_encode($metadata) : null,
            $ip,
        ]);
    } catch (PDOException $e) {
        // Audit logging should never break the main flow.
        // Log to error_log as fallback.
        error_log("AUDIT_LOG_FAILED: actor=$actorUserId action=$action target=$targetUserId error=" . $e->getMessage());
    }
}

// ============================================================================
// Standard action constants (use these for consistency)
// ============================================================================

// Subscription lifecycle
const AUDIT_SUBSCRIPTION_CREATED   = 'subscription.created';
const AUDIT_SUBSCRIPTION_UPDATED   = 'subscription.updated';
const AUDIT_SUBSCRIPTION_CANCELED  = 'subscription.canceled';
const AUDIT_SUBSCRIPTION_RENEWED   = 'subscription.renewed';
const AUDIT_PAYMENT_FAILED         = 'subscription.payment_failed';

// Capability overrides
const AUDIT_CAPABILITY_GRANTED     = 'capability.granted';
const AUDIT_CAPABILITY_REVOKED     = 'capability.revoked';
const AUDIT_CAPABILITY_EXPIRED     = 'capability.expired';

// Admin actions
const AUDIT_ADMIN_USER_UPDATED     = 'admin.user.updated';
const AUDIT_ADMIN_ROLE_CHANGED     = 'admin.role.changed';
const AUDIT_ADMIN_USER_DELETED     = 'admin.user.deleted';

// Plan capabilities
const AUDIT_PLAN_CAPABILITIES_UPDATED = 'plan.capabilities.updated';

// Auth events
const AUDIT_AUTH_LOGIN              = 'auth.login';
const AUDIT_AUTH_REGISTER           = 'auth.register';
const AUDIT_AUTH_CLERK_SYNC         = 'auth.clerk_sync';
