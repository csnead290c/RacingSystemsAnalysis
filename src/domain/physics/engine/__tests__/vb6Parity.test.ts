/**
 * VB6 Parity Golden Master Tests
 * These tests ensure RSA matches VB6 Engine Pro exactly
 */

import { describe, test, expect } from 'vitest';
import { 
  VB6_BASE_CASE,
  VB6_EXPECTED_PISTON_SPEED_SUMMARY,
  VB6_EXPECTED_MECH_DETAILS_6650,
  VB6_EXPECTED_FLOW_DETAILS_6650,
  VB6_EXPECTED_FLOWBENCH_TABLE,
  VB6_EXPECTED_FLOWBENCH_MAX_LIFT,
  verifyPistonSpeedSummary,
  verifyMechDetails6650,
  verifyFlowDetails6650,
} from '../vb6ParityCheck';
import { calcPistonSpeedSummary, calcMechDetailsForRPM, calcCrankingCompression } from '../vb6Kinematics';
import { calcFlowDetailsForRPM } from '../vb6FlowDetails';
import { calcDefaultValveSeatData, calcEffectiveFlowArea, calcFlowbenchDataPoint } from '../vb6Flowbench';

describe('VB6 Engine Pro Parity - Base Case', () => {
  describe('Piston Speed Summary', () => {
    test('All 4 rating points match VB6 exactly', () => {
      const result = verifyPistonSpeedSummary();
      expect(result.pass).toBe(true);
      if (!result.pass) {
        console.error('Piston Speed Summary Errors:', result.errors);
      }
    });

    test('Peak HP @ 6650 RPM - Avg and Max speeds', () => {
      const result = calcPistonSpeedSummary(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      expect(result.avgSpeed_fpm).toBe(3857);
      expect(result.maxSpeed_fpm).toBe(6322);
    });

    test('Max speed angle is 74.6 degrees', () => {
      const result = calcPistonSpeedSummary(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      expect(result.maxSpeedAngle_deg).toBeCloseTo(74.6, 1);
    });

    test('Cranking compression is 230 psig', () => {
      const result = calcCrankingCompression(VB6_BASE_CASE.compressionRatio);
      expect(result).toBe(230);
    });
  });

  describe('Mechanical Details @ 6650 RPM', () => {
    test('All 15 rows match VB6 exactly', () => {
      const result = verifyMechDetails6650();
      if (!result.pass) {
        console.error('Mech Details Errors:');
        result.errors.forEach(err => console.error('  -', err));
      }
      expect(result.pass).toBe(true);
    });

    test('Row count is 15', () => {
      const result = calcMechDetailsForRPM(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      expect(result.length).toBe(15);
    });

    test('Includes 74.6 degree max speed point', () => {
      const result = calcMechDetailsForRPM(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      const maxSpeedRow = result.find(r => Math.abs(r.angle_deg - 74.6) < 0.1);
      expect(maxSpeedRow).toBeDefined();
      expect(Math.round(maxSpeedRow!.pistonSpeed_fpm)).toBe(6323);
    });

    test('First row (5 deg) matches VB6', () => {
      const result = calcMechDetailsForRPM(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      const row = result[0];
      expect(row.angle_deg).toBe(5);
      expect(row.pistonDepth_in).toBeCloseTo(0.009, 3);
      expect(Math.round(row.pistonSpeed_fpm)).toBe(685);
      expect(Math.round(row.pistonSpeed_fps)).toBe(11);
    });

    test('Last row (180 deg) matches VB6', () => {
      const result = calcMechDetailsForRPM(6650, VB6_BASE_CASE.stroke_in, VB6_BASE_CASE.rodLength_in);
      const row = result[14];
      expect(row.angle_deg).toBe(180);
      expect(row.pistonDepth_in).toBeCloseTo(3.480, 3);
      expect(Math.round(row.pistonSpeed_fpm)).toBe(0);
    });
  });

  describe('Flow Details @ 6650 RPM', () => {
    test('All 12 rows match VB6 within tolerance', () => {
      const result = verifyFlowDetails6650();
      if (!result.pass) {
        console.error('Flow Details Errors:');
        result.errors.forEach(err => console.error('  -', err));
      }
      expect(result.pass).toBe(true);
    });

    test('Row count is 12', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const result = calcFlowDetailsForRPM(
        6650,
        VB6_BASE_CASE.stroke_in,
        VB6_BASE_CASE.rodLength_in,
        VB6_BASE_CASE.bore_in,
        VB6_BASE_CASE.numIntakeValvesPerCyl,
        VB6_BASE_CASE.intakeDuration050_deg,
        VB6_BASE_CASE.intakeLobeCenterline_deg,
        VB6_BASE_CASE.maxIntakeValveLift_in,
        valveSeatData
      );
      expect(result.length).toBe(12);
    });

    test('Max lift row (105 deg) matches VB6', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const result = calcFlowDetailsForRPM(
        6650,
        VB6_BASE_CASE.stroke_in,
        VB6_BASE_CASE.rodLength_in,
        VB6_BASE_CASE.bore_in,
        VB6_BASE_CASE.numIntakeValvesPerCyl,
        VB6_BASE_CASE.intakeDuration050_deg,
        VB6_BASE_CASE.intakeLobeCenterline_deg,
        VB6_BASE_CASE.maxIntakeValveLift_in,
        valveSeatData
      );
      const row = result.find(r => Math.abs(r.angle_deg - 105) < 1);
      expect(row).toBeDefined();
      // Now using exact VB6 cam profile interpolation - must match exactly
      expect(row!.valveLift_in).toBeCloseTo(0.550, 3);
      expect(row!.flowArea_sqin).toBeCloseTo(2.735, 3);
    });
  });

  describe('Flowbench Effective Area Calculation', () => {
    test('Net throat area is 2.735 sq in', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const area = calcEffectiveFlowArea(0.550, valveSeatData, 1);
      expect(area).toBeCloseTo(2.735, 3);
    });

    test('Low lift (0.100) area matches VB6', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const area = calcEffectiveFlowArea(0.100, valveSeatData, 1);
      expect(area).toBeCloseTo(0.361, 3);
    });

    test('Medium lift (0.300) area matches VB6', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const area = calcEffectiveFlowArea(0.300, valveSeatData, 1);
      expect(area).toBeCloseTo(1.504, 3);
    });

    test('High lift saturates at throat area', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const area500 = calcEffectiveFlowArea(0.500, valveSeatData, 1);
      const area600 = calcEffectiveFlowArea(0.600, valveSeatData, 1);
      const area700 = calcEffectiveFlowArea(0.700, valveSeatData, 1);
      
      expect(area500).toBeCloseTo(2.735, 3);
      expect(area600).toBeCloseTo(2.735, 3);
      expect(area700).toBeCloseTo(2.735, 3);
    });
  });

  describe('Flowbench Derived Values', () => {
    test('Velocity calculation matches VB6', () => {
      const dataPoint = calcFlowbenchDataPoint(56.6, 0.361);
      expect(dataPoint.velocity_fps).toBeCloseTo(376.3, 1);
    });

    test('Flow Flux calculation matches VB6', () => {
      const dataPoint = calcFlowbenchDataPoint(56.6, 0.361);
      expect(dataPoint.flowFlux_cfmPerSqin).toBeCloseTo(156.8, 1);
    });

    test('Flow Vel Index calculation matches VB6', () => {
      const dataPoint = calcFlowbenchDataPoint(56.6, 0.361);
      expect(dataPoint.flowVelIndex_pct).toBeCloseTo(117.9, 0);
    });

    test('All flowbench table rows match VB6', () => {
      VB6_EXPECTED_FLOWBENCH_TABLE.forEach(expected => {
        const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
        const area = calcEffectiveFlowArea(expected.lift, valveSeatData, 1);
        const dataPoint = calcFlowbenchDataPoint(expected.flow, area);
        
        expect(area).toBeCloseTo(expected.area, 2);
        expect(dataPoint.velocity_fps).toBeCloseTo(expected.velocity, 0);
        expect(dataPoint.flowFlux_cfmPerSqin).toBeCloseTo(expected.flowFlux, 0);
        expect(dataPoint.flowVelIndex_pct).toBeCloseTo(expected.flowVelIndex, 0);
      });
    });

    test('Max lift calculated values match VB6', () => {
      const valveSeatData = calcDefaultValveSeatData(VB6_BASE_CASE.intakeValveDia_in);
      const area = calcEffectiveFlowArea(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.lift, valveSeatData, 1);
      const dataPoint = calcFlowbenchDataPoint(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.flow, area);
      
      expect(area).toBeCloseTo(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.area, 2);
      expect(dataPoint.velocity_fps).toBeCloseTo(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.velocity, 0);
      expect(dataPoint.flowFlux_cfmPerSqin).toBeCloseTo(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.flowFlux, 0);
      expect(dataPoint.flowVelIndex_pct).toBeCloseTo(VB6_EXPECTED_FLOWBENCH_MAX_LIFT.flowVelIndex, 0);
    });
  });
});

describe('VB6 Engine Jr Parity - Base Case', () => {
  // TODO: Add Engine Jr base case tests
  test.todo('Engine Jr base case outputs match VB6');
  test.todo('Engine Jr dyno curve matches VB6');
  test.todo('Engine Jr recommendations match VB6');
});
