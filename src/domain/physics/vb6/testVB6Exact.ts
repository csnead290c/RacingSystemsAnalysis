/**
 * VB6 Exact Port Test Harness
 * 
 * Tests the VB6 Exact Port implementation against known VB6 outputs
 * with STRICT tolerances: ±0.01s ET, ±0.1 MPH
 */

import { simulateVB6Exact } from '../models/vb6Exact';
import type { SimInputs } from '../index';

// Strict tolerances for VB6 parity
const STRICT_TOLERANCE = {
  ET_S: 0.01,   // ±0.01s for ET
  MPH: 0.1,     // ±0.1 mph for trap speed
};

interface TestCase {
  name: string;
  inputs: SimInputs;
  expected: {
    et_s: number;
    mph: number;
    eighth_et_s?: number;
    eighth_mph?: number;
  };
}

/**
 * Pro Stock Test Case
 * Expected: 6.80s @ 202.3 MPH (1/4 mile), 4.37s @ 160.9 MPH (1/8 mile)
 */
const PRO_STOCK: TestCase = {
  name: 'Pro Stock',
  inputs: {
    vehicle: {
      id: 'test-prostock',
      name: 'Pro Stock',
      defaultRaceLength: 'QUARTER',
      powerHP: 1300,
      weightLb: 2355,
      wheelbaseIn: 107,
      rolloutIn: 9,
      overhangIn: 40,
      rearGear: 4.86,
      finalDriveEfficiency: 0.975,
      tireDiaIn: 32.62676, // 102.5" circumference
      tireWidthIn: 17.0,
      cd: 0.240,
      frontalArea_ft2: 18.2,
      liftCoeff: 0.100,
      transmissionType: 'clutch',
      clutch: {
        launchRPM: 7200,
        slipRPM: 7600,
        slipRatio: 1.004,
      },
      gearRatios: [2.60, 1.90, 1.50, 1.20, 1.00],
      gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
      shiftRPMs: [9400, 9400, 9400, 9400, 0],
      hpCurve: [
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
      fuelType: 'Gasoline Carburetor',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 3.42,
        transmission_driveshaft: 0.247,
        tires_wheels_ringgear: 50.8,
      },
    },
    env: {
      elevation: 32,
      barometerInHg: 29.92,
      temperatureF: 75,
      humidityPct: 55,
      windMph: 5.0,
      windAngleDeg: 135,
      trackTempF: 105,
      tractionIndex: 3,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 6.80,
    mph: 202.3,
    eighth_et_s: 4.37,
    eighth_mph: 160.9,
  },
};

/**
 * Motorcycle Test Case
 * Expected: 11.99s @ 111.3 MPH (1/4 mile), 7.63s @ 91.1 MPH (1/8 mile)
 */
const MOTORCYCLE: TestCase = {
  name: 'Motorcycle',
  inputs: {
    vehicle: {
      id: 'test-motorcycle',
      name: 'Motorcycle',
      defaultRaceLength: 'QUARTER',
      powerHP: 73,
      weightLb: 650,
      wheelbaseIn: 54,
      rolloutIn: 12,
      overhangIn: 12,
      rearGear: 5.72,
      finalDriveEfficiency: 0.990,
      tireDiaIn: 25.0,
      tireWidthIn: 5.0,
      cd: 0.550,
      frontalArea_ft2: 6.8,
      liftCoeff: 0.050,
      transmissionType: 'clutch',
      clutch: {
        launchRPM: 11000,
        slipRPM: 8500,
        slipRatio: 1.000,
      },
      gearRatios: [3.00, 2.10, 1.65, 1.38, 1.23, 1.10],
      gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994, 0.995],
      shiftRPMs: [10800, 10900, 11000, 11000, 11000, 0],
      hpCurve: [
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
      fuelType: 'Gasoline Carburetor',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 0.18,
        transmission_driveshaft: 0.031,
        tires_wheels_ringgear: 4.3,
      },
    },
    env: {
      elevation: 0,
      barometerInHg: 29.92,
      temperatureF: 72,
      humidityPct: 45,
      windMph: 6.0,
      windAngleDeg: 180,
      trackTempF: 98,
      tractionIndex: 2,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 11.99,
    mph: 111.3,
    eighth_et_s: 7.63,
    eighth_mph: 91.1,
  },
};

/**
 * Super Comp Test Case
 * Expected: 8.90s @ 151.6 MPH (1/4 mile), 5.66s @ 120.4 MPH (1/8 mile)
 */
const SUPER_COMP: TestCase = {
  name: 'Super Comp',
  inputs: {
    vehicle: {
      id: 'test-supercomp',
      name: 'Super Comp',
      defaultRaceLength: 'QUARTER',
      powerHP: 538,
      weightLb: 1700,
      wheelbaseIn: 225,
      rolloutIn: 12,
      overhangIn: 30,
      rearGear: 4.56,
      finalDriveEfficiency: 0.970,
      tireDiaIn: 32.6,
      tireWidthIn: 13.20,
      cd: 0.500,
      frontalArea_ft2: 13.6,
      liftCoeff: 0.150,
      transmissionType: 'converter',
      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        slipRatio: 1.060,
        torqueMult: 1.70,
      },
      gearRatios: [1.76, 1.00],
      gearEfficiencies: [0.970, 0.990],
      shiftRPMs: [7500, 100],
      hpCurve: [
        { rpm: 3500, hp: 260 },
        { rpm: 4500, hp: 351 },
        { rpm: 5500, hp: 438 },
        { rpm: 6500, hp: 520 },
        { rpm: 7000, hp: 538 },
        { rpm: 7500, hp: 521 },
        { rpm: 8000, hp: 477 },
        { rpm: 10000, hp: 72 },
        { rpm: 10500, hp: 73 },
        { rpm: 11000, hp: 73 },
        { rpm: 11500, hp: 72 },
      ],
      fuelType: 'Gasoline Carburetor',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 3.26,
        transmission_driveshaft: 0.511,
        tires_wheels_ringgear: 43.6,
      },
    },
    env: {
      elevation: 600,
      barometerInHg: 29.92,
      temperatureF: 87,
      humidityPct: 35,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 112,
      tractionIndex: 5,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 8.90,
    mph: 151.6,
    eighth_et_s: 5.66,
    eighth_mph: 120.4,
  },
};

/**
 * Super Gas Test Case (supergas.dat)
 * Expected: 9.90s @ 135.1 MPH (1/4 mile), 6.27s @ 108.2 MPH (1/8 mile)
 */
const SUPER_GAS: TestCase = {
  name: 'Super Gas',
  inputs: {
    vehicle: {
      id: 'test-supergas',
      name: 'Super Gas',
      defaultRaceLength: 'QUARTER',
      powerHP: 500,
      weightLb: 2300,
      wheelbaseIn: 103,
      rolloutIn: 12,
      overhangIn: 30,
      rearGear: 5.14,
      finalDriveEfficiency: 0.970,
      tireDiaIn: 32.4,
      tireWidthIn: 14.40,
      cd: 0.400,
      frontalArea_ft2: 22.1,
      liftCoeff: 0.250,
      transmissionType: 'converter',
      converter: {
        launchRPM: 5000,
        stallRPM: 5500,
        slipRatio: 1.060,
        lockup: false,
        torqueMult: 1.70,
      },
      gearRatios: [1.76, 1.00],
      gearEfficiencies: [0.970, 0.990],
      shiftRPMs: [7600, 100],
      hpCurve: [
        { rpm: 3500, hp: 267 },
        { rpm: 4500, hp: 351 },
        { rpm: 5500, hp: 432 },
        { rpm: 6500, hp: 491 },
        { rpm: 7000, hp: 500 },
        { rpm: 7500, hp: 468 },
        { rpm: 8000, hp: 421 },
        { rpm: 10000, hp: 72 },
        { rpm: 10500, hp: 73 },
        { rpm: 11000, hp: 73 },
        { rpm: 11500, hp: 72 },
      ],
      fuelType: 'Gasoline Carburetor',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 3.26,
        transmission_driveshaft: 0.511,
        tires_wheels_ringgear: 52.7,
      },
    },
    env: {
      elevation: 850,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 30,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 102,
      tractionIndex: 5,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 9.90,
    mph: 135.1,
    eighth_et_s: 6.27,
    eighth_mph: 108.2,
  },
};

/**
 * Top Alcohol Dragster Test Case (tadrag.dat)
 * Expected: 5.52s @ 243.1 MPH (1/4 mile), 3.56s @ 205.3 MPH (1/8 mile)
 */
const TA_DRAGSTER: TestCase = {
  name: 'Top Alcohol Dragster',
  inputs: {
    vehicle: {
      id: 'test-tadrag',
      name: 'Top Alcohol Dragster',
      defaultRaceLength: 'QUARTER',
      powerHP: 2729,
      weightLb: 1980,
      wheelbaseIn: 280,
      rolloutIn: 12,
      overhangIn: 30,
      rearGear: 4.56,
      finalDriveEfficiency: 0.970,
      tireDiaIn: 35.014, // 110" rollout
      tireWidthIn: 17.00,
      cd: 0.580,
      frontalArea_ft2: 19.5,
      liftCoeff: 0.400,
      transmissionType: 'clutch',
      clutch: {
        launchRPM: 6000,
        slipRPM: 7200,
        slipRatio: 1.010,
      },
      gearRatios: [1.85, 1.30, 1.00],
      gearEfficiencies: [0.970, 0.980, 0.990],
      shiftRPMs: [9200, 9400, 100],
      hpCurve: [
        { rpm: 6000, hp: 1847 },
        { rpm: 6500, hp: 2058 },
        { rpm: 7000, hp: 2256 },
        { rpm: 7500, hp: 2458 },
        { rpm: 8000, hp: 2639 },
        { rpm: 8500, hp: 2729 },
        { rpm: 9000, hp: 2672 },
        { rpm: 9500, hp: 2415 },
        { rpm: 10000, hp: 1999 },
        { rpm: 11000, hp: 73 },
        { rpm: 11500, hp: 72 },
      ],
      fuelType: 'Supercharged Methanol',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 4.84,
        transmission_driveshaft: 0.426,
        tires_wheels_ringgear: 64.6,
      },
    },
    env: {
      elevation: 0,
      barometerInHg: 29.92,
      temperatureF: 77,
      humidityPct: 45,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 110,
      tractionIndex: 2,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 5.52,
    mph: 243.1,
    eighth_et_s: 3.56,
    eighth_mph: 205.3,
  },
};

/**
 * Funny Car Test Case (funnycar.dat)
 * Expected: 4.98s @ 297.0 MPH (1/4 mile), 3.37s @ 243.5 MPH (1/8 mile)
 */
const FUNNY_CAR: TestCase = {
  name: 'Funny Car',
  inputs: {
    vehicle: {
      id: 'test-funnycar',
      name: 'Funny Car',
      defaultRaceLength: 'QUARTER',
      powerHP: 6306,
      weightLb: 2350,
      wheelbaseIn: 125,
      rolloutIn: 12,
      overhangIn: 40,
      rearGear: 3.20,
      finalDriveEfficiency: 0.960,
      tireDiaIn: 37.580, // 118" rollout
      tireWidthIn: 18.00,
      cd: 0.500,
      frontalArea_ft2: 24.1,
      liftCoeff: 0.800,
      transmissionType: 'clutch',
      clutch: {
        launchRPM: 6400,
        slipRPM: 6800,
        slipRatio: 1.000,
      },
      gearRatios: [1.00],
      gearEfficiencies: [1.000],
      shiftRPMs: [100],
      hpCurve: [
        { rpm: 6400, hp: 6116 },
        { rpm: 6600, hp: 6276 },
        { rpm: 6800, hp: 6306 },
        { rpm: 7000, hp: 6139 },
        { rpm: 7200, hp: 5829 },
        { rpm: 7400, hp: 5344 },
        { rpm: 7600, hp: 4732 },
        { rpm: 7800, hp: 3993 },
        { rpm: 9000, hp: 1297 },
        { rpm: 9250, hp: 1269 },
        { rpm: 9500, hp: 1222 },
      ],
      fuelType: 'Supercharged Nitro',
      hpTorqueMultiplier: 1.000,
      pmi: {
        engine_flywheel_clutch: 6.03,
        transmission_driveshaft: 0.107,
        tires_wheels_ringgear: 75.4,
      },
    },
    env: {
      elevation: 300,
      barometerInHg: 29.92,
      temperatureF: 76,
      humidityPct: 50,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 112,
      tractionIndex: 1,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 4.98,
    mph: 297.0,
    eighth_et_s: 3.37,
    eighth_mph: 243.5,
  },
};

/**
 * Motorcycle Test Case - Quarter Jr (motorcyc.dat)
 * Expected: 12.00s @ 104.5 MPH (1/4 mile), 7.45s @ 89.4 MPH (1/8 mile)
 */
const MOTORCYCLE_QJR: TestCase = {
  name: 'Motorcycle (Quarter Jr)',
  inputs: {
    vehicle: {
      id: 'test-motorcycle-qjr',
      name: 'Motorcycle Quarter Jr',
      defaultRaceLength: 'QUARTER',
      powerHP: 80,
      rpmAtPeakHP: 7200,
      displacementCID: 60,
      weightLb: 730,
      wheelbaseIn: 54,
      rolloutIn: 12,
      rearGear: 6.81,
      tireDiaIn: 28.0,
      tireWidthIn: 5.00,
      frontalArea_ft2: 7.9,
      transmissionType: 'clutch',
      clutch: {
        slipRPM: 6000,
        lockup: true,
      },
      gearRatios: [2.74, 1.96, 1.40, 1.00],
      shiftRPM: 8000,  // QuarterJr uses single value
      fuelType: 'Gasoline Carburetor',
    } as any,
    env: {
      elevation: 900,
      barometerInHg: 29.92,
      temperatureF: 74,
      humidityPct: 40,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 90,
      tractionIndex: 3,
    },
    raceLength: 'QUARTER',
  },
  expected: {
    et_s: 12.00,
    mph: 104.5,
    eighth_et_s: 7.45,
    eighth_mph: 89.4,
  },
};

/**
 * Bonneville Roadster Test Case (roadster.dat)
 * Expected: 351.8 MPH @ 2 miles
 */
const BONNEVILLE_ROADSTER: TestCase = {
  name: 'Bonneville Roadster',
  inputs: {
    vehicle: {
      id: 'test-roadster',
      name: 'Bonneville Roadster',
      defaultRaceLength: 'TWO_MILE',
      powerHP: 5734,
      weightLb: 2350,
      wheelbaseIn: 125,
      rolloutIn: 0,
      overhangIn: 0,
      rearGear: 2.10,
      finalDriveEfficiency: 0.960,
      tireDiaIn: 35.987, // 113" rollout
      tireWidthIn: 10.00,
      cd: 0.580,
      frontalArea_ft2: 24.1,
      liftCoeff: 0.800,
      transmissionType: 'clutch',
      clutch: {
        launchRPM: 6400,
        slipRPM: 6400,
        slipRatio: 1.000,
      },
      gearRatios: [1.25, 1.00],
      gearEfficiencies: [0.800, 0.990],
      shiftRPMs: [7000, 100],
      hpCurve: [
        { rpm: 6400, hp: 5559.987 },
        { rpm: 6600, hp: 5733.737 },
        { rpm: 6800, hp: 5733.451 },
        { rpm: 7000, hp: 5581.357 },
        { rpm: 7200, hp: 5298.826 },
        { rpm: 7400, hp: 4857.974 },
        { rpm: 7600, hp: 4302.36 },
        { rpm: 7800, hp: 3629.627 },
        { rpm: 10500, hp: 73 },
        { rpm: 11000, hp: 74 },
        { rpm: 11500, hp: 73 },
      ],
      fuelType: 'Supercharged Nitro',
      hpTorqueMultiplier: 0.960,
      pmi: {
        engine_flywheel_clutch: 4.178682,
        transmission_driveshaft: 0.1671473,
        tires_wheels_ringgear: 44.36557,
      },
    },
    env: {
      elevation: 4500,
      barometerInHg: 29.92,
      temperatureF: 76,
      humidityPct: 50,
      windMph: 0.0,
      windAngleDeg: 0,
      trackTempF: 106,
      tractionIndex: 6,
    },
    raceLength: 'TWO_MILE',
  },
  expected: {
    et_s: 26.31,
    mph: 351.8,
  },
};

const TEST_CASES: TestCase[] = [
  PRO_STOCK, 
  MOTORCYCLE, 
  SUPER_COMP,
  SUPER_GAS,
  TA_DRAGSTER,
  FUNNY_CAR,
  MOTORCYCLE_QJR,
  BONNEVILLE_ROADSTER,
];

/**
 * Run a single test case
 */
function runTestCase(testCase: TestCase): void {
  console.log('\n' + '='.repeat(80));
  console.log(`TEST: ${testCase.name}`);
  console.log('='.repeat(80));
  
  try {
    const result = simulateVB6Exact(testCase.inputs);
    
    const deltaET = result.et_s - testCase.expected.et_s;
    const deltaMPH = result.mph - testCase.expected.mph;
    
    const etPass = Math.abs(deltaET) <= STRICT_TOLERANCE.ET_S;
    const mphPass = Math.abs(deltaMPH) <= STRICT_TOLERANCE.MPH;
    const pass = etPass && mphPass;
    
    console.log(`\nExpected: ${testCase.expected.et_s.toFixed(2)}s @ ${testCase.expected.mph.toFixed(1)} MPH`);
    console.log(`Actual:   ${result.et_s.toFixed(2)}s @ ${result.mph.toFixed(1)} MPH`);
    console.log(`Delta:    ${deltaET >= 0 ? '+' : ''}${deltaET.toFixed(4)}s, ${deltaMPH >= 0 ? '+' : ''}${deltaMPH.toFixed(2)} MPH`);
    console.log(`Tolerance: ±${STRICT_TOLERANCE.ET_S}s, ±${STRICT_TOLERANCE.MPH} MPH`);
    
    if (pass) {
      console.log(`\n✅ PASS - Within strict tolerance`);
    } else {
      console.log(`\n❌ FAIL - Outside tolerance`);
      if (!etPass) console.log(`   ET error: ${Math.abs(deltaET).toFixed(4)}s > ${STRICT_TOLERANCE.ET_S}s`);
      if (!mphPass) console.log(`   MPH error: ${Math.abs(deltaMPH).toFixed(2)} > ${STRICT_TOLERANCE.MPH}`);
      
      // Show detailed splits for failed tests
      if (result.timeslip && result.timeslip.length > 0) {
        console.log('\n--- Splits ---');
        console.log('Distance | Time    | MPH     ');
        console.log('---------|---------|----------');
        for (const split of result.timeslip) {
          console.log(
            `${split.d_ft.toString().padStart(7)}' | ` +
            `${split.t_s.toFixed(3).padStart(7)} | ` +
            `${split.v_mph.toFixed(1).padStart(7)}`
          );
        }
      }
      
      // Show early trace for failed tests
      if (result.traces && result.traces.length > 0) {
        console.log('\n--- Early Trace (first 0.5s) ---');
        console.log('Time  | Dist  | MPH   | Accel | Gear | RPM');
        console.log('------|-------|-------|-------|------|------');
        for (const pt of result.traces.slice(0, 25)) {
          if (pt.t_s > 0.5) break;
          console.log(
            `${pt.t_s.toFixed(3)} | ` +
            `${pt.s_ft.toFixed(1).padStart(5)} | ` +
            `${pt.v_mph.toFixed(1).padStart(5)} | ` +
            `${pt.a_g.toFixed(2).padStart(5)} | ` +
            `${pt.gear.toString().padStart(4)} | ` +
            `${pt.rpm.toFixed(0).padStart(5)}`
          );
        }
      }
    }
    
  } catch (error) {
    console.log(`\n❌ ERROR: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error && error.stack) {
      console.log('\nStack trace:');
      console.log(error.stack);
    }
  }
}

/**
 * Run all test cases
 */
export function runAllTests(): void {
  console.log('\n' + '█'.repeat(80));
  console.log('VB6 EXACT PORT - STRICT TOLERANCE TESTS');
  console.log('Tolerance: ±0.01s ET, ±0.1 MPH');
  console.log('█'.repeat(80));
  
  for (const testCase of TEST_CASES) {
    runTestCase(testCase);
  }
  
  console.log('\n' + '█'.repeat(80));
  console.log('TEST SUITE COMPLETE');
  console.log('█'.repeat(80) + '\n');
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).testVB6Exact = runAllTests;
  console.log('[VB6 Exact] Test functions available: window.testVB6Exact()');
}

// Auto-run tests when imported in Node.js context
if (typeof window === 'undefined') {
  runAllTests();
}
