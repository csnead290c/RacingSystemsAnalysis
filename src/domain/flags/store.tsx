/**
 * Feature Flags Store
 * 
 * Centralized feature flag management with localStorage persistence.
 * Flags control development features, diagnostics, and experimental modes.
 * 
 * NOTE: User level is now managed by the consolidated system in:
 * src/shared/state/userLevel.ts
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  type UserLevel, 
  USER_LEVELS,
  USER_LEVEL_DISPLAY,
  hasAccess,
  hasProAccess,
  hasAdminAccess,
} from '../../shared/state/userLevel';

// Re-export for convenience
export type { UserLevel };
export { USER_LEVELS, USER_LEVEL_DISPLAY, hasAccess, hasProAccess, hasAdminAccess };

export interface FeatureFlags {
  // User Level: Impersonate user level for testing
  userLevel: UserLevel;
  
  // VB6 Strict Mode: Require complete VB6 fixture for simulation (no defaults/heuristics)
  vb6StrictMode: boolean;
  
  // VB6 Strict Math: Force Float32 precision and VB6-identical math path
  vb6Strict: boolean;
  
  // Show Diagnostics: Display debug info in console/UI
  showDiagnostics: boolean;
  
  // Energy Logging: Log energy balance calculations
  enableEnergyLogging: boolean;
  
  // Step Trace: Log detailed step-by-step simulation data
  enableStepTrace: boolean;
}

interface FlagsStore extends FeatureFlags {
  // Actions
  setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => void;
  setUserLevel: (level: UserLevel) => void;
  resetFlags: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
  userLevel: 'quarterPro',
  vb6StrictMode: false,
  vb6Strict: true, // Default ON for VB6 parity
  showDiagnostics: false,
  enableEnergyLogging: false,
  enableStepTrace: false,
};

const STORAGE_KEY = 'rsa.flags.v1';

// Load flags from localStorage
function loadFlags(): FeatureFlags {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_FLAGS, ...JSON.parse(stored) };
    }
  } catch (err) {
    console.warn('Failed to load flags from localStorage:', err);
  }
  return DEFAULT_FLAGS;
}

// Save flags to localStorage
function saveFlags(flags: FeatureFlags): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
  } catch (err) {
    console.warn('Failed to save flags to localStorage:', err);
  }
}

const FlagsContext = createContext<FlagsStore | undefined>(undefined);

export function FlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<FeatureFlags>(loadFlags);

  // Persist to localStorage whenever flags change
  useEffect(() => {
    saveFlags(flags);
  }, [flags]);

  const setFlag = <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
    setFlags((prev) => ({ ...prev, [key]: value }));
  };

  const setUserLevel = (level: UserLevel) => {
    setFlags((prev) => ({ ...prev, userLevel: level }));
  };

  const resetFlags = () => {
    setFlags(DEFAULT_FLAGS);
  };

  return (
    <FlagsContext.Provider
      value={{
        ...flags,
        setFlag,
        setUserLevel,
        resetFlags,
      }}
    >
      {children}
    </FlagsContext.Provider>
  );
}

function useFlagsStoreHook(): FlagsStore {
  const context = useContext(FlagsContext);
  if (!context) {
    throw new Error('useFlagsStore must be used within FlagsProvider');
  }
  return context;
}

/**
 * Hook to get a specific flag value
 */
export function useFlag<K extends keyof FeatureFlags>(key: K): FeatureFlags[K] {
  const store = useFlagsStoreHook();
  return store[key];
}

/**
 * Hook to get all flags
 */
export function useFlags(): FeatureFlags {
  const store = useFlagsStoreHook();
  return {
    userLevel: store.userLevel,
    vb6StrictMode: store.vb6StrictMode,
    vb6Strict: store.vb6Strict,
    showDiagnostics: store.showDiagnostics,
    enableEnergyLogging: store.enableEnergyLogging,
    enableStepTrace: store.enableStepTrace,
  };
}

/**
 * Hook to get current user level
 */
export function useUserLevel(): UserLevel {
  const store = useFlagsStoreHook();
  return store.userLevel;
}

// ============================================================================
// Test-compatible store (for use in non-React test environments)
// ============================================================================

let _testState: FlagsStore | null = null;

/**
 * Create a test-compatible store that can be used outside React context.
 * This is for integration tests that use `require()` and `getState()`.
 */
function createTestStore(): FlagsStore {
  let state = loadFlags();
  
  const store: FlagsStore = {
    ...state,
    setFlag: <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
      state = { ...state, [key]: value };
      Object.assign(store, state);
    },
    setUserLevel: (level: UserLevel) => {
      state = { ...state, userLevel: level };
      Object.assign(store, state);
    },
    resetFlags: () => {
      state = { ...DEFAULT_FLAGS };
      Object.assign(store, state);
    },
  };
  
  return store;
}

/**
 * Hybrid hook/store that works both as a React hook and has getState() for tests.
 * 
 * Usage in React components:
 *   const store = useFlagsStore();
 * 
 * Usage in tests:
 *   const { useFlagsStore } = require('...');
 *   const store = useFlagsStore.getState();
 */
interface UseFlagsStoreHybrid {
  (): FlagsStore;
  getState: () => FlagsStore;
  _reset: () => void;
}

export const useFlagsStore: UseFlagsStoreHybrid = Object.assign(
  // The hook function
  function useFlagsStore(): FlagsStore {
    return useFlagsStoreHook();
  },
  // Static methods for test compatibility
  {
    getState: (): FlagsStore => {
      if (!_testState) {
        _testState = createTestStore();
      }
      return _testState;
    },
    _reset: () => {
      _testState = null;
    },
  }
);
