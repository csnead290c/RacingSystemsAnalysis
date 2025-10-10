/**
 * CSV import utilities for weather and timeslip data.
 */

import type { Env } from '../../domain/schemas/env.schema';

export type ParsedCSV = {
  headers: string[];
  rows: string[][];
};

/**
 * Parse a CSV file into headers and rows.
 * Handles CRLF/LF line endings and quoted fields with commas.
 * 
 * @param file - CSV file to parse
 * @returns Parsed CSV data with headers and rows
 */
export async function parseCsv(file: File): Promise<ParsedCSV> {
  const text = await file.text();
  
  // Normalize line endings to LF
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  // Parse CSV with simple state machine
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const nextChar = normalized[i + 1];
    
    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === ',') {
        // Field separator
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n') {
        // Line separator
        currentRow.push(currentField.trim());
        if (currentRow.some(field => field.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  
  // Handle last field/row
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      lines.push(currentRow);
    }
  }
  
  if (lines.length === 0) {
    throw new Error('CSV file is empty');
  }
  
  const headers = lines[0];
  const rows = lines.slice(1);
  
  return { headers, rows };
}

/**
 * Map a CSV row to an Env object using flexible column matching.
 * Tries common header aliases (case-insensitive).
 * 
 * @param row - Row data as key-value pairs
 * @returns Env object or null if insufficient data
 */
export function mapWeatherRow(row: Record<string, string>): Env | null {
  // Normalize keys to lowercase for matching
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.toLowerCase().trim()] = value;
  }
  
  // Helper to find value by aliases
  const findValue = (aliases: string[]): number | undefined => {
    for (const alias of aliases) {
      const key = Object.keys(normalized).find(k => 
        k.includes(alias.toLowerCase())
      );
      if (key) {
        const value = parseFloat(normalized[key]);
        if (!isNaN(value)) {
          return value;
        }
      }
    }
    return undefined;
  };
  
  // Required fields
  const elevation = findValue(['elevation', 'elev']);
  const temperatureF = findValue(['temp', 'temperature']);
  const barometerInHg = findValue(['baro', 'barometer', 'pressure']);
  const humidityPct = findValue(['humidity', 'rh', 'humid']);
  
  // Check if we have minimum required fields
  if (
    elevation === undefined ||
    temperatureF === undefined ||
    barometerInHg === undefined ||
    humidityPct === undefined
  ) {
    return null;
  }
  
  // Optional fields
  const trackTempF = findValue(['tracktemp', 'track']);
  const tractionIndex = findValue(['traction', 'tractionindex']);
  const windMph = findValue(['wind', 'windmph', 'windspeed']);
  const windAngleDeg = findValue(['winddir', 'windangle', 'winddirection']);
  
  const env: Env = {
    elevation,
    temperatureF,
    barometerInHg,
    humidityPct,
  };
  
  if (trackTempF !== undefined) env.trackTempF = trackTempF;
  if (tractionIndex !== undefined) env.tractionIndex = tractionIndex;
  if (windMph !== undefined) env.windMph = windMph;
  if (windAngleDeg !== undefined) env.windAngleDeg = windAngleDeg;
  
  return env;
}

/**
 * Convert parsed CSV to array of row objects.
 * 
 * @param parsed - Parsed CSV data
 * @returns Array of row objects with header keys
 */
export function csvToObjects(parsed: ParsedCSV): Record<string, string>[] {
  return parsed.rows.map(row => {
    const obj: Record<string, string> = {};
    parsed.headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
}
