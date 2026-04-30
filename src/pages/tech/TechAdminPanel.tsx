/**
 * Tech Admin Panel — Batch 10: Template / Rule / Config / Findings Admin
 * Sub-tabs: Inspection Templates, Teardown Templates, Scale Rules, Fuel Rules,
 *           Required Modules, Findings Resolution
 */

import { useState, useEffect, useCallback } from 'react';
import { techMasterApi } from '../../services/techMasterApi';
import type {
  AdminInspectionTemplate, AdminInspectionTemplateDetail, AdminInspectionTemplateItem,
  AdminTeardownTemplate, AdminTeardownTemplateDetail, AdminTeardownTemplateItem,
  AdminScaleRule, AdminFuelRule,
  RequiredModuleConfig,
  FindingsAggregateItem,
} from '../../services/techMasterApi';

interface Props {
  hasAdmin: boolean;
}

type SubTab = 'insp_templates' | 'td_templates' | 'scale_rules' | 'fuel_rules' | 'req_modules' | 'findings_resolve';

export default function TechAdminPanel({ hasAdmin }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('insp_templates');

  if (!hasAdmin) {
    return <p style={{ color: 'var(--color-text-muted)' }}>Admin access required.</p>;
  }

  const subTabs: { key: SubTab; label: string }[] = [
    { key: 'insp_templates', label: 'Inspection Templates' },
    { key: 'td_templates', label: 'Teardown Templates' },
    { key: 'scale_rules', label: 'Scale Rules' },
    { key: 'fuel_rules', label: 'Fuel Rules' },
    { key: 'req_modules', label: 'Required Modules' },
    { key: 'findings_resolve', label: 'Findings Resolution' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {subTabs.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{
            padding: '0.35rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer',
            border: '1px solid var(--color-border)', borderRadius: 4,
            background: subTab === t.key ? 'var(--color-primary, #1565c0)' : 'white',
            color: subTab === t.key ? 'white' : 'inherit',
            fontWeight: subTab === t.key ? 600 : 400,
          }}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'insp_templates' && <InspectionTemplateAdmin />}
      {subTab === 'td_templates' && <TeardownTemplateAdmin />}
      {subTab === 'scale_rules' && <ScaleRuleAdmin />}
      {subTab === 'fuel_rules' && <FuelRuleAdmin />}
      {subTab === 'req_modules' && <RequiredModulesAdmin />}
      {subTab === 'findings_resolve' && <FindingsResolutionAdmin />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// INSPECTION TEMPLATE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function InspectionTemplateAdmin() {
  const [templates, setTemplates] = useState<AdminInspectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminInspectionTemplateDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    techMasterApi.listInspectionTemplatesAdmin()
      .then(r => { setTemplates(r.templates); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadDetail = (id: number) => {
    setEditId(id); setDetail(null);
    techMasterApi.getInspectionTemplateAdmin(id)
      .then(r => setDetail(r.template))
      .catch(e => setError(e.message));
  };

  const toggle = (id: number, active: boolean) => {
    techMasterApi.toggleInspectionTemplate(id, active).then(() => load()).catch(e => setError(e.message));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Inspection Templates ({templates.length})</h4>
        <button onClick={() => { setShowCreate(true); setEditId(null); setDetail(null); }} style={btnPrimary}>+ New Template</button>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.75rem' }}>
          <table style={tblStyle}>
            <thead><tr>
              <th style={thS}>Label</th><th style={thS}>Type</th><th style={thS}>Category/Class</th><th style={thS}>Items</th><th style={thS}>Active</th><th style={thS}></th>
            </tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} style={{ background: t.is_active ? undefined : '#f5f5f5' }}>
                  <td style={tdS}><strong>{t.label}</strong></td>
                  <td style={tdS}>{t.template_type}</td>
                  <td style={tdS}>{t.category}/{t.class_index}</td>
                  <td style={tdS}>{t.item_count}</td>
                  <td style={tdS}>{t.is_active ? <span style={{ color: '#2e7d32' }}>Yes</span> : <span style={{ color: '#9e9e9e' }}>No</span>}</td>
                  <td style={tdS}>
                    <button onClick={() => loadDetail(t.id)} style={btnSm}>Edit</button>{' '}
                    <button onClick={() => toggle(t.id, !t.is_active)} style={btnSm}>{t.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(showCreate || editId) && <InspectionTemplateForm template={detail} onDone={() => { setShowCreate(false); setEditId(null); setDetail(null); load(); }} onCancel={() => { setShowCreate(false); setEditId(null); setDetail(null); }} />}
    </div>
  );
}

function InspectionTemplateForm({ template, onDone, onCancel }: { template: AdminInspectionTemplateDetail | null; onDone: () => void; onCancel: () => void }) {
  const [label, setLabel] = useState(template?.label || '');
  const [category, setCategory] = useState(template?.category || '*');
  const [classIndex, setClassIndex] = useState(template?.class_index || '*');
  const [templateType, setTemplateType] = useState(template?.template_type || 'general_tech');
  const [description, setDescription] = useState(template?.description || '');
  const [items, setItems] = useState<Partial<AdminInspectionTemplateItem>[]>(template?.items || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await techMasterApi.upsertInspectionTemplateAdmin({
        id: template?.id, template_type: templateType, category, class_index: classIndex,
        label, description: description || undefined,
      });
      if (items.length > 0) {
        await techMasterApi.saveInspectionTemplateItems(res.id, items.map((it, i) => ({
          item_type: it.item_type || 'checkbox', label: it.label || `Item ${i + 1}`,
          sort_order: it.sort_order ?? (i + 1), is_required: it.is_required ?? 1,
          spec_min: it.spec_min ? Number(it.spec_min) : undefined,
          spec_max: it.spec_max ? Number(it.spec_max) : undefined,
          spec_unit: it.spec_unit || undefined, expected_value: it.expected_value || undefined,
        })));
      }
      onDone();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const addItem = () => setItems([...items, { item_type: 'checkbox', label: '', sort_order: items.length + 1, is_required: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => {
    const copy = [...items]; copy[i] = { ...copy[i], [field]: value }; setItems(copy);
  };

  return (
    <div style={formBox}>
      <h5 style={{ margin: '0 0 0.5rem' }}>{template ? 'Edit' : 'New'} Inspection Template</h5>
      {error && <p style={errStyle}>{error}</p>}
      <div style={formGrid}>
        <label style={fLabel}>Label<input value={label} onChange={e => setLabel(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Type<select value={templateType} onChange={e => setTemplateType(e.target.value)} style={fInput}>
          <option value="general_tech">General Tech</option><option value="body">Body</option><option value="chassis">Chassis</option>
        </select></label>
        <label style={fLabel}>Category<input value={category} onChange={e => setCategory(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Class<input value={classIndex} onChange={e => setClassIndex(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Description<input value={description} onChange={e => setDescription(e.target.value)} style={fInput} /></label>
      </div>
      <h6 style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.8rem' }}>Items ({items.length})</h6>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={it.label || ''} onChange={e => updateItem(i, 'label', e.target.value)} placeholder="Label" style={{ ...fInput, flex: 2, minWidth: 140 }} />
          <select value={it.item_type || 'checkbox'} onChange={e => updateItem(i, 'item_type', e.target.value)} style={{ ...fInput, flex: 1, minWidth: 90 }}>
            <option value="checkbox">Checkbox</option><option value="measurement">Measurement</option><option value="note">Note</option>
          </select>
          <label style={{ fontSize: '0.7rem' }}><input type="checkbox" checked={!!it.is_required} onChange={e => updateItem(i, 'is_required', e.target.checked ? 1 : 0)} /> Req</label>
          {it.item_type === 'measurement' && <>
            <input value={it.spec_min || ''} onChange={e => updateItem(i, 'spec_min', e.target.value)} placeholder="Min" style={{ ...fInput, width: 60 }} />
            <input value={it.spec_max || ''} onChange={e => updateItem(i, 'spec_max', e.target.value)} placeholder="Max" style={{ ...fInput, width: 60 }} />
            <input value={it.spec_unit || ''} onChange={e => updateItem(i, 'spec_unit', e.target.value)} placeholder="Unit" style={{ ...fInput, width: 50 }} />
          </>}
          <button onClick={() => removeItem(i)} style={{ ...btnSm, color: '#c62828' }}>X</button>
        </div>
      ))}
      <button onClick={addItem} style={{ ...btnSm, marginTop: '0.25rem' }}>+ Add Item</button>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving || !label} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={btnSm}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEARDOWN TEMPLATE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function TeardownTemplateAdmin() {
  const [templates, setTemplates] = useState<AdminTeardownTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminTeardownTemplateDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    techMasterApi.listTeardownTemplatesAdmin()
      .then(r => { setTemplates(r.templates); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const loadDetail = (id: number) => {
    setEditId(id); setDetail(null);
    techMasterApi.getTeardownTemplateAdmin(id)
      .then(r => setDetail(r.template))
      .catch(e => setError(e.message));
  };

  const toggle = (id: number, active: boolean) => {
    techMasterApi.toggleTeardownTemplate(id, active).then(() => load()).catch(e => setError(e.message));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Teardown Templates ({templates.length})</h4>
        <button onClick={() => { setShowCreate(true); setEditId(null); setDetail(null); }} style={btnPrimary}>+ New Template</button>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.75rem' }}>
          <table style={tblStyle}>
            <thead><tr>
              <th style={thS}>Label</th><th style={thS}>Category/Class</th><th style={thS}>Items</th><th style={thS}>Active</th><th style={thS}></th>
            </tr></thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id} style={{ background: t.is_active ? undefined : '#f5f5f5' }}>
                  <td style={tdS}><strong>{t.label}</strong></td>
                  <td style={tdS}>{t.category}/{t.class_index}</td>
                  <td style={tdS}>{t.item_count}</td>
                  <td style={tdS}>{t.is_active ? <span style={{ color: '#2e7d32' }}>Yes</span> : <span style={{ color: '#9e9e9e' }}>No</span>}</td>
                  <td style={tdS}>
                    <button onClick={() => loadDetail(t.id)} style={btnSm}>Edit</button>{' '}
                    <button onClick={() => toggle(t.id, !t.is_active)} style={btnSm}>{t.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(showCreate || editId) && <TeardownTemplateForm template={detail} onDone={() => { setShowCreate(false); setEditId(null); setDetail(null); load(); }} onCancel={() => { setShowCreate(false); setEditId(null); setDetail(null); }} />}
    </div>
  );
}

function TeardownTemplateForm({ template, onDone, onCancel }: { template: AdminTeardownTemplateDetail | null; onDone: () => void; onCancel: () => void }) {
  const [label, setLabel] = useState(template?.label || '');
  const [category, setCategory] = useState(template?.category || '');
  const [classIndex, setClassIndex] = useState(template?.class_index || '');
  const [description, setDescription] = useState(template?.description || '');
  const [items, setItems] = useState<Partial<AdminTeardownTemplateItem>[]>(template?.items || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      const res = await techMasterApi.upsertTeardownTemplate({
        id: template?.id, category, class_index: classIndex,
        label, description: description || undefined,
      });
      if (items.length > 0) {
        await techMasterApi.saveTeardownTemplateItems(res.id, items.map((it, i) => ({
          item_category: it.item_category || 'General', item_label: it.item_label || `Item ${i + 1}`,
          item_type: it.item_type || 'visual_check', description: it.description || undefined,
          sort_order: it.sort_order ?? (i + 1), is_required: it.is_required ?? 1,
          spec_min: it.spec_min ? Number(it.spec_min) : undefined,
          spec_max: it.spec_max ? Number(it.spec_max) : undefined,
          spec_unit: it.spec_unit || undefined, declaration_key: it.declaration_key || undefined,
        })));
      }
      onDone();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  const addItem = () => setItems([...items, { item_category: 'General', item_label: '', item_type: 'visual_check', sort_order: items.length + 1, is_required: 1 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, value: string | number) => {
    const copy = [...items]; copy[i] = { ...copy[i], [field]: value }; setItems(copy);
  };

  return (
    <div style={formBox}>
      <h5 style={{ margin: '0 0 0.5rem' }}>{template ? 'Edit' : 'New'} Teardown Template</h5>
      {error && <p style={errStyle}>{error}</p>}
      <div style={formGrid}>
        <label style={fLabel}>Label<input value={label} onChange={e => setLabel(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Category<input value={category} onChange={e => setCategory(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Class<input value={classIndex} onChange={e => setClassIndex(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Description<input value={description} onChange={e => setDescription(e.target.value)} style={fInput} /></label>
      </div>
      <h6 style={{ margin: '0.75rem 0 0.25rem', fontSize: '0.8rem' }}>Items ({items.length})</h6>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input value={it.item_category || ''} onChange={e => updateItem(i, 'item_category', e.target.value)} placeholder="Category" style={{ ...fInput, width: 90 }} />
          <input value={it.item_label || ''} onChange={e => updateItem(i, 'item_label', e.target.value)} placeholder="Label" style={{ ...fInput, flex: 2, minWidth: 120 }} />
          <select value={it.item_type || 'visual_check'} onChange={e => updateItem(i, 'item_type', e.target.value)} style={{ ...fInput, flex: 1, minWidth: 100 }}>
            <option value="serial_check">Serial Check</option><option value="measurement">Measurement</option>
            <option value="visual_check">Visual Check</option><option value="note">Note</option>
          </select>
          <label style={{ fontSize: '0.7rem' }}><input type="checkbox" checked={!!it.is_required} onChange={e => updateItem(i, 'is_required', e.target.checked ? 1 : 0)} /> Req</label>
          {it.item_type === 'measurement' && <>
            <input value={it.spec_min || ''} onChange={e => updateItem(i, 'spec_min', e.target.value)} placeholder="Min" style={{ ...fInput, width: 60 }} />
            <input value={it.spec_max || ''} onChange={e => updateItem(i, 'spec_max', e.target.value)} placeholder="Max" style={{ ...fInput, width: 60 }} />
            <input value={it.spec_unit || ''} onChange={e => updateItem(i, 'spec_unit', e.target.value)} placeholder="Unit" style={{ ...fInput, width: 50 }} />
          </>}
          <input value={it.declaration_key || ''} onChange={e => updateItem(i, 'declaration_key', e.target.value)} placeholder="Decl. key" style={{ ...fInput, width: 80 }} />
          <button onClick={() => removeItem(i)} style={{ ...btnSm, color: '#c62828' }}>X</button>
        </div>
      ))}
      <button onClick={addItem} style={{ ...btnSm, marginTop: '0.25rem' }}>+ Add Item</button>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving || !label || !category || !classIndex} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={btnSm}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCALE RULE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function ScaleRuleAdmin() {
  const [rules, setRules] = useState<AdminScaleRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminScaleRule | 'new' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    techMasterApi.listScaleRulesAdmin()
      .then(r => { setRules(r.rules); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: number, active: boolean) => {
    techMasterApi.toggleScaleRule(id, active).then(() => load()).catch(e => setError(e.message));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Scale Rules ({rules.length})</h4>
        <button onClick={() => setEditing('new')} style={btnPrimary}>+ New Rule</button>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.75rem' }}>
          <table style={tblStyle}>
            <thead><tr>
              <th style={thS}>Category/Class</th><th style={thS}>Season</th><th style={thS}>Min Weight</th><th style={thS}>Min Rear</th><th style={thS}>Active</th><th style={thS}></th>
            </tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ background: r.is_active ? undefined : '#f5f5f5' }}>
                  <td style={tdS}><strong>{r.category}/{r.class_index}</strong></td>
                  <td style={tdS}>{r.season_year || '—'}</td>
                  <td style={tdS}>{r.min_total_weight ? `${r.min_total_weight} lbs` : '—'}</td>
                  <td style={tdS}>{r.min_rear_axle_weight ? `${r.min_rear_axle_weight} lbs` : '—'}</td>
                  <td style={tdS}>{r.is_active ? <span style={{ color: '#2e7d32' }}>Yes</span> : <span style={{ color: '#9e9e9e' }}>No</span>}</td>
                  <td style={tdS}>
                    <button onClick={() => setEditing(r)} style={btnSm}>Edit</button>{' '}
                    <button onClick={() => toggle(r.id, !r.is_active)} style={btnSm}>{r.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <ScaleRuleForm rule={editing === 'new' ? null : editing} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function ScaleRuleForm({ rule, onDone, onCancel }: { rule: AdminScaleRule | null; onDone: () => void; onCancel: () => void }) {
  const [category, setCategory] = useState(rule?.category || '');
  const [classIndex, setClassIndex] = useState(rule?.class_index || '');
  const [seasonYear, setSeasonYear] = useState(rule?.season_year?.toString() || '');
  const [minTotal, setMinTotal] = useState(rule?.min_total_weight || '');
  const [minRear, setMinRear] = useState(rule?.min_rear_axle_weight || '');
  const [rearReq, setRearReq] = useState(!!rule?.rear_axle_required);
  const [driverReq, setDriverReq] = useState(!!rule?.driver_weigh_required);
  const [notes, setNotes] = useState(rule?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await techMasterApi.upsertScaleRuleAdmin({
        id: rule?.id, category, class_index: classIndex,
        season_year: seasonYear ? Number(seasonYear) : undefined,
        min_total_weight: minTotal ? Number(minTotal) : undefined,
        min_rear_axle_weight: minRear ? Number(minRear) : undefined,
        rear_axle_required: rearReq ? 1 : 0, driver_weigh_required: driverReq ? 1 : 0,
        notes: notes || undefined,
      });
      onDone();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={formBox}>
      <h5 style={{ margin: '0 0 0.5rem' }}>{rule ? 'Edit' : 'New'} Scale Rule</h5>
      {error && <p style={errStyle}>{error}</p>}
      <div style={formGrid}>
        <label style={fLabel}>Category<input value={category} onChange={e => setCategory(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Class<input value={classIndex} onChange={e => setClassIndex(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Season Year<input value={seasonYear} onChange={e => setSeasonYear(e.target.value)} style={fInput} placeholder="optional" /></label>
        <label style={fLabel}>Min Total Weight (lbs)<input value={minTotal} onChange={e => setMinTotal(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Min Rear Axle (lbs)<input value={minRear} onChange={e => setMinRear(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Notes<input value={notes} onChange={e => setNotes(e.target.value)} style={fInput} /></label>
      </div>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={rearReq} onChange={e => setRearReq(e.target.checked)} /> Rear axle required</label>
        <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={driverReq} onChange={e => setDriverReq(e.target.checked)} /> Driver weigh required</label>
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving || !category || !classIndex} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={btnSm}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FUEL RULE ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function FuelRuleAdmin() {
  const [rules, setRules] = useState<AdminFuelRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminFuelRule | 'new' | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    techMasterApi.listFuelRulesAdmin()
      .then(r => { setRules(r.rules); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id: number, active: boolean) => {
    techMasterApi.toggleFuelRule(id, active).then(() => load()).catch(e => setError(e.message));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Fuel Rules ({rules.length})</h4>
        <button onClick={() => setEditing('new')} style={btnPrimary}>+ New Rule</button>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : (
        <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4, marginBottom: '0.75rem' }}>
          <table style={tblStyle}>
            <thead><tr>
              <th style={thS}>Category/Class</th><th style={thS}>Season</th><th style={thS}>Fuel Type</th><th style={thS}>SG Range</th><th style={thS}>Diel. Range</th><th style={thS}>Active</th><th style={thS}></th>
            </tr></thead>
            <tbody>
              {rules.map(r => (
                <tr key={r.id} style={{ background: r.is_active ? undefined : '#f5f5f5' }}>
                  <td style={tdS}><strong>{r.category}/{r.class_index}</strong></td>
                  <td style={tdS}>{r.season_year || '—'}</td>
                  <td style={tdS}>{r.fuel_type_required || '—'}</td>
                  <td style={tdS}>{r.sg_min && r.sg_max ? `${r.sg_min}–${r.sg_max}` : '—'}</td>
                  <td style={tdS}>{r.dielectric_min && r.dielectric_max ? `${r.dielectric_min}–${r.dielectric_max}` : '—'}</td>
                  <td style={tdS}>{r.is_active ? <span style={{ color: '#2e7d32' }}>Yes</span> : <span style={{ color: '#9e9e9e' }}>No</span>}</td>
                  <td style={tdS}>
                    <button onClick={() => setEditing(r)} style={btnSm}>Edit</button>{' '}
                    <button onClick={() => toggle(r.id, !r.is_active)} style={btnSm}>{r.is_active ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && <FuelRuleForm rule={editing === 'new' ? null : editing} onDone={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />}
    </div>
  );
}

function FuelRuleForm({ rule, onDone, onCancel }: { rule: AdminFuelRule | null; onDone: () => void; onCancel: () => void }) {
  const [category, setCategory] = useState(rule?.category || '');
  const [classIndex, setClassIndex] = useState(rule?.class_index || '');
  const [seasonYear, setSeasonYear] = useState(rule?.season_year?.toString() || '');
  const [fuelType, setFuelType] = useState(rule?.fuel_type_required || '');
  const [sgMin, setSgMin] = useState(rule?.sg_min || '');
  const [sgMax, setSgMax] = useState(rule?.sg_max || '');
  const [dielMin, setDielMin] = useState(rule?.dielectric_min || '');
  const [dielMax, setDielMax] = useState(rule?.dielectric_max || '');
  const [tempComp, setTempComp] = useState(!!rule?.temperature_compensate);
  const [notes, setNotes] = useState(rule?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true); setError('');
    try {
      await techMasterApi.upsertFuelRuleAdmin({
        id: rule?.id, category, class_index: classIndex,
        season_year: seasonYear ? Number(seasonYear) : undefined,
        fuel_type_required: fuelType || undefined,
        sg_min: sgMin ? Number(sgMin) : undefined, sg_max: sgMax ? Number(sgMax) : undefined,
        dielectric_min: dielMin ? Number(dielMin) : undefined, dielectric_max: dielMax ? Number(dielMax) : undefined,
        temperature_compensate: tempComp ? 1 : 0,
        notes: notes || undefined,
      });
      onDone();
    } catch (e: any) { setError(e.message); setSaving(false); }
  };

  return (
    <div style={formBox}>
      <h5 style={{ margin: '0 0 0.5rem' }}>{rule ? 'Edit' : 'New'} Fuel Rule</h5>
      {error && <p style={errStyle}>{error}</p>}
      <div style={formGrid}>
        <label style={fLabel}>Category<input value={category} onChange={e => setCategory(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Class<input value={classIndex} onChange={e => setClassIndex(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Season Year<input value={seasonYear} onChange={e => setSeasonYear(e.target.value)} style={fInput} placeholder="optional" /></label>
        <label style={fLabel}>Fuel Type<select value={fuelType} onChange={e => setFuelType(e.target.value)} style={fInput}>
          <option value="">— any —</option>
          <option value="nitromethane">Nitromethane</option><option value="methanol">Methanol</option>
          <option value="gasoline">Gasoline</option><option value="diesel">Diesel</option>
          <option value="e85">E85</option><option value="other">Other</option>
        </select></label>
        <label style={fLabel}>SG Min<input value={sgMin} onChange={e => setSgMin(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>SG Max<input value={sgMax} onChange={e => setSgMax(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Dielectric Min<input value={dielMin} onChange={e => setDielMin(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Dielectric Max<input value={dielMax} onChange={e => setDielMax(e.target.value)} style={fInput} /></label>
        <label style={fLabel}>Notes<input value={notes} onChange={e => setNotes(e.target.value)} style={fInput} /></label>
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <label style={{ fontSize: '0.75rem' }}><input type="checkbox" checked={tempComp} onChange={e => setTempComp(e.target.checked)} /> Temperature compensate</label>
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button onClick={save} disabled={saving || !category || !classIndex} style={btnPrimary}>{saving ? 'Saving...' : 'Save'}</button>
        <button onClick={onCancel} style={btnSm}>Cancel</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// REQUIRED MODULES CONFIG ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function RequiredModulesAdmin() {
  const [configs, setConfigs] = useState<RequiredModuleConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addCat, setAddCat] = useState('');
  const [addClass, setAddClass] = useState('*');
  const [addModule, setAddModule] = useState('scale');
  const [addContext, setAddContext] = useState('pre_race');

  const load = useCallback(() => {
    setLoading(true);
    techMasterApi.listRequiredModules()
      .then(r => { setConfigs(r.configs); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const addConfig = async () => {
    if (!addCat) return;
    try {
      await techMasterApi.upsertRequiredModule({ category: addCat, class_index: addClass, module_key: addModule, context: addContext });
      setShowAdd(false); setAddCat(''); load();
    } catch (e: any) { setError(e.message); }
  };

  const remove = async (id: number) => {
    try { await techMasterApi.deleteRequiredModule(id); load(); } catch (e: any) { setError(e.message); }
  };

  // Group by category/class
  const grouped: Record<string, RequiredModuleConfig[]> = {};
  configs.forEach(c => {
    const key = `${c.category}/${c.class_index}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Required Module Config ({configs.length})</h4>
        <button onClick={() => setShowAdd(true)} style={btnPrimary}>+ Add Requirement</button>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : (
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {Object.entries(grouped).map(([key, items]) => (
            <div key={key} style={{ marginBottom: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 4, padding: '0.5rem' }}>
              <h5 style={{ margin: '0 0 0.25rem', fontSize: '0.8rem' }}>{key}</h5>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {items.map(c => (
                  <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.5rem', borderRadius: 3, background: '#e3f2fd', fontSize: '0.75rem' }}>
                    <strong>{c.module_key}</strong>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>({c.context})</span>
                    <button onClick={() => remove(c.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c62828', fontSize: '0.7rem', padding: 0 }}>x</button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p style={mutedStyle}>No required-module configs yet.</p>}
        </div>
      )}
      {showAdd && (
        <div style={formBox}>
          <h5 style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>Add Required Module</h5>
          <div style={formGrid}>
            <label style={fLabel}>Category<input value={addCat} onChange={e => setAddCat(e.target.value)} style={fInput} placeholder="e.g. TOP FUEL" /></label>
            <label style={fLabel}>Class<input value={addClass} onChange={e => setAddClass(e.target.value)} style={fInput} placeholder="e.g. TF or *" /></label>
            <label style={fLabel}>Module<select value={addModule} onChange={e => setAddModule(e.target.value)} style={fInput}>
              <option value="scale">Scale</option><option value="fuel">Fuel</option>
              <option value="inspection">Inspection</option><option value="techcard">Tech Card</option>
              <option value="teardown">Teardown</option>
            </select></label>
            <label style={fLabel}>Context<select value={addContext} onChange={e => setAddContext(e.target.value)} style={fInput}>
              <option value="pre_race">Pre-race</option><option value="post_race">Post-race</option>
              <option value="qualifying">Qualifying</option><option value="eliminations">Eliminations</option>
            </select></label>
          </div>
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={addConfig} disabled={!addCat} style={btnPrimary}>Add</button>
            <button onClick={() => setShowAdd(false)} style={btnSm}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FINDINGS RESOLUTION ADMIN
// ═══════════════════════════════════════════════════════════════════════════

function FindingsResolutionAdmin() {
  const [eventId, setEventId] = useState<number | null>(null);
  const [events, setEvents] = useState<{ id: number; name: string; start_date_local: string }[]>([]);
  const [findings, setFindings] = useState<FindingsAggregateItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolveDisp, setResolveDisp] = useState('resolved');
  const [resolveNotes, setResolveNotes] = useState('');

  useEffect(() => {
    techMasterApi.listEvents({ limit: 100 }).then(r => setEvents(r.events)).catch(() => {});
  }, []);

  const loadFindings = useCallback(() => {
    if (!eventId) { setFindings([]); return; }
    setLoading(true); setError('');
    techMasterApi.getFindingsAggregate({ eventInstanceId: eventId, status: 'open', limit: 200 })
      .then(r => { setFindings(r.findings); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [eventId]);
  useEffect(() => { loadFindings(); }, [loadFindings]);

  const resolve = async (findingId: number) => {
    try {
      await techMasterApi.resolveFinding(findingId, resolveDisp, resolveNotes || undefined);
      setResolvingId(null); setResolveNotes(''); loadFindings();
    } catch (e: any) { setError(e.message); }
  };

  return (
    <div>
      <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.9rem' }}>Findings Resolution — Open Findings</h4>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Event</label>
        <select value={eventId ?? ''} onChange={e => setEventId(e.target.value ? Number(e.target.value) : null)} style={{ ...fInput, minWidth: 280 }}>
          <option value="">— Select event —</option>
          {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name} ({ev.start_date_local})</option>)}
        </select>
      </div>
      {error && <p style={errStyle}>{error}</p>}
      {loading ? <p style={mutedStyle}>Loading...</p> : findings.length === 0 && eventId ? (
        <p style={mutedStyle}>No open findings for this event.</p>
      ) : (
        <div style={{ maxHeight: 500, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 4 }}>
          <table style={tblStyle}>
            <thead><tr>
              <th style={thS}>#</th><th style={thS}>Driver</th><th style={thS}>Module</th><th style={thS}>Severity</th>
              <th style={thS}>Description</th><th style={thS}>Measured</th><th style={thS}>Expected</th><th style={thS}></th>
            </tr></thead>
            <tbody>
              {findings.map(f => (
                <>
                  <tr key={f.id}>
                    <td style={tdS}><strong>{f.competition_number || '—'}</strong></td>
                    <td style={tdS}>{f.person_name || '—'}</td>
                    <td style={tdS}><span style={{ fontSize: '0.65rem', background: '#f3e5f5', color: '#7b1fa2', padding: '1px 5px', borderRadius: 2 }}>{f.case_type.replace(/_/g, ' ')}</span></td>
                    <td style={tdS}><span style={sevBadge(f.severity)}>{f.severity}</span></td>
                    <td style={{ ...tdS, maxWidth: 250 }}>{f.description}</td>
                    <td style={tdS}>{f.measured_value || '—'}</td>
                    <td style={tdS}>{f.expected_value || '—'}</td>
                    <td style={tdS}>
                      {resolvingId === f.id ? (
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <select value={resolveDisp} onChange={e => setResolveDisp(e.target.value)} style={{ ...fInput, width: 100 }}>
                            <option value="resolved">Resolved</option><option value="deferred">Deferred</option>
                            <option value="penalized">Penalized</option><option value="waived">Waived</option>
                          </select>
                          <input value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Notes..." style={{ ...fInput, width: 120 }} />
                          <button onClick={() => resolve(f.id)} style={btnPrimary}>Go</button>
                          <button onClick={() => setResolvingId(null)} style={btnSm}>X</button>
                        </div>
                      ) : (
                        <button onClick={() => { setResolvingId(f.id); setResolveDisp('resolved'); setResolveNotes(''); }} style={btnSm}>Resolve</button>
                      )}
                    </td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {findings.length > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.35rem' }}>{findings.length} open finding{findings.length !== 1 ? 's' : ''}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════════════════════════════════

function sevBadge(s: string): React.CSSProperties {
  const m: Record<string, { bg: string; fg: string }> = {
    critical: { bg: '#b71c1c', fg: 'white' }, high: { bg: '#ffebee', fg: '#c62828' },
    medium: { bg: '#fff8e1', fg: '#f57f17' }, low: { bg: '#e3f2fd', fg: '#1565c0' }, info: { bg: '#f5f5f5', fg: '#757575' },
  };
  const c = m[s] || m.info;
  return { padding: '1px 6px', borderRadius: 3, fontSize: '0.65rem', fontWeight: 600, background: c.bg, color: c.fg };
}

const tblStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' };
const thS: React.CSSProperties = { textAlign: 'left', padding: '0.35rem 0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.7rem', color: 'var(--color-text-muted)', position: 'sticky' as const, top: 0, background: 'white', whiteSpace: 'nowrap' as const };
const tdS: React.CSSProperties = { padding: '0.3rem 0.5rem', borderBottom: '1px solid var(--color-border-light, #eee)' };
const btnPrimary: React.CSSProperties = { padding: '0.3rem 0.75rem', fontSize: '0.75rem', cursor: 'pointer', border: 'none', borderRadius: 4, background: 'var(--color-primary, #1565c0)', color: 'white', fontWeight: 500 };
const btnSm: React.CSSProperties = { padding: '0.2rem 0.5rem', fontSize: '0.7rem', cursor: 'pointer', border: '1px solid var(--color-border)', borderRadius: 3, background: 'white' };
const errStyle: React.CSSProperties = { color: 'var(--color-error)', fontSize: '0.8rem' };
const mutedStyle: React.CSSProperties = { color: 'var(--color-text-muted)', fontSize: '0.8rem' };
const formBox: React.CSSProperties = { border: '1px solid var(--color-border)', borderRadius: 6, padding: '0.75rem', background: '#fafafa', marginBottom: '0.75rem' };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' };
const fLabel: React.CSSProperties = { display: 'flex', flexDirection: 'column', fontSize: '0.7rem', color: 'var(--color-text-muted)', gap: '0.15rem' };
const fInput: React.CSSProperties = { padding: '0.3rem 0.4rem', fontSize: '0.8rem', borderRadius: 3, border: '1px solid var(--color-border)' };
