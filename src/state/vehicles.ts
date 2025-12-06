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
    const response = await vehiclesApi.getAll();
    const vehicles = response.vehicles.map(v => ({
      ...v.data,
      id: v.id,
      name: v.name,
      is_public: v.is_public,
      is_owner: v.is_owner,
      owner_name: v.owner_name,
    }));
    return vehicles;
  } catch (error) {
    console.warn('API failed, falling back to localStorage:', error);
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
  try {
    // Extract metadata
    const { id, name, is_public, is_owner, owner_name, ...data } = vehicle;
    
    // Check if vehicle exists in API
    try {
      await vehiclesApi.get(id);
      // Update existing
      await vehiclesApi.update(id, { name, data, is_public });
    } catch {
      // Create new
      const response = await vehiclesApi.create({ name, data, is_public });
      // Update local id if API assigned a new one
      if (response.vehicle?.id && response.vehicle.id !== id) {
        vehicle.id = response.vehicle.id;
      }
    }
  } catch (error) {
    console.warn('API save failed, falling back to localStorage:', error);
    // Fall back to localStorage
    const vehicles = await loadVehiclesFromStorage();
    const existingIndex = vehicles.findIndex((v) => v.id === vehicle.id);
    if (existingIndex >= 0) {
      vehicles[existingIndex] = vehicle;
    } else {
      vehicles.push(vehicle);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  }
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
