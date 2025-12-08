import { useState, useMemo } from 'react';

interface RunComparison {
  date: string;
  predictedET: number;
  actualET: number;
  predictedMPH: number;
  actualMPH: number;
  weather?: {
    tempF: number;
    humidity: number;
    da: number;
  };
}

interface PredictionReportCardProps {
  vehicleName: string;
  runs: RunComparison[];
  onClose?: () => void;
}

interface GradeInfo {
  letter: string;
  color: string;
  description: string;
}

/**
 * Prediction Report Card - Grades how well our predictions match actual runs.
 * 
 * This is similar to Computech's RaceBase "report card" feature but with:
 * - More transparency about how the grade is calculated
 * - Trend analysis (improving or declining accuracy)
 * - Specific recommendations for improvement
 * 
 * Grades:
 * A+ = ±0.01s average error (exceptional)
 * A  = ±0.02s average error (excellent)
 * B  = ±0.03s average error (good)
 * C  = ±0.05s average error (fair)
 * D  = ±0.10s average error (needs work)
 * F  = >0.10s average error (poor calibration)
 */
export default function PredictionReportCard({
  vehicleName,
  runs,
  onClose,
}: PredictionReportCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Calculate statistics
  const stats = useMemo(() => {
    if (runs.length === 0) {
      return null;
    }

    const etErrors = runs.map(r => r.actualET - r.predictedET);
    const mphErrors = runs.map(r => r.actualMPH - r.predictedMPH);
    const absETErrors = etErrors.map(Math.abs);
    const absMPHErrors = mphErrors.map(Math.abs);

    // Average errors
    const avgETError = etErrors.reduce((a, b) => a + b, 0) / runs.length;
    const avgMPHError = mphErrors.reduce((a, b) => a + b, 0) / runs.length;
    const avgAbsETError = absETErrors.reduce((a, b) => a + b, 0) / runs.length;
    const avgAbsMPHError = absMPHErrors.reduce((a, b) => a + b, 0) / runs.length;

    // Standard deviation
    const etStdDev = Math.sqrt(
      absETErrors.reduce((sum, e) => sum + Math.pow(e - avgAbsETError, 2), 0) / runs.length
    );

    // Best and worst predictions
    const bestRun = runs.reduce((best, r) => 
      Math.abs(r.actualET - r.predictedET) < Math.abs(best.actualET - best.predictedET) ? r : best
    );
    const worstRun = runs.reduce((worst, r) => 
      Math.abs(r.actualET - r.predictedET) > Math.abs(worst.actualET - worst.predictedET) ? r : worst
    );

    // Trend (are predictions getting better or worse?)
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (runs.length >= 4) {
      const firstHalf = absETErrors.slice(0, Math.floor(runs.length / 2));
      const secondHalf = absETErrors.slice(Math.floor(runs.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      if (secondAvg < firstAvg * 0.8) trend = 'improving';
      else if (secondAvg > firstAvg * 1.2) trend = 'declining';
    }

    // Bias detection (consistently over or under predicting)
    const bias = avgETError > 0.02 ? 'slow' : avgETError < -0.02 ? 'fast' : 'neutral';

    return {
      avgETError,
      avgMPHError,
      avgAbsETError,
      avgAbsMPHError,
      etStdDev,
      bestRun,
      worstRun,
      trend,
      bias,
      runCount: runs.length,
    };
  }, [runs]);

  // Calculate grade
  const grade = useMemo((): GradeInfo => {
    if (!stats) {
      return { letter: '?', color: '#6b7280', description: 'Not enough data' };
    }

    const error = stats.avgAbsETError;

    if (error <= 0.010) return { letter: 'A+', color: '#22c55e', description: 'Exceptional accuracy' };
    if (error <= 0.020) return { letter: 'A', color: '#22c55e', description: 'Excellent accuracy' };
    if (error <= 0.030) return { letter: 'B', color: '#84cc16', description: 'Good accuracy' };
    if (error <= 0.050) return { letter: 'C', color: '#f59e0b', description: 'Fair accuracy' };
    if (error <= 0.100) return { letter: 'D', color: '#f97316', description: 'Needs improvement' };
    return { letter: 'F', color: '#ef4444', description: 'Poor calibration' };
  }, [stats]);

  // Generate recommendations
  const recommendations = useMemo(() => {
    if (!stats) return [];

    const recs: string[] = [];

    if (stats.bias === 'slow') {
      recs.push('Predictions are consistently faster than actual. Consider reducing HP or adding weight in vehicle specs.');
    } else if (stats.bias === 'fast') {
      recs.push('Predictions are consistently slower than actual. Consider increasing HP or reducing weight in vehicle specs.');
    }

    if (stats.etStdDev > 0.05) {
      recs.push('High variability in prediction accuracy. Check if weather conditions are being entered correctly.');
    }

    if (stats.trend === 'declining') {
      recs.push('Prediction accuracy is declining. Vehicle specs may have changed (new parts, wear, etc.).');
    }

    if (stats.runCount < 5) {
      recs.push('Add more runs for a more reliable accuracy assessment.');
    }

    if (recs.length === 0 && grade.letter.startsWith('A')) {
      recs.push('Your vehicle is well-calibrated! Keep logging runs to maintain accuracy.');
    }

    return recs;
  }, [stats, grade]);

  if (!stats) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '12px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '1.1rem', marginBottom: '8px' }}>No Data Available</div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Log some runs with actual times to see your prediction accuracy report card.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>📊 Prediction Report Card</h3>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            {vehicleName} • {stats.runCount} runs analyzed
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Grade Display */}
      <div style={{
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}>
        {/* Big Grade Letter */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '16px',
          backgroundColor: grade.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          fontWeight: 800,
          color: 'white',
          boxShadow: `0 4px 20px ${grade.color}40`,
        }}>
          {grade.letter}
        </div>

        {/* Stats */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '8px' }}>
            {grade.description}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                AVG ET ERROR
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                ±{stats.avgAbsETError.toFixed(3)}s
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                AVG MPH ERROR
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                ±{stats.avgAbsMPHError.toFixed(1)} mph
              </div>
            </div>
          </div>

          {/* Trend indicator */}
          <div style={{ 
            marginTop: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.85rem',
          }}>
            <span>Trend:</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: stats.trend === 'improving' ? 'rgba(34, 197, 94, 0.2)' :
                             stats.trend === 'declining' ? 'rgba(239, 68, 68, 0.2)' :
                             'rgba(107, 114, 128, 0.2)',
              color: stats.trend === 'improving' ? '#22c55e' :
                     stats.trend === 'declining' ? '#ef4444' :
                     'var(--color-text-muted)',
              fontWeight: 600,
            }}>
              {stats.trend === 'improving' ? '📈 Improving' :
               stats.trend === 'declining' ? '📉 Declining' :
               '➡️ Stable'}
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{
          padding: '16px 20px',
          backgroundColor: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-muted)' }}>
            RECOMMENDATIONS
          </div>
          <ul style={{ 
            margin: 0, 
            paddingLeft: '20px', 
            fontSize: '0.85rem',
            color: 'var(--color-text)',
          }}>
            {recommendations.map((rec, i) => (
              <li key={i} style={{ marginBottom: '6px' }}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Details Toggle */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--color-border)',
          color: 'var(--color-accent)',
          cursor: 'pointer',
          fontSize: '0.85rem',
          fontWeight: 500,
        }}
      >
        {showDetails ? '▲ Hide Details' : '▼ Show Run Details'}
      </button>

      {/* Detailed Run List */}
      {showDetails && (
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--color-border)',
          maxHeight: '300px',
          overflowY: 'auto',
        }}>
          <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-muted)' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px' }}>Date</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Predicted</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Actual</th>
                <th style={{ textAlign: 'right', padding: '8px 4px' }}>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => {
                const error = run.actualET - run.predictedET;
                const isBest = run === stats.bestRun;
                const isWorst = run === stats.worstRun;
                
                return (
                  <tr 
                    key={i}
                    style={{
                      backgroundColor: isBest ? 'rgba(34, 197, 94, 0.1)' :
                                      isWorst ? 'rgba(239, 68, 68, 0.1)' :
                                      'transparent',
                    }}
                  >
                    <td style={{ padding: '8px 4px' }}>
                      {run.date}
                      {isBest && <span style={{ marginLeft: '4px' }}>⭐</span>}
                      {isWorst && <span style={{ marginLeft: '4px' }}>⚠️</span>}
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 4px' }}>
                      {run.predictedET.toFixed(3)}s
                    </td>
                    <td style={{ textAlign: 'right', padding: '8px 4px' }}>
                      {run.actualET.toFixed(3)}s
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '8px 4px',
                      color: Math.abs(error) <= 0.02 ? '#22c55e' :
                             Math.abs(error) <= 0.05 ? '#f59e0b' :
                             '#ef4444',
                      fontWeight: 600,
                    }}>
                      {error >= 0 ? '+' : ''}{error.toFixed(3)}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Grade Scale */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
      }}>
        <span><strong style={{ color: '#22c55e' }}>A+</strong> ±0.01s</span>
        <span><strong style={{ color: '#22c55e' }}>A</strong> ±0.02s</span>
        <span><strong style={{ color: '#84cc16' }}>B</strong> ±0.03s</span>
        <span><strong style={{ color: '#f59e0b' }}>C</strong> ±0.05s</span>
        <span><strong style={{ color: '#f97316' }}>D</strong> ±0.10s</span>
        <span><strong style={{ color: '#ef4444' }}>F</strong> &gt;0.10s</span>
      </div>
    </div>
  );
}
