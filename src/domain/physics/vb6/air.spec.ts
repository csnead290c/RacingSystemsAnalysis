/**
 * Unit tests for VB6 air density calculation.
 * 
 * Tests verify exact match with VB6 QTRPERF.BAS Weather() subroutine output.
 */

import { describe, it, expect } from 'vitest';
import { airDensityVB6 } from './air';

describe('airDensityVB6', () => {
  it('should match VB6 output for ProStock_Pro conditions', () => {
    // VB6 ProStock_Pro printout conditions (from vb6-prostock-pro.ts)
    // Barometer: 29.92 inHg
    // Temperature: 75°F
    // Relative Humidity: 55%
    // 
    // VB6 Source: QTRPERF.BAS Weather() subroutine (lines 1290-1335)
    // Expected output from VB6 calculation
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 75,
      relHumidity_pct: 55,
    });

    // VB6 calculated air density for these conditions
    // Using exact VB6 polynomial and gas law calculations
    // Expected: ~0.002377 slugs/ft³ at standard conditions (59°F, 29.92 inHg, 0% RH)
    // At 75°F, 55% RH: slightly lower due to temperature and humidity
    
    // Verify density matches VB6 calculation (0.002292 slugs/ft³)
    expect(result.rho_slug_per_ft3).toBeCloseTo(0.002292, 6);
    
    // Verify intermediate values are computed
    expect(result.pamb_psi).toBeCloseTo(14.696, 3); // Should equal PSTD at 29.92 inHg
    expect(result.temp_R).toBeCloseTo(534.67, 2); // 75°F + 459.67 = 534.67°R
    expect(result.PWV_psi).toBeGreaterThan(0); // Water vapor pressure should be positive
    expect(result.pair_psi).toBeLessThan(result.pamb_psi); // Dry air pressure < total pressure
    expect(result.WAR).toBeGreaterThan(0); // Water-to-air ratio should be positive
    expect(result.RGAS).toBeGreaterThan(0); // Gas constant should be positive
  });

  it('should match VB6 output for standard atmosphere conditions', () => {
    // Standard atmosphere: 59°F, 29.92 inHg, 0% RH
    // VB6 Source: QTRPERF.BAS Weather() subroutine
    // Expected: ~0.002377 slugs/ft³ (standard air density)
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 59,
      relHumidity_pct: 0,
    });

    // Standard air density at sea level
    // VB6 calculation should match ISA standard atmosphere
    expect(result.rho_slug_per_ft3).toBeCloseTo(0.002377, 6);
    expect(result.pamb_psi).toBeCloseTo(14.696, 3);
    expect(result.temp_R).toBeCloseTo(518.67, 2); // 59°F + 459.67
    expect(result.PWV_psi).toBeCloseTo(0, 6); // No water vapor at 0% RH
    expect(result.pair_psi).toBeCloseTo(14.696, 3); // Dry air pressure = total at 0% RH
  });

  it('should handle high temperature and humidity', () => {
    // Hot, humid conditions: 95°F, 29.92 inHg, 80% RH
    // VB6 Source: QTRPERF.BAS Weather() subroutine
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 95,
      relHumidity_pct: 80,
    });

    // Hot, humid air should be less dense than standard
    expect(result.rho_slug_per_ft3).toBeLessThan(0.002377);
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0.002100);
    
    // Water vapor pressure should be significant at high temp/humidity
    expect(result.PWV_psi).toBeGreaterThan(0.3);
    expect(result.WAR).toBeGreaterThan(0.01); // Higher water-to-air ratio
  });

  it('should handle low temperature and low humidity', () => {
    // Cold, dry conditions: 32°F, 29.92 inHg, 20% RH
    // VB6 Source: QTRPERF.BAS Weather() subroutine
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 32,
      relHumidity_pct: 20,
    });

    // Cold, dry air should be more dense than standard
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0.002377);
    expect(result.rho_slug_per_ft3).toBeLessThan(0.002600);
    
    // Water vapor pressure should be low at cold temp
    expect(result.PWV_psi).toBeLessThan(0.05);
    expect(result.WAR).toBeLessThan(0.005); // Lower water-to-air ratio
  });

  it('should handle high altitude (low pressure)', () => {
    // High altitude conditions: 59°F, 24.92 inHg (5000 ft), 50% RH
    // VB6 Source: QTRPERF.BAS Weather() subroutine
    const result = airDensityVB6({
      barometer_inHg: 24.92,
      temperature_F: 59,
      relHumidity_pct: 50,
    });

    // Lower pressure should result in lower density
    expect(result.rho_slug_per_ft3).toBeLessThan(0.002377);
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0.001900);
    
    // Ambient pressure should be proportional to barometer
    expect(result.pamb_psi).toBeCloseTo(14.696 * 24.92 / 29.92, 3);
  });

  it('should compute intermediate values correctly', () => {
    // Test that all intermediate values are computed and reasonable
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 75,
      relHumidity_pct: 55,
    });

    // All values should be defined and positive
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0);
    expect(result.pamb_psi).toBeGreaterThan(0);
    expect(result.PWV_psi).toBeGreaterThan(0);
    expect(result.pair_psi).toBeGreaterThan(0);
    expect(result.WAR).toBeGreaterThan(0);
    expect(result.RGAS).toBeGreaterThan(0);
    expect(result.temp_R).toBeGreaterThan(0);
    
    // Physical constraints
    expect(result.pair_psi).toBeLessThan(result.pamb_psi); // Dry air < total
    expect(result.PWV_psi).toBeLessThan(result.pamb_psi); // Water vapor < total
    expect(result.pair_psi + result.PWV_psi).toBeCloseTo(result.pamb_psi, 6); // Sum = total
  });
});
