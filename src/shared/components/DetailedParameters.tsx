/**
 * Detailed Parameters Modal
 *
 * VB6-exact Detailed Parameters view matching Quarter Pro's AddListLine output.
 * Columns: Time, Dist, MPH, Accel, RPM, Gear, Slip — with VB6 rounding.
 *
 * Uses printedRows from VB6Exact simulation when available (authoritative).
 * Falls back to deriving approximate rows from traces for non-VB6 models.
 *
 * See docs/VB6_DETAILED_PARAMETERS.md for the full spec.
 */

import { useMemo, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import type { VB6PrintedRow } from '../../domain/physics/vb6/vb6PrintedRow';
import {
  fromPrintedRows,
  fromTraces,
  buildCSV,
  type DetailedParamRow,
} from '../utils/buildVb6DetailedParameters';

interface DetailedParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** VB6Exact authoritative printed rows (preferred) */
  printedRows?: VB6PrintedRow[];
  /** Raw traces for fallback derivation (used when printedRows unavailable) */
  traces?: { t_s: number; s_ft: number; v_mph: number; a_g: number; rpm: number; gear: number }[];
  raceLengthFt: number;
  vehicleName?: string;
  et?: number;
  mph?: number;
}

// ---- helpers ----

const thStyle: React.CSSProperties = {
  padding: '4px 6px',
  textAlign: 'right',
  whiteSpace: 'nowrap',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  borderBottom: '2px solid var(--color-border)',
  position: 'sticky',
  top: 0,
  backgroundColor: 'var(--color-surface)',
  zIndex: 1,
};

const tdStyle: React.CSSProperties = {
  padding: '2px 6px',
  textAlign: 'right',
  fontSize: '11px',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** Row type → background color */
function rowBg(type: DetailedParamRow['type']): string {
  switch (type) {
    case 'distance': return 'rgba(34,197,94,0.06)';
    case 'shift':    return 'rgba(59,130,246,0.06)';
    case 'rollout':  return 'rgba(245,158,11,0.06)';
    case 'staged':   return 'rgba(255,255,255,0.02)';
    default:         return 'transparent';
  }
}

/** Row type → label color */
function typeColor(type: DetailedParamRow['type']): string {
  switch (type) {
    case 'distance': return '#22c55e';
    case 'shift':    return '#3b82f6';
    case 'rollout':  return '#f59e0b';
    case 'staged':   return 'var(--color-text-muted)';
    case 'speed':    return '#a855f7';
    default:         return 'var(--color-text)';
  }
}

/** Friendly label for row type */
function typeLabel(row: DetailedParamRow): string {
  switch (row.type) {
    case 'staged':   return 'Staged';
    case 'rollout':  return 'Rollout';
    case 'distance': return `${row.dist} ft`;
    case 'time':     return `t=${row.time}s`;
    case 'shift':    return `Shift→${row.gear}`;
    case 'speed':    return `${row.mph} mph`;
    default:         return row.reason;
  }
}

// ---- component ----

export default function DetailedParametersModal({
  isOpen,
  onClose,
  printedRows,
  traces,
  raceLengthFt,
  vehicleName,
  et,
  mph,
}: DetailedParametersModalProps) {
  const [copied, setCopied] = useState(false);

  // Build rows: prefer printedRows (VB6-exact), fall back to traces
  const rows = useMemo<DetailedParamRow[]>(() => {
    if (printedRows && printedRows.length > 0) {
      return fromPrintedRows(printedRows);
    }
    if (traces && traces.length > 0) {
      return fromTraces(traces, raceLengthFt);
    }
    return [];
  }, [printedRows, traces, raceLengthFt]);

  const isVb6 = !!(printedRows && printedRows.length > 0);

  // CSV copy handler
  const handleCopyCSV = useCallback(() => {
    const csv = buildCSV(rows);
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [rows]);

  // Focus trap
  const trapFocus = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key !== 'Tab') return;
    const all = e.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [tabindex]:not([tabindex="-1"]):not(:disabled)'
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
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--color-surface, #1e293b)',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          maxWidth: '800px', width: '100%', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column',
          border: '1px solid var(--color-border, #334155)',
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={trapFocus}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--color-border)',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--color-text)' }}>
              Detailed Parameters
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {vehicleName && <span>{vehicleName} &middot; </span>}
              {et != null && <span>ET {et.toFixed(3)}s &middot; </span>}
              {mph != null && <span>{mph.toFixed(1)} mph &middot; </span>}
              {rows.length} rows &middot; {Math.round(raceLengthFt)} ft
              {isVb6 && <span> &middot; <span style={{ color: '#22c55e', fontWeight: 600 }}>VB6 Exact</span></span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={handleCopyCSV}
              style={{
                padding: '5px 10px', fontSize: '12px', borderRadius: '4px',
                border: '1px solid var(--color-border)', cursor: 'pointer',
                backgroundColor: copied ? 'rgba(34,197,94,0.2)' : 'var(--color-bg)',
                color: copied ? '#22c55e' : 'var(--color-text)',
              }}
            >
              {copied ? '✓ Copied' : '📋 Copy CSV'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Table body — scrollable */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 4px' }}>
          {rows.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No simulation data available. Run a simulation first.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'left' }}>Event</th>
                  <th style={thStyle}>Time (s)</th>
                  <th style={thStyle}>Dist (ft)</th>
                  <th style={thStyle}>MPH</th>
                  <th style={thStyle}>Accel (g)</th>
                  <th style={thStyle}>RPM</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Gear</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Slip</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: rowBg(row.type),
                    }}
                  >
                    <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 600, color: typeColor(row.type), fontSize: '10px' }}>
                      {typeLabel(row)}
                    </td>
                    <td style={tdStyle}>{row.time}</td>
                    <td style={tdStyle}>{row.dist}</td>
                    <td style={tdStyle}>{row.mph}</td>
                    <td style={tdStyle}>{row.accel}</td>
                    <td style={tdStyle}>{row.rpm}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{row.gear}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: row.slip ? '#ef4444' : 'transparent', fontWeight: 600, fontSize: '10px' }}>
                      {row.slip || ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer summary */}
        {rows.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--color-border)',
            display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '11px',
          }}>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Rows:</span> <strong>{rows.length}</strong></span>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Distance:</span> <strong>{rows.filter(r => r.type === 'distance').length}</strong></span>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Time:</span> <strong>{rows.filter(r => r.type === 'time').length}</strong></span>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Shifts:</span> <strong>{rows.filter(r => r.type === 'shift').length}</strong></span>
            {rows.some(r => r.slip) && <span><span style={{ color: 'var(--color-text-muted)' }}>Slip:</span> <strong style={{ color: '#ef4444' }}>{rows.filter(r => r.slip).length}</strong></span>}
          </div>
        )}
      </div>
    </div>
  );
}
