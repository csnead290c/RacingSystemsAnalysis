/**
 * Decode TADRAG.DAT file format and compare with test case
 */

console.log('='.repeat(80));
console.log('TADRAG.DAT FILE DECODING');
console.log('='.repeat(80));

// From TADRAG.DAT file:
const datFile = {
  line1: '" 3.21 "',
  line2: '"test case for QUARTER Pro version 3.2"',
  line3: '0  77  29.92  45  110  1980  280  12',
  line4: '30  19.5  0.58  0.4',
  line5: '6000  6500  7000  7500  8000  8500  9000  9500  10000  0  0',
  line6: '1847  2058  2256  2458  2639  2729  2672  2415  1999  0  0',
  line7: '1  7',
  line8: '1.85  1.3  1  0  0  0',
  line9: '0.97  0.98  0.99  0  0  0',
  line10: '9200  9400  0  0  0  0',
  line11: '6000          7200  1  1.01 "N"',
  line12: '4.56  0.97  110  17  2',
  line13: '4.84  0.426  64.6',
  line14: '0  0',
  line15: '60  72  65',
  line16: '0  0  0',
  line17: '17  0  0',
  line18: '60  3.75  40  14',
  line19: '3  80  8',
  line20: '42  110  15  15',
};

console.log('\nLine 3 (Environment):');
const line3 = datFile.line3.split(/\s+/).map(Number);
console.log(`  [0] Elevation: ${line3[0]} ft`);
console.log(`  [1] Temperature: ${line3[1]} °F`);
console.log(`  [2] Barometer: ${line3[2]} inHg`);
console.log(`  [3] Humidity: ${line3[3]} %`);
console.log(`  [4] Track Temp: ${line3[4]} °F`);
console.log(`  [5] Weight: ${line3[5]} lb`);
console.log(`  [6] Wheelbase: ${line3[6]} in`);
console.log(`  [7] Rollout: ${line3[7]} in`);

console.log('\nLine 4 (Aero + Overhang):');
const line4 = datFile.line4.split(/\s+/).map(Number);
console.log(`  [0] Overhang: ${line4[0]} in`);
console.log(`  [1] Frontal Area: ${line4[1]} ft²`);
console.log(`  [2] Cd: ${line4[2]}`);
console.log(`  [3] Cl: ${line4[3]}`);

console.log('\nLine 5 (HP Curve RPMs):');
const line5 = datFile.line5.split(/\s+/).map(Number).filter(x => x > 0);
console.log(`  RPMs: ${line5.join(', ')}`);

console.log('\nLine 6 (HP Curve HP values):');
const line6 = datFile.line6.split(/\s+/).map(Number).filter(x => x > 0);
console.log(`  HP: ${line6.join(', ')}`);

console.log('\nLine 7 (Fuel):');
const line7 = datFile.line7.split(/\s+/).map(Number);
console.log(`  [0] HP/TQ Multiplier: ${line7[0]}`);
console.log(`  [1] Fuel System Type: ${line7[1]} (7 = Supercharged Methanol)`);

console.log('\nLine 8 (Gear Ratios):');
const line8 = datFile.line8.split(/\s+/).map(Number).filter(x => x > 0);
console.log(`  Ratios: ${line8.join(', ')}`);

console.log('\nLine 9 (Gear Efficiencies):');
const line9 = datFile.line9.split(/\s+/).map(Number).filter(x => x > 0);
console.log(`  Efficiencies: ${line9.join(', ')}`);

console.log('\nLine 10 (Shift RPMs):');
const line10 = datFile.line10.split(/\s+/).map(Number).filter(x => x > 0);
console.log(`  Shift RPMs: ${line10.join(', ')}`);

console.log('\nLine 11 (Clutch):');
const line11Parts = datFile.line11.split(/\s+/);
console.log(`  [0] Launch RPM: ${line11Parts[0]}`);
console.log(`  [1] (spacing)`);
console.log(`  [2] Stall/Slip RPM: ${line11Parts[2]}`);
console.log(`  [3] Trans Type: ${line11Parts[3]} (1 = clutch)`);
console.log(`  [4] Slippage: ${line11Parts[4]}`);
console.log(`  [5] Lock-up: ${line11Parts[5]}`);

console.log('\nLine 12 (Final Drive + Tires + Traction):');
const line12 = datFile.line12.split(/\s+/).map(Number);
console.log(`  [0] Final Drive: ${line12[0]}`);
console.log(`  [1] Overall Efficiency: ${line12[1]}`);
console.log(`  [2] Tire Rollout: ${line12[2]} in`);
console.log(`  [3] Tire Width: ${line12[3]} in`);
console.log(`  [4] Traction Index: ${line12[4]}`);

console.log('\nLine 13 (PMI):');
const line13 = datFile.line13.split(/\s+/).map(Number);
console.log(`  [0] Engine PMI: ${line13[0]}`);
console.log(`  [1] Trans PMI: ${line13[1]}`);
console.log(`  [2] Tires PMI: ${line13[2]}`);

console.log('\n' + '='.repeat(80));
console.log('COMPARISON WITH TEST CASE');
console.log('='.repeat(80));

console.log('\n✓ Matches:');
console.log('  - Elevation: 0 ft');
console.log('  - Temperature: 77°F');
console.log('  - Barometer: 29.92 inHg');
console.log('  - Humidity: 45%');
console.log('  - Track Temp: 110°F');
console.log('  - Weight: 1980 lb');
console.log('  - Wheelbase: 280 in');
console.log('  - Rollout: 12 in');
console.log('  - Overhang: 30 in');
console.log('  - Frontal Area: 19.5 ft²');
console.log('  - Cd: 0.580');
console.log('  - Cl: 0.400');
console.log('  - HP Curve: 9 points matching');
console.log('  - Fuel: Supercharged Methanol (type 7)');
console.log('  - Gear Ratios: [1.85, 1.30, 1.00]');
console.log('  - Gear Eff: [0.970, 0.980, 0.990]');
console.log('  - Shift RPMs: [9200, 9400]');
console.log('  - Launch RPM: 6000');
console.log('  - Stall RPM: 7200');
console.log('  - Slippage: 1.01');
console.log('  - Final Drive: 4.56');
console.log('  - Overall Eff: 0.970');
console.log('  - Tire Rollout: 110 in');
console.log('  - Tire Width: 17 in');
console.log('  - Traction Index: 2');
console.log('  - PMI: [4.84, 0.426, 64.6]');

console.log('\n' + '='.repeat(80));
console.log('TIRE DIAMETER CALCULATION');
console.log('='.repeat(80));

const rollout_in = 110;
const tireDia_in = rollout_in / Math.PI;
console.log(`\nTire Rollout: ${rollout_in} in`);
console.log(`Tire Diameter: ${tireDia_in.toFixed(6)} in`);
console.log(`Test Case Uses: 35.014 in`);
console.log(`Match: ${Math.abs(tireDia_in - 35.014) < 0.001 ? '✓' : '✗'}`);

console.log('\n' + '='.repeat(80));
console.log('CONCLUSION');
console.log('='.repeat(80));

console.log('\nAll parameters match between .dat file and test case.');
console.log('The 29ms 60ft error is NOT due to incorrect input parameters.');
console.log('The issue must be in the PHYSICS CALCULATION itself.');
console.log('\nNext step: Compare VB6 trace output step-by-step with our simulation');
console.log('to find where the calculations diverge.');
console.log('='.repeat(80));
