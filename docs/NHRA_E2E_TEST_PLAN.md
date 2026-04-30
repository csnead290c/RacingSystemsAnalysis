# NHRA Tech Master E2E Test Plan
## Playwright-Based Browser Validation

**Date:** 2024-01-XX  
**Purpose:** Enable self-run E2E validation for Tech Master batches  

---

## 1. Current Testing Infrastructure Audit

### Existing Test Setup
- **Unit/Integration Tests:** Vitest (1846+ tests passing)
- **Test Libraries:** @testing-library/react, @testing-library/dom, jsdom
- **E2E Framework:** ❌ NONE (Playwright not installed)
- **Test Scripts:** `npm test` (Vitest), `npm run test:integration`

### Authentication System
- **Type:** localStorage-based with default test users
- **Storage Key:** `rsa.auth.currentUser`
- **Default Test Users:**
  - `owner@rsa.local` / password: `owner` (role: owner)
  - `admin@rsa.local` / password: `admin` (role: admin)
  - `beta@rsa.local` / password: `beta` (role: beta_tester)
- **Login Flow:** Simple hash-based auth (dev/test mode)

### Tech Master Access
- **Route:** `/tech` (TechMasterShell component)
- **Auth Required:** Yes (ProtectedRoute)
- **Capabilities Required:** `tech_master.read` (minimum)
- **Admin Actions:** `tech_master.admin` (for placing/clearing holds)

### Test Data Strategy
- **Database:** SQLite (api/rsa.db)
- **Seed Data:** Not currently automated
- **Safe Approach:** Tests will select first available event/entry or skip if none exist
- **Hold Testing:** Will create/clear holds as part of test (cleanup after)

---

## 2. Playwright Setup Plan

### Installation
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Configuration (`playwright.config.ts`)
- **Base URL:** `http://localhost:5173` (Vite dev server)
- **Browsers:** Chromium only (sufficient for validation)
- **Timeouts:** 30s default, 60s for navigation
- **Retries:** 2 on CI, 0 locally
- **Screenshots:** On failure
- **Trace:** On first retry
- **Test Directory:** `e2e/`

### Test Scripts (package.json)
```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:tech": "playwright test e2e/tech-master"
}
```

---

## 3. Test Authentication Strategy

### Approach: Direct localStorage Injection
Since the app uses localStorage for auth, tests will:
1. Navigate to app
2. Inject auth state into localStorage
3. Reload to activate session
4. Navigate to Tech Master

### Auth Helper (`e2e/helpers/auth.ts`)
```typescript
export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    const user = {
      id: 'admin_001',
      email: 'admin@rsa.local',
      displayName: 'Administrator',
      roleId: 'admin',
      status: 'active'
    };
    localStorage.setItem('rsa.auth.currentUser', JSON.stringify(user));
  });
  await page.reload();
}
```

---

## 4. Test Data Strategy

### Event/Entry Selection
Tests will use **first available** event and entry:
- Query for events via UI (select first from dropdown)
- Query for entries in that event (select first from list)
- If no events/entries exist, test will skip gracefully

### Hold Management
- Tests will place holds during validation
- Tests will clear holds after validation
- Each test run is self-contained (create → validate → cleanup)

### Stable Selectors
Use data-testid attributes where needed:
- `data-testid="tech-event-select"`
- `data-testid="tech-entry-list"`
- `data-testid="hold-placement-modal"`
- etc.

---

## 5. Batch 12 E2E Coverage

### Test File: `e2e/tech-master/batch-12-holds.spec.ts`

**Test Suite: Hold/Escalation Workflows**

1. **Setup & Navigation**
   - Login as admin
   - Navigate to Tech Master
   - Select first available event
   - Verify entries load

2. **Hold Placement Workflow**
   - Open entry dossier for first entry
   - Click "Place Hold" button
   - Select hold type (compliance_hold)
   - Enter reason (min 10 chars)
   - Add optional notes
   - Submit hold
   - Verify success

3. **Hold Badge Verification**
   - Return to entry list
   - Verify hold badge appears on entry
   - Verify badge shows correct type (COMP)
   - Verify tooltip shows reason

4. **Dossier Hold Display**
   - Open entry dossier again
   - Verify hold appears in header badges
   - Verify hold appears in history section
   - Verify hold shows as ACTIVE

5. **Compliance Dashboard Verification**
   - Navigate to compliance dashboard
   - Select same event
   - Verify held entry shows hold badge
   - Verify badge matches entry list

6. **Hold Filtering**
   - Return to entry list
   - Filter to "With active holds"
   - Verify only held entries shown
   - Filter to "No holds"
   - Verify held entry NOT shown
   - Filter to "All entries"
   - Verify all entries shown

7. **Hold Clearance Workflow**
   - Open entry dossier
   - Click "Clear Hold" on active hold
   - Add optional clearance notes
   - Submit clearance
   - Verify success

8. **Post-Clearance Verification**
   - Verify hold badge removed from entry list
   - Verify hold badge removed from compliance dashboard
   - Verify hold shows as CLEARED in dossier history
   - Verify hold history preserved

9. **Additional Hold Type**
   - Place tech_hold on same or different entry
   - Verify badge shows TECH
   - Clear hold
   - Verify cleanup

10. **Regression Checks**
    - Verify entry list still loads
    - Verify dossier still loads
    - Verify compliance dashboard still loads
    - Verify no console errors

---

## 6. Helper Utilities

### Navigation Helpers (`e2e/helpers/tech-master.ts`)
```typescript
export async function navigateToTechMaster(page: Page)
export async function selectFirstEvent(page: Page): Promise<string>
export async function openFirstEntryDossier(page: Page): Promise<number>
export async function waitForDataLoad(page: Page)
```

### Hold Helpers (`e2e/helpers/holds.ts`)
```typescript
export async function placeHold(page: Page, type: string, reason: string, notes?: string)
export async function clearHold(page: Page, notes?: string)
export async function verifyHoldBadge(page: Page, entryId: number, expectedType: string)
```

---

## 7. Execution Plan

### Phase 1: Setup (15 min)
1. Install Playwright
2. Create config file
3. Create helper utilities
4. Add test scripts to package.json

### Phase 2: Write Tests (30 min)
1. Create batch-12-holds.spec.ts
2. Implement all 10 test scenarios
3. Add proper assertions and waits

### Phase 3: Run & Fix (30 min)
1. Run tests against dev server
2. Fix any failures in product code or tests
3. Verify all tests pass
4. Document results

### Phase 4: Document (15 min)
1. Update Batch 12 closeout report
2. Document E2E validation standard
3. Provide recommendations

**Total Estimated Time:** 90 minutes

---

## 8. Success Criteria

Tests pass when:
- ✅ All 10 test scenarios execute without errors
- ✅ Hold placement workflow completes successfully
- ✅ Hold clearance workflow completes successfully
- ✅ Badges render correctly in all views
- ✅ Filtering works as expected
- ✅ No regressions detected
- ✅ No console errors during test run

---

## 9. Future E2E Standard

### For All Future Tech Master Batches
1. **Build must pass** (`npm run build`)
2. **Unit tests must pass** (`npm test`)
3. **E2E tests must pass** (`npm run test:e2e:tech`)
4. **New features must have E2E coverage** (add to existing or new spec files)
5. **No user QA required** for core workflows

### E2E Test Organization
```
e2e/
  helpers/
    auth.ts
    tech-master.ts
    holds.ts
  tech-master/
    batch-12-holds.spec.ts
    entry-management.spec.ts (future)
    compliance-dashboard.spec.ts (future)
```

---

## 10. Known Limitations

### What E2E Tests Can Validate
- ✅ User workflows end-to-end
- ✅ UI rendering and interactions
- ✅ API integration in browser context
- ✅ Navigation and routing
- ✅ Form validation and submission

### What E2E Tests Cannot Validate
- ❌ Visual design quality (requires human review)
- ❌ Accessibility compliance (requires specialized tools)
- ❌ Performance under load (requires load testing)
- ❌ Cross-browser compatibility (only testing Chromium)
- ❌ Mobile responsiveness (not in scope)

---

**Next Action:** Install Playwright and begin implementation
