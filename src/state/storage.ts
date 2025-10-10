import type { RunRecordV1 } from '../domain/schemas/run.schema';

/**
 * Storage interface for run records.
 */
export interface IStorage {
  loadRuns(): Promise<RunRecordV1[]>;
  saveRun(run: RunRecordV1): Promise<void>;
  deleteRun(id: string): Promise<void>;
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
 */
export const storage = new LocalStorageStorage();
