# VB6 Config Validation - Summary

## ✅ Complete - Strict Config Validation, No Silent Defaults

### Goal
Ensure VB6 parity by requiring all critical parameters in benchmark configs and preventing silent defaults in the simulation code.

---

## Problem Statement

**Before:** The simulation could inject default values for missing parameters, leading to:
- Silent failures where tests pass with wrong data
- Difficulty identifying which parameters are actually from VB6
- Inconsistent results due to guessed values

**After:** Strict validation ensures:
- All required VB6 parameters must be present in configs
- Missing parameters throw clear errors at test setup
- No silent defaults for critical parameters
- All values traceable to VB6 printouts

---

## Implementation

### 1. Enhanced Validation Function

**File:** `src/domain/physics/fixtures/benchmark-configs.ts`

**Added Validations:**

```typescript
export function validateBenchmarkConfig(config: ExtendedVehicleConfig): void {
  const missing: string[] = [];
  
  // Environment parameters (VB6 air density)
  if (config.env.elevation === undefined) missing.push('env.elevation');
  if (config.env.barometerInHg === undefined) missing.push('env.barometerInHg');
  if (config.env.temperatureF === undefined) missing.push('env.temperatureF');
  if (config.env.humidityPct === undefined) missing.push('env.humidityPct');
  
  // Vehicle parameters
  if (!config.vehicle.weightLb) missing.push('vehicle.weightLb');
  if (!config.vehicle.tireDiaIn && !config.vehicle.tireRolloutIn) {
    missing.push('vehicle.tireDiaIn OR vehicle.tireRolloutIn');
  }
  if (config.vehicle.rolloutIn === undefined) missing.push('vehicle.rolloutIn');
  if (!config.vehicle.rearGear && !config.vehicle.finalDrive) {
    missing.push('vehicle.rearGear OR vehicle.finalDrive');
  }
  if (!config.vehicle.gearRatios || config.vehicle.gearRatios.length === 0) {
    missing.push('vehicle.gearRatios[]');
  }
  if (!config.vehicle.shiftRPM || config.vehicle.shiftRPM.length === 0) {
    missing.push('vehicle.shiftRPM[]');
  }
  
  // Aerodynamics
  if (config.vehicle.frontalArea_ft2 === undefined) missing.push('vehicle.frontalArea_ft2');
  if (config.vehicle.cd === undefined) missing.push('vehicle.cd');
  
  // Torque curve
  if (!config.vehicle.torqueCurve || config.vehicle.torqueCurve.length === 0) {
    missing.push('vehicle.torqueCurve[]');
  } else {
    const hasValidData = config.vehicle.torqueCurve.every(pt => 
      pt.rpm !== undefined && (pt.hp !== undefined || pt.tq_lbft !== undefined)
    );
    if (!hasValidData) {
      missing.push('vehicle.torqueCurve[] must have rpm and (hp OR tq_lbft) for each point');
    }
  }
  
  // Converter parameters (if present)
  if (config.vehicle.converter) {
    if (config.vehicle.converter.stallRPM === undefined) {
      missing.push('vehicle.converter.stallRPM (required if converter present)');
    }
    if (config.vehicle.converter.torqueMult === undefined) {
      missing.push('vehicle.converter.torqueMult (required if converter present)');
    }
    if (config.vehicle.converter.slipRatio === undefined) {
      missing.push('vehicle.converter.slipRatio (required if converter present)');
    }
  }
  
  // Clutch parameters (if present)
  if (config.vehicle.clutch) {
    if (config.vehicle.clutch.slipRPM === undefined && config.vehicle.clutch.launchRPM === undefined) {
      missing.push('vehicle.clutch.slipRPM OR vehicle.clutch.launchRPM (required if clutch present)');
    }
    if (config.vehicle.clutch.slipRatio === undefined) {
      missing.push('vehicle.clutch.slipRatio (required if clutch present)');
    }
  }
  
  // Array length validations
  if (config.vehicle.gearRatios && config.vehicle.shiftRPM) {
    const numGears = config.vehicle.gearRatios.length;
    const numShifts = config.vehicle.shiftRPM.length;
    if (numShifts !== numGears - 1 && numShifts !== numGears) {
      missing.push(`vehicle.shiftRPM[] length mismatch (${numShifts} shifts for ${numGears} gears)`);
    }
  }
  
  if (config.vehicle.gearEff && config.vehicle.gearRatios) {
    if (config.vehicle.gearEff.length !== config.vehicle.gearRatios.length) {
      missing.push(`vehicle.gearEff[] length mismatch`);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Benchmark config '${config.name}' is missing required VB6 parameters:\n` +
      missing.map(f => `  - ${f}`).join('\n') +
      `\n\nAll required fields must be present from VB6 printouts - NO DEFAULTS ALLOWED.` +
      `\nThis ensures VB6 parity by preventing silent defaults in the simulation.`
    );
  }
}
```

### 2. Removed Unacceptable Defaults

**File:** `src/domain/physics/models/rsaclassic.ts`

**Changed:**
```typescript
// BEFORE: Silent defaults
const T_drag = vb6AeroTorque(rho, cd ?? 0.38, frontalArea_ft2 ?? 22, state.v_fps, tireRadius_ft);

// AFTER: Assert required (validation catches missing)
const T_drag = vb6AeroTorque(rho, cd!, frontalArea_ft2!, state.v_fps, tireRadius_ft);
```

**Kept Acceptable Defaults (VB6 has these):**
```typescript
// VB6 default rolling resistance coefficient
const cmu = vehicle.rrCoeff ?? CMU; // CMU = 0.025

// VB6 default transmission efficiency
const currentGearEff = gearEff?.[state.gearIdx] ?? (transEff ?? 0.9);

// VB6 default clutch slippage (calculated from slipRPM)
const slippage = clutch.slipRatio ?? 1.0025;

// VB6 default lockup behavior
const lockup = clutch.lockup ?? false;
```

---

## Required Parameters

### Environment (VB6 Air Density)
- ✅ `elevation` - Elevation above sea level (ft)
- ✅ `barometerInHg` - Barometric pressure (inHg)
- ✅ `temperatureF` - Temperature (°F)
- ✅ `humidityPct` - Relative humidity (%)

### Vehicle Core
- ✅ `weightLb` - Vehicle weight (lb)
- ✅ `tireDiaIn` OR `tireRolloutIn` - Tire size
- ✅ `rolloutIn` - Rollout distance (inches)
- ✅ `rearGear` OR `finalDrive` - Final drive ratio
- ✅ `gearRatios[]` - Transmission gear ratios
- ✅ `shiftRPM[]` - Shift points per gear

### Aerodynamics
- ✅ `frontalArea_ft2` - Frontal area (ft²)
- ✅ `cd` - Drag coefficient

### Engine
- ✅ `torqueCurve[]` - Engine torque/HP curve
  - Each point must have `rpm` and (`hp` OR `tq_lbft`)

### Converter (if present)
- ✅ `stallRPM` - Converter stall RPM
- ✅ `torqueMult` - Torque multiplication factor
- ✅ `slipRatio` - Converter slippage factor

### Clutch (if present)
- ✅ `slipRPM` OR `launchRPM` - Clutch slip/launch RPM
- ✅ `slipRatio` - Clutch slippage factor

---

## Optional Parameters (VB6 Defaults Allowed)

### Vehicle
- `rrCoeff` - Rolling resistance (default: CMU = 0.025)
- `transEff` - Transmission efficiency (default: 0.9)
- `gearEff[]` - Per-gear efficiency (default: transEff)
- `wheelbaseIn` - Wheelbase (inches)
- `overhangIn` - Front overhang (inches)
- `tireWidthIn` - Tire width (inches)
- `liftCoeff` - Lift coefficient

### Converter/Clutch
- `lockup` - Lock-up after 1st gear (default: false)
- `launchRPM` - Launch RPM (default: stallRPM or slipRPM)
- `diameterIn` - Converter diameter (inches)

### Environment
- `windMph` - Wind speed (mph)
- `windAngleDeg` - Wind angle (degrees)
- `trackTempF` - Track temperature (°F)
- `tractionIndex` - Traction index (1-10)

---

## Error Messages

### Example: Missing Required Parameters

```
Error: Benchmark config 'ProStock_Pro' is missing required VB6 parameters:
  - env.elevation
  - env.barometerInHg
  - vehicle.cd
  - vehicle.frontalArea_ft2
  - vehicle.torqueCurve[]

All required fields must be present from VB6 printouts - NO DEFAULTS ALLOWED.
This ensures VB6 parity by preventing silent defaults in the simulation.
```

### Example: Invalid Torque Curve

```
Error: Benchmark config 'ProStock_Pro' is missing required VB6 parameters:
  - vehicle.torqueCurve[] must have rpm and (hp OR tq_lbft) for each point

All required fields must be present from VB6 printouts - NO DEFAULTS ALLOWED.
This ensures VB6 parity by preventing silent defaults in the simulation.
```

### Example: Array Length Mismatch

```
Error: Benchmark config 'ProStock_Pro' is missing required VB6 parameters:
  - vehicle.shiftRPM[] length mismatch (2 shifts for 3 gears)

All required fields must be present from VB6 printouts - NO DEFAULTS ALLOWED.
This ensures VB6 parity by preventing silent defaults in the simulation.
```

---

## Benefits

### 1. Explicit Configuration ✅
- All values must come from VB6 printouts
- No guessing or approximations
- Clear source of truth

### 2. Early Error Detection ✅
- Errors thrown at test setup, not during simulation
- Clear error messages with missing field names
- Easy to identify what needs to be added

### 3. VB6 Parity Confidence ✅
- Know exactly which values are from VB6
- No silent defaults masking missing data
- Can verify every parameter against VB6 source

### 4. Maintainability ✅
- Easy to add new required parameters
- Validation logic in one place
- Self-documenting (error messages explain requirements)

---

## Usage

### In Test Files

```typescript
import { BENCHMARK_CONFIGS, validateBenchmarkConfig } from '../fixtures/benchmark-configs';

describe('VB6 Parity Tests', () => {
  it('should validate benchmark config', () => {
    const config = BENCHMARK_CONFIGS['ProStock_Pro'];
    
    // This will throw if required parameters are missing
    validateBenchmarkConfig(config);
    
    // Now safe to use config
    const result = rsaclassic.simulate(config);
    // ...
  });
});
```

### Adding New Benchmarks

```typescript
export const BENCHMARK_CONFIGS: Record<string, ExtendedVehicleConfig> = {
  MyNewBenchmark: {
    name: 'MyNewBenchmark',
    env: {
      elevation: 100,          // REQUIRED
      barometerInHg: 29.92,    // REQUIRED
      temperatureF: 75,        // REQUIRED
      humidityPct: 50,         // REQUIRED
    },
    vehicle: {
      weightLb: 3000,          // REQUIRED
      tireDiaIn: 30,           // REQUIRED (or tireRolloutIn)
      rolloutIn: 12,           // REQUIRED
      finalDrive: 3.73,        // REQUIRED (or rearGear)
      gearRatios: [2.5, 1.5],  // REQUIRED
      shiftRPM: [6500],        // REQUIRED (numGears - 1)
      frontalArea_ft2: 20,     // REQUIRED
      cd: 0.35,                // REQUIRED
      torqueCurve: [           // REQUIRED
        { rpm: 2000, hp: 200 },
        { rpm: 6000, hp: 500 },
      ],
      // Optional parameters...
    },
  },
};
```

---

## Changes Made

### Modified (2)
1. **`src/domain/physics/fixtures/benchmark-configs.ts`**
   - Enhanced `validateBenchmarkConfig()` with comprehensive checks
   - Added environment parameter validation
   - Added converter/clutch parameter validation
   - Added torque curve validation
   - Improved error messages

2. **`src/domain/physics/models/rsaclassic.ts`**
   - Removed silent defaults for `cd` and `frontalArea_ft2`
   - Used non-null assertion (`!`) for required parameters
   - Kept acceptable defaults for VB6-defined values

### Created (1)
3. **`VB6-CONFIG-VALIDATION.md`** - This document

---

## Validation

### Typecheck ✅
```bash
npm run typecheck
# ✅ PASSED
```

### Test Behavior

**Before:**
```typescript
// Missing cd - simulation uses default 0.38
const result = rsaclassic.simulate(config);
// Test passes with wrong data!
```

**After:**
```typescript
// Missing cd - validation throws error
validateBenchmarkConfig(config);
// Error: Benchmark config 'X' is missing required VB6 parameters:
//   - vehicle.cd
```

---

## Summary

**Status: ✅ COMPLETE - STRICT CONFIG VALIDATION**

We now have:
- ✅ **Comprehensive validation** for all required VB6 parameters
- ✅ **Clear error messages** with missing field names
- ✅ **No silent defaults** for critical parameters
- ✅ **VB6 parity confidence** - all values traceable to source
- ✅ **Typecheck passes**

**Key Achievement:**
Eliminated silent defaults as a source of VB6 discrepancy. All benchmark configs must now explicitly provide required VB6 parameters, ensuring test results are based on actual VB6 data, not guessed values.

**Next Action:**
1. Run validation on all existing benchmark configs
2. Fill in any missing required parameters from VB6 printouts
3. Run VB6 parity tests with validated configs
4. Verify results match VB6 within tolerance
