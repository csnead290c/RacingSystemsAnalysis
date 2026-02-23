# Engine Jr / Engine Pro — User Manual

The Engine simulator estimates the maximum performance potential of naturally aspirated, spark-ignition internal combustion engines. It predicts peak horsepower, peak torque, their RPM values, and generates a complete dyno curve — all from engine design parameters.

**Engine Jr** covers the core inputs (bore, stroke, compression, cam, flow). **Engine Pro** adds mechanical details, flow analysis, and component recommendations.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Jr vs Pro — What Changes](#2-jr-vs-pro--what-changes)
3. [First Run — Minimum Viable Workflow](#3-first-run--minimum-viable-workflow)
4. [Inputs Reference](#4-inputs-reference)
5. [Running a Simulation](#5-running-a-simulation)
6. [Reading Results](#6-reading-results)
7. [Saving and Loading](#7-saving-and-loading)
8. [Worksheets](#8-worksheets)
9. [VB6 Crosswalk](#9-vb6-crosswalk)
10. [Common Mistakes and Troubleshooting](#10-common-mistakes-and-troubleshooting)

---

## 1. Overview

The Engine simulator models the thermodynamic and airflow processes of a four-stroke engine:

- **Intake airflow** — manifold design, port flow capacity, valve sizing, cam timing
- **Combustion** — compression ratio, fuel type, combustion efficiency
- **Mechanical losses** — pumping losses, friction
- **Power output** — HP and torque across the full RPM range

The simulation recalculates **instantly** whenever you change any input — there is no "Run" button. Change a value, and the predicted HP and torque update immediately.

The Engine simulator has been calibrated against dyno data from hundreds of high-performance engines, from 77 CID Pro Stock motorcycle engines to 800+ CID Mountain Motor Pro Stock engines.

---

## 2. Jr vs Pro — What Changes

| Feature | Engine Jr (Racer plan) | Engine Pro (Pro plan) |
|---------|----------------------|---------------------|
| Core inputs (bore, stroke, CR, cam, flow) | ✓ | ✓ |
| Estimated peak HP/TQ | ✓ | ✓ |
| Dyno curve chart | ✓ | ✓ |
| Compression Ratio Worksheet | ✓ | ✓ |
| Carb CFM Worksheet | ✓ | ✓ |
| Intake Flow Worksheet | ✓ | ✓ |
| CSA Calculator | ✓ | ✓ |
| Mechanical Details tab | — | ✓ |
| Flow Details tab | — | ✓ |
| Recommendations tab | — | ✓ |
| Lobe Separation Angle / Intake Lobe Centerline | — | ✓ |
| Save to Engine Library | ✓ | ✓ |
| Install engine on vehicle | ✓ | ✓ |
| Import/Export .eng files | ✓ | ✓ |

---

## 3. First Run — Minimum Viable Workflow

**Time required:** 1–2 minutes.

1. Navigate to **Engine Sim** in the nav bar.
2. A default engine loads automatically (355 Chevy small block).
3. Change any input to match your engine:
   - **Bore** and **Stroke** (inches or mm)
   - **Compression Ratio**
   - **Camshaft Type** and **Intake Duration**
   - **Throttle CFM** (carburetor or throttle body flow)
4. Results update instantly — check the **Estimated Peak HP** and **Peak Torque** displayed on screen.
5. The **Dyno Curve Chart** (HP and Torque vs RPM) updates automatically below the inputs.
6. To save: click **Save** or **Save As** in the File tab.

> **Tip:** The default engine is a good starting point. Modify one variable at a time and watch how it affects the predicted output.

---

## 4. Inputs Reference

### 4.1 Engine Geometry

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Number of Cylinders | — | 8 | Number of engine cylinders (4–8 typical). |
| Configuration | radio | Vee | Inline, Vee, or Flat/Opposed. |
| Bore Diameter | in or mm | 4.03 | Cylinder bore diameter. |
| Stroke Length | in or mm | 3.48 | Crankshaft stroke. |
| Rod Length | in or mm | 5.85 | Connecting rod center-to-center length. |
| Compression Ratio | ratio | 12.9 | Mechanical compression ratio. Use the CR Worksheet to calculate from chamber/dome/gasket measurements. |

### 4.2 Camshaft

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Camshaft Type | dropdown | High rate-of-lift flat tappet | Determines the valve lift profile shape. Options: Overhead cam, Roller, Mushroom tappet, High-rate flat tappet, Typical flat tappet, Hydraulic roller, Hydraulic flat tappet. |
| Intake Duration @ .050" | degrees | 264 | Intake cam lobe duration measured at 0.050" valve lift. Typical: 200–280°. |

### 4.3 Intake System

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Throttle CFM @ 1.5" Hg | CFM | 750 | Total flow capacity of carburetor(s) or throttle body at 1.5" Hg pressure drop. Use the Carb CFM Worksheet to calculate. |
| Carb or EFI | radio | Carb | Carburetor or fuel injection. |
| Fuel Type | dropdown | Gasoline | Gasoline, Racing Gasoline, or Methanol. |
| Manifold Type | dropdown | Plenum | Plenum (most common), Individual Runner (IR), Dual Plane 100% divided, Dual Plane w/small slot. |
| Runner Style | radio | Curved | Curved or Straight intake runners. Single 4-barrel V8 manifolds typically have curved runners. |
| Manifold Flow Factor | % | 96 | Ratio of intake flow with manifold attached vs bare head flow. Typical: 90–98%. |

### 4.4 Cylinder Head Flow

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Number of Intake Valves | — | 1 | Intake valves per cylinder (1 or 2). |
| Intake Valve Diameter | in or mm | 2.05 | Measured intake valve head diameter. |
| Max Intake Port Flow | CFM | 250 | Flow at maximum net intake valve lift from flowbench data. For multi-valve heads, enter the **total** flow. |
| Test Pressure | in H₂O | 28 | Flowbench test pressure. Typical: 10–28" H₂O. |
| Reference Bore Diameter | in or mm | 4.00 | Flowbench adapter bore. Should be within 2% of actual bore. |

---

## 5. Running a Simulation

The Engine Sim recalculates **every time you change an input**. There is no Run button.

When you change a value and press Tab, Enter, or click away:
1. The cursor briefly pauses while calculations run.
2. The estimated performance updates on screen.
3. The dyno curve chart updates automatically.

This is the same behavior as the original VB6 Engine Jr/Pro software, where every input change triggered an immediate recalculation.

---

## 6. Reading Results

### 6.1 Estimated Performance Summary

Displayed directly on the main screen:

| Output | Description |
|--------|-------------|
| **Peak HP** | Maximum predicted horsepower. |
| **RPM at Peak HP** | Engine speed at peak power. |
| **Peak Torque** | Maximum predicted torque (ft·lbs). |
| **RPM at Peak Torque** | Engine speed at peak torque. |
| **Displacement** | Calculated displacement (CID and liters). |

### 6.2 Dyno Curve Chart

The dyno curve chart is always visible below the input fields, showing:
- **HP curve** (blue) — horsepower vs RPM
- **Torque curve** (red) — torque vs RPM

The chart spans from approximately 25% of peak HP RPM to 125% of peak HP RPM, with points every 125 RPM. It updates automatically whenever you change any input.

<!-- TODO: Screenshot of dyno curve chart -->

### 6.3 Mechanical Details (Pro Only)

Shows piston kinematics at a selected RPM:
- Piston speed (ft/min) and depth (inches) vs crank angle
- Data table with 37 points (every 5° from 0–180°)
- Select different RPMs including quick buttons for Peak HP RPM and Peak TQ RPM

### 6.4 Flow Details (Pro Only)

Shows valve event analysis at a selected RPM:
- Valve lift, flow area, piston speed, flow demand (CFM), flow velocity
- 12-row event table
- Uses resolved cam defaults (LSA/ILC) from the simulation

### 6.5 Recommendations (Pro Only)

Three-column layout with component suggestions:
- **Intake System** — manifold, carburetor/throttle body sizing
- **Exhaust System** — header and exhaust sizing
- **Camshaft** — duration, lift, and timing recommendations

> **Note:** Recommendations require a successful simulation with valid calculated values.

---

## 7. Saving and Loading

### Engine Documents

Engine configurations are saved as "engine sim documents" in your account (cloud storage):

- **Save** — updates the current document (if you opened an existing document). If this is a new engine, you'll be prompted to "Save As" with a name.
- **Save As** — creates a new document with a new name. You'll see a prompt to enter the document name.
- **Library** — shows all your saved engine documents. Click to load, or delete documents you no longer need.
- **New** — clears the current engine and starts fresh with default values.
- **Export** — downloads the current engine as a `.eng` file (compatible with VB6 Engine Jr/Pro).
- **Import** — uploads a `.eng` file from the legacy desktop software.

Documents are saved to the database automatically when you click Save or Save As. No manual file management needed.

### Engine Library (for Quarter Sim)

Engines can also be saved to the **Engine Library**, which allows them to be installed on vehicles for use in the Quarter Sim:

- From the Engine Sim, use **Save as Engine Asset** button to create a library entry.
- You'll be prompted to enter a name for the engine asset.
- Each save creates a new **revision** — the library keeps a full history of changes.
- In the Vehicle Manager, click **Install from Library** in the engine section to select an engine from your library.
- The vehicle will use the full dyno curve from the Engine Sim instead of simple Peak HP/RPM.

**Benefits:** Changes to the engine asset automatically update all vehicles using it. No need to re-enter engine data for multiple vehicles.

### Import / Export .eng Files

**Importing:**
1. Click the **Import** button in the File tab.
2. Select a `.eng` file from the original Engine Jr or Engine Pro desktop software (versions 2.x or 3.x).
3. The engine data loads into the simulator immediately.
4. Click **Save As** to save it as a new engine document in your account.

**Exporting:**
1. Click the **Export** button in the File tab.
2. A `.eng` file is downloaded to your computer.
3. This file can be opened in the legacy VB6 Engine Jr or Engine Pro desktop software.

> **Tip:** Import is a great way to bring your existing engine library into RSA without re-entering all the data. The parser supports both v2 and v3 .eng file formats.

---

## 8. Worksheets

### 8.1 Compression Ratio Worksheet

Calculates the mechanical compression ratio from physical measurements:

| Field | Unit | Description |
|-------|------|-------------|
| Combustion Chamber Volume | cc | Measured or from manufacturer. Typical: 40–100 cc. |
| Piston to Deck Height | in | Distance piston top is below block deck. Negative if above. Typical: 0.000–0.025". |
| Head Gasket Thickness | in | Compressed gasket thickness. Typical: 0.018–0.048". |
| Piston Dome Volume | cc | Total dome volume. Typical: 10–25 cc. |

The compression ratio updates as you enter values. Double-click the result to transfer it to the main screen.

### 8.2 Carb CFM Worksheet

Calculates carburetor CFM at 1.5" Hg from physical measurements of the throttle bores:

| Field | Description |
|-------|-------------|
| Number of Primary Bores | How many primary throttle bores. |
| Primary Throttle Diameter | Diameter of each primary bore. |
| Primary Venturi Diameter | Diameter of each primary venturi. |
| Number of Secondary Bores | How many secondary bores (if 4-barrel). |
| Secondary Throttle Diameter | Diameter of each secondary bore. |
| Secondary Venturi Diameter | Diameter of each secondary venturi. |

### 8.3 Intake Port Flow Worksheet

Helps estimate maximum intake port flow if you don't have flowbench data. Uses valve diameter and port design characteristics to estimate CFM.

### 8.4 CSA Calculator (Cross-Section Area)

Calculates the minimum cross-sectional area of intake ports and runners. Useful for identifying flow restrictions in the intake path.

---

## 9. VB6 Crosswalk

| VB6 Term / Screen | RSA Web Equivalent |
|--------------------|--------------------|
| ENGINE jr / ENGINE Pro main screen | Engine Sim dashboard |
| File → Open (.eng) | File tab → Open, or Import button |
| File → Save (.eng) | File tab → Save / Save As |
| File → Print | File tab → Print (TODO: not yet available) |
| Dyno Data button | Dyno curve chart (always visible below inputs) |
| Compression Ratio Worksheet | CR Worksheet tab |
| Throttle CFM Worksheet | Carb CFM Worksheet tab |
| Intake Port Flow Worksheet | Intake Flow Worksheet tab |
| Min Cross-Section Area Worksheet | CSA Calculator tab |
| Calculated Parameters (on-screen) | Estimated performance summary |
| Mech Details (Pro only) | Mech Details tab |
| Flow Details (Pro only) | Flow Details tab |
| Recommendations (Pro only) | Recommendations tab |

### Key Differences from VB6

- **Instant recalculation** — same as VB6, every input change triggers recalc.
- **Cloud storage** — engine documents are saved to your account, not local .eng files. You can still import/export .eng files for compatibility.
- **Engine Library** — a new concept. Engines can be saved to a library and installed on vehicles for use in the Quarter Sim. VB6 had no direct link between Engine and Quarter programs.
- **Metric support** — bore, stroke, rod length, and valve diameter can be entered in millimeters. The simulator converts internally.
- **Revisions** — the engine library keeps a history of revisions. Each save creates a new revision rather than overwriting.

---

## 10. Common Mistakes and Troubleshooting

### "My predicted HP is way too high / too low"

- **Check compression ratio.** A CR of 14+ is only realistic for race engines with high-octane fuel.
- **Check intake flow.** The Max Intake Port Flow value has a huge effect. Make sure the test pressure and reference bore match your flowbench setup.
- **Check cam duration.** Intake duration at .050" should match your actual cam card. Don't use advertised duration (which is measured at a much smaller lift).
- **Check throttle CFM.** A 750 CFM carb is appropriate for a mild 350. A 1050 Dominator is for a serious race engine.

### "The dyno curve shape looks wrong"

- The curve is generated from an empirical model calibrated to hundreds of engines. If the shape looks unusual:
  - Check that bore/stroke ratio is realistic (typically 0.9–1.3).
  - Check that cam duration matches the RPM range you expect.
  - Verify the manifold type selection matches your actual manifold.

### "I changed a value but nothing happened"

- Make sure you pressed **Tab**, **Enter**, or clicked away from the field. The recalculation only triggers when you commit the value.

### "How do I get my engine data into the Quarter Sim?"

1. Save the engine to the **Engine Library** (File tab → Save to Library).
2. Go to **Vehicles** and edit your vehicle.
3. In the engine section, select the engine from your library.
4. The vehicle will use the full dyno curve from the Engine Sim instead of simple Peak HP/RPM.

### "What if I don't have flowbench data?"

- Use the **Intake Port Flow Worksheet** to estimate flow from valve diameter and port design.
- Or leave the Max Intake Port Flow at the default and adjust based on whether your predicted HP seems reasonable.
- As a rough guide: a well-ported small block Chevy head flows about 240–280 CFM at 28" H₂O.

### "Import failed for my .eng file"

- Make sure the file is from Engine Jr or Engine Pro version 3.x.
- The file must have a `.eng` extension.
- If the file is corrupted or from a very old version, try opening it in the desktop software first, re-saving it, then importing.

---

*For more help, see the [FAQ & Troubleshooting](FAQ_TROUBLESHOOTING.md) guide.*
