# Vehicle Editor & Component Architecture Design

## Current State Analysis

### Existing Editor Implementations

1. **Tabbed Editor** (`Vehicles.tsx`)
   - QuarterJr tabs: `basic`, `vehicle`, `engine`, `transmission`, `finaldrive`
   - QuarterPro tabs: `basic`, `geometry`, `aero`, `drivetrain`, `pmi`, `engine`, `throttle`
   - Full-featured but requires many clicks to navigate

2. **VehicleEditorPanel** (`VehicleEditorPanel.tsx`)
   - Compact 1-page view like original VB6
   - All fields visible in scrollable sections
   - Used in Vehicles page (toggle) and ET Sim popup

3. **VehicleEditorPopup** (lazy loaded)
   - Popup/sidebar version for use within simulations

### Current Field Organization

**QuarterJr (Required) Fields:**
- Name, Race Length
- Weight, Rollout, Wheelbase, Body Style
- Fuel Type, Displacement, Peak HP, RPM @ Peak HP
- Transmission Type (Clutch/Converter)
- Clutch: Launch RPM, Slip RPM, Slippage
- Converter: Stall RPM, Torque Mult, Slippage
- Gear Ratios, Shift RPMs, Rear Gear, Tire Diameter

**QuarterPro (Optional/Advanced) Fields:**
- Static Front Weight, CG Height, Overhang
- Frontal Area, Cd, Lift Coefficient
- Tire Width, Tire Growth
- Full HP Curve (replaces Peak HP when present)
- Per-gear Efficiencies, Trans Efficiency
- PMI values (Engine, Trans, Tires)
- Converter Diameter
- Throttle Stop settings

---

## Proposed Architecture

### 1. Unified Editor UI Approach

**Recommendation: Progressive Disclosure with Sections**

Instead of tabs OR 1-page, use a **collapsible section** approach:
- All sections visible by default (like 1-page)
- Each section can collapse/expand
- Pro sections show "🔒 Pro" badge for Jr users
- Sections remember collapsed state per user

```
┌─────────────────────────────────────────┐
│ ▼ Identity                              │
│   Name, Race Length, Group              │
├─────────────────────────────────────────┤
│ ▼ Vehicle                               │
│   Weight, Wheelbase, Rollout, Body      │
│   [Pro: Front Weight, CG Height, etc.]  │
├─────────────────────────────────────────┤
│ ▼ Engine                    [⚙️ Select] │
│   Peak HP, RPM @ Peak (or HP Curve)     │
│   Fuel Type, Displacement               │
│   [Pro: Full HP Curve Editor]           │
├─────────────────────────────────────────┤
│ ▼ Transmission              [⚙️ Select] │
│   Type: Clutch / Converter              │
│   Clutch OR Converter fields            │
├─────────────────────────────────────────┤
│ ▼ Drivetrain                            │
│   Gear Ratios, Shift RPMs, Rear Gear    │
│   [Pro: Per-gear Efficiencies, PMI]     │
├─────────────────────────────────────────┤
│ ▼ Tires                                 │
│   Diameter, Width                       │
│   [Pro: Tire Growth settings]           │
├─────────────────────────────────────────┤
│ ▼ Aerodynamics                    [Pro] │
│   Frontal Area, Cd, Lift Coeff          │
├─────────────────────────────────────────┤
│ ▼ Throttle Stop                   [Pro] │
│   Enable, Delay, Duration, Target ET    │
└─────────────────────────────────────────┘
```

### 2. Field Dependency Rules

**Superseding Logic:**
| If Present | Supersedes |
|------------|------------|
| `hpCurve[]` (dyno data) | `powerHP`, `rpmAtPeakHP`, `displacementCID` |
| `engineRef` (saved engine) | All engine fields |
| `clutchRef` (saved clutch) | All clutch fields |
| `converterRef` (saved converter) | All converter fields |

**Validation Rules:**
```typescript
interface FieldRequirements {
  // Always required
  required: ['name', 'weightLb', 'rolloutIn', 'tireDiaIn', 'rearGear'];
  
  // Required unless superseded
  requiredUnless: {
    powerHP: ['hpCurve', 'engineRef'],
    rpmAtPeakHP: ['hpCurve', 'engineRef'],
    clutchLaunchRPM: ['clutchRef'], // when transmissionType === 'clutch'
    converterStallRPM: ['converterRef'], // when transmissionType === 'converter'
  };
  
  // Optional but recommended
  recommended: ['wheelbaseIn', 'gearRatios', 'shiftRPMs'];
  
  // Pro-only fields
  proOnly: [
    'staticFrontWeightLb', 'cgHeightIn', 'overhangIn',
    'frontalAreaFt2', 'cd', 'liftCoeff',
    'hpCurve', 'gearEfficiencies', 'transEfficiency',
    'enginePMI', 'transPMI', 'tiresPMI',
    'throttleStopEnabled', 'throttleStopDelay', 'throttleStopDuration',
  ];
}
```

---

## 3. Component Integration Architecture

### Saved Component Types

```typescript
// Engine component (from Engine Sim)
interface SavedEngine {
  id: string;
  name: string;
  createdAt: number;
  source: 'engineJr' | 'enginePro' | 'manual' | 'dyno';
  
  // Core data
  hpCurve: Array<{ rpm: number; hp: number; torque?: number }>;
  peakHP: number;
  rpmAtPeakHP: number;
  peakTorque: number;
  rpmAtPeakTorque: number;
  
  // Metadata
  displacement?: number;
  fuelType?: string;
  aspirationType?: 'na' | 'turbo' | 'supercharged' | 'nitrous';
  
  // Engine Sim config (if from Engine Pro)
  engineProConfig?: EngineProConfig;
}

// Clutch component (from Clutch Sim)
interface SavedClutch {
  id: string;
  name: string;
  createdAt: number;
  source: 'clutchSim' | 'manual';
  
  // Core data
  launchRPM: number;
  slipRPM: number;
  slippage: number;
  lockup: boolean;
  
  // Clutch Sim config (if from Clutch Sim)
  clutchSimConfig?: ClutchInput;
}

// Converter component (from Converter Sim - future)
interface SavedConverter {
  id: string;
  name: string;
  createdAt: number;
  source: 'converterSim' | 'manual';
  
  // Core data
  stallRPM: number;
  torqueMultiplier: number;
  slippage: number;
  diameter?: number;
  lockup: boolean;
  
  // Stall curve (future)
  stallCurve?: Array<{ rpm: number; mult: number }>;
}
```

### Vehicle Schema Updates

```typescript
// Add component references to Vehicle schema
const VehicleSchema = z.object({
  // ... existing fields ...
  
  // Component References (optional - use saved components)
  engineRef: z.string().optional(),      // ID of SavedEngine
  clutchRef: z.string().optional(),      // ID of SavedClutch  
  converterRef: z.string().optional(),   // ID of SavedConverter
  
  // Inline data still supported for manual entry
  // When ref is set, inline data is ignored
});
```

### Component Selector UI Pattern

```
┌─────────────────────────────────────────┐
│ ▼ Engine                                │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ○ Manual Entry                      │ │
│ │ ● Use Saved Engine                  │ │
│ │   [Select Engine...        ▼]       │ │
│ │   └─ "427 SBC Dyno" (650hp)         │ │
│ │   └─ "LS3 Stock" (430hp)            │ │
│ │   └─ + Create in Engine Sim         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [When Manual Entry selected:]           │
│ Peak HP: [____] RPM @ Peak: [____]      │
│ Displacement: [____] Fuel: [____]       │
│                                         │
│ [When Saved Engine selected:]           │
│ ┌─────────────────────────────────────┐ │
│ │ 427 SBC Dyno                        │ │
│ │ Peak: 650 HP @ 6500 RPM             │ │
│ │ Source: Dyno Import                 │ │
│ │ [View Details] [Edit in Engine Sim] │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 4. Implementation Plan

### Phase 1: Consolidate Editor UI
1. Create new `VehicleEditor.tsx` component with collapsible sections
2. Add section collapse state persistence
3. Implement Pro field badges and gating
4. Replace both tabbed and panel editors with unified component

### Phase 2: Field Validation & Dependencies
1. Create `vehicleValidation.ts` with requirement rules
2. Implement superseding logic (hpCurve > powerHP, etc.)
3. Add validation indicators in UI
4. Show which fields are being superseded

### Phase 3: Component Storage
1. Create `SavedEngine`, `SavedClutch`, `SavedConverter` schemas
2. Add storage functions (localStorage + API sync)
3. Create component list/selector UI component

### Phase 4: Engine Integration
1. Add "Save Engine" button to Engine Sim
2. Add engine selector to Vehicle Editor
3. Implement engine reference resolution in simulation

### Phase 5: Clutch/Converter Integration
1. Add "Save Clutch" button to Clutch Sim
2. Create Converter Sim (based on Clutch Sim)
3. Add clutch/converter selectors to Vehicle Editor

### Phase 6: Polish
1. Add "Quick Edit" for referenced components
2. Implement component versioning/history
3. Add component sharing (Team tier)

---

## 5. Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Engine Sim  │────▶│ SavedEngine │────▶│   Vehicle   │
└─────────────┘     └─────────────┘     │             │
                                        │  engineRef  │
┌─────────────┐     ┌─────────────┐     │  clutchRef  │
│ Clutch Sim  │────▶│ SavedClutch │────▶│ converterRef│
└─────────────┘     └─────────────┘     │             │
                                        │ (or inline  │
┌─────────────┐     ┌───────────────┐   │  manual     │
│Converter Sim│────▶│SavedConverter │───▶│  entry)     │
└─────────────┘     └───────────────┘   └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  ET Sim     │
                                        │ (resolves   │
                                        │  all refs)  │
                                        └─────────────┘
```

---

## 6. Migration Strategy

1. **Backward Compatible**: All existing vehicles continue to work
2. **Gradual Adoption**: Users can start using component refs when ready
3. **No Data Loss**: Inline data preserved even when ref is set
4. **Easy Revert**: Can switch back to manual entry anytime

---

## Questions to Resolve

1. **Should components be versioned?** If user updates an engine, should vehicles using it auto-update or keep the version they were saved with?

2. **Component ownership**: Can Team members share components? Should there be public/private components?

3. **Dyno import**: Should dyno data go directly to vehicle or always through Engine Sim first?

4. **HP Curve editor**: Should this be inline in vehicle editor or always require Engine Sim?
