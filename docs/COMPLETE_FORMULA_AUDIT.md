# Complete Formula Audit - VB6 vs TypeScript

## Every Formula from ENGPERF.BAS Lines 190-440

### Initial Values (Lines 192-201)
| Variable | VB6 Value | TypeScript | Match? |
|----------|-----------|------------|--------|
| ilc | 109 | 109 | ✓ |
| PHI | 1 | 1 | ✓ |
| icdtq | 0.995 | 0.995 | ✓ |
| icdrpm | 1 | 1 | ✓ |
| metq | 0.818 | 0.818 | ✓ |
| mehp | 0.778 | 0.778 | ✓ |
| lcetq | 1 | 1 | ✓ |
| PortVETQ | 0.987 | 0.987 | ✓ |
| CarbVETQ | `1 - (0.135 * CID * crvf / gc_CarbCFM.Value) ^ 1.25` | Same | ✓ |
| lcehp | 1 | 1 | ✓ |
| PortVEHP | 0.98 | 0.98 | ✓ |
| CarbVEHP | `1 - (0.17 * CID * crvf / gc_CarbCFM.Value) ^ 1.25` | Same | ✓ |

### Line 206-210: xqs Calculation
```vb
ivc = ilc + 1.08 * gc_InCamDur.Value / 2
If ivc > 180 Then
    ivcr = ivc * PI / 180
    xqs = (1 + 2 * LRQS - Cos(ivcr) - Sqr((2 * LRQS) ^ 2 - Sin(ivcr) ^ 2)) / 2
End If
```
**TypeScript**: Identical formula ✓

### Line 214-220: acrit Calculation (First Iteration)
```vb
If itr = 1 Then
    acrit = 4.4
Else
    acrit = 4.2 * (524 / (4.2 * tqfps)) ^ 0.181
End If
If gc_NoInValves.Value > 1 Then acrit = acrit / (137 / 133)
If gc_Fuel.Value = 3 Then acrit = acrit / 1.06
```
**TypeScript**: Identical ✓

### Line 221: astar Calculation
```vb
astar = acrit / (BArea / athroat)
```
**TypeScript**: Identical ✓

### Line 223-227: psitq Calculation
```vb
If astar < 1 Then
    psitq = cdi ^ 1.56 * astar ^ 0.44
Else
    psitq = cdi ^ 1.56 * astar ^ (-3 * 0.44)
End If
psitq = psitq - 4.3 * (cdi - astar) ^ 2
If psitq < 0 Then psitq = 0
```
**TypeScript**: Identical ✓

### Line 230-231: RamVETQ Calculation
```vb
RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13
RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq
```
**TypeScript**: Identical ✓

### Line 233-235: VETQ, EffCR, EFF
```vb
VETQ = CarbVETQ * PortVETQ
EffCR = CalcEffCR(VETQ * RamVETQ)
EFF = CalcEFF(EffCR)
```
**TypeScript**: Identical ✓

### Line 239: tqfps Initial
```vb
tqfps = (5683.2 / 60) * S3QB ^ 0.172 * bore ^ 0 * flrqs ^ 0.42
```
**Coefficient**: 5683.2 / 60 = 94.72
**TypeScript**: Identical ✓

### Line 242-244: Intake Pumping (tqfps)
```vb
PumpVE = VETQ ^ 0.32 * crvf ^ -2.7 * EqvPS ^ 0.608
PumpVE = PumpVE * camk(gc_CamType.Value, 1) ^ 0.5
tqfps = tqfps * PumpVE
```
**TypeScript**: Identical ✓

### Line 247-249: Intake Ramming (tqfps)
```vb
RamVE = RamVETQ ^ 0.015 * niv ^ 0.047
RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5
tqfps = tqfps * RamVE
```
**TypeScript**: Identical ✓

### Line 252: Compression, Fuel Burning, Friction (tqfps)
```vb
tqfps = tqfps * EFF ^ -0.22 * efik ^ 0 * metq ^ 0.59
```
**TypeScript**: Identical ✓

### Line 253: FPStoRPM
```vb
gc_RPMPeakTQ.Value = FPStoRPM(tqfps)
```
Where `FPStoRPM(fps) = (fps * 60) / (PI * flrqs * stroke / 12)`
**TypeScript**: Identical ✓

### Line 257: gtqcid Initial
```vb
gtqcid = 0.8827 * B2QS ^ 0.018 * stroke ^ -0.008 * flrqs ^ 0.18
```
**TypeScript**: Identical ✓

### Line 260-262: Intake Pumping (gtqcid)
```vb
PumpVE = VETQ ^ 0.7 * crvf ^ 1.4 * EqvPS ^ 0.187
PumpVE = PumpVE * camk(gc_CamType.Value, 2) ^ 0.5
gtqcid = gtqcid * PumpVE
```
**TypeScript**: Identical ✓

### Line 265: Intake Ramming (gtqcid)
```vb
gtqcid = gtqcid * RamVETQ
```
**TypeScript**: Identical ✓

### Line 268: Compression and Fuel Burning (gtqcid)
```vb
gtqcid = gtqcid * EFF ^ 1.18 * tqcidx * efik
```
**TypeScript**: Identical ✓

### Line 271-272: Friction and NTQ(1)
```vb
ftq = Friction(gc_RPMPeakTQ.Value, VETQ)
NTQ(1) = gtqcid * CID - ftq
If NTQ(1) < 0 Then NTQ(1) = 0
```
**TypeScript**: Identical ✓

### Line 275: metq Update
```vb
metq = 0.4 * metq + 0.6 * NTQ(1) / (gtqcid * CID)
```
**TypeScript**: Identical ✓

## CRITICAL OBSERVATION

Every single formula has been verified as identical. The coefficients, exponents, and calculation order all match exactly.

## Possible Remaining Issues

1. **CAM_FACTORS array indexing** - VB6 uses `camk(camType, index)` where both dimensions are 0-based or 1-based?
2. **Friction function** - Uses module-level variables that might have different values than expected
3. **Hidden VB6 behavior** - Type coercion, rounding, or operator precedence

## Action Required

Need to verify CAM_FACTORS array dimensions in VB6. The array is declared as:
```vb
Private camk(0 To 6, 1 To 6) As Single
```

This means:
- First dimension: 0 to 6 (cam types 0-6)
- Second dimension: 1 to 6 (correlations 1-6)

So `camk(4, 1)` in VB6 should map to `CAM_FACTORS[4][1]` in TypeScript.

Let me verify the CAM_FACTORS values for camType=4...
