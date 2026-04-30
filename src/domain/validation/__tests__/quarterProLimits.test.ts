/**
 * Tests for VB6 QUARTER Pro range validation and HP curve semantics
 */

import { describe, it, expect } from 'vitest';
import {
  QUARTER_PRO_LIMITS,
  validateHPCurve,
  applyHPMultiplier,
  calculateTorque,
  calculateHP,
} from '../quarterProLimits';

describe('QUARTER Pro VB6 Range Limits', () => {
  describe('Pro-Specific Field Ranges', () => {
    it('should have correct overhang range (16-40 inches)', () => {
      expect(QUARTER_PRO_LIMITS.overhang.min).toBe(16);
      expect(QUARTER_PRO_LIMITS.overhang.max).toBe(40);
    });

    it('should have correct final drive efficiency range (0.97-0.98)', () => {
      expect(QUARTER_PRO_LIMITS.finalDriveEfficiency.min).toBe(0.97);
      expect(QUARTER_PRO_LIMITS.finalDriveEfficiency.max).toBe(0.98);
    });

    it('should have correct drag coefficient range (0.25-0.80)', () => {
      expect(QUARTER_PRO_LIMITS.dragCoefficient.min).toBe(0.25);
      expect(QUARTER_PRO_LIMITS.dragCoefficient.max).toBe(0.80);
    });

    it('should have correct lift coefficient range (0.10-0.80)', () => {
      expect(QUARTER_PRO_LIMITS.liftCoefficient.min).toBe(0.10);
      expect(QUARTER_PRO_LIMITS.liftCoefficient.max).toBe(0.80);
    });

    it('should have correct engine RPM range (2000-12000)', () => {
      expect(QUARTER_PRO_LIMITS.engineRPM.min).toBe(2000);
      expect(QUARTER_PRO_LIMITS.engineRPM.max).toBe(12000);
    });

    it('should have correct engine HP range (200-6000)', () => {
      expect(QUARTER_PRO_LIMITS.engineHP.min).toBe(200);
      expect(QUARTER_PRO_LIMITS.engineHP.max).toBe(6000);
    });

    it('should have correct engine torque range (150-5000 lb-ft)', () => {
      expect(QUARTER_PRO_LIMITS.engineTorque.min).toBe(150);
      expect(QUARTER_PRO_LIMITS.engineTorque.max).toBe(5000);
    });

    it('should have correct HP/Torque multiplier range (0.9-1.1)', () => {
      expect(QUARTER_PRO_LIMITS.hpTorqueMultiplier.min).toBe(0.9);
      expect(QUARTER_PRO_LIMITS.hpTorqueMultiplier.max).toBe(1.1);
    });

    it('should have correct clutch launch RPM range (4500-12000)', () => {
      expect(QUARTER_PRO_LIMITS.clutchLaunchRPM.min).toBe(4500);
      expect(QUARTER_PRO_LIMITS.clutchLaunchRPM.max).toBe(12000);
    });

    it('should have correct clutch slippage range (1.00-1.01)', () => {
      expect(QUARTER_PRO_LIMITS.clutchSlippage.min).toBe(1.00);
      expect(QUARTER_PRO_LIMITS.clutchSlippage.max).toBe(1.01);
    });

    it('should have correct converter slippage range (1.03-1.08)', () => {
      expect(QUARTER_PRO_LIMITS.converterSlippage.min).toBe(1.03);
      expect(QUARTER_PRO_LIMITS.converterSlippage.max).toBe(1.08);
    });

    it('should have correct torque multiplication range (1.4-2.0)', () => {
      expect(QUARTER_PRO_LIMITS.converterTorqueMult.min).toBe(1.4);
      expect(QUARTER_PRO_LIMITS.converterTorqueMult.max).toBe(2.0);
    });

    it('should have correct gear efficiency range (0.96-0.99)', () => {
      expect(QUARTER_PRO_LIMITS.gearEfficiency.min).toBe(0.96);
      expect(QUARTER_PRO_LIMITS.gearEfficiency.max).toBe(0.99);
    });

    it('should have correct engine PMI range (2.0-5.0)', () => {
      expect(QUARTER_PRO_LIMITS.enginePMI.min).toBe(2.0);
      expect(QUARTER_PRO_LIMITS.enginePMI.max).toBe(5.0);
    });

    it('should have correct trans PMI range (0.1-0.8)', () => {
      expect(QUARTER_PRO_LIMITS.transPMI.min).toBe(0.1);
      expect(QUARTER_PRO_LIMITS.transPMI.max).toBe(0.8);
    });

    it('should have correct tires PMI range (20-60)', () => {
      expect(QUARTER_PRO_LIMITS.tiresPMI.min).toBe(20);
      expect(QUARTER_PRO_LIMITS.tiresPMI.max).toBe(60);
    });
  });

  describe('HP Curve Validation', () => {
    it('should accept empty curve', () => {
      const result = validateHPCurve(undefined);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedCurve).toHaveLength(0);
    });

    it('should accept valid curve with <= 11 points', () => {
      const curve = [
        { rpm: 5000, hp: 400 },
        { rpm: 6000, hp: 500 },
        { rpm: 7000, hp: 550 },
      ];
      const result = validateHPCurve(curve);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.validatedCurve).toHaveLength(3);
    });

    it('should reject curve with > 11 points (VB6 maximum)', () => {
      const curve = Array.from({ length: 15 }, (_, i) => ({
        rpm: 3000 + i * 500,
        hp: 300 + i * 50,
      }));
      const result = validateHPCurve(curve);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('exceeds maximum 11 points');
      expect(result.validatedCurve).toHaveLength(11); // Truncated
    });

    it('should warn about zero RPM (VB6 terminator)', () => {
      const curve = [
        { rpm: 5000, hp: 400 },
        { rpm: 0, hp: 0 },
      ];
      const result = validateHPCurve(curve);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Point 2: Zero RPM (VB6 table terminator)');
    });

    it('should clamp RPM below minimum (2000)', () => {
      const curve = [{ rpm: 1500, hp: 300 }];
      const result = validateHPCurve(curve);
      expect(result.validatedCurve[0].rpm).toBe(2000);
      expect(result.warnings).toContain('Point 1: RPM 1500 below minimum 2000');
    });

    it('should clamp RPM above maximum (12000)', () => {
      const curve = [{ rpm: 15000, hp: 500 }];
      const result = validateHPCurve(curve);
      expect(result.validatedCurve[0].rpm).toBe(12000);
      expect(result.warnings).toContain('Point 1: RPM 15000 above maximum 12000');
    });

    it('should clamp HP below minimum (200)', () => {
      const curve = [{ rpm: 5000, hp: 150 }];
      const result = validateHPCurve(curve);
      expect(result.validatedCurve[0].hp).toBe(200);
      expect(result.warnings).toContain('Point 1: HP 150 below minimum 200');
    });

    it('should clamp HP above maximum (6000)', () => {
      const curve = [{ rpm: 8000, hp: 7000 }];
      const result = validateHPCurve(curve);
      expect(result.validatedCurve[0].hp).toBe(6000);
      expect(result.warnings).toContain('Point 1: HP 7000 above maximum 6000');
    });

    it('should validate multiple points independently', () => {
      const curve = [
        { rpm: 1500, hp: 150 },  // Both below min
        { rpm: 6000, hp: 500 },  // Valid
        { rpm: 15000, hp: 7000 }, // Both above max
      ];
      const result = validateHPCurve(curve);
      expect(result.validatedCurve[0].rpm).toBe(2000);
      expect(result.validatedCurve[0].hp).toBe(200);
      expect(result.validatedCurve[1].rpm).toBe(6000);
      expect(result.validatedCurve[1].hp).toBe(500);
      expect(result.validatedCurve[2].rpm).toBe(12000);
      expect(result.validatedCurve[2].hp).toBe(6000);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('HP/Torque Multiplier & Recalc', () => {
    it('should apply multiplier to HP curve', () => {
      const curve = [
        { rpm: 5000, hp: 400 },
        { rpm: 6000, hp: 500 },
      ];
      const result = applyHPMultiplier(curve, 1.1);
      expect(result).toBeDefined();
      expect(result![0].hp).toBe(440); // 400 * 1.1 = 440
      expect(result![1].hp).toBe(550); // 500 * 1.1 = 550
      expect(result![0].rpm).toBe(5000); // RPM unchanged
    });

    it('should round HP values after multiplier', () => {
      const curve = [{ rpm: 5000, hp: 333 }];
      const result = applyHPMultiplier(curve, 1.05);
      expect(result![0].hp).toBe(350); // 333 * 1.05 = 349.65 → 350
    });

    it('should return unchanged curve if multiplier is 1.0', () => {
      const curve = [{ rpm: 5000, hp: 400 }];
      const result = applyHPMultiplier(curve, 1.0);
      expect(result).toEqual(curve);
    });

    it('should handle empty curve', () => {
      const result = applyHPMultiplier(undefined, 1.1);
      expect(result).toBeUndefined();
    });

    it('should handle multiplier < 1.0 (reduction)', () => {
      const curve = [{ rpm: 5000, hp: 500 }];
      const result = applyHPMultiplier(curve, 0.9);
      expect(result![0].hp).toBe(450); // 500 * 0.9 = 450
    });
  });

  describe('HP ↔ Torque Conversion', () => {
    it('should calculate torque from HP and RPM', () => {
      const torque = calculateTorque(500, 6000);
      // Torque = (HP × 5252) / RPM = (500 × 5252) / 6000 = 437.67
      expect(torque).toBeCloseTo(437.67, 1);
    });

    it('should calculate HP from torque and RPM', () => {
      const hp = calculateHP(437.67, 6000);
      // HP = (Torque × RPM) / 5252 = (437.67 × 6000) / 5252 = 500
      expect(hp).toBeCloseTo(500, 1);
    });

    it('should handle zero RPM in torque calculation', () => {
      const torque = calculateTorque(500, 0);
      expect(torque).toBe(0);
    });

    it('should verify HP/Torque relationship at peak power', () => {
      // At 5252 RPM, HP = Torque numerically
      const hp = 400;
      const rpm = 5252;
      const torque = calculateTorque(hp, rpm);
      expect(torque).toBeCloseTo(hp, 1);
    });

    it('should verify roundtrip conversion', () => {
      const originalHP = 550;
      const rpm = 7000;
      const torque = calculateTorque(originalHP, rpm);
      const convertedHP = calculateHP(torque, rpm);
      expect(convertedHP).toBeCloseTo(originalHP, 1);
    });
  });

  describe('VB6 Manual Compliance', () => {
    it('should enforce 11-point maximum per manual page 4-9', () => {
      // "A maximum of 11 RPM power points may be input to QUARTER Pro"
      const curve = Array.from({ length: 12 }, (_, i) => ({
        rpm: 3000 + i * 500,
        hp: 300 + i * 50,
      }));
      const result = validateHPCurve(curve);
      expect(result.valid).toBe(false);
      expect(result.validatedCurve).toHaveLength(11);
    });

    it('should enforce RPM range per manual page 4-9', () => {
      // "Normal input values for the engine dyno data RPM are between 2,000 and 12,000"
      const lowCurve = [{ rpm: 1000, hp: 300 }];
      const highCurve = [{ rpm: 15000, hp: 500 }];
      
      const lowResult = validateHPCurve(lowCurve);
      expect(lowResult.validatedCurve[0].rpm).toBe(2000);
      
      const highResult = validateHPCurve(highCurve);
      expect(highResult.validatedCurve[0].rpm).toBe(12000);
    });

    it('should enforce HP range per manual page 4-9', () => {
      // "Normal input values for the engine HP are between 200 and 6,000"
      const lowCurve = [{ rpm: 5000, hp: 100 }];
      const highCurve = [{ rpm: 8000, hp: 7000 }];
      
      const lowResult = validateHPCurve(lowCurve);
      expect(lowResult.validatedCurve[0].hp).toBe(200);
      
      const highResult = validateHPCurve(highCurve);
      expect(highResult.validatedCurve[0].hp).toBe(6000);
    });

    it('should support Recalc button behavior per manual page 4-10', () => {
      // "Pressing the Recalc button will cause all the HP and Torque data values 
      // to be recalculated using the current HP/Torque Multiplier. 
      // The new values will be displayed in the engine dyno data table, 
      // and the HP/Torque Multiplier will be reset to 1.0."
      
      const curve = [{ rpm: 5000, hp: 400 }];
      const multiplier = 1.05;
      const result = applyHPMultiplier(curve, multiplier);
      
      expect(result![0].hp).toBe(420); // 400 * 1.05 = 420
      // In actual implementation, multiplier would be reset to 1.0 after this
    });
  });

  describe('Transmission Pro Field Validation', () => {
    describe('Clutch Fields (manual page 4-11)', () => {
      it('should have correct clutch launch RPM range (4500-12000)', () => {
        expect(QUARTER_PRO_LIMITS.clutchLaunchRPM.min).toBe(4500);
        expect(QUARTER_PRO_LIMITS.clutchLaunchRPM.max).toBe(12000);
      });

      it('should have correct clutch slip RPM range (2000-7000)', () => {
        expect(QUARTER_PRO_LIMITS.clutchSlipRPM.min).toBe(2000);
        expect(QUARTER_PRO_LIMITS.clutchSlipRPM.max).toBe(7000);
      });

      it('should have correct clutch slippage range (1.00-1.01)', () => {
        expect(QUARTER_PRO_LIMITS.clutchSlippage.min).toBe(1.00);
        expect(QUARTER_PRO_LIMITS.clutchSlippage.max).toBe(1.01);
      });
    });

    describe('Converter Fields (manual pages 4-12 to 4-13)', () => {
      it('should have correct converter launch RPM range (2000-12000)', () => {
        expect(QUARTER_PRO_LIMITS.converterLaunchRPM.min).toBe(2000);
        expect(QUARTER_PRO_LIMITS.converterLaunchRPM.max).toBe(12000);
      });

      it('should have correct converter stall RPM range (2000-7500)', () => {
        expect(QUARTER_PRO_LIMITS.converterStallRPM.min).toBe(2000);
        expect(QUARTER_PRO_LIMITS.converterStallRPM.max).toBe(7500);
      });

      it('should have correct stall index range (30-160)', () => {
        expect(QUARTER_PRO_LIMITS.converterStallIndex.min).toBe(30);
        expect(QUARTER_PRO_LIMITS.converterStallIndex.max).toBe(160);
      });

      it('should have correct converter slippage range (1.03-1.08)', () => {
        expect(QUARTER_PRO_LIMITS.converterSlippage.min).toBe(1.03);
        expect(QUARTER_PRO_LIMITS.converterSlippage.max).toBe(1.08);
      });

      it('should have correct torque multiplication range (1.4-2.0)', () => {
        expect(QUARTER_PRO_LIMITS.converterTorqueMult.min).toBe(1.4);
        expect(QUARTER_PRO_LIMITS.converterTorqueMult.max).toBe(2.0);
      });
    });

    describe('Gear Table Fields (manual pages 4-14 to 4-15)', () => {
      it('should have correct gear efficiency range (0.96-0.99)', () => {
        expect(QUARTER_PRO_LIMITS.gearEfficiency.min).toBe(0.96);
        expect(QUARTER_PRO_LIMITS.gearEfficiency.max).toBe(0.99);
      });

      it('should have correct shift RPM range (4500-12500)', () => {
        expect(QUARTER_PRO_LIMITS.shiftRPM.min).toBe(4500);
        expect(QUARTER_PRO_LIMITS.shiftRPM.max).toBe(12500);
      });
    });
  });
});
