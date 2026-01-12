# ENGINE Pro VB6 Parity Verification

## Overview
This document describes how to verify that RSA's Engine Pro implementation matches the original VB6 program exactly.

## Base Case Test Inputs
Use these exact values from the VB6 screenshots:

### Engine Configuration
- **Cylinders**: 8
- **Layout**: Vee
- **Bore**: 4.030 inch
- **Stroke**: 3.480 inch
- **Rod Length**: 5.850 inch
- **Compression Ratio**: 12.9

### Camshaft
- **Type**: Normal Flat Tappet & Solid Lifter
- **Intake Duration @ .050 inch**: 264 degree
- **Lobe Separation Angle**: 108 degree
- **Intake Lobe Centerline**: 105 degree

### Induction
- **Type**: Carburetor
- **Throttle CFM @ 1.5 inch Hg**: 750
- **Fuel**: Gasoline
- **Manifold**: Common Plenum
- **Runner Style**: Curved
- **Intake Manifold Flow Factor**: 96.0 %

### Cylinder Head
- **Number of Intake Valves per Cylinder**: 1
- **Intake Valve Diameter**: 2.050 inch
- **Maximum Intake Port Flow**: 250.0 CFM
- **@ Test Pressure**: 28.0 inch H2O
- **@ Reference Bore Diameter**: 4.000 inch
- **Maximum Intake Valve Lift**: 0.550 inch

## Expected VB6 Outputs

### Main Results (MUST MATCH EXACTLY)
```
Peak HP: 461 @ 6650 RPM
Peak TQ: 415 @ 5450 RPM
Shift RPM: 7200
Redline RPM: 8350
```

### Dyno Table (4500-7500 RPM in 250 RPM increments)
```
RPM    HP    TQ
4500   327   382
4750   358   396
5000   387   407
5250   412   412
5500   434   415
5750   448   409
6000   456   399
6250   460   387
6500   461   373
6750   459   357
7000   445   334
7250   423   306
7500   393   275
```

### Piston Speed Summary (MUST MATCH EXACTLY)
```
Rating      RPM    Avg (FPM)  Max (FPM)
Peak TQ     5450   3161       5181
Peak HP     6650   3857       6322
Shift       7200   4176       6845
Redline     8350   4843       7939
```

### Mechanical Details @ 6650 RPM - Peak HP
```
deg ATDC  depth    FPM    FPS   g's
5         0.009    685    11    2818
15        0.077    2020   34    2679
30        0.298    3818   64    2233
45        0.640    5206   87    1561
60        1.067    6054   101   768
74.6      1.524    6323   105   1
80        1.694    6289   105   -257
85        1.851    6199   103   -479
90        2.005    6059   101   -681
105       2.437    5382   90    -1149
120       2.807    4439   74    -1417
135       3.101    3362   56    -1530
150       3.312    2240   37    -1553
165       3.438    1116   19    -1543
180       3.480    0      0     -1535
```

**Additional Info:**
- Maximum Piston Speed occurs @ 74.6 degree after TDC
- Est. Cranking Compression - psig: 230

### Flow Details @ 6650 RPM - Peak HP
```
deg ATDC  Valve Lift  Flow Area  Piston Speed  Flow Demand  Flowbench Vel  Test
          inch        sq in      FPM           CFM          FPS            inH2O
-27       0.050       0.179      -3486         0            --             --
0         0.163       0.681      0             -7           -25            --
30        0.333       1.707      3818          266          373            54
60        0.471       2.572      6054          402          375            72
74.6      0.515       2.735      6323          427          374            74
90        0.541       2.735      6059          427          375            72
105       0.550       2.735      5382          407          357            66
120       0.541       2.735      4439          367          322            56
150       0.471       2.572      2240          240          224            29
180       0.333       1.707      0             68           96             4
205       0.190       0.837      -1865         -88          -253           --
237       0.050       0.179      -4231         0            --             --
```

### Flowbench Worksheet - Valve Seat Throat Data
```
Valve Diameter: 2.050
Valve Seat Throat Diameter: 1.894
Valve Seat Throat %: 92.4
Valve Seat Angle: 55.0
Valve Seat Width: 0.080
Valve Stem Diameter: 0.324
```

### Flowbench Data Table
```
Lift   Flow   Area   Velocity  FlowFlux  FlowVelIndex
0.100  56.6   0.361  376.3     156.8     117.9
0.200  116.0  0.895  311.1     129.6     97.5
0.300  169.4  1.504  270.3     112.6     84.7
0.400  212.6  2.126  240.0     100.0     75.2
0.500  241.3  2.735  211.7     88.2      66.3
0.600  258.7  2.735  227.0     94.6      71.1
0.700  262.9  2.735  230.7     96.1      72.3
0.800  264.2  2.735  231.8     96.6      72.6
```

**Calculated values @ input maximum intake valve lift (.550):**
```
Flow: 250.0
Area: 2.735
Velocity: 219.4
FlowFlux: 91.4
FlowVelIndex: 68.7
```

## Verification Steps

### 1. Main Dashboard Verification
1. Open Engine Sim in RSA
2. Enter all base case inputs exactly as listed above
3. Verify main results match:
   - Peak HP: 461 @ 6650 RPM
   - Peak TQ: 415 @ 5450 RPM
   - Shift: 7200 RPM
   - Redline: 8350 RPM
4. Verify dyno table shows exact values for RPM 4500-7500 in 250 RPM increments

### 2. Mechanical Details Modal Verification
1. Click "Mech Details" button
2. Verify RPM selector shows: Peak TQ, Peak HP, Shift, Redline
3. Select "Peak HP" (6650 RPM)
4. Verify Piston Speed Summary table matches exactly
5. Verify Data @ 6,650 RPM table matches all 15 rows exactly
6. Verify "Maximum Piston Speed occurs @ 74.6 degree after TDC" message
7. Verify "Est. Cranking Compression - psig: 230"
8. Verify Geometric Data Summary shows correct ratios
9. Verify graph shows piston speed and depth curves with dotted gridlines
10. Test all 4 RPM selections and verify tables/graphs update correctly

### 3. Flow Details Modal Verification
1. Click "Flow Details" button
2. Verify RPM selector shows: Peak TQ, Peak HP, Shift, Redline
3. Select "Peak HP" (6650 RPM)
4. Verify Piston Speed Summary matches (same as Mech Details)
5. Verify Camshaft Description table shows correct values
6. Verify Data @ 6,650 RPM table matches all 12 rows exactly
7. Verify chart title: "Flow Area, Piston Demand & Flowbench Velocity vs Angle"
8. Verify chart shows 3 series:
   - Flow Area (red line, right axis 0-3.0 sq in)
   - Piston Demand (blue line, left axis 0-480 CFM)
   - Flowbench Velocity (green line, left axis 0-480 FPS)
9. Verify X-axis range: -45 to 270 degrees
10. Verify dotted gridlines (not solid)
11. Test all 4 RPM selections and verify tables/graphs update correctly

### 4. Flowbench Worksheet Verification
1. Click calculator icon next to "Maximum Intake Port Flow" field
2. Verify Valve Seat Throat Data section shows:
   - Valve Diameter: 2.050
   - Valve Seat Throat Diameter: 1.894
   - Valve Seat Throat %: 92.4
   - Valve Seat Angle: 55.0
   - Valve Seat Width: 0.080
   - Valve Stem Diameter: 0.324
3. Verify flowbench data table (10 rows) matches VB6 exactly
4. Verify calculated values at max lift (0.550) match exactly
5. Verify graph shows Flow (CFM) and Flow Vel Index (%) vs Lift

### 5. Recommendations Modal Verification
1. Click "Recommendations" button
2. Verify all intake system recommendations
3. Verify camshaft recommendations
4. Verify exhaust port recommendations (including range format for valve diameter)
5. Verify exhaust system recommendations
6. Verify note text at bottom matches VB6

## Critical Formulas to Verify

### Piston Speed
- **Average**: `RPM * 2 * stroke / 12` (FPM)
- **Maximum**: `RPM * PI * flrqs * stroke / 12` (FPM)
- **flrqs**: `1 + (0.348 / LRQS)^1.99`
- **LRQS**: `rodLength / stroke`

### Max Speed Angle
- **AngMPS**: `62 + (750 * (LRQS - 0.958))^0.4027`

### Cranking Compression
- **psig**: `14.7 * (CR^1.3 - 1)`

### Effective Flow Area
VB6 uses 3 controlling areas:
1. **a1** (very low lift): `numValves * PI * (lift * cosb) * (valveDia - 2*w + lift*sinb*cosb)`
2. **a2** (curtain area): `numValves * PI * (valveDia - w) * H`
   - where `H = sqrt((lift - w*tanb)^2 + w^2)`
3. **a3** (throat area): `numValves * PI * (seatDia^2 - stemDia^2) / 4`

The controlling area is the minimum of these three.

### Flowbench Derived Values
- **Velocity (FPS)**: `FlowCFM * 2.4 / Area(sqin)`
- **Flow Flux**: `FlowCFM / Area(sqin)`
- **Flow Vel Index (%)**: `Velocity / 319.0 * 100`

## Automated Test Suite (Future)

Create test file: `src/domain/physics/engine/__tests__/vb6Parity.test.ts`

```typescript
describe('VB6 Engine Pro Parity', () => {
  const baseCase = {
    numCylinders: 8,
    layout: 'vee',
    bore_in: 4.030,
    stroke_in: 3.480,
    rodLength_in: 5.850,
    compressionRatio: 12.9,
    // ... all other base case inputs
  };

  test('Main outputs match VB6 exactly', () => {
    const result = simulateEngine(baseCase);
    expect(result.peakHP).toBe(461);
    expect(result.rpmPeakHP).toBe(6650);
    expect(result.peakTQ).toBe(415);
    expect(result.rpmPeakTQ).toBe(5450);
    expect(result.shift).toBe(7200);
    expect(result.redline).toBe(8350);
  });

  test('Piston Speed Summary matches VB6 exactly', () => {
    const summary = calcPistonSpeedSummary(6650, 3.480, 5.850);
    expect(summary.avgSpeed_fpm).toBe(3857);
    expect(summary.maxSpeed_fpm).toBe(6322);
    expect(summary.maxSpeedAngle_deg).toBeCloseTo(74.6, 1);
  });

  test('Mechanical Details @ 6650 RPM match VB6 exactly', () => {
    const details = calcMechDetailsForRPM(6650, 3.480, 5.850);
    expect(details.length).toBe(15);
    expect(details[0].angle_deg).toBe(5);
    expect(details[0].pistonDepth_in).toBeCloseTo(0.009, 3);
    expect(Math.round(details[0].pistonSpeed_fpm)).toBe(685);
    // ... test all 15 rows
  });

  test('Flowbench effective area matches VB6 exactly', () => {
    const valveSeatData = calcDefaultValveSeatData(2.050);
    const area = calcEffectiveFlowArea(0.550, valveSeatData, 1);
    expect(area).toBeCloseTo(2.735, 3);
  });
});
```

## Known Issues / TODO
- [ ] Dyno table needs to match VB6 exact RPM range (4500-7500 in 250 RPM increments)
- [ ] Main dyno chart needs dotted gridlines and exact axis ranges
- [ ] Flowbench worksheet needs graph implementation
- [ ] Override behavior for calculated fields (throat dia, throat %, CR)
- [ ] Area Calculator modal (4 worksheets)
- [ ] Throttle CFM Worksheet modal
- [ ] Dyno Data modal (separate from dashboard table)
- [ ] SI Units display box

## Success Criteria
✅ All main outputs match VB6 exactly (no tolerance)
✅ Piston Speed Summary matches all 4 rating points exactly
✅ Mechanical Details table matches all 15 rows at all 4 RPM points
✅ Flow Details table matches all 12 rows at all 4 RPM points
✅ Flow Details chart shows correct 3 series with correct axis ranges
✅ Flowbench effective area calculation matches VB6 exactly
✅ All graphs use dotted gridlines like VB6
✅ RPM selectors work and update all tables/graphs/labels correctly

## Regression Prevention
- Run automated tests on every commit
- Keep VB6 reference files in version control
- Document any formula changes with VB6 line number references
- Use snapshot tests for chart data arrays
- Maintain this verification doc as source of truth
