/**
 * Inspection Workspace Panel — event-scoped general tech inspection capture,
 * template-driven checklist/measurement workflow, compliance feedback, and history.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry,
  InspectionTemplate, InspectionRecord,
  InspectionCreateResponse, InspectionItemType, InspectionResponseResult,
  EntryTechSummaryResponse,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

// Local form state for a single response row
interface ResponseDraft {
  template_item_id?: number;
  item_label: string;
  item_type: InspectionItemType;
  is_required: number;
  spec_min: number | null;
  spec_max: number | null;
  spec_unit: string | null;
  // User values
  bool_value: number | null;
  numeric_value: string; // kept as string for input control
  text_value: string;
  result: InspectionResponseResult | null;
  notes: string;
}

export default function InspectionWorkspacePanel({ hasAdmin }: Props) {
  // Event selection
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Templates
  const [templates, setTemplates] = useState<InspectionTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Capture form
  const [responseDrafts, setResponseDrafts] = useState<ResponseDraft[]>([]);
  const [inspectionArea, setInspectionArea] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<InspectionCreateResponse | null>(null);

  // History
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Tech summary
  const [techSummary, setTechSummary] = useState<EntryTechSummaryResponse | null>(null);

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

  // Load templates
  useEffect(() => {
    techMasterApi.listInspectionTemplates()
      .then(res => setTemplates(res.templates))
      .catch(() => {});
  }, []);

  // Load history when event selected
  const loadHistory = useCallback(() => {
    if (!selectedEventId) { setRecords([]); return; }
    setHistoryLoading(true);
    techMasterApi.listInspectionsByEvent(selectedEventId)
      .then(res => { setRecords(res.records); setHistoryLoading(false); })
      .catch(() => setHistoryLoading(false));
  }, [selectedEventId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Load tech summary when entry selected
  useEffect(() => {
    if (!selectedEntryId) { setTechSummary(null); return; }
    techMasterApi.getEntryTechSummary(selectedEntryId)
      .then(setTechSummary)
      .catch(() => setTechSummary(null));
  }, [selectedEntryId]);

  // Load template items when template selected
  useEffect(() => {
    if (!selectedTemplateId) { setResponseDrafts([]); return; }
    techMasterApi.getInspectionTemplate(selectedTemplateId)
      .then(res => {
        const items = res.template.items || [];
        setResponseDrafts(items.map(it => ({
          template_item_id: it.id,
          item_label: it.label,
          item_type: it.item_type,
          is_required: it.is_required,
          spec_min: it.spec_min,
          spec_max: it.spec_max,
          spec_unit: it.spec_unit,
          bool_value: null,
          numeric_value: '',
          text_value: '',
          result: null,
          notes: '',
        })));
      })
      .catch(() => {});
  }, [selectedTemplateId]);

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;

  // Filter templates applicable to selected entry
  const applicableTemplates = selectedEntry
    ? templates.filter(t =>
        (t.category === '*' || t.category === selectedEntry.category) &&
        (t.class_index === '*' || t.class_index === selectedEntry.class_index)
      )
    : templates;

  const resetForm = () => {
    setSelectedTemplateId(null);
    setResponseDrafts([]);
    setInspectionArea('');
    setFormNotes('');
    setLastResult(null);
  };

  const updateDraft = (index: number, field: keyof ResponseDraft, value: unknown) => {
    setResponseDrafts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedEntryId || !hasAdmin) return;
    setSaving(true); setError(''); setLastResult(null);
    try {
      const responses = responseDrafts.map(d => ({
        template_item_id: d.template_item_id,
        item_label: d.item_label,
        item_type: d.item_type,
        bool_value: d.bool_value ?? undefined,
        numeric_value: d.numeric_value ? parseFloat(d.numeric_value) : undefined,
        text_value: d.text_value || undefined,
        result: d.result || undefined,
        notes: d.notes || undefined,
      }));

      const res = await techMasterApi.createInspectionRecord({
        event_entry_id: selectedEntryId,
        template_id: selectedTemplateId || undefined,
        inspection_area: inspectionArea || undefined,
        notes: formNotes || undefined,
        responses,
      });
      setLastResult(res);
      loadHistory();
      // Refresh tech summary
      techMasterApi.getEntryTechSummary(selectedEntryId).then(setTechSummary).catch(() => {});
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];
  const canSave = responseDrafts.length > 0;

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
                        style={{ cursor: 'pointer', background: isSel ? 'var(--color-primary-light, #e3f2fd)' : undefined }}
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

      {/* Tech Summary Badges */}
      {selectedEntry && techSummary && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={techStatusBadge(techSummary.scale.status)}>Scale: {techSummary.scale.status.replace(/_/g, ' ')}</span>
          <span style={techStatusBadge(techSummary.fuel.status)}>Fuel: {techSummary.fuel.status.replace(/_/g, ' ')}</span>
          <span style={techStatusBadge(techSummary.inspection.status)}>Inspection: {techSummary.inspection.status.replace(/_/g, ' ')}</span>
        </div>
      )}

      {/* Inspection Capture Form */}
      {selectedEntry && hasAdmin && (
        <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            Inspection — #{selectedEntry.competition_number} {selectedEntry.person_name || 'Unknown Driver'}
            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {selectedEntry.class_index}
            </span>
          </h4>

          {/* Template selector + area */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <div>
              <label style={labelStyle}>Inspection Template</label>
              <select
                value={selectedTemplateId ?? ''}
                onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)}
                style={selectStyle}
              >
                <option value="">— Select template —</option>
                {applicableTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.template_type}) — {t.category}/{t.class_index}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Inspection Area</label>
              <input type="text" value={inspectionArea} onChange={e => setInspectionArea(e.target.value)} style={inputStyle} placeholder="e.g. Staging, Tech Bay 2" />
            </div>
          </div>

          {/* Checklist / Measurement form */}
          {responseDrafts.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <table style={{ ...tableStyle, fontSize: '0.8rem' }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: '40%' }}>Item</th>
                    <th style={{ ...thStyle, width: '15%' }}>Type</th>
                    <th style={{ ...thStyle, width: '25%' }}>Response</th>
                    <th style={{ ...thStyle, width: '10%' }}>Result</th>
                    <th style={{ ...thStyle, width: '10%' }}>Req</th>
                  </tr>
                </thead>
                <tbody>
                  {responseDrafts.map((d, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>
                        {d.item_label}
                        {d.item_type === 'measurement' && d.spec_min !== null && d.spec_max !== null && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                            ({d.spec_min}–{d.spec_max}{d.spec_unit ? ` ${d.spec_unit}` : ''})
                          </span>
                        )}
                        {d.item_type === 'measurement' && d.spec_min !== null && d.spec_max === null && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                            (≥{d.spec_min}{d.spec_unit ? ` ${d.spec_unit}` : ''})
                          </span>
                        )}
                        {d.item_type === 'measurement' && d.spec_min === null && d.spec_max !== null && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>
                            (≤{d.spec_max}{d.spec_unit ? ` ${d.spec_unit}` : ''})
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>{itemTypeBadge(d.item_type)}</td>
                      <td style={tdStyle}>
                        {d.item_type === 'checkbox' && (
                          <select
                            value={d.bool_value === null ? '' : String(d.bool_value)}
                            onChange={e => {
                              const v = e.target.value === '' ? null : Number(e.target.value);
                              updateDraft(i, 'bool_value', v);
                              updateDraft(i, 'result', v === null ? null : v ? 'pass' : 'fail');
                            }}
                            style={{ ...selectStyle, minWidth: 100 }}
                          >
                            <option value="">—</option>
                            <option value="1">Pass</option>
                            <option value="0">Fail</option>
                          </select>
                        )}
                        {d.item_type === 'measurement' && (
                          <input
                            type="number"
                            step="0.01"
                            value={d.numeric_value}
                            onChange={e => {
                              updateDraft(i, 'numeric_value', e.target.value);
                              // Auto-evaluate
                              if (e.target.value) {
                                const v = parseFloat(e.target.value);
                                const pass = (d.spec_min === null || v >= d.spec_min) && (d.spec_max === null || v <= d.spec_max);
                                updateDraft(i, 'result', (d.spec_min === null && d.spec_max === null) ? 'pass' : (pass ? 'pass' : 'fail'));
                              } else {
                                updateDraft(i, 'result', null);
                              }
                            }}
                            style={{ ...inputStyle, width: 120 }}
                            placeholder={d.spec_unit || 'value'}
                          />
                        )}
                        {d.item_type === 'note' && (
                          <input
                            type="text"
                            value={d.text_value}
                            onChange={e => {
                              updateDraft(i, 'text_value', e.target.value);
                              updateDraft(i, 'result', e.target.value ? 'na' : null);
                            }}
                            style={{ ...inputStyle, width: '100%' }}
                            placeholder="notes"
                          />
                        )}
                      </td>
                      <td style={tdStyle}>{d.result ? miniResultBadge(d.result) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</td>
                      <td style={tdStyle}>{d.is_required ? <span style={{ color: '#c62828', fontSize: '0.75rem' }}>Req</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Opt</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedTemplateId && responseDrafts.length === 0 && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Template has no items defined.
            </p>
          )}

          {!selectedTemplateId && (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              Select a template to load the inspection checklist.
            </p>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={labelStyle}>Notes</label>
            <input type="text" value={formNotes} onChange={e => setFormNotes(e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="optional" />
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
            {saving ? 'Saving...' : 'Save Inspection'}
          </button>

          {/* Result feedback */}
          {lastResult && (
            <div style={{
              marginTop: '0.75rem', padding: '0.75rem', borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: lastResult.overall_result === 'pass' ? '#e8f5e9'
                : lastResult.overall_result === 'fail' ? '#ffebee'
                : '#fff8e1',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {resultIcon(lastResult.overall_result)} Inspection saved — {lastResult.overall_result.toUpperCase()}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {lastResult.response_count} response(s) recorded
              </div>
              {lastResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {lastResult.flags.map((f, i) => <li key={i}>{inspectionFlagLabel(f)}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {selectedEntry && !hasAdmin && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Admin access required to perform inspections.
        </p>
      )}

      {/* Inspection History */}
      {selectedEventId && (
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            Inspection History
            <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
              ({records.length} record{records.length !== 1 ? 's' : ''})
            </span>
          </h4>
          {historyLoading ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading...</p>
          ) : records.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No inspection records for this event yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Template</th>
                    <th style={thStyle}>Type</th>
                    <th style={thStyle}>Result</th>
                    <th style={thStyle}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id} style={{ background: r.event_entry_id === selectedEntryId ? 'var(--color-primary-light, #e3f2fd)' : undefined }}>
                      <td style={tdStyle}><strong>{r.competition_number || '—'}</strong></td>
                      <td style={tdStyle}>{r.person_name || '—'}</td>
                      <td style={tdStyle}>{r.class_index || '—'}</td>
                      <td style={tdStyle}>{r.template_label || <span style={{ color: 'var(--color-text-muted)' }}>ad-hoc</span>}</td>
                      <td style={tdStyle}>{r.template_type ? templateTypeBadge(r.template_type) : '—'}</td>
                      <td style={tdStyle}>{overallResultBadge(r.overall_result)}</td>
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

function resultIcon(result: string): string {
  if (result === 'pass') return '\u2705';
  if (result === 'fail') return '\u274C';
  if (result === 'incomplete') return '\u23F3';
  return '\u26A0\uFE0F';
}

function inspectionFlagLabel(flag: string): string {
  const map: Record<string, string> = {
    failed_checklist_item: 'Failed checklist item',
    measurement_out_of_range: 'Measurement out of allowed range',
    required_item_missing: 'Required item not answered',
    no_template_configured: 'No inspection template was used',
  };
  return map[flag] || flag;
}

function itemTypeBadge(type: string) {
  const styles: Record<string, React.CSSProperties> = {
    checkbox: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    measurement: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    note: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
  };
  return <span style={styles[type] || {}}>{type}</span>;
}

function miniResultBadge(result: string) {
  const styles: Record<string, React.CSSProperties> = {
    pass: { background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600 },
    fail: { background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600 },
    na: { background: '#f5f5f5', color: '#757575', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    skip: { background: '#f5f5f5', color: '#757575', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
  };
  return <span style={styles[result] || {}}>{result.toUpperCase()}</span>;
}

function overallResultBadge(result: string) {
  const styles: Record<string, React.CSSProperties> = {
    pass: { background: '#e8f5e9', color: '#2e7d32', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
    fail: { background: '#ffebee', color: '#c62828', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
    incomplete: { background: '#fff8e1', color: '#f57f17', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
    review: { background: '#e8eaf6', color: '#283593', padding: '1px 6px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 600 },
  };
  return <span style={styles[result] || {}}>{result.toUpperCase()}</span>;
}

function templateTypeBadge(type: string) {
  const styles: Record<string, React.CSSProperties> = {
    general_tech: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    body: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    chassis: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
  };
  const labels: Record<string, string> = { general_tech: 'General', body: 'Body', chassis: 'Chassis' };
  return <span style={styles[type] || {}}>{labels[type] || type}</span>;
}

function techStatusBadge(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    weighed: { bg: '#e8f5e9', fg: '#2e7d32' },
    not_weighed: { bg: '#f5f5f5', fg: '#757575' },
    checked_ok: { bg: '#e8f5e9', fg: '#2e7d32' },
    not_checked: { bg: '#f5f5f5', fg: '#757575' },
    inspected_ok: { bg: '#e8f5e9', fg: '#2e7d32' },
    not_inspected: { bg: '#f5f5f5', fg: '#757575' },
    has_failure: { bg: '#ffebee', fg: '#c62828' },
    has_incomplete: { bg: '#fff8e1', fg: '#f57f17' },
  };
  const c = colors[status] || { bg: '#f5f5f5', fg: '#757575' };
  return { padding: '2px 8px', borderRadius: 3, fontSize: '0.75rem', background: c.bg, color: c.fg, fontWeight: 500 };
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
