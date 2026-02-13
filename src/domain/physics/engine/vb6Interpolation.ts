/**
 * VB6 RSALIB.BAS Interpolation Functions - 1-INDEXED ADAPTER
 * 
 * This module provides 1-indexed wrappers for legacy engine code that uses
 * VB6-style arrays with a dummy element at index 0.
 * 
 * CANONICAL IMPLEMENTATION: src/domain/physics/vb6/dtaby.ts (0-indexed)
 * 
 * These adapters convert 1-indexed arrays to 0-indexed and call dtaby.ts.
 * Do NOT add new interpolation logic here - modify dtaby.ts instead.
 */

import { taby as taby0, dtaby as dtaby0 } from '../vb6/dtaby';

/**
 * Convert 1-indexed array to 0-indexed by slicing off the dummy element.
 */
function to0Indexed(arr: number[]): number[] {
  return arr.slice(1);
}

/**
 * TABY - 1-D Lagrangian Interpolation (1-indexed adapter)
 * 
 * Accepts 1-indexed arrays (with dummy element at index 0) and delegates
 * to the canonical 0-indexed implementation in dtaby.ts.
 * 
 * @param XTAB X values array (1-indexed, element 0 is dummy)
 * @param YTAB Y values array (1-indexed, element 0 is dummy)
 * @param N Number of points
 * @param L Interpolation order
 * @param XVAL X value to interpolate
 */
export function TABY(
  XTAB: number[],   // 1-based array
  YTAB: number[],   // 1-based array
  N: number,
  L: number,
  XVAL: number
): number {
  // Convert to 0-indexed and call canonical implementation
  return taby0(to0Indexed(XTAB), to0Indexed(YTAB), N, L, XVAL);
}

/**
 * DTABY - 2-D Lagrangian Interpolation (1-indexed adapter)
 * 
 * Accepts 1-indexed arrays and delegates to the canonical 0-indexed
 * implementation in dtaby.ts.
 * 
 * @param XTAB X values array (1-indexed)
 * @param ZTAB Z values array (1-indexed)
 * @param YTAB Y values 2D array flattened (1-indexed)
 * @param NX Number of X points
 * @param NZ Number of Z points
 * @param LX X interpolation order
 * @param LZ Z interpolation order
 * @param XVAL X value to interpolate
 * @param ZVAL Z value to interpolate
 */
export function DTABY(
  XTAB: number[],   // 1-based array
  ZTAB: number[],   // 1-based array
  YTAB: number[],   // 1-based array (2D flattened)
  NX: number,
  NZ: number,
  LX: number,
  LZ: number,
  XVAL: number,
  ZVAL: number
): number {
  // Convert to 0-indexed and call canonical implementation
  return dtaby0(to0Indexed(XTAB), to0Indexed(ZTAB), to0Indexed(YTAB), NX, NZ, LX, LZ, XVAL, ZVAL);
}
