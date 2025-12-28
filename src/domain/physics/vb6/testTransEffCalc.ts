/**
 * Test transmission efficiency calculation
 */

import { calcTransEfficiencies } from '../vb6/quarterJr';

console.log('='.repeat(80));
console.log('TRANSMISSION EFFICIENCY CALCULATION TEST');
console.log('='.repeat(80));

console.log('\nVB6 Formula for Clutch:');
console.log('  teff = 0.99');
console.log('  TGEff(i) = teff - (NGR - i) * 0.005');

console.log('\nFor 5-speed transmission (NGR=5):');
const eff5 = calcTransEfficiencies(5, false);
console.log(`  Result: [${eff5.join(', ')}]`);
console.log(`  Length: ${eff5.length}`);

console.log('\nExpected for 5-speed:');
console.log('  Gear 1: 0.99 - (5-1)*0.005 = 0.970');
console.log('  Gear 2: 0.99 - (5-2)*0.005 = 0.975');
console.log('  Gear 3: 0.99 - (5-3)*0.005 = 0.980');
console.log('  Gear 4: 0.99 - (5-4)*0.005 = 0.985');
console.log('  Gear 5: 0.99 - (5-5)*0.005 = 0.990');

console.log('\nFor 4-speed transmission (NGR=4):');
const eff4 = calcTransEfficiencies(4, false);
console.log(`  Result: [${eff4.join(', ')}]`);

console.log('\nFor 2-speed converter (NGR=2):');
const eff2conv = calcTransEfficiencies(2, true);
console.log(`  Result: [${eff2conv.join(', ')}]`);
console.log('  Expected: [0.98, 0.99] (teff=0.99, step=0.01)');

console.log('\nFor 3-speed converter (NGR=3):');
const eff3conv = calcTransEfficiencies(3, true);
console.log(`  Result: [${eff3conv.join(', ')}]`);
console.log('  Expected: [0.965, 0.975, 0.985] (teff=0.985, step=0.01)');

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

if (eff5.length === 5 && Math.abs(eff5[0] - 0.970) < 0.001) {
  console.log('✅ Efficiency calculation is CORRECT');
  console.log('The issue must be elsewhere in how efficiencies are used.');
} else {
  console.log('❌ Efficiency calculation has a BUG');
  console.log(`Expected 5 values starting with 0.970, got ${eff5.length} values starting with ${eff5[0]}`);
}

console.log('='.repeat(80));
