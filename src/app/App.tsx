import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, useState, Suspense } from 'react';
import { ThemeProvider } from '../shared/ui/theme';
import { Vb6FixtureProvider } from '../shared/state/vb6FixtureStore';
import { FlagsProvider } from '../domain/flags/store.tsx';
import { VehicleProvider } from '../state/vehicleStore';
import { AuthProvider } from '../domain/auth';
import { RunHistoryProvider } from '../shared/state/runHistoryStore';
import Home from '../pages/Home';
import Predict from '../pages/Predict';
import SuspensionSim from '../pages/SuspensionSim';
import ClutchSim from '../pages/ClutchSim';
import EngineSim from '../pages/EngineProSim';
import Calculators from '../pages/Calculators';
import Log from '../pages/Log';
import History from '../pages/History';
import Vehicles from '../pages/Vehicles';
import About from '../pages/About';
import Login from '../pages/Login';
import Account from '../pages/Account';
import ThemeToggle from '../shared/components/ThemeToggle';
import ProtectedRoute from '../shared/components/ProtectedRoute';
import { useAuth } from '../domain/auth';

// DevPortal - available in dev mode or to owner/admin in production
const DevPortal = lazy(() => import('../pages/DevPortal'));

function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  
  if (!isAuthenticated || !user) {
    return (
      <Link
        to="/login"
        style={{
          color: 'var(--color-header-text)',
          textDecoration: 'none',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        Sign In
      </Link>
    );
  }
  
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: 'var(--space-2) var(--space-3)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          border: 'none',
          color: 'var(--color-header-text)',
          cursor: 'pointer',
        }}
      >
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 600,
        }}>
          {user.displayName.charAt(0).toUpperCase()}
        </span>
        <span style={{ fontSize: '0.875rem' }}>{user.displayName}</span>
      </button>
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '0.5rem',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            minWidth: '150px',
            zIndex: 100,
          }}
        >
          <Link
            to="/account"
            onClick={() => setShowMenu(false)}
            style={{
              display: 'block',
              padding: '0.75rem 1rem',
              color: 'var(--color-text)',
              textDecoration: 'none',
            }}
          >
            My Account
          </Link>
          <button
            onClick={() => { logout(); setShowMenu(false); }}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.75rem 1rem',
              textAlign: 'left',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

function Navigation() {
  const location = useLocation();
  const { isAuthenticated, hasFeature, hasProduct } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (active: boolean, disabled: boolean = false) => ({
    color: disabled ? 'rgba(255, 255, 255, 0.3)' : 'var(--color-header-text)',
    textDecoration: 'none',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    transition: 'background-color 0.2s',
    pointerEvents: disabled ? 'none' as const : 'auto' as const,
  });

  // Check access for each nav item
  const canAccessVehicles = isAuthenticated && hasFeature('save_vehicles');
  const canAccessETSim = isAuthenticated && hasProduct('quarter_jr');
  const canAccessSuspSim = isAuthenticated && hasProduct('fourlink');
  const canAccessClutchSim = isAuthenticated && hasFeature('clutch_sim');
  const canAccessEngineSim = isAuthenticated && hasProduct('engine_pro');
  const canAccessLog = isAuthenticated && hasFeature('save_runs');
  const canAccessHistory = isAuthenticated && hasFeature('save_runs');
  // canAccessDev not needed - Dev link always visible in dev mode

  return (
    <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
      <Link to="/" style={navLinkStyle(isActive('/'))}>
        Home
      </Link>
      {canAccessVehicles && (
        <Link to="/vehicles" style={navLinkStyle(isActive('/vehicles'))}>
          Vehicles
        </Link>
      )}
      {canAccessETSim && (
        <Link to="/et-sim" style={navLinkStyle(isActive('/et-sim'))}>
          ET Sim
        </Link>
      )}
      {canAccessSuspSim && (
        <Link to="/suspension-sim" style={navLinkStyle(isActive('/suspension-sim'))}>
          Susp Sim
        </Link>
      )}
      {canAccessClutchSim && (
        <Link to="/clutch-sim" style={navLinkStyle(isActive('/clutch-sim'))}>
          Clutch Sim
        </Link>
      )}
      {canAccessEngineSim && (
        <Link to="/engine-sim" style={navLinkStyle(isActive('/engine-sim'))}>
          Engine Sim
        </Link>
      )}
      <Link to="/calculators" style={navLinkStyle(isActive('/calculators'))}>
        Calcs
      </Link>
      {canAccessLog && (
        <Link to="/log" style={navLinkStyle(isActive('/log'))}>
          Log
        </Link>
      )}
      {canAccessHistory && (
        <Link to="/history" style={navLinkStyle(isActive('/history'))}>
          History
        </Link>
      )}
      <Link to="/about" style={navLinkStyle(isActive('/about'))}>
        About
      </Link>
      {/* Dev link - visible in dev mode or to owner/admin */}
      <DevNavLink isActive={isActive} navLinkStyle={navLinkStyle} />
    </nav>
  );
}

function DevNavLink({ isActive, navLinkStyle }: { isActive: (path: string) => boolean; navLinkStyle: (active: boolean) => React.CSSProperties }) {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.roleId === 'owner' || user?.roleId === 'admin';
  
  if (!import.meta.env.DEV && !isOwnerOrAdmin) {
    return null;
  }
  
  return (
    <Link to="/dev" style={navLinkStyle(isActive('/dev'))}>
      Dev
    </Link>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FlagsProvider>
        <AuthProvider>
          <VehicleProvider>
            <RunHistoryProvider>
            <Vb6FixtureProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        <header
          style={{
            backgroundColor: 'var(--color-header-bg)',
            color: 'var(--color-header-text)',
            padding: '0.75rem 1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
            <img 
              src="/rsa-logo.png" 
              alt="RSA Logo" 
              style={{ height: '40px', width: 'auto' }}
            />
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Navigation />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/calculators" element={<Calculators />} />
            
            {/* Protected routes - require auth */}
            <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } />
            
            {/* Quarter Jr/Pro features */}
            <Route path="/vehicles" element={
              <ProtectedRoute requireFeature="save_vehicles">
                <Vehicles />
              </ProtectedRoute>
            } />
            <Route path="/et-sim" element={
              <ProtectedRoute requireProduct="quarter_jr">
                <Predict />
              </ProtectedRoute>
            } />
            <Route path="/predict" element={
              <ProtectedRoute requireProduct="quarter_jr">
                <Predict />
              </ProtectedRoute>
            } />
            <Route path="/log" element={
              <ProtectedRoute requireFeature="save_runs">
                <Log />
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute requireFeature="save_runs">
                <History />
              </ProtectedRoute>
            } />
            
            {/* Quarter Pro features */}
            <Route path="/clutch-sim" element={
              <ProtectedRoute requireFeature="clutch_sim">
                <ClutchSim />
              </ProtectedRoute>
            } />
            
            {/* Engine Pro features */}
            <Route path="/engine-sim" element={
              <ProtectedRoute requireProduct="engine_pro">
                <EngineSim />
              </ProtectedRoute>
            } />
            
            {/* Four Link features */}
            <Route path="/suspension-sim" element={
              <ProtectedRoute requireProduct="fourlink">
                <SuspensionSim />
              </ProtectedRoute>
            } />
            
            {/* Dev Portal - available in dev mode or to owner/admin */}
            <Route path="/dev" element={
              <ProtectedRoute requireRole={['owner', 'admin']}>
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                  <DevPortal />
                </Suspense>
              </ProtectedRoute>
            } />
          </Routes>
        </main>

        <footer
          style={{
            backgroundColor: 'var(--color-surface)',
            padding: 'var(--space-4) var(--space-6)',
            textAlign: 'center',
            color: 'var(--color-muted)',
            fontSize: '0.875rem',
            borderTop: '1px solid var(--color-border)',
          }}
        >
          © RSA 2025
        </footer>
      </div>
            </BrowserRouter>
            </Vb6FixtureProvider>
            </RunHistoryProvider>
          </VehicleProvider>
        </AuthProvider>
      </FlagsProvider>
    </ThemeProvider>
  );
}

export default App;
