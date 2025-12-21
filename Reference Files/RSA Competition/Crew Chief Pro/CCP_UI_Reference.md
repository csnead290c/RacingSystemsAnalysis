# Crew Chief Pro UI Reference Screenshots

Reference screenshots captured December 2025 for RSA development.

## 1. Run Entry Form - Main Screen
**Screenshot: ccp_run_entry_main.png**

Main run entry form showing:
- Run Date, Run Number, Time of Day
- Lane (L/R), Round selection
- Database/Combination dropdown (e.g., "2013 Super Comp St. Louis")
- Track selection
- Full timing data entry: Delay Box, Reaction Time, 60ft, 330ft, 660' ET, 660' MPH, 1000ft, 1/4 Mile ET, 1/4 Mile MPH, Dial In
- Throttle Stop Info section: T-Stop #1, T-Stop #2, T-Stop Perfect#, Stop RPM
- Weather and Track Info display with calculations (Density Altitude, etc.)
- Vehicle setup summary: Launch RPM, Tire Pressure, Vehicle Weight
- Comments field
- Navigation: First, Prev, Next, Last buttons
- Bottom toolbar: Save Run, Search, Reports, Weather Is On, Event LogBook, Exit

## 2. Predict Tab - ET Prediction Screen
**Screenshot: ccp_predict_et.png**

ET Prediction interface showing:
- Base Line vs Current weather columns with Difference calculations
- Weather variables: Temperature, Humidity, Barometer, Dew Point, Wind Speed, Direction, Weather Station DA, Weather Station AA
- Your Estimated 60 Foot, Target Elapsed Time inputs
- Calculated values: Vapor Pressure, Grains Per Pound, CC Density Altitude, CC Corr Altitude, Dry Density Altitude, HP Factor, Relative Air Density, Vehicle Weight, Track Temperature
- ET Change column showing impact of each variable
- ET Prediction section with multiple formulas:
  - Crew Chief #1 Formula (on AA)
  - Vapor Pressure Formula
  - Crew Chief #2 Formula
- T-Stop Predictions section showing calculated stop times
- "Slower By" calculation
- T-Stop/ET Ratio
- Options: No Wind In Predictions, Wind Changes Predictions, See Similar Runs
- DA with ½ Baro and ½ Humid effect option

## 3. Opponent Information Tab
**Screenshot: ccp_opponent_info.png**

Opponent comparison interface showing:
- Side-by-side comparison: Opponent's E.T. vs Your E.T.
- Full timing breakdown: Reaction Time, 60 Foot, 330 Foot, 660' E.T., 660' MPH, 1000 Foot, Original Quarter E.T., Orig Quarter MPH, Dial In, Off By, Total Time, Feet Per Sec
- ET Diff / Actual Distance column showing distance differences (e.g., "80.5 Ft Behind", "37.5 Ft Behind")
- Opponent details: Opponent #, Name, Class, Comments, Stage Style
- "Save Opponent" button
- **Margin of Victory Information** box:
  - Your Notes field
  - Opponent's Notes field
  - Stallbaumer's Margin calculation
  - "You Beat [OPPONENT]!" celebration graphic

## 4. Finish Line Manager Tab
**Screenshot: ccp_finish_line_manager.png**

Race scenario calculator showing:
- Quick Fill Opponent ETs dropdown
- Comparison grid: 60 Foot, 330 Foot, 660 Foot, 660 MPH, 1000 Foot, 1/4 Mile, 1/4 MPH, FT/Sec, Dial-In
- Opponent's ETs row vs Your ETs row
- (+/-) difference row
- Position predictions at each distance:
  - "At 330 ft You Should Be 40.9 Feet Behind Your Opponent"
  - "At 660 ft You Should Be 42.3 Feet Behind Your Opponent"
  - "At 1000 ft You Should Be 20.8 Feet Behind Your Opponent"
  - "At MPH Cone You Should Be 2.7 Feet Ahead of Your Opponent"
- Note: "Assumes Similar Reaction Times"
- Reset ETs button
- Directions explaining how to use the feature

## 5. Run Completion Tab
**Screenshot: ccp_run_completion.png**

No-brake ET calculation showing:
- "ET if you did not have to Brake - or lifted off the gas" header
- No-Brake E.T.: 8.891
- No-Brake MPH: 181.28
- **"Accept New ET" button** - key feature for updating prediction model
- "Choose Different Run" button
- Current Run vs Previous Run vs Average of Runs comparison:
  - 1000ft times and diffs
  - ET times and diffs
  - MPH and diffs
  - 1/8th Mile ET and diffs
  - 60 Foot times and diffs
- Split intervals: 660-1000ft, 1000ft-1/4, 1254 Foot
- **Completion Formula** dropdown: "Off 1/8th to 1000 Ft Split"
- 1/8th - 1/4 Ratio calculation
- Note: "Only Use This Screen if You Were On The Brakes or Lifted"

## 6. Weather Graphs Tab
**Screenshot: ccp_weather_graphs.png**

Weather trend analysis showing:
- Three graph panels:
  1. Temperature/Humidity/Barometer over time
  2. Grains/Vapor Pressure/Dew Point/Humidity over time
  3. Density Corrected/Dry Density/Pressure Altitude over time
- Current Weather Readings panel:
  - Temperature: 68.0
  - Humidity: 41.4
  - Barometer: 29.990
  - Density Alt: 850
  - Adjusted Alt: 439
  - Grains/Lbs: 42.0
  - Vapor Press: 0.2858
  - HP Factor: 1.0101
  - Wind Speed: 9
  - Wind Direct: 184
- Wind Speed histogram chart
- Print Report, Weather Stats buttons
- Change Date, Change Graph dropdowns
- "Clean Up Data" button

## 7. Event Log Book View
**Screenshot: ccp_event_logbook.png**

Spreadsheet-style run history showing:
- Multiple runs in columns with "See It" buttons
- Date, Time, Lane, Run# for each run
- Row data: Delay Box, R/T, 60 Foot, 330 Foot, 1/8 E.T., 1/8 MPH, 1000 Foot, 1/4 E.T., 1/4 MPH, Dial In
- T-Stop values and Optimal# calculations
- Weather data: Density Alt, Temp, Humid, Baro
- Calculated values: HP Factor, Vap Press, Grains/lbs, RelAirDen, TrackTmp, STD ET
- Wind Info
- **Split time intervals with differences between columns**:
  - 60' - 330'
  - 330' - 660'
  - 660'-1000'
  - 1000' - 1/4
  - 660' - 1/4
- Color-coded cells for quick comparison
- "Saved Runs" indicator

## 8. Print Preview - Detailed Run Report
**Screenshot: ccp_print_preview.png**

Comprehensive print report showing:
- Combination and track header
- Multiple runs side-by-side with all data
- Full timing data with differences
- Weather data
- T-Stop calculations
- Split time intervals
- Notes section at bottom with prediction details

## 9. Custom Formula Editor
**Screenshot: ccp_custom_formula.png**

"Create Your Own Formula for #1 Prediction" dialog:
- **Choose Weather Variables** checklist:
  - Temperature, Humidity, Barometer, Dew Point, Density Altitude, Adjusted Altitude, Vapor Pressure, Grains, HP Correction, Relative Air Density, Actual Air Density, Relative O2 Density, Vapor HP Correction, Track Temp/.01 ET
  - Optimal TS Factor checkbox
- **Adjust Factors / .01 ET** column:
  - Temperature / .01 ET: 3.0000
  - Humidity / .01 ET: 10.000
  - Barometer / .01 ET: 0.1000
  - Dew Point / .01 ET: 8.000
  - HP Correction / .01 ET: 0.00055
  - Density Altitude / .01 ET: 300
  - Adjusted Altitude / .01 ET: 300
  - Vapor Pressure Factor / .01 ET: 0.20000
  - Grains / .01 ET: 15.000
  - Rel Air Dens / .01 ET: 2.7000
  - Actual Air Dens / .01 ET: 2.7000
  - Rel O2 Dens / .01 ET: 1.1700
  - Vapor HP Correction: 0.00048
  - Track Temp ET Ratio: 0.0080
  - Optimal T-Stop Factor: 90.42 / 113.0
- "Use AA (Default Formula)" button
- "Save & Return" button

## 10. Predict Tab - Base Run Selection
**Screenshot: ccp_predict_base_run.png**

Base run selection interface showing:
- Base Run vs Current weather comparison
- Weather variables with differences
- **"Your Average 60 Ft in Database" dropdown** - key feature for selecting reference 60ft time
- Options for 60ft adjustment methods:
  - Your Estimated 60 Foot
  - Density Adjusted 60 Ft
  - Track Temp Adjusted 60 Ft
  - Vapor Pressure Adjusted 60 Ft
  - Humidity Adjusted 60 Ft
  - Barometer Adjusted 60 Ft
  - HP Factor Adjusted 60 Ft
  - T-Stop Adjusted 60 Ft
  - DA-Baro-RH Adjusted 60 Ft
  - **Your Average 60 Ft in Database** - uses historical average
- Vehicle Weight display
- Track Temperature display
- Base E.T. and No Wind E.T. calculations
- No Wind In Predictions / Wind Changes Predictions checkboxes

---

## Key RSA Implementation Notes

### Already Implemented in RSA:
- ✅ Run logging with timing data
- ✅ Weather input and calculations
- ✅ Opponent information with MOV calculation
- ✅ Run completion estimation
- ✅ Vehicle combinations (via vehicle groups)

### To Consider Adding:
- [ ] Weather graphs/trends over time
- [ ] Custom prediction formula editor
- [ ] "Accept New ET" for brake runs (update model)
- [ ] Split time interval comparisons between runs
- [ ] Finish line position calculator
- [ ] Event logbook spreadsheet view
- [ ] Print-ready reports
- [ ] Average 60ft from database for predictions
- [ ] Multiple prediction formulas (Crew Chief #1, #2, Vapor Pressure)
