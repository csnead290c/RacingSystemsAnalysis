import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Env } from '../../domain/schemas/env.schema';
import type { RaceLength } from '../../domain/config/raceLengths';

/** A saved simulation run */
export interface SavedRun {
  id: string;
  timestamp: number;
  vehicleName: string;
  vehicleId: string;
  raceLength: RaceLength;
  env: Env;
  result: {
    et_s: number;
    mph: number;
  };
  hpAdjust: number;
  weightAdjust: number;
  notes?: string;
}

interface RunHistoryContextValue {
  runs: SavedRun[];
  saveRun: (run: Omit<SavedRun, 'id' | 'timestamp'>) => SavedRun;
  deleteRun: (id: string) => void;
  clearHistory: () => void;
  getRecentRuns: (limit?: number) => SavedRun[];
}

const RunHistoryContext = createContext<RunHistoryContextValue | null>(null);

const STORAGE_KEY = 'rsa_run_history';
const MAX_RUNS = 50;

function loadRunsFromStorage(): SavedRun[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('Failed to load run history:', e);
  }
  return [];
}

function saveRunsToStorage(runs: SavedRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (e) {
    console.warn('Failed to save run history:', e);
  }
}

export function RunHistoryProvider({ children }: { children: ReactNode }) {
  const [runs, setRuns] = useState<SavedRun[]>(() => loadRunsFromStorage());

  const saveRun = useCallback((runData: Omit<SavedRun, 'id' | 'timestamp'>): SavedRun => {
    const newRun: SavedRun = {
      ...runData,
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
    };
    
    setRuns(prev => {
      // Add new run at the beginning, limit to MAX_RUNS
      const updated = [newRun, ...prev].slice(0, MAX_RUNS);
      saveRunsToStorage(updated);
      return updated;
    });
    
    return newRun;
  }, []);

  const deleteRun = useCallback((id: string) => {
    setRuns(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveRunsToStorage(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setRuns([]);
    saveRunsToStorage([]);
  }, []);

  const getRecentRuns = useCallback((limit = 10) => {
    return runs.slice(0, limit);
  }, [runs]);

  return (
    <RunHistoryContext.Provider value={{ runs, saveRun, deleteRun, clearHistory, getRecentRuns }}>
      {children}
    </RunHistoryContext.Provider>
  );
}

export function useRunHistory() {
  const context = useContext(RunHistoryContext);
  if (!context) {
    throw new Error('useRunHistory must be used within a RunHistoryProvider');
  }
  return context;
}
