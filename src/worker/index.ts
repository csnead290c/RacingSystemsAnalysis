/**
 * Web Worker for quarter-mile predictions.
 * Handles message-based communication with the main thread.
 */

import { predictBaseline } from './pipeline';
import type { PredictRequest } from '../domain/quarter/types';
import { getModel, type PhysicsModelId, type SimInputs, type SimResult } from '../domain/physics';

/**
 * Message envelope for worker communication.
 */
type WorkerMessage =
  | {
      id: string;
      kind: 'quarter';
      payload: PredictRequest;
    }
  | {
      id: string;
      kind: 'physics';
      model: PhysicsModelId;
      payload: SimInputs;
    };

/**
 * Success response envelope.
 */
type WorkerSuccessResponse =
  | {
      id: string;
      ok: true;
      kind: 'quarter';
      result: ReturnType<typeof predictBaseline>;
    }
  | {
      id: string;
      ok: true;
      kind: 'physics';
      result: SimResult;
    };

/**
 * Error response envelope.
 */
interface WorkerErrorResponse {
  id: string;
  ok: false;
  error: string;
}

type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;

/**
 * Handle incoming messages from the main thread.
 */
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  const { id, kind } = message;

  try {
    if (kind === 'quarter') {
      // Execute baseline prediction
      const result = predictBaseline(message.payload);

      // Send success response
      const response: WorkerSuccessResponse = {
        id,
        ok: true,
        kind: 'quarter',
        result,
      };

      self.postMessage(response);
    } else if (kind === 'physics') {
      // Execute physics model simulation
      const model = getModel(message.model);
      const result = model.simulate(message.payload);

      // Send success response
      const response: WorkerSuccessResponse = {
        id,
        ok: true,
        kind: 'physics',
        result,
      };

      self.postMessage(response);
    } else {
      throw new Error(`Unknown message kind: ${kind}`);
    }
  } catch (error) {
    // Send error response
    const errorMessage = error instanceof Error ? error.message : String(error);
    const response: WorkerErrorResponse = {
      id,
      ok: false,
      error: errorMessage,
    };

    self.postMessage(response);
  }
});

// Export types for use in main thread
export type { WorkerMessage, WorkerResponse, WorkerSuccessResponse, WorkerErrorResponse };
