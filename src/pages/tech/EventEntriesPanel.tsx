/**
 * EventEntriesPanel — Operational event entries UI for Tech Master
 *
 * Select an event instance, view entries with linkage status badges,
 * filter by category/class, open detail drawer, add entries manually,
 * or import a roster.
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type { EventInstance, EventEntry, CategoryInfo, EntryHold } from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
  onOpenDetail: (entryId: number) => void;
  onOpenRosterImport: (eventId: number) => void;
  onOpenAddEntry: (eventId: number) => void;
}

export default function EventEntriesPanel({ hasAdmin, onOpenDetail, onOpenRosterImport, onOpenAddEntry }: Props) {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [classFilter, setClassFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');

  // Batch 12: Hold state and filtering
  const [entryHolds, setEntryHolds] = useState<Map<number, EntryHold[]>>(new Map());
  const [holdFilter, setHoldFilter] = useState<string>('all');

  // Load events on mount
  useEffect(() => {
    let cancelled = false;
    techMasterApi.listEvents({ limit: 200 })
      .then(res => { if (!cancelled) { setEvents(res.events); setEventsLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setEventsLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Load entries + categories when event selection changes
  const loadEntries = useCallback(async () => {
    if (!selectedEventId) { setEntries([]); setCategories([]); setEntryHolds(new Map()); return; }
    setLoading(true);
    setError('');
    try {
      const [entriesRes, catsRes] = await Promise.all([
        techMasterApi.listEntriesForEvent(selectedEventId, classFilter || undefined),
        techMasterApi.listCategories(selectedEventId),
      ]);
      setEntries(entriesRes.entries);
      setCategories(catsRes.categories);

      // Batch 12: Load holds for all entries
      if (entriesRes.entries.length > 0) {
        try {
          const holdsRes = await techMasterApi.listEntryHolds({ eventInstanceId: selectedEventId, activeOnly: true });
          const holdsMap = new Map<number, EntryHold[]>();
          holdsRes.holds.forEach(h => {
            const existing = holdsMap.get(h.event_entry_id) || [];
            holdsMap.set(h.event_entry_id, [...existing, h]);
          });
          setEntryHolds(holdsMap);
        } catch (e: any) {
          console.error('Failed to load holds:', e);
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [selectedEventId, classFilter]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Linkage badge
  const linkageBadge = (entry: EventEntry) => {
    const personOk = entry.person_id != null;
    const orgOk = entry.org_id != null;
    const vehicleOk = entry.vehicle_id != null;
    if (personOk && orgOk && vehicleOk) return <span style={badgeStyle('green')}>Linked</span>;
    if (personOk && orgOk) return <span style={badgeStyle('blue')}>Partial</span>;
    if (personOk) return <span style={badgeStyle('orange')}>Person Only</span>;
    return <span style={badgeStyle('red')}>Unlinked</span>;
  };

  const statusBadge = (status: string) => {
    const color = status === 'active' ? 'green' : status === 'registered' ? 'blue' : status === 'withdrawn' ? 'gray' : 'red';
    return <span style={badgeStyle(color)}>{status}</span>;
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);

  return (
    <div>
      {/* Event selector */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Event:</label>
        <select
          value={selectedEventId ?? ''}
          onChange={e => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setClassFilter(''); }}
          disabled={eventsLoading}
          style={selectStyle}
        >
          <option value="">— Select event —</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.name} ({ev.start_date_local})
            </option>
          ))}
        </select>

        {selectedEventId && categories.length > 0 && (
          <>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem' }}>Class:</label>
            <select
              value={classFilter}
              onChange={e => setClassFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">All classes</option>
              {categories.map((c, i) => (
                <option key={i} value={c.class_index ?? ''}>
                  {c.class_index ?? 'N/A'} — {c.category ?? 'N/A'} ({c.entry_count})
                </option>
              ))}
            </select>
          </>
        )}

        {/* Batch 12: Hold filter */}
        {selectedEventId && (
          <>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, marginLeft: '0.5rem' }}>Holds:</label>
            <select
              value={holdFilter}
              onChange={e => setHoldFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All entries</option>
              <option value="with_holds">With active holds</option>
              <option value="no_holds">No holds</option>
            </select>
          </>
        )}

        {hasAdmin && selectedEventId && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => onOpenAddEntry(selectedEventId)} style={btnStyle}>+ Add Entry</button>
            <button onClick={() => onOpenRosterImport(selectedEventId)} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>
              Import Roster
            </button>
          </div>
        )}
      </div>

      {/* Event summary */}
      {selectedEvent && (
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
          {selectedEvent.track_name && <span>{selectedEvent.track_name} &middot; </span>}
          {selectedEvent.start_date_local} — {selectedEvent.end_date_local}
          <span style={{ marginLeft: '0.75rem' }}>{entries.length} entries</span>
        </div>
      )}

      {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>Error: {error}</p>}

      {!selectedEventId && !eventsLoading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
          Select an event to view its entries.
        </p>
      )}

      {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading entries...</p>}

      {/* Entries table */}
      {selectedEventId && !loading && entries.length > 0 && (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Driver / Person</th>
              <th style={thStyle}>Team / Org</th>
              <th style={thStyle}>Vehicle</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Class</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Linkage</th>
              <th style={thStyle}>Holds</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {entries.filter(entry => {
              // Batch 12: Apply hold filter
              if (holdFilter === 'with_holds') {
                const holds = entryHolds.get(entry.id) || [];
                return holds.length > 0;
              }
              if (holdFilter === 'no_holds') {
                const holds = entryHolds.get(entry.id) || [];
                return holds.length === 0;
              }
              return true;
            }).map(entry => (
              <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => onOpenDetail(entry.id)}>
                <td style={tdStyle}>{entry.competition_number || '—'}</td>
                <td style={tdStyle}>{entry.person_name || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>unlinked</span>}</td>
                <td style={tdStyle}>{entry.org_name || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>unlinked</span>}</td>
                <td style={tdStyle}>{entry.vehicle_description || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>—</span>}</td>
                <td style={tdStyle}>{entry.category || '—'}</td>
                <td style={tdStyle}>{entry.class_index || '—'}</td>
                <td style={tdStyle}>{statusBadge(entry.entry_status)}</td>
                <td style={tdStyle}>{linkageBadge(entry)}</td>
                <td style={tdStyle}>
                  {/* Batch 12: Hold badges */}
                  {(entryHolds.get(entry.id) || []).map(h => (
                    <span key={h.id} style={{ ...holdBadgeStyle(h.hold_type), marginRight: '0.25rem' }} title={h.reason}>
                      {holdTypeAbbrev(h.hold_type)}
                    </span>
                  ))}
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={e => { e.stopPropagation(); onOpenDetail(entry.id); }}
                    style={{ ...btnStyle, padding: '0.15rem 0.4rem', fontSize: '0.7rem' }}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedEventId && !loading && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
          <p>No entries for this event yet.</p>
          {hasAdmin && (
            <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
              <button onClick={() => onOpenAddEntry(selectedEventId)} style={btnStyle}>+ Add Entry</button>
              <button onClick={() => onOpenRosterImport(selectedEventId)} style={{ ...btnStyle, background: 'var(--color-primary)', color: '#fff' }}>
                Import Roster
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)',
  fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = { padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
const selectStyle: React.CSSProperties = {
  padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px',
  border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)',
};
const btnStyle: React.CSSProperties = {
  padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '4px', cursor: 'pointer',
  border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated, #f5f5f5)',
  color: 'var(--color-text)',
};

function badgeStyle(color: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    green:  { bg: '#dcfce7', fg: '#166534' },
    blue:   { bg: '#dbeafe', fg: '#1e40af' },
    orange: { bg: '#fff7cd', fg: '#92400e' },
    red:    { bg: '#fee2e2', fg: '#991b1b' },
    gray:   { bg: '#f3f4f6', fg: '#374151' },
  };
  const c = colors[color] || colors.gray;
  return {
    display: 'inline-block', padding: '0.1rem 0.4rem', borderRadius: '9999px',
    fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg,
  };
}

// ── Batch 12: Hold helper functions ────────────────────────────────────

function holdTypeAbbrev(type: string): string {
  const abbrevs: Record<string, string> = {
    compliance_hold: 'COMP',
    tech_hold: 'TECH',
    escalation: 'ESC',
    flag: 'FLAG',
  };
  return abbrevs[type] || type.toUpperCase().slice(0, 4);
}

function holdBadgeStyle(type: string): React.CSSProperties {
  const colors: Record<string, { bg: string; fg: string }> = {
    compliance_hold: { bg: '#ef4444', fg: 'white' },
    tech_hold: { bg: '#f97316', fg: 'white' },
    escalation: { bg: '#a855f7', fg: 'white' },
    flag: { bg: '#eab308', fg: 'white' },
  };
  const c = colors[type] || { bg: '#9e9e9e', fg: 'white' };
  return {
    display: 'inline-block', padding: '0.1rem 0.35rem', borderRadius: '3px',
    fontSize: '0.6rem', fontWeight: 700, background: c.bg, color: c.fg,
  };
}
