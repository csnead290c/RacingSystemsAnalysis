# UI Responsive Audit

**Date:** 2025-02-20  
**Scope:** Mobile/responsive usability, number formatting, nav simplification

---

## Pages Audited

### Home (`src/pages/Home.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Vehicle table shows raw floats (15+ decimals for power, tire dia) | **Fixed** | Applied `formatHp`, `formatLb`, `formatIn` from `shared/format/formatNumber.ts` |
| Quick Actions grid wraps cleanly on mobile via `auto-fit, minmax(200px, 1fr)` | OK | No change needed |
| Team nav link visible to all logged-in users (dead link for non-team tiers) | **Fixed** | Gated behind `features.teamManagement` |

### Predict / Quarter / Bonneville (`src/pages/Predict.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Timeslip + chart stack vertically on ≤900px | OK | Already implemented (`flex-direction: column`) |
| Chart has explicit heights on mobile (320px/350px/300px) | OK | Already implemented with iOS Safari workaround |
| Bottom row (env, what-if) stacks on mobile | OK | Already implemented |
| RPM histogram hidden on ≤600px to save space | OK | Already implemented |
| Very small phones (≤400px) get smaller chart + timeslip | OK | Already implemented |
| DetailedParameters modal: scrollable body, fixed header, focus trap | OK | Already implemented (`maxHeight: 90vh`) |

### EngineSimDashboard (`src/pages/EngineSimDashboard.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Input grids collapse to 1-col at ≤1024px | OK | Already implemented |
| Perf grid stays 4-col on small screens | **Fixed** | Added `@media (max-width: 640px)` → 2-col |
| Chart min-height on very small screens | **Fixed** | Added 250px min-height at ≤640px |
| Tab bar truncation ("F", "M", etc.) | OK | Already has `overflowX: auto` + `whiteSpace: nowrap` + `flexShrink: 0` |
| File toolbar (New/Open/Save/Import/Export) | OK | Already has `flexWrap: wrap` |
| Detail row (chart + table) stacks at ≤1024px | OK | Already implemented |

### Navigation (`src/app/App.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| "Quarter Pro" / "Engine Pro" wraps to 2 lines on medium screens | **Fixed** | Added `whiteSpace: 'nowrap'` to `navLinkStyle` |
| Nav container `flexWrap: wrap` causes multi-line nav | **Fixed** | Changed to `overflow: hidden` (hamburger handles mobile) |
| Hamburger menu for ≤768px | OK | Already implemented |
| Team link visible to non-team users | **Fixed** | Gated behind `features.teamManagement` in both nav and UserMenu dropdown |

---

## Number Formatting

**New module:** `src/shared/format/formatNumber.ts`

| Helper | Output | Example |
|--------|--------|---------|
| `formatFixed(x, n)` | Fixed decimals | `formatFixed(123.456, 2)` → `"123.46"` |
| `formatHp(x)` | Whole or 1 decimal | `formatHp(461.3)` → `"461.3"` |
| `formatLb(x)` | Whole number | `formatLb(2350.7)` → `"2351"` |
| `formatIn(x)` | 1 decimal | `formatIn(32.812...)` → `"32.8"` |
| `formatRpm(x)` | Whole number | `formatRpm(6500)` → `"6500"` |
| `formatRatio(x)` | 2 decimals | `formatRatio(3.55)` → `"3.55"` |
| `formatET(x)` | 2 decimals | `formatET(9.856)` → `"9.86"` |
| `formatMph(x)` | 1 decimal | `formatMph(138.4)` → `"138.4"` |

All helpers return `"—"` for `NaN`, `null`, `undefined`, `Infinity`.

**Applied to:** Home vehicle table (`weightLb`, `powerHP`, `tireDiaIn`).

---

## Module Visibility

| Module | Visibility | Gate |
|--------|-----------|------|
| Team Hub | team + owner tiers only | `features.teamManagement` |
| History | basic+ (run logging) | `canAccessRunLogging()` — functional, kept visible |
| Race Day | basic+ (race tools) | `canAccessRaceTools()` — functional, kept visible |

---

## Tests Added

- `src/shared/format/__tests__/formatNumber.test.ts` — 14 tests for all formatting helpers
- `src/shared/format/__tests__/navSimplification.test.ts` — 3 tests verifying Team entitlement gating
