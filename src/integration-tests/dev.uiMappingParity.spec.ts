/**
 * Dev Portal UI Mapping Parity Tests
 * 
 * Ensures that buildInputFromUiFixture produces identical results to direct fixture usage.
 * Tests that the UI path doesn't mutate or alter values.
 */

import { describe, it, expect } from 'vitest';
import { VB6_PROSTOCK_PRO } from '../domain/physics/fixtures/vb6-prostock-pro';
import { buildInputFromUiFixture } from '../domain/physics/vb6/uiMapper';
import { assertComplete } from '../domain/physics/vb6/fixtures';

describe('Dev Portal - UI Mapping Parity', () => {
  it('should produce identical env values when mapping from VB6 fixture', () => {
    // Validate fixture is complete
    assertComplete(VB6_PROSTOCK_PRO);
    
    // Build input using UI mapper
    const uiInput = buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    
    // Compare env values
    expect(uiInput.env.elevation).toBe(VB6_PROSTOCK_PRO.env.elevation_ft);
    expect(uiInput.env.temperatureF).toBe(VB6_PROSTOCK_PRO.env.temperature_F);
    expect(uiInput.env.barometerInHg).toBe(VB6_PROSTOCK_PRO.env.barometer_inHg);
    expect(uiInput.env.humidityPct).toBe(VB6_PROSTOCK_PRO.env.relHumidity_pct);
    expect(uiInput.env.trackTempF).toBe(VB6_PROSTOCK_PRO.env.trackTemp_F);
    expect(uiInput.env.tractionIndex).toBe(VB6_PROSTOCK_PRO.env.tractionIndex);
    expect(uiInput.env.windMph).toBe(VB6_PROSTOCK_PRO.env.wind_mph);
    expect(uiInput.env.windAngleDeg).toBe(VB6_PROSTOCK_PRO.env.wind_angle_deg);
  });

  it('should preserve vehicle weight without mutation', () => {
    assertComplete(VB6_PROSTOCK_PRO);
    
    const uiInput = buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    
    // Weight should be exactly preserved
    expect(uiInput.vehicle.weightLb).toBe(VB6_PROSTOCK_PRO.vehicle.weight_lb);
  });

  it('should set correct race length', () => {
    assertComplete(VB6_PROSTOCK_PRO);
    
    const uiInput = buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    
    // Default race length should be QUARTER
    expect(uiInput.raceLength).toBe('QUARTER');
  });

  it('should handle all required VB6 fixture fields without errors', () => {
    // This test ensures the mapper doesn't crash on a complete fixture
    assertComplete(VB6_PROSTOCK_PRO);
    
    expect(() => {
      buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    }).not.toThrow();
  });

  it('should produce deterministic output for same input', () => {
    assertComplete(VB6_PROSTOCK_PRO);
    
    // Build input twice
    const input1 = buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    const input2 = buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    
    // Env should be identical
    expect(input1.env).toEqual(input2.env);
    
    // Race length should be identical
    expect(input1.raceLength).toBe(input2.raceLength);
    
    // Vehicle weight should be identical
    expect(input1.vehicle.weightLb).toBe(input2.vehicle.weightLb);
  });

  it('should not modify the original fixture object', () => {
    assertComplete(VB6_PROSTOCK_PRO);
    
    // Take snapshot of original values
    const originalElevation = VB6_PROSTOCK_PRO.env.elevation_ft;
    const originalTemp = VB6_PROSTOCK_PRO.env.temperature_F;
    const originalWeight = VB6_PROSTOCK_PRO.vehicle.weight_lb;
    
    // Build input
    buildInputFromUiFixture(VB6_PROSTOCK_PRO);
    
    // Original should be unchanged
    expect(VB6_PROSTOCK_PRO.env.elevation_ft).toBe(originalElevation);
    expect(VB6_PROSTOCK_PRO.env.temperature_F).toBe(originalTemp);
    expect(VB6_PROSTOCK_PRO.vehicle.weight_lb).toBe(originalWeight);
  });
});
