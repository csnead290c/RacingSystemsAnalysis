/**
 * Tech Master Shell — /tech route
 *
 * Capability-gated by nhra.tech.read inside the component.
 * Batch 2: Operational event entries, roster import, identity matching.
 */

import { useState, useEffect, useCallback } from 'react';
import { useCapabilities } from '../domain/config/useCapabilities';
import { techMasterApi } from '../services/techMasterApi';
import type { Person, Organization, VehicleAsset, EventInstance } from '../services/techMasterApi';
import EventEntriesPanel from './tech/EventEntriesPanel';
import RosterImportModal from './tech/RosterImportModal';
import EntryDetailDrawer from './tech/EntryDetailDrawer';
import AddEntryForm from './tech/AddEntryForm';
import ScaleWorkspacePanel from './tech/ScaleWorkspacePanel';
import FuelWorkspacePanel from './tech/FuelWorkspacePanel';
import InspectionWorkspacePanel from './tech/InspectionWorkspacePanel';
import TechCardWorkspacePanel from './tech/TechCardWorkspacePanel';
import TeardownWorkspacePanel from './tech/TeardownWorkspacePanel';
import EntryDossierPanel from './tech/EntryDossierPanel';
import EventComplianceDashboard from './tech/EventComplianceDashboard';
import FindingsAggregationPanel from './tech/FindingsAggregationPanel';
import TechAdminPanel from './tech/TechAdminPanel';
import LinkReviewPanel from './tech/LinkReviewPanel';

type Tab = 'overview' | 'persons' | 'orgs' | 'vehicles' | 'events' | 'entries' | 'scale' | 'fuel' | 'inspection' | 'techcards' | 'teardown' | 'dossier' | 'compliance' | 'findings' | 'admin' | 'links' | 'cases';

export default function TechMasterShell() {
  const { can } = useCapabilities();
  const hasRead = can('nhra.tech.read' as any);
  const hasAdmin = can('nhra.tech.admin' as any);

  const [tab, setTab] = useState<Tab>('entries');

  // Entry detail drawer
  const [detailEntryId, setDetailEntryId] = useState<number | null>(null);
  // Roster import modal
  const [rosterImportEventId, setRosterImportEventId] = useState<number | null>(null);
  // Add entry form
  const [addEntryEventId, setAddEntryEventId] = useState<number | null>(null);
  // Refresh key for entries panel
  const [entriesRefreshKey, setEntriesRefreshKey] = useState(0);

  if (!hasRead) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>NHRA Tech Master</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>You do not have access to the Tech Master system.</p>
      </div>
    );
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'entries', label: 'Event Entries' },
    { key: 'scale', label: 'Scale' },
    { key: 'fuel', label: 'Fuel' },
    { key: 'inspection', label: 'General Tech' },
    { key: 'techcards', label: 'Tech Cards' },
    { key: 'teardown', label: 'Teardown' },
    { key: 'dossier', label: 'Entry Dossier' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'findings', label: 'Findings' },
    { key: 'admin', label: 'Admin Config' },
    { key: 'links', label: 'Link Review' },
    { key: 'overview', label: 'Overview' },
    { key: 'persons', label: 'Persons' },
    { key: 'orgs', label: 'Organizations' },
    { key: 'vehicles', label: 'Vehicles' },
    { key: 'events', label: 'Events' },
    { key: 'cases', label: 'Tech Cases' },
  ];

  return (
    <div style={{ padding: '1rem', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>NHRA Tech Master</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
        Event Entry & Identity Management
        {hasAdmin && <span style={{ marginLeft: '0.5rem', color: 'var(--color-success)', fontSize: '0.75rem' }}>● Admin</span>}
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--color-border)', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer',
              border: 'none', borderBottom: tab === t.key ? '2px solid var(--color-primary)' : '2px solid transparent',
              background: 'none', color: tab === t.key ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: tab === t.key ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'entries' && (
        <EventEntriesPanel
          key={entriesRefreshKey}
          hasAdmin={hasAdmin}
          onOpenDetail={id => setDetailEntryId(id)}
          onOpenRosterImport={eventId => setRosterImportEventId(eventId)}
          onOpenAddEntry={eventId => setAddEntryEventId(eventId)}
        />
      )}
      {tab === 'scale' && <ScaleWorkspacePanel hasAdmin={hasAdmin} />}
      {tab === 'fuel' && <FuelWorkspacePanel hasAdmin={hasAdmin} />}
      {tab === 'inspection' && <InspectionWorkspacePanel hasAdmin={hasAdmin} />}
      {tab === 'techcards' && <TechCardWorkspacePanel hasAdmin={hasAdmin} />}
      {tab === 'teardown' && <TeardownWorkspacePanel hasAdmin={hasAdmin} />}
      {tab === 'dossier' && <EntryDossierPanel hasAdmin={hasAdmin} />}
      {tab === 'compliance' && <EventComplianceDashboard hasAdmin={hasAdmin} onOpenDossier={(entryId) => { setDetailEntryId(entryId); setTab('dossier'); }} />}
      {tab === 'findings' && <FindingsAggregationPanel hasAdmin={hasAdmin} />}
      {tab === 'admin' && <TechAdminPanel hasAdmin={hasAdmin} />}
      {tab === 'links' && <LinkReviewPanel hasAdmin={hasAdmin} />}
      {tab === 'overview' && <OverviewTab />}
      {tab === 'persons' && <PersonsTab hasAdmin={hasAdmin} />}
      {tab === 'orgs' && <OrgsTab hasAdmin={hasAdmin} />}
      {tab === 'vehicles' && <VehiclesTab hasAdmin={hasAdmin} />}
      {tab === 'events' && <EventsTab />}
      {tab === 'cases' && <CasesTab />}

      {/* Modals / Drawers */}
      {detailEntryId !== null && (
        <EntryDetailDrawer
          entryId={detailEntryId}
          hasAdmin={hasAdmin}
          onClose={() => setDetailEntryId(null)}
        />
      )}
      {rosterImportEventId !== null && (
        <RosterImportModal
          eventInstanceId={rosterImportEventId}
          onClose={() => setRosterImportEventId(null)}
          onCommitted={() => setEntriesRefreshKey(k => k + 1)}
        />
      )}
      {addEntryEventId !== null && (
        <AddEntryForm
          eventInstanceId={addEntryEventId}
          onClose={() => setAddEntryEventId(null)}
          onCreated={() => setEntriesRefreshKey(k => k + 1)}
        />
      )}
    </div>
  );
}

// ── Shared styles ───────────────────────────────────────────────────────

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border)',
  fontSize: '0.75rem', color: 'var(--color-text-muted)',
};
const tdStyle: React.CSSProperties = {
  padding: '0.4rem 0.6rem', borderBottom: '1px solid var(--color-border-light, #eee)',
};
const cardStyle: React.CSSProperties = {
  border: '1px solid var(--color-border)', borderRadius: '6px', padding: '1rem', marginBottom: '0.75rem',
};

// ── Overview Tab ────────────────────────────────────────────────────────

function OverviewTab() {
  const [stats, setStats] = useState<Record<string, number | string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [persons, orgs, vehicles, events] = await Promise.all([
          techMasterApi.listPersons({ limit: 1 }),
          techMasterApi.listOrganizations({ limit: 1 }),
          techMasterApi.listVehicles({ limit: 1 }),
          techMasterApi.listEvents({ limit: 1 }),
        ]);
        if (!cancelled) {
          setStats({
            persons: persons.total,
            organizations: orgs.total,
            vehicles: vehicles.total,
            events: events.count,
          });
        }
      } catch (e: any) {
        if (!cancelled) setStats({ error: e.message });
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading backbone status...</p>;
  if (stats.error) return <p style={{ color: 'var(--color-error)' }}>Error: {String(stats.error)}</p>;

  const items = [
    { label: 'Persons', value: stats.persons },
    { label: 'Organizations', value: stats.organizations },
    { label: 'Vehicles', value: stats.vehicles },
    { label: 'Event Instances', value: stats.events },
  ];

  return (
    <div>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Backbone Status</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        {items.map(i => (
          <div key={i.label} style={cardStyle}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{i.value}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>{i.label}</div>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Tech Master Phase 1 backbone is operational. Use the tabs above to browse and manage identities, events, entries, and tech cases.
      </p>
    </div>
  );
}

// ── Generic list tab helper ─────────────────────────────────────────────

function SimpleListTab<T extends { id: number }>({
  loadFn, columns, hasAdmin: _hasAdmin, entityLabel,
}: {
  loadFn: () => Promise<{ items: T[]; total: number }>;
  columns: { key: string; label: string }[];
  hasAdmin: boolean;
  entityLabel: string;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await loadFn();
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [loadFn]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading {entityLabel}...</p>;
  if (error) return <p style={{ color: 'var(--color-error)' }}>Error: {error}</p>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>{entityLabel} ({total})</h3>
      </div>
      {items.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No {entityLabel.toLowerCase()} found.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>{columns.map(c => <th key={c.key} style={thStyle}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                {columns.map(c => (
                  <td key={c.key} style={tdStyle}>{String((item as any)[c.key] ?? '—')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Tab implementations ─────────────────────────────────────────────────

function PersonsTab({ hasAdmin }: { hasAdmin: boolean }) {
  const load = useCallback(() => techMasterApi.listPersons({ limit: 50 }), []);
  return (
    <SimpleListTab<Person>
      loadFn={load}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'display_name', label: 'Name' },
        { key: 'person_type', label: 'Type' },
        { key: 'status', label: 'Status' },
        { key: 'nhra_license_id', label: 'License' },
      ]}
      hasAdmin={hasAdmin}
      entityLabel="Persons"
    />
  );
}

function OrgsTab({ hasAdmin }: { hasAdmin: boolean }) {
  const load = useCallback(() => techMasterApi.listOrganizations({ limit: 50 }), []);
  return (
    <SimpleListTab<Organization>
      loadFn={load}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'org_type', label: 'Type' },
        { key: 'status', label: 'Status' },
      ]}
      hasAdmin={hasAdmin}
      entityLabel="Organizations"
    />
  );
}

function VehiclesTab({ hasAdmin }: { hasAdmin: boolean }) {
  const load = useCallback(() => techMasterApi.listVehicles({ limit: 50 }), []);
  return (
    <SimpleListTab<VehicleAsset>
      loadFn={load}
      columns={[
        { key: 'id', label: 'ID' },
        { key: 'description', label: 'Description' },
        { key: 'body_type', label: 'Body' },
        { key: 'primary_category', label: 'Category' },
        { key: 'status', label: 'Status' },
      ]}
      hasAdmin={hasAdmin}
      entityLabel="Vehicles"
    />
  );
}

function EventsTab() {
  const [events, setEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    techMasterApi.listEvents({ limit: 50 })
      .then(res => { if (!cancelled) { setEvents(res.events); setLoading(false); } })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p style={{ color: 'var(--color-text-muted)' }}>Loading events...</p>;
  if (error) return <p style={{ color: 'var(--color-error)' }}>Error: {error}</p>;

  return (
    <div>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Event Instances ({events.length})</h3>
      {events.length === 0 ? (
        <p style={{ color: 'var(--color-text-muted)' }}>No events found. Run migration v18 to backfill from parity_events.</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Track</th>
              <th style={thStyle}>Dates</th>
              <th style={thStyle}>Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map(e => (
              <tr key={e.id}>
                <td style={tdStyle}>{e.id}</td>
                <td style={tdStyle}>{e.name}</td>
                <td style={tdStyle}>{e.event_type_code ?? '—'}</td>
                <td style={tdStyle}>{e.track_name ?? '—'}</td>
                <td style={tdStyle}>{e.start_date_local} — {e.end_date_local}</td>
                <td style={tdStyle}>{e.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CasesTab() {
  return (
    <div>
      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Tech Cases</h3>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
        Tech case browsing requires an event selection.
        Full case management UI will be expanded in Phase 2.
      </p>
    </div>
  );
}
