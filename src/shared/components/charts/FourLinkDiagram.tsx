import { useMemo } from 'react';

interface Point {
  x: number;
  y: number;
}

interface LinkBarDetails {
  length: number;
  angle: number;
  axlePoint: Point;
  chassisPoint: Point;
}

interface FourLinkDiagramProps {
  upperBar: LinkBarDetails;
  lowerBar: LinkBarDetails;
  instantCenter: Point;
  verticalCG: number;
  horizontalCG: number;
  tireRadius: number;
  wheelbase?: number;  // Reserved for future use
  shockSeparation: number;
  percentAntiSquat: number;
}

/**
 * SVG diagram showing four-link suspension geometry
 * Displays link bars, instant center, CG, and anti-squat line
 */
function FourLinkDiagram({
  upperBar,
  lowerBar,
  instantCenter,
  verticalCG,
  horizontalCG,
  tireRadius,
  shockSeparation,
  percentAntiSquat,
}: FourLinkDiagramProps) {
  // SVG viewport settings
  const viewWidth = 400;
  const viewHeight = 250;
  const padding = 30;
  
  // Calculate scale and transform to fit diagram
  const { scale, offsetX, offsetY } = useMemo(() => {
    // Find bounds of all points
    const allX = [
      upperBar.axlePoint.x, upperBar.chassisPoint.x,
      lowerBar.axlePoint.x, lowerBar.chassisPoint.x,
      instantCenter.x, 0, -tireRadius
    ];
    const allY = [
      upperBar.axlePoint.y, upperBar.chassisPoint.y,
      lowerBar.axlePoint.y, lowerBar.chassisPoint.y,
      instantCenter.y, 0, tireRadius * 2, verticalCG
    ];
    
    const minX = Math.min(...allX) - 10;
    const maxX = Math.max(...allX) + 10;
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY) + 5;
    
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    
    // Scale to fit viewport with padding
    const scaleX = (viewWidth - padding * 2) / rangeX;
    const scaleY = (viewHeight - padding * 2) / rangeY;
    const s = Math.min(scaleX, scaleY);
    
    // Center the diagram
    const ox = padding - minX * s + (viewWidth - padding * 2 - rangeX * s) / 2;
    const oy = viewHeight - padding + minY * s;
    
    return { scale: s, offsetX: ox, offsetY: oy };
  }, [upperBar, lowerBar, instantCenter, tireRadius, verticalCG]);
  
  // Transform real coordinates to SVG coordinates (flip Y axis)
  const toSvg = (x: number, y: number): { x: number; y: number } => ({
    x: x * scale + offsetX,
    y: offsetY - y * scale,
  });
  
  // Key points
  const rearAxle = toSvg(0, tireRadius);
  const upperAxlePt = toSvg(upperBar.axlePoint.x, upperBar.axlePoint.y);
  const upperChassisPt = toSvg(upperBar.chassisPoint.x, upperBar.chassisPoint.y);
  const lowerAxlePt = toSvg(lowerBar.axlePoint.x, lowerBar.axlePoint.y);
  const lowerChassisPt = toSvg(lowerBar.chassisPoint.x, lowerBar.chassisPoint.y);
  const ic = toSvg(instantCenter.x, instantCenter.y);
  const cg = toSvg(horizontalCG, verticalCG);
  const contactPatch = toSvg(0, 0);
  
  // Anti-squat line (from contact patch through IC)
  const antiSquatEnd = toSvg(horizontalCG + 20, 
    (instantCenter.y / instantCenter.x) * (horizontalCG + 20));
  
  // Tire circle
  const tireCenter = toSvg(0, tireRadius);
  const tireSvgRadius = tireRadius * scale;
  
  // Ground line
  const groundLeft = toSvg(-tireRadius - 5, 0);
  const groundRight = toSvg(Math.max(upperBar.chassisPoint.x, lowerBar.chassisPoint.x) + 10, 0);
  
  // Axle housing (simplified rectangle)
  const axleLeft = toSvg(-8, tireRadius - 3);
  const axleRight = toSvg(8, tireRadius + 3);
  
  return (
    <svg 
      viewBox={`0 0 ${viewWidth} ${viewHeight}`} 
      style={{ width: '100%', height: '100%' }}
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background */}
      <rect width={viewWidth} height={viewHeight} fill="var(--color-bg-secondary)" />
      
      {/* Ground line */}
      <line 
        x1={groundLeft.x} y1={groundLeft.y} 
        x2={groundRight.x} y2={groundRight.y}
        stroke="var(--color-border)" 
        strokeWidth="2"
      />
      
      {/* Tire */}
      <circle 
        cx={tireCenter.x} 
        cy={tireCenter.y} 
        r={tireSvgRadius}
        fill="none"
        stroke="#666"
        strokeWidth="3"
      />
      
      {/* Contact patch marker */}
      <circle cx={contactPatch.x} cy={contactPatch.y} r="4" fill="#ef4444" />
      
      {/* Axle housing (simplified) */}
      <rect
        x={axleLeft.x}
        y={axleRight.y}
        width={axleRight.x - axleLeft.x}
        height={axleLeft.y - axleRight.y}
        fill="#444"
        stroke="#666"
        strokeWidth="1"
      />
      
      {/* Rear axle centerline marker */}
      <circle cx={rearAxle.x} cy={rearAxle.y} r="3" fill="#888" />
      
      {/* Anti-squat line (dashed, from contact patch through IC) */}
      <line
        x1={contactPatch.x} y1={contactPatch.y}
        x2={antiSquatEnd.x} y2={antiSquatEnd.y}
        stroke="#22c55e"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.7"
      />
      
      {/* Upper link bar */}
      <line
        x1={upperAxlePt.x} y1={upperAxlePt.y}
        x2={upperChassisPt.x} y2={upperChassisPt.y}
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Lower link bar */}
      <line
        x1={lowerAxlePt.x} y1={lowerAxlePt.y}
        x2={lowerChassisPt.x} y2={lowerChassisPt.y}
        stroke="#3b82f6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      
      {/* Extended lines to IC (thin dashed) */}
      <line
        x1={upperChassisPt.x} y1={upperChassisPt.y}
        x2={ic.x} y2={ic.y}
        stroke="#f97316"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      <line
        x1={lowerChassisPt.x} y1={lowerChassisPt.y}
        x2={ic.x} y2={ic.y}
        stroke="#3b82f6"
        strokeWidth="1"
        strokeDasharray="3 3"
        opacity="0.5"
      />
      
      {/* Attachment point markers */}
      <circle cx={upperAxlePt.x} cy={upperAxlePt.y} r="4" fill="#f97316" />
      <circle cx={upperChassisPt.x} cy={upperChassisPt.y} r="4" fill="#f97316" />
      <circle cx={lowerAxlePt.x} cy={lowerAxlePt.y} r="4" fill="#3b82f6" />
      <circle cx={lowerChassisPt.x} cy={lowerChassisPt.y} r="4" fill="#3b82f6" />
      
      {/* Instant Center */}
      <circle cx={ic.x} cy={ic.y} r="6" fill="none" stroke="#ef4444" strokeWidth="2" />
      <circle cx={ic.x} cy={ic.y} r="2" fill="#ef4444" />
      
      {/* CG marker */}
      <g transform={`translate(${cg.x}, ${cg.y})`}>
        <circle r="5" fill="none" stroke="#a855f7" strokeWidth="2" />
        <line x1="-7" y1="0" x2="7" y2="0" stroke="#a855f7" strokeWidth="1.5" />
        <line x1="0" y1="-7" x2="0" y2="7" stroke="#a855f7" strokeWidth="1.5" />
      </g>
      
      {/* Labels */}
      <text x={ic.x + 8} y={ic.y - 5} fill="var(--color-text)" fontSize="10" fontWeight="600">IC</text>
      <text x={cg.x + 8} y={cg.y - 5} fill="#a855f7" fontSize="10" fontWeight="600">CG</text>
      
      {/* Legend */}
      <g transform={`translate(10, 15)`}>
        <line x1="0" y1="0" x2="15" y2="0" stroke="#f97316" strokeWidth="2" />
        <text x="20" y="4" fill="var(--color-text)" fontSize="9">Upper Bar</text>
        
        <line x1="0" y1="12" x2="15" y2="12" stroke="#3b82f6" strokeWidth="2" />
        <text x="20" y="16" fill="var(--color-text)" fontSize="9">Lower Bar</text>
        
        <line x1="0" y1="24" x2="15" y2="24" stroke="#22c55e" strokeWidth="1" strokeDasharray="3 3" />
        <text x="20" y="28" fill="var(--color-text)" fontSize="9">Anti-Squat</text>
      </g>
      
      {/* Info box */}
      <g transform={`translate(${viewWidth - 90}, 10)`}>
        <rect x="0" y="0" width="80" height="50" fill="var(--color-bg)" opacity="0.9" rx="3" />
        <text x="5" y="14" fill="var(--color-text)" fontSize="9">
          IC: ({instantCenter.x.toFixed(1)}, {instantCenter.y.toFixed(1)})
        </text>
        <text x="5" y="26" fill="var(--color-text)" fontSize="9">
          Anti-Squat: {percentAntiSquat.toFixed(0)}%
        </text>
        <text x="5" y="38" fill="var(--color-text)" fontSize="9">
          Sep: {shockSeparation.toFixed(2)}"
        </text>
      </g>
    </svg>
  );
}

export default FourLinkDiagram;
