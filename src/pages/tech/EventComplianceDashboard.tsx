/**
 * Event Compliance Dashboard — event-scoped compliance/readiness overview.
 * Shows per-entry module statuses, issue flags, and summary counts.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance,
  EventComplianceResponse, ComplianceEntryRow,
  EntryHold,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
  onOpenDossier?: (entryId: number) => void;
}

type ReadinessFilter = 'all' | 'clear' | 'has_issues' | 'critical';

export default function EventComplianceDashboard({ hasAdmin: _hasAdmin, onOpenDossier }: Props) {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<ReadinessFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [data, setData] = useState<EventComplianceResponse | null>(null);

  // Batch 12: Hold state
  const [entryHolds, setEntryHolds] = useState<Map<number, EntryHold[]>>(new Map());

  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 })
      .then(res => setEvents(res.events))
      .catch(() => {});
  }, []);

  const loadCompliance = useCallback(async () => {
    if (!selectedEventId) { setData(null); setEntryHolds(new Map()); return; }
    setLoading(true); setError('');
    try {
      const res = await techMasterApi.getEventCompliance(selectedEventId, classFilter || undefined);
      setData(res);

      // Batch 12: Load holds for event
      try {
        const holdsRes = await techMasterApi.listEntryHolds({ eventInstanceId: selectedEventId, activeOnly: true });
        const holdsMap = new Map<number, EntryHold[]>();
        holdsRes.holds.forEach(h => {
          const existing = holdsMap.get(h.event_entry_id) || [];
          holdsMap.set(h.event_entry_id, [...existing, h]);
        });
        setEntryHolds(holdsMap);
      } catch (e: any) {
        console.error('Failed to load holds:', e);
      }

      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }, [selectedEventId, classFilter]);

  useEffect(() => { loadCompliance(); }, [loadCompliance]);

  const filteredEntries = data ? data.entries.filter(e =>
    readinessFilter === 'all' || e.readiness === readinessFilter
  ) : [];

  const classOptions = data ? [...new Set(data.entries.map(e => e.class_index).filter(Boolean))] as string[] : [];
  const summary = data?.summary;

  return (
    <div>
      {/* Selectors */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', alignItems: 'flex-end' }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select value={selectedEventId ?? ''} onChange={e => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setClassFilter(''); setReadinessFilter('all'); }} style={selectStyle}>
            <option value="">— Select event —</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>)}
          </select>
        </div>
        {data && (
          <div>
            <label style={labelStyle}>Class</label>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} style={selectStyle}>
              <option value="">All classes</option>
              {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {data && (
          <div>
            <label style={labelStyle}>Readiness</label>
            <select value={readinessFilter} onChange={e => setReadinessFilter(e.target.value as ReadinessFilter)} style={selectStyle}>
              <option value="all">All ({data.total_entries})</option>
              <option value="clear">Clear ({summary?.clear ?? 0})</option>
              <option value="has_issues">Has Issues ({summary?.has_issues ?? 0})</option>
              <option value="critical">Critical ({summary?.critical ?? 0})</option>
            </select>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{error}</p>}

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <SummaryPill label="Total" value={summary.total} />
          <SummaryPill label="Clear" value={summary.clear} color="#2e7d32" bg="#e8f5e9" />
          <SummaryPill label="Issues" value={summary.has_issues} color="#f57f17" bg="#fff8e1" />
          <SummaryPill label="Critical" value={summary.critical} color="#c62828" bg="#ffebee" />
          <div style={{ width: 1, background: 'var(--color-border)', margin: '0 0.25rem' }} />
          <SummaryPill label="No Scale" value={summary.missing_scale} color={summary.missing_scale > 0 ? '#9e9e9e' : undefined} />
          <SummaryPill label="No Fuel" value={summary.missing_fuel} color={summary.missing_fuel > 0 ? '#9e9e9e' : undefined} />
          <SummaryPill label="No Insp." value={summary.missing_inspection} color={summary.missing_inspection > 0 ? '#9e9e9e' : undefined} />
          <SummaryPill label="No Card" value={summary.missing_techcard} color={summary.missing_techcard > 0 ? '#9e9e9e' : undefined} />
          <div style={{ width: 1, background: 'var(--color-border)', margin: '0 0.25rem' }} />
          <SummaryPill label="Fuel Fail" value={summary.fuel_failure} color={summary.fuel_failure > 0 ? '#c62828' : undefined} />
          <SummaryPill label="Insp. Fail" value={summary.inspection_failure} color={summary.inspection_failure > 0 ? '#c62828' : undefined} />
          <SummaryPill label="TD Fail" value={summary.teardown_failure} color={summary.teardown_failure > 0 ? '#c62828' : undefined} />
          <SummaryPill label="Card Disc." value={summary.techcard_discrepancy} color={summary.techcard_discrepancy > 0 ? '#e65100' : undefined} />
          <SummaryPill label="Open Find." value={summary.with_open_findings} color={summary.with_open_findings > 0 ? '#c62828' : undefined} />
        </div>
      )}

      {/* Entries Grid */}
      {loading ? (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading compliance data...</p>
      ) : data && (
        <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>Driver</th>
                <th style={thStyle}>Class</th>
                <th style={thStyle}>Scale</th>
                <th style={thStyle}>Fuel</th>
                <th style={thStyle}>Insp.</th>
                <th style={thStyle}>Card</th>
                <th style={thStyle}>Teardown</th>
                <th style={thStyle}>Findings</th>
                <th style={thStyle}>Holds</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr><td colSpan={12} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>No entries match filters.</td></tr>
              ) : filteredEntries.map((e: ComplianceEntryRow) => (
                <tr key={e.entry_id} style={{ background: e.readiness === 'critical' ? '#fff5f5' : e.readiness === 'has_issues' ? '#fffdf5' : undefined }}>
                  <td style={tdStyle}><strong>{e.competition_number || '—'}</strong></td>
                  <td style={tdStyle}>{e.person_name || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                  <td style={tdStyle}>{e.class_index || '—'}</td>
                  <td style={tdStyle}><StatusDot status={e.scale_status} /></td>
                  <td style={tdStyle}><StatusDot status={e.fuel_status} /></td>
                  <td style={tdStyle}><StatusDot status={e.inspection_status} /></td>
                  <td style={tdStyle}><StatusDot status={e.techcard_status} /></td>
                  <td style={tdStyle}><StatusDot status={e.teardown_status} extra={e.teardown_result} /></td>
                  <td style={tdStyle}>
                    {e.open_findings > 0 ? (
                      <span style={{ background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600 }}>
                        {e.open_findings}
                      </span>
                    ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>0</span>}
                  </td>
                  <td style={tdStyle}>
                    {/* Batch 12: Hold badges */}
                    {(entryHolds.get(e.entry_id) || []).map(h => (
                      <span key={h.id} style={{ ...holdBadgeStyle(h.hold_type), marginRight: '0.25rem' }} title={h.reason}>
                        {holdTypeAbbrev(h.hold_type)}
                      </span>
                    ))}
                  </td>
                  <td style={tdStyle}><span style={readinessBadge(e.readiness)}>{e.readiness === 'clear' ? '✓' : e.readiness === 'critical' ? '✕' : '⚠'}</span></td>
                  <td style={tdStyle}>
                    {onOpenDossier && (
                      <button onClick={() => onOpenDossier(e.entry_id)} style={btnSmall}>Dossier</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right', marginTop: '0.5rem' }}>
          {filteredEntries.length} of {data.total_entries} entries shown &middot; Generated: {fmtDate(data.generated_at)}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function SummaryPill({ label, value, color, bg }: { label: string; value: number; color?: string; bg?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.35rem 0.6rem', borderRadius: 4, background: bg || '#f5f5f5', minWidth: 48 }}>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: color || 'inherit' }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

function StatusDot({ status, extra }: { status: string; extra?: string | null }) {
  const color = statusDotColor(status);
  return (
    <span title={status.replace(/_/g, ' ') + (extra ? ` (${extra})` : '')}>
      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 3 }} />
      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{abbreviateStatus(status)}</span>
    </span>
  );
}

function statusDotColor(s: string): string {
  const m: Record<string, string> = {
    weighed: '#4caf50', checked_ok: '#4caf50', inspected_ok: '#4caf50', audited: '#4caf50', completed: '#4caf50', closed: '#4caf50',
    not_weighed: '#bdbdbd', not_checked: '#bdbdbd', not_inspected: '#bdbdbd', no_declaration: '#bdbdbd', no_teardown: '#bdbdbd', missing: '#bdbdbd',
    has_failure: '#c62828', discrepancy_found: '#e65100', fail: '#c62828', under_minimum: '#c62828',
    has_incomplete: '#f57f17', in_progress: '#f57f17', uploaded: '#1565c0', under_review: '#1565c0', scheduled: '#1565c0',
  };
  return m[s] || '#bdbdbd';
}

function abbreviateStatus(s: string): string {
  const m: Record<string, string> = {
    weighed: 'OK', checked_ok: 'OK', inspected_ok: 'OK', audited: 'OK', completed: 'Done', closed: 'OK',
    not_weighed: '—', not_checked: '—', not_inspected: '—', no_declaration: '—', no_teardown: '—', missing: '—',
    has_failure: 'FAIL', discrepancy_found: 'DISC', fail: 'FAIL', under_minimum: 'LOW',
    has_incomplete: 'INC', in_progress: 'WIP', uploaded: 'UPL', under_review: 'REV', scheduled: 'SCHED',
  };
  return m[s] || s.replace(/_/g, ' ').substring(0, 4).toUpperCase();
}

function readinessBadge(r: string): React.CSSProperties {
  const m: Record<string, { bg: string; fg: string }> = {
    clear: { bg: '#e8f5e9', fg: '#2e7d32' },
    has_issues: { bg: '#fff8e1', fg: '#f57f17' },
    critical: { bg: '#ffebee', fg: '#c62828' },
  };
  const c = m[r] || m.has_issues;
  return { padding: '2px 8px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600, background: c.bg, color: c.fg };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

// ── Batch 12: Hold helper functions ────────────────────────────────────

function holdTypeAbbrev(type: string): string {
  const abbrevs: Record<string, string> = {
    compliance_hold: 'COMP',
    tech_hold: 'TECH',
    escalation: 'ESC',
    flag: 'FLAG',
  };
  return abbrevs[type] || type.toUpperCase().slice(0, 4);
}

function holdBadgeStyle(type: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    compliance_hold: { bg: '#ef4444', fg: 'white' },
    tech_hold: { bg: '#f97316', fg: 'white' },
    escalation: { bg: '#a855f7', fg: 'white' },
    flag: { bg: '#eab308', fg: 'white' },
  };
  const c = colors[type] || { bg: '#9e9e9e', fg: 'white' };
  return {
    display: 'inline-block', padding: '0.1rem 0.35rem', borderRadius: '3px',
    fontSize: '0.6rem', fontWeight: 700, background: c.bg, color: c.fg,
  };
}

// ── Styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' };
const selectStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--color-border)', minWidth: 200 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', position: 'sticky' as const, top: 0, background: 'white' };
const tdStyle: React.CSSProperties = { padding: '0.35rem 0.6rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
const btnSmall: React.CSSProperties = { padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: 3, border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer' };
