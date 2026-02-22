# RSA Quick Start Guide

Welcome to **Racing Systems Analysis (RSA)** — the web-based successor to the classic RSA desktop software by Patrick Hale. RSA brings Quarter Jr, Quarter Pro, Engine Jr, and Engine Pro to your browser with no installation required.

This guide gets you from sign-up to your first simulation in under 10 minutes.

---

## 1. Create an Account / Sign In

1. Go to the RSA home page and click **Sign In** (top right).
2. Sign in with your **Google account** or create an RSA account with email and password.
3. After signing in you land on the **Home** page, which shows your vehicles and quick actions.

> **Tip:** Your plan (Free, Racer, Pro) determines which features are available. You can view your current plan on the **Account** page. Upgrade anytime from Account → **Upgrade**.

<!-- TODO: Screenshot of sign-in page -->

---

## 2. Create Your First Vehicle

Vehicles are the foundation of every Quarter simulation. Each vehicle stores all the data needed to predict dragstrip performance.

1. Click **Vehicles** in the navigation bar.
2. Click **New Vehicle**.
3. Enter the basics:
   - **Name** — give it a memorable name (e.g., "My Camaro").
   - **Weight** — total vehicle weight including driver, in pounds.
   - **Peak HP** — flywheel horsepower (as measured on an engine dyno, not a chassis dyno).
   - **RPM at Peak HP** — the engine speed where peak HP occurs.
   - **Displacement** — engine displacement in cubic inches (CID).
4. Set the drivetrain:
   - Choose **Clutch** (manual) or **Converter** (automatic).
   - Enter your **Gear Ratios** (transmission) and **Rear Gear** (final drive).
   - Enter **Tire Diameter** in inches (unloaded, properly inflated).
5. Click **Save**.

> **Tip:** You can leave most fields at their defaults for a quick first run. Come back and refine later.

<!-- TODO: Screenshot of vehicle form with key fields highlighted -->

---

## 3. Run a Quarter Simulation

1. From the **Vehicles** page, click **Run Sim** next to your vehicle.
   - Or navigate to **Quarter Sim** and select your vehicle from the dropdown.
2. The simulation runs automatically when a vehicle is selected.
3. You'll see:
   - **Timeslip** — ET and MPH at 60 ft, 330 ft, 1/8 mile, 1000 ft, and 1/4 mile.
   - **Data Logger Chart** — RPM, speed, acceleration, and more plotted over time or distance.
   - **Detailed Parameters** button — the full row-by-row breakdown (like a VB6 printout).

### Adjusting Weather / Environment

The **Environment** panel (left side) lets you set:
- **Elevation** (ft above sea level)
- **Temperature** (°F)
- **Barometer** (in Hg)
- **Humidity** (%)

You can also click **Fetch Weather** to pull live conditions from a saved track or your current location (Pro feature).

> **Important:** Engine HP is rated at "standard" conditions (sea level, 29.92 in Hg, 60°F, 0% humidity). The simulation automatically adjusts power for your actual weather conditions using the SAE J1349 method — the same correction used by the original RSA software.

<!-- TODO: Screenshot of Quarter Sim with timeslip visible -->

---

## 4. Where "Last Run" Shows Up

After each successful simulation:
- Your **last ET and MPH** are saved to the vehicle automatically.
- You can see them on the **Home** page in the "Your Vehicles" table under the **Last Run** column.
- They also appear as subtext below the vehicle selector dropdown on the Quarter Sim page.
- The **weather conditions** from your last run are saved too, and will be restored next time you select that vehicle.

---

## 5. Create or Load an Engine (Engine Sim)

The Engine Sim predicts horsepower and torque from engine design parameters — bore, stroke, compression ratio, cam, cylinder head flow, and more.

1. Navigate to **Engine Sim** in the nav bar.
2. The default engine loads automatically (a 355 Chevy small block).
3. Modify any input and the results update instantly:
   - **Estimated Peak HP** and **Peak Torque** with RPM
   - **Dyno Curve** chart (HP and Torque vs RPM)
4. To save your work:
   - Click **Save** to update the current document.
   - Click **Save As** to create a new document.
5. To load a previous engine:
   - Click **Open** and select from your saved engine documents.

### Importing Legacy .eng Files

If you have `.eng` files from the original Engine Jr or Engine Pro desktop software:
1. Click the **Import** button (upload icon) in the File tab.
2. Select your `.eng` file.
3. The engine data will be loaded into the simulator.

### Installing an Engine on a Vehicle

Engines from the Engine Sim library can be installed on vehicles for use in the Quarter Sim:
1. Go to **Vehicles** and edit a vehicle.
2. In the engine section, select an engine from your library.
3. The vehicle will use that engine's full dyno curve instead of simple Peak HP/RPM.

<!-- TODO: Screenshot of Engine Sim dashboard -->

---

## 6. Run an Engine Simulation

Unlike the Quarter Sim, the Engine Sim recalculates **instantly** whenever you change any input — there's no "Run" button. Just change a value and the results update.

**Outputs include:**
- **Peak HP** and **Peak Torque** with their RPM values
- **Dyno Curve** — HP and Torque plotted against RPM
- **Worksheets** — Compression Ratio, Carb CFM, Intake Flow, CSA Calculator

**Pro-only outputs** (Engine Pro):
- **Mechanical Details** — piston speed, depth vs crank angle
- **Flow Details** — valve events, flow area, demand CFM
- **Recommendations** — intake, exhaust, and camshaft suggestions

---

## 7. Plan Differences at a Glance

| Feature | Free | Racer (Basic) | Pro |
|---------|------|---------------|-----|
| Quarter Sim (Jr mode) | — | ✓ | ✓ |
| Quarter Sim (Pro mode) | — | — | ✓ |
| Engine Sim (Jr mode) | — | ✓ | ✓ |
| Engine Sim (Pro mode) | — | — | ✓ |
| Vehicle Manager | — | ✓ | ✓ |
| Calculators | — | ✓ | ✓ |
| Vehicles limit | — | 3 | Unlimited |
| HP Curve editor | — | — | ✓ |
| Throttle Stop | — | — | ✓ |
| Live Weather | — | — | ✓ |
| Gear Optimizer | — | — | ✓ |
| Advanced aero/PMI fields | — | — | ✓ |

> **Note:** If a Pro user creates a vehicle using Pro-only features (HP curve, advanced aero, throttle stop, etc.), that vehicle becomes "Pro-locked." A Racer-tier user cannot run simulations with a Pro-locked vehicle — they'll see a lock icon and a message explaining why.

---

## Next Steps

- **[Quarter Jr / Quarter Pro Manual](QUARTER_JR_PRO.md)** — full input reference, output guide, and tips.
- **[Engine Jr / Engine Pro Manual](ENGINE_JR_PRO.md)** — complete engine sim guide.
- **[FAQ & Troubleshooting](FAQ_TROUBLESHOOTING.md)** — common questions and solutions.

---

*RSA — Computer Software for Drag Racers. Originally developed by Patrick Hale, 1978.*
