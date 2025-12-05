/**
 * Bonneville Pro 3.2 Test Case - Motorcycle (motorcyc.dat)
 * 
 * This fixture captures the exact VB6 Bonneville Pro 3.2 test case
 * for a motorcycle at El Mirage Dry Lake.
 * 
 * Expected Results:
 * - Final Time: 42.75s
 * - Final Speed: 128.4 MPH
 * - Final RPM: 11,650
 * - Final Gear: 6
 */

import { Vb6VehicleFixture } from '../fixtures';

export const BONNEVILLE_MOTORCYCLE: Vb6VehicleFixture = {
  env: {
    elevation_ft: 600,
    barometer_inHg: 29.92,
    temperature_F: 69,
    relHumidity_pct: 45,
    wind_mph: 6.0,
    wind_angle_deg: 45,
    trackTemp_F: 69,     // Same as ambient for dry lake
    tractionIndex: 8,    // "Traction Index 8"
  },

  vehicle: {
    weight_lb: 615,
    wheelbase_in: 80,
    overhang_in: 0,
    rollout_in: 78.5,    // Calculated from tire diameter: 25 * PI = 78.5"
    staticFrontWeight_lb: 308,  // Assume 50/50 distribution
    cgHeight_in: 24,     // Typical for motorcycle
    bodyStyle: 8,        // Motorcycle (BodyStyle = 8)
    tire: {
      diameter_in: 25.0,   // "Tire Diameter - inches 25.0"
      width_in: 5.00,      // "Tire Width - inches 5.00"
    },
  },

  aero: {
    frontalArea_ft2: 6.6,   // "Frontal Area - sq ft 6.6"
    Cd: 0.550,              // "Drag Coefficient 0.550"
    Cl: 0.050,              // "Lift Coefficient 0.050"
  },

  drivetrain: {
    finalDrive: 5.72,           // "Gear Ratio 5.72"
    overallEfficiency: 0.990,   // "Efficiency 0.990"
    // Gear ratios from transmission data (6 gears: 2nd-7th in VB6 display)
    gearRatios: [3.08, 2.06, 1.65, 1.40, 1.23, 1.10],
    perGearEff: [0.990, 0.991, 0.992, 0.993, 0.994, 0.995],
    shiftsRPM: [11000, 10900, 10800, 10800, 10800, 0],  // Shift@ column
    clutch: {
      launchRPM: 9000,      // First row RPM
      slipRPM: 9000,        // "Slip RPM 9000"
      slippageFactor: 1.000, // "Clutch Slippage 1.000"
      lockup: true,         // "Lock-up option? Yes"
    },
  },

  pmi: {
    engine_flywheel_clutch: 0.3,   // Smaller for motorcycle
    transmission_driveshaft: 0.05,
    tires_wheels_ringgear: 0.1,
  },

  // Engine HP curve from dyno data
  // RPM    HP   Torque
  // 6500   40   32
  // 7000   47   35
  // 7500   54   38
  // 8000   58   38
  // 8500   62   38
  // 9000   65   38
  // 9500   70   39
  // 10000  72   38
  // 10500  73   37
  // 11000  74   35
  // 11500  73   33
  engineHP: [
    [6500, 40],
    [7000, 47],
    [7500, 54],
    [8000, 58],
    [8500, 62],
    [9000, 65],
    [9500, 70],
    [10000, 72],
    [10500, 73],
    [11000, 74],
    [11500, 73],
  ],

  fuel: {
    type: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,  // "HP/Torque Multiplier 1.000"
  },
};

// VB6 Expected checkpoints from the output
export const BONNEVILLE_MOTORCYCLE_CHECKPOINTS = [
  { time: 0.00, dist_mi: 0.00, mph: 0.0, accel_g: 0.76, gear: 1, rpm: 9000 },
  { time: 2.08, dist_mi: 0.01, mph: 43.1, accel_g: 0.73, gear: 1, rpm: 11000 },
  { time: 2.28, dist_mi: 0.02, mph: 45.7, accel_g: 0.56, gear: 2, rpm: 7790 },
  { time: 3.88, dist_mi: 0.04, mph: 63.8, accel_g: 0.47, gear: 2, rpm: 10880 },
  { time: 4.08, dist_mi: 0.04, mph: 65.6, accel_g: 0.40, gear: 3, rpm: 8960 },
  { time: 5.00, dist_mi: 0.06, mph: 73.5, accel_g: 0.37, gear: 3, rpm: 10020 },
  { time: 5.75, dist_mi: 0.08, mph: 79.2, accel_g: 0.33, gear: 3, rpm: 10800 },
  { time: 5.95, dist_mi: 0.08, mph: 80.5, accel_g: 0.30, gear: 4, rpm: 9320 },
  { time: 7.74, dist_mi: 0.13, mph: 91.1, accel_g: 0.24, gear: 4, rpm: 10540 },
  { time: 8.19, dist_mi: 0.14, mph: 93.4, accel_g: 0.23, gear: 4, rpm: 10800 },
  { time: 8.39, dist_mi: 0.14, mph: 94.3, accel_g: 0.21, gear: 5, rpm: 9590 },
  { time: 9.75, dist_mi: 0.18, mph: 100.0, accel_g: 0.18, gear: 5, rpm: 10160 },
  { time: 10.00, dist_mi: 0.19, mph: 101.0, accel_g: 0.17, gear: 5, rpm: 10250 },
  { time: 11.56, dist_mi: 0.23, mph: 106.3, accel_g: 0.14, gear: 5, rpm: 10790 },
  { time: 11.75, dist_mi: 0.24, mph: 106.8, accel_g: 0.13, gear: 6, rpm: 9700 },
  { time: 12.22, dist_mi: 0.25, mph: 108.1, accel_g: 0.12, gear: 6, rpm: 9810 },
  { time: 15.00, dist_mi: 0.34, mph: 114.4, accel_g: 0.09, gear: 6, rpm: 10380 },
  { time: 19.99, dist_mi: 0.50, mph: 121.5, accel_g: 0.05, gear: 6, rpm: 11030 },
  { time: 20.00, dist_mi: 0.50, mph: 121.5, accel_g: 0.05, gear: 6, rpm: 11030 },
  { time: 25.00, dist_mi: 0.67, mph: 125.2, accel_g: 0.02, gear: 6, rpm: 11350 },
  { time: 27.24, dist_mi: 0.75, mph: 126.1, accel_g: 0.02, gear: 6, rpm: 11440 },
  { time: 30.00, dist_mi: 0.85, mph: 126.9, accel_g: 0.01, gear: 6, rpm: 11510 },
  { time: 34.32, dist_mi: 1.00, mph: 127.7, accel_g: 0.01, gear: 6, rpm: 11580 },
  { time: 35.00, dist_mi: 1.02, mph: 127.7, accel_g: 0.01, gear: 6, rpm: 11580 },
  { time: 37.14, dist_mi: 1.10, mph: 127.9, accel_g: 0.00, gear: 6, rpm: 11600 },
  { time: 39.95, dist_mi: 1.20, mph: 128.2, accel_g: 0.00, gear: 6, rpm: 11620 },
  { time: 40.00, dist_mi: 1.20, mph: 128.2, accel_g: 0.00, gear: 6, rpm: 11620 },
  { time: 42.75, dist_mi: 1.30, mph: 128.4, accel_g: 0.00, gear: 6, rpm: 11650 },
];

// Final expected results
export const BONNEVILLE_MOTORCYCLE_EXPECTED = {
  finalTime_s: 42.75,
  finalSpeed_mph: 128.4,
  finalRPM: 11650,
  finalGear: 6,
  finalDist_mi: 1.30,
};
