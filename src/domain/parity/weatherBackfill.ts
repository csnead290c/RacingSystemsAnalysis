/**
 * Weather Backfill — Provider Interface + Implementations
 *
 * Defines a common interface for fetching historical weather data from
 * multiple providers. Currently only CUSTOM_CSV is implemented; NOAA_CDO
 * and OPEN_METEO are stubbed with clear TODOs.
 *
 * All providers return WeatherSampleRow[], which maps directly to the
 * parity_weather_samples table schema.
 */

// ── Provider Enum ────────────────────────────────────────────────────────

export type WeatherProvider = 'CUSTOM_CSV' | 'NOAA_CDO' | 'OPEN_METEO';

export const WEATHER_PROVIDERS: { key: WeatherProvider; label: string; ready: boolean }[] = [
  { key: 'CUSTOM_CSV', label: 'Custom CSV Upload', ready: true },
  { key: 'NOAA_CDO', label: 'NOAA Climate Data Online (CDO)', ready: false },
  { key: 'OPEN_METEO', label: 'Open-Meteo Historical API', ready: true },
];

// ── Common Types ─────────────────────────────────────────────────────────

export interface WeatherSampleRow {
  timestampUtc: string;  // ISO 8601 e.g. "2023-10-30T18:00:00Z"
  tempF: number;
  humidityPct: number;   // 0–100
  baroInHg: number;
  source: string;        // e.g. "csv_backfill", "noaa_cdo", "open_meteo"
}

export interface FetchHistoricalWeatherParams {
  lat: number;
  lon: number;
  startUtc: string;      // ISO 8601
  endUtc: string;        // ISO 8601
}

export interface FetchHistoricalWeatherResult {
  samples: WeatherSampleRow[];
  provider: WeatherProvider;
  warnings: string[];
}

// ── Provider Interface ───────────────────────────────────────────────────

export type FetchHistoricalWeatherFn = (
  params: FetchHistoricalWeatherParams,
) => Promise<FetchHistoricalWeatherResult>;

// ── CUSTOM_CSV Provider ──────────────────────────────────────────────────

/**
 * Parse a CSV string with columns: timestampUtc, tempF, humidityPct, baroInHg
 * Returns validated WeatherSampleRow[].
 *
 * Accepts optional header row (auto-detected by checking if first row contains
 * non-numeric values in the tempF column).
 */
export function parseCsvWeatherData(csvText: string): {
  rows: WeatherSampleRow[];
  errors: string[];
} {
  const trimmed = csvText.trim();
  if (!trimmed) return { rows: [], errors: ['Empty CSV'] };
  const lines = trimmed.split(/\r?\n/);

  // Check if first line is a header (both first AND second columns must be non-numeric)
  let startIdx = 0;
  const firstFields = lines[0].split(',');
  if (
    firstFields.length >= 4 &&
    isNaN(parseFloat(firstFields[0]?.trim())) &&
    isNaN(parseFloat(firstFields[1]?.trim()))
  ) {
    startIdx = 1; // skip header
  }

  const rows: WeatherSampleRow[] = [];
  const errors: string[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = line.split(',').map(f => f.trim());
    if (fields.length < 4) {
      errors.push(`Row ${i + 1}: expected 4 columns, got ${fields.length}`);
      continue;
    }

    const [tsRaw, tempFRaw, humRaw, baroRaw] = fields;
    const tempF = parseFloat(tempFRaw);
    const humPct = parseFloat(humRaw);
    const baroInHg = parseFloat(baroRaw);

    if (!tsRaw || isNaN(Date.parse(tsRaw))) {
      errors.push(`Row ${i + 1}: invalid timestamp "${tsRaw}"`);
      continue;
    }
    if (isNaN(tempF) || !isFinite(tempF)) {
      errors.push(`Row ${i + 1}: invalid tempF "${tempFRaw}"`);
      continue;
    }
    if (isNaN(humPct) || !isFinite(humPct) || humPct < 0 || humPct > 100) {
      errors.push(`Row ${i + 1}: invalid humidityPct "${humRaw}" (must be 0–100)`);
      continue;
    }
    if (isNaN(baroInHg) || !isFinite(baroInHg) || baroInHg < 20 || baroInHg > 35) {
      errors.push(`Row ${i + 1}: invalid baroInHg "${baroRaw}" (expected 20–35 range)`);
      continue;
    }

    rows.push({
      timestampUtc: new Date(tsRaw).toISOString(),
      tempF,
      humidityPct: humPct,
      baroInHg,
      source: 'csv_backfill',
    });
  }

  return { rows, errors };
}

// ── NOAA_CDO Provider (TODO) ─────────────────────────────────────────────

/**
 * TODO: Implement NOAA Climate Data Online (CDO) historical weather fetch.
 *
 * Expected flow:
 * 1. Requires NOAA CDO API token (free, rate-limited: 5 req/s, 1000/day).
 * 2. Find nearest station: GET /stations?extent={lat-0.5},{lon-0.5},{lat+0.5},{lon+0.5}
 * 3. Fetch hourly data: GET /data?datasetid=LCD&stationid={id}&startdate=...&enddate=...
 *    - datatypeid: HourlyDryBulbTemperature, HourlyRelativeHumidity, HourlyStationPressure
 * 4. Map response to WeatherSampleRow[]:
 *    - Convert temperature to °F if not already
 *    - Convert station pressure from inHg (LCD dataset already in inHg)
 *    - Use humidityPct as-is
 *
 * API docs: https://www.ncdc.noaa.gov/cdo-web/webservices/v2
 *
 * @param _params - lat, lon, startUtc, endUtc
 * @returns Promise<FetchHistoricalWeatherResult>
 */
export async function fetchFromNoaaCdo(
  _params: FetchHistoricalWeatherParams,
): Promise<FetchHistoricalWeatherResult> {
  throw new Error('NOAA CDO provider not yet implemented. See TODO in weatherBackfill.ts.');
}

// ── OPEN_METEO Provider ─────────────────────────────────────────────────

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    relative_humidity_2m: (number | null)[];
    surface_pressure: (number | null)[];
  };
  hourly_units?: {
    temperature_2m?: string;
    relative_humidity_2m?: string;
    surface_pressure?: string;
  };
}

/**
 * Fetch historical weather from Open-Meteo Archive API.
 *
 * Flow:
 * 1. No API key required (free, generous rate limits).
 * 2. Fetch hourly archive data from https://archive-api.open-meteo.com/v1/archive
 * 3. Convert units: temperature to °F, pressure from hPa to inHg
 * 4. Map to WeatherSampleRow[] with source='open_meteo_backfill'
 *
 * API docs: https://open-meteo.com/en/docs/historical-weather-api
 *
 * @param params - lat, lon, startUtc, endUtc
 * @returns Promise<FetchHistoricalWeatherResult>
 */
export async function fetchFromOpenMeteo(
  params: FetchHistoricalWeatherParams,
): Promise<FetchHistoricalWeatherResult> {
  const { lat, lon, startUtc, endUtc } = params;
  const warnings: string[] = [];

  // Convert ISO timestamps to YYYY-MM-DD format
  const startDate = startUtc.split('T')[0];
  const endDate = endUtc.split('T')[0];

  // Build API URL
  const url = new URL('https://archive-api.open-meteo.com/v1/archive');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('hourly', 'temperature_2m,relative_humidity_2m,surface_pressure');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('timezone', 'UTC');

  // Fetch data
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data: OpenMeteoResponse = await response.json();

  if (!data.hourly || !data.hourly.time || data.hourly.time.length === 0) {
    return {
      samples: [],
      provider: 'OPEN_METEO',
      warnings: ['No hourly data returned from Open-Meteo API'],
    };
  }

  const samples: WeatherSampleRow[] = [];
  const { time, temperature_2m, relative_humidity_2m, surface_pressure } = data.hourly;

  for (let i = 0; i < time.length; i++) {
    const timestamp = time[i];
    const tempF = temperature_2m[i];
    const humidityPct = relative_humidity_2m[i];
    const pressureHPa = surface_pressure[i];

    // Skip if any critical value is missing
    if (tempF === null || tempF === undefined) {
      warnings.push(`${timestamp}: missing temperature`);
      continue;
    }
    if (humidityPct === null || humidityPct === undefined) {
      warnings.push(`${timestamp}: missing humidity`);
      continue;
    }
    if (pressureHPa === null || pressureHPa === undefined) {
      warnings.push(`${timestamp}: missing pressure`);
      continue;
    }

    // Validate ranges
    if (!isFinite(tempF)) {
      warnings.push(`${timestamp}: invalid temperature ${tempF}`);
      continue;
    }
    if (humidityPct < 0 || humidityPct > 100 || !isFinite(humidityPct)) {
      warnings.push(`${timestamp}: invalid humidity ${humidityPct} (must be 0-100)`);
      continue;
    }
    if (!isFinite(pressureHPa) || pressureHPa < 800 || pressureHPa > 1100) {
      warnings.push(`${timestamp}: invalid pressure ${pressureHPa} hPa (expected 800-1100)`);
      continue;
    }

    // Convert pressure from hPa to inHg (1 hPa = 0.02953 inHg)
    const baroInHg = pressureHPa * 0.02953;

    // Ensure timestamp is ISO UTC format
    const timestampUtc = timestamp.endsWith('Z') ? timestamp : `${timestamp}:00Z`;

    samples.push({
      timestampUtc,
      tempF,
      humidityPct,
      baroInHg,
      source: 'open_meteo_backfill',
    });
  }

  return {
    samples,
    provider: 'OPEN_METEO',
    warnings,
  };
}
