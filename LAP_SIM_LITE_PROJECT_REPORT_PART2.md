# LAP SIM LITE - PHASE 1 PROJECT REPORT (PART 2 of 2)

*Continued from Part 1...*

---

## 6) CALIBRATION WORKFLOW

### Inputs

**Required:**
- Known lap time (real-world or target)
- Track definition
- Vehicle base configuration

**Optional:**
- Known top speed
- Known corner speeds

### Adjustable Scalars

```typescript
interface CalibrationParams {
  mu_lat: number;      // Lateral grip (0.8-2.5)
  mu_brake: number;    // Braking grip (0.8-2.0)
  aero_mult: number;   // Aero multiplier (0.5-1.5)
  power_mult: number;  // Power multiplier (0.8-1.2)
}

const BOUNDS = {
  mu_lat: { min: 0.8, max: 2.5, default: 1.2 },
  mu_brake: { min: 0.8, max: 2.0, default: 1.0 },
  aero_mult: { min: 0.5, max: 1.5, default: 1.0 },
  power_mult: { min: 0.8, max: 1.2, default: 1.0 },
};
```

### Optimization Method

**Coordinate Descent (Deterministic, Bounded):**

```typescript
function calibrate(
  vehicle: Vehicle,
  track: Track,
  targetLapTime_s: number,
  tolerance_s: number = 0.1
): CalibrationParams {
  
  let params: CalibrationParams = {
    mu_lat: 1.2,
    mu_brake: 1.0,
    aero_mult: 1.0,
    power_mult: 1.0,
  };
  
  const maxIterations = 20;
  const stepSize = 0.05;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    let improved = false;
    
    // Try adjusting each parameter
    for (const key of ['mu_lat', 'mu_brake', 'aero_mult', 'power_mult']) {
      const original = params[key];
      const bounds = BOUNDS[key];
      
      // Try increasing
      params[key] = Math.min(original + stepSize, bounds.max);
      const lapTime_up = simulateLap(vehicle, track, params);
      const error_up = Math.abs(lapTime_up - targetLapTime_s);
      
      // Try decreasing
      params[key] = Math.max(original - stepSize, bounds.min);
      const lapTime_down = simulateLap(vehicle, track, params);
      const error_down = Math.abs(lapTime_down - targetLapTime_s);
      
      // Keep best
      const error_original = Math.abs(
        simulateLap(vehicle, track, { ...params, [key]: original }) - targetLapTime_s
      );
      
      if (error_up < error_original && error_up < error_down) {
        params[key] = original + stepSize;
        improved = true;
      } else if (error_down < error_original) {
        params[key] = original - stepSize;
        improved = true;
      } else {
        params[key] = original;
      }
    }
    
    // Check convergence
    const currentError = Math.abs(
      simulateLap(vehicle, track, params) - targetLapTime_s
    );
    if (currentError < tolerance_s) {
      break;
    }
    
    // If no improvement, reduce step size
    if (!improved) {
      stepSize *= 0.5;
      if (stepSize < 0.001) break;
    }
  }
  
  return params;
}
```

### Storage Strategy

**Option A: Scenario-Level (Recommended for Phase 1)**
- Store calibration params with each scenario/run
- Allows different calibrations for same vehicle on different tracks
- Schema: `{ vehicleId, trackId, calibrationParams, lapTime, date }`

**Option B: Vehicle Variant**
- Create "tuned" vehicle variant with calibrated params baked in
- Cleaner for user, but less flexible
- Schema: `{ ...vehicle, calibrationSource: { trackId, lapTime } }`

**Recommendation:** Use Option A for Phase 1, add Option B in Phase 2 as "Save Calibration to Vehicle" feature.

### UI Flow

1. User enters known lap time
2. Click "Calibrate"
3. Show progress spinner with iteration count
4. Display results:
   - Calibrated lap time vs target
   - Parameter values (mu_lat, mu_brake, etc.)
   - Confidence indicator (green if within 0.1s, yellow if 0.1-0.5s, red if >0.5s)
5. Option to "Accept" or "Retry with different initial values"

### Validation

**Sanity Checks:**
- If `mu_lat > 2.0`, warn "Unrealistic lateral grip - check vehicle weight or track definition"
- If `power_mult < 0.9 or > 1.1`, warn "Power adjustment >10% - verify HP curve accuracy"
- If calibration fails to converge, suggest "Try adjusting vehicle weight or aero settings"

---

## 7) RESULTS & REPORTING

### Primary Results Display

**Lap Time Card:**
```
┌─────────────────────────────────┐
│ LAP TIME: 1:23.456              │
│ Avg Speed: 78.3 mph             │
│ Top Speed: 142.7 mph            │
│                                 │
│ Fastest Sector: S2 (28.1s)     │
│ Slowest Sector: S1 (31.2s)     │
└─────────────────────────────────┘
```

**Sector Times Table:**
```
| Sector | Time    | Avg Speed | Top Speed | % of Lap |
|--------|---------|-----------|-----------|----------|
| S1     | 31.234s | 72.3 mph  | 98.4 mph  | 37.4%    |
| S2     | 28.123s | 81.2 mph  | 142.7 mph | 33.7%    |
| S3     | 24.099s | 76.8 mph  | 115.3 mph | 28.9%    |
```

### Speed Trace Chart

**Reuse:** `SpeedChart.tsx` with modifications

**Enhancements:**
- X-axis: Distance (ft) with sector markers (vertical lines)
- Y-axis: Speed (mph)
- Primary line: Actual speed (blue)
- Overlay line: Corner speed limit (red dashed)
- Color zones: Braking (red bg), Coasting (yellow bg), Accelerating (green bg)
- Hover tooltip: Distance, speed, gear, throttle %, brake %

### Insights Card

**Auto-Generated Insights:**
```
┌─────────────────────────────────────────────────┐
│ 🎯 INSIGHTS                                     │
│                                                 │
│ • Traction-limited in Turn 3 (85% throttle)    │
│ • Late braking into Turn 1 saves 0.3s          │
│ • Shift to 4th gear earlier on back straight   │
│   for 2 mph higher top speed                   │
└─────────────────────────────────────────────────┘
```

**Logic:**
- If throttle < 100% in corner: "Traction-limited in [corner]"
- If brake distance > optimal: "Early braking into [corner] costs [time]"
- If RPM near redline on straight: "Shift to [next gear] earlier"
- If corner exit speed < 95% of limit: "Carry more speed through [corner]"

### Comparison Mode

**When comparing two scenarios:**
- Side-by-side lap time cards
- Delta time: "+0.234s slower" or "-0.123s faster"
- Sector-by-sector comparison table with deltas
- Overlay speed traces (blue vs orange)

### Export Formats

**JSON:**
```json
{
  "vehicle": { "name": "...", "weightLb": 2800, ... },
  "track": { "name": "Generic Road Course", ... },
  "lapTime_s": 83.456,
  "sectors": [
    { "name": "S1", "time_s": 31.234, "avgSpeed_mph": 72.3 },
    ...
  ],
  "trace": [
    { "s_ft": 0, "t_s": 0, "v_mph": 45.2, "gear": 2 },
    ...
  ]
}
```

**CSV:**
```csv
Distance (ft),Time (s),Speed (mph),Gear,Throttle (%),Brake (%)
0,0.000,45.2,2,100,0
10,0.223,46.8,2,100,0
...
```

---

## 8) PARAMETER SWEEPS

### Sweep Types

**1. Weight Sweep**
- Range: ±200 lb from base (e.g., 2600-3000 lb in 50 lb steps)
- Output: Lap time vs weight chart
- Insight: "Removing 100 lb saves 0.8s per lap"

**2. Power Sweep**
- Range: ±50 HP from base (e.g., 300-400 HP in 10 HP steps)
- Output: Lap time vs HP chart
- Insight: "Adding 50 HP saves 1.2s per lap"

**3. Aero Sweep**
- Range: Cd from 0.25 to 0.45 in 0.05 steps
- Output: Lap time vs Cd chart
- Insight: "Reducing Cd by 0.1 saves 0.5s per lap"

**4. Gear Ratio Sweep**
- Range: Final drive from 3.0 to 4.5 in 0.1 steps
- Output: Lap time vs ratio chart
- Insight: "Optimal final drive: 3.73 (saves 0.3s)"

**5. Brake Bias Sweep**
- Range: 50-70% front in 2% steps
- Output: Lap time vs bias chart
- Insight: "Optimal brake bias: 62% front"

### Sweep Runner Implementation

**File:** `src/domain/physics/sweeps/sweepRunner.ts` (new)

```typescript
interface SweepConfig {
  type: 'weight' | 'power' | 'aero' | 'gearRatio' | 'brakeBias';
  min: number;
  max: number;
  step: number;
}

interface SweepResult {
  paramValue: number;
  lapTime_s: number;
  topSpeed_mph: number;
}

async function runSweep(
  vehicle: Vehicle,
  track: Track,
  config: SweepConfig,
  onProgress?: (pct: number) => void
): Promise<SweepResult[]> {
  
  const results: SweepResult[] = [];
  const steps = Math.ceil((config.max - config.min) / config.step) + 1;
  
  for (let i = 0; i < steps; i++) {
    const paramValue = config.min + i * config.step;
    
    // Clone vehicle and modify parameter
    const modifiedVehicle = { ...vehicle };
    switch (config.type) {
      case 'weight':
        modifiedVehicle.weightLb = paramValue;
        break;
      case 'power':
        modifiedVehicle.powerHP = paramValue;
        break;
      case 'aero':
        modifiedVehicle.cd = paramValue;
        break;
      case 'gearRatio':
        modifiedVehicle.rearGear = paramValue;
        break;
      case 'brakeBias':
        modifiedVehicle.brakeBiasFront = paramValue;
        break;
    }
    
    // Simulate
    const result = simulateLap(modifiedVehicle, track);
    results.push({
      paramValue,
      lapTime_s: result.lapTime_s,
      topSpeed_mph: result.topSpeed_mph,
    });
    
    // Report progress
    if (onProgress) {
      onProgress((i + 1) / steps * 100);
    }
  }
  
  return results;
}
```

### Sweep UI

**Layout:**
- Top: Sweep configuration (type, range, step)
- Middle: Progress bar during execution
- Bottom: Results chart + insights

**Chart:**
- X-axis: Parameter value
- Y-axis: Lap time (s)
- Mark optimal point with star icon
- Show baseline with vertical dashed line

---

## 9) DATA MODEL / PERSISTENCE CHANGES

### Schema Changes

**Vehicle Schema Extension:**
```typescript
// Add to src/domain/schemas/vehicle.schema.ts
export const VehicleSchema = z.object({
  // ... existing fields ...
  
  // Simulation type discriminator
  simType: z.enum(['drag', 'lapsim']).optional().default('drag'),
  
  // Lap sim fields
  brakeBiasFront: z.number().min(30).max(90).optional(),
  maxBrakeG: z.number().min(0.5).max(3.0).optional(),
  suspensionStiffnessFront: z.number().optional(),
  suspensionStiffnessRear: z.number().optional(),
  antiRollBarFront: z.number().optional(),
  antiRollBarRear: z.number().optional(),
  downforceBalance: z.number().min(30).max(70).optional(),
  cornerWeightLF: z.number().optional(),
  cornerWeightRF: z.number().optional(),
  cornerWeightLR: z.number().optional(),
  cornerWeightRR: z.number().optional(),
  tireCompoundFront: z.string().optional(),
  tireCompoundRear: z.string().optional(),
  tirePressureFront: z.number().min(10).max(50).optional(),
  tirePressureRear: z.number().min(10).max(50).optional(),
  maxLateralG: z.number().min(0.5).max(3.0).optional(),
});
```

**Track Schema (New):**
```typescript
// Create src/domain/schemas/track.schema.ts
export const TrackSegmentSchema = z.object({
  id: z.string(),
  type: z.enum(['straight', 'corner']),
  length_ft: z.number().optional(),
  radius_ft: z.number().optional(),
  angle_deg: z.number().optional(),
  banking_deg: z.number().optional().default(0),
  gripMultiplier: z.number().optional().default(1.0),
  elevationChange_ft: z.number().optional().default(0),
  name: z.string().optional(),
});

export const TrackSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['road_course', 'oval', 'street_circuit', 'custom']),
  segments: z.array(TrackSegmentSchema).min(1),
  totalLength_ft: z.number(),
  lapRecord_s: z.number().optional(),
  lapRecordVehicle: z.string().optional(),
  elevation_ft: z.number().optional(),
  surfaceType: z.enum(['asphalt', 'concrete', 'pavement']).optional(),
  group: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number().optional(),
});
```

**Lap Result Schema (New):**
```typescript
// Create src/domain/schemas/lapResult.schema.ts
export const LapResultSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  trackId: z.string(),
  
  // Results
  lapTime_s: z.number(),
  avgSpeed_mph: z.number(),
  topSpeed_mph: z.number(),
  
  // Calibration (if used)
  calibrationParams: z.object({
    mu_lat: z.number(),
    mu_brake: z.number(),
    aero_mult: z.number(),
    power_mult: z.number(),
  }).optional(),
  
  // Metadata
  date: z.number(),
  notes: z.string().optional(),
});
```

### Storage Keys

```typescript
// Add to existing storage
'rsa.vehicles.v1'  // Existing - extend with lap fields
'rsa.tracks.v1'    // New
'rsa.lapResults.v1' // New
```

### Migration Strategy

**Backward Compatibility:**
- All lap sim fields are optional
- Default `simType` to 'drag' for existing vehicles
- No migration script needed - schema is additive

---

## 10) TESTING & VALIDATION PLAN

### Unit Tests

**File:** `src/integration-tests/lapsim.solver.spec.ts` (new)

```typescript
describe('Lap Sim Solver', () => {
  it('should discretize straight segment correctly', () => {
    const segment = { type: 'straight', length_ft: 100 };
    const points = discretizeSegment(segment, 10);
    expect(points.length).toBe(11); // 0, 10, 20, ..., 100
    expect(points[0].curvature_1_ft).toBe(0);
  });
  
  it('should discretize corner segment correctly', () => {
    const segment = { type: 'corner', radius_ft: 200, angle_deg: 90 };
    const points = discretizeSegment(segment, 10);
    const arcLength = 200 * (90 * Math.PI / 180);
    expect(points.length).toBeGreaterThan(0);
    expect(points[0].curvature_1_ft).toBeCloseTo(1/200);
  });
  
  it('should calculate corner speed from lateral limit', () => {
    const mu_lat = 1.2;
    const radius_ft = 300;
    const v_max = calcCornerSpeed(mu_lat, radius_ft, 0);
    expect(v_max).toBeCloseTo(Math.sqrt(1.2 * 32.174 * 300));
  });
  
  it('should apply banking correctly', () => {
    const mu_lat = 1.0;
    const radius_ft = 300;
    const banking_deg = 15;
    const v_banked = calcCornerSpeed(mu_lat, radius_ft, banking_deg);
    const v_flat = calcCornerSpeed(mu_lat, radius_ft, 0);
    expect(v_banked).toBeGreaterThan(v_flat);
  });
});
```

### Regression Tests

**File:** `src/integration-tests/lapsim.regression.spec.ts` (new)

```typescript
describe('Lap Sim Regression', () => {
  it('should match known lap time for generic road course', () => {
    const vehicle = GENERIC_SPORTS_CAR;
    const track = GENERIC_ROAD_COURSE;
    const result = simulateLap(vehicle, track);
    
    // Known good result from manual validation
    expect(result.lapTime_s).toBeCloseTo(83.5, 0.5);
  });
  
  it('should match known lap time for generic oval', () => {
    const vehicle = GENERIC_STOCK_CAR;
    const track = GENERIC_OVAL_HALF_MILE;
    const result = simulateLap(vehicle, track);
    
    expect(result.lapTime_s).toBeCloseTo(18.2, 0.5);
  });
});
```

### Monotonic Tests

**File:** `src/integration-tests/lapsim.monotonic.spec.ts` (new)

```typescript
describe('Lap Sim Monotonic Behavior', () => {
  it('should decrease lap time when power increases', () => {
    const vehicle = { ...GENERIC_SPORTS_CAR, powerHP: 300 };
    const track = GENERIC_ROAD_COURSE;
    
    const time_300hp = simulateLap(vehicle, track).lapTime_s;
    const time_350hp = simulateLap({ ...vehicle, powerHP: 350 }, track).lapTime_s;
    const time_400hp = simulateLap({ ...vehicle, powerHP: 400 }, track).lapTime_s;
    
    expect(time_350hp).toBeLessThan(time_300hp);
    expect(time_400hp).toBeLessThan(time_350hp);
  });
  
  it('should decrease lap time when weight decreases', () => {
    const vehicle = { ...GENERIC_SPORTS_CAR, weightLb: 3000 };
    const track = GENERIC_ROAD_COURSE;
    
    const time_3000lb = simulateLap(vehicle, track).lapTime_s;
    const time_2800lb = simulateLap({ ...vehicle, weightLb: 2800 }, track).lapTime_s;
    const time_2600lb = simulateLap({ ...vehicle, weightLb: 2600 }, track).lapTime_s;
    
    expect(time_2800lb).toBeLessThan(time_3000lb);
    expect(time_2600lb).toBeLessThan(time_2800lb);
  });
  
  it('should decrease lap time when Cd decreases', () => {
    const vehicle = { ...GENERIC_SPORTS_CAR, cd: 0.40 };
    const track = GENERIC_ROAD_COURSE;
    
    const time_040 = simulateLap(vehicle, track).lapTime_s;
    const time_035 = simulateLap({ ...vehicle, cd: 0.35 }, track).lapTime_s;
    const time_030 = simulateLap({ ...vehicle, cd: 0.30 }, track).lapTime_s;
    
    expect(time_035).toBeLessThan(time_040);
    expect(time_030).toBeLessThan(time_035);
  });
  
  it('should decrease lap time when mu_lat increases', () => {
    const vehicle = { ...GENERIC_SPORTS_CAR, maxLateralG: 1.0 };
    const track = GENERIC_ROAD_COURSE;
    
    const time_10g = simulateLap(vehicle, track).lapTime_s;
    const time_12g = simulateLap({ ...vehicle, maxLateralG: 1.2 }, track).lapTime_s;
    const time_15g = simulateLap({ ...vehicle, maxLateralG: 1.5 }, track).lapTime_s;
    
    expect(time_12g).toBeLessThan(time_10g);
    expect(time_15g).toBeLessThan(time_12g);
  });
});
```

### Calibration Tests

**File:** `src/integration-tests/lapsim.calibration.spec.ts` (new)

```typescript
describe('Lap Sim Calibration', () => {
  it('should converge to target lap time within tolerance', () => {
    const vehicle = GENERIC_SPORTS_CAR;
    const track = GENERIC_ROAD_COURSE;
    const targetTime = 83.5;
    
    const params = calibrate(vehicle, track, targetTime, 0.1);
    const result = simulateLap(vehicle, track, params);
    
    expect(Math.abs(result.lapTime_s - targetTime)).toBeLessThan(0.1);
  });
  
  it('should produce reasonable parameter values', () => {
    const vehicle = GENERIC_SPORTS_CAR;
    const track = GENERIC_ROAD_COURSE;
    const targetTime = 83.5;
    
    const params = calibrate(vehicle, track, targetTime);
    
    expect(params.mu_lat).toBeGreaterThan(0.8);
    expect(params.mu_lat).toBeLessThan(2.5);
    expect(params.power_mult).toBeGreaterThan(0.8);
    expect(params.power_mult).toBeLessThan(1.2);
  });
  
  it('should be deterministic', () => {
    const vehicle = GENERIC_SPORTS_CAR;
    const track = GENERIC_ROAD_COURSE;
    const targetTime = 83.5;
    
    const params1 = calibrate(vehicle, track, targetTime);
    const params2 = calibrate(vehicle, track, targetTime);
    
    expect(params1.mu_lat).toBe(params2.mu_lat);
    expect(params1.power_mult).toBe(params2.power_mult);
  });
});
```

### Test Fixtures

**File:** `src/domain/physics/fixtures/lapSimFixtures.ts` (new)

```typescript
export const GENERIC_SPORTS_CAR: Vehicle = {
  id: 'test-sports-car',
  name: 'Generic Sports Car',
  simType: 'lapsim',
  weightLb: 2800,
  powerHP: 350,
  rpmAtPeakHP: 6500,
  tireDiaIn: 25,
  rearGear: 3.73,
  frontalAreaFt2: 20,
  cd: 0.35,
  brakeBiasFront: 60,
  maxLateralG: 1.2,
  maxBrakeG: 1.5,
  // ... other required fields
};

export const GENERIC_ROAD_COURSE: Track = {
  id: 'test-road-course',
  name: 'Generic Road Course',
  category: 'road_course',
  segments: [
    { id: '1', type: 'straight', length_ft: 2000 },
    { id: '2', type: 'corner', radius_ft: 200, angle_deg: 90 },
    // ... more segments
  ],
  totalLength_ft: 7920,
  createdAt: Date.now(),
};
```

---

## 11) IMPLEMENTATION PLAN & MILESTONES

### Phase 1A: Foundation (Week 1-2)

**Milestone 1: Data Models & Storage**
- [ ] Create `track.schema.ts` with segment definitions
- [ ] Create `tracks.ts` storage module (copy `vehicles.ts` pattern)
- [ ] Add `simType` field to `vehicle.schema.ts`
- [ ] Add lap-specific fields to vehicle schema
- [ ] Write unit tests for schema validation
- [ ] **Deliverable:** Schemas pass validation tests

**Milestone 2: Vehicle Editor Extension**
- [ ] Add lap-specific sections to `VehicleEditorUnified.tsx`
- [ ] Implement conditional rendering based on `simType`
- [ ] Add tooltips for lap sim fields
- [ ] Test Simple/Advanced mode toggle
- [ ] **Deliverable:** Vehicle editor supports lap sim fields

### Phase 1B: Track Builder (Week 3-4)

**Milestone 3: Track Builder UI**
- [ ] Create `/track-builder` route
- [ ] Build segment list component (add/remove/reorder)
- [ ] Build segment editor panel (properties)
- [ ] Build SVG track preview
- [ ] Implement track discretization function
- [ ] Add preset tracks (road course, oval)
- [ ] **Deliverable:** Users can create and save tracks

### Phase 1C: Physics Core (Week 5-7)

**Milestone 4: Lap Solver**
- [ ] Implement track discretization
- [ ] Implement corner speed calculation (lateral limit)
- [ ] Implement forward pass (acceleration)
- [ ] Implement backward pass (braking)
- [ ] Implement time integration
- [ ] Write unit tests for solver components
- [ ] Write regression tests with fixtures
- [ ] Write monotonic behavior tests
- [ ] **Deliverable:** Solver produces reasonable lap times

**Milestone 5: Calibration**
- [ ] Implement coordinate descent optimizer
- [ ] Add bounds checking and validation
- [ ] Write calibration tests (convergence, determinism)
- [ ] **Deliverable:** Calibration converges reliably

### Phase 1D: UI & Results (Week 8-9)

**Milestone 6: Lap Sim Page**
- [ ] Create `/lap-sim` route
- [ ] Build scenario selector (vehicle + track + conditions)
- [ ] Build results display (lap time card, sector table)
- [ ] Integrate speed chart with corner speed overlay
- [ ] Add calibration UI (input known time, show progress)
- [ ] **Deliverable:** Users can run lap simulations

**Milestone 7: Reporting & Export**
- [ ] Build insights card with auto-generated tips
- [ ] Add comparison mode (side-by-side scenarios)
- [ ] Implement JSON export
- [ ] Implement CSV export
- [ ] **Deliverable:** Users can analyze and export results

### Phase 1E: Advanced Features (Week 10-11)

**Milestone 8: Parameter Sweeps**
- [ ] Implement sweep runner
- [ ] Build sweep UI (config, progress, results)
- [ ] Add sweep charts (lap time vs parameter)
- [ ] Add optimal point detection
- [ ] **Deliverable:** Users can run parameter sweeps (Pro tier)

**Milestone 9: Subscription Gating**
- [ ] Add `lapSimBasic`, `lapSimCalibration`, `lapSimSweeps` feature flags
- [ ] Gate calibration UI (Pro+)
- [ ] Gate sweeps UI (Pro+)
- [ ] Add upgrade prompts
- [ ] **Deliverable:** Features properly gated by tier

### Phase 1F: Polish & Launch (Week 12)

**Milestone 10: Testing & Documentation**
- [ ] Run full regression test suite
- [ ] Fix any failing tests
- [ ] Write user documentation (how to build tracks, calibrate, interpret results)
- [ ] Create tutorial video or walkthrough
- [ ] **Deliverable:** Feature is production-ready

**Milestone 11: Launch**
- [ ] Deploy to production
- [ ] Announce to beta users
- [ ] Monitor for bugs/feedback
- [ ] **Deliverable:** Lap Sim Lite is live

### Effort Estimates

| Milestone | Effort (Days) | Risk |
|-----------|---------------|------|
| 1. Data Models | 3 | Low |
| 2. Vehicle Editor | 4 | Medium |
| 3. Track Builder | 8 | High |
| 4. Lap Solver | 10 | High |
| 5. Calibration | 5 | Medium |
| 6. Lap Sim Page | 6 | Medium |
| 7. Reporting | 4 | Low |
| 8. Sweeps | 5 | Medium |
| 9. Gating | 2 | Low |
| 10. Testing | 5 | Medium |
| 11. Launch | 2 | Low |
| **Total** | **54 days** | **~11 weeks** |

---

## 12) OPEN QUESTIONS / DECISIONS NEEDED

### Critical Decisions (Must Answer Before Starting)

**1. Subscription Tier Strategy**
- **Question:** Which features are Racer vs Pro?
- **Options:**
  - A) Racer: Basic lap sim only, Pro: Calibration + sweeps
  - B) Racer: Lap sim + calibration, Pro: Sweeps + advanced charts
  - C) All lap sim features require Pro tier
- **Recommendation:** Option A - Racer gets basic lap sim, Pro gets calibration/sweeps
- **Rationale:** Matches existing tier strategy (Racer = essential, Pro = optimization)

**2. Calibration Storage**
- **Question:** Store calibration params with scenario or bake into vehicle?
- **Options:**
  - A) Scenario-level (flexible, but more complex UX)
  - B) Vehicle variant (cleaner UX, but less flexible)
  - C) Both (best of both worlds, but more code)
- **Recommendation:** Option A for Phase 1, add Option B in Phase 2
- **Rationale:** Simpler to implement, more flexible for testing

**3. Track Discretization Step Size**
- **Question:** What default `ds` value?
- **Options:**
  - A) 10 ft (fast, ~500 points for 1 mile)
  - B) 5 ft (accurate, ~1000 points)
  - C) 20 ft (very fast, ~250 points)
  - D) User-configurable (advanced setting)
- **Recommendation:** Option A (10 ft) with Option D as Pro feature
- **Rationale:** Good balance of speed and accuracy

**4. Physics Model Simplifications**
- **Question:** Which simplifications are acceptable for Phase 1?
- **Confirmed Simplifications:**
  - ✓ No transient tire dynamics (quasi-steady)
  - ✓ No tire temperature modeling
  - ✓ No fuel consumption
  - ✓ Simplified friction circle (no combined slip penalty)
  - ✓ No driver model (perfect inputs)
- **Recommendation:** Accept all for Phase 1, document as known limitations

### Deferrable Questions (Can Answer During Implementation)

**5. Track Builder UX Details**
- How to handle track closure (must segments form closed loop)?
- Should we validate track geometry (e.g., no overlapping segments)?
- Should we auto-calculate total length or require manual entry?

**6. Insights Generation Logic**
- What thresholds trigger each insight type?
- Should insights be configurable (user can enable/disable types)?
- Should we use ML to learn better insights over time?

**7. Mobile Support Priority**
- Should Track Builder work on mobile in Phase 1?
- Can we defer mobile optimization to Phase 2?
- What's minimum viable mobile experience?

**8. Advanced Features Roadmap**
- Which Phase 2 features are highest priority?
- Should we add tire temperature before or after fuel consumption?
- When should we add multi-lap race strategy?

---

## APPENDIX A: FILE STRUCTURE

### New Files to Create

```
src/
  domain/
    schemas/
      track.schema.ts              (NEW - Track and segment schemas)
      lapResult.schema.ts          (NEW - Lap result schema)
    config/
      trackPresets.ts              (NEW - Generic road course, oval)
    physics/
      lapsim/                      (NEW - Lap sim physics)
        solver.ts                  (NEW - Main lap solver)
        cornerSpeed.ts             (NEW - Lateral limit calculations)
        calibration.ts             (NEW - Calibration optimizer)
      sweeps/                      (NEW - Parameter sweeps)
        sweepRunner.ts             (NEW - Batch sweep executor)
      fixtures/
        lapSimFixtures.ts          (NEW - Test fixtures)
  state/
    tracks.ts                      (NEW - Track storage)
    lapResults.ts                  (NEW - Lap result storage)
  pages/
    TrackBuilder.tsx               (NEW - Track builder UI)
    LapSim.tsx                     (NEW - Lap sim scenario runner)
  shared/
    components/
      charts/
        LapTraceChart.tsx          (NEW - Bird's eye track view)
        GGDiagram.tsx              (NEW - Lateral vs longitudinal g)
  integration-tests/
    lapsim.solver.spec.ts          (NEW - Solver unit tests)
    lapsim.regression.spec.ts      (NEW - Regression tests)
    lapsim.monotonic.spec.ts       (NEW - Monotonic behavior tests)
    lapsim.calibration.spec.ts     (NEW - Calibration tests)
```

### Modified Files

```
src/
  domain/
    schemas/
      vehicle.schema.ts            (MODIFY - Add simType, lap fields)
    config/
      entitlements.ts              (MODIFY - Add lap sim feature flags)
      tooltips.ts                  (MODIFY - Add lap sim tooltips)
  shared/
    components/
      VehicleEditorUnified.tsx     (MODIFY - Add lap sim sections)
      charts/
        SpeedChart.tsx             (MODIFY - Add corner speed overlay)
  app/
    App.tsx                        (MODIFY - Add /lap-sim, /track-builder routes)
```

---

## APPENDIX B: RISK MITIGATION STRATEGIES

### Risk 1: Physics Model Complexity
**Mitigation:**
- Start with simplest quasi-steady model
- Validate against known lap times from real tracks
- Add complexity incrementally in Phase 2
- Document assumptions clearly

### Risk 2: Vehicle Field Conflicts
**Mitigation:**
- Use `simType` discriminator to cleanly separate drag vs lap fields
- Validate field combinations at schema level
- Show/hide sections based on sim type
- Add migration tests for existing vehicles

### Risk 3: Track Discretization Performance
**Mitigation:**
- Profile discretization with various `ds` values
- Cache discretized tracks (reuse for multiple sims)
- Add progress indicator for long tracks
- Make `ds` configurable for Pro users

### Risk 4: Calibration Convergence
**Mitigation:**
- Use bounded coordinate descent (proven algorithm)
- Add max iteration limit (20 iterations)
- Validate parameter bounds (reject unrealistic values)
- Provide manual override if auto-calibration fails

### Risk 5: Subscription Tier Gating
**Mitigation:**
- Define feature flags early (before implementation)
- Test gating with different tier accounts
- Add clear upgrade prompts
- Document tier differences in user guide

---

## APPENDIX C: SUCCESS METRICS

### Phase 1 Success Criteria

**Functional:**
- [ ] Users can create tracks with ≥3 segments
- [ ] Users can run lap simulations with <5s compute time
- [ ] Calibration converges within 0.1s for 80% of scenarios
- [ ] Lap times are monotonic (more power = faster)
- [ ] All regression tests pass

**User Experience:**
- [ ] Track builder is intuitive (≤10 min to build first track)
- [ ] Results are easy to interpret (insights card is helpful)
- [ ] Calibration workflow is clear (users understand what it does)

**Technical:**
- [ ] Code coverage ≥80% for lap sim modules
- [ ] No performance regressions (existing features still fast)
- [ ] Mobile layout is usable (even if not optimized)

### Phase 2 Goals (Future)

- Add tire temperature modeling
- Add fuel consumption and weight reduction
- Add friction circle with combined slip
- Add driver aggression parameter
- Add multi-lap race strategy
- Add telemetry import (from data loggers)
- Add AI-powered setup recommendations

---

## END OF REPORT

**Next Steps:**
1. Review this report with architecture team
2. Make critical decisions (subscription tiers, calibration storage, etc.)
3. Approve implementation plan and timeline
4. Begin Phase 1A (Data Models & Storage)

**Questions? Contact:** [Your Name/Team]
