/**
 * IncidentDrawer — slide-out panel for viewing/creating/editing run incidents.
 *
 * Props:
 *   runId        — parity_runs.id to load incidents for
 *   driverName   — display context
 *   canCreate    — whether the user has incidents.create capability
 *   onClose      — close the drawer
 *   onCountChange — called with new incident count after CRUD so parent can refresh
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  incidentsApi,
  type IncidentType,
  type RunIncident,
  type IncidentLink,
  type IncidentLinkType,
  type CreateRunIncidentParams,
  type UpdateRunIncidentParams,
  ALLOWED_LINK_TYPES,
} from '../services/incidentsApi';

// ── Track segment options ───────────────────────────────────────────────

const TRACK_SEGMENTS = [
  '', 'burnout', 'launch', '60', '330', '660', '1000', 'finish', 'shutdown', 'return',
] as const;

const LANE_OPTIONS = ['', 'L', 'R'] as const;

// ── Styles ──────────────────────────────────────────────────────────────

const DS = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  drawer: {
    width: 460,
    maxWidth: '95vw',
    height: '100%',
    background: 'var(--color-surface, #1e1e2e)',
    borderLeft: '2px solid var(--color-border, #333)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border, #333)',
    flexShrink: 0,
  },
  title: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--color-text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-muted, #888)',
    fontSize: '1.2rem',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  body: {
    flex: 1,
    overflow: 'auto',
    padding: '0.75rem 1rem',
  },
  incidentCard: {
    background: 'var(--color-bg, #262636)',
    border: '1px solid var(--color-border, #333)',
    borderRadius: 6,
    padding: '0.6rem 0.75rem',
    marginBottom: '0.5rem',
  },
  label: {
    display: 'block',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--color-muted, #888)',
    marginBottom: '0.15rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.35rem 0.5rem',
    border: '1px solid var(--color-border, #333)',
    borderRadius: 4,
    background: 'var(--color-bg, #262636)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    fontSize: '0.8rem',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '0.35rem 0.5rem',
    border: '1px solid var(--color-border, #333)',
    borderRadius: 4,
    background: 'var(--color-bg, #262636)',
    color: 'var(--color-text)',
    fontFamily: 'inherit',
    fontSize: '0.8rem',
    minHeight: 60,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'primary') => ({
    padding: '0.35rem 0.7rem',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.75rem',
    background: variant === 'primary' ? 'var(--color-primary, #3b82f6)' : variant === 'danger' ? '#c0392b' : 'var(--color-border, #444)',
    color: variant === 'secondary' ? 'var(--color-text)' : '#fff',
  }),
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.1rem 0.35rem',
    borderRadius: 3,
    fontSize: '0.65rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
    marginRight: '0.25rem',
  }),
  error: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
    borderRadius: 4,
    padding: '0.4rem 0.6rem',
    fontSize: '0.75rem',
    marginBottom: '0.5rem',
  },
  muted: {
    color: 'var(--color-muted, #888)',
    fontSize: '0.7rem',
  },
};

// ── Severity helpers ────────────────────────────────────────────────────

function severityColor(s: number | null): string {
  if (s == null) return '#6b7280';
  if (s <= 1) return '#3b82f6';
  if (s <= 2) return '#f59e0b';
  if (s <= 3) return '#f97316';
  if (s <= 4) return '#ef4444';
  return '#dc2626';
}

function severityLabel(s: number | null): string {
  if (s == null) return '—';
  const labels: Record<number, string> = { 1: 'Low', 2: 'Moderate', 3: 'Significant', 4: 'Severe', 5: 'Critical' };
  return labels[s] ?? String(s);
}

// ── Props ───────────────────────────────────────────────────────────────

interface IncidentDrawerProps {
  runId: number;
  driverName?: string;
  canCreate: boolean;
  onClose: () => void;
  onCountChange?: (runId: number, newCount: number) => void;
}

// ── Component ───────────────────────────────────────────────────────────

export default function IncidentDrawer({ runId, driverName, canCreate, onClose, onCountChange }: IncidentDrawerProps) {
  const navigate = useNavigate();
  const [types, setTypes] = useState<IncidentType[]>([]);
  const [incidents, setIncidents] = useState<RunIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [editingIncident, setEditingIncident] = useState<RunIncident | null>(null);
  const [formTypeId, setFormTypeId] = useState<number>(0);
  const [formSummary, setFormSummary] = useState('');
  const [formDetails, setFormDetails] = useState('');
  const [formLane, setFormLane] = useState('');
  const [formSegment, setFormSegment] = useState('');
  const [formSeverity, setFormSeverity] = useState<string>('');
  const [formOccurredAt, setFormOccurredAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Links state — keyed by incident id
  const [linksMap, setLinksMap] = useState<Record<number, IncidentLink[]>>({});
  const [linksLoading, setLinksLoading] = useState<Record<number, boolean>>({});
  const [expandedLinks, setExpandedLinks] = useState<Record<number, boolean>>({});

  // Add-link form per incident
  const [addLinkForId, setAddLinkForId] = useState<number | null>(null);
  const [linkType, setLinkType] = useState<IncidentLinkType>('external_url');
  const [linkRef, setLinkRef] = useState('');
  const [linkMeta, setLinkMeta] = useState('');
  const [linkShowAdvanced, setLinkShowAdvanced] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linkDeleting, setLinkDeleting] = useState<number | null>(null);

  // ── Load data ─────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [typesRes, incidentsRes] = await Promise.all([
        incidentsApi.listIncidentTypes(),
        incidentsApi.listRunIncidents(runId),
      ]);
      setTypes(typesRes.types);
      setIncidents(incidentsRes.incidents);
      // Clear stale links
      setLinksMap({});
      setExpandedLinks({});
    } catch (e: any) {
      setError(e.message || 'Failed to load incidents');
    }
    setLoading(false);
  }, [runId]);

  const loadLinksFor = useCallback(async (incidentId: number) => {
    setLinksLoading(prev => ({ ...prev, [incidentId]: true }));
    try {
      const res = await incidentsApi.listIncidentLinks(incidentId);
      setLinksMap(prev => ({ ...prev, [incidentId]: res.links }));
    } catch (e: any) {
      console.error('Failed to load links:', e);
    }
    setLinksLoading(prev => ({ ...prev, [incidentId]: false }));
  }, []);

  const toggleLinks = useCallback((incidentId: number) => {
    setExpandedLinks(prev => {
      const next = { ...prev, [incidentId]: !prev[incidentId] };
      if (next[incidentId] && !linksMap[incidentId]) {
        loadLinksFor(incidentId);
      }
      return next;
    });
  }, [linksMap, loadLinksFor]);

  // ── Link CRUD ─────────────────────────────────────────────────────────

  const resetLinkForm = () => {
    setAddLinkForId(null);
    setLinkType('external_url');
    setLinkRef('');
    setLinkMeta('');
    setLinkShowAdvanced(false);
    setLinkError('');
  };

  const handleSaveLink = async () => {
    if (!addLinkForId) return;
    setLinkError('');
    if (!linkRef.trim()) { setLinkError('Reference is required'); return; }
    setLinkSaving(true);
    try {
      const metaParsed = linkMeta.trim() ? JSON.parse(linkMeta.trim()) : null;
      await incidentsApi.createIncidentLink({
        incident_id: addLinkForId,
        link_type: linkType,
        ref: linkRef.trim(),
        meta_json: metaParsed,
      });
      resetLinkForm();
      await loadLinksFor(addLinkForId);
    } catch (e: any) {
      setLinkError(e.message || 'Failed to save link');
    }
    setLinkSaving(false);
  };

  const handleDeleteLink = async (linkId: number, incidentId: number) => {
    setLinkDeleting(linkId);
    try {
      await incidentsApi.deleteIncidentLink(linkId);
      await loadLinksFor(incidentId);
    } catch (e: any) {
      console.error('Failed to delete link:', e);
    }
    setLinkDeleting(null);
  };

  const handleOpenIDR = (ref: string, linkTypeVal: IncidentLinkType, incidentId?: number) => {
    const params = new URLSearchParams({ type: linkTypeVal, ref });
    if (incidentId) params.set('incidentId', String(incidentId));
    navigate(`/parity/idr?${params.toString()}`);
  };

  useEffect(() => { loadData(); }, [loadData]);

  // ── Form helpers ──────────────────────────────────────────────────────

  const resetForm = () => {
    setFormTypeId(types.length > 0 ? types[0].id : 0);
    setFormSummary('');
    setFormDetails('');
    setFormLane('');
    setFormSegment('');
    setFormSeverity('');
    setFormOccurredAt('');
    setFormError('');
    setEditingIncident(null);
  };

  const openCreate = () => {
    resetForm();
    setFormTypeId(types.length > 0 ? types[0].id : 0);
    setMode('create');
  };

  const openEdit = (inc: RunIncident) => {
    setEditingIncident(inc);
    setFormTypeId(inc.incident_type_id);
    setFormSummary(inc.summary);
    setFormDetails(inc.details || '');
    setFormLane(inc.lane || '');
    setFormSegment(inc.track_segment || '');
    setFormSeverity(inc.severity != null ? String(inc.severity) : '');
    setFormOccurredAt(inc.occurred_at_utc || '');
    setFormError('');
    setMode('edit');
  };

  const cancelForm = () => {
    setMode('list');
    resetForm();
  };

  // ── Save ──────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setFormError('');
    if (!formTypeId) { setFormError('Incident type is required'); return; }
    if (!formSummary.trim()) { setFormError('Summary is required'); return; }

    setSaving(true);
    try {
      if (mode === 'create') {
        const params: CreateRunIncidentParams = {
          run_id: runId,
          incident_type_id: formTypeId,
          summary: formSummary.trim(),
          details: formDetails.trim() || null,
          lane: formLane || null,
          track_segment: formSegment || null,
          severity: formSeverity ? Number(formSeverity) : null,
          occurred_at_utc: formOccurredAt || null,
        };
        await incidentsApi.createRunIncident(params);
      } else if (mode === 'edit' && editingIncident) {
        const params: UpdateRunIncidentParams = {
          incident_id: editingIncident.id,
          incident_type_id: formTypeId,
          summary: formSummary.trim(),
          details: formDetails.trim() || null,
          lane: formLane || null,
          track_segment: formSegment || null,
          severity: formSeverity ? Number(formSeverity) : null,
          occurred_at_utc: formOccurredAt || null,
        };
        await incidentsApi.updateRunIncident(params);
      }
      setMode('list');
      resetForm();
      await loadData();
      // Notify parent of count change
      const newRes = await incidentsApi.listRunIncidents(runId);
      onCountChange?.(runId, newRes.incidents.length);
    } catch (e: any) {
      setFormError(e.message || 'Save failed');
    }
    setSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────

  const handleDelete = async (incidentId: number) => {
    setDeleting(true);
    try {
      await incidentsApi.deleteRunIncident(incidentId);
      setConfirmDeleteId(null);
      await loadData();
      const newRes = await incidentsApi.listRunIncidents(runId);
      onCountChange?.(runId, newRes.incidents.length);
    } catch (e: any) {
      setError(e.message || 'Delete failed');
    }
    setDeleting(false);
  };

  // ── Close on overlay click ────────────────────────────────────────────

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div style={DS.overlay} onClick={handleOverlayClick} data-testid="incident-drawer-overlay">
      <div style={DS.drawer} data-testid="incident-drawer">
        {/* Header */}
        <div style={DS.header}>
          <div>
            <div style={DS.title}>
              {mode === 'create' ? 'Add Incident' : mode === 'edit' ? 'Edit Incident' : 'Run Incidents'}
            </div>
            {driverName && <div style={DS.muted}>Run #{runId} · {driverName}</div>}
          </div>
          <button style={DS.closeBtn} onClick={onClose} title="Close" data-testid="incident-drawer-close">✕</button>
        </div>

        {/* Body */}
        <div style={DS.body}>
          {error && <div style={DS.error}>{error}</div>}
          {loading && <div style={DS.muted}>Loading...</div>}

          {/* ── List mode ── */}
          {!loading && mode === 'list' && (
            <>
              {canCreate && (
                <button style={{ ...DS.btn('primary'), marginBottom: '0.75rem', width: '100%' }}
                  onClick={openCreate} data-testid="incident-add-btn">
                  + Add Incident
                </button>
              )}

              {incidents.length === 0 && (
                <div style={{ ...DS.muted, textAlign: 'center', padding: '2rem 0' }}>
                  No incidents recorded for this run.
                </div>
              )}

              {incidents.map(inc => (
                <div key={inc.id} style={DS.incidentCard} data-testid="incident-card">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <div>
                      <span style={DS.badge(severityColor(inc.severity))}>{inc.incident_type_label}</span>
                      {inc.severity != null && (
                        <span style={{ ...DS.muted, marginLeft: '0.25rem' }}>
                          Sev: {severityLabel(inc.severity)}
                        </span>
                      )}
                    </div>
                    {inc.can_edit && (
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button style={DS.btn('secondary')} onClick={() => openEdit(inc)} data-testid="incident-edit-btn">Edit</button>
                        {confirmDeleteId === inc.id ? (
                          <>
                            <button style={DS.btn('danger')} onClick={() => handleDelete(inc.id)} disabled={deleting}
                              data-testid="incident-confirm-delete-btn">
                              {deleting ? '...' : 'Confirm'}
                            </button>
                            <button style={DS.btn('secondary')} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          </>
                        ) : (
                          <button style={DS.btn('danger')} onClick={() => setConfirmDeleteId(inc.id)}
                            data-testid="incident-delete-btn">Delete</button>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.2rem' }}>{inc.summary}</div>
                  {inc.details && <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.2rem' }}>{inc.details}</div>}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', ...DS.muted }}>
                    {inc.lane && <span>Lane: {inc.lane}</span>}
                    {inc.track_segment && <span>Segment: {inc.track_segment}</span>}
                    <span>{inc.occurred_at_utc ? `At: ${inc.occurred_at_utc}` : `Created: ${inc.created_at}`}</span>
                  </div>

                  {/* ── Links section ── */}
                  <div style={{ marginTop: '0.4rem', borderTop: '1px solid var(--color-border, #333)', paddingTop: '0.35rem' }}>
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.7rem', color: 'var(--color-primary, #3b82f6)' }}
                      onClick={() => toggleLinks(inc.id)}
                      data-testid="incident-links-toggle"
                    >
                      {expandedLinks[inc.id] ? '▾ Hide Links' : '▸ Links'}{linksMap[inc.id] ? ` (${linksMap[inc.id].length})` : ''}
                    </button>

                    {expandedLinks[inc.id] && (
                      <div style={{ marginTop: '0.3rem' }} data-testid="incident-links-section">
                        {linksLoading[inc.id] && <div style={DS.muted}>Loading links...</div>}

                        {/* Link list */}
                        {(linksMap[inc.id] || []).map(lnk => (
                          <div key={lnk.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.25rem', fontSize: '0.75rem' }} data-testid="incident-link-item">
                            <span style={DS.badge(lnk.link_type === 'external_url' ? '#6366f1' : '#0891b2')}>
                              {ALLOWED_LINK_TYPES.find(t => t.value === lnk.link_type)?.label || lnk.link_type}
                            </span>
                            {lnk.link_type === 'external_url' ? (
                              <a href={lnk.ref} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--color-primary, #3b82f6)', textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}
                                title={lnk.ref} data-testid="incident-link-url">
                                {lnk.ref}
                              </a>
                            ) : (
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }} title={lnk.ref}>{lnk.ref}</span>
                            )}
                            {(lnk.link_type === 'idr_session' || lnk.link_type === 'idr_file') && (
                              <button
                                style={{ ...DS.btn('secondary'), fontSize: '0.6rem', padding: '0.15rem 0.3rem' }}
                                onClick={() => handleOpenIDR(lnk.ref, lnk.link_type, inc.id)}
                                data-testid="incident-link-idr-btn"
                              >Open IDR Viewer</button>
                            )}
                            {lnk.can_delete && (
                              <button
                                style={{ ...DS.btn('danger'), fontSize: '0.6rem', padding: '0.15rem 0.3rem' }}
                                onClick={() => handleDeleteLink(lnk.id, inc.id)}
                                disabled={linkDeleting === lnk.id}
                                data-testid="incident-link-delete-btn"
                              >{linkDeleting === lnk.id ? '...' : '✕'}</button>
                            )}
                          </div>
                        ))}

                        {!linksLoading[inc.id] && (linksMap[inc.id] || []).length === 0 && (
                          <div style={{ ...DS.muted, fontSize: '0.7rem' }}>No links yet.</div>
                        )}

                        {/* Add link form */}
                        {inc.can_edit && addLinkForId !== inc.id && (
                          <button
                            style={{ ...DS.btn('secondary'), fontSize: '0.65rem', marginTop: '0.25rem' }}
                            onClick={() => { setAddLinkForId(inc.id); setLinkType('external_url'); setLinkRef(''); setLinkMeta(''); setLinkError(''); setLinkShowAdvanced(false); }}
                            data-testid="incident-link-add-btn"
                          >+ Add Link</button>
                        )}

                        {addLinkForId === inc.id && (
                          <div style={{ marginTop: '0.3rem', padding: '0.4rem', background: 'var(--color-surface, #1e1e2e)', border: '1px solid var(--color-border, #333)', borderRadius: 4 }}
                            data-testid="incident-link-form">
                            {linkError && <div style={{ ...DS.error, marginBottom: '0.3rem', fontSize: '0.7rem' }}>{linkError}</div>}
                            <label style={{ ...DS.label, marginTop: 0 }}>Link Type *</label>
                            <select style={{ ...DS.input, fontSize: '0.7rem' }} value={linkType}
                              onChange={e => setLinkType(e.target.value as IncidentLinkType)}
                              data-testid="incident-link-type-select">
                              {ALLOWED_LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                            <label style={DS.label}>Reference *</label>
                            <input style={{ ...DS.input, fontSize: '0.7rem' }} value={linkRef}
                              onChange={e => setLinkRef(e.target.value)}
                              placeholder={linkType === 'external_url' ? 'https://...' : 'Session or file ID'}
                              data-testid="incident-link-ref-input" />
                            <button
                              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6rem', color: 'var(--color-muted, #888)', marginTop: '0.2rem', padding: 0 }}
                              onClick={() => setLinkShowAdvanced(!linkShowAdvanced)}
                            >{linkShowAdvanced ? '▾ Hide Advanced' : '▸ Advanced (meta_json)'}</button>
                            {linkShowAdvanced && (
                              <>
                                <label style={DS.label}>Meta JSON</label>
                                <textarea style={{ ...DS.textarea, fontSize: '0.65rem', minHeight: 40 }} value={linkMeta}
                                  onChange={e => setLinkMeta(e.target.value)}
                                  placeholder='{"key": "value"}'
                                  data-testid="incident-link-meta-input" />
                              </>
                            )}
                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                              <button style={{ ...DS.btn('primary'), fontSize: '0.65rem' }} onClick={handleSaveLink} disabled={linkSaving}
                                data-testid="incident-link-save-btn">
                                {linkSaving ? 'Saving...' : 'Save Link'}
                              </button>
                              <button style={{ ...DS.btn('secondary'), fontSize: '0.65rem' }} onClick={resetLinkForm} disabled={linkSaving}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ── Create/Edit form ── */}
          {!loading && (mode === 'create' || mode === 'edit') && (
            <div data-testid="incident-form">
              {formError && <div style={DS.error}>{formError}</div>}

              <label style={DS.label}>Incident Type *</label>
              <select style={DS.input} value={formTypeId} onChange={e => setFormTypeId(Number(e.target.value))}
                data-testid="incident-type-select">
                {types.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>

              <label style={DS.label}>Summary *</label>
              <input style={DS.input} value={formSummary} onChange={e => setFormSummary(e.target.value)}
                placeholder="Brief description of the incident"
                data-testid="incident-summary-input" />

              <label style={DS.label}>Details</label>
              <textarea style={DS.textarea} value={formDetails} onChange={e => setFormDetails(e.target.value)}
                placeholder="Extended details (optional)"
                data-testid="incident-details-input" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={DS.label}>Lane</label>
                  <select style={DS.input} value={formLane} onChange={e => setFormLane(e.target.value)}>
                    {LANE_OPTIONS.map(l => <option key={l || 'none'} value={l}>{l || '— None —'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={DS.label}>Track Segment</label>
                  <select style={DS.input} value={formSegment} onChange={e => setFormSegment(e.target.value)}>
                    {TRACK_SEGMENTS.map(s => <option key={s || 'none'} value={s}>{s || '— None —'}</option>)}
                  </select>
                </div>
                <div>
                  <label style={DS.label}>Severity (1–5)</label>
                  <select style={DS.input} value={formSeverity} onChange={e => setFormSeverity(e.target.value)}>
                    <option value="">— None —</option>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} — {severityLabel(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={DS.label}>Occurred At (UTC)</label>
                  <input style={DS.input} type="datetime-local" value={formOccurredAt}
                    onChange={e => setFormOccurredAt(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button style={{ ...DS.btn('primary'), flex: 1 }} onClick={handleSave} disabled={saving}
                  data-testid="incident-save-btn">
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Incident' : 'Save Changes'}
                </button>
                <button style={{ ...DS.btn('secondary'), flex: 0 }} onClick={cancelForm} disabled={saving}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
