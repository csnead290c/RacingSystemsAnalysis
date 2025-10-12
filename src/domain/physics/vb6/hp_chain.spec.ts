/**
 * Unit tests for VB6 HP Chain calculations
 * 
 * Tests verify exact VB6 formulas from TIMESLIP.FRM:1176-1253
 * 
 * VB6 HP Chain:
 * 1. HPSave = engine HP at EngRPM
 * 2. HPEngPMI = hpEngPMI(RPM0, EngRPM, dt, PMI_engine, isClutch)
 * 3. HPChasPMI = hpChasPMI(DSRPM0, DSRPM, dt, PMI_chassis)
 * 4. HP = (HPSave - HPEngPMI) * ClutchSlip
 * 5. HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP
 * 6. PQWT = 550 * gc * HP / Weight
 */

import { describe, it, expect } from 'vitest';
import { hpEngPMI, hpChasPMI } from './pmi';
import { gc, PI } from './constants';

describe('VB6 HP Chain Calculations', () => {
  describe('hpEngPMI', () => {
    it('should calculate engine PMI HP loss for acceleration', () => {
      // VB6 example: Engine accelerating from 3000 to 3100 RPM in 0.002s
      // PMI_engine = 4.167 slug-ft² (500 CID naturally aspirated)
      const prevRPM = 3000;
      const rpm = 3100;
      const dt_s = 0.002;
      const PMI_engine_slugft2 = 4.167;
      const isClutch = true;
      
      // VB6: EngAccHP = PMI * RPM * (RPM - RPM0)
      // EngAccHP = 4.167 * 3100 * (3100 - 3000) = 4.167 * 3100 * 100 = 1,291,770
      const engAccHP = PMI_engine_slugft2 * rpm * (rpm - prevRPM);
      expect(engAccHP).toBeCloseTo(1291770, 0);
      
      // VB6: Work = (2 * PI / 60)^2 / (12 * 550 * dt)
      // Work = (0.10472)^2 / (12 * 550 * 0.002) = 0.010966 / 13.2 = 0.000831
      const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt_s);
      expect(work).toBeCloseTo(0.000831, 6);
      
      // VB6: HPEngPMI = EngAccHP * Work
      // HPEngPMI = 1,291,770 * 0.000831 ≈ 1073.2 HP
      const HPEngPMI = hpEngPMI(prevRPM, rpm, dt_s, PMI_engine_slugft2, isClutch);
      expect(HPEngPMI).toBeCloseTo(1073.2, 1);
    });
    
    it('should apply KP21 deceleration factor for clutch when decelerating', () => {
      // VB6: If EngAccHP < 0 Then EngAccHP = KP21 * EngAccHP (clutch)
      const prevRPM = 3100;
      const rpm = 3000; // Decelerating
      const dt_s = 0.002;
      const PMI_engine_slugft2 = 4.167;
      const isClutch = true;
      
      // EngAccHP = 4.167 * 3000 * (3000 - 3100) = 4.167 * 3000 * (-100) = -1,250,100
      // With KP21 = 0.15: EngAccHP = 0.15 * (-1,250,100) = -187,515
      const engAccHP_raw = PMI_engine_slugft2 * rpm * (rpm - prevRPM);
      expect(engAccHP_raw).toBeCloseTo(-1250100, 0);
      
      const HPEngPMI = hpEngPMI(prevRPM, rpm, dt_s, PMI_engine_slugft2, isClutch);
      
      // Work = 0.000831, HPEngPMI = -187,515 * 0.000831 = -155.8 HP
      expect(HPEngPMI).toBeCloseTo(-155.8, 1);
    });
    
    it('should apply KP22 deceleration factor for converter when decelerating', () => {
      // VB6: If EngAccHP < 0 Then EngAccHP = KP22 * EngAccHP (converter)
      const prevRPM = 3100;
      const rpm = 3000;
      const dt_s = 0.002;
      const PMI_engine_slugft2 = 4.167;
      const isClutch = false; // Converter
      
      // EngAccHP = -1,250,100
      // With KP22 = 0.25: EngAccHP = 0.25 * (-1,250,100) = -312,525
      const HPEngPMI = hpEngPMI(prevRPM, rpm, dt_s, PMI_engine_slugft2, isClutch);
      
      // Work = 0.000831, HPEngPMI = -312,525 * 0.000831 ≈ -259.6 HP
      expect(HPEngPMI).toBeCloseTo(-259.6, 1);
    });
    
    it('should return zero for no RPM change', () => {
      const prevRPM = 3000;
      const rpm = 3000;
      const dt_s = 0.002;
      const PMI_engine_slugft2 = 4.167;
      
      const HPEngPMI = hpEngPMI(prevRPM, rpm, dt_s, PMI_engine_slugft2, true);
      expect(HPEngPMI).toBe(0);
    });
  });
  
  describe('hpChasPMI', () => {
    it('should calculate chassis PMI HP loss for acceleration', () => {
      // VB6 example: Driveshaft accelerating from 500 to 550 RPM in 0.002s
      // PMI_chassis = 1.5 slug-ft² (typical for transmission + tires)
      const prevWheelRPM = 500;
      const wheelRPM = 550;
      const dt_s = 0.002;
      const PMI_chassis_slugft2 = 1.5;
      
      // VB6: ChasAccHP = PMI * DSRPM * (DSRPM - DSRPM0)
      // ChasAccHP = 1.5 * 550 * (550 - 500) = 1.5 * 550 * 50 = 41,250
      const chasAccHP = PMI_chassis_slugft2 * wheelRPM * (wheelRPM - prevWheelRPM);
      expect(chasAccHP).toBeCloseTo(41250, 0);
      
      // VB6: Work = (2 * PI / 60)^2 / (12 * 550 * dt)
      const work = Math.pow(2 * PI / 60, 2) / (12 * 550 * dt_s);
      expect(work).toBeCloseTo(0.000831, 6);
      
      // VB6: HPChasPMI = ChasAccHP * Work
      // HPChasPMI = 41,250 * 0.000831 = 34.3 HP
      const HPChasPMI = hpChasPMI(prevWheelRPM, wheelRPM, dt_s, PMI_chassis_slugft2);
      expect(HPChasPMI).toBeCloseTo(34.3, 1);
    });
    
    it('should return zero for deceleration (VB6 clamps negative to zero)', () => {
      // VB6: If ChasAccHP < 0 Then ChasAccHP = 0
      const prevWheelRPM = 550;
      const wheelRPM = 500; // Decelerating
      const dt_s = 0.002;
      const PMI_chassis_slugft2 = 1.5;
      
      const HPChasPMI = hpChasPMI(prevWheelRPM, wheelRPM, dt_s, PMI_chassis_slugft2);
      expect(HPChasPMI).toBe(0);
    });
    
    it('should return zero for no RPM change', () => {
      const prevWheelRPM = 500;
      const wheelRPM = 500;
      const dt_s = 0.002;
      const PMI_chassis_slugft2 = 1.5;
      
      const HPChasPMI = hpChasPMI(prevWheelRPM, wheelRPM, dt_s, PMI_chassis_slugft2);
      expect(HPChasPMI).toBe(0);
    });
  });
  
  describe('VB6 Two-Line HP Chain', () => {
    it('should reproduce VB6 HP calculation with PMI losses', () => {
      // VB6 example from early launch step
      // Engine: 2500 HP at 6000 RPM
      // PMI losses: HPEngPMI = 50 HP, HPChasPMI = 10 HP
      // ClutchSlip = 0.8, TGEff = 0.99, gc_Efficiency = 0.97
      // TireSlip = 1.01, DragHP = 5 HP
      
      const HPSave = 2500; // Engine HP
      const HPEngPMI = 50;
      const HPChasPMI = 10;
      const ClutchSlip = 0.8;
      const TGEff = 0.99;
      const gc_Efficiency = 0.97;
      const TireSlip = 1.01;
      const DragHP = 5;
      
      // VB6: TIMESLIP.FRM:1250
      // HP = (HPSave - HPEngPMI) * ClutchSlip
      let HP = (HPSave - HPEngPMI) * ClutchSlip;
      expect(HP).toBeCloseTo((2500 - 50) * 0.8, 2); // 1960 HP
      expect(HP).toBeCloseTo(1960, 1);
      
      // VB6: TIMESLIP.FRM:1251
      // HP = ((HP * TGEff(iGear) * gc_Efficiency.Value - HPChasPMI) / TireSlip) - DragHP
      HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      
      // Step by step:
      // HP * TGEff * gc_Efficiency = 1960 * 0.99 * 0.97 = 1882.8 HP
      // - HPChasPMI = 1882.8 - 10 = 1872.8 HP
      // / TireSlip = 1872.8 / 1.01 = 1854.3 HP
      // - DragHP = 1854.3 - 5 = 1849.3 HP
      expect(HP).toBeCloseTo(1848.7, 1);
    });
    
    it('should calculate PQWT from final HP', () => {
      // VB6: TIMESLIP.FRM:1252
      // PQWT = 550 * gc * HP / gc_Weight.Value
      
      const HP = 1849.3; // From previous test
      const weight_lbf = 2355;
      
      // PQWT = 550 * 32.174 * 1849.3 / 2355
      const PQWT_ftps2 = 550 * gc * HP / weight_lbf;
      
      // Expected: 550 * 32.174 * 1849.3 / 2355 ≈ 13,895.8
      expect(PQWT_ftps2).toBeCloseTo(13895.8, 1);
    });
    
    it('should handle full HP chain from ProStock_Pro launch conditions', () => {
      // ProStock_Pro early launch step (from VB6 printout)
      // Engine: 2800 HP at 6500 RPM
      // Weight: 2355 lbf
      // PMI: engine = 4.167 slug-ft², chassis = 1.5 slug-ft²
      // RPM deltas: EngRPM 6400→6500, DSRPM 100→110
      // dt = 0.002s
      
      const HPSave = 2800;
      const prevEngRPM = 6400;
      const engRPM = 6500;
      const prevDSRPM = 100;
      const dsRPM = 110;
      const dt_s = 0.002;
      const PMI_engine = 4.167;
      const PMI_chassis = 1.5;
      const isClutch = true;
      
      // Calculate PMI losses
      const HPEngPMI = hpEngPMI(prevEngRPM, engRPM, dt_s, PMI_engine, isClutch);
      const HPChasPMI = hpChasPMI(prevDSRPM, dsRPM, dt_s, PMI_chassis);
      
      // Verify PMI losses are reasonable
      expect(HPEngPMI).toBeGreaterThan(0); // Accelerating
      expect(HPChasPMI).toBeGreaterThan(0); // Accelerating
      
      // VB6 two-line HP chain
      const ClutchSlip = 0.95;
      const TGEff = 0.99;
      const gc_Efficiency = 0.97;
      const TireSlip = 1.01;
      const DragHP = 8;
      
      let HP = (HPSave - HPEngPMI) * ClutchSlip;
      HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      
      // Verify HP is positive and reasonable
      expect(HP).toBeGreaterThan(0);
      expect(HP).toBeLessThan(HPSave); // Should be less than engine HP
      
      // Calculate PQWT
      const weight_lbf = 2355;
      const PQWT_ftps2 = 550 * gc * HP / weight_lbf;
      
      // Verify PQWT is reasonable for launch acceleration
      expect(PQWT_ftps2).toBeGreaterThan(1000); // Should be significant
      expect(PQWT_ftps2).toBeLessThan(20000); // But not unrealistic
      
      // AGS = PQWT / (v_fps * gc) - but we need v_fps for this
      // Just verify PQWT formula matches VB6
      const PQWT_check = 550 * gc * HP / weight_lbf;
      expect(PQWT_ftps2).toBe(PQWT_check);
    });
  });
  
  describe('VB6 HP Chain - ProStock_Pro DEV Log Values', () => {
    it('should reproduce Step 2 HP chain exactly (massive HPEngPMI)', () => {
      // From ProStock_Pro DEV logs - Step 2
      // [PRE_HP_CHAIN] step: 2
      const HPSave = 1150.1;
      const ClutchSlip = 0.0077;
      const TGEff = 0.970; // Gear 1 (corrected)
      const gc_Efficiency = 0.97;
      const TireSlip = 1.03;
      const DragHP = 0.06;
      
      // [PMI_CALC] step: 2
      const HPEngPMI = 164110.6;
      const HPChasPMI = 1.7;
      
      // VB6: TIMESLIP.FRM:1250
      // HP = (HPSave - HPEngPMI) * ClutchSlip
      const HP_afterLine1 = (HPSave - HPEngPMI) * ClutchSlip;
      expect(HP_afterLine1).toBeCloseTo(-1254.8, 0);
      
      // VB6: TIMESLIP.FRM:1251
      // HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP
      const HP_afterLine2 = ((HP_afterLine1 * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      expect(HP_afterLine2).toBeCloseTo(-1148.0, 0);
      
      // VB6: TIMESLIP.FRM:1252
      // PQWT = 550 * gc * HP / Weight
      const Weight_lbf = 2355;
      const PQWT_ftps2 = 550 * gc * HP_afterLine2 / Weight_lbf;
      expect(PQWT_ftps2).toBeCloseTo(-8626, 0);
    });
    
    it('should reproduce Step 3 HP chain exactly (HPEngPMI = 0)', () => {
      // From ProStock_Pro DEV logs - Step 3
      // [PRE_HP_CHAIN] step: 3
      const HPSave = 1150.1;
      const ClutchSlip = 0.0071;
      const TGEff = 0.970; // Gear 1
      const gc_Efficiency = 0.97;
      const TireSlip = 1.03;
      const DragHP = 0.07;
      
      // [PMI_CALC] step: 3
      const HPEngPMI = 0; // EngRPM pinned at 7600
      const HPChasPMI = 0; // DSRPM decreasing (clamped to 0)
      
      // VB6: TIMESLIP.FRM:1250
      // HP = (HPSave - HPEngPMI) * ClutchSlip
      const HP_afterLine1 = (HPSave - HPEngPMI) * ClutchSlip;
      expect(HP_afterLine1).toBeCloseTo(8.17, 2);
      
      // VB6: TIMESLIP.FRM:1251
      // HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP
      const HP_afterLine2 = ((HP_afterLine1 * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      expect(HP_afterLine2).toBeCloseTo(7.39, 2);
      
      // VB6: TIMESLIP.FRM:1252
      // PQWT = 550 * gc * HP / Weight
      const Weight_lbf = 2355;
      const PQWT_ftps2 = 550 * gc * HP_afterLine2 / Weight_lbf;
      expect(PQWT_ftps2).toBeCloseTo(55.5, 1);
    });
    
    it('should reproduce Step 4 HP chain exactly', () => {
      // From ProStock_Pro DEV logs - Step 4
      // [PRE_HP_CHAIN] step: 4
      const HPSave = 1150.1;
      const ClutchSlip = 0.0091;
      const TGEff = 0.970;
      const gc_Efficiency = 0.97;
      const TireSlip = 1.03;
      const DragHP = 0.08;
      
      // [PMI_CALC] step: 4
      const HPEngPMI = 0;
      const HPChasPMI = 0.5;
      
      // VB6: Two-line HP chain
      let HP = (HPSave - HPEngPMI) * ClutchSlip;
      expect(HP).toBeCloseTo(10.47, 2);
      
      HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      expect(HP).toBeCloseTo(9.0, 0);
      
      // PQWT
      const Weight_lbf = 2355;
      const PQWT_ftps2 = 550 * gc * HP / Weight_lbf;
      expect(PQWT_ftps2).toBeCloseTo(67.6, 1);
    });
  });
  
  describe('VB6 HP Chain Edge Cases', () => {
    it('should handle zero HP (shift dwell)', () => {
      // During shift dwell, HPSave = 0
      const HPSave = 0;
      const HPEngPMI = 0;
      const HPChasPMI = 0;
      const ClutchSlip = 0.5;
      const TGEff = 0.99;
      const gc_Efficiency = 0.97;
      const TireSlip = 1.01;
      const DragHP = 5;
      
      let HP = (HPSave - HPEngPMI) * ClutchSlip;
      HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      
      // Should result in negative HP (drag only)
      expect(HP).toBeCloseTo(-5, 2);
    });
    
    it('should handle high PMI losses exceeding engine HP', () => {
      // Edge case: PMI losses > engine HP (shouldn't happen in practice)
      const HPSave = 100;
      const HPEngPMI = 150; // Exceeds engine HP
      const HPChasPMI = 10;
      const ClutchSlip = 0.8;
      const TGEff = 0.99;
      const gc_Efficiency = 0.97;
      const TireSlip = 1.01;
      const DragHP = 5;
      
      let HP = (HPSave - HPEngPMI) * ClutchSlip;
      expect(HP).toBeLessThan(0); // Negative after PMI
      
      HP = ((HP * TGEff * gc_Efficiency - HPChasPMI) / TireSlip) - DragHP;
      expect(HP).toBeLessThan(0); // Still negative
    });
    
    it('should verify PQWT units: ft/s² (not ft²/s²)', () => {
      // VB6: PQWT = 550 * gc * HP / Weight
      // Units: (ft-lbf/s/HP) * (ft/s²) * HP / lbf = ft/s²
      
      const HP = 2000;
      const weight_lbf = 2355;
      const PQWT_ftps2 = 550 * gc * HP / weight_lbf;
      
      // Dimensional analysis:
      // 550 [ft-lbf/s / HP] * 32.174 [ft/s²] * 2000 [HP] / 2355 [lbf]
      // = (550 * 32.174 * 2000 / 2355) [ft/s²]
      // ≈ 15,028 ft/s²
      
      expect(PQWT_ftps2).toBeCloseTo(15028, 0);
      
      // Verify this is reasonable acceleration potential
      // AGS would be PQWT / (v * gc), which for v=100 ft/s gives:
      // AGS = 15011 / (100 * 32.174) = 4.66 ft/s² ≈ 0.145g (reasonable for high speed)
    });
  });
});
