# Performance Trends Competitive Analysis

## Company Overview
- **Company**: Performance Trends, Inc.
- **Location**: 31531 W Eight Mile Rd, Livonia, MI 48152
- **Phone**: (248) 473-9230
- **Website**: www.performancetrends.com
- **Focus**: Desktop Windows software for engine building and racing simulation

---

## Product Lineup

### 1. Drag Racing Analyzer
**Direct competitor to RSA's ET Simulator**

#### Features:
- ET, MPH, 60ft prediction
- Vehicle specs input (weight, CG height, frontal area)
- Engine power curve simulation
- Transmission specs (up to 10-speed, manual or automatic)
- Torque converter simulation with lockup
- Clutch simulation
- Tire traction modeling
- Weather correction (temp, humidity, barometer, dew point)
- **Throttle Stop Calculator** with adjustment factor
- **Dial-In Calculator** with safety margin
- History Log (25 runs)
- Time Slip output (like drag strip)
- Vehicle picture attachment
- Rotating inertia calculations (flywheel, wheels)
- "Match My Performance" - auto-tune specs to match actual times
- Graphing (RPM, MPH, Accel Gs vs time/distance)
- **Auto-Link to Engine Analyzer** for instant ET/MPH updates

#### Unique Features We Should Consider:
- **Optimize button** - instantly finds best converter or final drive ratio
- **Adjustment Factor** for throttle stops (calibration from 2 runs)
- **InstantCalc** - shows ET/MPH changes as you modify specs
- Vehicle weight estimator from popular car models
- Engine size converter (CC/Liters to cubic inches)

---

### 2. Engine Analyzer / Engine Analyzer Pro
**More advanced than RSA's Engine Sim**

#### Features:
- Full thermodynamic engine simulation
- Calculations every 4 degrees of crank rotation
- Dynamic valve train analysis
- Short block specs (bore, stroke, rod length, accessories, windage)
- Cylinder head specs with flow efficiency
- Intake system (manifold type, runner diameter/length, plenum)
- Exhaust system (header primary diameter/length, collector)
- Camshaft integration (reads Cam Dr files)
- Compression ratio calculator
- Flow bench data integration
- Intake/exhaust tuning effects
- Friction modeling (pistons, bearings, rings)
- Accessory power loss
- Supercharger/turbo simulation
- Nitrous oxide simulation

#### Cylinder Head Flow Efficiency Database:
- Extensive database of flow efficiency by era (1930s-1990s)
- Specific heads: SB Chevy, BB Chevy, Ford, Mopar, Pontiac, VW
- Flow efficiency at L/D=0.25 standard

#### Manifold Types Supported:
- Dual Plane (carb)
- Single Plane (carb)
- Tunnel Ram (carb)
- Single Plenum (EFI)
- Split Plenum (EFI)
- Individual Runner (carb or EFI)

---

### 3. Circle Track Analyzer
**No RSA equivalent - potential new product**

#### Features:
- Lap time prediction for oval tracks
- Suspension analysis (front/rear)
- Weight distribution (CG height calculator)
- Spring rate calculators (coil, leaf, torsion bar)
- Roll bar rate calculator
- Tire circumference/tread width calculator
- Quick change gear calculator
- Frontal area calculator
- Downforce modeling
- Cornering G simulation
- "Match My Lap Times" auto-tuning
- Track bank angle effects
- Driver aggressiveness modeling

#### Calculators:
- Rear axle ratio (ring/pinion, quick change, chain drive)
- Spring rate (coil, leaf, solid/hollow torsion bars)
- Roll bar rate (solid/hollow)
- Dew point from wet/dry bulb temps
- Relative humidity calculation
- CG height from raised vehicle test

---

### 4. Cam Analyzer
**No RSA equivalent - potential new product**

#### Features:
- Cam profile measurement and analysis
- Dial indicator + degree wheel data entry
- Find TDC procedure with printable data sheet
- Generate degree wheel readings
- Cam lift vs degree graphs
- Duration at .050" lift calculation
- Lobe area analysis
- Lobe lift measurement
- Cam comparison (overlay multiple cams)
- Export to Cam Dr format for Engine Analyzer Pro
- Read files from: Cam Dr, Cam Pro Plus, Doctor Dr
- Electronic Cam Test Stand integration
- FFT analysis (v4.0+)
- Filter test files (Plus version)

---

### 5. Port Flow Analyzer
**No RSA equivalent - potential new product**

#### Features:
- Flow bench data recording
- Flow efficiency calculations
- CFM at various valve lifts
- Swirl/tumble analysis
- Port comparison
- Integration with Engine Analyzer

---

### 6. Suspension Analyzer
**Similar to RSA's Suspension Sim but more comprehensive**

#### Features:
- 4-link geometry analysis
- Instant center calculation
- Anti-squat percentage
- Pinion angle changes
- Weight transfer analysis
- Shock travel analysis

---

## Key Differentiators: Performance Trends vs RSA

| Feature | Performance Trends | RSA |
|---------|-------------------|-----|
| Platform | Windows Desktop | Web (anywhere access) |
| Price Model | One-time purchase | Subscription |
| Engine Simulation | Very detailed (4° resolution) | VB6-exact port |
| Drag Racing | Full vehicle dynamics | VB6-exact physics |
| Circle Track | Yes | No |
| Cam Analysis | Yes | No |
| Port Flow | Yes | No |
| Weather | Manual entry | **Live auto-fetch** |
| Opponent Tracking | No | **Yes with AI prediction** |
| Race Day Dashboard | No | **Yes** |
| Competition Ladder | No | **Yes** |
| Data Import | Limited | **CSV + data loggers** |
| Mobile | No | **Yes (responsive)** |
| Cloud Sync | No | **Yes** |

---

## Features RSA Should Add (Priority Order)

### HIGH PRIORITY (Direct Competition)
1. **"Optimize" Function** - Auto-find best gear ratio or converter
2. **InstantCalc** - Show ET/MPH changes in real-time as specs change
3. **Match My Performance** - Auto-tune vehicle specs to match actual times
4. **Adjustment Factor** for throttle stops (more accurate predictions)

### MEDIUM PRIORITY (Expand Capabilities)
5. **Circle Track Module** - Oval racing simulation
6. **More Engine Detail** - Intake/exhaust tuning, flow efficiency
7. **Cam Profile Integration** - Import cam data for better simulation
8. **Rotating Inertia** - Detailed flywheel/wheel weight effects

### LOWER PRIORITY (Niche Features)
9. **Cam Analyzer** - Measure and analyze camshafts
10. **Port Flow Analyzer** - Flow bench data management
11. **Suspension Calculator** - Spring rate, roll bar calculations

---

## RSA Competitive Advantages

### Already Better Than Performance Trends:
1. **Web-based** - Access from any device, anywhere
2. **Live Weather** - Auto-fetch, no manual entry
3. **AI Opponent Prediction** - They have nothing like this
4. **Race Day Dashboard** - Real-time command center
5. **Competition Ladder** - Tournament bracket tracking
6. **Modern UI** - Clean, responsive design
7. **Cloud Storage** - Vehicles/runs sync across devices
8. **Data Import** - CSV, multiple data logger formats

### Performance Trends Advantages We Need to Match:
1. **Optimize Function** - One-click best gear/converter
2. **InstantCalc** - Real-time ET/MPH feedback
3. **Match Performance** - Auto-tune to actual times
4. **Detailed Engine Sim** - More thermodynamic detail
5. **Circle Track** - Oval racing market

---

## Recommended Development Priorities

### Phase 1: Match Key Features
- [ ] Add "Optimize Gear Ratio" button to ET Sim
- [ ] Add "Optimize Converter" button for automatics
- [ ] Add InstantCalc mode (real-time ET/MPH updates)
- [ ] Add "Match My Times" auto-tuning feature

### Phase 2: Expand Market
- [ ] Circle Track Analyzer module
- [ ] Enhanced engine simulation detail
- [ ] Cam profile import/integration

### Phase 3: Dominate
- [ ] AI-powered tune suggestions
- [ ] Machine learning from user data
- [ ] Social features (share setups)
- [ ] Team collaboration tools

---

## Conclusion

Performance Trends has been in business since the late 1990s with mature, detailed simulation software. However, their desktop-only approach and lack of modern features (live weather, AI prediction, mobile access) creates significant opportunity for RSA.

**RSA's strategy should be:**
1. Match their core simulation accuracy (already done with VB6 physics)
2. Add their best UX features (Optimize, InstantCalc, Match Performance)
3. Leverage web advantages they can't match (live weather, mobile, cloud)
4. Innovate beyond them (AI prediction, opponent tracking, race day tools)

The drag racing software market is ready for disruption by a modern, web-based solution.
