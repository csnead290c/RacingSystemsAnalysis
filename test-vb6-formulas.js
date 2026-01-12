// Quick test to reverse-engineer correct VB6 formulas from expected outputs

const PI = 3.141593;

// Base case
const bore = 4.030;
const stroke = 3.480;
const rod = 5.850;
const CR = 12.9;
const rpm = 6650;

const LRQS = rod / stroke; // 1.6810344827586206

// Test cranking compression
// Expected: 230
// Try different exponents
console.log('Cranking Compression Tests:');
console.log('CR^1.0:', Math.round(14.7 * (Math.pow(CR, 1.0) - 1)));
console.log('CR^1.1:', Math.round(14.7 * (Math.pow(CR, 1.1) - 1)));
console.log('CR^1.15:', Math.round(14.7 * (Math.pow(CR, 1.15) - 1)));
console.log('CR^1.2:', Math.round(14.7 * (Math.pow(CR, 1.2) - 1)));
console.log('CR^1.25:', Math.round(14.7 * (Math.pow(CR, 1.25) - 1)));
console.log('CR^1.3:', Math.round(14.7 * (Math.pow(CR, 1.3) - 1)));

// Test piston speed summary
// Expected: avg=3857, max=6322
console.log('\nPiston Speed Summary Tests:');
console.log('Avg (RPM*2*stroke/12):', Math.round(rpm * 2 * stroke / 12));

// Test different flrqs formulas
const flrqs1 = Math.sqrt(1 + LRQS * LRQS);
const flrqs2 = 1 + Math.pow(0.348 / LRQS, 1.99);
const flrqs3 = Math.sqrt(1 + 1/(LRQS*LRQS));

console.log('flrqs (sqrt(1+LRQS^2)):', flrqs1, '-> max:', Math.round(rpm * PI * flrqs1 * stroke / 12));
console.log('flrqs (1+(0.348/LRQS)^1.99):', flrqs2, '-> max:', Math.round(rpm * PI * flrqs2 * stroke / 12));
console.log('flrqs (sqrt(1+1/LRQS^2)):', flrqs3, '-> max:', Math.round(rpm * PI * flrqs3 * stroke / 12));

// Test max speed angle
// Expected: 74.6
console.log('\nMax Speed Angle Tests:');
const AngMPS1 = 62 + Math.pow(750 * (LRQS - 0.958), 0.4027);
console.log('62 + (750*(LRQS-0.958))^0.4027:', AngMPS1);

// Test piston kinematics at 5 degrees
// Expected: depth=0.009, fpm=685
console.log('\nPiston Kinematics @ 5 deg:');
const angle = 5;
const ang = angle * PI / 180;
const zsin = Math.sin(ang);
const zcos = Math.cos(ang);
const zsin2 = Math.sin(2 * ang);

const lrqsq = LRQS * LRQS;
const zy = Math.sqrt(lrqsq - zsin * zsin);

const zhp = rpm * PI * stroke / 12;

// Test different piston position formulas
const pxs1 = (stroke / 2) * (1 + LRQS - zcos - zy);
const pxs2 = (stroke / 2) * (1 + LRQS - zcos - Math.sqrt(lrqsq - zsin * zsin));
console.log('Position formula 1:', pxs1.toFixed(3));
console.log('Position formula 2:', pxs2.toFixed(3));

// Test different piston speed formulas
const vxs1 = zhp * (zsin + (zsin2 / (2 * LRQS)) / zy);
const vxs2 = zhp * (zsin + zsin * zcos / (LRQS * zy));
console.log('Speed formula 1:', Math.round(vxs1));
console.log('Speed formula 2:', Math.round(vxs2));

// Test at 74.6 degrees (max speed point)
console.log('\nPiston Kinematics @ 74.6 deg:');
const angle2 = 74.6;
const ang2 = angle2 * PI / 180;
const zsin_2 = Math.sin(ang2);
const zcos_2 = Math.cos(ang2);
const zsin2_2 = Math.sin(2 * ang2);
const zy_2 = Math.sqrt(lrqsq - zsin_2 * zsin_2);

const pxs_2 = (stroke / 2) * (1 + LRQS - zcos_2 - zy_2);
const vxs_2 = zhp * (zsin_2 + (zsin2_2 / (2 * LRQS)) / zy_2);

console.log('Position:', pxs_2.toFixed(3), '(expected 1.524)');
console.log('Speed:', Math.round(vxs_2), '(expected 6323)');
