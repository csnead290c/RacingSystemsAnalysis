/**
 * XYPlot — Scatter/XY plot for correlation analysis
 * 
 * Useful for G-G diagrams, correlation plots, etc.
 */

import React, { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface XYPlotChannel {
  key: string;
  label: string;
  unit: string | null;
  color: string;
  values: (number | null)[];
}

export interface XYPlotProps {
  xChannel: XYPlotChannel;
  yChannels: XYPlotChannel[];
  height?: number;
}

export const XYPlot: React.FC<XYPlotProps> = ({
  xChannel,
  yChannels,
  height = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || yChannels.length === 0 || xChannel.values.length === 0) return;

    // Build data: [xValues, ...yValues]
    // Filter out null values for XY plot
    const data: uPlot.AlignedData = [
      xChannel.values.map(v => v ?? 0) as number[],
      ...yChannels.map(ch => ch.values.map(v => v ?? 0) as number[]),
    ];

    const series: uPlot.Series[] = [
      { label: xChannel.label + (xChannel.unit ? ` (${xChannel.unit})` : '') },
      ...yChannels.map(ch => ({
        label: ch.label + (ch.unit ? ` (${ch.unit})` : ''),
        stroke: ch.color,
        width: 0, // No line
        points: {
          show: true,
          size: 3,
          fill: ch.color,
        },
        paths: () => null, // Disable line rendering
      })),
    ];

    const axes: uPlot.Axis[] = [
      {
        label: xChannel.label + (xChannel.unit ? ` (${xChannel.unit})` : ''),
        labelSize: 20,
        size: 50,
        grid: { show: true, stroke: 'rgba(255,255,255,0.1)', width: 1 },
      },
      {
        label: yChannels[0]?.label + (yChannels[0]?.unit ? ` (${yChannels[0].unit})` : ''),
        labelSize: 60,
        size: 60,
        side: 3,
        grid: { show: true, stroke: 'rgba(255,255,255,0.05)', width: 1 },
      },
    ];

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height,
      series,
      axes,
      cursor: {
        drag: { x: true, y: true },
      },
    };

    const plot = new uPlot(opts, data, containerRef.current);
    plotRef.current = plot;

    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current && plotRef.current) {
        plotRef.current.setSize({
          width: containerRef.current.clientWidth,
          height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      plot.destroy();
      resizeObserver.disconnect();
    };
  }, [xChannel, yChannels, height]);

  if (yChannels.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height, color: '#666' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', opacity: 0.3 }}>📊</div>
          <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
            Configure X and Y channels to display XY plot
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={containerRef} />
    </div>
  );
};
