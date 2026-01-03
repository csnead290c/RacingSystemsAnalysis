# Line-by-Line VB6 vs TypeScript Comparison

## Initial Values (VB6 lines 192-201)

| Variable | VB6 | TypeScript | Match? |
|----------|-----|------------|--------|
| ilc | 109 | 109 | ✓ |
| PHI | 1 | 1 | ✓ |
| icdtq | 0.995 | 0.995 | ✓ |
| icdrpm | 1 | 1 | ✓ |
| metq | 0.818 | 0.818 | ✓ |
| mehp | 0.778 | 0.778 | ✓ |
| lcetq | 1 | 1 | ✓ |
| PortVETQ | 0.987 | 0.987 | ✓ |
| CarbVETQ | `1 - (0.135 * CID * crvf / gc_CarbCFM.Value) ^ 1.25` | `1 - Math.pow(0.135 * CID * crvf / carbCFM, 1.25)` | ✓ |
| lcehp | 1 | 1 | ✓ |
| PortVEHP | 0.98 | 0.98 | ✓ |
| CarbVEHP | `1 - (0.17 * CID * crvf / gc_CarbCFM.Value) ^ 1.25` | `1 - Math.pow(0.17 * CID * crvf / carbCFM, 1.25)` | ✓ |

## Iteration Loop - Peak TQ Calculations (VB6 lines 214-228)

| Line | VB6 Formula | TypeScript Formula | Match? |
|------|-------------|-------------------|--------|
| 214-217 | `If itr = 1 Then acrit = 4.4 Else acrit = 4.2 * (524 / (4.2 * tqfps)) ^ 0.181` | `if (itr === 1) { acrit = 4.4; } else { acrit = 4.2 * Math.pow(524 / (4.2 * tqfps), 0.181); }` | ✓ |
| 219 | `If gc_NoInValves.Value > 1 Then acrit = acrit / (137 / 133)` | `if (noInValves > 1) acrit = acrit / (137 / 133);` | ✓ |
| 220 | `If gc_Fuel.Value = 3 Then acrit = acrit / 1.06` | `if (fuel === 3) acrit = acrit / 1.06;` | ✓ |
| 221 | `astar = acrit / (BArea / athroat)` | `const astarTQ = acrit / (BArea / athroat);` | ✓ |
| 223-227 | `If astar < 1 Then psitq = cdi ^ 1.56 * astar ^ 0.44 Else psitq = cdi ^ 1.56 * astar ^ (-3 * 0.44)` | Same logic with Math.pow | ✓ |
| 228 | `psitq = psitq - 4.3 * (cdi - astar) ^ 2` | `psitq = psitq - 4.3 * Math.pow(cdi - astarTQ, 2);` | ✓ |

## RamVETQ Calculation (VB6 line 230-231)

VB6:
```vb
RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13
RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq
```

TypeScript:
```typescript
const RamVETQ = (1 + 0.177 * epek * crektq * Math.pow(psitq, 1.52) * Math.pow(noInValves, 0.13))
                * icdtq * Math.pow(camk[2], 0.5) * lcetq;
```

**Match: ✓**

## RPM @ Peak TQ (VB6 lines 239-253)

| Line | VB6 Formula | TypeScript Formula | Match? |
|------|-------------|-------------------|--------|
| 239 | `tqfps = (5683.2 / 60) * S3QB ^ 0.172 * bore ^ 0 * flrqs ^ 0.42` | `tqfps = (5683.2 / 60) * Math.pow(S3QB, 0.172) * Math.pow(bore, 0) * Math.pow(flrqs, 0.42);` | ✓ |
| 242-243 | `PumpVE = VETQ ^ 0.32 * crvf ^ -2.7 * EqvPS ^ 0.608` <br> `PumpVE = PumpVE * camk(gc_CamType.Value, 1) ^ 0.5` | Same with Math.pow | ✓ |
| 247-248 | `RamVE = RamVETQ ^ 0.015 * niv ^ 0.047` <br> `RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5` | Same with Math.pow | ✓ |
| 252 | `tqfps = tqfps * EFF ^ -0.22 * efik ^ 0 * metq ^ 0.59` | `tqfps = tqfps * Math.pow(EFFTQ, -0.22) * Math.pow(efik, 0) * Math.pow(metq, 0.59);` | ✓ |
| 253 | `gc_RPMPeakTQ.Value = FPStoRPM(tqfps)` | `rpmPeakTQ = fpsToRPM(tqfps, flrqs, stroke);` | ✓ |

## Checking for Discrepancies

All formulas appear to match exactly. The issue must be in:
1. A subtle difference in variable scope or initialization
2. A calculation that happens outside the main iteration loop
3. A difference in how intermediate values are updated between iterations

## Next: Check variable updates between iterations
