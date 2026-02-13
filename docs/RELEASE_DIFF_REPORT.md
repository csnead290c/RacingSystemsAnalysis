# Release Diff Report: RC vs Live

> Generated: Feb 13, 2026 13:25 EST | Author: Cascade (automated)
> **This report reflects only committed RC contents — not the full working tree.**

## Baseline

| Item | Value |
|------|-------|
| **Live (main)** | `d079233a` — "test: add VB6Exact invariants suite" |
| **RC branch** | `release/2026-02-13-rc1` — 4 commits, 57 files changed |
| **Safety snapshot** | `wip/safety-2026-02-13` at `b6a29d63` (all 129 uncommitted changes preserved) |
| **Patch backup** | `docs/WIP_SAFETY_PATCH_2026-02-13.patch` (4.5 MB, 119K lines) |
| **Stats** | +10,198 / −970 lines across 57 files |

---

## A) Backend API Changes

### New Endpoints (not on main)

| File | Purpose | Auth Required | Risk |
|------|---------|---------------|------|
| `api/admin.php` | Admin portal API (search users, user details, grant/revoke caps, audit log, **plan capabilities**) | `admin.access` + `admin.userManagement` for mutations | Medium |
| `api/capabilities-endpoint.php` | Returns user's current capabilities, plan, role | Bearer token | Low |
| `api/lib/capabilities.php` | Server-side capability computation + enforcement | N/A (library) | **High** |
| `api/lib/audit.php` | Audit logging helpers + constants | N/A (library) | Low |
| `api/lib/plans.php` | Stripe price↔plan mapping (extracted from stripe.php) | N/A (library) | Low |

### Modified Endpoints

| File | What Changed | Why | Risk |
|------|-------------|-----|------|
| `api/functions.php` | Added `ob_end_clean()` in `rsa_jsonResponse()` | Prevents stray PHP warnings from corrupting JSON | **Low** — additive safety net |
| `api/stripe-webhook.php` | Added idempotency (webhook_events table), audit logging, subscriptions table writes, timing logs, `rsa_` function prefixes | Proper subscription lifecycle tracking | **High** — touches payment flow |
| `api/stripe.php` | Extracted plan/price mapping to `lib/plans.php`, uses `rsa_` prefixed functions | Code organization — same logic, different function names | **Medium** |
| `api/runs.php` | Added `require capabilities.php` + `rsa_requireCapability('data.runLog')` on GET/POST/DELETE | Server-side enforcement of run logging gate | **Medium** |
| `api/vehicles.php` | Added `require capabilities.php` + `rsa_requireCapability('data.vehicles')` on POST/PUT/DELETE | Server-side enforcement of vehicle save gate | **Medium** |
| `api/tracks.php` | Added capability enforcement | Server-side track access control | Low |
| `api/users.php` | Minor auth flow changes | Clerk integration refinements | Low |

### Capability Enforcement Changes

**Before (main):** No server-side capability checks. All gating was client-side only.

**After (proposed):**
- `runs.php`: GET/POST/DELETE require `data.runLog` capability
- `vehicles.php`: POST/PUT/DELETE require `data.vehicles` capability
- `tracks.php`: Write operations require auth
- `admin.php`: All actions require `admin.access`; mutations require `admin.userManagement`

**Critical safety:** All capability functions (`rsa_getUserPlan`, `rsa_getUserOverrides`, `rsa_getEffectivePlanCapabilities`) have try/catch around every DB query. If any migration table is missing, they gracefully fall back (plan→free, overrides→empty, capabilities→code-level constants).

### Webhook Changes

| Aspect | Before | After |
|--------|--------|-------|
| Idempotency | None | `webhook_events` table with `INSERT IGNORE` dedup |
| Subscription tracking | Only `users` table columns | Also writes to `subscriptions` table |
| Audit logging | None | `rsa_auditLog()` on subscription create/update/cancel |
| Error logging | Basic `error_log` | Structured with event type, ID, elapsed time |
| Missing table handling | Would crash | try/catch with fallthrough |

---

## B) Database Migrations

### Migration v2: `api/migrate-v2.php`

| Table/Column | Purpose | Required for baseline? |
|-------------|---------|----------------------|
| `subscriptions` | Subscription lifecycle tracking | No — webhook falls back to `users` columns |
| `user_capabilities` | Admin capability overrides (grants/revokes) | No — returns empty if missing |
| `webhook_events` | Idempotency dedup for Stripe webhooks | No — skips dedup if missing |
| `audit_log` | Audit trail for admin actions | No — audit writes silently fail |
| `users.capability_version` | Cache invalidation counter | No — defaults to 1 |
| `users.last_capability_sync` | Sync timestamp | No — not critical |

### Migration v4: `api/migrate-v4-plan-capabilities.php`

| Table | Purpose | Required for baseline? |
|-------|---------|----------------------|
| `plan_capabilities` | DB-backed plan→capability mapping | No — falls back to code-level `PLAN_CAPABILITIES` constant |

### Rollback Considerations

All migrations are **additive only** (CREATE TABLE IF NOT EXISTS, INSERT IGNORE). They add tables and columns but never modify or delete existing data. If code is rolled back:
- New tables remain but are harmless (no code references them)
- Legacy `users` table columns continue to work as before
- No data loss risk

---

## C) Frontend Changes

### New Routes

| Route | Component | Gate | Risk |
|-------|-----------|------|------|
| `/admin` | `AdminPortal.tsx` | `admin.access` capability (owner/admin role) | Low |

### Modified Pages

| Page | What Changed | Risk |
|------|-------------|------|
| `App.tsx` | Admin route, ProtectedRoute gating for feature gates, centralized guard imports | **Medium** |
| `Home.tsx` | Guard-based feature card visibility (canAccessEtSim, etc.) | Low |
| `DevPortal.tsx` | Restructured with categories, read-only diagnostics banner | Low |
| `QuickActions.tsx` | Guard-based access checks | Low |
| `ProtectedRoute.tsx` | Capability-gated route wrapper | Low |

### Capability System (all new)

| File | Purpose |
|------|---------|
| `capabilities.ts` | Core: PLAN_CAPABILITIES, ROLE_CAPABILITIES, hasCap(), getEffectiveCapabilities() |
| `useCapabilities.ts` | React hook: plan, role, can(), capabilities |
| `guards.ts` | Access gates: canAccessEtSim(), canAccessRaceTools(), etc. |
| `capabilityRefresh.ts` | Client-side capability sync from server |
| `devViewAs.ts` + `viewAsStore.ts` + `viewAsPresets.ts` | Dev "View As" tier simulation |
| `entitlements.ts` | Modified: TIER_FEATURES mapping updated |

### Free Tier Tightening

**Removed from Free plan (both server + client):**
- `library.save.engine`
- `library.save.clutch`
- `library.save.fourLink`

**Free plan retains (6 capabilities):**
`vehicle.editor.basic`, `track.eighth`, `track.quarter`, `weather.manual`, `sim.basic`, `charts.basic`

---

## D) Security / Auth / Permissions

### Auth Changes

| Area | Before | After |
|------|--------|-------|
| Admin access | No admin portal | `admin.access` capability required (role-based: owner/admin only) |
| Admin mutations | N/A | `admin.userManagement` required (double-gated) |
| API endpoint gating | Client-side only | Server-side `rsa_requireCapability()` on runs, vehicles, tracks, admin, engine_sims |
| Capability computation | N/A | Plan + role + overrides + trial overlay |
| Clerk integration | Basic token storage | Enhanced: token refresh, user sync, capability sync |

### New Attack Surface

| Endpoint | Mitigation |
|----------|-----------|
| `admin.php` | Every request requires `admin.access` capability (server-enforced). Mutations require `admin.userManagement`. |
| `admin.php?action=set-plan-capabilities` | Blocks reserved admin caps from being added to plans. Requires confirmation + audit log. |
| `capabilities-endpoint.php` | Read-only, requires valid auth token. Returns only the requesting user's own capabilities. |

### Permission Model

No user can escalate their own privileges:
- Admin capabilities are **role-based** (owner/admin), not plan-based
- `set-plan-capabilities` blocks adding `admin.*` to any plan
- Capability overrides require `admin.userManagement` to grant
- All mutations are audit-logged with actor ID

---

## Risk Assessment

| Area | Risk | Rationale |
|------|------|-----------|
| Free tier tightening | **Low** | Removes capabilities — cannot grant unintended access. 428 tests verify. |
| Server capability enforcement (runs/vehicles) | **Medium** | New server gates could block legitimate users if capability computation fails. **Mitigated:** all DB queries have try/catch fallback to `free` plan with code-level capabilities. |
| Stripe webhook changes | **Medium** | Touches payment flow. **Mitigated:** idempotency dedup, missing-table fallback, legacy `users` columns still updated. |
| Admin Portal + Plans tab | **Low** | New feature, only accessible to admin/owner. No impact on regular users. |
| Output buffer safety (`ob_start`/`ob_end_clean`) | **Low** | Additive safety net. If no warnings exist, `ob_end_clean` is a no-op. |

### Top 5 Things Most Likely to Break

| # | Risk | Detection | Mitigation |
|---|------|-----------|-----------|
| 1 | **Vehicles/Runs 403 for paid users** — capability computation returns `free` due to missing `subscriptions` table | Paid user tries to save a vehicle → gets 403 | Run v2 migration. Fallback: `rsa_getUserPlan` checks legacy `users.subscription_plan` column. |
| 2 | **Stripe webhook fails** — `webhook_events` table missing causes INSERT to fail | Stripe dashboard shows failed webhook deliveries | try/catch around idempotency check — logs warning and continues processing. |
| 3 | **Admin Portal 500** — PHP error from missing table corrupts JSON | Admin sees error banner | `ob_start()` + `ob_end_clean()` discards stray output. All DB queries wrapped in try/catch. |
| 4 | **Free user sees "library save" UI but server blocks** — client/server mismatch | Free user clicks save, gets error | Both client and server now exclude `library.save.*` from free. 428 tests verify. |
| 5 | **Clerk token not recognized** — auth flow change breaks existing sessions | User gets logged out or 401 | `rsa_getAuthUser` handles both Clerk and legacy tokens. Existing sessions continue to work. |

---

## Pre-Deploy Verification Commands

### Local / CI

```bash
# TypeScript compilation (MUST pass)
npx tsc --noEmit

# Release-gate test suite (MUST pass — 428 tests)
npx vitest run --reporter=verbose src/domain/config src/dev/__tests__
```

### Post-Deploy Curl Commands

```bash
DOMAIN="https://your-domain.com"
ADMIN_TOKEN="<admin-bearer-token>"
FREE_TOKEN="<free-user-bearer-token>"
PAID_TOKEN="<paid-user-bearer-token>"

# 1. Admin Plans tab — MUST return valid JSON
curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$DOMAIN/api/admin.php?action=get-plan-capabilities" | python3 -m json.tool
# Expected: { "plans": { "free": [...], ... }, "allCapabilityKeys": [...], "dbBacked": true/false }

# 2. Capabilities endpoint — MUST return valid JSON
curl -s -H "Authorization: Bearer $PAID_TOKEN" \
  "$DOMAIN/api/capabilities-endpoint.php" | python3 -m json.tool
# Expected: { "plan": "basic"|"pro"|..., "role": "...", "capabilities": [...], "version": N }

# 3. Gated endpoint — free user should get 403
curl -s -w "\nHTTP_CODE:%{http_code}\n" -H "Authorization: Bearer $FREE_TOKEN" \
  "$DOMAIN/api/vehicles.php" -X POST -d '{"name":"test"}'
# Expected: HTTP_CODE:403, { "error": "Forbidden", "requiredCapability": "data.vehicles" }

# 4. Unauthenticated — should get 401
curl -s -w "\nHTTP_CODE:%{http_code}\n" "$DOMAIN/api/admin.php?action=get-plan-capabilities"
# Expected: HTTP_CODE:401, { "error": "Unauthorized" }

# 5. Webhook endpoint — should respond (won't process without valid Stripe signature)
curl -s -w "\nHTTP_CODE:%{http_code}\n" -X POST "$DOMAIN/api/stripe-webhook.php" -d '{}'
# Expected: HTTP_CODE:400 (invalid signature)
```

---

## Go/No-Go Checklist (10–15 minutes post-deploy)

### Immediate (first 2 minutes)

- [ ] **Site loads** — home page renders without console errors
- [ ] **Login works** — Clerk login flow completes, user lands on dashboard
- [ ] **No white screen** — navigate to /predict, /vehicles, /engine-sim

### Auth & Permissions (3 minutes)

- [ ] **Free user** — can access home, /engine-sim basic; CANNOT save to library
- [ ] **Paid user (Basic+)** — can access /vehicles, /et-sim, /predict; CAN save to library
- [ ] **Admin/Owner** — can access /admin; sees user search, audit log, Plans tab

### Admin Portal (3 minutes)

- [ ] **Admin Portal loads** — /admin shows tabs (Search, User Details, Audit Log, Plans)
- [ ] **Plans tab loads** — shows plan selector (Free/Basic/Pro/Team) with non-zero capability counts
- [ ] **Plans tab data** — Free shows 6 caps, Basic shows 15 caps, Pro shows ~30, Team shows ~37
- [ ] **If v4 migration applied:** can toggle a capability and save (then revert)
- [ ] **If v4 NOT applied:** shows "run migration to enable editing" banner, editing disabled

### Stripe / Payments (2 minutes)

- [ ] **Stripe checkout** — initiate a test checkout (or verify existing subscription loads)
- [ ] **Check server logs** — no PHP fatal errors, no "table doesn't exist" errors (if migrations applied)
- [ ] **Webhook health** — Stripe dashboard → Webhooks → recent deliveries show 200 responses

### Capability Enforcement (2 minutes)

- [ ] **Run curl #1** — admin get-plan-capabilities returns valid JSON
- [ ] **Run curl #2** — capabilities endpoint returns valid JSON with correct plan
- [ ] **Run curl #3** — free user POST to vehicles returns 403
- [ ] **Run curl #4** — unauthenticated request returns 401

### Rollback Decision

If any of the following occur, **rollback immediately**:
- White screen on any main page (home, /predict, /vehicles)
- All users getting 401/403 on previously-working endpoints
- Stripe webhooks failing consistently (check Stripe dashboard)
- PHP fatal errors in server logs

**Rollback is safe:** Revert to previous frontend build + API files. Migration tables are additive and harmless if code is reverted.

---

## Summary: Go/No-Go Recommendation

| Gate | Status |
|------|--------|
| TypeScript compiles | ✅ Pass |
| Release-gate tests (428/428) | ✅ Pass |
| Working tree clean | ✅ No uncommitted changes on RC branch |
| Server resilience (missing tables) | ✅ All DB queries wrapped in try/catch |
| Free tier tightening | ✅ Verified by 40+ dedicated tests |
| Admin Portal | ✅ Works with or without v4 migration |
| Stripe webhook | ✅ Idempotent, missing-table safe |
| Safety snapshot preserved | ✅ `wip/safety-2026-02-13` + patch file |

**Recommendation: GO** — with migrations run promptly after deploy (v2 → v4).

---

## RC Commit Log

```
b51b3ca4 test+docs: capability contract tests, free tier verification, deploy docs
82e72964 feat: admin portal, dev portal restructure, access-gated pages
8f50b030 feat: frontend capability system, auth wiring, access guards
e6856988 feat: backend capability system, admin API, webhook hardening, server-side enforcement
```

## What is NOT in this RC

- Physics parity work (55 commits on `parity/taby-engine-linebyline`)
- Engine Sim UI expansions (EngineSimDashboard pro tabs, File I/O, Print Report)
- Library pages (EnginesLibrary, ClutchesLibrary, FourLinksLibrary)
- Component library UI (install modals, source badges)
- Vehicle editor library integration (VehicleEditorUnified changes)
- Engine sims API + migration v3
- All preserved on `wip/safety-2026-02-13` for future RC.
