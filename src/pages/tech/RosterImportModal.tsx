/**
 * RosterImportModal — Bulk paste/CSV roster import with identity matching preview
 *
 * Workflow:
 * 1. User pastes roster text (CSV/TSV)
 * 2. Backend parses + matches identities (exact / suggestions / none)
 * 3. User reviews matches, resolves ambiguities, opts to create provisionals
 * 4. User commits — entries created with linked or provisional identities
 */

import { useState } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type { RosterPreviewRow, RosterPreviewResponse, RosterCommitRow } from '../../services/techMasterApi';

interface Props {
  eventInstanceId: number;
  onClose: () => void;
  onCommitted: () => void;
}

type Step = 'paste' | 'preview' | 'committing' | 'done';

export default function RosterImportModal({ eventInstanceId, onClose, onCommitted }: Props) {
  const [step, setStep] = useState<Step>('paste');
  const [rosterText, setRosterText] = useState('');
  const [preview, setPreview] = useState<RosterPreviewResponse | null>(null);
  const [resolvedRows, setResolvedRows] = useState<Map<number, Partial<RosterCommitRow>>>(new Map());
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [commitResult, setCommitResult] = useState<{ created: number; total: number } | null>(null);

  // Step 1: Parse and preview
  const handlePreview = async () => {
    if (!rosterText.trim()) { setError('Paste roster data first'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await techMasterApi.rosterPreview(eventInstanceId, rosterText);
      setPreview(res);
      setResolvedRows(new Map());
      setStep('preview');
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  // Step 2: Commit
  const handleCommit = async () => {
    if (!preview) return;
    setStep('committing');
    setError('');
    try {
      const rows: RosterCommitRow[] = preview.rows
        .filter(r => !r.is_duplicate)
        .map(r => {
          const resolved = resolvedRows.get(r.row) || {};
          const personId = resolved.person_id ?? r.person_match.person_id;
          const orgId = resolved.org_id ?? r.org_match.org_id;
          return {
            competition_number: r.raw.competition_number,
            driver_name: r.raw.driver_name,
            team_name: r.raw.team_name,
            vehicle_description: r.raw.vehicle_description,
            category: r.raw.category,
            class_index: r.raw.class_index,
            person_id: personId,
            org_id: orgId,
            vehicle_id: resolved.vehicle_id ?? null,
            create_person: resolved.create_person ?? (!personId && r.raw.driver_name.trim() !== ''),
            create_org: resolved.create_org ?? (!orgId && r.raw.team_name.trim() !== ''),
          };
        });

      const res = await techMasterApi.rosterCommit(eventInstanceId, rows);
      setCommitResult({ created: res.created, total: res.total });
      setStep('done');
    } catch (e: any) {
      setError(e.message);
      setStep('preview');
    }
  };

  // Resolve a row's identity selection
  const resolveRow = (rowIdx: number, field: keyof RosterCommitRow, value: unknown) => {
    setResolvedRows(prev => {
      const next = new Map(prev);
      const current = next.get(rowIdx) || {};
      next.set(rowIdx, { ...current, [field]: value });
      return next;
    });
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Import Roster</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {error && <div style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}

        {/* Step 1: Paste */}
        {step === 'paste' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
              Paste pre-event roster data below for upcoming or current events.
              For historical events, use Link Review &rarr; Admin Actions to derive entries from run data.
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Expected columns (comma or tab separated):
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem', fontFamily: 'monospace' }}>
              Number, Driver Name, Team Name, Vehicle, Category, Class
            </p>
            <textarea
              value={rosterText}
              onChange={e => setRosterText(e.target.value)}
              placeholder="123, John Force, JFR, 2024 Camaro SS, Funny Car, FC&#10;456, Austin Prock, JFR, 2024 Dragster, Top Fuel, TF"
              style={textareaStyle}
              rows={12}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={handlePreview} disabled={loading} style={primaryBtnStyle}>
                {loading ? 'Parsing...' : 'Preview & Match'}
              </button>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step 2: Preview matches */}
        {step === 'preview' && preview && (
          <div>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
              <span style={summaryBadge('green')}>{preview.exact_matches} exact</span>
              <span style={summaryBadge('orange')}>{preview.needs_review} needs review</span>
              <span style={summaryBadge('gray')}>{preview.duplicates} duplicates (skipped)</span>
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Driver</th>
                    <th style={thStyle}>Person Match</th>
                    <th style={thStyle}>Team</th>
                    <th style={thStyle}>Org Match</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Class</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map(row => (
                    <PreviewRow
                      key={row.row}
                      row={row}
                      resolved={resolvedRows.get(row.row)}
                      onResolve={(field, value) => resolveRow(row.row, field, value)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button onClick={handleCommit} style={primaryBtnStyle}>
                Commit {preview.total - preview.duplicates} Entries
              </button>
              <button onClick={() => setStep('paste')} style={cancelBtnStyle}>Back</button>
              <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            </div>
          </div>
        )}

        {/* Step 3: Committing */}
        {step === 'committing' && (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>
            Committing entries...
          </p>
        )}

        {/* Step 4: Done */}
        {step === 'done' && commitResult && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-success)' }}>
              {commitResult.created} of {commitResult.total} entries created
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Provisional persons/organizations were created where no exact match was found.
            </p>
            <button onClick={() => { onCommitted(); onClose(); }} style={{ ...primaryBtnStyle, marginTop: '1rem' }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Preview row with match indicators + suggestion picker ───────────────

function PreviewRow({ row, resolved, onResolve }: {
  row: RosterPreviewRow;
  resolved?: Partial<RosterCommitRow>;
  onResolve: (field: keyof RosterCommitRow, value: unknown) => void;
}) {
  const personStatus = resolved?.person_id ? 'resolved' : row.person_match.status;
  const orgStatus = resolved?.org_id ? 'resolved' : row.org_match.status;

  return (
    <tr style={{ opacity: row.is_duplicate ? 0.5 : 1, background: row.is_duplicate ? 'var(--color-bg-elevated, #f9f9f9)' : undefined }}>
      <td style={tdStyle}>{row.raw.competition_number}</td>
      <td style={tdStyle}>{row.raw.driver_name}</td>
      <td style={tdStyle}>
        <MatchIndicator status={personStatus} name={row.person_match.display_name} />
        {row.person_match.status === 'suggestions' && !resolved?.person_id && (
          <select
            style={{ ...selectSmallStyle, marginTop: '0.2rem' }}
            value=""
            onChange={e => {
              if (e.target.value === '__create') {
                onResolve('create_person', true);
              } else if (e.target.value) {
                onResolve('person_id', Number(e.target.value));
              }
            }}
          >
            <option value="">Pick or create...</option>
            {row.person_match.suggestions?.map(s => (
              <option key={s.id} value={s.id}>{s.display_name}</option>
            ))}
            <option value="__create">+ Create provisional</option>
          </select>
        )}
      </td>
      <td style={tdStyle}>{row.raw.team_name}</td>
      <td style={tdStyle}>
        <MatchIndicator status={orgStatus} name={row.org_match.name} />
        {row.org_match.status === 'suggestions' && !resolved?.org_id && (
          <select
            style={{ ...selectSmallStyle, marginTop: '0.2rem' }}
            value=""
            onChange={e => {
              if (e.target.value === '__create') {
                onResolve('create_org', true);
              } else if (e.target.value) {
                onResolve('org_id', Number(e.target.value));
              }
            }}
          >
            <option value="">Pick or create...</option>
            {row.org_match.suggestions?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            <option value="__create">+ Create provisional</option>
          </select>
        )}
      </td>
      <td style={tdStyle}>{row.raw.category}</td>
      <td style={tdStyle}>{row.raw.class_index}</td>
      <td style={tdStyle}>
        {row.is_duplicate ? <span style={matchBadge('gray')}>Duplicate</span> :
         row.needs_review ? <span style={matchBadge('orange')}>Review</span> :
         <span style={matchBadge('green')}>Ready</span>}
      </td>
    </tr>
  );
}

function MatchIndicator({ status, name }: { status: string; name: string | null }) {
  if (status === 'exact' || status === 'resolved') return <span style={matchBadge('green')}>{name || 'Matched'}</span>;
  if (status === 'suggestions') return <span style={matchBadge('orange')}>Suggestions</span>;
  if (status === 'empty') return <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>—</span>;
  return <span style={matchBadge('red')}>No match</span>;
}

// ── Styles ──────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalStyle: React.CSSProperties = {
  background: 'var(--color-bg, #fff)', borderRadius: '8px', padding: '1.5rem',
  maxWidth: 1000, width: '95vw', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
};
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
  color: 'var(--color-text-muted)', lineHeight: 1,
};
const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem', fontSize: '0.8rem', fontFamily: 'monospace',
  border: '1px solid var(--color-border)', borderRadius: '4px', resize: 'vertical',
  background: 'var(--color-bg)', color: 'var(--color-text)',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer',
  border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)',
};
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' };
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border)',
  fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
  position: 'sticky', top: 0, background: 'var(--color-bg, #fff)',
};
const tdStyle: React.CSSProperties = { padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border-light, #eee)', verticalAlign: 'top' };
const selectSmallStyle: React.CSSProperties = {
  display: 'block', padding: '0.15rem 0.3rem', fontSize: '0.7rem', borderRadius: '3px',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)',
  maxWidth: '160px',
};

function matchBadge(color: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    green:  { bg: '#dcfce7', fg: '#166534' },
    orange: { bg: '#fff7cd', fg: '#92400e' },
    red:    { bg: '#fee2e2', fg: '#991b1b' },
    gray:   { bg: '#f3f4f6', fg: '#374151' },
  };
  const c = colors[color] || colors.gray;
  return {
    display: 'inline-block', padding: '0.1rem 0.35rem', borderRadius: '9999px',
    fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg,
  };
}

function summaryBadge(color: string): React.CSSProperties {
  return { ...matchBadge(color), fontSize: '0.75rem', padding: '0.2rem 0.6rem' };
}
