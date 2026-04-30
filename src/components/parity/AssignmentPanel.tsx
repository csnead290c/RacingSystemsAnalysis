/**
 * Shared Assignment Management Panel
 * Reusable component for displaying and editing driver combo/body style assignments
 */

import React, { useState, useEffect, useCallback } from 'react';
import { parityApi } from '../../services/parityApi';
import type { DriverComboRow, ClassDefaultRow, EngineComboRow, DriverBodyStyleRow, BodyStyleRow } from '../../services/parityApi';
import {
  resolveComboAssignment,
  resolveBodyStyleAssignment,
  getComboHistory,
  getBodyStyleHistory,
  formatAssignmentDate,
  getSourceBadgeColor,
  getSourceLabel,
  formatBulkUpsertDriverCombosResult,
  type BulkUpsertResult,
} from './assignmentUtils';

interface AssignmentPanelProps {
  driverName: string;
  classIndex: string;
  onAssignmentChanged?: () => void;
  showBodyStyles?: boolean;
}

const S = {
  card: {
    background: 'var(--color-surface, #1e1e2e)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    padding: '0.75rem',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: 'var(--color-text)',
  } as React.CSSProperties,
  currentBox: {
    background: 'var(--color-bg, #16162a)',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    padding: '0.5rem',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  badge: (color: string) => ({
    display: 'inline-block',
    padding: '0.1rem 0.4rem',
    borderRadius: 3,
    fontSize: '0.65rem',
    fontWeight: 600,
    background: color,
    color: '#fff',
    marginLeft: '0.5rem',
  } as React.CSSProperties),
  historyItem: {
    padding: '0.4rem',
    background: 'var(--color-bg, #16162a)',
    borderRadius: 4,
    marginBottom: '0.3rem',
    fontSize: '0.75rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  btn: (variant: 'primary' | 'secondary' | 'danger' = 'secondary') => ({
    padding: '0.3rem 0.6rem',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.7rem',
    background: variant === 'primary' ? 'var(--color-primary)' : variant === 'danger' ? '#c0392b' : 'var(--color-border)',
    color: variant === 'secondary' ? 'var(--color-text)' : '#fff',
  } as React.CSSProperties),
  input: {
    padding: '0.4rem 0.6rem',
    border: '1px solid var(--color-border)',
    borderRadius: 4,
    background: 'var(--color-input-bg, var(--color-bg))',
    color: 'var(--color-text)',
    fontFamily: 'monospace',
    fontSize: '0.75rem',
    width: '100%',
  } as React.CSSProperties,
};

export function AssignmentPanel({ driverName, classIndex, onAssignmentChanged, showBodyStyles = false }: AssignmentPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Data
  const [driverCombos, setDriverCombos] = useState<DriverComboRow[]>([]);
  const [engineCombos, setEngineCombos] = useState<EngineComboRow[]>([]);
  const [classDefaults, setClassDefaults] = useState<ClassDefaultRow[]>([]);
  const [driverBodyStyles, setDriverBodyStyles] = useState<DriverBodyStyleRow[]>([]);
  const [bodyStyles, setBodyStyles] = useState<BodyStyleRow[]>([]);

  // Edit state
  const [editingCombo, setEditingCombo] = useState(false);
  const [editingBodyStyle, setEditingBodyStyle] = useState(false);
  const [newComboId, setNewComboId] = useState<number>(0);
  const [newBodyStyleId, setNewBodyStyleId] = useState<number>(0);
  const [comboEffectiveFromUtc, setComboEffectiveFromUtc] = useState('');
  const [bodyStyleEffectiveFromUtc, setBodyStyleEffectiveFromUtc] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dc, ec, cd, dbs, bs] = await Promise.all([
        parityApi.listDriverCombos({ driverName, classIndex }),
        parityApi.listEngineCombos(),
        parityApi.listClassDefaults({ classIndex }),
        showBodyStyles ? parityApi.listDriverBodyStyles({ driverName, classIndex }) : Promise.resolve({ driverBodyStyles: [] }),
        showBodyStyles ? parityApi.listBodyStyles() : Promise.resolve({ bodyStyles: [] }),
      ]);
      setDriverCombos(dc.combos);
      setEngineCombos(ec.combos);
      setClassDefaults(cd.classDefaults);
      setDriverBodyStyles(dbs.driverBodyStyles);
      setBodyStyles(bs.bodyStyles);
    } catch (e: any) {
      setError(e.message || 'Failed to load assignments');
    }
    setLoading(false);
  }, [driverName, classIndex, showBodyStyles]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-dismiss messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(''), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // Resolve current assignments
  const currentCombo = resolveComboAssignment(driverName, classIndex, null, driverCombos, classDefaults, engineCombos);
  const currentBodyStyle = showBodyStyles ? resolveBodyStyleAssignment(driverName, classIndex, null, driverBodyStyles, bodyStyles) : null;

  // Get history
  const comboHistory = getComboHistory(driverName, classIndex, driverCombos);
  const bodyStyleHistory = showBodyStyles ? getBodyStyleHistory(driverName, classIndex, driverBodyStyles) : [];

  const handleSaveCombo = async () => {
    if (!newComboId || !comboEffectiveFromUtc) {
      setError('Please select a combo and effective date');
      return;
    }
    // Validate UTC format
    if (!comboEffectiveFromUtc.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
      setError('Effective date must be in UTC format: YYYY-MM-DDTHH:MM:SSZ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Use bulkUpsertDriverCombos for lifecycle-aware assignment handling
      const res = await parityApi.bulkUpsertDriverCombos([{
        driverName,
        classIndex,
        engineComboId: newComboId,
        effectiveFromUtc: comboEffectiveFromUtc,
      }]);
      
      // Handle result using shared formatter
      const formatted = formatBulkUpsertDriverCombosResult(res as BulkUpsertResult);
      if (formatted.hasErrors) {
        setError(`Saved with errors: ${formatted.errorMessage}`);
      } else {
        setSuccess(`Engine combo: ${formatted.message}`);
      }
      
      setEditingCombo(false);
      setNewComboId(0);
      setComboEffectiveFromUtc('');
      await load();
      onAssignmentChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to save combo assignment');
    }
    setSaving(false);
  };

  const handleSaveBodyStyle = async () => {
    if (!newBodyStyleId || !bodyStyleEffectiveFromUtc) {
      setError('Please select a body style and effective date');
      return;
    }
    // Validate UTC format
    if (!bodyStyleEffectiveFromUtc.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/)) {
      setError('Effective date must be in UTC format: YYYY-MM-DDTHH:MM:SSZ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // upsertDriverBodyStyle has built-in lifecycle handling in backend
      await parityApi.upsertDriverBodyStyle({
        driverName,
        classIndex,
        bodyStyleId: newBodyStyleId,
        effectiveFromUtc: bodyStyleEffectiveFromUtc,
      });
      setSuccess('Body style assignment saved');
      setEditingBodyStyle(false);
      setNewBodyStyleId(0);
      setBodyStyleEffectiveFromUtc('');
      await load();
      onAssignmentChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to save body style assignment');
    }
    setSaving(false);
  };

  const handleEndCombo = async (id: number) => {
    if (!confirm('End this assignment by setting effective_to to now?')) return;
    setSaving(true);
    setError('');
    try {
      const assignment = driverCombos.find(dc => dc.id === id);
      if (!assignment) return;
      // Use upsertDriverCombo with id to directly update the existing record
      await parityApi.upsertDriverCombo({
        id,
        driverName: assignment.driver_name,
        classIndex: assignment.class_index,
        engineComboId: assignment.engine_combo_id,
        effectiveFromUtc: assignment.effective_from_utc,
        effectiveToUtc: new Date().toISOString(),
      });
      setSuccess('Combo assignment ended');
      await load();
      onAssignmentChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to end assignment');
    }
    setSaving(false);
  };

  const handleEndBodyStyle = async (id: number) => {
    if (!confirm('End this body style assignment by setting effective_to to now?')) return;
    setSaving(true);
    setError('');
    try {
      const assignment = driverBodyStyles.find(dbs => dbs.id === id);
      if (!assignment) return;
      await parityApi.upsertDriverBodyStyle({
        id,
        driverName: assignment.driver_name,
        classIndex: assignment.class_index,
        bodyStyleId: assignment.body_style_id,
        effectiveFromUtc: assignment.effective_from_utc,
        effectiveToUtc: new Date().toISOString(),
      });
      setSuccess('Body style assignment ended');
      await load();
      onAssignmentChanged?.();
    } catch (e: any) {
      setError(e.message || 'Failed to end assignment');
    }
    setSaving(false);
  };


  if (loading) {
    return <div style={S.card}><div style={{ color: 'var(--color-muted)', fontSize: '0.8rem' }}>Loading assignments...</div></div>;
  }

  return (
    <div style={S.card}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
        Assignment Management — {driverName} ({classIndex})
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #ef4444', borderRadius: 4, padding: '0.4rem 0.6rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ background: '#d1fae5', border: '1px solid #10b981', borderRadius: 4, padding: '0.4rem 0.6rem', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#065f46' }}>
          {success}
        </div>
      )}

      <div className="parity-form-row" style={{ alignItems: 'flex-start', gap: '1rem' }}>
        {/* Engine Combo Section */}
        <div>
          <div style={S.sectionTitle}>Engine Combo Assignment</div>
          
          {/* Current Assignment */}
          <div style={S.currentBox}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>CURRENT EFFECTIVE</div>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {currentCombo.engineComboName || '(none)'}
              <span style={S.badge(getSourceBadgeColor(currentCombo.source))}>
                {getSourceLabel(currentCombo.source)}
              </span>
            </div>
            {currentCombo.effectiveFrom && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                From: {formatAssignmentDate(currentCombo.effectiveFrom)}
                {currentCombo.effectiveTo && ` → To: ${formatAssignmentDate(currentCombo.effectiveTo)}`}
              </div>
            )}
            {currentCombo.source === 'override' && currentCombo.driverComboId && !currentCombo.effectiveTo && (
              <button style={{ ...S.btn('secondary'), marginTop: '0.5rem', fontSize: '0.65rem' }}
                onClick={() => handleEndCombo(currentCombo.driverComboId!)}
                disabled={saving}>
                End This Assignment
              </button>
            )}
          </div>

          {/* Add New Assignment */}
          {!editingCombo ? (
            <button style={S.btn('primary')} onClick={() => {
              setEditingCombo(true);
              setNewComboId(engineCombos[0]?.id || 0);
              const now = new Date();
              const utcStr = now.toISOString().slice(0, 19) + 'Z';
              setComboEffectiveFromUtc(utcStr);
            }}>
              + New Assignment
            </button>
          ) : (
            <div className="parity-form-row" style={{ flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div className="parity-form-field">
                <label>Engine Combo</label>
                <select style={S.input} value={newComboId} onChange={e => setNewComboId(Number(e.target.value))}>
                  <option value="">Select...</option>
                  {engineCombos.map(ec => <option key={ec.id} value={ec.id}>{ec.name}</option>)}
                </select>
              </div>
              <div className="parity-form-field">
                <label>Effective From (UTC)</label>
                <input type="text" style={{ ...S.input, fontFamily: 'monospace' }} 
                  value={comboEffectiveFromUtc} 
                  onChange={e => setComboEffectiveFromUtc(e.target.value)}
                  placeholder="2024-01-01T00:00:00Z" />
                <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                  Format: YYYY-MM-DDTHH:MM:SSZ
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button style={S.btn('primary')} onClick={handleSaveCombo} disabled={saving}>
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button style={S.btn('secondary')} onClick={() => setEditingCombo(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* History */}
          {comboHistory.length > 0 && (
            <>
              <div style={{ ...S.sectionTitle, marginTop: '0.75rem' }}>Assignment History</div>
              {comboHistory.map(c => (
                <div key={c.id} style={S.historyItem}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{c.engine_combo_name}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                      {formatAssignmentDate(c.effective_from_utc)}
                      {c.effective_to_utc ? ` → ${formatAssignmentDate(c.effective_to_utc)}` : ' → (open)'}
                    </div>
                  </div>
                  {!c.effective_to_utc && (
                    <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.2rem 0.4rem' }}
                      onClick={() => handleEndCombo(c.id)}
                      disabled={saving}>
                      End
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Body Style Section */}
        {showBodyStyles && (
          <div>
            <div style={S.sectionTitle}>Body Style Assignment</div>
            
            {/* Current Assignment */}
            <div style={S.currentBox}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>CURRENT EFFECTIVE</div>
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {currentBodyStyle?.bodyStyleName || '(none)'}
                {currentBodyStyle && (
                  <span style={S.badge(getSourceBadgeColor(currentBodyStyle.source))}>
                    {getSourceLabel(currentBodyStyle.source)}
                  </span>
                )}
              </div>
              {currentBodyStyle?.effectiveFrom && (
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                  From: {formatAssignmentDate(currentBodyStyle.effectiveFrom)}
                  {currentBodyStyle.effectiveTo && ` → To: ${formatAssignmentDate(currentBodyStyle.effectiveTo)}`}
                </div>
              )}
              {currentBodyStyle?.source === 'override' && currentBodyStyle.driverBodyStyleId && !currentBodyStyle.effectiveTo && (
                <button style={{ ...S.btn('secondary'), marginTop: '0.5rem', fontSize: '0.65rem' }}
                  onClick={() => handleEndBodyStyle(currentBodyStyle.driverBodyStyleId!)}
                  disabled={saving}>
                  End This Assignment
                </button>
              )}
            </div>

            {/* Add New Assignment */}
            {!editingBodyStyle ? (
              <button style={S.btn('primary')} onClick={() => {
                setEditingBodyStyle(true);
                setNewBodyStyleId(bodyStyles[0]?.id || 0);
                const now = new Date();
                const utcStr = now.toISOString().slice(0, 19) + 'Z';
                setBodyStyleEffectiveFromUtc(utcStr);
              }}>
                + New Assignment
              </button>
            ) : (
              <div className="parity-form-row" style={{ flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div className="parity-form-field">
                  <label>Body Style</label>
                  <select style={S.input} value={newBodyStyleId} onChange={e => setNewBodyStyleId(Number(e.target.value))}>
                    <option value="">Select...</option>
                    {bodyStyles.map(bs => <option key={bs.id} value={bs.id}>{bs.name}</option>)}
                  </select>
                </div>
                <div className="parity-form-field">
                  <label>Effective From (UTC)</label>
                  <input type="text" style={{ ...S.input, fontFamily: 'monospace' }} 
                    value={bodyStyleEffectiveFromUtc} 
                    onChange={e => setBodyStyleEffectiveFromUtc(e.target.value)}
                    placeholder="2024-01-01T00:00:00Z" />
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                    Format: YYYY-MM-DDTHH:MM:SSZ
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button style={S.btn('primary')} onClick={handleSaveBodyStyle} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button style={S.btn('secondary')} onClick={() => setEditingBodyStyle(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* History */}
            {bodyStyleHistory.length > 0 && (
              <>
                <div style={{ ...S.sectionTitle, marginTop: '0.75rem' }}>Assignment History</div>
                {bodyStyleHistory.map(bs => (
                  <div key={bs.id} style={S.historyItem}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{bs.body_style_name}</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--color-muted)', fontFamily: 'monospace' }}>
                        {formatAssignmentDate(bs.effective_from_utc)}
                        {bs.effective_to_utc ? ` → ${formatAssignmentDate(bs.effective_to_utc)}` : ' → (open)'}
                      </div>
                    </div>
                    {!bs.effective_to_utc && (
                      <button style={{ ...S.btn('secondary'), fontSize: '0.6rem', padding: '0.2rem 0.4rem' }}
                        onClick={() => handleEndBodyStyle(bs.id)}
                        disabled={saving}>
                        End
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
