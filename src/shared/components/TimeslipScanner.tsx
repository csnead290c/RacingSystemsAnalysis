/**
 * Time Slip Scanner Component
 * 
 * Allows users to photograph or upload a time slip, scan it with OCR,
 * select their lane, and import the run data including opponent info.
 */

import { useState, useRef, useCallback } from 'react';
import { 
  scanTimeslip, 
  preprocessImage,
  getUserData, 
  getOpponentData,
  didUserWin,
  type TimeslipData,
  type LaneSelection 
} from '../../services/timeslipScanner';

interface TimeslipScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: {
    user: {
      carNumber?: string;
      reactionTime?: number;
      sixtyFt?: number;
      threeThirtyFt?: number;
      eighthMileET?: number;
      eighthMileMPH?: number;
      thousandFt?: number;
      quarterMileET?: number;
      quarterMileMPH?: number;
      dialIn?: number;
    };
    opponent: {
      name?: string;
      carNumber?: string;
      dialIn?: number;
      reactionTime?: number;
      sixtyFt?: number;
      threeThirtyFt?: number;
      eighthMileET?: number;
      eighthMileMPH?: number;
      thousandFt?: number;
      et?: number;
      mph?: number;
      notes?: string;
    };
    raceInfo: {
      date?: string;
      time?: string;
      trackName?: string;
      round?: string;
      runNumber?: number;
      userWon?: boolean | null;
      margin?: number;
    };
    weather: {
      temperatureF?: number;
      humidityPct?: number;
      densityAltitude?: number;
    };
  }) => void;
}

type ScanStep = 'capture' | 'scanning' | 'select-lane' | 'review';

export default function TimeslipScanner({ isOpen, onClose, onImport }: TimeslipScannerProps) {
  const [step, setStep] = useState<ScanStep>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedData, setScannedData] = useState<TimeslipData | null>(null);
  const [selectedLane, setSelectedLane] = useState<LaneSelection>('left');
  const [error, setError] = useState<string | null>(null);
  // Editable copies of the parsed values, populated when the user picks a lane.
  // OCR is imperfect, so the review step lets the user correct any field before
  // importing. Values are kept as strings to allow free editing; they are
  // parsed back to numbers on import.
  const [userEdits, setUserEdits] = useState<Record<string, string>>({});
  const [oppEdits, setOppEdits] = useState<Record<string, string>>({});
  const [weatherEdits, setWeatherEdits] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const resetState = useCallback(() => {
    setStep('capture');
    setImagePreview(null);
    setScanProgress(0);
    setScannedData(null);
    setSelectedLane('left');
    setUserEdits({});
    setOppEdits({});
    setWeatherEdits({});
    setError(null);
  }, []);
  
  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);
  
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setError(null);
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
      
      // Start scanning
      setStep('scanning');
      setScanProgress(0);
      
      // Preprocess image for better OCR
      const processed = await preprocessImage(file);
      
      // Run OCR
      const data = await scanTimeslip(processed, (progress) => {
        setScanProgress(Math.round(progress * 100));
      });
      
      setScannedData(data);
      
      // If confidence is decent, go to lane selection
      if (data.confidence > 0.2) {
        setStep('select-lane');
      } else {
        setError('Low confidence scan. You may need to enter data manually or try a clearer photo.');
        setStep('select-lane');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setStep('capture');
    }
  }, []);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);
  
  const handleLaneSelect = useCallback((lane: LaneSelection) => {
    setSelectedLane(lane);
    if (scannedData) {
      const u = getUserData(scannedData, lane);
      const o = getOpponentData(scannedData, lane);
      const s = (n?: number) => (n === undefined || n === null ? '' : String(n));
      setUserEdits({
        carNumber: u.carNumber || '',
        reactionTime: s(u.reactionTime),
        sixtyFt: s(u.sixtyFt),
        threeThirtyFt: s(u.threeThirtyFt),
        eighthMileET: s(u.eighthMileET),
        eighthMileMPH: s(u.eighthMileMPH),
        thousandFt: s(u.thousandFt),
        quarterMileET: s(u.quarterMileET),
        quarterMileMPH: s(u.quarterMileMPH),
        dialIn: s(u.dialIn),
      });
      setOppEdits({
        name: '',
        carNumber: o.carNumber || '',
        dialIn: s(o.dialIn),
        reactionTime: s(o.reactionTime),
        sixtyFt: s(o.sixtyFt),
        threeThirtyFt: s(o.threeThirtyFt),
        eighthMileET: s(o.eighthMileET),
        eighthMileMPH: s(o.eighthMileMPH),
        thousandFt: s(o.thousandFt),
        et: s(o.quarterMileET ?? o.eighthMileET),
        mph: s(o.quarterMileMPH ?? o.eighthMileMPH),
        notes: '',
      });
      setWeatherEdits({
        temperatureF: s(scannedData.weather?.temperatureF),
        humidityPct: s(scannedData.weather?.humidityPct),
        densityAltitude: s(scannedData.weather?.densityAltitude),
      });
    }
    setStep('review');
  }, [scannedData]);
  
  const handleImport = useCallback(() => {
    if (!scannedData) return;
    
    const userWon = didUserWin(scannedData, selectedLane);
    const num = (v?: string) => {
      if (v === undefined) return undefined;
      const t = v.trim();
      if (t === '') return undefined;
      const n = parseFloat(t);
      return isNaN(n) ? undefined : n;
    };
    
    onImport({
      user: {
        carNumber: userEdits.carNumber?.trim() || undefined,
        reactionTime: num(userEdits.reactionTime),
        sixtyFt: num(userEdits.sixtyFt),
        threeThirtyFt: num(userEdits.threeThirtyFt),
        eighthMileET: num(userEdits.eighthMileET),
        eighthMileMPH: num(userEdits.eighthMileMPH),
        thousandFt: num(userEdits.thousandFt),
        quarterMileET: num(userEdits.quarterMileET),
        quarterMileMPH: num(userEdits.quarterMileMPH),
        dialIn: num(userEdits.dialIn),
      },
      opponent: {
        name: oppEdits.name?.trim() || undefined,
        carNumber: oppEdits.carNumber?.trim() || undefined,
        dialIn: num(oppEdits.dialIn),
        reactionTime: num(oppEdits.reactionTime),
        sixtyFt: num(oppEdits.sixtyFt),
        threeThirtyFt: num(oppEdits.threeThirtyFt),
        eighthMileET: num(oppEdits.eighthMileET),
        eighthMileMPH: num(oppEdits.eighthMileMPH),
        thousandFt: num(oppEdits.thousandFt),
        et: num(oppEdits.et),
        mph: num(oppEdits.mph),
        notes: oppEdits.notes?.trim() || undefined,
      },
      raceInfo: {
        date: scannedData.date,
        time: scannedData.time,
        trackName: scannedData.trackName,
        round: scannedData.round,
        runNumber: scannedData.runNumber,
        userWon,
        margin: scannedData.margin,
      },
      weather: {
        temperatureF: num(weatherEdits.temperatureF),
        humidityPct: num(weatherEdits.humidityPct),
        densityAltitude: num(weatherEdits.densityAltitude),
      },
    });
    
    handleClose();
  }, [scannedData, selectedLane, userEdits, oppEdits, weatherEdits, onImport, handleClose]);
  
  if (!isOpen) return null;
  
  const editInputStyle: React.CSSProperties = {
    width: '96px',
    fontFamily: 'monospace',
    fontSize: '0.8rem',
    padding: '2px 6px',
    textAlign: 'right',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
  };
  const updField = (
    setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    key: string,
  ) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setter(prev => ({ ...prev, [key]: e.target.value }));
  const editRow = (
    label: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    opts?: { bold?: boolean; color?: string },
  ) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: opts?.bold ? 600 : undefined }}>
      <span>{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        onChange={onChange}
        placeholder="—"
        style={{ ...editInputStyle, color: opts?.color ?? editInputStyle.color }}
      />
    </div>
  );
  
  return (
    <div 
      className="modal-overlay" 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem' }}>📸 Scan Time Slip</h2>
          <button 
            onClick={handleClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
          >
            ×
          </button>
        </div>
        
        {/* Error Message */}
        {error && (
          <div style={{ 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            marginBottom: '16px',
            fontSize: '0.875rem',
            color: 'var(--color-error)',
          }}>
            ⚠️ {error}
          </div>
        )}
        
        {/* Step: Capture */}
        {step === 'capture' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '24px' }}>
              Take a photo of your time slip or upload an existing image.
            </p>
            
            {/* Camera Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                className="btn"
                onClick={() => cameraInputRef.current?.click()}
                style={{ padding: '16px', fontSize: '1rem' }}
              >
                📷 Take Photo
              </button>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
              
              <button
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: '16px', fontSize: '1rem' }}
              >
                📁 Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                style={{ display: 'none' }}
              />
            </div>
            
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '16px' }}>
              For best results, ensure the time slip is well-lit and the text is clearly visible.
            </p>
          </div>
        )}
        
        {/* Step: Scanning */}
        {step === 'scanning' && (
          <div style={{ textAlign: 'center' }}>
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt="Time slip" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '200px', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                }}
              />
            )}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '1rem', marginBottom: '8px' }}>Scanning...</div>
              <div style={{ 
                height: '8px', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: '4px',
                overflow: 'hidden',
              }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: `${scanProgress}%`,
                    backgroundColor: 'var(--color-accent)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {scanProgress}%
              </div>
            </div>
          </div>
        )}
        
        {/* Step: Select Lane */}
        {step === 'select-lane' && scannedData && (
          <div>
            {imagePreview && (
              <img 
                src={imagePreview} 
                alt="Time slip" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '150px', 
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '16px',
                  display: 'block',
                  margin: '0 auto 16px',
                }}
              />
            )}
            
            <p style={{ textAlign: 'center', marginBottom: '16px', fontWeight: 500 }}>
              Which lane were you in?
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              {/* Left Lane */}
              <button
                onClick={() => handleLaneSelect('left')}
                className="card"
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--color-border)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>LEFT</div>
                {scannedData.left.carNumber && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Car #{scannedData.left.carNumber}
                  </div>
                )}
                {scannedData.left.quarterMileET && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {scannedData.left.quarterMileET.toFixed(3)}s
                  </div>
                )}
                {!scannedData.left.quarterMileET && scannedData.left.eighthMileET && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {scannedData.left.eighthMileET.toFixed(3)}s (1/8)
                  </div>
                )}
              </button>
              
              {/* Right Lane */}
              <button
                onClick={() => handleLaneSelect('right')}
                className="card"
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  border: '2px solid var(--color-border)',
                  transition: 'border-color 0.2s',
                }}
              >
                <div style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>RIGHT</div>
                {scannedData.right.carNumber && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                    Car #{scannedData.right.carNumber}
                  </div>
                )}
                {scannedData.right.quarterMileET && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {scannedData.right.quarterMileET.toFixed(3)}s
                  </div>
                )}
                {!scannedData.right.quarterMileET && scannedData.right.eighthMileET && (
                  <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-accent)' }}>
                    {scannedData.right.eighthMileET.toFixed(3)}s (1/8)
                  </div>
                )}
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={resetState} style={{ flex: 1 }}>
                ← Retake
              </button>
            </div>
          </div>
        )}
        
        {/* Step: Review */}
        {step === 'review' && scannedData && (
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
              Review and correct any field below before importing.
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '16px',
              marginBottom: '16px',
            }}>
              {/* Your Data */}
              <div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  marginBottom: '8px',
                  color: 'var(--color-accent)',
                }}>
                  Your Run ({selectedLane.toUpperCase()})
                </div>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {editRow('Car #:', userEdits.carNumber, updField(setUserEdits, 'carNumber'))}
                  {editRow('Dial:', userEdits.dialIn, updField(setUserEdits, 'dialIn'))}
                  {editRow('R/T:', userEdits.reactionTime, updField(setUserEdits, 'reactionTime'))}
                  {editRow("60':", userEdits.sixtyFt, updField(setUserEdits, 'sixtyFt'))}
                  {editRow("330':", userEdits.threeThirtyFt, updField(setUserEdits, 'threeThirtyFt'))}
                  {editRow('1/8 ET:', userEdits.eighthMileET, updField(setUserEdits, 'eighthMileET'))}
                  {editRow('1/8 MPH:', userEdits.eighthMileMPH, updField(setUserEdits, 'eighthMileMPH'))}
                  {editRow("1000':", userEdits.thousandFt, updField(setUserEdits, 'thousandFt'))}
                  {editRow('1/4 ET:', userEdits.quarterMileET, updField(setUserEdits, 'quarterMileET'), { bold: true, color: '#10b981' })}
                  {editRow('1/4 MPH:', userEdits.quarterMileMPH, updField(setUserEdits, 'quarterMileMPH'), { bold: true, color: '#10b981' })}
                </div>
              </div>
              
              {/* Opponent Data */}
              <div>
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 600, 
                  marginBottom: '8px',
                  color: 'var(--color-text-muted)',
                }}>
                  Opponent ({selectedLane === 'left' ? 'RIGHT' : 'LEFT'})
                </div>
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {editRow('Name:', oppEdits.name, updField(setOppEdits, 'name'))}
                  {editRow('Car #:', oppEdits.carNumber, updField(setOppEdits, 'carNumber'))}
                  {editRow('Dial:', oppEdits.dialIn, updField(setOppEdits, 'dialIn'))}
                  {editRow('R/T:', oppEdits.reactionTime, updField(setOppEdits, 'reactionTime'))}
                  {editRow("60':", oppEdits.sixtyFt, updField(setOppEdits, 'sixtyFt'))}
                  {editRow("330':", oppEdits.threeThirtyFt, updField(setOppEdits, 'threeThirtyFt'))}
                  {editRow('1/8 ET:', oppEdits.eighthMileET, updField(setOppEdits, 'eighthMileET'))}
                  {editRow('1/8 MPH:', oppEdits.eighthMileMPH, updField(setOppEdits, 'eighthMileMPH'))}
                  {editRow("1000':", oppEdits.thousandFt, updField(setOppEdits, 'thousandFt'))}
                  {editRow('ET:', oppEdits.et, updField(setOppEdits, 'et'), { bold: true })}
                  {editRow('MPH:', oppEdits.mph, updField(setOppEdits, 'mph'), { bold: true })}
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ marginBottom: '2px', color: 'var(--color-text-muted)' }}>Notes:</div>
                    <textarea
                      value={oppEdits.notes ?? ''}
                      onChange={(e) => setOppEdits(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Car description, outcome, etc."
                      rows={2}
                      style={{
                        width: '100%',
                        fontSize: '0.75rem',
                        padding: '4px 6px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        resize: 'vertical',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Weather (editable) */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: 'var(--color-surface)', 
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              fontSize: '0.8rem',
            }}>
              <div style={{ fontWeight: 600, marginBottom: '8px' }}>🌡️ Weather (from slip)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {editRow('Temp (°F):', weatherEdits.temperatureF, updField(setWeatherEdits, 'temperatureF'))}
                {editRow('Humidity (%):', weatherEdits.humidityPct, updField(setWeatherEdits, 'humidityPct'))}
                {editRow('Density Alt (ft):', weatherEdits.densityAltitude, updField(setWeatherEdits, 'densityAltitude'))}
              </div>
              <div style={{ marginTop: '6px', color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                Barometer is back-calculated from these on import.
              </div>
            </div>

            {/* Race Info */}
            {(scannedData.winner || scannedData.margin || scannedData.trackName) && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: 'var(--color-surface)', 
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                fontSize: '0.8rem',
              }}>
                {scannedData.trackName && (
                  <div style={{ marginBottom: '4px' }}>📍 {scannedData.trackName}</div>
                )}
                {scannedData.date && (
                  <div style={{ marginBottom: '4px' }}>📅 {scannedData.date} {scannedData.time}</div>
                )}
                {scannedData.winner && (
                  <div style={{ 
                    color: didUserWin(scannedData, selectedLane) ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {didUserWin(scannedData, selectedLane) ? '🏆 WIN' : '❌ LOSS'}
                    {scannedData.margin && ` by ${scannedData.margin.toFixed(4)}s`}
                  </div>
                )}
              </div>
            )}
            
            {/* Confidence */}
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--color-text-muted)', 
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              Scan confidence: {Math.round(scannedData.confidence * 100)}%
              {scannedData.confidence < 0.5 && ' — Please verify the data above'}
            </div>
            
            {/* Raw OCR Text (Debug) - DEV ONLY */}
            {import.meta.env.DEV && (
              <details style={{ marginBottom: '16px', fontSize: '0.7rem', border: '1px dashed var(--color-border)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--color-accent)', fontWeight: 600 }}>
                  🐛 Dev: Show raw OCR & parser diagnostics
                </summary>
                <pre style={{ 
                  backgroundColor: 'var(--color-bg)', 
                  padding: '8px', 
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'auto',
                  maxHeight: '200px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  marginTop: '8px',
                  fontSize: '0.65rem',
                  lineHeight: 1.4,
                }}>
                  {scannedData.rawText || 'No text extracted'}
                </pre>
                <div style={{ marginTop: '8px', color: 'var(--color-text-muted)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div>Format detected: {scannedData.format || 'unknown'}</div>
                  <div>Best parser: {scannedData.bestParser || 'unknown'}</div>
                  <div>Run#: {scannedData.runNumber ?? '—'}</div>
                  <div>Round: {scannedData.round ?? '—'}</div>
                  <div>Track: {scannedData.trackName ?? '—'}</div>
                  <div>Left car: {scannedData.left.carNumber ?? '—'}</div>
                  <div>Right car: {scannedData.right.carNumber ?? '—'}</div>
                </div>
              </details>
            )}
            
            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setStep('select-lane')}
                style={{ flex: 1 }}
              >
                ← Back
              </button>
              <button 
                className="btn" 
                onClick={handleImport}
                style={{ flex: 2 }}
              >
                ✓ Import Data
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
