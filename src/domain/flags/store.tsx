/**
 * Feature Flags Store
 * 
 * Centralized feature flag management with localStorage persistence.
 * Flags control development features, diagnostics, and experimental modes.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface FeatureFlags {
  // VB6 Strict Mode: Require complete VB6 fixture for simulation (no defaults/heuristics)
  vb6StrictMode: boolean;
  
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
  resetFlags: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
  vb6StrictMode: false,
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

  const resetFlags = () => {
    setFlags(DEFAULT_FLAGS);
  };

  return (
    <FlagsContext.Provider
      value={{
        ...flags,
        setFlag,
        resetFlags,
      }}
    >
      {children}
    </FlagsContext.Provider>
  );
}

export function useFlagsStore(): FlagsStore {
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
  const store = useFlagsStore();
  return store[key];
}

/**
 * Hook to get all flags
 */
export function useFlags(): FeatureFlags {
  const store = useFlagsStore();
  return {
    vb6StrictMode: store.vb6StrictMode,
    showDiagnostics: store.showDiagnostics,
    enableEnergyLogging: store.enableEnergyLogging,
    enableStepTrace: store.enableStepTrace,
  };
}
