# App Surface Inventory — RSA Web App

> Generated 2026-02-19. Covers Engine Sim, Quarter-mile, Land Speed, FourLink.
> Status key: ✅ Implemented + Wired | ⚠️ Implemented, not fully wired | 🔲 Stub | ❌ Missing

---

## 1. Engine Sim (`/engine-sim` → `EngineSimDashboard.tsx`)

### 1.1 Main Input Fields

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Number of Cylinders | `EngineSimDashboard.tsx:1156` | ✅ | |
| Layout (Inline/Vee/Flat) | `EngineSimDashboard.tsx:1165` | ✅ | |
| Bore Diameter | `EngineSimDashboard.tsx:1176` | ✅ | Constraint layer on blur |
| Stroke Length | `EngineSimDashboard.tsx:1187` | ✅ | Constraint layer on blur |
| Rod Length | `EngineSimDashboard.tsx:1198` | ✅ | Constraint layer on blur |
| Compression Ratio | `EngineSimDashboard.tsx:1210` | ✅ | + CR Calculator button |
| Camshaft Type | `EngineSimDashboard.tsx:1229` | ✅ | 7 types matching VB6 |
| Intake Duration @ .050" | `EngineSimDashboard.tsx:1245` | ✅ | |
| Fuel Type + Carb/EFI | `EngineSimDashboard.tsx:1255` | ✅ | |
| Throttle CFM @ 1.5" Hg | `EngineSimDashboard.tsx:1274` | ✅ | + Carb CFM Worksheet button |
| Intake Manifold Type | `EngineSimDashboard.tsx:1297` | ✅ | 4 types |
| Runner Style | `EngineSimDashboard.tsx:1311` | ✅ | Curved/Straight |
| Manifold Flow Factor % | `EngineSimDashboard.tsx:1321` | ✅ | |
| Intake Valves per Cyl | `EngineSimDashboard.tsx:1333` | ✅ | |
| Intake Valve Diameter | `EngineSimDashboard.tsx:1345` | ✅ | |
| Max Intake Port Flow CFM | `EngineSimDashboard.tsx:1356` | ✅ | + Intake Flow / Flow Bench button |
| Flow Test Pressure | `EngineSimDashboard.tsx:1378` | ✅ | |
| Reference Bore Diameter | `EngineSimDashboard.tsx:1388` | ✅ | |
| Max Intake Valve Lift | `EngineSimDashboard.tsx:1372` | ✅ | Added to main input panel. Also editable in Pro Flow Bench/Flow Details tabs. |
| Notes | `EngineSimDashboard.tsx:1399` | ✅ | |

### 1.2 Worksheet Buttons / Helper Calculators

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| CR Calculator (Compression Ratio) | `CompressionRatioCalculator.tsx` | ✅ | Pre-populates from current config (bore, stroke, deck, gasket, chamber, dome). Apply writes all sub-values back to config via `onApplyWithDetails`. |
| Carb CFM Worksheet | `EngineSimDashboard.tsx:1547` + `carbCfmWorksheet.ts` | ✅ | Full VB6 parity. Apply transfers value back. |
| Intake Flow Worksheet | `EngineSimDashboard.tsx:1628` + `intakeFlowWorksheet.ts` | ✅ | Full VB6 parity. CS Area sub-calculator included. |
| Cross-Section Area Calculator | `EngineSimDashboard.tsx:1695` + `csaWorksheet.ts` | ✅ | Opens from within Intake Flow modal. Apply transfers area. |
| Flow Bench (Pro) | `EngineSimDashboard.tsx:1767` + `flowBenchWorksheet.ts` | ✅ | Full tab with editable lift/flow table, chart, seat data, summary. Pro-gated with lock icon. |

### 1.3 Tabs / Detail Screens

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Dyno Data (HP/TQ curve + table) | `EngineSimDashboard.tsx:1491` | ✅ | Recharts dual-axis chart + data table |
| Flow Bench (Pro) | `EngineSimDashboard.tsx:1767` | ✅ | Pro-gated. Chart + editable table. |
| Mechanical Details (Pro) | `EngineSimDashboard.tsx:2003` | ✅ | Piston speed summary, cranking compression, geometric ratios, chart + table |
| Flow Details (Pro) | `EngineSimDashboard.tsx:2128` | ✅ | Cam description, editable overrides (±8°/±0.1"), chart + table |
| Recommendations (Pro) | `EngineSimDashboard.tsx:2351` | ✅ | 4-panel grid: Intake, Exhaust Port, Camshaft, Exhaust System |

### 1.4 File I/O

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| New | `EngineSimDashboard.tsx:249` | ✅ | Resets all state including engineAssetId |
| Open (Library) | `EngineSimDashboard.tsx:262` | ✅ | DB-backed sim document library |
| Save / Save As | `EngineSimDashboard.tsx:318,342` | ✅ | DB-backed + engine library revision sync |
| Import .eng | `EngineSimDashboard.tsx:363` | ✅ | Legacy VB6 file format parser |

### 1.5 Engine Sim Dead Clicks / Gaps (Top 5)

1. ~~**CR Calculator ignores current config**~~ — **FIXED.** Now pre-populates from config and writes sub-values back.
2. ~~**No Max Intake Valve Lift input in basic mode**~~ — **FIXED.** Added to main input panel after Intake Valve Diameter.
3. **No Exhaust Duration input** — VB6 ENGPERF had exhaust duration as an input. Currently only appears as a calculated recommendation.
4. **No LSA/ILC inputs on main screen** — Only editable as overrides in Flow Details tab (Pro). VB6 had these as main inputs.
5. **No .eng file export** — Import works but there's no Export to .eng for sharing.

---

## 2. Quarter-Mile (`/et-sim` or `/predict` → `Predict.tsx`)

### 2.1 Main Screens

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Vehicle selector | `Predict.tsx:979` | ✅ | Dropdown + edit button |
| Vehicle editor popup | `VehicleEditorPopup.tsx` → `VehicleEditorUnified.tsx` | ✅ | Full unified editor with Simple/Advanced modes |
| Environment inputs | `Predict.tsx:1337` + `EnvironmentForm.tsx` | ✅ | Temp, baro, humidity, wind, track temp, traction |
| Race length selector | `Predict.tsx:1250` | ✅ | 1/8, 1/4, 1000' (tier-gated) |
| ET Slip (timeslip) | `Predict.tsx:889` | ✅ | 60', 330', 1/8, MPH, 1000', ET, MPH. Print + clipboard. |
| Data Logger Chart | `DataLoggerChart.tsx` (lazy) | ✅ | Speed/RPM/distance traces. Comparison overlay. |
| RPM Histogram | `RPMHistogram.tsx` (lazy) | ✅ | |
| What-If sliders (HP/Weight) | `Predict.tsx:1345` | ✅ | Pro-gated |
| Optimizer | `OptimizerModal.tsx` (lazy) | ✅ | Gear/converter optimization. Pro-gated. |
| Throttle Stop | `Predict.tsx:1389` | ✅ | Enable/disable + activate/duration/pct. Pro-gated. |
| Save/Compare runs | `Predict.tsx:1036` | ✅ | Pro-gated. Overlay comparison on chart. |
| Live Weather | `Predict.tsx:1282` | ✅ | Track selector + GPS. Pro-gated. |

### 2.2 Vehicle Editor Worksheets (via VehicleEditorUnified)

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Frontal Area | `WorksheetModal.tsx:FrontalAreaWorksheet` | ✅ | Button + modal in VehicleEditorUnified |
| Tire Width | `WorksheetModal.tsx:TireWidthWorksheet` | ✅ | Button + modal in VehicleEditorUnified |
| Gear Ratio | `WorksheetModal.tsx:GearRatioWorksheet` | ✅ | Button + modal in VehicleEditorUnified |
| Engine PMI | `WorksheetModal.tsx:PMIWorksheet` type=engine | ✅ | Button + modal in VehicleEditorUnified |
| Trans PMI | `WorksheetModal.tsx:PMIWorksheet` type=trans | ✅ | Button + modal in VehicleEditorUnified |
| Tires PMI | `WorksheetModal.tsx:PMIWorksheet` type=tires | ✅ | Button + modal in VehicleEditorUnified |
| Drag Coef Help | `WorksheetModal.tsx:DragCoefHelp` | ✅ | Help dialog (not calculator) in VehicleEditorUnified |
| Tire Rollout | `WorksheetModal.tsx:TireRolloutWorksheet` | ✅ | In VehicleEditorUnified |
| Vehicle Rollout (staging) | `WorksheetModal.tsx:VehicleRolloutWorksheet` | ✅ | In VehicleEditorUnified |

### 2.3 Vehicle Manager Worksheets (`/vehicles` → `Vehicles.tsx`)

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Frontal Area | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal |
| Tire Width | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal |
| Gear Ratio | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal |
| Tire Rollout | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal |
| Engine PMI | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal (recently added) |
| Trans PMI | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal (recently added) |
| Tires PMI | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal (recently added) |
| Vehicle Rollout | `Vehicles.tsx` + `WorksheetModal.tsx` | ✅ | Button + modal (recently added) |

### 2.4 Simple Vehicle Editor Worksheets (`VehicleEditor.tsx`)

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Frontal Area | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | |
| Tire Width | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | |
| Gear Ratio | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added button |
| Engine PMI | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added |
| Trans PMI | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added |
| Tires PMI | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added |
| Tire Rollout | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added |
| Vehicle Rollout | `VehicleEditor.tsx` + `WorksheetModal.tsx` | ✅ | Recently added |

### 2.5 Quarter-Mile Dead Clicks / Gaps (Top 5)

1. **No "Detailed Parameters" screen** — VB6 had a detailed output list showing every simulation step (distance, time, speed, RPM, gear). Currently only the ET slip + chart are shown.
2. **No motorcycle final drive worksheet** — VB6 had a motorcycle-specific final drive calculator. Not present (motorcycle mode itself may not be fully exposed).
3. **No "What-If" for tire diameter/rollout** — VB6 allowed quick what-if on tire size. Current what-if only covers HP and weight.
4. **No run comparison table** — VB6 showed side-by-side comparison of saved runs in a table. Current comparison is chart overlay only.
5. **No print-formatted detailed output** — VB6 had a printable detailed parameters report. Current print only covers the ET slip.

---

## 3. Land Speed (`/et-sim` with landspeed race length → `Predict.tsx`)

### 3.1 Main Screens

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Race length selector (land speed courses) | `Predict.tsx:1272` | ✅ | 7 courses: 1mi, El Mirage, Muroc, 2mi, BV Short, BV Long, 10mi. Pro-gated. |
| Land speed timeslip (MPH at mile markers) | `Predict.tsx:947` | ✅ | Shows 1/8mi, 1/4mi, 1/2mi, 1mi MPH. Conditional on `category === 'landspeed'`. |
| Labels adapt (Time/Top Speed vs ET/MPH) | `Predict.tsx:971,975` | ✅ | |
| Data Logger Chart | `DataLoggerChart.tsx` | ✅ | `raceLengthFt` passed correctly for land speed distances |
| Distance checkpoints | `raceLengths.ts:24-30` | ✅ | All 7 courses have correct checkpoint arrays |

### 3.2 Land Speed Dead Clicks / Gaps (Top 5)

1. **No Bonneville Pro detailed output** — VB6 ISBVPRO mode had a detailed mile-by-mile output list. Not implemented.
2. **No land-speed-specific vehicle fields** — VB6 Bonneville Pro had parachute deployment distance, streamliner body type, etc. Not present.
3. **No land speed timeslip shows only 4 checkpoints** — VB6 showed 7 rows (2mi through 5mi at 0.5mi intervals for BV Long). Current UI shows only 1/8, 1/4, 1/2, 1mi.
4. **No wind direction indicator** — VB6 had a visual wind direction dial for land speed. Current wind is numeric-only.
5. **Chart styling doesn't differentiate land speed** — Only a subtle purple background on the race length selector. No visual distinction in the chart area.

---

## 4. FourLink / Suspension Sim (`/suspension-sim` → `SuspensionSim.tsx`)

| VB6 Feature Name | File / Component | Status | Notes |
|---|---|---|---|
| Route exists | `App.tsx:533` | ✅ | Route defined, requires `fourlink` product |
| Nav link | `App.tsx:241-246` | ❌ | **Commented out** — not visible in navigation |
| Component | `SuspensionSim.tsx` | 🔲 | Exists but not audited (deferred per requirements) |

**FourLink is deferred** — hidden from navigation, not blocking first-customer release.

---

## Summary Counts

| Module | ✅ Implemented + Wired | ⚠️ Partially Wired | 🔲 Stub | ❌ Missing |
|---|---|---|---|---|
| **Engine Sim** | 30 | 0 | 0 | 0 |
| **Quarter-Mile** | 25 | 0 | 0 | 0 |
| **Land Speed** | 5 | 0 | 0 | 0 |
| **FourLink** | 1 (route) | 0 | 1 | 1 (nav) |
| **Total** | **61** | **0** | **1** | **1** |

### Top Remaining Blockers (Ranked)

1. ~~Engine Sim: CR Calculator ignores current config~~ — **FIXED**
2. ~~Engine Sim: No Max Intake Valve Lift input in basic mode~~ — **FIXED**
3. **Quarter-Mile: No Detailed Parameters screen** — VB6 power users expect step-by-step sim output.
4. **Land Speed: Incomplete mile-marker timeslip** — Only 4 of 7 VB6 checkpoints shown for Bonneville Long.
5. **Engine Sim: No .eng export** — Users can import but not export/share.
