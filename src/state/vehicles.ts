/**
 * Vehicle storage layer using API with localStorage fallback.
 */

import type { Vehicle } from '../domain/schemas/vehicle.schema';
import { vehiclesApi } from '../services/api';

export type VehicleLite = Vehicle & {
  is_public?: boolean;
  is_owner?: boolean;
  owner_name?: string;
};

const STORAGE_KEY = 'rsa.vehicles.v1';

/**
 * Load all vehicles from API (falls back to localStorage if API fails).
 */
export async function loadVehicles(): Promise<VehicleLite[]> {
  try {
    // Try API first
    console.log('loadVehicles: Fetching from API...');
    const response = await vehiclesApi.getAll();
    console.log('loadVehicles: API response:', response);
    const vehicles = response.vehicles.map(v => ({
      ...v.data,
      id: v.id,
      name: v.name,
      is_public: v.is_public,
      is_owner: v.is_owner,
      owner_name: v.owner_name,
    }));
    console.log('loadVehicles: Mapped vehicles:', vehicles);
    return vehicles;
  } catch (error) {
    console.warn('loadVehicles: API failed, falling back to localStorage:', error);
    // Fall back to localStorage for offline/dev
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const vehicles = JSON.parse(data);
      return Array.isArray(vehicles) ? vehicles : [];
    } catch {
      return [];
    }
  }
}

/**
 * Save a vehicle (upsert by id).
 */
export async function saveVehicle(vehicle: VehicleLite): Promise<void> {
  // Extract metadata
  const { id, name, is_public, is_owner, owner_name, ...data } = vehicle;
  
  // Try API first
  try {
    // Try to update first (if vehicle exists)
    await vehiclesApi.update(id, { name, data, is_public });
    console.log('Vehicle updated via API:', id);
    return;
  } catch (updateError: any) {
    // If 404, vehicle doesn't exist - create it
    if (updateError.message?.includes('not found') || updateError.message?.includes('404')) {
      try {
        const response = await vehiclesApi.create({ name, data, is_public });
        console.log('Vehicle created via API:', response.vehicle?.id);
        // Update local id if API assigned a new one
        if (response.vehicle?.id && response.vehicle.id !== id) {
          vehicle.id = response.vehicle.id;
        }
        return;
      } catch (createError) {
        console.warn('API create failed:', createError);
      }
    } else {
      console.warn('API update failed:', updateError);
    }
  }
  
  // Fall back to localStorage
  console.log('Falling back to localStorage for vehicle save');
  const vehicles = await loadVehiclesFromStorage();
  const existingIndex = vehicles.findIndex((v) => v.id === vehicle.id);
  if (existingIndex >= 0) {
    vehicles[existingIndex] = vehicle;
  } else {
    vehicles.push(vehicle);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
}

/**
 * Delete a vehicle by id.
 */
export async function deleteVehicle(id: string): Promise<void> {
  try {
    await vehiclesApi.delete(id);
  } catch (error) {
    console.warn('API delete failed, falling back to localStorage:', error);
    // Fall back to localStorage
    const vehicles = await loadVehiclesFromStorage();
    const filtered = vehicles.filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}

/**
 * Helper to load from localStorage only
 */
async function loadVehiclesFromStorage(): Promise<VehicleLite[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const vehicles = JSON.parse(data);
    return Array.isArray(vehicles) ? vehicles : [];
  } catch {
    return [];
  }
}
