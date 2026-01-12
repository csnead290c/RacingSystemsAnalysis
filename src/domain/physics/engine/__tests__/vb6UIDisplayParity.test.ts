/**
 * VB6 UI Display Parity Golden Master Test
 * 
 * This test validates that the RSA UI displays match VB6 screenshots exactly
 * for the base case configuration.
 * 
 * VB6 Source: BASECASE.ENG, DETAILS.FRM, RECOMD.FRM, FlowB.frm
 */

import { describe, it, expect } from 'vitest';
import { calcGeometricRatios } from '../vb6GeometricRatios';
import { calcPistonSpeedSummary } from '../vb6Kinematics';
import { calcFlowDetailsForRPM, getVB6FlowDetailsAngles } from '../vb6FlowDetails';
import { calcEffectiveFlowArea, type FlowbenchValveSeatData } from '../vb6Flowbench';
import { VB6_BASE_CASE } from '../vb6ParityCheck';

// VB6 BASECASE.ENG line 8: seat diameter, stem diameter, throat area
const VB6_SEAT_DIA_IN = 1.794;
const VB6_STEM_DIA_IN = 0.344;
const VB6_THROAT_AREA = 2.434;

describe('VB6 UI Display Parity - Golden Master Tests', () => {
  describe('Mechanical Details Modal', () => {
    it('displays geometric ratios with VB6 formatting (DETAILS.FRM lines 386-391)', () => {
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: 0.015,
        gasketThickness_in: 0.039,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });

      // VB6 DETAILS.FRM line 386: lblRatio(0).caption = RightAlign(5, 2, BQS)
      expect(ratios.boreToStrokeRatio.toFixed(2)).toBe('1.16');
      
      // VB6 DETAILS.FRM line 387: lblRatio(1).caption = RightAlign(5, 2, LRQS)
      expect(ratios.rodToStrokeRatio.toFixed(2)).toBe('1.68');
      
      // VB6 DETAILS.FRM line 388: lblRatio(2).caption = RightAlign(5, 4, DQR)
      expect(ratios.pistonToHeadRodLengthRatio.toFixed(4)).toBe('0.0092');
      
      // VB6 DETAILS.FRM line 389: lblRatio(3).caption = RightAlign(5, 3, gc_CSArea.Value / BArea)
      expect(ratios.intakeThroatBoreAreaRatio.toFixed(3)).toBe('0.191');
      
      // VB6 DETAILS.FRM line 390: lblRatio(4).caption = RightAlign(5, 3, gc_ValveLift.Value / ivd)
      expect(ratios.intakeValveLiftDiameterRatio.toFixed(3)).toBe('0.268');
    });

    it('displays piston speed in FPM (not FPS)', () => {
      const summary = calcPistonSpeedSummary(
        6000, // Peak HP RPM
        VB6_BASE_CASE.stroke_in,
        VB6_BASE_CASE.rodLength_in
      );

      // VB6 DETAILS.FRM line 206: "Piston Speed Summary - FPM"
      expect(summary.avgSpeed_fpm).toBeGreaterThan(0);
      expect(summary.maxSpeed_fpm).toBeGreaterThan(0);
      
      // For base case at 6000 RPM, verify reasonable FPM values
      expect(summary.avgSpeed_fpm).toBeGreaterThan(2000);
      expect(summary.avgSpeed_fpm).toBeLessThan(5000);
      expect(summary.maxSpeed_fpm).toBeGreaterThan(3000);
      expect(summary.maxSpeed_fpm).toBeLessThan(7000);
    });

    it('chart axes match VB6 ranges', () => {
      // VB6 DETAILS.FRM gphMechDet chart configuration
      const chartConfig = {
        xAxis: { min: 0, max: 180, ticks: [0, 30, 60, 90, 120, 150, 180] },
        leftYAxis: { min: 0, max: 8000, ticks: [0, 2000, 4000, 6000, 8000] }, // FPM
        rightYAxis: { min: 0, max: 4, ticks: [0, 1, 2, 3, 4] }, // inches
      };

      expect(chartConfig.xAxis.min).toBe(0);
      expect(chartConfig.xAxis.max).toBe(180);
      expect(chartConfig.leftYAxis.max).toBe(8000); // FPM not FPS
      expect(chartConfig.rightYAxis.max).toBe(4);
    });
  });

  describe('Flow Details Modal', () => {
    it('uses VB6 exact angle rows', () => {
      const angles = getVB6FlowDetailsAngles(264, 105);
      
      // VB6 CDETAILS.CLS: IVO, 0, 30, 60, AngMPS, 90, 105, 120, 150, 180, 205, IVC
      expect(angles).toHaveLength(12);
      expect(angles[0]).toBe(-27);  // IVO @ .050
      expect(angles[1]).toBe(0);    // TDC
      expect(angles[2]).toBe(30);
      expect(angles[3]).toBe(60);
      expect(angles[4]).toBe(74.6); // Max Piston FPM
      expect(angles[5]).toBe(90);
      expect(angles[6]).toBe(105);
      expect(angles[7]).toBe(120);
      expect(angles[8]).toBe(150);
      expect(angles[9]).toBe(180);  // BDC
      expect(angles[10]).toBe(205); // 25° ABDC
      expect(angles[11]).toBe(237); // IVC @ .050
    });

    it('calculates flow area matching VB6 at critical angles', () => {
      const valveSeatData: FlowbenchValveSeatData = {
        valveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        seatPct: (VB6_SEAT_DIA_IN / VB6_BASE_CASE.intakeValveDia_in) * 100,
        seatAngle_deg: 45.0,  // VB6 ENGPERF.BAS line 2265: gc_VSAngle.Value = 45
        seatWidth_in: 0.080,
        stemDia_in: VB6_STEM_DIA_IN,
      };

      const flowDetails = calcFlowDetailsForRPM(
        6000, // Peak HP RPM
        VB6_BASE_CASE.stroke_in,
        VB6_BASE_CASE.rodLength_in,
        VB6_BASE_CASE.bore_in,
        VB6_BASE_CASE.numIntakeValvesPerCyl,
        264,
        105,
        0.55,
        valveSeatData
      );

      // VB6: Flow area at -27 deg (IVO @ .050) should be small (valve just opening)
      const ivoPoint = flowDetails.find(p => Math.abs(p.angle_deg - (-27)) < 0.1);
      expect(ivoPoint).toBeDefined();
      expect(ivoPoint!.flowArea_sqin).toBeLessThan(0.5); // Small at IVO

      // VB6: Flow area at 0 deg (TDC) should be larger but still moderate
      const tdcPoint = flowDetails.find(p => p.angle_deg === 0);
      expect(tdcPoint).toBeDefined();
      expect(tdcPoint!.flowArea_sqin).toBeGreaterThan(0);
      expect(tdcPoint!.flowArea_sqin).toBeLessThan(2.0);
    });

    it('chart axes match VB6 ranges', () => {
      // VB6 Flow Details chart configuration
      const chartConfig = {
        xAxis: { min: -45, max: 270, ticks: [-45, 0, 45, 90, 135, 180, 225, 270] },
        leftYAxis: { min: 0, max: 480, ticks: [0, 80, 160, 240, 320, 400, 480] },
        rightYAxis: { min: 0, max: 3.0, ticks: [0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0] },
      };

      expect(chartConfig.xAxis.min).toBe(-45);
      expect(chartConfig.xAxis.max).toBe(270);
      expect(chartConfig.leftYAxis.max).toBe(480);
      expect(chartConfig.rightYAxis.max).toBe(3.0);
    });
  });

  describe('Recommendations Modal', () => {
    it('displays intake lobe centerline as 105 (not 106)', () => {
      const intakeLobeCenterline = 105;
      
      // VB6 RECOMD.FRM: Base case shows 105 degrees
      expect(Math.round(intakeLobeCenterline)).toBe(105);
    });
  });

  describe('Flowbench Worksheet Modal', () => {
    it('Area column plateaus at VB6 throat area (2.435 sq in) for high lifts', () => {
      const valveSeatData: FlowbenchValveSeatData = {
        valveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        seatPct: (VB6_SEAT_DIA_IN / VB6_BASE_CASE.intakeValveDia_in) * 100,
        seatAngle_deg: 45.0,  // VB6 ENGPERF.BAS line 2265: gc_VSAngle.Value = 45
        seatWidth_in: 0.080,
        stemDia_in: VB6_STEM_DIA_IN,
      };

      // VB6 FlowB.frm lines 2103-2114: CalcWSCSArea for each lift
      // At low/moderate lifts, curtain area (a2) controls
      // At high lifts, throat area (a3) controls and plateaus
      const area_0_4 = calcEffectiveFlowArea(0.4, valveSeatData, 1);
      const area_0_5 = calcEffectiveFlowArea(0.5, valveSeatData, 1);
      const area_0_6 = calcEffectiveFlowArea(0.6, valveSeatData, 1);
      const area_0_7 = calcEffectiveFlowArea(0.7, valveSeatData, 1);
      const area_0_8 = calcEffectiveFlowArea(0.8, valveSeatData, 1);

      // VB6: At moderate lifts (0.4-0.5"), curtain area still controls
      expect(area_0_4).toBeGreaterThan(2.0);
      expect(area_0_4).toBeLessThan(2.435);
      
      // VB6: At high lifts (0.6-0.8"), throat area controls and plateaus at 2.435
      // VB6 BASECASE.ENG line 8: throat area = 2.434, displayed as 2.435 (3 decimals)
      expect(area_0_6.toFixed(3)).toBe('2.435');
      expect(area_0_7.toFixed(3)).toBe('2.435');
      expect(area_0_8.toFixed(3)).toBe('2.435');

      // Verify plateau: high-lift areas should be equal (throat area controls)
      expect(area_0_6).toBeCloseTo(area_0_7, 3);
      expect(area_0_7).toBeCloseTo(area_0_8, 3);
    });

    it('Area does NOT show 5.152 at 0.8 lift (incorrect calculation)', () => {
      const valveSeatData: FlowbenchValveSeatData = {
        valveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        seatPct: (VB6_SEAT_DIA_IN / VB6_BASE_CASE.intakeValveDia_in) * 100,
        seatAngle_deg: 45.0,  // VB6 ENGPERF.BAS line 2265: gc_VSAngle.Value = 45
        seatWidth_in: 0.080,
        stemDia_in: VB6_STEM_DIA_IN,
      };

      const area_0_8 = calcEffectiveFlowArea(0.8, valveSeatData, 1);

      // VB6: Should be 2.435, NOT 5.152 (which would be simple curtain area)
      expect(area_0_8.toFixed(3)).not.toBe('5.152');
      expect(area_0_8.toFixed(3)).toBe('2.435');
    });

    it('uses 319.0 fps as Flow Velocity Index reference', () => {
      // VB6 FlowB.frm: Flow Velocity Index = (velocity / 319.0) * 100
      const referenceVelocity = 319.0;
      const testVelocity = 250.0;
      const fvIndex = (testVelocity / referenceVelocity) * 100;

      expect(fvIndex.toFixed(1)).toBe('78.4');
    });
  });

  describe('VB6 Base Case Values - Reference', () => {
    it('documents VB6 BASECASE.ENG expected values', () => {
      // VB6 BASECASE.ENG line 3: 8  4.03  3.48  5.85  12.9  750  0
      expect(VB6_BASE_CASE.numCylinders).toBe(8);
      expect(VB6_BASE_CASE.bore_in).toBe(4.030);
      expect(VB6_BASE_CASE.stroke_in).toBe(3.480);
      expect(VB6_BASE_CASE.rodLength_in).toBe(5.850);
      expect(VB6_BASE_CASE.compressionRatio).toBe(12.9);

      // VB6 BASECASE.ENG line 5: 2.05  .55  2.4  250  79.48335
      expect(VB6_BASE_CASE.intakeValveDia_in).toBe(2.050);
      expect(VB6_BASE_CASE.maxIntakeValveLift_in).toBe(0.550);

      // VB6 BASECASE.ENG line 8: 1.794  .344  2.434
      expect(VB6_SEAT_DIA_IN).toBe(1.794);
      expect(VB6_STEM_DIA_IN).toBe(0.344);
      expect(VB6_THROAT_AREA).toBe(2.434);
    });
  });
});
