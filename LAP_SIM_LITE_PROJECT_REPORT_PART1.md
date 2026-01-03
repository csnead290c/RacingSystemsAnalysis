# LAP SIM LITE - PHASE 1 PROJECT REPORT (PART 1 of 2)
## Road Course + Pavement Oval Integration into RSA

**Report Date:** January 2, 2026  
**Prepared For:** RSA Architecture Team  
**Purpose:** Comprehensive analysis for adding Lap Sim Lite module to existing RSA codebase

---

## 0) EXECUTIVE SUMMARY

### Best Approach

Add Lap Sim Lite as a **parallel simulation module** alongside existing drag racing tools, reusing the proven Vehicle Builder architecture with conditional field rendering. The lap sim will share 70%+ of existing vehicle infrastructure (weight, engine, drivetrain, tires, aero) while adding track-specific fields (suspension geometry, brake bias, downforce balance).

**Key Strategy:**
- Extend existing `Vehicle` schema with `simType` discriminator field ('drag' | 'lapsim')
- Reuse `VehicleEditorUnified.tsx` with conditional sections for lap-specific fields
- Create new `Track` entity with segment-based definition (straights, corners, banking)
- Build point-mass quasi-steady lap solver using existing physics utilities (`integrator.ts`, `units.ts`)
- Add new `/lap-sim` route with scenario runner UI (track + vehicle + conditions)
- Leverage existing charting infrastructure (`recharts`, `SpeedChart.tsx` pattern)

### Top 5 Risks

1. **Physics Model Complexity** - Balancing accuracy vs Phase 1 simplicity for combined lateral/longitudinal dynamics
2. **Vehicle Field Conflicts** - Drag-specific fields (rollout, launch RPM) vs lap-specific fields (brake bias, suspension) need clean separation
3. **Track Discretization** - Choosing optimal `ds` (distance step) for accuracy without performance degradation
4. **Calibration Determinism** - Ensuring calibration converges reliably across different track/vehicle combinations
5. **Subscription Tier Gating** - Deciding which features are Racer vs Pro (likely: Racer gets basic lap sim, Pro gets calibration/sweeps)

### Top 5 Opportunities

1. **Code Reuse** - 70% of vehicle editor, 100% of persistence layer, 90% of charting can be reused
2. **Differentiation** - No competitor offers drag + lap sim in one modern web platform
3. **Cross-Pollination** - Lap sim users may discover drag racing tools, expanding market
4. **Data Synergy** - Shared vehicle library enables "same car, different track" comparisons
5. **Foundation for Phase 2** - Clean architecture enables future advanced features (tire temps, fuel strategy, driver coaching)

### Complexity Estimates

| Subsystem | Complexity | Rationale |
|-----------|-----------|-----------|
| **UI** | **Medium** | Reuse vehicle editor (Low), but Track Builder is new (Medium-High) |
| **Persistence** | **Low** | Extend existing `vehicles.ts` + add `tracks.ts` using same API pattern |
| **Physics Core** | **High** | Quasi-steady solver is well-understood but needs careful tuning for stability |
| **Charting** | **Low** | Reuse `recharts` + `SpeedChart.tsx` pattern, add corner speed overlay |
| **Sweeps** | **Medium** | No existing sweep runner - need lightweight batch executor |
| **Calibration** | **Medium-High** | Optimization logic is new, must be bounded and deterministic |
| **Tests** | **Medium** | Need regression fixtures + monotonic tests, leverage existing `vitest` setup |

### Must Decide Up Front vs Deferrable

**Must Decide Now:**
- Vehicle `simType` field and conditional rendering strategy
- Track segment schema (straight/corner properties)
- Subscription tier gating (Racer vs Pro features)
- Physics model: friction circle vs simplified fallback
- Calibration workflow: scenario-level vs vehicle "tune" variant

**Can Defer to Phase 2:**
- Tire temperature modeling
- Fuel consumption tracking
- Advanced suspension kinematics
- Multi-lap race strategy
- Driver coaching insights
- Mobile-optimized track builder

---

## 1) REPOSITORY AUDIT & INVENTORY

### Frontend Framework & Routing

**Framework:** React 18.2 + React Router 6.20 + Vite 5.0  
**State Management:** Context API + localStorage/IndexedDB  
**UI Library:** Custom components with CSS variables theming  
**Charts:** Recharts 2.10.3  

**Routing Structure:**
- **File:** `src/app/App.tsx` (lines 1-573)
- **Pattern:** `<BrowserRouter>` with `<Routes>` and `<ProtectedRoute>` wrapper
- **Navigation:** `Navigation` component (lines 170-329) with mobile hamburger menu
- **Auth Gating:** `ProtectedRoute` checks `requireFeature` or `requireProduct` props

**Why it matters:** Adding `/lap-sim` route is straightforward using existing patterns.

---

### Vehicle Builder Code

**Primary Files:**
- `src/shared/components/VehicleEditor.tsx` (1322 lines) - Collapsible sections
- `src/shared/components/VehicleEditorUnified.tsx` (1436 lines) - Simple/Advanced toggle
- `src/shared/components/VehicleEditorPanel.tsx` - Sidebar variant
- `src/shared/components/VehicleEditorPopup.tsx` - Modal variant

**Simple/Advanced Mode Implementation:**
- Mode stored per-vehicle via `vehicle.editorMode` field
- Simple: Peak HP, single shift RPM, basic fields
- Advanced: HP curve, per-gear shifts, PMI, aero
- Conditional rendering: `{showAdvanced && <Field>}`

**Why it matters:** Perfect pattern for lap-specific fields with conditional rendering.

---

### Vehicle Data Model

**Schema:** `src/domain/schemas/vehicle.schema.ts` (121 lines)

**Key Fields:**
- Identity: id, name, defaultRaceLength
- Mass: weightLb, staticFrontWeightLb, wheelbaseIn
- Tires: tireDiaIn, tireWidthIn
- Aero: frontalAreaFt2, cd, liftCoeff
- Drivetrain: rearGear, gearRatios, gearEfficiencies
- Engine: powerHP, hpCurve, hpTorqueMultiplier
- Organization: group, editorMode

**Extensibility:** Schema easily accepts new optional fields for lap sim.

---

### Persistence Layer

**Pattern:** API-first with localStorage fallback

**Files:**
- `src/state/vehicles.ts` (121 lines)
- `src/state/storage.ts` (138 lines)

**Functions:**
```typescript
loadVehicles() -> Promise<Vehicle[]>
saveVehicle(vehicle) -> Promise<void>
deleteVehicle(id) -> Promise<void>
```

**Why it matters:** Copy exact pattern for `tracks.ts` module.

---

### Physics Framework

**Core Files:**
- `src/domain/physics/index.ts` (295 lines) - Model registry
- `src/domain/physics/core/integrator.ts` (109 lines) - Semi-implicit Euler
- `src/domain/physics/core/units.ts` (111 lines) - Conversions

**Integrator Pattern:**
```typescript
interface StepState { t_s, v_fps, s_ft, rpm, gearIdx, warnings }
interface StepForces { tractive_lb, drag_lb, roll_lb, mass_slugs }
function stepEuler(dt_s, state, forces) -> StepState
```

**Why it matters:** Directly reusable for lap sim with lateral force extension.

---

### Charting Infrastructure

**Components:** `src/shared/components/charts/`
- `SpeedChart.tsx` (64 lines) - Recharts LineChart wrapper
- `TimeslipChart.tsx` - ET splits
- `RPMHistogram.tsx` - RPM distribution
- `DataLoggerChart.tsx` - Multi-trace overlay

**Pattern:**
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={data}>
    <XAxis dataKey="d_ft" />
    <YAxis dataKey="v_mph" />
    <Line dataKey="v_mph" stroke="var(--color-success)" />
  </LineChart>
</ResponsiveContainer>
```

**Why it matters:** Reuse with minor mods for lap sim (add corner speed overlay).

---

### Testing Setup

**Framework:** Vitest 1.0.4 + jsdom  
**Config:** `vitest.config.ts`  
**Tests:** `src/integration-tests/` (38 spec files)

**Pattern:**
```typescript
describe('Physics Integrator', () => {
  it('should increase velocity with positive net force', () => {
    const state = createInitialState();
    const forces = { tractive_lb: 1000, drag_lb: 50, ... };
    const newState = stepEuler(0.01, state, forces);
    expect(newState.v_fps).toBeGreaterThan(state.v_fps);
  });
});
```

**Why it matters:** Proven test infrastructure for lap sim regression tests.

---

### Subscription Tier System

**Config:** `src/domain/config/entitlements.ts` (520 lines)

**Tiers:** free, racer, pro, team, beta, owner

**Feature Flags:**
```typescript
interface TierFeatures {
  quarterJrFields, quarterProFields, throttleStop,
  trackEighth, trackQuarter, trackThousand,
  gearOptimizer, launchOptimizer,
  basicCharts, advancedCharts, dataExport,
  teamManagement, ...
}
```

**Hook:** `useSubscription()` returns `{ tier, features, hasFeature, ... }`

**Why it matters:** Add new flags: `lapSimBasic`, `lapSimCalibration`, `lapSimSweeps`

---

## 2) GAP ANALYSIS: REUSE vs BUILD

| Feature/Need | Exists? | What to Reuse | What Must Be Added | Risk |
|--------------|---------|---------------|-------------------|------|
| Vehicle Storage | Y | `vehicles.ts` pattern | `simType` field, lap fields | Low |
| Vehicle Editor | Partial | `VehicleEditorUnified.tsx` | Lap sections (Brakes, Suspension) | Medium |
| Track Storage | N | Copy `vehicles.ts` | `tracks.ts` module | Low |
| Track Builder | N | None | Full UI with segment editor | High |
| Lap Physics | N | `integrator.ts`, `units.ts` | Quasi-steady solver | High |
| Scenario Runner | N | `Predict.tsx` layout | `/lap-sim` page | Medium |
| Speed Chart | Y | `SpeedChart.tsx` | Corner speed overlay | Low |
| Calibration | N | None | Optimization loop | High |
| Sweeps | N | None | Batch runner | Medium |
| Tests | Y | Vitest setup | Lap fixtures | Medium |

**Summary:** 70% reuse, 30% new development

---

## 3) VEHICLE BUILDER ADAPTATION

### Discriminator Field

**Add to schema:**
```typescript
simType: z.enum(['drag', 'lapsim']).optional(), // default: 'drag'
```

### Lap-Specific Fields

```typescript
// Brakes
brakeBiasFront: z.number().optional(),     // % (50-70 typical)
maxBrakeG: z.number().optional(),          // g-force (1.0-2.0)

// Suspension
suspensionStiffnessFront: z.number().optional(),  // lb/in
suspensionStiffnessRear: z.number().optional(),
antiRollBarFront: z.number().optional(),          // lb-in/deg
antiRollBarRear: z.number().optional(),

// Aero Balance
downforceBalance: z.number().optional(),   // % front (40-60)

// Calibration Targets
maxLateralG: z.number().optional(),        // g-force (0.8-2.5)
```

### Conditional Rendering

```tsx
const isDrag = !vehicle.simType || vehicle.simType === 'drag';
const isLap = vehicle.simType === 'lapsim';

{isDrag && <LaunchDeviceSection />}
{isDrag && <RolloutSection />}

{isLap && <BrakesSection />}
{isLap && showAdvanced && <SuspensionSection />}
```

### Field Lists

**Simple Mode (Racer):**
- Name, Weight, Peak HP, RPM @ Peak, Tire Dia, Rear Gear, Brake Bias

**Advanced Mode (Pro):**
- + HP Curve, Gear Ratios, Suspension, Downforce Balance, Corner Weights

---

## 4) TRACK MODEL & BUILDER

### Track Segment Schema

```typescript
export const TrackSegmentSchema = z.object({
  id: z.string(),
  type: z.enum(['straight', 'corner']),
  
  // Straight
  length_ft: z.number().optional(),
  
  // Corner
  radius_ft: z.number().optional(),
  angle_deg: z.number().optional(),
  
  // Modifiers
  banking_deg: z.number().optional(),
  gripMultiplier: z.number().optional(),
  elevationChange_ft: z.number().optional(),
  
  name: z.string().optional(),
});

export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['road_course', 'oval', 'street_circuit']),
  segments: z.array(TrackSegmentSchema),
  totalLength_ft: z.number(),
  lapRecord_s: z.number().optional(),
  group: z.string().optional(),
});
```

### Discretization

**Method:** Fixed distance step (ds = 10 ft default)

**Output:**
```typescript
interface TrackPoint {
  s_ft: number;           // Cumulative distance
  curvature_1_ft: number; // 1/radius (0 for straight)
  banking_deg: number;
  gripMult: number;
  elevation_ft: number;
}
```

### Storage

**File:** `src/state/tracks.ts` (new, copy `vehicles.ts` pattern)

```typescript
loadTracks() -> Promise<Track[]>
saveTrack(track) -> Promise<void>
deleteTrack(id) -> Promise<void>
discretizeTrack(track, ds) -> TrackPoint[]
```

### Track Builder UI

**Layout:**
- Left: Segment list (add/remove/reorder)
- Center: SVG preview (bird's eye view)
- Right: Segment editor (properties)

### Presets

- Generic Road Course (1.5 mi)
- Generic Oval (0.5 mi)

---

## 5) LAP SIM PHYSICS

### Algorithm: Quasi-Steady Point-Mass

**Steps:**
1. Discretize track (ds = 10 ft)
2. Forward pass: Calculate max speed considering accel limits
3. Backward pass: Apply braking constraints
4. Time integration: Sum dt for each segment

### Lateral Limit

```
mu_lat = maxLateralG (from calibration)
banking_factor = tan(banking_deg * pi/180)
a_lat_max = g * (mu_lat + banking_factor) / (1 - mu_lat * banking_factor)
v_corner_max = sqrt(a_lat_max * radius)
```

### Longitudinal Accel

```
hp_available = interpolate(hpCurve, rpm)
tractive_force = (hp * 550) / v_fps * efficiency
F_net = tractive - drag - roll
a = F_net / mass
```

### Braking

```
F_brake_max = maxBrakeG * weight
a_brake = F_brake_max / mass + drag_decel
```

### Pseudocode

```python
def simulate_lap(vehicle, track):
    points = discretize_track(track, ds=10)
    
    # Calculate corner speed limits
    v_corner_max = [calc_corner_speed(p) for p in points]
    
    # Forward pass (accel)
    v_max = [0] * len(points)
    v_max[0] = v_corner_max[0]
    for i in range(1, len(points)):
        a_max = calc_accel(vehicle, v_max[i-1])
        v_accel = sqrt(v_max[i-1]**2 + 2*a_max*ds)
        v_max[i] = min(v_accel, v_corner_max[i])
    
    # Backward pass (brake)
    for i in range(len(points)-2, -1, -1):
        if v_max[i] > v_max[i+1]:
            a_brake = calc_brake(vehicle, v_max[i])
            v_brake = sqrt(v_max[i+1]**2 + 2*a_brake*ds)
            v_max[i] = min(v_max[i], v_brake)
    
    # Time integration
    lap_time = sum(ds / ((v_max[i]+v_max[i+1])/2) for i in range(len(points)-1))
    
    return lap_time
```

### Known Limitations

- No transient dynamics
- No tire temperature
- No fuel consumption
- Simplified friction circle
- No driver model

---

*Continued in Part 2...*
