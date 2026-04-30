/**
 * Tech Card Workspace Panel — event-scoped tech card audit workflow:
 * declaration creation, field capture, artifact metadata, discrepancy audit,
 * and card status management.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry,
  TechCardDeclaration, TechCardField, TechCardArtifact, TechCardAuditResponse,
  EventCardSummaryEntry,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

type ViewMode = 'summary' | 'detail';

export default function TechCardWorkspacePanel({ hasAdmin }: Props) {
  // Event selection
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Event card summary
  const [cardSummary, setCardSummary] = useState<EventCardSummaryEntry[]>([]);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});

  // Declaration detail
  const [declaration, setDeclaration] = useState<TechCardDeclaration | null>(null);
  const [fields, setFields] = useState<TechCardField[]>([]);
  const [artifacts, setArtifacts] = useState<TechCardArtifact[]>([]);
  const [fieldEdits, setFieldEdits] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  // Audit
  const [auditResult, setAuditResult] = useState<TechCardAuditResponse | null>(null);
  const [auditing, setAuditing] = useState(false);

  // Artifact add form
  const [artFilename, setArtFilename] = useState('');
  const [artMime, setArtMime] = useState('');
  const [artPath, setArtPath] = useState('');
  const [addingArt, setAddingArt] = useState(false);

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

  // Load card summary when event selected
  const loadSummary = useCallback(() => {
    if (!selectedEventId) { setCardSummary([]); setCardCounts({}); return; }
    techMasterApi.getEventCardSummary(selectedEventId)
      .then(res => { setCardSummary(res.entries); setCardCounts(res.counts); })
      .catch(() => {});
  }, [selectedEventId]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  // Load declaration detail
  const loadDeclaration = useCallback((declId: number) => {
    techMasterApi.getTechCardDeclaration(declId)
      .then(res => {
        const d = res.declaration;
        setDeclaration(d);
        setFields(d.fields || []);
        setArtifacts(d.artifacts || []);
        setFieldEdits({});
        setAuditResult(null);
        setViewMode('detail');
      })
      .catch(e => setError(e.message));
  }, []);

  // Create declaration for selected entry
  const handleCreateDeclaration = async () => {
    if (!selectedEntryId || !hasAdmin) return;
    setSaving(true); setError('');
    try {
      const res = await techMasterApi.createTechCardDeclaration({ event_entry_id: selectedEntryId });
      loadDeclaration(res.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Save field edits
  const handleSaveFields = async () => {
    if (!declaration || !hasAdmin) return;
    const fieldUpdates = Object.entries(fieldEdits).map(([idStr, value]) => ({
      id: parseInt(idStr),
      declared_value: value || null,
    }));
    if (fieldUpdates.length === 0) return;
    setSaving(true); setError('');
    try {
      await techMasterApi.saveTechCardFields({ declaration_id: declaration.id, fields: fieldUpdates });
      loadDeclaration(declaration.id);
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Update card status
  const handleStatusChange = async (newStatus: string) => {
    if (!declaration || !hasAdmin) return;
    setSaving(true); setError('');
    try {
      await techMasterApi.updateTechCardDeclaration({ declaration_id: declaration.id, card_status: newStatus });
      loadDeclaration(declaration.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  };

  // Run audit
  const handleRunAudit = async () => {
    if (!declaration || !hasAdmin) return;
    setAuditing(true); setError(''); setAuditResult(null);
    try {
      const res = await techMasterApi.runTechCardAudit(declaration.id);
      setAuditResult(res);
      loadDeclaration(declaration.id);
      loadSummary();
    } catch (e: any) { setError(e.message); }
    setAuditing(false);
  };

  // Add artifact metadata
  const handleAddArtifact = async () => {
    if (!declaration || !hasAdmin || !artFilename) return;
    setAddingArt(true); setError('');
    try {
      await techMasterApi.addTechCardArtifact({
        declaration_id: declaration.id,
        original_filename: artFilename,
        storage_path: artPath || undefined,
        mime_type: artMime || undefined,
      });
      setArtFilename(''); setArtMime(''); setArtPath('');
      loadDeclaration(declaration.id);
    } catch (e: any) { setError(e.message); }
    setAddingArt(false);
  };

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || null;
  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];

  // Check if selected entry already has a declaration
  const entryHasDecl = selectedEntryId ? cardSummary.some(s => s.entry_id === selectedEntryId && s.card_status !== 'no_declaration') : false;
  const entryDeclSummary = selectedEntryId ? cardSummary.find(s => s.entry_id === selectedEntryId) : null;

  const hasUnsavedEdits = Object.keys(fieldEdits).length > 0;

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
              setSelectedEntryId(null); setDeclaration(null); setViewMode('summary');
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
            <button onClick={() => { setViewMode('summary'); setDeclaration(null); }} style={{ ...btnStyle, background: viewMode === 'summary' ? 'var(--color-primary)' : '#e0e0e0', color: viewMode === 'summary' ? 'white' : 'inherit' }}>
              Card Summary
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
            {Object.entries(cardCounts).filter(([, v]) => v > 0).map(([status, count]) => (
              <span key={status} style={cardStatusBadgeStyle(status)}>
                {status.replace(/_/g, ' ')}: {count}
              </span>
            ))}
          </div>

          {/* Entry selection + card status grid */}
          <div style={{ maxHeight: 400, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '1rem' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Driver</th>
                  <th style={thStyle}>Class</th>
                  <th style={thStyle}>Card Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading...</td></tr>
                ) : entries.length === 0 ? (
                  <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-muted)' }}>No entries.</td></tr>
                ) : entries.map(e => {
                  const cs = cardSummary.find(s => s.entry_id === e.id);
                  const status = cs?.card_status || 'no_declaration';
                  const isSel = e.id === selectedEntryId;
                  return (
                    <tr key={e.id} onClick={() => setSelectedEntryId(e.id)} style={{ cursor: 'pointer', background: isSel ? 'var(--color-primary-light, #e3f2fd)' : undefined }}>
                      <td style={tdStyle}><strong>{e.competition_number || '—'}</strong></td>
                      <td style={tdStyle}>{e.person_name || <span style={{ color: 'var(--color-text-muted)' }}>unlinked</span>}</td>
                      <td style={tdStyle}>{e.class_index || '—'}</td>
                      <td style={tdStyle}><span style={cardStatusBadgeStyle(status)}>{status.replace(/_/g, ' ')}</span></td>
                      <td style={tdStyle}>
                        {status !== 'no_declaration' && (
                          <button onClick={(ev) => { ev.stopPropagation(); openLatestDecl(e.id); }} style={{ ...btnSmall, marginRight: 4 }}>View</button>
                        )}
                        {status === 'no_declaration' && hasAdmin && (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); setSelectedEntryId(e.id); handleCreateForEntry(e.id); }}
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

          {/* Selected entry quick actions */}
          {selectedEntry && !entryHasDecl && hasAdmin && (
            <button onClick={handleCreateDeclaration} disabled={saving} style={{ ...btnStyle, background: 'var(--color-primary)', color: 'white', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'Creating...' : `Create Declaration for #${selectedEntry.competition_number || selectedEntry.id}`}
            </button>
          )}
          {selectedEntry && entryHasDecl && entryDeclSummary && (
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Entry #{selectedEntry.competition_number} has a declaration ({entryDeclSummary.card_status.replace(/_/g, ' ')}).
              <button onClick={() => openLatestDeclForEntry(selectedEntryId!)} style={{ ...btnSmall, marginLeft: 8 }}>Open Detail</button>
            </p>
          )}
        </div>
      )}

      {/* ── DETAIL VIEW ── */}
      {viewMode === 'detail' && declaration && (
        <div>
          <button onClick={() => { setViewMode('summary'); setDeclaration(null); }} style={{ ...btnSmall, marginBottom: '0.75rem' }}>
            &larr; Back to Summary
          </button>

          {/* Header */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 6, padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>
                  Tech Card — #{declaration.competition_number || '?'} {declaration.person_name || 'Unknown'}
                  <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {declaration.entry_category}/{declaration.entry_class} &middot; Rev {declaration.revision}
                  </span>
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0' }}>
                  {declaration.event_name}
                </p>
              </div>
              <span style={cardStatusBadgeStyle(declaration.card_status)}>
                {declaration.card_status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Status transitions */}
            {hasAdmin && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                {declaration.card_status === 'uploaded' && (
                  <button onClick={() => handleStatusChange('under_review')} style={btnSmall}>Mark Under Review</button>
                )}
                {['under_review', 'discrepancy_found'].includes(declaration.card_status) && (
                  <button onClick={() => handleStatusChange('closed')} style={btnSmall}>Close</button>
                )}
                {declaration.card_status !== 'closed' && (
                  <button onClick={handleRunAudit} disabled={auditing} style={{ ...btnSmall, background: '#e3f2fd', color: '#1565c0' }}>
                    {auditing ? 'Auditing...' : 'Run Audit'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Audit Result */}
          {auditResult && (
            <div style={{
              padding: '0.75rem', borderRadius: 4, marginBottom: '1rem',
              border: '1px solid var(--color-border)',
              background: auditResult.finding_count === 0 ? '#e8f5e9' : '#ffebee',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                Audit: {auditResult.card_status === 'audited' ? '\u2705 No discrepancies' : `\u274C ${auditResult.finding_count} discrepancy(ies) found`}
              </div>
              {auditResult.flags.length > 0 && (
                <ul style={{ margin: '0.25rem 0 0 1rem', fontSize: '0.8rem' }}>
                  {auditResult.flags.map((f, i) => <li key={i}>{auditFlagLabel(f)}</li>)}
                </ul>
              )}
            </div>
          )}

          {/* Findings */}
          {declaration.findings && declaration.findings.length > 0 && !auditResult && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Findings ({declaration.findings.length})</h5>
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                <table style={tableStyle}>
                  <thead><tr><th style={thStyle}>Type</th><th style={thStyle}>Severity</th><th style={thStyle}>Description</th><th style={thStyle}>Status</th></tr></thead>
                  <tbody>
                    {declaration.findings.map(f => (
                      <tr key={f.id}>
                        <td style={tdStyle}>{f.finding_type}</td>
                        <td style={tdStyle}><span style={severityBadge(f.severity)}>{f.severity}</span></td>
                        <td style={tdStyle}>{f.description}</td>
                        <td style={tdStyle}><span style={{ fontSize: '0.75rem' }}>{f.disposition}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Declaration Fields */}
          <div style={{ marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Declaration Fields</h5>
            {fields.length === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No fields scaffolded.</p>
            ) : (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 4 }}>
                <table style={{ ...tableStyle, fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, width: '30%' }}>Field</th>
                      <th style={{ ...thStyle, width: '15%' }}>Group</th>
                      <th style={{ ...thStyle, width: '10%' }}>Type</th>
                      <th style={{ ...thStyle, width: '35%' }}>Declared Value</th>
                      <th style={{ ...thStyle, width: '10%' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map(f => {
                      const editVal = fieldEdits[f.id] !== undefined ? fieldEdits[f.id] : (f.declared_value ?? '');
                      const filled = (f.declared_value ?? '').trim() !== '';
                      return (
                        <tr key={f.id}>
                          <td style={tdStyle}>{f.field_label}</td>
                          <td style={tdStyle}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{f.field_group || '—'}</span></td>
                          <td style={tdStyle}>{fieldTypeBadge(f.field_type)}</td>
                          <td style={tdStyle}>
                            {hasAdmin ? (
                              f.field_type === 'boolean' ? (
                                <select
                                  value={editVal}
                                  onChange={e => setFieldEdits(prev => ({ ...prev, [f.id]: e.target.value }))}
                                  style={{ ...selectStyle, minWidth: 100 }}
                                >
                                  <option value="">—</option>
                                  <option value="yes">Yes</option>
                                  <option value="no">No</option>
                                </select>
                              ) : (
                                <input
                                  type={f.field_type === 'number' ? 'number' : 'text'}
                                  step={f.field_type === 'number' ? '0.01' : undefined}
                                  value={editVal}
                                  onChange={e => setFieldEdits(prev => ({ ...prev, [f.id]: e.target.value }))}
                                  style={{ ...inputStyle, width: '100%' }}
                                  placeholder={f.field_type === 'select' ? 'select value' : 'enter value'}
                                />
                              )
                            ) : (
                              <span>{f.declared_value || <span style={{ color: 'var(--color-text-muted)' }}>—</span>}</span>
                            )}
                          </td>
                          <td style={tdStyle}>{filled ? <span style={{ color: '#2e7d32', fontSize: '0.7rem' }}>filled</span> : <span style={{ color: '#f57f17', fontSize: '0.7rem' }}>empty</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {hasAdmin && hasUnsavedEdits && (
              <button onClick={handleSaveFields} disabled={saving} style={{ ...btnStyle, marginTop: '0.5rem', background: 'var(--color-primary)', color: 'white', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Saving...' : 'Save Field Changes'}
              </button>
            )}
          </div>

          {/* Artifacts */}
          <div style={{ marginBottom: '1rem' }}>
            <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Artifacts / Card Files ({artifacts.length})</h5>
            {artifacts.length > 0 && (
              <div style={{ border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.5rem' }}>
                <table style={{ ...tableStyle, fontSize: '0.8rem' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Filename</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Size</th>
                      <th style={thStyle}>Uploaded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artifacts.map(a => (
                      <tr key={a.id}>
                        <td style={tdStyle}>{a.original_filename}</td>
                        <td style={tdStyle}>{a.mime_type || '—'}</td>
                        <td style={tdStyle}>{a.file_size_bytes ? formatBytes(a.file_size_bytes) : '—'}</td>
                        <td style={tdStyle}>{formatTime(a.uploaded_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {hasAdmin && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle}>Filename</label>
                  <input type="text" value={artFilename} onChange={e => setArtFilename(e.target.value)} style={inputStyle} placeholder="tech_card_scan.pdf" />
                </div>
                <div>
                  <label style={labelStyle}>MIME Type</label>
                  <input type="text" value={artMime} onChange={e => setArtMime(e.target.value)} style={{ ...inputStyle, width: 120 }} placeholder="application/pdf" />
                </div>
                <div>
                  <label style={labelStyle}>Storage Path</label>
                  <input type="text" value={artPath} onChange={e => setArtPath(e.target.value)} style={{ ...inputStyle, width: 200 }} placeholder="optional path" />
                </div>
                <button onClick={handleAddArtifact} disabled={addingArt || !artFilename} style={{ ...btnSmall, opacity: addingArt || !artFilename ? 0.5 : 1 }}>
                  {addingArt ? 'Adding...' : 'Add Artifact'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ── Inline handlers that need state ──

  function openLatestDecl(entryId: number) {
    techMasterApi.listTechCardsByEntry(entryId)
      .then(res => {
        if (res.declarations.length > 0) {
          loadDeclaration(res.declarations[0].id);
        }
      })
      .catch(e => setError(e.message));
  }

  function openLatestDeclForEntry(entryId: number) {
    openLatestDecl(entryId);
  }

  function handleCreateForEntry(entryId: number) {
    if (!hasAdmin) return;
    setSaving(true); setError('');
    techMasterApi.createTechCardDeclaration({ event_entry_id: entryId })
      .then(res => {
        loadDeclaration(res.id);
        loadSummary();
        setSaving(false);
      })
      .catch(e => { setError(e.message); setSaving(false); });
  }
}

// ── Helper functions ────────────────────────────────────────────────────

function auditFlagLabel(flag: string): string {
  const map: Record<string, string> = {
    no_card_on_file: 'No tech card scan/artifact on file',
    fuel_type_mismatch: 'Declared fuel type does not match fuel check record',
    declared_weight_below_rule: 'Declared weight is below the class rule minimum',
    measured_weight_below_declared: 'Measured weight is below declared minimum',
    inspection_failure_present: 'Entry has a failed inspection record',
    wheelbase_discrepancy: 'Declared wheelbase differs from measured wheelbase',
    missing_key_declaration: 'Key declaration field not filled in',
  };
  // Handle missing_declaration_* variants
  if (flag.startsWith('missing_declaration_')) return `Missing declaration: ${flag.replace('missing_declaration_', '').replace(/_/g, ' ')}`;
  return map[flag] || flag.replace(/_/g, ' ');
}

function cardStatusBadgeStyle(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    no_declaration: { bg: '#f5f5f5', fg: '#757575' },
    missing: { bg: '#fff8e1', fg: '#f57f17' },
    uploaded: { bg: '#e3f2fd', fg: '#1565c0' },
    under_review: { bg: '#e8eaf6', fg: '#283593' },
    audited: { bg: '#e8f5e9', fg: '#2e7d32' },
    discrepancy_found: { bg: '#ffebee', fg: '#c62828' },
    closed: { bg: '#f5f5f5', fg: '#424242' },
  };
  const c = colors[status] || { bg: '#f5f5f5', fg: '#757575' };
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

function fieldTypeBadge(type: string) {
  const styles: Record<string, React.CSSProperties> = {
    text: { background: '#f5f5f5', color: '#424242', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    number: { background: '#fff3e0', color: '#e65100', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    boolean: { background: '#e3f2fd', color: '#1565c0', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
    select: { background: '#f3e5f5', color: '#7b1fa2', padding: '1px 6px', borderRadius: 3, fontSize: '0.7rem' },
  };
  return <span style={styles[type] || {}}>{type}</span>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
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
