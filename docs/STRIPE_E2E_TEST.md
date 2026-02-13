# Stripe Test Mode End-to-End Script

> Run this checklist in Stripe **test mode** against dev or staging.
> Prerequisites: Stripe CLI installed, test API keys in `config.php`, app running.

---

## Setup

```bash
# Install Stripe CLI (if not already)
brew install stripe/stripe-cli/stripe

# Login to Stripe CLI
stripe login

# Forward webhooks to local/staging
stripe listen --forward-to https://your-domain.com/api/stripe-webhook.php
# Note the webhook signing secret (whsec_...) — update config.php if needed
```

**Test cards:**
| Card | Behavior |
|------|----------|
| `4242 4242 4242 4242` | Always succeeds |
| `4000 0000 0000 0341` | Attaches OK, fails on charge |
| `4000 0000 0000 9995` | Decline (insufficient funds) |

Use any future expiry (e.g., 12/30), any CVC (e.g., 123), any ZIP (e.g., 12345).

---

## Test 1: Create Racer Subscription

### Action
1. Log in as test user (e.g., `testuser@example.com`)
2. Navigate to `/pricing`
3. Click "Subscribe" on **Racer** plan (monthly)
4. Complete checkout with card `4242 4242 4242 4242`

### Expected: Database

```sql
-- users table
SELECT subscription_plan, subscription_status, subscription_period_end,
       stripe_customer_id, products, capability_version
FROM users WHERE email = 'testuser@example.com';
```

| Column | Expected |
|--------|----------|
| `subscription_plan` | `racer` |
| `subscription_status` | `active` |
| `subscription_period_end` | ~30 days from now |
| `stripe_customer_id` | `cus_...` (non-null) |
| `products` | `["quarter_jr"]` |
| `capability_version` | Incremented (≥2) |

```sql
-- subscriptions table
SELECT plan_id, status, price_id, billing_period, cancel_at_period_end,
       current_period_end
FROM subscriptions WHERE user_id = <user_id>;
```

| Column | Expected |
|--------|----------|
| `plan_id` | `racer` |
| `status` | `active` |
| `price_id` | Matches `STRIPE_PRICE_RACER_MONTHLY` |
| `billing_period` | `monthly` |
| `cancel_at_period_end` | `0` |

```sql
-- audit_log
SELECT action, metadata FROM audit_log
WHERE target_user_id = <user_id> AND action = 'subscription.created'
ORDER BY created_at DESC LIMIT 1;
```

Should show `subscription.created` with plan=racer.

### Expected: Capabilities Endpoint

```bash
curl -s "$API/capabilities-endpoint.php" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
```

| Field | Expected |
|-------|----------|
| `plan` | `basic` (racer → basic via PLAN_ALIASES) |
| `role` | `user` |
| `capabilities` | Includes `sim.et`, `sim.raceTools`, `data.vehicles`, `data.runLog`, `optimizer.gear` |
| `capabilities` | Does NOT include `engine.proMode`, `track.bonneville`, `team.enabled` |

### Expected: UI

| Element | Visible? |
|---------|----------|
| Vehicles page | ✅ Accessible, can create vehicles |
| ET Sim page | ✅ Accessible |
| History / Run Log | ✅ Accessible |
| Engine Pro page | ❌ Upgrade prompt or hidden |
| Bonneville Sim | ❌ Upgrade prompt or hidden |
| Team features | ❌ Hidden |

### Expected: Admin Portal

1. Log in as owner/admin
2. Go to `/admin` → search for `testuser@example.com`
3. Click "View" → User Details should show:
   - Plan: `racer`, Status: `active`
   - Stripe Customer ID: `cus_...`
   - Period End: ~30 days from now
   - Capabilities list includes `sim.et`, `data.vehicles`, etc.

---

## Test 2: Create Pro Subscription

### Action
1. Log in as a different test user (e.g., `prouser@example.com`)
2. Subscribe to **Pro** plan (monthly) with card `4242 4242 4242 4242`

### Expected: Database

| Column (users) | Expected |
|--------|----------|
| `subscription_plan` | `pro` |
| `products` | `["quarter_pro","bonneville_pro"]` |

| Column (subscriptions) | Expected |
|--------|----------|
| `plan_id` | `pro` |
| `price_id` | Matches `STRIPE_PRICE_PRO_MONTHLY` |

### Expected: Capabilities

| Field | Expected |
|-------|----------|
| `plan` | `pro` |
| `capabilities` | Includes everything in basic PLUS `engine.proMode`, `vehicle.editor.pro`, `track.bonneville`, `track.custom`, `library.install.*` |
| `capabilities` | Does NOT include `team.enabled`, `team.library.share` |

### Expected: UI

| Element | Visible? |
|---------|----------|
| Engine Pro page | ✅ Accessible |
| Bonneville Sim | ✅ Accessible |
| Gear Optimizer | ✅ Accessible |
| Team features | ❌ Hidden |

---

## Test 3: Create Team Subscription

### Action
1. Log in as a third test user (e.g., `teamuser@example.com`)
2. Subscribe to **Team** plan (yearly) with card `4242 4242 4242 4242`

### Expected: Database

| Column (users) | Expected |
|--------|----------|
| `subscription_plan` | `team` |
| `products` | `["quarter_pro","bonneville_pro","engine_pro","clutch_pro","suspension_pro"]` |

| Column (subscriptions) | Expected |
|--------|----------|
| `plan_id` | `team` |
| `billing_period` | `yearly` |

### Expected: Capabilities

| Field | Expected |
|-------|----------|
| `plan` | `team` |
| `capabilities` | Includes everything in pro PLUS `team.enabled`, `team.library.share`, `team.vehicles.share`, `team.runs.share` |

---

## Test 4: Upgrade Racer → Pro

### Action
1. Log in as the Racer user (`testuser@example.com`)
2. Go to `/account` → "Manage Subscription" (Stripe portal)
3. Upgrade to Pro plan

### Expected

- Stripe sends `customer.subscription.updated`
- `users.subscription_plan` changes from `racer` to `pro`
- `users.products` changes to `["quarter_pro","bonneville_pro"]`
- `subscriptions.plan_id` changes to `pro`
- `capability_version` incremented
- `audit_log` entry: `subscription.updated` with plan=pro
- UI: Engine Pro page now accessible

### Verify

```sql
SELECT subscription_plan, products, capability_version FROM users WHERE email = 'testuser@example.com';
-- Expected: pro, ["quarter_pro","bonneville_pro"], version incremented

SELECT plan_id, status FROM subscriptions WHERE user_id = <user_id>;
-- Expected: pro, active
```

---

## Test 5: Downgrade Pro → Racer

### Action
1. Same user → Stripe portal → downgrade to Racer

### Expected

- Stripe sends `customer.subscription.updated`
- `users.subscription_plan` = `racer`
- `users.products` = `["quarter_jr"]`
- `subscriptions.plan_id` = `racer`
- `capability_version` incremented
- UI: Engine Pro page no longer accessible

---

## Test 6: Cancel at Period End

### Action
1. Log in as Racer user
2. Go to Stripe portal → Cancel subscription → "Cancel at end of period"

### Expected

- Stripe sends `customer.subscription.updated` with `cancel_at_period_end = true`, `status = 'active'`
- `users.subscription_status` remains `active`
- `users.subscription_plan` remains `racer`
- `subscriptions.cancel_at_period_end` = `1`
- `subscriptions.status` = `active`
- `capability_version` incremented
- **User retains full access** until period end

### Verify

```sql
SELECT cancel_at_period_end, status, current_period_end FROM subscriptions WHERE user_id = <user_id>;
-- Expected: 1, active, future date
```

### Simulate Period End

```bash
# Use Stripe CLI to trigger the deletion event (simulates period end)
stripe trigger customer.subscription.deleted
```

After trigger:
- `users.subscription_plan` = NULL
- `users.subscription_status` = `canceled`
- `users.products` = `[]`
- `subscriptions.status` = `canceled`
- `subscriptions.cancel_at_period_end` = `0`
- `capability_version` incremented
- UI: User loses paid features, sees upgrade prompts

---

## Test 7: Payment Failure → Past Due → Recovery

### Action (Failure)

Option A — Use Stripe CLI:
```bash
stripe trigger invoice.payment_failed
```

Option B — Create subscription with declining card:
1. Subscribe with card `4000 0000 0000 0341`
2. First charge succeeds, next renewal will fail

### Expected After Failure

| Column (users) | Expected |
|--------|----------|
| `subscription_status` | `past_due` |
| `subscription_plan` | Unchanged (still `racer`/`pro`/`team`) |

| Column (subscriptions) | Expected |
|--------|----------|
| `status` | `past_due` |

- `capability_version` incremented
- `audit_log` entry: `subscription.payment_failed`
- **User retains capabilities** (past_due is in the valid status list)

### Action (Recovery)

```bash
stripe trigger invoice.payment_succeeded
```

### Expected After Recovery

| Column (users) | Expected |
|--------|----------|
| `subscription_status` | `active` (restored from past_due) |

| Column (subscriptions) | Expected |
|--------|----------|
| `status` | `active` |

- `capability_version` incremented again
- `audit_log` entry: `subscription.renewed` with `restored_from=past_due`

### Verify

```sql
SELECT action, metadata, created_at FROM audit_log
WHERE target_user_id = <user_id>
ORDER BY created_at DESC LIMIT 5;
-- Should show: subscription.renewed, subscription.payment_failed
```

---

## Test 8: Immediate Cancellation (subscription.deleted)

### Action

```bash
stripe trigger customer.subscription.deleted
```

Or: In Stripe Dashboard → Subscriptions → Cancel immediately

### Expected

- `users.subscription_plan` = NULL
- `users.subscription_status` = `canceled`
- `users.products` = `[]`
- `subscriptions.status` = `canceled`
- `capability_version` incremented
- `audit_log` entry: `subscription.canceled`
- UI: All paid features hidden, upgrade prompts shown

---

## Test 9: Webhook Idempotency

### Action

1. Note the last `stripe_event_id` from `webhook_events` table
2. Replay the same event:

```bash
stripe events resend <event_id>
```

### Expected

- Webhook returns `200` with `{"received":true,"duplicate":true}`
- Error log shows: `Stripe webhook: duplicate event <id>, skipping`
- No database changes (no duplicate audit_log entries, no double capability_version bump)

### Verify

```sql
SELECT COUNT(*) FROM webhook_events WHERE stripe_event_id = '<event_id>';
-- Expected: 1 (not 2)

SELECT capability_version FROM users WHERE id = <user_id>;
-- Expected: Same as before replay
```

---

## Test 10: Admin Capability Override

### Action

1. Log in as owner/admin → `/admin`
2. Search for the test user
3. Grant capability `engine.proMode` with reason "E2E test" and expiry 1 day
4. Verify the user now has `engine.proMode` even on Racer plan

### Expected

```bash
# As the test user:
curl -s "$API/capabilities-endpoint.php" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# capabilities array should include "engine.proMode"
```

- `user_capabilities` table has row: `capability_key=engine.proMode`, `expires_at=tomorrow`
- `audit_log` entry: `capability.granted`
- UI: Engine Pro page accessible for the Racer user

### Revoke

1. In admin portal, click "Revoke" on the override
2. Verify `engine.proMode` removed from capabilities

---

## Test 11: Error Log Verification

After running all tests, check error logs:

```bash
# Look for structured webhook logs
grep "Stripe webhook" /var/log/apache2/error.log | tail -20
```

Expected log format:
```
Stripe webhook received: type=checkout.session.completed id=evt_xxx
Stripe webhook OK: type=checkout.session.completed id=evt_xxx elapsed=123.4ms
```

Should NOT see:
- `PLAN_ALIASES miss` — would indicate a plan name not in the alias map
- `Stripe webhook FAIL` — would indicate handler errors
- `rsa_upsertSubscription failed` — would indicate subscriptions table issues

---

## Summary Checklist

| # | Test | Pass? |
|---|------|-------|
| 1 | Create Racer subscription | ☐ |
| 2 | Create Pro subscription | ☐ |
| 3 | Create Team subscription | ☐ |
| 4 | Upgrade Racer → Pro | ☐ |
| 5 | Downgrade Pro → Racer | ☐ |
| 6 | Cancel at period end + simulate expiry | ☐ |
| 7 | Payment failure → past_due → recovery | ☐ |
| 8 | Immediate cancellation | ☐ |
| 9 | Webhook idempotency (replay) | ☐ |
| 10 | Admin capability override (grant + revoke) | ☐ |
| 11 | Error log verification | ☐ |
