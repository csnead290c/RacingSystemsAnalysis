import { useState, useCallback, useEffect } from 'react';

const LS_KEY = 'parity_classPreset';
const URL_PARAM = 'classPreset';
const LEGACY_URL_PARAM = 'class';
const LEGACY_LS_KEY = 'parity_classIndex';
const DEFAULT_CLASS = 'TF';

// ── Category preset (new: filters by human-readable category) ────────

const CAT_LS_KEY = 'parity_categoryPreset';
const CAT_URL_PARAM = 'category';
const DEFAULT_CATEGORY = 'Top Fuel';

/**
 * Normalize a category string for case/whitespace-insensitive comparison.
 * "Top Fuel", "TOP FUEL", "top  fuel " → "TOP FUEL"
 */
export function normalizeCategory(cat: string): string {
  return cat.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Map from class_index abbreviations to known human-readable category names.
 * Used for backward-compat: if someone has ?classPreset=TF in their URL,
 * we migrate to ?category=Top Fuel.
 */
export const CLASS_TO_CATEGORY: Record<string, string> = {
  TF: 'Top Fuel',
  FC: 'Funny Car',
  PRO: 'Pro Stock',
  PSM: 'Pro Stock Motorcycle',
  PM: 'Pro Mod',
  TAD: 'Top Alcohol Dragster',
  TAFC: 'Top Alcohol Funny Car',
};

export const CATEGORY_TO_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(CLASS_TO_CATEGORY).map(([k, v]) => [v, k])
);

// Normalized lookup: uppercase category → classIndex (e.g. 'TOP FUEL' → 'TF')
const NORMALIZED_CAT_TO_CLASS: Record<string, string> = Object.fromEntries(
  Object.entries(CLASS_TO_CATEGORY).map(([k, v]) => [normalizeCategory(v), k])
);

/**
 * Resolve classIndex from a category string, case/whitespace insensitive.
 * Uses the hardcoded map first; if that fails, searches an optional
 * eventCategories list (live data from the backend) for a match.
 */
export function resolveClassIndex(
  category: string,
  eventCategories?: { category: string | null; class_index: string }[],
): string | null {
  // 1) Hardcoded map (normalized)
  const norm = normalizeCategory(category);
  const fromMap = NORMALIZED_CAT_TO_CLASS[norm];
  if (fromMap) return fromMap;

  // 2) Live eventCategories list
  if (eventCategories) {
    const match = eventCategories.find(
      ec => normalizeCategory(ec.category || '') === norm
    );
    if (match?.class_index) return match.class_index;
  }

  // 3) No mapping found
  return null;
}

/**
 * Global category preset for the Parity Suite.
 * Priority: URL ?category=X > legacy ?classPreset=X (mapped) > localStorage > default.
 *
 * Returns [category, setCategory, classIndex] where classIndex is the reverse-mapped
 * abbreviation (or the category string itself if no mapping exists).
 */
export function useCategoryPreset(): [string, (cat: string) => void, string] {
  const [category, setCategoryState] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);

    // 1) New URL param ?category= wins
    const fromCat = params.get(CAT_URL_PARAM);
    if (fromCat) {
      localStorage.setItem(CAT_LS_KEY, fromCat);
      return fromCat;
    }

    // 2) Legacy URL params ?classPreset= or ?class= — migrate to category
    const fromClassPreset = params.get(URL_PARAM) || params.get(LEGACY_URL_PARAM);
    if (fromClassPreset) {
      const mapped = CLASS_TO_CATEGORY[fromClassPreset] || fromClassPreset;
      localStorage.setItem(CAT_LS_KEY, mapped);
      // Migrate URL
      params.delete(URL_PARAM);
      params.delete(LEGACY_URL_PARAM);
      params.set(CAT_URL_PARAM, mapped);
      const migrated = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', migrated);
      return mapped;
    }

    // 3) localStorage: new key, then legacy keys (mapped)
    const stored = localStorage.getItem(CAT_LS_KEY);
    if (stored) return stored;
    const legacyStored = localStorage.getItem(LS_KEY) || localStorage.getItem(LEGACY_LS_KEY);
    if (legacyStored) {
      const mapped = CLASS_TO_CATEGORY[legacyStored] || legacyStored;
      localStorage.setItem(CAT_LS_KEY, mapped);
      return mapped;
    }

    // 4) Default
    return DEFAULT_CATEGORY;
  });

  // Sync URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(CAT_URL_PARAM) !== category) {
      params.delete(URL_PARAM);
      params.delete(LEGACY_URL_PARAM);
      params.set(CAT_URL_PARAM, category);
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cross-component sync via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === CAT_LS_KEY && e.newValue && e.newValue !== category) {
        setCategoryState(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [category]);

  const setCategory = useCallback((cat: string) => {
    setCategoryState(cat);
    localStorage.setItem(CAT_LS_KEY, cat);
    const params = new URLSearchParams(window.location.search);
    params.delete(URL_PARAM);
    params.delete(LEGACY_URL_PARAM);
    params.set(CAT_URL_PARAM, cat);
    const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Derive classIndex for backward-compat with report endpoints (case-insensitive)
  const classIndex = resolveClassIndex(category) || category;

  return [category, setCategory, classIndex];
}

/**
 * @deprecated Use useCategoryPreset() instead. Kept for backward compatibility.
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
