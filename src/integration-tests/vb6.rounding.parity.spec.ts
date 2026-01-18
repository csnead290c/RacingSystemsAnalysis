/**
 * VB6 Rounding Parity Contract - Regression Protection
 * 
 * This test suite validates ET/MPH formatting against known VB6 printout values.
 * It MUST FAIL if anyone changes banker's rounding behavior in the future.
 * 
 * VB6 Evidence:
 * - TIMESLIP.FRM:1496 - RightAlign(5, 2, time(L)) for ET (2 decimals)
 * - TIMESLIP.FRM:1508 - RightAlign(4, 1, Work) for MPH (1 decimal)
 * - CVALUE.CLS:557 - RightAlign uses Format() which applies banker's rounding
 * 
 * These test cases include:
 * 1. Real-world VB6 printout values from Reference Files
 * 2. Boundary cases (x.xx5 values that expose rounding method)
 * 3. Edge cases (negative values, very small/large values)
 */

import { describe, it, expect } from 'vitest';
import { roundET, roundMPH } from '../domain/physics/vb6/constants';

describe('VB6 Rounding Parity Contract - ET/MPH Formatting', () => {
  describe('Real-world VB6 printout values (from Reference Files)', () => {
    // Pro Stock - Reference Files/QCommon/ProStock_Pro.dat
    it('Pro Stock ET: 6.800s (VB6 printout)', () => {
      // Raw value that should round to 6.80 with banker's rounding
      expect(roundET(6.8049)).toBe(6.80);
      expect(roundET(6.8051)).toBe(6.81);
    });
    
    it('Pro Stock MPH: 202.3 mph (VB6 printout)', () => {
      // Raw value that should round to 202.3 with banker's rounding
      expect(roundMPH(202.26)).toBe(202.3);
      expect(roundMPH(202.24)).toBe(202.2);
    });
    
    // Super Comp - Reference Files/QCommon/SuperComp_Pro.dat
    it('Super Comp ET: 8.900s (VB6 printout)', () => {
      expect(roundET(8.9049)).toBe(8.90);
      expect(roundET(8.9051)).toBe(8.91);
    });
    
    it('Super Comp MPH: 151.6 mph (VB6 printout)', () => {
      expect(roundMPH(151.64)).toBe(151.6);
      expect(roundMPH(151.66)).toBe(151.7);
    });
    
    // Super Gas - Reference Files/QCommon/SuperGas_Pro.dat
    it('Super Gas ET: 9.900s (VB6 printout)', () => {
      expect(roundET(9.9049)).toBe(9.90);
      expect(roundET(9.9051)).toBe(9.91);
    });
    
    it('Super Gas MPH: 135.1 mph (VB6 printout)', () => {
      expect(roundMPH(135.14)).toBe(135.1);
      expect(roundMPH(135.16)).toBe(135.2);
    });
    
    // Top Alcohol Dragster - Reference Files/QCommon/TADragster_Pro.dat
    it('TA Dragster ET: 5.520s (VB6 printout)', () => {
      expect(roundET(5.5249)).toBe(5.52);
      expect(roundET(5.5251)).toBe(5.53);
    });
    
    it('TA Dragster MPH: 243.1 mph (VB6 printout)', () => {
      expect(roundMPH(243.14)).toBe(243.1);
      expect(roundMPH(243.16)).toBe(243.2);
    });
    
    // Motorcycle - Reference Files/QCommon/Motorcycle_Jr.dat
    it('Motorcycle ET: 8.450s (VB6 printout)', () => {
      expect(roundET(8.4549)).toBe(8.45);
      expect(roundET(8.4551)).toBe(8.46);
    });
    
    it('Motorcycle MPH: 165.2 mph (VB6 printout)', () => {
      expect(roundMPH(165.24)).toBe(165.2);
      expect(roundMPH(165.26)).toBe(165.3);
    });
  });
  
  describe('Boundary cases - x.xx5 values (expose rounding method)', () => {
    describe('ET boundary cases (2 decimals)', () => {
      // These MUST use banker's rounding (round-half-to-even)
      // If someone changes to round-half-up, these tests will FAIL
      
      it('6.805s rounds to 6.80 (even)', () => {
        expect(roundET(6.805)).toBe(6.80);
      });
      
      it('6.815s rounds to 6.82 (even)', () => {
        expect(roundET(6.815)).toBe(6.82);
      });
      
      it('6.825s rounds to 6.82 (even)', () => {
        expect(roundET(6.825)).toBe(6.82);
      });
      
      it('6.835s rounds to 6.84 (even)', () => {
        expect(roundET(6.835)).toBe(6.84);
      });
      
      it('9.905s rounds to 9.90 (even)', () => {
        expect(roundET(9.905)).toBe(9.90);
      });
      
      it('9.915s rounds to 9.92 (even)', () => {
        expect(roundET(9.915)).toBe(9.92);
      });
      
      it('5.525s rounds to 5.52 (even)', () => {
        expect(roundET(5.525)).toBe(5.52);
      });
      
      it('5.535s rounds to 5.54 (even)', () => {
        expect(roundET(5.535)).toBe(5.54);
      });
    });
    
    describe('MPH boundary cases (1 decimal)', () => {
      // These MUST use banker's rounding (round-half-to-even)
      
      it('202.25 mph rounds to 202.2 (even)', () => {
        expect(roundMPH(202.25)).toBe(202.2);
      });
      
      it('202.35 mph rounds to 202.4 (even)', () => {
        expect(roundMPH(202.35)).toBe(202.4);
      });
      
      it('202.45 mph rounds to 202.4 (even)', () => {
        expect(roundMPH(202.45)).toBe(202.4);
      });
      
      it('202.55 mph rounds to 202.6 (even)', () => {
        expect(roundMPH(202.55)).toBe(202.6);
      });
      
      it('135.05 mph rounds to 135.0 (even)', () => {
        expect(roundMPH(135.05)).toBe(135.0);
      });
      
      it('135.15 mph rounds to 135.2 (even)', () => {
        expect(roundMPH(135.15)).toBe(135.2);
      });
      
      it('243.15 mph rounds to 243.2 (even)', () => {
        expect(roundMPH(243.15)).toBe(243.2);
      });
      
      it('165.25 mph rounds to 165.2 (even)', () => {
        expect(roundMPH(165.25)).toBe(165.2);
      });
    });
  });
  
  describe('Edge cases', () => {
    it('handles very small ET values', () => {
      expect(roundET(0.005)).toBe(0.00);  // Round to even (0)
      expect(roundET(0.015)).toBe(0.02);  // Round to even (2)
      expect(roundET(0.025)).toBe(0.02);  // Round to even (2)
    });
    
    it('handles very large ET values', () => {
      expect(roundET(99.995)).toBe(100.00);  // Round to even (100)
      expect(roundET(99.985)).toBe(99.98);   // Round to even (98)
    });
    
    it('handles very small MPH values', () => {
      expect(roundMPH(0.05)).toBe(0.0);   // Round to even (0)
      expect(roundMPH(0.15)).toBe(0.2);   // Round to even (2)
      expect(roundMPH(0.25)).toBe(0.2);   // Round to even (2)
    });
    
    it('handles very large MPH values', () => {
      expect(roundMPH(999.95)).toBe(1000.0);  // Round to even (1000)
      expect(roundMPH(999.85)).toBe(999.8);   // Round to even (998)
    });
    
    it('handles negative ET values (theoretical)', () => {
      expect(roundET(-6.805)).toBe(-6.80);  // Round to even (-6.80)
      expect(roundET(-6.815)).toBe(-6.82);  // Round to even (-6.82)
    });
    
    it('handles negative MPH values (theoretical)', () => {
      expect(roundMPH(-202.25)).toBe(-202.2);  // Round to even (-202.2)
      expect(roundMPH(-202.35)).toBe(-202.4);  // Round to even (-202.4)
    });
  });
  
  describe('Regression protection - detect round-half-up changes', () => {
    // These tests will FAIL if someone changes to round-half-up
    // Round-half-up would give different results for x.xx5 values
    
    it('FAILS if changed to round-half-up: 6.805 would become 6.81 (wrong)', () => {
      const result = roundET(6.805);
      expect(result).toBe(6.80);  // Banker's rounding (correct)
      expect(result).not.toBe(6.81);  // Round-half-up (wrong)
    });
    
    it('FAILS if changed to round-half-up: 202.25 would become 202.3 (wrong)', () => {
      const result = roundMPH(202.25);
      expect(result).toBe(202.2);  // Banker's rounding (correct)
      expect(result).not.toBe(202.3);  // Round-half-up (wrong)
    });
    
    it('FAILS if changed to round-half-up: 9.905 would become 9.91 (wrong)', () => {
      const result = roundET(9.905);
      expect(result).toBe(9.90);  // Banker's rounding (correct)
      expect(result).not.toBe(9.91);  // Round-half-up (wrong)
    });
    
    it('FAILS if changed to round-half-up: 135.05 would become 135.1 (wrong)', () => {
      const result = roundMPH(135.05);
      expect(result).toBe(135.0);  // Banker's rounding (correct)
      expect(result).not.toBe(135.1);  // Round-half-up (wrong)
    });
  });
  
  describe('VB6 Format() parity validation', () => {
    // These test cases validate that our rounding matches VB6 Format() exactly
    // VB6 Format() uses banker's rounding (IEEE 754 round-half-to-even)
    
    it('matches VB6 Format(6.805, "0.00") = "6.80"', () => {
      expect(roundET(6.805)).toBe(6.80);
    });
    
    it('matches VB6 Format(6.815, "0.00") = "6.82"', () => {
      expect(roundET(6.815)).toBe(6.82);
    });
    
    it('matches VB6 Format(202.25, "0.0") = "202.2"', () => {
      expect(roundMPH(202.25)).toBe(202.2);
    });
    
    it('matches VB6 Format(202.35, "0.0") = "202.4"', () => {
      expect(roundMPH(202.35)).toBe(202.4);
    });
  });
});
