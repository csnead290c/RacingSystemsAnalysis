import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Regression test: persistRunSnapshot must NOT call setVehicle().
 *
 * Root cause of the "updating…" infinite loop:
 *   persistRunSnapshot called setVehicle(updatedVehicle) after a sim run,
 *   which mutated the `vehicle` state dependency of the sim useEffect,
 *   triggering another sim run → another persist → infinite loop.
 *
 * Fix: persistRunSnapshot only calls saveVehicle (fire-and-forget API),
 *   never setVehicle (which would trigger re-render + re-sim).
 */

describe('Predict — persistRunSnapshot regression', () => {
  const predictSource = readFileSync(
    resolve(__dirname, '../Predict.tsx'),
    'utf-8',
  );

  // Extract the persistRunSnapshot function body (ends at next top-level function)
  const fnStart = predictSource.indexOf('function persistRunSnapshot');
  const fnEnd = predictSource.indexOf('\n    function ', fnStart + 1);
  const fnBody = predictSource.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 3000);

  it('persistRunSnapshot does NOT call setVehicle (would cause infinite loop)', () => {
    expect(fnBody).not.toMatch(/setVehicle\s*\(/);
  });

  it('persistRunSnapshot calls saveVehicle (fire-and-forget API persist)', () => {
    expect(fnBody).toMatch(/saveVehicle\s*\(/);
  });

  it('persistRunSnapshot has a comment explaining why setVehicle is avoided', () => {
    expect(fnBody).toMatch(/do NOT call setVehicle/i);
  });
});
