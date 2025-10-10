# VB6 Parity Test Results - Initial Run

## Test Configuration

**Strict Tolerances:**
- ET: ±0.05s
- MPH: ±1.0 mph

**Test Command:**
```bash
npm test physics.benchmarks -- --reporter=basic --run
```

---

## Test Results

### Status: ❌ ALL TESTS FAILING

**Issue:** Vehicle not moving (negative distance and velocity)

### Sample Trace Output (SuperGas_Pro EIGHTH)

```
Early Trace (first 0.4s):
──────────────────────────────────────────────────────────────────────────────
t_s      s_ft     v_mph    rpm      gear   Twheel   T_drag   T_rr    
──────────────────────────────────────────────────────────────────────────────
0.002    -0.00    -0.00    5500     2      N/A      N/A      N/A
0.020    -0.00    -0.01    5500     2      N/A      N/A      N/A
0.040    -0.00    -0.02    5500     2      N/A      N/A      N/A
0.060    -0.00    -0.03    5500     2      N/A      N/A      N/A
0.080    -0.00    -0.05    5500     2      N/A      N/A      N/A
```

### Observations

1. **Distance is negative** - Vehicle moving backwards
2. **Velocity is negative** - Negative speed
3. **RPM is constant at 5500** - Engine not responding
4. **Gear starts at 2** - Should start at 1 (0-indexed would be 0)
5. **No torque data in traces** - Can't see Twheel, T_drag, T_rr

### Error Deltas

```
AssertionError: expected 6.9600000000016795 to be less than or equal to 0.05
```

This suggests ET delta is ~7 seconds, which is massive.

---

## Root Cause Analysis

### Possible Issues

1. **Initial State Problem**
   - Vehicle may be starting with wrong initial conditions
   - Gear index may be wrong (showing gear 2 instead of 1)
   - RPM may be clamped incorrectly

2. **Force Calculation Problem**
   - Negative forces causing backwards motion
   - Torque calculations may be inverted
   - Drag/RR may be overwhelming drive torque

3. **Integration Problem**
   - Timestep integration may have sign error
   - Acceleration calculation may be wrong

4. **Config Problem**
   - Missing or incorrect parameters
   - Validation passed, so all required fields present
   - But values may be wrong or incompatible

---

## Next Steps

### 1. Debug Initial State
- Check `createInitialState()` in rsaclassic.ts
- Verify gear index starts at 0 (1st gear)
- Verify initial RPM is from launch/stall RPM

### 2. Debug Force Calculations
- Add console logging for forces in first few steps
- Verify Twheel > T_drag + T_rr
- Check sign of all torques

### 3. Debug Integration
- Verify acceleration calculation
- Check velocity and position updates
- Ensure no sign errors

### 4. Add Torque to Traces
- Modify trace collection to include:
  - Twheel (wheel torque)
  - T_drag (drag torque)
  - T_rr (rolling resistance torque)
  - F_net (net force)
  - a_g (acceleration in g's)

### 5. Simplify Test Case
- Create minimal test with known good values
- Single gear, no converter/clutch
- Verify basic physics works

---

## Test Implementation Status

### ✅ Completed
- Strict tolerance checks (±0.05s ET, ±1.0 mph)
- Config validation (all required VB6 parameters)
- Early trace table output on failure
- Clear error messages with deltas

### ❌ Blocked
- Cannot verify parity until simulation runs correctly
- Cannot check energy balance until vehicle moves
- Cannot compare to VB6 until basic physics works

---

## Files Modified

### Modified (1)
1. **`src/integration-tests/physics.benchmarks.spec.ts`**
   - Added `validateBenchmarkConfig()` call
   - Implemented strict tolerances (±0.05s ET, ±1.0 mph)
   - Added early trace table output (first 0.4s at 0.02s steps)
   - Enhanced error messages with deltas

### Created (1)
2. **`VB6-PARITY-TEST-RESULTS.md`** - This document

---

## Summary

**Status: ❌ TESTS FAILING - SIMULATION NOT RUNNING**

The test infrastructure is complete with:
- ✅ Strict config validation
- ✅ Strict parity tolerances
- ✅ Detailed failure diagnostics
- ✅ Early trace output

However, the simulation itself has a critical bug:
- ❌ Vehicle moving backwards (negative distance/velocity)
- ❌ Constant RPM (not responding to throttle)
- ❌ Wrong initial gear (showing 2 instead of 1)

**Next Action:**
Debug the simulation to find why the vehicle isn't moving forward. Focus on:
1. Initial state (gear, RPM, velocity)
2. Force calculations (sign and magnitude)
3. Integration (velocity/position updates)
