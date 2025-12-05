import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

/**
 * Data logger trace point with all available variables
 */
interface TraceData {
  t_s: number;
  s_ft: number;
  v_mph: number;
  v_fps?: number;
  a_g: number;
  rpm: number;
  dsrpm?: number;  // Driveshaft RPM (Engine RPM / Trans Gear Ratio)
  lockRpm?: number;
  gear: number;
  slip?: boolean;
  hp?: number;
  dragHp?: number;
}

interface DataLoggerChartProps {
  data: TraceData[];
  /** Distance markers to show (e.g., [60, 330, 660, 1000, 1320]) */
  distanceMarkers?: number[];
  /** Race length in feet (660 or 1320) */
  raceLengthFt?: number;
}

type XAxisMode = 'time' | 'distance';

/**
 * Available data series for the data logger
 */
const SERIES_CONFIG = {
  rpm: {
    name: 'Engine RPM',
    color: '#ef4444', // red
    unit: 'RPM',
    yAxisId: 'rpm',
  },
  dsrpm: {
    name: 'Driveshaft RPM',
    color: '#f97316', // orange
    unit: 'RPM',
    yAxisId: 'rpm',
  },
  lockRpm: {
    name: 'Clutch/Conv RPM',
    color: '#eab308', // yellow
    unit: 'RPM',
    yAxisId: 'rpm',
  },
  v_mph: {
    name: 'Car Speed',
    color: '#22c55e', // green
    unit: 'mph',
    yAxisId: 'speed',
  },
  a_g: {
    name: 'Acceleration',
    color: '#3b82f6', // blue
    unit: 'g',
    yAxisId: 'accel',
  },
  hp: {
    name: 'Horsepower',
    color: '#8b5cf6', // purple
    unit: 'HP',
    yAxisId: 'hp',
  },
  dragHp: {
    name: 'Drag HP',
    color: '#ec4899', // pink
    unit: 'HP',
    yAxisId: 'hp',
  },
  gear: {
    name: 'Gear',
    color: '#9ca3af', // lighter gray for visibility
    unit: '',
    yAxisId: 'gear',
  },
} as const;

type SeriesKey = keyof typeof SERIES_CONFIG;

/**
 * Data Logger Chart - simulated data logger view with toggleable variables
 * Supports time or distance on X-axis with distance markers
 */
function DataLoggerChart({ 
  data, 
  distanceMarkers = [60, 330, 660, 1000, 1320],
  raceLengthFt = 1320,
}: DataLoggerChartProps) {
  // X-axis mode: time or distance
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  
  // Default enabled series
  const [enabledSeries, setEnabledSeries] = useState<Set<SeriesKey>>(
    new Set(['rpm', 'v_mph', 'a_g'])
  );

  // Toggle a series on/off
  const toggleSeries = (key: SeriesKey) => {
    setEnabledSeries(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Determine which Y-axes are needed based on enabled series
  const activeYAxes = useMemo(() => {
    const axes = new Set<string>();
    enabledSeries.forEach(key => {
      axes.add(SERIES_CONFIG[key].yAxisId);
    });
    return axes;
  }, [enabledSeries]);

  // Filter data and add xValue based on mode, also inject marker points
  const { chartData, markerIndices } = useMemo(() => {
    let startIdx = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].t_s > 0) {
        startIdx = Math.max(0, i - 1);
        break;
      }
    }
    
    const filtered = data.slice(startIdx);
    const activeMarkers = distanceMarkers.filter(d => d <= raceLengthFt);
    const indices: { distance: number; index: number }[] = [];
    
    // Find the closest data point index for each marker distance
    for (const targetDist of activeMarkers) {
      let bestIdx = -1;
      let bestDiff = Infinity;
      for (let i = 0; i < filtered.length; i++) {
        const diff = Math.abs(filtered[i].s_ft - targetDist);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      if (bestIdx >= 0) {
        indices.push({ distance: targetDist, index: bestIdx });
      }
    }
    
    const mapped = filtered.map(d => ({
      ...d,
      xValue: xAxisMode === 'time' ? d.t_s : d.s_ft,
    }));
    
    return { chartData: mapped, markerIndices: indices };
  }, [data, xAxisMode, distanceMarkers, raceLengthFt]);

  // Get marker x values from the actual data points
  const markerXValues = useMemo(() => {
    return markerIndices.map(m => ({
      distance: m.distance,
      xValue: chartData[m.index]?.xValue,
    })).filter(m => m.xValue !== undefined && !isNaN(m.xValue));
  }, [chartData, markerIndices]);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
        No trace data available
      </div>
    );
  }

  // Count active axes for margin calculation
  const rightAxesCount = ['speed', 'accel', 'hp'].filter(a => activeYAxes.has(a)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Controls row */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
        flexShrink: 0,
      }}>
        {/* X-axis mode toggle - segmented control style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>X-Axis</span>
          <div style={{
            display: 'inline-flex',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '2px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}>
            <button
              onClick={() => setXAxisMode('time')}
              style={{
                padding: '8px 20px',
                border: 'none',
                backgroundColor: xAxisMode === 'time' ? 'var(--color-primary)' : 'transparent',
                color: xAxisMode === 'time' ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Time (s)
            </button>
            <button
              onClick={() => setXAxisMode('distance')}
              style={{
                padding: '8px 20px',
                border: 'none',
                borderLeft: '2px solid var(--color-border)',
                backgroundColor: xAxisMode === 'distance' ? 'var(--color-primary)' : 'transparent',
                color: xAxisMode === 'distance' ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Distance (ft)
            </button>
          </div>
        </div>

        {/* Series toggles - compact pills */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '6px',
        }}>
          {(Object.entries(SERIES_CONFIG) as [SeriesKey, typeof SERIES_CONFIG[SeriesKey]][]).map(([key, config]) => {
            const hasData = data.some(d => d[key as keyof TraceData] !== undefined);
            if (!hasData) return null;
            
            const isEnabled = enabledSeries.has(key);
            return (
              <button
                key={key}
                onClick={() => toggleSeries(key)}
                title={config.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isEnabled ? config.color : 'var(--color-bg-secondary)',
                  color: isEnabled ? 'white' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  opacity: isEnabled ? 1 : 0.7,
                }}
              >
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: isEnabled ? 'white' : config.color,
                }} />
                {config.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 5 + rightAxesCount * 40, left: 5, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          
          {/* X-Axis - use 'number' type for proper scaling */}
          <XAxis
            dataKey="xValue"
            type="number"
            domain={['dataMin', 'dataMax']}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickFormatter={(v) => xAxisMode === 'time' ? v.toFixed(1) : v.toFixed(0)}
            label={{ 
              value: xAxisMode === 'time' ? 'Time (s)' : 'Distance (ft)', 
              position: 'insideBottom', 
              offset: -10,
              fontSize: 11,
              fill: 'var(--color-text-muted)',
            }}
          />
          
          {/* Y-Axes - only show if series is enabled */}
          {activeYAxes.has('rpm') && (
            <YAxis
              yAxisId="rpm"
              orientation="left"
              stroke="#ef4444"
              tick={{ fontSize: 10, fill: '#ef4444' }}
              tickFormatter={(v) => `${(v/1000).toFixed(0)}k`}
              width={40}
            />
          )}
          {activeYAxes.has('speed') && (
            <YAxis
              yAxisId="speed"
              orientation="right"
              stroke="#22c55e"
              tick={{ fontSize: 10, fill: '#22c55e' }}
              width={35}
            />
          )}
          {activeYAxes.has('accel') && (
            <YAxis
              yAxisId="accel"
              orientation="right"
              stroke="#3b82f6"
              domain={[0, 'auto']}
              tick={{ fontSize: 10, fill: '#3b82f6' }}
              tickFormatter={(v) => v.toFixed(1)}
              width={30}
            />
          )}
          {activeYAxes.has('hp') && (
            <YAxis
              yAxisId="hp"
              orientation="right"
              stroke="#8b5cf6"
              tick={{ fontSize: 10, fill: '#8b5cf6' }}
              width={40}
            />
          )}
          {/* Hidden axis for gear */}
          <YAxis yAxisId="gear" orientation="right" domain={[0, 6]} hide />

          {/* Distance marker reference lines */}
          {markerXValues.map((marker) => (
            <ReferenceLine
              key={`dist-${marker.distance}`}
              x={marker.xValue}
              yAxisId="rpm"
              stroke="var(--color-chart-marker)"
              strokeWidth={2}
              strokeDasharray="6 4"
              label={{ 
                value: `${marker.distance}'`, 
                position: 'insideTopRight', 
                fill: 'var(--color-chart-marker)', 
                fontSize: 10,
                fontWeight: 700,
                offset: 5,
              }}
            />
          ))}

          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '0.75rem',
              padding: '8px',
            }}
            formatter={(value: number, name: string) => {
              const config = Object.values(SERIES_CONFIG).find(c => c.name === name);
              if (!config) return [value.toFixed(2), name];
              return [`${value.toFixed(config.unit === 'RPM' ? 0 : 2)} ${config.unit}`, name];
            }}
            labelFormatter={(label: number) => 
              xAxisMode === 'time' 
                ? `Time: ${label.toFixed(3)}s` 
                : `Distance: ${label.toFixed(0)} ft`
            }
          />

          {/* Data lines */}
          {enabledSeries.has('rpm') && (
            <Line type="monotone" dataKey="rpm" stroke={SERIES_CONFIG.rpm.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.rpm.name} yAxisId="rpm" />
          )}
          {enabledSeries.has('dsrpm') && (
            <Line type="monotone" dataKey="dsrpm" stroke={SERIES_CONFIG.dsrpm.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.dsrpm.name} yAxisId="rpm" />
          )}
          {enabledSeries.has('lockRpm') && (
            <Line type="monotone" dataKey="lockRpm" stroke={SERIES_CONFIG.lockRpm.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.lockRpm.name} yAxisId="rpm" />
          )}
          {enabledSeries.has('v_mph') && (
            <Line type="monotone" dataKey="v_mph" stroke={SERIES_CONFIG.v_mph.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.v_mph.name} yAxisId="speed" />
          )}
          {enabledSeries.has('a_g') && (
            <Line type="monotone" dataKey="a_g" stroke={SERIES_CONFIG.a_g.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.a_g.name} yAxisId="accel" />
          )}
          {enabledSeries.has('hp') && (
            <Line type="monotone" dataKey="hp" stroke={SERIES_CONFIG.hp.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.hp.name} yAxisId="hp" />
          )}
          {enabledSeries.has('dragHp') && (
            <Line type="monotone" dataKey="dragHp" stroke={SERIES_CONFIG.dragHp.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.dragHp.name} yAxisId="hp" />
          )}
          {enabledSeries.has('gear') && (
            <Line type="stepAfter" dataKey="gear" stroke={SERIES_CONFIG.gear.color} strokeWidth={2} dot={false} name={SERIES_CONFIG.gear.name} yAxisId="gear" />
          )}
        </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Compact legend below chart */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '12px',
        marginTop: '8px',
        fontSize: '0.75rem',
      }}>
        {(Object.entries(SERIES_CONFIG) as [SeriesKey, typeof SERIES_CONFIG[SeriesKey]][]).map(([key, config]) => {
          if (!enabledSeries.has(key)) return null;
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '14px', height: '3px', backgroundColor: config.color, borderRadius: '1px' }} />
              <span style={{ color: config.color, fontWeight: 500 }}>{config.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DataLoggerChart;