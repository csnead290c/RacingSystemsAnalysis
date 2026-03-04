<?php
/**
 * Server-Side Capability Computation & Enforcement
 *
 * Mirrors the client-side PLAN_CAPABILITIES from src/domain/config/capabilities.ts.
 * The tierContractDrift.test.ts test suite catches drift between client and server.
 *
 * Usage:
 *   require_once __DIR__ . '/lib/capabilities.php';
 *   rsa_requireCapability($pdo, $auth, 'sim.et');
 *
 * Capability resolution order:
 *   1. Role-based capabilities (owner/admin → admin.*)
 *   2. Plan-based capabilities (subscription plan → PLAN_CAPABILITIES)
 *   3. Override capabilities (user_capabilities table — admin grants, trials)
 */

// ============================================================================
// Plan → Capability mapping (must stay in sync with capabilities.ts)
// ============================================================================

const PLAN_CAPABILITIES = [
    'free' => [
        'sim.basic',
        'vehicle.editor.basic',
        'track.eighth',
        'track.quarter',
        'weather.manual',
        'charts.basic',
    ],
    'basic' => [
        'sim.basic',
        'sim.et',
        'sim.raceTools',
        'sim.runCompletion',
        'sim.learning',
        'vehicle.editor.basic',
        'track.eighth',
        'track.quarter',
        'weather.manual',
        'data.vehicles',
        'data.runLog',
        'charts.basic',
        'library.save.engine',
        'library.save.clutch',
        'library.save.fourLink',
    ],
    'pro' => [
        'sim.basic',
        'sim.et',
        'sim.raceTools',
        'sim.advanced',
        'sim.runCompletion',
        'sim.learning',
        'engine.proMode',
        'vehicle.editor.basic',
        'vehicle.editor.pro',
        'vehicle.throttleStop',
        'track.eighth',
        'track.quarter',
        'track.thousand',
        'track.bonneville',
        'track.custom',
        'weather.manual',
        'weather.live',
        'weather.history',
        'data.vehicles',
        'data.runLog',
        'charts.basic',
        'charts.advanced',
        'data.export',
        'data.import',
        'optimizer.gear',
        'optimizer.launch',
        'optimizer.throttleStop',
        'library.save.engine',
        'library.save.clutch',
        'library.save.fourLink',
        'library.install.engine',
        'library.install.clutch',
        'library.install.fourLink',
    ],
    'team' => [
        'sim.basic',
        'sim.et',
        'sim.raceTools',
        'sim.advanced',
        'sim.runCompletion',
        'sim.learning',
        'engine.proMode',
        'vehicle.editor.basic',
        'vehicle.editor.pro',
        'vehicle.throttleStop',
        'track.eighth',
        'track.quarter',
        'track.thousand',
        'track.bonneville',
        'track.custom',
        'weather.manual',
        'weather.live',
        'weather.history',
        'data.vehicles',
        'data.runLog',
        'charts.basic',
        'charts.advanced',
        'data.export',
        'data.import',
        'optimizer.gear',
        'optimizer.launch',
        'optimizer.throttleStop',
        'library.save.engine',
        'library.save.clutch',
        'library.save.fourLink',
        'library.install.engine',
        'library.install.clutch',
        'library.install.fourLink',
        'team.enabled',
        'team.library.share',
        'team.vehicles.share',
        'team.runs.share',
    ],
    'nhra' => [
        'nhra.parity',
        'sim.basic',
        'charts.basic',
        'weather.manual',
        'incidents.read',
        'incidents.create',
        'incidents.edit.own',
    ],
];

// Role-based capabilities (independent of subscription plan)
const ROLE_CAPABILITIES = [
    'owner' => ['admin.devTools', 'admin.userManagement', 'admin.access', 'nhra.parity', 'nhra.parity.admin', 'incidents.read', 'incidents.create', 'incidents.edit.own', 'incidents.edit.all'],
    'admin' => ['admin.devTools', 'admin.userManagement', 'admin.access', 'nhra.parity', 'nhra.parity.admin', 'incidents.read', 'incidents.create', 'incidents.edit.own', 'incidents.edit.all'],
    'beta'  => ['admin.devTools'],
];

// Legacy plan name → canonical plan ID
const PLAN_ALIASES = [
    'racer' => 'basic',
    'free'  => 'free',
    'basic' => 'basic',
    'pro'   => 'pro',
    'team'  => 'team',
    'nhra'  => 'nhra',
];

// Payment failure grace period (seconds). After this window, past_due degrades to free.
const GRACE_PERIOD_SECONDS = 3 * 24 * 60 * 60; // 3 days

// ============================================================================
// DB-backed plan capabilities (prefer DB if populated, fallback to code)
// ============================================================================

/**
 * Get plan capabilities from the plan_capabilities DB table.
 * Returns null if the table doesn't exist or has no rows for this plan
 * (signals caller to fall back to code-level PLAN_CAPABILITIES).
 *
 * @return string[]|null  Array of capability keys, or null if DB unavailable/empty
 */
function rsa_getPlanCapabilitiesFromDB(PDO $pdo, string $planId): ?array {
    try {
        $stmt = $pdo->prepare("
            SELECT capability_key FROM plan_capabilities
            WHERE plan_id = ?
            ORDER BY capability_key
        ");
        $stmt->execute([$planId]);
        $rows = $stmt->fetchAll(PDO::FETCH_COLUMN);
        // Only use DB result if it has rows (empty = not yet seeded)
        return count($rows) > 0 ? $rows : null;
    } catch (PDOException $e) {
        // Table may not exist yet — fall back silently
        return null;
    }
}

/**
 * Get capabilities for a plan: prefer DB, fallback to code-level constant.
 *
 * @return string[] Array of capability keys
 */
function rsa_getEffectivePlanCapabilities(PDO $pdo, string $planId): array {
    $dbCaps = rsa_getPlanCapabilitiesFromDB($pdo, $planId);
    if ($dbCaps !== null) {
        return $dbCaps;
    }
    return PLAN_CAPABILITIES[$planId] ?? PLAN_CAPABILITIES['free'];
}

/**
 * Atomically replace all capabilities for a plan in the DB.
 * Logs an audit entry with old vs new sets.
 *
 * @param string   $planId         The plan to update
 * @param string[] $capabilityKeys New set of capability keys
 * @param int      $actorUserId    Admin performing the change
 * @param string   $reason         Optional reason for the change
 */
function rsa_setPlanCapabilities(PDO $pdo, string $planId, array $capabilityKeys, int $actorUserId, string $reason = ''): void {
    // Get old set for audit diff
    $oldCaps = rsa_getEffectivePlanCapabilities($pdo, $planId);

    $pdo->beginTransaction();
    try {
        // Delete existing
        $pdo->prepare("DELETE FROM plan_capabilities WHERE plan_id = ?")->execute([$planId]);

        // Insert new
        $stmt = $pdo->prepare("INSERT INTO plan_capabilities (plan_id, capability_key) VALUES (?, ?)");
        foreach ($capabilityKeys as $cap) {
            $stmt->execute([$planId, $cap]);
        }

        $pdo->commit();
    } catch (PDOException $e) {
        $pdo->rollBack();
        throw $e;
    }

    // Compute diff for audit
    $added = array_values(array_diff($capabilityKeys, $oldCaps));
    $removed = array_values(array_diff($oldCaps, $capabilityKeys));

    // Audit log
    rsa_auditLog($pdo, $actorUserId, AUDIT_PLAN_CAPABILITIES_UPDATED, null, [
        'plan_id' => $planId,
        'added' => $added,
        'removed' => $removed,
        'new_count' => count($capabilityKeys),
        'old_count' => count($oldCaps),
        'reason' => $reason,
    ]);

    error_log("Plan capabilities updated: plan=$planId by user=$actorUserId added=" . count($added) . " removed=" . count($removed));
}

// ============================================================================
// Core functions
// ============================================================================

/**
 * Get the user's active subscription plan from the subscriptions table.
 * Falls back to the legacy users.subscription_plan column during migration.
 *
 * @return string The canonical plan ID ('free', 'basic', 'pro', 'team')
 */
function rsa_getUserPlan(PDO $pdo, int $userId): string {
    // Try new subscriptions table first
    try {
        $stmt = $pdo->prepare("
            SELECT plan_id, status, updated_at FROM subscriptions
            WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
            ORDER BY created_at DESC
            LIMIT 1
        ");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if ($row && $row['plan_id']) {
            // Enforce grace period for past_due subscriptions
            if ($row['status'] === 'past_due') {
                $updatedAt = strtotime($row['updated_at'] ?? 'now');
                $elapsed = time() - $updatedAt;
                if ($elapsed > GRACE_PERIOD_SECONDS) {
                    $days = round($elapsed / 86400, 1);
                    error_log("Grace expired: user=$userId plan_id={$row['plan_id']} past_due for {$days}d (limit=" . (GRACE_PERIOD_SECONDS / 86400) . "d) — degrading to free");
                    return 'free';
                }
                $remaining = round((GRACE_PERIOD_SECONDS - $elapsed) / 3600, 1);
                error_log("Grace active: user=$userId plan_id={$row['plan_id']} past_due, {$remaining}h remaining");
            }

            $canonical = PLAN_ALIASES[$row['plan_id']] ?? null;
            if ($canonical === null) {
                error_log("PLAN_ALIASES miss: plan_id='{$row['plan_id']}' for user=$userId — falling back to 'free'. Add it to PLAN_ALIASES in capabilities.php.");
                return 'free';
            }
            return $canonical;
        }
    } catch (PDOException $e) {
        // subscriptions table may not exist yet — fall through to legacy
        error_log("subscriptions table lookup failed (may not exist): " . $e->getMessage());
    }

    // Fallback: legacy column on users table
    try {
        $stmt = $pdo->prepare("
            SELECT subscription_plan, subscription_status FROM users WHERE id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if ($user && !empty($user['subscription_plan']) && in_array($user['subscription_status'] ?? '', ['active', 'trialing', 'past_due'])) {
            // Grace period for legacy path: use a conservative approach —
            // legacy table has no updated_at for status changes, so we allow past_due
            // but log a warning. The subscriptions table path above is authoritative.
            if ($user['subscription_status'] === 'past_due') {
                error_log("Grace (legacy fallback): user=$userId plan={$user['subscription_plan']} past_due — no timestamp available, granting grace. Migrate to subscriptions table.");
            }

            $canonical = PLAN_ALIASES[$user['subscription_plan']] ?? null;
            if ($canonical === null) {
                error_log("PLAN_ALIASES miss: subscription_plan='{$user['subscription_plan']}' for user=$userId — falling back to 'free'. Add it to PLAN_ALIASES in capabilities.php.");
                return 'free';
            }
            return $canonical;
        }
    } catch (PDOException $e) {
        // subscription_plan/subscription_status columns may not exist — fall through to free
        error_log("Legacy subscription_plan lookup failed: " . $e->getMessage());
    }

    return 'free';
}

/**
 * Get admin/time-limited capability overrides from user_capabilities table.
 *
 * @return string[] Array of capability keys
 */
function rsa_getUserOverrides(PDO $pdo, int $userId): array {
    try {
        $stmt = $pdo->prepare("
            SELECT capability_key FROM user_capabilities
            WHERE user_id = ?
              AND (expires_at IS NULL OR expires_at > NOW())
        ");
        $stmt->execute([$userId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    } catch (PDOException $e) {
        // user_capabilities table may not exist yet
        error_log("user_capabilities lookup failed (table may not exist): " . $e->getMessage());
        return [];
    }
}

/**
 * Compute the full set of capabilities for a user.
 *
 * @return string[] Array of capability keys
 */
function rsa_computeCapabilities(PDO $pdo, int $userId, string $role): array {
    $plan = rsa_getUserPlan($pdo, $userId);

    // Start with plan capabilities (prefer DB, fallback to code)
    $caps = rsa_getEffectivePlanCapabilities($pdo, $plan);

    // Add role-based capabilities
    if (isset(ROLE_CAPABILITIES[$role])) {
        $caps = array_merge($caps, ROLE_CAPABILITIES[$role]);
    }

    // Owner/admin with fullAccess get everything
    if ($role === 'owner') {
        // Merge all plan capabilities (team is the superset)
        $caps = array_merge($caps, PLAN_CAPABILITIES['team']);
    }

    // Add overrides from user_capabilities table (handles missing table internally)
    $overrides = rsa_getUserOverrides($pdo, $userId);
    $caps = array_merge($caps, $overrides);

    return array_unique($caps);
}

/**
 * Check if a user has a specific capability.
 *
 * @return bool
 */
function rsa_hasCap(PDO $pdo, int $userId, string $role, string $capKey): bool {
    $caps = rsa_computeCapabilities($pdo, $userId, $role);
    return in_array($capKey, $caps);
}

/**
 * Require a capability — returns 403 if the user doesn't have it.
 * Call this at the top of any protected endpoint.
 *
 * Usage:
 *   $auth = rsa_requireAuth();
 *   $userId = rsa_resolveUserId($pdo, $auth);
 *   rsa_requireCapability($pdo, $userId, $auth['role'] ?? 'user', 'data.vehicles');
 */
function rsa_requireCapability(PDO $pdo, int $userId, string $role, string $capKey): void {
    if (!rsa_hasCap($pdo, $userId, $role, $capKey)) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Forbidden',
            'message' => "Missing required capability: $capKey",
            'requiredCapability' => $capKey,
        ]);
        exit;
    }
}

/**
 * Resolve the internal user ID from auth data.
 * Handles both legacy (numeric ID) and Clerk (clerk_xxx) users.
 *
 * @return int The internal user ID
 */
function rsa_resolveUserId(PDO $pdo, array $auth): int {
    $userId = $auth['user_id'];

    // If it's already numeric, return it
    if (is_numeric($userId)) {
        return (int)$userId;
    }

    // Clerk user — look up by clerk_user_id
    $clerkId = $auth['clerk_user_id'] ?? str_replace('clerk_', '', $userId);
    $stmt = $pdo->prepare("SELECT id FROM users WHERE clerk_user_id = ?");
    $stmt->execute([$clerkId]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    return (int)$row['id'];
}

/**
 * Get the user's role from the database.
 * The JWT role may be stale; always re-read from DB for enforcement.
 */
function rsa_getUserRole(PDO $pdo, int $userId): string {
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    return $row ? ($row['role'] ?? 'user') : 'user';
}

/**
 * Convenience: resolve user + check capability in one call.
 *
 * Usage:
 *   $auth = rsa_requireAuth();
 *   $userId = rsa_requireAuthAndCap($pdo, $auth, 'data.vehicles');
 *
 * @return int The resolved user ID (for further queries)
 */
function rsa_requireAuthAndCap(PDO $pdo, array $auth, string $capKey): int {
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    rsa_requireCapability($pdo, $userId, $role, $capKey);
    return $userId;
}

/**
 * GET endpoint: return the user's current capabilities.
 * Called by the client to refresh cached capabilities.
 *
 * Response: { plan, capabilities, version }
 */
function rsa_handleGetCapabilities(PDO $pdo, array $auth): void {
    $userId = rsa_resolveUserId($pdo, $auth);
    $role = rsa_getUserRole($pdo, $userId);
    $plan = rsa_getUserPlan($pdo, $userId);
    $caps = rsa_computeCapabilities($pdo, $userId, $role);

    // Get capability_version for cache invalidation
    $version = 1;
    try {
        $stmt = $pdo->prepare("SELECT capability_version FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        $version = $row ? (int)($row['capability_version'] ?? 1) : 1;
    } catch (PDOException $e) {
        // capability_version column may not exist yet
    }

    rsa_jsonResponse([
        'plan' => $plan,
        'role' => $role,
        'capabilities' => array_values($caps),
        'version' => $version,
    ]);
}
