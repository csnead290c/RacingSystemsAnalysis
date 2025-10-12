/**
 * ProStock_Pro — VB6 printout constants (from legacy Quarter Pro)
 * Source snapshot values: see "General / Transmission / Final Drive / Aerodynamic / PMIs / Dyno"
 */

export const VB6_PROSTOCK_PRO = {
  // Environment (used by tests/fixtures, not global)
  env: {
    elevation_ft: 32,
    barometer_inHg: 29.92,
    temperature_F: 75,
    relHumidity_pct: 55,
    wind_mph: 5.0,
    wind_angle_deg: 135,
    trackTemp_F: 105,
    tractionIndex: 3,
  },

  // Vehicle mass/geometry
  vehicle: {
    weight_lb: 2355,
    wheelbase_in: 107,
    overhang_in: 40,           // front overhang (beam rollout geometry)
    rollout_in: 9,             // staging beam rollout (NOT tire rollout)
    tire: {
      rollout_in: 102.5,       // tire circumference
      width_in: 17.0,
    },
  },

  // Aerodynamics
  aero: {
    frontalArea_ft2: 18.2,
    Cd: 0.240,
    Cl: 0.100,
  },

  // Drivetrain
  drivetrain: {
    finalDrive: 4.86,
    overallEfficiency: 0.975,   // gc_Efficiency
    gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],   // 2nd..6th shown; treat as 1..5 usable
    perGearEff:  [0.990, 0.991, 0.992, 0.993, 0.994],
    shiftsRPM:   [9400, 9400, 9400, 9400],       // shift points between gears
    clutch: {
      launchRPM: 7200,
      slipRPM:   7600,
      slippageFactor: 1.004,    // VB6 "Clutch Slippage"
      lockup: false,
    },
  },

  // Polar moments of inertia (VB6 printout)
  pmi: {
    engine_flywheel_clutch: 3.42,
    transmission_driveshaft: 0.247,
    tires_wheels_ringgear: 50.8,
  },

  // Engine dyno curve (RPM, HP) from printout; torque implied (5252*HP/RPM)
  engineHP: [
    [7000, 1078],
    [7250, 1131],
    [7500, 1177],
    [7750, 1216],
    [8000, 1251],
    [8250, 1274],
    [8500, 1288],
    [8750, 1300],
    [9000, 1297],
    [9250, 1269],
    [9500, 1222],
  ],

  // Fuel system + multipliers (from printout)
  fuel: { type: 'Gasoline Carburetor', hpTorqueMultiplier: 1.000 },
} as const;

export type VB6ProStockPro = typeof VB6_PROSTOCK_PRO;
