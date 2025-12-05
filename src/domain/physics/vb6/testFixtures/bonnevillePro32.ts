/**
 * Bonneville Pro 3.2 Test Case
 * 
 * Source: gascoupe.dat - test case for Bonneville Pro 3.2
 * Track: Bonneville - 5 Miles
 * 
 * Expected results from VB6:
 * - Time 73.86s at 5.00 miles (26400 ft)
 * - Top speed: 274.4 MPH
 * - Terminal velocity reached around 40-50 seconds
 */

import type { Vb6VehicleFixture } from '../fixtures';

export const BONNEVILLE_PRO_32_GASCOUPE: Vb6VehicleFixture = {
  env: {
    elevation_ft: 4500,
    barometer_inHg: 29.92,
    temperature_F: 75,
    relHumidity_pct: 55,
    wind_mph: 5.0,
    wind_angle_deg: 90,  // Crosswind
    trackTemp_F: 75,     // Same as ambient for salt flats
    tractionIndex: 5,    // Salt surface
  },

  vehicle: {
    weight_lb: 2350,
    wheelbase_in: 110,
    overhang_in: 0,      // Not specified, assume 0
    rollout_in: 103.0,   // "Tire Rollout - inches 103.0"
    staticFrontWeight_lb: 1175,  // Assume 50/50 distribution
    cgHeight_in: 18,     // Typical for coupe
    bodyStyle: 1,        // Coupe
    tire: {
      diameter_in: 26,   // Calculated from rollout: circumference = 103 * PI / PI ≈ 32.8", so dia ≈ 26"
      width_in: 10.0,    // "Tire Width - inches 10.00"
    },
  },

  aero: {
    frontalArea_ft2: 19.5,  // "Frontal Area - sq ft 19.5"
    Cd: 0.290,              // "Drag Coefficient 0.290"
    Cl: 0.600,              // "Lift Coefficient 0.600"
  },

  drivetrain: {
    finalDrive: 3.10,           // "Gear Ratio 3.10"
    overallEfficiency: 0.970,   // "Efficiency 0.970"
    // Gear ratios from transmission data
    // VB6 displays "2nd - 2.40" but internally this is TGR(1) - the first gear in the array
    // The "2nd" label is a land speed racing convention, not the array index
    // VB6 trace shows: Gear 1 @ 8900 RPM shifts to Gear 2 @ 7670 RPM
    // So TGR(1)=2.40 is used for "Gear 1" in the simulation
    gearRatios: [2.40, 1.99, 1.59, 1.24, 1.00],  // 5 gears as shown in VB6 (labeled 2nd-6th)
    perGearEff: [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftsRPM: [8900, 9000, 9000, 9000, 9000],  // Shift@ column
    clutch: {
      launchRPM: 7200,      // First row RPM
      slipRPM: 7200,        // "Slip RPM 7200"
      slippageFactor: 1.005, // "Clutch Slippage 1.005"
      lockup: false,        // "Lock-up option? No"
    },
  },

  pmi: {
    // Estimate typical values for a high-performance engine
    engine_flywheel_clutch: 0.8,
    transmission_driveshaft: 0.15,
    tires_wheels_ringgear: 2.5,
  },

  // Engine Dyno Data from the test case
  // RPM    HP    Torque
  // 6700  1030   807
  // 7200  1100   802
  // 7600  1140   788
  // 8200  1190   762
  // 8500  1200   741
  // 8800  1180   704
  // 9100  1080   623
  // 9300   950   537
  engineHP: [
    [6700, 1030],
    [7200, 1100],
    [7600, 1140],
    [8200, 1190],
    [8500, 1200],
    [8800, 1180],
    [9100, 1080],
    [9300, 950],
  ],

  fuel: {
    type: 'Gasoline Carburetor',
    hpTorqueMultiplier: 1.000,  // "HP/Torque Multiplier 1.000"
  },
};

/**
 * Expected simulation results from VB6 Bonneville Pro 3.2
 * These are the target values our simulation should match
 */
export const EXPECTED_RESULTS = {
  // Time-distance-speed checkpoints from the VB6 output
  checkpoints: [
    { time: 0.00, distance_mi: 0.00, mph: 0.0, accel_g: 1.16, gear: 1, rpm: 7200 },
    { time: 3.38, distance_mi: 0.05, mph: 100.0, accel_g: 1.08, gear: 1, rpm: 8000 },
    { time: 3.88, distance_mi: 0.06, mph: 111.2, accel_g: 0.93, gear: 1, rpm: 8900 },
    { time: 4.08, distance_mi: 0.07, mph: 115.7, accel_g: 0.99, gear: 2, rpm: 7670 },
    { time: 5.18, distance_mi: 0.11, mph: 136.0, accel_g: 0.71, gear: 2, rpm: 9000 },
    { time: 5.38, distance_mi: 0.12, mph: 139.3, accel_g: 0.75, gear: 3, rpm: 7370 },
    { time: 7.63, distance_mi: 0.21, mph: 170.5, accel_g: 0.50, gear: 3, rpm: 9000 },
    { time: 7.83, distance_mi: 0.22, mph: 172.7, accel_g: 0.50, gear: 4, rpm: 7200 },
    { time: 10.00, distance_mi: 0.33, mph: 194.2, accel_g: 0.41, gear: 4, rpm: 7980 },
    { time: 10.66, distance_mi: 0.37, mph: 200.0, accel_g: 0.39, gear: 4, rpm: 8220 },
    { time: 13.27, distance_mi: 0.52, mph: 218.9, accel_g: 0.25, gear: 4, rpm: 8990 },
    { time: 13.47, distance_mi: 0.54, mph: 220.0, accel_g: 0.25, gear: 5, rpm: 7280 },
    { time: 20.00, distance_mi: 0.96, mph: 247.8, accel_g: 0.15, gear: 5, rpm: 8190 },
    { time: 20.56, distance_mi: 1.00, mph: 249.5, accel_g: 0.14, gear: 5, rpm: 8250 },
    { time: 30.00, distance_mi: 1.68, mph: 267.4, accel_g: 0.04, gear: 5, rpm: 8830 },
    { time: 34.25, distance_mi: 2.00, mph: 270.1, accel_g: 0.02, gear: 5, rpm: 8920 },
    { time: 40.00, distance_mi: 2.43, mph: 271.4, accel_g: 0.01, gear: 5, rpm: 8960 },
    { time: 40.89, distance_mi: 2.50, mph: 271.5, accel_g: 0.00, gear: 5, rpm: 8960 },
    { time: 47.52, distance_mi: 3.00, mph: 272.1, accel_g: 0.00, gear: 5, rpm: 8980 },
    { time: 50.00, distance_mi: 3.19, mph: 272.3, accel_g: 0.00, gear: 5, rpm: 8990 },
    { time: 54.12, distance_mi: 3.50, mph: 272.7, accel_g: 0.00, gear: 5, rpm: 9000 },
    { time: 60.00, distance_mi: 3.95, mph: 273.2, accel_g: 0.00, gear: 5, rpm: 9020 },
    { time: 60.72, distance_mi: 4.00, mph: 273.3, accel_g: 0.00, gear: 5, rpm: 9020 },
    { time: 67.30, distance_mi: 4.50, mph: 273.9, accel_g: 0.00, gear: 5, rpm: 9040 },
    { time: 70.00, distance_mi: 4.71, mph: 274.1, accel_g: 0.00, gear: 5, rpm: 9050 },
    { time: 73.86, distance_mi: 5.00, mph: 274.4, accel_g: 0.00, gear: 5, rpm: 9060 },
  ],
  
  // Key metrics
  finalTime_s: 73.86,
  finalDistance_mi: 5.00,
  topSpeed_mph: 274.4,
  terminalVelocityReached_s: 40,  // Approximately when accel drops to 0.01g
};
