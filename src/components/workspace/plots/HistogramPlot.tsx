/**
 * HistogramPlot — Distribution/histogram plot
 * 
 * Useful for analyzing RPM, temperature, pressure distributions, etc.
 */

import React, { useEffect, useRef } from 'react';

export interface HistogramChannel {
  key: string;
  label: string;
  unit: string | null;
  color: string;
  values: (number | null)[];
}

export interface HistogramPlotProps {
  channel: HistogramChannel;
  binCount?: number;
  height?: number;
}

interface HistogramBin {
  min: number;
  max: number;
  count: number;
  percentage: number;
}

function calculateHistogram(values: (number | null)[], binCount: number): HistogramBin[] {
  const validValues = values.filter((v): v is number => v != null && isFinite(v));
  if (validValues.length === 0) return [];

  const min = Math.min(...validValues);
  const max = Math.max(...validValues);
  const range = max - min;
  const binWidth = range / binCount;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    min: min + i * binWidth,
    max: min + (i + 1) * binWidth,
    count: 0,
    percentage: 0,
  }));

  validValues.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
    bins[binIndex].count++;
  });

  bins.forEach(bin => {
    bin.percentage = (bin.count / validValues.length) * 100;
  });

  return bins;
}

export const HistogramPlot: React.FC<HistogramPlotProps> = ({
  channel,
  binCount = 20,
  height = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bins = calculateHistogram(channel.values, binCount);
    if (bins.length === 0) {
      ctx.fillStyle = '#666';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No valid data', rect.width / 2, rect.height / 2);
      return;
    }

    const maxCount = Math.max(...bins.map(b => b.count));
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const barWidth = chartWidth / bins.length;

    // Draw bars
    bins.forEach((bin, i) => {
      const barHeight = (bin.count / maxCount) * chartHeight;
      const x = padding.left + i * barWidth;
      const y = padding.top + chartHeight - barHeight;

      ctx.fillStyle = channel.color;
      ctx.fillRect(x, y, barWidth - 2, barHeight);

      // Draw bar outline
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, barWidth - 2, barHeight);
    });

    // Draw axes
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw Y-axis labels (count)
    ctx.fillStyle = '#aaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const count = Math.round((maxCount / ySteps) * i);
      const y = padding.top + chartHeight - (chartHeight / ySteps) * i;
      ctx.fillText(String(count), padding.left - 5, y + 3);
    }

    // Draw X-axis labels (value range)
    ctx.textAlign = 'center';
    const xSteps = Math.min(5, bins.length);
    for (let i = 0; i <= xSteps; i++) {
      const binIndex = Math.floor((bins.length / xSteps) * i);
      if (binIndex >= bins.length) continue;
      const bin = bins[binIndex];
      const x = padding.left + binIndex * barWidth + barWidth / 2;
      const label = bin.min.toFixed(1);
      ctx.fillText(label, x, padding.top + chartHeight + 15);
    }

    // Draw axis labels
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      channel.label + (channel.unit ? ` (${channel.unit})` : ''),
      padding.left + chartWidth / 2,
      rect.height - 5
    );

    ctx.save();
    ctx.translate(15, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Count', 0, 0);
    ctx.restore();

  }, [channel, binCount, height]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#1e1e2e',
        }}
      />
    </div>
  );
};
