/**
 * Extended vehicle configurations for legacy benchmark validation.
 * Values pulled from Quarter Pro / Quarter Jr printouts.
 * Some items marked TODO to tighten once we wire every field exactly.
 */

export type FuelType = 'GAS' | 'METHANOL' | 'NITRO';

export interface ExtendedVehicleConfig {
  name: string;
  fuel?: FuelType;
  env: {
    elevation: number;
    barometerInHg: number;
    temperatureF: number;
    humidityPct: number;
    windMph?: number;
    windAngleDeg?: number;
    trackTempF?: number;
    tractionIndex?: number;
  };
  vehicle: {
    weightLb: number;
    wheelbaseIn?: number;
    overhangIn?: number;
    tireDiaIn?: number;
    tireWidthIn?: number;
    tireRolloutIn?: number;
    rolloutIn?: number;

    frontalArea_ft2?: number;
    cd?: number;
    liftCoeff?: number;

    rearGear?: number;
    finalDrive?: number; // alias of rearGear
    transEff?: number;

    gearRatios?: number[]; // [g1,g2,...]
    gearEff?: number[]; // per-gear eff, optional
    shiftRPM?: number[]; // per-gear upshift rpm

    converter?: {
      launchRPM?: number;
      stallRPM?: number;
      slipRatio?: number; // e.g. 1.06
      torqueMult?: number; // e.g. 1.70
      lockup?: boolean;
      diameterIn?: number;
    };

    clutch?: {
      launchRPM?: number;
      slipRPM?: number;
      slipRatio?: number;
      lockup?: boolean;
    };

    powerHP?: number; // fallback if no torqueCurve
    torqueCurve?: { rpm: number; hp?: number; tq_lbft?: number }[]; // allow hp-only rows
  };
}

// NOTE: These configs are transcribed from your Quarter Pro / Jr sheets.
// If any field says TODO, we'll fill from the exact row on the printout in the next pass.

export const BENCHMARK_CONFIGS: Record<string, ExtendedVehicleConfig> = {
  // ===== QUARTER PRO CASES =====
  ProStock_Pro: {
    name: 'ProStock_Pro',
    fuel: 'GAS',
    env: {
      elevation: 32,
      barometerInHg: 29.92,
      temperatureF: 75,
      humidityPct: 55,
      windMph: 5,
      windAngleDeg: 135,
      trackTempF: 105,
      tractionIndex: 3,
    },
    vehicle: {
      weightLb: 2355,
      wheelbaseIn: 107,
      overhangIn: 40,
      rolloutIn: 9,
      tireRolloutIn: 102.5,
      tireWidthIn: 17.0,

      frontalArea_ft2: 18.2,
      cd: 0.24,
      liftCoeff: 0.1,

      finalDrive: 4.86,
      transEff: 0.975,

      gearRatios: [2.6, 1.9, 1.5, 1.2, 1.0],
      gearEff: [0.99, 0.991, 0.992, 0.993, 0.994],
      shiftRPM: [9400, 9400, 9400, 9400],

      clutch: { launchRPM: 7200, slipRPM: 7600, slipRatio: 1.004, lockup: false },

      // Full HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 7000, hp: 1220 },
        { rpm: 7200, hp: 1235 },
        { rpm: 7400, hp: 1248 },
        { rpm: 7600, hp: 1258 },
        { rpm: 7800, hp: 1266 },
        { rpm: 8000, hp: 1272 },
        { rpm: 8200, hp: 1276 },
        { rpm: 8400, hp: 1278 },
        { rpm: 8600, hp: 1279 },
        { rpm: 8800, hp: 1278 },
        { rpm: 9000, hp: 1276 },
        { rpm: 9200, hp: 1272 },
        { rpm: 9400, hp: 1266 },
        { rpm: 9500, hp: 1263 },
      ],
    },
  },

  FunnyCar_Pro: {
    name: 'FunnyCar_Pro',
    fuel: 'NITRO',
    env: {
      elevation: 300,
      barometerInHg: 29.92,
      temperatureF: 76,
      humidityPct: 50,
      windMph: 0,
      trackTempF: 112,
      tractionIndex: 1,
    },
    vehicle: {
      weightLb: 2350,
      wheelbaseIn: 125,
      overhangIn: 40,
      rolloutIn: 12,
      tireRolloutIn: 118.0,
      tireWidthIn: 18.0,

      frontalArea_ft2: 24.1,
      cd: 0.5,
      liftCoeff: 0.8,

      finalDrive: 3.2,
      transEff: 0.96,

      gearRatios: [1.0],
      gearEff: [1.0],
      shiftRPM: [100], // direct

      clutch: { launchRPM: 6400, slipRPM: 6800, slipRatio: 1.0, lockup: false },

      // Full nitro HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 6400, hp: 6000 },
        { rpm: 6600, hp: 6200 },
        { rpm: 6800, hp: 6380 },
        { rpm: 7000, hp: 6540 },
        { rpm: 7200, hp: 6680 },
        { rpm: 7400, hp: 6800 },
        { rpm: 7600, hp: 6900 },
        { rpm: 7800, hp: 6980 },
        { rpm: 8000, hp: 7040 },
      ],
    },
  },

  TA_Dragster_Pro: {
    name: 'TA_Dragster_Pro',
    fuel: 'METHANOL',
    env: {
      elevation: 0,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 45,
      windMph: 0,
      trackTempF: 110,
      tractionIndex: 2,
    },
    vehicle: {
      weightLb: 1980,
      wheelbaseIn: 280,
      overhangIn: 30,
      rolloutIn: 12,
      tireRolloutIn: 110.0,
      tireWidthIn: 17.0,

      frontalArea_ft2: 19.5,
      cd: 0.58,
      liftCoeff: 0.4,

      finalDrive: 4.56,
      transEff: 0.97,

      gearRatios: [1.85, 1.3, 1.0],
      gearEff: [0.97, 0.98, 0.99],
      shiftRPM: [9200, 9400],

      clutch: { launchRPM: 6000, slipRPM: 7200, slipRatio: 1.01, lockup: false },

      // Full methanol HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 6000, hp: 1800 },
        { rpm: 6500, hp: 2000 },
        { rpm: 7000, hp: 2180 },
        { rpm: 7500, hp: 2340 },
        { rpm: 8000, hp: 2480 },
        { rpm: 8500, hp: 2600 },
        { rpm: 9000, hp: 2700 },
        { rpm: 9500, hp: 2780 },
        { rpm: 10000, hp: 2840 },
        { rpm: 10500, hp: 2880 },
        { rpm: 11000, hp: 2900 },
        { rpm: 11500, hp: 2900 },
      ],
    },
  },

  SuperComp_Pro: {
    name: 'SuperComp_Pro',
    fuel: 'GAS',
    env: {
      elevation: 600,
      barometerInHg: 29.92,
      temperatureF: 87,
      humidityPct: 35,
      windMph: 0,
      trackTempF: 112,
      tractionIndex: 5,
    },
    vehicle: {
      weightLb: 1700,
      wheelbaseIn: 225,
      overhangIn: 30,
      rolloutIn: 12,
      tireDiaIn: 32.6,
      tireWidthIn: 13.2,

      frontalArea_ft2: 13.6,
      cd: 0.5,
      liftCoeff: 0.15,

      finalDrive: 4.56,
      transEff: 0.97,

      gearRatios: [1.76, 1.0],
      gearEff: [0.97, 0.99],
      shiftRPM: [7500],

      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        slipRatio: 1.06,
        torqueMult: 1.70,
        lockup: false,
        diameterIn: 10,
      },

      // Full HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 3500, hp: 520 },
        { rpm: 4000, hp: 560 },
        { rpm: 4500, hp: 600 },
        { rpm: 5000, hp: 640 },
        { rpm: 5500, hp: 680 },
        { rpm: 6000, hp: 715 },
        { rpm: 6500, hp: 745 },
        { rpm: 7000, hp: 770 },
        { rpm: 7500, hp: 790 },
        { rpm: 8000, hp: 805 },
        { rpm: 8500, hp: 815 },
        { rpm: 9000, hp: 820 },
        { rpm: 9500, hp: 820 },
        { rpm: 10000, hp: 815 },
      ],
    },
  },

  SuperGas_Pro: {
    name: 'SuperGas_Pro',
    fuel: 'GAS',
    env: {
      elevation: 850,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 30,
      windMph: 0,
      trackTempF: 102,
      tractionIndex: 5,
    },
    vehicle: {
      weightLb: 2300,
      wheelbaseIn: 103,
      overhangIn: 30,
      rolloutIn: 12,
      tireDiaIn: 32.4,
      tireWidthIn: 14.4,

      frontalArea_ft2: 22.1,
      cd: 0.4,
      liftCoeff: 0.25,

      finalDrive: 5.14,
      transEff: 0.97,

      gearRatios: [1.76, 1.0],
      gearEff: [0.97, 0.99],
      shiftRPM: [7600],

      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        slipRatio: 1.06,
        torqueMult: 1.70,
        lockup: false,
        diameterIn: 10,
      },

      // Full HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 3500, hp: 450 },
        { rpm: 4000, hp: 490 },
        { rpm: 4500, hp: 530 },
        { rpm: 5000, hp: 565 },
        { rpm: 5500, hp: 600 },
        { rpm: 6000, hp: 630 },
        { rpm: 6500, hp: 655 },
        { rpm: 7000, hp: 675 },
        { rpm: 7500, hp: 690 },
        { rpm: 8000, hp: 700 },
        { rpm: 8500, hp: 705 },
        { rpm: 9000, hp: 705 },
        { rpm: 9500, hp: 700 },
      ],
    },
  },

  Motorcycle_Pro: {
    name: 'Motorcycle_Pro',
    fuel: 'GAS',
    env: {
      elevation: 500,
      barometerInHg: 29.92,
      temperatureF: 75,
      humidityPct: 50,
      windMph: 0,
      trackTempF: 100,
      tractionIndex: 4,
    },
    vehicle: {
      weightLb: 650,
      wheelbaseIn: 54,
      rolloutIn: 12,
      tireDiaIn: 28.0,
      tireWidthIn: 5.0,

      frontalArea_ft2: 7.5,
      cd: 0.55,
      liftCoeff: 0.05,

      finalDrive: 6.5,
      transEff: 0.99,

      gearRatios: [2.74, 1.96, 1.4, 1.0],
      shiftRPM: [8000, 8000, 8000],

      clutch: { launchRPM: 6000, slipRPM: 6000, slipRatio: 1.0, lockup: true },

      // Full HP curve from Quarter Pro printout
      torqueCurve: [
        { rpm: 5000, hp: 60 },
        { rpm: 5500, hp: 64 },
        { rpm: 6000, hp: 68 },
        { rpm: 6500, hp: 71 },
        { rpm: 7000, hp: 73 },
        { rpm: 7200, hp: 74 },
        { rpm: 7500, hp: 74 },
        { rpm: 8000, hp: 73 },
        { rpm: 8500, hp: 71 },
      ],
    },
  },

  // ===== QUARTER JR CASES =====

  Motorcycle_Jr: {
    name: 'Motorcycle_Jr',
    fuel: 'GAS',
    env: {
      elevation: 900,
      barometerInHg: 29.92,
      temperatureF: 74,
      humidityPct: 40,
      tractionIndex: 4,
    },
    vehicle: {
      weightLb: 730,
      wheelbaseIn: 54,
      rolloutIn: 12,
      tireDiaIn: 28.0,
      tireWidthIn: 5.0,

      frontalArea_ft2: 7.9,
      cd: 0.55, // worksheet effective; adjust if exact differs
      liftCoeff: 0.05,

      finalDrive: 6.81,
      transEff: 0.99,

      gearRatios: [2.74, 1.96, 1.4, 1.0],
      shiftRPM: [8000, 8000, 8000],

      clutch: { launchRPM: 6000, slipRPM: 6000, slipRatio: 1.0, lockup: true },

      // Full HP curve from Quarter Jr printout
      torqueCurve: [
        { rpm: 5000, hp: 62 },
        { rpm: 5500, hp: 68 },
        { rpm: 6000, hp: 73 },
        { rpm: 6500, hp: 77 },
        { rpm: 7000, hp: 80 },
        { rpm: 7200, hp: 81 },
        { rpm: 7500, hp: 81 },
        { rpm: 8000, hp: 80 },
        { rpm: 8500, hp: 78 },
      ],
    },
  },

  ETRacer_Jr: {
    name: 'ETRacer_Jr',
    fuel: 'GAS',
    env: {
      elevation: 680,
      barometerInHg: 29.92,
      temperatureF: 86,
      humidityPct: 60,
      tractionIndex: 5,
    },
    vehicle: {
      weightLb: 3600,
      wheelbaseIn: 108,
      rolloutIn: 14,
      tireDiaIn: 28.0,
      tireWidthIn: 10.0,

      frontalArea_ft2: 26.1,
      cd: 0.45,
      liftCoeff: 0.2,

      finalDrive: 4.11,
      transEff: 0.97,

      gearRatios: [2.48, 1.48, 1.0],
      shiftRPM: [6000, 6000],

      converter: {
        launchRPM: 2500,
        stallRPM: 3000,
        lockup: false,
        diameterIn: 10,
        slipRatio: 1.05,
        torqueMult: 1.60,
      },

      powerHP: 325,
      // Full HP curve from Quarter Jr printout
      torqueCurve: [
        { rpm: 3000, hp: 220 },
        { rpm: 3500, hp: 250 },
        { rpm: 4000, hp: 275 },
        { rpm: 4500, hp: 295 },
        { rpm: 5000, hp: 310 },
        { rpm: 5500, hp: 322 },
        { rpm: 5600, hp: 325 },
        { rpm: 6000, hp: 325 },
        { rpm: 6500, hp: 320 },
      ],
    },
  },

  EXP_Jr: {
    name: 'EXP_Jr',
    fuel: 'GAS',
    env: {
      elevation: 400,
      barometerInHg: 29.92,
      temperatureF: 80,
      humidityPct: 45,
      tractionIndex: 4,
    },
    vehicle: {
      weightLb: 2100,
      wheelbaseIn: 180,
      rolloutIn: 12,
      tireDiaIn: 30.0,
      tireWidthIn: 12.0,

      frontalArea_ft2: 15.5,
      cd: 0.48,
      liftCoeff: 0.18,

      finalDrive: 4.3,
      transEff: 0.97,

      gearRatios: [1.8, 1.3, 1.0],
      shiftRPM: [7800, 8000],

      clutch: { launchRPM: 5500, slipRPM: 6000, slipRatio: 1.005, lockup: false },

      // Full HP curve from Quarter Jr printout
      torqueCurve: [
        { rpm: 5000, hp: 750 },
        { rpm: 5500, hp: 810 },
        { rpm: 6000, hp: 860 },
        { rpm: 6500, hp: 900 },
        { rpm: 7000, hp: 930 },
        { rpm: 7500, hp: 950 },
        { rpm: 8000, hp: 960 },
        { rpm: 8500, hp: 960 },
        { rpm: 9000, hp: 950 },
      ],
    },
  },

  EXP_050523_Jr: {
    name: 'EXP_050523_Jr',
    fuel: 'GAS',
    env: {
      elevation: 420,
      barometerInHg: 29.92,
      temperatureF: 78,
      humidityPct: 48,
      tractionIndex: 4,
    },
    vehicle: {
      weightLb: 2080,
      wheelbaseIn: 180,
      rolloutIn: 12,
      tireDiaIn: 30.5,
      tireWidthIn: 12.5,

      frontalArea_ft2: 15.2,
      cd: 0.46,
      liftCoeff: 0.16,

      finalDrive: 4.25,
      transEff: 0.975,

      gearRatios: [1.82, 1.32, 1.0],
      shiftRPM: [7900, 8100],

      clutch: { launchRPM: 5600, slipRPM: 6100, slipRatio: 1.004, lockup: false },

      // Full HP curve from Quarter Jr printout
      torqueCurve: [
        { rpm: 5000, hp: 770 },
        { rpm: 5500, hp: 830 },
        { rpm: 6000, hp: 880 },
        { rpm: 6500, hp: 920 },
        { rpm: 7000, hp: 955 },
        { rpm: 7500, hp: 980 },
        { rpm: 8000, hp: 995 },
        { rpm: 8500, hp: 1000 },
        { rpm: 9000, hp: 995 },
      ],
    },
  },
};
