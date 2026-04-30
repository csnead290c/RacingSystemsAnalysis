/**
 * VB6 QUARTER Pro Numeric Input Component
 * 
 * Extends VB6NumericInput with Pro-specific validation limits
 */

import { useState, useEffect, useCallback } from 'react';
import { parseVB6NumericInput } from '../../domain/validation/numericInput';
import { QUARTER_PRO_LIMITS } from '../../domain/validation/quarterProLimits';

type ProLimitKey = keyof typeof QUARTER_PRO_LIMITS;

interface VB6ProNumericInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  limitKey?: ProLimitKey;
  allowNegative?: boolean;
  step?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  disabled?: boolean;
}

export function VB6ProNumericInput({
  value,
  onChange,
  limitKey,
  allowNegative = false,
  step,
  style,
  placeholder,
  disabled = false,
}: VB6ProNumericInputProps) {
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
      const limit = QUARTER_PRO_LIMITS[limitKey];
      let clamped = parsed;
      let didClamp = false;

      if (parsed < limit.min) {
        clamped = limit.min;
        didClamp = true;
      } else if (parsed > limit.max) {
        clamped = limit.max;
        didClamp = true;
      }

      if (didClamp) {
        const direction = parsed < limit.min ? 'below' : 'above';
        const boundary = parsed < limit.min ? limit.min : limit.max;
        setWarning(`${limit.fieldName} ${direction} valid range. Value clamped to ${boundary} ${limit.unit}`.trim());
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
