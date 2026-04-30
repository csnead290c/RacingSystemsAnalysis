/**
 * Scale Workspace Panel — event-scoped scale capture, history, and compliance.
 *
 * Supports three measurement modes: combined, driver_only, car_only.
 * Shows compliance feedback after save and scale history for the event.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry, ScaleRecord, ScaleRule,
  ScaleMeasurementMode, ScaleCreateResponse, DriverReferenceResponse,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

export default function ScaleWorkspacePanel({ hasAdmin }: Props) {
  // Event selection
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Scale capture form
  const [mode, setMode] = useState<ScaleMeasurementMode>('combined');
  const [totalWeight, setTotalWeight] = useState('');
  const [driverWeight, setDriverWeight] = useState('');
  const [carWeight, setCarWeight] = useState('');
  const [rearAxleWeight, setRearAxleWeight] = useState('');
  const [scaleStation, setScaleStation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<ScaleCreateResponse | null>(null);

  // Driver reference
  const [driverRef, setDriverRef] = useState<DriverReferenceResponse | null>(null);

  // Scale history
  const [scaleRecords, setScaleRecords] = useState<ScaleRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Scale rules
  const [rules, setRules] = useState<ScaleRule[]>([]);

  // Load events
  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 })
      .then(res => setEvents(res.events))
      .catch(() => {});
  }, []);

  // Load entries when event selected
  useEffect(() => {
    if (!selectedEventId) { setEntries([]); return; }
    setLoading(true);
    techMasterApi.listEntriesForEvent(selectedEventId, classFilter || undefined)
      .then(res => { setEntries(res.entries); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedEventId, classFilter]);

  // Load scale history when event selected
  const loadHistory = useCallback(() => {
    if (!selectedEventId) { setScaleRecords([]); return; }
    setHistoryLoading(true);
    techMasterApi.listScaleByEvent(selectedEventId)
      .then(res => { setScaleRecords(res.records); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, [selectedEventId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load driver reference when entry selected
  useEffect(() => {
    if (!selectedEntryId) { setDriverRef(null); return; }
    techMasterApi.getDriverReference(selectedEntryId)
      .then(res => setDriverRef(res))
      .catch(() => {});
  }, [selectedEntryId]);

  // Load rules
  useEffect(() => {
    techMasterApi.listScaleRules()
      .then(res => setRules(res.rules))
      .catch(() => {});
  }, []);

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;

  // Find applicable rule for selected entry
  const entryRule = selectedEntry
    ? rules.find(r => r.category === selectedEntry.category && r.class_index === selectedEntry.class_index) || null
    : null;

  const resetForm = () => {
    setTotalWeight(''); setDriverWeight(''); setCarWeight('');
    setRearAxleWeight(''); setNotes(''); setLastResult(null);
  };

  const handleSave = async () => {
    if (!selectedEntryId || !hasAdmin) return;
    setSaving(true); setError(''); setLastResult(null);
    try {
      const params: Record<string, unknown> = {
        event_entry_id: selectedEntryId,
        measurement_mode: mode,
        scale_station: scaleStation || undefined,
        notes: notes || undefined,
      };
      if (mode === 'combined') params.measured_total_weight = parseFloat(totalWeight);
      if (mode === 'driver_only') params.measured_driver_weight = parseFloat(driverWeight);
      if (mode === 'car_only') params.measured_car_weight = parseFloat(carWeight);
      if (rearAxleWeight) params.measured_rear_axle_weight = parseFloat(rearAxleWeight);

      const res = await techMasterApi.createScaleRecord(params as any);
      setLastResult(res);
      resetForm();
      loadHistory();
      // Refresh driver ref if we just did a driver_only weigh
      if (mode === 'driver_only') {
        techMasterApi.getDriverReference(selectedEntryId).then(setDriverRef).catch(() => {});
      }
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  // Distinct classes from entries for filter
  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];

  return (
    <div>
      {/* Event + Entry Selection */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select
            value={selectedEventId ?? ''}
            onChange={e => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setSelectedEntryId(null); resetForm(); }}
            style={selectStyle}
          >
            <option value="">— Select event —</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>)}
          </select>
        </div>
        {selectedEventId && (
          <div>
            <label style={labelStyle}>Class Filter</label>
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setSelectedEntryId(null); }} style={selectStyle}>
              <option value="">All classes</option>
              {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}

      {/* Entry selector grid */}
      {selectedEventId && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Select Entry</h4>
          {loading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading entries...</p>
          ) : entries.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No entries for this event.</p>
          ) : (
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Team</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => {
                    const isSel = e.id === selectedEntryId;
                    return (
                      <tr
                        key={e.id}
                        onClick={() => { setSelectedEntryId(e.id); resetForm(); }}
                        style={{
                          cursor: 'pointer',
                          background: isSel ? 'var(--color-primary-light, #e3f2fd)' : undefined,
                        }}
                      >
                        <td style={tdStyle}><strong>{e.competition_number || '—'}</strong></td>
                        <td style={tdStyle}>{e.person_name || <span style={{ color: 'var(--color-text-muted)' }}>unlinked</span>}</td>
                        <td style={tdStyle}>{e.org_name || '—'}</td>
                        <td style={tdStyle}>{e.class_index || '—'}</td>
                        <td style={tdStyle}>{entryStatusBadge(e.entry_status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Scale Capture Form */}
      {selectedEntry && hasAdmin && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Scale Capture — #{selectedEntry.competition_number} {selectedEntry.person_name || 'Unknown Driver'}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {selectedEntry.class_index}
            </span>
          </h4>

          {/* Entry context badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {entryRule && (
              <span style={infoBadge}>Min: {entryRule.min_total_weight} lbs</span>
            )}
            {entryRule?.min_rear_axle_weight && (
              <span style={infoBadge}>Rear Min: {entryRule.min_rear_axle_weight} lbs</span>
            )}
            {driverRef?.has_reference ? (
              <span style={{ ...infoBadge, background: '#e8f5e9', color: '#2e7d32' }}>
                Driver Ref: {driverRef.driver_weight} lbs
              </span>
            ) : (
              <span style={{ ...infoBadge, background: '#fff3e0', color: '#e65100' }}>No driver reference</span>
            )}
            {!selectedEntry.person_id && (
              <span style={{ ...infoBadge, background: '#fce4ec', color: '#c62828' }}>Unlinked entry</span>
            )}
          </div>

          {/* Mode selector */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {(['combined', 'driver_only', 'car_only'] as ScaleMeasurementMode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setLastResult(null); }}
                style={{
                  padding: '0.35rem 0.7rem', fontSize: '0.8rem', cursor: 'pointer',
                  border: mode === m ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                  borderRadius: 4,
                  background: mode === m ? 'var(--color-primary-light, #e3f2fd)' : 'white',
                  fontWeight: mode === m ? 600 : 400,
                }}
              >
                {m === 'combined' ? '⚖️ Combined' : m === 'driver_only' ? '🧑 Driver Only' : '🏎️ Car Only'}
              </button>
            ))}
          </div>

          {/* Mode-specific inputs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {mode === 'combined' && (
              <div>
                <label style={labelStyle}>Total Weight (lbs) *</label>
                <input type="number" step="0.01" value={totalWeight} onChange={e => setTotalWeight(e.target.value)} style={inputStyle} placeholder="e.g. 2340" />
              </div>
            )}
            {mode === 'driver_only' && (
              <div>
                <label style={labelStyle}>Driver Weight (lbs) *</label>
                <input type="number" step="0.01" value={driverWeight} onChange={e => setDriverWeight(e.target.value)} style={inputStyle} placeholder="e.g. 180" />
              </div>
            )}
            {mode === 'car_only' && (
              <>
                <div>
                  <label style={labelStyle}>Car Weight (lbs) *</label>
                  <input type="number" step="0.01" value={carWeight} onChange={e => setCarWeight(e.target.value)} style={inputStyle} placeholder="e.g. 2160" />
                </div>
                {driverRef?.has_reference && carWeight && (
                  <div style={{ alignSelf: 'flex-end', fontSize: '0.8rem', color: 'var(--color-text-muted)', paddingBottom: '0.4rem' }}>
                    Derived total: <strong>{(parseFloat(carWeight) + (driverRef.driver_weight ?? 0)).toFixed(1)} lbs</strong>
                    <span style={{ fontSize: '0.7rem', marginLeft: '0.25rem' }}>(car + driver ref)</span>
                  </div>
                )}
              </>
            )}
            {mode !== 'driver_only' && (
              <div>
                <label style={labelStyle}>Rear Axle (lbs)</label>
                <input type="number" step="0.01" value={rearAxleWeight} onChange={e => setRearAxleWeight(e.target.value)} style={inputStyle} placeholder="optional" />
              </div>
            )}
            <div>
              <label style={labelStyle}>Scale Station</label>
              <input type="text" value={scaleStation} onChange={e => setScaleStation(e.target.value)} style={inputStyle} placeholder="e.g. Scale 1" />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="optional" />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !canSave(mode, totalWeight, driverWeight, carWeight)}
            style={{
              padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer',
              background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 4,
              opacity: saving || !canSave(mode, totalWeight, driverWeight, carWeight) ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Scale Record'}
          </button>

          {/* Result feedback */}
          {lastResult && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', background: lastResult.flags.length > 0 ? '#fff8e1' : '#e8f5e9' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {lastResult.flags.length === 0 ? '✅ Scale record saved — no flags' : `⚠️ Scale record saved with ${lastResult.flags.length} flag(s)`}
              </div>
              {lastResult.derived_total_weight !== null && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Derived total: {lastResult.derived_total_weight} lbs
                </div>
              )}
              {lastResult.linked_run_id ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Run linked: #{lastResult.linked_run_id} ({lastResult.link_method})
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>No run linked</div>
              )}
              {lastResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {lastResult.flags.map((f, i) => <li key={i}>{flagLabel(f)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {selectedEntry && !hasAdmin && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Admin access required to record scale measurements.
        </p>
      )}

      {/* Scale History */}
      {selectedEventId && (
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Scale History
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              ({scaleRecords.length} record{scaleRecords.length !== 1 ? 's' : ''})
            </span>
          </h4>
          {historyLoading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading...</p>
          ) : scaleRecords.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No scale records for this event yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Mode</th>
                    <th style={thStyle}>Weight</th>
                    <th style={thStyle}>Rear Axle</th>
                    <th style={thStyle}>Run Link</th>
                    <th style={thStyle}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {scaleRecords.map(r => {
                    const effectiveWeight = r.measured_total_weight ?? r.derived_total_weight;
                    const isDerived = r.measured_total_weight === null && r.derived_total_weight !== null;
                    return (
                      <tr key={r.id} style={{ background: r.event_entry_id === selectedEntryId ? 'var(--color-primary-light, #e3f2fd)' : undefined }}>
                        <td style={tdStyle}><strong>{r.competition_number || '—'}</strong></td>
                        <td style={tdStyle}>{r.person_name || '—'}</td>
                        <td style={tdStyle}>{r.class_index || '—'}</td>
                        <td style={tdStyle}>{modeBadge(r.measurement_mode)}</td>
                        <td style={tdStyle}>
                          {r.measurement_mode === 'driver_only'
                            ? <span>{r.measured_driver_weight} lbs</span>
                            : effectiveWeight !== null
                              ? <span>{effectiveWeight} lbs{isDerived ? <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}> (derived)</span> : ''}</span>
                              : '—'
                          }
                        </td>
                        <td style={tdStyle}>{r.measured_rear_axle_weight ?? '—'}</td>
                        <td style={tdStyle}>{linkBadge(r.link_method, r.linked_run_id)}</td>
                        <td style={tdStyle}>{formatTime(r.measured_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function canSave(mode: ScaleMeasurementMode, total: string, driver: string, car: string): boolean {
  if (mode === 'combined') return !!total && !isNaN(parseFloat(total));
  if (mode === 'driver_only') return !!driver && !isNaN(parseFloat(driver));
  if (mode === 'car_only') return !!car && !isNaN(parseFloat(car));
  return false;
}

function flagLabel(flag: string): string {
  const map: Record<string, string> = {
    missing_driver_reference: 'Missing driver reference weight',
    under_minimum_total: 'Under minimum total weight',
    under_minimum_rear_axle: 'Under minimum rear axle weight',
    missing_rear_axle: 'Required rear axle weight not recorded',
    no_run_linked: 'No run linked to this record',
    duplicate_close_interval: 'Repeat weigh within 5 minutes',
  };
  return map[flag] || flag;
}

function modeBadge(mode: string) {
  const styles: Record<string, React.CSSProperties> = {
    combined: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    driver_only: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    car_only: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
  };
  const labels: Record<string, string> = { combined: 'Combined', driver_only: 'Driver', car_only: 'Car' };
  return <span style={styles[mode] || {}}>{labels[mode] || mode}</span>;
}

function linkBadge(method: string | null, runId: number | null) {
  if (!method || method === 'unlinked' || !runId) {
    return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>;
  }
  const label = method === 'manual' ? 'manual' : 'auto';
  return <span style={{ background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' }}>#{runId} ({label})</span>;
}

function entryStatusBadge(status: string) {
  const colors: Record<string, string> = {
    active: '#2e7d32', registered: '#1565c0', withdrawn: '#757575', disqualified: '#c62828',
  };
  return <span style={{ color: colors[status] || 'inherit', fontSize: '0.8rem' }}>{status}</span>;
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ts; }
}

// ── Styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' };
const selectStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--color-border)', minWidth: 200 };
const inputStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--color-border)', width: 140 };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-muted)', position: 'sticky' as const, top: 0, background: 'white' };
const tdStyle: React.CSSProperties = { padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
const infoBadge: React.CSSProperties = { padding: '2px 8px', borderRadius: 3, fontSize: '0.75rem', background: '#e3f2fd', color: '#1565c0' };
