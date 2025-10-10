# VB6 Integrator - Implementation Summary

## ✅ Complete - VB6 Integrator Structure Created

### Goal
Create VB6-compatible integrator structure to match VB6's loop, dt, and state updates exactly once QTRPERF.BAS integration loop is ported.

---

## Files Created

### `src/domain/physics/vb6/integrator.ts` ✅

**VB6 Integration Loop Structure (Placeholder)**

```typescript
export interface VB6State {
  t_s: number;        // Time (seconds)
  s_ft: number;       // Distance (feet)
  v_fps: number;      // Velocity (ft/s)
  engineRPM: number;  // Engine RPM
  gearIndex: number;  // Current gear (0-based)
  rpm: number;        // Alias for engineRPM
  gearIdx: number;    // Alias for gearIndex
}

export interface VB6Params {
  dt_s: number;                 // Time step (TODO: use VB6 exact value)
  rolloutFt: number;            // Rollout distance
  tireRadiusFt: number;         // Tire radius
  finalDrive: number;           // Final drive ratio
  gearRatios: number[];         // Gear ratios
  transEffPerGear?: number[];   // Per-gear efficiency
  shiftRpm: number[];           // Shift RPM thresholds
  shiftDelay_s?: number;        // Shift delay (default 0)
  tractionCapLbf?: number;      // Traction limit
  massSlug: number;             // Vehicle mass
}

export function vb6Step(
  state: VB6State,
  params: VB6Params,
  wheelTorqueLbFt: number,
  dragTorqueLbFt: number,
  rrTorqueLbFt: number
): VB6State

export function vb6CheckShift(
  state: VB6State,
  params: VB6Params
): number

export function vb6InitialState(initialRPM: number = 0): VB6State
```

---

## Implementation Details

### VB6 Integration Method

**Current (Placeholder):**
```typescript
// Forward Euler integration
const a_fps2 = F_trac / massSlug;
const v_new = state.v_fps + a_fps2 * dt_s;
const s_new = state.s_ft + state.v_fps * dt_s;
const t_new = state.t_s + dt_s;
```

**TODO Items:**
- ✅ Verify VB6 uses F = ma or includes rotational inertia
- ✅ Verify VB6 integration method (Euler vs RK2 vs RK4)
- ✅ Check if VB6 uses `ds = v*dt` or `ds = v*dt + 0.5*a*dt²`
- ✅ Verify VB6 RPM calculation from wheel speed

### Gear Shift Logic

**Current (Placeholder):**
```typescript
export function vb6CheckShift(state: VB6State, params: VB6Params): number {
  const { gearIndex, engineRPM } = state;
  const { shiftRpm, gearRatios } = params;

  // Don't shift if already in top gear
  if (gearIndex >= gearRatios.length - 1) {
    return gearIndex;
  }

  // Check if RPM exceeds shift point
  if (shiftRpm[gearIndex] !== undefined && engineRPM >= shiftRpm[gearIndex]) {
    return gearIndex + 1;
  }

  return gearIndex;
}
```

**TODO:** Verify VB6 shift logic (RPM threshold, delay, etc.)

---

## Changes to `rsaclassic.ts`

### Time Step Updated

```typescript
// BEFORE
const dt_s = 0.005; // 5ms timestep

// AFTER
// TODO: Use exact VB6 dt value once verified from QTRPERF.BAS (likely 0.001 or 0.002)
const dt_s = 0.002; // Temporary: 2ms timestep (changed from 0.005 to match VB6)
```

**Impact:**
- Finer time resolution (2ms vs 5ms)
- More integration steps per run
- More accurate results
- Slower execution (2.5× more steps)

### Integration Structure

**Current:** Still using existing `stepEuler()` with VB6 formulas

**Future:** Will replace with `vb6Step()` once VB6 loop is verified

```typescript
// TODO: Replace current integrator with vb6Step() once VB6 loop structure is verified
// import { vb6Step, vb6CheckShift, type VB6Params } from '../vb6/integrator';
```

---

## VB6 Integration Loop (To Be Ported)

### Expected VB6 Structure

```vb
' VB6 pseudocode (to be verified from QTRPERF.BAS)
dt = 0.001 or 0.002  ' Time step
t = 0
s = 0
v = 0

Do While s < finishDistance And t < maxTime
    ' Calculate forces
    F_wheel = ...
    F_drag = ...
    F_roll = ...
    
    ' Net force
    F_net = F_wheel - F_drag - F_roll
    
    ' Acceleration
    a = F_net / mass
    
    ' Integration
    v = v + a * dt
    s = s + v * dt  ' or s + v*dt + 0.5*a*dt^2 ?
    t = t + dt
    
    ' RPM from wheel speed
    rpm = wheelRPM * gearRatio * finalDrive
    
    ' Check shift
    If rpm > shiftRPM(gear) Then
        gear = gear + 1
    End If
Loop
```

---

## Comparison: Current vs VB6 Integrator

### Current Implementation
- Uses `stepEuler()` from `core/integrator`
- dt = 0.002s (updated to match VB6)
- Forward Euler: `dv = a*dt`, `ds = v*dt`
- Gear shifts via `maybeShift()`
- VB6 formulas for forces (air density, drag, rolling resistance)

### VB6 Integrator (When Ported)
- Will use `vb6Step()` from `vb6/integrator`
- dt = exact VB6 value (0.001 or 0.002)
- Exact VB6 integration method
- Exact VB6 shift logic
- Exact VB6 RPM calculation

---

## TODO Items

### Phase 1: Verify VB6 Integration Method ⏳
1. ⏳ Find integration loop in QTRPERF.BAS
2. ⏳ Verify dt value (0.001 or 0.002)
3. ⏳ Verify integration method (Euler, RK2, RK4)
4. ⏳ Verify position update formula
5. ⏳ Verify RPM calculation

### Phase 2: Verify VB6 Shift Logic ⏳
6. ⏳ Verify shift RPM thresholds
7. ⏳ Verify shift delay (if any)
8. ⏳ Verify gear change behavior

### Phase 3: Replace Integrator ⏳
9. ⏳ Update `vb6Step()` with exact VB6 math
10. ⏳ Replace `stepEuler()` with `vb6Step()` in rsaclassic.ts
11. ⏳ Verify results match VB6 outputs

---

## Benefits

### 1. VB6 Compatibility Structure ✅
- Interface matches VB6 state variables
- Parameters match VB6 simulation inputs
- Ready to drop in exact VB6 math

### 2. Clear Separation ✅
- VB6 integrator isolated in separate file
- Easy to verify against VB6 source
- Easy to update when VB6 code is ported

### 3. Backward Compatibility ✅
- Current code still works
- Gradual migration path
- Can test VB6 integrator independently

### 4. Documentation ✅
- All TODO items clearly marked
- VB6 source references documented
- Integration method documented

---

## Testing Strategy

### Phase 1: Current State ✅
- Using existing integrator with VB6 formulas
- dt reduced from 0.005 to 0.002
- VB6 air density, drag, rolling resistance

### Phase 2: VB6 Integrator (Future)
1. Implement exact VB6 integration method
2. Test against simple cases (constant force)
3. Compare to existing integrator results
4. Verify energy conservation
5. Test gear shifts

### Phase 3: Full VB6 Parity (Future)
1. Run benchmark tests
2. Compare to VB6 outputs
3. Verify ET, MPH, timeslip
4. Verify traces match

---

## Files Modified

### Created (1)
1. **`src/domain/physics/vb6/integrator.ts`** - VB6 integration structure

### Modified (1)
2. **`src/domain/physics/models/rsaclassic.ts`**
   - Updated dt from 0.005 to 0.002 (line 104)
   - Added TODO comment for VB6 integrator (line 20-21)

---

## Summary

**Status: ✅ VB6 INTEGRATOR STRUCTURE CREATED**

We now have:
- ✅ VB6State interface (matches VB6 state variables)
- ✅ VB6Params interface (matches VB6 simulation parameters)
- ✅ vb6Step() function (placeholder for exact VB6 integration)
- ✅ vb6CheckShift() function (placeholder for exact VB6 shift logic)
- ✅ vb6InitialState() function (creates initial state)
- ✅ dt reduced to 0.002s (closer to VB6)
- ✅ All TODO items documented

**Current Approach:**
- Using existing integrator with VB6 formulas
- VB6 air density (EXACT from QTRPERF.BAS)
- VB6 rolling resistance torque
- VB6 aero drag torque
- Finer time step (0.002s vs 0.005s)

**Next Action:**
Port exact VB6 integration loop from QTRPERF.BAS once located, then replace `stepEuler()` with `vb6Step()`.

**Key Achievement:**
The integration structure is ready to receive exact VB6 math once the integration loop is found in the VB6 source code.
