/**
 * Traction Index Visual Guide
 * 
 * A visual guide to help users understand and select the correct
 * traction index for their track conditions. Based on VB6 Quarter Pro
 * documentation and real-world track surface knowledge.
 */

import { useState } from 'react';

interface TractionIndexGuideProps {
  value: number;
  onChange?: (value: number) => void;
  compact?: boolean;
}

// Traction index descriptions matching VB6 documentation
const TRACTION_LEVELS = [
  { 
    index: 1, 
    label: 'Very Poor',
    color: '#ef4444',
    description: 'Untreated asphalt, dusty/dirty surface',
    examples: ['Street surface', 'Dirty track', 'Rain-affected'],
    icon: '🚫',
  },
  { 
    index: 2, 
    label: 'Poor',
    color: '#f97316',
    description: 'Lightly prepped, early morning',
    examples: ['First runs of day', 'Light rubber', 'Cool track'],
    icon: '⚠️',
  },
  { 
    index: 3, 
    label: 'Fair',
    color: '#f59e0b',
    description: 'Moderately prepped track',
    examples: ['Test & tune', 'Mid-day runs', 'Some rubber down'],
    icon: '🔶',
  },
  { 
    index: 4, 
    label: 'Good',
    color: '#84cc16',
    description: 'Well-prepped track surface',
    examples: ['Race day', 'Good rubber', 'Proper prep'],
    icon: '✅',
  },
  { 
    index: 5, 
    label: 'Excellent',
    color: '#22c55e',
    description: 'Heavily prepped, optimal conditions',
    examples: ['Eliminations', 'Heavy rubber', 'VHT/traction compound'],
    icon: '🏆',
  },
  { 
    index: 6, 
    label: 'Pro Track',
    color: '#06b6d4',
    description: 'Professional prep, national event quality',
    examples: ['NHRA national', 'Pro class', 'Maximum prep'],
    icon: '⭐',
  },
];

export default function TractionIndexGuide({ value, onChange, compact = false }: TractionIndexGuideProps) {
  const [showGuide, setShowGuide] = useState(false);
  
  const currentLevel = TRACTION_LEVELS.find(l => l.index === Math.round(value)) ?? TRACTION_LEVELS[4];

  if (compact) {
    return (
      <div style={{ position: 'relative' }}>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer',
          }}
          onClick={() => setShowGuide(!showGuide)}
        >
          <span style={{ fontSize: '1rem' }}>{currentLevel.icon}</span>
          <span style={{ 
            color: currentLevel.color, 
            fontWeight: 600,
            fontSize: '0.85rem',
          }}>
            {currentLevel.label}
          </span>
          <span style={{ 
            color: 'var(--color-text-muted)', 
            fontSize: '0.75rem',
          }}>
            (TI: {value})
          </span>
          <button
            type="button"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-accent)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '2px 4px',
            }}
          >
            ?
          </button>
        </div>
        
        {showGuide && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '4px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            minWidth: '280px',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>
              Traction Index Guide
            </div>
            {TRACTION_LEVELS.map(level => (
              <div 
                key={level.index}
                onClick={() => {
                  onChange?.(level.index);
                  setShowGuide(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  cursor: onChange ? 'pointer' : 'default',
                  backgroundColor: level.index === Math.round(value) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  border: level.index === Math.round(value) ? '1px solid var(--color-accent)' : '1px solid transparent',
                  marginBottom: '4px',
                }}
              >
                <span style={{ fontSize: '1rem', width: '24px' }}>{level.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: 600, 
                    color: level.color,
                    fontSize: '0.8rem',
                  }}>
                    {level.index} - {level.label}
                  </div>
                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--color-text-muted)',
                  }}>
                    {level.description}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ 
              fontSize: '0.7rem', 
              color: 'var(--color-text-muted)',
              marginTop: '8px',
              borderTop: '1px solid var(--color-border)',
              paddingTop: '8px',
            }}>
              💡 Higher = more grip. Most tracks are 4-5 during race day.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full guide view
  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      padding: '16px',
    }}>
      <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>
        Traction Index Guide
      </h3>
      
      {/* Visual scale */}
      <div style={{ 
        display: 'flex', 
        marginBottom: '16px',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {TRACTION_LEVELS.map(level => (
          <div
            key={level.index}
            onClick={() => onChange?.(level.index)}
            style={{
              flex: 1,
              padding: '12px 8px',
              backgroundColor: level.color,
              color: 'white',
              textAlign: 'center',
              cursor: onChange ? 'pointer' : 'default',
              opacity: level.index === Math.round(value) ? 1 : 0.6,
              transform: level.index === Math.round(value) ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.2s',
              position: 'relative',
              zIndex: level.index === Math.round(value) ? 1 : 0,
            }}
          >
            <div style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{level.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{level.index}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>{level.label}</div>
          </div>
        ))}
      </div>

      {/* Current selection details */}
      <div style={{
        padding: '12px',
        backgroundColor: 'var(--color-bg)',
        borderRadius: '8px',
        borderLeft: `4px solid ${currentLevel.color}`,
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '1.5rem' }}>{currentLevel.icon}</span>
          <div>
            <div style={{ fontWeight: 700, color: currentLevel.color }}>
              {currentLevel.label} (TI: {value})
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              {currentLevel.description}
            </div>
          </div>
        </div>
        
        <div style={{ fontSize: '0.8rem' }}>
          <strong>Typical conditions:</strong>
          <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
            {currentLevel.examples.map((ex, i) => (
              <li key={i} style={{ color: 'var(--color-text-muted)' }}>{ex}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Slider */}
      {onChange && (
        <div style={{ marginTop: '16px' }}>
          <input
            type="range"
            min="1"
            max="6"
            step="0.5"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            color: 'var(--color-text-muted)',
          }}>
            <span>Poor Traction</span>
            <span>Excellent Traction</span>
          </div>
        </div>
      )}
    </div>
  );
}
