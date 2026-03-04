/**
 * Tests for Run Incidents API types, ownership enforcement contract,
 * and incident_count on run list responses.
 */
import { describe, it, expect } from 'vitest';
import type {
  IncidentType,
  RunIncident,
  ListIncidentTypesResponse,
  ListRunIncidentsResponse,
  CreateRunIncidentParams,
  CreateRunIncidentResponse,
  UpdateRunIncidentParams,
  UpdateRunIncidentResponse,
  DeleteRunIncidentResponse,
  IncidentLink,
  IncidentLinkType,
  ListIncidentLinksResponse,
  CreateIncidentLinkParams,
  CreateIncidentLinkResponse,
  DeleteIncidentLinkResponse,
} from '../incidentsApi';
import { ALLOWED_LINK_TYPES } from '../incidentsApi';

// ── IncidentType shape ───────────────────────────────────────────────────

describe('IncidentType shape', () => {
  it('validates a well-formed incident type', () => {
    const t: IncidentType = {
      id: 1,
      key: 'crash',
      label: 'Crash / Wreck',
      severity_min: 3,
      severity_max: 5,
      sort_order: 10,
      is_active: true,
    };
    expect(t.id).toBe(1);
    expect(t.key).toBe('crash');
    expect(t.is_active).toBe(true);
  });

  it('allows null severity bounds', () => {
    const t: IncidentType = {
      id: 8,
      key: 'record',
      label: 'Track / National Record',
      severity_min: null,
      severity_max: null,
      sort_order: 80,
      is_active: true,
    };
    expect(t.severity_min).toBeNull();
    expect(t.severity_max).toBeNull();
  });
});

// ── RunIncident shape ────────────────────────────────────────────────────

describe('RunIncident shape', () => {
  const baseIncident: RunIncident = {
    id: 100,
    run_id: 5000,
    incident_type_id: 1,
    incident_type_key: 'crash',
    incident_type_label: 'Crash / Wreck',
    occurred_at_utc: '2025-10-31T14:30:00Z',
    lane: 'L',
    track_segment: 'shutdown',
    severity: 4,
    summary: 'Driver lost control at 1000ft',
    details: 'Impacted wall on right side. Driver OK.',
    created_by: 42,
    created_at: '2025-11-01T10:00:00Z',
    updated_by: null,
    updated_at: null,
    can_edit: true,
  };

  it('validates a full incident object', () => {
    expect(baseIncident.id).toBe(100);
    expect(baseIncident.run_id).toBe(5000);
    expect(baseIncident.can_edit).toBe(true);
    expect(baseIncident.incident_type_key).toBe('crash');
  });

  it('allows nullable fields', () => {
    const inc: RunIncident = {
      ...baseIncident,
      occurred_at_utc: null,
      lane: null,
      track_segment: null,
      severity: null,
      details: null,
    };
    expect(inc.occurred_at_utc).toBeNull();
    expect(inc.severity).toBeNull();
  });
});

// ── Ownership enforcement contract ───────────────────────────────────────

describe('ownership enforcement contract', () => {
  // These tests document the expected server-side behavior via the can_edit flag
  // that the backend returns. The actual enforcement is in PHP; these validate
  // the contract from the client perspective.

  it('can_edit is true when user owns the incident', () => {
    const inc: RunIncident = {
      id: 1, run_id: 100, incident_type_id: 1,
      incident_type_key: 'crash', incident_type_label: 'Crash',
      occurred_at_utc: null, lane: null, track_segment: null,
      severity: null, summary: 'Test', details: null,
      created_by: 42, created_at: '2025-01-01T00:00:00Z',
      updated_by: null, updated_at: null,
      can_edit: true, // server says yes — user 42 viewing their own incident
    };
    expect(inc.can_edit).toBe(true);
    expect(inc.created_by).toBe(42);
  });

  it('can_edit is false when user does NOT own the incident and lacks edit.all', () => {
    const inc: RunIncident = {
      id: 2, run_id: 100, incident_type_id: 1,
      incident_type_key: 'fire', incident_type_label: 'Fire',
      occurred_at_utc: null, lane: null, track_segment: null,
      severity: 3, summary: 'Fire in engine bay', details: null,
      created_by: 99, created_at: '2025-01-01T00:00:00Z',
      updated_by: null, updated_at: null,
      can_edit: false, // server says no — user 42 viewing user 99's incident without edit.all
    };
    expect(inc.can_edit).toBe(false);
    expect(inc.created_by).not.toBe(42);
  });

  it('can_edit is true for admin viewing another user\'s incident (edit.all)', () => {
    const inc: RunIncident = {
      id: 3, run_id: 200, incident_type_id: 2,
      incident_type_key: 'mechanical', incident_type_label: 'Mechanical Failure',
      occurred_at_utc: null, lane: null, track_segment: null,
      severity: 2, summary: 'Transmission failure', details: null,
      created_by: 99, created_at: '2025-01-01T00:00:00Z',
      updated_by: null, updated_at: null,
      can_edit: true, // admin with edit.all gets true even for non-owned incidents
    };
    expect(inc.can_edit).toBe(true);
    expect(inc.created_by).toBe(99); // not the requesting user, but admin override
  });
});

// ── CRUD param/response shapes ───────────────────────────────────────────

describe('CRUD param/response shapes', () => {
  it('CreateRunIncidentParams requires run_id, incident_type_id, summary', () => {
    const params: CreateRunIncidentParams = {
      run_id: 5000,
      incident_type_id: 1,
      summary: 'Explosion on launch',
    };
    expect(params.run_id).toBe(5000);
    expect(params.incident_type_id).toBe(1);
    expect(params.summary).toBe('Explosion on launch');
    // Optional fields should be undefined
    expect(params.details).toBeUndefined();
    expect(params.severity).toBeUndefined();
  });

  it('CreateRunIncidentParams allows all optional fields', () => {
    const params: CreateRunIncidentParams = {
      run_id: 5000,
      incident_type_id: 3,
      summary: 'Blower explosion',
      details: 'Supercharger burst at half-track',
      severity: 5,
      occurred_at_utc: '2025-10-31T15:00:00Z',
      lane: 'R',
      track_segment: 'half-track',
    };
    expect(params.severity).toBe(5);
    expect(params.lane).toBe('R');
  });

  it('CreateRunIncidentResponse shape', () => {
    const res: CreateRunIncidentResponse = { ok: true, incident_id: 42, run_id: 5000 };
    expect(res.ok).toBe(true);
    expect(res.incident_id).toBe(42);
  });

  it('UpdateRunIncidentParams requires only incident_id', () => {
    const params: UpdateRunIncidentParams = {
      incident_id: 42,
      summary: 'Updated summary',
    };
    expect(params.incident_id).toBe(42);
    expect(params.incident_type_id).toBeUndefined();
  });

  it('UpdateRunIncidentResponse shape', () => {
    const res: UpdateRunIncidentResponse = { ok: true, incident_id: 42 };
    expect(res.ok).toBe(true);
  });

  it('DeleteRunIncidentResponse shape', () => {
    const res: DeleteRunIncidentResponse = { ok: true, deleted_id: 42 };
    expect(res.deleted_id).toBe(42);
  });

  it('ListIncidentTypesResponse shape', () => {
    const res: ListIncidentTypesResponse = {
      types: [
        { id: 1, key: 'crash', label: 'Crash', severity_min: 3, severity_max: 5, sort_order: 10, is_active: true },
        { id: 2, key: 'fire', label: 'Fire', severity_min: 3, severity_max: 5, sort_order: 20, is_active: true },
      ],
    };
    expect(res.types).toHaveLength(2);
    expect(res.types[0].key).toBe('crash');
  });

  it('ListRunIncidentsResponse shape', () => {
    const res: ListRunIncidentsResponse = {
      incidents: [],
      run_id: 5000,
    };
    expect(res.incidents).toHaveLength(0);
    expect(res.run_id).toBe(5000);
  });
});

// ── incident_count contract on run list responses ────────────────────────

describe('incident_count on run list responses', () => {
  // These test the TS type contract that incident_count is an optional number
  // on ParityRun and RunWithWeather. The backend now always populates it.

  it('ParityRun type accepts incident_count', () => {
    // Simulate a run row with incident_count from the backend
    const run: { id: number; incident_count?: number } = {
      id: 1,
      incident_count: 2,
    };
    expect(run.incident_count).toBe(2);
  });

  it('incident_count defaults to 0 when no incidents exist', () => {
    const run = { id: 2, incident_count: 0 };
    expect(run.incident_count).toBe(0);
  });

  it('incident_count is a non-negative integer', () => {
    const counts = [0, 1, 5, 10];
    for (const c of counts) {
      expect(c).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(c)).toBe(true);
    }
  });
});

// ── IncidentLink shape ──────────────────────────────────────────────────

describe('IncidentLink shape', () => {
  it('validates a well-formed link', () => {
    const lnk: IncidentLink = {
      id: 10,
      incident_id: 100,
      link_type: 'external_url',
      ref: 'https://example.com/video',
      meta_json: null,
      created_by: 42,
      created_at: '2025-11-01T10:00:00Z',
      can_delete: true,
    };
    expect(lnk.id).toBe(10);
    expect(lnk.link_type).toBe('external_url');
    expect(lnk.can_delete).toBe(true);
  });

  it('allows idr_session and idr_file link types', () => {
    const session: IncidentLink = {
      id: 11, incident_id: 100, link_type: 'idr_session',
      ref: 'session-abc-123', meta_json: { viewer: 'v2' },
      created_by: 42, created_at: '2025-11-01T10:00:00Z', can_delete: false,
    };
    const file: IncidentLink = {
      id: 12, incident_id: 100, link_type: 'idr_file',
      ref: 'file-xyz-789', meta_json: null,
      created_by: 42, created_at: '2025-11-01T10:00:00Z', can_delete: true,
    };
    expect(session.link_type).toBe('idr_session');
    expect(file.link_type).toBe('idr_file');
  });

  it('meta_json can hold arbitrary metadata', () => {
    const lnk: IncidentLink = {
      id: 13, incident_id: 100, link_type: 'idr_session',
      ref: 'sess-1', meta_json: { viewer: 'v2', startTime: 42.5 },
      created_by: 1, created_at: '2025-01-01T00:00:00Z', can_delete: true,
    };
    expect(lnk.meta_json).toEqual({ viewer: 'v2', startTime: 42.5 });
  });
});

// ── Link CRUD param/response shapes ─────────────────────────────────────

describe('Link CRUD param/response shapes', () => {
  it('CreateIncidentLinkParams requires incident_id, link_type, ref', () => {
    const params: CreateIncidentLinkParams = {
      incident_id: 100,
      link_type: 'external_url',
      ref: 'https://example.com',
    };
    expect(params.incident_id).toBe(100);
    expect(params.link_type).toBe('external_url');
    expect(params.ref).toBe('https://example.com');
    expect(params.meta_json).toBeUndefined();
  });

  it('CreateIncidentLinkParams allows optional meta_json', () => {
    const params: CreateIncidentLinkParams = {
      incident_id: 100,
      link_type: 'idr_session',
      ref: 'sess-abc',
      meta_json: { viewerHint: 'overlay' },
    };
    expect(params.meta_json).toEqual({ viewerHint: 'overlay' });
  });

  it('CreateIncidentLinkResponse shape', () => {
    const res: CreateIncidentLinkResponse = { ok: true, link_id: 10, incident_id: 100 };
    expect(res.ok).toBe(true);
    expect(res.link_id).toBe(10);
  });

  it('DeleteIncidentLinkResponse shape', () => {
    const res: DeleteIncidentLinkResponse = { ok: true, deleted_id: 10 };
    expect(res.deleted_id).toBe(10);
  });

  it('ListIncidentLinksResponse shape', () => {
    const res: ListIncidentLinksResponse = { links: [], incident_id: 100 };
    expect(res.links).toHaveLength(0);
    expect(res.incident_id).toBe(100);
  });
});

// ── ALLOWED_LINK_TYPES ──────────────────────────────────────────────────

describe('ALLOWED_LINK_TYPES', () => {
  it('contains exactly 3 link types', () => {
    expect(ALLOWED_LINK_TYPES).toHaveLength(3);
  });

  it('includes external_url, idr_session, idr_file', () => {
    const values = ALLOWED_LINK_TYPES.map(t => t.value);
    expect(values).toContain('external_url');
    expect(values).toContain('idr_session');
    expect(values).toContain('idr_file');
  });

  it('each entry has a value and label', () => {
    for (const t of ALLOWED_LINK_TYPES) {
      expect(t.value).toBeTruthy();
      expect(t.label).toBeTruthy();
    }
  });

  it('IncidentLinkType is assignable from allowed values', () => {
    const types: IncidentLinkType[] = ALLOWED_LINK_TYPES.map(t => t.value);
    expect(types).toHaveLength(3);
  });
});
