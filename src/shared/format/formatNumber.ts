/**
 * Shared number formatting helpers for UI display.
 *
 * Default rule: avoid more than 1–2 decimals unless explicitly needed.
 * All helpers handle NaN / undefined / null gracefully → return "—".
 */

/** Format a number to a fixed number of decimal places. Returns "—" for non-finite values. */
export function formatFixed(value: number | null | undefined, decimals: number): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(decimals);
}

/** Horsepower: 1 decimal (e.g. "461.3") */
export function formatHp(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  // Whole numbers don't need decimals
  return Number.isInteger(value) ? String(value) : formatFixed(value, 1);
}

/** Weight in pounds: whole number (e.g. "2350") */
export function formatLb(value: number | null | undefined): string {
  return formatFixed(value, 0);
}

/** Dimension in inches: 1 decimal (e.g. "32.8") */
export function formatIn(value: number | null | undefined): string {
  return formatFixed(value, 1);
}

/** RPM: whole number (e.g. "6500") */
export function formatRpm(value: number | null | undefined): string {
  return formatFixed(value, 0);
}

/** Ratio: 2 decimals (e.g. "3.55") */
export function formatRatio(value: number | null | undefined): string {
  return formatFixed(value, 2);
}

/** ET in seconds: 2 decimals by default (e.g. "9.85") */
export function formatET(value: number | null | undefined, decimals = 2): string {
  return formatFixed(value, decimals);
}

/** MPH: 1 decimal by default (e.g. "138.4") */
export function formatMph(value: number | null | undefined, decimals = 1): string {
  return formatFixed(value, decimals);
}
