import { describe, it, expect } from 'vitest';
import { EnvSchema } from '../domain/schemas/env.schema';
import { VehicleSchema } from '../domain/schemas/vehicle.schema';
import { RunRecordSchema } from '../domain/schemas/run.schema';

describe('Schema Validation', () => {
  describe('EnvSchema', () => {
    it('should parse valid environment data', () => {
      const validEnv = {
        elevation: 1000,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 50,
        trackTempF: 85,
        tractionIndex: 0.8,
        windMph: 5,
        windAngleDeg: 45,
      };

      const result = EnvSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validEnv);
      }
    });

    it('should parse valid environment data with only required fields', () => {
      const minimalEnv = {
        elevation: 500,
        temperatureF: 70,
        barometerInHg: 30.0,
        humidityPct: 45,
      };

      const result = EnvSchema.safeParse(minimalEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(minimalEnv);
      }
    });

    it('should fail validation when humidity exceeds 100', () => {
      const invalidEnv = {
        elevation: 1000,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 101,
      };

      const result = EnvSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('humidityPct');
      }
    });

    it('should fail validation when humidity is negative', () => {
      const invalidEnv = {
        elevation: 1000,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: -5,
      };

      const result = EnvSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });
  });

  describe('VehicleSchema', () => {
    it('should parse valid vehicle data', () => {
      const validVehicle = {
        id: 'veh-001',
        name: 'Test Car',
        weightLb: 3500,
        tireDiaIn: 28.5,
        rearGear: 3.73,
        rolloutIn: 89.5,
        powerHP: 450,
        defaultRaceLength: 'QUARTER',
      };

      const result = VehicleSchema.safeParse(validVehicle);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Car');
        expect(result.data.defaultRaceLength).toBe('QUARTER');
      }
    });

    it('should fail validation when required fields are missing', () => {
      const invalidVehicle = {
        id: 'veh-001',
        name: 'Test Car',
        // Missing required fields
      };

      const result = VehicleSchema.safeParse(invalidVehicle);
      expect(result.success).toBe(false);
    });
  });

  describe('RunRecordSchema', () => {
    it('should parse valid run record with all fields', () => {
      const validRun = {
        id: 'run-001',
        createdAt: Date.now(),
        vehicleId: 'veh-001',
        raceLength: 'QUARTER',
        env: {
          elevation: 1000,
          temperatureF: 75,
          barometerInHg: 29.92,
          humidityPct: 50,
          trackTempF: 85,
        },
        prediction: {
          et_s: 11.5,
          mph: 120.5,
        },
        outcome: {
          slipET_s: 11.45,
          slipMPH: 121.2,
          liftedFromFt: 1000,
        },
        increments: [
          { d_ft: 60, t_s: 1.5, v_mph: 45 },
          { d_ft: 330, t_s: 4.2, v_mph: 85 },
          { d_ft: 660, t_s: 6.8, v_mph: 105 },
          { d_ft: 1000, t_s: 9.1, v_mph: 115 },
          { d_ft: 1320, t_s: 11.45, v_mph: 121 },
        ],
        notes: 'Good run, slight headwind',
      };

      const result = RunRecordSchema.safeParse(validRun);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('run-001');
        expect(result.data.raceLength).toBe('QUARTER');
        expect(result.data.increments).toHaveLength(5);
      }
    });

    it('should parse valid run record with only required fields', () => {
      const minimalRun = {
        id: 'run-002',
        createdAt: Date.now(),
        vehicleId: 'veh-001',
        raceLength: 'EIGHTH',
        env: {
          elevation: 500,
          temperatureF: 70,
          barometerInHg: 30.0,
          humidityPct: 45,
        },
      };

      const result = RunRecordSchema.safeParse(minimalRun);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prediction).toBeUndefined();
        expect(result.data.outcome).toBeUndefined();
        expect(result.data.increments).toBeUndefined();
      }
    });

    it('should fail validation when env has invalid humidity', () => {
      const invalidRun = {
        id: 'run-003',
        createdAt: Date.now(),
        vehicleId: 'veh-001',
        raceLength: 'QUARTER',
        env: {
          elevation: 1000,
          temperatureF: 75,
          barometerInHg: 29.92,
          humidityPct: 150, // Invalid
        },
      };

      const result = RunRecordSchema.safeParse(invalidRun);
      expect(result.success).toBe(false);
    });
  });
});
