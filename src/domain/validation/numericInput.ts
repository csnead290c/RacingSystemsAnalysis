/**
 * VB6 QUARTER Jr Numeric Input Semantics
 * 
 * VB6 Behavior (manual page 4-1):
 * - "A maximum of five digits may be input for the numeric variables."
 * - "If more than five digits are entered, the excess will be ignored."
 * - "Only numeric inputs are allowed."
 * 
 * This module reproduces VB6 numeric entry semantics for web inputs.
 */

/**
 * Parse and validate numeric input according to VB6 QUARTER Jr semantics
 * 
 * Rules:
 * 1. Maximum 5 digits (excluding decimal point and sign)
 * 2. Excess digits ignored (truncated)
 * 3. Only numeric inputs allowed (no scientific notation)
 * 4. Decimal points allowed
 * 5. Negative numbers allowed where semantically valid
 * 
 * @param input - Raw string input from user
 * @param allowNegative - Whether negative values are allowed (default: false)
 * @returns Parsed number or undefined if invalid
 */
export function parseVB6NumericInput(
  input: string,
  allowNegative: boolean = false
): number | undefined {
  if (!input || input.trim() === '') {
    return undefined;
  }

  const trimmed = input.trim();
  
  // Reject scientific notation (VB6 doesn't allow 'e' or 'E')
  if (/[eE]/.test(trimmed)) {
    return undefined;
  }
  
  // Reject non-numeric characters (except decimal point and optional minus)
  if (!/^-?\d*\.?\d*$/.test(trimmed)) {
    return undefined;
  }
  
  // Extract sign, integer part, and decimal part
  const isNegative = trimmed.startsWith('-');
  const withoutSign = isNegative ? trimmed.slice(1) : trimmed;
  const [integerPart = '', decimalPart = ''] = withoutSign.split('.');
  
  // Reject negative if not allowed
  if (isNegative && !allowNegative) {
    return undefined;
  }
  
  // Apply 5-digit limit to integer part only (VB6 behavior)
  // Decimal digits don't count toward the 5-digit limit
  const truncatedInteger = integerPart.slice(0, 5);
  
  // Reconstruct the number
  let reconstructed = truncatedInteger;
  if (decimalPart) {
    reconstructed += '.' + decimalPart;
  }
  if (isNegative) {
    reconstructed = '-' + reconstructed;
  }
  
  const parsed = parseFloat(reconstructed);
  
  if (isNaN(parsed)) {
    return undefined;
  }
  
  return parsed;
}

/**
 * Format a number for display in VB6-style input field
 * Ensures the value doesn't exceed 5 integer digits
 */
export function formatVB6NumericInput(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '';
  }
  
  // Convert to string and check integer digit count
  const str = value.toString();
  const [integerPart] = str.split('.');
  const cleanInteger = integerPart.replace('-', '');
  
  // If more than 5 integer digits, truncate
  if (cleanInteger.length > 5) {
    const isNegative = value < 0;
    const truncated = cleanInteger.slice(0, 5);
    return isNegative ? '-' + truncated : truncated;
  }
  
  return str;
}

/**
 * Validate that a numeric input conforms to VB6 5-digit limit
 * Returns true if valid, false if exceeds limit
 */
export function isValidVB6NumericInput(input: string): boolean {
  const parsed = parseVB6NumericInput(input, true);
  return parsed !== undefined;
}

/**
 * Get the digit count of the integer portion of a number
 */
export function getIntegerDigitCount(value: number): number {
  if (isNaN(value) || !isFinite(value)) {
    return 0;
  }
  
  const str = Math.abs(value).toString();
  const [integerPart] = str.split('.');
  return integerPart.length;
}

/**
 * Check if a number exceeds VB6 5-digit limit
 */
export function exceedsVB6DigitLimit(value: number): boolean {
  return getIntegerDigitCount(value) > 5;
}
