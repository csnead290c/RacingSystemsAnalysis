/**
 * Test the inline parameter fix
 * VB6 uses: 0=Inline, 1=Vee, 2=Flat
 * Test case should use inline=1 (Vee) to match VB6's gc_Inline.Value=1
 */

import { calcEngPerf } from './src/domain/physics/engine/enginePerf.ts';

const inputs = {
  noCyl: 8,
  inline: 1,              // Vee (CORRECTED from 0)
  bore: 4.03,
  stroke: 3.48,
  rod: 5.85,
  compressionRatio: 12.9,
  camType: 4,
  inCamDur: 264,
  carb: true,
  carbCFM: 750,
  fuel: 1,
  manifold: 1,
  curved: true,
  manFlow: 96,
  noInValves: 1,
  valveDia: 2.05,
  maxInFlow: 250,
  deltaP: 28,
  refBore: 4.0,
  deck: 0.015,
  gasket: 0.039,
  chamber: 62,
  dome: 12,
};

console.log('Testing with CORRECTED inline parameter...\n');
console.log('VB6 Mapping: 0=Inline, 1=Vee, 2=Flat');
console.log(`Test case uses: inline=${inputs.inline} (Vee)\n`);

const result = calcEngPerf(inputs);

console.log('═══════════════════════════════════════════════════════════');
console.log('                    RESULTS');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Metric          TypeScript    VB6 Expected    Difference');
console.log('───────────────────────────────────────────────────────────');
console.log(`Peak HP         ${Math.round(result.peakHP).toString().padEnd(13)} ${461}             ${Math.round(result.peakHP) - 461}`);
console.log(`HP RPM          ${result.rpmPeakHP.toString().padEnd(13)} ${6650}           ${result.rpmPeakHP - 6650}`);
console.log(`Peak TQ         ${Math.round(result.peakTQ).toString().padEnd(13)} ${415}             ${Math.round(result.peakTQ) - 415}`);
console.log(`TQ RPM          ${result.rpmPeakTQ.toString().padEnd(13)} ${5450}           ${result.rpmPeakTQ - 5450}`);
console.log(`Shift RPM       ${result.shift.toString().padEnd(13)} ${7200}           ${result.shift - 7200}`);
console.log(`Redline         ${result.redline.toString().padEnd(13)} ${8350}           ${result.redline - 8350}`);
console.log('');

const hpMatch = Math.abs(Math.round(result.peakHP) - 461) <= 1;
const tqMatch = Math.abs(Math.round(result.peakTQ) - 415) <= 1;
const hpRpmMatch = Math.abs(result.rpmPeakHP - 6650) <= 50;
const tqRpmMatch = Math.abs(result.rpmPeakTQ - 5450) <= 50;

if (hpMatch && tqMatch && hpRpmMatch && tqRpmMatch) {
  console.log('✓✓✓ SUCCESS! Results match VB6 within tolerance! ✓✓✓');
} else {
  console.log('Still have discrepancies - need further investigation.');
}
console.log('');
