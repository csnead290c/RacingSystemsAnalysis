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
    case 'db-footprint':
        handleDbFootprint($pdo);
        break;
    case 'db-snapshot-capture':
        handleDbSnapshotCapture($pdo);
        break;
    case 'db-snapshot-list':
        handleDbSnapshotList($pdo);
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

// ============================================================================
// DB Footprint Audit
// ============================================================================

/**
 * GET ?action=db-footprint
 *
 * Returns comprehensive database size audit:
 *   - Top 25 tables by total size (data + index)
 *   - Index vs data size per table
 *   - Row count estimates
 *   - Large columns (TEXT/BLOB types)
 *   - Redundant/overlapping index detection
 *   - Total database size summary
 */
function handleDbFootprint(PDO $pdo): void {
    $dbName = DB_NAME;

    // 1) Table sizes: data_length + index_length, row counts
    $stmt = $pdo->prepare("
        SELECT
            TABLE_NAME                                    AS table_name,
            TABLE_ROWS                                    AS row_count_estimate,
            DATA_LENGTH                                   AS data_bytes,
            INDEX_LENGTH                                  AS index_bytes,
            (DATA_LENGTH + INDEX_LENGTH)                  AS total_bytes,
            DATA_FREE                                     AS data_free_bytes,
            AVG_ROW_LENGTH                                AS avg_row_bytes,
            ENGINE                                        AS engine,
            TABLE_COLLATION                               AS collation,
            CREATE_TIME                                   AS created_at,
            UPDATE_TIME                                   AS updated_at
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC
        LIMIT 50
    ");
    $stmt->execute([$dbName]);
    $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Cast numeric strings to int for JSON
    foreach ($tables as &$t) {
        foreach (['row_count_estimate','data_bytes','index_bytes','total_bytes','data_free_bytes','avg_row_bytes'] as $k) {
            $t[$k] = (int)($t[$k] ?? 0);
        }
    }
    unset($t);

    // 2) Total DB size
    $stmt = $pdo->prepare("
        SELECT
            SUM(DATA_LENGTH)                AS total_data_bytes,
            SUM(INDEX_LENGTH)               AS total_index_bytes,
            SUM(DATA_LENGTH + INDEX_LENGTH) AS total_bytes,
            SUM(DATA_FREE)                  AS total_free_bytes,
            COUNT(*)                        AS table_count
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
    ");
    $stmt->execute([$dbName]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);
    foreach (['total_data_bytes','total_index_bytes','total_bytes','total_free_bytes','table_count'] as $k) {
        $summary[$k] = (int)($summary[$k] ?? 0);
    }

    // 3) Large columns (TEXT/BLOB types)
    $stmt = $pdo->prepare("
        SELECT
            TABLE_NAME           AS table_name,
            COLUMN_NAME          AS column_name,
            DATA_TYPE            AS data_type,
            CHARACTER_MAXIMUM_LENGTH AS max_length,
            IS_NULLABLE          AS is_nullable,
            COLUMN_DEFAULT       AS column_default
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND DATA_TYPE IN ('text','mediumtext','longtext','blob','mediumblob','longblob','json')
        ORDER BY
            CASE DATA_TYPE
                WHEN 'longblob'   THEN 1
                WHEN 'longtext'   THEN 2
                WHEN 'mediumblob' THEN 3
                WHEN 'mediumtext' THEN 4
                WHEN 'json'       THEN 5
                WHEN 'text'       THEN 6
                WHEN 'blob'       THEN 7
            END,
            TABLE_NAME, COLUMN_NAME
    ");
    $stmt->execute([$dbName]);
    $largeColumns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($largeColumns as &$lc) {
        $lc['max_length'] = $lc['max_length'] !== null ? (int)$lc['max_length'] : null;
    }
    unset($lc);

    // 4) All indexes with column lists for redundancy detection
    $stmt = $pdo->prepare("
        SELECT
            TABLE_NAME   AS table_name,
            INDEX_NAME   AS index_name,
            NON_UNIQUE   AS non_unique,
            GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
            INDEX_TYPE   AS index_type
        FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = ?
        GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE, INDEX_TYPE
        ORDER BY TABLE_NAME, INDEX_NAME
    ");
    $stmt->execute([$dbName]);
    $allIndexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($allIndexes as &$idx) {
        $idx['non_unique'] = (int)$idx['non_unique'];
    }
    unset($idx);

    // 5) Detect redundant indexes (index A is a prefix of index B on the same table)
    $redundant = [];
    $byTable = [];
    foreach ($allIndexes as $idx) {
        $byTable[$idx['table_name']][] = $idx;
    }
    foreach ($byTable as $tbl => $indexes) {
        $n = count($indexes);
        for ($i = 0; $i < $n; $i++) {
            for ($j = 0; $j < $n; $j++) {
                if ($i === $j) continue;
                $colsA = $indexes[$i]['columns'];
                $colsB = $indexes[$j]['columns'];
                // A is redundant if its columns are a prefix of B's columns
                if ($colsA !== $colsB && strpos($colsB, $colsA) === 0) {
                    $redundant[] = [
                        'table_name'       => $tbl,
                        'redundant_index'  => $indexes[$i]['index_name'],
                        'redundant_cols'   => $colsA,
                        'covered_by_index' => $indexes[$j]['index_name'],
                        'covered_by_cols'  => $colsB,
                    ];
                }
            }
        }
    }

    // 6) Per-table actual large column sizes (sample top 5 tables by total_bytes)
    //    For each large column, get actual avg + max stored size
    $columnSizeDetails = [];
    $topTableNames = array_slice(array_column($tables, 'table_name'), 0, 10);
    $largeColsByTable = [];
    foreach ($largeColumns as $lc) {
        $largeColsByTable[$lc['table_name']][] = $lc['column_name'];
    }
    foreach ($topTableNames as $tblName) {
        if (!isset($largeColsByTable[$tblName])) continue;
        foreach ($largeColsByTable[$tblName] as $colName) {
            try {
                // Use LENGTH() for byte size of the column value
                $sql = "SELECT
                            AVG(LENGTH(`$colName`))  AS avg_bytes,
                            MAX(LENGTH(`$colName`))   AS max_bytes,
                            MIN(LENGTH(`$colName`))   AS min_bytes,
                            COUNT(*)                  AS row_count,
                            SUM(CASE WHEN `$colName` IS NOT NULL AND LENGTH(`$colName`) > 0 THEN 1 ELSE 0 END) AS non_empty_count
                        FROM `$tblName`";
                $s = $pdo->query($sql);
                $row = $s->fetch(PDO::FETCH_ASSOC);
                $columnSizeDetails[] = [
                    'table_name'      => $tblName,
                    'column_name'     => $colName,
                    'avg_bytes'       => $row['avg_bytes'] !== null ? (int)round((float)$row['avg_bytes']) : 0,
                    'max_bytes'       => (int)($row['max_bytes'] ?? 0),
                    'min_bytes'       => (int)($row['min_bytes'] ?? 0),
                    'row_count'       => (int)($row['row_count'] ?? 0),
                    'non_empty_count' => (int)($row['non_empty_count'] ?? 0),
                ];
            } catch (PDOException $e) {
                // Skip if column doesn't exist or other error
                $columnSizeDetails[] = [
                    'table_name'  => $tblName,
                    'column_name' => $colName,
                    'error'       => $e->getMessage(),
                ];
            }
        }
    }

    // ── Auto-capture daily snapshot on first footprint visit ──
    $latestSnapshot = null;
    $snapshotHistory = [];
    try {
        ensureSnapshotTable($pdo);
        $latestSnapshot = getLatestSnapshot($pdo);

        // Auto-capture if no snapshot today
        $today = gmdate('Y-m-d');
        $needsCapture = true;
        if ($latestSnapshot && substr($latestSnapshot['captured_at'], 0, 10) === $today) {
            $needsCapture = false;
        }
        if ($needsCapture) {
            $topTable1 = $tables[0] ?? null;
            $topTable2 = $tables[1] ?? null;
            captureSnapshot($pdo, $summary, $topTable1, $topTable2);
            $latestSnapshot = getLatestSnapshot($pdo);
        }

        // Get last 30 snapshots for history
        $stmt = $pdo->query("
            SELECT * FROM admin_db_size_snapshots
            ORDER BY captured_at DESC LIMIT 30
        ");
        $snapshotHistory = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Non-fatal: snapshot features are optional
    }

    rsa_jsonResponse([
        'database'          => $dbName,
        'summary'           => $summary,
        'tables'            => $tables,
        'largeColumns'      => $largeColumns,
        'columnSizeDetails' => $columnSizeDetails,
        'indexes'           => $allIndexes,
        'redundantIndexes'  => $redundant,
        'hostLimitMb'       => 1000,
        'generatedAt'       => date('c'),
        'latestSnapshot'    => $latestSnapshot,
        'snapshotHistory'   => $snapshotHistory,
    ]);
}

// ============================================================================
// DB Size Snapshots
// ============================================================================

function ensureSnapshotTable(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS admin_db_size_snapshots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            captured_at DATETIME NOT NULL,
            total_mb DECIMAL(10,2) NOT NULL,
            data_mb DECIMAL(10,2) NOT NULL,
            index_mb DECIMAL(10,2) NOT NULL,
            table_count INT NOT NULL DEFAULT 0,
            top_table_1_name VARCHAR(100) NULL,
            top_table_1_mb DECIMAL(10,2) NULL,
            top_table_2_name VARCHAR(100) NULL,
            top_table_2_mb DECIMAL(10,2) NULL,
            INDEX idx_snap_date (captured_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    ");
}

function getLatestSnapshot(PDO $pdo): ?array {
    $stmt = $pdo->query("
        SELECT * FROM admin_db_size_snapshots
        ORDER BY captured_at DESC LIMIT 1
    ");
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function captureSnapshot(PDO $pdo, array $summary, ?array $top1, ?array $top2): void {
    $totalMb = round($summary['total_bytes'] / (1024 * 1024), 2);
    $dataMb = round($summary['total_data_bytes'] / (1024 * 1024), 2);
    $indexMb = round($summary['total_index_bytes'] / (1024 * 1024), 2);

    $pdo->prepare("
        INSERT INTO admin_db_size_snapshots
            (captured_at, total_mb, data_mb, index_mb, table_count,
             top_table_1_name, top_table_1_mb, top_table_2_name, top_table_2_mb)
        VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)
    ")->execute([
        $totalMb, $dataMb, $indexMb, $summary['table_count'],
        $top1 ? $top1['table_name'] : null,
        $top1 ? round($top1['total_bytes'] / (1024 * 1024), 2) : null,
        $top2 ? $top2['table_name'] : null,
        $top2 ? round($top2['total_bytes'] / (1024 * 1024), 2) : null,
    ]);
}

/**
 * POST ?action=db-snapshot-capture
 * Manually capture a DB size snapshot.
 */
function handleDbSnapshotCapture(PDO $pdo): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        rsa_jsonResponse(['error' => 'POST required'], 405);
    }

    ensureSnapshotTable($pdo);

    $dbName = DB_NAME;
    $stmt = $pdo->prepare("
        SELECT
            COALESCE(SUM(DATA_LENGTH), 0) AS total_data_bytes,
            COALESCE(SUM(INDEX_LENGTH), 0) AS total_index_bytes,
            COALESCE(SUM(DATA_LENGTH + INDEX_LENGTH), 0) AS total_bytes,
            COUNT(*) AS table_count
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    ");
    $stmt->execute([$dbName]);
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    $stmt = $pdo->prepare("
        SELECT TABLE_NAME AS table_name, (DATA_LENGTH + INDEX_LENGTH) AS total_bytes
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC LIMIT 2
    ");
    $stmt->execute([$dbName]);
    $topTables = $stmt->fetchAll(PDO::FETCH_ASSOC);

    captureSnapshot($pdo, $summary, $topTables[0] ?? null, $topTables[1] ?? null);

    rsa_jsonResponse([
        'success' => true,
        'snapshot' => getLatestSnapshot($pdo),
    ]);
}

/**
 * GET ?action=db-snapshot-list&limit=30
 * Return recent DB size snapshots.
 */
function handleDbSnapshotList(PDO $pdo): void {
    ensureSnapshotTable($pdo);

    $limit = min((int)($_GET['limit'] ?? 30), 100);
    $stmt = $pdo->prepare("
        SELECT * FROM admin_db_size_snapshots
        ORDER BY captured_at DESC LIMIT ?
    ");
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();

    rsa_jsonResponse([
        'snapshots' => $stmt->fetchAll(PDO::FETCH_ASSOC),
    ]);
}
