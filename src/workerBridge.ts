/**
 * Bridge between main thread and Web Worker for quarter-mile predictions.
 * Provides a Promise-based API with timeout and cleanup.
 */

import type { PredictRequest, PredictResult } from './domain/quarter/types';
import type { WorkerResponse } from './worker/index';
import type { PhysicsModelId, SimInputs, SimResult } from './domain/physics';

/**
 * Calculate quarter-mile prediction using a Web Worker.
 * 
 * @param req - Prediction request
 * @param onProgress - Optional progress callback (0-1)
 * @returns Promise resolving to prediction result
 * @throws Error if worker fails or times out
 */
export async function calculate(
  req: PredictRequest,
  onProgress?: (n: number) => void
): Promise<PredictResult> {
  return new Promise((resolve, reject) => {
    // Generate unique message ID
    const messageId = `calc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create worker
    const worker = new Worker(
      new URL('./worker/index.ts', import.meta.url),
      { type: 'module' }
    );

    // 30 second timeout
    const timeoutMs = 30000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    // Cleanup function
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      worker.terminate();
    };

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Worker calculation timed out after 30s'));
      }
    }, timeoutMs);

    // Handle worker messages
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      // Ignore messages with different IDs
      if (response.id !== messageId) {
        return;
      }

      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (response.ok && response.kind === 'quarter') {
        resolve(response.result);
      } else if (response.ok) {
        reject(new Error('Unexpected response kind'));
      } else {
        reject(new Error(`Worker error: ${response.error}`));
      }
    };

    // Handle worker errors
    const handleError = (error: ErrorEvent) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Attach listeners
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Optional progress simulation (worker doesn't report progress yet)
    if (onProgress) {
      onProgress(0);
      const progressInterval = setInterval(() => {
        if (settled) {
          clearInterval(progressInterval);
        } else {
          onProgress(0.5); // Placeholder progress
        }
      }, 100);
    }

    // Send request to worker
    worker.postMessage({
      id: messageId,
      kind: 'quarter',
      payload: req,
    });
  });
}

/**
 * Run physics model simulation using a Web Worker.
 * 
 * @param model - Physics model ID to use
 * @param input - Simulation inputs
 * @returns Promise resolving to simulation result
 * @throws Error if worker fails or times out
 */
export async function simulate(
  model: PhysicsModelId,
  input: SimInputs
): Promise<SimResult> {
  return new Promise((resolve, reject) => {
    // Generate unique message ID
    const messageId = `sim-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Create worker
    const worker = new Worker(
      new URL('./worker/index.ts', import.meta.url),
      { type: 'module' }
    );

    // 30 second timeout
    const timeoutMs = 30000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let settled = false;

    // Cleanup function
    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      worker.terminate();
    };

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('Worker simulation timed out after 30s'));
      }
    }, timeoutMs);

    // Handle worker messages
    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data;

      // Ignore messages with different IDs
      if (response.id !== messageId) {
        return;
      }

      if (settled) {
        return;
      }

      settled = true;
      cleanup();

      if (response.ok && response.kind === 'physics') {
        resolve(response.result);
      } else if (response.ok) {
        reject(new Error('Unexpected response kind'));
      } else {
        reject(new Error(`Worker error: ${response.error}`));
      }
    };

    // Handle worker errors
    const handleError = (error: ErrorEvent) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new Error(`Worker error: ${error.message}`));
    };

    // Attach listeners
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Debug: verify input before sending
    console.debug('[BRIDGE → WORKER]', {
      model,
      hasEngineParams: !!(input as any)?.engineParams,
      hasPowerHP: !!(input as any)?.engineParams?.powerHP,
      powerHP_2: (input as any)?.engineParams?.powerHP?.slice?.(0, 2),
    });

    // Send request to worker with flat input envelope
    worker.postMessage({
      id: messageId,
      kind: 'physics',
      model: model,
      payload: input,
    });
  });
}
