/**
 * Incident Analysis API Client
 *
 * Typed wrappers for the incident analysis endpoints (api/incident-analysis.php).
 * Requires incidents.read / incidents.create capabilities.
 */

import { getAuthToken } from './api';

const API_BASE = '/api';

// ── Types ───────────────────────────────────────────────────────────────

export interface AnalysisSession {
  id: number;
  incident_id: number;
  layout_json: AnalysisLayout | null;
  created_by: number;
  created_at: string;
  updated_by: number | null;
  updated_at: string | null;
}

export interface AnalysisLayout {
  visibleChannelIds?: number[];
  chartZoom?: { min: number; max: number } | null;
  playbackSpeed?: number;
  cursorTime?: number | null;
  videoPositions?: Record<number, { x: number; y: number; w: number; h: number }>;
  [key: string]: unknown;
}

export interface AnalysisChannel {
  id: number;
  dataset_id: number;
  name: string;
  unit: string | null;
  source: 'imported' | 'derived';
  expression: string | null;
  sample_count: number;
  min_value: number | null;
  max_value: number | null;
  mean_value: number | null;
  color: string | null;
  visible: boolean;
  sort_order: number;
}

export interface AnalysisDataset {
  id: number;
  session_id: number;
  name: string;
  file_size: number;
  file_mime: string | null;
  time_column: string | null;
  time_unit: string;
  time_offset: number;
  sample_count: number;
  time_min: number | null;
  time_max: number | null;
  color: string | null;
  created_at: string;
  channels: AnalysisChannel[];
}

export interface AnalysisVideo {
  id: number;
  session_id: number;
  name: string;
  file_size: number;
  file_mime: string | null;
  duration: number | null;
  time_offset: number;
  created_at: string;
  url: string;
}

export interface AnalysisMeasurement {
  id: number;
  session_id: number;
  label: string | null;
  t1: number;
  t2: number;
  channel_id: number | null;
  delta_time: number;
  notes: string | null;
  created_by: number;
  created_at: string;
}

// ── Workspace Foundation Types (v31) ───────────────────────────────────

export interface ProcessedSessionMetadata {
  session_id: number;
  title: string;
  source_type: string;
  created_at: string;
  file_name: string;
  sample_count: number;
  duration_seconds: number;
  parse_warnings: string[];
}

export interface ProcessedChannel {
  key: string;
  label: string;
  unit: string | null;
  group: string;
  sample_count: number;
  min: number;
  max: number;
  data_type: string;
  original_column: string;
  color_hint: string | null;
  values: (number | null)[];
}

export interface ProcessedSession {
  metadata: ProcessedSessionMetadata;
  timebase: {
    values: number[];
    unit: string;
    sample_rate_hz: number | null;
  };
  channels: ProcessedChannel[];
  markers: Array<{ time: number; label: string; type: string }>;
  stats_summary: {
    total_channels: number;
    numeric_channels: number;
    derived_channels: number;
  };
}

export interface AnalysisWorkspace {
  id: number;
  session_id: number;
  name: string;
  description: string | null;
  layout_json: WorkspaceLayout;
  is_default: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceLayout {
  plots?: Array<{
    id: string;
    channels: string[];
    title?: string;
  }>;
  visible_channels?: string[];
  zoom_range?: { min: number; max: number } | null;
  cursor_time?: number | null;
  bookmarks_visible?: boolean;
  derived_channels?: Array<{
    key: string;
    label: string;
    expression: string;
    unit?: string;
  }>;
  [key: string]: unknown;
}

export interface AnalysisBookmark {
  id: number;
  session_id: number;
  workspace_id: number | null;
  time_sec: number;
  end_time_sec: number | null;
  label: string;
  note: string | null;
  color: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// ── Response types ──────────────────────────────────────────────────────

export interface GetSessionResponse { session: AnalysisSession }
export interface SaveSessionResponse { ok: boolean; session_id: number }
export interface UploadDatasetResponse { ok: boolean; dataset_id: number; name: string; sample_count: number; channel_count: number; time_column: string | null; time_unit: string }
export interface ListDatasetsResponse { datasets: AnalysisDataset[]; session_id: number }
export interface UpdateDatasetResponse { ok: boolean; dataset_id: number }
export interface DeleteDatasetResponse { ok: boolean; deleted_id: number }
export interface UploadVideoResponse { ok: boolean; video_id: number; name: string; file_size: number }
export interface ListVideosResponse { videos: AnalysisVideo[]; session_id: number }
export interface UpdateVideoResponse { ok: boolean; video_id: number }
export interface DeleteVideoResponse { ok: boolean; deleted_id: number }
export interface SaveMeasurementResponse { ok: boolean; measurement_id: number }
export interface ListMeasurementsResponse { measurements: AnalysisMeasurement[]; session_id: number }
export interface DeleteMeasurementResponse { ok: boolean; deleted_id: number }

// ── Request helper ──────────────────────────────────────────────────────

async function iaRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Don't set Content-Type for FormData (browser sets multipart boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

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
    throw new Error(`[${actionLabel}] HTTP ${response.status} — received HTML instead of JSON`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`[${actionLabel}] HTTP ${response.status} — invalid JSON. Body: ${text.slice(0, 300)}`);
  }

  if (!response.ok) {
    // Include server hint in error message when available (e.g. "Run migration v16")
    const base = data?.error || data?.message || `HTTP ${response.status}`;
    const hint = data?.hint ? ` | Hint: ${data.hint}` : '';
    throw new Error(base + hint);
  }

  return data as T;
}

// ── API Client ──────────────────────────────────────────────────────────

export const incidentAnalysisApi = {
  // Session
  async getSession(incidentId: number): Promise<GetSessionResponse> {
    return iaRequest<GetSessionResponse>(
      `/incident-analysis.php?action=getSession&incident_id=${incidentId}`,
    );
  },

  async saveSession(sessionId: number, layoutJson: AnalysisLayout | null): Promise<SaveSessionResponse> {
    return iaRequest<SaveSessionResponse>('/incident-analysis.php?action=saveSession', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId, layout_json: layoutJson }),
    });
  },

  // Datasets
  async uploadDataset(sessionId: number, file: File): Promise<UploadDatasetResponse> {
    const formData = new FormData();
    formData.append('session_id', String(sessionId));
    formData.append('file', file);
    return iaRequest<UploadDatasetResponse>('/incident-analysis.php?action=uploadDataset', {
      method: 'POST',
      body: formData,
    });
  },

  async listDatasets(sessionId: number): Promise<ListDatasetsResponse> {
    return iaRequest<ListDatasetsResponse>(
      `/incident-analysis.php?action=listDatasets&session_id=${sessionId}`,
    );
  },

  getDatasetDataUrl(datasetId: number): string {
    return `${API_BASE}/incident-analysis.php?action=getDatasetData&dataset_id=${datasetId}`;
  },

  async fetchDatasetData(datasetId: number): Promise<string> {
    const url = `${API_BASE}/incident-analysis.php?action=getDatasetData&dataset_id=${datasetId}`;
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to fetch dataset ${datasetId}: HTTP ${res.status}`);
    return res.text();
  },

  async updateDataset(datasetId: number, fields: { time_offset?: number; color?: string; name?: string }): Promise<UpdateDatasetResponse> {
    return iaRequest<UpdateDatasetResponse>('/incident-analysis.php?action=updateDataset', {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId, ...fields }),
    });
  },

  async deleteDataset(datasetId: number): Promise<DeleteDatasetResponse> {
    return iaRequest<DeleteDatasetResponse>('/incident-analysis.php?action=deleteDataset', {
      method: 'POST',
      body: JSON.stringify({ dataset_id: datasetId }),
    });
  },

  // Videos
  async uploadVideo(sessionId: number, file: File): Promise<UploadVideoResponse> {
    const formData = new FormData();
    formData.append('session_id', String(sessionId));
    formData.append('file', file);
    return iaRequest<UploadVideoResponse>('/incident-analysis.php?action=uploadVideo', {
      method: 'POST',
      body: formData,
    });
  },

  async listVideos(sessionId: number): Promise<ListVideosResponse> {
    return iaRequest<ListVideosResponse>(
      `/incident-analysis.php?action=listVideos&session_id=${sessionId}`,
    );
  },

  async updateVideo(videoId: number, fields: { time_offset?: number; name?: string; duration?: number | null }): Promise<UpdateVideoResponse> {
    return iaRequest<UpdateVideoResponse>('/incident-analysis.php?action=updateVideo', {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId, ...fields }),
    });
  },

  getVideoUrl(videoId: number): string {
    const token = getAuthToken();
    return `${API_BASE}/incident-analysis.php?action=getVideoFile&video_id=${videoId}${token ? `&_token=${encodeURIComponent(token)}` : ''}`;
  },

  async deleteVideo(videoId: number): Promise<DeleteVideoResponse> {
    return iaRequest<DeleteVideoResponse>('/incident-analysis.php?action=deleteVideo', {
      method: 'POST',
      body: JSON.stringify({ video_id: videoId }),
    });
  },

  // Measurements
  async saveMeasurement(params: {
    session_id: number; t1: number; t2: number;
    label?: string | null; channel_id?: number | null; notes?: string | null;
    id?: number;
  }): Promise<SaveMeasurementResponse> {
    return iaRequest<SaveMeasurementResponse>('/incident-analysis.php?action=saveMeasurement', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async listMeasurements(sessionId: number): Promise<ListMeasurementsResponse> {
    return iaRequest<ListMeasurementsResponse>(
      `/incident-analysis.php?action=listMeasurements&session_id=${sessionId}`,
    );
  },

  async deleteMeasurement(measurementId: number): Promise<DeleteMeasurementResponse> {
    return iaRequest<DeleteMeasurementResponse>('/incident-analysis.php?action=deleteMeasurement', {
      method: 'POST',
      body: JSON.stringify({ measurement_id: measurementId }),
    });
  },

  // ── Workspace Foundation (v31) ──────────────────────────────────────────

  async processSession(sessionId: number): Promise<{ ok: boolean; processed: any }> {
    return iaRequest('/incident-analysis.php?action=processSession', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
  },

  async getProcessedSession(sessionId: number): Promise<{ processed_session: ProcessedSession }> {
    return iaRequest(`/incident-analysis.php?action=getProcessedSession&session_id=${sessionId}`);
  },

  async listWorkspaces(sessionId: number): Promise<{ workspaces: AnalysisWorkspace[] }> {
    return iaRequest(`/incident-analysis.php?action=listWorkspaces&session_id=${sessionId}`);
  },

  async getWorkspace(workspaceId: number): Promise<{ workspace: AnalysisWorkspace }> {
    return iaRequest(`/incident-analysis.php?action=getWorkspace&workspace_id=${workspaceId}`);
  },

  async saveWorkspace(data: {
    workspace_id?: number;
    session_id: number;
    name: string;
    description?: string;
    layout_json: WorkspaceLayout;
    is_default?: boolean;
  }): Promise<{ ok: boolean; workspace_id: number }> {
    return iaRequest('/incident-analysis.php?action=saveWorkspace', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async deleteWorkspace(workspaceId: number): Promise<{ ok: boolean; deleted_id: number }> {
    return iaRequest('/incident-analysis.php?action=deleteWorkspace', {
      method: 'POST',
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
  },

  async listBookmarks(sessionId: number, workspaceId?: number): Promise<{ bookmarks: AnalysisBookmark[] }> {
    const params = workspaceId
      ? `session_id=${sessionId}&workspace_id=${workspaceId}`
      : `session_id=${sessionId}`;
    return iaRequest(`/incident-analysis.php?action=listBookmarks&${params}`);
  },

  async createBookmark(data: {
    session_id: number;
    workspace_id?: number;
    time_sec: number;
    end_time_sec?: number;
    label: string;
    note?: string;
    color?: string;
  }): Promise<{ ok: boolean; bookmark_id: number }> {
    return iaRequest('/incident-analysis.php?action=createBookmark', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateBookmark(bookmarkId: number, data: {
    label?: string;
    note?: string;
    color?: string;
    time_sec?: number;
    end_time_sec?: number;
  }): Promise<{ ok: boolean; bookmark_id: number }> {
    return iaRequest('/incident-analysis.php?action=updateBookmark', {
      method: 'POST',
      body: JSON.stringify({ bookmark_id: bookmarkId, ...data }),
    });
  },

  async deleteBookmark(bookmarkId: number): Promise<{ ok: boolean; deleted_id: number }> {
    return iaRequest('/incident-analysis.php?action=deleteBookmark', {
      method: 'POST',
      body: JSON.stringify({ bookmark_id: bookmarkId }),
    });
  },
};
