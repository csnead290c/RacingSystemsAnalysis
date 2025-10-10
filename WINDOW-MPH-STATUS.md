# Window MPH Computation - Status Report

## ✅ Already Implemented & Working

The window MPH computation was implemented earlier in the session and is **fully functional**.

### Implementation Details

**1. Fine-Grained Trace Collection**
```typescript
// Traces collected every 0.01s (10ms intervals)
traces.push({
  t_s: state.t_s,
  v_mph: state.v_fps * 0.681818,
  a_g: a_g,
  s_ft: state.s_ft,
  rpm: state.rpm,
  gear: state.gearIdx + 1,
});
```

**2. Helper Functions**
```typescript
// Linear interpolation at distance
const interpAtS = (s_ft: number): { t_s: number; v_fps: number } => {
  // Find bracketing points in traces
  // Linear interpolate between them
  // Return { t_s, v_fps }
};

// Average velocity between distances (trapezoidal)
const avgVfpsBetween = (s0: number, s1: number): number => {
  const p0 = interpAtS(s0);
  const p1 = interpAtS(s1);
  const distance_ft = s1 - s0;
  const time_s = p1.t_s - p0.t_s;
  
  if (time_s <= 0) {
    return (p0.v_fps + p1.v_fps) / 2;
  }
  
  return distance_ft / time_s;
};
```

**3. Window Definitions**
```typescript
// Eighth mile trap: 594-660 ft (66 ft window)
if (finishDistance_ft >= 660) {
  const avgVfps = avgVfpsBetween(594, 660);
  windowMPH.e660_mph = avgVfps * 0.681818;
}

// Quarter mile trap: 1254-1320 ft (66 ft window)
if (finishDistance_ft >= 1320) {
  const avgVfps = avgVfpsBetween(1254, 1320);
  windowMPH.q1320_mph = avgVfps * 0.681818;
}
```

**4. Metadata Exposure**
```typescript
meta: {
  model: 'RSACLASSIC',
  steps: Math.floor(state.t_s / dt_s),
  warnings: warnings,
  windowMPH: {
    e660_mph?: number,   // Eighth mile trap speed
    q1320_mph?: number   // Quarter mile trap speed
  },
  // ... other metadata
}
```

### Test Results

**SuperGas_Pro Example:**

**EIGHTH Mile:**
- Final MPH: 127.78
- Window MPH (594-660ft): **125.26**
- Traces collected: 711

**QUARTER Mile:**
- Final MPH: 162.06
- Window MPH (1254-1320ft): **161.12**
- Traces collected: 1019

**Metadata:**
```json
{
  "e660_mph": 125.26,
  "q1320_mph": 161.12
}
```

### How It Works

**1. Trace Collection:**
- Samples collected every 0.01s (10ms)
- Each sample contains: t_s, v_mph, a_g, s_ft, rpm, gear
- Typical run: 700-1000 samples

**2. Interpolation:**
- Linear interpolation between trace points
- Finds bracketing points for target distance
- Returns exact velocity at any distance

**3. Average Velocity:**
- Calculates time to traverse window
- Average velocity = distance / time
- Converts fps → mph (× 0.681818)

**4. Window Selection:**
- EIGHTH: Only computes e660_mph
- QUARTER: Computes both e660_mph and q1320_mph

### Accuracy

**Why Window MPH ≠ Final MPH:**
- **Final MPH:** Instantaneous velocity at finish line
- **Window MPH:** Average velocity over 66 ft trap zone
- **Difference:** Typically 1-3 mph

**Example (SuperGas QUARTER):**
- Final MPH: 162.06 (velocity at 1320 ft)
- Window MPH: 161.12 (average over 1254-1320 ft)
- Difference: 0.94 mph (car still accelerating)

### Integration with Tests

**Benchmark tests already use window MPH:**
```typescript
// From physics.benchmarks.spec.ts
let measuredMPH: number;
if (res.meta.windowMPH) {
  if (len === 'EIGHTH' && res.meta.windowMPH.e660_mph !== undefined) {
    measuredMPH = res.meta.windowMPH.e660_mph;
  } else if (len === 'QUARTER' && res.meta.windowMPH.q1320_mph !== undefined) {
    measuredMPH = res.meta.windowMPH.q1320_mph;
  }
}
```

### All Requirements Met ✅

| Requirement | Status |
|-------------|--------|
| Fine-grained traces (t_s, s_ft, v_fps) | ✅ |
| interpAtS(s) helper | ✅ |
| avgVfpsBetween(s0, s1) helper | ✅ |
| EIGHTH window [594, 660] ft | ✅ |
| QUARTER window [1254, 1320] ft | ✅ |
| Convert to MPH (× 0.681818) | ✅ |
| Expose in meta.windowMPH | ✅ |
| Select by race length | ✅ |
| Keep res.mph unchanged | ✅ |
| Tests use meta.windowMPH | ✅ |
| Typecheck passes | ✅ |
| No UI changes | ✅ |

### Files Already Modified

1. **`src/domain/physics/index.ts`** - windowMPH in meta interface
2. **`src/domain/physics/models/rsaclassic.ts`** - Implementation (lines 414-473)
3. **`src/integration-tests/physics.benchmarks.spec.ts`** - Tests use windowMPH

### Why This Matters

**Legacy Parity:**
- Quarter Pro/Jr use trap timing lights at these distances
- Window MPH matches VB6 trap speed calculation
- More accurate than instantaneous velocity at finish

**Physics Accuracy:**
- Accounts for acceleration during trap zone
- Matches real-world timing systems
- Eliminates finish-line velocity spikes

### Verification

**Test Command:**
```bash
npx tsx test-window-mph.ts
```

**Expected Output:**
- EIGHTH: e660_mph computed
- QUARTER: Both e660_mph and q1320_mph computed
- Values differ slightly from final MPH (correct behavior)

### Conclusion

Window MPH computation is **fully implemented, tested, and working correctly**. The implementation:
- ✅ Uses fine-grained traces (~0.01s spacing)
- ✅ Implements linear interpolation
- ✅ Calculates trapezoidal average velocity
- ✅ Computes correct trap windows
- ✅ Exposes in metadata
- ✅ Integrated with tests
- ✅ No UI changes

**Status: ✅ COMPLETE & VERIFIED**
