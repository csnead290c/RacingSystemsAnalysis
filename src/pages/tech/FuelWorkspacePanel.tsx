/**
 * Fuel Workspace Panel — event-scoped fuel check capture, history, and compliance.
 *
 * Supports fuel sample recording with SG/dielectric measurements,
 * rule-driven compliance evaluation, and event-scoped history.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry, FuelRecord, FuelRule,
  FuelCheckType, FuelType, FuelCreateResponse,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

export default function FuelWorkspacePanel({ hasAdmin }: Props) {
  // Event selection
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fuel capture form
  const [checkType, setCheckType] = useState<FuelCheckType>('spot_check');
  const [fuelTypeDeclared, setFuelTypeDeclared] = useState<FuelType | ''>('');
  const [sampleId, setSampleId] = useState('');
  const [sgMeasured, setSgMeasured] = useState('');
  const [dielectricMeasured, setDielectricMeasured] = useState('');
  const [temperatureF, setTemperatureF] = useState('');
  const [testStation, setTestStation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<FuelCreateResponse | null>(null);

  // Fuel history
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Fuel rules
  const [rules, setRules] = useState<FuelRule[]>([]);

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

  // Load fuel history when event selected
  const loadHistory = useCallback(() => {
    if (!selectedEventId) { setFuelRecords([]); return; }
    setHistoryLoading(true);
    techMasterApi.listFuelByEvent(selectedEventId)
      .then(res => { setFuelRecords(res.records); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, [selectedEventId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load rules
  useEffect(() => {
    techMasterApi.listFuelRules()
      .then(res => setRules(res.rules))
      .catch(() => {});
  }, []);

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;

  // Find applicable rule for selected entry
  const entryRule = selectedEntry
    ? rules.find(r => r.category === selectedEntry.category && r.class_index === selectedEntry.class_index) || null
    : null;

  const resetForm = () => {
    setSgMeasured(''); setDielectricMeasured(''); setTemperatureF('');
    setSampleId(''); setNotes(''); setLastResult(null);
  };

  const handleSave = async () => {
    if (!selectedEntryId || !hasAdmin) return;
    setSaving(true); setError(''); setLastResult(null);
    try {
      const params: Record<string, unknown> = {
        event_entry_id: selectedEntryId,
        check_type: checkType,
        test_station: testStation || undefined,
        notes: notes || undefined,
      };
      if (fuelTypeDeclared) params.fuel_type_declared = fuelTypeDeclared;
      if (sampleId) params.sample_id = sampleId;
      if (sgMeasured) params.sg_measured = parseFloat(sgMeasured);
      if (dielectricMeasured) params.dielectric_measured = parseFloat(dielectricMeasured);
      if (temperatureF) params.temperature_f = parseFloat(temperatureF);

      const res = await techMasterApi.createFuelRecord(params as any);
      setLastResult(res);
      resetForm();
      loadHistory();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  // Distinct classes from entries for filter
  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];

  const canSave = !!sgMeasured || !!dielectricMeasured;

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

      {/* Fuel Capture Form */}
      {selectedEntry && hasAdmin && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Fuel Check — #{selectedEntry.competition_number} {selectedEntry.person_name || 'Unknown Driver'}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {selectedEntry.class_index}
            </span>
          </h4>

          {/* Entry context badges */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {entryRule ? (
              <>
                {entryRule.fuel_type_required && (
                  <span style={infoBadge}>Fuel: {entryRule.fuel_type_required}</span>
                )}
                {entryRule.sg_min !== null && entryRule.sg_max !== null && (
                  <span style={infoBadge}>SG: {Number(entryRule.sg_min).toFixed(4)} – {Number(entryRule.sg_max).toFixed(4)}</span>
                )}
                {entryRule.dielectric_min !== null && entryRule.dielectric_max !== null && (
                  <span style={infoBadge}>Diel: {Number(entryRule.dielectric_min).toFixed(4)} – {Number(entryRule.dielectric_max).toFixed(4)}</span>
                )}
              </>
            ) : (
              <span style={{ ...infoBadge, background: '#fff3e0', color: '#e65100' }}>No fuel rule configured</span>
            )}
            {!selectedEntry.person_id && (
              <span style={{ ...infoBadge, background: '#fce4ec', color: '#c62828' }}>Unlinked entry</span>
            )}
          </div>

          {/* Check type + fuel type */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Check Type</label>
              <select value={checkType} onChange={e => setCheckType(e.target.value as FuelCheckType)} style={selectStyle}>
                <option value="spot_check">Spot Check</option>
                <option value="pre_run">Pre-Run</option>
                <option value="post_run">Post-Run</option>
                <option value="random">Random</option>
                <option value="confiscation">Confiscation</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fuel Type Declared</label>
              <select value={fuelTypeDeclared} onChange={e => setFuelTypeDeclared(e.target.value as FuelType | '')} style={selectStyle}>
                <option value="">— not specified —</option>
                <option value="nitromethane">Nitromethane</option>
                <option value="methanol">Methanol</option>
                <option value="gasoline">Gasoline</option>
                <option value="diesel">Diesel</option>
                <option value="e85">E85</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sample ID</label>
              <input type="text" value={sampleId} onChange={e => setSampleId(e.target.value)} style={inputStyle} placeholder="optional" />
            </div>
          </div>

          {/* Measurement inputs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Specific Gravity *</label>
              <input type="number" step="0.0001" value={sgMeasured} onChange={e => setSgMeasured(e.target.value)} style={inputStyle} placeholder="e.g. 1.0320" />
              {sgMeasured && entryRule && entryRule.sg_min !== null && entryRule.sg_max !== null && (
                <div style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: isInRange(parseFloat(sgMeasured), Number(entryRule!.sg_min), Number(entryRule!.sg_max)) ? '#2e7d32' : '#c62828' }}>
                  {isInRange(parseFloat(sgMeasured), Number(entryRule!.sg_min), Number(entryRule!.sg_max)) ? 'In range' : 'OUT OF RANGE'}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Dielectric</label>
              <input type="number" step="0.0001" value={dielectricMeasured} onChange={e => setDielectricMeasured(e.target.value)} style={inputStyle} placeholder="optional" />
              {dielectricMeasured && entryRule && entryRule.dielectric_min !== null && entryRule.dielectric_max !== null && (
                <div style={{ fontSize: '0.7rem', marginTop: '0.15rem', color: isInRange(parseFloat(dielectricMeasured), Number(entryRule!.dielectric_min), Number(entryRule!.dielectric_max)) ? '#2e7d32' : '#c62828' }}>
                  {isInRange(parseFloat(dielectricMeasured), Number(entryRule!.dielectric_min), Number(entryRule!.dielectric_max)) ? 'In range' : 'OUT OF RANGE'}
                </div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Temperature (F)</label>
              <input type="number" step="0.1" value={temperatureF} onChange={e => setTemperatureF(e.target.value)} style={inputStyle} placeholder="optional" />
            </div>
            <div>
              <label style={labelStyle}>Test Station</label>
              <input type="text" value={testStation} onChange={e => setTestStation(e.target.value)} style={inputStyle} placeholder="e.g. Fuel Lab 1" />
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="optional" />
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            style={{
              padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer',
              background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: 4,
              opacity: saving || !canSave ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Fuel Check'}
          </button>

          {/* Result feedback */}
          {lastResult && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem', borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: lastResult.overall_result === 'pass' ? '#e8f5e9' : lastResult.overall_result === 'fail' ? '#ffebee' : '#fff8e1',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {resultIcon(lastResult.overall_result)} Fuel check saved — {lastResult.overall_result.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {lastResult.sg_result && <span>SG: {resultIcon(lastResult.sg_result)} {lastResult.sg_result}</span>}
                {lastResult.dielectric_result && <span>Diel: {resultIcon(lastResult.dielectric_result)} {lastResult.dielectric_result}</span>}
                {lastResult.linked_run_id ? (
                  <span>Run: #{lastResult.linked_run_id} ({lastResult.link_method})</span>
                ) : (
                  <span>No run linked</span>
                )}
              </div>
              {lastResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {lastResult.flags.map((f, i) => <li key={i}>{fuelFlagLabel(f)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {selectedEntry && !hasAdmin && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Admin access required to record fuel checks.
        </p>
      )}

      {/* Fuel History */}
      {selectedEventId && (
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Fuel Check History
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              ({fuelRecords.length} record{fuelRecords.length !== 1 ? 's' : ''})
            </span>
          </h4>
          {historyLoading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading...</p>
          ) : fuelRecords.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No fuel check records for this event yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>SG</th>
                    <th style={thStyle}>Diel</th>
                    <th style={thStyle}>Result</th>
                    <th style={thStyle}>Run</th>
                    <th style={thStyle}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {fuelRecords.map(r => (
                    <tr key={r.id} style={{ background: r.event_entry_id === selectedEntryId ? 'var(--color-primary-light, #e3f2fd)' : undefined }}>
                      <td style={tdStyle}><strong>{r.competition_number || '—'}</strong></td>
                      <td style={tdStyle}>{r.person_name || '—'}</td>
                      <td style={tdStyle}>{r.class_index || '—'}</td>
                      <td style={tdStyle}>{checkTypeBadge(r.check_type)}</td>
                      <td style={tdStyle}>
                        {r.sg_measured !== null ? (
                          <span>
                            {Number(r.sg_measured).toFixed(4)}
                            {r.sg_result && <span style={{ marginLeft: 3 }}>{miniResult(r.sg_result)}</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        {r.dielectric_measured !== null ? (
                          <span>
                            {Number(r.dielectric_measured).toFixed(4)}
                            {r.dielectric_result && <span style={{ marginLeft: 3 }}>{miniResult(r.dielectric_result)}</span>}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>{overallResultBadge(r.overall_result)}</td>
                      <td style={tdStyle}>{linkBadge(r.link_method, r.linked_run_id)}</td>
                      <td style={tdStyle}>{formatTime(r.measured_at)}</td>
                    </tr>
                  ))}
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

function isInRange(val: number, min: number, max: number): boolean {
  return !isNaN(val) && val >= min && val <= max;
}

function resultIcon(result: string): string {
  if (result === 'pass') return '\u2705';
  if (result === 'fail') return '\u274C';
  if (result === 'no_rule') return '\u2753';
  return '\u26A0\uFE0F'; // review
}

function miniResult(result: string) {
  const map: Record<string, React.CSSProperties> = {
    pass: { color: '#2e7d32', fontSize: '0.7rem' },
    fail: { color: '#c62828', fontSize: '0.7rem', fontWeight: 700 },
    no_rule: { color: '#757575', fontSize: '0.7rem' },
  };
  const labels: Record<string, string> = { pass: '\u2713', fail: '\u2717', no_rule: '?' };
  return <span style={map[result] || {}}>{labels[result] || result}</span>;
}

function fuelFlagLabel(flag: string): string {
  const map: Record<string, string> = {
    sg_out_of_range: 'Specific gravity outside allowed range',
    dielectric_out_of_range: 'Dielectric reading outside allowed range',
    no_rule_configured: 'No fuel rule configured for this class',
    fuel_type_mismatch: 'Declared fuel type does not match required type',
    missing_sg_measurement: 'SG not measured but rule exists for this class',
    no_run_linked: 'No run linked to this fuel check',
    duplicate_close_interval: 'Repeat fuel check within 10 minutes',
  };
  return map[flag] || flag;
}

function checkTypeBadge(type: string) {
  const styles: Record<string, React.CSSProperties> = {
    spot_check: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    pre_run: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    post_run: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    random: { background: '#e8eaf6', color: '#283593', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
    confiscation: { background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem' },
  };
  const labels: Record<string, string> = {
    spot_check: 'Spot', pre_run: 'Pre-Run', post_run: 'Post-Run', random: 'Random', confiscation: 'Confiscated',
  };
  return <span style={styles[type] || {}}>{labels[type] || type}</span>;
}

function overallResultBadge(result: string) {
  const styles: Record<string, React.CSSProperties> = {
    pass: { background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
    fail: { background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
    review: { background: '#fff8e1', color: '#f57f17', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
  };
  return <span style={styles[result] || {}}>{result.toUpperCase()}</span>;
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
