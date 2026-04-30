/**
 * Link Review Panel — Batch 4
 *
 * Lightweight review tooling for unresolved/weak links between
 * parity_runs, event_entries, and scale_records.
 *
 * Tabs: Derivation Status | Unlinked Runs | Weak Entries | Unlinked Scale | Admin Actions
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance,
  DerivationStatusSummary,
  LinkReviewMode,
  LinkReviewItem,
  DeriveFromRunsResponse,
  BackfillRunLinksResponse,
} from '../../services/techMasterApi';

type SubTab = 'status' | 'unlinked_runs' | 'weak_entries' | 'unlinked_scale' | 'admin';

interface Props {
  hasAdmin: boolean;
}

export default function LinkReviewPanel({ hasAdmin }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('status');
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  useEffect(() => {
    techMasterApi.listEvents({ limit: 50 })
      .then(res => { setEvents(res.events); })
      .catch(() => { /* events stay empty */ });
  }, []);

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'status', label: 'Derivation Status' },
    { key: 'unlinked_runs', label: 'Unlinked Runs' },
    { key: 'weak_entries', label: 'Weak Entries' },
    { key: 'unlinked_scale', label: 'Unlinked Scale' },
    ...(hasAdmin ? [{ key: 'admin' as SubTab, label: 'Admin Actions' }] : []),
  ];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Link Review</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
        Review and resolve linkage between parity runs, event entries, and scale records.
      </p>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            style={{
              padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: subTab === t.key ? 'var(--color-primary)' : 'transparent',
              color: subTab === t.key ? '#fff' : 'var(--color-text-muted)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'status' && <StatusSubTab />}
      {subTab !== 'status' && subTab !== 'admin' && (
        <ReviewSubTab
          mode={subTab as LinkReviewMode}
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
          hasAdmin={hasAdmin}
        />
      )}
      {subTab === 'admin' && hasAdmin && (
        <AdminActionsSubTab
          events={events}
          selectedEventId={selectedEventId}
          onSelectEvent={setSelectedEventId}
        />
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border)',
  fontSize: '0.72rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border-light, #eee)',
};
const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '3px',
  fontSize: '0.7rem', fontWeight: 600,
  background: color === 'green' ? '#dcfce7' : color === 'yellow' ? '#fef9c3' : color === 'red' ? '#fee2e2' : '#f3f4f6',
  color: color === 'green' ? '#166534' : color === 'yellow' ? '#854d0e' : color === 'red' ? '#991b1b' : '#374151',
});
const btnStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer',
  border: '1px solid var(--color-border)', borderRadius: '4px', background: 'var(--color-bg)',
};

function rateColor(rate: number | null) {
  if (rate === null) return 'gray';
  if (rate >= 90) return 'green';
  if (rate >= 50) return 'yellow';
  return 'red';
}

function StatusSubTab() {
  const [data, setData] = useState<DerivationStatusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    techMasterApi.derivationStatus()
      .then(res => { setData(res as DerivationStatusSummary); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading derivation status...</p>;
  if (error) return <p style={{ color: 'var(--color-error)' }}>Error: {error}</p>;
  if (!data) return null;

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Runs', value: data.global_total_runs.toLocaleString() },
          { label: 'Linked Runs', value: data.global_linked_runs.toLocaleString() },
          { label: 'Global Link Rate', value: data.global_link_rate !== null ? `${data.global_link_rate}%` : '\u2014', badge: true },
        ].map(c => (
          <div key={c.label} style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', minWidth: 140 }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
              {c.badge ? <span style={badgeStyle(rateColor(data.global_link_rate))}>{c.value}</span> : c.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Event</th>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Runs</th>
            <th style={thStyle}>Linked</th>
            <th style={thStyle}>Unlinked</th>
            <th style={thStyle}>Rate</th>
            <th style={thStyle}>Entries</th>
            <th style={thStyle}>Derived</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map(ev => (
            <tr key={ev.id}>
              <td style={tdStyle}>{ev.name}</td>
              <td style={tdStyle}>{ev.start_date_local}</td>
              <td style={tdStyle}>{ev.total_runs}</td>
              <td style={tdStyle}>{ev.linked_runs}</td>
              <td style={tdStyle}>{ev.unlinked_runs}</td>
              <td style={tdStyle}>
                <span style={badgeStyle(rateColor(ev.link_rate))}>{ev.link_rate !== null ? `${ev.link_rate}%` : '\u2014'}</span>
              </td>
              <td style={tdStyle}>{ev.total_entries}</td>
              <td style={tdStyle}>{ev.derived_entries}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.events.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          No events with run data found.
        </p>
      )}
    </div>
  );
}

function ReviewSubTab({
  mode, events, selectedEventId, onSelectEvent, hasAdmin,
}: {
  mode: LinkReviewMode;
  events: EventInstance[];
  selectedEventId: number | null;
  onSelectEvent: (id: number | null) => void;
  hasAdmin: boolean;
}) {
  const [items, setItems] = useState<LinkReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkingRunId, setLinkingRunId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    setError('');
    try {
      const res = await techMasterApi.linkReview(selectedEventId, mode);
      setItems(res.items);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [selectedEventId, mode]);

  useEffect(() => { load(); }, [load]);

  const handleLink = async (runId: number, entryId: number) => {
    setLinkingRunId(runId);
    try {
      await techMasterApi.manualLink(runId, entryId);
      setItems(prev => prev.filter(i => i.id !== runId));
    } catch (e: any) {
      alert(`Link failed: ${e.message}`);
    }
    setLinkingRunId(null);
  };

  const modeLabels: Record<string, string> = {
    unlinked_runs: 'Unlinked Runs',
    weak_entries: 'Weak Entries',
    unlinked_scale: 'Unlinked Scale Records',
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Event:</label>
        <select
          value={selectedEventId ?? ''}
          onChange={e => onSelectEvent(e.target.value ? Number(e.target.value) : null)}
          style={{ fontSize: '0.8rem', padding: '0.3rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        >
          <option value="">Select event...</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>
          ))}
        </select>
        {selectedEventId && <button onClick={load} style={btnStyle}>Refresh</button>}
      </div>

      {!selectedEventId && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>Select an event to review {modeLabels[mode]?.toLowerCase()}.</p>
      )}
      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>}
      {error && <p style={{ color: 'var(--color-error)' }}>Error: {error}</p>}

      {!loading && selectedEventId && items.length === 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No {modeLabels[mode]?.toLowerCase()} found for this event.</p>
      )}

      {!loading && items.length > 0 && mode === 'unlinked_runs' && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Run ID</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Car #</th>
              <th style={thStyle}>Class</th>
              <th style={thStyle}>Round</th>
              <th style={thStyle}>ET</th>
              <th style={thStyle}>Reason</th>
              <th style={thStyle}>Candidates</th>
              {hasAdmin && <th style={thStyle}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.id}</td>
                <td style={tdStyle}>{item.driver_name}</td>
                <td style={tdStyle}>{item.car_number ?? '\u2014'}</td>
                <td style={tdStyle}>{item.class_index ?? '\u2014'}</td>
                <td style={tdStyle}>{item.round ?? '\u2014'}</td>
                <td style={tdStyle}>{item.ft1320 ?? '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(item.reason === 'no_matching_entry' ? 'red' : 'yellow')}>
                    {item.reason === 'no_matching_entry' ? 'No entry' : 'Not linked'}
                  </span>
                </td>
                <td style={tdStyle}>
                  {(item.candidate_entries ?? []).length === 0
                    ? <span style={{ color: 'var(--color-text-muted)' }}>\u2014</span>
                    : (item.candidate_entries ?? []).map(ce => (
                        <span key={ce.id} style={{ fontSize: '0.7rem' }}>
                          #{ce.id} {ce.person_name ?? ce.source_driver_name ?? ''} ({ce.class_index})
                        </span>
                      ))
                  }
                </td>
                {hasAdmin && (
                  <td style={tdStyle}>
                    {(item.candidate_entries ?? []).length === 1 && (
                      <button
                        onClick={() => handleLink(item.id!, item.candidate_entries![0].id)}
                        disabled={linkingRunId === item.id}
                        style={{ ...btnStyle, fontSize: '0.7rem', color: 'var(--color-primary)' }}
                      >
                        {linkingRunId === item.id ? 'Linking...' : 'Link'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && items.length > 0 && mode === 'weak_entries' && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Entry ID</th>
              <th style={thStyle}>Driver Name</th>
              <th style={thStyle}>Car #</th>
              <th style={thStyle}>Class</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Linked Runs</th>
              <th style={thStyle}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.id}</td>
                <td style={tdStyle}>{item.person_name ?? item.source_driver_name ?? '\u2014'}</td>
                <td style={tdStyle}>{item.competition_number ?? '\u2014'}</td>
                <td style={tdStyle}>{item.class_index ?? '\u2014'}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(item.derivation_source === 'run_derived' ? 'yellow' : 'gray')}>
                    {item.derivation_source ?? 'unknown'}
                  </span>
                </td>
                <td style={tdStyle}>{item.linked_run_count ?? 0}</td>
                <td style={tdStyle}>
                  <span style={badgeStyle(item.reason === 'no_person_linked' ? 'red' : 'yellow')}>
                    {item.reason === 'no_person_linked' ? 'No person' : 'Provisional'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && items.length > 0 && mode === 'unlinked_scale' && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Scale ID</th>
              <th style={thStyle}>Driver</th>
              <th style={thStyle}>Mode</th>
              <th style={thStyle}>Weight</th>
              <th style={thStyle}>Measured At</th>
              <th style={thStyle}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                <td style={tdStyle}>{item.id}</td>
                <td style={tdStyle}>{item.person_name ?? '\u2014'}</td>
                <td style={tdStyle}>{item.measurement_mode}</td>
                <td style={tdStyle}>{item.measured_total_weight ?? '\u2014'}</td>
                <td style={tdStyle}>{item.measured_at ?? '\u2014'}</td>
                <td style={tdStyle}><span style={badgeStyle('red')}>No run linked</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && items.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
          Showing {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}

function AdminActionsSubTab({
  events, selectedEventId, onSelectEvent,
}: {
  events: EventInstance[];
  selectedEventId: number | null;
  onSelectEvent: (id: number | null) => void;
}) {
  const [result, setResult] = useState<DeriveFromRunsResponse | BackfillRunLinksResponse | null>(null);
  const [running, setRunning] = useState('');
  const [error, setError] = useState('');

  const runAction = async (action: 'derive' | 'backfill', dryRun: boolean) => {
    setRunning(dryRun ? `${action}_dry` : action);
    setError('');
    setResult(null);
    try {
      const params = selectedEventId
        ? { event_instance_id: selectedEventId, dry_run: dryRun }
        : { all: true, dry_run: dryRun };
      const res = action === 'derive'
        ? await techMasterApi.deriveFromRuns(params)
        : await techMasterApi.backfillRunLinks(params);
      setResult(res);
    } catch (e: any) {
      setError(e.message);
    }
    setRunning('');
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
        <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Scope:</label>
        <select
          value={selectedEventId ?? ''}
          onChange={e => onSelectEvent(e.target.value ? Number(e.target.value) : null)}
          style={{ fontSize: '0.8rem', padding: '0.3rem', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        >
          <option value="">All events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', flex: 1, minWidth: 280 }}>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Derive Entries from Runs</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Create event_entries for each distinct driver found in parity_runs. Also creates provisional persons. Idempotent.
          </p>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button onClick={() => runAction('derive', true)} disabled={!!running} style={{ ...btnStyle, color: 'var(--color-primary)' }}>
              {running === 'derive_dry' ? 'Running...' : 'Dry Run'}
            </button>
            <button onClick={() => runAction('derive', false)} disabled={!!running} style={{ ...btnStyle, color: '#991b1b', fontWeight: 600 }}>
              {running === 'derive' ? 'Running...' : 'Execute'}
            </button>
          </div>
        </div>

        <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', flex: 1, minWidth: 280 }}>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Backfill Run Links</h4>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Set parity_runs.event_entry_id where exactly one entry matches the driver name. Conservative: skips ambiguous matches.
          </p>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button onClick={() => runAction('backfill', true)} disabled={!!running} style={{ ...btnStyle, color: 'var(--color-primary)' }}>
              {running === 'backfill_dry' ? 'Running...' : 'Dry Run'}
            </button>
            <button onClick={() => runAction('backfill', false)} disabled={!!running} style={{ ...btnStyle, color: '#991b1b', fontWeight: 600 }}>
              {running === 'backfill' ? 'Running...' : 'Execute'}
            </button>
          </div>
        </div>
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.8rem' }}>Error: {error}</p>}

      {result && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '0.75rem', background: 'var(--color-bg-subtle, #f9fafb)' }}>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
            Result {result.dry_run && <span style={badgeStyle('yellow')}>DRY RUN</span>}
          </h4>
          <pre style={{ fontSize: '0.72rem', overflow: 'auto', maxHeight: 400, margin: 0 }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
