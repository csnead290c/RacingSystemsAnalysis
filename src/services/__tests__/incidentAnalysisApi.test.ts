/**
 * Tests for incidentAnalysisApi client — type shapes, method signatures, and contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  incidentAnalysisApi,
  type AnalysisSession,
  type AnalysisDataset,
  type AnalysisChannel,
  type AnalysisVideo,
  type AnalysisMeasurement,
  type AnalysisLayout,
  type GetSessionResponse,
  type ListDatasetsResponse,
  type ListVideosResponse,
  type ListMeasurementsResponse,
  type UploadDatasetResponse,
  type UploadVideoResponse,
  type SaveMeasurementResponse,
} from '../incidentAnalysisApi';

describe('incidentAnalysisApi', () => {
  // ── API surface exists ────────────────────────────────────────────────

  it('exports incidentAnalysisApi object with all Phase 1 methods', () => {
    expect(typeof incidentAnalysisApi.getSession).toBe('function');
    expect(typeof incidentAnalysisApi.saveSession).toBe('function');
    expect(typeof incidentAnalysisApi.uploadDataset).toBe('function');
    expect(typeof incidentAnalysisApi.listDatasets).toBe('function');
    expect(typeof incidentAnalysisApi.getDatasetDataUrl).toBe('function');
    expect(typeof incidentAnalysisApi.updateDataset).toBe('function');
    expect(typeof incidentAnalysisApi.deleteDataset).toBe('function');
    expect(typeof incidentAnalysisApi.uploadVideo).toBe('function');
    expect(typeof incidentAnalysisApi.listVideos).toBe('function');
    expect(typeof incidentAnalysisApi.updateVideo).toBe('function');
    expect(typeof incidentAnalysisApi.deleteVideo).toBe('function');
    expect(typeof incidentAnalysisApi.saveMeasurement).toBe('function');
    expect(typeof incidentAnalysisApi.listMeasurements).toBe('function');
    expect(typeof incidentAnalysisApi.deleteMeasurement).toBe('function');
  });

  it('getDatasetDataUrl returns a URL string with dataset_id param', () => {
    const url = incidentAnalysisApi.getDatasetDataUrl(42);
    expect(url).toContain('action=getDatasetData');
    expect(url).toContain('dataset_id=42');
  });

  // ── Type shape contracts ──────────────────────────────────────────────

  it('AnalysisSession shape has required fields', () => {
    const session: AnalysisSession = {
      id: 1,
      incident_id: 10,
      layout_json: null,
      created_by: 5,
      created_at: '2025-01-01T00:00:00Z',
      updated_by: null,
      updated_at: null,
    };
    expect(session.id).toBe(1);
    expect(session.incident_id).toBe(10);
    expect(session.layout_json).toBeNull();
  });

  it('AnalysisSession with layout_json', () => {
    const layout: AnalysisLayout = {
      visibleChannelIds: [1, 2, 3],
      chartZoom: { min: 0, max: 10 },
      playbackSpeed: 2,
      cursorTime: 5.5,
    };
    const session: AnalysisSession = {
      id: 1, incident_id: 10, layout_json: layout,
      created_by: 5, created_at: '2025-01-01', updated_by: 5, updated_at: '2025-01-02',
    };
    expect(session.layout_json?.visibleChannelIds).toEqual([1, 2, 3]);
    expect(session.layout_json?.playbackSpeed).toBe(2);
  });

  it('AnalysisDataset shape with channels', () => {
    const ch: AnalysisChannel = {
      id: 1, dataset_id: 1, name: 'RPM', unit: 'rpm', source: 'imported',
      expression: null, sample_count: 1000, min_value: 800, max_value: 8500,
      mean_value: 4500, color: '#ff0000', visible: true, sort_order: 0,
    };
    const ds: AnalysisDataset = {
      id: 1, session_id: 1, name: 'test.csv', file_size: 50000, file_mime: 'text/csv',
      time_column: 'time', time_unit: 'seconds', time_offset: 0.5, sample_count: 1000,
      time_min: 0, time_max: 10.5, color: null, created_at: '2025-01-01',
      channels: [ch],
    };
    expect(ds.channels).toHaveLength(1);
    expect(ds.channels[0].name).toBe('RPM');
    expect(ds.time_offset).toBe(0.5);
  });

  it('AnalysisChannel derived source with expression', () => {
    const ch: AnalysisChannel = {
      id: 2, dataset_id: 1, name: 'HP_estimate', unit: 'hp', source: 'derived',
      expression: '$RPM * $Torque / 5252', sample_count: 0,
      min_value: null, max_value: null, mean_value: null,
      color: null, visible: false, sort_order: 1,
    };
    expect(ch.source).toBe('derived');
    expect(ch.expression).toContain('$RPM');
  });

  it('AnalysisVideo shape', () => {
    const v: AnalysisVideo = {
      id: 1, session_id: 1, name: 'crash_cam.mp4', file_size: 50000000,
      file_mime: 'video/mp4', duration: 45.2, time_offset: -2.5,
      created_at: '2025-01-01', url: '/api/incident-analysis.php?action=getVideoFile&video_id=1',
    };
    expect(v.time_offset).toBe(-2.5);
    expect(v.url).toContain('video_id=1');
  });

  it('AnalysisMeasurement shape with computed delta_time', () => {
    const m: AnalysisMeasurement = {
      id: 1, session_id: 1, label: 'Crash duration', t1: 3.5, t2: 5.2,
      channel_id: null, delta_time: 1.7, notes: 'From ignition to impact',
      created_by: 5, created_at: '2025-01-01',
    };
    expect(m.delta_time).toBeCloseTo(m.t2 - m.t1, 4);
    expect(m.label).toBe('Crash duration');
  });

  // ── Response type contracts ───────────────────────────────────────────

  it('GetSessionResponse shape', () => {
    const res: GetSessionResponse = {
      session: { id: 1, incident_id: 10, layout_json: null, created_by: 5, created_at: '', updated_by: null, updated_at: null },
    };
    expect(res.session.id).toBe(1);
  });

  it('ListDatasetsResponse shape', () => {
    const res: ListDatasetsResponse = { datasets: [], session_id: 1 };
    expect(res.datasets).toEqual([]);
    expect(res.session_id).toBe(1);
  });

  it('ListVideosResponse shape', () => {
    const res: ListVideosResponse = { videos: [], session_id: 1 };
    expect(res.videos).toEqual([]);
  });

  it('ListMeasurementsResponse shape', () => {
    const res: ListMeasurementsResponse = { measurements: [], session_id: 1 };
    expect(res.measurements).toEqual([]);
  });

  it('UploadDatasetResponse shape', () => {
    const res: UploadDatasetResponse = {
      ok: true, dataset_id: 1, name: 'data.csv', sample_count: 500,
      channel_count: 8, time_column: 'time', time_unit: 'seconds',
    };
    expect(res.ok).toBe(true);
    expect(res.channel_count).toBe(8);
  });

  it('UploadVideoResponse shape', () => {
    const res: UploadVideoResponse = {
      ok: true, video_id: 1, name: 'vid.mp4', file_size: 1000000,
    };
    expect(res.ok).toBe(true);
  });

  it('SaveMeasurementResponse shape', () => {
    const res: SaveMeasurementResponse = { ok: true, measurement_id: 1 };
    expect(res.measurement_id).toBe(1);
  });

  // ── Method count ──────────────────────────────────────────────────────

  it('has exactly 14 API methods', () => {
    const methods = Object.keys(incidentAnalysisApi).filter(
      k => typeof (incidentAnalysisApi as any)[k] === 'function'
    );
    expect(methods).toHaveLength(14);
  });
});
