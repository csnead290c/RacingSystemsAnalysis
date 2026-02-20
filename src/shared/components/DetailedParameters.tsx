/**
 * Detailed Parameters Modal
 *
 * Full step-by-step simulation output table matching VB6 Quarter Pro's
 * "Detailed Parameters" screen.  Shows every trace row from the sim loop
 * with distance, time, speed, RPM, gear, accel, HP, drag HP, and slip flags.
 *
 * Opened via a button on the Predict results view.
 */

import { useMemo, useCallback, useState } from 'react';
import { X } from 'lucide-react';

/** Trace point shape emitted by VB6Exact (superset of SimResult.traces). */
export interface DetailedTracePoint {
  t_s: number;
  s_ft: number;
  v_mph: number;
  v_fps?: number;
  a_g: number;
  rpm: number;
  dsrpm?: number;
  gear: number;
  slip?: boolean;
  tireSlip?: number;
  hp?: number;
  dragHp?: number;
  netHp?: number;
  wheelSpeed_mph?: number;
  throttleStopActive?: boolean;
}

interface DetailedParametersModalProps {
  isOpen: boolean;
  onClose: () => void;
  traces: DetailedTracePoint[];
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

function fmtDec(v: number, d: number): string {
  return v.toFixed(d);
}

function buildCSV(traces: DetailedTracePoint[], hasHp: boolean, hasDragHp: boolean, hasSlip: boolean): string {
  const hdr = ['Step', 'Time_s', 'Dist_ft', 'Speed_mph', 'Accel_g', 'RPM', 'Gear'];
  if (hasHp) hdr.push('HP');
  if (hasDragHp) hdr.push('DragHP');
  if (hasSlip) hdr.push('Slip');
  const rows = traces.map((t, i) => {
    const r: (string | number)[] = [
      i,
      fmtDec(t.t_s, 4),
      fmtDec(t.s_ft, 2),
      fmtDec(t.v_mph, 2),
      fmtDec(t.a_g, 4),
      Math.round(t.rpm),
      t.gear,
    ];
    if (hasHp) r.push(t.hp != null ? Math.round(t.hp) : '');
    if (hasDragHp) r.push(t.dragHp != null ? Math.round(t.dragHp) : '');
    if (hasSlip) r.push(t.slip ? 'SLIP' : '');
    return r.join(',');
  });
  return [hdr.join(','), ...rows].join('\n');
}

// ---- component ----

export default function DetailedParametersModal({
  isOpen,
  onClose,
  traces,
  raceLengthFt,
  vehicleName,
  et,
  mph,
}: DetailedParametersModalProps) {
  const [copied, setCopied] = useState(false);

  // Detect which optional columns have data
  const hasHp = useMemo(() => traces.some(t => t.hp != null && t.hp !== 0), [traces]);
  const hasDragHp = useMemo(() => traces.some(t => t.dragHp != null && t.dragHp !== 0), [traces]);
  const hasSlip = useMemo(() => traces.some(t => t.slip === true), [traces]);

  // Memoize gear-change indices for row highlighting
  const gearChangeSet = useMemo(() => {
    const set = new Set<number>();
    for (let i = 1; i < traces.length; i++) {
      if (traces[i].gear !== traces[i - 1].gear) set.add(i);
    }
    return set;
  }, [traces]);

  // CSV copy handler
  const handleCopyCSV = useCallback(() => {
    const csv = buildCSV(traces, hasHp, hasDragHp, hasSlip);
    navigator.clipboard.writeText(csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [traces, hasHp, hasDragHp, hasSlip]);

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
          maxWidth: '960px', width: '100%', maxHeight: '90vh',
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
              {traces.length.toLocaleString()} steps &middot; {fmtDec(raceLengthFt, 0)} ft
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
          {traces.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No simulation data available. Run a simulation first.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
                  <th style={thStyle}>Time (s)</th>
                  <th style={thStyle}>Dist (ft)</th>
                  <th style={thStyle}>Speed (mph)</th>
                  <th style={thStyle}>Accel (g)</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Gear</th>
                  <th style={thStyle}>RPM</th>
                  {hasHp && <th style={thStyle}>HP</th>}
                  {hasDragHp && <th style={thStyle}>Drag HP</th>}
                  {hasSlip && <th style={{ ...thStyle, textAlign: 'center' }}>Slip</th>}
                </tr>
              </thead>
              <tbody>
                {traces.map((t, i) => {
                  const isGearChange = gearChangeSet.has(i);
                  const isFinish = i === traces.length - 1;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        backgroundColor: isFinish
                          ? 'rgba(34,197,94,0.08)'
                          : isGearChange
                            ? 'rgba(59,130,246,0.06)'
                            : i % 2 === 0
                              ? 'transparent'
                              : 'rgba(255,255,255,0.02)',
                      }}
                    >
                      <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '10px' }}>{i}</td>
                      <td style={tdStyle}>{fmtDec(t.t_s, 4)}</td>
                      <td style={tdStyle}>{fmtDec(t.s_ft, 1)}</td>
                      <td style={tdStyle}>{fmtDec(t.v_mph, 2)}</td>
                      <td style={tdStyle}>{fmtDec(t.a_g, 3)}</td>
                      <td style={{ ...tdStyle, textAlign: 'center', fontWeight: isGearChange ? 700 : 400, color: isGearChange ? '#3b82f6' : 'inherit' }}>
                        {t.gear}
                      </td>
                      <td style={tdStyle}>{Math.round(t.rpm).toLocaleString()}</td>
                      {hasHp && <td style={tdStyle}>{t.hp != null ? Math.round(t.hp) : ''}</td>}
                      {hasDragHp && <td style={tdStyle}>{t.dragHp != null ? Math.round(t.dragHp) : ''}</td>}
                      {hasSlip && (
                        <td style={{ ...tdStyle, textAlign: 'center', color: t.slip ? '#ef4444' : 'transparent', fontWeight: 600, fontSize: '10px' }}>
                          {t.slip ? 'SLIP' : ''}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer summary */}
        {traces.length > 0 && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--color-border)',
            display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '11px',
          }}>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Peak Accel:</span> <strong>{fmtDec(Math.max(...traces.map(t => t.a_g)), 3)} g</strong></span>
            <span><span style={{ color: 'var(--color-text-muted)' }}>Peak RPM:</span> <strong>{Math.max(...traces.map(t => t.rpm)).toLocaleString()}</strong></span>
            {hasHp && <span><span style={{ color: 'var(--color-text-muted)' }}>Peak HP:</span> <strong>{Math.round(Math.max(...traces.filter(t => t.hp != null).map(t => t.hp!)))}</strong></span>}
            <span><span style={{ color: 'var(--color-text-muted)' }}>Gear Changes:</span> <strong>{gearChangeSet.size}</strong></span>
            {hasSlip && <span><span style={{ color: 'var(--color-text-muted)' }}>Slip Steps:</span> <strong style={{ color: '#ef4444' }}>{traces.filter(t => t.slip).length}</strong></span>}
          </div>
        )}
      </div>
    </div>
  );
}
