/**
 * FieldHelp Component
 * 
 * Provides consistent hover/focus help tooltips for input fields
 * All content must be sourced from RSA manuals - no invented text
 */

import { useState } from 'react';
import { getFieldHelp } from '../../domain/help/etFieldHelp';

interface FieldHelpProps {
  fieldKey: string;
  className?: string;
}

/**
 * Help icon that shows tooltip on hover/focus
 * Follows original RSA pattern of (?) help buttons
 */
export function FieldHelp({ fieldKey, className = '' }: FieldHelpProps) {
  const [isVisible, setIsVisible] = useState(false);
  const helpEntry = getFieldHelp(fieldKey);
  
  if (!helpEntry) {
    // No help available for this field - don't show anything
    return null;
  }
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className={`field-help-button ${className}`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        aria-label={`Help for ${helpEntry.title}`}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-bg-secondary)',
          color: 'var(--color-text-muted)',
          fontSize: '11px',
          fontWeight: 'bold',
          cursor: 'help',
          padding: 0,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '4px',
          verticalAlign: 'middle',
        }}
        title={helpEntry.title}
      >
        ?
      </button>
      
      {isVisible && (
        <div
          className="field-help-tooltip"
          style={{
            position: 'fixed',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 10000,
            minWidth: '280px',
            maxWidth: '400px',
            pointerEvents: 'none',
          }}
        >
          <div style={{ 
            fontWeight: 600, 
            marginBottom: '4px',
            color: 'var(--color-text)',
            fontSize: '0.85rem'
          }}>
            {helpEntry.title}
          </div>
          <div style={{ 
            fontSize: '0.8rem',
            lineHeight: '1.4',
            color: 'var(--color-text)',
            marginBottom: '6px'
          }}>
            {helpEntry.helpText}
          </div>
          <div style={{ 
            fontSize: '0.65rem',
            color: 'var(--color-text-muted)',
            fontStyle: 'italic',
            borderTop: '1px solid var(--color-border)',
            paddingTop: '4px',
            marginTop: '4px'
          }}>
            Source: {helpEntry.sourceManual}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Inline help text variant for fields that need always-visible help
 * Use sparingly - only when original RSA UI had dedicated help text areas
 */
export function FieldHelpInline({ fieldKey }: { fieldKey: string }) {
  const helpEntry = getFieldHelp(fieldKey);
  
  if (!helpEntry) {
    return null;
  }
  
  return (
    <div style={{
      fontSize: '0.75rem',
      color: 'var(--color-text-muted)',
      marginTop: '4px',
      lineHeight: '1.3'
    }}>
      {helpEntry.helpText}
    </div>
  );
}
