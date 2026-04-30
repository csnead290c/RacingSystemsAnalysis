/**
 * AddEntryForm — Manual add of a single event entry with identity matching
 *
 * Supports:
 * - Typing a driver name → exact match / fuzzy suggestions / create provisional
 * - Typing a team name → exact match / fuzzy suggestions / create provisional
 * - Competition number, category, class entry
 * - Vehicle linking (optional)
 */

import { useState, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type { Person, Organization } from '../../services/techMasterApi';

interface Props {
  eventInstanceId: number;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddEntryForm({ eventInstanceId, onClose, onCreated }: Props) {
  const [compNumber, setCompNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [category, setCategory] = useState('');
  const [classIndex, setClassIndex] = useState('');
  const [notes, setNotes] = useState('');

  // Person matching state
  const [personId, setPersonId] = useState<number | null>(null);
  const [personMatchStatus, setPersonMatchStatus] = useState<string>('');
  const [personSuggestions, setPersonSuggestions] = useState<Person[]>([]);
  const [createPersonProvisional, setCreatePersonProvisional] = useState(false);

  // Org matching state
  const [orgId, setOrgId] = useState<number | null>(null);
  const [orgMatchStatus, setOrgMatchStatus] = useState<string>('');
  const [orgSuggestions, setOrgSuggestions] = useState<Organization[]>([]);
  const [createOrgProvisional, setCreateOrgProvisional] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Match person on blur
  const handleMatchPerson = useCallback(async () => {
    if (driverName.trim().length < 2) { setPersonMatchStatus(''); setPersonSuggestions([]); return; }
    try {
      const res = await techMasterApi.matchPerson(driverName.trim());
      setPersonMatchStatus(res.match_status);
      if (res.match_status === 'exact' && res.exact) {
        setPersonId(res.exact.id);
        setPersonSuggestions([]);
        setCreatePersonProvisional(false);
      } else {
        setPersonId(null);
        setPersonSuggestions(res.suggestions as Person[]);
        setCreatePersonProvisional(false);
      }
    } catch { /* ignore */ }
  }, [driverName]);

  // Match org on blur
  const handleMatchOrg = useCallback(async () => {
    if (teamName.trim().length < 2) { setOrgMatchStatus(''); setOrgSuggestions([]); return; }
    try {
      const res = await techMasterApi.matchOrg(teamName.trim());
      setOrgMatchStatus(res.match_status);
      if (res.match_status === 'exact' && res.exact) {
        setOrgId(res.exact.id);
        setOrgSuggestions([]);
        setCreateOrgProvisional(false);
      } else {
        setOrgId(null);
        setOrgSuggestions(res.suggestions as Organization[]);
        setCreateOrgProvisional(false);
      }
    } catch { /* ignore */ }
  }, [teamName]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // If creating provisional person
      let resolvedPersonId = personId;
      if (!resolvedPersonId && createPersonProvisional && driverName.trim()) {
        const res = await techMasterApi.createPerson({
          display_name: driverName.trim(),
          person_type: 'driver',
          status: 'provisional',
          notes: 'Created from manual entry add',
        } as any);
        resolvedPersonId = res.id;
      }

      // If creating provisional org
      let resolvedOrgId = orgId;
      if (!resolvedOrgId && createOrgProvisional && teamName.trim()) {
        const res = await techMasterApi.createOrganization({
          name: teamName.trim(),
          org_type: 'team',
          status: 'provisional',
          notes: 'Created from manual entry add',
        } as any);
        resolvedOrgId = res.id;
      }

      await techMasterApi.createEntry({
        event_instance_id: eventInstanceId,
        person_id: resolvedPersonId,
        org_id: resolvedOrgId,
        competition_number: compNumber || null,
        category: category || null,
        class_index: classIndex || null,
        notes: notes || null,
      });

      onCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Add Event Entry</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {error && <div style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {/* Competition Number */}
          <div>
            <label style={labelStyle}>Competition #</label>
            <input value={compNumber} onChange={e => setCompNumber(e.target.value)} style={inputStyle} placeholder="e.g. 123" />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <input value={category} onChange={e => setCategory(e.target.value)} style={inputStyle} placeholder="e.g. Top Fuel" />
          </div>

          {/* Class */}
          <div>
            <label style={labelStyle}>Class Index</label>
            <input value={classIndex} onChange={e => setClassIndex(e.target.value)} style={inputStyle} placeholder="e.g. TF" />
          </div>

          {/* Driver Name with matching */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Driver Name</label>
            <input
              value={driverName}
              onChange={e => { setDriverName(e.target.value); setPersonId(null); setPersonMatchStatus(''); setCreatePersonProvisional(false); }}
              onBlur={handleMatchPerson}
              style={inputStyle}
              placeholder="e.g. John Force"
            />
            <MatchStatus
              status={personMatchStatus}
              linkedId={personId}
              suggestions={personSuggestions}
              createProvisional={createPersonProvisional}
              onSelect={id => { setPersonId(id); setPersonSuggestions([]); }}
              onCreateProvisional={() => { setCreatePersonProvisional(true); setPersonSuggestions([]); }}
              labelField="display_name"
            />
          </div>

          {/* Team Name with matching */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Team / Organization</label>
            <input
              value={teamName}
              onChange={e => { setTeamName(e.target.value); setOrgId(null); setOrgMatchStatus(''); setCreateOrgProvisional(false); }}
              onBlur={handleMatchOrg}
              style={inputStyle}
              placeholder="e.g. John Force Racing"
            />
            <MatchStatus
              status={orgMatchStatus}
              linkedId={orgId}
              suggestions={orgSuggestions}
              createProvisional={createOrgProvisional}
              onSelect={id => { setOrgId(id); setOrgSuggestions([]); }}
              onCreateProvisional={() => { setCreateOrgProvisional(true); setOrgSuggestions([]); }}
              labelField="name"
            />
          </div>

          {/* Notes */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} rows={2} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
            {saving ? 'Saving...' : 'Create Entry'}
          </button>
          <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Match status indicator with suggestion picker ───────────────────────

function MatchStatus({ status, linkedId, suggestions, createProvisional, onSelect, onCreateProvisional, labelField }: {
  status: string;
  linkedId: number | null;
  suggestions: Array<Record<string, any>>;
  createProvisional: boolean;
  onSelect: (id: number) => void;
  onCreateProvisional: () => void;
  labelField: string;
}) {
  if (!status) return null;

  if (status === 'exact' && linkedId) {
    return <div style={{ marginTop: '0.25rem' }}><span style={badge('green')}>Exact match (ID: {linkedId})</span></div>;
  }

  if (linkedId) {
    return <div style={{ marginTop: '0.25rem' }}><span style={badge('green')}>Selected (ID: {linkedId})</span></div>;
  }

  if (createProvisional) {
    return <div style={{ marginTop: '0.25rem' }}><span style={badge('orange')}>Will create provisional</span></div>;
  }

  if (status === 'suggestions' && suggestions.length > 0) {
    return (
      <div style={{ marginTop: '0.25rem' }}>
        <span style={badge('orange')}>Suggestions found</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
          {suggestions.slice(0, 5).map(s => (
            <button key={s.id} onClick={() => onSelect(s.id)} style={suggestionBtnStyle}>
              {s[labelField]}
            </button>
          ))}
          <button onClick={onCreateProvisional} style={{ ...suggestionBtnStyle, fontStyle: 'italic' }}>
            + Create new
          </button>
        </div>
      </div>
    );
  }

  if (status === 'none') {
    return (
      <div style={{ marginTop: '0.25rem' }}>
        <span style={badge('red')}>No match found</span>
        <button onClick={onCreateProvisional} style={{ ...suggestionBtnStyle, marginLeft: '0.5rem' }}>
          + Create provisional
        </button>
      </div>
    );
  }

  return null;
}

// ── Styles ──────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const modalStyle: React.CSSProperties = {
  background: 'var(--color-bg, #fff)', borderRadius: '8px', padding: '1.5rem',
  maxWidth: 600, width: '95vw', maxHeight: '90vh', overflowY: 'auto',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
};
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
  color: 'var(--color-text-muted)', lineHeight: 1,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)',
  marginBottom: '0.2rem',
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)',
  boxSizing: 'border-box',
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer',
  border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600,
};
const cancelBtnStyle: React.CSSProperties = {
  padding: '0.4rem 1rem', fontSize: '0.8rem', borderRadius: '4px', cursor: 'pointer',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)',
};
const suggestionBtnStyle: React.CSSProperties = {
  padding: '0.15rem 0.4rem', fontSize: '0.7rem', borderRadius: '4px', cursor: 'pointer',
  border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated, #f5f5f5)',
  color: 'var(--color-text)',
};

function badge(color: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    green:  { bg: '#dcfce7', fg: '#166534' },
    orange: { bg: '#fff7cd', fg: '#92400e' },
    red:    { bg: '#fee2e2', fg: '#991b1b' },
  };
  const c = map[color] || map.green;
  return {
    display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '9999px',
    fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg,
  };
}
