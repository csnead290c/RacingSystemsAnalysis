# RSA Auth & Access Closeout Plan
## Comprehensive Enforcement Audit & Hardening Strategy

**Date:** March 17, 2026  
**Purpose:** Map actual access enforcement, identify inconsistencies, harden Free/NHRA flows, validate end-to-end

---

## Executive Summary

**Current State:** Access enforcement is **split across THREE parallel systems** with inconsistent usage:
1. **Legacy Role/Product-based** (authStore, hasFeature, hasProduct)
2. **Tier-based** (useSubscription, features object)
3. **Capability-based** (useCapabilities, hasCap, plan+role)

**Critical Issues Found:**
- ❌ Route guards use legacy `requireFeature` (role/product-based)
- ❌ Navigation visibility uses mixed tier + legacy checks
- ❌ NHRA pages check capabilities internally but routes don't enforce
- ❌ No centralized source of truth for access decisions
- ❌ Plan field exists in DB but not consistently used
- ❌ Free vs Beta vs NHRA enforcement is scattered

**Target State:** Single capability-based enforcement with clear plan+role resolution.

---

## 1. Current Enforcement Path - Detailed Map

### 1.1 Where Plan is Read

**Database:**
- `users.plan` column exists (added in v32 migration)
- Default value: `'free'`
- Set during registration via invite code or defaults to 'free'

**Backend:**
- `api/auth.php` - Returns `plan` in registration response
- **NOT read by backend for access checks** - backend uses role + products

**Frontend:**
- `src/domain/auth/authStore.tsx` - Stores `subscription_plan` in localStorage if `apiUser.plan` exists
- `src/domain/config/useCapabilities.ts` - Reads from localStorage, converts via `planFromLegacyTier()`
- `src/domain/config/useSubscription.tsx` - Reads from localStorage, converts via `getTierFromPlan()`

**Actual Usage:**
- ✅ `useCapabilities` hook reads plan → builds UserCapabilityContext → used by `hasCap()`
- ⚠️ `useSubscription` hook reads plan → derives tier → used by legacy feature checks
- ❌ Most components use `useSubscription` (tier-based), NOT `useCapabilities` (plan-based)

### 1.2 Where Role is Read

**Database:**
- `users.role` column (values: 'owner', 'admin', 'user', 'beta')
- Default value: `'user'`

**Backend:**
- `api/functions.php` - `rsa_getUserRole()` reads from DB
- Used for capability checks in `rsa_requireAuthAndCap()`
- Backend has PHP capability system in `api/lib/capabilities.php`

**Frontend:**
- `src/domain/auth/authStore.tsx` - Maps API role to local `roleId`
  - `'user'` → `'viewer'` (CHANGED in recent implementation)
  - `'owner'` → `'owner'`
  - `'admin'` → `'admin'`
  - `'beta'` → `'beta_tester'`
- Stored in `user.roleId` in auth state

**Actual Usage:**
- ✅ `useCapabilities` - Converts roleId to RoleId, adds role capabilities
- ✅ `ProtectedRoute` - Checks `requireRole` against `user.roleId`
- ✅ Navigation - Uses `isInternalUser(visCtx)` which checks roleId
- ⚠️ Mixed usage of legacy roleId strings vs new RoleId type

### 1.3 Where Products are Read

**Database:**
- `users.products` column (JSON array of product IDs)
- Default value: `'[]'` (empty array)

**Backend:**
- Returned in auth responses
- **NOT used for access checks** - backend uses capabilities

**Frontend:**
- `src/domain/auth/authStore.tsx` - Stored in localStorage as `rsa.auth.apiProducts`
- `authStore` provides `hasProduct()` function
- `ProtectedRoute` supports `requireProduct` prop

**Actual Usage:**
- ⚠️ Legacy system only - used by old `ProtectedRoute` guards
- ❌ NOT aligned with new capability system
- ❌ Products array is always empty for new users
- ⚠️ Some routes still use `requireProduct="engine_pro"` etc.

### 1.4 Where Capabilities are Derived

**Capability System (NEW):**

**Definition:**
- `src/domain/config/capabilities.ts` - Defines all capabilities
- `PLAN_CAPABILITIES` - Maps plan → Set<Capability>
- `ROLE_CAPABILITIES` - Maps role → Set<Capability> (additive)
- `hasCap(ctx, capability)` - Single source of truth function

**Resolution:**
```typescript
// In useCapabilities hook
1. Get user from auth
2. Get plan from localStorage.subscription_plan OR tier mapping
3. Get role from user.roleId
4. Build UserCapabilityContext { plan, role, fullAccess, trial }
5. hasCap() checks:
   - fullAccess → true (owner/beta)
   - trial overlay → check trial plan capabilities
   - plan capabilities → check PLAN_CAPABILITIES[plan]
   - role capabilities → check ROLE_CAPABILITIES[role]
```

**Actual Usage:**
- ✅ `useCapabilities()` hook provides `can(capability)` function
- ✅ Used in ParityPortal, TechMasterShell for NHRA checks
- ✅ Used in Navigation for nav visibility
- ❌ **NOT used by ProtectedRoute** - still uses legacy features/products
- ❌ **NOT used by most page components** - they use useSubscription

### 1.5 Route Guards - What Actually Enforces Access

**File:** `src/shared/components/ProtectedRoute.tsx`

**Current Implementation:**
```typescript
// 1. Authentication check
if (requireAuth && !isAuthenticated) → redirect to /login

// 2. Role check
if (requireRole) {
  const roles = Array.isArray(requireRole) ? requireRole : [requireRole];
  const userRole = user?.roleId;
  if (!userRole || !roles.includes(userRole)) → AccessDenied
}

// 3. Feature check (LEGACY)
if (requireFeature) {
  const hasIt = hasFeature(requireFeature);  // ← Uses authStore.hasFeature()
  if (!hasIt) → AccessDenied
}

// 4. Product check (LEGACY)
if (requireProduct && !hasProduct(requireProduct)) → AccessDenied
```

**How hasFeature() Works:**
```typescript
// In authStore.tsx
hasFeature: (feature: FeatureFlag) => {
  const role = roles.find(r => r.id === user?.roleId);
  if (!role) return false;
  return role.additionalFeatures.includes(feature);
}
```

**Problem:** This checks `Role.additionalFeatures` from `types.ts`, NOT the capability system!

**Routes Using Legacy Guards:**
- `/vehicles` - `requireFeature="save_vehicles"`
- `/et-sim` - `requireFeature="et_sim"`
- `/log` - `requireFeature="run_logging"`
- `/history` - `requireFeature="run_logging"`
- `/dial-in` - `requireFeature="race_tools"`
- `/opponents` - `requireFeature="race_tools"`
- `/race-day` - `requireFeature="race_tools"`
- `/clutch-sim` - `requireFeature="clutch_sim"`
- `/engine-pro` - `requireProduct="engine_pro"`
- `/suspension-sim` - `requireProduct="fourlink"`

**Routes Using Role Guards:**
- `/admin` - `requireRole={['owner', 'admin']}`
- `/dev` - `requireRole={['owner', 'admin']}`

**Routes With NO Guards (just auth):**
- `/account`
- `/engine-sim`
- `/team`
- `/parity` - **Internal capability check only**
- `/tech` - **Internal capability check only**

### 1.6 Navigation Visibility - What Shows/Hides Nav Links

**File:** `src/app/App.tsx` - `Navigation()` component

**Current Implementation:**
```typescript
const { isAuthenticated, hasFeature, user } = useAuth();
const { can } = useCapabilities();
const { features } = useSubscription();

// Mixed checks:
const canAccessVehiclesNav = isLoggedIn && canAccessVehicles({ hasFeature });
const canAccessETSim = isLoggedIn && canAccessEtSim({ hasFeature });
const canAccessEngineSim = isLoggedIn;
const canAccessHistory = isLoggedIn && canAccessRunLogging({ hasFeature });
const canAccessTeam = isLoggedIn && features.teamManagement;
```

**Helper Functions:**
```typescript
// From src/domain/ui/accessGuards.ts
function canAccessVehicles({ hasFeature }: { hasFeature: (f: FeatureFlag) => boolean }): boolean {
  return hasFeature('save_vehicles');
}

function canAccessEtSim({ hasFeature }: { hasFeature: (f: FeatureFlag) => boolean }): boolean {
  return hasFeature('et_sim');
}

function canAccessRunLogging({ hasFeature }: { hasFeature: (f: FeatureFlag) => boolean }): boolean {
  return hasFeature('run_logging');
}
```

**Problem:** Nav visibility uses legacy `hasFeature()` from authStore, NOT capabilities!

**Tier Pills:**
```typescript
const getQuarterTier = (can: (cap: Capability) => boolean): string => {
  if (can('sim.advanced')) return 'Pro';
  if (can('sim.et')) return 'Jr';
  return 'Free';
};
```

**This DOES use capabilities!** So we have mixed usage even within Navigation.

### 1.7 NHRA Parity/Tech Master Enforcement

**Routes:**
- `/parity` - ProtectedRoute with auth only, InternalRoute wrapper
- `/tech` - ProtectedRoute with auth only, InternalRoute wrapper
- `/parity/analysis/:id` - ProtectedRoute with auth only, InternalRoute wrapper

**InternalRoute:**
```typescript
// Checks isInternalUser(visCtx) which checks roleId === owner/admin OR isDev
// Does NOT check NHRA plan or capabilities
```

**Page-Level Checks:**

**ParityPortal.tsx:**
```typescript
const { can } = useCapabilities();
if (!can('nhra.parity' as any)) {
  return <AccessDenied message="You need the nhra.parity capability" />;
}

const isParityAdmin = can('nhra.parity.admin' as any);
// Admin features gated by isParityAdmin
```

**TechMasterShell.tsx:**
```typescript
const { can } = useCapabilities();
const hasRead = can('nhra.tech.read' as any);
const hasAdmin = can('nhra.tech.admin' as any);

if (!hasRead) {
  return <AccessDenied message="You need the nhra.tech.read capability" />;
}
```

**Problem:** 
- ✅ Pages check capabilities correctly
- ❌ Routes don't enforce - anyone with auth + internal role can navigate to URL
- ❌ If capability check fails, user sees error AFTER page loads
- ⚠️ Relies on InternalRoute which checks role, not plan

**NHRA Plan Capabilities:**
```typescript
// From capabilities.ts
nhra: new Set<Capability>([
  'nhra.parity',
  'nhra.tech.read',
  'nhra.tech.admin',
  'sim.basic',
  'charts.basic',
  'weather.manual',
  'incidents.read',
  'incidents.create',
  'incidents.edit.own',
]),
```

**Owner/Admin Role Capabilities:**
```typescript
owner: new Set<Capability>([
  'admin.access', 'admin.devTools', 'admin.userManagement',
  'nhra.parity', 'nhra.parity.admin', 'nhra.tech.read', 'nhra.tech.admin',
  'incidents.read', 'incidents.create', 'incidents.edit.own', 'incidents.edit.all'
]),
```

**Critical Issue:** Owner/Admin roles get NHRA capabilities regardless of plan!
- This means: `plan='free'` + `role='admin'` → gets NHRA access
- This breaks the "NHRA plan = parity-only" model
- Owner/Admin should get admin tools, but NOT necessarily NHRA data access

---

## 2. Inconsistencies Identified

### 2.1 Three Parallel Access Systems

**System 1: Legacy Role/Product (authStore)**
- Uses: `Role.products`, `Role.additionalFeatures` from `types.ts`
- Functions: `hasFeature()`, `hasProduct()`
- Used by: ProtectedRoute, some nav checks, some page components

**System 2: Tier/Subscription (useSubscription)**
- Uses: `SubscriptionTier` derived from plan or role
- Functions: `features` object, `hasFeature()` method
- Used by: Most page components, some nav checks

**System 3: Capability (useCapabilities)**
- Uses: `PLAN_CAPABILITIES`, `ROLE_CAPABILITIES`
- Functions: `can()`, `hasCap()`
- Used by: NHRA pages, some nav pills, newer code

**Problem:** No single source of truth. Different parts of the app use different systems.

### 2.2 Route Guards vs Page Checks

**Inconsistency:**
- General routes: Enforced at route level via ProtectedRoute
- NHRA routes: Only enforced inside page component

**Risk:**
- User can navigate to `/parity` URL
- Page loads, makes API calls
- Then shows "Access Denied" after loading
- Wastes resources, poor UX

### 2.3 Plan Field Not Consistently Used

**Database:**
- ✅ `users.plan` column exists
- ✅ Set during registration
- ✅ Returned in API responses

**Frontend:**
- ⚠️ Stored in localStorage as `subscription_plan`
- ⚠️ Read by useCapabilities and useSubscription
- ❌ NOT used by authStore.hasFeature()
- ❌ NOT used by ProtectedRoute

**Backend:**
- ❌ NOT read for access checks
- ❌ Backend uses role + capabilities from PHP system

### 2.4 Owner/Admin Get NHRA Access Automatically

**Current Behavior:**
```typescript
ROLE_CAPABILITIES.owner = ['nhra.parity', 'nhra.tech.read', 'nhra.tech.admin', ...]
ROLE_CAPABILITIES.admin = ['nhra.parity', 'nhra.tech.read', 'nhra.tech.admin', ...]
```

**Problem:**
- Any owner/admin gets NHRA access regardless of plan
- Breaks "NHRA plan = parity-only" model
- A `plan='free'` admin can access parity data
- A `plan='pro'` owner can access parity data

**Should Be:**
- Owner/Admin roles → admin tools only
- NHRA plan → parity data access
- Can combine: `plan='nhra'` + `role='admin'` → both

### 2.5 Free vs Beta Confusion

**Current State:**
- New users get `plan='free'`, `role='user'` → `roleId='viewer'`
- `viewer` role has no additional features
- `getTierFromRole('viewer')` returns `'free'`
- Free tier has limited capabilities ✅

**But:**
- Legacy `beta_tester` role still exists in types.ts
- `getTierFromRole('beta_tester')` returns `'beta'`
- Beta tier has full access
- No clear path to assign beta access

**Confusion:**
- Is Beta a plan or a role?
- How does someone become Beta?
- Is Beta same as owner/admin?

### 2.6 Navigation vs Route Misalignment

**Example: /vehicles**
- Route: `requireFeature="save_vehicles"`
- Nav: `canAccessVehicles({ hasFeature })` which checks `hasFeature('save_vehicles')`
- Both use legacy system ✅ Aligned

**Example: /parity**
- Route: No capability check (just auth + InternalRoute)
- Page: Checks `can('nhra.parity')`
- Nav: Not in primary nav (internal only)
- ❌ Not aligned - route doesn't enforce what page checks

---

## 3. Target Enforcement Model

### 3.1 Single Source of Truth: Capability System

**Decision:** Use capability-based system as the ONLY enforcement mechanism.

**Rationale:**
- Most flexible and maintainable
- Already defined for all features
- Supports plan + role combination
- Backend already uses capabilities (PHP)
- Just need to migrate frontend fully

### 3.2 Plan Determines Feature Access

**Free Plan:**
```typescript
PLAN_CAPABILITIES.free = [
  'vehicle.editor.basic',
  'track.eighth', 'track.quarter',
  'weather.manual',
  'sim.basic',
  'charts.basic',
]
```

**Basic Plan:**
```typescript
PLAN_CAPABILITIES.basic = [
  ...free capabilities,
  'library.save.engine/clutch/fourLink',
  'sim.et', 'sim.raceTools',
  'sim.runCompletion', 'sim.learning',
  'data.vehicles', 'data.runLog',
]
```

**Pro Plan:**
```typescript
PLAN_CAPABILITIES.pro = [
  ...basic capabilities,
  'vehicle.editor.pro', 'vehicle.throttleStop',
  'library.install.*',
  'track.thousand', 'track.bonneville', 'track.custom',
  'weather.live', 'weather.history',
  'sim.advanced',
  'engine.proMode',
  'optimizer.*',
  'charts.advanced',
  'data.export', 'data.import',
]
```

**NHRA Plan:**
```typescript
PLAN_CAPABILITIES.nhra = [
  'nhra.parity',
  'nhra.tech.read',
  'nhra.tech.admin',
  'sim.basic',  // For context only
  'charts.basic',
  'weather.manual',
  'incidents.*',
]
```

**Key Principle:** NHRA plan grants ONLY parity/tech capabilities, NOT general product access.

### 3.3 Role Determines Admin/Management Access

**Viewer Role:**
```typescript
ROLE_CAPABILITIES.viewer = []  // No additional capabilities
```

**Member Role:**
```typescript
ROLE_CAPABILITIES.member = []  // No additional capabilities
```

**Admin Role:**
```typescript
ROLE_CAPABILITIES.admin = [
  'admin.access',
  'admin.devTools',
  'admin.userManagement',
  // REMOVED: NHRA capabilities
]
```

**Owner Role:**
```typescript
ROLE_CAPABILITIES.owner = [
  'admin.access',
  'admin.devTools',
  'admin.userManagement',
  // REMOVED: NHRA capabilities
  // SPECIAL: fullAccess flag grants all capabilities
]
```

**Key Change:** Remove NHRA capabilities from owner/admin roles. They get admin tools only.

**Exception:** Owner role gets `fullAccess=true` which grants ALL capabilities (for development/testing).

### 3.4 Capability Resolution Order

```typescript
function hasCap(ctx: UserCapabilityContext, cap: Capability): boolean {
  // 1. Full access override (owner only, for dev/testing)
  if (ctx.fullAccess) return true;
  
  // 2. Trial overlay (temporary capability boost)
  if (ctx.trial?.active && PLAN_CAPABILITIES[ctx.trial.targetPlan].has(cap)) return true;
  
  // 3. Plan capabilities (subscription tier)
  if (PLAN_CAPABILITIES[ctx.plan].has(cap)) return true;
  
  // 4. Role capabilities (admin tools)
  if (ROLE_CAPABILITIES[ctx.role].has(cap)) return true;
  
  return false;
}
```

### 3.5 Route Guard Migration

**Replace ProtectedRoute with CapabilityRoute:**

```typescript
<Route path="/vehicles" element={
  <CapabilityRoute requireCap="data.vehicles">
    <Vehicles />
  </CapabilityRoute>
} />

<Route path="/et-sim" element={
  <CapabilityRoute requireCap="sim.et">
    <Predict />
  </CapabilityRoute>
} />

<Route path="/parity" element={
  <CapabilityRoute requireCap="nhra.parity">
    <ParityPortal />
  </CapabilityRoute>
} />
```

**Benefits:**
- Single enforcement mechanism
- Route-level protection
- No page-level checks needed
- Consistent with backend

### 3.6 Navigation Visibility Migration

**Replace legacy hasFeature with capabilities:**

```typescript
const { can } = useCapabilities();

const canAccessVehicles = can('data.vehicles');
const canAccessETSim = can('sim.et');
const canAccessParity = can('nhra.parity');
const canAccessTechMaster = can('nhra.tech.read');
```

**Benefits:**
- Aligned with route guards
- Single source of truth
- Automatic plan/role resolution

---

## 4. Implementation Plan

### 4.1 Phase 1: Fix ROLE_CAPABILITIES (Immediate)

**Change:**
```typescript
// Remove NHRA capabilities from admin/owner roles
ROLE_CAPABILITIES.admin = [
  'admin.access',
  'admin.devTools',
  'admin.userManagement',
  // REMOVED: 'nhra.parity', 'nhra.parity.admin', 'nhra.tech.read', 'nhra.tech.admin'
  // REMOVED: 'incidents.*'
];

ROLE_CAPABILITIES.owner = [
  'admin.access',
  'admin.devTools',
  'admin.userManagement',
  // REMOVED: NHRA capabilities
];
```

**Add incidents to NHRA plan:**
```typescript
PLAN_CAPABILITIES.nhra = [
  'nhra.parity',
  'nhra.tech.read',
  'nhra.tech.admin',
  'sim.basic',
  'charts.basic',
  'weather.manual',
  'incidents.read',
  'incidents.create',
  'incidents.edit.own',
  // Note: incidents.edit.all stays admin-only via role check
];
```

**Impact:**
- ✅ NHRA access now requires NHRA plan
- ✅ Admin/owner get admin tools only
- ✅ Owner still gets fullAccess for dev/testing
- ⚠️ Existing admin users lose NHRA access unless they have NHRA plan

### 4.2 Phase 2: Create CapabilityRoute Component

**New File:** `src/shared/components/CapabilityRoute.tsx`

```typescript
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../domain/auth';
import { useCapabilities } from '../../domain/config/useCapabilities';
import type { Capability } from '../../domain/config/capabilities';

interface CapabilityRouteProps {
  children: React.ReactNode;
  requireCap?: Capability | Capability[];
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export default function CapabilityRoute({
  children,
  requireCap,
  requireAuth = true,
  fallback,
}: CapabilityRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const { can } = useCapabilities();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireCap) {
    const caps = Array.isArray(requireCap) ? requireCap : [requireCap];
    const hasAllCaps = caps.every(cap => can(cap));
    
    if (!hasAllCaps) {
      if (fallback) return <>{fallback}</>;
      return <AccessDenied capabilities={caps} />;
    }
  }

  return <>{children}</>;
}
```

### 4.3 Phase 3: Migrate Route Guards

**Replace all ProtectedRoute with CapabilityRoute:**

```typescript
// Old
<Route path="/vehicles" element={
  <ProtectedRoute requireFeature="save_vehicles">
    <Vehicles />
  </ProtectedRoute>
} />

// New
<Route path="/vehicles" element={
  <CapabilityRoute requireCap="data.vehicles">
    <Vehicles />
  </CapabilityRoute>
} />
```

**Mapping:**
- `requireFeature="save_vehicles"` → `requireCap="data.vehicles"`
- `requireFeature="et_sim"` → `requireCap="sim.et"`
- `requireFeature="run_logging"` → `requireCap="data.runLog"`
- `requireFeature="race_tools"` → `requireCap="sim.raceTools"`
- `requireProduct="engine_pro"` → `requireCap="engine.proMode"`
- `requireProduct="fourlink"` → `requireCap="library.save.fourLink"`
- `requireRole={['owner', 'admin']}` → Keep for admin routes

### 4.4 Phase 4: Migrate Navigation Visibility

**Replace helper functions:**

```typescript
// Old
const canAccessVehicles = ({ hasFeature }: { hasFeature: (f: FeatureFlag) => boolean }): boolean => {
  return hasFeature('save_vehicles');
};

// New
const canAccessVehicles = (can: (cap: Capability) => boolean): boolean => {
  return can('data.vehicles');
};
```

**Update Navigation component:**

```typescript
const { can } = useCapabilities();

const canAccessVehicles = can('data.vehicles');
const canAccessETSim = can('sim.et');
const canAccessParity = can('nhra.parity');
const canAccessTechMaster = can('nhra.tech.read');
```

### 4.5 Phase 5: Remove Page-Level Capability Checks

**Since routes now enforce, remove redundant checks:**

```typescript
// ParityPortal.tsx - REMOVE
if (!can('nhra.parity')) {
  return <AccessDenied />;
}

// TechMasterShell.tsx - REMOVE
if (!hasRead) {
  return <AccessDenied />;
}
```

**Keep admin-level checks for feature gating:**

```typescript
// Keep these for conditional rendering
const isParityAdmin = can('nhra.parity.admin');
const hasAdmin = can('nhra.tech.admin');
```

### 4.6 Phase 6: Deprecate Legacy Systems

**Mark as deprecated:**
- `authStore.hasFeature()` - Use `useCapabilities().can()` instead
- `authStore.hasProduct()` - Use `useCapabilities().can()` instead
- `useSubscription().features` - Use `useCapabilities().can()` instead
- `ProtectedRoute` - Use `CapabilityRoute` instead

**Keep for now:**
- `useSubscription()` - Still useful for tier info, limits, etc.
- `authStore` - Still needed for auth state management

---

## 5. Validation Strategy

### 5.1 Test Scenarios

**Scenario 1: Free User**
- Create user via `/register` (no invite)
- Expected: `plan='free'`, `role='user'` → `roleId='viewer'`
- Can access: Home, Calculators, basic sim
- Cannot access: Vehicles, ET Sim, Parity, Tech Master
- Nav shows: Home, Calculators only
- Direct URL to `/vehicles` → Access Denied
- Direct URL to `/parity` → Access Denied

**Scenario 2: NHRA User**
- Create user via `/register?invite=nhra_XXXXX`
- Expected: `plan='nhra'`, `role='user'` → `roleId='member'`
- Can access: Parity Portal, Tech Master, Incident Analysis
- Cannot access: Vehicles, ET Sim, Engine Pro, etc.
- Nav shows: Parity, Tech (if internal user check passes)
- Direct URL to `/vehicles` → Access Denied
- Direct URL to `/parity` → Success
- Verify: Can view parity data, create incidents
- Verify: Cannot access Quarter Jr/Pro features

**Scenario 3: Pro User**
- Create user with `plan='pro'` (via admin or future upgrade flow)
- Expected: `plan='pro'`, `role='user'` → `roleId='member'`
- Can access: All products, optimizers, advanced features
- Cannot access: Parity, Tech Master (unless also has NHRA plan)
- Nav shows: Vehicles, Quarter, Engine, etc.
- Direct URL to `/parity` → Access Denied

**Scenario 4: NHRA + Pro User (Dual Access)**
- Admin grants both plans (implementation TBD)
- Expected: Access to both NHRA and Pro features
- Can access: Everything
- Nav shows: All links

**Scenario 5: Admin User (Free Plan)**
- User with `plan='free'`, `role='admin'`
- Can access: Admin portal, user management
- Cannot access: Parity, Tech Master (no NHRA plan)
- Cannot access: Pro features (no Pro plan)
- Nav shows: Admin link, basic features only

**Scenario 6: Owner User**
- User with `role='owner'`, any plan
- Gets `fullAccess=true`
- Can access: Everything (for dev/testing)
- Nav shows: All links

### 5.2 Automated Tests

**Create:** `src/domain/config/__tests__/accessEnforcement.test.ts`

```typescript
describe('Access Enforcement', () => {
  describe('Free User', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'viewer',
      fullAccess: false,
    };

    it('can access basic simulation', () => {
      expect(hasCap(ctx, 'sim.basic')).toBe(true);
    });

    it('cannot access ET sim', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('cannot access NHRA parity', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
    });

    it('cannot access vehicle management', () => {
      expect(hasCap(ctx, 'data.vehicles')).toBe(false);
    });
  });

  describe('NHRA User', () => {
    const ctx: UserCapabilityContext = {
      plan: 'nhra',
      role: 'member',
      fullAccess: false,
    };

    it('can access NHRA parity', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(true);
    });

    it('can access tech master', () => {
      expect(hasCap(ctx, 'nhra.tech.read')).toBe(true);
    });

    it('can access incidents', () => {
      expect(hasCap(ctx, 'incidents.read')).toBe(true);
    });

    it('cannot access ET sim', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });

    it('cannot access vehicle management', () => {
      expect(hasCap(ctx, 'data.vehicles')).toBe(false);
    });

    it('cannot access pro features', () => {
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(false);
    });
  });

  describe('Admin User (Free Plan)', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'admin',
      fullAccess: false,
    };

    it('can access admin portal', () => {
      expect(hasCap(ctx, 'admin.access')).toBe(true);
    });

    it('can manage users', () => {
      expect(hasCap(ctx, 'admin.userManagement')).toBe(true);
    });

    it('cannot access NHRA parity (no NHRA plan)', () => {
      expect(hasCap(ctx, 'nhra.parity')).toBe(false);
    });

    it('cannot access ET sim (no Basic plan)', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(false);
    });
  });

  describe('Owner User', () => {
    const ctx: UserCapabilityContext = {
      plan: 'free',
      role: 'owner',
      fullAccess: true,
    };

    it('can access everything via fullAccess', () => {
      expect(hasCap(ctx, 'sim.et')).toBe(true);
      expect(hasCap(ctx, 'nhra.parity')).toBe(true);
      expect(hasCap(ctx, 'vehicle.editor.pro')).toBe(true);
    });
  });
});
```

### 5.3 Manual E2E Validation

**Test Matrix:**

| User Type | Plan | Role | Can Access | Cannot Access |
|-----------|------|------|------------|---------------|
| Free | free | viewer | Home, Calculators, basic sim | Vehicles, ET Sim, Parity, Tech |
| NHRA | nhra | member | Parity, Tech, Incidents | Vehicles, ET Sim, Pro features |
| Pro | pro | member | All products, optimizers | Parity, Tech (unless dual access) |
| Admin (Free) | free | admin | Admin portal | Parity, Pro features |
| Owner | any | owner | Everything (fullAccess) | N/A |

**For Each User Type:**
1. Register/login
2. Check nav visibility
3. Try accessing allowed routes → Success
4. Try accessing forbidden routes → Access Denied
5. Check localStorage for plan/role
6. Refresh page → Access persists
7. Logout/login → Access persists

---

## 6. Migration Safety

### 6.1 Existing Users

**Current Users in DB:**
- Most have `plan='free'` (from recent migration)
- Some may have `plan='nhra'` (if created via invite)
- All have `role='user'` or `role='owner'`/`'admin'`

**Impact of Changes:**

**Change 1: Remove NHRA caps from admin/owner roles**
- Admin users with `plan='free'` lose NHRA access
- Admin users with `plan='nhra'` keep NHRA access ✅
- Owner users keep fullAccess, so no impact ✅

**Mitigation:**
- Query DB for admin users: `SELECT * FROM users WHERE role='admin'`
- Check if any need NHRA access
- Grant `plan='nhra'` if needed: `UPDATE users SET plan='nhra' WHERE role='admin' AND <condition>`

**Change 2: Migrate route guards**
- No impact on existing users
- Just changes enforcement mechanism
- Same capabilities, different implementation

### 6.2 Backfill Script

**Create:** `scripts/backfill-nhra-admins.sql`

```sql
-- Find admin users who might need NHRA access
-- (This is a manual decision - run query, review, then update)

-- Query: Find admins
SELECT id, email, name, role, plan FROM users WHERE role='admin';

-- If any admins need NHRA access, update:
-- UPDATE users SET plan='nhra' WHERE id IN (1, 2, 3);

-- Verify:
SELECT id, email, role, plan FROM users WHERE role='admin';
```

---

## 7. Success Criteria

### 7.1 Enforcement Consistency

- [x] Single source of truth: Capability system
- [ ] All routes use CapabilityRoute
- [ ] All nav checks use useCapabilities
- [ ] No page-level redundant checks
- [ ] Legacy systems deprecated

### 7.2 Free User Behavior

- [ ] Standard signup creates `plan='free'`, `roleId='viewer'`
- [ ] Can access basic sim only
- [ ] Cannot access vehicles, ET sim, parity
- [ ] Nav shows only allowed links
- [ ] Direct URLs blocked at route level

### 7.3 NHRA User Behavior

- [ ] Invite signup creates `plan='nhra'`, `roleId='member'`
- [ ] Can access parity, tech master, incidents
- [ ] Cannot access general products
- [ ] Nav shows parity/tech links
- [ ] Direct URLs work for parity, blocked for products

### 7.4 Admin/Owner Behavior

- [ ] Admin with `plan='free'` gets admin tools only
- [ ] Admin with `plan='nhra'` gets admin tools + parity
- [ ] Owner gets fullAccess (all capabilities)
- [ ] No automatic NHRA access for admins

### 7.5 Validation Complete

- [ ] Automated tests pass
- [ ] Manual E2E tests pass
- [ ] No console errors
- [ ] Build succeeds
- [ ] Existing users safe

---

## 8. Next Steps

1. ✅ **Audit complete** - This document
2. **Fix ROLE_CAPABILITIES** - Remove NHRA from admin/owner
3. **Create CapabilityRoute** - New route guard component
4. **Migrate route guards** - Replace ProtectedRoute
5. **Migrate nav visibility** - Use capabilities
6. **Remove page checks** - Routes enforce now
7. **Run automated tests** - Verify capability logic
8. **Run E2E validation** - Test all user types
9. **Document results** - Closeout report with PASS/FAIL

---

**Status:** AUDIT COMPLETE - READY FOR IMPLEMENTATION  
**Next:** Fix ROLE_CAPABILITIES and create CapabilityRoute component
