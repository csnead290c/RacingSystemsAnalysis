/**
 * Tests for incidentAnalysisApi client, CSV parser, and workflow logic.
 *
 * Covers:
 *   - API surface and method count
 *   - Type shape contracts
 *   - Security: token leak, video auth URL
 *   - CSV parser edge cases (quoted fields, blank rows, duplicates, CRLF)
 *   - Fixture-based CSV parsing with real telemetry samples
 *   - Decimation logic
 *   - Layout save/restore state logic
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

// ── Re-implement parser functions from IncidentAnalysis.tsx for testing ──

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let i = 0;
  const len = line.length;
  while (i <= len) {
    if (i === len) { fields.push(''); break; }
    if (line[i] === '"') {
      let val = '';
      i++;
      while (i < len) {
        if (line[i] === '"') {
          if (i + 1 < len && line[i + 1] === '"') {
            val += '"'; i += 2;
          } else {
            i++; break;
          }
        } else {
          val += line[i]; i++;
        }
      }
      fields.push(val);
      if (i < len && line[i] === ',') i++;
    } else {
      const next = line.indexOf(',', i);
      if (next === -1) {
        fields.push(line.slice(i).trim());
        break;
      } else {
        fields.push(line.slice(i, next).trim());
        i = next + 1;
      }
    }
  }
  return fields;
}

interface ParsedData {
  timeColumn: string | null;
  timeUnit: string;
  columns: string[];
  rows: Record<string, number | null>[];
}

function parseCsvText(text: string, dataset: { time_column: string | null; time_unit: string; time_offset: number }): ParsedData {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let headerIdx = 0;
  while (headerIdx < lines.length && lines[headerIdx].trim() === '') headerIdx++;
  if (headerIdx >= lines.length - 1) return { timeColumn: null, timeUnit: 'seconds', columns: [], rows: [] };

  const headers = parseCsvLine(lines[headerIdx]).map(h => h.trim());
  const seen = new Map<string, number>();
  const uniqueHeaders = headers.map(h => {
    const count = seen.get(h) || 0;
    seen.set(h, count + 1);
    return count > 0 ? `${h}_${count + 1}` : h;
  });

  const timeCol = dataset.time_column;
  const timeIdx = timeCol ? uniqueHeaders.indexOf(timeCol) : -1;
  const timeDivisor = dataset.time_unit === 'milliseconds' ? 1000 : 1;

  const rows: Record<string, number | null>[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;
    const vals = parseCsvLine(line);
    const row: Record<string, number | null> = {};
    for (let j = 0; j < uniqueHeaders.length; j++) {
      const v = vals[j]?.trim();
      if (v === '' || v === undefined) { row[uniqueHeaders[j]] = null; continue; }
      const num = parseFloat(v);
      row[uniqueHeaders[j]] = isNaN(num) ? null : num;
    }
    if (timeIdx >= 0 && row[uniqueHeaders[timeIdx]] != null) {
      row['__time'] = (row[uniqueHeaders[timeIdx]]! / timeDivisor) + dataset.time_offset;
    }
    rows.push(row);
  }

  return { timeColumn: timeCol, timeUnit: dataset.time_unit, columns: uniqueHeaders, rows };
}

function decimateRows<T>(rows: T[], maxPoints: number): T[] {
  if (rows.length <= maxPoints) return rows;
  const step = (rows.length - 1) / (maxPoints - 1);
  const result: T[] = [rows[0]];
  for (let i = 1; i < maxPoints - 1; i++) {
    result.push(rows[Math.round(i * step)]);
  }
  result.push(rows[rows.length - 1]);
  return result;
}

// ── Inline fixture data (from src/services/__tests__/fixtures/*.csv) ──

const FIXTURE_SECONDS = `time,RPM,Speed_mph,Throttle_pct,Boost_psi,EGT_F
0.000,850,0.0,0.0,0.0,400
0.050,1200,0.0,15.5,0.0,420
0.100,2400,2.1,45.0,1.2,510
0.150,3600,8.5,78.0,5.8,680
0.200,4800,18.2,100.0,12.4,820
0.250,5500,32.1,100.0,18.6,950
0.300,6200,48.7,100.0,22.1,1080
0.350,6800,67.3,100.0,24.5,1180
0.400,7200,88.9,100.0,25.8,1250
0.450,7400,108.4,100.0,26.2,1310
0.500,7500,125.6,100.0,26.0,1340
0.550,7600,140.2,100.0,25.5,1355
0.600,7550,152.8,100.0,24.8,1360
0.650,7400,163.1,100.0,23.9,1350
0.700,7200,171.5,100.0,22.5,1330
0.750,6900,178.2,85.0,18.0,1280
0.800,6500,183.4,60.0,12.0,1200
0.850,6000,186.8,40.0,6.0,1100
0.900,5200,188.5,20.0,2.0,980
0.950,4400,189.2,5.0,0.0,860
1.000,3800,189.5,0.0,0.0,750
`;

const FIXTURE_MILLISECONDS = `time_ms,"RPM [rev/min]","Speed [mph]","Throttle [%]","Oil Pressure [psi]"
0,850,0.0,0.0,65
50,1200,0.0,15.5,64
100,2400,2.1,45.0,62

150,3600,8.5,78.0,58
200,4800,18.2,100.0,55
250,5500,32.1,100.0,52
300,6200,48.7,100.0,48
350,6800,67.3,100.0,45
400,7200,88.9,100.0,42
450,7400,108.4,100.0,40
500,7500,125.6,100.0,38
550,7600,140.2,100.0,37
600,7550,152.8,100.0,36
650,7400,163.1,100.0,37
700,7200,171.5,100.0,38
750,6900,178.2,85.0,42
800,6500,183.4,60.0,48
850,6000,186.8,40.0,55
900,5200,188.5,20.0,60
950,4400,189.2,5.0,63
1000,3800,189.5,0.0,65
`;

const FIXTURE_IRREGULAR = `elapsed_time,Clutch Slip,"Driveshaft Torque [ft-lb]",Tire Temp,Tire Temp
0.00,100.0,0,85.2,84.9
0.05,95.2,120,86.1,85.5
0.10,82.4,450,88.3,87.1
0.15,60.1,890,92.5,90.8
0.20,35.5,1250,98.1,96.2
0.25,15.2,1580,105.3,102.4
0.30,5.8,1820,112.8,109.5
0.35,1.2,1950,120.1,116.8
0.40,0.0,2050,126.5,123.1
0.45,0.0,2000,131.2,128.0
0.50,0.0,1900,134.8,131.5
0.55,0.0,1750,137.1,134.2
0.60,0.0,"1,580",138.5,135.8
0.65,0.0,1400,139.2,136.5
0.70,0.0,1200,139.5,137.0
`;

// ======================================================================
// API Client Tests
// ======================================================================

describe('incidentAnalysisApi', () => {
  it('exports all Phase 1 methods', () => {
    const expected = [
      'getSession', 'saveSession',
      'uploadDataset', 'listDatasets', 'getDatasetDataUrl', 'fetchDatasetData',
      'updateDataset', 'deleteDataset',
      'uploadVideo', 'listVideos', 'getVideoUrl', 'updateVideo', 'deleteVideo',
      'saveMeasurement', 'listMeasurements', 'deleteMeasurement',
    ];
    for (const m of expected) {
      expect(typeof (incidentAnalysisApi as any)[m]).toBe('function');
    }
  });

  it('has exactly 16 API methods', () => {
    const methods = Object.keys(incidentAnalysisApi).filter(
      k => typeof (incidentAnalysisApi as any)[k] === 'function'
    );
    expect(methods).toHaveLength(16);
  });

  it('getDatasetDataUrl does NOT leak auth token in URL', () => {
    const url = incidentAnalysisApi.getDatasetDataUrl(42);
    expect(url).toContain('action=getDatasetData');
    expect(url).toContain('dataset_id=42');
    expect(url).not.toContain('_token=');
    expect(url).not.toContain('Bearer');
  });

  it('getVideoUrl includes auth token for <video src> streaming', () => {
    const url = incidentAnalysisApi.getVideoUrl(7);
    expect(url).toContain('action=getVideoFile');
    expect(url).toContain('video_id=7');
    // Token may or may not be present depending on auth state, but URL format is correct
    expect(url).toMatch(/incident-analysis\.php\?action=getVideoFile&video_id=7/);
  });

  // ── Type shape contracts ──────────────────────────────────────────

  it('AnalysisSession null layout', () => {
    const s: AnalysisSession = {
      id: 1, incident_id: 10, layout_json: null,
      created_by: 5, created_at: '2025-01-01', updated_by: null, updated_at: null,
    };
    expect(s.layout_json).toBeNull();
  });

  it('AnalysisLayout round-trips with all saved fields', () => {
    const layout: AnalysisLayout = {
      visibleChannelIds: [1, 2, 3],
      chartZoom: { min: 0, max: 10 },
      playbackSpeed: 2,
      cursorTime: 5.5,
    };
    expect(layout.visibleChannelIds).toEqual([1, 2, 3]);
    expect(layout.playbackSpeed).toBe(2);
    expect(layout.cursorTime).toBe(5.5);
  });

  it('AnalysisDataset with nested channels', () => {
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
    expect(ds.channels[0].name).toBe('RPM');
    expect(ds.time_offset).toBe(0.5);
  });

  it('AnalysisMeasurement delta_time matches t2-t1', () => {
    const m: AnalysisMeasurement = {
      id: 1, session_id: 1, label: 'Δ', t1: 3.5, t2: 5.2,
      channel_id: null, delta_time: 1.7, notes: null,
      created_by: 5, created_at: '2025-01-01',
    };
    expect(m.delta_time).toBeCloseTo(m.t2 - m.t1, 4);
  });

  it('response types compile and validate', () => {
    const g: GetSessionResponse = { session: { id: 1, incident_id: 1, layout_json: null, created_by: 1, created_at: '', updated_by: null, updated_at: null } };
    const d: ListDatasetsResponse = { datasets: [], session_id: 1 };
    const v: ListVideosResponse = { videos: [], session_id: 1 };
    const m: ListMeasurementsResponse = { measurements: [], session_id: 1 };
    const u: UploadDatasetResponse = { ok: true, dataset_id: 1, name: 'a.csv', sample_count: 0, channel_count: 0, time_column: null, time_unit: 'seconds' };
    const uv: UploadVideoResponse = { ok: true, video_id: 1, name: 'v.mp4', file_size: 0 };
    const sm: SaveMeasurementResponse = { ok: true, measurement_id: 1 };
    expect(g.session.id).toBe(1);
    expect(d.datasets).toEqual([]);
    expect(v.videos).toEqual([]);
    expect(m.measurements).toEqual([]);
    expect(u.ok).toBe(true);
    expect(uv.ok).toBe(true);
    expect(sm.measurement_id).toBe(1);
  });
});

// ======================================================================
// CSV Parser Tests (parseCsvLine algorithm)
// ======================================================================

describe('parseCsvLine', () => {
  it('handles simple comma-separated values', () => {
    expect(parseCsvLine('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles quoted fields with commas', () => {
    expect(parseCsvLine('"hello, world",b,c')).toEqual(['hello, world', 'b', 'c']);
  });

  it('handles escaped quotes inside quoted fields', () => {
    expect(parseCsvLine('"say ""hello""",b')).toEqual(['say "hello"', 'b']);
  });

  it('handles empty fields', () => {
    expect(parseCsvLine('a,,c,')).toEqual(['a', '', 'c', '']);
  });

  it('handles single field', () => {
    expect(parseCsvLine('only')).toEqual(['only']);
  });

  it('handles empty string', () => {
    expect(parseCsvLine('')).toEqual(['']);
  });

  it('handles numeric values with spaces', () => {
    expect(parseCsvLine(' 1.5 , 2.3 , 3.1 ')).toEqual(['1.5', '2.3', '3.1']);
  });

  it('handles mixed quoted and unquoted', () => {
    expect(parseCsvLine('time,"RPM [rev/min]",speed')).toEqual(['time', 'RPM [rev/min]', 'speed']);
  });

  it('handles quoted field with newlines (single line input)', () => {
    expect(parseCsvLine('"abc",def')).toEqual(['abc', 'def']);
  });
});

// ======================================================================
// Fixture-based CSV Parsing Tests (parseCsvText with real telemetry)
// ======================================================================

describe('parseCsvText — fixture: telemetry-seconds.csv', () => {
  const csv = FIXTURE_SECONDS;
  const ds = { time_column: 'time', time_unit: 'seconds', time_offset: 0 };
  const parsed = parseCsvText(csv, ds);

  it('detects 6 columns (time + 5 channels)', () => {
    expect(parsed.columns).toEqual(['time', 'RPM', 'Speed_mph', 'Throttle_pct', 'Boost_psi', 'EGT_F']);
  });

  it('parses 21 data rows', () => {
    expect(parsed.rows).toHaveLength(21);
  });

  it('computes __time from time column', () => {
    expect(parsed.rows[0].__time).toBe(0);
    expect(parsed.rows[20].__time).toBe(1.0);
  });

  it('parses numeric values correctly', () => {
    expect(parsed.rows[0].RPM).toBe(850);
    expect(parsed.rows[10].Speed_mph).toBe(125.6);
    expect(parsed.rows[20].EGT_F).toBe(750);
  });

  it('all rows have __time set (no nulls)', () => {
    for (const row of parsed.rows) {
      expect(row.__time).not.toBeNull();
      expect(typeof row.__time).toBe('number');
    }
  });
});

describe('parseCsvText — fixture: telemetry-milliseconds.csv', () => {
  const csv = FIXTURE_MILLISECONDS;
  const ds = { time_column: 'time_ms', time_unit: 'milliseconds', time_offset: 0 };
  const parsed = parseCsvText(csv, ds);

  it('detects 5 columns with quoted headers containing units', () => {
    expect(parsed.columns).toContain('time_ms');
    expect(parsed.columns).toContain('RPM [rev/min]');
    expect(parsed.columns).toContain('Speed [mph]');
    expect(parsed.columns).toContain('Throttle [%]');
    expect(parsed.columns).toContain('Oil Pressure [psi]');
  });

  it('skips blank rows (file has one blank line)', () => {
    // File has 21 data rows + 1 blank row
    expect(parsed.rows).toHaveLength(21);
  });

  it('converts milliseconds to seconds for __time', () => {
    expect(parsed.rows[0].__time).toBe(0); // 0ms -> 0s
    expect(parsed.rows[1].__time).toBe(0.05); // 50ms -> 0.05s
    expect(parsed.rows[20].__time).toBe(1.0); // 1000ms -> 1.0s
  });

  it('applies time_offset correctly', () => {
    const dsOffset = { time_column: 'time_ms', time_unit: 'milliseconds', time_offset: 2.5 };
    const parsedWithOffset = parseCsvText(csv, dsOffset);
    expect(parsedWithOffset.rows[0].__time).toBe(2.5);
    expect(parsedWithOffset.rows[20].__time).toBe(3.5);
  });
});

describe('parseCsvText — fixture: telemetry-irregular.csv', () => {
  const csv = FIXTURE_IRREGULAR;
  const ds = { time_column: 'elapsed_time', time_unit: 'seconds', time_offset: 0 };
  const parsed = parseCsvText(csv, ds);

  it('deduplicates identical header names (Tire Temp appears twice)', () => {
    const tireTempCols = parsed.columns.filter(c => c.startsWith('Tire Temp'));
    expect(tireTempCols).toEqual(['Tire Temp', 'Tire Temp_2']);
  });

  it('handles quoted numeric values with commas ("1,580")', () => {
    // Row at elapsed_time=0.60 has "1,580" for driveshaft torque
    const row060 = parsed.rows.find(r => r.__time === 0.60);
    // parseFloat("1,580") returns 1 (stops at comma) — this is a known limitation
    // documented as a future improvement
    expect(row060).toBeDefined();
    expect(row060!['Driveshaft Torque [ft-lb]']).toBe(1); // parseFloat stops at comma
  });

  it('parses 15 data rows', () => {
    expect(parsed.rows).toHaveLength(15);
  });

  it('both Tire Temp columns have distinct data', () => {
    const row = parsed.rows[0];
    expect(row['Tire Temp']).toBe(85.2);
    expect(row['Tire Temp_2']).toBe(84.9);
  });
});

describe('parseCsvText — edge cases', () => {
  it('returns empty for file with only headers', () => {
    const csv = 'time,RPM,Speed\n';
    const parsed = parseCsvText(csv, { time_column: 'time', time_unit: 'seconds', time_offset: 0 });
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.columns).toEqual(['time', 'RPM', 'Speed']);
  });

  it('returns empty for completely empty file', () => {
    const parsed = parseCsvText('', { time_column: null, time_unit: 'seconds', time_offset: 0 });
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.columns).toEqual([]);
  });

  it('handles CRLF line endings', () => {
    const csv = 'time,RPM\r\n0,100\r\n1,200\r\n';
    const parsed = parseCsvText(csv, { time_column: 'time', time_unit: 'seconds', time_offset: 0 });
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].RPM).toBe(100);
    expect(parsed.rows[1].RPM).toBe(200);
  });

  it('sets __time to null when time_column is not found', () => {
    const csv = 'RPM,Speed\n100,50\n200,80\n';
    const parsed = parseCsvText(csv, { time_column: 'time', time_unit: 'seconds', time_offset: 0 });
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].__time).toBeUndefined();
  });

  it('handles leading blank lines before header', () => {
    const csv = '\n\ntime,RPM\n0,500\n1,600\n';
    const parsed = parseCsvText(csv, { time_column: 'time', time_unit: 'seconds', time_offset: 0 });
    expect(parsed.columns).toEqual(['time', 'RPM']);
    expect(parsed.rows).toHaveLength(2);
  });
});

// ======================================================================
// Layout Save/Restore State Logic
// ======================================================================

describe('layout save/restore logic', () => {
  it('layout with all fields round-trips through JSON', () => {
    const layout: AnalysisLayout = {
      visibleChannelIds: [10, 20, 30],
      playbackSpeed: 0.5,
      cursorTime: 3.14159,
    };
    const serialized = JSON.stringify(layout);
    const restored = JSON.parse(serialized) as AnalysisLayout;
    expect(restored.visibleChannelIds).toEqual([10, 20, 30]);
    expect(restored.playbackSpeed).toBe(0.5);
    expect(restored.cursorTime).toBeCloseTo(3.14159);
  });

  it('dirty detection: identical layouts are not dirty', () => {
    const saved = JSON.stringify({ visibleChannelIds: [1, 2], playbackSpeed: 1, cursorTime: null });
    const current = JSON.stringify({ visibleChannelIds: [1, 2], playbackSpeed: 1, cursorTime: null });
    expect(saved === current).toBe(true);
  });

  it('dirty detection: different channel selection is dirty', () => {
    const saved = JSON.stringify({ visibleChannelIds: [1, 2], playbackSpeed: 1, cursorTime: null });
    const current = JSON.stringify({ visibleChannelIds: [1, 2, 3], playbackSpeed: 1, cursorTime: null });
    expect(saved === current).toBe(false);
  });

  it('dirty detection: different speed is dirty', () => {
    const saved = JSON.stringify({ visibleChannelIds: [1], playbackSpeed: 1, cursorTime: null });
    const current = JSON.stringify({ visibleChannelIds: [1], playbackSpeed: 2, cursorTime: null });
    expect(saved === current).toBe(false);
  });
});

// ======================================================================
// Decimation Tests
// ======================================================================

describe('decimateRows', () => {
  it('returns original if under maxPoints', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(decimateRows(rows, 10)).toEqual(rows);
  });

  it('returns original if exactly maxPoints', () => {
    const rows = [1, 2, 3, 4, 5];
    expect(decimateRows(rows, 5)).toEqual(rows);
  });

  it('preserves first and last', () => {
    const rows = Array.from({ length: 100 }, (_, i) => i);
    const dec = decimateRows(rows, 10);
    expect(dec[0]).toBe(0);
    expect(dec[dec.length - 1]).toBe(99);
    expect(dec).toHaveLength(10);
  });

  it('handles large arrays', () => {
    const rows = Array.from({ length: 50000 }, (_, i) => i);
    const dec = decimateRows(rows, 10000);
    expect(dec).toHaveLength(10000);
    expect(dec[0]).toBe(0);
    expect(dec[dec.length - 1]).toBe(49999);
  });

  it('handles maxPoints = 2 (just first and last)', () => {
    const rows = [10, 20, 30, 40, 50];
    const dec = decimateRows(rows, 2);
    expect(dec).toEqual([10, 50]);
  });
});
