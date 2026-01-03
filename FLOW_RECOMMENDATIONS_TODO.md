# Flow Details & Recommendations - Implementation Plan

## Current Status
Both Flow Details and Recommendations tabs are currently showing placeholder messages because they require engine configuration properties that are not available in the current `EngineSimConfig` interface.

## Root Cause
The current Engine Sim uses a simplified `EngineSimConfig` interface (from `engineAdapter.ts`) which only has basic properties like:
- `intakeDuration050_deg` (cam duration)
- `camshaftType` (string enum)
- `fuelType` (string enum)
- `intakeManifoldType` (string enum)

However, `calcFlowDetails()` and `calcRecommendations()` require `EngineProConfig` properties that include:
- `intakeLobeCenterline_deg` (not in EngineSimConfig)
- `lobeSeparationAngle_deg` (not in EngineSimConfig)
- `maxIntakeValveLift_in` (not in EngineSimConfig)
- `shift_rpm` (not in EngineSimConfig)
- And many other advanced properties

## Solution Options

### Option 1: Extend EngineSimConfig (Recommended)
Add the missing properties to `EngineSimConfig` in `engineAdapter.ts`:

```typescript
export interface EngineSimConfig {
  // ... existing properties ...
  
  // Advanced cam properties (for Engine Pro mode)
  intakeLobeCenterline_deg?: number;  // Default: 106°
  lobeSeparationAngle_deg?: number;   // Default: 110°
  maxIntakeValveLift_in?: number;     // Calculated from cam type
  shift_rpm?: number;                 // Estimated from peak HP
  
  // These can have sensible defaults when not provided
}
```

Then update the UI to:
1. Show these fields only in Advanced Mode
2. Provide default values based on cam type when not specified
3. Re-enable the `calcFlowDetails()` and `calcRecommendations()` calls

### Option 2: Create Separate EngineProSim Page
Create a completely separate Engine Pro simulation page that uses the full `EngineProConfig` interface with all VB6 properties. This would be the "true" Engine Pro experience matching VB6 exactly.

## Files That Need Updates

### If Option 1 (Extend EngineSimConfig):
1. `src/domain/physics/engine/engineAdapter.ts`
   - Add optional advanced properties to `EngineSimConfig`
   - Provide default values in `createDefaultEngineProConfig()`

2. `src/pages/EngineSim.tsx`
   - Add input fields for advanced properties (Advanced Mode only)
   - Re-enable `calcFlowDetails()` and `calcRecommendations()` calls
   - Remove placeholder messages

3. `src/domain/physics/engine/engineProDetails.ts`
   - Update `calcFlowDetails()` to accept `EngineSimConfig` or provide defaults
   - Update `calcRecommendations()` to accept `EngineSimConfig` or provide defaults

### If Option 2 (Separate Page):
1. Create `src/pages/EngineProSim.tsx` (already exists but needs completion)
   - Full VB6-style interface with all Engine Pro fields
   - Uses `EngineProConfig` directly
   - Includes Flow Details and Recommendations tabs

2. Update navigation to link to separate Engine Pro page

## VB6 Reference
The full VB6 Engine Pro interface includes these additional inputs:
- Lobe Separation Angle (LSA)
- Intake Lobe Centerline (ILC)
- Intake Valve Closing (IVC)
- Overlap
- Exhaust cam duration (calculated)
- Valve lift at various points
- Runner lengths and volumes
- Plenum volume
- And many more...

## Recommendation
**Option 1** is recommended for now because:
1. It keeps the UI simple with progressive disclosure (basic → advanced)
2. Provides sensible defaults for missing values
3. Allows Flow Details and Recommendations to work with current interface
4. Can be enhanced later to full Engine Pro if needed

The key is to make the advanced properties optional with good defaults, so users can get recommendations without needing to know every VB6 parameter.
