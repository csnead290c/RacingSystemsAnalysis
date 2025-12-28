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
      reactionTime?: number;
      et?: number;
      mph?: number;
      dialIn?: number;
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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const resetState = useCallback(() => {
    setStep('capture');
    setImagePreview(null);
    setScanProgress(0);
    setScannedData(null);
    setSelectedLane('left');
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
    setStep('review');
  }, []);
  
  const handleImport = useCallback(() => {
    if (!scannedData) return;
    
    const userData = getUserData(scannedData, selectedLane);
    const opponentData = getOpponentData(scannedData, selectedLane);
    const userWon = didUserWin(scannedData, selectedLane);
    
    onImport({
      user: {
        reactionTime: userData.reactionTime,
        sixtyFt: userData.sixtyFt,
        threeThirtyFt: userData.threeThirtyFt,
        eighthMileET: userData.eighthMileET,
        eighthMileMPH: userData.eighthMileMPH,
        thousandFt: userData.thousandFt,
        quarterMileET: userData.quarterMileET,
        quarterMileMPH: userData.quarterMileMPH,
        dialIn: userData.dialIn,
      },
      opponent: {
        name: opponentData.carNumber ? `Car #${opponentData.carNumber}` : undefined,
        reactionTime: opponentData.reactionTime,
        et: opponentData.quarterMileET || opponentData.eighthMileET,
        mph: opponentData.quarterMileMPH || opponentData.eighthMileMPH,
        dialIn: opponentData.dialIn,
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
    });
    
    handleClose();
  }, [scannedData, selectedLane, onImport, handleClose]);
  
  if (!isOpen) return null;
  
  const userData = scannedData ? getUserData(scannedData, selectedLane) : null;
  const opponentData = scannedData ? getOpponentData(scannedData, selectedLane) : null;
  
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
        {step === 'review' && scannedData && userData && opponentData && (
          <div>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>R/T:</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.reactionTime?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>60':</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.sixtyFt?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>330':</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.threeThirtyFt?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1/8 ET:</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.eighthMileET?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1/8 MPH:</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.eighthMileMPH?.toFixed(2) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1000':</span>
                    <span style={{ fontFamily: 'monospace' }}>{userData.thousandFt?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>1/4 ET:</span>
                    <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{userData.quarterMileET?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>1/4 MPH:</span>
                    <span style={{ fontFamily: 'monospace', color: '#10b981' }}>{userData.quarterMileMPH?.toFixed(2) || '—'}</span>
                  </div>
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
                  {opponentData.carNumber && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Car #:</span>
                      <span>{opponentData.carNumber}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>R/T:</span>
                    <span style={{ fontFamily: 'monospace' }}>{opponentData.reactionTime?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>60':</span>
                    <span style={{ fontFamily: 'monospace' }}>{opponentData.sixtyFt?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>1/8 ET:</span>
                    <span style={{ fontFamily: 'monospace' }}>{opponentData.eighthMileET?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>1/4 ET:</span>
                    <span style={{ fontFamily: 'monospace' }}>{opponentData.quarterMileET?.toFixed(3) || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>1/4 MPH:</span>
                    <span style={{ fontFamily: 'monospace' }}>{opponentData.quarterMileMPH?.toFixed(2) || '—'}</span>
                  </div>
                </div>
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
            
            {/* Raw OCR Text (Debug) */}
            <details style={{ marginBottom: '16px', fontSize: '0.7rem' }}>
              <summary style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}>
                Show raw OCR text (debug)
              </summary>
              <pre style={{ 
                backgroundColor: 'var(--color-surface)', 
                padding: '8px', 
                borderRadius: 'var(--radius-sm)',
                overflow: 'auto',
                maxHeight: '150px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                marginTop: '8px',
              }}>
                {scannedData.rawText || 'No text extracted'}
              </pre>
              <div style={{ marginTop: '4px', color: 'var(--color-text-muted)' }}>
                Format detected: {scannedData.format || 'unknown'}
              </div>
            </details>
            
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
