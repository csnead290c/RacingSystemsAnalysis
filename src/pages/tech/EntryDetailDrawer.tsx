/**
 * EntryDetailDrawer — Lightweight side panel showing full event entry detail
 *
 * Shows: event info, category/class, competition number, linked person/org/vehicle,
 * linkage status badges, change history, tech-case readiness for Scale.
 */

import { useState, useEffect } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type { EntryDetailResponse } from '../../services/techMasterApi';

interface Props {
  entryId: number;
  hasAdmin: boolean;
  onClose: () => void;
}

export default function EntryDetailDrawer({ entryId, hasAdmin: _hasAdmin, onClose }: Props) {
  const [data, setData] = useState<EntryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    techMasterApi.getEntryDetail(entryId)
      .then(res => { if (!cancelled) { setData(res); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [entryId]);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={drawerStyle} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1rem', margin: 0 }}>Entry Detail</h2>
          <button onClick={onClose} style={closeBtnStyle}>&times;</button>
        </div>

        {loading && <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>}
        {error && <p style={{ color: 'var(--color-error)', fontSize: '0.85rem' }}>Error: {error}</p>}

        {data && (
          <>
            {/* Event info */}
            <Section title="Event">
              <Row label="Event" value={data.entry.event_name} />
              <Row label="Dates" value={`${data.entry.start_date_local} — ${data.entry.end_date_local}`} />
              {data.entry.race_lookup && <Row label="Race Lookup" value={data.entry.race_lookup} />}
            </Section>

            {/* Entry info */}
            <Section title="Entry">
              <Row label="Competition #" value={data.entry.competition_number || '—'} />
              <Row label="Category" value={data.entry.category || '—'} />
              <Row label="Class" value={data.entry.class_index || '—'} />
              <Row label="Status" value={<StatusBadge status={data.entry.entry_status} />} />
            </Section>

            {/* Linkage */}
            <Section title="Identity Linkage">
              <LinkageRow
                label="Person / Driver"
                linked={data.linkage.person_linked}
                provisional={data.linkage.person_provisional}
                name={data.entry.person_name}
                detail={data.entry.nhra_license_id ? `License: ${data.entry.nhra_license_id}` : undefined}
              />
              <LinkageRow
                label="Organization / Team"
                linked={data.linkage.org_linked}
                provisional={data.linkage.org_provisional}
                name={data.entry.org_name}
                detail={data.entry.org_short_name ? `(${data.entry.org_short_name})` : undefined}
              />
              <LinkageRow
                label="Vehicle"
                linked={data.linkage.vehicle_linked}
                provisional={data.linkage.vehicle_provisional}
                name={data.entry.vehicle_description}
                detail={data.entry.chassis_serial ? `Serial: ${data.entry.chassis_serial}` : undefined}
              />
            </Section>

            {/* Readiness */}
            <Section title="Readiness">
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <ReadinessBadge label="Fully Linked" ok={data.linkage.fully_linked} />
                <ReadinessBadge label="Scale Ready" ok={data.linkage.scale_ready} />
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Tech Cases: {data.linkage.tech_case_count}
                </span>
              </div>
            </Section>

            {/* Change history */}
            {data.changes.length > 0 && (
              <Section title={`Change History (${data.changes.length})`}>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {data.changes.map(ch => (
                    <div key={ch.id} style={{ fontSize: '0.75rem', padding: '0.3rem 0', borderBottom: '1px solid var(--color-border-light, #eee)' }}>
                      <span style={{ fontWeight: 600 }}>{ch.field_name}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}> : {ch.old_value ?? '(null)'} → {ch.new_value ?? '(null)'}</span>
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        {ch.changed_at}{ch.reason && ` — ${ch.reason}`}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {data.changes.length === 0 && (
              <Section title="Change History">
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>No changes recorded.</p>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.2rem 0', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = status === 'active' ? 'green' : status === 'registered' ? 'blue' : status === 'withdrawn' ? 'gray' : 'red';
  return <span style={badgeColors(color)}>{status}</span>;
}

function LinkageRow({ label, linked, provisional, name, detail }: {
  label: string; linked: boolean; provisional: boolean; name?: string | null; detail?: string;
}) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', fontSize: '0.8rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        {linked ? (
          <>
            <span style={{ fontWeight: 500 }}>{name || 'Linked'}</span>
            {provisional && <span style={{ ...badgeColors('orange'), marginLeft: '0.3rem' }}>provisional</span>}
            {!provisional && <span style={{ ...badgeColors('green'), marginLeft: '0.3rem' }}>verified</span>}
            {detail && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{detail}</div>}
          </>
        ) : (
          <span style={badgeColors('red')}>unlinked</span>
        )}
      </div>
    </div>
  );
}

function ReadinessBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span style={{
      ...badgeColors(ok ? 'green' : 'red'),
      fontSize: '0.75rem', padding: '0.15rem 0.5rem',
    }}>
      {ok ? '\u2713' : '\u2717'} {label}
    </span>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000,
  display: 'flex', justifyContent: 'flex-end',
};
const drawerStyle: React.CSSProperties = {
  width: 420, maxWidth: '90vw', height: '100vh', overflowY: 'auto',
  background: 'var(--color-bg, #fff)', padding: '1.25rem',
  boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
};
const closeBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer',
  color: 'var(--color-text-muted)', lineHeight: 1,
};

function badgeColors(color: string): React.CSSProperties {
  const map: Record<string, { bg: string; fg: string }> = {
    green:  { bg: '#dcfce7', fg: '#166534' },
    blue:   { bg: '#dbeafe', fg: '#1e40af' },
    orange: { bg: '#fff7cd', fg: '#92400e' },
    red:    { bg: '#fee2e2', fg: '#991b1b' },
    gray:   { bg: '#f3f4f6', fg: '#374151' },
  };
  const c = map[color] || map.gray;
  return {
    display: 'inline-block', padding: '0.1rem 0.35rem', borderRadius: '9999px',
    fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg,
  };
}
