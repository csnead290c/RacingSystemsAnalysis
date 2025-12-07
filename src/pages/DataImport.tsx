import { useState, useCallback } from 'react';
import Page from '../shared/components/Page';

// Supported data formats
type DataFormat = 'csv' | 'racepak' | 'holley' | 'msd' | 'fueltech' | 'manual';

interface ParsedRun {
  id: string;
  date?: string;
  round?: string;
  lane?: 'left' | 'right';
  reactionTime?: number;
  et60?: number;
  et330?: number;
  et660?: number;
  mph660?: number;
  et1000?: number;
  et1320?: number;
  mph1320?: number;
  dialIn?: number;
  weather?: {
    tempF?: number;
    humidity?: number;
    barometer?: number;
  };
  raw?: Record<string, string | number>;
}

interface ColumnMapping {
  [key: string]: string; // CSV column -> our field
}

// Common column name patterns for auto-detection
const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  reactionTime: [/^rt$/i, /reaction/i, /r\.t\./i, /r-t/i],
  et60: [/60['']?\s*(ft|foot)?/i, /^60$/i, /sixty/i],
  et330: [/330['']?\s*(ft|foot)?/i, /^330$/i],
  et660: [/660['']?\s*(ft|foot)?/i, /^660$/i, /eighth/i, /1\/8/i],
  mph660: [/660\s*mph/i, /eighth\s*mph/i, /1\/8\s*mph/i],
  et1000: [/1000['']?\s*(ft|foot)?/i, /^1000$/i],
  et1320: [/1320['']?\s*(ft|foot)?/i, /^1320$/i, /quarter/i, /1\/4/i, /^et$/i],
  mph1320: [/1320\s*mph/i, /quarter\s*mph/i, /1\/4\s*mph/i, /trap/i, /^mph$/i],
  dialIn: [/dial/i, /index/i],
  date: [/date/i, /time/i, /when/i],
  round: [/round/i, /run/i, /pass/i],
  lane: [/lane/i, /side/i],
};

// Parse CSV text
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };
  
  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : 
                    firstLine.includes(';') ? ';' : ',';
  
  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };
  
  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell));
  
  return { headers, rows };
}

// Auto-detect column mappings
function autoDetectMappings(headers: string[]): ColumnMapping {
  const mappings: ColumnMapping = {};
  
  for (const header of headers) {
    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(header))) {
        mappings[header] = field;
        break;
      }
    }
  }
  
  return mappings;
}

// Parse rows using mappings
function parseRows(headers: string[], rows: string[][], mappings: ColumnMapping): ParsedRun[] {
  return rows.map((row, index) => {
    const run: ParsedRun = {
      id: `import-${Date.now()}-${index}`,
      raw: {},
    };
    
    headers.forEach((header, i) => {
      const value = row[i];
      const field = mappings[header];
      
      // Store raw value
      run.raw![header] = value;
      
      if (!field || !value) return;
      
      // Parse based on field type
      const numValue = parseFloat(value.replace(/[^\d.-]/g, ''));
      
      switch (field) {
        case 'reactionTime':
          run.reactionTime = isNaN(numValue) ? undefined : numValue;
          break;
        case 'et60':
          run.et60 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'et330':
          run.et330 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'et660':
          run.et660 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'mph660':
          run.mph660 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'et1000':
          run.et1000 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'et1320':
          run.et1320 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'mph1320':
          run.mph1320 = isNaN(numValue) ? undefined : numValue;
          break;
        case 'dialIn':
          run.dialIn = isNaN(numValue) ? undefined : numValue;
          break;
        case 'date':
          run.date = value;
          break;
        case 'round':
          run.round = value;
          break;
        case 'lane':
          run.lane = /left|l/i.test(value) ? 'left' : /right|r/i.test(value) ? 'right' : undefined;
          break;
      }
    });
    
    return run;
  });
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function DataImport() {
  const [format, setFormat] = useState<DataFormat>('csv');
  const [rawText, setRawText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mappings, setMappings] = useState<ColumnMapping>({});
  const [parsedRuns, setParsedRuns] = useState<ParsedRun[]>([]);
  const [step, setStep] = useState<'input' | 'mapping' | 'preview' | 'complete'>('input');
  const [importTarget, setImportTarget] = useState<'runs' | 'opponents'>('runs');
  const [selectedOpponent, setSelectedOpponent] = useState<string>('');
  
  // Available fields for mapping
  const availableFields = [
    { value: '', label: '— Skip —' },
    { value: 'reactionTime', label: 'Reaction Time' },
    { value: 'et60', label: "60' ET" },
    { value: 'et330', label: "330' ET" },
    { value: 'et660', label: "660' ET (1/8)" },
    { value: 'mph660', label: "660' MPH" },
    { value: 'et1000', label: "1000' ET" },
    { value: 'et1320', label: "1320' ET (1/4)" },
    { value: 'mph1320', label: "1320' MPH" },
    { value: 'dialIn', label: 'Dial-In' },
    { value: 'date', label: 'Date' },
    { value: 'round', label: 'Round' },
    { value: 'lane', label: 'Lane' },
  ];
  
  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }, []);
  
  // Handle file select
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setRawText(event.target?.result as string || '');
      };
      reader.readAsText(file);
    }
  }, []);
  
  // Parse input and move to mapping step
  const handleParse = () => {
    if (!rawText.trim()) return;
    
    const { headers: h, rows: r } = parseCSV(rawText);
    setHeaders(h);
    setRows(r);
    setMappings(autoDetectMappings(h));
    setStep('mapping');
  };
  
  // Apply mappings and preview
  const handlePreview = () => {
    const runs = parseRows(headers, rows, mappings);
    setParsedRuns(runs);
    setStep('preview');
  };
  
  // Import runs
  const handleImport = () => {
    if (importTarget === 'runs') {
      // Import to run history
      const existingRuns = JSON.parse(localStorage.getItem('rsa_run_history') || '[]');
      const newRuns = parsedRuns.map(run => ({
        id: generateId(),
        vehicleId: '', // User will need to assign
        date: run.date || new Date().toISOString(),
        round: run.round,
        lane: run.lane,
        reactionTime: run.reactionTime,
        dialIn: run.dialIn,
        actual: {
          et60: run.et60,
          et330: run.et330,
          et660: run.et660,
          mph660: run.mph660,
          et1000: run.et1000,
          et1320: run.et1320,
          mph1320: run.mph1320,
        },
        imported: true,
        importedAt: new Date().toISOString(),
      }));
      localStorage.setItem('rsa_run_history', JSON.stringify([...newRuns, ...existingRuns]));
    } else if (importTarget === 'opponents' && selectedOpponent) {
      // Import to opponent runs
      const opponents = JSON.parse(localStorage.getItem('rsa_opponents') || '[]');
      const opponentIndex = opponents.findIndex((o: any) => o.id === selectedOpponent);
      if (opponentIndex >= 0) {
        const newRuns = parsedRuns.map(run => ({
          id: generateId(),
          date: run.date || new Date().toISOString().split('T')[0],
          round: run.round,
          lane: run.lane,
          reactionTime: run.reactionTime,
          et60: run.et60,
          et330: run.et330,
          et660: run.et660,
          etMph660: run.mph660,
          et1000: run.et1000,
          et1320: run.et1320,
          mph1320: run.mph1320,
          dialIn: run.dialIn,
        }));
        opponents[opponentIndex].runs = [...opponents[opponentIndex].runs, ...newRuns];
        opponents[opponentIndex].updatedAt = new Date().toISOString();
        localStorage.setItem('rsa_opponents', JSON.stringify(opponents));
      }
    }
    
    setStep('complete');
  };
  
  // Reset
  const handleReset = () => {
    setRawText('');
    setHeaders([]);
    setRows([]);
    setMappings({});
    setParsedRuns([]);
    setStep('input');
  };
  
  // Load opponents for dropdown
  const opponents = JSON.parse(localStorage.getItem('rsa_opponents') || '[]');
  
  return (
    <Page title="Data Import">
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-4)' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-4)' }}>📥 Data Import</h1>
        
        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
          {(['input', 'mapping', 'preview', 'complete'] as const).map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                padding: 'var(--space-2)',
                textAlign: 'center',
                borderRadius: 'var(--radius-md)',
                backgroundColor: step === s ? 'var(--color-accent)' : 
                                 ['input', 'mapping', 'preview', 'complete'].indexOf(step) > i ? 'rgba(34, 197, 94, 0.2)' :
                                 'var(--color-surface)',
                color: step === s ? 'white' : 'var(--color-text)',
                fontSize: '0.8rem',
                fontWeight: step === s ? 600 : 400,
              }}
            >
              {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
            </div>
          ))}
        </div>
        
        {/* Step 1: Input */}
        {step === 'input' && (
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Select Data Source</h2>
            
            {/* Format Selection */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                Data Format
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {[
                  { value: 'csv', label: 'CSV / Excel', icon: '📊' },
                  { value: 'racepak', label: 'RacePak', icon: '📟' },
                  { value: 'holley', label: 'Holley EFI', icon: '⚡' },
                  { value: 'msd', label: 'MSD', icon: '🔌' },
                  { value: 'fueltech', label: 'FuelTech', icon: '⛽' },
                  { value: 'manual', label: 'Manual Entry', icon: '✏️' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value as DataFormat)}
                    style={{
                      padding: '12px 20px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${format === f.value ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      backgroundColor: format === f.value ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                      color: 'var(--color-text)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <span style={{ marginRight: '8px' }}>{f.icon}</span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Import Target */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>
                Import To
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  onClick={() => setImportTarget('runs')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${importTarget === 'runs' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: importTarget === 'runs' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  My Run Log
                </button>
                <button
                  onClick={() => setImportTarget('opponents')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${importTarget === 'opponents' ? 'var(--color-accent)' : 'var(--color-border)'}`,
                    backgroundColor: importTarget === 'opponents' ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
                    color: 'var(--color-text)',
                    cursor: 'pointer',
                  }}
                >
                  Opponent Tracker
                </button>
              </div>
              
              {importTarget === 'opponents' && (
                <select
                  value={selectedOpponent}
                  onChange={(e) => setSelectedOpponent(e.target.value)}
                  style={{
                    marginTop: 'var(--space-2)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    width: '100%',
                    maxWidth: '300px',
                  }}
                >
                  <option value="">Select opponent...</option>
                  {opponents.map((o: any) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              )}
            </div>
            
            {/* File Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-6)',
                textAlign: 'center',
                marginBottom: 'var(--space-3)',
                backgroundColor: 'var(--color-bg-secondary)',
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📁</div>
              <div style={{ marginBottom: 'var(--space-2)' }}>
                Drag & drop a file here, or{' '}
                <label style={{ color: 'var(--color-accent)', cursor: 'pointer', textDecoration: 'underline' }}>
                  browse
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                Supports CSV, TSV, and text files
              </div>
            </div>
            
            {/* Or paste text */}
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem' }}>
                Or paste data directly:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste CSV data here...&#10;&#10;Example:&#10;RT,60',330',660',1320',MPH&#10;0.021,1.312,3.456,5.234,9.876,132.45"
                rows={8}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>
            
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="btn"
              style={{ padding: '12px 24px' }}
            >
              Parse Data →
            </button>
          </div>
        )}
        
        {/* Step 2: Column Mapping */}
        {step === 'mapping' && (
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Map Columns</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              We detected {headers.length} columns and {rows.length} rows. Map each column to the appropriate field.
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
              {headers.map(header => (
                <div key={header} style={{ 
                  padding: 'var(--space-3)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: mappings[header] ? 'rgba(34, 197, 94, 0.05)' : 'var(--color-surface)',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{header}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '8px' }}>
                    Sample: {rows[0]?.[headers.indexOf(header)] || '—'}
                  </div>
                  <select
                    value={mappings[header] || ''}
                    onChange={(e) => setMappings({ ...mappings, [header]: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      color: 'var(--color-text)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {availableFields.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setStep('input')}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handlePreview}
                className="btn"
                style={{ padding: '12px 24px' }}
              >
                Preview Import →
              </button>
            </div>
          </div>
        )}
        
        {/* Step 3: Preview */}
        {step === 'preview' && (
          <div className="card" style={{ padding: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Preview Import</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              {parsedRuns.length} runs will be imported to {importTarget === 'runs' ? 'your Run Log' : 'Opponent Tracker'}.
            </p>
            
            <div style={{ overflowX: 'auto', marginBottom: 'var(--space-4)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>RT</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>60'</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>330'</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>660'</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>1000'</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>1320'</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>MPH</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Dial</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRuns.slice(0, 20).map((run, i) => (
                    <tr key={run.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 12px' }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.reactionTime?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.et60?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.et330?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.et660?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.et1000?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                        {run.et1320?.toFixed(3) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.mph1320?.toFixed(2) || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'monospace' }}>
                        {run.dialIn?.toFixed(2) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsedRuns.length > 20 && (
                <div style={{ padding: 'var(--space-2)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                  ... and {parsedRuns.length - 20} more runs
                </div>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setStep('mapping')}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleImport}
                className="btn"
                style={{ padding: '12px 24px', backgroundColor: '#22c55e' }}
              >
                Import {parsedRuns.length} Runs ✓
              </button>
            </div>
          </div>
        )}
        
        {/* Step 4: Complete */}
        {step === 'complete' && (
          <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ fontSize: '4rem', marginBottom: 'var(--space-3)' }}>✅</div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Import Complete!</h2>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
              Successfully imported {parsedRuns.length} runs to {importTarget === 'runs' ? 'your Run Log' : 'Opponent Tracker'}.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'transparent',
                  color: 'var(--color-text)',
                  cursor: 'pointer',
                }}
              >
                Import More
              </button>
              <a
                href={importTarget === 'runs' ? '/history' : '/opponents'}
                className="btn"
                style={{ padding: '12px 24px', textDecoration: 'none' }}
              >
                View {importTarget === 'runs' ? 'Run Log' : 'Opponents'} →
              </a>
            </div>
          </div>
        )}
        
        {/* Help Section */}
        <div className="card" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)' }}>💡 Tips</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', fontSize: '0.85rem' }}>
            <div>
              <strong>Supported Formats:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', color: 'var(--color-text-muted)' }}>
                <li>CSV files from timing systems</li>
                <li>Excel exports (save as CSV)</li>
                <li>Tab-separated values (TSV)</li>
                <li>Copy/paste from spreadsheets</li>
              </ul>
            </div>
            <div>
              <strong>Auto-Detection:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', color: 'var(--color-text-muted)' }}>
                <li>Column names are auto-matched</li>
                <li>Common formats recognized</li>
                <li>Manual override available</li>
              </ul>
            </div>
            <div>
              <strong>Data Logger Support:</strong>
              <ul style={{ marginTop: '8px', paddingLeft: '20px', color: 'var(--color-text-muted)' }}>
                <li>RacePak (export to CSV)</li>
                <li>Holley EFI logs</li>
                <li>MSD data logs</li>
                <li>FuelTech exports</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
