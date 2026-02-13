# Subscription Lifecycle Validation

> Generated: 2026-02-13
> Status: Audit complete, gaps fixed, verification checklist provided.

---

## 1. What We Validated / What We Fixed

### Validated (already correct)
- **Capability computation** (`api/lib/capabilities.php`) correctly resolves plan via `PLAN_ALIASES` (`racer` → `basic`), merges role caps, merges overrides, and gives `owner` full access.
- **`rsa_getUserPlan()`** tries `subscriptions` table first, falls back to legacy `users.subscription_plan` column — correct dual-read strategy.
- **`past_due` subscriptions retain capabilities** — `rsa_getUserPlan()` includes `past_due` in the valid status list, so users keep access during grace period.
- **`capability_version` bump** occurs in all 5 webhook handlers that change effective capabilities.
- **Idempotency** via `webhook_events` table prevents duplicate processing.
- **Audit logging** on all subscription lifecycle events.
- **Admin user-details** already returns `stripe_customer_id`, `subscription_plan`, `subscription_status`, `subscription_period_end`, plus the `subscriptions` table row.

### Fixed (this session)

| Gap | Fix | File |
|-----|-----|------|
| `getPlanIdFromPrice()` duplicated in stripe.php and stripe-webhook.php | Created `api/lib/plans.php` as single source of truth; both files now use `rsa_getPlanIdFromPrice()` | `api/lib/plans.php`, `api/stripe.php`, `api/stripe-webhook.php` |
| Webhook never wrote to `subscriptions` table | Added `rsa_upsertSubscription()` — called from `handleCheckoutCompleted` and `handleSubscriptionUpdated` | `api/stripe-webhook.php` |
| `cancel_at_period_end` not tracked | `rsa_upsertSubscription()` stores `cancel_at_period_end` from Stripe subscription object | `api/stripe-webhook.php` |
| `handleSubscriptionDeleted` didn't update `subscriptions` table | Added UPDATE to set `status='canceled'` | `api/stripe-webhook.php` |
| `handlePaymentSucceeded` was a no-op | Now restores `past_due` → `active`, bumps `capability_version`, updates `subscriptions` table, writes audit log | `api/stripe-webhook.php` |
| `capabilityRefresh.ts` existed but was never called | Wired into `ClerkRSASync`: refreshes on login, refreshes on window focus if stale (>5min), clears cache on logout | `src/domain/auth/ClerkAuthProvider.tsx` |

---

## 2. Price → Tier → Capabilities Mapping

### Stripe Price → Internal Plan

Defined in `api/lib/plans.php` → `rsa_getPlanIdFromPrice()`:

| Stripe Price ID | Plan ID | Billing |
|-----------------|---------|---------|
| `STRIPE_PRICE_RACER_MONTHLY` | `racer` | monthly |
| `STRIPE_PRICE_RACER_YEARLY` | `racer` | yearly |
| `STRIPE_PRICE_PRO_MONTHLY` | `pro` | monthly |
| `STRIPE_PRICE_PRO_YEARLY` | `pro` | yearly |
| `STRIPE_PRICE_TEAM_MONTHLY` | `team` | monthly |
| `STRIPE_PRICE_TEAM_YEARLY` | `team` | yearly |
| *(no subscription)* | *(none)* | — |

### Internal Plan → Capability Plan

Defined in `api/lib/capabilities.php` → `PLAN_ALIASES`:

| DB `subscription_plan` | Capability Plan | Notes |
|------------------------|-----------------|-------|
| `racer` | `basic` | Entry-level paid tier |
| `basic` | `basic` | Legacy alias |
| `pro` | `pro` | Professional tier |
| `team` | `team` | Team tier (superset of pro) |
| `free` | `free` | No subscription |
| *(null/empty)* | `free` | Default |

### Capability Plan → Capabilities (server-side)

| Cap Plan | Key Capabilities | Count |
|----------|-----------------|-------|
| `free` | `sim.basic`, `vehicle.editor.basic`, `track.eighth`, `track.quarter`, `weather.manual`, `charts.basic`, `library.save.*` | 9 |
| `basic` | Everything in free + `sim.et`, `sim.raceTools`, `sim.advanced`, `sim.runCompletion`, `sim.learning`, `data.vehicles`, `data.runLog`, `data.export`, `data.import`, `optimizer.*`, `weather.live`, `weather.history`, `track.thousand`, `charts.advanced` | 20 |
| `pro` | Everything in basic + `engine.proMode`, `vehicle.editor.pro`, `vehicle.throttleStop`, `track.bonneville`, `track.custom`, `library.install.*` | 26 |
| `team` | Everything in pro + `team.enabled`, `team.library.share`, `team.vehicles.share`, `team.runs.share` | 30 |

### Role → Extra Capabilities (additive)

| Role | Extra Capabilities |
|------|-------------------|
| `owner` | `admin.access`, `admin.devTools`, `admin.userManagement` + all team caps (fullAccess) |
| `admin` | `admin.access`, `admin.devTools`, `admin.userManagement` |
| `beta` | `admin.devTools` |

### Plan → Legacy Products

Defined in `api/lib/plans.php` → `rsa_getProductsForPlan()`:

| Plan | Products |
|------|----------|
| `racer` | `quarter_jr` |
| `pro` | `quarter_pro`, `bonneville_pro` |
| `team` | `quarter_pro`, `bonneville_pro`, `engine_pro`, `clutch_pro`, `suspension_pro` |
| *(none)* | `[]` |

### Free / Auth-Only Behavior

- **Unauthenticated**: No capabilities. All protected endpoints return 401.
- **Authenticated, no subscription** (`free` plan): Gets `sim.basic`, `vehicle.editor.basic`, basic track/weather/charts, library save. Cannot access ET Sim, Race Tools, Run Logging, Vehicles CRUD, or any optimizer/export.
- **Authenticated, `past_due`**: Retains all plan capabilities (grace period). `rsa_getUserPlan()` includes `past_due` in valid statuses.
- **Authenticated, `canceled`**: Falls to `free` plan. `rsa_getUserPlan()` excludes `canceled` from valid statuses.

---

## 3. Webhook Event Flow — Expected Outcomes

### checkout.session.completed

| Step | What Happens |
|------|-------------|
| 1 | Idempotency check (skip if duplicate) |
| 2 | Extract `rsa_user_id` from `client_reference_id` / metadata |
| 3 | Retrieve full subscription from Stripe API |
| 4 | `rsa_getPlanIdFromPrice(priceId)` → plan_id |
| 5 | UPDATE `users` SET stripe_customer_id, subscription_id, subscription_plan, subscription_status, subscription_period_end, products |
| 6 | `rsa_upsertSubscription()` → INSERT/UPDATE `subscriptions` table |
| 7 | Bump `capability_version` |
| 8 | Audit log: `subscription.created` |
| 9 | Sync to Clerk metadata |

**DB state after**: `users.subscription_plan = 'racer'|'pro'|'team'`, `users.subscription_status = 'active'`, `subscriptions` row with full details including `cancel_at_period_end = 0`.

### customer.subscription.created / customer.subscription.updated

| Step | What Happens |
|------|-------------|
| 1 | Idempotency check |
| 2 | Find user by `stripe_customer_id` (fallback: metadata `rsa_user_id`) |
| 3 | `rsa_getPlanIdFromPrice(priceId)` → plan_id |
| 4 | UPDATE `users` legacy columns |
| 5 | `rsa_upsertSubscription()` → upsert `subscriptions` table (tracks `cancel_at_period_end`) |
| 6 | Bump `capability_version` |
| 7 | Audit log: `subscription.updated` |
| 8 | Sync to Clerk |

**Key**: When user clicks "Cancel" in Stripe portal, Stripe sends `subscription.updated` with `cancel_at_period_end = true` and `status = 'active'`. Our code now stores this in the `subscriptions` table. Capabilities remain active until period end.

### customer.subscription.deleted

| Step | What Happens |
|------|-------------|
| 1 | Idempotency check |
| 2 | Find user by `stripe_customer_id` |
| 3 | UPDATE `users` SET subscription_plan=NULL, status='canceled', products='[]' |
| 4 | UPDATE `subscriptions` SET status='canceled', cancel_at_period_end=0 |
| 5 | Bump `capability_version` |
| 6 | Audit log: `subscription.canceled` |
| 7 | Sync to Clerk (plan=null, status='canceled') |

**DB state after**: User falls to `free` plan. All paid capabilities revoked.

### invoice.payment_succeeded

| Step | What Happens |
|------|-------------|
| 1 | Idempotency check |
| 2 | Skip non-subscription invoices |
| 3 | If `users.subscription_status = 'past_due'` → UPDATE to `'active'` |
| 4 | If status changed: bump `capability_version`, update `subscriptions` table, audit log `subscription.renewed` |

**Key**: This handles the recovery path. If a user's payment was failing and they fix their card, this event restores their access.

### invoice.payment_failed

| Step | What Happens |
|------|-------------|
| 1 | Idempotency check |
| 2 | Skip non-subscription invoices |
| 3 | UPDATE `users` SET subscription_status='past_due' |
| 4 | Bump `capability_version` |
| 5 | Audit log: `subscription.payment_failed` |

**DB state after**: `subscription_status = 'past_due'`. User **retains capabilities** during grace period (Stripe's retry logic). If all retries fail, Stripe sends `subscription.deleted`.

---

## 4. Capability Computation Correctness

### Server-side (`rsa_computeCapabilities`)

| Scenario | Plan Resolved | Capabilities |
|----------|--------------|-------------|
| Active `racer` subscription | `basic` | 20 basic caps |
| Active `pro` subscription | `pro` | 26 pro caps |
| Active `team` subscription | `team` | 30 team caps |
| `cancel_at_period_end = true`, status still `active` | Normal plan caps | Full access until period end |
| `past_due` status | Normal plan caps | Full access (grace period) |
| `canceled` status | `free` | 9 free caps only |
| No subscription | `free` | 9 free caps only |
| Admin override: `engine.proMode` granted to free user | `free` + override | 9 free caps + `engine.proMode` |
| Expired override (past `expires_at`) | Excluded | Override filtered by `expires_at > NOW()` |
| Owner role, any plan | All team caps + admin caps | Full access |

### Protected endpoints relying on `rsa_requireCapability()`

| Endpoint | Capability | Verified |
|----------|-----------|----------|
| `vehicles.php` POST/PUT/DELETE | `data.vehicles` | ✅ |
| `runs.php` GET/POST/DELETE | `data.runLog` | ✅ |
| `tracks.php` POST/PUT | `admin.access` | ✅ |
| `tracks.php` DELETE | `admin.userManagement` | ✅ |
| `users.php` ALL | `admin.access` | ✅ |
| `admin.php` ALL | `admin.access` (mutations: `admin.userManagement`) | ✅ |
| `engine_sims.php` ALL | Login-only (no cap) | ✅ |
| `capabilities-endpoint.php` | Login-only | ✅ |
| `stripe.php` checkout/portal/status | Login-only | ✅ |
| `auth.php` login/register/me | Public/login-only | ✅ |
| `tracks.php` GET | Public | ✅ |

---

## 5. UI Refresh Behavior

### Flow

```
Stripe Webhook fires
  → stripe-webhook.php updates DB + bumps capability_version
  → (async) Clerk metadata synced

User returns to app / focuses window
  → ClerkRSASync: refreshIfStale() checks cache age (>5min threshold)
  → If stale: GET /api/capabilities-endpoint.php
  → Server computes fresh capabilities from DB
  → Response includes { plan, role, capabilities, version }
  → Client stores in localStorage (rsa.capabilities.cache)
  → useCapabilities() hook re-renders with new can() results
```

### Trigger Points

| Trigger | What Happens |
|---------|-------------|
| **Login** | `refreshCapabilities()` called immediately after subscription fetch |
| **Window focus** | `refreshIfStale()` called — only fetches if cache >5min old |
| **Checkout success** | User redirected to `/account?checkout=success` → page load triggers full sync |
| **Logout** | `clearCapabilityCache()` removes localStorage entry |

### Latency

- **Webhook → DB**: Immediate (synchronous in webhook handler)
- **DB → Client**: Up to 5 minutes (stale threshold) or immediate on page load/focus
- **After checkout**: Immediate (full page redirect triggers login sync)

---

## 6. Verification Checklist

### A) Stripe Test Mode — Subscription Lifecycle

Prerequisites:
- Stripe test mode enabled
- Test card: `4242 4242 4242 4242` (success), `4000 0000 0000 0341` (decline)
- App running with test Stripe keys

#### Step 1: Create Subscription (Racer)

1. Log in as a test user
2. Go to `/pricing` → click "Subscribe" on Racer plan
3. Complete checkout with test card `4242 4242 4242 4242`
4. **Expected**:
   - Redirected to `/account?checkout=success`
   - Account page shows "Racer" plan, "active" status
   - Nav shows: Vehicles, ET Sim, History links
   - `/vehicles` accessible, can create vehicles
   - `/et-sim` accessible
   - `/history` accessible

#### Step 2: Verify Server-Side Enforcement

```bash
TOKEN="<user's auth token>"
API="https://your-domain.com/api"

# Should succeed (200) — user has data.vehicles
curl -s -w "\n%{http_code}" -X POST "$API/vehicles.php" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Car","weight":3200,"hp":500}'

# Should succeed (200) — user has data.runLog
curl -s -w "\n%{http_code}" "$API/runs.php" \
  -H "Authorization: Bearer $TOKEN"

# Should fail (403) — user doesn't have admin.access
curl -s -w "\n%{http_code}" "$API/users.php" \
  -H "Authorization: Bearer $TOKEN"
```

#### Step 3: Verify Capabilities Endpoint

```bash
curl -s "$API/capabilities-endpoint.php" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

Expected response:
```json
{
  "plan": "basic",
  "role": "user",
  "capabilities": ["sim.basic", "sim.et", "sim.raceTools", "data.vehicles", "data.runLog", ...],
  "version": 2
}
```

#### Step 4: Cancel Subscription (via Stripe Portal)

1. Go to `/account` → click "Manage Subscription"
2. In Stripe portal, click "Cancel subscription"
3. Choose "Cancel at end of period"
4. **Expected**:
   - Stripe sends `subscription.updated` with `cancel_at_period_end = true`
   - User still has full access until period end
   - `subscriptions.cancel_at_period_end = 1` in DB

#### Step 5: Simulate Period End (Stripe CLI)

```bash
# Trigger subscription deletion (simulates period end after cancel)
stripe trigger customer.subscription.deleted
```

**Expected**:
- `users.subscription_plan = NULL`, `subscription_status = 'canceled'`
- `subscriptions.status = 'canceled'`
- `capability_version` incremented
- On next app focus/load: user loses paid features
- `/vehicles` shows upgrade prompt
- `/et-sim` shows upgrade prompt

#### Step 6: Failed Payment

```bash
# Create a subscription with a card that will fail on next charge
# Use card 4000 0000 0000 0341 for immediate decline
stripe trigger invoice.payment_failed
```

**Expected**:
- `users.subscription_status = 'past_due'`
- `capability_version` incremented
- User **retains access** during grace period
- Audit log entry: `subscription.payment_failed`

#### Step 7: Payment Recovery

```bash
stripe trigger invoice.payment_succeeded
```

**Expected**:
- If was `past_due`: `users.subscription_status` restored to `'active'`
- `capability_version` incremented
- Audit log entry: `subscription.renewed`

### B) Admin UI Sanity Checks

1. **Login as owner/admin** → "Admin" link visible in nav
2. **`/admin`** → Users tab loads, shows user list with plan/status badges
3. **Search** → Type test user's email → results appear
4. **View user** → Click "View" → Details tab shows:
   - Stripe Customer ID
   - Subscription plan + status badges
   - Period end date
   - Effective capabilities list
5. **Grant capability** → Enter `engine.proMode`, reason "test", days "7" → click Grant
   - Success message appears
   - Override appears in list with expiry date
   - User now has `engine.proMode` even on free plan
6. **Revoke capability** → Click "Revoke" on the override
   - Override removed from list
7. **Audit Log tab** → Shows entries for grant/revoke actions
8. **Non-admin user** → No "Admin" link in nav, `/admin` shows access denied

### C) Engine Sims Audit Entries

```bash
# After creating/updating/deleting engine sims, verify audit log:
SELECT action, target_user_id, metadata, created_at
FROM audit_log
WHERE action LIKE 'engine_sim%'
ORDER BY created_at DESC
LIMIT 10;
```

Expected actions: `engine_sim.created`, `engine_sim.updated`, `engine_sim.deleted`

### D) Database Verification Queries

```sql
-- Verify subscriptions table is populated after webhook
SELECT u.id, u.email, u.subscription_plan, u.subscription_status,
       s.plan_id, s.status, s.cancel_at_period_end, s.current_period_end
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.subscription_plan IS NOT NULL;

-- Verify capability_version increments
SELECT id, email, capability_version FROM users
WHERE capability_version > 1;

-- Verify webhook idempotency
SELECT stripe_event_id, event_type, created_at
FROM webhook_events
ORDER BY created_at DESC LIMIT 10;

-- Verify audit trail
SELECT action, target_user_id, metadata, created_at
FROM audit_log
WHERE action LIKE 'subscription%'
ORDER BY created_at DESC LIMIT 10;
```

---

## 7. Files Changed in This Session

| File | Action | Purpose |
|------|--------|---------|
| `api/lib/plans.php` | **Created** | Centralized price↔plan mapping (single source of truth) |
| `api/stripe.php` | **Modified** | Uses `api/lib/plans.php`, removed local duplicates |
| `api/stripe-webhook.php` | **Modified** | Uses `api/lib/plans.php`, writes `subscriptions` table, tracks `cancel_at_period_end`, `handlePaymentSucceeded` now restores `past_due` users |
| `src/domain/auth/ClerkAuthProvider.tsx` | **Modified** | Wired `capabilityRefresh.ts` — refresh on login, on focus if stale, clear on logout |
