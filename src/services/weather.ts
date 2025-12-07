/**
 * Weather Service using Open-Meteo API
 * Free, no API key required
 * https://open-meteo.com/
 */

import type { Env } from '../domain/schemas/env.schema';
import type { Track } from '../domain/config/tracks';

export interface WeatherData {
  temperature_F: number;
  humidity_pct: number;
  pressure_inHg: number;
  wind_mph: number;
  wind_direction_deg: number;
  elevation_ft: number;
  timestamp: Date;
  location: string;
}

/**
 * Fetch current weather from Open-Meteo API
 * @param lat Latitude
 * @param lon Longitude
 * @returns Weather data
 */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  // Open-Meteo API - free, no key required
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', lat.toString());
  url.searchParams.set('longitude', lon.toString());
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_direction_10m');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());
  
  if (!response.ok) {
    throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.current) {
    throw new Error('No current weather data available');
  }

  const current = data.current;
  
  // Convert surface pressure from hPa to inHg
  // 1 hPa = 0.02953 inHg
  const pressure_inHg = current.surface_pressure * 0.02953;

  return {
    temperature_F: current.temperature_2m,
    humidity_pct: current.relative_humidity_2m,
    pressure_inHg: Math.round(pressure_inHg * 100) / 100,
    wind_mph: current.wind_speed_10m,
    wind_direction_deg: current.wind_direction_10m,
    elevation_ft: data.elevation ? Math.round(data.elevation * 3.28084) : 0, // meters to feet
    timestamp: new Date(),
    location: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
  };
}

/**
 * Fetch weather for a specific track
 */
export async function fetchTrackWeather(track: Track): Promise<WeatherData> {
  const weather = await fetchWeather(track.lat, track.lon);
  weather.location = `${track.name}, ${track.city}, ${track.state}`;
  // Use track's known elevation instead of API elevation (more accurate)
  weather.elevation_ft = track.elevation_ft;
  return weather;
}

/**
 * Convert weather data to Env format for simulation
 */
export function weatherToEnv(weather: WeatherData): Partial<Env> {
  return {
    elevation: weather.elevation_ft,
    temperatureF: Math.round(weather.temperature_F),
    barometerInHg: weather.pressure_inHg,
    humidityPct: Math.round(weather.humidity_pct),
    windMph: Math.round(weather.wind_mph),
    windAngleDeg: Math.round(weather.wind_direction_deg),
  };
}

/**
 * Get user's current location weather
 */
export async function fetchCurrentLocationWeather(): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weather = await fetchWeather(
            position.coords.latitude,
            position.coords.longitude
          );
          weather.location = 'Current Location';
          if (position.coords.altitude) {
            weather.elevation_ft = Math.round(position.coords.altitude * 3.28084);
          }
          resolve(weather);
        } catch (error) {
          reject(error);
        }
      },
      (error) => {
        reject(new Error(`Location error: ${error.message}`));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
