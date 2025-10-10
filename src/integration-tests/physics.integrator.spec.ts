/**
 * Integration tests for RSACLASSIC physics integrator.
 */

import { describe, it, expect } from 'vitest';
import { stepEuler, createInitialState, type StepState, type StepForces } from '../domain/physics/core/integrator';
import { lbToSlug } from '../domain/physics/core/units';

describe('Physics Integrator', () => {
  describe('stepEuler', () => {
    it('should increase velocity with positive net force', () => {
      const state = createInitialState();
      
      const forces: StepForces = {
        tractive_lb: 1000, // Strong tractive force
        drag_lb: 50,       // Small drag
        roll_lb: 50,       // Small rolling resistance
        mass_slugs: lbToSlug(3000), // 3000 lb vehicle
      };
      
      const dt_s = 0.01; // 10ms timestep
      const newState = stepEuler(dt_s, state, forces);
      
      // Velocity should increase
      expect(newState.v_fps).toBeGreaterThan(state.v_fps);
      expect(newState.v_fps).toBeGreaterThan(0);
    });

    it('should increase position monotonically', () => {
      let state = createInitialState();
      
      const forces: StepForces = {
        tractive_lb: 800,
        drag_lb: 30,
        roll_lb: 20,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      
      // Run multiple steps
      for (let i = 0; i < 10; i++) {
        const prevPosition = state.s_ft;
        state = stepEuler(dt_s, state, forces);
        
        // Position should always increase (or stay same at start)
        expect(state.s_ft).toBeGreaterThanOrEqual(prevPosition);
      }
      
      // After 10 steps, should have moved significantly
      expect(state.s_ft).toBeGreaterThan(0);
    });

    it('should advance time correctly', () => {
      const state = createInitialState();
      
      const forces: StepForces = {
        tractive_lb: 500,
        drag_lb: 10,
        roll_lb: 10,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const newState = stepEuler(dt_s, state, forces);
      
      expect(newState.t_s).toBe(state.t_s + dt_s);
      expect(newState.t_s).toBeCloseTo(0.01, 6);
    });

    it('should handle zero net force (constant velocity)', () => {
      const state: StepState = {
        t_s: 0,
        v_fps: 100, // Already moving
        s_ft: 0,
        rpm: 3000,
        gearIdx: 1,
        warnings: [],
      };
      
      const forces: StepForces = {
        tractive_lb: 100,
        drag_lb: 50,
        roll_lb: 50,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const newState = stepEuler(dt_s, state, forces);
      
      // Velocity should remain approximately constant (net force = 0)
      expect(newState.v_fps).toBeCloseTo(state.v_fps, 1);
      
      // Position should still increase
      expect(newState.s_ft).toBeGreaterThan(state.s_ft);
    });

    it('should decelerate with negative net force', () => {
      const state: StepState = {
        t_s: 0,
        v_fps: 100, // Already moving
        s_ft: 0,
        rpm: 3000,
        gearIdx: 1,
        warnings: [],
      };
      
      const forces: StepForces = {
        tractive_lb: 50,  // Low tractive force
        drag_lb: 100,     // High drag
        roll_lb: 50,      // Rolling resistance
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const newState = stepEuler(dt_s, state, forces);
      
      // Velocity should decrease
      expect(newState.v_fps).toBeLessThan(state.v_fps);
    });

    it('should preserve rpm and gearIdx', () => {
      const state: StepState = {
        t_s: 0,
        v_fps: 50,
        s_ft: 100,
        rpm: 4500,
        gearIdx: 2,
        warnings: [],
      };
      
      const forces: StepForces = {
        tractive_lb: 500,
        drag_lb: 50,
        roll_lb: 50,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const newState = stepEuler(dt_s, state, forces);
      
      // RPM and gear should not change (managed by drivetrain)
      expect(newState.rpm).toBe(state.rpm);
      expect(newState.gearIdx).toBe(state.gearIdx);
    });

    it('should preserve warnings array', () => {
      const state: StepState = {
        t_s: 0,
        v_fps: 50,
        s_ft: 100,
        rpm: 4500,
        gearIdx: 2,
        warnings: ['test warning'],
      };
      
      const forces: StepForces = {
        tractive_lb: 500,
        drag_lb: 50,
        roll_lb: 50,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const newState = stepEuler(dt_s, state, forces);
      
      // Warnings should be copied
      expect(newState.warnings).toEqual(['test warning']);
      // Should be a new array (not same reference)
      expect(newState.warnings).not.toBe(state.warnings);
    });

    it('should handle multiple integration steps correctly', () => {
      let state = createInitialState();
      
      const forces: StepForces = {
        tractive_lb: 1000,
        drag_lb: 20,
        roll_lb: 30,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      const numSteps = 100;
      
      for (let i = 0; i < numSteps; i++) {
        state = stepEuler(dt_s, state, forces);
      }
      
      // After 100 steps of 0.01s = 1 second
      expect(state.t_s).toBeCloseTo(1.0, 6);
      
      // Should have accelerated (net force ~950 lb, mass ~93 slugs, a ~10 ft/s²)
      // After 1 second: v ≈ 10 ft/s
      expect(state.v_fps).toBeGreaterThan(5);
      
      // Should have traveled a distance (roughly 0.5 * a * t² ≈ 5 ft)
      expect(state.s_ft).toBeGreaterThan(2);
      
      // Velocity and position should be positive
      expect(state.v_fps).toBeGreaterThan(0);
      expect(state.s_ft).toBeGreaterThan(0);
    });

    it('should be deterministic', () => {
      const state1 = createInitialState();
      const state2 = createInitialState();
      
      const forces: StepForces = {
        tractive_lb: 750,
        drag_lb: 40,
        roll_lb: 35,
        mass_slugs: lbToSlug(3000),
      };
      
      const dt_s = 0.01;
      
      // Run same simulation twice
      const result1 = stepEuler(dt_s, state1, forces);
      const result2 = stepEuler(dt_s, state2, forces);
      
      // Results should be identical
      expect(result1.t_s).toBe(result2.t_s);
      expect(result1.v_fps).toBe(result2.v_fps);
      expect(result1.s_ft).toBe(result2.s_ft);
    });
  });

  describe('createInitialState', () => {
    it('should create state with zero values', () => {
      const state = createInitialState();
      
      expect(state.t_s).toBe(0);
      expect(state.v_fps).toBe(0);
      expect(state.s_ft).toBe(0);
      expect(state.rpm).toBe(0);
      expect(state.gearIdx).toBe(0);
      expect(state.warnings).toEqual([]);
    });

    it('should create independent state objects', () => {
      const state1 = createInitialState();
      const state2 = createInitialState();
      
      // Should be different objects
      expect(state1).not.toBe(state2);
      expect(state1.warnings).not.toBe(state2.warnings);
    });
  });
});
