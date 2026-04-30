/**
 * ResizablePanel — Panel with drag-to-resize capability
 * 
 * Supports horizontal and vertical resizing with min/max constraints.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

export interface ResizablePanelProps {
  children: React.ReactNode;
  side: 'left' | 'right' | 'bottom';
  width?: number;
  height?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  collapsed?: boolean;
  onResize?: (size: number) => void;
  onToggleCollapse?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  children,
  side,
  width,
  height,
  minWidth = 200,
  maxWidth = 600,
  minHeight = 100,
  maxHeight = 500,
  collapsed = false,
  onResize,
  onToggleCollapse,
  className = '',
  style = {},
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef<number>(0);
  const startSizeRef = useRef<number>(0);

  const isHorizontal = side === 'left' || side === 'right';
  const currentSize = isHorizontal ? width : height;
  const minSize = isHorizontal ? minWidth : minHeight;
  const maxSize = isHorizontal ? maxWidth : maxHeight;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startPosRef.current = isHorizontal ? e.clientX : e.clientY;
    startSizeRef.current = currentSize || 0;
  }, [isHorizontal, currentSize]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!onResize) return;

      const delta = (isHorizontal ? e.clientX : e.clientY) - startPosRef.current;
      const adjustedDelta = side === 'right' || side === 'bottom' ? -delta : delta;
      const newSize = Math.max(minSize, Math.min(maxSize, startSizeRef.current + adjustedDelta));
      
      onResize(newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, isHorizontal, side, minSize, maxSize, onResize]);

  const dividerStyle: React.CSSProperties = {
    position: 'absolute',
    background: isResizing ? '#3b82f6' : 'transparent',
    transition: isResizing ? 'none' : 'background 0.15s',
    zIndex: 100,
    ...(isHorizontal ? {
      top: 0,
      bottom: 0,
      width: 4,
      cursor: 'col-resize',
      [side]: -2,
    } : {
      left: 0,
      right: 0,
      height: 4,
      cursor: 'row-resize',
      [side]: -2,
    }),
  };

  const dividerHoverStyle: React.CSSProperties = {
    ...dividerStyle,
    background: '#3b82f6',
  };

  const panelStyle: React.CSSProperties = {
    position: 'relative',
    display: collapsed ? 'none' : 'flex',
    flexDirection: 'column',
    ...(isHorizontal ? { width: currentSize } : { height: currentSize }),
    ...style,
  };

  return (
    <div ref={panelRef} className={className} style={panelStyle}>
      {children}
      {!collapsed && (
        <div
          style={dividerStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => {
            if (!isResizing) {
              (e.target as HTMLElement).style.background = '#3b82f6';
            }
          }}
          onMouseLeave={(e) => {
            if (!isResizing) {
              (e.target as HTMLElement).style.background = 'transparent';
            }
          }}
        />
      )}
    </div>
  );
};
