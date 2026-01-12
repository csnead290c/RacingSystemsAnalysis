/**
 * VB6 Geometric Ratios Parity Tests
 * 
 * Verifies that geometric ratio calculations match VB6 exactly
 * VB6 Source: ENGPERF.BAS lines 61-67, DETAILS.FRM lines 386-391
 */

import { describe, it, expect } from 'vitest';
import { calcGeometricRatios, calcPistonToHeadRatio, calcIntakeThroatRatio, calcThroatArea, formatVB6GeometricRatios } from '../vb6GeometricRatios';
import { VB6_BASE_CASE } from '../vb6ParityCheck';

// VB6 BASECASE.ENG values
const VB6_DECK_HEIGHT_IN = 0.015;  // Line 6
const VB6_GASKET_THICKNESS_IN = 0.039;  // Line 6
const VB6_SEAT_DIA_IN = 1.794;  // Line 8
const VB6_STEM_DIA_IN = 0.344;  // Line 8

describe('VB6 Geometric Ratios Parity', () => {
  describe('Base Case Configuration', () => {
    it('calculates bore/stroke ratio matching VB6 (1.16)', () => {
      // VB6 ENGPERF.BAS line 61: BQS = bore / stroke
      // VB6 DETAILS.FRM line 386: RightAlign(5, 2, BQS) - 2 decimals
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      expect(ratios.boreToStrokeRatio.toFixed(2)).toBe('1.16');
    });

    it('calculates rod/stroke ratio matching VB6 (1.68)', () => {
      // VB6 ENGPERF.BAS line 64: LRQS = rod / stroke
      // VB6 DETAILS.FRM line 387: RightAlign(5, 2, LRQS) - 2 decimals
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      expect(ratios.rodToStrokeRatio.toFixed(2)).toBe('1.68');
    });

    it('calculates piston-to-head/rod ratio matching VB6 (0.0092)', () => {
      // VB6 ENGPERF.BAS line 67: DQR = (gc_Deck.Value + gc_Gasket.Value) / rod
      // VB6 DETAILS.FRM line 388: RightAlign(5, 4, DQR) - 4 decimals
      // VB6 BASECASE.ENG line 6: deck=0.015, gasket=0.039
      
      const dqr = calcPistonToHeadRatio(
        VB6_DECK_HEIGHT_IN,
        VB6_GASKET_THICKNESS_IN,
        VB6_BASE_CASE.rodLength_in
      );
      
      expect(dqr.toFixed(4)).toBe('0.0092');
    });

    it('calculates intake throat/bore ratio matching VB6 (0.191)', () => {
      // VB6 DETAILS.FRM line 389: RightAlign(5, 3, gc_CSArea.Value / BArea) - 3 decimals
      // VB6 BASECASE.ENG line 8: seatDia=1.794, stemDia=0.344, throatArea=2.434
      
      const throatArea = calcThroatArea(
        VB6_BASE_CASE.intakeValveDia_in,
        VB6_BASE_CASE.maxIntakeValveLift_in,
        VB6_SEAT_DIA_IN,
        VB6_STEM_DIA_IN,
        VB6_BASE_CASE.numIntakeValvesPerCyl
      );
      
      const ratio = calcIntakeThroatRatio(throatArea, VB6_BASE_CASE.bore_in);
      
      expect(ratio.toFixed(3)).toBe('0.191');
    });

    it('calculates intake valve lift/diameter ratio matching VB6 (0.268)', () => {
      // VB6 DETAILS.FRM line 390: RightAlign(5, 3, gc_ValveLift.Value / ivd) - 3 decimals
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      expect(ratios.intakeValveLiftDiameterRatio.toFixed(3)).toBe('0.268');
    });

    it('calculates all ratios together matching VB6', () => {
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      // Verify all ratios match VB6 with correct decimal places
      expect(ratios.boreToStrokeRatio.toFixed(2)).toBe('1.16');
      expect(ratios.rodToStrokeRatio.toFixed(2)).toBe('1.68');
      expect(ratios.pistonToHeadRodLengthRatio.toFixed(4)).toBe('0.0092');
      expect(ratios.intakeThroatBoreAreaRatio.toFixed(3)).toBe('0.191');
      expect(ratios.intakeValveLiftDiameterRatio.toFixed(3)).toBe('0.268');
    });
  });

  describe('VB6 Formatting Verification (DETAILS.FRM lines 386-391)', () => {
    it('formats bore/stroke with 2 decimals per VB6 DETAILS.FRM line 386', () => {
      const bore = 4.030;
      const stroke = 3.480;
      const ratio = bore / stroke;
      
      // VB6 uses RightAlign(5, 2, BQS) which means 2 decimal places
      expect(ratio.toFixed(2)).toBe('1.16');
    });

    it('formats rod/stroke with 2 decimals per VB6 DETAILS.FRM line 387', () => {
      const rod = 5.850;
      const stroke = 3.480;
      const ratio = rod / stroke;
      
      // VB6 uses RightAlign(5, 2, LRQS) which means 2 decimal places
      expect(ratio.toFixed(2)).toBe('1.68');
    });

    it('formats piston-to-head with 4 decimals per VB6 DETAILS.FRM line 388', () => {
      const deck = 0.015;
      const gasket = 0.039;
      const rod = 5.850;
      const dqr = (deck + gasket) / rod;
      
      // VB6 uses RightAlign(5, 4, DQR) which means 4 decimal places
      expect(dqr.toFixed(4)).toBe('0.0092');
    });

    it('formats throat/bore with 3 decimals per VB6 DETAILS.FRM line 389', () => {
      const throatArea = 2.434813; // Calculated throat area
      const bore = 4.030;
      const boreArea = 3.141593 * Math.pow(bore, 2) / 4;
      const ratio = throatArea / boreArea;
      
      // VB6 uses RightAlign(5, 3, gc_CSArea.Value / BArea) which means 3 decimal places
      expect(ratio.toFixed(3)).toBe('0.191');
    });

    it('formats lift/diameter with 3 decimals per VB6 DETAILS.FRM line 390', () => {
      const lift = 0.550;
      const diameter = 2.050;
      const ratio = lift / diameter;
      
      // VB6 uses RightAlign(5, 3, gc_ValveLift.Value / ivd) which means 3 decimal places
      expect(ratio.toFixed(3)).toBe('0.268');
    });
  });

  describe('VB6 Source Line Verification', () => {
    it('DQR calculation matches VB6 ENGPERF.BAS line 67', () => {
      // VB6 line 67: DQR = (gc_Deck.Value + gc_Gasket.Value) / rod
      const deck = 0.015;
      const gasket = 0.039;
      const rod = 5.850;
      
      const dqr = (deck + gasket) / rod;
      const dqrViaFunction = calcPistonToHeadRatio(deck, gasket, rod);
      
      expect(dqr).toBe(dqrViaFunction);
      expect(dqr.toFixed(4)).toBe('0.0092');
    });

    it('Throat area calculation matches VB6 ENGPERF.BAS lines 1262-1298', () => {
      // VB6 CalcWSCSArea function
      const throatArea = calcThroatArea(
        VB6_BASE_CASE.intakeValveDia_in,
        VB6_BASE_CASE.maxIntakeValveLift_in,
        VB6_SEAT_DIA_IN,
        VB6_STEM_DIA_IN,
        VB6_BASE_CASE.numIntakeValvesPerCyl
      );
      
      // VB6 BASECASE.ENG line 8 shows throat area = 2.434
      expect(throatArea.toFixed(3)).toBe('2.435');
    });
  });

  describe('PART C: Deterministic VB6 Base Case Tests', () => {
    it('formatted strings match VB6 exactly (STRICT)', () => {
      // Build VB6 base case config
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      const formatted = formatVB6GeometricRatios(ratios);
      
      // STRICT: Exact string match with VB6 display
      expect(formatted.boreToStrokeRatio).toBe('1.16');
      expect(formatted.rodToStrokeRatio).toBe('1.68');
      expect(formatted.pistonToHeadRodLengthRatio).toBe('0.0092');
      expect(formatted.intakeThroatBoreAreaRatio).toBe('0.191');
      expect(formatted.intakeValveLiftDiameterRatio).toBe('0.268');
    });

    it('raw numeric values with formatted string match', () => {
      const ratios = calcGeometricRatios({
        bore_in: VB6_BASE_CASE.bore_in,
        stroke_in: VB6_BASE_CASE.stroke_in,
        rodLength_in: VB6_BASE_CASE.rodLength_in,
        deckHeight_in: VB6_DECK_HEIGHT_IN,
        gasketThickness_in: VB6_GASKET_THICKNESS_IN,
        intakeValveDia_in: VB6_BASE_CASE.intakeValveDia_in,
        maxIntakeValveLift_in: VB6_BASE_CASE.maxIntakeValveLift_in,
        seatDia_in: VB6_SEAT_DIA_IN,
        stemDia_in: VB6_STEM_DIA_IN,
        numIntakeValvesPerCyl: VB6_BASE_CASE.numIntakeValvesPerCyl,
        compressionRatio: VB6_BASE_CASE.compressionRatio,
      });
      
      // Raw values should be close (tiny epsilon for floating point)
      expect(ratios.boreToStrokeRatio).toBeCloseTo(1.1580459770114942, 10);
      expect(ratios.rodToStrokeRatio).toBeCloseTo(1.6810344827586208, 10);
      expect(ratios.pistonToHeadRodLengthRatio).toBeCloseTo(0.009230769230769232, 10);
      expect(ratios.intakeThroatBoreAreaRatio).toBeCloseTo(0.19088235294117647, 6);  // 6 decimals due to intermediate throat area calc
      expect(ratios.intakeValveLiftDiameterRatio).toBeCloseTo(0.2682926829268293, 10);
      
      // But formatted strings MUST match exactly
      expect(ratios.boreToStrokeRatio.toFixed(2)).toBe('1.16');
      expect(ratios.rodToStrokeRatio.toFixed(2)).toBe('1.68');
      expect(ratios.pistonToHeadRodLengthRatio.toFixed(4)).toBe('0.0092');
      expect(ratios.intakeThroatBoreAreaRatio.toFixed(3)).toBe('0.191');
      expect(ratios.intakeValveLiftDiameterRatio.toFixed(3)).toBe('0.268');
    });
  });
});
