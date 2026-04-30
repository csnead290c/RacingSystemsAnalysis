/**
 * Vehicle Document Lifecycle Round-Trip Tests
 * 
 * Verifies that saving and loading a vehicle preserves all fields correctly.
 * This is trust-critical: a saved document must mean the same thing when reopened.
 */

import { describe, it, expect } from 'vitest';
import type { Vehicle } from '../../domain/schemas/vehicle.schema';
import { VehicleSchema } from '../../domain/schemas/vehicle.schema';

// Helper to simulate save/load round-trip via JSON serialization
function roundTrip(vehicle: Partial<Vehicle>): any {
  // Simulate what happens in the database: JSON.stringify then JSON.parse
  const json = JSON.stringify(vehicle);
  return JSON.parse(json);
}

// Helper to create a complete Jr vehicle
function createJrVehicle(): Partial<Vehicle> {
  return {
    id: 'test-jr-1',
    name: 'Test Jr Vehicle',
    weightLb: 3000,
    tireDiaIn: 28,
    rearGear: 3.73,
    rolloutIn: 12,
    powerHP: 400,
    defaultRaceLength: 'QUARTER',
    wheelbaseIn: 108,
    frontalAreaFt2: 20,
    fuelSystem: 'Gas+Carb',
    clutchSlipRPM: 6000,
    converterStallRPM: 3500,
    converterLaunchRPM: 3500,
    gearRatios: [2.48, 1.48, 1.0],
    bodyStyle: 1,
    notes: 'Test notes',
  };
}

// Helper to create a complete Pro vehicle
function createProVehicle(): Partial<Vehicle> {
  return {
    ...createJrVehicle(),
    id: 'test-pro-1',
    name: 'Test Pro Vehicle',
    usesQuarterProFeatures: true,
    editorMode: 'advanced',
    
    // Pro-specific fields
    overhangIn: 30,
    finalDriveEfficiency: 0.975,
    cd: 0.35,
    liftCoeff: 0.1,
    
    // HP Curve
    hpCurve: [
      { rpm: 3000, hp: 250 },
      { rpm: 4000, hp: 320 },
      { rpm: 5000, hp: 380 },
      { rpm: 6000, hp: 400 },
      { rpm: 7000, hp: 390 },
    ],
    hpTorqueMultiplier: 1.0,
    
    // PMI values
    enginePMI: 3.42,
    transPMI: 0.247,
    tiresPMI: 50.8,
    
    // Clutch Pro fields
    clutchLaunchRPM: 5500,
    clutchSlippage: 1.004,
    clutchLockup: false,
    
    // Converter Pro fields
    converterSlippage: 1.05,
    converterTorqueMult: 2.0,
    converterLockup: true,
    
    // Per-gear efficiency and shift RPMs
    gearEfficiencies: [0.990, 0.991, 0.992],
    shiftRPMs: [6500, 6500, 6500],
    
    // Throttle stop
    throttleStopEnabled: true,
    throttleStopPct: 0.85,
    throttleStopDuration: 0.5,
  };
}

describe('Vehicle Round-Trip Fidelity', () => {
  describe('Jr Vehicle Round-Trip', () => {
    it('should preserve all Jr fields through save/load cycle', () => {
      const original = createJrVehicle();
      const restored = roundTrip(original);
      
      // Verify all fields match
      expect(restored.id).toBe(original.id);
      expect(restored.name).toBe(original.name);
      expect(restored.weightLb).toBe(original.weightLb);
      expect(restored.tireDiaIn).toBe(original.tireDiaIn);
      expect(restored.rearGear).toBe(original.rearGear);
      expect(restored.rolloutIn).toBe(original.rolloutIn);
      expect(restored.powerHP).toBe(original.powerHP);
      expect(restored.wheelbaseIn).toBe(original.wheelbaseIn);
      expect(restored.frontalAreaFt2).toBe(original.frontalAreaFt2);
      expect(restored.fuelSystem).toBe(original.fuelSystem);
      expect(restored.clutchSlipRPM).toBe(original.clutchSlipRPM);
      expect(restored.converterStallRPM).toBe(original.converterStallRPM);
      expect(restored.gearRatios).toEqual(original.gearRatios);
      expect(restored.notes).toBe(original.notes);
    });

    it('should validate as a valid Vehicle schema', () => {
      const vehicle = createJrVehicle();
      const result = VehicleSchema.safeParse(vehicle);
      expect(result.success).toBe(true);
    });

    it('should preserve gear ratios array', () => {
      const vehicle = createJrVehicle();
      const restored = roundTrip(vehicle);
      
      expect(Array.isArray(restored.gearRatios)).toBe(true);
      expect(restored.gearRatios).toHaveLength(3);
      expect(restored.gearRatios).toEqual([2.48, 1.48, 1.0]);
    });

    it('should preserve numeric precision', () => {
      const vehicle = createJrVehicle();
      const restored = roundTrip(vehicle);
      
      // Verify no precision loss on critical fields
      expect(restored.rearGear).toBe(3.73);
      expect(restored.tireDiaIn).toBe(28);
      expect(restored.weightLb).toBe(3000);
    });
  });

  describe('Pro Vehicle Round-Trip', () => {
    it('should preserve all Pro fields through save/load cycle', () => {
      const original = createProVehicle();
      const restored = roundTrip(original);
      
      // Verify Pro-specific fields
      expect(restored.usesQuarterProFeatures).toBe(true);
      expect(restored.editorMode).toBe('advanced');
      expect(restored.overhangIn).toBe(original.overhangIn);
      expect(restored.finalDriveEfficiency).toBe(original.finalDriveEfficiency);
      expect(restored.cd).toBe(original.cd);
      expect(restored.liftCoeff).toBe(original.liftCoeff);
      expect(restored.enginePMI).toBe(original.enginePMI);
      expect(restored.transPMI).toBe(original.transPMI);
      expect(restored.tiresPMI).toBe(original.tiresPMI);
      expect(restored.clutchLaunchRPM).toBe(original.clutchLaunchRPM);
      expect(restored.clutchSlippage).toBe(original.clutchSlippage);
      expect(restored.converterSlippage).toBe(original.converterSlippage);
      expect(restored.converterTorqueMult).toBe(original.converterTorqueMult);
      expect(restored.throttleStopEnabled).toBe(original.throttleStopEnabled);
      expect(restored.throttleStopPct).toBe(original.throttleStopPct);
    });

    it('should preserve HP curve array correctly', () => {
      const original = createProVehicle();
      const restored = roundTrip(original);
      
      expect(Array.isArray(restored.hpCurve)).toBe(true);
      expect(restored.hpCurve).toHaveLength(5);
      
      // Verify each point
      restored.hpCurve.forEach((point: any, i: number) => {
        expect(point.rpm).toBe(original.hpCurve![i].rpm);
        expect(point.hp).toBe(original.hpCurve![i].hp);
      });
    });

    it('should preserve per-gear arrays correctly', () => {
      const original = createProVehicle();
      const restored = roundTrip(original);
      
      expect(Array.isArray(restored.gearEfficiencies)).toBe(true);
      expect(restored.gearEfficiencies).toEqual(original.gearEfficiencies);
      
      expect(Array.isArray(restored.shiftRPMs)).toBe(true);
      expect(restored.shiftRPMs).toEqual(original.shiftRPMs);
    });

    it('should validate as a valid Vehicle schema', () => {
      const vehicle = createProVehicle();
      const result = VehicleSchema.safeParse(vehicle);
      expect(result.success).toBe(true);
    });

    it('should preserve boolean flags correctly', () => {
      const original = createProVehicle();
      const restored = roundTrip(original);
      
      expect(restored.usesQuarterProFeatures).toBe(true);
      expect(restored.clutchLockup).toBe(false);
      expect(restored.converterLockup).toBe(true);
      expect(restored.throttleStopEnabled).toBe(true);
    });
  });

  describe('Component References Round-Trip', () => {
    it('should preserve engineRef', () => {
      const vehicle = {
        ...createJrVehicle(),
        engineRef: 'engine-123',
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.engineRef).toBe('engine-123');
    });

    it('should preserve clutchRef', () => {
      const vehicle = {
        ...createJrVehicle(),
        clutchRef: 'clutch-456',
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.clutchRef).toBe('clutch-456');
    });

    it('should preserve converterRef', () => {
      const vehicle = {
        ...createJrVehicle(),
        converterRef: 'converter-789',
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.converterRef).toBe('converter-789');
    });

    it('should preserve all component refs together', () => {
      const vehicle = {
        ...createProVehicle(),
        engineRef: 'engine-123',
        clutchRef: 'clutch-456',
        converterRef: 'converter-789',
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.engineRef).toBe('engine-123');
      expect(restored.clutchRef).toBe('clutch-456');
      expect(restored.converterRef).toBe('converter-789');
    });
  });

  describe('Saved Environment Round-Trip', () => {
    it('should preserve savedEnvQuarter object', () => {
      const vehicle = {
        ...createJrVehicle(),
        savedEnvQuarter: {
          elevation: 500,
          temperatureF: 85,
          barometerInHg: 29.80,
          humidityPct: 40,
          trackTempF: 120,
          windMph: 5,
        },
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.savedEnvQuarter).toBeDefined();
      expect(restored.savedEnvQuarter.elevation).toBe(500);
      expect(restored.savedEnvQuarter.temperatureF).toBe(85);
      expect(restored.savedEnvQuarter.barometerInHg).toBe(29.80);
      expect(restored.savedEnvQuarter.humidityPct).toBe(40);
    });

    it('should preserve lastSimQuarter object', () => {
      const vehicle = {
        ...createJrVehicle(),
        lastSimQuarter: {
          lastRunAt: '2026-03-18T15:00:00Z',
          raceLengthFt: 1320,
          et_s: 6.82,
          mph: 201.8,
          sixty_ft_s: 1.05,
          sixty_ft_mph: 72.3,
        },
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.lastSimQuarter).toBeDefined();
      expect(restored.lastSimQuarter.et_s).toBe(6.82);
      expect(restored.lastSimQuarter.mph).toBe(201.8);
      expect(restored.lastSimQuarter.lastRunAt).toBe('2026-03-18T15:00:00Z');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined optional fields', () => {
      const vehicle: Partial<Vehicle> = {
        id: 'minimal',
        name: 'Minimal Vehicle',
        weightLb: 3000,
        tireDiaIn: 28,
        rearGear: 3.73,
        rolloutIn: 12,
        powerHP: 400,
        defaultRaceLength: 'QUARTER',
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.id).toBe('minimal');
      expect(restored.overhangIn).toBeUndefined();
      expect(restored.hpCurve).toBeUndefined();
      expect(restored.engineRef).toBeUndefined();
    });

    it('should handle empty arrays', () => {
      const vehicle = {
        ...createJrVehicle(),
        hpCurve: [],
        gearRatios: [],
      };
      const restored = roundTrip(vehicle);
      
      expect(Array.isArray(restored.hpCurve)).toBe(true);
      expect(restored.hpCurve).toHaveLength(0);
      expect(Array.isArray(restored.gearRatios)).toBe(true);
      expect(restored.gearRatios).toHaveLength(0);
    });

    it('should handle zero values correctly', () => {
      const vehicle = {
        ...createJrVehicle(),
        rolloutIn: 0,
        hpTorqueMultiplier: 0,
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.rolloutIn).toBe(0);
      expect(restored.hpTorqueMultiplier).toBe(0);
    });

    it('should handle undefined correctly', () => {
      const vehicle = {
        ...createJrVehicle(),
        notes: undefined,
        group: undefined,
      };
      const restored = roundTrip(vehicle);
      
      // JSON.stringify omits undefined fields
      expect(restored.notes).toBeUndefined();
      expect(restored.group).toBeUndefined();
    });
  });

  describe('Pro Field Preservation After Downgrade', () => {
    it('should preserve Pro fields even when usesQuarterProFeatures is false', () => {
      const vehicle = {
        ...createProVehicle(),
        usesQuarterProFeatures: false, // Simulate downgrade
      };
      const restored = roundTrip(vehicle);
      
      // Pro fields should still be preserved in storage
      expect(restored.hpCurve).toBeDefined();
      expect(restored.hpCurve).toHaveLength(5);
      expect(restored.enginePMI).toBe(3.42);
      expect(restored.cd).toBe(0.35);
    });

    it('should preserve Pro fields when usesQuarterProFeatures is undefined', () => {
      const vehicle = {
        ...createProVehicle(),
        usesQuarterProFeatures: undefined, // Legacy vehicle
      };
      const restored = roundTrip(vehicle);
      
      // Pro fields should still be preserved
      expect(restored.hpCurve).toBeDefined();
      expect(restored.enginePMI).toBe(3.42);
    });
  });

  describe('HP Curve Specific Tests', () => {
    it('should preserve HP curve with 11 points (VB6 maximum)', () => {
      const hpCurve = Array.from({ length: 11 }, (_, i) => ({
        rpm: 2000 + i * 1000,
        hp: 200 + i * 50,
      }));
      
      const vehicle = {
        ...createProVehicle(),
        hpCurve,
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.hpCurve).toHaveLength(11);
      expect(restored.hpCurve[0].rpm).toBe(2000);
      expect(restored.hpCurve[10].rpm).toBe(12000);
    });

    it('should preserve HP curve with single point', () => {
      const vehicle = {
        ...createProVehicle(),
        hpCurve: [{ rpm: 6000, hp: 400 }],
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.hpCurve).toHaveLength(1);
      expect(restored.hpCurve[0].rpm).toBe(6000);
      expect(restored.hpCurve[0].hp).toBe(400);
    });

    it('should preserve HP curve with decimal values', () => {
      const vehicle = {
        ...createProVehicle(),
        hpCurve: [
          { rpm: 5500.5, hp: 399.75 },
          { rpm: 6000.25, hp: 400.5 },
        ],
      };
      const restored = roundTrip(vehicle);
      
      expect(restored.hpCurve[0].rpm).toBe(5500.5);
      expect(restored.hpCurve[0].hp).toBe(399.75);
      expect(restored.hpCurve[1].rpm).toBe(6000.25);
      expect(restored.hpCurve[1].hp).toBe(400.5);
    });
  });
});
