/**
 * Tests for Open-Meteo weather provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchFromOpenMeteo } from '../weatherBackfill';

describe('Open-Meteo Weather Provider', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch and parse valid weather data', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00', '2023-10-30T02:00'],
        temperature_2m: [75.2, 74.8, 74.1],
        relative_humidity_2m: [65, 66, 68],
        surface_pressure: [1013.25, 1013.5, 1013.8],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.provider).toBe('OPEN_METEO');
    expect(result.samples).toHaveLength(3);
    expect(result.warnings).toHaveLength(0);

    const sample = result.samples[0];
    expect(sample.timestampUtc).toBe('2023-10-30T00:00:00Z');
    expect(sample.tempF).toBe(75.2);
    expect(sample.humidityPct).toBe(65);
    expect(sample.source).toBe('open_meteo_backfill');
  });

  it('should convert pressure from hPa to inHg correctly', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00'],
        temperature_2m: [75.0],
        relative_humidity_2m: [50],
        surface_pressure: [1013.25], // Standard pressure in hPa
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    const sample = result.samples[0];
    // 1013.25 hPa * 0.02953 = 29.92 inHg (standard pressure)
    expect(sample.baroInHg).toBeCloseTo(29.92, 2);
  });

  it('should skip samples with missing temperature', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00'],
        temperature_2m: [null, 74.8],
        relative_humidity_2m: [65, 66],
        surface_pressure: [1013.25, 1013.5],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(1);
    expect(result.warnings).toContain('2023-10-30T00:00: missing temperature');
    expect(result.samples[0].timestampUtc).toBe('2023-10-30T01:00:00Z');
  });

  it('should skip samples with missing humidity', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00'],
        temperature_2m: [75.2, 74.8],
        relative_humidity_2m: [null, 66],
        surface_pressure: [1013.25, 1013.5],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(1);
    expect(result.warnings).toContain('2023-10-30T00:00: missing humidity');
  });

  it('should skip samples with missing pressure', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00'],
        temperature_2m: [75.2, 74.8],
        relative_humidity_2m: [65, 66],
        surface_pressure: [null, 1013.5],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(1);
    expect(result.warnings).toContain('2023-10-30T00:00: missing pressure');
  });

  it('should skip samples with invalid humidity range', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00', '2023-10-30T02:00'],
        temperature_2m: [75.2, 74.8, 74.1],
        relative_humidity_2m: [-5, 150, 66],
        surface_pressure: [1013.25, 1013.5, 1013.8],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(1);
    expect(result.warnings).toContain('2023-10-30T00:00: invalid humidity -5 (must be 0-100)');
    expect(result.warnings).toContain('2023-10-30T01:00: invalid humidity 150 (must be 0-100)');
    expect(result.samples[0].timestampUtc).toBe('2023-10-30T02:00:00Z');
  });

  it('should skip samples with invalid pressure range', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00'],
        temperature_2m: [75.2, 74.8],
        relative_humidity_2m: [65, 66],
        surface_pressure: [500, 1013.5], // 500 hPa is too low
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(1);
    expect(result.warnings).toContain('2023-10-30T00:00: invalid pressure 500 hPa (expected 800-1100)');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(
      fetchFromOpenMeteo({
        lat: 33.95,
        lon: -117.39,
        startUtc: '2023-10-30T00:00:00Z',
        endUtc: '2023-10-30T23:59:59Z',
      })
    ).rejects.toThrow('Open-Meteo API error: 500 Internal Server Error');
  });

  it('should handle empty response', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: [],
        temperature_2m: [],
        relative_humidity_2m: [],
        surface_pressure: [],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(0);
    expect(result.warnings).toContain('No hourly data returned from Open-Meteo API');
  });

  it('should format timestamps correctly', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: ['2023-10-30T00:00', '2023-10-30T01:00Z'],
        temperature_2m: [75.2, 74.8],
        relative_humidity_2m: [65, 66],
        surface_pressure: [1013.25, 1013.5],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-30T23:59:59Z',
    });

    expect(result.samples).toHaveLength(2);
    // First timestamp should have :00Z appended
    expect(result.samples[0].timestampUtc).toBe('2023-10-30T00:00:00Z');
    // Second timestamp already has Z, should be preserved
    expect(result.samples[1].timestampUtc).toBe('2023-10-30T01:00Z');
  });

  it('should build correct API URL', async () => {
    const mockResponse = {
      latitude: 33.95,
      longitude: -117.39,
      hourly: {
        time: [],
        temperature_2m: [],
        relative_humidity_2m: [],
        surface_pressure: [],
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    await fetchFromOpenMeteo({
      lat: 33.95,
      lon: -117.39,
      startUtc: '2023-10-30T00:00:00Z',
      endUtc: '2023-10-31T23:59:59Z',
    });

    const fetchCall = (global.fetch as any).mock.calls[0][0];
    expect(fetchCall).toContain('https://archive-api.open-meteo.com/v1/archive');
    expect(fetchCall).toContain('latitude=33.95');
    expect(fetchCall).toContain('longitude=-117.39');
    expect(fetchCall).toContain('start_date=2023-10-30');
    expect(fetchCall).toContain('end_date=2023-10-31');
    expect(fetchCall).toContain('hourly=temperature_2m%2Crelative_humidity_2m%2Csurface_pressure');
    expect(fetchCall).toContain('temperature_unit=fahrenheit');
    expect(fetchCall).toContain('timezone=UTC');
  });
});
