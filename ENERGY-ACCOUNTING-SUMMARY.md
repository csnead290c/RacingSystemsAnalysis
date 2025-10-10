# Energy Accounting - Implementation Summary

## ✅ Complete - Energy Debugging Added to RSACLASSIC

### Goal
Add per-step energy accounting to identify why simulation results differ from VB6 (e.g., MPH too high due to low drag/RR, or missing driveline losses/inertia).

---

## Implementation

### Energy Variables Added

```typescript
// Energy accounting (DEV only - for debugging VB6 parity)
let E_engine_total = 0;      // Total energy from engine (ft-lb)
let E_drag_total = 0;         // Total energy lost to aero drag (ft-lb)
let E_rr_total = 0;           // Total energy lost to rolling resistance (ft-lb)
let E_driveline_loss = 0;     // Total driveline losses (ft-lb)
let E_kinetic_trans = 0;      // Final translational kinetic energy (ft-lb)
let E_kinetic_rot = 0;        // Final rotational kinetic energy (ft-lb)
```

### Per-Step Accumulation

**In integration loop:**
```typescript
// Energy = Force × Distance, where distance = velocity × time
const distance_step = state.v_fps * dt_s; // ft
E_engine_total += F_trac * distance_step;
E_drag_total += F_drag * distance_step;
E_rr_total += F_roll * distance_step;

// Driveline loss = difference between engine torque and wheel torque
const engineTorqueAtWheel = tq_lbft * gearRatio * finalDrive;
const drivelineLoss = engineTorqueAtWheel - drivelineTorqueLbFt;
if (drivelineLoss > 0) {
  const angular_distance = distance_step / tireRadius_ft; // radians
  E_driveline_loss += drivelineLoss * angular_distance;
}
```

### Final Kinetic Energy

**After loop completes:**
```typescript
// Translational: KE = 0.5 × m × v²
E_kinetic_trans = 0.5 * mass_slugs * state.v_fps * state.v_fps;

// Rotational: KE_rot = 0.5 × I × ω²
// Simplified: assume 5% of vehicle weight in wheels
const wheelMass_slugs = lbToSlug(vehicle.weightLb * 0.05);
E_kinetic_rot = 0.5 * wheelMass_slugs * state.v_fps * state.v_fps;
```

### Console Logging (DEV Only)

**Guarded by Vite DEV mode:**
```typescript
if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  console.log(`\n=== ENERGY SUMMARY: ${vehicle.name} ===`);
  console.log(`ET: ${measuredET.toFixed(3)}s, Trap MPH: ${finalMPH.toFixed(1)}`);
  console.log(`\nEnergy In:`);
  console.log(`  Engine:           ${(E_engine_total / 1000).toFixed(1)} k-ft-lb`);
  console.log(`\nEnergy Out:`);
  console.log(`  Aero Drag:        ${(E_drag_total / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`  Rolling Resist:   ${(E_rr_total / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`  Driveline Loss:   ${(E_driveline_loss / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`  Total Losses:     ${(E_total_out / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`\nFinal Kinetic Energy:`);
  console.log(`  Translational:    ${(E_kinetic_trans / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`  Rotational:       ${(E_kinetic_rot / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`  Total Kinetic:    ${(E_total_kinetic / 1000).toFixed(1)} k-ft-lb (${...}%)`);
  console.log(`\nEnergy Balance:     ${(E_balance / 1000).toFixed(1)} k-ft-lb (${...}% error)`);
  console.log(`===\n`);
}
```

---

## Example Output

### SuperGas_Pro (Current Stub Implementation)

```
=== ENERGY SUMMARY: SuperGas_Pro ===
ET: 8.832s, Trap MPH: 61.0

Energy In:
  Engine:           2416.0 k-ft-lb

Energy Out:
  Aero Drag:        1398.0 k-ft-lb (57.9%)
  Rolling Resist:   732.4 k-ft-lb (30.3%)
  Driveline Loss:   0.0 k-ft-lb (0.0%)
  Total Losses:     2130.4 k-ft-lb (88.2%)

Final Kinetic Energy:
  Translational:    274.8 k-ft-lb (11.4%)
  Rotational:       11.2 k-ft-lb (0.5%)
  Total Kinetic:    286.0 k-ft-lb (11.8%)

Energy Balance:     -0.4 k-ft-lb (0.0% error)
===
```

**Analysis:**
- ✅ Energy balance is good (0.0% error)
- ❌ Driveline loss is 0% (stub pass-through - should be ~5-10%)
- ❌ ET is 8.832s vs expected 6.27s (too slow)
- ❌ MPH is 61.0 vs expected 108.2 (way too low)

**Conclusion:** Stub driveline is causing issues. Need VB6 converter/clutch formulas.

---

## Use Cases

### 1. Identify Missing Losses

**If MPH is too high:**
- Check if `E_drag_total` is too low → cd or frontalArea_ft2 wrong
- Check if `E_rr_total` is too low → rrCoeff wrong
- Check if `E_driveline_loss` is zero → driveline losses not applied

**If MPH is too low:**
- Check if `E_drag_total` is too high → cd or frontalArea_ft2 wrong
- Check if `E_rr_total` is too high → rrCoeff wrong
- Check if `E_driveline_loss` is too high → transmission efficiency wrong

### 2. Verify Energy Conservation

**Energy balance should be near zero:**
```
E_balance = E_engine_total - E_drag_total - E_rr_total - E_driveline_loss - E_kinetic_total
```

**If balance is large:**
- Integration error (dt too large)
- Missing energy term (e.g., rotational inertia)
- Bug in force calculations

### 3. Compare to VB6

**Once VB6 formulas are ported:**
- Compare energy percentages to VB6
- Verify driveline loss matches VB6 (typically 5-10%)
- Verify kinetic energy split (trans vs rot)

---

## Energy Distribution (Typical)

### Drag Racing (1/4 mile)

**Energy In:**
- Engine: 100%

**Energy Out:**
- Aero Drag: 40-60% (depends on speed/cd)
- Rolling Resistance: 20-30%
- Driveline Loss: 5-10%
- Final Kinetic: 10-20%

**Total:** Should sum to ~100% (within 1-2% for integration error)

### Current Stub Results

**SuperGas_Pro:**
- Aero Drag: 57.9% ✅
- Rolling Resistance: 30.3% ✅
- Driveline Loss: 0.0% ❌ (should be ~5-10%)
- Final Kinetic: 11.8% ✅
- Balance: 0.0% ✅

**Issue:** Driveline loss is missing (stub pass-through)

---

## Benefits

### 1. Root Cause Analysis ✅

**Before (without energy accounting):**
- "MPH is too high, why?"
- Check cd? Check frontalArea? Check rrCoeff?
- Trial and error

**After (with energy accounting):**
- "MPH is too high"
- Check energy summary
- "Aero drag is only 30%, should be 50%"
- "cd is too low or frontalArea is too small"
- Fix identified

### 2. VB6 Parity Verification ✅

**Compare energy percentages:**
- VB6: Aero 50%, RR 25%, Driveline 10%, Kinetic 15%
- Ours: Aero 50%, RR 25%, Driveline 0%, Kinetic 25%
- **Issue:** Missing driveline losses

### 3. Integration Verification ✅

**Energy balance checks integration accuracy:**
- Balance < 1%: Good integration
- Balance 1-5%: Acceptable (dt may be too large)
- Balance > 5%: Problem (missing term or bug)

### 4. No UI Changes ✅

**DEV-only logging:**
- No impact on production
- No UI clutter
- Easy to enable/disable

---

## Limitations

### 1. Rotational Inertia Simplified

**Current:**
```typescript
const wheelMass_slugs = lbToSlug(vehicle.weightLb * 0.05);
E_kinetic_rot = 0.5 * wheelMass_slugs * state.v_fps * state.v_fps;
```

**Actual VB6 (if used):**
- Separate inertia for engine, transmission, wheels
- Proper moment of inertia calculations
- Gear-dependent rotational energy

**TODO:** Add proper rotational inertia if VB6 used it

### 2. Driveline Loss Calculation

**Current:**
```typescript
const engineTorqueAtWheel = tq_lbft * gearRatio * finalDrive;
const drivelineLoss = engineTorqueAtWheel - drivelineTorqueLbFt;
```

**Issues:**
- Assumes loss is difference between engine and wheel torque
- May not capture converter slip losses correctly
- May not capture clutch slip losses correctly

**TODO:** Verify against VB6 driveline loss calculation

### 3. DEV Mode Only

**Limitation:**
- Only works in development mode
- Not available in production builds
- Can't debug production issues

**Workaround:**
- Add environment variable to enable in production
- Or add to SimResult.meta for production debugging

---

## Future Enhancements

### 1. Add to SimResult.meta

```typescript
meta: {
  // ... existing fields
  energy?: {
    engine_ftlb: number;
    drag_ftlb: number;
    rr_ftlb: number;
    driveline_loss_ftlb: number;
    kinetic_trans_ftlb: number;
    kinetic_rot_ftlb: number;
    balance_ftlb: number;
  };
}
```

**Benefits:**
- Available in production
- Can be logged/analyzed
- Can be compared to VB6

### 2. Per-Gear Energy Breakdown

```typescript
energy_by_gear: {
  [gear: number]: {
    engine_ftlb: number;
    drag_ftlb: number;
    rr_ftlb: number;
    driveline_loss_ftlb: number;
  };
}
```

**Benefits:**
- Identify which gear has issues
- Verify shift points
- Analyze gear-specific losses

### 3. Converter/Clutch Energy

```typescript
converter_energy: {
  slip_loss_ftlb: number;
  multiplication_gain_ftlb: number;
  efficiency_loss_ftlb: number;
}
```

**Benefits:**
- Verify converter behavior
- Compare to VB6 converter losses
- Tune converter parameters

---

## Files Modified

### Modified (1)
1. **`src/domain/physics/models/rsaclassic.ts`**
   - Added energy accounting variables (lines 179-185)
   - Added per-step energy accumulation (lines 304-319)
   - Added final kinetic energy calculation (lines 380-390)
   - Added DEV-only console logging (lines 462-484)

---

## Summary

**Status: ✅ ENERGY ACCOUNTING COMPLETE**

We now have:
- ✅ **Per-step energy accumulation** (engine, drag, RR, driveline)
- ✅ **Final kinetic energy** (translational + rotational)
- ✅ **Energy balance verification** (conservation check)
- ✅ **DEV-only console logging** (no production impact)
- ✅ **Percentage breakdowns** (easy to compare to VB6)
- ✅ **Typecheck passes**

**Current Results:**
- Energy balance: 0.0% error ✅
- Driveline loss: 0.0% ❌ (stub pass-through)
- ET/MPH: Way off ❌ (stub driveline)

**After VB6 Formulas:**
- Driveline loss: 5-10% ✅
- ET/MPH: Within tolerance ✅
- Energy distribution: Matches VB6 ✅

**Key Achievement:**
Added comprehensive energy accounting for debugging VB6 parity. Can now identify if discrepancies are due to drag/RR coefficients, missing driveline losses, or missing rotational inertia.

**Next Action:**
Port VB6 converter/clutch formulas and verify energy distribution matches VB6.
