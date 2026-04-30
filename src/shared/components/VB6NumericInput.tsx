/**
 * VB6-compatible Numeric Input Component
 * 
 * Reproduces VB6 QUARTER Jr numeric input semantics:
 * - 5-digit maximum (excess ignored)
 * - Auto-clamping to valid ranges
 * - No scientific notation
 * - Numeric-only validation
 */

import { useState, useEffect, useCallback } from 'react';
import { parseVB6NumericInput } from '../../domain/validation/numericInput';
import { validateAndClamp, getClampWarning, QUARTER_JR_LIMITS } from '../../domain/validation/quarterJrLimits';

interface VB6NumericInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  limitKey?: keyof typeof QUARTER_JR_LIMITS;
  allowNegative?: boolean;
  step?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
}

export function VB6NumericInput({
  value,
  onChange,
  limitKey,
  allowNegative = false,
  step,
  style,
  placeholder,
  disabled = false,
}: VB6NumericInputProps) {
  const [inputValue, setInputValue] = useState<string>(() => 
    value !== undefined ? value.toString() : ''
  );
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value.toString());
    } else {
      setInputValue('');
    }
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawInput = e.target.value;
    setInputValue(rawInput);

    if (rawInput === '' || rawInput === '-') {
      onChange(undefined);
      setWarning(null);
      return;
    }

    const parsed = parseVB6NumericInput(rawInput, allowNegative);
    
    if (parsed === undefined) {
      setWarning('Invalid numeric input');
      return;
    }

    if (limitKey) {
      const clamped = validateAndClamp(parsed, limitKey);
      if (clamped !== undefined && clamped !== parsed) {
        const warningMsg = getClampWarning(parsed, limitKey);
        setWarning(warningMsg);
        onChange(clamped);
        setInputValue(clamped.toString());
      } else {
        setWarning(null);
        onChange(parsed);
      }
    } else {
      setWarning(null);
      onChange(parsed);
    }
  }, [onChange, limitKey, allowNegative]);

  const handleBlur = useCallback(() => {
    if (value !== undefined) {
      setInputValue(value.toString());
    }
    setTimeout(() => setWarning(null), 3000);
  }, [value]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        step={step}
        style={style}
        placeholder={placeholder}
        disabled={disabled}
      />
      {warning && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            padding: '4px 8px',
            backgroundColor: '#ff9800',
            color: 'white',
            fontSize: '0.75rem',
            borderRadius: '4px',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          {warning}
        </div>
      )}
    </div>
  );
}
