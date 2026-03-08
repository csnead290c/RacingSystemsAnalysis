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
    throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
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
    const token = getAuthToken();
    return `${API_BASE}/incident-analysis.php?action=getDatasetData&dataset_id=${datasetId}${token ? `&_token=${token}` : ''}`;
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
};
