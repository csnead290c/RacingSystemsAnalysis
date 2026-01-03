# Manual Calculation Trace - Finding the 7 HP / 50 RPM Discrepancy

## Test Case Inputs (Curved Runners)
- noCyl: 8, inline: 0 (Vee), bore: 4.03, stroke: 3.48, rod: 5.85
- CR: 12.9, camType: 4, inCamDur: 264
- carb: true, carbCFM: 750, fuel: 1 (gasoline)
- manifold: 1 (common plenum), curved: true
- manFlow: 96, noInValves: 1, valveDia: 2.05, maxInFlow: 250
- deltaP: 28, refBore: 4.0

## Expected VB6 Output
- Peak HP: 461 @ 6650 RPM
- Peak TQ: 415 @ 5450 RPM

## TypeScript Output
- Peak HP: 451 @ 6600 RPM
- Peak TQ: 410 @ 5400 RPM

## Discrepancy Pattern
- HP: -10 HP (-2.2%)
- TQ: -5 lb-ft (-1.2%)
- HP RPM: -50 RPM (-0.75%)
- TQ RPM: -50 RPM (-0.92%)

## Analysis
The systematic nature of the error (consistent percentage across both HP and TQ, exact 50 RPM offset) suggests:

1. **Not a formula error** - Individual formula errors would show different patterns
2. **Not a constant error** - All constants match exactly
3. **Not a rounding error** - The 50 RPM offset is exactly one rounding increment, but the HP/TQ deficits don't match rounding

## Hypothesis: Variable Initialization or Scope Issue

Since all formulas match exactly, the issue must be in:
- Variable initialization order
- Variable scope between iterations
- A calculation that updates a variable used in subsequent iterations

## Next Steps: Check Variable Updates Between Iterations

Looking at the VB6 code structure:
1. Initial values set before loop (lines 192-201)
2. Loop runs 5 times (line 204)
3. Variables updated at END of each iteration:
   - metq (line 275)
   - mehp (line 371)
   - CarbVETQ (line 298)
   - CarbVEHP (line 394)
   - PortVETQ (line 302)
   - PortVEHP (line 398)
   - lcetq (line 305-306)
   - lcehp (line 401-402)
   - icdtq, icdrpm (lines 462-472 - off-design cam modeling)

## Critical Finding: Off-Design Cam Modeling Happens AFTER Iteration Loop!

Looking at VB6 lines 405-473, the off-design camshaft modeling happens INSIDE the iteration loop but AFTER the HP calculations. This means:
- Iteration 1: Uses initial icdtq=0.995, icdrpm=1
- Iterations 2-5: Use updated icdtq and icdrpm values

Let me verify the TypeScript implementation handles this correctly...
