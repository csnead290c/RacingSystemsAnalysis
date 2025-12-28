/**
 * Compare PMI values between QuarterJr calculated vs QuarterPro user-provided
 */

import { calcPMI } from '../vb6/quarterJr';

// Pro Stock parameters
const displacement_cid = 500;
const fuelSystem = 1; // Gasoline Carburetor
const isConverter = false; // Clutch
const NGR = 5; // 5-speed
const tireDiaIn = 32.62676;
const tireWidthIn = 17.30;
const bodyStyle = 3; // Fastback (weight > 800, so not motorcycle)

console.log('='.repeat(80));
console.log('PMI VALUE COMPARISON');
console.log('='.repeat(80));

console.log('\nVehicle Parameters:');
console.log(`  Displacement: ${displacement_cid} CID`);
console.log(`  Fuel System: ${fuelSystem} (Gasoline Carburetor)`);
console.log(`  Transmission: ${isConverter ? 'Converter' : 'Clutch'}`);
console.log(`  Number of Gears: ${NGR}`);
console.log(`  Tire Diameter: ${tireDiaIn} inches`);
console.log(`  Tire Width: ${tireWidthIn} inches`);
console.log(`  Body Style: ${bodyStyle} (Fastback)`);

const pmi = calcPMI(displacement_cid, fuelSystem, isConverter, NGR, tireDiaIn, tireWidthIn, bodyStyle);

console.log('\n' + '='.repeat(80));
console.log('QUARTERJR CALCULATED PMI VALUES');
console.log('='.repeat(80));
console.log(`  Engine PMI:  ${pmi.enginePMI.toFixed(3)}`);
console.log(`  Trans PMI:   ${pmi.transPMI.toFixed(3)}`);
console.log(`  Tires PMI:   ${pmi.tiresPMI.toFixed(3)}`);

console.log('\n' + '='.repeat(80));
console.log('QUARTERPRO USER-PROVIDED PMI VALUES');
console.log('='.repeat(80));
console.log('  Engine PMI:  3.420');
console.log('  Trans PMI:   0.247');
console.log('  Tires PMI:   50.800');

console.log('\n' + '='.repeat(80));
console.log('DIFFERENCES');
console.log('='.repeat(80));
console.log(`  Engine PMI:  ${(pmi.enginePMI - 3.420).toFixed(3)} (${((pmi.enginePMI / 3.420 - 1) * 100).toFixed(1)}%)`);
console.log(`  Trans PMI:   ${(pmi.transPMI - 0.247).toFixed(3)} (${((pmi.transPMI / 0.247 - 1) * 100).toFixed(1)}%)`);
console.log(`  Tires PMI:   ${(pmi.tiresPMI - 50.800).toFixed(3)} (${((pmi.tiresPMI / 50.800 - 1) * 100).toFixed(1)}%)`);

console.log('\n' + '='.repeat(80));
console.log('VB6 FORMULAS (from TIMESLIP.FRM lines 787-799):');
console.log('='.repeat(80));
console.log('Naturally aspirated (fuel system <= 5):');
console.log('  Engine PMI = displacement / 120');
console.log(`  = ${displacement_cid} / 120 = ${(displacement_cid / 120).toFixed(3)}`);
console.log('\nClutch transmission:');
console.log('  Trans PMI = NGR * Engine PMI / 50');
console.log(`  = ${NGR} * ${(displacement_cid / 120).toFixed(3)} / 50 = ${(NGR * (displacement_cid / 120) / 50).toFixed(3)}`);
console.log('\nTires PMI:');
console.log('  = 2 * (1.15 * 0.8 * (0.08 * TireDia * TireWidth) * (TireDia / 2)^2 / 386)');

console.log('\n' + '='.repeat(80));
console.log('ANALYSIS');
console.log('='.repeat(80));

const engineDiff = Math.abs((pmi.enginePMI / 3.420 - 1) * 100);
const transDiff = Math.abs((pmi.transPMI / 0.247 - 1) * 100);
const tiresDiff = Math.abs((pmi.tiresPMI / 50.800 - 1) * 100);

if (engineDiff > 5 || transDiff > 5 || tiresDiff > 5) {
  console.log('⚠️  SIGNIFICANT PMI DIFFERENCES FOUND!');
  console.log('PMI values affect rotational inertia and acceleration.');
  console.log('Large differences would cause ET errors.');
} else {
  console.log('✅ PMI values are reasonably close.');
  console.log('PMI differences are unlikely to cause 263ms error.');
}

console.log('='.repeat(80));
