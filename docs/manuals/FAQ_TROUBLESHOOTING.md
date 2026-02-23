# FAQ & Troubleshooting

Answers to the most common questions about RSA. If your question isn't here, contact support.

---

## Table of Contents

- [Account & Plans](#account--plans)
- [Vehicles](#vehicles)
- [Quarter Sim](#quarter-sim)
- [Engine Sim](#engine-sim)
- [General / Technical](#general--technical)

---

## Account & Plans

### How do I create an account?

Click **Sign In** on the home page. You can sign in with Google or create an account with email and password.

### What's the difference between Free, Racer, and Pro?

| | Free | Racer (Basic) | Pro |
|---|------|---------------|-----|
| Quarter Sim | — | Jr mode | Jr + Pro mode |
| Engine Sim | — | Jr mode | Jr + Pro mode |
| Vehicles | — | Up to 3 | Unlimited |
| HP Curve editor | — | — | ✓ |
| Throttle Stop | — | — | ✓ |
| Live Weather | — | — | ✓ |
| Gear Optimizer | — | — | ✓ |
| Advanced fields (aero, PMI) | — | — | ✓ |

### How do I upgrade my plan?

Go to **Account** → click **Upgrade**. You'll be taken to the pricing page where you can select a plan. Payment is handled through Stripe.

### How do I manage my subscription?

Go to **Account** → click **Manage**. This opens the Stripe customer portal where you can change plans, update payment methods, or cancel.

### What is Jr mode vs Pro mode?

- **Jr mode** uses simplified inputs — peak HP and RPM, body style for aero, no PMI fields.
- **Pro mode** adds full HP curve, drag/lift coefficients, per-gear efficiencies, polar moments of inertia, throttle stop, and more.

If you have a Pro subscription, you can switch between modes on the **Account** page under Preferences → Interface Mode.

---

## Vehicles

### Why is my vehicle locked?

A vehicle shows a lock icon (🔒) when it was created or edited using **Pro-only features** — such as an HP curve, advanced aero coefficients, throttle stop, or polar moments of inertia.

**The lock is based on a flag:** `usesQuarterProFeatures` is set to `true` when a Pro user saves a vehicle with any Pro-only fields. This flag never automatically reverts, even if you later remove the Pro-only data.

If your current plan doesn't include Pro access, you cannot run simulations with a Pro-locked vehicle.

**Solutions:**
- **Upgrade to Pro** to unlock the vehicle.
- **Create a new vehicle** using only Jr-level inputs (peak HP, body style, etc.).
- **Duplicate** the locked vehicle and simplify it by removing Pro-only data (requires Pro access to edit).

📖 **See also:** [Quarter Manual - Common Issues: Why is my vehicle locked?](QUARTER_JR_PRO.md#why-is-my-vehicle-locked)

### How many vehicles can I have?

- **Racer plan:** Up to 3 vehicles.
- **Pro plan:** Unlimited vehicles.

### Can I import vehicles from the old VB6 software?

Yes. In the Vehicle Manager, click **Import .dat** and select a `.dat` file from the original Quarter Jr or Quarter Pro desktop software.

### What does "Last Run" mean?

After each successful Quarter simulation, the ET, MPH, and split times (60ft, 330ft, 660ft, 1000ft) are automatically saved to the vehicle. This snapshot appears in the Vehicles table as "Last: X.XXXs @ XXX.X mph" below the vehicle name.

The last run snapshot is saved to the server in the background — you don't need to click Save.

📖 **See also:** [Quarter Manual - Running a Simulation: What Gets Saved](QUARTER_JR_PRO.md#what-gets-saved)

### How do I duplicate a vehicle?

In the Vehicle Manager, click the **Duplicate** button next to any vehicle. You'll be prompted to enter a name for the copy.

---

## Quarter Sim

### How do I reproduce the same result every time?

The environment is **automatically saved** with your vehicle after each successful simulation run. When you select that vehicle again (via vehicle selector, "Run Sim" button, or navigation), the saved environment loads automatically.

This ensures you can reproduce the exact same run conditions:
1. The saved environment loads automatically (elevation, temperature, barometer, humidity, traction, wind).
2. The vehicle configuration is unchanged (unless you edit it).
3. Running the sim again produces the same results (within floating-point precision).

**To verify:** On the vehicle selector page, if the vehicle has a saved environment, you'll see "✓ Will load saved environment when you start simulation" below the vehicle dropdown.

📖 **See also:** [Quarter Manual - Common Issues: How do I reproduce the same run?](QUARTER_JR_PRO.md#how-do-i-reproduce-the-same-run)

### Why does Rollout show x.xxx / 0.000?

In the Detailed Parameters output, the first row shows "Rollout x.xxx/0.000":

- **First number (x.xxx):** Time in seconds to move the rollout distance (typically 12 inches, half the tire diameter).
- **Second number (0.000):** The ET clock resetting to zero — just like at the track, the timing clock starts after the vehicle moves through the rollout distance.

This matches real dragstrip timing systems. If you set Rollout to 0 inches, timing starts immediately with vehicle movement (magazine-style testing).

📖 **See also:** [Quarter Manual - Common Issues: What does Rollout x.xxx/0.00 mean?](QUARTER_JR_PRO.md#what-does-rollout-xxxx000-mean)

### Why do my numbers differ from VB6?

RSA uses the same physics engine as the original VB6 software. Small differences (typically < 0.01s ET, < 0.5 MPH) can occur due to:
- Floating-point precision differences between VB6 (32-bit) and modern JavaScript (64-bit).
- Rounding at intermediate steps.

If you see **larger** differences, double-check that all inputs match exactly, especially:
- HP curve data points (Pro mode)
- Environment settings (elevation, temperature, barometer, humidity)
- Traction index
- Rollout distance

📖 **See also:** [Quarter Manual - Common Issues: Why do results differ from VB6?](QUARTER_JR_PRO.md#why-do-results-differ-from-vb6)

### What is Stall RPM (converter)?

**Stall RPM** is the stall or "flash" speed of the torque converter — the RPM where the converter stops multiplying torque and begins to couple.

For most converter cars, the Launch RPM (the actual engine RPM when staged and ready to launch) equals the Stall RPM. However, some vehicles stage at idle or on an RPM limiter, in which case the Launch RPM would be lower than the Stall RPM.

**In Quarter Jr mode**, Launch RPM automatically equals Stall RPM. **In Quarter Pro mode**, you can specify a different Launch RPM if your vehicle stages at a different RPM than the converter stall speed.

📖 **See also:** [Quarter Manual - Inputs Reference: Converter](QUARTER_JR_PRO.md#45-transmission)

### What does Slip RPM do (clutch)?

**Slip RPM** is the minimum engine RPM observed as the vehicle leaves the starting line. It's the RPM below which the clutch slips — not the staging RPM, but the RPM when the car actually starts moving.

Think of it this way: you stage at 5,500 RPM, dump the clutch, and the engine drops to 4,000 RPM as the car launches. The Slip RPM is 4,000.

### What is Traction Index?

Traction Index specifies how much grip the track surface provides:

| Value | Condition |
|-------|-----------|
| 1 | Best traction ever — national event, perfectly prepped |
| 2–3 | Excellent — well-prepped divisional event |
| 4–5 | Good — typical bracket race with track prep |
| 6–7 | Average — local bracket race, moderate prep |
| 8–10 | Poor — minimal prep, older track surface |
| 10–12 | Street — no prep, street tires |

### What is the Data Logger Chart?

The chart displays your simulated run data exactly like an on-board data recorder:

- **RPM** — engine speed throughout the run
- **Speed** — vehicle speed in MPH
- **Acceleration** — in g's (1g = 32.174 ft/s²)
- **Wheel HP / Engine HP** — power at the wheels and flywheel
- **Gear** — current transmission gear

You can toggle series on/off, switch between time and distance on the X-axis, and click to pin a readout at any point.

### What are Detailed Parameters?

Click the **📊 Detail** button (below the timeslip) to see the full row-by-row breakdown. This is the same tabular output as the VB6 "Detailed Parameters" screen.

Each row is triggered by an event:
- **Rollout** — initial conditions and the moment the clock starts
- **Distance markers** — 30, 60, 330, 660, 1000, 1320 ft
- **Speed markers** — 0–60 MPH, 0–100 MPH
- **Gear changes** — two rows per shift (before/after)
- **Time intervals** — regular intervals (0.5s, 1.0s, etc.)

**Columns:** Time, Distance, MPH, Acceleration (g), Gear, RPM.

An **(s)** next to acceleration means tire slip at that point. One or two (s) marks during rollout are common. Three or more means you have a traction problem.

📖 **See also:** [Quarter Manual - Reading Results: Detailed Parameters](QUARTER_JR_PRO.md#63-detailed-parameters)

### What is the throttle stop? (Pro only)

A throttle stop is a device used in bracket racing to slow the vehicle down to hit a target ET. In the simulation:

- **Delay** — seconds after launch before the throttle stop activates.
- **Duration** — how long the throttle stop stays active.
- **Throttle %** — the throttle opening while the stop is active (e.g., 30% = partial throttle).

The throttle stop temporarily reduces engine power, then releases back to full throttle.

### How does the environment affect my results?

Engine HP is always entered at "standard" conditions:
- Sea level elevation
- 29.92 in Hg barometer
- 60°F temperature
- 0% humidity (dry air)

The simulation adjusts power for your actual conditions using the **SAE J1349** correction method — the same method used by the original RSA software and by most engine dyno facilities.

**Hot, humid, high-altitude conditions reduce power.** A typical summer day at a 2,000 ft elevation track might cost 5–8% of rated power.

---

## Engine Sim

### How do I import/export .eng files?

**Import:**
1. Go to **Engine Sim** → **File** tab.
2. Click the **Import** button (upload icon).
3. Select a `.eng` file from Engine Jr or Engine Pro desktop software.

**Export:**
1. Go to **Engine Sim** → **File** tab.
2. Click the **Export** button (download icon).
3. A `.eng` file downloads that can be opened in the legacy desktop software.

### How do I get my engine into the Quarter Sim?

1. In the Engine Sim, click **Save as Engine Asset** button.
2. Enter a name for the engine asset.
3. Go to **Vehicles** and edit your vehicle.
4. In the engine section, click **Install from Library**.
5. Select the engine from your library.
6. The vehicle will use the full dyno curve from the Engine Sim instead of simple Peak HP/RPM.

**Benefits:** Changes to the engine asset automatically update all vehicles using it.

📖 **See also:** [Engine Manual - Saving and Loading: Engine Library](ENGINE_JR_PRO.md#engine-library-for-quarter-sim)

### What if I don't have flowbench data?

You have several options:
- Use the **Intake Port Flow Worksheet** to estimate flow from valve diameter and port design.
- Leave the default flow value and adjust based on whether predicted HP seems reasonable.
- **Rough guide:** A well-ported small block Chevy head flows about 240–280 CFM at 28" H₂O.

### Why does the Engine Sim recalculate on every input change?

This matches the original VB6 behavior. Every time you commit a value (Tab, Enter, or click away), the engine performance is recalculated and the results update. This gives you immediate feedback on how each variable affects performance.

### What cam types are available?

From most aggressive to mildest:
1. **Overhead cam** — DOHC/SOHC designs
2. **Roller cam and lifter** — highest lift rate for pushrod engines
3. **Mushroom tappet** — high lift rate, limited by tappet bore
4. **High rate-of-lift flat tappet** — aggressive flat tappet grind
5. **Typical flat tappet or solid lifter** — standard performance cam
6. **Hydraulic roller** — roller with hydraulic lash adjustment
7. **Normal hydraulic** — stock-type hydraulic flat tappet

The cam type affects the valve lift profile shape, which influences airflow and power.

---

## General / Technical

### Is my data safe?

Yes. Vehicle and engine data are stored in the cloud on secure servers. Your data is private to your account.

### Does RSA work on mobile?

Yes. RSA is a web application that works in any modern browser, including mobile. The interface adapts to smaller screens. Some features like the Data Logger Chart are more comfortable on larger screens.

### Can I use RSA offline?

RSA requires an internet connection for sign-in and data sync. However, the simulation engine runs entirely in your browser — once the page is loaded, calculations happen locally on your device.

### What browsers are supported?

RSA works in all modern browsers:
- Chrome (recommended)
- Firefox
- Safari
- Edge

### How accurate is the simulation?

The Quarter simulator uses the same physics engine as the original RSA desktop software, which has been used by thousands of racers since 1985. Accuracy depends on the quality of your input data:

- **With accurate inputs** (dyno-verified HP, measured weight, known converter stall, etc.), results typically match real track times within 0.05–0.10 seconds ET.
- **With estimated inputs**, results are useful for comparative analysis (e.g., "how much does 50 HP gain me?") even if the absolute numbers aren't perfect.

The Engine simulator has been calibrated against dyno data from hundreds of engines across a wide range of configurations.

### I found a bug. How do I report it?

Contact support with:
1. What you were doing when the issue occurred.
2. What you expected to happen.
3. What actually happened.
4. Your browser and device type.

---

*Still have questions? Check the [Quarter Manual](QUARTER_JR_PRO.md) or [Engine Manual](ENGINE_JR_PRO.md) for detailed input references.*
