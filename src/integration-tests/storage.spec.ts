/**
 * Integration tests for storage layer.
 * Tests LocalStorageStorage with mocked localStorage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LocalStorageStorage } from '../state/storage';
import type { RunRecordV1 } from '../domain/schemas/run.schema';

describe('LocalStorageStorage', () => {
  let storage: LocalStorageStorage;
  let mockLocalStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    
    // Clear and mock localStorage methods
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      return mockLocalStorage[key] || null;
    });
    
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      mockLocalStorage[key] = value;
    });
    
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
      delete mockLocalStorage[key];
    });

    storage = new LocalStorageStorage();
  });

  it('should load empty array when no runs exist', async () => {
    const runs = await storage.loadRuns();
    expect(runs).toEqual([]);
  });

  it('should save and load runs', async () => {
    const run1: RunRecordV1 = {
      id: 'run-1',
      createdAt: Date.now(),
      vehicleId: 'vehicle-1',
      raceLength: 'QUARTER',
      env: {
        elevation: 0,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 50,
      },
      prediction: {
        et_s: 11.5,
        mph: 120.0,
      },
      outcome: {
        slipET_s: 11.45,
        slipMPH: 121.0,
      },
      increments: [
        { d_ft: 60, t_s: 1.0, v_mph: 50.0 },
        { d_ft: 330, t_s: 5.0, v_mph: 90.0 },
        { d_ft: 660, t_s: 9.0, v_mph: 110.0 },
        { d_ft: 1000, t_s: 10.5, v_mph: 118.0 },
        { d_ft: 1320, t_s: 11.5, v_mph: 120.0 },
      ],
    };

    const run2: RunRecordV1 = {
      id: 'run-2',
      createdAt: Date.now() + 1000,
      vehicleId: 'vehicle-1',
      raceLength: 'EIGHTH',
      env: {
        elevation: 1000,
        temperatureF: 85,
        barometerInHg: 29.5,
        humidityPct: 60,
      },
      prediction: {
        et_s: 7.2,
        mph: 95.0,
      },
      outcome: {
        slipET_s: 7.15,
      },
      increments: [
        { d_ft: 60, t_s: 1.1, v_mph: 45.0 },
        { d_ft: 330, t_s: 4.5, v_mph: 75.0 },
        { d_ft: 660, t_s: 7.2, v_mph: 95.0 },
      ],
    };

    // Save two runs
    await storage.saveRun(run1);
    await storage.saveRun(run2);

    // Load and verify
    const runs = await storage.loadRuns();
    expect(runs).toHaveLength(2);
    expect(runs[0].id).toBe('run-1');
    expect(runs[1].id).toBe('run-2');
  });

  it('should delete a run', async () => {
    const run1: RunRecordV1 = {
      id: 'run-1',
      createdAt: Date.now(),
      vehicleId: 'vehicle-1',
      raceLength: 'QUARTER',
      env: {
        elevation: 0,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 50,
      },
      prediction: {
        et_s: 11.5,
        mph: 120.0,
      },
      outcome: {
        slipET_s: 11.45,
      },
      increments: [],
    };

    const run2: RunRecordV1 = {
      id: 'run-2',
      createdAt: Date.now() + 1000,
      vehicleId: 'vehicle-1',
      raceLength: 'QUARTER',
      env: {
        elevation: 0,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 50,
      },
      prediction: {
        et_s: 11.6,
        mph: 119.0,
      },
      outcome: {
        slipET_s: 11.55,
      },
      increments: [],
    };

    // Save two runs
    await storage.saveRun(run1);
    await storage.saveRun(run2);

    // Verify both exist
    let runs = await storage.loadRuns();
    expect(runs).toHaveLength(2);

    // Delete one run
    await storage.deleteRun('run-1');

    // Verify only one remains
    runs = await storage.loadRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].id).toBe('run-2');
  });

  it('should update existing run with same id', async () => {
    const run: RunRecordV1 = {
      id: 'run-1',
      createdAt: Date.now(),
      vehicleId: 'vehicle-1',
      raceLength: 'QUARTER',
      env: {
        elevation: 0,
        temperatureF: 75,
        barometerInHg: 29.92,
        humidityPct: 50,
      },
      prediction: {
        et_s: 11.5,
        mph: 120.0,
      },
      outcome: {
        slipET_s: 11.45,
      },
      increments: [],
    };

    // Save initial run
    await storage.saveRun(run);

    // Update with same id
    const updatedRun: RunRecordV1 = {
      ...run,
      outcome: {
        slipET_s: 11.40,
        slipMPH: 121.0,
      },
      notes: 'Updated run',
    };

    await storage.saveRun(updatedRun);

    // Verify only one run exists with updated data
    const runs = await storage.loadRuns();
    expect(runs).toHaveLength(1);
    expect(runs[0].outcome?.slipET_s).toBe(11.40);
    expect(runs[0].outcome?.slipMPH).toBe(121.0);
    expect(runs[0].notes).toBe('Updated run');
  });

  it('should handle corrupted data gracefully', async () => {
    // Set invalid JSON
    mockLocalStorage['rsa.runs.v1'] = 'invalid json{';

    const runs = await storage.loadRuns();
    expect(runs).toEqual([]);
  });

  it('should handle non-array data gracefully', async () => {
    // Set valid JSON but not an array
    mockLocalStorage['rsa.runs.v1'] = JSON.stringify({ not: 'an array' });

    const runs = await storage.loadRuns();
    expect(runs).toEqual([]);
  });
});
