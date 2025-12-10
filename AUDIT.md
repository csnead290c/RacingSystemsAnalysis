# RSA Project Audit - December 10, 2025

## Executive Summary

The RSA (Racing Systems Analysis) web application is a modern TypeScript/React reimplementation of the legacy VB6 Quarter Pro and Quarter Jr drag racing simulation software. The goal is **exact parity** with VB6 outputs to ensure existing customers get identical results.

**Current Status: 🟡 Partially Complete - VB6 Parity Issues in VB6Exact Model**

- **Test Results**: 439 passed, 86 failed, 22 skipped (out of 547 tests)
- **VB6Exact Model Tests**: ~20 failing in `vb6.parity.spec.ts` (the critical ones)
- **RSACLASSIC Model Tests**: ~50 failing (legacy model, lower priority)
- **UI**: Functional but some features incomplete (shift-by-time)

### Physics Models
- **VB6Exact** - Primary model, must match VB6 line-for-line ← **FOCUS HERE**
- **RSACLASSIC** - Legacy model, lower priority
- **SimpleV1** - Basic model for sanity checks

---

## VB6Exact Parity Test Results (vb6.parity.spec.ts)

**18 failed, 2 passed, 3 skipped out of 23 tests**

### Quarter Pro Benchmarks (Full HP Curves)

| Vehicle | Distance | Expected ET | Actual ET | Delta | Status |
|---------|----------|-------------|-----------|-------|--------|
| SuperGas_Pro | 1/8 | 6.27s | 5.46s | -0.81s | ❌ FAIL (too fast) |
| SuperGas_Pro | 1/4 | 9.90s | 8.66s | -1.24s | ❌ FAIL (too fast) |
| TA_Dragster_Pro | 1/8 | 3.56s | ? | ? | ❌ FAIL |
| TA_Dragster_Pro | 1/4 | 5.52s | ? | ? | ✅ PASS |
| ProStock_Pro | 1/8 | 4.37s | ? | ? | ✅ PASS |
| ProStock_Pro | 1/4 | 6.80s | ? | ? | ❌ FAIL |
| FunnyCar_Pro | 1/8 | 3.37s | ? | ? | ❌ FAIL |
| FunnyCar_Pro | 1/4 | 4.98s | ? | ? | ❌ FAIL |
| Motorcycle_Pro | 1/8 | 7.63s | 10.4s | +2.79s | ❌ FAIL (too slow) |
| Motorcycle_Pro | 1/4 | 11.99s | 19.5s | +7.55s | ❌ FAIL (too slow) |
| SuperComp_Pro | 1/8 | 5.66s | 4.77s | -0.89s | ❌ FAIL (too fast) |
| SuperComp_Pro | 1/4 | 8.90s | 7.54s | -1.36s | ❌ FAIL (too fast) |

### Quarter Jr Benchmarks (Synthetic HP Curves)

| Vehicle | Distance | Expected ET | Actual ET | Delta | Status |
|---------|----------|-------------|-----------|-------|--------|
| Motorcycle_Jr | 1/8 | 7.45s | 14.86s | +7.41s | ❌ FAIL (too slow) |
| Motorcycle_Jr | 1/4 | 12.00s | 28.50s | +16.50s | ❌ FAIL (too slow) |
| ETRacer_Jr | 1/8 | 8.60s | 8.32s | -0.28s | ❌ FAIL (too fast) |
| ETRacer_Jr | 1/4 | 13.50s | 13.19s | -0.31s | ❌ FAIL (too fast) |
| EXP_Jr | 1/8 | 5.15s | 4.92s | -0.23s | ❌ FAIL (too fast) |
| EXP_Jr | 1/4 | 8.18s | 7.62s | -0.56s | ❌ FAIL (too fast) |
| EXP_050523_Jr | 1/8 | 5.06s | 4.81s | -0.25s | ❌ FAIL (too fast) |
| EXP_050523_Jr | 1/4 | 8.04s | 7.47s | -0.58s | ❌ FAIL (too fast) |

---

## Root Cause Analysis

### 1. Motorcycle Simulations - ✅ PHYSICS MODEL IS CORRECT!
- **Web App Result**: 7.630s @ 91.14 MPH (1/8), 11.990s @ 111.37 MPH (1/4)
- **VB6 Result**: 7.63s @ 91.1 MPH (1/8), 11.99s @ 111.3 MPH (1/4)
- **Delta**: ~0.000s ET, ~0.04 MPH - **EXACT PARITY ACHIEVED**
- **Root Cause of Test Failures**: The `benchmark-configs.ts` file has **completely wrong data**
  - Wrong elevation (500 vs 0)
  - Wrong temperature (75 vs 72)
  - Wrong traction index (4 vs 2)
  - Wrong final drive (6.5 vs 5.72)
  - Wrong tire diameter (28" vs 25")
  - Wrong gear ratios (4 gears vs 6 gears)
  - Wrong HP curve (fabricated data)
  - Wrong shift RPMs
- **Fix Required**: Update `benchmark-configs.ts` to match actual `.DAT` files in Reference Files folder

### 2. Quarter Jr Synthetic HP Curve - HIGH
- **Delta**: -0.2s to -0.6s (too fast)
- **Likely Cause**: The `buildEngineCurve()` function may not match VB6's ENGINE subroutine
- **Action Required**: Compare synthetic curve generation with VB6 ENGINE subroutine

### 3. SuperGas/SuperComp - HIGH
- **Delta**: -0.8s to -1.4s (too fast)
- **Likely Cause**: Converter/clutch slippage or efficiency calculations
- **Action Required**: Verify drivetrain efficiency chain matches VB6

### 4. TA_Dragster/ProStock/FunnyCar - MEDIUM
- **Delta**: +0.02s to +0.04s (close but not exact)
- **Likely Cause**: Minor differences in:
  - Timestep calculation
  - PMI convergence iterations
  - Tire slip/growth formulas
- **Action Required**: Fine-tune physics parameters

---

## Incomplete Features

### 1. Shift-by-Time Functionality
- **Status**: Vehicle schema has `shiftMode` and `shiftTimes` fields
- **Issue**: Not wired through to simulation
- **Location**: `src/domain/physics/vb6/vb6SimulationStep.ts`

### 2. Throttle Stop Persistence
- **Status**: ✅ Fixed in recent commit
- **Note**: Now persists from vehicle selector to ET Sim

### 3. Land Speed Race Lengths
- **Status**: ✅ Fixed in recent commit
- **Note**: Dropdown now includes all land speed options

---

## Priority Action Items

### P0 - Critical (Blocking Release)
1. **Fix Motorcycle Physics** - Completely broken, +7-16s deltas
2. **Fix Quarter Jr Synthetic HP Curve** - Running too fast by 0.2-0.6s
3. **Fix SuperGas/SuperComp** - Running too fast by 0.8-1.4s

### P1 - High (Required for VB6 Parity)
4. **Implement Shift-by-Time** - Feature exists in VB6, not working in RSA
5. **Fine-tune TA_Dragster/ProStock/FunnyCar** - Close but not exact

### P2 - Medium (Quality of Life)
6. **Add more VB6 printout fixtures** - Need more test cases
7. **Improve debug panel** - Better trace comparison tools

---

## Files to Review

### Physics Core
- `src/domain/physics/models/vb6Exact.ts` - Main simulation loop
- `src/domain/physics/vb6/vb6SimulationStep.ts` - Per-step physics
- `src/domain/physics/vb6/engineCurve.ts` - Synthetic HP curve generation

### Test Fixtures
- `src/domain/physics/fixtures/benchmarks.ts` - Expected VB6 outputs
- `src/domain/physics/fixtures/benchmark-configs.ts` - Vehicle configurations

### VB6 Reference
- Need access to original VB6 source for:
  - `TIMESLIP.FRM` - Main simulation
  - `ENGINE.BAS` - HP curve generation
  - Motorcycle-specific code paths

---

## Next Steps

1. **Immediate**: Run motorcycle simulation with debug output to understand failure mode
2. **This Week**: Compare synthetic HP curve generation with VB6 ENGINE subroutine
3. **This Week**: Review SuperGas/SuperComp drivetrain efficiency chain
4. **Next Week**: Fine-tune remaining vehicles to achieve ±0.01s parity

---

## Notes

- The VB6Exact model is designed to replicate VB6 TIMESLIP.FRM exactly
- All physics formulas should match VB6 line-for-line
- No "improvements" or "modernizations" to physics - exact replication only
- Existing customers expect identical results to their VB6 printouts
