# Production Rollout Runbook

> Covers: Subscription lifecycle pipeline, Admin Portal, Engine Sims, Capability Refresh
> Generated: 2026-02-13

---

## Overview of Changes

| Layer | What Changed |
|-------|-------------|
| **DB** | migrate-v2 (subscriptions, user_capabilities, webhook_events, audit_log, capability_version), migrate-v3-engine-sims |
| **API** | `api/lib/plans.php` (new), `api/lib/capabilities.php` (hardened PLAN_ALIASES), `api/stripe-webhook.php` (subscriptions upsert, cancel_at_period_end, payment recovery, structured logging), `api/stripe.php` (uses shared plans), `api/engine_sims.php` (new), `api/capabilities-endpoint.php` (existing, no change) |
| **Frontend** | `AdminPortal.tsx` (new), `/admin` route + nav link, `capabilityRefresh.ts` wired into `ClerkAuthProvider`, `admin.access` capability added |

---

## Phase 1: Dev Environment

### Pre-flight

```bash
# 1. Confirm clean working tree
git status

# 2. Confirm tests pass
npx tsc --noEmit
npx vitest run --exclude='src/integration-tests/**'

# 3. Confirm config.php has Stripe test keys (NOT live keys)
grep 'sk_test_' api/config.php   # should match
grep 'sk_live_' api/config.php   # should NOT match
```

### Deploy Steps (ordered)

```
Step 1 — Database migrations (run BEFORE deploying code)
Step 2 — Deploy API files
Step 3 — Deploy frontend build
Step 4 — Post-flight verification
```

#### Step 1: Database Migrations

```bash
# Run migrate-v2 (creates subscriptions, user_capabilities, webhook_events, audit_log tables)
# Safe to re-run — uses IF NOT EXISTS and duplicate-column checks
php api/migrate-v2.php

# Run migrate-v3-engine-sims (creates engine_sims table)
php api/migrate-v3-engine-sims.php
```

**Verify:**
```sql
SHOW TABLES LIKE 'subscriptions';
SHOW TABLES LIKE 'user_capabilities';
SHOW TABLES LIKE 'webhook_events';
SHOW TABLES LIKE 'audit_log';
SHOW TABLES LIKE 'engine_sims';
SHOW COLUMNS FROM users LIKE 'capability_version';
```

All should return rows. If any are missing, re-run the relevant migration.

#### Step 2: Deploy API Files

Upload/deploy these files in this order:

1. `api/lib/plans.php` — **NEW** (must exist before stripe.php or stripe-webhook.php load)
2. `api/lib/capabilities.php` — Updated (hardened PLAN_ALIASES)
3. `api/lib/audit.php` — Existing (no change, but must be present)
4. `api/stripe.php` — Updated (uses shared plans.php)
5. `api/stripe-webhook.php` — Updated (subscriptions upsert, logging)
6. `api/engine_sims.php` — **NEW**
7. `api/capabilities-endpoint.php` — Existing (no change)

**Critical**: `api/lib/plans.php` MUST be deployed before `api/stripe.php` and `api/stripe-webhook.php`, or both will fatal error on missing functions.

#### Step 3: Deploy Frontend

```bash
npm run build
# Deploy dist/ to hosting
```

#### Step 4: Post-flight Checks

```bash
# API health — should return valid JSON
curl -s https://your-dev-domain.com/api/stripe.php?action=prices | python3 -m json.tool

# Webhook endpoint reachable (will return 400 since no signature)
curl -s -o /dev/null -w "%{http_code}" -X POST https://your-dev-domain.com/api/stripe-webhook.php
# Expected: 400

# Capabilities endpoint (requires auth)
curl -s -o /dev/null -w "%{http_code}" https://your-dev-domain.com/api/capabilities-endpoint.php
# Expected: 401

# Engine sims endpoint (requires auth)
curl -s -o /dev/null -w "%{http_code}" https://your-dev-domain.com/api/engine_sims.php
# Expected: 401

# Admin portal loads (browser)
# Navigate to /admin as owner/admin user — should see tabbed UI
```

---

## Phase 2: Staging Environment

### Pre-flight

1. Dev environment passes all post-flight checks
2. Stripe test mode webhook configured for staging URL
3. Staging DB is a recent copy of production (or fresh)

### Deploy Steps

Same as Phase 1, Steps 1–4.

### Additional Staging Checks

Run the **Stripe Test Mode E2E Script** (see `docs/STRIPE_E2E_TEST.md`):
- Create subscription for each tier
- Verify capabilities endpoint returns correct caps
- Cancel subscription, verify downgrade
- Simulate payment failure + recovery
- Verify admin portal shows correct data

### Staging Sign-off Criteria

- [ ] All 3 tiers (racer/pro/team) create successfully via checkout
- [ ] Capabilities endpoint returns correct plan + capabilities for each tier
- [ ] Cancel-at-period-end tracked in subscriptions table
- [ ] Payment failure sets past_due, recovery restores active
- [ ] Admin portal: user search, details, grant/revoke, audit log all work
- [ ] Engine sims CRUD works for authenticated users
- [ ] Webhook idempotency: duplicate events return 200 without re-processing
- [ ] Error logs show structured webhook logging (type, id, elapsed)
- [ ] No PLAN_ALIASES miss warnings in error log

---

## Phase 3: Production

### Pre-flight

1. Staging sign-off criteria all checked
2. **Stripe live mode webhook** configured for production URL:
   - URL: `https://racingsystemsanalysis.com/api/stripe-webhook.php`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
3. `config.php` has **live** Stripe keys (`sk_live_*`, `whsec_*`)
4. Confirm live Stripe price IDs match `STRIPE_PRICE_*` constants in `config.php`
5. Database backup taken

### Deploy Steps

```
Step 1 — Take database backup
Step 2 — Run migrations (same as dev)
Step 3 — Deploy API files (same order as dev)
Step 4 — Deploy frontend build
Step 5 — Post-flight verification
Step 6 — Monitor error logs for 30 minutes
```

#### Step 1: Database Backup

```bash
mysqldump -u $DB_USER -p $DB_NAME > backup_pre_v2_$(date +%Y%m%d_%H%M%S).sql
```

#### Steps 2–4: Same as Dev

#### Step 5: Post-flight Verification

```bash
# Prices endpoint
curl -s https://racingsystemsanalysis.com/api/stripe.php?action=prices | python3 -m json.tool

# Webhook endpoint reachable
curl -s -o /dev/null -w "%{http_code}" -X POST https://racingsystemsanalysis.com/api/stripe-webhook.php
# Expected: 400

# Check error logs for any immediate issues
tail -f /var/log/apache2/error.log | grep -i stripe
```

#### Step 6: Monitor

Watch error logs for 30 minutes after deploy. Look for:
- `PLAN_ALIASES miss` — indicates a plan name not in the alias map
- `Stripe webhook FAIL` — handler errors
- `rsa_upsertSubscription failed` — subscriptions table issues
- `idempotency check failed` — webhook_events table issues

### Rollback Plan

If something goes wrong, revert in **reverse order**:

```
1. Frontend: Re-deploy previous build (dist/ from previous release)
2. API: Revert these files to previous versions:
   - api/stripe-webhook.php
   - api/stripe.php
   - api/lib/capabilities.php
   - Remove api/lib/plans.php (stripe.php/webhook will use their old local copies)
   - Remove api/engine_sims.php (new endpoint, no existing callers)
3. Database: Tables are additive (new tables, new columns) — no rollback needed.
   The old code ignores the new tables. capability_version column has a default of 1.
```

**Key**: The database migrations are **safe to leave in place** during rollback. The old code simply doesn't read the new tables. The `capability_version` column defaults to 1 and is only incremented by the new webhook code.

**If webhook is broken**: Temporarily disable the webhook in Stripe Dashboard → Developers → Webhooks. Stripe will queue events and retry when re-enabled (up to 72 hours).

---

## Deployment Dependency Graph

```
migrate-v2.php ──────────────────┐
migrate-v3-engine-sims.php ──────┤
                                 ▼
api/lib/plans.php ───────────────┐
api/lib/capabilities.php ────────┤
api/lib/audit.php ───────────────┤
                                 ▼
api/stripe.php ──────────────────┐
api/stripe-webhook.php ──────────┤
api/engine_sims.php ─────────────┤
api/capabilities-endpoint.php ───┤
                                 ▼
Frontend build (npm run build) ──┘
```

**Rule**: Everything above the arrow must be deployed before everything below it.
