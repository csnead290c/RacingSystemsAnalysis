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

// ── Weather / Track / Event Types ────────────────────────────────────────

export interface TrackResponse {
  id: number;
  trackName: string;
  timezoneIana: string;
}

export interface TracksResponse {
  tracks: { id: number; track_name: string; timezone_iana: string; created_at: string }[];
}

export interface CreateEventParams {
  eventName: string;
  trackId: number;
  startDateLocal: string;
  endDateLocal: string;
  raceLookup?: string;
}

export interface EventResponse {
  id: number;
  eventName: string;
  trackId: number;
  startDateLocal: string;
  endDateLocal: string;
  raceLookup: string | null;
}

export interface EventsResponse {
  events: {
    id: number; event_name: string; track_id: number; track_name: string;
    timezone_iana: string; start_date_local: string; end_date_local: string;
    race_lookup: string | null; created_at: string;
  }[];
}

export interface WeatherBackfillParams {
  eventId: number;
  fromDateLocal?: string;
  toDateLocal?: string;
  minRowsPerDay?: number;
}

export interface WeatherBackfillResponse {
  eventId: number;
  fromDateLocal: string;
  toDateLocal: string;
  timezone: string;
  daysChecked: number;
  daysFetched: number;
  rowsInserted: number;
  rowsDeduped: number;
  errors: string[];
}

export interface WeatherBuildCanonicalParams {
  startUtc?: string;
  endUtc?: string;
  bucketMinutes?: number;
}

export interface WeatherBuildCanonicalResponse {
  startUtc: string;
  endUtc: string;
  bucketMinutes: number;
  bucketsProcessed: number;
}

export interface RunWithWeather extends ParityRun {
  weather: {
    timestamp_utc: string;
    temp_f: number | null;
    rh_pct: number | null;
    pressure_inhg: number | null;
    delta_seconds: number;
  } | null;
}

export interface RunsWithWeatherParams {
  raceLookup: string;
  windowMinutes?: number;
  classIndex?: string;
  driverName?: string;
  lane?: string;
  round?: string;
  limit?: number;
  offset?: number;
}

export interface RunsWithWeatherResponse {
  runs: RunWithWeather[];
  total: number;
  joinedCount: number;
  windowMinutes: number;
  limit: number;
  offset: number;
  raceLookup: string;
}

export interface WeatherSample {
  id: number;
  timestamp_utc: string;
  event_id: number | null;
  track_id: number | null;
  event_local_time: string | null;
  temp_c: number | null;
  temp_f: number | null;
  rh_pct: number | null;
  station_pressure_raw: number | null;
  source: string;
  created_at: string;
}

export interface WeatherSamplesParams {
  eventId?: number;
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
}

export interface WeatherSamplesResponse {
  samples: WeatherSample[];
  count: number;
}

export interface WeatherCanonicalPoint {
  id: number;
  timestamp_utc: string;
  temp_f: number | null;
  rh_pct: number | null;
  pressure_inhg: number | null;
  created_at: string;
}

export interface WeatherCanonicalParams {
  fromUtc?: string;
  toUtc?: string;
  limit?: number;
}

export interface WeatherCanonicalResponse {
  canonical: WeatherCanonicalPoint[];
  count: number;
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

  // Extract action name for diagnostics
  const actionMatch = endpoint.match(/action=(\w+)/);
  const actionLabel = actionMatch ? actionMatch[1] : endpoint;

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new Error(`[${actionLabel}] Network error: ${err.message}`);
  }

  // Read body as text first so we can diagnose non-JSON responses
  const text = await response.text();

  // Detect HTML responses (dev server fallback, PHP error page, etc.)
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
    throw new Error(
      `[${actionLabel}] HTTP ${response.status} — received HTML instead of JSON. ` +
      (response.status === 200
        ? 'The /api proxy may not be configured (dev server returning index.html).'
        : `Server returned an error page.`) +
      ` Body: ${text.slice(0, 200)}`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `[${actionLabel}] HTTP ${response.status} — invalid JSON response. Body: ${text.slice(0, 200)}`
    );
  }

  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || `[${actionLabel}] API request failed (HTTP ${response.status})`);
  }

  return data;
}

// ── Cache ───────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
}

const cache: {
  tracks?: CacheEntry<TracksResponse>;
  events?: CacheEntry<EventsResponse>;
  imports?: CacheEntry<ImportsResponse>;
} = {};

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && (Date.now() - entry.fetchedAt) < CACHE_TTL_MS;
}

/** Invalidate one or all cache keys. Called after mutations. */
export function invalidateParityCache(key?: 'tracks' | 'events' | 'imports') {
  if (key) { delete cache[key]; }
  else { delete cache.tracks; delete cache.events; delete cache.imports; }
}

// ── API ─────────────────────────────────────────────────────────────────

export const parityApi = {
  async peek(raceLookup: string): Promise<PeekResponse> {
    return parityRequest<PeekResponse>(
      `/parity.php?action=peek&raceLookup=${encodeURIComponent(raceLookup)}`
    );
  },

  async ingest(raceLookup: string, force = false): Promise<IngestResponse> {
    const result = await parityRequest<IngestResponse>('/parity.php?action=ingest', {
      method: 'POST',
      body: JSON.stringify({ raceLookup, force }),
    });
    invalidateParityCache('imports');
    return result;
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

  async listImports(limit = 50, force = false): Promise<ImportsResponse> {
    if (!force && isFresh(cache.imports)) return cache.imports.data;
    const data = await parityRequest<ImportsResponse>(
      `/parity.php?action=imports&limit=${limit}`
    );
    cache.imports = { data, fetchedAt: Date.now() };
    return data;
  },

  // ── Weather / Track / Event ─────────────────────────────────────────

  async createTrack(trackName: string, timezoneIana: string): Promise<TrackResponse> {
    const result = await parityRequest<TrackResponse>('/parity.php?action=createTrack', {
      method: 'POST',
      body: JSON.stringify({ trackName, timezoneIana }),
    });
    invalidateParityCache('tracks');
    return result;
  },

  async createEvent(params: CreateEventParams): Promise<EventResponse> {
    const result = await parityRequest<EventResponse>('/parity.php?action=createEvent', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    invalidateParityCache('events');
    return result;
  },

  async listTracks(force = false): Promise<TracksResponse> {
    if (!force && isFresh(cache.tracks)) return cache.tracks.data;
    const data = await parityRequest<TracksResponse>('/parity.php?action=tracks');
    cache.tracks = { data, fetchedAt: Date.now() };
    return data;
  },

  async listEvents(force = false): Promise<EventsResponse> {
    if (!force && isFresh(cache.events)) return cache.events.data;
    const data = await parityRequest<EventsResponse>('/parity.php?action=events');
    cache.events = { data, fetchedAt: Date.now() };
    return data;
  },

  async weatherBackfill(params: WeatherBackfillParams): Promise<WeatherBackfillResponse> {
    const result = await parityRequest<WeatherBackfillResponse>('/parity.php?action=weatherBackfill', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    return result;
  },

  async weatherBuildCanonical(params: WeatherBuildCanonicalParams = {}): Promise<WeatherBuildCanonicalResponse> {
    return parityRequest<WeatherBuildCanonicalResponse>('/parity.php?action=weatherBuildCanonical', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async runsWithWeather(params: RunsWithWeatherParams): Promise<RunsWithWeatherResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'runsWithWeather');
    qs.set('raceLookup', params.raceLookup);
    if (params.windowMinutes) qs.set('windowMinutes', String(params.windowMinutes));
    if (params.classIndex) qs.set('classIndex', params.classIndex);
    if (params.driverName) qs.set('driverName', params.driverName);
    if (params.lane) qs.set('lane', params.lane);
    if (params.round) qs.set('round', params.round);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    return parityRequest<RunsWithWeatherResponse>(`/parity.php?${qs.toString()}`);
  },

  async weatherSamples(params: WeatherSamplesParams = {}): Promise<WeatherSamplesResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'weatherSamples');
    if (params.eventId) qs.set('eventId', String(params.eventId));
    if (params.fromUtc) qs.set('fromUtc', params.fromUtc);
    if (params.toUtc) qs.set('toUtc', params.toUtc);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<WeatherSamplesResponse>(`/parity.php?${qs.toString()}`);
  },

  async weatherCanonical(params: WeatherCanonicalParams = {}): Promise<WeatherCanonicalResponse> {
    const qs = new URLSearchParams();
    qs.set('action', 'weatherCanonical');
    if (params.fromUtc) qs.set('fromUtc', params.fromUtc);
    if (params.toUtc) qs.set('toUtc', params.toUtc);
    if (params.limit) qs.set('limit', String(params.limit));
    return parityRequest<WeatherCanonicalResponse>(`/parity.php?${qs.toString()}`);
  },
};
