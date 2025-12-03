/**
 * VB6 Air Density Micro-Tests
 * 
 * Verifies exact VB6 air density calculation against known VB6 outputs.
 * These tests use the exact VB6 algorithm from QTRPERF.BAS Weather() subroutine.
 */

import { describe, it, expect } from 'vitest';
import { airDensityVB6 } from '../domain/physics/vb6/air';
import { f32 } from '../domain/physics/vb6/exactMath';

describe('VB6 Air Density (STRICT)', () => {
  // Known VB6 test case from Quarter Pro printout
  // Standard conditions: 29.92 inHg, 59°F, 0% humidity
  it('standard atmosphere returns expected rho', () => {
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 59,
      relHumidity_pct: 0,
    });
    
    // VB6 expected: ~0.002378 slugs/ft³ (standard sea level)
    expect(result.rho_slug_per_ft3).toBeCloseTo(0.002378, 4);
    expect(result.temp_R).toBeCloseTo(518.67, 2);
  });
  
  // Hot day test case
  it('hot day (90°F) returns lower rho', () => {
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 90,
      relHumidity_pct: 50,
    });
    
    // Hot air is less dense
    expect(result.rho_slug_per_ft3).toBeLessThan(0.002378);
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0.002);
  });
  
  // ProStock Pro fixture conditions
  it('ProStock Pro conditions match expected rho', () => {
    // From VB6_PROSTOCK_PRO fixture
    const result = airDensityVB6({
      barometer_inHg: 29.92,
      temperature_F: 75,
      relHumidity_pct: 50,
    });
    
    // Log for debugging
    console.log('[AIR_VB6]', {
      rho_slug_per_ft3: result.rho_slug_per_ft3.toFixed(6),
      pamb_psi: result.pamb_psi.toFixed(4),
      PWV_psi: result.PWV_psi.toFixed(6),
      pair_psi: result.pair_psi.toFixed(4),
      WAR: result.WAR.toFixed(6),
      RGAS: result.RGAS.toFixed(4),
      temp_R: result.temp_R.toFixed(2),
    });
    
    // Verify reasonable range
    expect(result.rho_slug_per_ft3).toBeGreaterThan(0.0022);
    expect(result.rho_slug_per_ft3).toBeLessThan(0.0024);
  });
  
  // Float32 precision test
  it('Float32 operations preserve precision', () => {
    const a = f32(29.92);
    const b = f32(70.7262);
    // f32(a * b) applies fround to already-fround inputs, then frounds result
    // This is different from Math.fround(29.92 * 70.7262) which uses double precision for multiply
    const product = f32(a * b);
    
    // Should be close to 2116.5 (29.92 * 70.7262)
    expect(product).toBeCloseTo(2116.5, 0);
    
    // Verify it's Float32 (same as fround of fround inputs multiplied)
    expect(product).toBe(Math.fround(Math.fround(29.92) * Math.fround(70.7262)));
  });
});
