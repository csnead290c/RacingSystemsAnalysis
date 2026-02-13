/**
 * VB6 Print Formatting Functions
 * 
 * This module ports the EXACT VB6 Round and RightAlign functions from RSALIB.bas
 * to TypeScript. These are used for strict VB6 equivalence testing.
 * 
 * VB6 Source: Reference Files/RSA & CLS Libs 1_18_2023/RSALIB 6.0/RSALIB.bas
 * Lines 365-419
 * 
 * CRITICAL: VB6 uses Single (Float32) precision throughout. All calculations
 * must use Math.fround() to emulate VB6 Single precision.
 */

/**
 * VB6 Single precision helper - casts to Float32
 * VB6 uses Single (32-bit float) for all these calculations
 */
export function sng(x: number): number {
  return Math.fround(x);
}

/**
 * VB6 Int() function - truncates toward negative infinity
 * VB6: Int(2.5) = 2, Int(-2.5) = -3
 * JavaScript Math.floor() has the same behavior
 */
function vb6Int(x: number): number {
  return Math.floor(x);
}

/**
 * VB6 Round function from RSALIB.bas lines 406-419
 * 
 * VB6 Source:
 * ```vb
 * Function Round(Value As Single, increment As Single) As Single
 * Dim val As Single
 *     val = (Value + increment / 2) / increment
 *     
 *     Select Case increment
 *         Case 0.1:   Round = Int(val) / 10
 *         Case 0.01:  Round = Int(val) / 100
 *         Case 0.001: Round = Int(val) / 1000
 *         Case Else:  Round = increment * Int(val)
 *     End Select
 * End Function
 * ```
 * 
 * NOTE: This is NOT banker's rounding. It's a custom "round half up" implementation
 * that adds increment/2 before truncating with Int().
 * 
 * @param value - The value to round (VB6 Single)
 * @param increment - The rounding increment (e.g., 0.1 for 1 decimal place)
 * @returns The rounded value
 */
export function vb6Round(value: number, increment: number): number {
  // VB6 uses Single precision for all intermediate values
  const valueSng = sng(value);
  const incrementSng = sng(increment);
  
  // VB6: val = (Value + increment / 2) / increment
  const halfIncrement = sng(incrementSng / 2);
  const numerator = sng(valueSng + halfIncrement);
  const val = sng(numerator / incrementSng);
  
  // VB6 Select Case on increment
  // Note: VB6 compares Singles, so we use approximate comparison
  const intVal = vb6Int(val);
  
  if (Math.abs(incrementSng - 0.1) < 1e-7) {
    return sng(intVal / 10);
  } else if (Math.abs(incrementSng - 0.01) < 1e-7) {
    return sng(intVal / 100);
  } else if (Math.abs(incrementSng - 0.001) < 1e-7) {
    return sng(intVal / 1000);
  } else {
    return sng(incrementSng * intVal);
  }
}

/**
 * VB6 RightAlign function from RSALIB.bas lines 365-404
 * 
 * VB6 Source:
 * ```vb
 * Function RightAlign(maxlen As Integer, decimals As Integer, Value As Single, Optional AddComma As Variant)
 * Dim Work As String, fmt As String
 * Dim docomma As Boolean
 * Dim r1 As Single
 *     If IsMissing(AddComma) Then
 *         docomma = False
 *     Else
 *         docomma = AddComma
 *     End If
 * 
 *     If decimals > 0 Then
 *         Work = Space(maxlen + 1)
 *         
 *         If Value < 1 Then
 *             fmt = String(maxlen - decimals - 1, "#") & "0."
 *         Else
 *             fmt = String(maxlen - decimals, "#") & "."
 *         End If
 *         
 *         fmt = fmt & String(decimals, "0")
 *         r1 = 10 ^ -decimals
 *         RSet Work = Format(Round(Value, r1), fmt)
 *     Else
 *         Work = Space(maxlen + IIf(docomma, 1, 0))
 *         
 *         If docomma Then
 *             fmt = "#,##0"
 *         Else
 *             fmt = String(maxlen - 1, "#") & "0"
 *         End If
 *         
 *         r1 = 1
 *         RSet Work = Format(Round(Value, r1), fmt)
 *     End If
 * 
 *     RightAlign = Work
 * End Function
 * ```
 * 
 * @param maxlen - Maximum length of the output string
 * @param decimals - Number of decimal places
 * @param value - The value to format (VB6 Single)
 * @param addComma - Whether to add comma separators (optional)
 * @returns Right-aligned formatted string
 */
export function vb6RightAlign(
  maxlen: number,
  decimals: number,
  value: number,
  addComma: boolean = false
): string {
  const valueSng = sng(value);
  
  if (decimals > 0) {
    // VB6: r1 = 10 ^ -decimals
    const r1 = sng(Math.pow(10, -decimals));
    
    // VB6: Round(Value, r1)
    const roundedValue = vb6Round(valueSng, r1);
    
    // Format with fixed decimal places
    // VB6 Format with pattern like "##0.0" or "#0.00"
    const formatted = roundedValue.toFixed(decimals);
    
    // VB6: Work = Space(maxlen + 1), then RSet
    // RSet right-aligns the string within the space
    const workLen = maxlen + 1;
    return formatted.padStart(workLen);
  } else {
    // VB6: r1 = 1
    const r1 = sng(1);
    
    // VB6: Round(Value, r1) - rounds to nearest integer
    const roundedValue = vb6Round(valueSng, r1);
    const intValue = Math.round(roundedValue);
    
    // Format as integer
    let formatted: string;
    if (addComma) {
      // VB6: fmt = "#,##0"
      formatted = intValue.toLocaleString('en-US');
    } else {
      // VB6: fmt = String(maxlen - 1, "#") & "0"
      formatted = intValue.toString();
    }
    
    // VB6: Work = Space(maxlen + IIf(docomma, 1, 0)), then RSet
    const workLen = maxlen + (addComma ? 1 : 0);
    return formatted.padStart(workLen);
  }
}

/**
 * VB6 AddListLine mph formatting
 * 
 * VB6 Source (TIMESLIP.FRM lines 1490, 1508):
 * ```vb
 * Work = Vel(L) * Z5
 * Mid(prtline, 22, 5) = RightAlign(4, 1, Work)
 * ```
 * 
 * Where Z5 = 3600 / 5280 (constant defined at line 542)
 * 
 * @param velFps - Velocity in feet per second (VB6 Single)
 * @returns Formatted mph string (5 characters, right-aligned, 1 decimal place)
 */
export function vb6FormatMph(velFps: number): string {
  // VB6: Const Z5 = 3600 / 5280
  const Z5 = sng(3600 / 5280);
  
  // VB6: Work = Vel(L) * Z5
  const velSng = sng(velFps);
  const Work = sng(velSng * Z5);
  
  // VB6: RightAlign(4, 1, Work)
  return vb6RightAlign(4, 1, Work);
}

/**
 * Get the raw mph value that VB6 would compute (before formatting)
 * 
 * @param velFps - Velocity in feet per second
 * @returns mph value as VB6 Single
 */
export function vb6ComputeMph(velFps: number): number {
  const Z5 = sng(3600 / 5280);
  const velSng = sng(velFps);
  return sng(velSng * Z5);
}

/**
 * Get the rounded mph value that VB6 would use for display
 * 
 * @param velFps - Velocity in feet per second
 * @returns Rounded mph value (to 0.1)
 */
export function vb6RoundedMph(velFps: number): number {
  const mph = vb6ComputeMph(velFps);
  return vb6Round(mph, 0.1);
}
