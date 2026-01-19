/**
 * Verify HPC calculation for Top Alcohol Dragster
 */

import { airDensityVB6 } from './air';

console.log('='.repeat(80));
console.log('TOP ALCOHOL DRAGSTER HPC VERIFICATION');
console.log('='.repeat(80));

// VB6 test case conditions
const conditions = {
  barometer_inHg: 29.92,
  temperature_F: 77,
  relHumidity_pct: 45,
  elevation_ft: 0,
  fuelSystem: 7, // Supercharged Methanol
};

console.log('\nTest Conditions:');
console.log(`  Barometer: ${conditions.barometer_inHg} inHg`);
console.log(`  Temperature: ${conditions.temperature_F}°F`);
console.log(`  Humidity: ${conditions.relHumidity_pct}%`);
console.log(`  Elevation: ${conditions.elevation_ft} ft`);
console.log(`  Fuel: Supercharged Methanol (type 7)`);

const result = airDensityVB6(conditions);

console.log('\n' + '='.repeat(80));
console.log('CALCULATED VALUES');
console.log('='.repeat(80));
console.log(`Air Density (ρ): ${result.rho_lbm_ft3.toFixed(6)} lbm/ft³`);
console.log(`Air Density (ρ): ${result.rho_slug_per_ft3.toFixed(8)} slug/ft³`);
console.log(`HPC: ${result.hpc.toFixed(4)}`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON');
console.log('='.repeat(80));
console.log(`VB6 Output HPC:     1.040`);
console.log(`Dev Server HPC:     1.0399`);
console.log(`Calculated HPC:     ${result.hpc.toFixed(4)}`);

const vb6_hpc = 1.040;
const diff = Math.abs(result.hpc - vb6_hpc);

console.log(`\nDifference from VB6: ${(diff * 1000).toFixed(2)} (×1000)`);

if (diff < 0.0001) {
  console.log('✅ HPC matches VB6 output');
} else {
  console.log('❌ HPC differs from VB6 output');
  console.log('\nThis HPC difference could affect results:');
  console.log(`  At 2729 HP peak: ${(2729 * diff).toFixed(1)} HP difference`);
  console.log(`  This could cause ~${(diff * 100).toFixed(2)}% error in performance`);
}

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

console.log('\nVB6 shows hpc = 1.040 in the printout.');
console.log('Our calculation gives hpc = ' + result.hpc.toFixed(4));
console.log('\nIf there is a discrepancy, it could be due to:');
console.log('  1. VB6 rounding hpc to 3 decimal places in display');
console.log('  2. Different fuel system type mapping');
console.log('  3. Slight difference in air density calculation');

console.log('\nNote: VB6 displays hpc with 3 decimals, so 1.040 could be');
console.log('anywhere from 1.0395 to 1.0404 when rounded.');

console.log('='.repeat(80));
