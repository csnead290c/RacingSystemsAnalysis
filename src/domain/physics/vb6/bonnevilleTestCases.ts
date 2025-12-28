/**
 * Bonneville Pro VB6 Test Cases
 * Extracted from actual VB6 output files
 */

export const BONNEVILLE_TEST_CASES = {
  roadster: {
    // File: roadster.dat - 3 Miles track
    // VB6 Output: 26.31s @ 351.8 MPH at 2.00 miles
    vehicle: {
      weight: 2350,
      wheelbase: 125,
      rollout: 113.0,  // inches
      tireWidth: 10.0,
      elevation: 4500,
      temperature: 76,
      humidity: 50,
      tractionIndex: 6,
      frontalArea: 24.1,
      dragCoef: 0.580,
      liftCoef: 0.800,
      finalDrive: 2.10,
      efficiency: 0.960,
      fuelSystem: 'Supercharged Nitro',
      hpTorqueMultiplier: 0.960,
      clutchSlipRPM: 6400,
      clutchSlippage: 1.000,
      gearRatios: [1.25, 1.00],
      gearEfficiencies: [0.800, 0.990],
      shiftRPMs: [7000, 100],
      hpCurve: [
        { rpm: 6400, hp: 5560 },
        { rpm: 6600, hp: 5734 },
        { rpm: 6800, hp: 5733 },
        { rpm: 7000, hp: 5581 },
        { rpm: 7200, hp: 5299 },
        { rpm: 7400, hp: 4858 },
        { rpm: 7600, hp: 4302 },
        { rpm: 7800, hp: 3630 },
        { rpm: 10500, hp: 73 },
        { rpm: 11000, hp: 74 },
        { rpm: 11500, hp: 73 },
      ],
    },
    expected: {
      // At 2.00 miles (10560 ft)
      et_s: 26.31,
      mph: 351.8,
    },
    vb6Output: {
      // Key checkpoints from VB6 output
      checkpoints: [
        { time: 0.00, distance: 0.00, mph: 0.0, accel: 1.48, gear: 1, rpm: 6400 },
        { time: 2.88, distance: 0.04, mph: 100.0, accel: 1.47, gear: 1, rpm: 6400 },
        { time: 6.13, distance: 0.18, mph: 200.0, accel: 1.34, gear: 1, rpm: 6400 },
        { time: 9.01, distance: 0.37, mph: 273.7, accel: 0.80, gear: 1, rpm: 7000 },
        { time: 9.21, distance: 0.39, mph: 277.8, accel: 0.92, gear: 2, rpm: 6400 },
        { time: 10.63, distance: 0.50, mph: 303.2, accel: 0.72, gear: 2, rpm: 6400 },
        { time: 16.05, distance: 1.00, mph: 347.4, accel: 0.10, gear: 2, rpm: 7080 },
        { time: 21.19, distance: 1.50, mph: 351.3, accel: 0.01, gear: 2, rpm: 7160 },
        { time: 26.31, distance: 2.00, mph: 351.8, accel: 0.00, gear: 2, rpm: 7170 },
      ],
    },
  },

  lakester: {
    // File: lakester.dat - 3 Miles track
    // VB6 Output: 17.13s @ 289.0 MPH at 1.00 mile
    vehicle: {
      weight: 1980,
      wheelbase: 205,
      rollout: 113.0,
      tireWidth: 10.0,
      elevation: 0,
      temperature: 77,
      humidity: 45,
      tractionIndex: 7,
      frontalArea: 16.2,
      dragCoef: 0.580,
      liftCoef: 0.400,
      finalDrive: 3.20,
      efficiency: 0.970,
      fuelSystem: 'Supercharged Methanol',
      hpTorqueMultiplier: 1.000,
      clutchSlipRPM: 6600,
      clutchSlippage: 1.010,
      gearRatios: [1.96, 1.35, 1.00],
      gearEfficiencies: [0.960, 0.975, 0.990],
      shiftRPMs: [9400, 9600, 100],
      hpCurve: [
        { rpm: 6000, hp: 1445 },
        { rpm: 6500, hp: 1604 },
        { rpm: 7000, hp: 1768 },
        { rpm: 7500, hp: 1937 },
        { rpm: 8000, hp: 2083 },
        { rpm: 8500, hp: 2146 },
        { rpm: 9000, hp: 2100 },
        { rpm: 9500, hp: 1832 },
        { rpm: 10000, hp: 1436 },
      ],
    },
    expected: {
      // At 1.00 mile (5280 ft)
      et_s: 17.13,
      mph: 289.0,
    },
  },

  gascoupe: {
    // File: gascoupe.dat - 5 Miles track
    // VB6 Output: 73.86s @ 274.4 MPH at 5.00 miles
    vehicle: {
      weight: 2350,
      wheelbase: 110,
      rollout: 103.0,
      tireWidth: 10.0,
      elevation: 4500,
      temperature: 75,
      humidity: 55,
      wind: 5.0,
      windAngle: 90,
      tractionIndex: 5,
      frontalArea: 19.5,
      dragCoef: 0.290,
      liftCoef: 0.600,
      finalDrive: 3.10,
      efficiency: 0.970,
      fuelSystem: 'Gasoline Carburetor',
      hpTorqueMultiplier: 1.000,
      clutchSlipRPM: 7200,
      clutchSlippage: 1.005,
      gearRatios: [2.40, 1.99, 1.59, 1.24, 1.00],
      gearEfficiencies: [0.990, 0.991, 0.992, 0.993, 0.994],
      shiftRPMs: [8900, 9000, 9000, 9000, 0],
      hpCurve: [
        { rpm: 6700, hp: 1030 },
        { rpm: 7200, hp: 1100 },
        { rpm: 7600, hp: 1140 },
        { rpm: 8200, hp: 1190 },
        { rpm: 8500, hp: 1200 },
        { rpm: 8800, hp: 1180 },
        { rpm: 9100, hp: 1080 },
        { rpm: 9300, hp: 950 },
      ],
    },
    expected: {
      // At 5.00 miles (26400 ft)
      et_s: 73.86,
      mph: 274.4,
    },
  },
};

console.log('Bonneville test cases loaded:');
console.log(`  - Roadster: 26.31s @ 351.8 MPH (2 miles)`);
console.log(`  - Lakester: 17.13s @ 289.0 MPH (1 mile)`);
console.log(`  - Gas Coupe: 73.86s @ 274.4 MPH (5 miles)`);
