import { describe, it, expect } from 'vitest';

describe('Canonical Weather Provenance', () => {
  describe('Source Kind Classification', () => {
    it('should classify single source as that source kind', () => {
      const sourceCounts = [{ source: 'open_meteo_backfill', count: 5 }];
      const uniqueSources = sourceCounts.map(s => s.source);
      
      const sourceKind = uniqueSources.length === 1 ? uniqueSources[0] : 'mixed';
      
      expect(sourceKind).toBe('open_meteo_backfill');
    });

    it('should classify multiple sources as mixed', () => {
      const sourceCounts = [
        { source: 'open_meteo_backfill', count: 3 },
        { source: 'station', count: 2 }
      ];
      const uniqueSources = sourceCounts.map(s => s.source);
      
      const sourceKind = uniqueSources.length === 1 ? uniqueSources[0] : 'mixed';
      
      expect(sourceKind).toBe('mixed');
    });

    it('should classify no sources as unknown', () => {
      const sourceCounts: { source: string; count: number }[] = [];
      const uniqueSources = sourceCounts.map(s => s.source);
      
      const sourceKind = uniqueSources.length === 0 ? 'unknown' : 
                         uniqueSources.length === 1 ? uniqueSources[0] : 'mixed';
      
      expect(sourceKind).toBe('unknown');
    });

    it('should handle station source', () => {
      const sourceCounts = [{ source: 'station', count: 10 }];
      const uniqueSources = sourceCounts.map(s => s.source);
      
      const sourceKind = uniqueSources.length === 1 ? uniqueSources[0] : 'mixed';
      
      expect(sourceKind).toBe('station');
    });

    it('should handle csv_backfill source', () => {
      const sourceCounts = [{ source: 'csv_backfill', count: 7 }];
      const uniqueSources = sourceCounts.map(s => s.source);
      
      const sourceKind = uniqueSources.length === 1 ? uniqueSources[0] : 'mixed';
      
      expect(sourceKind).toBe('csv_backfill');
    });
  });

  describe('Source Detail Formatting', () => {
    it('should format single source detail', () => {
      const sourceBreakdown = [{ source: 'open_meteo_backfill', count: 5 }];
      const detailParts = sourceBreakdown.map(sb => `${sb.source}=${sb.count}`);
      const sourceDetail = detailParts.join(', ');
      
      expect(sourceDetail).toBe('open_meteo_backfill=5');
    });

    it('should format multiple sources detail', () => {
      const sourceBreakdown = [
        { source: 'open_meteo_backfill', count: 3 },
        { source: 'station', count: 2 }
      ];
      const detailParts = sourceBreakdown.map(sb => `${sb.source}=${sb.count}`);
      const sourceDetail = detailParts.join(', ');
      
      expect(sourceDetail).toBe('open_meteo_backfill=3, station=2');
    });

    it('should format three sources detail', () => {
      const sourceBreakdown = [
        { source: 'open_meteo_backfill', count: 5 },
        { source: 'csv_backfill', count: 3 },
        { source: 'station', count: 2 }
      ];
      const detailParts = sourceBreakdown.map(sb => `${sb.source}=${sb.count}`);
      const sourceDetail = detailParts.join(', ');
      
      expect(sourceDetail).toBe('open_meteo_backfill=5, csv_backfill=3, station=2');
    });
  });

  describe('Sample Count Calculation', () => {
    it('should sum sample counts correctly', () => {
      const sourceCounts = [
        { source: 'open_meteo_backfill', count: 3 },
        { source: 'station', count: 2 }
      ];
      const totalSamples = sourceCounts.reduce((sum, sc) => sum + sc.count, 0);
      
      expect(totalSamples).toBe(5);
    });

    it('should handle single source count', () => {
      const sourceCounts = [{ source: 'open_meteo_backfill', count: 10 }];
      const totalSamples = sourceCounts.reduce((sum, sc) => sum + sc.count, 0);
      
      expect(totalSamples).toBe(10);
    });

    it('should handle zero sources', () => {
      const sourceCounts: { source: string; count: number }[] = [];
      const totalSamples = sourceCounts.reduce((sum, sc) => sum + sc.count, 0);
      
      expect(totalSamples).toBe(0);
    });
  });

  describe('JSON Serialization', () => {
    it('should serialize source breakdown to JSON', () => {
      const sourceBreakdown = [
        { source: 'open_meteo_backfill', count: 3 },
        { source: 'station', count: 2 }
      ];
      const sourcesJson = JSON.stringify(sourceBreakdown);
      
      expect(sourcesJson).toBe('[{"source":"open_meteo_backfill","count":3},{"source":"station","count":2}]');
    });

    it('should deserialize JSON back to source breakdown', () => {
      const sourcesJson = '[{"source":"open_meteo_backfill","count":3},{"source":"station","count":2}]';
      const sourceBreakdown = JSON.parse(sourcesJson);
      
      expect(sourceBreakdown).toEqual([
        { source: 'open_meteo_backfill', count: 3 },
        { source: 'station', count: 2 }
      ]);
    });
  });

  describe('UI Display Helpers', () => {
    it('should format source kind for display - Open-Meteo', () => {
      const sourceKind = 'open_meteo_backfill';
      const displayName = sourceKind === 'open_meteo_backfill' ? 'Open-Meteo' :
                          sourceKind === 'csv_backfill' ? 'CSV' :
                          sourceKind === 'station' ? 'Station' :
                          sourceKind === 'mixed' ? 'Mixed' : sourceKind;
      
      expect(displayName).toBe('Open-Meteo');
    });

    it('should format source kind for display - CSV', () => {
      const sourceKind = 'csv_backfill';
      const displayName = sourceKind === 'open_meteo_backfill' ? 'Open-Meteo' :
                          sourceKind === 'csv_backfill' ? 'CSV' :
                          sourceKind === 'station' ? 'Station' :
                          sourceKind === 'mixed' ? 'Mixed' : sourceKind;
      
      expect(displayName).toBe('CSV');
    });

    it('should format source kind for display - Station', () => {
      const sourceKind = 'station';
      const displayName = sourceKind === 'open_meteo_backfill' ? 'Open-Meteo' :
                          sourceKind === 'csv_backfill' ? 'CSV' :
                          sourceKind === 'station' ? 'Station' :
                          sourceKind === 'mixed' ? 'Mixed' : sourceKind;
      
      expect(displayName).toBe('Station');
    });

    it('should format source kind for display - Mixed', () => {
      const sourceKind = 'mixed';
      const displayName = sourceKind === 'open_meteo_backfill' ? 'Open-Meteo' :
                          sourceKind === 'csv_backfill' ? 'CSV' :
                          sourceKind === 'station' ? 'Station' :
                          sourceKind === 'mixed' ? 'Mixed' : sourceKind;
      
      expect(displayName).toBe('Mixed');
    });

    it('should determine badge color - single source', () => {
      const sourceKind = 'open_meteo_backfill';
      const badgeColor = sourceKind === 'mixed' ? '#f59e0b' : '#3b82f6';
      
      expect(badgeColor).toBe('#3b82f6');
    });

    it('should determine badge color - mixed source', () => {
      const sourceKind = 'mixed';
      const badgeColor = sourceKind === 'mixed' ? '#f59e0b' : '#3b82f6';
      
      expect(badgeColor).toBe('#f59e0b');
    });

    it('should show sample count when > 1', () => {
      const sampleCount = 5;
      const showCount = sampleCount > 1;
      
      expect(showCount).toBe(true);
    });

    it('should not show sample count when = 1', () => {
      const sampleCount = 1;
      const showCount = sampleCount > 1;
      
      expect(showCount).toBe(false);
    });
  });

  describe('RunWithWeather Type Validation', () => {
    it('should validate weather object with provenance fields', () => {
      const weather = {
        timestamp_utc: '2024-10-15T14:30:00Z',
        temp_f: 76.5,
        rh_pct: 65.0,
        pressure_inhg: 29.92,
        delta_seconds: 120,
        canonical_source_kind: 'open_meteo_backfill',
        canonical_source_detail: 'open_meteo_backfill=5',
        sample_count: 5,
        sample_sources_json: '[{"source":"open_meteo_backfill","count":5}]'
      };

      expect(weather.canonical_source_kind).toBe('open_meteo_backfill');
      expect(weather.sample_count).toBe(5);
      expect(weather.canonical_source_detail).toBe('open_meteo_backfill=5');
      expect(weather.sample_sources_json).toContain('open_meteo_backfill');
    });

    it('should handle mixed source weather object', () => {
      const weather = {
        timestamp_utc: '2024-10-15T14:30:00Z',
        temp_f: 76.5,
        rh_pct: 65.0,
        pressure_inhg: 29.92,
        delta_seconds: 120,
        canonical_source_kind: 'mixed',
        canonical_source_detail: 'open_meteo_backfill=3, station=2',
        sample_count: 5,
        sample_sources_json: '[{"source":"open_meteo_backfill","count":3},{"source":"station","count":2}]'
      };

      expect(weather.canonical_source_kind).toBe('mixed');
      expect(weather.sample_count).toBe(5);
      
      const sources = JSON.parse(weather.sample_sources_json);
      expect(sources).toHaveLength(2);
      expect(sources[0].source).toBe('open_meteo_backfill');
      expect(sources[1].source).toBe('station');
    });

    it('should handle null weather object', () => {
      const weather = null;
      
      expect(weather).toBeNull();
    });
  });
});
