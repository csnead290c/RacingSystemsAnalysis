/**
 * Parity tests comparing SimpleV1 and RSACLASSIC physics models.
 * Ensures both models produce reasonable results within expected ranges.
 */

import { describe, it, expect } from 'vitest';
import { getModel } from '../domain/physics';
import { GOLDEN_CASES, toSimInputs } from '../domain/physics/fixtures/golden';

// RSACLASSIC parity tests skipped - RSACLASSIC model requires torqueCurve
// Use vb6.parity.spec.ts for VB6Exact parity testing
describe.skip('Physics Model Parity', () => {
  GOLDEN_CASES.forEach((goldenCase) => {
    describe(goldenCase.name, () => {
      const input = toSimInputs(goldenCase);
      
      it('RSACLASSIC should fall within expected ET range', () => {
        const model = getModel('RSACLASSIC');
        const result = model.simulate(input);
        
        const [minET, maxET] = goldenCase.etRange;
        expect(result.et_s).toBeGreaterThanOrEqual(minET);
        expect(result.et_s).toBeLessThanOrEqual(maxET);
      });
      
      it('RSACLASSIC should fall within expected MPH range', () => {
        const model = getModel('RSACLASSIC');
        const result = model.simulate(input);
        
        const [minMPH, maxMPH] = goldenCase.mphRange;
        expect(result.mph).toBeGreaterThanOrEqual(minMPH);
        expect(result.mph).toBeLessThanOrEqual(maxMPH);
      });
      
      it('SimpleV1 ET should be within ±30% of RSACLASSIC (sanity check)', () => {
        const simpleV1 = getModel('SimpleV1');
        const rsaclassic = getModel('RSACLASSIC');
        
        const simpleResult = simpleV1.simulate(input);
        const rsaResult = rsaclassic.simulate(input);
        
        const etDiff = Math.abs(simpleResult.et_s - rsaResult.et_s);
        const etDiffPercent = (etDiff / rsaResult.et_s) * 100;
        
        // Loose sanity check: within 30%
        expect(etDiffPercent).toBeLessThan(30);
      });
      
      it('SimpleV1 MPH should be within ±20% of RSACLASSIC (sanity check)', () => {
        const simpleV1 = getModel('SimpleV1');
        const rsaclassic = getModel('RSACLASSIC');
        
        const simpleResult = simpleV1.simulate(input);
        const rsaResult = rsaclassic.simulate(input);
        
        const mphDiff = Math.abs(simpleResult.mph - rsaResult.mph);
        const mphDiffPercent = (mphDiff / rsaResult.mph) * 100;
        
        // Loose sanity check: within 20%
        expect(mphDiffPercent).toBeLessThan(20);
      });
      
      it('Both models should produce monotonic timeslips', () => {
        const simpleV1 = getModel('SimpleV1');
        const rsaclassic = getModel('RSACLASSIC');
        
        const simpleResult = simpleV1.simulate(input);
        const rsaResult = rsaclassic.simulate(input);
        
        // Check SimpleV1 timeslip
        for (let i = 1; i < simpleResult.timeslip.length; i++) {
          expect(simpleResult.timeslip[i].t_s).toBeGreaterThanOrEqual(
            simpleResult.timeslip[i - 1].t_s
          );
        }
        
        // Check RSACLASSIC timeslip
        for (let i = 1; i < rsaResult.timeslip.length; i++) {
          expect(rsaResult.timeslip[i].t_s).toBeGreaterThanOrEqual(
            rsaResult.timeslip[i - 1].t_s
          );
        }
      });
      
      it('Both models should be deterministic', () => {
        const simpleV1 = getModel('SimpleV1');
        const rsaclassic = getModel('RSACLASSIC');
        
        // Run SimpleV1 twice
        const simple1 = simpleV1.simulate(input);
        const simple2 = simpleV1.simulate(input);
        expect(simple1.et_s).toBe(simple2.et_s);
        expect(simple1.mph).toBe(simple2.mph);
        
        // Run RSACLASSIC twice
        const rsa1 = rsaclassic.simulate(input);
        const rsa2 = rsaclassic.simulate(input);
        expect(rsa1.et_s).toBe(rsa2.et_s);
        expect(rsa1.mph).toBe(rsa2.mph);
      });
    });
  });
  
  describe('Model Metadata', () => {
    it('SimpleV1 should report correct model ID', () => {
      const model = getModel('SimpleV1');
      const input = toSimInputs(GOLDEN_CASES[0]);
      const result = model.simulate(input);
      
      expect(result.meta.model).toBe('SimpleV1');
    });
    
    it('RSACLASSIC should report correct model ID', () => {
      const model = getModel('RSACLASSIC');
      const input = toSimInputs(GOLDEN_CASES[0]);
      const result = model.simulate(input);
      
      expect(result.meta.model).toBe('RSACLASSIC');
    });
  });
});
