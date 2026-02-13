<?php
/**
 * Admin API Endpoints
 *
 * All endpoints require admin.access capability (server-enforced).
 * Mutation endpoints require admin.userManagement.
 *
 * Actions:
 *   - search-users:       GET  — search users by email/name
 *   - user-details:       GET  — full user details + subscription + capabilities
 *   - grant-capability:   POST — add time-limited capability override
 *   - revoke-capability:  POST — remove capability override
 *   - audit-log:          GET  — paginated audit log with filters
 */

// Suppress any stray warnings from corrupting JSON output
ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();

require_once 'config.php';
require_once 'functions.php';
require_once __DIR__ . '/lib/capabilities.php';
require_once __DIR__ . '/lib/audit.php';

rsa_setCorsHeaders();

$pdo = getDB();
$auth = rsa_requireAuth();

// Resolve user and enforce admin.access on EVERY request
$adminUserId = rsa_requireAuthAndCap($pdo, $auth, 'admin.access');

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'search-users':
        handleSearchUsers($pdo, $adminUserId);
        break;
    case 'user-details':
        handleUserDetails($pdo, $adminUserId);
        break;
    case 'grant-capability':
        handleGrantCapability($pdo, $adminUserId);
        break;
    case 'revoke-capability':
        handleRevokeCapability($pdo, $adminUserId);
        break;
    case 'audit-log':
        handleAuditLog($pdo, $adminUserId);
        break;
    case 'get-plan-capabilities':
        handleGetPlanCapabilities($pdo);
        break;
    case 'set-plan-capabilities':
        handleSetPlanCapabilities($pdo, $adminUserId);
        break;
    default:
        rsa_jsonResponse(['error' => 'Invalid action'], 400);
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * GET ?action=search-users&q=email_or_name&limit=25&offset=0
 */
function handleSearchUsers(PDO $pdo, int $adminUserId): void {
    $query = trim($_GET['q'] ?? '');
    $limit = min((int)($_GET['limit'] ?? 25), 100);
    $offset = max((int)($_GET['offset'] ?? 0), 0);

    if ($query) {
        $like = "%$query%";
        $stmt = $pdo->prepare("
            SELECT id, email, name, role, subscription_plan, subscription_status, created_at
            FROM users
            WHERE email LIKE ? OR name LIKE ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$like, $like, $limit, $offset]);
    } else {
        $stmt = $pdo->prepare("
            SELECT id, email, name, role, subscription_plan, subscription_status, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute([$limit, $offset]);
    }

    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    rsa_jsonResponse(['users' => $users, 'limit' => $limit, 'offset' => $offset]);
}

/**
 * GET ?action=user-details&id=123
 */
function handleUserDetails(PDO $pdo, int $adminUserId): void {
    $targetId = (int)($_GET['id'] ?? 0);
    if (!$targetId) {
        rsa_jsonResponse(['error' => 'User ID required'], 400);
    }

    // Basic user info
    $stmt = $pdo->prepare("
        SELECT id, email, name, role, products, preferences,
               stripe_customer_id, clerk_user_id,
               subscription_plan, subscription_status, subscription_period_end,
               created_at, updated_at
        FROM users WHERE id = ?
    ");
    $stmt->execute([$targetId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        rsa_jsonResponse(['error' => 'User not found'], 404);
    }

    $user['products'] = json_decode($user['products'] ?? '[]', true);
    $user['preferences'] = json_decode($user['preferences'] ?? '{}', true);

    // Active subscription from subscriptions table (if exists)
    $subscription = null;
    try {
        $stmt = $pdo->prepare("
            SELECT * FROM subscriptions
            WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
        ");
        $stmt->execute([$targetId]);
        $subscription = $stmt->fetch(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Table may not exist yet
    }

    // Capability overrides
    $overrides = [];
    try {
        $stmt = $pdo->prepare("
            SELECT id, capability_key, source, granted_by, reason, expires_at, created_at
            FROM user_capabilities
            WHERE user_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$targetId]);
        $overrides = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (PDOException $e) {
        // Table may not exist yet
    }

    // Computed capabilities
    $role = $user['role'] ?? 'user';
    $capabilities = rsa_computeCapabilities($pdo, $targetId, $role);

    rsa_jsonResponse([
        'user' => $user,
        'subscription' => $subscription,
        'overrides' => $overrides,
        'capabilities' => array_values($capabilities),
    ]);
}

/**
 * POST ?action=grant-capability
 * Body: { targetUserId, capabilityKey, reason, expiresInDays? }
 *
 * Requires admin.userManagement capability.
 */
function handleGrantCapability(PDO $pdo, int $adminUserId): void {
    // Require elevated permission for mutations
    $role = rsa_getUserRole($pdo, $adminUserId);
    rsa_requireCapability($pdo, $adminUserId, $role, 'admin.userManagement');

    $input = rsa_getJsonInput();
    $targetUserId = (int)($input['targetUserId'] ?? 0);
    $capKey = trim($input['capabilityKey'] ?? '');
    $reason = trim($input['reason'] ?? '');
    $expiresInDays = isset($input['expiresInDays']) ? (int)$input['expiresInDays'] : null;

    if (!$targetUserId || !$capKey) {
        rsa_jsonResponse(['error' => 'targetUserId and capabilityKey required'], 400);
    }

    // Verify target user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$targetUserId]);
    if (!$stmt->fetch()) {
        rsa_jsonResponse(['error' => 'Target user not found'], 404);
    }

    $expiresAt = $expiresInDays
        ? date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days"))
        : null;

    try {
        $stmt = $pdo->prepare("
            INSERT INTO user_capabilities (user_id, capability_key, source, granted_by, reason, expires_at)
            VALUES (?, ?, 'admin_grant', ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                granted_by = VALUES(granted_by),
                reason = VALUES(reason),
                expires_at = VALUES(expires_at)
        ");
        $stmt->execute([$targetUserId, $capKey, $adminUserId, $reason, $expiresAt]);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Failed to grant capability: ' . $e->getMessage()], 500);
    }

    // Bump capability_version so client refreshes
    $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$targetUserId]);

    // Audit log
    rsa_auditLog($pdo, $adminUserId, AUDIT_CAPABILITY_GRANTED, $targetUserId, [
        'capability' => $capKey,
        'reason' => $reason,
        'expires_at' => $expiresAt,
    ]);

    rsa_jsonResponse(['success' => true, 'granted' => $capKey, 'expiresAt' => $expiresAt]);
}

/**
 * POST ?action=revoke-capability
 * Body: { targetUserId, capabilityKey }
 *
 * Requires admin.userManagement capability.
 */
function handleRevokeCapability(PDO $pdo, int $adminUserId): void {
    $role = rsa_getUserRole($pdo, $adminUserId);
    rsa_requireCapability($pdo, $adminUserId, $role, 'admin.userManagement');

    $input = rsa_getJsonInput();
    $targetUserId = (int)($input['targetUserId'] ?? 0);
    $capKey = trim($input['capabilityKey'] ?? '');

    if (!$targetUserId || !$capKey) {
        rsa_jsonResponse(['error' => 'targetUserId and capabilityKey required'], 400);
    }

    $stmt = $pdo->prepare("
        DELETE FROM user_capabilities
        WHERE user_id = ? AND capability_key = ?
    ");
    $stmt->execute([$targetUserId, $capKey]);

    // Bump capability_version
    $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$targetUserId]);

    // Audit log
    rsa_auditLog($pdo, $adminUserId, AUDIT_CAPABILITY_REVOKED, $targetUserId, [
        'capability' => $capKey,
    ]);

    rsa_jsonResponse(['success' => true, 'revoked' => $capKey]);
}

/**
 * GET ?action=audit-log&limit=50&offset=0&action_filter=&user_id=
 */
function handleAuditLog(PDO $pdo, int $adminUserId): void {
    $limit = min((int)($_GET['limit'] ?? 50), 200);
    $offset = max((int)($_GET['offset'] ?? 0), 0);
    $actionFilter = trim($_GET['action_filter'] ?? '');
    $userIdFilter = (int)($_GET['user_id'] ?? 0);

    $where = [];
    $params = [];

    if ($actionFilter) {
        $where[] = "action LIKE ?";
        $params[] = "%$actionFilter%";
    }
    if ($userIdFilter) {
        $where[] = "(actor_user_id = ? OR target_user_id = ?)";
        $params[] = $userIdFilter;
        $params[] = $userIdFilter;
    }

    $whereClause = $where ? 'WHERE ' . implode(' AND ', $where) : '';
    $params[] = $limit;
    $params[] = $offset;

    try {
        $stmt = $pdo->prepare("
            SELECT id, actor_user_id, action, target_user_id, metadata, ip_address, created_at
            FROM audit_log
            $whereClause
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute($params);
        $entries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($entries as &$entry) {
            $entry['metadata'] = $entry['metadata'] ? json_decode($entry['metadata'], true) : null;
        }

        rsa_jsonResponse(['entries' => $entries, 'limit' => $limit, 'offset' => $offset]);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Audit log query failed: ' . $e->getMessage()], 500);
    }
}

// ── Plan Capabilities ────────────────────────────────────────────────────

/**
 * GET ?action=get-plan-capabilities
 *
 * Returns all plans with their current capabilities (DB-backed with code fallback)
 * and the canonical list of all capability keys.
 * Read-only — admin.access is sufficient.
 */
function handleGetPlanCapabilities(PDO $pdo): void {
    try {
        $planIds = ['free', 'basic', 'pro', 'team'];
        $plans = [];
        $dbBacked = false;

        // Check if plan_capabilities table exists
        try {
            $pdo->query("SELECT 1 FROM plan_capabilities LIMIT 1");
            $dbBacked = true;
        } catch (PDOException $e) {
            // Table doesn't exist — use code-level fallback only
        }

        foreach ($planIds as $pid) {
            if ($dbBacked) {
                $caps = rsa_getEffectivePlanCapabilities($pdo, $pid);
            } else {
                $caps = PLAN_CAPABILITIES[$pid] ?? PLAN_CAPABILITIES['free'];
            }
            sort($caps);
            $plans[$pid] = $caps;
        }

        // Build the canonical list of all known capability keys
        $allKeys = [];
        foreach (PLAN_CAPABILITIES as $caps) {
            foreach ($caps as $cap) {
                $allKeys[$cap] = true;
            }
        }
        // Include role caps too for reference
        foreach (ROLE_CAPABILITIES as $caps) {
            foreach ($caps as $cap) {
                $allKeys[$cap] = true;
            }
        }
        // Add any DB-only keys not in code
        if ($dbBacked) {
            try {
                $stmt = $pdo->query("SELECT DISTINCT capability_key FROM plan_capabilities");
                foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $cap) {
                    $allKeys[$cap] = true;
                }
            } catch (PDOException $e) {
                // ignore
            }
        }

        $allKeysSorted = array_keys($allKeys);
        sort($allKeysSorted);

        rsa_jsonResponse([
            'plans' => $plans,
            'allCapabilityKeys' => $allKeysSorted,
            'dbBacked' => $dbBacked,
        ]);
    } catch (Exception $e) {
        error_log("handleGetPlanCapabilities error: " . $e->getMessage());
        rsa_jsonResponse(['error' => 'Failed to load plan capabilities: ' . $e->getMessage()], 500);
    }
}

/**
 * POST ?action=set-plan-capabilities
 * Body: { planId, capabilities: string[], reason?: string }
 *
 * Atomically replaces the capability set for a plan.
 * Requires admin.userManagement capability.
 */
function handleSetPlanCapabilities(PDO $pdo, int $adminUserId): void {
    // Require elevated permission for mutations
    $role = rsa_getUserRole($pdo, $adminUserId);
    rsa_requireCapability($pdo, $adminUserId, $role, 'admin.userManagement');

    $input = rsa_getJsonInput();
    $planId = trim($input['planId'] ?? '');
    $capabilities = $input['capabilities'] ?? [];
    $reason = trim($input['reason'] ?? '');

    // Validate plan ID
    $validPlans = ['free', 'basic', 'pro', 'team'];
    if (!in_array($planId, $validPlans)) {
        rsa_jsonResponse(['error' => 'Invalid plan ID. Must be one of: ' . implode(', ', $validPlans)], 400);
    }

    // Validate capabilities is an array of strings
    if (!is_array($capabilities)) {
        rsa_jsonResponse(['error' => 'capabilities must be an array of strings'], 400);
    }

    // Sanitize: trim and deduplicate
    $capabilities = array_values(array_unique(array_map('trim', $capabilities)));

    // Safety: prevent removing admin.* capabilities from any plan
    // (admin caps are role-based, not plan-based, so this is just a guard)
    $reservedCaps = ['admin.access', 'admin.devTools', 'admin.userManagement'];
    foreach ($reservedCaps as $rc) {
        if (in_array($rc, $capabilities)) {
            rsa_jsonResponse([
                'error' => "Cannot add reserved capability '$rc' to a plan. Admin capabilities are role-based.",
            ], 400);
        }
    }

    try {
        rsa_setPlanCapabilities($pdo, $planId, $capabilities, $adminUserId, $reason);
    } catch (PDOException $e) {
        rsa_jsonResponse(['error' => 'Failed to update plan capabilities: ' . $e->getMessage()], 500);
    }

    // Return updated state
    $updated = rsa_getEffectivePlanCapabilities($pdo, $planId);
    sort($updated);

    rsa_jsonResponse([
        'success' => true,
        'planId' => $planId,
        'capabilities' => $updated,
        'count' => count($updated),
    ]);
}
