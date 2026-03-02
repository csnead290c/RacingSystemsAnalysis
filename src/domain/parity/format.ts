/**
 * Shared formatting helpers for parity report values.
 *
 * Rules:
 *   ET (elapsed time):  3 decimals
 *   MPH:                2 decimals
 *   Baro inHg:          2 decimals
 *   HPC:                3 decimals
 *   Temp °F:            1 decimal
 *   RH %:               1 decimal
 *   Density Alt ft:     0 decimals (integer)
 *   RT (reaction time): 3 decimals
 */

const DASH = '—';

/** ET / elapsed times: 3 decimals */
export function formatET(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : DASH;
}

/** MPH: 2 decimals */
export function formatMPH(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : DASH;
}

/** Barometric pressure inHg: 2 decimals */
export function formatBaro(v: number | null | undefined): string {
  return v != null ? v.toFixed(2) : DASH;
}

/** HPC (horsepower correction): 3 decimals */
export function formatHPC(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : DASH;
}

/** Temperature °F: 1 decimal */
export function formatTemp(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : DASH;
}

/** Relative humidity %: 1 decimal */
export function formatRH(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : DASH;
}

/** Density altitude ft: integer */
export function formatDA(v: number | null | undefined): string {
  return v != null ? Math.round(v).toString() : DASH;
}

/** Reaction time: 3 decimals */
export function formatRT(v: number | null | undefined): string {
  return v != null ? v.toFixed(3) : DASH;
}

/**
 * Context-aware metric formatter.
 * Detects whether the metric key is ET-like or MPH-like and uses the correct decimal count.
 */
export function formatMetric(v: number | null | undefined, metricKey: string): string {
  if (v == null) return DASH;
  if (isMphMetric(metricKey)) return formatMPH(v);
  return formatET(v);
}

/**
 * Format a delta value with sign prefix. Uses metric-aware decimals.
 */
export function formatDelta(v: number | null | undefined, metricKey: string): string {
  if (v == null) return DASH;
  const formatted = isMphMetric(metricKey) ? v.toFixed(2) : v.toFixed(3);
  return (v > 0 ? '+' : '') + formatted;
}

/** Is the metric key an MPH column? */
export function isMphMetric(metricKey: string): boolean {
  return metricKey.startsWith('mph_') || metricKey.endsWith('mph') || metricKey === 'mph';
}

/** Is the incremental row key an MPH row? */
export function isIncrementalMph(key: string): boolean {
  return key.toLowerCase().includes('mph');
}
