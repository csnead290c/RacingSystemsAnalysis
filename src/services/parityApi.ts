/**
 * Parity API Client
 *
 * Typed wrappers for the NHRA Tech Parity endpoints (api/parity.php).
 * All endpoints require nhra.parity capability (owner/admin only).
 */

import { getAuthToken } from './api';

const API_BASE = '/api';

// ── Types ───────────────────────────────────────────────────────────────

export interface PeekResponse {
  url: string;
  detectedShape: string;
  rowCountFirstPage: number;
  hasNextLink: boolean;
  nextLink: string | null;
  topLevelKeys: string[];
  firstRowKeys: string[];
  firstRowSample: Record<string, any> | null;
  normalizedSample: Record<string, any> | null;
  hint?: string;
}

export interface IngestResponse {
  raceLookup: string;
  importId: string;
  rowsFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  parsedTimestampCount?: number;
  parsedClassCount?: number;
  parsedDriverCount?: number;
  parsedFt1320Count?: number;
  parsedMph1320Count?: number;
  hint?: string;
  url?: string;
  error?: string;
  existingImportId?: string;
  existingRowCount?: number;
  existingFetchedAt?: string;
}

export interface ParityRun {
  uuid: string;
  race_lookup: string;
  run_timestamp_utc: string | null;
  category: string | null;
  class_index: string | null;
  round: string | null;
  lane: string | null;
  driver_name: string | null;
  car_number: string | null;
  dial_in: number | null;
  rt: number | null;
  ft60: number | null;
  ft330: number | null;
  ft660: number | null;
  mph660: number | null;
  ft1000: number | null;
  mph1000: number | null;
  ft1320: number | null;
  mph1320: number | null;
  win_flag: boolean | null;
  dq_flag: boolean | null;
  mov: number | null;
  place: string | null;
  source_ref: string | null;
  created_at: string;
}

export interface RunsResponse {
  runs: ParityRun[];
  total: number;
  limit: number;
  offset: number;
  raceLookup: string;
}

export interface RunsQueryParams {
  raceLookup: string;
  classIndex?: string;
  driverName?: string;
  lane?: string;
  round?: string;
  dq?: 'include' | 'exclude' | 'only';
  limit?: number;
  offset?: number;
}

export interface SuggestResponse {
  year: number;
  candidatesTested: number;
  eventsFound: number;
  events: { raceLookup: string; rowCount: number; categories: string[] }[];
}

export interface ParityImport {
  uuid: string;
  race_lookup: string;
  requested_at_utc: string;
  fetched_at_utc: string | null;
  status: 'success' | 'error';
  row_count: number;
  error_message: string | null;
  source_url: string;
  created_by_user_id: number | null;
  created_at: string;
}

export interface ImportsResponse {
  imports: ParityImport[];
  total: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function parityRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  const response = await fetch(url, { ...options, headers });
  const data = await response.json();

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || `API request failed (${response.status})`);
  }

  return data;
}

// ── API ─────────────────────────────────────────────────────────────────

export const parityApi = {
  async peek(raceLookup: string): Promise<PeekResponse> {
    return parityRequest<PeekResponse>(
      `/parity.php?action=peek&raceLookup=${encodeURIComponent(raceLookup)}`
    );
  },

  async ingest(raceLookup: string, force = false): Promise<IngestResponse> {
    return parityRequest<IngestResponse>('/parity.php?action=ingest', {
      method: 'POST',
      body: JSON.stringify({ raceLookup, force }),
    });
  },

  async queryRuns(params: RunsQueryParams): Promise<RunsResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'runs');
    qs.set('raceLookup', params.raceLookup);
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.driverName) qs.set('driverName', params.driverName);
    if (params.lane) qs.set('lane', params.lane);
    if (params.round) qs.set('round', params.round);
    if (params.dq) qs.set('dq', params.dq);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return parityRequest<RunsResponse>(`/parity.php?${qs.toString()}`);
  },

  async suggestRaceLookups(year: number, maxAttempts = 60): Promise<SuggestResponse> {
    return parityRequest<SuggestResponse>(
      `/parity.php?action=suggestRaceLookups&year=${year}&maxAttempts=${maxAttempts}`
    );
  },

  async listImports(limit = 50): Promise<ImportsResponse> {
    return parityRequest<ImportsResponse>(
      `/parity.php?action=imports&limit=${limit}`
    );
  },
};
