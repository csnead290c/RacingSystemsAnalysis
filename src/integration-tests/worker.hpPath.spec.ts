/**
 * Integration test for worker HP path normalization.
 * Verifies that VB6 engineHP is correctly normalized and simulated.
 * 
 * NOTE: These tests require a real Web Worker environment (browser).
 * They are skipped in Node.js test environment where Worker is stubbed.
 */

import { simulate } from '../workerBridge';

const fixture = {
  engineHP: [
    [7000, 1220], [7200, 1235], [7400, 1248], [7600, 1258],
    [7800, 1266], [8000, 1272], [8200, 1276], [8400, 1278],
    [8600, 1279], [8800, 1278], [9000, 1276], [9200, 1272],
    [9400, 1266], [9500, 1263],
  ],
  drivetrain: { gearRatios: [2.6, 1.9, 1.5, 1.2, 1.0], shiftRPM: [9400, 9400, 9400, 9400] },
  fuel: { hpTorqueMultiplier: 1 },
  raceLengthFt: 1320,
};

// These tests require a real Web Worker that processes messages.
// Skip in vitest/node environment - run manually in browser or with playwright.
describe.skip('Worker HP path', () => {
  it('normalizes VB6 engineHP and simulates without error', async () => {
    const res = await simulate('RSACLASSIC', fixture as any);
    expect(res).toBeTruthy();
    expect(res.et_s).toBeGreaterThan(0);
    expect(res.mph).toBeGreaterThan(0);
  });

  it('handles engineHP with hpTorqueMultiplier', async () => {
    const fixtureWithMultiplier = {
      ...fixture,
      fuel: { hpTorqueMultiplier: 1.05 },
    };
    const res = await simulate('RSACLASSIC', fixtureWithMultiplier as any);
    expect(res).toBeTruthy();
    expect(res.et_s).toBeGreaterThan(0);
    expect(res.mph).toBeGreaterThan(0);
  });

  it('rejects when engineHP is missing', async () => {
    const badFixture = {
      drivetrain: { gearRatios: [2.6, 1.9, 1.5, 1.2, 1.0], shiftRPM: [9400, 9400, 9400, 9400] },
      raceLengthFt: 1320,
    };
    await expect(simulate('RSACLASSIC', badFixture as any)).rejects.toThrow();
  });

  it('rejects when engineHP has too few points', async () => {
    const badFixture = {
      engineHP: [[7000, 1220]], // Only 1 point
      drivetrain: { gearRatios: [2.6, 1.9, 1.5, 1.2, 1.0], shiftRPM: [9400, 9400, 9400, 9400] },
      raceLengthFt: 1320,
    };
    await expect(simulate('RSACLASSIC', badFixture as any)).rejects.toThrow();
  });
});
