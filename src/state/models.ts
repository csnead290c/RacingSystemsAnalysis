/**
 * Persistence layer for vehicle learning models.
 * Stores models in localStorage per vehicle ID.
 */

import type { VehicleModel } from '../domain/learning/model';

const STORAGE_KEY_PREFIX = 'rsa.model.';

/**
 * Get a vehicle's learning model from localStorage.
 * 
 * @param vehicleId - Vehicle identifier
 * @returns Model if exists, undefined otherwise
 */
export function getModel(vehicleId: string): VehicleModel | undefined {
  try {
    const key = STORAGE_KEY_PREFIX + vehicleId;
    const data = localStorage.getItem(key);
    
    if (!data) {
      return undefined;
    }
    
    const model = JSON.parse(data) as VehicleModel;
    
    // Validate model structure
    if (!model.w || !model.P || typeof model.n !== 'number') {
      console.warn(`Invalid model structure for vehicle ${vehicleId}`);
      return undefined;
    }
    
    return model;
  } catch (error) {
    console.error(`Failed to load model for vehicle ${vehicleId}:`, error);
    return undefined;
  }
}

/**
 * Save a vehicle's learning model to localStorage.
 * 
 * @param vehicleId - Vehicle identifier
 * @param model - Model to save
 */
export function saveModel(vehicleId: string, model: VehicleModel): void {
  try {
    const key = STORAGE_KEY_PREFIX + vehicleId;
    const data = JSON.stringify(model);
    localStorage.setItem(key, data);
  } catch (error) {
    console.error(`Failed to save model for vehicle ${vehicleId}:`, error);
    throw new Error('Failed to save model');
  }
}

/**
 * Delete a vehicle's learning model from localStorage.
 * 
 * @param vehicleId - Vehicle identifier
 */
export function deleteModel(vehicleId: string): void {
  try {
    const key = STORAGE_KEY_PREFIX + vehicleId;
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Failed to delete model for vehicle ${vehicleId}:`, error);
  }
}

/**
 * List all vehicle IDs that have stored models.
 * 
 * @returns Array of vehicle IDs
 */
export function listModels(): string[] {
  try {
    const vehicleIds: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        const vehicleId = key.substring(STORAGE_KEY_PREFIX.length);
        vehicleIds.push(vehicleId);
      }
    }
    
    return vehicleIds;
  } catch (error) {
    console.error('Failed to list models:', error);
    return [];
  }
}
