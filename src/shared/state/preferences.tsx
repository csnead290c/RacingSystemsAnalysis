/**
 * User Preferences Context
 * 
 * Manages user preferences with API persistence and localStorage fallback.
 * Includes product mode selection (Pro users can use Jr mode).
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, type UserPreferences } from '../../services/api';

interface PreferencesContextType {
  preferences: UserPreferences;
  isLoading: boolean;
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  // Convenience getters
  productMode: 'pro' | 'jr';
  setProductMode: (mode: 'pro' | 'jr') => Promise<void>;
}

const STORAGE_KEY = 'rsa.preferences';

const defaultPreferences: UserPreferences = {
  productMode: 'pro',
  theme: 'system',
  units: 'imperial',
  defaultRaceLength: 'QUARTER',
};

const PreferencesContext = createContext<PreferencesContextType | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    // Load from localStorage initially
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? { ...defaultPreferences, ...JSON.parse(stored) } : defaultPreferences;
    } catch {
      return defaultPreferences;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from API on mount
  useEffect(() => {
    const loadFromApi = async () => {
      try {
        const response = await authApi.getPreferences();
        const merged = { ...defaultPreferences, ...response.preferences };
        setPreferences(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch (error) {
        // API failed, use localStorage values
        console.warn('Failed to load preferences from API:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadFromApi();
  }, []);

  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...prefs };
    setPreferences(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    
    try {
      await authApi.updatePreferences(prefs);
    } catch (error) {
      console.warn('Failed to save preferences to API:', error);
    }
  }, [preferences]);

  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    await updatePreferences({ [key]: value });
  }, [updatePreferences]);

  const setProductMode = useCallback(async (mode: 'pro' | 'jr') => {
    await updatePreference('productMode', mode);
  }, [updatePreference]);

  return (
    <PreferencesContext.Provider value={{
      preferences,
      isLoading,
      updatePreference,
      updatePreferences,
      productMode: preferences.productMode || 'pro',
      setProductMode,
    }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
