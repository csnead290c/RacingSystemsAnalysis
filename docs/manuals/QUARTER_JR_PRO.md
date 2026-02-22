# Quarter Jr / Quarter Pro — User Manual

The Quarter simulator predicts dragstrip performance for any vehicle configuration. It calculates elapsed time (ET), trap speed (MPH), and detailed run data from launch to finish line — just like an on-board data recorder.

**Quarter Jr** uses simplified inputs (peak HP and RPM). **Quarter Pro** adds a full HP curve editor, advanced aero, polar moments of inertia, throttle stop, and more.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Jr vs Pro — What Changes](#2-jr-vs-pro--what-changes)
3. [First Run — Minimum Viable Workflow](#3-first-run--minimum-viable-workflow)
4. [Inputs Reference](#4-inputs-reference)
5. [Running a Simulation](#5-running-a-simulation)
6. [Reading Results](#6-reading-results)
7. [Saving and Loading](#7-saving-and-loading)
8. [What-If Adjustments](#8-what-if-adjustments)
9. [VB6 Crosswalk](#9-vb6-crosswalk)
10. [Common Mistakes and Troubleshooting](#10-common-mistakes-and-troubleshooting)

---

## 1. Overview

The Quarter simulator models the complete physics of a drag racing pass:

- **Launch** — clutch engagement or torque converter stall, tire traction
- **Acceleration** — engine power vs aerodynamic drag, rolling resistance, and rotating inertia
- **Gear changes** — shift points, RPM drop, transmission efficiency
- **Finish** — ET and MPH calculated exactly as the track timing system does

The simulation uses the same physics engine as the original RSA desktop software (VB6), producing results that match the legacy programs.

---

## 2. Jr vs Pro — What Changes

| Feature | Quarter Jr (Racer plan) | Quarter Pro (Pro plan) |
|---------|------------------------|----------------------|
| Engine input | Peak HP + RPM at peak | Full HP curve (up to 11 RPM/HP points) |
| HP/Torque Multiplier | — | ✓ |
| Aero inputs | Body style + frontal area | Drag coefficient + lift coefficient + frontal area |
| Polar moments of inertia | Estimated internally | User-specified (engine, trans, tires) |
| Clutch model | Slip RPM only | Launch RPM + Slip RPM + Clutch Slippage |
| Converter model | Stall RPM + diameter | + Torque Multiplication + Converter Slippage |
| Gear efficiencies | Single value | Per-gear efficiency |
| Final drive efficiency | — | ✓ |
| Overhang | — | ✓ |
| CG Height | — | ✓ |
| Static front weight | — | ✓ |
| Throttle Stop | — | ✓ |
| RPM Histogram | — | ✓ |
| Gear Optimizer | — | ✓ |

**Switching modes:** If you have a Pro subscription, you can switch between Jr and Pro mode on the **Account** page under Preferences → Interface Mode. Jr mode hides the advanced fields for a simpler experience.

---

## 3. First Run — Minimum Viable Workflow

**Time required:** 2–3 minutes.

1. **Go to Vehicles** → click **New Vehicle**.
2. **Enter the minimum fields:**
   - Name
   - Weight (total with driver, in lbs)
   - Peak HP (flywheel, not wheel HP)
   - RPM at Peak HP
   - Displacement (cubic inches)
   - Transmission type (Clutch or Converter)
   - At least one gear ratio
   - Rear gear ratio
   - Tire diameter (inches, unloaded)
3. **Save** the vehicle.
4. Click **Run Sim** (or go to Quarter Sim and select the vehicle).
5. The simulation runs automatically. You'll see the timeslip immediately.

> **Tip:** Start with the defaults and adjust one thing at a time. This is the fastest way to understand how each variable affects performance.

---

## 4. Inputs Reference

### 4.1 Environment (Weather)

These inputs determine how the engine's rated power is adjusted for actual conditions. Engine HP is always entered at "standard" conditions (sea level, 29.92 in Hg, 60°F, dry air).

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Elevation | ft | 0 | Actual dragstrip elevation above sea level. **Never use density altitude.** |
| Barometer | in Hg | 29.92 | Local barometric pressure. If using altimeter for elevation, keep this at 29.92. |
| Temperature | °F | 75 | Outside air temperature (dry bulb). |
| Humidity | % | 50 | Relative humidity. |
| Track Temp | °F | — | Racing surface temperature (Pro only). |
| Wind Velocity | mph | 0 | Wind speed regardless of direction (Pro only). |
| Wind Angle | deg | 0 | 0 = headwind, 180 = tailwind (Pro only). |
| Traction Index | 1–12 | 5 | Track surface grip. 1 = best national event prep, 5–6 = typical bracket race, 8–12 = street. |

> **Important:** The environment is saved with your vehicle after each run. Next time you select that vehicle, the saved environment loads automatically.

### 4.2 Vehicle

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Weight | lbs | 3,000 | Total vehicle weight including driver. |
| Wheelbase | in | 108 | Measured wheelbase. |
| Rollout | in | 12 | Distance the vehicle moves before the timing clock starts. Rule of thumb: half the staging tire diameter. **If set to 0, timing starts immediately (magazine-style testing).** |
| Body Style | dropdown | Sedan | Selects aerodynamic drag profile (Jr mode). Options: Dragster w/wing, Dragster, Funny Car, Altered/Roadster, Fastback, Sedan, Wagon/Truck/Van, Motorcycle. |
| Frontal Area | ft² | 22 | Projected frontal area of the vehicle. Use the Frontal Area Worksheet to calculate. |

**Pro-only vehicle fields:**

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Overhang | in | 40 | Distance the front of the vehicle overhangs the front axle. Effectively shortens the track. |
| CG Height | in | — | Center of gravity height above ground. |
| Static Front Weight | lbs | — | Weight on the front axle with the vehicle at rest. |

### 4.3 Engine (Jr Mode)

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Peak HP | HP | 400 | Flywheel horsepower at peak. Chassis dyno values are typically 10–15% lower. |
| RPM at Peak HP | RPM | 6,500 | Engine speed at peak power. |
| Displacement | CID | 350 | Engine displacement in cubic inches. |
| Fuel System | dropdown | Gasoline (Carb) | Fuel and delivery type. Affects air density correction. |
| N2O | checkbox | Off | Enable nitrous oxide modeling. |

### 4.4 Engine (Pro Mode — HP Curve)

In Pro mode, you enter a table of **RPM vs HP** (or RPM vs Torque) with up to 11 data points. This gives the simulator the full shape of your engine's power curve, not just the peak.

| Field | Description |
|-------|-------------|
| RPM column | Engine speed for each data point |
| HP column | Horsepower at that RPM (torque auto-calculated) |
| Torque column | Alternatively, enter torque and HP is auto-calculated |
| HP/Torque Multiplier | Scales all dyno data by a factor (e.g., 1.05 = +5%). Press Recalc to apply permanently. |

> **Tip:** If you have a chassis dyno sheet, multiply the wheel HP values by approximately 1.12 to estimate flywheel HP.

### 4.5 Transmission

**Clutch (Manual):**

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Slip RPM | RPM | 6,000 | Minimum engine RPM as the vehicle leaves the line. Not the staging RPM — the RPM when the car starts moving. |
| Launch RPM | RPM | 5,500 | Engine RPM at launch (Pro only). |
| Clutch Slippage | ratio | 1.004 | Small slippage factor even when locked (Pro only). 1.00 = no slip. |
| Lock-up | checkbox | Off | Lock the clutch during shifts. |
| Gear Ratios | — | 2.5, 1.8, 1.4, 1.1, 1.0 | Cumulative transmission gear ratios. Up to 6 gears. |
| Shift RPMs | RPM | 7,000 | Engine RPM at which each upshift occurs. |

**Converter (Automatic):**

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Stall RPM | RPM | — | Stall or "flash" speed of the torque converter. |
| Converter Diameter | in | — | Physical diameter of the converter. |
| Torque Multiplication | ratio | — | Static torque multiplication factor (Pro only). Typically 1.4–2.0. |
| Converter Slippage | ratio | — | Slippage above stall RPM (Pro only). Typically 1.03–1.08. |
| Lock-up | checkbox | — | Lock the converter after first shift. |

### 4.6 Final Drive

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Rear Gear Ratio | — | 3.73 | Final drive gear ratio. |
| Efficiency | ratio | 0.97 | Power transmission efficiency (Pro only). |
| Tire Diameter | in | 28 | Unloaded, properly inflated driving tire diameter. |
| Tire Width | in | 14 | Effective tire contact width. For treaded tires, subtract groove widths. |

### 4.7 Aerodynamics (Pro Mode)

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Frontal Area | ft² | 22 | Projected frontal area. |
| Drag Coefficient (Cd) | — | 0.35 | Aerodynamic drag coefficient. Typical: 0.30–0.45 for sedans, 0.50–0.80 for dragsters. |
| Lift Coefficient (Cl) | — | 0.10 | Aerodynamic lift/downforce coefficient. |

### 4.8 Polar Moments of Inertia (Pro Mode)

These represent the rotational inertia of drivetrain components. Units: in·lbs·sec².

| Field | Default | Description |
|-------|---------|-------------|
| Engine PMI | 3.5 | Crankshaft, flywheel, clutch/converter. Typical: 2.0–5.0. |
| Transmission PMI | 0.25 | Trans shafts, driveshaft, pinion gear. Typical: 0.1–0.8. |
| Tires PMI | 50 | Tires, wheels, brakes, axles, ring gear. Typical: 20–60. |

### 4.9 Throttle Stop (Pro Mode)

Used in bracket racing to slow the vehicle to hit a target ET.

| Field | Unit | Default | Description |
|-------|------|---------|-------------|
| Enabled | checkbox | Off | Turn throttle stop on/off. |
| Delay | sec | 0.5 | Time after launch before throttle stop activates. |
| Duration | sec | 0.3 | How long the throttle stop stays active. |
| Throttle % | % | 50 | Throttle opening while stop is active. |

---

## 5. Running a Simulation

### How It Works

1. Select or navigate to a vehicle on the Quarter Sim page.
2. The simulation runs **automatically** whenever the vehicle, environment, or race length changes (after a short debounce).
3. While calculating, you'll see a brief "updating..." indicator.
4. Results appear in under a second.

### What Gets Saved

After each successful run:
- **Last sim snapshot** — ET, MPH, and split times are saved to the vehicle.
- **Environment** — the weather conditions are saved so they load automatically next time.

These are saved to the server in the background. You don't need to click Save.

### Race Lengths

| Race Length | Distance | Available |
|-------------|----------|-----------|
| 1/8 Mile | 660 ft | Racer+ |
| 1/4 Mile | 1,320 ft | Racer+ |
| 1,000 ft | 1,000 ft | Pro |

---

## 6. Reading Results

### 6.1 Timeslip

The timeslip shows split times and speeds in the same format as a real dragstrip timing slip:

| Split | What It Means |
|-------|---------------|
| 60 ft | Time to cover the first 60 feet — a key measure of launch quality. |
| 330 ft | Time at 330 feet. |
| 1/8 Mile (660 ft) | Eighth-mile ET and MPH. MPH is measured over the 594–660 ft zone. |
| 1000 ft | Time at 1,000 feet. |
| 1/4 Mile (1320 ft) | Quarter-mile ET and MPH. MPH is measured over the 1254–1320 ft zone. |

> **Note on Rollout:** The first line of the timeslip shows the rollout time — the time to move the rollout distance before the clock starts. The ET clock resets to 0.000 after rollout. If rollout is set to 0, the clock starts immediately with vehicle movement.

### 6.2 Data Logger Chart

The chart displays run data like an on-board data recorder:

- **RPM** (red) — engine speed throughout the run
- **Speed** (green) — vehicle speed in MPH
- **Acceleration** (blue) — in g's
- **Wheel HP** — horsepower at the wheels
- **Engine HP** — horsepower at the flywheel
- **Gear** — current gear number

**Controls:**
- **X-axis toggle** — switch between Time and Distance on the horizontal axis.
- **Series pills** — click to show/hide individual data series.
- **Click on chart** — pins a readout at that point showing exact values.
- **Click the × button** — clears the pinned readout.

<!-- TODO: Screenshot of data logger chart with pinned readout -->

### 6.3 Detailed Parameters

Click the **Detailed Parameters** button to see the full row-by-row breakdown. This is the same tabular output as the VB6 "Detailed Parameters" screen.

Each row is triggered by an event:
- **Rollout** — initial conditions and the moment the clock starts.
- **Distance markers** — 30 ft, 60 ft, 330 ft, 660 ft, 1000 ft, 1320 ft.
- **Speed markers** — 0–60 MPH, 0–100 MPH.
- **Gear changes** — two rows per shift (before and after).
- **Time intervals** — regular intervals (0.5s, 1.0s, etc.).

**Columns:** Time, Distance, MPH, Acceleration (g), Gear, RPM.

An **(s)** next to the acceleration value means the tires are slipping at that point. One or two (s) marks during rollout are common. Three or more means you have a traction problem.

### 6.4 RPM Histogram (Pro Only)

Shows how much time the engine spends at each RPM during the run. Useful for:
- Identifying the "average" RPM (look for the 50% cumulative line).
- Focusing engine development on the RPM range that matters most.
- Evaluating converter stall speed — automatics spend most time near stall RPM.

---

## 7. Saving and Loading

### Vehicles

- Vehicles are saved to your account in the cloud.
- Click **Save** in the Vehicle Manager to persist changes.
- Use **Duplicate** to create a copy for what-if experiments.
- Use **Import .dat** to load a legacy VB6 Quarter data file.

### Run History

- Each simulation result can be saved to your local run history.
- Use the **Compare** feature to overlay a previous run on the chart.

---

## 8. What-If Adjustments

The Quarter Sim includes quick adjustment sliders:

- **HP Adjust** — add or subtract horsepower from the base vehicle (+/- HP delta).
- **Weight Adjust** — add or subtract weight from the base vehicle (+/- lbs).

These adjustments are temporary and do not modify the saved vehicle data. They're useful for quick "what if I added 50 HP?" experiments.

---

## 9. VB6 Crosswalk

If you're coming from the original RSA desktop software, here's how things map:

| VB6 Term / Screen | RSA Web Equivalent |
|--------------------|--------------------|
| Input Data screen | Vehicle Manager (edit form) |
| File → Open (.dat) | Vehicles → Import .dat |
| File → Save | Vehicle Manager → Save |
| Timeslip button (green TS) | Automatic — runs when vehicle is selected |
| Detailed Parameters button | "Detailed Parameters" button below timeslip |
| Vehicle Performance Graphs | Data Logger Chart (interactive, toggleable series) |
| RPM Histogram | RPM Histogram tab (Pro only) |
| Frontal Area Worksheet | Frontal Area Worksheet button (in vehicle editor) |
| Tire Width Worksheet | Tire Width Worksheet button |
| PMI Worksheets | PMI Worksheet button (Pro only) |
| File → Print | Not yet available (TODO) |
| Stall Index | Not yet exposed in UI (uses Stall RPM directly) |
| Preferences → data folder | N/A — cloud storage |

### Key Differences

- **No manual "Run" button** — the simulation runs automatically when inputs change.
- **Environment is saved per vehicle** — in VB6, weather was part of the .dat file. In RSA, it's saved separately and restored when you select the vehicle.
- **Pro-locked vehicles** — if a Pro user creates a vehicle with Pro-only features, that vehicle shows a lock icon for Racer-tier users. In VB6, there was no cross-tier locking.
- **HP Curve** — in VB6 Quarter Pro, you entered RPM/HP pairs directly on the input screen. In RSA, the HP curve editor is in the Vehicle Manager (Pro mode).

---

## 10. Common Mistakes and Troubleshooting

### "My ET is way off from my actual track times"

- **Check your HP.** Peak HP should be flywheel HP, not wheel HP. Chassis dyno numbers are typically 10–15% lower.
- **Check your weight.** Include the driver. A common mistake is using the vehicle's curb weight without the driver.
- **Check your traction index.** A value of 5–6 is typical for a well-prepped bracket track. Street tires on an unprepped surface might be 8–12.
- **Check your environment.** Hot, humid, high-altitude conditions reduce power significantly.

### "My 60-foot time is too quick / too slow"

- Adjust the **Traction Index**. Lower = more grip = quicker 60 ft.
- For clutch cars, check the **Slip RPM** (Jr) or **Launch RPM** (Pro).
- For converter cars, check the **Stall RPM**.

### "The timeslip shows (s) on many lines"

The **(s)** marker means tire slip. If you see it on 3+ lines after rollout, your combination has too much power for the available traction. Try:
- Increasing the Traction Index (better track prep).
- Reducing launch RPM.
- Adding weight.

### "Why does Rollout show x.xxx / 0.000?"

The first time is how long it takes to move the rollout distance. The second time (0.000) is the ET clock resetting — just like at the track. This is normal.

### "My vehicle has a lock icon"

This means the vehicle was created or edited using Pro-only features (HP curve, advanced aero, throttle stop, PMI, etc.). If your plan doesn't include Pro access, you can't run simulations with this vehicle. Upgrade to Pro, or create a new vehicle using only Jr-level inputs.

### "Numbers differ slightly from VB6"

RSA uses the same physics engine as the original VB6 software. Small differences (typically < 0.01s ET, < 0.5 MPH) can occur due to:
- Floating-point precision differences between VB6 (32-bit) and modern JavaScript (64-bit).
- Rounding at intermediate steps.

If you see larger differences, double-check that all inputs match exactly, especially the HP curve data points and environment settings.

---

*For more help, see the [FAQ & Troubleshooting](FAQ_TROUBLESHOOTING.md) guide.*
