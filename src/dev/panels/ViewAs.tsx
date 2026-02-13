/**
 * Dev "View As" Panel
 *
 * Lets admin/dev users simulate any plan/role/trial combination
 * by overriding the capability context returned by useCapabilities().
 */

import { useState, useEffect } from 'react';
import {
  PLAN_IDS,
  PLANS,
  ROLE_IDS,
  ROLES,
  type PlanId,
  type RoleId,
} from '../../domain/config/capabilities';
import {
  loadViewAsOverride,
  saveViewAsOverride,
  clearViewAsOverride,
  DEFAULT_OVERRIDE,
  type DevViewAsOverride,
} from '../../domain/config/devViewAs';
import { notifyViewAsChange } from '../../domain/config/useCapabilities';
import { useCapabilities } from '../../domain/config/useCapabilities';
import { VIEW_AS_PRESETS } from '../../domain/config/viewAsPresets';

// ── Styles ───────────────────────────────────────────────────────────

const s = {
  container: { padding: '1rem' } as React.CSSProperties,
  section: { marginBottom: '1.25rem' } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-muted)',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.5rem',
    fontSize: '0.82rem',
  } as React.CSSProperties,
  label: {
    fontWeight: 600,
    minWidth: '90px',
  } as React.CSSProperties,
  select: {
    padding: '0.35rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.82rem',
    minWidth: '140px',
  } as React.CSSProperties,
  toggle: {
    cursor: 'pointer',
    width: '18px',
    height: '18px',
  } as React.CSSProperties,
  btn: {
    padding: '0.4rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    cursor: 'pointer',
    fontSize: '0.82rem',
    fontWeight: 600,
  } as React.CSSProperties,
  btnPrimary: {
    backgroundColor: 'var(--color-primary)',
    color: 'white',
    border: 'none',
  } as React.CSSProperties,
  btnDanger: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
  } as React.CSSProperties,
  summaryCard: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    border: '1px solid #f59e0b',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
  } as React.CSSProperties,
  infoBox: {
    padding: '0.75rem 1rem',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.78rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
  } as React.CSSProperties,
  muted: {
    color: 'var(--color-muted)',
    fontSize: '0.72rem',
  } as React.CSSProperties,
};

// ── Component ────────────────────────────────────────────────────────

export default function ViewAs() {
  const { isOverrideActive, plan: activePlan, role: activeRole, trial: activeTrial, ctx } = useCapabilities();

  // Local form state
  const [planId, setPlanId] = useState<PlanId>('free');
  const [roleId, setRoleId] = useState<RoleId>('member');
  const [trialActive, setTrialActive] = useState(false);
  const [trialTarget, setTrialTarget] = useState<PlanId>('pro');
  const [fullAccess, setFullAccess] = useState(false);
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  // Load persisted override on mount
  useEffect(() => {
    const saved = loadViewAsOverride();
    if (saved) {
      setPlanId(saved.planId);
      setRoleId(saved.roleId);
      setTrialActive(saved.trial?.active ?? false);
      setTrialTarget(saved.trial?.targetPlan ?? 'pro');
      setFullAccess(saved.fullAccess ?? false);
    }
  }, []);

  const handleApply = () => {
    const override: DevViewAsOverride = {
      enabled: true,
      planId,
      roleId,
      fullAccess,
      trial: trialActive ? { active: true, targetPlan: trialTarget } : undefined,
    };
    saveViewAsOverride(override);
    notifyViewAsChange();
    setAppliedPreset(null);
  };

  const handleReset = () => {
    setPlanId(DEFAULT_OVERRIDE.planId);
    setRoleId(DEFAULT_OVERRIDE.roleId);
    setTrialActive(false);
    setTrialTarget('pro');
    setFullAccess(false);
    clearViewAsOverride();
    notifyViewAsChange();
    setAppliedPreset(null);
  };

  const handleApplyPreset = (preset: typeof VIEW_AS_PRESETS[number]) => {
    const o = preset.override;
    setPlanId(o.planId);
    setRoleId(o.roleId);
    setFullAccess(o.fullAccess ?? false);
    setTrialActive(o.trial?.active ?? false);
    setTrialTarget(o.trial?.targetPlan ?? 'pro');
    saveViewAsOverride(o);
    notifyViewAsChange();
    setAppliedPreset(preset.label);
  };

  return (
    <div style={s.container}>
      {/* Active override summary */}
      {isOverrideActive && (
        <div style={s.summaryCard}>
          <strong>Override Active:</strong>{' '}
          Plan={PLANS[activePlan].name}, Role={ROLES[activeRole].name}
          {activeTrial.active && `, Trial → ${PLANS[activeTrial.targetPlan].name}`}
          <button
            onClick={handleReset}
            style={{ ...s.btn, ...s.btnDanger, marginLeft: '0.75rem', padding: '0.2rem 0.6rem', fontSize: '0.72rem' }}
          >
            Reset
          </button>
        </div>
      )}

      {/* Info */}
      <div style={s.infoBox}>
        Simulate any plan/role/trial combination. The override replaces the capability
        context returned by <code>useCapabilities()</code> across the entire app.
        A global banner appears when active.
      </div>

      {/* Presets */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Presets</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
          {VIEW_AS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset)}
              title={preset.description}
              style={{
                ...s.btn,
                backgroundColor: 'var(--color-surface)',
                fontSize: '0.75rem',
                padding: '0.3rem 0.7rem',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {appliedPreset && (
          <div style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 600 }}>
            ✓ Applied preset: {appliedPreset}
          </div>
        )}
      </div>

      {/* Plan */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Override Settings</div>

        <div style={s.row}>
          <span style={s.label}>Plan:</span>
          <select style={s.select} value={planId} onChange={e => setPlanId(e.target.value as PlanId)}>
            {PLAN_IDS.map(pid => (
              <option key={pid} value={pid}>{PLANS[pid].name} ({PLANS[pid].price})</option>
            ))}
          </select>
        </div>

        {/* Role */}
        <div style={s.row}>
          <span style={s.label}>Role:</span>
          <select style={s.select} value={roleId} onChange={e => setRoleId(e.target.value as RoleId)}>
            {ROLE_IDS.map(rid => (
              <option key={rid} value={rid}>{ROLES[rid].name}</option>
            ))}
          </select>
        </div>

        {/* Full Access */}
        <div style={s.row}>
          <span style={s.label}>Full Access:</span>
          <input type="checkbox" checked={fullAccess} onChange={e => setFullAccess(e.target.checked)} style={s.toggle} />
          <span style={s.muted}>Grants all capabilities (like owner/admin)</span>
        </div>

        {/* Trial */}
        <div style={s.row}>
          <span style={s.label}>Trial:</span>
          <input type="checkbox" checked={trialActive} onChange={e => setTrialActive(e.target.checked)} style={s.toggle} />
          {trialActive && (
            <>
              <span style={{ fontSize: '0.78rem' }}>Target:</span>
              <select style={s.select} value={trialTarget} onChange={e => setTrialTarget(e.target.value as PlanId)}>
                {PLAN_IDS.map(pid => (
                  <option key={pid} value={pid}>{PLANS[pid].name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={handleApply} style={{ ...s.btn, ...s.btnPrimary }}>
          Apply Override
        </button>
        <button onClick={handleReset} style={{ ...s.btn, ...s.btnDanger }}>
          Reset to Real Access
        </button>
      </div>

      {/* Debug: effective context */}
      <div style={{ ...s.muted, marginTop: '1rem', fontFamily: 'monospace', lineHeight: 1.6 }}>
        <strong>Effective ctx:</strong> plan={ctx.plan}, role={ctx.role}, fullAccess={String(ctx.fullAccess ?? false)}, trial.active={String(ctx.trial?.active ?? false)}
        <br />
        Status: {isOverrideActive ? 'Override active' : 'Using real access'}
        {' · '}localStorage key: <code>rsa.dev.viewAs.v1</code>
      </div>
    </div>
  );
}
