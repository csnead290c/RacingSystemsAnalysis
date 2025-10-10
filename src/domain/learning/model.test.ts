/**
 * Unit tests for RLS learning model.
 * Tests createModel, apply, and update with monotonic behavior.
 */

import { describe, it, expect } from 'vitest';
import { createModel, apply, update } from './model';

describe('Learning Model', () => {
  describe('createModel', () => {
    it('should initialize model with correct dimensions', () => {
      const model = createModel(3);
      
      expect(model.w).toHaveLength(3);
      expect(model.P).toHaveLength(3);
      expect(model.P[0]).toHaveLength(3);
      expect(model.n).toBe(0);
      expect(model.confidence).toBe(0);
    });

    it('should initialize weights to zero', () => {
      const model = createModel(5);
      
      expect(model.w).toEqual([0, 0, 0, 0, 0]);
    });

    it('should initialize covariance to identity * 1000', () => {
      const model = createModel(3);
      
      // Diagonal should be 1000
      expect(model.P[0][0]).toBe(1000);
      expect(model.P[1][1]).toBe(1000);
      expect(model.P[2][2]).toBe(1000);
      
      // Off-diagonal should be 0
      expect(model.P[0][1]).toBe(0);
      expect(model.P[1][0]).toBe(0);
    });
  });

  describe('apply', () => {
    it('should return zero for zero weights', () => {
      const model = createModel(3);
      const x = [1, 2, 3];
      
      const delta = apply(model, x);
      
      expect(delta).toBe(0);
    });

    it('should compute dot product correctly', () => {
      const model = createModel(3);
      model.w = [1, 2, 3];
      const x = [4, 5, 6];
      
      // Expected: 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
      const delta = apply(model, x);
      
      expect(delta).toBe(32);
    });

    it('should throw on dimension mismatch', () => {
      const model = createModel(3);
      const x = [1, 2]; // Wrong dimension
      
      expect(() => apply(model, x)).toThrow('Feature dimension mismatch');
    });
  });

  describe('update', () => {
    it('should increment sample count', () => {
      const model = createModel(2);
      const x = [1, 0];
      const y = 0.5;
      
      const updated = update(model, x, y);
      
      expect(updated.n).toBe(1);
      
      const updated2 = update(updated, x, y);
      expect(updated2.n).toBe(2);
    });

    it('should update weights based on error', () => {
      const model = createModel(2);
      const x = [1, 0]; // Only first feature active
      const y = 0.5; // Positive error
      
      const updated = update(model, x, y);
      
      // Weight should move toward positive direction
      expect(updated.w[0]).toBeGreaterThan(0);
    });

    it('should show monotonic learning behavior', () => {
      // Start with zero model
      let model = createModel(2);
      
      // Feature vector
      const x = [1, 0.5];
      
      // Simulate consistent positive error (car runs faster than predicted)
      const y = 0.1; // 0.1 seconds faster
      
      // Apply multiple updates
      for (let i = 0; i < 10; i++) {
        model = update(model, x, y);
      }
      
      // After learning, prediction should move toward the error
      const prediction = apply(model, x);
      
      // Prediction should be positive (learned the positive bias)
      expect(prediction).toBeGreaterThan(0);
      
      // Prediction should be close to the error (but not exactly due to RLS dynamics)
      expect(prediction).toBeLessThan(y * 2); // Should converge
    });

    it('should increase confidence with more samples', () => {
      let model = createModel(2);
      const x = [1, 0.5];
      const y = 0.1;
      
      const confidence0 = model.confidence;
      
      // Update 5 times
      for (let i = 0; i < 5; i++) {
        model = update(model, x, y);
      }
      const confidence5 = model.confidence;
      
      // Update 10 more times
      for (let i = 0; i < 10; i++) {
        model = update(model, x, y);
      }
      const confidence15 = model.confidence;
      
      // Confidence should increase with samples
      expect(confidence5).toBeGreaterThan(confidence0);
      expect(confidence15).toBeGreaterThan(confidence5);
      
      // Confidence should be bounded
      expect(confidence15).toBeLessThanOrEqual(0.95);
    });

    it('should handle negative errors', () => {
      const model = createModel(2);
      const x = [1, 0];
      const y = -0.5; // Negative error (car runs slower)
      
      const updated = update(model, x, y);
      
      // Weight should move toward negative direction
      expect(updated.w[0]).toBeLessThan(0);
    });

    it('should throw on dimension mismatch', () => {
      const model = createModel(3);
      const x = [1, 2]; // Wrong dimension
      const y = 0.5;
      
      expect(() => update(model, x, y)).toThrow('Feature dimension mismatch');
    });

    it('should converge to consistent error', () => {
      let model = createModel(1);
      const x = [1.0];
      const consistentError = 0.2;
      
      // Train with consistent error
      for (let i = 0; i < 50; i++) {
        model = update(model, x, consistentError);
      }
      
      // Prediction should be very close to the consistent error
      const prediction = apply(model, x);
      expect(Math.abs(prediction - consistentError)).toBeLessThan(0.05);
    });
  });

  describe('RLS algorithm properties', () => {
    it('should reduce covariance over time', () => {
      let model = createModel(2);
      const x = [1, 0.5];
      const y = 0.1;
      
      const initialTrace = model.P[0][0] + model.P[1][1];
      
      // Update multiple times
      for (let i = 0; i < 20; i++) {
        model = update(model, x, y);
      }
      
      const finalTrace = model.P[0][0] + model.P[1][1];
      
      // Covariance trace should decrease (more certainty)
      expect(finalTrace).toBeLessThan(initialTrace);
    });

    it('should maintain positive definite covariance', () => {
      let model = createModel(2);
      const x = [1, 0.5];
      const y = 0.1;
      
      // Update multiple times
      for (let i = 0; i < 30; i++) {
        model = update(model, x, y);
      }
      
      // Diagonal elements should remain positive
      expect(model.P[0][0]).toBeGreaterThan(0);
      expect(model.P[1][1]).toBeGreaterThan(0);
    });
  });
});
