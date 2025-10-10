/**
 * CSV export utilities for run data.
 */

import type { RunRecordV1 } from '../../domain/schemas/run.schema';

/**
 * Convert run records to CSV format.
 * 
 * @param rows - Array of run records to export
 * @returns CSV string with header and data rows
 */
export function runsToCsv(rows: RunRecordV1[]): string {
  // CSV header
  const header = 'id,createdAt,vehicleId,raceLength,et_pred,mph_pred,et_actual,mph_actual,notes';
  
  // Convert each run to CSV row
  const dataRows = rows.map((run) => {
    // Format date as ISO string
    const createdAt = new Date(run.createdAt).toISOString();
    
    // Extract values with fallbacks
    const etPred = run.prediction?.et_s?.toFixed(3) || '';
    const mphPred = run.prediction?.mph?.toFixed(2) || '';
    const etActual = run.outcome?.slipET_s?.toFixed(3) || '';
    const mphActual = run.outcome?.slipMPH?.toFixed(2) || '';
    
    // Escape notes for CSV (handle quotes and commas)
    const notes = run.notes ? `"${run.notes.replace(/"/g, '""')}"` : '';
    
    return [
      run.id,
      createdAt,
      run.vehicleId,
      run.raceLength,
      etPred,
      mphPred,
      etActual,
      mphActual,
      notes,
    ].join(',');
  });
  
  // Combine header and data rows
  return [header, ...dataRows].join('\n');
}

/**
 * Download CSV data as a file.
 * 
 * @param csvData - CSV string content
 * @param filename - Name of the file to download
 */
export function downloadCsv(csvData: string, filename: string): void {
  // Create blob with CSV data
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  // Trigger download
  document.body.appendChild(link);
  link.click();
  
  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
