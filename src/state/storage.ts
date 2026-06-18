import type { RunRecordV1 } from '../domain/schemas/run.schema';
import { runsStore } from './runs';

/**
 * Storage interface for run records.
 */
export interface IStorage {
  loadRuns(): Promise<RunRecordV1[]>;
  saveRun(run: RunRecordV1): Promise<void>;
  deleteRun(id: string): Promise<void>;
}

/**
 * Stats and similar-run analysis should only consider real logged runs, not
 * saved prediction scenarios. Helper to filter those out by default.
 */
function isLoggedRun(r: RunRecordV1): boolean {
  return (r.runKind ?? 'logged') !== 'prediction';
}

/**
 * Calculate average 60ft time from historical runs for a vehicle
 */
export async function getAverage60ft(vehicleId: string): Promise<{
  average: number | null;
  count: number;
  best: number | null;
  worst: number | null;
}> {
  const runs = await storage.loadRuns();
  const vehicleRuns = runs.filter(r => isLoggedRun(r) && r.vehicleId === vehicleId && r.sixtyFt && r.sixtyFt > 0);
  
  if (vehicleRuns.length === 0) {
    return { average: null, count: 0, best: null, worst: null };
  }
  
  const sixtyFtTimes = vehicleRuns.map(r => r.sixtyFt!);
  const sum = sixtyFtTimes.reduce((a, b) => a + b, 0);
  const average = sum / sixtyFtTimes.length;
  const best = Math.min(...sixtyFtTimes);
  const worst = Math.max(...sixtyFtTimes);
  
  return {
    average: Math.round(average * 1000) / 1000,
    count: vehicleRuns.length,
    best: Math.round(best * 1000) / 1000,
    worst: Math.round(worst * 1000) / 1000,
  };
}

/**
 * Get run statistics for a vehicle
 */
export async function getVehicleRunStats(vehicleId: string): Promise<{
  totalRuns: number;
  avg60ft: number | null;
  avgET: number | null;
  avgMPH: number | null;
  bestET: number | null;
  bestMPH: number | null;
}> {
  const runs = await storage.loadRuns();
  const vehicleRuns = runs.filter(r => isLoggedRun(r) && r.vehicleId === vehicleId);
  
  if (vehicleRuns.length === 0) {
    return { totalRuns: 0, avg60ft: null, avgET: null, avgMPH: null, bestET: null, bestMPH: null };
  }
  
  const sixtyFtTimes = vehicleRuns.filter(r => r.sixtyFt).map(r => r.sixtyFt!);
  const etTimes = vehicleRuns
    .map(r => r.quarterMileET || r.eighthMileET || r.outcome?.slipET_s)
    .filter((et): et is number => et !== undefined && et > 0);
  const mphValues = vehicleRuns
    .map(r => r.quarterMileMPH || r.eighthMileMPH || r.outcome?.slipMPH)
    .filter((mph): mph is number => mph !== undefined && mph > 0);
  
  return {
    totalRuns: vehicleRuns.length,
    avg60ft: sixtyFtTimes.length > 0 ? Math.round((sixtyFtTimes.reduce((a, b) => a + b, 0) / sixtyFtTimes.length) * 1000) / 1000 : null,
    avgET: etTimes.length > 0 ? Math.round((etTimes.reduce((a, b) => a + b, 0) / etTimes.length) * 1000) / 1000 : null,
    avgMPH: mphValues.length > 0 ? Math.round((mphValues.reduce((a, b) => a + b, 0) / mphValues.length) * 100) / 100 : null,
    bestET: etTimes.length > 0 ? Math.round(Math.min(...etTimes) * 1000) / 1000 : null,
    bestMPH: mphValues.length > 0 ? Math.round(Math.max(...mphValues) * 100) / 100 : null,
  };
}

const STORAGE_KEY = 'rsa.runs.v1';

/**
 * LocalStorage implementation of IStorage.
 * Stores runs in browser localStorage as JSON.
 */
export class LocalStorageStorage implements IStorage {
  async loadRuns(): Promise<RunRecordV1[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        return [];
      }
      const runs = JSON.parse(data);
      return Array.isArray(runs) ? runs : [];
    } catch (error) {
      console.error('Failed to load runs from localStorage:', error);
      return [];
    }
  }

  async saveRun(run: RunRecordV1): Promise<void> {
    try {
      const runs = await this.loadRuns();
      
      // Check if run with this ID already exists
      const existingIndex = runs.findIndex((r) => r.id === run.id);
      
      if (existingIndex >= 0) {
        // Update existing run
        runs[existingIndex] = run;
      } else {
        // Add new run
        runs.push(run);
      }
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
    } catch (error) {
      console.error('Failed to save run to localStorage:', error);
      throw new Error('Failed to save run');
    }
  }

  async deleteRun(id: string): Promise<void> {
    try {
      const runs = await this.loadRuns();
      const filtered = runs.filter((r) => r.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to delete run from localStorage:', error);
      throw new Error('Failed to delete run');
    }
  }
}

/**
 * Default storage instance.
 *
 * Hybrid DB-first store (see `runs.ts`): persists to the server when online and
 * authenticated, with an offline localStorage pending queue. The legacy
 * `LocalStorageStorage` class above is retained for reference/tests only.
 */
export const storage = runsStore;
