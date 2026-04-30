# Admin Portal Overhaul - Implementation Progress

**Date:** March 19, 2026  
**Status:** Backend Complete, Frontend In Progress

---

## COMPLETED: Backend Implementation

### 1. Schema Migration (v31) ✅

**File:** `api/migrate-v31-admin-overhaul.php`

**New Tables:**
- `user_invites` - Email invite workflow with tokens
- `user_plan_assignments` - Audit trail for manual plan grants
- `plans` - Plan metadata (display_name, visibility, Stripe mapping)
- `admin_actions` - Enhanced audit log for admin operations

**New User Columns:**
- `status` ENUM('invited', 'active', 'suspended', 'deleted')
- `billing_source` ENUM('none', 'manual', 'stripe')
- `assigned_plan` VARCHAR(50) - Manual plan assignment
- `assigned_plan_expires_at` TIMESTAMP
- `assigned_by` INT
- `suspended_at`, `suspended_by`, `suspended_reason`
- `deleted_at`, `deleted_by`
- `invite_token`, `invite_expires_at`, `invited_by`

**Migration Features:**
- Safe to re-run
- Auto-migrates existing users to 'active' status
- Sets billing_source based on stripe_customer_id
- Seeds default plans (free, basic, pro, team, nhra)

### 2. User Lifecycle API ✅

**File:** `api/lib/admin-user-lifecycle.php`

**Functions Implemented:**
- `admin_createUser()` - Create user manually with optional plan
- `admin_inviteUser()` - Send invite email with token
- `admin_suspendUser()` - Suspend user account
- `admin_reactivateUser()` - Reactivate suspended user
- `admin_deleteUser()` - Soft/hard delete with safeguards
- `admin_updateUserRole()` - Change user role with owner protection
- `admin_assignPlan()` - Manually assign plan to user
- `admin_removePlan()` - Remove manual plan assignment
- `admin_getUserPlanHistory()` - Get plan assignment audit trail
- `admin_auditLog()` - Enhanced audit logging

**Security Features:**
- Prevents self-suspension/deletion
- Owner role protection (only owner can modify owner)
- Hard delete requires explicit flag
- All mutations logged to admin_actions table
- Capability version bumping for client refresh

### 3. Admin API Endpoints ✅

**File:** `api/admin.php` (extended)

**New Endpoints:**

**User Lifecycle:**
- POST `/api/admin.php?action=create-user`
- POST `/api/admin.php?action=invite-user`
- POST `/api/admin.php?action=suspend-user`
- POST `/api/admin.php?action=reactivate-user`
- POST `/api/admin.php?action=delete-user`
- POST `/api/admin.php?action=update-user-role`

**Plan Management:**
- POST `/api/admin.php?action=assign-plan`
- POST `/api/admin.php?action=remove-plan`
- GET `/api/admin.php?action=get-plan-history&userId=N`
- GET `/api/admin.php?action=list-plans`
- POST `/api/admin.php?action=update-plan`

**Enhanced Existing:**
- `search-users` - Now supports filters: status, role, plan, billingSource
- `user-details` - Now includes lifecycle status, billing source, plan assignments
- `get-plan-capabilities` - Now includes NHRA plan

**Total Endpoints:** 21 (was 10)

### 4. Capability Requirements ✅

All mutation endpoints require `admin.userManagement` capability:
- User lifecycle operations
- Plan assignments
- Role changes
- Plan metadata updates

Read-only endpoints require `admin.access`:
- Search users
- User details
- Plan list
- Plan capabilities

---

## KEY ARCHITECTURAL DECISIONS

### 1. Separation of Entitlements vs Billing ✅

**Problem:** Old schema conflated `subscription_plan` (entitlement) with Stripe billing status.

**Solution:**
- `assigned_plan` - Manual admin-granted entitlement (independent of Stripe)
- `billing_source` - Tracks how plan was granted (none/manual/stripe)
- `subscription_plan` - Legacy Stripe-linked plan (preserved for compatibility)

**Effective Plan Resolution:**
```
1. Check assigned_plan (manual admin grant) - HIGHEST PRIORITY
2. Check subscription_plan if Stripe subscription active
3. Default to 'free'
```

### 2. User Lifecycle Status ✅

**States:**
- `invited` - Pending invite acceptance
- `active` - Normal user
- `suspended` - Temporarily blocked
- `deleted` - Soft deleted (data preserved)

**Hard Delete:**
- Requires explicit `hardDelete: true` flag
- Cannot delete owner without flag
- Cascades to vehicles, run_history, etc.

### 3. Audit Trail ✅

**Two-Level Logging:**
1. `admin_actions` - High-level admin operations
2. `user_plan_assignments` - Detailed plan assignment history

**Metadata Captured:**
- Actor (who performed action)
- Target (user/plan affected)
- Timestamp
- Reason (optional)
- IP address
- Full change details in JSON

---

## REMAINING WORK: Frontend

### Phase 1: TypeScript API Client

**File:** `src/services/adminApi.ts` (NEW)

**Types Needed:**
```typescript
interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'beta' | 'owner';
  status: 'invited' | 'active' | 'suspended' | 'deleted';
  billing_source: 'none' | 'manual' | 'stripe';
  assigned_plan: string | null;
  subscription_plan: string | null;
  // ... etc
}

interface Plan {
  plan_id: string;
  display_name: string;
  description: string;
  visibility: 'public' | 'internal' | 'hidden' | 'archived';
  user_count: number;
  // ... etc
}
```

**Methods Needed:**
- User lifecycle: createUser, inviteUser, suspendUser, reactivateUser, deleteUser, updateUserRole
- Plan management: assignPlan, removePlan, getPlanHistory, listPlans, updatePlan
- Enhanced search: searchUsers with filters

### Phase 2: Enhanced AdminPortal.tsx

**Users Tab Enhancements:**
- Filter dropdowns (Status, Role, Plan, Billing Source)
- Pagination controls
- Bulk selection checkboxes
- Row action menu (Edit, Suspend, Delete, etc.)
- "Create User" and "Invite User" buttons

**User Details Tab Enhancements:**
- Lifecycle status badge with actions
- Role editor (dropdown, not text)
- Plan assignment section with dropdown
- Billing source display
- Plan history timeline
- Suspend/Reactivate/Delete buttons with confirmation

**Plans Tab Enhancements:**
- Edit NHRA plan (currently blocked)
- Create new plan button
- Clone plan button
- Plan metadata editor (display name, description, visibility)
- Stripe mapping fields
- User count per plan

### Phase 3: New UI Components

**Modals:**
- `CreateUserModal.tsx` - Form for manual user creation
- `InviteUserModal.tsx` - Form for sending invites
- `AssignPlanModal.tsx` - Dropdown-based plan assignment
- `ConfirmDeleteModal.tsx` - Safe deletion with warnings
- `EditPlanModal.tsx` - Plan metadata editor

**Forms:**
- `UserLifecycleActions.tsx` - Suspend/Reactivate/Delete buttons
- `PlanAssignmentForm.tsx` - Dropdown + expiration + reason
- `RoleEditor.tsx` - Dropdown with owner protection

**Components:**
- `StatusBadge.tsx` - Lifecycle status indicator
- `BillingSourceBadge.tsx` - Manual/Stripe/None indicator
- `PlanHistoryTimeline.tsx` - Visual plan assignment history

### Phase 4: Tests

**API Tests:**
- User lifecycle operations
- Plan assignment flows
- Permission enforcement
- Audit log generation

**UI Tests:**
- Modal interactions
- Form validation
- Dropdown selections
- Confirmation flows

---

## DEPLOYMENT CHECKLIST

### Before Deployment:

1. ✅ Run migration v31 on production database
2. ⬜ Test all new API endpoints
3. ⬜ Verify capability enforcement
4. ⬜ Test manual plan assignment
5. ⬜ Test user suspension/reactivation
6. ⬜ Verify NHRA plan is editable
7. ⬜ Test invite workflow
8. ⬜ Verify audit logging

### After Deployment:

1. ⬜ Manually assign NHRA plan to test user
2. ⬜ Edit NHRA plan capabilities
3. ⬜ Create test user manually
4. ⬜ Send test invite
5. ⬜ Suspend and reactivate test user
6. ⬜ Verify audit log entries
7. ⬜ Test filters and pagination
8. ⬜ Verify Stripe users still work

---

## MANUAL VERIFICATION STEPS

### User Lifecycle:
1. Create user manually → Verify appears in list as 'active'
2. Invite user → Verify invite token generated
3. Suspend user → Verify status changes, user cannot login
4. Reactivate user → Verify status changes, user can login
5. Soft delete user → Verify status='deleted', data preserved
6. Hard delete user → Verify user removed from database

### Plan Assignment:
1. Assign 'pro' plan manually → Verify user gains pro capabilities
2. Set expiration date → Verify plan expires correctly
3. Remove plan → Verify user loses capabilities
4. View plan history → Verify all assignments logged

### Plans Management:
1. Edit NHRA plan display name → Verify saves correctly
2. Add capability to NHRA → Verify users gain capability
3. Remove capability from NHRA → Verify users lose capability
4. Create new plan → Verify appears in list
5. Update plan visibility → Verify affects display

### Filters and Search:
1. Filter by status='suspended' → Verify only suspended users shown
2. Filter by plan='nhra' → Verify only NHRA users shown
3. Search by email → Verify partial matches work
4. Combine filters → Verify AND logic works

---

## KNOWN LIMITATIONS

1. **Email Sending:** Invite and welcome emails not implemented (TODO comments added)
2. **Bulk Actions:** Backend supports individual operations, bulk UI not implemented
3. **CSV Export:** Users list export not implemented
4. **Plan Cloning:** Backend not implemented, UI placeholder only
5. **Invite Acceptance:** Register page needs update to handle invite tokens

---

## FILES CREATED/MODIFIED

### Created:
- `api/migrate-v31-admin-overhaul.php` (331 lines)
- `api/lib/admin-user-lifecycle.php` (548 lines)
- `docs/ADMIN_PORTAL_OVERHAUL_PROGRESS.md` (this file)

### Modified:
- `api/admin.php` (+327 lines, 21 endpoints total)

### To Create:
- `src/services/adminApi.ts`
- `src/pages/admin/CreateUserModal.tsx`
- `src/pages/admin/InviteUserModal.tsx`
- `src/pages/admin/AssignPlanModal.tsx`
- `src/pages/admin/ConfirmDeleteModal.tsx`
- `src/pages/admin/EditPlanModal.tsx`

### To Modify:
- `src/pages/AdminPortal.tsx` (major refactor)

---

## NEXT IMMEDIATE STEPS

1. Create TypeScript API client (`src/services/adminApi.ts`)
2. Update `AdminPortal.tsx` Users tab with filters and actions
3. Update `AdminPortal.tsx` User Details tab with lifecycle controls
4. Update `AdminPortal.tsx` Plans tab to enable NHRA editing
5. Create modal components for user lifecycle operations
6. Add tests
7. Deploy and verify

---

## SUCCESS CRITERIA

✅ **Backend Complete:**
- Schema supports user lifecycle states
- API supports manual plan assignment
- Entitlements separated from billing
- NHRA plan can be edited via API

⬜ **Frontend Complete:**
- Admin can create users manually
- Admin can invite users by email
- Admin can suspend/reactivate users
- Admin can assign plans via dropdown
- Admin can edit NHRA plan
- All actions have confirmation dialogs
- Audit log shows all admin actions

⬜ **Production Verified:**
- Manual plan assignment works
- NHRA plan editing works
- User suspension works
- Invite workflow works
- No regressions in existing functionality
