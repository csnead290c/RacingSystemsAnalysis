/**
 * Throttle Stop Calculator
 * 
 * For bracket racers using throttle stops to control ET.
 * Calculates timer settings based on desired ET change.
 */

import { useState, useMemo } from 'react';

interface ThrottleStopCalcProps {
  baseET?: number;
  baseMPH?: number;
}

export default function ThrottleStopCalc({ baseET = 10.0, baseMPH = 130 }: ThrottleStopCalcProps) {
  const [currentET, setCurrentET] = useState(baseET);
  const [currentMPH, setCurrentMPH] = useState(baseMPH);
  const [targetET, setTargetET] = useState(baseET + 0.5);
  const [currentTimer, setCurrentTimer] = useState(0);
  const [stopPercentage, setStopPercentage] = useState(50); // % throttle during stop

  // Calculate the relationship between timer and ET
  // Rule of thumb: 0.1 second timer ≈ 0.05-0.10 second ET change (varies by car)
  const etPerTimerSecond = useMemo(() => {
    // Higher speed cars are more affected by throttle stops
    // Approximate: 0.5-0.8 ET seconds per timer second at high speeds
    const speedFactor = currentMPH / 150;
    const stopFactor = (100 - stopPercentage) / 100; // More stop = more effect
    return 0.6 * speedFactor * stopFactor;
  }, [currentMPH, stopPercentage]);

  // Calculate required timer change
  const etDifference = targetET - currentET;
  const requiredTimerChange = etDifference / etPerTimerSecond;
  const newTimer = Math.max(0, currentTimer + requiredTimerChange);

  // Calculate predicted results with new timer
  const predictedET = currentET + (newTimer - currentTimer) * etPerTimerSecond;
  const predictedMPH = currentMPH - (newTimer - currentTimer) * 5; // Rough approximation

  // Timer increment table
  const timerIncrements = [0.01, 0.02, 0.05, 0.10, 0.20, 0.50];

  return (
    <div className="card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>
        Throttle Stop Calculator
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Current Performance */}
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            Current Performance
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="label">Current ET (seconds)</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={currentET}
                onChange={(e) => setCurrentET(parseFloat(e.target.value) || 10)}
              />
            </div>
            <div>
              <label className="label">Current MPH</label>
              <input
                type="number"
                step="0.1"
                className="input"
                value={currentMPH}
                onChange={(e) => setCurrentMPH(parseFloat(e.target.value) || 100)}
              />
            </div>
            <div>
              <label className="label">Current Timer (seconds)</label>
              <input
                type="number"
                step="0.01"
                className="input"
                value={currentTimer}
                onChange={(e) => setCurrentTimer(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>

        {/* Target & Settings */}
        <div>
          <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--color-text-muted)' }}>
            Target & Settings
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label className="label">Target ET (seconds)</label>
              <input
                type="number"
                step="0.001"
                className="input"
                value={targetET}
                onChange={(e) => setTargetET(parseFloat(e.target.value) || 10)}
              />
            </div>
            <div>
              <label className="label">Stop Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input"
                value={stopPercentage}
                onChange={(e) => setStopPercentage(parseFloat(e.target.value) || 50)}
              />
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Throttle position during stop (0% = closed, 100% = WOT)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ 
        marginTop: '20px', 
        padding: '16px', 
        backgroundColor: 'var(--color-bg)',
        borderRadius: '8px',
      }}>
        <h4 style={{ fontSize: '0.9rem', marginBottom: '12px' }}>Recommended Settings</h4>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Timer Change</div>
            <div style={{ 
              fontSize: '1.25rem', 
              fontWeight: 700,
              color: requiredTimerChange > 0 ? '#22c55e' : requiredTimerChange < 0 ? '#ef4444' : 'var(--color-text)',
            }}>
              {requiredTimerChange >= 0 ? '+' : ''}{requiredTimerChange.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>New Timer</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {newTimer.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ET/Timer Ratio</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
              {etPerTimerSecond.toFixed(2)}
            </div>
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-around',
          padding: '12px',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '8px',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Predicted ET</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {predictedET.toFixed(3)}s
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Predicted MPH</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
              {predictedMPH.toFixed(1)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference Table */}
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--color-text-muted)' }}>
          Timer Increment Reference
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '8px',
          fontSize: '0.75rem',
        }}>
          {timerIncrements.map(inc => (
            <div 
              key={inc} 
              style={{ 
                textAlign: 'center', 
                padding: '8px 4px',
                backgroundColor: 'var(--color-bg)',
                borderRadius: '4px',
              }}
            >
              <div style={{ fontWeight: 600 }}>+{inc.toFixed(2)}s</div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                ≈ +{(inc * etPerTimerSecond).toFixed(3)} ET
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        marginTop: '16px', 
        fontSize: '0.75rem', 
        color: 'var(--color-text-muted)',
        padding: '8px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '6px',
      }}>
        💡 <strong>Tip:</strong> These are estimates. Track your actual timer-to-ET ratio 
        over several runs to develop accurate correction factors for your specific setup.
      </div>
    </div>
  );
}
