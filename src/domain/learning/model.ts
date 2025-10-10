/**
 * Recursive Least Squares (RLS) model for adaptive ET correction.
 * Learns vehicle-specific corrections over time.
 */

/**
 * Vehicle-specific learning model using RLS.
 */
export interface VehicleModel {
  /** Weight vector (parameters) */
  w: number[];
  /** Covariance matrix */
  P: number[][];
  /** Number of updates */
  n: number;
  /** Model confidence (0-1) */
  confidence: number;
}

/**
 * Create a new RLS model with specified dimension.
 * Initializes weights to zero and covariance to identity * 1000.
 * 
 * @param dim - Dimension of feature vector
 * @returns Initialized model
 */
export function createModel(dim: number): VehicleModel {
  // Initialize weights to zero
  const w = new Array(dim).fill(0);
  
  // Initialize covariance matrix to I * 1000 (high initial uncertainty)
  const P: number[][] = [];
  for (let i = 0; i < dim; i++) {
    P[i] = new Array(dim).fill(0);
    P[i][i] = 1000;
  }
  
  return {
    w,
    P,
    n: 0,
    confidence: 0,
  };
}

/**
 * Apply model to feature vector to get predicted correction.
 * 
 * @param m - Model
 * @param x - Feature vector
 * @returns Predicted delta_s (correction in seconds)
 */
export function apply(m: VehicleModel, x: number[]): number {
  if (x.length !== m.w.length) {
    throw new Error(`Feature dimension mismatch: expected ${m.w.length}, got ${x.length}`);
  }
  
  // Compute dot product: w · x
  let delta = 0;
  for (let i = 0; i < m.w.length; i++) {
    delta += m.w[i] * x[i];
  }
  
  return delta;
}

/**
 * Update model with new observation using RLS algorithm.
 * Uses forgetting factor λ = 0.995 for gradual adaptation.
 * 
 * @param m - Current model
 * @param x - Feature vector
 * @param y - Observed error (actual_ET - baseline_ET) in seconds
 * @returns Updated model
 */
export function update(m: VehicleModel, x: number[], y: number): VehicleModel {
  if (x.length !== m.w.length) {
    throw new Error(`Feature dimension mismatch: expected ${m.w.length}, got ${x.length}`);
  }
  
  const dim = m.w.length;
  const lambda = 0.995; // Forgetting factor
  
  // Copy current state
  const w = [...m.w];
  const P = m.P.map(row => [...row]);
  
  // Compute P * x
  const Px: number[] = new Array(dim).fill(0);
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      Px[i] += P[i][j] * x[j];
    }
  }
  
  // Compute x^T * P * x
  let xTPx = 0;
  for (let i = 0; i < dim; i++) {
    xTPx += x[i] * Px[i];
  }
  
  // Compute gain: k = P * x / (λ + x^T * P * x)
  const denominator = lambda + xTPx;
  const k: number[] = Px.map(val => val / denominator);
  
  // Compute prediction error: e = y - w^T * x
  let prediction = 0;
  for (let i = 0; i < dim; i++) {
    prediction += w[i] * x[i];
  }
  const error = y - prediction;
  
  // Update weights: w = w + k * e
  for (let i = 0; i < dim; i++) {
    w[i] += k[i] * error;
  }
  
  // Update covariance: P = (P - k * x^T * P) / λ
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) {
      P[i][j] = (P[i][j] - k[i] * Px[j]) / lambda;
    }
  }
  
  // Update sample count
  const n = m.n + 1;
  
  // Calculate confidence based on number of samples and covariance trace
  // Confidence increases with samples and decreases with uncertainty
  const trace = P.reduce((sum, row, i) => sum + row[i], 0);
  const avgVariance = trace / dim;
  const sampleConfidence = Math.min(n / 20, 1.0); // Max at 20 samples
  const uncertaintyFactor = Math.max(0, 1 - avgVariance / 1000); // Normalized by initial
  const confidence = Math.min(sampleConfidence * uncertaintyFactor, 0.95);
  
  return {
    w,
    P,
    n,
    confidence,
  };
}
