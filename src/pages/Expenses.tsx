/**
 * Expense Tracking Page
 * Log and analyze racing expenses by category
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import Page from '../shared/components/Page';
import { expensesStorage } from '../state/teamManagement';
import { loadVehicles, type VehicleLite } from '../state/vehicles';
import {
  type Expense,
  type ExpenseCategory,
  EXPENSE_CATEGORY_LABELS,
  createExpense,
} from '../domain/schemas/teamManagement.schema';

interface ExpensesProps {
  embedded?: boolean;
}

function Expenses({ embedded = false }: ExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | 'all'>('all');
  const [filterVehicle, setFilterVehicle] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
  
  // Editor state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Expense>>({});

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [expensesData, vehiclesData] = await Promise.all([
          expensesStorage.getAll(),
          loadVehicles(),
        ]);
        setExpenses(expensesData);
        setVehicles(vehiclesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      if (filterCategory !== 'all' && expense.category !== filterCategory) return false;
      if (filterVehicle !== 'all' && expense.vehicleId !== filterVehicle) return false;
      const expenseYear = new Date(expense.date).getFullYear();
      if (expenseYear !== filterYear) return false;
      return true;
    }).sort((a, b) => b.date - a.date);
  }, [expenses, filterCategory, filterVehicle, filterYear]);

  // Stats by category
  const categoryStats = useMemo(() => {
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === filterYear);
    const byCategory: Record<string, number> = {};
    
    yearExpenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
    });
    
    const total = Object.values(byCategory).reduce((sum, amt) => sum + amt, 0);
    
    return { byCategory, total };
  }, [expenses, filterYear]);

  // Monthly trend
  const monthlyTrend = useMemo(() => {
    const yearExpenses = expenses.filter(e => new Date(e.date).getFullYear() === filterYear);
    const byMonth: number[] = new Array(12).fill(0);
    
    yearExpenses.forEach(e => {
      const month = new Date(e.date).getMonth();
      byMonth[month] += e.amount;
    });
    
    return byMonth;
  }, [expenses, filterYear]);

  // Handlers
  const handleCreate = useCallback(() => {
    setFormData({
      description: '',
      category: 'parts',
      amount: 0,
      date: Date.now(),
    });
    setEditingExpense(null);
    setIsCreating(true);
    setShowEditor(true);
  }, []);

  const handleEdit = useCallback((expense: Expense) => {
    setFormData({ ...expense });
    setEditingExpense(expense);
    setIsCreating(false);
    setShowEditor(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.description || !formData.category || formData.amount === undefined) {
      alert('Please fill in required fields');
      return;
    }

    try {
      const expenseData = isCreating
        ? createExpense({
            description: formData.description,
            category: formData.category as ExpenseCategory,
            amount: formData.amount,
            date: formData.date || Date.now(),
            vendor: formData.vendor,
            vehicleId: formData.vehicleId,
            paymentMethod: formData.paymentMethod,
            taxDeductible: formData.taxDeductible,
            notes: formData.notes,
          })
        : { ...editingExpense!, ...formData, updatedAt: Date.now() };

      await expensesStorage.save(expenseData as Expense);
      
      const updatedExpenses = await expensesStorage.getAll();
      setExpenses(updatedExpenses);
      setShowEditor(false);
    } catch (error) {
      console.error('Failed to save expense:', error);
      alert('Failed to save expense');
    }
  }, [formData, isCreating, editingExpense]);

  const handleDelete = useCallback(async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await expensesStorage.delete(expenseId);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    } catch (error) {
      console.error('Failed to delete expense:', error);
      alert('Failed to delete expense');
    }
  }, []);

  const getVehicleName = useCallback((vehicleId?: string) => {
    if (!vehicleId) return '';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle?.name || '';
  }, [vehicles]);

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
      'parts': '#3b82f6',
      'maintenance': '#f59e0b',
      'entry-fees': '#10b981',
      'travel-fuel': '#ef4444',
      'travel-lodging': '#8b5cf6',
      'travel-food': '#ec4899',
      'travel-other': '#6366f1',
      'insurance': '#14b8a6',
      'memberships': '#f97316',
      'marketing': '#06b6d4',
      'tools': '#84cc16',
      'misc': '#6b7280',
    };
    return colors[category] || '#6b7280';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 1, currentYear, currentYear + 1];
  }, []);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    const loadingContent = (
      <div className="text-center" style={{ padding: '4rem' }}>
        <p>Loading expenses...</p>
      </div>
    );
    return embedded ? loadingContent : <Page title="Expenses">{loadingContent}</Page>;
  }

  const content = (
    <>
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Total */}
        <div className="card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444' }}>
            ${categoryStats.total.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{filterYear} Total Expenses</div>
        </div>
        
        {/* By Category Chart */}
        <div className="card col-span-2" style={{ padding: '16px' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>Spending by Category</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(categoryStats.byCategory)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([category, amount]) => (
                <div key={category} style={{
                  flex: '1 1 calc(33% - 8px)',
                  minWidth: '100px',
                  padding: '8px',
                  borderRadius: '6px',
                  backgroundColor: `${getCategoryColor(category as ExpenseCategory)}15`,
                  borderLeft: `3px solid ${getCategoryColor(category as ExpenseCategory)}`,
                }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {EXPENSE_CATEGORY_LABELS[category as ExpenseCategory]}
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: getCategoryColor(category as ExpenseCategory) }}>
                    ${amount.toLocaleString()}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="card mb-6" style={{ padding: '16px' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>Monthly Spending</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px' }}>
          {monthlyTrend.map((amount, idx) => {
            const maxAmount = Math.max(...monthlyTrend, 1);
            const height = (amount / maxAmount) * 100;
            const isCurrentMonth = idx === new Date().getMonth() && filterYear === new Date().getFullYear();
            return (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: '100%',
                  height: `${height}%`,
                  minHeight: '2px',
                  backgroundColor: isCurrentMonth ? 'var(--color-accent)' : 'var(--color-border)',
                  borderRadius: '2px 2px 0 0',
                  transition: 'height 0.3s',
                }} />
                <div style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  {months[idx]}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toolbar */}
      <div className="card mb-4" style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Year Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterYear}
            onChange={(e) => setFilterYear(parseInt(e.target.value))}
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          {/* Category Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | 'all')}
          >
            <option value="all">All Categories</option>
            {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          
          {/* Vehicle Filter */}
          <select
            className="input"
            style={{ width: 'auto' }}
            value={filterVehicle}
            onChange={(e) => setFilterVehicle(e.target.value)}
          >
            <option value="all">All Vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          
          <div style={{ flex: 1 }} />
          
          {/* Add Button */}
          <button className="btn" onClick={handleCreate}>
            + Add Expense
          </button>
        </div>
      </div>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            {expenses.length === 0 ? 'No expenses recorded yet.' : 'No expenses match your filters.'}
          </p>
          {expenses.length === 0 && (
            <button className="btn" onClick={handleCreate}>+ Add First Expense</button>
          )}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '10px 12px', textAlign: 'left' }}>Vehicle</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map(expense => (
                <tr key={expense.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    {formatDate(expense.date)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 500 }}>{expense.description}</div>
                    {expense.vendor && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {expense.vendor}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: `${getCategoryColor(expense.category)}20`,
                      color: getCategoryColor(expense.category),
                    }}>
                      {EXPENSE_CATEGORY_LABELS[expense.category]}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {getVehicleName(expense.vehicleId) || '—'}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                    ${expense.amount.toLocaleString()}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleEdit(expense)}
                      style={{ marginRight: '4px' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-small btn-secondary"
                      onClick={() => handleDelete(expense.id)}
                      style={{ color: '#ef4444' }}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ backgroundColor: 'var(--color-surface)' }}>
                <td colSpan={4} style={{ padding: '10px 12px', fontWeight: 600 }}>Total</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#ef4444' }}>
                  ${filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>{isCreating ? 'Add Expense' : 'Edit Expense'}</h2>
              <button
                onClick={() => setShowEditor(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text)' }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Description */}
              <div className="col-span-2">
                <label className="label">Description *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., New slicks, Entry fee"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="label">Amount ($) *</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.01"
                  value={formData.amount ?? ''}
                  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>

              {/* Date */}
              <div>
                <label className="label">Date</label>
                <input
                  type="date"
                  className="input"
                  value={formData.date ? new Date(formData.date).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, date: new Date(e.target.value).getTime() })}
                />
              </div>

              {/* Category */}
              <div>
                <label className="label">Category *</label>
                <select
                  className="input"
                  value={formData.category || 'parts'}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                >
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div>
                <label className="label">Vehicle</label>
                <select
                  className="input"
                  value={formData.vehicleId || ''}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value || undefined })}
                >
                  <option value="">None</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Vendor */}
              <div>
                <label className="label">Vendor</label>
                <input
                  type="text"
                  className="input"
                  value={formData.vendor || ''}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  placeholder="Where purchased"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="label">Payment Method</label>
                <input
                  type="text"
                  className="input"
                  value={formData.paymentMethod || ''}
                  onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                  placeholder="e.g., Cash, Visa"
                />
              </div>

              {/* Tax Deductible */}
              <div className="col-span-2">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.taxDeductible || false}
                    onChange={(e) => setFormData({ ...formData, taxDeductible: e.target.checked })}
                  />
                  <span>Tax Deductible</span>
                </label>
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <label className="label">Notes</label>
                <textarea
                  className="input"
                  rows={2}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                  style={{ resize: 'vertical' }}
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button className="btn btn-full" onClick={handleSave}>
                {isCreating ? 'Add Expense' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary btn-full" onClick={() => setShowEditor(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  
  if (embedded) return content;
  return <Page title="Expenses">{content}</Page>;
}

export default Expenses;
