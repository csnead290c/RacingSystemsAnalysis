import { RSACLASSICModel } from '../src/domain/physics/models/rsaclassic';
import { loadVehicleConfig } from '../src/domain/vehicle/loader';

const vehicleName = process.argv[2] || 'ProStock_Pro';

async function main() {
  const model = new RSACLASSICModel();
  const vehicle = await loadVehicleConfig(vehicleName);
  
  if (!vehicle) {
    console.error(`Vehicle ${vehicleName} not found`);
    process.exit(1);
  }
  
  console.log(`\n=== ${vehicleName} QUARTER MILE ===\n`);
  
  const result = model.simulate(vehicle, {
    distance: 1320,
    env: {
      temperatureF: 59,
      barometerInHg: 29.92,
      humidityPct: 50,
      elevation: 0,
      tractionIndex: 3,
    },
  });
  
  console.log(`\nFinal: ET=${result.et.toFixed(3)}s, MPH=${result.mph.toFixed(1)}`);
}

main().catch(console.error);
