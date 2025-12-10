/**
 * Parse VB6 .DAT files and generate benchmark configs
 * 
 * This script reads the .DAT files from the Reference Files folder
 * and generates TypeScript benchmark configs that match the VB6 test cases exactly.
 * 
 * Usage: npx ts-node scripts/parse-dat-files.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// DAT file format (from QUARTER Pro):
// Line 1: Version string (e.g., " 3.21 ")
// Line 2: Note/description
// Line 3: elevation, temp, barometer, humidity, trackTemp, weight, wheelbase, rollout
// Line 4: overhang, frontalArea, dragCoef, liftCoef
// Line 5: RPM values (up to 11)
// Line 6: HP values (up to 11)
// Line 7: transType (0=clutch, 1=converter), fuelType
// Line 8: gear ratios (up to 6)
// Line 9: gear efficiencies (up to 6)
// Line 10: shift RPMs (up to 6)
// Line 11: launchRPM, slipStallRPM, torqueMult, slippage, lockup ("Y"/"N")
// Line 12: finalDrive, efficiency, tireDia, tireWidth, tractionIndex
// Line 13: enginePMI, transPMI, tiresPMI
// Line 14: windMPH, windAngle
// ... additional lines for other data

interface ParsedDAT {
  name: string;
  version: string;
  note: string;
  env: {
    elevation: number;
    temperatureF: number;
    barometerInHg: number;
    humidityPct: number;
    trackTempF: number;
    windMph: number;
    windAngleDeg: number;
    tractionIndex: number;
  };
  vehicle: {
    weightLb: number;
    wheelbaseIn: number;
    overhangIn: number;
    rolloutIn: number;
    frontalArea_ft2: number;
    cd: number;
    liftCoeff: number;
    finalDrive: number;
    transEff: number;
    tireDiaIn: number;
    tireWidthIn: number;
    gearRatios: number[];
    gearEff: number[];
    shiftRPM: number[];
    torqueCurve: { rpm: number; hp: number }[];
    pmi?: {
      engine: number;
      trans: number;
      tires: number;
    };
    clutch?: {
      launchRPM: number;
      slipRPM: number;
      slippageFactor: number;
      lockup: boolean;
    };
    converter?: {
      launchRPM: number;
      stallRPM: number;
      torqueMult: number;
      slippageFactor: number;
      lockup: boolean;
    };
  };
  isConverter: boolean;
}

function parseNumbers(line: string): number[] {
  return line.trim().split(/\s+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
}

function parseDAT(filePath: string): ParsedDAT | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim());
    
    const name = path.basename(filePath, '.DAT').replace('.dat', '');
    
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
    
    // Line 7: transType, fuelType
    const line7 = parseNumbers(lines[6]);
    const isConverter = line7[0] === 1;
    
    // Line 8: gear ratios
    const gearRatios = parseNumbers(lines[7]).filter(v => v > 0);
    
    // Line 9: gear efficiencies
    const gearEff = parseNumbers(lines[8]).filter((v, i) => i < gearRatios.length);
    
    // Line 10: shift RPMs
    const shiftRPM = parseNumbers(lines[9]).filter(v => v > 0);
    
    // Line 11: launchRPM, slipStallRPM, torqueMult, slippage, lockup
    // Format varies - parse carefully
    const line11Raw = lines[10];
    const line11Numbers = parseNumbers(line11Raw);
    const launchRPM = line11Numbers[0];
    const slipStallRPM = line11Numbers[1];
    const torqueMult = line11Numbers[2] || 1;
    const slippageFactor = line11Numbers[3] || 1;
    const lockup = line11Raw.includes('"Y"') || line11Raw.includes("'Y'");
    
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
    
    const result: ParsedDAT = {
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

function generateBenchmarkConfig(dat: ParsedDAT): string {
  const clutchOrConverter = dat.isConverter
    ? `converter: {
        launchRPM: ${dat.vehicle.converter!.launchRPM},
        stallRPM: ${dat.vehicle.converter!.stallRPM},
        torqueMult: ${dat.vehicle.converter!.torqueMult},
        slippageFactor: ${dat.vehicle.converter!.slippageFactor},
        lockup: ${dat.vehicle.converter!.lockup},
      },`
    : `clutch: {
        launchRPM: ${dat.vehicle.clutch!.launchRPM},
        slipRPM: ${dat.vehicle.clutch!.slipRPM},
        slippageFactor: ${dat.vehicle.clutch!.slippageFactor},
        lockup: ${dat.vehicle.clutch!.lockup},
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
        engine: ${dat.vehicle.pmi!.engine},
        trans: ${dat.vehicle.pmi!.trans},
        tires: ${dat.vehicle.pmi!.tires},
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

const configs: string[] = [];

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

console.log(`// Auto-generated from VB6 .DAT files
// Generated: ${new Date().toISOString()}

export const VB6_DAT_BENCHMARKS = {
${configs.join('\n\n')}
};
`);

// Also write to a file
const outputPath = path.join(__dirname, '..', 'src', 'domain', 'physics', 'fixtures', 'vb6-dat-benchmarks.generated.ts');
const outputContent = `/**
 * Auto-generated benchmark configs from VB6 .DAT files
 * Generated: ${new Date().toISOString()}
 * 
 * DO NOT EDIT MANUALLY - regenerate using: npx ts-node scripts/parse-dat-files.ts
 */

export const VB6_DAT_BENCHMARKS = {
${configs.join('\n\n')}
};
`;

fs.writeFileSync(outputPath, outputContent);
console.log(`\nWritten to: ${outputPath}`);
