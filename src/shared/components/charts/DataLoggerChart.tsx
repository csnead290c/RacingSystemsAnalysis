import { useState, useMemo, useCallback, useRef } from 'react';
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
  hp?: number;       // Wheel HP (after losses)
  engineHp?: number; // Engine HP (before losses)
  dragHp?: number;
}

interface DataLoggerChartProps {
  data: TraceData[];
  /** Comparison data for overlay (optional) */
  comparisonData?: TraceData[];
  /** Label for comparison data */
  comparisonLabel?: string;
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
  engineHp: {
    name: 'Engine HP',
    color: '#a855f7', // violet
    unit: 'HP',
    yAxisId: 'hp',
  },
  hp: {
    name: 'Wheel HP',
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
  comparisonData,
  comparisonLabel = 'Comparison',
  distanceMarkers = [60, 330, 660, 1000, 1320],
  raceLengthFt = 1320,
}: DataLoggerChartProps) {
  // X-axis mode: time or distance
  const [xAxisMode, setXAxisMode] = useState<XAxisMode>('time');
  
  // Default enabled series
  const [enabledSeries, setEnabledSeries] = useState<Set<SeriesKey>>(
    new Set(['rpm', 'v_mph', 'a_g'])
  );

  // Pinned tooltip state for touch-friendly inspection
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Mobile inspect mode — scrub slider hidden by default, toggled via button
  const [showInspect, setShowInspect] = useState(false);

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

  // State for showing comparison overlay
  const [showComparison, setShowComparison] = useState(true);

  // Filter data and add xValue based on mode, also inject marker points
  const { chartData, markerIndices } = useMemo(() => {
    // Include ALL data points including rollout/launch phase (t_s <= 0)
    // This shows the complete run from staging through finish
    const filtered = data;
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
    
    // Map primary data with comparison data merged by xValue
    const mapped = filtered.map((d) => {
      const xValue = xAxisMode === 'time' ? d.t_s : d.s_ft;
      const result: TraceData & { xValue: number; comp_rpm?: number; comp_v_mph?: number; comp_a_g?: number; comp_hp?: number } = {
        ...d,
        xValue,
      };
      
      // Add comparison data if available
      if (comparisonData && showComparison) {
        // Find closest comparison point by xValue
        const compXValue = xAxisMode === 'time' ? 't_s' : 's_ft';
        let bestComp: TraceData | null = null;
        let bestDiff = Infinity;
        for (const comp of comparisonData) {
          const diff = Math.abs((comp as any)[compXValue] - xValue);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestComp = comp;
          }
        }
        if (bestComp && bestDiff < (xAxisMode === 'time' ? 0.05 : 10)) {
          result.comp_rpm = bestComp.rpm;
          result.comp_v_mph = bestComp.v_mph;
          result.comp_a_g = bestComp.a_g;
          result.comp_hp = bestComp.hp;
        }
      }
      
      return result;
    });
    
    return { chartData: mapped, markerIndices: indices };
  }, [data, comparisonData, showComparison, xAxisMode, distanceMarkers, raceLengthFt]);
  
  // Suppress unused warning for comparisonLabel (used in tooltip)
  void comparisonLabel;

  // Get marker x values from the actual data points
  const markerXValues = useMemo(() => {
    return markerIndices.map(m => ({
      distance: m.distance,
      xValue: chartData[m.index]?.xValue,
    })).filter(m => m.xValue !== undefined && !isNaN(m.xValue));
  }, [chartData, markerIndices]);

  // Detect shift points (where gear changes)
  const shiftPoints = useMemo(() => {
    const shifts: { xValue: number; fromGear: number; toGear: number }[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      if (prev.gear !== curr.gear && curr.gear > prev.gear) {
        shifts.push({
          xValue: curr.xValue,
          fromGear: prev.gear,
          toGear: curr.gear,
        });
      }
    }
    return shifts;
  }, [chartData]);

  // Handle chart click to pin/unpin tooltip
  const handleChartClick = useCallback((state: any) => {
    if (!state || !state.activeTooltipIndex) {
      // Click on empty area — clear pin
      setPinnedIndex(prev => prev !== null ? null : prev);
      return;
    }
    const idx = state.activeTooltipIndex;
    setPinnedIndex(prev => prev === idx ? null : idx);
  }, []);

  // Handle scrub slider change
  const handleScrub = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setPinnedIndex(idx);
  }, []);

  // Clear pin
  const clearPin = useCallback(() => setPinnedIndex(null), []);

  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
        No trace data available
      </div>
    );
  }

  // Count active axes for margin calculation
  const rightAxesCount = ['speed', 'accel', 'hp'].filter(a => activeYAxes.has(a)).length;

  // Pinned data point for display
  const pinnedPoint = pinnedIndex !== null && pinnedIndex >= 0 && pinnedIndex < chartData.length
    ? chartData[pinnedIndex]
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Responsive overrides for chart controls */}
      <style>{`
        @media (max-width: 600px) {
          .dlc-xaxis-btn { padding: 5px 12px !important; font-size: 0.75rem !important; }
          .dlc-series-row { gap: 4px !important; }
          .dlc-series-pill { padding: 3px 7px !important; font-size: 0.6rem !important; }
          .dlc-legend { gap: 6px !important; font-size: 0.65rem !important; }
          .dlc-inspect-btn { display: inline-block !important; }
          .dlc-scrub-row { display: flex !important; }
        }
        @media (max-width: 400px) {
          .dlc-legend { display: none !important; }
          .dlc-series-row { flex-wrap: nowrap !important; overflow-x: auto !important; }
        }
      `}</style>
      {/* Controls row */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-2)',
        flexShrink: 0,
      }}>
        {/* X-axis mode toggle - segmented control style */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>X-Axis</span>
          <div style={{
            display: 'inline-flex',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-bg-secondary)',
          }}>
            <button
              className="dlc-xaxis-btn"
              onClick={() => setXAxisMode('time')}
              style={{
                padding: '5px 14px',
                border: 'none',
                backgroundColor: xAxisMode === 'time' ? 'var(--color-primary)' : 'transparent',
                color: xAxisMode === 'time' ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Time (s)
            </button>
            <button
              className="dlc-xaxis-btn"
              onClick={() => setXAxisMode('distance')}
              style={{
                padding: '5px 14px',
                border: 'none',
                borderLeft: '1px solid var(--color-border)',
                backgroundColor: xAxisMode === 'distance' ? 'var(--color-primary)' : 'transparent',
                color: xAxisMode === 'distance' ? 'white' : 'var(--color-text)',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
            >
              Distance (ft)
            </button>
          </div>
          
          {/* Comparison toggle (only show if comparison data exists) */}
          {comparisonData && comparisonData.length > 0 && (
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.8rem',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              marginLeft: 'auto',
            }}>
              <input 
                type="checkbox" 
                checked={showComparison} 
                onChange={(e) => setShowComparison(e.target.checked)}
              />
              <span style={{ color: showComparison ? '#f59e0b' : 'var(--color-text-muted)' }}>
                Show Comparison
              </span>
            </label>
          )}
        </div>

        {/* Series toggles - horizontal scroll on mobile, wrap on desktop */}
        <div className="dlc-series-row" style={{ 
          display: 'flex', 
          gap: '5px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch' as any,
          scrollbarWidth: 'none' as any,
          flexWrap: 'wrap',
        }}>
          {(Object.entries(SERIES_CONFIG) as [SeriesKey, typeof SERIES_CONFIG[SeriesKey]][]).map(([key, config]) => {
            const hasData = data.some(d => d[key as keyof TraceData] !== undefined);
            if (!hasData) return null;
            
            const isEnabled = enabledSeries.has(key);
            return (
              <button
                className="dlc-series-pill"
                key={key}
                onClick={() => toggleSeries(key)}
                title={config.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isEnabled ? config.color : 'var(--color-bg-secondary)',
                  color: isEnabled ? 'white' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  opacity: isEnabled ? 1 : 0.7,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
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
      <div ref={chartContainerRef} style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: rightAxesCount * 35, left: 5, bottom: 20 }} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
          
          {/* X-Axis - use 'number' type for proper scaling */}
          <XAxis
            dataKey="xValue"
            type="number"
            domain={xAxisMode === 'time' 
              ? [0, (dataMax: number) => Math.ceil(dataMax * 10) / 10] // Round up to nearest 0.1s
              : [0, raceLengthFt + 50] // Slightly past finish line
            }
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
            tickFormatter={(v) => xAxisMode === 'time' ? v.toFixed(1) : v.toFixed(0)}
            tickCount={xAxisMode === 'time' ? 8 : 6}
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

          {/* Shift point markers */}
          {shiftPoints.map((shift, idx) => (
            <ReferenceLine
              key={`shift-${idx}`}
              x={shift.xValue}
              yAxisId="rpm"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              label={{ 
                value: `${shift.fromGear}→${shift.toGear}`, 
                position: 'insideBottomRight', 
                fill: '#f59e0b', 
                fontSize: 9,
                fontWeight: 600,
              }}
            />
          ))}

          <Tooltip
            active={pinnedIndex !== null ? true : undefined}
            contentStyle={{
              backgroundColor: 'var(--color-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: '0.75rem',
              padding: '8px',
            }}
            formatter={(value: number, name: string, props: any) => {
              const config = Object.values(SERIES_CONFIG).find(c => c.name === name);
              if (!config) return [value.toFixed(2), name];
              
              // Add "(s)" slip indicator for acceleration when traction-limited
              let suffix = '';
              if (name === 'Acceleration' && props?.payload?.slip) {
                suffix = ' (s)';
              }
              
              return [`${value.toFixed(config.unit === 'RPM' ? 0 : 2)} ${config.unit}${suffix}`, name];
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
          
          {/* Comparison overlay lines (dashed, semi-transparent) */}
          {showComparison && comparisonData && comparisonData.length > 0 && (
            <>
              {enabledSeries.has('rpm') && (
                <Line type="monotone" dataKey="comp_rpm" stroke={SERIES_CONFIG.rpm.color} strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.5} dot={false} name="Comp RPM" yAxisId="rpm" />
              )}
              {enabledSeries.has('v_mph') && (
                <Line type="monotone" dataKey="comp_v_mph" stroke={SERIES_CONFIG.v_mph.color} strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.5} dot={false} name="Comp Speed" yAxisId="speed" />
              )}
              {enabledSeries.has('a_g') && (
                <Line type="monotone" dataKey="comp_a_g" stroke={SERIES_CONFIG.a_g.color} strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.5} dot={false} name="Comp Accel" yAxisId="accel" />
              )}
              {enabledSeries.has('hp') && (
                <Line type="monotone" dataKey="comp_hp" stroke={SERIES_CONFIG.hp.color} strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.5} dot={false} name="Comp HP" yAxisId="hp" />
              )}
            </>
          )}
        </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Pinned value readout */}
      {pinnedPoint && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '4px 8px',
          marginTop: '4px',
          backgroundColor: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.7rem',
          flexWrap: 'wrap',
          border: '1px solid var(--color-border)',
        }}>
          <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            {xAxisMode === 'time'
              ? `T: ${pinnedPoint.t_s.toFixed(3)}s`
              : `D: ${pinnedPoint.s_ft.toFixed(0)} ft`}
          </span>
          {enabledSeries.has('rpm') && <span style={{ color: SERIES_CONFIG.rpm.color }}>{Math.round(pinnedPoint.rpm)} RPM</span>}
          {enabledSeries.has('v_mph') && <span style={{ color: SERIES_CONFIG.v_mph.color }}>{pinnedPoint.v_mph.toFixed(1)} mph</span>}
          {enabledSeries.has('a_g') && <span style={{ color: SERIES_CONFIG.a_g.color }}>{pinnedPoint.a_g.toFixed(3)} g</span>}
          {enabledSeries.has('hp') && pinnedPoint.hp != null && <span style={{ color: SERIES_CONFIG.hp.color }}>{Math.round(pinnedPoint.hp)} HP</span>}
          <span style={{ color: 'var(--color-text-muted)' }}>Gear {pinnedPoint.gear}</span>
          <button
            onClick={clearPin}
            data-testid="clear-pin"
            style={{
              marginLeft: 'auto',
              padding: '1px 6px',
              fontSize: '0.65rem',
              border: '1px solid var(--color-border)',
              borderRadius: '3px',
              backgroundColor: 'transparent',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Inspect toggle + scrub slider — hidden on desktop, compact on mobile */}
      <div className="dlc-inspect-row" style={{
        marginTop: '4px',
        fontSize: '0.7rem',
        color: 'var(--color-text-muted)',
      }}>
        {/* Toggle button — only visible on mobile via CSS */}
        <button
          onClick={() => setShowInspect(prev => !prev)}
          data-testid="inspect-toggle"
          className="dlc-inspect-btn"
          style={{
            display: 'none', /* shown via media query on mobile */
            padding: '3px 8px',
            fontSize: '0.65rem',
            border: '1px solid var(--color-border)',
            borderRadius: '3px',
            backgroundColor: showInspect ? 'var(--color-primary)' : 'transparent',
            color: showInspect ? 'white' : 'var(--color-text-muted)',
            cursor: 'pointer',
            marginBottom: showInspect ? '4px' : 0,
          }}
        >
          {showInspect ? 'Hide Inspect' : 'Inspect'}
        </button>
        {/* Scrub slider — only shown on mobile when inspect is active */}
        {showInspect && (
          <div className="dlc-scrub-row" style={{
            display: 'none', /* shown via media query on mobile when inspect active */
            alignItems: 'center',
            gap: '8px',
          }}>
            <input
              type="range"
              min={0}
              max={chartData.length - 1}
              value={pinnedIndex ?? 0}
              onChange={handleScrub}
              data-testid="scrub-slider"
              style={{ flex: 1, cursor: 'pointer' }}
            />
            <span style={{ whiteSpace: 'nowrap', minWidth: '60px', textAlign: 'right' }}>
              {pinnedPoint
                ? (xAxisMode === 'time'
                    ? `${pinnedPoint.t_s.toFixed(2)}s`
                    : `${pinnedPoint.s_ft.toFixed(0)} ft`)
                : '—'}
            </span>
          </div>
        )}
      </div>

      {/* Compact legend below chart */}
      <div className="dlc-legend" style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: '12px',
        marginTop: '6px',
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