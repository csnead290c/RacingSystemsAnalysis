/**
 * Vehicle storage layer using localStorage.
 */

import type { Vehicle } from '../domain/schemas/vehicle.schema';

export type VehicleLite = Vehicle;

const STORAGE_KEY = 'rsa.vehicles.v1';

/**
 * Load all vehicles from localStorage.
 */
export async function loadVehicles(): Promise<VehicleLite[]> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }
    
    const vehicles = JSON.parse(data);
    return Array.isArray(vehicles) ? vehicles : [];
  } catch (error) {
    console.error('Failed to load vehicles:', error);
    return [];
  }
}

/**
 * Save a vehicle (upsert by id).
 * If vehicle with same id exists, updates it. Otherwise, adds new.
 */
export async function saveVehicle(vehicle: VehicleLite): Promise<void> {
  try {
    const vehicles = await loadVehicles();
    
    // Find existing vehicle index
    const existingIndex = vehicles.findIndex((v) => v.id === vehicle.id);
    
    if (existingIndex >= 0) {
      // Update existing
      vehicles[existingIndex] = vehicle;
    } else {
      // Add new
      vehicles.push(vehicle);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicles));
  } catch (error) {
    console.error('Failed to save vehicle:', error);
    throw new Error('Failed to save vehicle');
  }
}

/**
 * Delete a vehicle by id.
 */
export async function deleteVehicle(id: string): Promise<void> {
  try {
    const vehicles = await loadVehicles();
    const filtered = vehicles.filter((v) => v.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete vehicle:', error);
    throw new Error('Failed to delete vehicle');
  }
}
