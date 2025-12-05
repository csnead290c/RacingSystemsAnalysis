/**
 * Bonneville Pro 3.2 Test Case - Lakester (lakester.dat)
 * 
 * This fixture captures the exact VB6 Bonneville Pro 3.2 test case
 * for a high-powered lakester at Bonneville - 3 Miles.
 * 
 * Expected Results:
 * - Final Time: 41.83s
 * - Final Speed: 292.7 MPH
 * - Final RPM: 9,300
 * - Final Gear: 3
 */

import { Vb6VehicleFixture } from '../fixtures';

export const BONNEVILLE_LAKESTER: Vb6VehicleFixture = {
  env: {
    elevation_ft: 0,
    barometer_inHg: 29.92,
    temperature_F: 77,
    relHumidity_pct: 45,
    wind_mph: 0.0,
    wind_angle_deg: 0,
    trackTemp_F: 77,
    tractionIndex: 7,    // "Traction Index 7"
  },

  vehicle: {
    weight_lb: 1980,
    wheelbase_in: 205,
    overhang_in: 0,
    rollout_in: 113.0,    // "Tire Rollout - inches 113.0"
    staticFrontWeight_lb: 990,  // Assume 50/50 distribution
    cgHeight_in: 12,      // Low CG for lakester
    bodyStyle: 2,         // Streamliner/Lakester
    tire: {
      diameter_in: 36.0,   // Calculated from rollout: 113 / PI ≈ 36"
      width_in: 10.00,     // "Tire Width - inches 10.00"
    },
  },

  aero: {
    frontalArea_ft2: 16.2,  // "Frontal Area - sq ft 16.2"
    Cd: 0.580,              // "Drag Coefficient 0.580"
    Cl: 0.400,              // "Lift Coefficient 0.400"
  },

  drivetrain: {
    finalDrive: 3.20,           // "Gear Ratio 3.20"
    overallEfficiency: 0.970,   // "Efficiency 0.970"
    // Gear ratios from transmission data (3 gears: 2nd-4th in VB6 display)
    gearRatios: [1.96, 1.35, 1.00],
    perGearEff: [0.960, 0.975, 0.990],
    shiftsRPM: [9400, 9600, 100],  // Shift@ column (100 = no shift for top gear)
    clutch: {
      launchRPM: 6600,      // First row RPM
      slipRPM: 6600,        // "Slip RPM 6600"
      slippageFactor: 1.010, // "Clutch Slippage 1.010"
      lockup: false,        // "Lock-up option? No"
    },
  },

  pmi: {
    engine_flywheel_clutch: 1.2,
    transmission_driveshaft: 0.2,
    tires_wheels_ringgear: 3.0,
  },

  // Engine Dyno Data from the test case - Supercharged Methanol
  // RPM    HP     Torque
  // 6000   1445   1265
  // 6500   1604   1296
  // 7000   1768   1327
  // 7500   1937   1356
  // 8000   2083   1368
  // 8500   2146   1326
  // 9000   2100   1225
  // 9500   1832   1013
  // 10000  1436   754
  engineHP: [
    [6000, 1445],
    [6500, 1604],
    [7000, 1768],
    [7500, 1937],
    [8000, 2083],
    [8500, 2146],
    [9000, 2100],
    [9500, 1832],
    [10000, 1436],
  ],

  fuel: {
    type: 'Supercharged Methanol',
    hpTorqueMultiplier: 1.000,  // "HP/Torque Multiplier 1.000"
  },
};

// VB6 Expected checkpoints from the output
export const BONNEVILLE_LAKESTER_CHECKPOINTS = [
  { time: 0.00, dist_mi: 0.00, mph: 0.0, accel_g: 1.74, gear: 1, rpm: 6600 },
  { time: 2.53, dist_mi: 0.04, mph: 100.0, accel_g: 1.68, gear: 1, rpm: 6600 },
  { time: 3.00, dist_mi: 0.05, mph: 116.5, accel_g: 1.58, gear: 1, rpm: 7330 },
  { time: 3.97, dist_mi: 0.09, mph: 149.8, accel_g: 1.50, gear: 1, rpm: 9400 },
  { time: 4.17, dist_mi: 0.10, mph: 155.7, accel_g: 1.34, gear: 2, rpm: 6730 },
  { time: 5.79, dist_mi: 0.18, mph: 200.0, accel_g: 1.10, gear: 2, rpm: 8620 },
  { time: 6.00, dist_mi: 0.19, mph: 204.8, accel_g: 1.02, gear: 2, rpm: 8830 },
  { time: 7.06, dist_mi: 0.25, mph: 223.0, accel_g: 0.56, gear: 2, rpm: 9600 },
  { time: 7.26, dist_mi: 0.26, mph: 225.8, accel_g: 0.63, gear: 3, rpm: 7200 },
  { time: 9.00, dist_mi: 0.38, mph: 247.4, accel_g: 0.52, gear: 3, rpm: 7880 },
  { time: 10.72, dist_mi: 0.50, mph: 264.4, accel_g: 0.38, gear: 3, rpm: 8410 },
  { time: 12.00, dist_mi: 0.60, mph: 273.6, accel_g: 0.28, gear: 3, rpm: 8700 },
  { time: 15.00, dist_mi: 0.83, mph: 285.8, accel_g: 0.11, gear: 3, rpm: 9080 },
  { time: 17.13, dist_mi: 1.00, mph: 289.0, accel_g: 0.04, gear: 3, rpm: 9190 },
  { time: 18.00, dist_mi: 1.07, mph: 289.7, accel_g: 0.03, gear: 3, rpm: 9210 },
  { time: 21.00, dist_mi: 1.31, mph: 290.8, accel_g: 0.01, gear: 3, rpm: 9240 },
  { time: 23.33, dist_mi: 1.50, mph: 291.1, accel_g: 0.00, gear: 3, rpm: 9250 },
  { time: 24.00, dist_mi: 1.55, mph: 291.1, accel_g: 0.00, gear: 3, rpm: 9250 },
  { time: 27.00, dist_mi: 1.80, mph: 291.4, accel_g: 0.00, gear: 3, rpm: 9260 },
  { time: 29.50, dist_mi: 2.00, mph: 291.6, accel_g: 0.00, gear: 3, rpm: 9270 },
  { time: 30.00, dist_mi: 2.04, mph: 291.7, accel_g: 0.00, gear: 3, rpm: 9270 },
  { time: 32.59, dist_mi: 2.25, mph: 291.9, accel_g: 0.00, gear: 3, rpm: 9270 },
  { time: 33.00, dist_mi: 2.28, mph: 291.9, accel_g: 0.00, gear: 3, rpm: 9280 },
  { time: 35.67, dist_mi: 2.50, mph: 292.2, accel_g: 0.00, gear: 3, rpm: 9280 },
  { time: 36.00, dist_mi: 2.53, mph: 292.2, accel_g: 0.00, gear: 3, rpm: 9280 },
  { time: 38.75, dist_mi: 2.75, mph: 292.4, accel_g: 0.00, gear: 3, rpm: 9290 },
  { time: 39.00, dist_mi: 2.77, mph: 292.4, accel_g: 0.00, gear: 3, rpm: 9290 },
  { time: 41.83, dist_mi: 3.00, mph: 292.7, accel_g: 0.00, gear: 3, rpm: 9300 },
];

// Final expected results
export const BONNEVILLE_LAKESTER_EXPECTED = {
  finalTime_s: 41.83,
  finalSpeed_mph: 292.7,
  finalRPM: 9300,
  finalGear: 3,
  finalDist_mi: 3.00,
};
