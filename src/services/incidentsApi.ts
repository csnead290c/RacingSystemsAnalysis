/**
 * Run Incidents API Client
 *
 * Typed wrappers for the incident endpoints (api/incidents.php).
 * Requires incidents.read / incidents.create / incidents.edit.own capabilities.
 */

import { getAuthToken } from './api';

const API_BASE = '/api';

// ── Types ───────────────────────────────────────────────────────────────

export interface IncidentType {
  id: number;
  key: string;
  label: string;
  severity_min: number | null;
  severity_max: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface RunIncident {
  id: number;
  run_id: number;
  incident_type_id: number;
  incident_type_key: string;
  incident_type_label: string;
  occurred_at_utc: string | null;
  lane: string | null;
  track_segment: string | null;
  severity: number | null;
  summary: string;
  details: string | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
  can_edit: boolean;
}

export interface ListIncidentTypesResponse {
  types: IncidentType[];
}

export interface ListRunIncidentsResponse {
  incidents: RunIncident[];
  run_id: number;
}

export interface CreateRunIncidentParams {
  run_id: number;
  incident_type_id: number;
  summary: string;
  details?: string | null;
  severity?: number | null;
  occurred_at_utc?: string | null;
  lane?: string | null;
  track_segment?: string | null;
}

export interface CreateRunIncidentResponse {
  ok: boolean;
  incident_id: number;
  run_id: number;
}

export interface UpdateRunIncidentParams {
  incident_id: number;
  incident_type_id?: number;
  summary?: string;
  details?: string | null;
  severity?: number | null;
  occurred_at_utc?: string | null;
  lane?: string | null;
  track_segment?: string | null;
}

export interface UpdateRunIncidentResponse {
  ok: boolean;
  incident_id: number;
}

export interface DeleteRunIncidentResponse {
  ok: boolean;
  deleted_id: number;
}

// ── Link Types ─────────────────────────────────────────────────────────

export type IncidentLinkType = 'external_url' | 'idr_session' | 'idr_file';

export const ALLOWED_LINK_TYPES: { value: IncidentLinkType; label: string }[] = [
  { value: 'external_url', label: 'External URL' },
  { value: 'idr_session', label: 'IDR Session' },
  { value: 'idr_file', label: 'IDR File' },
];

export interface IncidentLink {
  id: number;
  incident_id: number;
  link_type: IncidentLinkType;
  ref: string;
  meta_json: Record<string, unknown> | null;
  created_by: number;
  created_at: string;
  can_delete: boolean;
}

export interface ListIncidentLinksResponse {
  links: IncidentLink[];
  incident_id: number;
}

export interface CreateIncidentLinkParams {
  incident_id: number;
  link_type: IncidentLinkType;
  ref: string;
  meta_json?: Record<string, unknown> | null;
}

export interface CreateIncidentLinkResponse {
  ok: boolean;
  link_id: number;
  incident_id: number;
}

export interface DeleteIncidentLinkResponse {
  ok: boolean;
  deleted_id: number;
}

// ── Request helper ──────────────────────────────────────────────────────

async function incidentRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = options.method === 'POST'
    ? `${API_BASE}${endpoint}`
    : `${API_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}_t=${Date.now()}`;

  const actionMatch = endpoint.match(/action=(\w+)/);
  const actionLabel = actionMatch ? actionMatch[1] : endpoint;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(`[${actionLabel}] Network error: ${err.message}`);
  }

  const text = await response.text();

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
    throw new Error(
      `[${actionLabel}] HTTP ${response.status} — received HTML instead of JSON. Body: ${text.slice(0, 200)}`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`[${actionLabel}] HTTP ${response.status} — invalid JSON. Body: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
  }

  return data as T;
}

// ── API Client ──────────────────────────────────────────────────────────

export const incidentsApi = {
  async listIncidentTypes(): Promise<ListIncidentTypesResponse> {
    return incidentRequest<ListIncidentTypesResponse>(
      '/incidents.php?action=listIncidentTypes',
    );
  },

  async listRunIncidents(runId: number): Promise<ListRunIncidentsResponse> {
    return incidentRequest<ListRunIncidentsResponse>(
      `/incidents.php?action=listRunIncidents&run_id=${runId}`,
    );
  },

  async createRunIncident(params: CreateRunIncidentParams): Promise<CreateRunIncidentResponse> {
    return incidentRequest<CreateRunIncidentResponse>('/incidents.php?action=createRunIncident', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async updateRunIncident(params: UpdateRunIncidentParams): Promise<UpdateRunIncidentResponse> {
    return incidentRequest<UpdateRunIncidentResponse>('/incidents.php?action=updateRunIncident', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteRunIncident(incidentId: number): Promise<DeleteRunIncidentResponse> {
    return incidentRequest<DeleteRunIncidentResponse>('/incidents.php?action=deleteRunIncident', {
      method: 'POST',
      body: JSON.stringify({ incident_id: incidentId }),
    });
  },

  // ── Links ────────────────────────────────────────────────────────────

  async listIncidentLinks(incidentId: number): Promise<ListIncidentLinksResponse> {
    return incidentRequest<ListIncidentLinksResponse>(
      `/incidents.php?action=listIncidentLinks&incident_id=${incidentId}`,
    );
  },

  async createIncidentLink(params: CreateIncidentLinkParams): Promise<CreateIncidentLinkResponse> {
    return incidentRequest<CreateIncidentLinkResponse>('/incidents.php?action=createIncidentLink', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async deleteIncidentLink(linkId: number): Promise<DeleteIncidentLinkResponse> {
    return incidentRequest<DeleteIncidentLinkResponse>('/incidents.php?action=deleteIncidentLink', {
      method: 'POST',
      body: JSON.stringify({ link_id: linkId }),
    });
  },
};
