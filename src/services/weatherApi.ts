/**
 * RSA Weather API — frontend client for selectable weather sources.
 *
 * Supported sources:
 *   'apple_weather' — calls the PHP proxy at /api/weather/apple.php which signs
 *                      an ES256 JWT and fetches from Apple WeatherKit REST API.
 *                      Returns sea-level pressure already in hPa (convert to inHg).
 *   'manual'        — no fetch; caller provides weather directly from form inputs.
 *   'timeslip'      — no fetch; weather is extracted from OCR'd timeslip data.
 *
 * Pressure note:
 *   Apple WeatherKit provides sea-level barometric pressure in hPa.
 *   The proxy converts it to inHg before returning.  The `pressureHPa` field
 *   is also returned for transparency / debugging.
 */

import { hPaToInHg } from '../domain/physics/calculations/weatherImpact';

export type WeatherSourceType = 'manual' | 'timeslip' | 'apple_weather';

/** Normalized current-conditions payload returned by any weather source. */
export interface AppleWeatherResponse {
  source: 'apple_weather';
  provider: 'Apple WeatherKit';
  timestamp: string | null;
  temperatureF: number | null;
  humidityPct: number | null;
  barometerInHg: number | null;
  pressureHPa: number | null;
  windMph: number | null;
  windAngleDeg: number | null;
  conditionCode: string | null;
}

export interface WeatherFetchError {
  error: string;
  code: string;
}

export type WeatherFetchResult =
  | { ok: true; data: AppleWeatherResponse }
  | { ok: false; error: string; code: string };

/**
 * Fetch current conditions from Apple WeatherKit via the PHP proxy.
 *
 * @param lat  Latitude of the location (e.g. track lat from dragTracks.ts).
 * @param lon  Longitude of the location.
 * @param tz   IANA timezone string (e.g. 'America/Chicago').  Used by WeatherKit
 *             for local time metadata.  Does not affect temperature/pressure values.
 */
export async function fetchAppleWeather(
  lat: number,
  lon: number,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): Promise<WeatherFetchResult> {
  const url = `/api/weather/apple.php?lat=${lat}&lon=${lon}&tz=${encodeURIComponent(tz)}`;

  let resp: Response;
  try {
    resp = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch (e) {
    return { ok: false, error: 'Network error reaching weather proxy', code: 'NETWORK_ERROR' };
  }

  let body: unknown;
  try {
    body = await resp.json();
  } catch {
    return { ok: false, error: 'Invalid JSON from weather proxy', code: 'PARSE_ERROR' };
  }

  if (!resp.ok || (body as WeatherFetchError).error) {
    const err = body as WeatherFetchError;
    return { ok: false, error: err.error ?? `HTTP ${resp.status}`, code: err.code ?? 'HTTP_ERROR' };
  }

  return { ok: true, data: body as AppleWeatherResponse };
}

/**
 * Re-export hPaToInHg for convenience so callers don't need to import from
 * the physics domain to handle WeatherKit pressure values.
 */
export { hPaToInHg };
