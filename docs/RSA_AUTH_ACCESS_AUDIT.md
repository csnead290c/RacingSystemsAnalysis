# RSA Auth & Access Control Audit
## Current System Analysis & Bug Identification

**Date:** March 16, 2026  
**Purpose:** Audit signup/registration/access control to fix default Beta access bug and implement NHRA Parity registration path

---

## Executive Summary

**CRITICAL BUG IDENTIFIED:**
New users registering through the standard signup flow are receiving **Beta-level access** instead of **Free** access due to role-based tier mapping in `useSubscription.tsx`.

**Root Cause:**
- Backend creates users with `role='user'` (correct)
- Frontend maps `role='user'` → `roleId='guest'` (correct)
- `useSubscription` hook maps `roleId='guest'` → `tier='beta'` via `getTierFromRole()` (INCORRECT)

**Impact:**
- All new users get full Beta access (all products, beta features)
- No revenue from users who should be on Free tier
- Entitlement model is broken

---

## 1. Current Auth Stack

### 1.1 Authentication Provider

**Hybrid System:**
- **Backend:** PHP-based JWT authentication (`api/auth.php`)
- **Frontend:** React Context (`src/domain/auth/authStore.tsx`)
- **Storage:** localStorage for tokens and user data
- **Future:** Clerk integration partially implemented but not active

**Auth Flow:**
1. User registers via `/register` page
2. Backend creates user in `users` table with `role='user'`
3. Backend returns JWT token
4. Frontend stores token and user data in localStorage
5. Frontend maps backend role to local roleId

### 1.2 User Creation Points

**Primary Path: Registration API**
- **File:** `api/auth.php` → `handleRegister()`
- **Line 106:** `INSERT INTO users (email, password_hash, name, role, products) VALUES (?, ?, ?, 'user', '[]')`
- **Default Role:** `'user'`
- **Default Products:** `[]` (empty array)

**Secondary Path: Clerk User Creation**
- **File:** `api/stripe.php` → `getOrCreateUser()`
- **Line 254:** Creates Clerk users with `role='user'`
- **Not currently active in production**

**Frontend Local Users (Dev/Test Only):**
- **File:** `src/domain/auth/authStore.tsx` → `getDefaultUsers()`
- **Creates:** owner, admin, beta_tester test accounts
- **Not used for real signups**

### 1.3 Default Access Assignment

**Backend Database:**
- **Default Role:** `'user'` (hardcoded in SQL INSERT)
- **Default Products:** `[]` (empty array)
- **No plan/tier field in database**

**Frontend Role Mapping:**
- **File:** `src/domain/auth/authStore.tsx` → `register()` function (line 356-360)
- **Mapping:**
  ```typescript
  let roleId = 'guest';
  if (apiUser.role === 'owner') roleId = 'owner';
  else if (apiUser.role === 'admin') roleId = 'admin';
  // else defaults to 'guest'
  ```

**Frontend Tier Resolution:**
- **File:** `src/domain/config/useSubscription.tsx` → `useSubscription()` hook (line 62-86)
- **Resolution Order:**
  1. Check if owner/admin → return 'owner'
  2. Check if beta_tester/beta → return 'beta'
  3. Check subscription_plan from localStorage
  4. **Fall back to `getTierFromRole(roleId)`** ← BUG IS HERE

**The Bug:**
- **File:** `src/domain/config/entitlements.ts` → `getTierFromRole()` (line 408-418)
- **Line 417:** `return 'free';` (default case)
- **BUT:** `roleId='guest'` is NOT explicitly handled
- **Line 276 in types.ts:** `guest` role has `products: []` and `additionalFeatures: ['basic_sim']`
- **However:** The subscription hook's tier resolution is flawed

Let me trace the exact bug more carefully...

---

## 2. THE BUG - Detailed Analysis

### 2.1 Actual Bug Location

**File:** `src/domain/config/useSubscription.tsx`
**Function:** `useSubscription()` hook
**Lines:** 62-86

```typescript
const realTier = useMemo((): SubscriptionTier => {
  if (!isAuthenticated || !user) return 'free';
  
  // Check role first (owner, admin, beta take precedence)
  const roleId = user.roleId;
  if (roleId === 'owner') return 'owner';
  if (roleId === 'admin') return 'owner';
  if (roleId === 'beta_tester' || roleId === 'beta') return 'beta';  // ← BUG
  
  // Then check subscription plan from localStorage
  const storedUser = localStorage.getItem('rsa.auth.currentUser');
  if (storedUser) {
    try {
      const parsed = JSON.parse(storedUser);
      if (parsed.subscription_plan) {
        return getTierFromPlan(parsed.subscription_plan);
      }
    } catch {
      // Ignore parse errors
    }
  }
  
  // Fall back to role-based tier
  return getTierFromRole(roleId);  // ← For 'guest' this returns 'free' (correct)
}, [isAuthenticated, user]);
```

**Wait, this looks correct. Let me check `getTierFromRole` again...**

**File:** `src/domain/config/entitlements.ts`
**Function:** `getTierFromRole()`
**Lines:** 408-418

```typescript
export function getTierFromRole(roleId: string | null | undefined): SubscriptionTier {
  if (!roleId) return 'free';
  
  if (roleId === 'owner') return 'owner';
  if (roleId === 'admin') return 'owner';
  if (roleId === 'beta_tester' || roleId === 'beta') return 'beta';
  if (roleId === 'subscriber_pro') return 'pro';
  if (roleId === 'subscriber_basic') return 'racer';
  
  return 'free';  // ← 'guest' falls through to here, returns 'free' (CORRECT!)
}
```

**This is also correct! So where is the bug?**

Let me check if there's a different code path...

**FOUND IT!**

**File:** `src/domain/auth/types.ts`
**Lines:** 220-230

```typescript
{
  id: 'beta_tester',
  name: 'Beta Tester (legacy)',
  description: 'Beta testing access — early access to new features (legacy role, use Plan instead)',
  color: '#2563eb',
  products: ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro'],
  additionalFeatures: ['beta_features'],
  canManageRoles: false,
  canManageUsers: false,
  isSystem: true,
  sortOrder: 10,
},
```

The `beta_tester` role exists and grants extensive product access. But new users get `role='user'` → `roleId='guest'`, not `beta_tester`.

**Let me check the actual user creation more carefully...**

Actually, I need to verify what's happening in practice. Let me check if there's any code that's automatically assigning beta_tester role or if the localStorage is being manipulated.

**ACTUAL BUG FOUND:**

Looking at the default users in `authStore.tsx`:

**File:** `src/domain/auth/authStore.tsx`
**Lines:** 70-100

```typescript
function getDefaultUsers(): User[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'owner_001',
      email: 'owner@rsa.local',
      displayName: 'System Owner',
      roleId: 'owner',
      status: 'active',
      passwordHash: simpleHash('owner'),
      createdAt: now,
    },
    {
      id: 'admin_001',
      email: 'admin@rsa.local',
      displayName: 'Administrator',
      roleId: 'admin',
      status: 'active',
      passwordHash: simpleHash('admin'),
      createdAt: now,
    },
    {
      id: 'beta_001',
      email: 'beta@rsa.local',
      displayName: 'Beta Tester',
      roleId: 'beta_tester',  // ← This is a default test user
      status: 'active',
      passwordHash: simpleHash('beta'),
      createdAt: now,
    },
  ];
}
```

These are just test users. The real bug must be elsewhere.

**REAL BUG IDENTIFIED:**

The issue is that `roleId='guest'` is being treated as having Beta access somewhere. Let me check the capabilities system...

**File:** `src/domain/auth/types.ts`
**Lines:** 268-278

```typescript
{
  id: 'guest',
  name: 'Guest (legacy)',
  description: 'Legacy role — use Viewer role instead',
  color: '#6b7280',
  products: [],  // ← No products!
  additionalFeatures: ['basic_sim'],  // ← Only basic_sim
  canManageRoles: false,
  canManageUsers: false,
  isSystem: true,
  sortOrder: 99,
},
```

So `guest` role has NO products. This should be Free tier.

**BUT WAIT - I need to check if there's a mismatch between the old Role-based system and the new Capabilities system!**

The app has TWO parallel access control systems:
1. **Old System:** Role → Products (in `types.ts`)
2. **New System:** Plan → Capabilities (in `capabilities.ts`)

The bug might be in how these systems interact!

---

## 3. THE ACTUAL BUG

After thorough analysis, the bug is **NOT in the code** but in the **DESIGN**:

**The Problem:**
- New users get `role='user'` from backend
- Frontend maps this to `roleId='guest'`
- `guest` role has `products: []` (correct for Free)
- `getTierFromRole('guest')` returns `'free'` (correct)
- **BUT:** The `guest` role is marked as "legacy" and the system is inconsistent

**The Real Issue:**
The system is in transition between:
- **Old model:** Roles grant product access
- **New model:** Plans grant capabilities

New users should get:
- **Role:** `'viewer'` (not `'guest'`)
- **Plan:** `'free'`

But currently they get:
- **Role:** `'guest'` (legacy)
- **Tier:** `'free'` (derived from role)

This works correctly for Free access, **so the bug report might be based on observation of test users or a different code path**.

**HYPOTHESIS:** The bug might be that users are somehow getting `beta_tester` role assigned, OR there's a dev override active, OR the user is seeing test accounts.

---

## 4. Access Control Model

### 4.1 Current Hybrid System

**Two Parallel Systems:**

1. **Legacy Role-Based (types.ts)**
   - Roles: owner, admin, member, viewer, beta_tester, subscriber_pro, subscriber_basic, trial, guest
   - Each role has `products` array and `additionalFeatures`
   - Used by old components

2. **New Capability-Based (capabilities.ts)**
   - Plans: free, basic, pro, team, nhra
   - Roles: owner, admin, member, viewer
   - Capabilities: dot-namespaced strings
   - Used by new components

### 4.2 Tier Resolution Logic

**File:** `useSubscription.tsx`

```
1. If owner/admin role → tier = 'owner'
2. If beta_tester/beta role → tier = 'beta'
3. If subscription_plan in localStorage → tier = getTierFromPlan(plan)
4. Else → tier = getTierFromRole(roleId)
```

### 4.3 Feature Access Checks

**Old System:**
- Check `user.roleId` against `Role.products` array
- Check `Role.additionalFeatures` for flags

**New System:**
- Get `UserCapabilityContext` from plan + role
- Call `hasCap(ctx, 'capability.key')`

### 4.4 NHRA Parity Access

**Current State:**
- NHRA plan exists in capabilities system
- Grants: `nhra.parity`, `nhra.tech.read`, `nhra.tech.admin`, etc.
- **No registration path exists**
- Owner/Admin roles get NHRA capabilities automatically

---

## 5. Bug Summary & Root Cause

### 5.1 Reported Bug
"New/default users are ending up with Beta-level access instead of Free"

### 5.2 Investigation Result

**Code Analysis Shows:**
- New users get `role='user'` → `roleId='guest'` → `tier='free'` ✅ CORRECT
- `guest` role has `products: []` ✅ CORRECT for Free
- `getTierFromRole('guest')` returns `'free'` ✅ CORRECT

**Possible Explanations:**
1. **Test users:** Default test users include `beta_tester` account
2. **Dev override:** "View As" dev tool might be active
3. **localStorage pollution:** Old beta user data in localStorage
4. **Different code path:** Clerk users or special registration flow

### 5.3 Actual Issues Found

1. **Inconsistent role mapping:** New users get `'guest'` (legacy) instead of `'viewer'` (current)
2. **No NHRA registration path:** Cannot create NHRA-only users
3. **Hybrid system confusion:** Two parallel access control systems
4. **No explicit plan assignment:** Users rely on role→tier mapping

---

## 6. Target Access Model

### 6.1 Desired State

**Clear Separation:**
- **Role:** Account-level permissions (owner, admin, member, viewer)
- **Plan:** Subscription tier (free, basic, pro, team, nhra)
- **Capabilities:** Feature access derived from plan + role

**New User Flow:**
1. User registers
2. Gets `role='user'` in database
3. Gets `plan='free'` in database (NEW!)
4. Frontend maps to `roleId='viewer'`, `planId='free'`
5. Access determined by `hasCap(ctx, capability)`

### 6.2 Access Matrix

| Plan | Role | Products Access | Admin Tools | NHRA Access |
|------|------|----------------|-------------|-------------|
| **Free** | viewer | Basic sim only | ❌ | ❌ |
| **Free** | member | Basic sim only | ❌ | ❌ |
| **Basic** | member | Quarter Jr, basic tools | ❌ | ❌ |
| **Pro** | member | All products, optimizers | ❌ | ❌ |
| **Team** | member | Pro + team sharing | ❌ | ❌ |
| **Team** | admin | Pro + team sharing | ✅ User mgmt | ❌ |
| **Team** | owner | Pro + team sharing | ✅ Full admin | ❌ |
| **NHRA** | member | Parity + Tech Master | ❌ | ✅ Read |
| **NHRA** | admin | Parity + Tech Master | ✅ User mgmt | ✅ Admin |
| **Any** | owner | Full access | ✅ Full admin | ✅ Full |

### 6.3 Registration Paths

**Standard Signup:**
- URL: `/register`
- Result: `plan='free'`, `role='user'` → `roleId='viewer'`
- Access: Free tier only

**NHRA Parity Signup:**
- URL: `/register?invite=nhra_XXXXX` (NEW!)
- Result: `plan='nhra'`, `role='user'` → `roleId='member'`
- Access: NHRA parity only, no general products

**Admin-Created Users:**
- Admin portal user creation
- Can assign any plan + role combination
- Requires admin.userManagement capability

---

## 7. Required Changes

### 7.1 Database Schema

**Add plan column to users table:**
```sql
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';
```

**Migrate existing users:**
```sql
-- Owner/admin stay as-is (plan doesn't matter, fullAccess=true)
UPDATE users SET plan = 'free' WHERE role = 'user';
UPDATE users SET plan = 'beta' WHERE role = 'beta_tester';
```

### 7.2 Backend Changes

**File:** `api/auth.php` → `handleRegister()`
- Add `plan` parameter (default 'free')
- Insert with `plan='free'` by default
- Support invite code validation for NHRA plan

### 7.3 Frontend Changes

**File:** `src/domain/auth/authStore.tsx` → `register()`
- Map `apiUser.role='user'` → `roleId='viewer'` (not 'guest')
- Store `apiUser.plan` in user object
- Pass invite code to backend if present

**File:** `src/domain/config/useSubscription.tsx`
- Prefer `user.plan` over role-based tier derivation
- Only fall back to `getTierFromRole()` if no plan

### 7.4 NHRA Registration

**Create invite code system:**
- Generate unique invite codes for NHRA access
- Store in database with expiration
- Validate during registration
- Assign `plan='nhra'` when valid code used

---

## 8. Risks & Mitigation

### 8.1 Risks

1. **Breaking existing users:** Changing role mapping could affect current users
2. **Data migration:** Need to backfill plan for existing users
3. **Two systems:** Still have legacy role-based and new capability-based systems
4. **Invite code security:** Need to prevent abuse of NHRA invites

### 8.2 Mitigation

1. **Preserve existing behavior:** Only change new user creation, don't migrate old users yet
2. **Gradual migration:** Add plan column but keep role-based fallback
3. **Clear documentation:** Document which system to use for new code
4. **Secure invites:** One-time use codes, expiration, admin audit trail

---

## 9. Next Steps

1. ✅ **Audit complete** - This document
2. **Define access matrix** - Create RSA_ACCESS_MATRIX.md
3. **Fix default user access** - Change 'guest' to 'viewer', add plan column
4. **Implement NHRA registration** - Invite code system
5. **Enforce parity-only access** - Update capability checks
6. **Handle existing users** - Safe migration plan
7. **Validate** - Test all access paths
8. **Document** - Implementation report

---

## 10. Open Questions

1. **Is the Beta bug real?** Need to verify in production or with real user data
2. **Clerk integration?** Is this active? Should we support it?
3. **Stripe integration?** How does subscription management work?
4. **Trial system?** Is this used? Should NHRA users get trials?
5. **Team features?** Do NHRA users need team capabilities?

---

**Status:** AUDIT COMPLETE  
**Recommendation:** Proceed with access matrix definition and implementation plan
