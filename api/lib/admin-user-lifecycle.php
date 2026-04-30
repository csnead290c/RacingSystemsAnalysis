<?php
/**
 * Admin User Lifecycle Management Functions
 * 
 * Handles user creation, invites, suspension, deletion, and plan assignment.
 * All functions require admin.userManagement capability.
 */

/**
 * Create a new user manually (without invite)
 * POST body: { email, name, password, role?, assignedPlan?, sendWelcomeEmail? }
 */
function admin_createUser(PDO $pdo, int $adminUserId, array $input): array {
    $email = trim($input['email'] ?? '');
    $name = trim($input['name'] ?? '');
    $password = trim($input['password'] ?? '');
    $role = $input['role'] ?? 'user';
    $assignedPlan = $input['assignedPlan'] ?? null;
    $sendWelcomeEmail = $input['sendWelcomeEmail'] ?? false;
    
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Valid email required');
    }
    if (!$name) {
        throw new Exception('Name required');
    }
    if (!$password || strlen($password) < 8) {
        throw new Exception('Password must be at least 8 characters');
    }
    if (!in_array($role, ['user', 'admin', 'beta'])) {
        throw new Exception('Invalid role');
    }
    
    // Check if email already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        throw new Exception('Email already exists');
    }
    
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password_hash, name, role, status, billing_source, assigned_plan, assigned_by, created_at)
            VALUES (?, ?, ?, ?, 'active', ?, ?, ?, NOW())
        ");
        $billingSource = $assignedPlan ? 'manual' : 'none';
        $stmt->execute([$email, $passwordHash, $name, $role, $billingSource, $assignedPlan, $adminUserId]);
        
        $userId = $pdo->lastInsertId();
        
        // Log plan assignment if provided
        if ($assignedPlan) {
            $stmt = $pdo->prepare("
                INSERT INTO user_plan_assignments (user_id, plan_id, action, source, assigned_by, reason, created_at)
                VALUES (?, ?, 'assigned', 'manual', ?, 'Created by admin', NOW())
            ");
            $stmt->execute([$userId, $assignedPlan, $adminUserId]);
        }
        
        // Audit log
        admin_auditLog($pdo, $adminUserId, 'user.created', 'user', $userId, [
            'email' => $email,
            'name' => $name,
            'role' => $role,
            'assigned_plan' => $assignedPlan,
        ]);
        
        $pdo->commit();
        
        // TODO: Send welcome email if requested
        
        return [
            'success' => true,
            'userId' => $userId,
            'email' => $email,
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Invite a user by email
 * POST body: { email, role?, assignedPlan?, expiresInDays? }
 */
function admin_inviteUser(PDO $pdo, int $adminUserId, array $input): array {
    $email = trim($input['email'] ?? '');
    $role = $input['role'] ?? 'user';
    $assignedPlan = $input['assignedPlan'] ?? null;
    $expiresInDays = (int)($input['expiresInDays'] ?? 7);
    
    if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Valid email required');
    }
    if (!in_array($role, ['user', 'admin', 'beta'])) {
        throw new Exception('Invalid role');
    }
    
    // Check if email already exists as active user
    $stmt = $pdo->prepare("SELECT id, status FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $existing = $stmt->fetch();
    if ($existing && $existing['status'] !== 'deleted') {
        throw new Exception('User with this email already exists');
    }
    
    // Check if there's already a pending invite
    $stmt = $pdo->prepare("
        SELECT id FROM user_invites 
        WHERE email = ? AND expires_at > NOW() AND accepted_at IS NULL AND revoked_at IS NULL
    ");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        throw new Exception('Pending invite already exists for this email');
    }
    
    $token = bin2hex(random_bytes(32));
    $expiresAt = date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days"));
    
    $stmt = $pdo->prepare("
        INSERT INTO user_invites (email, token, invited_by, assigned_role, assigned_plan, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$email, $token, $adminUserId, $role, $assignedPlan, $expiresAt]);
    
    $inviteId = $pdo->lastInsertId();
    
    // Audit log
    admin_auditLog($pdo, $adminUserId, 'user.invited', 'invite', $inviteId, [
        'email' => $email,
        'role' => $role,
        'assigned_plan' => $assignedPlan,
        'expires_at' => $expiresAt,
    ]);
    
    // TODO: Send invite email with token
    $inviteUrl = "https://racingsystemsanalysis.com/register?invite=$token";
    
    return [
        'success' => true,
        'inviteId' => $inviteId,
        'email' => $email,
        'token' => $token,
        'inviteUrl' => $inviteUrl,
        'expiresAt' => $expiresAt,
    ];
}

/**
 * Suspend a user
 * POST body: { userId, reason }
 */
function admin_suspendUser(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    $reason = trim($input['reason'] ?? '');
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    
    // Get current user status
    $stmt = $pdo->prepare("SELECT id, email, status FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    if ($user['status'] === 'suspended') {
        throw new Exception('User is already suspended');
    }
    if ($user['status'] === 'deleted') {
        throw new Exception('Cannot suspend deleted user');
    }
    
    // Prevent self-suspension
    if ($userId === $adminUserId) {
        throw new Exception('Cannot suspend yourself');
    }
    
    $stmt = $pdo->prepare("
        UPDATE users 
        SET status = 'suspended', suspended_at = NOW(), suspended_by = ?, suspended_reason = ?
        WHERE id = ?
    ");
    $stmt->execute([$adminUserId, $reason, $userId]);
    
    // Audit log
    admin_auditLog($pdo, $adminUserId, 'user.suspended', 'user', $userId, [
        'email' => $user['email'],
        'reason' => $reason,
    ]);
    
    return [
        'success' => true,
        'userId' => $userId,
        'status' => 'suspended',
    ];
}

/**
 * Reactivate a suspended user
 * POST body: { userId }
 */
function admin_reactivateUser(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    
    $stmt = $pdo->prepare("SELECT id, email, status FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    if ($user['status'] !== 'suspended') {
        throw new Exception('User is not suspended');
    }
    
    $stmt = $pdo->prepare("
        UPDATE users 
        SET status = 'active', suspended_at = NULL, suspended_by = NULL, suspended_reason = NULL
        WHERE id = ?
    ");
    $stmt->execute([$userId]);
    
    // Audit log
    admin_auditLog($pdo, $adminUserId, 'user.reactivated', 'user', $userId, [
        'email' => $user['email'],
    ]);
    
    return [
        'success' => true,
        'userId' => $userId,
        'status' => 'active',
    ];
}

/**
 * Soft delete a user
 * POST body: { userId, reason }
 */
function admin_deleteUser(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    $reason = trim($input['reason'] ?? '');
    $hardDelete = $input['hardDelete'] ?? false;
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    
    $stmt = $pdo->prepare("SELECT id, email, role, status FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    
    // Prevent self-deletion
    if ($userId === $adminUserId) {
        throw new Exception('Cannot delete yourself');
    }
    
    // Prevent deleting owner unless hard delete explicitly confirmed
    if ($user['role'] === 'owner' && !$hardDelete) {
        throw new Exception('Cannot delete owner account. Use hardDelete flag if absolutely necessary.');
    }
    
    if ($hardDelete) {
        // HARD DELETE - actually remove from database
        // This will cascade delete vehicles, run_history, etc. due to FK constraints
        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$userId]);
            
            admin_auditLog($pdo, $adminUserId, 'user.hard_deleted', 'user', $userId, [
                'email' => $user['email'],
                'role' => $user['role'],
                'reason' => $reason,
            ]);
            
            $pdo->commit();
            
            return [
                'success' => true,
                'userId' => $userId,
                'deleted' => 'hard',
            ];
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } else {
        // SOFT DELETE - mark as deleted but keep data
        $stmt = $pdo->prepare("
            UPDATE users 
            SET status = 'deleted', deleted_at = NOW(), deleted_by = ?
            WHERE id = ?
        ");
        $stmt->execute([$adminUserId, $userId]);
        
        admin_auditLog($pdo, $adminUserId, 'user.soft_deleted', 'user', $userId, [
            'email' => $user['email'],
            'reason' => $reason,
        ]);
        
        return [
            'success' => true,
            'userId' => $userId,
            'deleted' => 'soft',
        ];
    }
}

/**
 * Update user role
 * POST body: { userId, role }
 */
function admin_updateUserRole(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    $newRole = $input['role'] ?? '';
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    if (!in_array($newRole, ['user', 'admin', 'beta', 'owner'])) {
        throw new Exception('Invalid role');
    }
    
    $stmt = $pdo->prepare("SELECT id, email, role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    
    $oldRole = $user['role'];
    
    // Prevent changing owner role (requires special permission)
    if ($oldRole === 'owner' || $newRole === 'owner') {
        // Only owner can change owner role
        $adminRole = rsa_getUserRole($pdo, $adminUserId);
        if ($adminRole !== 'owner') {
            throw new Exception('Only owner can modify owner role');
        }
    }
    
    $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->execute([$newRole, $userId]);
    
    // Bump capability version to force client refresh
    $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$userId]);
    
    admin_auditLog($pdo, $adminUserId, 'user.role_changed', 'user', $userId, [
        'email' => $user['email'],
        'old_role' => $oldRole,
        'new_role' => $newRole,
    ]);
    
    return [
        'success' => true,
        'userId' => $userId,
        'role' => $newRole,
    ];
}

/**
 * Assign plan to user manually
 * POST body: { userId, planId, expiresInDays?, reason? }
 */
function admin_assignPlan(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    $planId = trim($input['planId'] ?? '');
    $expiresInDays = isset($input['expiresInDays']) ? (int)$input['expiresInDays'] : null;
    $reason = trim($input['reason'] ?? '');
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    if (!$planId) {
        throw new Exception('Plan ID required');
    }
    
    // Validate plan exists
    $validPlans = ['free', 'basic', 'pro', 'team', 'nhra'];
    if (!in_array($planId, $validPlans)) {
        throw new Exception('Invalid plan ID');
    }
    
    $stmt = $pdo->prepare("SELECT id, email, assigned_plan FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    
    $expiresAt = $expiresInDays ? date('Y-m-d H:i:s', strtotime("+{$expiresInDays} days")) : null;
    
    $pdo->beginTransaction();
    try {
        // Update user record
        $stmt = $pdo->prepare("
            UPDATE users 
            SET assigned_plan = ?, assigned_plan_expires_at = ?, assigned_by = ?, billing_source = 'manual'
            WHERE id = ?
        ");
        $stmt->execute([$planId, $expiresAt, $adminUserId, $userId]);
        
        // Log assignment
        $stmt = $pdo->prepare("
            INSERT INTO user_plan_assignments (user_id, plan_id, action, source, assigned_by, reason, expires_at, created_at)
            VALUES (?, ?, 'assigned', 'manual', ?, ?, ?, NOW())
        ");
        $stmt->execute([$userId, $planId, $adminUserId, $reason, $expiresAt]);
        
        // Bump capability version
        $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$userId]);
        
        admin_auditLog($pdo, $adminUserId, 'user.plan_assigned', 'user', $userId, [
            'email' => $user['email'],
            'plan_id' => $planId,
            'expires_at' => $expiresAt,
            'reason' => $reason,
        ]);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'userId' => $userId,
            'planId' => $planId,
            'expiresAt' => $expiresAt,
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Remove manual plan assignment
 * POST body: { userId, reason? }
 */
function admin_removePlan(PDO $pdo, int $adminUserId, array $input): array {
    $userId = (int)($input['userId'] ?? 0);
    $reason = trim($input['reason'] ?? '');
    
    if (!$userId) {
        throw new Exception('User ID required');
    }
    
    $stmt = $pdo->prepare("SELECT id, email, assigned_plan FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    
    if (!$user) {
        throw new Exception('User not found');
    }
    
    $oldPlan = $user['assigned_plan'];
    
    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("
            UPDATE users 
            SET assigned_plan = NULL, assigned_plan_expires_at = NULL, assigned_by = NULL
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
        
        // Log removal
        if ($oldPlan) {
            $stmt = $pdo->prepare("
                INSERT INTO user_plan_assignments (user_id, plan_id, action, source, assigned_by, reason, created_at)
                VALUES (?, ?, 'removed', 'manual', ?, ?, NOW())
            ");
            $stmt->execute([$userId, $oldPlan, $adminUserId, $reason]);
        }
        
        // Bump capability version
        $pdo->prepare("UPDATE users SET capability_version = capability_version + 1 WHERE id = ?")->execute([$userId]);
        
        admin_auditLog($pdo, $adminUserId, 'user.plan_removed', 'user', $userId, [
            'email' => $user['email'],
            'old_plan' => $oldPlan,
            'reason' => $reason,
        ]);
        
        $pdo->commit();
        
        return [
            'success' => true,
            'userId' => $userId,
            'removedPlan' => $oldPlan,
        ];
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

/**
 * Get user plan assignment history
 * GET params: userId
 */
function admin_getUserPlanHistory(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare("
        SELECT upa.*, u.email as assigned_by_email
        FROM user_plan_assignments upa
        LEFT JOIN users u ON upa.assigned_by = u.id
        WHERE upa.user_id = ?
        ORDER BY upa.created_at DESC
        LIMIT 50
    ");
    $stmt->execute([$userId]);
    
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Audit log helper
 */
function admin_auditLog(PDO $pdo, int $actorId, string $action, string $targetType, int $targetId, array $metadata): void {
    $stmt = $pdo->prepare("
        INSERT INTO admin_actions (actor_user_id, action, target_type, target_id, metadata, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $actorId,
        $action,
        $targetType,
        $targetId,
        json_encode($metadata),
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}
