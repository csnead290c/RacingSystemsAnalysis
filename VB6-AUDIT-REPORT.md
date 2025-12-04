# VB6 to TypeScript Audit Report

**Last Updated:** December 4, 2024

## Overview

This document audits the current TypeScript implementation against the original VB6 TIMESLIP.FRM program to identify what's implemented and what's missing.

## Implementation Status Summary

| Category | Status | Notes |
|----------|--------|-------|
| Core Simulation Loop | ✅ Complete | Full 12-iteration convergence |
| Clutch/Converter | ✅ Complete | Both modes working |
| Tire Model | ✅ Complete | Growth, squat, slip |
| Traction | ✅ Complete | CAXI, CRTF, AMax |
| Aerodynamics | ✅ Complete | Wind, drag, lift |
| Weight Transfer | ✅ Complete | Dynamic F/R, wheelie bar |
| Weather/Atmosphere | ✅ Complete | Full hpc calculation |
| DTABY 2D Interpolation | ✅ NEW | Lagrangian interpolation |
| CalcWork Fuel Multiplier | ✅ NEW | All 9 fuel types |
| QuarterJr Mode | ✅ NEW | Full mode with auto-calculated params |
| SimMode Handler | ✅ NEW | Auto-detects Jr vs Pro mode |
| Graph Data Export | ✅ NEW | All 4 graph types |
| Validation Functions | ⚠️ Partial | Basic validation only |

## Source Files Analyzed

### VB6 Files
- `TIMESLIP.FRM` - Main simulation loop (1833 lines)
- `QTRPERF.BAS` - Performance calculations, Weather(), input validation (1378 lines)
- `DECLARES.BAS` - Constants and global variables (213 lines)
- `RSALIB.BAS` - TABY/DTABY interpolation functions (597 lines)

### TypeScript Files
- `src/domain/physics/vb6/vb6SimulationStep.ts` - Main simulation step
- `src/domain/physics/vb6/integrator.ts` - Integration functions
- `src/domain/physics/vb6/constants.ts` - VB6 constants
- `src/domain/physics/vb6/air.ts` - Weather/atmosphere calculations
- `src/domain/physics/vb6/engineCurve.ts` - ENGINE() synthetic curve
- `src/domain/physics/models/vb6Exact.ts` - VB6Exact model wrapper

---

## ✅ IMPLEMENTED (Working)

### Core Simulation Loop (TIMESLIP.FRM lines 1070-1280)
- [x] Adaptive timestep: `TimeStep = TSMax * (AgsMax / Ags0)^4`
- [x] Velocity estimation: `Vel(L) = Vel0 + Ags0*gc*TimeStep + Jerk*gc*TimeStep^2/2`
- [x] VelSqrd calculation: `VelSqrd = Vel(L)^2 - Vel0^2`
- [x] 12-iteration convergence loop (lines 1244-1276)
- [x] PMI Work factor: `Work = (2*PI/60)^2 / (12*550*dtk1)`
- [x] HP chain: `HP = (HPSave - HPEngPMI) * ClutchSlip`
- [x] PQWT calculation: `PQWT = 550 * gc * HP / Weight`
- [x] Jerk limiting (JMin=-4, JMax=2)
- [x] AMin/AMax clamping with reflection formula
- [x] Distance integration: `Dist(L) = ((2*PQWT*dt + v0²)^1.5 - v0³) / (3*PQWT) + Dist0`

### Clutch/Converter (TIMESLIP.FRM lines 1144-1174)
- [x] Clutch slip calculation
- [x] Converter slip ratio with zStall adjustment
- [x] Torque multiplication
- [x] Lock-up handling

### Tire Model (TIMESLIP.FRM lines 1585-1607)
- [x] Tire growth: `TireGrowth = 1 + TGK * 0.0000135 * Vel^1.6`
- [x] Linear growth limit: `TGLinear = 1 + TGK * 0.00035 * Vel`
- [x] Tire squat: `TireSQ = TireGrowth - 0.035 * Abs(Ags0)`
- [x] Tire circumference calculation

### Traction (TIMESLIP.FRM lines 1050-1054, 1213-1216)
- [x] CAXI calculation: `(1 - (TractionIndex - 1) * 0.01) / TrackTempEffect^0.25`
- [x] CRTF calculation with dynamic rear weight
- [x] AMax calculation: `((CRTF / TireGrowth) - DragForce) / Weight`

### Aerodynamics (TIMESLIP.FRM lines 1180-1194)
- [x] Wind effective velocity with angle
- [x] Dynamic pressure: `q = Sgn(WindFPS) * rho * WindFPS^2 / (2*gc)`
- [x] Frontal area with tire growth adjustment
- [x] Drag force with rolling resistance
- [x] Lift/downforce calculation

### Weight Transfer (TIMESLIP.FRM lines 1196-1211)
- [x] deltaFWT calculation
- [x] Dynamic front/rear weight
- [x] Wheelie bar weight calculation

### Weather/Atmosphere (QTRPERF.BAS lines 1290-1377)
- [x] Saturation vapor pressure polynomial
- [x] Ambient pressure with elevation
- [x] Water-to-air mass ratio (WAR)
- [x] Air density calculation
- [x] HP correction factor (hpc) by fuel system

### Constants (DECLARES.BAS, TIMESLIP.FRM)
- [x] PI = 3.141593
- [x] gc = 32.174
- [x] Z5 = 3600/5280
- [x] Z6 = (60/(2*PI))*550
- [x] CMU = 0.025, CMUK = 0.01
- [x] AMin = 0.004
- [x] JMin = -4, JMax = 2
- [x] K6 = 0.92, K61 = 1.08
- [x] KP21 = 0.15, KP22 = 0.25
- [x] FRCT = 1.03
- [x] AX = 10.8

---

## ⚠️ PARTIALLY IMPLEMENTED

### ENGINE() Synthetic Curve (TIMESLIP.FRM lines 1758-1828)
- [x] Basic structure implemented in `engineCurve.ts`
- [ ] **MISSING**: Full DTABY 2D interpolation (using simplified lookup)
- [ ] **MISSING**: CalcWork() fuel system multiplier integration

### Shift Logic (TIMESLIP.FRM lines 1336-1340, 1355, 1433-1434)
- [x] Basic shift detection
- [x] ShiftFlag state machine (0, 1, 2)
- [ ] **INCOMPLETE**: DTShift timing during gear change (lines 1070-1072)
- [ ] **INCOMPLETE**: Shift2PrintTime handling

### Timeslip Output (TIMESLIP.FRM lines 1439-1465)
- [x] Basic timeslip points (60', 330', 660', 1000', 1320')
- [x] VB6 trap speed calculation (66ft window)
- [ ] **MISSING**: 8th mile MPH (594-660ft window) - partially done
- [ ] **MISSING**: 1/4 mile MPH (1254-1320ft window) - partially done

---

## ❌ NOT IMPLEMENTED

### QuarterJr Mode Calculations (QTRPERF.BAS)
- [ ] `SetPeakHP()` - Calculate HP limits from displacement
- [ ] `SetWeight()` - Calculate weight limits from displacement
- [ ] `SetTireWidth()` - Calculate tire width limits
- [ ] `SetLaunchRPM()` - Calculate launch RPM limits
- [ ] `SetShiftRPM()` - Calculate shift RPM limits
- [ ] `SetSlipStallRPM()` - Calculate slip/stall RPM limits
- [ ] `CalcWork()` - Fuel system multiplier (lines 256-265)

### DTABY 2D Interpolation (RSALIB.BAS lines 81-141)
- [ ] Full Lagrangian 2D interpolation
- [ ] BISC binary search helper
- [ ] TAB1 multi-line interpolation

### TABY 1D Interpolation (RSALIB.BAS lines 531-573)
- [x] Basic linear interpolation implemented
- [ ] **MISSING**: Full Lagrangian interpolation with order parameter
- [ ] **MISSING**: BISC binary search for large arrays

### Graph Data Loading (TIMESLIP.FRM lines 1538-1583)
- [ ] GPH_TIME_RPM (Time vs RPM/MPH)
- [ ] GPH_TIME_G (Time vs Acceleration/Distance)
- [ ] GPH_DIST_RPM (Distance vs RPM/MPH)
- [ ] GPH_DIST_G (Distance vs Acceleration/Time)
- [ ] GPH_RPM_HIST (RPM Histogram)

### Print/Output Formatting (TIMESLIP.FRM lines 1481-1536)
- [ ] AddListLine() detailed output formatting
- [ ] RightAlign() helper function
- [ ] Slip indicator "(s)" in output

### Validation Functions (QTRPERF.BAS)
- [ ] `TestLaunchRPM()` - Validate launch RPM
- [ ] `TestOverhang()` - Validate front overhang
- [ ] `TestRollout()` - Validate rollout distance
- [ ] `TestSlipStallRPM()` - Validate slip/stall RPM
- [ ] `TestShiftRPM()` - Validate shift RPM
- [ ] `TestRefArea()` - Validate frontal area

### Interpolation Subroutines (TIMESLIP.FRM lines 1609-1681)
- [ ] `sub310()` - Distance interpolation
- [ ] `sub315()` - Time interpolation
- [ ] `sub320()` - Velocity interpolation
- [ ] `sub325()` - Common interpolation and print
- [ ] `doOpt()` - Optimization for multiple interpolations

### Body Style Calculations (QTRPERF.BAS lines 152-166)
- [ ] `CalcBodyStyle()` - Determine body style from weight
- [ ] Drag/lift coefficient defaults by body style
- [ ] Overhang defaults by body style

### PMI Worksheets (QTRPERF.BAS)
- [ ] Engine PMI calculation from components
- [ ] Transmission PMI calculation
- [ ] Tire/wheel PMI calculation

---

## Priority Implementation List

### High Priority (Core Accuracy)
1. **DTABY 2D Interpolation** - Required for accurate ENGINE() curve generation
2. **Full TABY Lagrangian** - Improves HP curve interpolation accuracy
3. **CalcWork() Integration** - Fuel system affects HP curve shape
4. **Shift Timing (DTShift)** - Currently not applying 0.2s/0.25s shift delay properly

### Medium Priority (Feature Completeness)
5. **Graph Data Export** - Match VB6's 4 graph types
6. **QuarterJr Mode** - Synthetic curve from peak HP only
7. **Validation Functions** - Input range checking
8. **Print Output Format** - Detailed parameter output

### Low Priority (Polish)
9. **Body Style Defaults** - Auto-calculate aero coefficients
10. **PMI Worksheets** - Calculate PMI from component weights
11. **RPM Histogram** - Engine RPM distribution graph

---

## Files to Create/Modify

### New Files Needed
1. `src/domain/physics/vb6/dtaby.ts` - 2D Lagrangian interpolation
2. `src/domain/physics/vb6/validation.ts` - Input validation functions
3. `src/domain/physics/vb6/quarterJr.ts` - QuarterJr mode calculations
4. `src/domain/physics/vb6/graphData.ts` - Graph data structures

### Files to Modify
1. `src/domain/physics/vb6/engineCurve.ts` - Use DTABY for interpolation
2. `src/domain/physics/vb6/vb6SimulationStep.ts` - Fix shift timing
3. `src/domain/physics/models/vb6Exact.ts` - Add graph data output

---

## Notes

### VB6 Quirks to Preserve
1. **1-indexed arrays** - VB6 uses 1-based indexing throughout
2. **Single precision** - VB6 uses Single (32-bit float), not Double
3. **Reflection formula** - AMax clamping uses `AGS = AMAX - (AGS - AMAX)`
4. **GoTo statements** - VB6 uses GoTo for control flow (converted to if/else)

### Key Formulas Reference
```
// Distance integration (TIMESLIP.FRM:1280)
Dist(L) = ((2*PQWT*(time(L)-Time0) + Vel0^2)^1.5 - Vel0^3) / (3*PQWT) + Dist0

// Time from velocity (TIMESLIP.FRM:1229, 1268)
time(L) = VelSqrd / (2*PQWT) + Time0

// PMI Work factor (TIMESLIP.FRM:1247)
Work = (2*PI/60)^2 / (12*550*dtk1)

// HP chain (TIMESLIP.FRM:1250-1251)
HP = (HPSave - HPEngPMI) * ClutchSlip
HP = ((HP * TGEff * Efficiency - HPChasPMI) / TireSlip) - DragHP

// Trap speed (TIMESLIP.FRM:1392, 1400)
MPH = Z5 * 66 / (time_at_finish - SaveTime)
```
