# VB6 Driveline - Implementation Summary

## ✅ Complete - VB6 Driveline Structure Created

### Goal
Replace custom converter/clutch logic with VB6-compatible driveline functions that will receive exact VB6 formulas once ported.

---

## Files Created

### `src/domain/physics/vb6/driveline.ts` ✅

**VB6 Driveline Functions (Stubs Ready for VB6 Formulas)**

```typescript
export function vb6Converter(
  engineTorque: number,
  engineRPM: number,
  wheelRPM: number,
  gearRatio: number,
  finalDrive: number,
  stallRPM: number,
  torqueMult: number
): { Twheel: number; engineRPM_out: number }

export function vb6Clutch(
  engineTorque: number,
  engineRPM: number,
  wheelRPM: number,
  gearRatio: number,
  finalDrive: number,
  slipRPM: number,
  lockup: boolean
): { Twheel: number; engineRPM_out: number; coupling: number }

export function vb6DirectDrive(
  engineTorque: number,
  gearRatio: number,
  finalDrive: number
): number
```

---

## Implementation Details

### VB6 Converter (Placeholder)

**Current Stub:**
```typescript
// TEMPORARY STUB: Pass-through (no converter effect)
const Twheel = engineTorque * gearRatio * finalDrive;
const engineRPM_out = engineRPM;
return { Twheel, engineRPM_out };
```

**TODO:** Replace with exact VB6 converter formula
- Speed ratio (SR) = output RPM / input RPM
- Torque ratio (TR) = f(SR, torqueMult)
- Efficiency (ETA) = f(SR)
- Stall behavior when wheelRPM is low

**VB6 Parameters Found:**
- Stall RPM (from QTRPERF.BAS)
- Torque Multiplication (1.0-4.0)
- Converter Slippage
- Lock-up option

### VB6 Clutch (Placeholder)

**Current Stub:**
```typescript
// TEMPORARY STUB: Pass-through (no clutch slip)
const Twheel = engineTorque * gearRatio * finalDrive;
const engineRPM_out = engineRPM;
const coupling = 1.0; // Full coupling
return { Twheel, engineRPM_out, coupling };
```

**TODO:** Replace with exact VB6 clutch formula
- Slip behavior when engine RPM > slip RPM
- Coupling factor based on RPM difference
- Lock-up after 1st gear if enabled

**VB6 Parameters Found:**
- Slip RPM (from QTRPERF.BAS)
- Lock-up option

### VB6 Direct Drive

**Implementation:**
```typescript
export function vb6DirectDrive(
  engineTorque: number,
  gearRatio: number,
  finalDrive: number
): number {
  return engineTorque * gearRatio * finalDrive;
}
```

This is the standard mechanical connection (no converter/clutch).

---

## Changes to `rsaclassic.ts`

### Removed Custom Logic ❌

**Deleted:**
- ❌ K-factor converter model (TR/ETA curves)
- ❌ Custom clutch coupling logic
- ❌ Launch de-rate calculations
- ❌ Parasitic loss calculations
- ❌ Speed ratio calculations
- ❌ All heuristic converter/clutch behavior

**Total Lines Removed:** ~150 lines of custom logic

### Added VB6 Driveline Calls ✅

**Converter (1st gear only):**
```typescript
if (converter && state.gearIdx === 0) {
  const stallRPM = converter.stallRPM ?? 3000;
  const torqueMult = converter.torqueMult ?? 2.0;
  const result = vb6Converter(tq_lbft, rpm, wheelRPM, gearRatio, finalDrive, stallRPM, torqueMult);
  drivelineTorqueLbFt = result.Twheel;
  effectiveRPM = result.engineRPM_out;
}
```

**Clutch (all gears):**
```typescript
if (clutch) {
  const slipRPM = clutch.slipRPM ?? clutch.launchRPM ?? 0;
  const lockup = clutch.lockup ?? false;
  const result = vb6Clutch(tq_lbft, rpm, wheelRPM, gearRatio, finalDrive, slipRPM, lockup);
  drivelineTorqueLbFt = result.Twheel;
  effectiveRPM = result.engineRPM_out;
  clutchCoupling = result.coupling;
}
```

**Direct Drive (no converter/clutch):**
```typescript
else {
  drivelineTorqueLbFt = vb6DirectDrive(tq_lbft, gearRatio, finalDrive);
  effectiveRPM = rpm;
}
```

### Simplified Flow ✅

**Before (Custom Logic):**
1. Calculate RPM from speed
2. Apply K-factor converter model (TR, ETA, SR curves)
3. Apply launch de-rate
4. Apply parasitic losses
5. Apply clutch coupling
6. Calculate wheel torque

**After (VB6 Functions):**
1. Calculate engine torque
2. Apply fuel delivery factor
3. Call VB6 driveline function (converter/clutch/direct)
4. Get wheel torque directly

**Result:** Cleaner, simpler, ready for VB6 formulas

---

## VB6 Source References

### From QTRPERF.BAS

**Converter Parameters:**
- `gc_SlipStallRPM` - Stall RPM (lines 14-78)
- `gc_TorqueMult` - Torque Multiplication (lines 659-667)
- `gc_Slippage` - Converter Slippage (lines 1204-1207)
- `gc_LockUp` - Lock-up option (line 1209)

**Clutch Parameters:**
- `gc_SlipStallRPM` - Slip RPM (lines 1228-1234)
- `gc_TransType` - Transmission Type (converter vs clutch) (lines 635-640)

**Transmission Type:**
```vb
With gc_TransType
    .HasMinMax = True: .MinVal_Normal = -1: .MaxVal_Normal = 0
    .Msg = "Transmission Type?": .caption = .Msg
    .StatusMsg = "Option buttons used to select either a torque converter or clutch"
End With
```

---

## Comparison: Before vs After

### Before (Custom K-Factor Model)

**Converter:**
- K-factor TR curve: `TR = 2.0 - 1.6*SR + 0.6*SR²`
- K-factor ETA curve: `ETA = 0.65*SR + 0.15`
- Launch de-rate: `0.70 → 1.00` over 0.30s
- Parasitic losses: `5% const + 1e-6*wheelRPM²`
- Stall behavior: custom logic
- **Total:** ~80 lines of custom code

**Clutch:**
- Custom coupling calculation
- Launch slip cap logic
- Lockup ramp over 0.25s
- RPM-based slip reduction
- **Total:** ~70 lines of custom code

### After (VB6 Stubs)

**Converter:**
- Single function call: `vb6Converter()`
- Returns: `{ Twheel, engineRPM_out }`
- **Total:** 3 lines of code

**Clutch:**
- Single function call: `vb6Clutch()`
- Returns: `{ Twheel, engineRPM_out, coupling }`
- **Total:** 4 lines of code

**Reduction:** ~150 lines → ~10 lines (93% reduction)

---

## TODO Items

### Phase 1: Locate VB6 Formulas ⏳
1. ⏳ Find converter simulation code in VB6 source
2. ⏳ Find clutch simulation code in VB6 source
3. ⏳ Verify stall behavior
4. ⏳ Verify slip behavior
5. ⏳ Verify lockup logic

### Phase 2: Port VB6 Formulas ⏳
6. ⏳ Port exact VB6 converter formula to `vb6Converter()`
7. ⏳ Port exact VB6 clutch formula to `vb6Clutch()`
8. ⏳ Verify TR/ETA calculations match VB6
9. ⏳ Verify coupling calculations match VB6

### Phase 3: Verify Results ⏳
10. ⏳ Test converter behavior (stall, multiplication, efficiency)
11. ⏳ Test clutch behavior (slip, lockup)
12. ⏳ Compare to VB6 outputs
13. ⏳ Verify ET/MPH match VB6

---

## Benefits

### 1. Clean Separation ✅
- VB6 driveline logic isolated in separate file
- Easy to verify against VB6 source
- Easy to update when VB6 code is found

### 2. No Custom Heuristics ✅
- Removed all K-factor approximations
- Removed all launch de-rate hacks
- Removed all parasitic loss guesses
- Ready for exact VB6 formulas

### 3. Simplified Code ✅
- 93% reduction in driveline code
- Single function calls instead of complex logic
- Easier to understand and maintain

### 4. Type Safety ✅
- Clear function signatures
- Explicit return types
- Compiler-verified

---

## Current Behavior

### Converter (Stub)
- **Input:** Engine torque, RPM, wheel RPM, gear ratio, final drive, stall RPM, torque mult
- **Output:** Wheel torque = engine torque × gear × final (no multiplication yet)
- **Effect:** Direct drive (no converter effect until VB6 formula is ported)

### Clutch (Stub)
- **Input:** Engine torque, RPM, wheel RPM, gear ratio, final drive, slip RPM, lockup
- **Output:** Wheel torque = engine torque × gear × final (no slip yet)
- **Coupling:** 1.0 (full coupling until VB6 formula is ported)
- **Effect:** Direct drive (no clutch slip until VB6 formula is ported)

### Direct Drive
- **Input:** Engine torque, gear ratio, final drive
- **Output:** Wheel torque = engine torque × gear × final
- **Effect:** Standard mechanical connection (correct)

---

## Testing Strategy

### Phase 1: Current State ✅
- Stubs pass through torque directly
- No converter/clutch effects yet
- Results should match direct drive

### Phase 2: VB6 Formulas (Future)
1. Implement VB6 converter formula
2. Test against simple cases (stall, multiplication)
3. Compare to VB6 outputs
4. Verify TR/ETA curves

### Phase 3: Full Integration (Future)
1. Run benchmark tests
2. Compare ET/MPH to VB6
3. Verify converter behavior matches VB6
4. Verify clutch behavior matches VB6

---

## Files Modified

### Created (1)
1. **`src/domain/physics/vb6/driveline.ts`** - VB6 driveline functions

### Modified (1)
2. **`src/domain/physics/models/rsaclassic.ts`**
   - Removed ~150 lines of custom converter/clutch logic
   - Added VB6 driveline function calls (lines 200-227)
   - Simplified torque calculation flow
   - Removed unused imports

---

## Summary

**Status: ✅ VB6 DRIVELINE STRUCTURE COMPLETE**

We now have:
- ✅ VB6 converter function (stub ready for VB6 formula)
- ✅ VB6 clutch function (stub ready for VB6 formula)
- ✅ VB6 direct drive function (correct implementation)
- ✅ All custom logic removed
- ✅ Clean integration in rsaclassic.ts
- ✅ Typecheck passes

**Current Behavior:**
- Converter: Pass-through (no effect until VB6 formula)
- Clutch: Pass-through (no slip until VB6 formula)
- Direct drive: Correct mechanical connection

**Next Action:**
Locate and port exact VB6 converter/clutch formulas from simulation code, then replace the stub implementations.

**Key Achievement:**
Removed all custom heuristics and created clean VB6-compatible structure ready to receive exact VB6 formulas. Code is 93% smaller and infinitely more maintainable.
