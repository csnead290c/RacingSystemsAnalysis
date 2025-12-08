/**
 * Data Import Component
 * 
 * Import run logs and vehicle data from CSV files.
 */

import { useState, useRef } from 'react';
import { parseCSV, readFileAsText, type RunLogCSV, type VehicleCSV } from '../utils/csvUtils';

type ImportType = 'runs' | 'vehicles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface DataImportProps {
  onImportRuns?: (runs: RunLogCSV[]) => void;
  onImportVehicles?: (vehicles: VehicleCSV[]) => void;
}

export default function DataImport({ onImportRuns, onImportVehicles }: DataImportProps) {
  const [importType, setImportType] = useState<ImportType>('runs');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AnyRecord[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    setPreview(null);

    try {
      const csvText = await readFileAsText(file);
      
      if (importType === 'runs') {
        const runs = parseCSV<AnyRecord>(csvText);
        setPreview(runs.slice(0, 5));
        
        if (onImportRuns && runs.length > 0) {
          // Don't auto-import, wait for confirmation
        }
      } else {
        const vehicles = parseCSV<AnyRecord>(csvText);
        setPreview(vehicles.slice(0, 5));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
    }

    setImporting(false);
  };

  const handleConfirmImport = () => {
    if (!preview) return;

    if (importType === 'runs' && onImportRuns) {
      onImportRuns(preview as RunLogCSV[]);
    } else if (importType === 'vehicles' && onImportVehicles) {
      onImportVehicles(preview as VehicleCSV[]);
    }

    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Import Data</h3>

      {/* Import Type Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label className="label">Import Type</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`btn ${importType === 'runs' ? 'btn-primary' : ''}`}
            onClick={() => setImportType('runs')}
          >
            Run Logs
          </button>
          <button
            className={`btn ${importType === 'vehicles' ? 'btn-primary' : ''}`}
            onClick={() => setImportType('vehicles')}
          >
            Vehicles
          </button>
        </div>
      </div>

      {/* File Input */}
      <div style={{ marginBottom: '16px' }}>
        <label className="label">Select CSV File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          disabled={importing}
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            border: '2px dashed var(--color-border)',
            borderRadius: '8px',
            backgroundColor: 'var(--color-bg)',
          }}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          color: '#ef4444',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
            Preview ({preview.length} rows shown)
          </h4>
          <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
            <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {Object.keys(preview[0]).map(key => (
                    <th key={key} style={{ textAlign: 'left', padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button className="btn btn-primary" onClick={handleConfirmImport}>
              Import All
            </button>
            <button className="btn" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Format Help */}
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '6px',
        fontSize: '0.8rem',
      }}>
        <strong>Expected CSV Format:</strong>
        {importType === 'runs' ? (
          <div style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>
            <code style={{ fontSize: '0.7rem' }}>
              date, time, lane, dialIn, rt, et60, et330, et660, mph660, et1000, et1320, mph1320, temperature, barometer, humidity, notes
            </code>
          </div>
        ) : (
          <div style={{ marginTop: '8px', color: 'var(--color-text-muted)' }}>
            <code style={{ fontSize: '0.7rem' }}>
              name, weight, wheelbase, cgHeight, frontWeight, tireDiameter, tireWidth, gearRatio, peakHP, peakRPM
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
