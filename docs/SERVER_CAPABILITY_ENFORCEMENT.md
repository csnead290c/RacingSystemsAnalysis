# Server-Side Capability Enforcement — Runbook & Verification

> **Date:** 2026-02-13
> **Status:** Implemented (pending migration)

---

## 1. Endpoint Inventory & Gating Plan

| Endpoint | Method | Purpose | Capability Required | Notes |
|---|---|---|---|---|
| `api/auth.php?action=login` | POST | User login | _(none — public)_ | Returns JWT |
| `api/auth.php?action=register` | POST | User registration | _(none — public)_ | Creates free user |
| `api/auth.php?action=me` | GET | Get current user | _(auth only)_ | No cap needed |
| `api/auth.php?action=update` | POST | Update profile | _(auth only)_ | Name/password only |
| `api/auth.php?action=preferences` | GET/POST | User preferences | _(auth only)_ | No cap needed |
| `api/auth.php?action=sync-clerk-user` | POST | Sync Clerk user to DB | _(auth only)_ | Clerk integration |
| **`api/vehicles.php`** | **GET** | List/get vehicles | _(auth only for own; public for public vehicles)_ | No cap for reads |
| **`api/vehicles.php`** | **POST** | Create vehicle | **`data.vehicles`** | ✅ **ENFORCED** |
| **`api/vehicles.php`** | **PUT** | Update vehicle | **`data.vehicles`** | ✅ **ENFORCED** |
| **`api/vehicles.php`** | **DELETE** | Delete vehicle | **`data.vehicles`** | ✅ **ENFORCED** |
| **`api/runs.php`** | **GET** | List run history | **`data.runLog`** | ✅ **ENFORCED** |
| **`api/runs.php`** | **POST** | Save run | **`data.runLog`** | ✅ **ENFORCED** |
| **`api/runs.php`** | **DELETE** | Delete run(s) | **`data.runLog`** | ✅ **ENFORCED** |
| **`api/tracks.php`** | **GET** | List tracks | _(none — public)_ | Track data is public |
| **`api/tracks.php`** | **POST** | Add track | **`admin.access`** | ✅ **ENFORCED** (was role check) |
| **`api/tracks.php`** | **PUT** | Update track | **`admin.access`** | ✅ **ENFORCED** (was role check) |
| **`api/tracks.php`** | **DELETE** | Delete track | **`admin.userManagement`** | ✅ **ENFORCED** (was owner-only) |
| **`api/users.php`** | **ALL** | User management | **`admin.access`** | ✅ **ENFORCED** (was role check) |
| **`api/admin.php`** | **ALL** | Admin tools | **`admin.access`** + mutations: **`admin.userManagement`** | ✅ **ENFORCED** (new file) |
| `api/stripe.php?action=create-checkout-session` | POST | Start checkout | _(auth only)_ | Any user can subscribe |
| `api/stripe.php?action=create-portal-session` | POST | Billing portal | _(auth only)_ | Requires existing customer |
| `api/stripe.php?action=subscription-status` | GET | Get sub status | _(auth only)_ | No cap needed |
| `api/stripe.php?action=prices` | GET | Get prices | _(none — public)_ | Public pricing info |
| `api/stripe-webhook.php` | POST | Stripe webhooks | _(Stripe signature)_ | Idempotency added ✅ |
| `api/capabilities-endpoint.php` | GET | Get user caps | _(auth only)_ | Client refresh endpoint |
| `api/engine_sims.php` | ALL | Engine sim CRUD | _(does not exist yet)_ | Referenced in client but not created |

### Capability → Plan Mapping (server-side mirror)

| Capability | free | basic | pro | team | owner/admin |
|---|---|---|---|---|---|
| `data.vehicles` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `data.runLog` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `engine.proMode` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `admin.access` | ❌ | ❌ | ❌ | ❌ | ✅ (role) |
| `admin.userManagement` | ❌ | ❌ | ❌ | ❌ | ✅ (role) |

---

## 2. Files Modified

| File | Change |
|---|---|
| `api/vehicles.php` | Added `require lib/capabilities.php`, `rsa_requireCapability('data.vehicles')` on POST/PUT/DELETE |
| `api/runs.php` | Added `require lib/capabilities.php`, `rsa_requireCapability('data.runLog')` on GET/POST/DELETE |
| `api/tracks.php` | Added `require lib/capabilities.php`, replaced role checks with `rsa_requireCapability('admin.access')` on POST/PUT, `admin.userManagement` on DELETE |
| `api/users.php` | Added `require lib/capabilities.php`, replaced role check with `rsa_requireCapability('admin.access')` |
| `api/stripe-webhook.php` | Added idempotency via `webhook_events` table, audit logging via `lib/audit.php`, `capability_version` bumping on all subscription lifecycle events |

### Error Response Shape (consistent across all endpoints)

```json
HTTP 403 Forbidden
{
  "error": "Forbidden",
  "message": "Missing required capability: data.vehicles",
  "requiredCapability": "data.vehicles"
}
```

---

## 3. DB Migration Runbook

### Pre-Migration Checklist

- [ ] Confirm you have a database backup (or can recreate from scratch in dev)
- [ ] Confirm `api/config.php` exists with valid DB credentials
- [ ] Confirm `api/lib/capabilities.php` and `api/lib/audit.php` exist

### Step 1: Run Migration (Dev)

```bash
# From project root — run via CLI
php api/migrate-v2.php
```

Or via browser (dev only):
```
http://localhost:XXXX/api/migrate-v2.php
```

**Expected output:**
```
=== RSA Database Migration v2 ===

1. Connecting to database...
   OK

2. Adding capability_version to users...
   Added column: users.capability_version
   Added column: users.last_capability_sync
   OK

3. Creating subscriptions table...
   OK

4. Creating user_capabilities table...
   OK

5. Creating webhook_events table...
   OK

6. Creating audit_log table...
   OK

7. Backfilling subscriptions from users table...
   Backfilled: N new, 0 already existed

8. Creating feature_flags table (optional)...
   OK

=== Migration v2 Complete ===
```

### Step 2: Verify Tables Exist

```sql
SHOW TABLES LIKE 'subscriptions';
SHOW TABLES LIKE 'user_capabilities';
SHOW TABLES LIKE 'webhook_events';
SHOW TABLES LIKE 'audit_log';
SHOW TABLES LIKE 'feature_flags';

-- Verify capability_version column
DESCRIBE users;
-- Should show: capability_version INT DEFAULT 1

-- Verify backfill
SELECT COUNT(*) FROM subscriptions;
-- Should match: SELECT COUNT(*) FROM users WHERE subscription_id IS NOT NULL;
```

### Step 3: Verify Capability Enforcement Works

After migration, the capability checks will use the `subscriptions` table (with fallback to `users.subscription_plan` for backward compat).

### Rollback Strategy

The migration is **additive only** — it creates new tables and adds columns. It does NOT modify or delete existing data.

**To rollback:**
1. Drop the new tables (if needed):
   ```sql
   DROP TABLE IF EXISTS webhook_events;
   DROP TABLE IF EXISTS user_capabilities;
   DROP TABLE IF EXISTS subscriptions;
   DROP TABLE IF EXISTS audit_log;
   DROP TABLE IF EXISTS feature_flags;
   ```
2. Drop the new columns (if needed):
   ```sql
   ALTER TABLE users DROP COLUMN capability_version;
   ALTER TABLE users DROP COLUMN last_capability_sync;
   ```
3. Remove `require_once __DIR__ . '/lib/capabilities.php';` from endpoint files (revert git changes).

**Important:** The capability enforcement code has fallback paths — if the new tables don't exist, it falls back to reading `users.subscription_plan` directly. So the enforcement code is safe to deploy BEFORE running the migration.

### Staging / Production Notes

1. **Deploy code first, migrate second.** The capability code has `try/catch` fallbacks for missing tables.
2. Run migration during low-traffic window (it's fast, but the backfill does reads+writes).
3. Migration is **idempotent** — safe to run multiple times.
4. After migration, verify with the SQL checks above.
5. Monitor error logs for any `"user_capabilities lookup failed"` messages (indicates table issues).

---

## 4. Verification Checklist

### Automated: curl Test Script

Save as `scripts/test-capability-enforcement.sh` and run after migration:

```bash
#!/bin/bash
# Test capability enforcement on API endpoints
# Requires: API running, at least one free user and one subscribed user

API_BASE="https://racingsystemsanalysis.com/api"
# Replace with actual tokens:
FREE_TOKEN="Bearer <free-user-jwt>"
BASIC_TOKEN="Bearer <basic-user-jwt>"
ADMIN_TOKEN="Bearer <admin-user-jwt>"

echo "=== Capability Enforcement Tests ==="

# 1. Free user: POST vehicle → should get 403
echo -n "1. Free user POST vehicle: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE/vehicles.php" \
  -H "Authorization: $FREE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","data":{}}')
[ "$STATUS" = "403" ] && echo "PASS (403)" || echo "FAIL ($STATUS)"

# 2. Basic user: POST vehicle → should get 201
echo -n "2. Basic user POST vehicle: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE/vehicles.php" \
  -H "Authorization: $BASIC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","data":{}}')
[ "$STATUS" = "201" ] && echo "PASS (201)" || echo "FAIL ($STATUS)"

# 3. Free user: GET runs → should get 403
echo -n "3. Free user GET runs: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_BASE/runs.php" \
  -H "Authorization: $FREE_TOKEN")
[ "$STATUS" = "403" ] && echo "PASS (403)" || echo "FAIL ($STATUS)"

# 4. Basic user: GET runs → should get 200
echo -n "4. Basic user GET runs: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_BASE/runs.php" \
  -H "Authorization: $BASIC_TOKEN")
[ "$STATUS" = "200" ] && echo "PASS (200)" || echo "FAIL ($STATUS)"

# 5. Unauthenticated: POST vehicle → should get 401
echo -n "5. Unauth POST vehicle: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE/vehicles.php" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","data":{}}')
[ "$STATUS" = "401" ] && echo "PASS (401)" || echo "FAIL ($STATUS)"

# 6. Non-admin: POST track → should get 403
echo -n "6. Non-admin POST track: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE/tracks.php" \
  -H "Authorization: $BASIC_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Track","city":"Test","state":"TX","lat":32.0,"lon":-97.0,"elevation_ft":500}')
[ "$STATUS" = "403" ] && echo "PASS (403)" || echo "FAIL ($STATUS)"

# 7. Admin: POST track → should get 201
echo -n "7. Admin POST track: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$API_BASE/tracks.php" \
  -H "Authorization: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Track","city":"Test","state":"TX","lat":32.0,"lon":-97.0,"elevation_ft":500}')
[ "$STATUS" = "201" ] && echo "PASS (201)" || echo "FAIL ($STATUS)"

# 8. GET tracks (public) → should get 200 with no auth
echo -n "8. Public GET tracks: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/tracks.php")
[ "$STATUS" = "200" ] && echo "PASS (200)" || echo "FAIL ($STATUS)"

# 9. GET capabilities endpoint → should get 200 with auth
echo -n "9. Auth GET capabilities: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_BASE/capabilities-endpoint.php" \
  -H "Authorization: $BASIC_TOKEN")
[ "$STATUS" = "200" ] && echo "PASS (200)" || echo "FAIL ($STATUS)"

# 10. Non-admin: GET users → should get 403
echo -n "10. Non-admin GET users: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_BASE/users.php" \
  -H "Authorization: $BASIC_TOKEN")
[ "$STATUS" = "403" ] && echo "PASS (403)" || echo "FAIL ($STATUS)"

echo "=== Done ==="
```

### Manual Verification Matrix

| Test | User Type | Endpoint | Expected | Verified? |
|---|---|---|---|---|
| Free user creates vehicle | free | POST /vehicles.php | 403 | ☐ |
| Free user reads public vehicle | free | GET /vehicles.php?id=xxx | 200 | ☐ |
| Basic user creates vehicle | basic | POST /vehicles.php | 201 | ☐ |
| Basic user saves run | basic | POST /runs.php | 201 | ☐ |
| Free user reads runs | free | GET /runs.php | 403 | ☐ |
| Non-admin creates track | basic | POST /tracks.php | 403 | ☐ |
| Admin creates track | admin | POST /tracks.php | 201 | ☐ |
| Non-admin deletes track | admin | DELETE /tracks.php | 403 | ☐ |
| Owner deletes track | owner | DELETE /tracks.php | 200 | ☐ |
| Non-admin lists users | basic | GET /users.php | 403 | ☐ |
| Admin lists users | admin | GET /users.php | 200 | ☐ |
| Public reads tracks | none | GET /tracks.php | 200 | ☐ |
| Public reads prices | none | GET /stripe.php?action=prices | 200 | ☐ |
| Duplicate webhook | Stripe | POST /stripe-webhook.php | 200 + duplicate:true | ☐ |

### What NOT to Break

These endpoints must remain accessible without capability checks:
- `auth.php` — all actions (login, register, me, update, preferences, sync-clerk-user)
- `tracks.php` GET — public track list
- `stripe.php?action=prices` — public pricing
- `stripe.php?action=create-checkout-session` — any authenticated user can start checkout
- `stripe.php?action=create-portal-session` — any authenticated user with a Stripe customer
- `stripe.php?action=subscription-status` — any authenticated user
- `capabilities-endpoint.php` — any authenticated user (returns their own caps)
