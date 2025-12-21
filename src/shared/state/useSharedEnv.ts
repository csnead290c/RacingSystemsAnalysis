/**
 * Shared Environment State Hook
 * 
 * Persists environment variables (weather inputs) to localStorage so they
 * can be shared between ET Sim (Predict) and Race Day Dashboard.
 * 
 * When a user enters weather data on one page, it will persist when they
 * navigate to the other page.
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'rsa_shared_env';

export interface SharedEnv {
  temperatureF: number;
  barometerInHg: number;
  humidityPct: number;
  elevation: number;
  trackTempF?: number;
  tractionIndex?: number;
  windMph?: number;
  windAngleDeg?: number;
}

const DEFAULT_SHARED_ENV: SharedEnv = {
  temperatureF: 75,
  barometerInHg: 29.92,
  humidityPct: 50,
  elevation: 0,
  trackTempF: undefined,
  tractionIndex: undefined,
  windMph: undefined,
  windAngleDeg: undefined,
};

/**
 * Load environment from localStorage
 */
function loadEnv(): SharedEnv {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_SHARED_ENV, ...parsed };
    }
  } catch (err) {
    console.warn('Failed to load shared env:', err);
  }
  return DEFAULT_SHARED_ENV;
}

/**
 * Save environment to localStorage
 */
function saveEnv(env: SharedEnv): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(env));
  } catch (err) {
    console.warn('Failed to save shared env:', err);
  }
}

/**
 * Hook for shared environment state
 * 
 * Usage:
 * ```tsx
 * const { env, setEnv, updateEnv } = useSharedEnv();
 * 
 * // Update a single field
 * updateEnv('temperatureF', 80);
 * 
 * // Update multiple fields
 * setEnv(prev => ({ ...prev, temperatureF: 80, humidityPct: 60 }));
 * ```
 */
export function useSharedEnv() {
  const [env, setEnvState] = useState<SharedEnv>(loadEnv);
  
  // Save to localStorage whenever env changes
  useEffect(() => {
    saveEnv(env);
  }, [env]);
  
  // Helper to update a single field
  const updateEnv = useCallback(<K extends keyof SharedEnv>(field: K, value: SharedEnv[K]) => {
    setEnvState(prev => ({ ...prev, [field]: value }));
  }, []);
  
  // Wrapper for setEnv that maintains the same API as useState
  const setEnv = useCallback((
    updater: SharedEnv | ((prev: SharedEnv) => SharedEnv)
  ) => {
    if (typeof updater === 'function') {
      setEnvState(updater);
    } else {
      setEnvState(updater);
    }
  }, []);
  
  // Merge external env data (e.g., from weather API)
  const mergeEnv = useCallback((updates: Partial<SharedEnv>) => {
    setEnvState(prev => ({ ...prev, ...updates }));
  }, []);
  
  return {
    env,
    setEnv,
    updateEnv,
    mergeEnv,
  };
}

export default useSharedEnv;
