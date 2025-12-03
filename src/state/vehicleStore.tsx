/**
 * Vehicle Store
 * 
 * Zustand-style store for managing active vehicle selection.
 * Shared between Vehicle Editor and Run Inspector panels.
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadVehicles, saveVehicle, deleteVehicle, type VehicleLite } from './vehicles';

const ACTIVE_VEHICLE_KEY = 'rsa.activeVehicleId.v1';

export interface VehicleStore {
  // State
  vehicles: VehicleLite[];
  activeVehicle: VehicleLite | null;
  activeVehicleId: string | null;
  loading: boolean;
  
  // Actions
  setActiveVehicle: (vehicle: VehicleLite | null) => void;
  setActiveVehicleById: (id: string | null) => void;
  refreshVehicles: () => Promise<void>;
  saveVehicle: (vehicle: VehicleLite) => Promise<void>;
  deleteVehicle: (id: string) => Promise<void>;
}

// Selectors for external use
export const selectActiveVehicle = (s: VehicleStore) => s.activeVehicle;
export const selectSetActiveVehicle = (s: VehicleStore) => s.setActiveVehicle;
export const selectVehicles = (s: VehicleStore) => s.vehicles;
export const selectActiveVehicleId = (s: VehicleStore) => s.activeVehicleId;

const VehicleContext = createContext<VehicleStore | undefined>(undefined);

function loadActiveVehicleId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_VEHICLE_KEY);
  } catch {
    return null;
  }
}

function saveActiveVehicleId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_VEHICLE_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_VEHICLE_KEY);
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function VehicleProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [activeVehicleId, setActiveVehicleIdState] = useState<string | null>(loadActiveVehicleId);
  const [loading, setLoading] = useState(true);

  // Derive active vehicle from id
  const activeVehicle = vehicles.find(v => v.id === activeVehicleId) ?? null;

  // Load vehicles on mount
  useEffect(() => {
    loadVehicles().then(v => {
      setVehicles(v);
      setLoading(false);
    });
  }, []);

  const setActiveVehicleById = useCallback((id: string | null) => {
    setActiveVehicleIdState(id);
    saveActiveVehicleId(id);
  }, []);

  const setActiveVehicle = useCallback((vehicle: VehicleLite | null) => {
    setActiveVehicleById(vehicle?.id ?? null);
  }, [setActiveVehicleById]);

  const refreshVehicles = useCallback(async () => {
    setLoading(true);
    const v = await loadVehicles();
    setVehicles(v);
    setLoading(false);
  }, []);

  const handleSaveVehicle = useCallback(async (vehicle: VehicleLite) => {
    await saveVehicle(vehicle);
    await refreshVehicles();
  }, [refreshVehicles]);

  const handleDeleteVehicle = useCallback(async (id: string) => {
    await deleteVehicle(id);
    if (activeVehicleId === id) {
      setActiveVehicleById(null);
    }
    await refreshVehicles();
  }, [activeVehicleId, setActiveVehicleById, refreshVehicles]);

  return (
    <VehicleContext.Provider
      value={{
        vehicles,
        activeVehicle,
        activeVehicleId,
        loading,
        setActiveVehicle,
        setActiveVehicleById,
        refreshVehicles,
        saveVehicle: handleSaveVehicle,
        deleteVehicle: handleDeleteVehicle,
      }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicleStore(): VehicleStore {
  const context = useContext(VehicleContext);
  if (!context) {
    throw new Error('useVehicleStore must be used within VehicleProvider');
  }
  return context;
}

/**
 * Hook to get just the active vehicle
 */
export function useActiveVehicle(): VehicleLite | null {
  const store = useVehicleStore();
  return store.activeVehicle;
}

/**
 * Hook to get vehicles list
 */
export function useVehicles(): VehicleLite[] {
  const store = useVehicleStore();
  return store.vehicles;
}
