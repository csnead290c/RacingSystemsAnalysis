/**
 * Entry Dossier Panel — unified cross-module technical view for one event entry.
 * Shows scale, fuel, inspection, tech card, teardown status + aggregated findings.
 * Batch 11: Added print stylesheet and export support.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  EventInstance, EventEntry,
  EntryDossierResponse, DossierFindingItem,
  EntryHold, EntryHoldWithHistory,
} from '../../services/techMasterApi';
import '../../styles/print-dossier.css';

interface Props {
  hasAdmin: boolean;
}

export default function EntryDossierPanel({ hasAdmin: _hasAdmin }: Props) {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null);
  const [classFilter, setClassFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [dossier, setDossier] = useState<EntryDossierResponse | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Batch 12: Hold/escalation state
  const [holds, setHolds] = useState<EntryHoldWithHistory[]>([]);
  const [holdsLoading, setHoldsLoading] = useState(false);
  const [showPlaceHoldModal, setShowPlaceHoldModal] = useState(false);
  const [holdToClears, setHoldToClear] = useState<EntryHold | null>(null);
  const [holdError, setHoldError] = useState('');

  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 })
      .then(res => setEvents(res.events))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedEventId) { setEntries([]); return; }
    setLoading(true);
    techMasterApi.listEntriesForEvent(selectedEventId, classFilter || undefined)
      .then(res => { setEntries(res.entries); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [selectedEventId, classFilter]);

  const loadDossier = useCallback((entryId: number) => {
    setDossierLoading(true); setError(''); setDossier(null);
    techMasterApi.getEntryDossier(entryId)
      .then(res => { setDossier(res); setDossierLoading(false); })
      .catch(e => { setError(e.message); setDossierLoading(false); });
  }, []);

  // Batch 12: Load hold history
  const loadHolds = useCallback((entryId: number) => {
    setHoldsLoading(true); setHoldError('');
    techMasterApi.getHoldHistory(entryId)
      .then(res => { setHolds(res.holds); setHoldsLoading(false); })
      .catch(e => { setHoldError(e.message); setHoldsLoading(false); });
  }, []);

  useEffect(() => {
    if (selectedEntryId) {
      loadDossier(selectedEntryId);
      loadHolds(selectedEntryId);
    } else {
      setDossier(null);
      setHolds([]);
    }
  }, [selectedEntryId, loadDossier, loadHolds]);

  const classOptions = [...new Set(entries.map(e => e.class_index).filter(Boolean))] as string[];

  return (
    <div>
      {/* Selectors */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <label style={labelStyle}>Event</label>
          <select value={selectedEventId ?? ''} onChange={e => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setSelectedEntryId(null); setDossier(null); }} style={selectStyle}>
            <option value="">— Select event —</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>)}
          </select>
        </div>
        {selectedEventId && (
          <div>
            <label style={labelStyle}>Class</label>
            <select value={classFilter} onChange={e => { setClassFilter(e.target.value); setSelectedEntryId(null); }} style={selectStyle}>
              <option value="">All</option>
              {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        {selectedEventId && (
          <div>
            <label style={labelStyle}>Entry</label>
            <select value={selectedEntryId ?? ''} onChange={e => setSelectedEntryId(e.target.value ? Number(e.target.value) : null)} style={{ ...selectStyle, minWidth: 280 }}>
              <option value="">— Select entry —</option>
              {entries.map(en => <option key={en.id} value={en.id}>#{en.competition_number || '?'} — {en.person_name || 'Unknown'} ({en.class_index})</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>{error}</p>}
      {loading && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading entries...</p>}
      {dossierLoading && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading dossier...</p>}

      {/* Dossier Content */}
      {dossier && (
        <div>
          {/* Header + Readiness */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 6, background: readinessBg(dossier.readiness) }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>
                #{dossier.entry.competition_number || '?'} — {dossier.entry.person_name || 'Unknown Driver'}
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {dossier.entry.category}/{dossier.entry.class_index}
                {dossier.entry.org_name && <> &middot; {dossier.entry.org_name}</>}
                {dossier.entry.vehicle_desc && <> &middot; {dossier.entry.vehicle_desc}</>}
                {' '}&middot; {dossier.entry.event_name}
              </p>
              {/* Batch 12: Active holds display */}
              {holds.filter(h => h.is_active).length > 0 && (
                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {holds.filter(h => h.is_active).map(h => (
                    <span key={h.id} style={holdBadgeStyle(h.hold_type)} title={h.reason}>
                      {holdTypeLabel(h.hold_type)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={readinessBadge(dossier.readiness)}>
                {dossier.readiness === 'clear' ? '✓ Clear' : dossier.readiness === 'critical' ? '✕ Critical Issues' : '⚠ Has Issues'}
              </span>
              {dossier.issues.length > 0 && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {dossier.issues.map(i => i.replace(/_/g, ' ')).join(', ')}
                </div>
              )}
              {/* Batch 12: Hold action button */}
              <div style={{ marginTop: '0.5rem' }}>
                <button onClick={() => setShowPlaceHoldModal(true)} style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: 4, border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer' }}>
                  Place Hold
                </button>
              </div>
            </div>
          </div>

          {/* Module Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            {/* Scale */}
            <ModuleCard
              title="Scale"
              status={dossier.scale.status}
              items={[
                { label: 'Records', value: String(dossier.scale.record_count) },
                { label: 'Eff. Weight', value: dossier.scale.effective_weight ? `${dossier.scale.effective_weight} lbs` : '—' },
                ...(dossier.scale.latest_record ? [{ label: 'Last Weigh', value: fmtDate(dossier.scale.latest_record.measured_at) }] : []),
              ]}
            />

            {/* Fuel */}
            <ModuleCard
              title="Fuel"
              status={dossier.fuel.status}
              items={[
                { label: 'Records', value: String(dossier.fuel.record_count) },
                { label: 'Failures', value: String(dossier.fuel.fail_count) },
                ...(dossier.fuel.latest_record ? [
                  { label: 'Type', value: dossier.fuel.latest_record.fuel_type_detected || '—' },
                  { label: 'Result', value: dossier.fuel.latest_record.overall_result },
                ] : []),
              ]}
            />

            {/* Inspection */}
            <ModuleCard
              title="Inspection"
              status={dossier.inspection.status}
              items={[
                { label: 'Records', value: String(dossier.inspection.record_count) },
                { label: 'Pass/Fail', value: `${dossier.inspection.pass_count}/${dossier.inspection.fail_count}` },
                ...(dossier.inspection.latest_record ? [
                  { label: 'Latest', value: dossier.inspection.latest_record.template_label || dossier.inspection.latest_record.overall_result },
                ] : []),
              ]}
            />

            {/* Tech Card */}
            <ModuleCard
              title="Tech Card"
              status={dossier.techcard.status}
              items={[
                { label: 'Declarations', value: String(dossier.techcard.declaration_count) },
                ...(dossier.techcard.latest_declaration ? [
                  { label: 'Rev', value: String(dossier.techcard.latest_declaration.revision) },
                  { label: 'Fields', value: String(dossier.techcard.latest_declaration.field_count) },
                  { label: 'Artifacts', value: String(dossier.techcard.latest_declaration.artifact_count) },
                  { label: 'Audited', value: fmtDate(dossier.techcard.latest_declaration.audited_at) },
                ] : []),
              ]}
            />

            {/* Teardown */}
            <ModuleCard
              title="Teardown"
              status={dossier.teardown.status}
              items={[
                { label: 'Records', value: String(dossier.teardown.record_count) },
                ...(dossier.teardown.latest_record ? [
                  { label: 'Result', value: dossier.teardown.latest_record.overall_result || '—' },
                  { label: 'Bay', value: dossier.teardown.latest_record.bay_assignment || '—' },
                  { label: 'Items', value: String(dossier.teardown.latest_record.item_count) },
                  { label: 'Template', value: dossier.teardown.latest_record.template_label || '—' },
                ] : []),
              ]}
            />

            {/* Findings Summary Card */}
            <div style={{ ...cardStyle, borderLeft: dossier.findings.open_count > 0 ? '3px solid #c62828' : '3px solid #4caf50' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.4rem' }}>Findings</div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <StatPill label="Total" value={dossier.findings.total_count} />
                <StatPill label="Open" value={dossier.findings.open_count} color={dossier.findings.open_count > 0 ? '#c62828' : undefined} />
                <StatPill label="Critical" value={dossier.findings.critical_count} color={dossier.findings.critical_count > 0 ? '#b71c1c' : undefined} />
                <StatPill label="High" value={dossier.findings.high_count} color={dossier.findings.high_count > 0 ? '#e65100' : undefined} />
              </div>
              {Object.keys(dossier.findings.by_module).length > 0 && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {Object.entries(dossier.findings.by_module).map(([mod, cnt]) => (
                    <span key={mod} style={{ marginRight: '0.5rem' }}>{mod.replace(/_/g, ' ')}: {cnt}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Open Findings Table */}
          {dossier.findings.open_findings_list.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Open Findings ({dossier.findings.open_count})</h5>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Module</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Severity</th>
                      <th style={thStyle}>Description</th>
                      <th style={thStyle}>Measured</th>
                      <th style={thStyle}>Expected</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossier.findings.open_findings_list.map((f: DossierFindingItem) => (
                      <tr key={f.id}>
                        <td style={tdCellStyle}><span style={{ fontSize: '0.7rem', background: '#f5f5f5', padding: '1px 4px', borderRadius: 2 }}>{f.case_type.replace(/_/g, ' ')}</span></td>
                        <td style={tdCellStyle}><span style={{ fontSize: '0.7rem' }}>{f.finding_type.replace(/_/g, ' ')}</span></td>
                        <td style={tdCellStyle}><span style={sevBadge(f.severity)}>{f.severity}</span></td>
                        <td style={tdCellStyle}>{f.description}</td>
                        <td style={tdCellStyle}><span style={{ fontSize: '0.75rem' }}>{f.measured_value || '—'}</span></td>
                        <td style={tdCellStyle}><span style={{ fontSize: '0.75rem' }}>{f.expected_value || '—'}</span></td>
                        <td style={tdCellStyle}><span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{fmtDate(f.created_at)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Batch 12: Hold History Section */}
          {holds.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <h5 style={{ fontSize: '0.85rem', marginBottom: '0.4rem' }}>Hold History ({holds.length})</h5>
              {holdError && <p style={{ color: 'var(--color-error)', fontSize: '0.75rem', marginBottom: '0.5rem' }}>{holdError}</p>}
              {holdsLoading && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>Loading holds...</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {holds.map(h => (
                  <div key={h.id} style={{ border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.6rem', background: h.is_active ? '#fffbf0' : 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={holdBadgeStyle(h.hold_type)}>{holdTypeLabel(h.hold_type)}</span>
                        {h.is_active ? (
                          <span style={{ fontSize: '0.7rem', color: '#f57f17', fontWeight: 600 }}>ACTIVE</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Cleared</span>
                        )}
                      </div>
                      {h.is_active && (
                        <button onClick={() => setHoldToClear(h)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: 3, border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer' }}>
                          Clear Hold
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                      <strong>Reason:</strong> {h.reason}
                    </div>
                    {h.notes && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.2rem' }}>
                        <strong>Notes:</strong> {h.notes}
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>Placed by {h.placed_by_name || `User ${h.placed_by}`} on {fmtDate(h.placed_at)}</span>
                      {!h.is_active && h.cleared_by && (
                        <span>Cleared by {h.cleared_by_name || `User ${h.cleared_by}`} on {fmtDate(h.cleared_at)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
            Generated: {fmtDate(dossier.generated_at)}
          </div>
        </div>
      )}

      {/* Batch 12: Hold Placement Modal */}
      {showPlaceHoldModal && selectedEntryId && (
        <HoldPlacementModal
          entryId={selectedEntryId}
          onClose={() => setShowPlaceHoldModal(false)}
          onSuccess={() => {
            setShowPlaceHoldModal(false);
            if (selectedEntryId) {
              loadDossier(selectedEntryId);
              loadHolds(selectedEntryId);
            }
          }}
        />
      )}

      {/* Batch 12: Hold Clearance Modal */}
      {holdToClears && (
        <HoldClearanceModal
          hold={holdToClears}
          onClose={() => setHoldToClear(null)}
          onSuccess={() => {
            setHoldToClear(null);
            if (selectedEntryId) {
              loadDossier(selectedEntryId);
              loadHolds(selectedEntryId);
            }
          }}
        />
      )}

      {!dossier && !dossierLoading && selectedEventId && !selectedEntryId && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Select an entry to view its technical dossier.</p>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function ModuleCard({ title, status, items }: { title: string; status: string; items: { label: string; value: string }[] }) {
  return (
    <div style={{ ...cardStyle, borderLeft: `3px solid ${statusColor(status)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{title}</span>
        <span style={statusBadge(status)}>{status.replace(/_/g, ' ')}</span>
      </div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.1rem 0' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>{it.label}</span>
          <span>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'inherit' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{label}</div>
    </div>
  );
}

// ── Style helpers ───────────────────────────────────────────────────────

function statusColor(s: string): string {
  const m: Record<string, string> = {
    weighed: '#4caf50', checked_ok: '#4caf50', inspected_ok: '#4caf50', audited: '#4caf50', closed: '#4caf50', completed: '#4caf50', pass: '#4caf50',
    not_weighed: '#9e9e9e', not_checked: '#9e9e9e', not_inspected: '#9e9e9e', no_declaration: '#9e9e9e', no_teardown: '#9e9e9e', missing: '#9e9e9e',
    has_failure: '#c62828', discrepancy_found: '#c62828', fail: '#c62828', under_minimum: '#c62828',
    has_incomplete: '#f57f17', in_progress: '#f57f17', uploaded: '#1565c0', under_review: '#1565c0', scheduled: '#1565c0', incomplete: '#f57f17', review: '#283593',
  };
  return m[s] || '#9e9e9e';
}

function statusBadge(s: string): React.CSSProperties {
  const c = statusColor(s);
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 500, background: c + '18', color: c };
}

function readinessBg(r: string): string {
  if (r === 'clear') return '#e8f5e915';
  if (r === 'critical') return '#ffebee';
  return '#fff8e1';
}

function readinessBadge(r: string): React.CSSProperties {
  const m: Record<string, { bg: string; fg: string }> = {
    clear: { bg: '#e8f5e9', fg: '#2e7d32' },
    has_issues: { bg: '#fff8e1', fg: '#f57f17' },
    critical: { bg: '#ffebee', fg: '#c62828' },
  };
  const c = m[r] || m.has_issues;
  return { padding: '4px 12px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600, background: c.bg, color: c.fg };
}

function sevBadge(s: string): React.CSSProperties {
  const m: Record<string, { bg: string; fg: string }> = {
    critical: { bg: '#b71c1c', fg: 'white' }, high: { bg: '#ffebee', fg: '#c62828' },
    medium: { bg: '#fff8e1', fg: '#f57f17' }, low: { bg: '#e3f2fd', fg: '#1565c0' }, info: { bg: '#f5f5f5', fg: '#757575' },
  };
  const c = m[s] || m.info;
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg };
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return d; }
}

// ── Batch 12: Hold helper functions ────────────────────────────────────

function holdTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    compliance_hold: 'Compliance Hold',
    tech_hold: 'Tech Hold',
    escalation: 'Escalation',
    flag: 'Flag',
  };
  return labels[type] || type;
}

function holdBadgeStyle(type: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    compliance_hold: { bg: '#ef4444', fg: 'white' },
    tech_hold: { bg: '#f97316', fg: 'white' },
    escalation: { bg: '#a855f7', fg: 'white' },
    flag: { bg: '#eab308', fg: 'white' },
  };
  const c = colors[type] || { bg: '#9e9e9e', fg: 'white' };
  return { padding: '2px 8px', borderRadius: 3, fontSize: '0.7rem', fontWeight: 600, background: c.bg, color: c.fg, display: 'inline-block' };
}

// ── Batch 12: Hold Placement Modal ─────────────────────────────────────

function HoldPlacementModal({ entryId, onClose, onSuccess }: { entryId: number; onClose: () => void; onSuccess: () => void }) {
  const [holdType, setHoldType] = useState('tech_hold');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!reason || reason.length < 10) {
      setError('Reason must be at least 10 characters');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await techMasterApi.placeHold({ entry_id: entryId, hold_type: holdType, reason, notes: notes || undefined });
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to place hold');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Place Hold on Entry</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Hold Type</label>
          <select value={holdType} onChange={e => setHoldType(e.target.value)} style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)' }}>
            <option value="compliance_hold">Compliance Hold</option>
            <option value="tech_hold">Tech Hold</option>
            <option value="escalation">Escalation</option>
            <option value="flag">Flag</option>
          </select>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Reason *</label>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason for hold (min 10 characters)" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)', minHeight: 80, fontFamily: 'inherit' }} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)', minHeight: 60, fontFamily: 'inherit' }} />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)', background: 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 4, border: 'none', background: '#3b82f6', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {submitting ? 'Placing...' : 'Place Hold'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Batch 12: Hold Clearance Modal ─────────────────────────────────────

function HoldClearanceModal({ hold, onClose, onSuccess }: { hold: EntryHold; onClose: () => void; onSuccess: () => void }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      await techMasterApi.clearHold(hold.id, notes || undefined);
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to clear hold');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 8, padding: '1.5rem', maxWidth: 500, width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Clear Hold</h3>
        
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f5f5f5', borderRadius: 4 }}>
          <div style={{ marginBottom: '0.3rem' }}>
            <span style={holdBadgeStyle(hold.hold_type)}>{holdTypeLabel(hold.hold_type)}</span>
          </div>
          <div style={{ fontSize: '0.85rem', marginBottom: '0.2rem' }}>
            <strong>Reason:</strong> {hold.reason}
          </div>
          {hold.notes && (
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <strong>Notes:</strong> {hold.notes}
            </div>
          )}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.3rem' }}>Clearance Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes about clearing this hold" style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)', minHeight: 60, fontFamily: 'inherit' }} />
        </div>

        {error && <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={submitting} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 4, border: '1px solid var(--color-border)', background: 'white', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: 4, border: 'none', background: '#22c55e', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            {submitting ? 'Clearing...' : 'Clear Hold'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.15rem' };
const selectStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid var(--color-border)', minWidth: 200 };
const cardStyle: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', background: 'white' };
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', position: 'sticky' as const, top: 0, background: 'white' };
const tdCellStyle: React.CSSProperties = { padding: '0.35rem 0.6rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
