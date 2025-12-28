# Engine Calculation Debugging

## User Test Case
From VB6 screenshot:
- 8 cylinders, Vee (inline=0)
- 4.03" bore, 3.48" stroke, 5.85" rod
- 12.9:1 compression ratio
- Normal Flat Tappet cam (type 4), 264° duration
- Gasoline, Carburetor 750 CFM
- Common Plenum manifold, Straight runners, 96% flow
- 1 intake valve, 2.05" dia, 250 CFM @ 28" H2O, 4.03" test bore

## Expected VB6 Output
- CID: 355.1
- Peak HP: **451 @ 6600 RPM**
- Peak TQ: **410 @ 5400 RPM**
- HP/CID: 1.27
- TQ/CID: 1.15
- Shift: 7150 RPM
- Redline: 8250 RPM

## TypeScript Output (Current)
Need to test and compare...

## Key VB6 Calculation Steps to Verify

### 1. Initial Setup
- CID calculation: PI * (bore/2)^2 * stroke * noCyl
- BQS = bore / stroke
- B2QS = bore * BQS
- S3QB = stroke^2 / BQS
- LRQS = rod / stroke
- flrqs = 1 + (0.348 / LRQS)^1.99
- crvf = 1 + 1/(CR - 1)

### 2. Fuel Properties (Gasoline)
- GAM = 1.28
- aqf = 14.7
- fhv = 20700
- crx = 11.5

### 3. EFI Cylinder-to-Cylinder Effect (efik)
For Carb: efik = 1 (no effect)

### 4. Curved Runner Effect (crektq, crekhp)
For Straight: crektq = 1, crekhp = 1

### 5. Engine Plenum Manifold Effect (epek)
For Common Plenum + Vee (inline=0): epek = 0.9

### 6. Intake Flow Calculations
- BArea = PI * bore^2 / 4
- athroat = PI * valveDia^2 / 4 * noInValves
- ICFM = maxInFlow * SQRT(deltaP / 28)
- cdi calculation (single vs multiple valves)
- ICFMnorm, EqvPS

### 7. Iteration Loop (5 iterations)
Each iteration updates:
- xqs (intake valve closing effect)
- acrit, astar, psitq (intake ramming)
- RamVETQ
- EffCR, EFF
- tqfps, rpmPeakTQ
- gtqcid, NTQ(1) (gross torque)
- metq (mechanical efficiency)
- ntqcid, NTQ(2) (net torque)
- CarbVETQ, PortVETQ (pumping losses)
- Similar for HP calculations

### 8. Final Calculations
- peakTQ = (NTQ(1) + NTQ(2)) / 2
- peakHP = (NHP(1) + NHP(2)) / 2
- Adjustments based on HP/TQ relationship
- Shift = 1.08 * rpmPeakHP
- Redline calculation

## Potential Issues to Check

1. **Inline parameter**: VB6 uses 0=Vee, 1=Inline, 2=Flat. Verify correct usage.

2. **Cam factors**: Verify camk array is correctly indexed and used.

3. **Iteration convergence**: Ensure metq and mehp are updated correctly each iteration.

4. **Pumping losses**: Verify CarbVETQ and PortVETQ calculations and updates.

5. **Ramming effects**: Verify RamVETQ and RamVEHP calculations.

6. **Friction model**: Verify friction() function matches VB6 exactly.

7. **Final averaging**: Verify NTQ(1), NTQ(2) averaging and adjustments.

8. **Rounding**: Verify RPM values are rounded to nearest 50.

## Next Steps

1. Add detailed console.log() tracing to enginePerf.ts
2. Run user test case and capture all intermediate values
3. Compare with VB6 step-by-step
4. Identify exact point where calculations diverge
5. Fix the discrepancy
6. Re-test until 100% match
