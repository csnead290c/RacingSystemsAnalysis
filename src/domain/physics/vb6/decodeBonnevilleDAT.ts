/**
 * Decode Bonneville ROADSTER.DAT line by line
 */

console.log('='.repeat(80));
console.log('DECODING BONNEVILLE ROADSTER.DAT');
console.log('='.repeat(80));

console.log('\nLine 3: 4500  76  29.92  50  106  2350  125  5');
console.log('  Field 1: elevation = 4500 ft');
console.log('  Field 2: temp = 76 F');
console.log('  Field 3: barometer = 29.92 inHg');
console.log('  Field 4: humidity = 50%');
console.log('  Field 5: ??? = 106 (trackTemp? 76+30=106 ✓)');
console.log('  Field 6: weight = 2350 lb');
console.log('  Field 7: wheelbase = 125 in');
console.log('  Field 8: ??? = 5 (tractionIndex?)');

console.log('\nLine 4: 0  24.1  0.58  0.8');
console.log('  Field 1: rollout = 0 (Bonneville has no rollout)');
console.log('  Field 2: frontalArea = 24.1 ft²');
console.log('  Field 3: cd = 0.58');
console.log('  Field 4: liftCoeff = 0.8');

console.log('\nLine 5-6: HP Curve');
console.log('  6400 -> 5559.987 HP');
console.log('  6600 -> 5733.737 HP');
console.log('  6800 -> 5733.451 HP');
console.log('  7000 -> 5581.357 HP');
console.log('  7200 -> 5298.826 HP');
console.log('  7400 -> 4857.974 HP');
console.log('  7600 -> 4302.36 HP');
console.log('  7800 -> 3629.627 HP');

console.log('\nLine 7: 0.96  8');
console.log('  Field 1: ??? = 0.96 (hpTqMult? or torqueMult?)');
console.log('  Field 2: bodyStyle = 8 (motorcycle)');

console.log('\nLine 8: 1.25  1  0  0  0  0');
console.log('  Gear ratios: [1.25, 1.00]');

console.log('\nLine 9: 0.8  0.99  0  0  0  0');
console.log('  Gear efficiencies: [0.80, 0.99]');

console.log('\nLine 10: 7000  0  0  0  0  0');
console.log('  Shift RPMs: [7000]');

console.log('\nLine 11: 5900          6400  1  1 "N"');
console.log('  Field 1: ??? = 5900 (launchRPM?)');
console.log('  Field 2: stallRPM = 6400');
console.log('  Field 3: transType = 1 (clutch)');
console.log('  Field 4: slipRatio = 1.0');
console.log('  Field 5: lockup = "N" (no)');

console.log('\nLine 12: 2.1  0.96  113  10  6');
console.log('  Field 1: rearGear = 2.1');
console.log('  Field 2: finalDriveEff = 0.96');
console.log('  Field 3: tireCirc = 113 in');
console.log('  Field 4: tireWidth = 10 in');
console.log('  Field 5: tractionIndex = 6');

console.log('\nLine 13: 4.178682  0.1671473  44.36557');
console.log('  PMI values:');
console.log('    engine_flywheel_clutch = 4.178682');
console.log('    transmission_driveshaft = 0.1671473');
console.log('    tires_wheels_ringgear = 44.36557');

console.log('\n' + '='.repeat(80));
console.log('COMPARISON WITH OUR TEST');
console.log('='.repeat(80));

console.log('\n✅ Correct:');
console.log('  - elevation: 4500');
console.log('  - temp: 76');
console.log('  - humidity: 50');
console.log('  - weight: 2350');
console.log('  - wheelbase: 125');
console.log('  - rollout: 0');
console.log('  - frontalArea: 24.1');
console.log('  - cd: 0.58');
console.log('  - liftCoeff: 0.8');
console.log('  - HP curve: exact match');
console.log('  - gearRatios: [1.25, 1.00]');
console.log('  - gearEfficiencies: [0.80, 0.99]');
console.log('  - shiftRPMs: [7000]');
console.log('  - stallRPM: 6400');
console.log('  - rearGear: 2.1');
console.log('  - finalDriveEff: 0.96');
console.log('  - tireCirc: 113 (tireDia: 35.987)');
console.log('  - tireWidth: 10');
console.log('  - tractionIndex: 6');
console.log('  - PMI: exact match');

console.log('\n❓ Uncertain:');
console.log('  - trackTempF: Using 106 (from field 5 of line 3)');
console.log('  - launchRPM: Using 6400 (stallRPM), but line 11 shows 5900');
console.log('  - hpTqMult: Using 1.0, but line 7 shows 0.96');

console.log('\n' + '='.repeat(80));
console.log('POTENTIAL ISSUES');
console.log('='.repeat(80));

console.log('\n1. LaunchRPM might be 5900, not 6400');
console.log('   Line 11 field 1 = 5900');
console.log('   But for Bonneville, LaunchRPM should = StallRPM = 6400');
console.log('   Need to check VB6 code for this field meaning');

console.log('\n2. hpTqMult might be 0.96, not 1.0');
console.log('   Line 7 field 1 = 0.96');
console.log('   This would reduce effective HP by 4%');

console.log('\n3. Line 7 field 1 (0.96) could also be torqueMult for converter');
console.log('   But this is a clutch vehicle, so probably hpTqMult');

console.log('='.repeat(80));
