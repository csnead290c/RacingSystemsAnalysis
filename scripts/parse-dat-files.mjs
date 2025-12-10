/**
 * Parse VB6 .DAT files and generate benchmark configs
 * 
 * This script reads the .DAT files from the Reference Files folder
 * and generates TypeScript benchmark configs that match the VB6 test cases exactly.
 * 
 * Usage: node scripts/parse-dat-files.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseNumbers(line) {
  return line.trim().split(/\s+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
}

function parseDAT(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim());
    
    const name = path.basename(filePath).replace(/\.DAT$/i, '').replace(/\.dat$/i, '');
    
    // Line 1: Version
    const version = lines[0].replace(/"/g, '').trim();
    
    // Line 2: Note
    const note = lines[1].replace(/"/g, '').trim();
    
    // Line 3: elevation, temp, barometer, humidity, trackTemp, weight, wheelbase, rollout
    const line3 = parseNumbers(lines[2]);
    const elevation = line3[0];
    const temperatureF = line3[1];
    const barometerInHg = line3[2];
    const humidityPct = line3[3];
    const trackTempF = line3[4];
    const weightLb = line3[5];
    const wheelbaseIn = line3[6];
    const rolloutIn = line3[7];
    
    // Line 4: overhang, frontalArea, dragCoef, liftCoef
    const line4 = parseNumbers(lines[3]);
    const overhangIn = line4[0];
    const frontalArea_ft2 = line4[1];
    const cd = line4[2];
    const liftCoeff = line4[3];
    
    // Line 5: RPM values
    const rpmValues = parseNumbers(lines[4]).filter(v => v > 0);
    
    // Line 6: HP values
    const hpValues = parseNumbers(lines[5]).filter((v, i) => i < rpmValues.length);
    
    // Build torque curve
    const torqueCurve = rpmValues.map((rpm, i) => ({ rpm, hp: hpValues[i] }));
    
    // Line 7: engineMult (ENGE), fuelType (FTYPE)
    // Note: This is NOT trans type - trans type is determined by torqueMult on line 11
    const line7 = parseNumbers(lines[6]);
    const engineMult = line7[0];
    const fuelType = line7[1];
    
    // Line 8: gear ratios
    const gearRatios = parseNumbers(lines[7]).filter(v => v > 0);
    
    // Line 9: gear efficiencies
    const gearEff = parseNumbers(lines[8]).filter((v, i) => i < gearRatios.length);
    
    // Line 10: shift RPMs
    const shiftRPM = parseNumbers(lines[9]).filter(v => v > 0);
    
    // Line 11: launchRPM, slipStallRPM, torqueMult, slippage, lockup
    // VB6 MDI.FRM:785 - gc_TransType.Value = IIf(tmult = 1, False, True)
    // So torqueMult = 1 means CLUTCH, torqueMult != 1 means CONVERTER
    const line11Raw = lines[10];
    const line11Numbers = parseNumbers(line11Raw);
    const launchRPM = line11Numbers[0];
    const slipStallRPM = line11Numbers[1];
    const torqueMult = line11Numbers[2] || 1;
    const slippageFactor = line11Numbers[3] || 1;
    const lockup = line11Raw.includes('"Y"') || line11Raw.includes("'Y'");
    
    // Determine trans type based on torqueMult (VB6 logic)
    const isConverter = torqueMult !== 1;
    
    // Line 12: finalDrive, efficiency, tireDia, tireWidth, tractionIndex
    const line12 = parseNumbers(lines[11]);
    const finalDrive = line12[0];
    const transEff = line12[1];
    const tireDiaIn = line12[2];
    const tireWidthIn = line12[3];
    const tractionIndex = line12[4];
    
    // Line 13: PMI values
    const line13 = parseNumbers(lines[12]);
    const pmi = {
      engine: line13[0],
      trans: line13[1],
      tires: line13[2],
    };
    
    // Line 14: wind
    const line14 = parseNumbers(lines[13]);
    const windMph = line14[0] || 0;
    const windAngleDeg = line14[1] || 0;
    
    const result = {
      name,
      version,
      note,
      env: {
        elevation,
        temperatureF,
        barometerInHg,
        humidityPct,
        trackTempF,
        windMph,
        windAngleDeg,
        tractionIndex,
      },
      vehicle: {
        weightLb,
        wheelbaseIn,
        overhangIn,
        rolloutIn,
        frontalArea_ft2,
        cd,
        liftCoeff,
        finalDrive,
        transEff,
        tireDiaIn,
        tireWidthIn,
        gearRatios,
        gearEff,
        shiftRPM,
        torqueCurve,
        pmi,
      },
      isConverter,
    };
    
    // Add clutch or converter config
    if (isConverter) {
      result.vehicle.converter = {
        launchRPM,
        stallRPM: slipStallRPM,
        torqueMult,
        slippageFactor,
        lockup,
      };
    } else {
      result.vehicle.clutch = {
        launchRPM,
        slipRPM: slipStallRPM,
        slippageFactor,
        lockup,
      };
    }
    
    return result;
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err);
    return null;
  }
}

function generateBenchmarkConfig(dat) {
  const clutchOrConverter = dat.isConverter
    ? `converter: {
        launchRPM: ${dat.vehicle.converter.launchRPM},
        stallRPM: ${dat.vehicle.converter.stallRPM},
        torqueMult: ${dat.vehicle.converter.torqueMult},
        slippageFactor: ${dat.vehicle.converter.slippageFactor},
        lockup: ${dat.vehicle.converter.lockup},
      },`
    : `clutch: {
        launchRPM: ${dat.vehicle.clutch.launchRPM},
        slipRPM: ${dat.vehicle.clutch.slipRPM},
        slippageFactor: ${dat.vehicle.clutch.slippageFactor},
        lockup: ${dat.vehicle.clutch.lockup},
      },`;

  const torqueCurveStr = dat.vehicle.torqueCurve
    .map(p => `        { rpm: ${p.rpm}, hp: ${p.hp} },`)
    .join('\n');

  return `  ${dat.name}_Pro: {
    name: '${dat.name}_Pro',
    fuel: 'GAS',
    // Source: ${dat.note}
    env: {
      elevation: ${dat.env.elevation},
      barometerInHg: ${dat.env.barometerInHg},
      temperatureF: ${dat.env.temperatureF},
      humidityPct: ${dat.env.humidityPct},
      windMph: ${dat.env.windMph},
      windAngleDeg: ${dat.env.windAngleDeg},
      trackTempF: ${dat.env.trackTempF},
      tractionIndex: ${dat.env.tractionIndex},
    },
    vehicle: {
      weightLb: ${dat.vehicle.weightLb},
      wheelbaseIn: ${dat.vehicle.wheelbaseIn},
      overhangIn: ${dat.vehicle.overhangIn},
      rolloutIn: ${dat.vehicle.rolloutIn},
      tireDiaIn: ${dat.vehicle.tireDiaIn},
      tireWidthIn: ${dat.vehicle.tireWidthIn},

      frontalArea_ft2: ${dat.vehicle.frontalArea_ft2},
      cd: ${dat.vehicle.cd},
      liftCoeff: ${dat.vehicle.liftCoeff},

      finalDrive: ${dat.vehicle.finalDrive},
      transEff: ${dat.vehicle.transEff},

      gearRatios: [${dat.vehicle.gearRatios.join(', ')}],
      gearEff: [${dat.vehicle.gearEff.join(', ')}],
      shiftRPM: [${dat.vehicle.shiftRPM.join(', ')}],

      ${clutchOrConverter}

      pmi: {
        engine: ${dat.vehicle.pmi.engine},
        trans: ${dat.vehicle.pmi.trans},
        tires: ${dat.vehicle.pmi.tires},
      },

      // HP curve from VB6 .DAT file
      torqueCurve: [
${torqueCurveStr}
      ],
    },
  },`;
}

// Main execution
const refFilesDir = path.join(__dirname, '..', 'Reference Files');
const datFiles = [
  'MOTORCYC.DAT',
  'SUPERGAS.DAT',
  'SUPERCMP.DAT',
  'PROSTOCK.dat',
  'TADRAG.DAT',
  'FUNNYCAR.DAT',
];

console.log('Parsing VB6 .DAT files from Reference Files folder...\n');

const configs = [];

for (const datFile of datFiles) {
  const filePath = path.join(refFilesDir, datFile);
  if (fs.existsSync(filePath)) {
    console.log(`Parsing ${datFile}...`);
    const parsed = parseDAT(filePath);
    if (parsed) {
      console.log(`  Name: ${parsed.name}`);
      console.log(`  Weight: ${parsed.vehicle.weightLb} lb`);
      console.log(`  HP Points: ${parsed.vehicle.torqueCurve.length}`);
      console.log(`  Peak HP: ${Math.max(...parsed.vehicle.torqueCurve.map(p => p.hp))}`);
      console.log(`  Gears: ${parsed.vehicle.gearRatios.length}`);
      console.log(`  Trans Type: ${parsed.isConverter ? 'Converter' : 'Clutch'}`);
      console.log('');
      
      configs.push(generateBenchmarkConfig(parsed));
    }
  } else {
    console.log(`File not found: ${filePath}`);
  }
}

console.log('\n========================================');
console.log('GENERATED BENCHMARK CONFIGS:');
console.log('========================================\n');

const generatedCode = `/**
 * Auto-generated benchmark configs from VB6 .DAT files
 * Generated: ${new Date().toISOString()}
 * 
 * DO NOT EDIT MANUALLY - regenerate using: node scripts/parse-dat-files.mjs
 */

export const VB6_DAT_BENCHMARKS = {
${configs.join('\n\n')}
};
`;

console.log(generatedCode);

// Also write to a file
const outputPath = path.join(__dirname, '..', 'src', 'domain', 'physics', 'fixtures', 'vb6-dat-benchmarks.generated.ts');
fs.writeFileSync(outputPath, generatedCode);
console.log(`\nWritten to: ${outputPath}`);
