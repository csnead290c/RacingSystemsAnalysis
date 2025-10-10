/**
 * Integration tests for RSACLASSIC weather/air density module.
 */

import { describe, it, expect } from 'vitest';
import { airDensity_slug_ft3, rhoRatio, hpCorrection, densityAltitude_ft } from '../domain/physics/weather/air';
import type { Env } from '../domain/schemas/env.schema';

describe('Physics Weather - Air Density', () => {
  const standardConditions: Env = {
    elevation: 0,
    temperatureF: 59,
    barometerInHg: 29.92,
    humidityPct: 0, // Dry air
  };

  describe('airDensity_slug_ft3', () => {
    it('should return standard density at standard conditions', () => {
      const density = airDensity_slug_ft3(standardConditions);
      
      // Should be close to 0.002377 slugs/ft³
      expect(density).toBeCloseTo(0.002377, 5);
    });

    it('should decrease density with higher temperature', () => {
      const hot: Env = {
        ...standardConditions,
        temperatureF: 95, // Hot day
      };
      
      const densityStandard = airDensity_slug_ft3(standardConditions);
      const densityHot = airDensity_slug_ft3(hot);
      
      // Hot air is less dense
      expect(densityHot).toBeLessThan(densityStandard);
    });

    it('should decrease density with higher humidity', () => {
      const humid: Env = {
        ...standardConditions,
        humidityPct: 80, // Very humid
      };
      
      const densityDry = airDensity_slug_ft3(standardConditions);
      const densityHumid = airDensity_slug_ft3(humid);
      
      // Humid air is less dense (water vapor is lighter than dry air)
      expect(densityHumid).toBeLessThan(densityDry);
    });

    it('should increase density with higher barometric pressure', () => {
      const highPressure: Env = {
        ...standardConditions,
        barometerInHg: 30.5, // High pressure system
      };
      
      const densityStandard = airDensity_slug_ft3(standardConditions);
      const densityHigh = airDensity_slug_ft3(highPressure);
      
      // Higher pressure = denser air
      expect(densityHigh).toBeGreaterThan(densityStandard);
    });

    it('should decrease density with lower barometric pressure', () => {
      const lowPressure: Env = {
        ...standardConditions,
        barometerInHg: 29.0, // Low pressure system
      };
      
      const densityStandard = airDensity_slug_ft3(standardConditions);
      const densityLow = airDensity_slug_ft3(lowPressure);
      
      // Lower pressure = less dense air
      expect(densityLow).toBeLessThan(densityStandard);
    });

    it('should handle combined adverse conditions', () => {
      const adverse: Env = {
        elevation: 0,
        temperatureF: 100, // Hot
        barometerInHg: 29.0, // Low pressure
        humidityPct: 90, // Very humid
      };
      
      const densityStandard = airDensity_slug_ft3(standardConditions);
      const densityAdverse = airDensity_slug_ft3(adverse);
      
      // All factors reduce density
      expect(densityAdverse).toBeLessThan(densityStandard);
      
      // Should be significantly less (at least 10% reduction)
      const reduction = (densityStandard - densityAdverse) / densityStandard;
      expect(reduction).toBeGreaterThan(0.10);
    });

    it('should handle combined favorable conditions', () => {
      const favorable: Env = {
        elevation: 0,
        temperatureF: 40, // Cold
        barometerInHg: 30.5, // High pressure
        humidityPct: 10, // Dry
      };
      
      const densityStandard = airDensity_slug_ft3(standardConditions);
      const densityFavorable = airDensity_slug_ft3(favorable);
      
      // All factors increase density
      expect(densityFavorable).toBeGreaterThan(densityStandard);
      
      // Should be significantly more (at least 5% increase)
      const increase = (densityFavorable - densityStandard) / densityStandard;
      expect(increase).toBeGreaterThan(0.05);
    });
  });

  describe('rhoRatio', () => {
    it('should return 1.0 at standard conditions', () => {
      const ratio = rhoRatio(standardConditions);
      
      expect(ratio).toBeCloseTo(1.0, 2);
    });

    it('should return less than 1.0 for hot conditions', () => {
      const hot: Env = {
        ...standardConditions,
        temperatureF: 95,
      };
      
      const ratio = rhoRatio(hot);
      
      expect(ratio).toBeLessThan(1.0);
      expect(ratio).toBeGreaterThan(0.85); // Reasonable range
    });

    it('should return less than 1.0 for humid conditions', () => {
      const humid: Env = {
        ...standardConditions,
        humidityPct: 80,
      };
      
      const ratio = rhoRatio(humid);
      
      expect(ratio).toBeLessThan(1.0);
    });

    it('should return greater than 1.0 for high pressure', () => {
      const highPressure: Env = {
        ...standardConditions,
        barometerInHg: 30.5,
      };
      
      const ratio = rhoRatio(highPressure);
      
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(1.15); // Reasonable range
    });

    it('should be deterministic', () => {
      const conditions: Env = {
        elevation: 1000,
        temperatureF: 75,
        barometerInHg: 29.5,
        humidityPct: 50,
      };
      
      const ratio1 = rhoRatio(conditions);
      const ratio2 = rhoRatio(conditions);
      
      expect(ratio1).toBe(ratio2);
    });
  });

  describe('hpCorrection', () => {
    it('should return 1.0 at standard conditions', () => {
      const correction = hpCorrection(standardConditions);
      
      expect(correction).toBeCloseTo(1.0, 2);
    });

    it('should return less than 1.0 for hot conditions', () => {
      const hot: Env = {
        ...standardConditions,
        temperatureF: 95,
      };
      
      const correction = hpCorrection(hot);
      
      // Hot air = less power
      expect(correction).toBeLessThan(1.0);
      expect(correction).toBeGreaterThan(0.85); // Reasonable range
    });

    it('should return less than 1.0 for humid conditions', () => {
      const humid: Env = {
        ...standardConditions,
        humidityPct: 80,
      };
      
      const correction = hpCorrection(humid);
      
      // Humid air = less power
      expect(correction).toBeLessThan(1.0);
    });

    it('should return greater than 1.0 for high pressure', () => {
      const highPressure: Env = {
        ...standardConditions,
        barometerInHg: 30.5,
      };
      
      const correction = hpCorrection(highPressure);
      
      // High pressure = more power
      expect(correction).toBeGreaterThan(1.0);
      expect(correction).toBeLessThan(1.15); // Reasonable range
    });

    it('should return less than 1.0 for low pressure', () => {
      const lowPressure: Env = {
        ...standardConditions,
        barometerInHg: 29.0,
      };
      
      const correction = hpCorrection(lowPressure);
      
      // Low pressure = less power
      expect(correction).toBeLessThan(1.0);
    });

    it('should show significant power loss in adverse conditions', () => {
      const adverse: Env = {
        elevation: 0,
        temperatureF: 100,
        barometerInHg: 29.0,
        humidityPct: 90,
      };
      
      const correction = hpCorrection(adverse);
      
      // Should lose at least 10% power
      expect(correction).toBeLessThan(0.90);
    });

    it('should show power gain in favorable conditions', () => {
      const favorable: Env = {
        elevation: 0,
        temperatureF: 40,
        barometerInHg: 30.5,
        humidityPct: 10,
      };
      
      const correction = hpCorrection(favorable);
      
      // Should gain at least 5% power
      expect(correction).toBeGreaterThan(1.05);
    });

    it('should be deterministic', () => {
      const conditions: Env = {
        elevation: 1000,
        temperatureF: 75,
        barometerInHg: 29.5,
        humidityPct: 50,
      };
      
      const correction1 = hpCorrection(conditions);
      const correction2 = hpCorrection(conditions);
      
      expect(correction1).toBe(correction2);
    });

    it('should approximately equal rhoRatio for alpha=1.0', () => {
      const conditions: Env = {
        elevation: 500,
        temperatureF: 80,
        barometerInHg: 29.7,
        humidityPct: 60,
      };
      
      const ratio = rhoRatio(conditions);
      const correction = hpCorrection(conditions);
      
      // With alpha = 1.0, correction should equal ratio
      expect(correction).toBeCloseTo(ratio, 5);
    });
  });

  describe('densityAltitude_ft', () => {
    it('should return approximately zero at standard conditions', () => {
      const da = densityAltitude_ft(standardConditions);
      
      // At standard conditions (sea level), DA ≈ 0
      expect(da).toBeCloseTo(0, -2); // Within 100 ft
    });

    it('should return higher DA for hot conditions', () => {
      const hot: Env = {
        elevation: 1000,
        temperatureF: 95,
        barometerInHg: 29.92,
        humidityPct: 0,
      };
      
      const da = densityAltitude_ft(hot);
      
      // Hot air = higher density altitude (less dense = higher altitude equivalent)
      expect(da).toBeGreaterThan(0);
    });

    it('should return negative DA for cold conditions', () => {
      const cold: Env = {
        elevation: 1000,
        temperatureF: 40,
        barometerInHg: 29.92,
        humidityPct: 0,
      };
      
      const da = densityAltitude_ft(cold);
      
      // Cold air = lower density altitude (denser = lower altitude equivalent)
      expect(da).toBeLessThan(0);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle Denver conditions (high altitude)', () => {
      const denver: Env = {
        elevation: 5280, // Mile high
        temperatureF: 75,
        barometerInHg: 24.9, // Typical for Denver
        humidityPct: 30,
      };
      
      const ratio = rhoRatio(denver);
      const correction = hpCorrection(denver);
      
      // Should show significant power loss at altitude
      expect(ratio).toBeLessThan(0.85);
      expect(correction).toBeLessThan(0.85);
    });

    it('should handle sea level summer conditions', () => {
      const summerSeaLevel: Env = {
        elevation: 0,
        temperatureF: 90,
        barometerInHg: 29.8,
        humidityPct: 70,
      };
      
      const ratio = rhoRatio(summerSeaLevel);
      const correction = hpCorrection(summerSeaLevel);
      
      // Should show moderate power loss
      expect(ratio).toBeLessThan(1.0);
      expect(ratio).toBeGreaterThan(0.90);
      expect(correction).toBeCloseTo(ratio, 5);
    });

    it('should handle sea level winter conditions', () => {
      const winterSeaLevel: Env = {
        elevation: 0,
        temperatureF: 45,
        barometerInHg: 30.2,
        humidityPct: 40,
      };
      
      const ratio = rhoRatio(winterSeaLevel);
      const correction = hpCorrection(winterSeaLevel);
      
      // Should show power gain
      expect(ratio).toBeGreaterThan(1.0);
      expect(correction).toBeGreaterThan(1.0);
    });
  });
});
