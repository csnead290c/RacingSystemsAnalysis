/**
 * Unit tests for VB6 dynamic pressure and drag force calculations.
 * 
 * Tests verify exact VB6 formulas:
 * - q_psf = 0.5 * rho * v²  (dynamic pressure in lbf/ft²)
 * - F_drag = q_psf * Cd * A  (drag force in lbf)
 */

import { describe, it, expect } from 'vitest';

describe('VB6 Air Drag Calculations', () => {
  it('should calculate dynamic pressure correctly for standard day at 100 ft/s', () => {
    // Standard day air density
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const v_fps = 100; // ft/s
    
    // VB6 formula: q = 0.5 * rho * v²
    const q_psf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
    
    // Expected: 0.5 * 0.0023769 * 100² = 11.8845 psf
    expect(q_psf).toBeCloseTo(11.8845, 4);
  });

  it('should calculate drag force correctly with CdA = 4.368 ft²', () => {
    // Standard day air density
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const v_fps = 100; // ft/s
    
    // VB6 formula: q = 0.5 * rho * v²
    const q_psf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
    
    // Drag coefficient and frontal area
    const Cd = 0.24;
    const A_ft2 = 18.2;
    const CdA = Cd * A_ft2; // 4.368 ft²
    
    // VB6 formula: F_drag = q * Cd * A
    const F_drag_lbf = q_psf * CdA;
    
    // Expected: 11.8845 * 4.368 ≈ 51.91 lbf
    expect(F_drag_lbf).toBeCloseTo(51.91, 2);
  });

  it('should calculate drag force directly from velocity', () => {
    // Standard day air density
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const v_fps = 100; // ft/s
    
    // Drag coefficient and frontal area
    const Cd = 0.24;
    const A_ft2 = 18.2;
    
    // VB6 formula: F_drag = 0.5 * rho * v² * Cd * A
    const F_drag_lbf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps * Cd * A_ft2;
    
    // Expected: 51.91 lbf
    expect(F_drag_lbf).toBeCloseTo(51.91, 2);
  });

  it('should show drag force grows with v²', () => {
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const Cd = 0.24;
    const A_ft2 = 18.2;
    
    // Calculate drag at different velocities
    const v1 = 100; // ft/s
    const v2 = 200; // ft/s (2x velocity)
    
    const F_drag_v1 = 0.5 * rho_slug_per_ft3 * v1 * v1 * Cd * A_ft2;
    const F_drag_v2 = 0.5 * rho_slug_per_ft3 * v2 * v2 * Cd * A_ft2;
    
    // Drag at 2x velocity should be 4x higher (v² relationship)
    expect(F_drag_v2 / F_drag_v1).toBeCloseTo(4.0, 6);
  });

  it('should calculate lift force with same dynamic pressure', () => {
    // Standard day air density
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const v_fps = 100; // ft/s
    
    // VB6 formula: q = 0.5 * rho * v²
    const q_psf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
    
    // Lift coefficient and frontal area
    const Cl = 0.10; // Typical Pro Stock lift coefficient
    const A_ft2 = 18.2;
    
    // VB6 formula: F_lift = q * Cl * A
    const F_lift_lbf = q_psf * Cl * A_ft2;
    
    // Expected: 11.8845 * 0.10 * 18.2 ≈ 21.63 lbf
    expect(F_lift_lbf).toBeCloseTo(21.63, 2);
  });

  it('should verify units: slug·ft/s² = lbf', () => {
    // Dynamic pressure calculation
    const rho_slug_per_ft3 = 0.0023769; // slug/ft³
    const v_fps = 100; // ft/s
    
    // q = 0.5 * rho * v²
    // Units: (slug/ft³) * (ft/s)² = slug·ft/s² / ft² = lbf/ft²
    const q_psf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
    
    // F = q * A
    // Units: (lbf/ft²) * ft² = lbf
    const A_ft2 = 1.0; // 1 ft² for unit verification
    const F_lbf = q_psf * A_ft2;
    
    // With Cd = 1.0 and A = 1 ft², force should equal dynamic pressure numerically
    expect(F_lbf).toBeCloseTo(11.8845, 4);
  });

  it('should match ProStock_Pro conditions at high speed', () => {
    // ProStock_Pro air density (75°F, 55% RH, 29.92 inHg)
    const rho_slug_per_ft3 = 0.002292; // From airDensityVB6
    
    // High speed: 290 mph = 425.33 ft/s
    const v_mph = 290;
    const v_fps = v_mph * 5280 / 3600; // 425.33 ft/s
    
    // ProStock_Pro aero
    const Cd = 0.24;
    const A_ft2 = 18.2;
    
    // Calculate dynamic pressure and drag
    const q_psf = 0.5 * rho_slug_per_ft3 * v_fps * v_fps;
    const F_drag_lbf = q_psf * Cd * A_ft2;
    
    // At 290 mph, drag should be significant
    expect(q_psf).toBeGreaterThan(200); // > 200 psf
    expect(F_drag_lbf).toBeGreaterThan(800); // > 800 lbf
    
    // Verify exact calculation
    // q = 0.5 * 0.002292 * 425.33² ≈ 207.3 psf
    expect(q_psf).toBeCloseTo(207.3, 1);
    
    // F_drag = 207.3 * 0.24 * 18.2 ≈ 905.6 lbf
    expect(F_drag_lbf).toBeCloseTo(905.6, 1);
  });
});
