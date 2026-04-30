# RSA Authentication & Authorization Architecture

## Overview

RSA uses a **custom JWT-based authentication system** with a **capability-based authorization model**. This document describes the complete flow from login to feature access.

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│  auth.php   │────▶│  JWT Token  │────▶│  Frontend   │
│   Form      │     │  /login     │     │  Generated  │     │  Storage    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Validate   │
                    │  Password   │
                    │  + Status   │
                    └─────────────┘
```

### 1. Login Request
- **Endpoint**: `POST /api/auth.php?action=login`
- **Input**: `{ email, password }`
- **Rate Limiting**: 10 attempts/IP/15min, 5 attempts/email/15min

### 2. Server Validation
- Verify password hash
- Check user status (active, suspended, deleted, invited)
- Generate JWT token (7-day expiry)

### 3. Response
```json
{
  "success": true,
  "token": "eyJ...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "name": "User Name",
    "role": "user",
    "plan": "basic",
    "products": ["quarter_jr"]
  }
}
```

### 4. Frontend Storage
- Token stored in `localStorage` as `rsa_token`
- User data stored as `rsa.auth.currentUser`
- Products stored as `rsa.auth.apiProducts`

---

## Authorization Model

RSA uses **two parallel authorization systems** that work together:

### 1. Capability System (New)
- **Location**: `src/domain/config/capabilities.ts`
- **Check Function**: `can(capability)` from `useCapabilities()`
- **Used By**: `CapabilityRoute`, navigation visibility, feature toggles

### 2. Feature/Product System (Legacy)
- **Location**: `src/domain/auth/authStore.tsx`
- **Check Function**: `hasFeature(feature)` from `useAuth()`
- **Used By**: `ProtectedRoute`, some older components

### How They Connect

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Plan     │────▶│  Products   │────▶│  Features   │
│  (basic)    │     │ [quarter_jr]│     │ [et_sim,    │
│             │     │             │     │  race_tools]│
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│ Capabilities│
│ [sim.et,    │
│  sim.basic] │
└─────────────┘
```

---

## Plan Resolution

The backend resolves a user's plan from multiple sources in priority order:

```php
// api/lib/capabilities.php - rsa_getUserPlan()

1. users.assigned_plan     // Admin-assigned (if not expired)
2. subscriptions.plan_id   // Stripe subscription (if active/trialing/past_due)
3. users.subscription_plan // Legacy column
4. users.plan              // Registration plan
5. Default: 'free'
```

### Plan Aliases
```php
const PLAN_ALIASES = [
    'free'    => 'free',
    'basic'   => 'basic',
    'pro'     => 'pro',
    'team'    => 'team',
    'nhra'    => 'nhra',
    'racer'   => 'basic',   // Stripe plan ID
    'junior'  => 'basic',   // Legacy name
    'nitro'   => 'team',    // Legacy name
    'trial'   => 'free',    // Trial base plan
    'beta'    => 'pro',     // Beta testers
];
```

### Plan → Products Mapping
```php
const PLAN_PRODUCTS = [
    'free'  => [],
    'basic' => ['quarter_jr'],
    'pro'   => ['quarter_jr', 'quarter_pro', 'bonneville_pro'],
    'team'  => ['quarter_jr', 'quarter_pro', 'bonneville_pro', 'engine_pro', 'clutch_pro', 'suspension_pro'],
    'nhra'  => [],  // NHRA uses capabilities, not products
];
```

---

## Capability Definitions

### Plans → Capabilities

| Plan | Key Capabilities |
|------|-----------------|
| **free** | `sim.basic`, `vehicle.editor.basic`, `charts.basic` |
| **basic** | + `sim.et`, `sim.raceTools`, `data.vehicles`, `data.runLog`, `library.save.*` |
| **pro** | + `sim.advanced`, `engine.proMode`, `library.install.*`, `data.export/import` |
| **team** | + `team.enabled`, `team.library.share`, `team.vehicles.share` |
| **nhra** | `nhra.parity`, `nhra.tech.read`, `nhra.tech.admin`, `incidents.*` |

### Roles → Capabilities

| Role | Capabilities |
|------|-------------|
| **owner** | `admin.access`, `admin.devTools`, `admin.userManagement` |
| **admin** | `admin.access`, `admin.devTools`, `admin.userManagement` |
| **member** | (none - uses plan capabilities) |
| **viewer** | (none - uses plan capabilities) |

---

## Route Protection

### ProtectedRoute (Legacy)
```tsx
<ProtectedRoute requireFeature="et_sim">
  <Predict />
</ProtectedRoute>
```
- Uses `hasFeature()` which checks `products → features`
- Good for: ET Sim, Race Tools, Run Logging, Vehicles

### CapabilityRoute (New)
```tsx
<CapabilityRoute requireCap="nhra.parity">
  <ParityPortal />
</CapabilityRoute>
```
- Uses `can()` which checks `plan → capabilities`
- Good for: NHRA features, admin features, fine-grained access

---

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `api/auth.php` | Login, register, me, password reset |
| `api/lib/capabilities.php` | Plan resolution, capability computation |
| `api/lib/plans.php` | Stripe price → plan mapping |
| `api/functions.php` | JWT generation/verification |

### Frontend
| File | Purpose |
|------|---------|
| `src/domain/auth/authStore.tsx` | Auth context, login/logout, hasFeature |
| `src/domain/config/capabilities.ts` | Capability definitions, hasCap |
| `src/domain/config/useCapabilities.ts` | React hook for capability checks |
| `src/shared/components/ProtectedRoute.tsx` | Feature-based route protection |
| `src/shared/components/CapabilityRoute.tsx` | Capability-based route protection |

---

## Common Issues & Solutions

### Issue: User has plan but no features
**Cause**: Products not being derived from plan
**Solution**: Backend now returns `products` based on plan via `rsa_getProductsForPlanId()`

### Issue: Admin-assigned plan not working
**Cause**: `rsa_getUserPlan()` wasn't checking `assigned_plan` column
**Solution**: Added `assigned_plan` as first priority in plan resolution

### Issue: Registration fails with 500 error
**Cause**: `plan` column missing in production database
**Solution**: Added defensive fallback INSERT without plan column

### Issue: NHRA users see non-NHRA features
**Cause**: Navigation not checking capabilities
**Solution**: Navigation uses `can()` to show/hide NHRA-specific links

---

## Testing

### Capability Tests
```bash
npm test -- capabilities --run
npm test -- accessEnforcement --run
```

### Manual Testing Matrix

| User Type | Expected Access |
|-----------|----------------|
| **Free** | Home, Calculators, Engine Sim (basic mode) |
| **Basic** | + ET Sim, Vehicles, Race Tools, Run Logging |
| **Pro** | + Clutch Sim, Advanced Settings, Library Install |
| **Team** | + Team sharing features |
| **NHRA** | Parity Portal, Tech Master (no ET Sim, Vehicles) |
| **Admin** | + Admin Portal, Dev Portal |

---

## Deployment Checklist

1. **Run migration v32** on production to add `plan` column and `invite_codes` table
2. **Deploy PHP files**: `auth.php`, `lib/capabilities.php`
3. **Deploy frontend**: Build and deploy to production
4. **Verify**: Test login with each user type

---

## Security Notes

- JWT tokens expire after 7 days
- Passwords hashed with `password_hash()` (bcrypt)
- Rate limiting on login and password reset
- Token verified on every API request via `rsa_requireAuth()`
- No sensitive data in JWT payload (just user_id, email, role)
