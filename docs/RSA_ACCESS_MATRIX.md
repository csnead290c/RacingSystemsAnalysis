# RSA Access Matrix
## Explicit Entitlement Model

**Date:** March 16, 2026  
**Purpose:** Define clear access control for Free, Beta, and NHRA Parity users

---

## Access Model Overview

**Three-Tier System:**
- **Plan:** Subscription tier (free, basic, pro, team, nhra)
- **Role:** Account permissions (owner, admin, member, viewer)
- **Capabilities:** Feature access derived from plan + role

---

## Plan Definitions

### Free Plan
- **Signup:** Public, no payment required
- **Price:** $0
- **Access:** Limited demo/calculator access
- **Purpose:** Try before you buy

**Capabilities:**
- `vehicle.editor.basic` - Basic vehicle fields only
- `track.eighth`, `track.quarter` - Standard track lengths
- `weather.manual` - Manual weather entry
- `sim.basic` - Basic ET/MPH prediction
- `charts.basic` - Simple result charts

**Restrictions:**
- ❌ No vehicle/run saving
- ❌ No advanced simulation
- ❌ No optimizers
- ❌ No team features
- ❌ No NHRA access
- ❌ No admin tools

### Basic Plan (Jr)
- **Signup:** Public, $9.99/mo
- **Price:** $9.99/month
- **Access:** Essential bracket racing tools
- **Purpose:** Weekend racers

**Capabilities:**
- All Free capabilities, plus:
- `library.save.engine/clutch/fourLink` - Save components
- `sim.et`, `sim.raceTools` - Full ET sim + race tools
- `sim.runCompletion`, `sim.learning` - Advanced features
- `data.vehicles`, `data.runLog` - Save vehicles and runs
- `charts.basic` - Result charts

**Restrictions:**
- ❌ No advanced vehicle editor
- ❌ No optimizers
- ❌ No team features
- ❌ No NHRA access

### Pro Plan
- **Signup:** Public, $24.99/mo
- **Price:** $24.99/month
- **Access:** Full simulation suite
- **Purpose:** Serious competitors

**Capabilities:**
- All Basic capabilities, plus:
- `vehicle.editor.pro`, `vehicle.throttleStop` - Advanced vehicle fields
- `library.install.*` - Install components into vehicles
- `track.thousand`, `track.bonneville`, `track.custom` - All tracks
- `weather.live`, `weather.history` - Live/historical weather
- `sim.advanced` - Full incremental simulation
- `engine.proMode` - Engine sim advanced mode
- `optimizer.*` - All optimizers
- `charts.advanced` - Detailed analysis charts
- `data.export`, `data.import` - Import/export data

**Restrictions:**
- ❌ No team features
- ❌ No NHRA access (unless separately granted)

### Team Plan
- **Signup:** Public, $49.99/mo
- **Price:** $49.99/month
- **Access:** Pro features for entire team
- **Purpose:** Race teams

**Capabilities:**
- All Pro capabilities, plus:
- `team.enabled` - Team features active
- `team.library.share` - Share library assets
- `team.vehicles.share` - Share vehicles
- `team.runs.share` - Share run history

**Restrictions:**
- ❌ No NHRA access (unless separately granted)

### NHRA Plan
- **Signup:** Invite-only, no public signup
- **Price:** Assigned (not billed)
- **Access:** NHRA parity data and Tech Master
- **Purpose:** NHRA officials and authorized personnel

**Capabilities:**
- `nhra.parity` - View parity dashboards
- `nhra.tech.read` - View Tech Master data
- `nhra.tech.admin` - Manage Tech Master data
- `sim.basic` - Basic simulation (for context)
- `charts.basic` - Basic charts
- `weather.manual` - Manual weather
- `incidents.read`, `incidents.create`, `incidents.edit.own` - Incident management

**Restrictions:**
- ❌ No general product access (Quarter Jr/Pro, Engine Pro, etc.)
- ❌ No team features
- ❌ No optimizers
- ❌ No advanced simulation
- ⚠️ NHRA users get ONLY parity/tech access, not full app access

---

## Role Definitions

### Viewer
- **Permissions:** Read-only access to shared data
- **Can Manage Users:** No
- **Can Manage Roles:** No
- **Can Manage Billing:** No
- **Additional Capabilities:** None (plan determines access)

### Member
- **Permissions:** Full access to plan features
- **Can Manage Users:** No
- **Can Manage Roles:** No
- **Can Manage Billing:** No
- **Additional Capabilities:** None (plan determines access)

### Admin
- **Permissions:** Manage users + full plan access
- **Can Manage Users:** Yes (within account)
- **Can Manage Roles:** No
- **Can Manage Billing:** No
- **Additional Capabilities:**
  - `admin.access` - Admin portal access
  - `admin.devTools` - Developer tools
  - `admin.userManagement` - User management
  - Full NHRA access (parity + tech master)
  - Full incident management

### Owner
- **Permissions:** Full control of account
- **Can Manage Users:** Yes
- **Can Manage Roles:** Yes
- **Can Manage Billing:** Yes
- **Additional Capabilities:**
  - All admin capabilities
  - Full access to all features regardless of plan
  - `fullAccess` flag = true

---

## Access Matrix

| Plan | Role | Products | Simulation | Optimizers | Team | NHRA | Admin |
|------|------|----------|------------|------------|------|------|-------|
| **Free** | viewer | ❌ | Basic only | ❌ | ❌ | ❌ | ❌ |
| **Free** | member | ❌ | Basic only | ❌ | ❌ | ❌ | ❌ |
| **Basic** | member | Quarter Jr | Full ET sim | ❌ | ❌ | ❌ | ❌ |
| **Pro** | member | All products | Advanced | ✅ All | ❌ | ❌ | ❌ |
| **Team** | member | All products | Advanced | ✅ All | ✅ | ❌ | ❌ |
| **Team** | admin | All products | Advanced | ✅ All | ✅ | ✅ | ✅ Users |
| **Team** | owner | All products | Advanced | ✅ All | ✅ | ✅ | ✅ Full |
| **NHRA** | member | ❌ | Basic only | ❌ | ❌ | ✅ Read | ❌ |
| **NHRA** | admin | ❌ | Basic only | ❌ | ❌ | ✅ Admin | ✅ Users |
| **Any** | owner | ✅ All | ✅ All | ✅ All | ✅ | ✅ Full | ✅ Full |

---

## Registration Paths

### 1. Standard Public Signup
- **URL:** `/register`
- **Access:** Anyone
- **Result:** `plan='free'`, `role='user'` → `roleId='viewer'`
- **Tier:** Free
- **Can Upgrade:** Yes, to Basic/Pro/Team

### 2. NHRA Parity Invite Signup
- **URL:** `/register?invite=nhra_XXXXX`
- **Access:** Invite code required
- **Result:** `plan='nhra'`, `role='user'` → `roleId='member'`
- **Tier:** NHRA (parity-only)
- **Can Upgrade:** No (NHRA is separate from paid plans)
- **Can Get Both:** Yes, admin can grant NHRA + Pro separately

### 3. Admin-Created Users
- **URL:** Admin portal → Create User
- **Access:** Requires `admin.userManagement` capability
- **Result:** Admin specifies plan + role
- **Tier:** Any
- **Use Case:** Team member invites, special access grants

---

## NHRA Parity Access Details

### What NHRA Users CAN Access
- ✅ Parity Portal (view parity data)
- ✅ Tech Master (view/manage tech inspection data)
- ✅ Incident Analyzer (create/view incidents)
- ✅ Basic simulation (for context/validation)
- ✅ Basic charts (for data visualization)
- ✅ Manual weather entry

### What NHRA Users CANNOT Access
- ❌ Quarter Jr/Pro (drag racing simulation products)
- ❌ Engine Pro (engine simulation)
- ❌ Bonneville Pro (land speed simulation)
- ❌ Four Link (suspension analysis)
- ❌ Cam Analyzer (camshaft analysis)
- ❌ Optimizers (gear, launch, throttle stop)
- ❌ Advanced simulation features
- ❌ Team features (unless also on Team plan)
- ❌ Vehicle/run saving (unless also on Basic+ plan)

### Dual Access Scenario
A user can have BOTH NHRA access AND a paid plan:
- **Example:** NHRA official who also races
- **Setup:** `plan='pro'` + admin grants NHRA capabilities
- **Result:** Full Pro access + NHRA parity access
- **Implementation:** Admin adds `'nhra'` to user's products array

---

## Capability Resolution

### Resolution Order
1. **Full Access Override:** If `role='owner'` → all capabilities granted
2. **Trial Overlay:** If active trial → grant trial plan's capabilities
3. **Plan Capabilities:** Grant capabilities from user's plan
4. **Role Capabilities:** Add role-specific capabilities (admin tools)

### Example: NHRA Member
```typescript
{
  plan: 'nhra',
  role: 'member',
  fullAccess: false,
  trial: { active: false }
}

Capabilities granted:
- nhra.parity (from plan)
- nhra.tech.read (from plan)
- nhra.tech.admin (from plan)
- sim.basic (from plan)
- charts.basic (from plan)
- weather.manual (from plan)
- incidents.* (from plan)
```

### Example: Pro Member
```typescript
{
  plan: 'pro',
  role: 'member',
  fullAccess: false
}

Capabilities granted:
- All vehicle editor capabilities
- All track types
- All weather capabilities
- All simulation capabilities
- All optimizer capabilities
- All data/chart capabilities
- NO admin capabilities
- NO NHRA capabilities
```

### Example: NHRA Admin
```typescript
{
  plan: 'nhra',
  role: 'admin',
  fullAccess: false
}

Capabilities granted:
- All NHRA plan capabilities (from plan)
- admin.access (from role)
- admin.devTools (from role)
- admin.userManagement (from role)
- Full NHRA parity/tech access (from role)
- Full incident management (from role)
```

---

## Migration Strategy

### Existing Users
- **No immediate changes:** Existing users keep current access
- **Gradual migration:** Add plan column, backfill based on current role/products
- **Preserve behavior:** Old role-based access still works

### New Users
- **Explicit plan assignment:** All new users get plan='free' by default
- **Clear role assignment:** New users get role='user' → roleId='viewer'
- **Invite codes:** NHRA users get plan='nhra' via invite

### Backfill Plan
```sql
-- Add plan column
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';

-- Backfill existing users
UPDATE users SET plan = 'free' WHERE role = 'user' AND (products = '[]' OR products IS NULL);
UPDATE users SET plan = 'basic' WHERE products LIKE '%quarter_jr%' AND products NOT LIKE '%quarter_pro%';
UPDATE users SET plan = 'pro' WHERE products LIKE '%quarter_pro%' OR products LIKE '%bonneville_pro%';
UPDATE users SET plan = 'team' WHERE products LIKE '%team%';
UPDATE users SET plan = 'nhra' WHERE products LIKE '%nhra%';
-- Owner/admin don't need plan (fullAccess=true)
```

---

## Invite Code System

### NHRA Invite Codes

**Structure:**
- Format: `nhra_XXXXXXXXXXXXXXXX` (20 chars total)
- Storage: `invite_codes` table
- Fields: code, plan, max_uses, uses_count, expires_at, created_by, created_at

**Validation:**
1. Check code exists
2. Check not expired
3. Check uses < max_uses
4. Increment uses_count
5. Create user with plan='nhra'

**Security:**
- One-time use by default (max_uses=1)
- Expiration date required
- Admin audit trail
- Cannot be guessed (cryptographically random)

**Admin Interface:**
- Generate new NHRA invite code
- Set expiration (default 30 days)
- Set max uses (default 1)
- View active codes
- Revoke codes

---

## Testing Matrix

### Test Scenarios

1. **Free User Signup**
   - Register via /register
   - Verify plan='free', role='viewer'
   - Verify can access basic sim only
   - Verify cannot access paid features

2. **NHRA Invite Signup**
   - Register via /register?invite=nhra_XXX
   - Verify plan='nhra', role='member'
   - Verify can access parity/tech
   - Verify cannot access general products

3. **Invalid Invite**
   - Register with invalid/expired code
   - Verify error message
   - Verify user not created

4. **NHRA + Pro User**
   - Create NHRA user
   - Admin grants Pro plan
   - Verify has both NHRA and Pro access

5. **Role Escalation**
   - Create Free user
   - Admin changes role to admin
   - Verify gets admin tools
   - Verify still has Free plan features only

---

## Summary

**Clear Model:**
- Plan determines product/feature access
- Role determines permissions
- NHRA is a separate plan, not an add-on to Beta/Pro
- Owner/Admin roles get full access regardless of plan

**NHRA Specifics:**
- Invite-only signup
- Parity + Tech Master access only
- No general product access
- Can be combined with paid plans if needed

**Implementation:**
- Add plan column to database
- Create invite code system
- Update registration flow
- Enforce plan-based access checks

---

**Status:** ACCESS MATRIX COMPLETE  
**Next:** Implement plan column and NHRA registration system
