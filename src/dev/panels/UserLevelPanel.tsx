/**
 * User Level Panel
 * 
 * Manage user access level for feature gating.
 */

import { useUserLevel, type UserLevel } from '../../shared/hooks/useUserLevel';

export default function UserLevelPanel() {
  const [level, setLevel] = useUserLevel();

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>User Level</h2>
        <p style={{ color: 'var(--color-muted)', fontSize: '0.875rem', margin: 0 }}>
          Control access to features based on user level. Changes persist in localStorage.
        </p>
      </div>

      <div style={{ 
        padding: '1.5rem', 
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        maxWidth: '600px'
      }}>
        <label 
          htmlFor="user-level-select"
          style={{ 
            display: 'block', 
            marginBottom: '0.5rem',
            fontWeight: 500,
            color: 'var(--color-text)'
          }}
        >
          Current Level
        </label>
        
        <select
          id="user-level-select"
          value={level}
          onChange={(e) => setLevel(e.target.value as UserLevel)}
          style={{
            width: '100%',
            padding: '0.5rem',
            fontSize: '1rem',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text)',
            cursor: 'pointer'
          }}
        >
          <option value="guest">Guest</option>
          <option value="beta">Beta</option>
          <option value="admin">Admin</option>
        </select>

        <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Guest:</strong> Basic access to public features
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Beta:</strong> Access to experimental features and beta testing
          </p>
          <p style={{ margin: '0.5rem 0' }}>
            <strong>Admin:</strong> Full access to all features and developer tools
          </p>
        </div>

        <div style={{ 
          marginTop: '1.5rem', 
          padding: '0.75rem', 
          backgroundColor: level === 'admin' ? '#dcfce7' : level === 'beta' ? '#fef3c7' : '#f3f4f6',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.875rem'
        }}>
          <strong>Current Level:</strong> {level.toUpperCase()}
        </div>
      </div>

      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #3b82f6',
        borderRadius: 'var(--radius-md)',
        maxWidth: '600px'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1rem' }}>
          Usage Example
        </h3>
        <pre style={{ 
          margin: 0, 
          padding: '0.75rem',
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          overflowX: 'auto'
        }}>
{`import { useUserLevel, hasAccess } from '@/shared/hooks/useUserLevel';

function MyComponent() {
  const [level] = useUserLevel();
  
  // Check access
  if (!hasAccess(level, 'beta')) {
    return <div>Beta access required</div>;
  }
  
  return <div>Beta feature content</div>;
}`}
        </pre>
      </div>
    </div>
  );
}
