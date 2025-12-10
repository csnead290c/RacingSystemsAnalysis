/**
 * Auto-generated benchmark configs from VB6 .DAT files
 * Generated: 2025-12-10T20:57:26.052Z
 * 
 * DO NOT EDIT MANUALLY - regenerate using: node scripts/parse-dat-files.mjs
 */

export const VB6_DAT_BENCHMARKS = {
  MOTORCYC_Pro: {
    name: 'MOTORCYC_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
    env: {
      elevation: 0,
      barometerInHg: 29.92,
      temperatureF: 72,
      humidityPct: 45,
      windMph: 6,
      windAngleDeg: 180,
      trackTempF: 98,
      tractionIndex: 2,
    },
    vehicle: {
      weightLb: 650,
      wheelbaseIn: 54,
      overhangIn: 12,
      rolloutIn: 12,
      tireDiaIn: 25,
      tireWidthIn: 5,

      frontalArea_ft2: 6.8,
      cd: 0.55,
      liftCoeff: 0.05,

      finalDrive: 5.72,
      transEff: 0.99,

      gearRatios: [3, 2.1, 1.65, 1.38, 1.23, 1.1],
      gearEff: [0.99, 0.991, 0.992, 0.993, 0.994, 0.995],
      shiftRPM: [10800, 10900, 11000, 11000, 11000],

      clutch: {
        launchRPM: 11000,
        slipRPM: 8500,
        slippageFactor: 1,
        lockup: true,
      },

      pmi: {
        engine: 0.18,
        trans: 0.031,
        tires: 4.3,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 6500, hp: 40 },
        { rpm: 7000, hp: 47 },
        { rpm: 7500, hp: 53 },
        { rpm: 8000, hp: 58 },
        { rpm: 8500, hp: 62 },
        { rpm: 9000, hp: 66 },
        { rpm: 9500, hp: 69 },
        { rpm: 10000, hp: 72 },
        { rpm: 10500, hp: 73 },
        { rpm: 11000, hp: 73 },
        { rpm: 11500, hp: 72 },
      ],
    },
  },

  SUPERGAS_Pro: {
    name: 'SUPERGAS_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
    env: {
      elevation: 850,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 30,
      windMph: 0,
      windAngleDeg: 0,
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

      gearRatios: [1.76, 1],
      gearEff: [0.97, 0.99],
      shiftRPM: [7600],

      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        torqueMult: 1.7,
        slippageFactor: 1.06,
        lockup: false,
      },

      pmi: {
        engine: 3.26,
        trans: 0.511,
        tires: 52.7,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 3500, hp: 267 },
        { rpm: 4500, hp: 351 },
        { rpm: 5500, hp: 432 },
        { rpm: 6500, hp: 491 },
        { rpm: 7000, hp: 500 },
        { rpm: 7500, hp: 468 },
        { rpm: 8000, hp: 421 },
      ],
    },
  },

  SUPERCMP_Pro: {
    name: 'SUPERCMP_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
    env: {
      elevation: 600,
      barometerInHg: 29.92,
      temperatureF: 87,
      humidityPct: 35,
      windMph: 0,
      windAngleDeg: 0,
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

      gearRatios: [1.76, 1],
      gearEff: [0.97, 0.99],
      shiftRPM: [7500],

      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        torqueMult: 1.7,
        slippageFactor: 1.06,
        lockup: false,
      },

      pmi: {
        engine: 3.26,
        trans: 0.511,
        tires: 43.6,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 3500, hp: 260 },
        { rpm: 4500, hp: 351 },
        { rpm: 5500, hp: 438 },
        { rpm: 6500, hp: 520 },
        { rpm: 7000, hp: 538 },
        { rpm: 7500, hp: 521 },
        { rpm: 8000, hp: 477 },
      ],
    },
  },

  PROSTOCK_Pro: {
    name: 'PROSTOCK_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
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
      tireDiaIn: 102.5,
      tireWidthIn: 17,

      frontalArea_ft2: 18.2,
      cd: 0.24,
      liftCoeff: 0.1,

      finalDrive: 4.86,
      transEff: 0.975,

      gearRatios: [2.6, 1.9, 1.5, 1.2, 1],
      gearEff: [0.99, 0.991, 0.992, 0.993, 0.994],
      shiftRPM: [9400, 9400, 9400, 9400],

      clutch: {
        launchRPM: 7200,
        slipRPM: 7600,
        slippageFactor: 1.004,
        lockup: false,
      },

      pmi: {
        engine: 3.42,
        trans: 0.247,
        tires: 50.8,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 7000, hp: 1078 },
        { rpm: 7250, hp: 1131 },
        { rpm: 7500, hp: 1177 },
        { rpm: 7750, hp: 1216 },
        { rpm: 8000, hp: 1251 },
        { rpm: 8250, hp: 1274 },
        { rpm: 8500, hp: 1288 },
        { rpm: 8750, hp: 1300 },
        { rpm: 9000, hp: 1297 },
        { rpm: 9250, hp: 1269 },
        { rpm: 9500, hp: 1222 },
      ],
    },
  },

  TADRAG_Pro: {
    name: 'TADRAG_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
    env: {
      elevation: 0,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 45,
      windMph: 0,
      windAngleDeg: 0,
      trackTempF: 110,
      tractionIndex: 2,
    },
    vehicle: {
      weightLb: 1980,
      wheelbaseIn: 280,
      overhangIn: 30,
      rolloutIn: 12,
      tireDiaIn: 110,
      tireWidthIn: 17,

      frontalArea_ft2: 19.5,
      cd: 0.58,
      liftCoeff: 0.4,

      finalDrive: 4.56,
      transEff: 0.97,

      gearRatios: [1.85, 1.3, 1],
      gearEff: [0.97, 0.98, 0.99],
      shiftRPM: [9200, 9400],

      clutch: {
        launchRPM: 6000,
        slipRPM: 7200,
        slippageFactor: 1.01,
        lockup: false,
      },

      pmi: {
        engine: 4.84,
        trans: 0.426,
        tires: 64.6,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 6000, hp: 1847 },
        { rpm: 6500, hp: 2058 },
        { rpm: 7000, hp: 2256 },
        { rpm: 7500, hp: 2458 },
        { rpm: 8000, hp: 2639 },
        { rpm: 8500, hp: 2729 },
        { rpm: 9000, hp: 2672 },
        { rpm: 9500, hp: 2415 },
        { rpm: 10000, hp: 1999 },
      ],
    },
  },

  FUNNYCAR_Pro: {
    name: 'FUNNYCAR_Pro',
    fuel: 'GAS',
    // Source: test case for QUARTER Pro version 3.2
    env: {
      elevation: 300,
      barometerInHg: 29.92,
      temperatureF: 76,
      humidityPct: 50,
      windMph: 0,
      windAngleDeg: 0,
      trackTempF: 112,
      tractionIndex: 1,
    },
    vehicle: {
      weightLb: 2350,
      wheelbaseIn: 125,
      overhangIn: 40,
      rolloutIn: 12,
      tireDiaIn: 118,
      tireWidthIn: 18,

      frontalArea_ft2: 24.1,
      cd: 0.5,
      liftCoeff: 0.8,

      finalDrive: 3.2,
      transEff: 0.96,

      gearRatios: [1],
      gearEff: [1],
      shiftRPM: [],

      clutch: {
        launchRPM: 6400,
        slipRPM: 6800,
        slippageFactor: 1,
        lockup: true,
      },

      pmi: {
        engine: 6.03,
        trans: 0.107,
        tires: 75.4,
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
        { rpm: 6400, hp: 6116 },
        { rpm: 6600, hp: 6276 },
        { rpm: 6800, hp: 6306 },
        { rpm: 7000, hp: 6139 },
        { rpm: 7200, hp: 5829 },
        { rpm: 7400, hp: 5344 },
        { rpm: 7600, hp: 4732 },
        { rpm: 7800, hp: 3993 },
      ],
    },
  },
};
