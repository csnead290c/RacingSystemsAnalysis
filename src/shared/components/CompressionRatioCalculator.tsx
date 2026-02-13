/**
 * Compression Ratio Calculator Modal
 * Popup calculator accessible from Engine Sim
 * Matches VB6 Compression Ratio Worksheet - uses inline styles for consistency
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Calculator } from 'lucide-react';

interface CompressionRatioCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (compressionRatio: number) => void;
  initialValues?: {
    bore_in?: number;
    stroke_in?: number;
    chamberVolume_cc?: number;
    deckHeight_in?: number;
    gasketThickness_in?: number;
    pistonDomeVolume_cc?: number;
  };
}

export function CompressionRatioCalculator({
  isOpen,
  onClose,
  onApply,
  initialValues = {},
}: CompressionRatioCalculatorProps) {
  const [bore, setBore] = useState(initialValues.bore_in || 4.03);
  const [stroke, setStroke] = useState(initialValues.stroke_in || 3.48);
  const [chamber, setChamber] = useState(initialValues.chamberVolume_cc || 62);
  const [deck, setDeck] = useState(initialValues.deckHeight_in || 0.015);
  const [gasket, setGasket] = useState(initialValues.gasketThickness_in || 0.039);
  const [dome, setDome] = useState(initialValues.pistonDomeVolume_cc || 12);

  // Update state when initialValues change
  useEffect(() => {
    if (initialValues.bore_in !== undefined) setBore(initialValues.bore_in);
    if (initialValues.stroke_in !== undefined) setStroke(initialValues.stroke_in);
    if (initialValues.chamberVolume_cc !== undefined) setChamber(initialValues.chamberVolume_cc);
    if (initialValues.deckHeight_in !== undefined) setDeck(initialValues.deckHeight_in);
    if (initialValues.gasketThickness_in !== undefined) setGasket(initialValues.gasketThickness_in);
    if (initialValues.pistonDomeVolume_cc !== undefined) setDome(initialValues.pistonDomeVolume_cc);
  }, [initialValues.bore_in, initialValues.stroke_in, initialValues.chamberVolume_cc, 
      initialValues.deckHeight_in, initialValues.gasketThickness_in, initialValues.pistonDomeVolume_cc]);

  if (!isOpen) return null;

  // Calculate volumes (matching VB6 ENGPERF.BAS CalcKCDGH)
  const ZM3 = Math.pow(2.54, 3); // cm³ per in³
  const PI = 3.141593;
  
  const BArea = PI * Math.pow(bore, 2) / 4;
  const cylCID = BArea * stroke;
  const Dcid = BArea * deck;
  const Gcid = BArea * gasket;
  const Hcid = chamber / ZM3;
  const Pcid = dome / ZM3;
  
  // Compression Ratio = (Swept Volume + Clearance Volume) / Clearance Volume
  const clearanceVolume = Dcid + Gcid + Hcid - Pcid;
  const compressionRatio = (cylCID + clearanceVolume) / clearanceVolume;

  const handleApply = () => {
    onApply(compressionRatio);
    onClose();
  };

  // Focus trap: keeps Tab cycling inside the modal
  const trapFocus = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const all = e.currentTarget.querySelectorAll<HTMLElement>(
      'input:not(:disabled), button:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
    );
    const focusable = Array.from(all).filter(el => el.offsetParent !== null);
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    },
    modal: {
      backgroundColor: 'var(--color-surface, #1e293b)',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      maxWidth: '420px',
      width: '100%',
      border: '1px solid var(--color-border, #334155)',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid var(--color-border, #334155)',
    },
    headerTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    },
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: 'var(--color-text, #f1f5f9)',
      margin: 0,
    },
    closeBtn: {
      background: 'none',
      border: 'none',
      color: 'var(--color-text-secondary, #94a3b8)',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
    },
    body: {
      padding: '20px',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '16px',
    },
    inputGroup: {
      marginBottom: '12px',
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '500',
      color: 'var(--color-text-secondary, #94a3b8)',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      fontSize: '14px',
      border: '1px solid var(--color-border, #334155)',
      borderRadius: '6px',
      backgroundColor: 'var(--color-input-bg, #0f172a)',
      color: 'var(--color-text, #f1f5f9)',
      boxSizing: 'border-box' as const,
    },
    hint: {
      fontSize: '11px',
      color: 'var(--color-text-secondary, #64748b)',
      marginTop: '4px',
    },
    result: {
      backgroundColor: 'var(--color-primary-light, #1e3a5f)',
      border: '2px solid var(--color-primary, #3b82f6)',
      borderRadius: '8px',
      padding: '16px',
      textAlign: 'center' as const,
      marginTop: '16px',
    },
    resultLabel: {
      fontSize: '13px',
      color: 'var(--color-text-secondary, #94a3b8)',
      marginBottom: '4px',
    },
    resultValue: {
      fontSize: '32px',
      fontWeight: '700',
      color: 'var(--color-primary, #3b82f6)',
    },
    footer: {
      display: 'flex',
      gap: '12px',
      padding: '16px 20px',
      borderTop: '1px solid var(--color-border, #334155)',
    },
    cancelBtn: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: '1px solid var(--color-border, #334155)',
      borderRadius: '6px',
      backgroundColor: 'transparent',
      color: 'var(--color-text, #f1f5f9)',
      cursor: 'pointer',
    },
    applyBtn: {
      flex: 1,
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500',
      border: 'none',
      borderRadius: '6px',
      backgroundColor: 'var(--color-primary, #3b82f6)',
      color: 'white',
      cursor: 'pointer',
    },
  };

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.modal} onClick={e => e.stopPropagation()} onKeyDown={trapFocus}>
        {/* Header */}
        <div style={modalStyles.header}>
          <div style={modalStyles.headerTitle}>
            <Calculator size={20} color="#3b82f6" />
            <h2 style={modalStyles.title}>Compression Ratio Calculator</h2>
          </div>
          <button style={modalStyles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={modalStyles.body}>
          {/* Engine Geometry */}
          <div style={modalStyles.grid}>
            <div>
              <label style={modalStyles.label}>Bore (inch)</label>
              <input
                type="number"
                step="0.001"
                value={bore}
                onChange={(e) => setBore(parseFloat(e.target.value) || 0)}
                style={modalStyles.input}
              />
            </div>
            <div>
              <label style={modalStyles.label}>Stroke (inch)</label>
              <input
                type="number"
                step="0.001"
                value={stroke}
                onChange={(e) => setStroke(parseFloat(e.target.value) || 0)}
                style={modalStyles.input}
              />
            </div>
          </div>

          {/* Clearance Volumes */}
          <div style={modalStyles.inputGroup}>
            <label style={modalStyles.label}>Combustion Chamber Volume (cc)</label>
            <input
              type="number"
              step="0.1"
              value={chamber}
              onChange={(e) => setChamber(parseFloat(e.target.value) || 0)}
              style={modalStyles.input}
            />
          </div>

          <div style={modalStyles.grid}>
            <div>
              <label style={modalStyles.label}>Piston to Deck Height (inch)</label>
              <input
                type="number"
                step="0.001"
                value={deck}
                onChange={(e) => setDeck(parseFloat(e.target.value) || 0)}
                style={modalStyles.input}
              />
            </div>
            <div>
              <label style={modalStyles.label}>Head Gasket Thickness (inch)</label>
              <input
                type="number"
                step="0.001"
                value={gasket}
                onChange={(e) => setGasket(parseFloat(e.target.value) || 0)}
                style={modalStyles.input}
              />
            </div>
          </div>

          <div style={modalStyles.inputGroup}>
            <label style={modalStyles.label}>Piston Dome Volume (cc)</label>
            <input
              type="number"
              step="0.1"
              value={dome}
              onChange={(e) => setDome(parseFloat(e.target.value) || 0)}
              style={modalStyles.input}
            />
            <p style={modalStyles.hint}>Positive for dome, negative for dish</p>
          </div>

          {/* Result */}
          <div style={modalStyles.result}>
            <div style={modalStyles.resultLabel}>Calculated Compression Ratio</div>
            <div style={modalStyles.resultValue}>{compressionRatio.toFixed(2)}:1</div>
          </div>
        </div>

        {/* Footer */}
        <div style={modalStyles.footer}>
          <button style={modalStyles.cancelBtn} onClick={onClose}>Cancel</button>
          <button style={modalStyles.applyBtn} onClick={handleApply}>Apply to Engine</button>
        </div>
      </div>
    </div>
  );
}
