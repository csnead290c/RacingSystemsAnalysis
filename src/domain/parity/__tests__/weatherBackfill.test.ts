/**
 * Tests for weather backfill CSV parser
 */

import { describe, it, expect } from 'vitest';
import { parseCsvWeatherData } from '../weatherBackfill';

describe('parseCsvWeatherData', () => {
  it('parses valid CSV with header row', () => {
    const csv = `timestampUtc,tempF,humidityPct,baroInHg
2023-10-30T18:00:00Z,76.28,66,29.323
2023-10-30T19:00:00Z,74.5,68,29.310`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0].tempF).toBe(76.28);
    expect(rows[0].humidityPct).toBe(66);
    expect(rows[0].baroInHg).toBe(29.323);
    expect(rows[0].source).toBe('csv_backfill');
    expect(rows[1].tempF).toBe(74.5);
  });

  it('parses valid CSV without header row', () => {
    const csv = `2023-10-30T18:00:00Z,76.28,66,29.323`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].tempF).toBe(76.28);
  });

  it('returns error for empty CSV', () => {
    const { rows, errors } = parseCsvWeatherData('');
    expect(rows).toHaveLength(0);
    expect(errors).toContain('Empty CSV');
  });

  it('returns error for row with too few columns', () => {
    const csv = `2023-10-30T18:00:00Z,76.28,66`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/expected 4 columns/);
  });

  it('returns error for invalid timestamp', () => {
    const csv = `not-a-date,76.28,66,29.323`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/invalid timestamp/);
  });

  it('returns error for non-finite tempF', () => {
    const csv = `2023-10-30T18:00:00Z,NaN,66,29.323`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/invalid tempF/);
  });

  it('returns error for humidity out of range', () => {
    const csv = `2023-10-30T18:00:00Z,76.28,110,29.323`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/invalid humidityPct/);
  });

  it('returns error for barometric pressure out of range', () => {
    const csv = `2023-10-30T18:00:00Z,76.28,66,15.0`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/invalid baroInHg/);
  });

  it('skips blank lines', () => {
    const csv = `timestampUtc,tempF,humidityPct,baroInHg

2023-10-30T18:00:00Z,76.28,66,29.323

2023-10-30T19:00:00Z,74.5,68,29.310
`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  it('collects multiple errors across rows', () => {
    const csv = `bad-ts,76.28,66,29.323
2023-10-30T18:00:00Z,NaN,66,29.323
2023-10-30T19:00:00Z,74.5,200,29.310`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(rows).toHaveLength(0);
    expect(errors).toHaveLength(3);
  });

  it('normalizes timestamps to ISO 8601', () => {
    const csv = `Oct 30 2023 18:00:00 UTC,76.28,66,29.323`;
    const { rows, errors } = parseCsvWeatherData(csv);
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].timestampUtc).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
