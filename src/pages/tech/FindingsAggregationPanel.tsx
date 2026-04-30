/**
 * Findings Aggregation Panel — cross-module findings with filtering by
 * event, entry, module, severity, and disposition status.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance,
  FindingsAggregateResponse, FindingsAggregateItem,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

export default function FindingsAggregationPanel({ hasAdmin: _hasAdmin }: Props) {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [moduleFilter, setModuleFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<FindingsAggregateResponse | null>(null);

  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 })
      .then(res => setEvents(res.events))
      .catch(() => {});
  }, []);

  const loadFindings = useCallback(() => {
    if (!selectedEventId) { setData(null); return; }
    setLoading(true); setError('');
    techMasterApi.getFindingsAggregate({
      eventInstanceId: selectedEventId,
      module: moduleFilter || undefined,
      severity: severityFilter || undefined,
      status: statusFilter || undefined,
      limit: 200,
    })
      .then(res => { setData(res); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedEventId, moduleFilter, severityFilter, statusFilter]);

  useEffect(() => { loadFindings(); }, [loadFindings]);

  const moduleOptions = data ? Object.keys(data.by_module) : [];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select value={selectedEventId ?? ''} onChange={e => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setModuleFilter(''); setSeverityFilter(''); setStatusFilter(''); }} style={selectStyle}>
            <option value="">— Select event —</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>)}
          </select>
        </div>
        {data && (
          <>
            <div>
              <label style={labelStyle}>Module</label>
              <select value={moduleFilter} onChange={e => setModuleFilter(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
                <option value="">All modules</option>
                {moduleOptions.map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')} ({data.by_module[m]})</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} style={{ ...selectStyle, minWidth: 120 }}>
                <option value="">All</option>
                {['critical', 'high', 'medium', 'low', 'info'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selectStyle, minWidth: 120 }}>
                <option value="">All</option>
                {['open', 'resolved', 'deferred', 'penalized', 'waived'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{error}</p>}

      {/* Summary Bar */}
      {data && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{data.total_count} finding{data.total_count !== 1 ? 's' : ''}</span>
          {data.breakdown.map((b, i) => (
            <span key={i} style={{
              padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem',
              background: sevColor(b.severity).bg, color: sevColor(b.severity).fg,
            }}>
              {b.severity}/{b.disposition}: {b.cnt}
            </span>
          ))}
        </div>
      )}

      {/* Findings Table */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading findings...</p>
      ) : data && (
        <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Module</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Severity</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Measured</th>
                <th style={thStyle}>Expected</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.findings.length === 0 ? (
                <tr><td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>No findings match filters.</td></tr>
              ) : data.findings.map((f: FindingsAggregateItem) => (
                <tr key={f.id} style={{ background: f.disposition === 'open' && (f.severity === 'critical' || f.severity === 'high') ? '#fff5f5' : undefined }}>
                  <td style={tdStyle}><strong>{f.competition_number || '—'}</strong></td>
                  <td style={tdStyle}>{f.person_name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                  <td style={tdStyle}><span style={moduleBadge}>{f.case_type.replace(/_/g, ' ')}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: '0.7rem' }}>{f.finding_type.replace(/_/g, ' ')}</span></td>
                  <td style={tdStyle}><span style={sevBadge(f.severity)}>{f.severity}</span></td>
                  <td style={{ ...tdStyle, maxWidth: 300 }}>{f.description}</td>
                  <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.measured_value || '—'}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.expected_value || '—'}</span></td>
                  <td style={tdStyle}><span style={dispBadge(f.disposition)}>{f.disposition}</span></td>
                  <td style={tdStyle}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{fmtDate(f.created_at)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '0.5rem' }}>
          Showing {data.returned} of {data.total_count} &middot; Generated: {fmtDate(data.generated_at)}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function sevColor(s: string): { bg: string; fg: string } {
  const m: Record<string, { bg: string; fg: string }> = {
    critical: { bg: '#b71c1c', fg: 'white' }, high: { bg: '#ffebee', fg: '#c62828' },
    medium: { bg: '#fff8e1', fg: '#f57f17' }, low: { bg: '#e3f2fd', fg: '#1565c0' }, info: { bg: '#f5f5f5', fg: '#757575' },
  };
  return m[s] || m.info;
}

function sevBadge(s: string): React.CSSProperties {
  const c = sevColor(s);
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg };
}

function dispBadge(d: string): React.CSSProperties {
  const m: Record<string, { bg: string; fg: string }> = {
    open: { bg: '#ffebee', fg: '#c62828' }, resolved: { bg: '#e8f5e9', fg: '#2e7d32' },
    deferred: { bg: '#fff8e1', fg: '#f57f17' }, penalized: { bg: '#fce4ec', fg: '#880e4f' }, waived: { bg: '#f5f5f5', fg: '#757575' },
  };
  const c = m[d] || { bg: '#f5f5f5', fg: '#757575' };
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 500, background: c.bg, color: c.fg };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

const moduleBadge: React.CSSProperties = { fontSize: '0.65rem', background: '#f3e5f5', color: '#7b1fa2', padding: '1px 5px', borderRadius: 2 };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' };
const selectStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--color-border)', minWidth: 200 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.4rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', position: 'sticky' as const, top: 0, background: 'white', whiteSpace: 'nowrap' as const };
const tdStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
