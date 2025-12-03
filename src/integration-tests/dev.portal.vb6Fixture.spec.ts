/**
 * Dev Portal VB6 Fixture Integration Tests
 * 
 * Tests the complete workflow of loading and using VB6 fixtures in the dev portal.
 * Validates that fixtures loaded via QuickPaste are correctly validated and used in simulations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateVB6Fixture } from '../dev/validation/vb6Fixture';

// Import the ProStock_Pro fixture JSON
import ProStockProFixture from '../dev/fixtures/ProStock_Pro.vb6.json';

describe('Dev Portal - VB6 Fixture Workflow', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    vi.clearAllMocks();
  });

  it('should load ProStock_Pro.vb6.json and validate successfully', () => {
    // Load the fixture (simulating QuickPaste loader)
    const fixture = ProStockProFixture;

    // Validate the fixture
    const validation = validateVB6Fixture(fixture as any);

    // Should be valid
    expect(validation.ok).toBe(true);
  });

  it('should have all required fields in ProStock_Pro fixture', () => {
    const fixture = ProStockProFixture;

    // Check drivetrain fields
    expect(fixture.drivetrain).toBeDefined();
    expect(fixture.drivetrain.gearRatios).toBeDefined();
    expect(fixture.drivetrain.gearRatios.length).toBeGreaterThan(0);
    expect(fixture.drivetrain.perGearEff).toBeDefined();
    expect(fixture.drivetrain.perGearEff.length).toBeGreaterThan(0);

    // Check clutch or converter
    expect(fixture.drivetrain.clutch || (fixture.drivetrain as any).converter).toBeDefined();

    // Check engineHP
    expect(fixture.engineHP).toBeDefined();
    expect(fixture.engineHP.length).toBeGreaterThan(0);

    // Check fuel
    expect(fixture.fuel).toBeDefined();
    expect(fixture.fuel.type).toBeDefined();

    // Check PMI
    expect(fixture.pmi).toBeDefined();
    expect(fixture.pmi.engine_flywheel_clutch).toBeDefined();
    expect(fixture.pmi.transmission_driveshaft).toBeDefined();
    expect(fixture.pmi.tires_wheels_ringgear).toBeDefined();
  });

  it('should have exact values from VB6 printout', () => {
    const fixture = ProStockProFixture;

    // Verify exact gear ratios from printout
    expect(fixture.drivetrain.gearRatios).toEqual([2.60, 1.90, 1.50, 1.20, 1.00]);

    // Verify exact per-gear efficiencies
    expect(fixture.drivetrain.perGearEff).toEqual([0.990, 0.991, 0.992, 0.993, 0.994]);

    // Verify clutch slipRPM
    expect(fixture.drivetrain.clutch).toBeDefined();
    expect(fixture.drivetrain.clutch!.slipRPM).toBe(7600);

    // Verify first engineHP point
    expect(fixture.engineHP[0]).toBeDefined();
    expect(fixture.engineHP[0][0]).toBe(7000);
    expect(fixture.engineHP[0][1]).toBe(1098);

    // Verify PMI tires_wheels_ringgear
    expect(fixture.pmi.tires_wheels_ringgear).toBe(50.8);
  });

  it('should pass validation checklist requirements', () => {
    const fixture = ProStockProFixture as any;

    // Check all 6 requirements from RunInspector checklist
    
    // 1. drivetrain.gearRatios
    expect(fixture.drivetrain?.gearRatios?.length).toBeGreaterThan(0);

    // 2. drivetrain.perGearEff
    expect(fixture.drivetrain?.perGearEff?.length).toBeGreaterThan(0);

    // 3. clutch or converter
    expect(fixture.drivetrain?.clutch || fixture.drivetrain?.converter).toBeTruthy();

    // 4. engineHP
    expect(fixture.engineHP?.length).toBeGreaterThan(0);

    // 5. fuel.type
    expect(fixture.fuel?.type).toBeTruthy();

    // 6. pmi.*
    expect(fixture.pmi?.engine_flywheel_clutch).toBeDefined();
    expect(fixture.pmi?.transmission_driveshaft).toBeDefined();
    expect(fixture.pmi?.tires_wheels_ringgear).toBeDefined();
  });

  it('should have matching gear ratios and efficiencies lengths', () => {
    const fixture = ProStockProFixture;

    // Gear ratios and efficiencies must have same length
    expect(fixture.drivetrain.gearRatios.length).toBe(fixture.drivetrain.perGearEff.length);
  });

  it('should have valid environment values', () => {
    const fixture = ProStockProFixture;

    // Check environment fields from printout
    expect(fixture.environment.elevation_ft).toBe(32);
    expect(fixture.environment.barometer_inHg).toBe(29.92);
    expect(fixture.environment.temp_F).toBe(75);
    expect(fixture.environment.rel_humidity_pct).toBe(55);
    expect(fixture.environment.wind_mph).toBe(5.0);
    expect(fixture.environment.wind_angle_deg).toBe(135);
    expect(fixture.environment.trackTemp_F).toBe(105);
    expect(fixture.environment.tractionIndex).toBe(3);
  });

  it('should have valid vehicle values', () => {
    const fixture = ProStockProFixture;

    // Check vehicle fields from printout
    expect(fixture.vehicle.weight_lb).toBe(2355);
    expect(fixture.vehicle.wheelbase_in).toBe(107);
    expect(fixture.vehicle.overhang_in).toBe(40);
    expect(fixture.vehicle.tire_rollout_in).toBe(102.5);
    expect(fixture.vehicle.tire_width_in).toBe(17.0);
    expect(fixture.vehicle.frontalArea_ft2).toBe(18.2);
    expect(fixture.vehicle.Cd).toBe(0.240);
    expect(fixture.vehicle.Cl).toBe(0.100);
  });

  it('should have valid drivetrain values', () => {
    const fixture = ProStockProFixture;

    // Check drivetrain fields from printout
    expect(fixture.drivetrain.finalDrive).toBe(4.86);
    expect(fixture.drivetrain.efficiency).toBe(0.975);
    expect(fixture.drivetrain.shiftRPM).toEqual([9400, 9400, 9400, 9400, 0]);
    
    // Check clutch values
    expect(fixture.drivetrain.clutch!.launchRPM).toBe(7200);
    expect(fixture.drivetrain.clutch!.slipRPM).toBe(7600);
    expect(fixture.drivetrain.clutch!.slippage).toBe(1.004);
    expect(fixture.drivetrain.clutch!.lockup).toBe(false);
  });

  it('should have valid fuel values', () => {
    const fixture = ProStockProFixture;

    // Check fuel fields from printout
    expect(fixture.fuel.type).toBe('GAS');
    expect(fixture.fuel.hpTorqueMultiplier).toBe(1.000);
  });

  it('should have valid PMI values', () => {
    const fixture = ProStockProFixture;

    // Check PMI fields from printout
    expect(fixture.pmi.engine_flywheel_clutch).toBe(3.42);
    expect(fixture.pmi.transmission_driveshaft).toBe(0.247);
    expect(fixture.pmi.tires_wheels_ringgear).toBe(50.8);
  });

  it('should have complete engine HP curve', () => {
    const fixture = ProStockProFixture;

    // Should have 11 points as per printout
    expect(fixture.engineHP.length).toBe(11);

    // Check first point
    expect(fixture.engineHP[0][0]).toBe(7000);
    expect(fixture.engineHP[0][1]).toBe(1098);

    // Check peak HP point
    const peakPoint = fixture.engineHP.find(p => p[1] === 1300);
    expect(peakPoint).toBeDefined();
    expect(peakPoint![0]).toBe(8750);

    // Check last point
    expect(fixture.engineHP[10][0]).toBe(9500);
    expect(fixture.engineHP[10][1]).toBe(1222);
  });

  it('should be ready for Run Inspector QUARTER simulation', () => {
    const fixture = ProStockProFixture as any;

    // Mock simulate function to capture inputs
    const mockSimulate = vi.fn((_model: string, _inputs: any) => {
      // Verify the fixture values are passed correctly
      return {
        et_s: 6.80,
        mph: 202.3,
        meta: {
          model: 'RSACLASSIC',
          termination: { reason: 'DISTANCE' },
        },
      };
    });

    // Simulate what Run Inspector would do
    const raceLength = 'QUARTER';
    
    // Validate fixture first (Run Inspector does this)
    const validation = validateVB6Fixture(fixture);
    expect(validation.ok).toBe(true);

    // If valid, would call simulate (mocked here)
    if (validation.ok) {
      const result = mockSimulate('RSACLASSIC', {
        fixture,
        raceLength,
      });

      // Verify simulate was called
      expect(mockSimulate).toHaveBeenCalledTimes(1);
      expect(mockSimulate).toHaveBeenCalledWith('RSACLASSIC', {
        fixture,
        raceLength,
      });

      // Verify result structure
      expect(result.et_s).toBeDefined();
      expect(result.mph).toBeDefined();
    }
  });

  it('should preserve exact fixture values through validation', () => {
    const fixture = ProStockProFixture as any;

    // Store original values
    const originalGearRatios = [...fixture.drivetrain.gearRatios];
    const originalPerGearEff = [...fixture.drivetrain.perGearEff];
    const originalSlipRPM = fixture.drivetrain.clutch.slipRPM;
    const originalFirstRPM = fixture.engineHP[0][0];
    const originalTiresWheelsRing = fixture.pmi.tires_wheels_ringgear;

    // Validate (should not mutate)
    validateVB6Fixture(fixture);

    // Verify values unchanged
    expect(fixture.drivetrain.gearRatios).toEqual(originalGearRatios);
    expect(fixture.drivetrain.perGearEff).toEqual(originalPerGearEff);
    expect(fixture.drivetrain.clutch.slipRPM).toBe(originalSlipRPM);
    expect(fixture.engineHP[0][0]).toBe(originalFirstRPM);
    expect(fixture.pmi.tires_wheels_ringgear).toBe(originalTiresWheelsRing);
  });
});

describe('Dev Portal - Fixture Validation Edge Cases', () => {
  it('should fail validation with missing gearRatios', () => {
    const incompleteFixture = {
      ...ProStockProFixture,
      drivetrain: {
        ...ProStockProFixture.drivetrain,
        gearRatios: undefined,
      },
    };

    const validation = validateVB6Fixture(incompleteFixture as any);
    
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.missing).toContain('drivetrain.gearRatios');
    }
  });

  it('should fail validation with missing engineHP', () => {
    const incompleteFixture = {
      ...ProStockProFixture,
      engineHP: undefined,
    };

    const validation = validateVB6Fixture(incompleteFixture as any);
    
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.missing).toContain('engineHP');
    }
  });

  it('should fail validation with missing fuel.type', () => {
    const incompleteFixture = {
      ...ProStockProFixture,
      fuel: {
        ...ProStockProFixture.fuel,
        type: undefined,
      },
    };

    const validation = validateVB6Fixture(incompleteFixture as any);
    
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.missing).toContain('fuel.type');
    }
  });

  it('should fail validation with missing clutch and converter', () => {
    const incompleteFixture = {
      ...ProStockProFixture,
      drivetrain: {
        ...ProStockProFixture.drivetrain,
        clutch: undefined,
        converter: undefined,
      },
    };

    const validation = validateVB6Fixture(incompleteFixture as any);
    
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.missing).toContain('drivetrain.clutch or drivetrain.converter');
    }
  });
});
