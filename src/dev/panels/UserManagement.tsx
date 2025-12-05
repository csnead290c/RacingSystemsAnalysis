/**
 * User Management Panel
 * 
 * Admin panel for managing users, roles, and products.
 */

import { useState } from 'react';
import { useAuth } from '../../domain/auth';
import type { User, Role, Product, AccountStatus } from '../../domain/auth/types';
import { ALL_FEATURES } from '../../domain/auth/types';

// ============================================================================
// Styles
// ============================================================================

const styles = {
  container: { padding: '1rem' },
  tabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' },
  tab: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--color-muted)',
    borderBottom: '2px solid transparent',
    marginBottom: '-1px',
  },
  tabActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)',
  },
  section: { marginBottom: '1.5rem' },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    color: 'var(--color-muted)',
  },
  card: {
    backgroundColor: 'var(--color-background)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--color-border)',
  },
  badge: {
    padding: '0.25rem 0.5rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  button: {
    padding: '0.5rem 1rem',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  primaryBtn: { backgroundColor: 'var(--color-primary)', color: 'white' },
  secondaryBtn: { backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
  dangerBtn: { backgroundColor: '#dc2626', color: 'white' },
  smallBtn: { padding: '0.25rem 0.5rem', fontSize: '0.75rem' },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background)',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  },
  formGroup: { marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' },
  modal: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '500px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto',
  },
  checkboxGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '0.5rem',
  },
  checkbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.75rem',
  },
};

// ============================================================================
// Tab Types
// ============================================================================

type TabId = 'users' | 'roles' | 'products';

// ============================================================================
// User Edit Modal
// ============================================================================

function UserModal({ 
  user, 
  roles, 
  onClose, 
  onSave, 
  onDelete 
}: { 
  user: User | null; 
  roles: Role[];
  onClose: () => void; 
  onSave: (data: Partial<User> & { password?: string }) => void;
  onDelete?: () => void;
}) {
  const [email, setEmail] = useState(user?.email || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [roleId, setRoleId] = useState(user?.roleId || roles[0]?.id || '');
  const [status, setStatus] = useState<AccountStatus>(user?.status || 'active');
  const [password, setPassword] = useState('');
  const [notes, setNotes] = useState(user?.adminNotes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ email, displayName, roleId, status, adminNotes: notes || undefined, ...(password ? { password } : {}) });
    onClose();
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{user ? 'Edit User' : 'Create User'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Email</label>
            <input style={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Display Name</label>
            <input style={styles.input} type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Role</label>
            <select style={styles.input} value={roleId} onChange={e => setRoleId(e.target.value)}>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Status</label>
            <select style={styles.input} value={status} onChange={e => setStatus(e.target.value as AccountStatus)}>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>{user ? 'New Password (leave blank to keep)' : 'Password'}</label>
            <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} {...(!user && { required: true })} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Admin Notes</label>
            <textarea style={{ ...styles.input, minHeight: '60px' }} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            {user && onDelete && (
              <button type="button" style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => { onDelete(); onClose(); }}>Delete</button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button type="button" style={{ ...styles.button, ...styles.secondaryBtn }} onClick={onClose}>Cancel</button>
              <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>{user ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Role Edit Modal
// ============================================================================

function RoleModal({ 
  role, 
  products, 
  onClose, 
  onSave, 
  onDelete 
}: { 
  role: Role | null; 
  products: Product[];
  onClose: () => void; 
  onSave: (data: Omit<Role, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');
  const [color, setColor] = useState(role?.color || '#6b7280');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(role?.products || []);
  const [additionalFeatures, setAdditionalFeatures] = useState<string[]>(role?.additionalFeatures || []);
  const [canManageUsers, setCanManageUsers] = useState(role?.canManageUsers || false);
  const [canManageRoles, setCanManageRoles] = useState(role?.canManageRoles || false);
  const [sortOrder, setSortOrder] = useState(role?.sortOrder || 50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name, description, color,
      products: selectedProducts,
      additionalFeatures,
      canManageUsers, canManageRoles,
      isSystem: role?.isSystem || false,
      sortOrder,
    });
    onClose();
  };

  const toggleProduct = (id: string) => {
    setSelectedProducts(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const toggleFeature = (f: string) => {
    setAdditionalFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{role ? 'Edit Role' : 'Create Role'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input style={styles.input} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input type="color" style={{ ...styles.input, height: '38px', padding: '2px' }} value={color} onChange={e => setColor(e.target.value)} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea style={{ ...styles.input, minHeight: '50px' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Products Access</label>
            <div style={styles.checkboxGrid}>
              {products.map(p => (
                <label key={p.id} style={styles.checkbox}>
                  <input type="checkbox" checked={selectedProducts.includes(p.id)} onChange={() => toggleProduct(p.id)} />
                  <span style={{ color: p.color }}>{p.icon}</span> {p.name}
                </label>
              ))}
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Additional Features</label>
            <div style={styles.checkboxGrid}>
              {ALL_FEATURES.filter(f => ['dev_tools', 'user_management', 'role_management', 'system_settings', 'view_analytics', 'beta_features'].includes(f)).map(f => (
                <label key={f} style={styles.checkbox}>
                  <input type="checkbox" checked={additionalFeatures.includes(f)} onChange={() => toggleFeature(f)} />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={canManageUsers} onChange={e => setCanManageUsers(e.target.checked)} />
              Can Manage Users
            </label>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={canManageRoles} onChange={e => setCanManageRoles(e.target.checked)} />
              Can Manage Roles
            </label>
            <div style={styles.formGroup}>
              <label style={styles.label}>Sort Order</label>
              <input type="number" style={styles.input} value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            {role && !role.isSystem && onDelete && (
              <button type="button" style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => { onDelete(); onClose(); }}>Delete</button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button type="button" style={{ ...styles.button, ...styles.secondaryBtn }} onClick={onClose}>Cancel</button>
              <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>{role ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Product Edit Modal
// ============================================================================

function ProductModal({ 
  product, 
  onClose, 
  onSave, 
  onDelete 
}: { 
  product: Product | null; 
  onClose: () => void; 
  onSave: (data: Omit<Product, 'id'>) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [icon, setIcon] = useState(product?.icon || '📦');
  const [color, setColor] = useState(product?.color || '#6b7280');
  const [features, setFeatures] = useState<string[]>(product?.features || []);
  const [isPremium, setIsPremium] = useState(product?.isPremium || false);
  const [sortOrder, setSortOrder] = useState(product?.sortOrder || 50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, icon, color, features, isPremium, sortOrder });
    onClose();
  };

  const toggleFeature = (f: string) => {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  };

  return (
    <div style={styles.modal} onClick={onClose}>
      <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>{product ? 'Edit Product' : 'Create Product'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 100px', gap: '1rem' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Icon</label>
              <input style={{ ...styles.input, textAlign: 'center', fontSize: '1.5rem' }} value={icon} onChange={e => setIcon(e.target.value)} />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Name</label>
              <input style={styles.input} value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Color</label>
              <input type="color" style={{ ...styles.input, height: '38px', padding: '2px' }} value={color} onChange={e => setColor(e.target.value)} />
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Description</label>
            <textarea style={{ ...styles.input, minHeight: '50px' }} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Features</label>
            <div style={styles.checkboxGrid}>
              {ALL_FEATURES.filter(f => !['dev_tools', 'user_management', 'role_management', 'system_settings', 'view_analytics', 'beta_features'].includes(f)).map(f => (
                <label key={f} style={styles.checkbox}>
                  <input type="checkbox" checked={features.includes(f)} onChange={() => toggleFeature(f)} />
                  {f.replace(/_/g, ' ')}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={styles.checkbox}>
              <input type="checkbox" checked={isPremium} onChange={e => setIsPremium(e.target.checked)} />
              Premium Product
            </label>
            <div style={styles.formGroup}>
              <label style={styles.label}>Sort Order</label>
              <input type="number" style={styles.input} value={sortOrder} onChange={e => setSortOrder(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
            {product && onDelete && (
              <button type="button" style={{ ...styles.button, ...styles.dangerBtn }} onClick={() => { onDelete(); onClose(); }}>Delete</button>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
              <button type="button" style={{ ...styles.button, ...styles.secondaryBtn }} onClick={onClose}>Cancel</button>
              <button type="submit" style={{ ...styles.button, ...styles.primaryBtn }}>{product ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserManagement() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [editingUser, setEditingUser] = useState<User | null | 'new'>(null);
  const [editingRole, setEditingRole] = useState<Role | null | 'new'>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null | 'new'>(null);

  const users = auth.getAllUsers();
  const roles = auth.getAllRoles();
  const products = auth.getAllProducts();

  return (
    <div style={styles.container}>
      {/* Debug Info */}
      <div style={{ 
        marginBottom: '1rem', 
        padding: '0.75rem', 
        backgroundColor: '#fef3c7', 
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem',
      }}>
        <strong>Current User:</strong> {auth.user?.email} (Role: {auth.user?.roleId})<br/>
        <strong>User Role Object:</strong> {auth.getUserRole()?.name || 'NOT FOUND'}<br/>
        <strong>Products:</strong> {auth.getUserRole()?.products?.join(', ') || 'NONE'}<br/>
        <button 
          onClick={() => { auth.resetAuthData(); window.location.reload(); }}
          style={{ ...styles.button, ...styles.dangerBtn, marginTop: '0.5rem' }}
        >
          🔄 Reset All Auth Data
        </button>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        {(['users', 'roles', 'products'] as TabId[]).map(tab => (
          <button
            key={tab}
            style={{ ...styles.tab, ...(activeTab === tab ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'users' ? `👥 Users (${users.length})` : tab === 'roles' ? `🎭 Roles (${roles.length})` : `📦 Products (${products.length})`}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>All Users</span>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setEditingUser('new')}>+ Add User</button>
          </div>
          <div style={styles.card}>
            {users.map((user: User) => {
              const role = roles.find((r: Role) => r.id === user.roleId);
              return (
                <div key={user.id} style={styles.row}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{user.displayName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{user.email}</div>
                  </div>
                  <span style={{ ...styles.badge, backgroundColor: role?.color || '#6b7280', color: 'white' }}>{role?.name || user.roleId}</span>
                  <span style={{ ...styles.badge, backgroundColor: user.status === 'active' ? '#dcfce7' : '#fee2e2', color: user.status === 'active' ? '#166534' : '#991b1b' }}>{user.status}</span>
                  <button style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }} onClick={() => auth.impersonateUser(user.id)}>👤</button>
                  <button style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }} onClick={() => setEditingUser(user)}>Edit</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>All Roles</span>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setEditingRole('new')}>+ Add Role</button>
          </div>
          <div style={styles.card}>
            {roles.map((role: Role) => (
              <div key={role.id} style={styles.row}>
                <span style={{ ...styles.badge, backgroundColor: role.color, color: 'white' }}>{role.name}</span>
                <div style={{ flex: 1, fontSize: '0.75rem', color: 'var(--color-muted)' }}>{role.description}</div>
                <div style={{ fontSize: '0.75rem' }}>
                  {role.products.length} products, {role.additionalFeatures.length} features
                </div>
                {role.isSystem && <span style={{ ...styles.badge, backgroundColor: '#f3f4f6', color: '#4b5563' }}>System</span>}
                <button style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }} onClick={() => setEditingRole(role)}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>All Products</span>
            <button style={{ ...styles.button, ...styles.primaryBtn }} onClick={() => setEditingProduct('new')}>+ Add Product</button>
          </div>
          <div style={styles.card}>
            {products.map((product: Product) => (
              <div key={product.id} style={styles.row}>
                <span style={{ fontSize: '1.5rem' }}>{product.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: product.color }}>{product.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>{product.description}</div>
                </div>
                <div style={{ fontSize: '0.75rem' }}>{product.features.length} features</div>
                {product.isPremium && <span style={{ ...styles.badge, backgroundColor: '#fef3c7', color: '#92400e' }}>Premium</span>}
                <button style={{ ...styles.button, ...styles.secondaryBtn, ...styles.smallBtn }} onClick={() => setEditingProduct(product)}>Edit</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {editingUser && (
        <UserModal
          user={editingUser === 'new' ? null : editingUser}
          roles={roles}
          onClose={() => setEditingUser(null)}
          onSave={(data) => {
            if (editingUser === 'new') {
              auth.createUser(data as Omit<User, 'id' | 'createdAt'>, data.password);
            } else {
              auth.updateUser(editingUser.id, data);
              if (data.password) auth.setUserPassword(editingUser.id, data.password);
            }
          }}
          onDelete={editingUser !== 'new' ? () => auth.deleteUser(editingUser.id) : undefined}
        />
      )}
      {editingRole && (
        <RoleModal
          role={editingRole === 'new' ? null : editingRole}
          products={products}
          onClose={() => setEditingRole(null)}
          onSave={(data) => {
            if (editingRole === 'new') auth.createRole(data);
            else auth.updateRole(editingRole.id, data);
          }}
          onDelete={editingRole !== 'new' ? () => auth.deleteRole(editingRole.id) : undefined}
        />
      )}
      {editingProduct && (
        <ProductModal
          product={editingProduct === 'new' ? null : editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={(data) => {
            if (editingProduct === 'new') auth.createProduct(data);
            else auth.updateProduct(editingProduct.id, data);
          }}
          onDelete={editingProduct !== 'new' ? () => auth.deleteProduct(editingProduct.id) : undefined}
        />
      )}
    </div>
  );
}
