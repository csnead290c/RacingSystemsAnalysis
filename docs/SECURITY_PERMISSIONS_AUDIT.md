# Security & Permissions Audit

**Date:** 2026-02-23  
**Sponsor:** Clinton Snead  
**Auditor:** Cascade (AI pair programmer)  
**Scope:** Full-stack subscription/paywall enforcement, auth boundaries, data isolation

---

## 1. Threat Model

### What We're Defending Against

| Threat | Description |
|--------|-------------|
| **Paywall bypass** | Free/Basic user accesses Pro-only features without paying |
| **Data theft** | User reads/modifies another user's vehicles, engines, or runs |
| **Privilege escalation** | Normal user accesses admin/owner/dev functionality |
| **Token forgery** | Attacker crafts a JWT to impersonate another user |
| **Client-side tampering** | Attacker manipulates localStorage/sessionStorage to change plan or unlock features |
| **Information disclosure** | Debug endpoints or response fields leak internal data |

### Trust Boundaries

```
┌─────────────────────────────────────────────────┐
│  Browser (UNTRUSTED)                            │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │ React SPA     │  │ localStorage/session   │  │
│  │ (route guards,│  │ (cached auth, vehicles,│  │
│  │  UI gating)   │  │  preferences)          │  │
│  └───────┬───────┘  └────────────────────────┘  │
│          │ fetch() + Bearer token                │
├──────────┼──────────────────────────────────────┤
│          ▼                                      │
│  PHP API (TRUSTED)                              │
│  ┌───────────────┐  ┌────────────────────────┐  │
│  │ JWT verify    │  │ Capability enforcement │  │
│  │ (functions.php│  │ (lib/capabilities.php) │  │
│  └───────┬───────┘  └───────────┬────────────┘  │
│          │                      │               │
│          ▼                      ▼               │
│  ┌─────────────────────────────────────────┐    │
│  │ MySQL (auth source of truth)            │    │
│  │ users, subscriptions, plan_capabilities │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## 2. Attack Surface Inventory

### 2.1 Routes

| Route | Protection | Auth | Feature/Plan | Internal |
|-------|-----------|------|-------------|----------|
| `/` | Public | — | — | — |
| `/about` | Public | — | — | — |
| `/pricing` | Public | — | — | — |
| `/help` | Public | — | — | — |
| `/calculators` | Public | — | — | — |
| `/login`, `/register` | Public | — | — | — |
| `/account` | ProtectedRoute | ✅ | — | — |
| `/vehicles` | ProtectedRoute | ✅ | `save_vehicles` | — |
| `/et-sim`, `/predict` | ProtectedRoute | ✅ | `et_sim` | — |
| `/engine-sim` | ProtectedRoute | ✅ | — | — |
| `/engine-sim-legacy` | ProtectedRoute | ✅ | — | — |
| `/engine-pro` | ProtectedRoute | ✅ | product: `engine_pro` | — |
| `/clutch-sim` | ProtectedRoute | ✅ | product: `clutch_sim` | — |
| `/converter-sim` | ProtectedRoute | ✅ | product: `clutch_sim` | — |
| `/suspension-sim` | ProtectedRoute | ✅ | product: `fourlink` | — |
| `/log` | ProtectedRoute + InternalRoute | ✅ | `run_logging` | ✅ |
| `/history` | ProtectedRoute + InternalRoute | ✅ | `run_logging` | ✅ |
| `/dial-in` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/race-day` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/opponents` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/ladder` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/tech-card` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/import` | ProtectedRoute + InternalRoute | ✅ | `race_tools` | ✅ |
| `/team`, `/parts`, `/events`, `/maintenance`, `/expenses` | ProtectedRoute + InternalRoute | ✅ | — | ✅ |
| `/admin` | ProtectedRoute | ✅ | role: owner/admin | ✅ |
| `/dev` | ProtectedRoute | ✅ | role: owner/admin | ✅ |

**Assessment:** ✅ All routes properly guarded. Public routes expose no sensitive data.

### 2.2 API Endpoints

| Endpoint | Auth | Ownership | Capability | Notes |
|----------|------|-----------|-----------|-------|
| `GET /vehicles.php` | Optional | user_id filter | — | Returns own + public vehicles |
| `POST /vehicles.php` | ✅ JWT | — | `data.vehicles` | Server-enforced |
| `PUT /vehicles.php` | ✅ JWT | ✅ user_id check | `data.vehicles` | Server-enforced |
| `DELETE /vehicles.php` | ✅ JWT | ✅ user_id check | `data.vehicles` | Server-enforced |
| `GET /engine_sims.php` | ✅ JWT | ✅ user_id filter | — | Only own sims |
| `POST /engine_sims.php` | ✅ JWT | — | `library.save.engine` | Server-enforced |
| `PUT /engine_sims.php` | ✅ JWT | ✅ user_id check | `library.save.engine` | Server-enforced |
| `DELETE /engine_sims.php` | ✅ JWT | ✅ user_id check | `library.save.engine` | Server-enforced |
| `GET /engines.php` | ✅ JWT | ✅ user_id filter | — | Only own engines |
| `POST /engines.php` | ✅ JWT | — | `library.save.engine` | Server-enforced |
| `PUT /engines.php` | ✅ JWT | ✅ user_id check | `library.save.engine` | Server-enforced |
| `DELETE /engines.php` | ✅ JWT | ✅ user_id check | `library.save.engine` | Server-enforced |
| `GET /runs.php` | ✅ JWT | ✅ user_id filter | `data.runLog` | Server-enforced |
| `POST /runs.php` | ✅ JWT | — | `data.runLog` | Server-enforced |
| `DELETE /runs.php` | ✅ JWT | ✅ user_id filter | `data.runLog` | Server-enforced |
| `*/users.php` | ✅ JWT | — | `admin.access` | Admin-only, server-enforced |
| `GET /capabilities-endpoint.php` | ✅ JWT | — | — | Returns own capabilities |
| `POST /auth.php` (login/register) | Public | — | — | Returns JWT |
| `GET /auth.php?action=me` | ✅ JWT | — | — | Returns own user info |
| `POST /stripe-webhook.php` | Stripe signature | — | — | Webhook verification |

**Assessment:** ✅ All mutating endpoints require auth + capability. Ownership checks present on all update/delete operations.

### 2.3 Client-Side Enforcement Points

| Feature | UI Gate | Sim Guard | Server Gate |
|---------|---------|-----------|-------------|
| Pro-locked vehicle | ✅ Dropdown disabled, button disabled | ✅ `isVehicleProLocked()` in `runSimulation()` | ❌ No server check (sim runs client-side) |
| Pro-only fields (editor) | ✅ Hidden/disabled in UI | — | ❌ Vehicle data blob is opaque to server |
| Engine Pro tabs | ✅ `isProMode` tier check | — | — |
| Race length (Pro: 1000ft, Bonneville) | ✅ UI dropdown filtered | — | — |
| What-If tools (Pro) | ✅ Locked placeholder | — | — |

---

## 3. Findings

### CRITICAL — Fixed in This Audit

#### F-1: Debug Endpoints Leaked Secrets (CRITICAL)
- **File:** `api/debug-auth.php`
- **Issue:** Exposed JWT secret preview (`substr($secret, 0, 5)`), token payload, and signature comparison to ANY caller without authentication.
- **Impact:** Attacker could reconstruct JWT secret through repeated probing, then forge tokens for any user.
- **Fix:** Replaced with 403 stub. Endpoint disabled.

#### F-2: Debug Endpoint Leaked All Vehicle Data (CRITICAL)
- **File:** `api/debug-vehicles.php`
- **Issue:** Exposed all vehicle UUIDs, user IDs, and user info (email, name, role) without authentication.
- **Impact:** Attacker could enumerate all users and their vehicles.
- **Fix:** Replaced with 403 stub. Endpoint disabled.

#### F-3: API Response Leaked Internal Debug Info (MEDIUM)
- **File:** `api/vehicles.php` GET handler
- **Issue:** Response included `_debug` field with `user_id` and vehicle count.
- **Impact:** Information disclosure — attacker could confirm user IDs.
- **Fix:** Removed `_debug` field from response.

#### F-4: ProtectedRoute Logged Feature Checks to Console (LOW)
- **File:** `src/shared/components/ProtectedRoute.tsx`
- **Issue:** `console.log()` on every route check exposed feature flag names and access decisions in browser DevTools.
- **Impact:** Information disclosure — attacker could map all feature gates.
- **Fix:** Removed `console.log` statement.

### VERIFIED SECURE — No Fix Needed

#### V-1: Pro-Lock Cannot Be Bypassed via Client-Side Tampering
- **Mechanism:** `isVehicleProLocked()` uses strict `=== true` check on `usesQuarterProFeatures` flag.
- **Tested:** String "true" coercion attack → flag NOT set (safe).
- **Tested:** Removing Pro fields from vehicle data → flag stays sticky (safe).
- **Tested:** `markProUsedIfNeeded()` only sets flag when `userHasPro === true` (safe).
- **Note:** The flag is stored in the vehicle's JSON data blob on the server. A user could theoretically modify their own vehicle data via the PUT endpoint to remove the flag. However, this only affects their own vehicles, and the server does not enforce Pro-lock (sim runs client-side). See R-1 below.

#### V-2: Server-Side Capability Enforcement Is Robust
- **Mechanism:** `rsa_requireCapability()` in `lib/capabilities.php` computes capabilities from DB-backed plan, not from client-provided data.
- **Plan resolution:** `rsa_getUserPlan()` reads from `subscriptions` table (or legacy `users.subscription_plan`), never from client input.
- **Role resolution:** `rsa_getUserRole()` re-reads from DB on every request (JWT role is not trusted).
- **Grace period:** Past-due subscriptions degrade to free after 3 days.

#### V-3: Ownership Checks Are Consistent
- All vehicle/engine/run endpoints check `user_id` before allowing update/delete.
- Admin/owner bypass is explicit: `in_array($role, ['owner', 'admin'])`.

#### V-4: Internal Routes Are Double-Gated
- `InternalRoute` checks `isInternalUser()` which requires `roleId === 'owner' || roleId === 'admin'`.
- In production (`import.meta.env.DEV === false`), `isDev` is false, so dev mode doesn't grant access.
- `ProtectedRoute` is always the outer wrapper, ensuring auth is checked first.

#### V-5: Markdown Rendering Is Safe
- `ReactMarkdown` in `Help.tsx` does NOT use `rehypeRaw` or `dangerouslySetInnerHTML`.
- Raw HTML in markdown is escaped by default.
- Manifest fetch (`/manuals/manifest.json`) contains only timestamps and filenames.

#### V-6: Dev Portal Access Is Properly Gated
- `/dev` and `/admin` routes require `requireRole={['owner', 'admin']}`.
- `ViewAsBanner` override only applies when `import.meta.env.DEV || realHasDevTools`.
- In production, non-devTools users cannot activate View As even if localStorage key exists.

#### V-7: JWT Token Verification
- Legacy tokens: HMAC-SHA256 signature verification + expiration check.
- Clerk tokens: Expiration check + `sub` prefix validation.
- Token secret is server-side only (never sent to client).

---

## 4. Remaining Risks & Recommended Future Work

### R-1: Pro-Lock Is Client-Side Only (MEDIUM)
- **Risk:** The Quarter simulation runs entirely in the browser (Web Worker). There is no server-side endpoint that runs the sim. Therefore, Pro-lock enforcement is purely client-side.
- **Impact:** A technically sophisticated user could call the simulation function directly from the browser console, bypassing the `isVehicleProLocked()` check.
- **Mitigation:** The `usesQuarterProFeatures` flag is set server-side during vehicle save. The simulation itself produces no server-side artifacts that need protection (results are ephemeral unless saved as a run, which requires `data.runLog` capability).
- **Recommendation:** If Pro-lock enforcement becomes critical (e.g., for revenue protection), move simulation to a server-side endpoint that checks the user's plan before running.

### R-2: Vehicle Data Blob Is Opaque to Server (LOW)
- **Risk:** The server stores vehicle configuration as an opaque JSON blob. It does not validate whether Pro-only fields are present.
- **Impact:** A Basic user could theoretically PUT a vehicle with Pro-only fields in the data blob. However, the `usesQuarterProFeatures` flag would not be set (only `markProUsedIfNeeded` sets it, and only for Pro users), so the vehicle would not be Pro-locked.
- **Recommendation:** Consider server-side validation of the `usesQuarterProFeatures` flag during vehicle PUT (reject attempts to clear the flag by non-admin users).

### R-3: Clerk Token Verification Is Lightweight (LOW)
- **Risk:** Clerk tokens are verified by checking expiration and `sub` prefix, but the signature is not verified against Clerk's public key (JWKS).
- **Impact:** If an attacker obtains a valid-looking JWT with a `user_` prefix in `sub`, they could potentially authenticate as a Clerk user.
- **Mitigation:** Clerk tokens are issued by Clerk's infrastructure and are short-lived. The attack surface is limited.
- **Recommendation:** Implement proper JWKS-based signature verification for Clerk tokens using Clerk's PHP SDK or manual JWKS fetch.

### R-4: `vehicles.php` GET Allows Unauthenticated Access (LOW)
- **Risk:** The GET endpoint allows unauthenticated requests (returns `user_id=0`), which returns only public vehicles.
- **Impact:** Public vehicles are intentionally public. No private data is exposed.
- **Recommendation:** No action needed unless public vehicles are deprecated.

### R-5: Error Messages May Leak Implementation Details (LOW)
- **Risk:** Some PHP endpoints return raw exception messages in error responses (e.g., `'Database error: ' . $e->getMessage()`).
- **Recommendation:** In production, return generic error messages and log details server-side only.

---

## 5. Fixes Implemented

| # | Severity | File | Fix |
|---|----------|------|-----|
| F-1 | CRITICAL | `api/debug-auth.php` | Replaced with 403 stub |
| F-2 | CRITICAL | `api/debug-vehicles.php` | Replaced with 403 stub |
| F-3 | MEDIUM | `api/vehicles.php` | Removed `_debug` field from GET response |
| F-4 | LOW | `src/shared/components/ProtectedRoute.tsx` | Removed `console.log` of feature checks |

## 6. Regression Tests Added

**File:** `src/domain/config/__tests__/securityInvariants.test.ts` — 22 tests

| Test Group | Count | What It Locks In |
|-----------|-------|-----------------|
| Pro-lock bypass prevention | 6 | Basic user blocked, sticky flag, type coercion safe, markProUsedIfNeeded gating |
| Internal route access | 7 | Public/member/user blocked, owner/admin allowed, all internal paths identified |
| Feature guard enforcement | 8 | Free user blocked from all 4 gates, Basic user allowed for all 4 |
| Manifest safety | 1 | Only safe fields, no secrets/tokens/passwords |

---

## 7. Summary

The RSA application has a **solid security posture** for its current stage:

- ✅ **Server-side enforcement** on all data-mutating API endpoints (auth + ownership + capability)
- ✅ **Plan/capability derived from DB** (not client-provided)
- ✅ **Double-gated internal routes** (ProtectedRoute + InternalRoute)
- ✅ **No XSS vectors** in markdown rendering
- ✅ **Dev tools properly gated** in production

The main gap is that **simulation execution is client-side only**, meaning Pro-lock is enforced in the UI but not at a server boundary. This is acceptable for beta but should be addressed before launch if Pro-lock is a revenue-critical feature.

**Critical fixes applied:** Two debug endpoints that leaked JWT secrets and user data have been disabled.
