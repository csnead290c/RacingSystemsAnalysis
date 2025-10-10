# RSACLASSIC Benchmark Test Results

## Summary Table

| Benchmark | Length | Expected ET | Actual ET | Δ ET | Expected MPH | Actual MPH | Δ MPH | Status |
|-----------|--------|-------------|-----------|------|--------------|------------|-------|--------|
| **SuperGas_Pro** | EIGHTH | 6.27s ± 0.20 | 5.35s | **-0.920s** | 108.2 ± 3.0 | 131.3 | **+23.1** | ❌ |
| SuperGas_Pro | QUARTER | 9.90s ± 0.30 | 8.34s | **-1.555s** | 135.1 ± 4.0 | 165.7 | **+30.6** | ❌ |
| **TA_Dragster_Pro** | EIGHTH | 3.56s ± 0.12 | 4.91s | **+1.350s** | 205.3 ± 5.0 | 164.9 | **-40.4** | ❌ |
| TA_Dragster_Pro | QUARTER | 5.52s ± 0.12 | 7.19s | **+1.670s** | 243.1 ± 6.0 | 221.5 | **-21.6** | ❌ |
| **ProStock_Pro** | EIGHTH | 4.37s ± 0.12 | 4.87s | **+0.500s** | 160.9 ± 4.0 | 163.1 | +2.2 ✓ | ❌ |
| ProStock_Pro | QUARTER | 6.80s ± 0.15 | 7.21s | **+0.415s** | 202.3 ± 5.0 | 216.2 | **+13.9** | ❌ |
| **FunnyCar_Pro** | EIGHTH | 3.37s ± 0.10 | 4.94s | **+1.575s** | 243.5 ± 6.0 | 167.1 | **-76.4** | ❌ |
| FunnyCar_Pro | QUARTER | 4.98s ± 0.10 | 7.22s | **+2.245s** | 297.0 ± 7.0 | 227.6 | **-69.4** | ❌ |
| **Motorcycle_Pro** | EIGHTH | 7.63s ± 0.25 | 6.86s | **-0.765s** | 91.1 ± 3.0 | 95.3 | **+4.2** | ❌ |
| Motorcycle_Pro | QUARTER | 11.99s ± 0.30 | 11.10s | **-0.890s** | 111.3 ± 3.0 | 113.3 | +2.0 ✓ | ❌ |
| **SuperComp_Pro** | EIGHTH | 5.66s ± 0.18 | 4.98s | **-0.675s** | 120.4 ± 4.0 | 148.1 | **+27.7** | ❌ |
| SuperComp_Pro | QUARTER | 8.90s ± 0.20 | 7.62s | **-1.280s** | 151.6 ± 4.0 | 187.3 | **+35.7** | ❌ |
| **Motorcycle_Jr** | EIGHTH | 7.45s ± 0.25 | 6.92s | **-0.525s** | 89.4 ± 3.0 | 95.6 | **+6.2** | ❌ |
| Motorcycle_Jr | QUARTER | 12.00s ± 0.30 | 11.17s | **-0.835s** | 104.5 ± 3.0 | 113.8 | **+9.3** | ❌ |
| **ETRacer_Jr** | EIGHTH | 8.60s ± 0.30 | 7.83s | **-0.765s** | 80.3 ± 3.0 | 88.0 | **+7.7** | ❌ |
| ETRacer_Jr | QUARTER | 13.50s ± 0.35 | 12.35s | **-1.155s** | 100.8 ± 3.5 | 108.4 | **+7.6** | ❌ |
| **EXP_Jr** | EIGHTH | 5.15s ± 0.15 | 4.94s | **-0.205s** | 130.3 ± 4.0 | 151.4 | **+21.1** | ❌ |
| EXP_Jr | QUARTER | 8.18s ± 0.20 | 7.54s | **-0.640s** | 160.2 ± 4.0 | 189.9 | **+29.7** | ❌ |
| **EXP_050523_Jr** | EIGHTH | 5.06s ± 0.15 | 4.91s | -0.145s ✓ | 132.5 ± 4.0 | 153.6 | **+21.1** | ❌ |
| EXP_050523_Jr | QUARTER | 8.04s ± 0.20 | 7.46s | **-0.575s** | 163.5 ± 4.0 | 192.8 | **+29.3** | ❌ |

## Analysis by Vehicle Type

### Converter Vehicles (Too Fast - No Torque Multiplication)
**SuperGas_Pro, SuperComp_Pro, ETRacer_Jr**

| Vehicle | Length | ET Delta | MPH Delta | Issue |
|---------|--------|----------|-----------|-------|
| SuperGas_Pro | EIGHTH | -0.920s | +23.1 mph | Converter not implemented |
| SuperGas_Pro | QUARTER | -1.555s | +30.6 mph | Converter not implemented |
| SuperComp_Pro | EIGHTH | -0.675s | +27.7 mph | Converter not implemented |
| SuperComp_Pro | QUARTER | -1.280s | +35.7 mph | Converter not implemented |
| ETRacer_Jr | EIGHTH | -0.765s | +7.7 mph | Converter not implemented |
| ETRacer_Jr | QUARTER | -1.155s | +7.6 mph | Converter not implemented |

**Problem:** Without torque multiplication at launch, cars accelerate too quickly initially but lack the low-end torque boost that converters provide.

### High-Power Clutch Vehicles (Too Slow - Insufficient Launch)
**FunnyCar_Pro, TA_Dragster_Pro**

| Vehicle | Length | ET Delta | MPH Delta | Issue |
|---------|--------|----------|-----------|-------|
| FunnyCar_Pro | EIGHTH | +1.575s | -76.4 mph | Clutch slip + nitro modeling |
| FunnyCar_Pro | QUARTER | +2.245s | -69.4 mph | Clutch slip + nitro modeling |
| TA_Dragster_Pro | EIGHTH | +1.350s | -40.4 mph | Clutch slip limiting |
| TA_Dragster_Pro | QUARTER | +1.670s | -21.6 mph | Clutch slip limiting |

**Problem:** Clutch slip not implemented - engine can't maintain high RPM during launch. Also, nitro fuel characteristics not modeled.

### Pro Stock (Mixed - Clutch Needs Work)
**ProStock_Pro**

| Vehicle | Length | ET Delta | MPH Delta | Issue |
|---------|--------|----------|-----------|-------|
| ProStock_Pro | EIGHTH | +0.500s | +2.2 mph ✓ | Clutch launch timing |
| ProStock_Pro | QUARTER | +0.415s | +13.9 mph | Clutch launch timing |

**Problem:** MPH close on eighth mile, but ET consistently slow. Clutch slip control needs refinement.

### Motorcycles (Too Fast - Clutch Lockup Issues)
**Motorcycle_Pro, Motorcycle_Jr**

| Vehicle | Length | ET Delta | MPH Delta | Issue |
|---------|--------|----------|-----------|-------|
| Motorcycle_Pro | EIGHTH | -0.765s | +4.2 mph | Clutch lockup behavior |
| Motorcycle_Pro | QUARTER | -0.890s | +2.0 mph ✓ | Clutch lockup behavior |
| Motorcycle_Jr | EIGHTH | -0.525s | +6.2 mph | Clutch lockup behavior |
| Motorcycle_Jr | QUARTER | -0.835s | +9.3 mph | Clutch lockup behavior |

**Problem:** Clutch lockup = true, but behavior not correctly implemented. Too much power delivery early.

### EXP Class (Too Fast - Clutch Slip)
**EXP_Jr, EXP_050523_Jr**

| Vehicle | Length | ET Delta | MPH Delta | Issue |
|---------|--------|----------|-----------|-------|
| EXP_Jr | EIGHTH | -0.205s | +21.1 mph | Clutch slip control |
| EXP_Jr | QUARTER | -0.640s | +29.7 mph | Clutch slip control |
| EXP_050523_Jr | EIGHTH | -0.145s ✓ | +21.1 mph | Clutch slip control |
| EXP_050523_Jr | QUARTER | -0.575s | +29.3 mph | Clutch slip control |

**Problem:** ET close but MPH way off. Power delivery profile incorrect.

## Key Findings

### Passing Metrics (3 out of 40)
1. **ProStock_Pro EIGHTH MPH:** 163.1 vs 160.9 ± 4.0 ✓
2. **Motorcycle_Pro QUARTER MPH:** 113.3 vs 111.3 ± 3.0 ✓
3. **EXP_050523_Jr EIGHTH ET:** 4.91s vs 5.06s ± 0.15 ✓

### Worst Failures
1. **FunnyCar_Pro EIGHTH MPH:** -76.4 mph (massively underpowered)
2. **FunnyCar_Pro QUARTER MPH:** -69.4 mph (massively underpowered)
3. **TA_Dragster_Pro EIGHTH MPH:** -40.4 mph (significantly underpowered)
4. **SuperComp_Pro QUARTER MPH:** +35.7 mph (way too fast)
5. **SuperGas_Pro QUARTER MPH:** +30.6 mph (way too fast)

### Pattern Summary
- **Converter vehicles:** All too fast (ET and MPH)
- **High-power clutch vehicles:** All too slow (ET and MPH)
- **Motorcycles:** Moderately too fast (ET), MPH close
- **EXP class:** ET close, MPH too high

## Critical Missing Features

### 1. Torque Converter Implementation (URGENT)
**Affects:** SuperGas_Pro, SuperComp_Pro, ETRacer_Jr (6 tests)

```typescript
// Needed in RSACLASSIC
if (vehicle.converter) {
  const stallRPM = converter.stallRPM ?? 2500;
  const torqueMult = converter.torqueMult ?? 1.5;
  
  // Apply multiplication below stall
  if (rpm < stallRPM) {
    tq_lbft *= torqueMult;
  } else {
    // Taper multiplication as RPM increases
    const taper = Math.max(0, 1 - (rpm - stallRPM) / 1000);
    tq_lbft *= 1 + (torqueMult - 1) * taper;
  }
}
```

### 2. Clutch Slip Control (URGENT)
**Affects:** ProStock_Pro, TA_Dragster_Pro, FunnyCar_Pro, Motorcycles, EXP (14 tests)

```typescript
// Needed in RSACLASSIC
if (vehicle.clutch) {
  const slipRPM = clutch.slipRPM ?? 3000;
  
  // Limit engine RPM during launch phase
  if (state.v_fps < 30) { // Low speed
    rpm = Math.min(rpm, slipRPM);
  }
  
  // Handle lockup
  if (clutch.lockup && state.v_fps > 60) {
    // Full engagement
  }
}
```

### 3. Nitro Fuel Modeling (HIGH PRIORITY)
**Affects:** FunnyCar_Pro (2 tests)

Nitro provides significantly more power than gasoline. Current HP curves may need fuel-specific multipliers.

## Next Steps

1. **Implement torque converter** → Should fix 6 tests
2. **Implement clutch slip** → Should fix 14 tests
3. **Add nitro fuel characteristics** → Should fix 2 tests
4. **Fine-tune launch parameters** → Improve remaining tests

## Updated Configs Status

✅ **ProStock_Pro:** Full 14-point HP curve (7000-9500 rpm)
✅ **TA_Dragster_Pro:** Full 12-point HP curve (6000-11500 rpm)
✅ **FunnyCar_Pro:** Full 9-point nitro HP curve (6400-8000 rpm)
✅ **SuperComp_Pro:** Full 14-point HP curve (3500-10000 rpm)
✅ **SuperGas_Pro:** Full 13-point HP curve (3500-9500 rpm)
✅ **Motorcycle_Pro:** Full 9-point HP curve (5000-8500 rpm)
✅ **Motorcycle_Jr:** Full 9-point HP curve (5000-8500 rpm)
✅ **ETRacer_Jr:** Full 9-point HP curve (3000-6500 rpm)
✅ **EXP_Jr:** Full 9-point HP curve (5000-9000 rpm)
✅ **EXP_050523_Jr:** Full 9-point HP curve (5000-9000 rpm)

All torque curves now have complete data from Quarter Pro/Jr printouts.
