/**
 * Team Hub Page
 * 
 * Central hub for Race Team Management features with tabbed navigation.
 * Contains: Parts & Inventory, Events Calendar, Maintenance Log, Expenses
 * 
 * This is a Pro-only feature.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Page from '../shared/components/Page';
import { useSubscription } from '../domain/config/useSubscription';

// Lazy load tab content to improve initial load time
const PartsInventory = lazy(() => import('./PartsInventory'));
const Events = lazy(() => import('./Events'));
const Maintenance = lazy(() => import('./Maintenance'));
const Expenses = lazy(() => import('./Expenses'));

type TeamTab = 'parts' | 'events' | 'maintenance' | 'expenses';

const TABS: { id: TeamTab; label: string; icon: string; description: string }[] = [
  { id: 'parts', label: 'Parts', icon: '🔧', description: 'Inventory & rebuild tracking' },
  { id: 'events', label: 'Events', icon: '📅', description: 'Race calendar & planning' },
  { id: 'maintenance', label: 'Service', icon: '🛠️', description: 'Maintenance log' },
  { id: 'expenses', label: 'Expenses', icon: '💰', description: 'Cost tracking' },
];

export default function TeamHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const { features, tier } = useSubscription();
  
  // Get initial tab from URL hash or default to 'parts'
  const getInitialTab = (): TeamTab => {
    const hash = location.hash.replace('#', '') as TeamTab;
    return TABS.some(t => t.id === hash) ? hash : 'parts';
  };
  
  const [activeTab, setActiveTab] = useState<TeamTab>(getInitialTab);
  
  // Update URL hash when tab changes
  const handleTabChange = (tab: TeamTab) => {
    setActiveTab(tab);
    navigate(`/team#${tab}`, { replace: true });
  };
  
  // Sync tab with URL hash on navigation
  useEffect(() => {
    const hash = location.hash.replace('#', '') as TeamTab;
    if (TABS.some(t => t.id === hash) && hash !== activeTab) {
      setActiveTab(hash);
    }
  }, [location.hash]);
  
  // Check if user has Pro access for team management
  const hasTeamAccess = features.teamManagement || tier === 'pro' || tier === 'team' || tier === 'beta' || tier === 'owner';
  
  if (!hasTeamAccess) {
    return (
      <Page title="Team Management">
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-3)' }}>🔒</div>
          <h2 style={{ marginBottom: 'var(--space-3)' }}>Pro Feature</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Race Team Management is available with Pro and Team subscriptions.
            Track parts, inventory, events, maintenance, and expenses.
          </p>
          <button 
            className="btn"
            onClick={() => navigate('/account')}
            style={{ padding: '12px 24px' }}
          >
            Upgrade to Pro
          </button>
        </div>
      </Page>
    );
  }
  
  return (
    <Page title="Team Management">
      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '4px', 
        marginBottom: 'var(--space-4)',
        overflowX: 'auto',
        paddingBottom: '4px',
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === tab.id ? '2px solid var(--color-accent)' : '2px solid var(--color-border)',
              backgroundColor: activeTab === tab.id ? 'rgba(59, 130, 246, 0.1)' : 'var(--color-surface)',
              color: activeTab === tab.id ? 'var(--color-accent)' : 'var(--color-text)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <Suspense fallback={
        <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <div style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
        </div>
      }>
        {activeTab === 'parts' && <PartsInventoryContent />}
        {activeTab === 'events' && <EventsContent />}
        {activeTab === 'maintenance' && <MaintenanceContent />}
        {activeTab === 'expenses' && <ExpensesContent />}
      </Suspense>
    </Page>
  );
}

// Wrapper components that render the content without the Page wrapper
function PartsInventoryContent() {
  return <PartsInventory embedded />;
}

function EventsContent() {
  return <Events embedded />;
}

function MaintenanceContent() {
  return <Maintenance embedded />;
}

function ExpensesContent() {
  return <Expenses embedded />;
}
