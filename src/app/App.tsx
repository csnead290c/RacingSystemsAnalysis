import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, useState, Suspense } from 'react';
import { ThemeProvider } from '../shared/ui/theme';
import { Vb6FixtureProvider } from '../shared/state/vb6FixtureStore';
import { FlagsProvider } from '../domain/flags/store.tsx';
import { VehicleProvider } from '../state/vehicleStore';
import { AuthProvider } from '../domain/auth';
import { RunHistoryProvider } from '../shared/state/runHistoryStore';
import { PreferencesProvider } from '../shared/state/preferences';
import Home from '../pages/Home';
import Predict from '../pages/Predict';
import SuspensionSim from '../pages/SuspensionSim';
import ClutchSim from '../pages/ClutchSim';
import ConverterSim from '../pages/ConverterSim';
import EngineSim from '../pages/EngineProSim';
import Calculators from '../pages/Calculators';
import Log from '../pages/Log';
import History from '../pages/History';
import Vehicles from '../pages/Vehicles';
import About from '../pages/About';
import Login from '../pages/Login';
import Account from '../pages/Account';
import DialIn from '../pages/DialIn';
import Opponents from '../pages/Opponents';
import RaceDay from '../pages/RaceDay';
import DataImport from '../pages/DataImport';
import TechCard from '../pages/TechCard';
import Ladder from '../pages/Ladder';
import Pricing from '../pages/Pricing';
import Register from '../pages/Register';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = (
    <>
      <Link to="/" style={navLinkStyle(isActive('/'))} onClick={() => setMobileMenuOpen(false)}>
        Home
      </Link>
      {canAccessVehicles && (
        <Link to="/vehicles" style={navLinkStyle(isActive('/vehicles'))} onClick={() => setMobileMenuOpen(false)}>
          Vehicles
        </Link>
      )}
      {canAccessETSim && (
        <Link to="/et-sim" style={navLinkStyle(isActive('/et-sim'))} onClick={() => setMobileMenuOpen(false)}>
          ET Sim
        </Link>
      )}
      {canAccessSuspSim && (
        <Link to="/suspension-sim" style={navLinkStyle(isActive('/suspension-sim'))} onClick={() => setMobileMenuOpen(false)}>
          Susp Sim
        </Link>
      )}
      {canAccessClutchSim && (
        <Link to="/clutch-sim" style={navLinkStyle(isActive('/clutch-sim'))} onClick={() => setMobileMenuOpen(false)}>
          Clutch Sim
        </Link>
      )}
      {canAccessClutchSim && (
        <Link to="/converter-sim" style={navLinkStyle(isActive('/converter-sim'))} onClick={() => setMobileMenuOpen(false)}>
          Conv Sim
        </Link>
      )}
      {canAccessEngineSim && (
        <Link to="/engine-sim" style={navLinkStyle(isActive('/engine-sim'))} onClick={() => setMobileMenuOpen(false)}>
          Engine Sim
        </Link>
      )}
      <Link to="/calculators" style={navLinkStyle(isActive('/calculators'))} onClick={() => setMobileMenuOpen(false)}>
        Calcs
      </Link>
      {canAccessLog && (
        <Link to="/log" style={navLinkStyle(isActive('/log'))} onClick={() => setMobileMenuOpen(false)}>
          Log
        </Link>
      )}
      {canAccessHistory && (
        <Link to="/history" style={navLinkStyle(isActive('/history'))} onClick={() => setMobileMenuOpen(false)}>
          History
        </Link>
      )}
      <Link to="/about" style={navLinkStyle(isActive('/about'))} onClick={() => setMobileMenuOpen(false)}>
        About
      </Link>
      <DevNavLink isActive={isActive} navLinkStyle={navLinkStyle} />
    </>
  );

  return (
    <>
      {/* Desktop nav - hidden on mobile */}
      <nav className="desktop-nav" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        {navLinks}
      </nav>
      
      {/* Mobile hamburger button */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          color: 'var(--color-header-text)',
          fontSize: '1.5rem',
          cursor: 'pointer',
          padding: '4px 8px',
        }}
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? '✕' : '☰'}
      </button>
      
      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <nav
          className="mobile-nav"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--color-header-bg)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 1000,
          }}
        >
          {navLinks}
        </nav>
      )}
      
      {/* Inject responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-nav { display: none !important; }
        }
      `}</style>
    </>
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
          <PreferencesProvider>
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
            position: 'relative',
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
            <Route path="/register" element={<Register />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/calcs" element={<Calculators />} />
            
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
              <ProtectedRoute requireFeature="basic_sim">
                <Predict />
              </ProtectedRoute>
            } />
            <Route path="/predict" element={
              <ProtectedRoute requireFeature="basic_sim">
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
            <Route path="/dial-in" element={
              <ProtectedRoute requireFeature="basic_sim">
                <DialIn />
              </ProtectedRoute>
            } />
            
            <Route path="/opponents" element={
              <ProtectedRoute requireFeature="basic_sim">
                <Opponents />
              </ProtectedRoute>
            } />
            
            <Route path="/race-day" element={
              <ProtectedRoute requireFeature="basic_sim">
                <RaceDay />
              </ProtectedRoute>
            } />
            
            <Route path="/import" element={
              <ProtectedRoute requireFeature="basic_sim">
                <DataImport />
              </ProtectedRoute>
            } />
            
            <Route path="/tech-card" element={
              <ProtectedRoute requireFeature="basic_sim">
                <TechCard />
              </ProtectedRoute>
            } />
            
            <Route path="/ladder" element={
              <ProtectedRoute requireFeature="basic_sim">
                <Ladder />
              </ProtectedRoute>
            } />
            
            {/* Quarter Pro features */}
            <Route path="/clutch-sim" element={
              <ProtectedRoute requireFeature="clutch_sim">
                <ClutchSim />
              </ProtectedRoute>
            } />
            
            <Route path="/converter-sim" element={
              <ProtectedRoute requireFeature="clutch_sim">
                <ConverterSim />
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
          </PreferencesProvider>
        </AuthProvider>
      </FlagsProvider>
    </ThemeProvider>
  );
}

export default App;
