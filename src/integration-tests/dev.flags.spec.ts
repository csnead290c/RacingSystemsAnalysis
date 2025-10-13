/**
 * Dev Portal Flags Integration Tests
 * 
 * Tests that feature flags correctly affect application behavior.
 * Ensures flags panel changes propagate to Predict page and other consumers.
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Import the actual flags store used by the panels
// Note: In a real test environment, we'd need to mock localStorage
// For now, we test the store API directly

describe('Dev Portal - Feature Flags', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('rsa.flags.v1');
    }
  });

  it('should have correct default flag values', () => {
    // Import fresh to get defaults
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    expect(store.vb6StrictMode).toBe(false);
    expect(store.showDiagnostics).toBe(false);
    expect(store.enableEnergyLogging).toBe(false);
    expect(store.enableStepTrace).toBe(false);
  });

  it('should allow setting vb6StrictMode flag', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Set flag
    store.setFlag('vb6StrictMode', true);
    
    // Verify it was set
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
  });

  it('should allow setting showDiagnostics flag', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    store.setFlag('showDiagnostics', true);
    expect(useFlagsStore.getState().showDiagnostics).toBe(true);
  });

  it('should allow setting enableEnergyLogging flag', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    store.setFlag('enableEnergyLogging', true);
    expect(useFlagsStore.getState().enableEnergyLogging).toBe(true);
  });

  it('should allow setting enableStepTrace flag', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    store.setFlag('enableStepTrace', true);
    expect(useFlagsStore.getState().enableStepTrace).toBe(true);
  });

  it('should reset all flags to defaults', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Set all flags to true
    store.setFlag('vb6StrictMode', true);
    store.setFlag('showDiagnostics', true);
    store.setFlag('enableEnergyLogging', true);
    store.setFlag('enableStepTrace', true);
    
    // Reset
    store.resetFlags();
    
    // All should be false
    const state = useFlagsStore.getState();
    expect(state.vb6StrictMode).toBe(false);
    expect(state.showDiagnostics).toBe(false);
    expect(state.enableEnergyLogging).toBe(false);
    expect(state.enableStepTrace).toBe(false);
  });

  it('should maintain flag state across multiple reads', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Set flag
    store.setFlag('vb6StrictMode', true);
    
    // Read multiple times
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
  });

  it('should allow toggling flags on and off', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Toggle on
    store.setFlag('vb6StrictMode', true);
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
    
    // Toggle off
    store.setFlag('vb6StrictMode', false);
    expect(useFlagsStore.getState().vb6StrictMode).toBe(false);
    
    // Toggle on again
    store.setFlag('vb6StrictMode', true);
    expect(useFlagsStore.getState().vb6StrictMode).toBe(true);
  });

  it('should not affect other flags when setting one flag', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Set one flag
    store.setFlag('vb6StrictMode', true);
    
    // Others should remain false
    expect(useFlagsStore.getState().showDiagnostics).toBe(false);
    expect(useFlagsStore.getState().enableEnergyLogging).toBe(false);
    expect(useFlagsStore.getState().enableStepTrace).toBe(false);
  });
});

describe('Dev Portal - Flags Integration with Predict', () => {
  it('should expose vb6StrictMode flag for Predict page consumption', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // This simulates what Predict.tsx does
    const strictMode = useFlagsStore.getState().vb6StrictMode;
    
    expect(typeof strictMode).toBe('boolean');
  });

  it('should allow Predict page to read flag changes', () => {
    const { useFlagsStore } = require('../domain/flags/store.tsx');
    const store = useFlagsStore.getState();
    
    // Initial state
    expect(useFlagsStore.getState().vb6StrictMode).toBe(false);
    
    // Simulate FlagsPanel changing the flag
    store.setFlag('vb6StrictMode', true);
    
    // Simulate Predict page reading the flag
    const strictMode = useFlagsStore.getState().vb6StrictMode;
    expect(strictMode).toBe(true);
  });
});
