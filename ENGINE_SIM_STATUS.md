# Engine Sim Status Report

## ✅ Completed

### 1. Dyno Curve - 100% Accuracy Achieved
- **Root Cause**: VB6 uses Lagrangian interpolation (RSALIB.bas), not linear interpolation
- **Solution**: Ported exact VB6 DTABY/TABY functions to `vb6Interpolation.ts`
- **Result**: 0.00% error on all dyno table points
- **Files**: 
  - `src/domain/physics/engine/vb6Interpolation.ts` - VB6 Lagrangian interpolation
  - `src/domain/physics/engine/vb6CurveGen.ts` - Updated to use Lagrangian

### 2. Mechanical Details Graph - Fixed
- **Issue**: Graph was too straight compared to VB6's smooth curves
- **Root Cause**: Using linear interpolation for valve lift profile
- **Solution**: Updated `calcValveLift()` to use VB6 DTABY with exact lookup tables
- **Files**: `src/domain/physics/engine/engineProDetails.ts`

### 3. DTABY/TABY Audit
- **Verified**: All simulation code uses correct VB6 Lagrangian interpolation
- **Locations**:
  - `src/domain/physics/vb6/dtaby.ts` - Main simulation interpolation (0-indexed)
  - `src/domain/physics/engine/vb6Interpolation.ts` - Engine curve generation (1-indexed)
  - Both implement exact VB6 RSALIB.bas algorithms

## 🚧 In Progress

### 4. Flow Details Section
- **Status**: Function stub created in `engineProDetails.ts`
- **Exports**: `calcFlowDetails()` - returns flow data at each crank angle
- **Data**: Valve lift, flow area, piston speed, flow demand, flow velocity
- **TODO**: Add UI component to display flow details table

### 5. Recommendations Section
- **Status**: Function stub created in `engineProDetails.ts`
- **Exports**: `calcRecommendations()` - returns recommended specs
- **Data**: Intake/exhaust specs, cam specs, flow requirements
- **TODO**: Port full VB6 CalcRecommendations logic from ENGPERF.BAS

## 📋 Pending

### 6. UI/UX Improvements
**Current Issues**:
- Too much scrolling on large screens
- Not as compact as VB6 interface
- Input fields could be better organized

**Proposed Solutions**:
- Use collapsible sections for input groups
- Side-by-side layout for related inputs
- Sticky header for quick access to calculate button
- Tabbed interface for Results/Mechanical Details/Flow Details/Recommendations

### 7. Engine Save/Load System
**Requirements**:
- Build an engine configuration and save it
- Load saved engine into a vehicle
- Preserve ability to manually enter engine specs in vehicle editor

**Design**:
```typescript
interface SavedEngine {
  id: string;
  name: string;
  description?: string;
  
  // Engine specs from Engine Sim
  noCyl: number;
  bore: number;
  stroke: number;
  compressionRatio: number;
  // ... all other engine parameters
  
  // Calculated results
  peakHP: number;
  rpmAtPeakHP: number;
  peakTQ: number;
  rpmAtPeakTQ: number;
  
  // Dyno curve data
  dynoCurve: { rpm: number; hp: number; tq: number }[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

**Implementation Steps**:
1. Create `SavedEngine` schema in `src/domain/schemas/components.schema.ts`
2. Add IndexedDB storage functions in `src/state/savedEngines.ts`
3. Add "Save Engine" button to Engine Sim page
4. Add engine selector to Vehicle Editor
5. Update vehicle schema to support `engineRef: string` (optional)
6. When `engineRef` is set, use saved engine data; otherwise use manual fields

**Vehicle Integration**:
- Vehicle editor shows dropdown of saved engines
- Selecting an engine populates all engine fields (read-only)
- "Use Custom Engine" button clears `engineRef` and enables manual entry
- Both modes coexist - user can switch between them

## 🔍 Testing Checklist

- [x] Dyno curve matches VB6 exactly (0.00% error)
- [x] Mechanical details graph uses Lagrangian interpolation
- [ ] Flow details display correctly
- [ ] Recommendations display correctly
- [ ] UI is compact and user-friendly
- [ ] Engine save/load works
- [ ] Vehicle integration preserves manual entry option

## 📁 Key Files

### Core Engine Physics
- `src/domain/physics/engine/enginePerf.ts` - Main calculation (CalcEngPerf port)
- `src/domain/physics/engine/vb6CurveGen.ts` - Dyno curve generation
- `src/domain/physics/engine/vb6Interpolation.ts` - Lagrangian interpolation (1-indexed)
- `src/domain/physics/engine/engineProDetails.ts` - Mechanical/flow details

### Simulation Interpolation
- `src/domain/physics/vb6/dtaby.ts` - Simulation HP curve interpolation (0-indexed)

### UI Components
- `src/pages/EngineSim.tsx` - Main Engine Sim page
- `src/shared/components/CompressionRatioCalculator.tsx` - CR calculator popup

### Reference
- `Reference Files/OtherRefFiles/EPro Family 12_24_2025/` - VB6 source code
- `Reference Files/OtherRefFiles/RSA & CLS Libs 1_18_2023/RSALIB 6.0/RSALIB.bas` - DTABY/TABY source

## 🎯 Next Priority

1. **Add Flow Details UI** - Display flow data table in Engine Sim
2. **Add Recommendations UI** - Display recommended specs
3. **UI Redesign** - Make interface more compact and user-friendly
4. **Engine Save/Load** - Implement full save/load system with vehicle integration
