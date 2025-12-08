/**
 * Tooltip Component
 * 
 * A simple tooltip that appears on hover with help text.
 */

import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  delay = 300,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setCoords({
          x: rect.left + rect.width / 2,
          y: position === 'top' ? rect.top : rect.bottom,
        });
      }
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: coords.x,
    top: position === 'top' ? coords.y - 8 : coords.y + 8,
    transform: position === 'top' 
      ? 'translate(-50%, -100%)' 
      : 'translate(-50%, 0)',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '0.8rem',
    maxWidth: '250px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    border: '1px solid var(--color-border)',
    zIndex: 9999,
    pointerEvents: 'none',
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 0.15s ease',
  };

  return (
    <div 
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      {children}
      {isVisible && (
        <div style={tooltipStyle}>
          {content}
        </div>
      )}
    </div>
  );
}

/**
 * Help Icon with Tooltip
 * 
 * A small "?" icon that shows help text on hover.
 */
interface HelpIconProps {
  text: string;
}

export function HelpIcon({ text }: HelpIconProps) {
  return (
    <Tooltip content={text}>
      <span 
        style={{ 
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-text-muted)',
          color: 'var(--color-bg)',
          fontSize: '0.65rem',
          fontWeight: 700,
          cursor: 'help',
          marginLeft: '4px',
        }}
      >
        ?
      </span>
    </Tooltip>
  );
}

/**
 * Field help definitions for common vehicle/environment parameters
 */
export const FIELD_HELP = {
  // Vehicle parameters
  weight: 'Total vehicle weight with driver, in pounds. Weigh with half tank of fuel.',
  wheelbase: 'Distance from front to rear axle centers, in inches.',
  cgHeight: 'Height of center of gravity above ground, in inches. Lower is better for traction.',
  frontWeight: 'Static weight on front wheels with driver, in pounds.',
  tireDiameter: 'Rear tire diameter under load, in inches. Measure at operating pressure.',
  tireWidth: 'Rear tire tread width, in inches.',
  rollout: 'Distance tire travels before breaking staging beam, in inches. Typically 7-12".',
  
  // Drivetrain
  gearRatio: 'Final drive (rear end) gear ratio. Higher = more acceleration, lower top speed.',
  shiftRPM: 'Engine RPM at which to shift to next gear.',
  revLimiter: 'Maximum engine RPM before fuel/spark cut.',
  
  // Engine
  peakHP: 'Maximum horsepower at the flywheel.',
  peakRPM: 'Engine RPM at which peak horsepower occurs.',
  
  // Environment
  temperature: 'Ambient air temperature in degrees Fahrenheit.',
  barometer: 'Barometric pressure in inches of mercury (inHg). Not corrected for altitude.',
  humidity: 'Relative humidity as a percentage (0-100%).',
  elevation: 'Track elevation above sea level, in feet.',
  tractionIndex: 'Track surface grip level (1-10). 1=poor, 5=average, 10=pro track prep.',
  windSpeed: 'Wind speed in miles per hour.',
  windAngle: 'Wind direction relative to track. 0°=headwind, 180°=tailwind.',
  trackTemp: 'Track surface temperature in degrees Fahrenheit.',
  
  // Simulation
  densityAltitude: 'Corrected altitude accounting for temperature and humidity. Higher = less power.',
  hpCorrection: 'Multiplier for horsepower based on atmospheric conditions. 1.0 = standard day.',
  
  // Bracket racing
  dialIn: 'Your predicted elapsed time for bracket racing.',
  safetyMargin: 'Extra time added to dial-in to avoid breakout. Typically 0.01-0.03 seconds.',
  reactionTime: 'Time from green light to front tire leaving starting line.',
  marginOfVictory: 'Difference between your ET and dial-in. Positive = breakout.',
} as const;
