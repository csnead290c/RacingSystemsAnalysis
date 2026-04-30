/**
 * TimeSeriesPlot — Enhanced time-series plot with zoom/pan
 * 
 * Features:
 * - Synchronized cursor
 * - Zoom/pan with state management
 * - Custom axis scaling
 * - Marker overlays
 * - Selection rendering
 */

import React, { useEffect, useRef, useState } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import type { ZoomState, AxisConfig } from '../../../domain/workspace/layoutModel';

export interface TimeSeriesChannel {
  key: string;
  label: string;
  unit: string | null;
  color: string;
  values: (number | null)[];
}

export interface TimeSeriesMarker {
  id: number;
  time_sec: number;
  end_time_sec: number | null;
  label: string;
  color: string | null;
}

export interface TimeSeriesPlotProps {
  timeValues: number[];
  channels: TimeSeriesChannel[];
  cursorTime: number | null;
  referenceCursorTime: number | null;
  showReferenceCursor: boolean;
  onCursorChange?: (time: number | null) => void;
  markers?: TimeSeriesMarker[];
  selection?: { start: number; end: number } | null;
  zoom?: ZoomState;
  yAxis?: AxisConfig;
  height?: number;
  onChartClick?: (time: number) => void;
  onZoomChange?: (zoom: ZoomState) => void;
}

export const TimeSeriesPlot: React.FC<TimeSeriesPlotProps> = ({
  timeValues,
  channels,
  cursorTime,
  referenceCursorTime,
  showReferenceCursor,
  onCursorChange,
  markers = [],
  selection = null,
  zoom,
  yAxis,
  height = 300,
  onChartClick,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; values: Array<{ label: string; value: string; color: string }> } | null>(null);

  useEffect(() => {
    if (!containerRef.current || channels.length === 0 || timeValues.length === 0) return;

    const data: uPlot.AlignedData = [
      timeValues,
      ...channels.map(ch => ch.values),
    ];

    const series: uPlot.Series[] = [
      { label: 'Time (s)' },
      ...channels.map(ch => ({
        label: ch.label + (ch.unit ? ` (${ch.unit})` : ''),
        stroke: ch.color,
        width: 2,
        points: { show: false },
      })),
    ];

    const axes: uPlot.Axis[] = [
      {
        label: 'Time (s)',
        labelSize: 20,
        size: 50,
        grid: { show: yAxis?.showGrid ?? true, stroke: 'rgba(255,255,255,0.1)', width: 1 },
      },
      {
        label: channels[0]?.label + (channels[0]?.unit ? ` (${channels[0].unit})` : ''),
        labelSize: 60,
        size: 60,
        side: 3,
        grid: { show: yAxis?.showGrid ?? true, stroke: 'rgba(255,255,255,0.05)', width: 1 },
        scale: 'y',
      },
    ];

    const scales: Record<string, uPlot.Scale> = {
      x: zoom ? {
        min: zoom.xMin,
        max: zoom.xMax,
      } : { auto: true },
      y: yAxis?.auto === false && yAxis.min != null && yAxis.max != null ? {
        min: yAxis.min,
        max: yAxis.max,
      } : { auto: true },
    };

    const opts: uPlot.Options = {
      width: containerRef.current.clientWidth,
      height,
      series,
      axes,
      scales,
      cursor: {
        drag: { x: !zoom?.locked, y: false },
        sync: {
          key: 'incident-analysis-cursor',
          setSeries: true,
        },
      },
      hooks: {
        setCursor: [
          (u) => {
            if (u.cursor.left != null && u.cursor.left >= 0) {
              const idx = u.posToIdx(u.cursor.left);
              if (idx >= 0 && idx < timeValues.length) {
                const time = timeValues[idx];
                if (onCursorChange && time !== cursorTime) {
                  onCursorChange(time);
                }

                const values = channels.map((ch) => ({
                  label: ch.label,
                  value: ch.values[idx] != null ? ch.values[idx]!.toFixed(3) : '—',
                  color: ch.color,
                }));
                setTooltip({
                  x: u.cursor.left!,
                  y: u.cursor.top ?? 50,
                  values,
                });
              }
            } else {
              setTooltip(null);
            }
          },
        ],
        setScale: [
          (u, key) => {
            if (key === 'x' && onZoomChange && !zoom?.locked) {
              const xScale = u.scales.x;
              if (xScale.min != null && xScale.max != null) {
                onZoomChange({
                  xMin: xScale.min,
                  xMax: xScale.max,
                  locked: zoom?.locked ?? false,
                });
              }
            }
          },
        ],
      },
      plugins: [
        {
          hooks: {
            draw: [
              (u) => {
                const ctx = u.ctx;
                const { left, top, width, height } = u.bbox;

                // Draw markers
                markers.forEach(marker => {
                  const x1 = u.valToPos(marker.time_sec, 'x', true);
                  const markerColor = marker.color || '#22c55e';

                  if (marker.end_time_sec != null) {
                    const x2 = u.valToPos(marker.end_time_sec, 'x', true);
                    ctx.fillStyle = markerColor + '20';
                    ctx.fillRect(x1, top, x2 - x1, height);
                    ctx.strokeStyle = markerColor;
                    ctx.lineWidth = 1;
                    ctx.setLineDash([4, 2]);
                    ctx.beginPath();
                    ctx.moveTo(x1, top);
                    ctx.lineTo(x1, top + height);
                    ctx.moveTo(x2, top);
                    ctx.lineTo(x2, top + height);
                    ctx.stroke();
                    ctx.setLineDash([]);
                  } else {
                    ctx.strokeStyle = markerColor;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 2]);
                    ctx.beginPath();
                    ctx.moveTo(x1, top);
                    ctx.lineTo(x1, top + height);
                    ctx.stroke();
                    ctx.setLineDash([]);
                  }
                });

                // Draw selection
                if (selection) {
                  const x1 = u.valToPos(selection.start, 'x', true);
                  const x2 = u.valToPos(selection.end, 'x', true);
                  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
                  ctx.fillRect(x1, top, x2 - x1, height);
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(x1, top, x2 - x1, height);
                }

                // Draw primary cursor
                if (cursorTime != null) {
                  const x = u.valToPos(cursorTime, 'x', true);
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([4, 2]);
                  ctx.beginPath();
                  ctx.moveTo(x, top);
                  ctx.lineTo(x, top + height);
                  ctx.stroke();
                  ctx.setLineDash([]);
                }

                // Draw reference cursor
                if (showReferenceCursor && referenceCursorTime != null) {
                  const x = u.valToPos(referenceCursorTime, 'x', true);
                  ctx.strokeStyle = '#fbbf24';
                  ctx.lineWidth = 1;
                  ctx.setLineDash([8, 4]);
                  ctx.beginPath();
                  ctx.moveTo(x, top);
                  ctx.lineTo(x, top + height);
                  ctx.stroke();
                  ctx.setLineDash([]);
                }
              },
            ],
          },
        },
      ],
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

    if (onChartClick) {
      const handleClick = (e: MouseEvent) => {
        if (!plotRef.current) return;
        const rect = containerRef.current!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const idx = plotRef.current.posToIdx(x);
        if (idx >= 0 && idx < timeValues.length) {
          onChartClick(timeValues[idx]);
        }
      };
      containerRef.current.addEventListener('click', handleClick);
      return () => {
        plot.destroy();
        resizeObserver.disconnect();
        containerRef.current?.removeEventListener('click', handleClick);
      };
    }

    return () => {
      plot.destroy();
      resizeObserver.disconnect();
    };
  }, [timeValues, channels, height, markers, selection, cursorTime, referenceCursorTime, showReferenceCursor, zoom, yAxis]);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={containerRef} />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x + 10,
            top: tooltip.y,
            background: 'rgba(0,0,0,0.9)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 4,
            padding: '0.5rem',
            fontSize: '0.75rem',
            pointerEvents: 'none',
            zIndex: 1000,
            maxWidth: 250,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#fff' }}>
            t = {cursorTime?.toFixed(3)}s
            {showReferenceCursor && referenceCursorTime != null && (
              <span style={{ color: '#fbbf24', marginLeft: '0.5rem' }}>
                Δ = {Math.abs(cursorTime! - referenceCursorTime).toFixed(3)}s
              </span>
            )}
          </div>
          {tooltip.values.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.1rem' }}>
              <div style={{ width: 12, height: 2, background: v.color }} />
              <span style={{ color: '#aaa', flex: 1 }}>{v.label}:</span>
              <span style={{ fontFamily: 'monospace', color: '#fff' }}>{v.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
