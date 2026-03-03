import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'parity_classPreset';
const URL_PARAM = 'classPreset';
const LEGACY_URL_PARAM = 'class';
const LEGACY_LS_KEY = 'parity_classIndex';
const DEFAULT_CLASS = 'TF';

/**
 * Global class preset for the Parity Suite.
 * Priority: URL ?classPreset=XX > legacy ?class=XX > localStorage > default ('TF').
 *
 * - On init, migrates legacy ?class= param to ?classPreset= via replaceState.
 * - On init, migrates legacy localStorage key parity_classIndex to parity_classPreset.
 * - On change, writes to both URL (replaceState) and localStorage.
 * - Consumers share state via localStorage + storage event so multiple
 *   mounted instances stay in sync.
 */
export function useClassPreset(): [string, (cls: string) => void] {
  const [classIndex, setClassIndexState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    // 1) New URL param wins
    const fromNew = params.get(URL_PARAM);
    if (fromNew) {
      localStorage.setItem(LS_KEY, fromNew);
      return fromNew;
    }
    // 2) Legacy URL param — migrate
    const fromLegacy = params.get(LEGACY_URL_PARAM);
    if (fromLegacy) {
      localStorage.setItem(LS_KEY, fromLegacy);
      // migrate URL: remove old, set new
      params.delete(LEGACY_URL_PARAM);
      params.set(URL_PARAM, fromLegacy);
      const migrated = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', migrated);
      return fromLegacy;
    }
    // 3) localStorage (new key first, then legacy)
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored;
    const legacyStored = localStorage.getItem(LEGACY_LS_KEY);
    if (legacyStored) {
      localStorage.setItem(LS_KEY, legacyStored);
      localStorage.removeItem(LEGACY_LS_KEY);
      return legacyStored;
    }
    // 4) Default
    return DEFAULT_CLASS;
  });

  // Sync URL on mount (if URL didn't have it, push current value)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(URL_PARAM) !== classIndex) {
      params.delete(LEGACY_URL_PARAM);
      params.set(URL_PARAM, classIndex);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for cross-component sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === LS_KEY && e.newValue && e.newValue !== classIndex) {
        setClassIndexState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [classIndex]);

  const setClassIndex = useCallback((cls: string) => {
    setClassIndexState(cls);
    localStorage.setItem(LS_KEY, cls);
    // Update URL param
    const params = new URLSearchParams(window.location.search);
    params.delete(LEGACY_URL_PARAM);
    params.set(URL_PARAM, cls);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  return [classIndex, setClassIndex];
}
