/**
 * CSV Import/Export Utilities
 * 
 * Functions for importing and exporting data in CSV format.
 */

/**
 * Parse a CSV string into an array of objects
 */
export function parseCSV<T extends Record<string, unknown>>(
  csvString: string,
  options: {
    delimiter?: string;
    hasHeader?: boolean;
    columnMap?: Record<string, keyof T>;
  } = {}
): T[] {
  const { delimiter = ',', hasHeader = true, columnMap } = options;
  
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  
  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter);
  
  // Map headers to object keys
  const keyMap = columnMap || headers.reduce((acc, h) => {
    acc[h] = h as keyof T;
    return acc;
  }, {} as Record<string, keyof T>);
  
  // Parse data rows
  const startRow = hasHeader ? 1 : 0;
  const results: T[] = [];
  
  for (let i = startRow; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = parseCSVLine(line, delimiter);
    const obj: Partial<T> = {};
    
    headers.forEach((header, idx) => {
      const key = keyMap[header];
      if (key && values[idx] !== undefined) {
        const value = values[idx];
        // Try to parse as number
        const numValue = parseFloat(value);
        (obj as any)[key] = isNaN(numValue) ? value : numValue;
      }
    });
    
    results.push(obj as T);
  }
  
  return results;
}

/**
 * Parse a single CSV line, handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * Convert an array of objects to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  options: {
    columns?: (keyof T)[];
    headers?: Record<keyof T, string>;
    delimiter?: string;
  } = {}
): string {
  if (data.length === 0) return '';
  
  const { delimiter = ',' } = options;
  const columns = options.columns || (Object.keys(data[0]) as (keyof T)[]);
  const headers = options.headers || columns.reduce((acc, col) => {
    acc[col] = String(col);
    return acc;
  }, {} as Record<keyof T, string>);
  
  // Header row
  const headerRow = columns.map(col => escapeCSVValue(headers[col], delimiter)).join(delimiter);
  
  // Data rows
  const dataRows = data.map(row => 
    columns.map(col => escapeCSVValue(String(row[col] ?? ''), delimiter)).join(delimiter)
  );
  
  return [headerRow, ...dataRows].join('\n');
}

/**
 * Escape a value for CSV output
 */
function escapeCSVValue(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Download data as a CSV file
 */
export function downloadCSV(csvString: string, filename: string): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Read a file as text (for file input handling)
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Run log CSV format
 */
export interface RunLogCSV {
  date: string;
  time: string;
  lane: string;
  dialIn: number;
  rt: number;
  et60: number;
  et330: number;
  et660: number;
  mph660: number;
  et1000: number;
  et1320: number;
  mph1320: number;
  temperature: number;
  barometer: number;
  humidity: number;
  densityAltitude: number;
  notes: string;
}

/**
 * Vehicle CSV format
 */
export interface VehicleCSV {
  name: string;
  weight: number;
  wheelbase: number;
  cgHeight: number;
  frontWeight: number;
  tireDiameter: number;
  tireWidth: number;
  gearRatio: number;
  peakHP: number;
  peakRPM: number;
}
