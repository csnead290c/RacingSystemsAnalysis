# RSA Web Application - Comprehensive Audit & Roadmap

## Date: December 7, 2024 (Updated)

---

## 1. ORIGINAL PROGRAM FEATURE PARITY

### Quarter Pro (VB6) - CORE FEATURES

| Feature | Status | Notes |
|---------|--------|-------|
| **Physics Simulation** | ✅ Complete | VB6Exact model with full parity |
| **Timeslip Output** | ✅ Complete | 60', 330', 1/8, 1000', 1/4 splits |
| **Vehicle Performance Graphs** | ✅ Complete | RPM, MPH, Acceleration vs Time/Distance |
| **RPM Histogram** | ✅ Complete | Shows time spent in each RPM range |
| **Detailed Parameters** | ✅ Complete | Collapsible table with key events |
| **Save/Load Vehicle Data** | ✅ Complete | Database-backed with user accounts |
| **Print Timeslip** | ✅ Complete | Print button added |
| **Worksheets (Frontal Area, etc.)** | ❌ Missing | Need calculation worksheets |
| **Traction Index Help** | ⚠️ Partial | Need visual help screens |
| **Preferences** | ⚠️ Partial | Basic preferences, need more options |

### Quarter Jr (VB6) - SIMPLIFIED VERSION

| Feature | Status | Notes |
|---------|--------|-------|
| **Peak HP/RPM Mode** | ✅ Complete | Synthetic HP curve generation |
| **Simplified Inputs** | ✅ Complete | Fewer required fields |
| **Basic Timeslip** | ✅ Complete | Same output as Pro |

### Bonneville Pro - LAND SPEED

| Feature | Status | Notes |
|---------|--------|-------|
| **Mile/Multi-mile Runs** | ✅ Complete | 1-5 mile race lengths |
| **Speed at Distance** | ✅ Complete | Shows speed at each mile marker |
| **Bonneville Constants** | ✅ Complete | Altitude-specific physics |

---

## 2. COMPETITOR ANALYSIS

### 2A. CREW CHIEF PRO (Bracket Racing Focus)

#### Features They Have That We Should Consider

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Run Log Book** | HIGH | ✅ Complete | Date, time, round, lane, dial-in |
| **Weather Integration** | HIGH | ✅ Complete | Live weather from tracks |
| **Track Database** | HIGH | ✅ Complete | Built-in + custom tracks |
| **ET Prediction** | HIGH | ✅ Complete | Core simulation |
| **Throttle Stop Calculator** | MEDIUM | ✅ Complete | Integrated into physics model + UI |
| **Opponent Statistics** | MEDIUM | ✅ Complete | Full opponent tracker with predictive analytics |
| **Competition Ladders** | LOW | ✅ Complete | Full bracket view with MOV |
| **Margin of Victory Calculator** | MEDIUM | ✅ Complete | Built into opponent tracker |
| **Run Completion** | HIGH | ✅ Complete | Predict finish from partial data |
| **Combination/Database Management** | HIGH | ⚠️ Partial | Vehicle grouping added |
| **Video Integration** | LOW | ❌ Missing | Attach video to runs |
| **Paging Weather Stations** | LOW | ❌ N/A | Hardware integration |
| **Data Acquisition Integration** | MEDIUM | ✅ Complete | CSV import with auto-detection |
| **Tech Cards Printing** | MEDIUM | ✅ Complete | Full tech card generator with print |
| **Accounting/Expense Tracking** | LOW | ❌ Missing | Track racing expenses |

### 2B. PERFORMANCE TRENDS (Engine Building Focus)

**Products**: Drag Racing Analyzer, Engine Analyzer Pro, Circle Track Analyzer, Cam Analyzer, Port Flow Analyzer

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Drag Racing Analyzer** | HIGH | ✅ Matched | Our VB6 physics is equivalent |
| **Optimize Gear Ratio** | HIGH | ✅ Complete | One-click find best final drive |
| **Optimize Converter** | HIGH | ✅ Complete | One-click find best stall speed |
| **InstantCalc Mode** | HIGH | ✅ Complete | Real-time ET/MPH as specs change |
| **Match My Times** | HIGH | ✅ Complete | Auto-tune specs to match actual runs |
| **Adjustment Factor** | MEDIUM | ❌ Missing | Throttle stop calibration from 2 runs |
| **Engine Analyzer Pro** | MEDIUM | ⚠️ Partial | We have basic engine sim |
| **Circle Track Analyzer** | LOW | ❌ Missing | Oval racing simulation |
| **Cam Analyzer** | LOW | ❌ Missing | Camshaft measurement/analysis |
| **Port Flow Analyzer** | LOW | ❌ Missing | Flow bench data management |
| **Rotating Inertia Detail** | MEDIUM | ❌ Missing | Flywheel/wheel weight effects |

### 2C. COMPUTECH (RaceAir + RaceBase)

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Weather Station Integration** | HIGH | ⚠️ Partial | Have API weather, need RaceAir connector |
| **DA/RAD/Correction Factors** | HIGH | ✅ Complete | Built into weather system |
| **Prediction Report Card** | HIGH | ❌ Missing | Grade which formula works best per car |
| **Multi-formula Support** | MEDIUM | ❌ Missing | Let users choose/compare formulas |

### 2D. GODEADON (Mobile Logbook)

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Mobile-first Logging** | HIGH | ⚠️ Partial | Responsive web, need native app |
| **Quick Run Entry** | HIGH | ⚠️ Partial | Could be faster |
| **Social/Community Features** | LOW | ❌ Missing | Share stats, leaderboards |

### 2E. TIME SLIP SIMULATOR (Finish Line Coaching)

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **Finish Line Scenarios** | MEDIUM | ❌ Missing | "What if I lifted here?" |
| **Driver Coaching Reports** | MEDIUM | ❌ Missing | "You lifted X ms early" |
| **Race Replay/Visualization** | LOW | ❌ Missing | 2D graphical replay |

### 2F. COMPETITIVE DIFFERENTIATION MATRIX

| Capability | CrewChief | Perf Trends | GoDeadOn | Computech | RSA |
|------------|-----------|-------------|----------|-----------|-----|
| Modern UX | ❌ | ❌ | ✅ | ❌ | ✅ |
| Mobile | ❌ | ❌ | ✅ | ❌ | ✅ |
| Cloud Sync | ❌ | ❌ | ✅ | ❌ | ✅ |
| Physics Sim | ✅ | ✅ | ❌ | ✅ | ✅ |
| ML Prediction | ❌ | ❌ | ❌ | ❌ | 🔜 |
| Transparent Formulas | ❌ | ⚠️ | ❌ | ⚠️ | ✅ |
| Hardware Agnostic | ❌ | ❌ | ✅ | ❌ | ✅ |
| Opponent AI | ❌ | ❌ | ❌ | ❌ | ✅ |
| Driver Coaching | ❌ | ❌ | ❌ | ❌ | 🔜 |

#### RSA Advantages Over ALL Competitors:
- ✅ **Web-based** - Access from any device, anywhere
- ✅ **Live Weather** - Auto-fetch, no manual entry
- ✅ **AI Opponent Prediction** - No competitor has this
- ✅ **Race Day Dashboard** - Unique to RSA
- ✅ **Competition Ladder** - Unique to RSA
- ✅ **Mobile Access** - Responsive design
- ✅ **Cloud Sync** - Data follows you
- ✅ **Modern UI** - Clean, intuitive interface
- ✅ **Transparent Formulas** - "Why did my ET change?"
- ✅ **Hardware Agnostic** - Works with any weather source

---

## 3. CURRENT WEB APP FEATURES

### ✅ Completed Features

1. **ET Simulator (Predict Page)**
   - VB6-exact physics simulation
   - Real-time what-if adjustments (HP, weight)
   - Data logger charts (RPM, Speed, Acceleration, HP)
   - Timeslip display with splits
   - Vehicle selector dropdown
   - Save/compare runs
   - Print timeslip
   - Copy timeslip to clipboard
   - **NEW: Detailed Parameters panel** (collapsible table of key events)
   - **NEW: Throttle Stop simulation** (for bracket racing)

2. **Dial-In Calculator (NEW)**
   - Dedicated bracket racing tool
   - Weather-adjusted predictions
   - Safety margin adjustments
   - History tracking

3. **Opponent Tracker (NEW)**
   - Track competitor performance
   - Predictive analytics (predict next ET)
   - Head-to-head statistics
   - Trend analysis (improving/declining)
   - Confidence levels on predictions

4. **Race Day Dashboard (NEW)**
   - Live dial-in calculation
   - Real-time weather updates
   - Round-by-round tracking
   - Density altitude & air correction
   - Quick run logging
   - Session statistics

5. **Data Import (NEW)**
   - CSV/TSV file import
   - Auto-detect column mappings
   - Support for RacePak, Holley, MSD, FuelTech exports
   - Import to Run Log or Opponent Tracker
   - Drag & drop file upload

6. **Tech Card Generator (NEW)**
   - Complete tech inspection card
   - Driver & vehicle safety equipment
   - Engine specifications
   - Print-ready output
   - Save cards per vehicle

7. **Competition Ladder (NEW)**
   - Tournament bracket visualization
   - Standard seeding (1v16, 2v15, etc.)
   - Automatic bye assignment
   - Round-by-round progression
   - Margin of victory calculation
   - Win reason tracking (faster, breakout, redlight, DQ)

8. **Vehicle Management**
   - Create/edit/delete vehicles
   - Vehicle grouping/categories
   - Duplicate vehicles
   - Public/private vehicles
   - Full physics parameters

9. **Run Log**
   - Record actual runs
   - Date, time, round, lane tracking
   - Reaction time, dial-in
   - Compute baseline prediction
   - Learning model for corrections

10. **Environment/Weather**
   - Live weather from Open-Meteo API
   - Track database with coordinates
   - Track angle for wind correction
   - Elevation/barometer toggle
   - Density altitude calculation

11. **User System**
   - Authentication (login/register)
   - Role-based access (owner, admin, user, beta)
   - Product entitlements

12. **Mobile Support**
   - Responsive layout
   - Charts working on iOS Safari
   - Touch-friendly controls

13. **Optimizer Tools (NEW)**
   - One-click gear ratio optimization
   - One-click converter stall optimization
   - Modal popup interface
   - Apply to session or save to vehicle
   - Visual results with mini charts

14. **InstantCalc Mode (NEW)**
   - Real-time ET/MPH updates as specs change
   - Toggle on/off in ET Simulator
   - Zero-delay feedback for tuning

15. **Explain This Run (NEW)**
   - Transparent prediction breakdown
   - Contributing factors analysis
   - Color-coded impact indicators
   - Quick tips based on conditions
   - Comparison to baseline runs

16. **Public Landing Page (NEW)**
   - Compelling value proposition
   - Feature highlights
   - Social proof / testimonials
   - Clear CTAs for registration

17. **Pricing Page (NEW)**
   - Tier comparison (Racer, Pro, Team)
   - Monthly/annual toggle
   - FAQ section
   - Clear feature matrix

18. **Registration Flow (NEW)**
   - Tier selection step
   - Account creation
   - Welcome/onboarding screen
   - Quick start guide

19. **Match My Times (NEW)**
   - Auto-tune vehicle specs to match actual runs
   - Enter 1-5 actual runs with ET/MPH
   - Algorithm adjusts HP and weight
   - Calculate calibration factor
   - Apply changes to current session

20. **Prediction Report Card (NEW)**
   - Grades prediction accuracy (A+ to F)
   - Trend analysis (improving/declining/stable)
   - Bias detection (consistently fast/slow)
   - Specific recommendations for improvement
   - Detailed run-by-run breakdown

21. **Shift by Time Mode (NEW)**
   - Alternative to shift by RPM
   - Enter elapsed time for each shift
   - Useful for consistent bracket racing
   - Pro mode feature

22. **Rev Limiter (NEW)**
   - High-side RPM limit option
   - Simulates fuel/spark cut at limit
   - Prevents over-rev in simulation

23. **1000ft Race Length (NEW)**
   - Added 1000ft as race distance option
   - Full support in ET Sim and logging
   - Toggle between 1/8, 1000', 1/4

24. **Traction Index Guide (NEW)**
   - Visual guide for selecting traction index
   - Color-coded levels from Poor to Pro Track
   - Inline help with examples
   - Click-to-select functionality

25. **Weather Correction Calculator (NEW)**
   - Calculate ET change from weather changes
   - Baseline vs current conditions comparison
   - Density altitude calculation
   - Individual factor breakdown (temp, baro, humidity)

26. **Run Comparison Overlay (NEW)**
   - Overlay comparison run on chart
   - Dashed lines for comparison data
   - Toggle comparison on/off
   - Compare RPM, speed, acceleration, HP

---

## 4. PRIORITY ROADMAP

### Phase 1: Complete Original Program Parity ✅ COMPLETE

1. ✅ **Detailed Parameters Panel**
   - Expandable panel showing all calculated values
   - Matches VB6 "Detailed Parameters" output

2. ✅ **Calculation Worksheets**
   - Frontal Area Calculator
   - Polar Moment of Inertia Calculator
   - Tire Width Calculator
   - Motorcycle Final Drive Calculator
   - Tire Rollout Calculator

3. ✅ **Help Screens**
   - Traction Index visual guide
   - Input field tooltips/help (Tooltip component)
   - Field help definitions

### Phase 2: Exceed Competition ✅ COMPLETE

1. ✅ **Dial-In Calculator Page**
   - Dedicated bracket racing tool
   - Weather-adjusted dial-in suggestions
   - Historical dial-in tracking

2. ✅ **Throttle Stop Calculator**
   - For bracket racers with throttle stops
   - Predict timer settings
   - Timer increment reference table

3. ✅ **Opponent Tracking**
   - Log opponent runs
   - Calculate margin of victory
   - Head-to-head statistics

4. ✅ **Data Import/Export**
   - CSV import/export utilities
   - Run log format support
   - Vehicle data format support

### Phase 3: New Innovations (FUTURE)

1. **Converter Sim**
   - Expand Clutch Sim to torque converters
   - K-factor modeling
   - Stall speed prediction

2. **Component Integration**
   - Use Engine Sim engines in vehicles
   - Use Clutch Sim clutches in vehicles
   - Suspension Sim integration

3. **AI/ML Predictions**
   - Learn from user's actual runs
   - Personalized correction factors
   - Track-specific adjustments

4. **Social Features**
   - Share vehicles/setups
   - Leaderboards
   - Racing team collaboration

---

## 5. TECHNICAL DEBT & IMPROVEMENTS

### Code Quality
- [ ] Remove remaining debug console.log statements
- [ ] Add comprehensive error boundaries
- [ ] Improve TypeScript strictness
- [ ] Add unit tests for physics models

### Performance
- [ ] Lazy load more components
- [ ] Optimize chart rendering
- [ ] Cache API responses

### Security
- [ ] Address GitHub Dependabot alerts (50 vulnerabilities)
- [ ] Implement rate limiting
- [ ] Add CSRF protection

### Mobile
- [x] Fix iOS Safari chart rendering
- [x] Improve timeslip layout
- [ ] Add PWA support for offline use
- [ ] Touch gesture improvements

---

## 6. SUCCESS METRICS

### Must Be Better Than Original VB6 Programs
- ✅ Same physics accuracy
- ✅ Modern web interface
- ✅ Cloud-based (access anywhere)
- ✅ Real-time calculations
- ✅ Live weather integration
- ⚠️ Need all worksheets/calculators

### Must Be Competitive With Crew Chief Pro
- ✅ Run logging with full context
- ✅ Track database
- ✅ Weather integration
- ❌ Need throttle stop calculator
- ❌ Need opponent tracking
- ❌ Need data acquisition import

---

## 7. IMMEDIATE NEXT STEPS

1. **Run database setup.php** to create tracks table
2. **Test Log page** compute baseline with VB6 physics
3. **Add Detailed Parameters panel** to ET Sim
4. **Create Dial-In Calculator** as separate page
5. **Add Throttle Stop Calculator** for bracket racing

---

*This document should be updated regularly as features are completed.*
