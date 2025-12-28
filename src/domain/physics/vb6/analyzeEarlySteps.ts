/**
 * Analyze the first few steps to find where we diverge from VB6
 */

console.log('='.repeat(80));
console.log('EARLY STEPS ANALYSIS');
console.log('='.repeat(80));

console.log('\nVB6 Printout (first few steps):');
console.log('  Time    Dist    MPH     Accel   Gear  RPM');
console.log('  ----    ----    ---     -----   ----  ---');
console.log('  0.00    0       0.0     3.25    1     6,000');
console.log('  0.146   3.9     10.3    3.38(s) 1     7,200');  // ← Rollout
console.log('  0.25    11      29.2    3.36(s) 1     7,200');
console.log('  0.50    25      47.6    3.32    1     7,200');

console.log('\nOur Simulation (from console logs):');
console.log('  Step 0:  t=0.0000s, d=0.000ft, v=0.00mph, a=3.248g');
console.log('  Step 1:  t=0.0270s, d=0.002ft, v=0.54mph, a=3.255g');
console.log('  Step 20: t=0.1502s, d=4.00ft, v=10.26mph (ROLLOUT)');

console.log('\n' + '='.repeat(80));
console.log('KEY FINDING');
console.log('='.repeat(80));

console.log('\nRollout time comparison:');
console.log('  VB6:  0.146s @ 3.9ft');
console.log('  Ours: 0.150s @ 4.0ft');
console.log('  Error: +4ms');

console.log('\nThe 4ms error at rollout grows to 29ms by 60 feet.');
console.log('This suggests a systematic error in the timestep or integration.');

console.log('\n' + '='.repeat(80));
console.log('HYPOTHESIS');
console.log('='.repeat(80));

console.log('\nPossible causes of the 4ms rollout error:');
console.log('  1. Spin-up time calculation (but this matches: 0.02323s)');
console.log('  2. Initial timestep (TSMax) calculation');
console.log('  3. Velocity integration formula');
console.log('  4. Distance calculation formula');
console.log('  5. Overhang adjustment (ovradj) calculation');

console.log('\nFrom VB6 code:');
console.log('  DistToPrint(1) = gc_Rollout.Value / 12 = 12/12 = 1.0 ft');
console.log('  But VB6 shows rollout at 3.9ft, not 1.0ft!');
console.log('  This is because of ovradj (overhang adjustment).');

console.log('\nFrom our logs:');
console.log('  rolloutFt: 1');
console.log('  ovradj: 3');
console.log('  Actual rollout distance: 1 + 3 = 4.0ft');

console.log('\nVB6 shows 3.9ft, we show 4.0ft.');
console.log('The 0.1ft difference is 1.2 inches.');

console.log('\n' + '='.repeat(80));
console.log('ROOT CAUSE FOUND');
console.log('='.repeat(80));

console.log('\nThe issue is NOT in the physics calculation.');
console.log('The issue is in the OVERHANG ADJUSTMENT (ovradj) calculation.');

console.log('\nVB6 calculates ovradj as:');
console.log('  ovradj = (Overhang + 0.25 * ftd) / 12');
console.log('  where ftd = 2 * Rollout (with minimum of 24")');

console.log('\nFor TAD:');
console.log('  Overhang = 30"');
console.log('  Rollout = 12"');
console.log('  ftd = 2 * 12 = 24"');
console.log('  ovradj = (30 + 0.25 * 24) / 12 = (30 + 6) / 12 = 3.0 ft');

console.log('\nThis matches our calculation!');
console.log('So ovradj is correct.');

console.log('\nBut VB6 shows rollout at 3.9ft, not 4.0ft.');
console.log('This suggests VB6 is using a different rollout distance calculation.');

console.log('\n' + '='.repeat(80));
console.log('NEXT STEP');
console.log('='.repeat(80));

console.log('\nNeed to check VB6 code for how it calculates the actual rollout distance.');
console.log('The formula might be:');
console.log('  ActualRollout = (Rollout / 12) + ovradj - something');
console.log('or');
console.log('  ActualRollout = (Rollout / 12) * ovradj');
console.log('or some other formula.');

console.log('\nAlso need to verify the TIME calculation.');
console.log('Even if the distance is slightly off, the TIME should be accurate.');
console.log('VB6: 0.146s, Ours: 0.150s, Error: +4ms');
console.log('This 4ms error is significant and grows over time.');
console.log('='.repeat(80));
