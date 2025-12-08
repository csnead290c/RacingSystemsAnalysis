/**
 * Quick Actions Component
 * 
 * Grid of quick action buttons for common tasks.
 */

import { Link } from 'react-router-dom';

interface QuickAction {
  path: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    path: '/predict',
    label: 'Run Simulation',
    description: 'Predict your ET and MPH',
    icon: '🏎️',
    color: '#3b82f6',
  },
  {
    path: '/dial-in',
    label: 'Calculate Dial-In',
    description: 'Get your bracket dial-in',
    icon: '🎯',
    color: '#22c55e',
  },
  {
    path: '/log',
    label: 'Log a Run',
    description: 'Record your latest pass',
    icon: '📝',
    color: '#f59e0b',
  },
  {
    path: '/race-day',
    label: 'Race Day Mode',
    description: 'Live weather & predictions',
    icon: '🏁',
    color: '#ef4444',
  },
  {
    path: '/vehicles',
    label: 'Manage Vehicles',
    description: 'Edit your vehicle specs',
    icon: '🚗',
    color: '#8b5cf6',
  },
  {
    path: '/calculators',
    label: 'Calculators',
    description: 'Weather, dyno, and more',
    icon: '🧮',
    color: '#06b6d4',
  },
];

interface QuickActionsProps {
  columns?: number;
  compact?: boolean;
}

export default function QuickActions({ columns = 3, compact = false }: QuickActionsProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: compact ? '8px' : '16px',
    }}>
      {QUICK_ACTIONS.map((action) => (
        <Link
          key={action.path}
          to={action.path}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: compact ? 'center' : 'flex-start',
            padding: compact ? '12px' : '20px',
            backgroundColor: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            textDecoration: 'none',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = action.color;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ 
            fontSize: compact ? '1.5rem' : '2rem', 
            marginBottom: compact ? '4px' : '8px',
          }}>
            {action.icon}
          </span>
          <span style={{ 
            fontSize: compact ? '0.85rem' : '1rem', 
            fontWeight: 600,
            color: 'var(--color-text)',
            textAlign: compact ? 'center' : 'left',
          }}>
            {action.label}
          </span>
          {!compact && (
            <span style={{ 
              fontSize: '0.8rem', 
              color: 'var(--color-text-muted)',
              marginTop: '4px',
            }}>
              {action.description}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * Single Quick Action Button
 */
interface QuickActionButtonProps {
  path: string;
  label: string;
  icon: string;
  color?: string;
}

export function QuickActionButton({ path, label, icon, color = '#3b82f6' }: QuickActionButtonProps) {
  return (
    <Link
      to={path}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        backgroundColor: color,
        color: 'white',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '0.9rem',
        transition: 'opacity 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '0.9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
