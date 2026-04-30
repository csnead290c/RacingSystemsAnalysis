/**
 * Teardown Workspace Panel — event-scoped teardown audit workflow:
 * template selection, record creation, item capture, completion with
 * auto-evaluated findings, and declaration comparison.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry,
  TeardownTemplate, TeardownRecord, TeardownObservedItem,
  TeardownCompleteResponse, TeardownDeclCompareResponse,
  EventTeardownSummaryEntry,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

type ViewMode = 'summary' | 'detail';

export default function TeardownWorkspacePanel({ hasAdmin }: Props) {
  // Event selection
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Event summary
  const [tdSummary, setTdSummary] = useState<EventTeardownSummaryEntry[]>([]);
  const [tdCounts, setTdCounts] = useState<Record<string, number>>({});

  // Templates
  const [templates, setTemplates] = useState<TeardownTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Record detail
  const [record, setRecord] = useState<TeardownRecord | null>(null);
  const [obsItems, setObsItems] = useState<TeardownObservedItem[]>([]);
  const [itemEdits, setItemEdits] = useState<Record<number, Partial<TeardownObservedItem>>>({});
  const [saving, setSaving] = useState(false);

  // Bay assignment for new teardown
  const [newBay, setNewBay] = useState('');

  // Completion / comparison results
  const [completeResult, setCompleteResult] = useState<TeardownCompleteResponse | null>(null);
  const [declResult, setDeclResult] = useState<TeardownDeclCompareResponse | null>(null);
  const [completing, setCompleting] = useState(false);
  const [comparing, setComparing] = useState(false);

  // Load events
  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 })
      .then(res => setEvents(res.events))
      .catch(() => {});
  }, []);

  // Load entries + templates when event selected
  useEffect(() => {
    if (!selectedEventId) { setEntries([]); return; }
    setLoading(true);
    techMasterApi.listEntriesForEvent(selectedEventId, classFilter || undefined)
      .then(res => { setEntries(res.entries); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedEventId, classFilter]);

  useEffect(() => {
    techMasterApi.listTeardownTemplates()
      .then(res => setTemplates(res.templates))
      .catch(() => {});
  }, []);

  // Load summary
  const loadSummary = useCallback(() => {
    if (!selectedEventId) { setTdSummary([]); setTdCounts({}); return; }
    techMasterApi.getEventTeardownSummary(selectedEventId)
      .then(res => { setTdSummary(res.entries); setTdCounts(res.counts); })
      .catch(() => {});
  }, [selectedEventId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Load record detail
  const loadRecord = useCallback((recId: number) => {
    techMasterApi.getTeardownRecord(recId)
      .then(res => {
        const r = res.record;
        setRecord(r);
        setObsItems(r.observed_items || []);
        setItemEdits({});
        setCompleteResult(null);
        setDeclResult(null);
        setViewMode('detail');
      })
      .catch(e => setError(e.message));
  }, []);

  // Create teardown
  const handleCreate = async () => {
    if (!selectedEntryId || !hasAdmin) return;
    setSaving(true); setError('');
    try {
      const res = await techMasterApi.createTeardownRecord({
        event_entry_id: selectedEntryId,
        template_id: selectedTemplateId || undefined,
        bay_assignment: newBay || undefined,
      });
      loadRecord(res.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Save item edits
  const handleSaveItems = async () => {
    if (!record || !hasAdmin) return;
    const updates = Object.entries(itemEdits).map(([idStr, edit]) => ({
      id: parseInt(idStr),
      ...edit,
    }));
    if (updates.length === 0) return;
    setSaving(true); setError('');
    try {
      await techMasterApi.saveTeardownItems({ teardown_record_id: record.id, items: updates as any });
      loadRecord(record.id);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Complete teardown
  const handleComplete = async () => {
    if (!record || !hasAdmin) return;
    setCompleting(true); setError(''); setCompleteResult(null);
    try {
      const res = await techMasterApi.completeTeardownRecord(record.id);
      setCompleteResult(res);
      loadRecord(record.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setCompleting(false);
  };

  // Run declaration comparison
  const handleDeclCompare = async () => {
    if (!record || !hasAdmin) return;
    setComparing(true); setError(''); setDeclResult(null);
    try {
      const res = await techMasterApi.runTeardownDeclComparison(record.id);
      setDeclResult(res);
      loadRecord(record.id);
    } catch (e: any) { setError(e.message); }
    setComparing(false);
  };

  // Cancel teardown
  const handleCancel = async () => {
    if (!record || !hasAdmin) return;
    setSaving(true); setError('');
    try {
      await techMasterApi.updateTeardownRecord({ teardown_record_id: record.id, teardown_status: 'cancelled' });
      loadRecord(record.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];
  const hasUnsavedEdits = Object.keys(itemEdits).length > 0;

  // Get matching template for an entry
  const getTemplateForEntry = (entryId: number) => {
    const entry = entries.find(e => e.id === entryId);
    if (!entry) return null;
    return templates.find(t =>
      (t.category === entry.category || t.category === '*') &&
      (t.class_index === entry.class_index || t.class_index === '*')
    ) || null;
  };

  return (
    <div>
      {/* Event + Entry Selection */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select
            value={selectedEventId ?? ''}
            onChange={e => {
              setSelectedEventId(e.target.value ? Number(e.target.value) : null);
              setSelectedEntryId(null); setRecord(null); setViewMode('summary');
            }}
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
        {selectedEventId && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button onClick={() => { setViewMode('summary'); setRecord(null); }} style={{ ...btnStyle, background: viewMode === 'summary' ? 'var(--color-primary)' : '#e0e0e0', color: viewMode === 'summary' ? 'white' : 'inherit' }}>
              Teardown Summary
            </button>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</p>}

      {/* ── SUMMARY VIEW ── */}
      {viewMode === 'summary' && selectedEventId && (
        <div>
          {/* Status bar */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {Object.entries(tdCounts).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} style={tdStatusBadgeStyle(status)}>
                {status.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>

          {/* Entry grid */}
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '1rem' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Result</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>No entries.</td></tr>
                ) : entries.map(e => {
                  const ts = tdSummary.find(s => s.entry_id === e.id);
                  const status = ts?.teardown_status || 'no_teardown';
                  const result = ts?.overall_result || null;
                  const isSel = e.id === selectedEntryId;
                  return (
                    <tr key={e.id} onClick={() => setSelectedEntryId(e.id)} style={{ cursor: 'pointer', background: isSel ? 'var(--color-primary-light, #e3f2fd)' : undefined }}>
                      <td style={tdStyle}><strong>{e.competition_number || '—'}</strong></td>
                      <td style={tdStyle}>{e.person_name || <span style={{ color: 'var(--color-text-muted)' }}>unlinked</span>}</td>
                      <td style={tdStyle}>{e.class_index || '—'}</td>
                      <td style={tdStyle}><span style={tdStatusBadgeStyle(status)}>{status.replace(/_/g, ' ')}</span></td>
                      <td style={tdStyle}>{result ? <span style={resultBadgeStyle(result)}>{result}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>—</span>}</td>
                      <td style={tdStyle}>
                        {status !== 'no_teardown' && (
                          <button onClick={(ev) => { ev.stopPropagation(); openLatestRecord(e.id); }} style={{ ...btnSmall, marginRight: 4 }}>View</button>
                        )}
                        {status === 'no_teardown' && hasAdmin && (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setSelectedEntryId(e.id); autoCreateForEntry(e.id); }}
                            style={btnSmall}
                          >Create</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Create teardown for selected entry */}
          {selectedEntryId && hasAdmin && !tdSummary.some(s => s.entry_id === selectedEntryId && s.teardown_status !== 'no_teardown') && (
            <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.75rem', marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem' }}>Create Teardown for #{entries.find(e => e.id === selectedEntryId)?.competition_number || selectedEntryId}</h5>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle}>Template</label>
                  <select value={selectedTemplateId ?? ''} onChange={e => setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)} style={selectStyle}>
                    <option value="">— No template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.label} ({t.category}/{t.class_index}) — {t.item_count} items</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Bay</label>
                  <input type="text" value={newBay} onChange={e => setNewBay(e.target.value)} placeholder="Bay 1" style={{ ...inputStyle, width: 100 }} />
                </div>
                <button onClick={handleCreate} disabled={saving} style={{ ...btnStyle, background: 'var(--color-primary)', color: 'white', opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'Creating...' : 'Create Teardown'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {viewMode === 'detail' && record && (
        <div>
          <button onClick={() => { setViewMode('summary'); setRecord(null); }} style={{ ...btnSmall, marginBottom: '0.75rem' }}>
            &larr; Back to Summary
          </button>

          {/* Header */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>
                  Teardown — #{record.competition_number || '?'} {record.person_name || 'Unknown'}
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {record.entry_category}/{record.entry_class}
                    {record.bay_assignment && <> &middot; Bay: {record.bay_assignment}</>}
                    {record.template_label && <> &middot; {record.template_label}</>}
                  </span>
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                  {record.event_name} &middot; Started: {record.started_at ? formatTime(record.started_at) : '—'}
                  {record.completed_at && <> &middot; Completed: {formatTime(record.completed_at)}</>}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <span style={tdStatusBadgeStyle(record.teardown_status)}>{record.teardown_status.replace(/_/g, ' ')}</span>
                <span style={resultBadgeStyle(record.overall_result)}>{record.overall_result}</span>
              </div>
            </div>

            {/* Actions */}
            {hasAdmin && record.teardown_status === 'in_progress' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button onClick={handleComplete} disabled={completing} style={{ ...btnSmall, background: '#e8f5e9', color: '#2e7d32' }}>
                  {completing ? 'Completing...' : 'Complete & Evaluate'}
                </button>
                <button onClick={handleDeclCompare} disabled={comparing} style={{ ...btnSmall, background: '#e3f2fd', color: '#1565c0' }}>
                  {comparing ? 'Comparing...' : 'Compare vs Declarations'}
                </button>
                <button onClick={handleCancel} style={{ ...btnSmall, color: '#c62828' }}>Cancel</button>
              </div>
            )}
            {hasAdmin && record.teardown_status === 'completed' && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <button onClick={handleDeclCompare} disabled={comparing} style={{ ...btnSmall, background: '#e3f2fd', color: '#1565c0' }}>
                  {comparing ? 'Comparing...' : 'Compare vs Declarations'}
                </button>
              </div>
            )}
          </div>

          {/* Completion Result */}
          {completeResult && (
            <div style={{
              padding: '0.75rem', borderRadius: 4, marginBottom: '1rem',
              border: '1px solid var(--color-border)',
              background: completeResult.overall_result === 'pass' ? '#e8f5e9' : completeResult.overall_result === 'fail' ? '#ffebee' : '#fff8e1',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Completion: {completeResult.overall_result === 'pass' ? '\u2705 Pass' : completeResult.overall_result === 'fail' ? '\u274C Fail' : '\u26A0\uFE0F ' + completeResult.overall_result}
                {completeResult.finding_count > 0 && ` — ${completeResult.finding_count} finding(s)`}
              </div>
              {completeResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {completeResult.flags.map((f, i) => <li key={i}>{f.replace(/_/g, ' ')}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Declaration Comparison Result */}
          {declResult && (
            <div style={{
              padding: '0.75rem', borderRadius: 4, marginBottom: '1rem',
              border: '1px solid var(--color-border)',
              background: declResult.finding_count === 0 ? '#e8f5e9' : '#ffebee',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Declaration Comparison: {!declResult.compared ? declResult.reason : declResult.finding_count === 0 ? '\u2705 No mismatches' : `\u274C ${declResult.finding_count} mismatch(es)`}
              </div>
              {declResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {declResult.flags.map((f, i) => <li key={i}>{f.replace(/_/g, ' ')}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Findings */}
          {record.findings && record.findings.length > 0 && !completeResult && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Findings ({record.findings.length})</h5>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                <table style={tableStyle}>
                  <thead><tr><th style={thStyle}>Type</th><th style={thStyle}>Severity</th><th style={thStyle}>Description</th><th style={thStyle}>Measured</th><th style={thStyle}>Expected</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {record.findings.map(f => (
                      <tr key={f.id}>
                        <td style={tdStyle}><span style={{ fontSize: '0.7rem' }}>{f.finding_type}</span></td>
                        <td style={tdStyle}><span style={severityBadge(f.severity)}>{f.severity}</span></td>
                        <td style={tdStyle}>{f.description}</td>
                        <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.measured_value || '—'}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.expected_value || '—'}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.disposition}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observed Items */}
          <div style={{ marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Teardown Items ({obsItems.length})</h5>
            {obsItems.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No items scaffolded. Create with a template to auto-populate items.</p>
            ) : (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 4 }}>
                {groupItems(obsItems).map(([group, items]) => (
                  <div key={group}>
                    <div style={{ padding: '0.4rem 0.6rem', background: '#f5f5f5', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                      {group}
                    </div>
                    <table style={{ ...tableStyle, fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th style={{ ...thStyle, width: '25%' }}>Item</th>
                          <th style={{ ...thStyle, width: '8%' }}>Type</th>
                          <th style={{ ...thStyle, width: '22%' }}>Observed</th>
                          <th style={{ ...thStyle, width: '15%' }}>Spec</th>
                          <th style={{ ...thStyle, width: '8%' }}>Decl Key</th>
                          <th style={{ ...thStyle, width: '10%' }}>Result</th>
                          <th style={{ ...thStyle, width: '12%' }}>Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map(it => {
                          const edit = itemEdits[it.id] || {};
                          const isEditable = hasAdmin && record.teardown_status === 'in_progress';
                          return (
                            <tr key={it.id}>
                              <td style={tdStyle}>{it.item_label}</td>
                              <td style={tdStyle}>{itemTypeBadge(it.item_type)}</td>
                              <td style={tdStyle}>
                                {it.item_type === 'serial_check' && (
                                  isEditable ? (
                                    <input type="text" value={edit.observed_serial ?? it.observed_serial ?? ''} onChange={e => setItemEdit(it.id, 'observed_serial', e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="Serial #" />
                                  ) : <span style={{ fontSize: '0.8rem' }}>{it.observed_serial || '—'}</span>
                                )}
                                {it.item_type === 'measurement' && (
                                  isEditable ? (
                                    <input type="number" step="0.001" value={edit.observed_value ?? it.observed_value ?? ''} onChange={e => setItemEdit(it.id, 'observed_value', e.target.value === '' ? null : parseFloat(e.target.value))} style={{ ...inputStyle, width: '100%' }} placeholder={it.spec_unit || 'value'} />
                                  ) : <span style={{ fontSize: '0.8rem' }}>{it.observed_value !== null ? `${it.observed_value} ${it.spec_unit || ''}` : '—'}</span>
                                )}
                                {it.item_type === 'visual_check' && (
                                  isEditable ? (
                                    <select value={edit.result ?? it.result ?? ''} onChange={e => setItemEdit(it.id, 'result', e.target.value)} style={{ ...selectStyle, minWidth: 80 }}>
                                      <option value="">—</option>
                                      <option value="pass">Pass</option>
                                      <option value="fail">Fail</option>
                                      <option value="review">Review</option>
                                      <option value="na">N/A</option>
                                    </select>
                                  ) : <span style={{ fontSize: '0.8rem' }}>{it.result || '—'}</span>
                                )}
                                {it.item_type === 'note' && (
                                  isEditable ? (
                                    <input type="text" value={edit.observed_text ?? it.observed_text ?? ''} onChange={e => setItemEdit(it.id, 'observed_text', e.target.value)} style={{ ...inputStyle, width: '100%' }} placeholder="Notes..." />
                                  ) : <span style={{ fontSize: '0.8rem' }}>{it.observed_text || '—'}</span>
                                )}
                              </td>
                              <td style={tdStyle}>
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                  {it.expected_value_min !== null || it.expected_value_max !== null
                                    ? `${it.expected_value_min ?? ''}–${it.expected_value_max ?? ''} ${it.spec_unit || ''}`
                                    : '—'}
                                </span>
                              </td>
                              <td style={tdStyle}>
                                {it.declaration_key ? <span style={{ fontSize: '0.65rem', background: '#f3e5f5', color: '#7b1fa2', padding: '1px 4px', borderRadius: 2 }}>{it.declaration_key}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>—</span>}
                              </td>
                              <td style={tdStyle}>
                                {it.result ? <span style={resultBadgeStyle(it.result)}>{it.result}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>—</span>}
                              </td>
                              <td style={tdStyle}>
                                {isEditable ? (
                                  <input type="text" value={edit.notes ?? it.notes ?? ''} onChange={e => setItemEdit(it.id, 'notes', e.target.value)} style={{ ...inputStyle, width: '100%', fontSize: '0.7rem' }} placeholder="..." />
                                ) : <span style={{ fontSize: '0.7rem' }}>{it.notes || ''}</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
            {hasAdmin && hasUnsavedEdits && record.teardown_status === 'in_progress' && (
              <button onClick={handleSaveItems} disabled={saving} style={{ ...btnStyle, marginTop: '0.5rem', background: 'var(--color-primary)', color: 'white', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save Item Changes'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Inline helpers ──

  function setItemEdit(itemId: number, field: string, value: any) {
    setItemEdits(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  }

  function openLatestRecord(entryId: number) {
    techMasterApi.listTeardownsByEntry(entryId)
      .then(res => {
        if (res.records.length > 0) loadRecord(res.records[0].id);
      })
      .catch(e => setError(e.message));
  }

  function autoCreateForEntry(entryId: number) {
    if (!hasAdmin) return;
    const tpl = getTemplateForEntry(entryId);
    setSaving(true); setError('');
    techMasterApi.createTeardownRecord({
      event_entry_id: entryId,
      template_id: tpl?.id,
    })
      .then(res => { loadRecord(res.id); loadSummary(); setSaving(false); })
      .catch(e => { setError(e.message); setSaving(false); });
  }
}

// ── Helper functions ────────────────────────────────────────────────────

function groupItems(items: TeardownObservedItem[]): [string, TeardownObservedItem[]][] {
  const groups: Record<string, TeardownObservedItem[]> = {};
  for (const it of items) {
    const g = it.item_category || 'Other';
    if (!groups[g]) groups[g] = [];
    groups[g].push(it);
  }
  return Object.entries(groups);
}

function tdStatusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    no_teardown: { bg: '#f5f5f5', fg: '#757575' },
    scheduled: { bg: '#e3f2fd', fg: '#1565c0' },
    in_progress: { bg: '#fff8e1', fg: '#f57f17' },
    completed: { bg: '#e8f5e9', fg: '#2e7d32' },
    cancelled: { bg: '#f5f5f5', fg: '#9e9e9e' },
  };
  const c = colors[status] || { bg: '#f5f5f5', fg: '#757575' };
  return { padding: '2px 8px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 500, background: c.bg, color: c.fg };
}

function resultBadgeStyle(result: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    pass: { bg: '#e8f5e9', fg: '#2e7d32' },
    fail: { bg: '#ffebee', fg: '#c62828' },
    incomplete: { bg: '#fff8e1', fg: '#f57f17' },
    review: { bg: '#e8eaf6', fg: '#283593' },
    na: { bg: '#f5f5f5', fg: '#757575' },
    skip: { bg: '#f5f5f5', fg: '#9e9e9e' },
  };
  const c = colors[result] || { bg: '#f5f5f5', fg: '#757575' };
  return { padding: '2px 8px', borderRadius: 3, fontSize: '0.75rem', fontWeight: 500, background: c.bg, color: c.fg };
}

function severityBadge(severity: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    critical: { bg: '#b71c1c', fg: 'white' },
    high: { bg: '#ffebee', fg: '#c62828' },
    medium: { bg: '#fff8e1', fg: '#f57f17' },
    low: { bg: '#e3f2fd', fg: '#1565c0' },
    info: { bg: '#f5f5f5', fg: '#757575' },
  };
  const c = colors[severity] || { bg: '#f5f5f5', fg: '#757575' };
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600, background: c.bg, color: c.fg };
}

function itemTypeBadge(type: string) {
  const styles: Record<string, React.CSSProperties> = {
    serial_check: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem' },
    measurement: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem' },
    visual_check: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem' },
    note: { background: '#f5f5f5', color: '#424242', padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem' },
  };
  return <span style={styles[type] || {}}>{type.replace(/_/g, ' ')}</span>;
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
const btnStyle: React.CSSProperties = { padding: '0.5rem 1.2rem', fontSize: '0.85rem', cursor: 'pointer', border: 'none', borderRadius: 4 };
const btnSmall: React.CSSProperties = { padding: '0.25rem 0.6rem', fontSize: '0.75rem', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: 3, background: 'white' };
