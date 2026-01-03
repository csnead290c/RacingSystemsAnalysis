# Complete Coefficient and Exponent Verification

## Peak TQ Calculations

### acrit calculation (VB6 line 217)
- VB6: `acrit = 4.2 * (524 / (4.2 * tqfps)) ^ 0.181`
- TS: `acrit = 4.2 * Math.pow(524 / (4.2 * tqfps), 0.181)`
- ✓ Match

### psitq calculation (VB6 lines 224-228)
- VB6: `psitq = cdi ^ 1.56 * astar ^ 0.44` (if astar < 1)
- VB6: `psitq = cdi ^ 1.56 * astar ^ (-3 * 0.44)` (if astar >= 1)
- VB6: `psitq = psitq - 4.3 * (cdi - astar) ^ 2`
- TS: Same with Math.pow
- ✓ Match

### RamVETQ calculation (VB6 lines 230-231)
- VB6: `RamVETQ = 1 + 0.177 * epek * crektq * psitq ^ 1.52 * niv ^ 0.13`
- VB6: `RamVETQ = RamVETQ * icdtq * camk(gc_CamType.Value, 2) ^ 0.5 * lcetq`
- TS: Same with Math.pow
- ✓ Match

### tqfps calculation (VB6 line 239)
- VB6: `tqfps = (5683.2 / 60) * S3QB ^ 0.172 * bore ^ 0 * flrqs ^ 0.42`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for tqfps (VB6 lines 242-243)
- VB6: `PumpVE = VETQ ^ 0.32 * crvf ^ -2.7 * EqvPS ^ 0.608`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 1) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Intake Ramming for tqfps (VB6 lines 247-248)
- VB6: `RamVE = RamVETQ ^ 0.015 * niv ^ 0.047`
- VB6: `RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 1) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel/Friction for tqfps (VB6 line 252)
- VB6: `tqfps = tqfps * EFF ^ -0.22 * efik ^ 0 * metq ^ 0.59`
- TS: Same with Math.pow
- ✓ Match

### gtqcid calculation (VB6 line 257)
- VB6: `gtqcid = 0.8827 * B2QS ^ 0.018 * stroke ^ -0.008 * flrqs ^ 0.18`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for gtqcid (VB6 lines 260-261)
- VB6: `PumpVE = VETQ ^ 0.7 * crvf ^ 1.4 * EqvPS ^ 0.187`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 2) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel for gtqcid (VB6 line 268)
- VB6: `gtqcid = gtqcid * EFF ^ 1.18 * tqcidx * efik`
- TS: Same with Math.pow
- ✓ Match

### ntqcid calculation (VB6 line 279)
- VB6: `ntqcid = 0.6966 * B2QS ^ 0.058 * stroke ^ -0.016 * flrqs ^ 0.62`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for ntqcid (VB6 lines 282-283)
- VB6: `PumpVE = VETQ ^ 1.66 * crvf ^ 1.76 * EqvPS ^ 0.221`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 3) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Intake Ramming for ntqcid (VB6 lines 287-288)
- VB6: `RamVE = 1 + 0.218 * epek * crektq * psitq ^ 1.22 * niv ^ 0.039`
- VB6: `RamVE = RamVE * icdtq * camk(gc_CamType.Value, 3) ^ 0.5 * lcetq`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel/Friction for ntqcid (VB6 line 292)
- VB6: `ntqcid = ntqcid * EFF ^ 1.22 * tqcidx * efik * metq ^ 0.075`
- TS: Same with Math.pow
- ✓ Match

## Peak HP Calculations

### acrit calculation for HP (VB6 lines 310-313)
- VB6: `If itr = 1 Then acrit = 4.4 Else acrit = 4.2 * (622 / (4.2 * hpfps)) ^ 0.152`
- TS: Same with Math.pow
- ✓ Match

### psihp calculation (VB6 lines 319-324)
- VB6: `If astar < 1 Then psihp = cdi ^ 1.52 * astar ^ 0.48 Else psihp = cdi ^ 1.52 * astar ^ (-3 * 0.48)`
- VB6: `psihp = psihp - 1.5 * (cdi - astar) ^ 2`
- TS: Same with Math.pow
- ✓ Match

### RamVEHP calculation (VB6 lines 326-327)
- VB6: `RamVEHP = 1 + 0.202 * epek * crekhp * psihp ^ 1.9 * niv ^ 0.145`
- VB6: `RamVEHP = RamVEHP * icdtq * camk(gc_CamType.Value, 5) ^ 0.5 * lcehp`
- TS: Same with Math.pow
- ✓ Match

### hpfps calculation (VB6 line 335)
- VB6: `hpfps = (6896.4 / 60) * S3QB ^ 0.198 * bore ^ 0 * flrqs ^ 1.25`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for hpfps (VB6 lines 338-339)
- VB6: `PumpVE = VEHP ^ 0.14 * crvf ^ -1.2 * EqvPS ^ 0.604`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 4) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Intake Ramming for hpfps (VB6 lines 343-344)
- VB6: `RamVE = RamVEHP ^ -0.035 * niv ^ 0.049`
- VB6: `RamVE = RamVE * icdrpm * camk(gc_CamType.Value, 4) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel/Friction for hpfps (VB6 line 348)
- VB6: `hpfps = hpfps * EFF ^ 0.07 * efik ^ 0 * mehp ^ 0.49`
- TS: Same with Math.pow
- ✓ Match

### gtqhp calculation (VB6 line 353)
- VB6: `gtqhp = 0.6261 * B2QS ^ 0.022 * stroke ^ 0.032 * flrqs ^ -0.48`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for gtqhp (VB6 lines 356-357)
- VB6: `PumpVE = VEHP ^ -0.02 * crvf ^ 0.36 * EqvPS ^ 0.184`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 5) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel for gtqhp (VB6 line 364)
- VB6: `gtqhp = gtqhp * EFF ^ 0.76 * tqcidx * efik`
- TS: Same with Math.pow
- ✓ Match

### ntqhp calculation (VB6 line 375)
- VB6: `ntqhp = 0.4506 * B2QS ^ 0.111 * stroke ^ 0.037 * flrqs ^ 0.16`
- TS: Same with Math.pow
- ✓ Match

### Intake Pumping for ntqhp (VB6 lines 378-379)
- VB6: `PumpVE = VEHP ^ 0.88 * crvf ^ 0.72 * EqvPS ^ 0.19`
- VB6: `PumpVE = PumpVE * camk(gc_CamType.Value, 6) ^ 0.5`
- TS: Same with Math.pow
- ✓ Match

### Intake Ramming for ntqhp (VB6 lines 383-384)
- VB6: `RamVE = 1 + 0.243 * epek * crekhp * psihp ^ 1.7 * niv ^ 0.082`
- VB6: `RamVE = RamVE * icdtq * camk(gc_CamType.Value, 6) ^ 0.5 * lcehp`
- TS: Same with Math.pow
- ✓ Match

### Compression/Fuel/Friction for ntqhp (VB6 line 388)
- VB6: `ntqhp = ntqhp * EFF ^ 0.86 * tqcidx * efik * mehp ^ 0.065`
- TS: Same with Math.pow
- ✓ Match

## Conclusion

**ALL COEFFICIENTS AND EXPONENTS MATCH EXACTLY**

The 7 HP / 50 RPM discrepancy is NOT due to formula errors. The issue must be elsewhere.
