/**
 * VB6 Semantic Parity Test: Default Decimal Precision
 * 
 * VB6 Specification (TIMESLIP.FRM lines 1450-1456):
 *   tsv(1).caption = Format(TIMESLIP(1), "##.00")   ' ET: 2 decimals
 *   tsv(4).caption = Format(TIMESLIP(4), "###.0")   ' MPH: 1 decimal
 * 
 * This test proves the default flag values match VB6 fixed precision.
 */

import { describe, test, expect } from 'vitest';
import { useFlagsStore } from '../store';

describe('Feature Flags - VB6 Default Precision', () => {
  
  test('default etDecimals is 2 (matches VB6 "##.00" format)', () => {
    // Get the initial store state
    const store = useFlagsStore.getState();
    
    // VB6 uses Format(TIMESLIP(i), "##.00") which is 2 decimal places
    expect(store.etDecimals).toBe(2);
  });

  test('default mphDecimals is 1 (matches VB6 "###.0" format)', () => {
    // Get the initial store state
    const store = useFlagsStore.getState();
    
    // VB6 uses Format(TIMESLIP(i), "###.0") which is 1 decimal place
    expect(store.mphDecimals).toBe(1);
  });

  test('default vb6Rounding is enabled', () => {
    // Get the initial store state
    const store = useFlagsStore.getState();
    
    // VB6 rounding should be enabled by default to match VB6 behavior
    expect(store.vb6Rounding).toBe(true);
  });

  test('resetFlags() restores VB6-matching defaults', () => {
    const store = useFlagsStore.getState();
    
    // Change the values
    store.setFlag('etDecimals', 3);
    store.setFlag('mphDecimals', 2);
    
    // Verify they changed
    expect(useFlagsStore.getState().etDecimals).toBe(3);
    expect(useFlagsStore.getState().mphDecimals).toBe(2);
    
    // Reset to defaults
    store.resetFlags();
    
    // Verify they're back to VB6 defaults
    expect(useFlagsStore.getState().etDecimals).toBe(2);
    expect(useFlagsStore.getState().mphDecimals).toBe(1);
  });
});
