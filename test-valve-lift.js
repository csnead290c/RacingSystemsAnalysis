// Test valve lift calculation
const PI = 3.141593;

const maxLift = 0.550;
const duration = 264;
const lobeCenterline = 105;

// Opening and closing points
const openingPoint = lobeCenterline - duration / 2; // 105 - 132 = -27
const closingPoint = lobeCenterline + duration / 2; // 105 + 132 = 237

console.log('Opening point:', openingPoint);
console.log('Closing point:', closingPoint);
console.log('Lobe centerline:', lobeCenterline);

// Test at various angles
const testAngles = [-27, 0, 30, 60, 90, 105, 120, 150, 180, 205, 237];

console.log('\nValve Lift Tests:');
testAngles.forEach(angle => {
  if (angle < openingPoint || angle > closingPoint) {
    console.log(`${angle}°: 0.000 (closed)`);
    return;
  }
  
  // Current formula (wrong)
  const camAngle1 = angle - openingPoint;
  const liftFraction1 = (1 - Math.cos(camAngle1 * PI / duration)) / 2;
  const lift1 = maxLift * liftFraction1;
  
  // Alternative: use angle relative to centerline
  const angleFromCenter = angle - lobeCenterline;
  const liftFraction2 = Math.cos(angleFromCenter * PI / (duration / 2));
  const lift2 = maxLift * liftFraction2;
  
  // Alternative 3: standard cam profile
  const camAngle3 = (angle - openingPoint) / duration; // 0 to 1
  const liftFraction3 = (1 - Math.cos(camAngle3 * PI)) / 2;
  const lift3 = maxLift * liftFraction3;
  
  console.log(`${angle}°: formula1=${lift1.toFixed(3)}, formula2=${lift2.toFixed(3)}, formula3=${lift3.toFixed(3)}`);
});

// Expected values from VB6
console.log('\nExpected VB6 values:');
console.log('105°: 0.550 (max lift at lobe centerline)');
console.log('0°: 0.163');
console.log('30°: 0.333');
console.log('60°: 0.471');
console.log('90°: 0.541');
console.log('120°: 0.541');
console.log('150°: 0.471');
console.log('180°: 0.333');
