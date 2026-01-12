# ENGINE Sim VB6 Parity Checklist

## Comparison of VB6 Screenshots vs RSA Implementation

### Main Form Layout

#### VB6 Features (Image 1):
- [ ] "Note:" text field at top with "Base case for ENGINE Pro"
- [ ] Number of Cylinders: 8 with radio buttons (Inline, Vee, Flat)
- [ ] Bore Diameter - inch: 4.030
- [ ] Stroke Length - inch: 3.480
- [ ] Rod Length - inch: 5.850
- [ ] Compression Ratio: ... [12.9] (with ... button for calculator)
- [ ] Camshaft Type: "Normal Flat Tappet & Solid Lifter" dropdown
- [ ] Intake Duration @ .050 inch - degree: 264
- [ ] Throttle CFM @ 1.5 inch Hg: ... [750] (with ... button for worksheet)
- [ ] Carb/EFI radio buttons, Fuel Type: Gasoline dropdown
- [ ] Intake Manifold Type: "Common Plenum Style" dropdown
- [ ] Manifold Runner Style: Curved/Straight radio buttons
- [ ] Intake Manifold Flow Factor - %: 96.0
- [ ] Number of Intake Valves per Cylinder: 1
- [ ] Intake Valve Diameter - inch: 2.050
- [ ] Maximum Intake Port Flow - CFM: ... [250.0] (with ... button for flowbench)
- [ ] @ Test Pressure - inch H2O: 28.0
- [ ] @ Reference Bore Diameter - inch: 4.000
- [ ] Tooltip text at bottom: "The intake port flow at the maximum net valve lift..."
- [ ] Results box: "Estimated Performance for 355.1 CID Engine"
- [ ] Peak HP: 461, RPM @ Peak HP: 6650
- [ ] Peak Torque - ft lbs: 415, RPM @ Peak Torque: 5450
- [ ] Peak HP/CID: 1.30, Peak Torque/CID: 1.17
- [ ] Shift RPM: 7200, Redline RPM: 8350
- [ ] SI Units box: Displacement - liter: 5.82, Peak Power - kW: 344, Peak Torque - Nm: 562

#### RSA Current State (Image 10):
- [x] No "Note:" field
- [x] Cylinders: 8 (simple input, no radio buttons visible)
- [x] Layout: Vee (dropdown)
- [x] Bore, Stroke, Rod fields present
- [x] Comp Ratio with calculator button
- [x] Missing radio buttons for Carb/EFI (uses dropdown)
- [x] Missing @ symbol in field labels
- [x] Missing tooltip text display
- [x] Results display different format
- [x] Missing SI Units box

### Area Calculator (Image 2)

#### VB6 Features:
- [ ] Modal: "Cross-section Area Calculator"
- [ ] Four worksheets: Circular, Elliptical, Rectangular, Annular
- [ ] Circular: Diameter, Stem Diameter, Cross-section Area
- [ ] Elliptical: Major Diameter, Minor Diameter, Stem Diameter, Cross-section Area
- [ ] Rectangular: Height, Width, Corner Diameter, Stem Diameter, Cross-section Area
- [ ] Annular: Outer Diameter, Inner Diameter, Stem Diameter, Cross-section Area

#### RSA Current State:
- [ ] **MISSING ENTIRELY** - Need to implement

### Dyno Data Modal (Image 3)

#### VB6 Features:
- [ ] Title: "Engine Dyno Data"
- [ ] Graph with dotted gridlines
- [ ] HP line (red), TQ line (blue)
- [ ] Peak Values box on right: HP 461 @ 6650 RPM, TQ 415 @ 5450 RPM
- [ ] Data table: RPM, HP, TQ columns
- [ ] RPM range: 4500-7500 in 250 RPM increments

#### RSA Current State:
- [ ] Dyno curve shown on main dashboard (not modal)
- [ ] Need to add modal view with data table
- [ ] Graph styling different (solid gridlines vs dotted)

### Mech Details Modal (Image 4)

#### VB6 Features:
- [ ] Title: "ENGINE Pro Mechanical Details"
- [ ] Piston Speed Summary - FPM table (Rating, RPM, Avg (FPM), Max (FPM))
- [ ] Data @ 6,650 RPM - Peak HP table with columns: deg ATDC, depth inch, Piston Speeds FPM/FPS, g's accel
- [ ] Geometric Data Summary table:
  - Bore to Stroke Ratio: 1.16
  - Rod to Stroke Ratio: 1.68
  - Piston to Head / Stroke Length: 0.0052
  - Intake Throat / Bore Area Ratio: 0.214
  - Intake Valve Lift / Diameter Ratio: 0.268
- [ ] Piston Speed & Depth vs Angle graph
- [ ] Blue line: Speed (FPS), Red line: Depth (in)

#### RSA Current State (Image 13):
- [x] Has Piston Speed Summary table
- [x] Has Data @ 6650 RPM table
- [x] **MISSING Geometric Data Summary table**
- [x] Has graph with Speed and Depth lines
- [x] Graph styling needs adjustment

### Flow Details Modal (Image 5)

#### VB6 Features:
- [ ] Title: "ENGINE Pro Intake Port Flow Details"
- [ ] Rating dropdown: "Peak HP 6650 3857 6322"
- [ ] Piston Speed Summary table
- [ ] Camshaft Description section:
  - Type: Normal Flat Tappet & Solid Lifter
  - Intake Duration @ .050 inch - deg: 264
  - Intake Lobe Centerline - deg: 105
  - Maximum Valve Lift - inch: .550
- [ ] Flow Area, Piston Demand & Flowbench Velocity table with columns:
  - Event, deg ATDC, Valve Lift inch, Flow Area sq in, Piston Speed (FPM), Flow Demand (CFM), Flowbench Velocity FPS inH20
- [ ] Flowbench Velocity vs Angle graph with three lines:
  - Valve Lift (green)
  - Flow Area (blue)
  - Piston Demand (red)

#### RSA Current State (Image 14):
- [x] Has similar layout
- [x] Has Piston Speed Summary
- [x] Has Camshaft Description
- [x] Has Flow Area table
- [x] Has graph with three lines
- [x] Need to verify exact data and formatting

### Recommendations Modal (Image 6)

#### VB6 Features:
- [ ] Title: "ENGINE Pro Recommendations"
- [ ] Intake System section:
  - Intake Valve Lift - inch: .580
  - Minimum Flow Area - sq inch: 2.55
  - Total Intake Track Length - inch: 15.00
  - Maximum Flow Area - sq inch: 3.50
  - Total Intake Track Volume - c.c.: 690
  - Plenum Volume - cubic inch: 355
- [ ] Exhaust Port section:
  - Exhaust Flow @28.0 inches H2O, @4.000 inch Ref. Bore Diameter: "160 ÷ 64%"
  - Exhaust Valve Diameter - inch: "1.50-1.54"
  - Exhaust Valve Lift - inch: .520
  - Minimum Flow Area - sq inch: 1.42
  - Maximum Flow Area - sq inch: 2.04
- [ ] Camshaft section:
  - Lobe Separation Angle - deg: 108
  - Intake Lobe Centerline - deg: 105
  - Exhaust Duration @ .050 inch - deg: 278
- [ ] Exhaust System section:
  - Primary Tube Length - inch: 36.0
  - Primary Tube Diameter - inch: 1.750
  - Collector Diameter - inch: 3.25
- [ ] Note at bottom about achieving ENGINE Pro calculated engine HP and torque

#### RSA Current State (Image 15):
- [x] Has all sections
- [x] **MISSING exhaust port range format** (shows single value instead of "160 ÷ 64%")
- [x] **MISSING exhaust valve diameter range** (shows single value instead of "1.50-1.54")
- [x] **MISSING note at bottom**
- [x] Values may not match VB6 exactly

### Throttle CFM Worksheet (Image 7)

#### VB6 Features:
- [ ] Title: "Throttle CFM @ 1.5 inches Hg Worksheet"
- [ ] Number of Throttle Bores: Primary [4], Secondary [0]
- [ ] Throttle Diameter - inch: 1.688, .000
- [ ] Venturi Diameter - inch: 1.375, .000
- [ ] Throttle Style: Butterfly/Slide Valve radio buttons
- [ ] Throttle CFM @ 1.5 inch Hg: 730
- [ ] Tooltip: "Total number of primary throttle bores. Normal values are between 2 and 8."
- [ ] Min/Max validation: Min: 1, Max: 12

#### RSA Current State:
- [ ] **MISSING ENTIRELY** - Need to implement

### Flowbench Worksheet (Image 8)

#### VB6 Features:
- [ ] Title: "Intake Port Flowbench Data @ 28.0 inches H2O Worksheet"
- [ ] Left panel: Intake Valve Seat Throat Data
  - Number of Valves per Cylinder: 1
  - Valve Diameter - inch: 2.050
  - Valve Seat Throat Diameter - inch: 1.854
  - Valve Seat Throat Percentage - %: 92.4
  - Valve Seat Angle - degree: 45.0
  - Valve Seat Width - inch: .090
  - Valve Stem Diameter - inch: .324
- [ ] Right panel: Flow Bench Data table
  - Columns: Lift inch, Flow CFM, Velocity ft/sec, Flow Flux CFM/sq in, Flow Vel Index %
  - 10 rows of data (.100 to .800 lift)
  - Graph showing Flow (red declining line) and Flow Vel Index (blue rising line)
- [ ] Calculated values @ input maximum intake valve lift
- [ ] Tooltip: "Intake valve lift for this flowbench data, normally between .100 and .800 inch."
- [ ] Min/Max: Min: .000, Max: 2.050

#### RSA Current State (Image 12):
- [x] Has two-panel layout
- [x] Has Valve Seat Throat Data
- [x] Has Flow Bench Data table
- [x] **MISSING GRAPH** showing Flow and Flow Vel Index lines
- [x] Need to verify calculations match VB6

### Compression Ratio Calculator (Image 9)

#### VB6 Features:
- [ ] Title: "Compression Ratio Worksheet"
- [ ] Combustion Chamber Volume - c.c.: 62.0
- [ ] Piston to Deck Height - inch: .015
- [ ] Head Gasket Thickness - inch: .039
- [ ] Piston Dome Volume - c.c.: 12.0
- [ ] Compression Ratio: 12.9
- [ ] Tooltip: "Cylinder head combustion chamber volume. Normal values are between 64 and 117."
- [ ] Min/Max: Min: 31.1, Max: 182.5

#### RSA Current State (Image 11):
- [x] Has all fields
- [x] Shows calculated CR: 12.87:1 (VB6 shows 12.9)
- [x] **ROUNDING DISCREPANCY** - VB6 shows 12.9, RSA shows 12.87:1
- [x] Has "Apply to Engine" button (VB6 applies automatically)

## Priority Fixes Needed

### Critical (Must Match Exactly):
1. Add "Note:" field at top of main form
2. Fix field labels to include "@" symbol (e.g., "@ Test Pressure - inch H2O")
3. Add Geometric Data Summary table to Mech Details modal
4. Fix Recommendations exhaust port format to show range "160 ÷ 64%"
5. Fix Recommendations exhaust valve diameter to show range "1.50-1.54"
6. Add graph to Flowbench Worksheet modal
7. Fix CR calculator rounding (12.87 → 12.9)
8. Add SI Units display box
9. Add tooltip text display at bottom of form

### High Priority (Missing Features):
1. Implement Area Calculator modal
2. Implement Throttle CFM Worksheet modal
3. Add Dyno Data modal (separate from main chart)
4. Add note at bottom of Recommendations modal

### Medium Priority (Styling):
1. Change graph gridlines to dotted (strokeDasharray)
2. Match VB6 color scheme more closely
3. Add radio buttons for Inline/Vee/Flat layout
4. Add radio buttons for Carb/EFI
5. Add radio buttons for Curved/Straight runner style

### Low Priority (Polish):
1. Match exact spacing and alignment
2. Match exact font sizes
3. Add tooltips to all fields
4. Add field validation with min/max ranges
