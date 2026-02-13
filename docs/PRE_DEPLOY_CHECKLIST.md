# Pre-Deploy Smoke Checklist

> Run this checklist before deploying subscription lifecycle + admin portal changes to production.

## 1. Database Migrations

```bash
# Run in order — all are idempotent (IF NOT EXISTS / INSERT IGNORE)
php api/migrate-v2.php                    # subscriptions, user_capabilities, webhook_events, audit_log + capability_version
php api/migrate-v3-engine-sims.php        # engine_sims table
php api/migrate-v4-plan-capabilities.php  # plan_capabilities table + seed from code mappings
```

**Verify:**
- [ ] `SHOW TABLES` includes: `subscriptions`, `user_capabilities`, `webhook_events`, `audit_log`, `engine_sims`, `plan_capabilities`
- [ ] `DESCRIBE users` includes: `capability_version`, `last_capability_sync`
- [ ] `SELECT COUNT(*) FROM subscriptions` — backfill ran (should match users with active Stripe subs)

## 2. Environment Variables

Confirm these are set in production `.env` / hosting config:

| Variable | Where | Check |
|----------|-------|-------|
| `STRIPE_SECRET_KEY` | API server | `sk_live_...` (NOT `sk_test_`) |
| `STRIPE_PUBLISHABLE_KEY` | Frontend build | `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | API server | `whsec_...` from Stripe dashboard |
| `STRIPE_PRICE_RACER_MONTHLY` | API server | Matches live Stripe price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | API server | Matches live Stripe price ID |
| `STRIPE_PRICE_TEAM_MONTHLY` | API server | Matches live Stripe price ID |
| `CLERK_SECRET_KEY` | API server | Production Clerk key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Frontend build | Production Clerk publishable key |

## 3. Stripe Webhook Configuration

In Stripe Dashboard → Developers → Webhooks:

- [ ] Endpoint URL points to production `api/stripe-webhook.php`
- [ ] Signing secret matches `STRIPE_WEBHOOK_SECRET` env var
- [ ] Events enabled:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

**Test:** Send a test event from Stripe dashboard → check server logs for:
```
Stripe webhook received: type=... id=evt_...
Stripe webhook: duplicate event evt_..., skipping   (on second send)
```

## 4. Endpoint Sanity Checks

Hit these endpoints and verify responses:

### Capabilities endpoint
```bash
curl -H "Authorization: Bearer <token>" https://your-domain/api/capabilities.php
# Expected: { "capabilities": [...], "plan": "basic|pro|team|free", "version": N }
```

### Admin endpoint (requires admin/owner token)
```bash
curl -H "Authorization: Bearer <admin-token>" "https://your-domain/api/admin.php?action=search&q=test"
# Expected: { "users": [...] }
```

### Vehicles endpoint (gated — requires basic+ plan)
```bash
curl -H "Authorization: Bearer <free-user-token>" https://your-domain/api/vehicles.php
# Expected: 403 or empty (free user cannot access)

curl -H "Authorization: Bearer <racer-token>" https://your-domain/api/vehicles.php
# Expected: 200 with user's vehicles
```

## 5. Grace Period Verification

```sql
-- Find a past_due subscription (or create one via Stripe test)
SELECT user_id, plan_id, status, updated_at,
       TIMESTAMPDIFF(HOUR, updated_at, NOW()) AS hours_since_update
FROM subscriptions
WHERE status = 'past_due';
```

- [ ] If `hours_since_update < 72`: user retains plan capabilities (check server logs for "Grace active")
- [ ] If `hours_since_update >= 72`: user degrades to free (check server logs for "Grace expired")

## 6. UI Smoke Tests

| Page | Check |
|------|-------|
| `/admin` | Loads for owner/admin, shows user search, capability overrides, audit log, **Plans tab** |
| `/dev` | Shows "Diagnostics (read-only)" banner, User Management panel shows deprecation notice |
| `/dev?panel=plans` | Plans & Capabilities panel shows read-only capability matrix |
| `/dev?panel=users` | Shows "User Management Has Moved" with link to Admin Portal |
| Home page | Free user sees upgrade prompts; paid user sees full feature cards |
| `/et-sim` | Free user blocked; Racer+ user can access |
| `/vehicles` | Free user blocked; Racer+ user can access |
| `/admin` → Plans tab | Shows all plans with capability toggles; save requires `admin.userManagement` |

## 6b. Free Tier Tightening Verification

- [ ] Free user **cannot** save to component library (no `library.save.*` capabilities)
- [ ] Free user **can** still use basic calculator (`sim.basic`, `charts.basic`)
- [ ] Free user **can** still see vehicle editor basic fields (`vehicle.editor.basic`)
- [ ] Basic user **can** save to library (`library.save.engine/clutch/fourLink`)
- [ ] Basic user does **not** have `sim.advanced`, `optimizer.*`, `weather.live`, `charts.advanced` (those are Pro+)

## 7. Idempotency Check

```sql
-- After processing webhooks, verify no duplicates
SELECT stripe_event_id, COUNT(*) as cnt
FROM webhook_events
GROUP BY stripe_event_id
HAVING cnt > 1;
-- Expected: 0 rows
```

## 8. Rollback Plan

If something goes wrong, revert in this order:

1. **Frontend:** Redeploy previous frontend build (no DB dependency)
2. **API:** Revert `api/lib/capabilities.php`, `api/stripe-webhook.php`, `api/lib/plans.php` to previous versions
3. **Database:** Migration tables are additive — no rollback needed. Legacy `users` columns still work as fallback.

> The capability system gracefully falls back to legacy `users.subscription_plan` if the `subscriptions` table is empty or missing.

## 9. Deploy Readiness — What's Safe Today

**Ship today (no blockers):**
- Free tier tightening (code-level, both server + client)
- Server basic tier alignment with client (removed drift)
- All existing tests updated and passing (435/435)
- Grace period for past_due subscriptions
- Dev Portal diagnostics banner + UserManagement deprecation

**Optional (can ship today or defer):**
- Migration v4 (`plan_capabilities` table) — additive, no breaking changes
- Admin Portal Plans tab — only functional after v4 migration runs
- If v4 is not run, capability computation falls back to code-level `PLAN_CAPABILITIES` automatically

**Nothing blocks today's deploy if v4 migration is deferred.**

---

## 10. RC2 — Physics/ET/Engine Parity (2026-02-13)

**Scope:** VB6 per-operation Float32 truncation parity refactor (frontend-only).

### Pre-Deploy Checks
- [ ] `npm run build` succeeds (tsc clean + vite build)
- [ ] Release-gate tests pass: `npx vitest run src/domain/config src/dev/__tests__` (428/428)
- [ ] Integration tests: no new regressions vs main (12 pre-existing OK)
- [ ] Branch: `release/2026-02-13-rc2-physics`

### Deploy Steps (Frontend Only)
- [ ] `npm run build` → produces `dist/`
- [ ] rsync `dist/` to `public_html/` excluding `api/`, `.htaccess`, `.well-known/`
- [ ] **NO** API file changes needed
- [ ] **NO** database migrations needed
- [ ] **DO NOT** touch `config.php`

### Post-Deploy Smoke Tests
- [ ] `/predict` — run a simulation, verify ET/MPH output appears
- [ ] `/engine-sim` — dashboard loads, tabs work, Pro mode gating intact
- [ ] `/admin` — Plans tab still shows `dbBacked: true`
- [ ] Browser console — no JS errors on Predict or Engine Sim pages
- [ ] `/api/capabilities-endpoint.php` — still returns 401 unauthenticated

### Rollback
- Revert `dist/` to RC1 build (API and DB are unchanged)
- `git checkout main && npm run build` → rsync that dist/
