/**
 * ViewAsBanner — Global banner shown when a dev "View As" override is active.
 *
 * Renders a small fixed bar at the bottom of the viewport.
 * Clicking "Reset" clears the override and restores real access.
 *
 * Only renders when:
 *   - override is enabled AND
 *   - user has admin.devTools OR import.meta.env.DEV
 */

import { useCapabilities, notifyViewAsChange } from './useCapabilities';
import { clearViewAsOverride } from './devViewAs';
import { PLANS, ROLES } from './capabilities';

export default function ViewAsBanner() {
  const { isOverrideActive, plan, role, trial } = useCapabilities();

  if (!isOverrideActive) return null;

  const handleReset = () => {
    clearViewAsOverride();
    notifyViewAsChange();
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        backgroundColor: '#f59e0b',
        color: '#000',
        padding: '6px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        fontSize: '0.78rem',
        fontWeight: 600,
        boxShadow: '0 -2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>
        VIEW AS ACTIVE: {PLANS[plan].name} / {ROLES[role].name}
        {trial.active && ` + Trial → ${PLANS[trial.targetPlan].name}`}
      </span>
      <button
        onClick={handleReset}
        style={{
          padding: '2px 10px',
          borderRadius: '4px',
          border: '1px solid rgba(0,0,0,0.3)',
          backgroundColor: 'rgba(0,0,0,0.15)',
          color: '#000',
          cursor: 'pointer',
          fontSize: '0.72rem',
          fontWeight: 600,
        }}
      >
        Reset
      </button>
    </div>
  );
}
