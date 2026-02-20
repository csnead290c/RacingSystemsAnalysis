# UI Responsive Audit

**Date:** 2025-02-20 (Sprint 1), updated 2025-02-20 (Sprint 2)  
**Scope:** Mobile/responsive usability, number formatting, nav simplification, module hiding

---

## Sprint 2 Changes (latest)

### Navigation Overhaul (`src/app/App.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Header cramped/messy at 768–1100px widths | **Fixed** | Split nav into primary (top bar) + secondary (hamburger menu) |
| "Quarter Pro" / "Engine Pro" too wide, wraps | **Fixed** | Changed to "Quarter" + tier pill ("Jr"/"Pro") |
| Too many nav items on desktop | **Fixed** | Desktop shows only: Home, Vehicles, Quarter, Engine + ☰ more |
| Secondary items (Calcs, History, About, etc.) | **Fixed** | Moved to hamburger dropdown menu |
| Hamburger breakpoint too low (768px) | **Fixed** | Raised to 900px; desktop always has ☰ "more" button |
| History/Team/Admin visible to all users | **Fixed** | Gated behind `isDevOrOwner` (owner/admin role or DEV mode) |

### Engine Dyno Curve Blank Box (`src/pages/EngineSimDashboard.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Dyno chart shows large empty container on first paint | **Fixed** | Root cause: `ResponsiveContainer height="100%"` with parent having no explicit height → resolves to 0px. Changed to `height={360}` (explicit pixels, matching other charts). |

### Predict Chart Controls (`src/shared/components/charts/DataLoggerChart.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| X-axis toggle buttons too large on mobile | **Fixed** | Reduced padding from 8px/20px to 5px/14px; further compact at ≤600px |
| Series pills overflow/crush on small screens | **Fixed** | Made pills smaller (0.65rem), added `whiteSpace: nowrap` + `flexShrink: 0` + `overflowX: auto` for horizontal scroll on mobile |
| Additional ≤600px responsive overrides | **Fixed** | Added CSS class-based overrides for `.dlc-xaxis-btn`, `.dlc-series-pill` |

### Home Page Module Hiding (`src/pages/Home.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Run History card visible to all users | **Fixed** | Gated behind `isDevOrOwner` |
| Race Day Dashboard card visible to all users | **Fixed** | Gated behind `isDevOrOwner` |

### Resolver Additions (`src/domain/ui/programDisplayNames.ts`)

| Addition | Purpose |
|----------|---------|
| `getQuarterTier(can)` | Returns `'Jr'` or `'Pro'` for nav tier pill |
| `getEngineTier(can)` | Returns `'Jr'` or `'Pro'` for nav tier pill |

---

## Sprint 1 Changes (prior)

### Home (`src/pages/Home.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Vehicle table shows raw floats (15+ decimals) | **Fixed** | Applied `formatHp`, `formatLb`, `formatIn` |
| Quick Actions grid responsive | OK | `auto-fit, minmax(200px, 1fr)` |

### Predict (`src/pages/Predict.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Timeslip + chart stack vertically on ≤900px | OK | Already implemented |
| Chart explicit heights on mobile (320/350/300px) | OK | iOS Safari workaround in place |
| Bottom row stacks on mobile | OK | Already implemented |
| DetailedParameters modal mobile-friendly | OK | `maxHeight: 90vh`, scrollable body |

### EngineSimDashboard (`src/pages/EngineSimDashboard.tsx`)

| Issue | Status | Fix |
|-------|--------|-----|
| Perf grid stays 4-col on small screens | **Fixed** | Added ≤640px → 2-col |
| Chart min-height on small screens | **Fixed** | 250px at ≤640px |
| Tab bar truncation | OK | `overflowX: auto` + `whiteSpace: nowrap` |

---

## Number Formatting

**Module:** `src/shared/format/formatNumber.ts`

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

---

## Module Visibility (current)

| Module | Nav | Home Card | Gate |
|--------|-----|-----------|------|
| Home | ✅ primary | — | always |
| Vehicles | ✅ primary | ✅ | `canAccessVehicles` |
| Quarter Jr/Pro | ✅ primary | ✅ | `canAccessEtSim` |
| Engine Jr/Pro | ✅ primary | — | logged in |
| Calculators | hamburger | ✅ | always |
| History | hamburger | dev/owner only | `canAccessRunLogging` + `isDevOrOwner` |
| Race Day | hidden | dev/owner only | `canAccessRaceTools` + `isDevOrOwner` |
| Team | hamburger | hidden | `teamManagement` + `isDevOrOwner` |
| Admin | hamburger | hidden | owner/admin role |
| Dev | hamburger | hidden | owner/admin or DEV mode |
| About | hamburger | — | always |

---

## Tests

- `src/shared/format/__tests__/formatNumber.test.ts` — 14 tests
- `src/shared/format/__tests__/navSimplification.test.ts` — 9 tests (teamManagement, isDevOrOwner, tier pills)
