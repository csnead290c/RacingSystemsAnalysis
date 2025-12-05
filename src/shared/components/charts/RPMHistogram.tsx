import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';

interface RPMHistogramProps {
  /** Trace data with rpm values */
  data: { rpm: number; t_s: number }[];
  /** Target number of bins (will adjust based on data range) */
  targetBins?: number;
  /** Compact mode for dashboard layout */
  compact?: boolean;
}

/**
 * RPM Histogram - shows time spent at each RPM range
 */
function RPMHistogram({ data, targetBins = 15, compact = false }: RPMHistogramProps) {
  const histogramData = useMemo(() => {
    if (!data || data.length < 2) return [];

    // Find RPM range
    const rpms = data.map(d => d.rpm).filter(r => r > 0);
    if (rpms.length === 0) return [];
    
    const minRPM = Math.min(...rpms);
    const maxRPM = Math.max(...rpms);
    const range = maxRPM - minRPM;
    
    // Calculate bin size - aim for targetBins, round to nice numbers
    let binSize: number;
    const rawBinSize = range / targetBins;
    if (rawBinSize <= 100) binSize = 100;
    else if (rawBinSize <= 250) binSize = 250;
    else if (rawBinSize <= 500) binSize = 500;
    else binSize = Math.ceil(rawBinSize / 500) * 500;
    
    // Round min/max to bin boundaries
    const binMin = Math.floor(minRPM / binSize) * binSize;
    const binMax = Math.ceil(maxRPM / binSize) * binSize;
    
    // Create bins
    const histogram: { rpmRange: string; rpmMin: number; rpmMax: number; timeSpent: number }[] = [];
    for (let rpm = binMin; rpm < binMax; rpm += binSize) {
      histogram.push({
        rpmRange: `${rpm}`,
        rpmMin: rpm,
        rpmMax: rpm + binSize,
        timeSpent: 0,
      });
    }
    
    // Calculate time spent in each bin
    for (let i = 1; i < data.length; i++) {
      const dt = data[i].t_s - data[i - 1].t_s;
      if (dt <= 0) continue;
      const rpm = data[i].rpm;
      
      const bin = histogram.find(b => rpm >= b.rpmMin && rpm < b.rpmMax);
      if (bin) {
        bin.timeSpent += dt;
      }
    }
    
    // Filter out empty bins
    return histogram.filter(b => b.timeSpent > 0.001);
  }, [data, targetBins]);

  if (!histogramData || histogramData.length === 0) {
    return (
      <div className="text-center text-muted" style={{ padding: 'var(--space-6)' }}>
        No RPM data available
      </div>
    );
  }

  // Color gradient from green (low RPM) to yellow to red (high RPM)
  const getBarColor = (index: number, total: number) => {
    const ratio = index / (total - 1 || 1);
    // Green -> Yellow -> Red gradient
    if (ratio < 0.5) {
      // Green to Yellow
      const r = Math.round(34 + (234 - 34) * (ratio * 2));
      const g = Math.round(197 + (179 - 197) * (ratio * 2));
      const b = Math.round(94 + (8 - 94) * (ratio * 2));
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      // Yellow to Red
      const r = Math.round(234 + (239 - 234) * ((ratio - 0.5) * 2));
      const g = Math.round(179 - 179 * ((ratio - 0.5) * 2));
      const b = Math.round(8 + (68 - 8) * ((ratio - 0.5) * 2));
      return `rgb(${r}, ${g}, ${b})`;
    }
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={histogramData} margin={compact ? { top: 4, right: 8, left: 0, bottom: 4 } : { top: 5, right: 20, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.3} />
        {!compact && (
          <XAxis
            dataKey="rpmRange"
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
            interval={0}
            angle={-45}
            textAnchor="end"
            height={50}
            label={{ 
              value: 'Engine RPM', 
              position: 'insideBottom', 
              offset: -5,
              fontSize: 10,
              fill: 'var(--color-text-muted)',
            }}
          />
        )}
        {compact && <XAxis dataKey="rpmRange" hide />}
        {!compact && (
          <YAxis
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 9, fill: 'var(--color-text-muted)' }}
            tickFormatter={(v) => `${v.toFixed(1)}s`}
            width={40}
          />
        )}
        {compact && <YAxis hide />}
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            fontSize: '0.75rem',
          }}
          formatter={(value: number) => [`${value.toFixed(2)}s`, 'Time']}
          labelFormatter={(_label: string, payload: any[]) => {
            if (payload && payload[0]) {
              const item = payload[0].payload;
              return `${item.rpmMin} - ${item.rpmMax} RPM`;
            }
            return '';
          }}
        />
        <Bar dataKey="timeSpent" radius={[3, 3, 0, 0]}>
          {histogramData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={getBarColor(index, histogramData.length)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default RPMHistogram;