import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { ThemeProvider } from '../shared/ui/theme';
import { Vb6FixtureProvider } from '../shared/state/vb6FixtureStore';
import { FlagsProvider } from '../domain/flags/store.tsx';
import { VehicleProvider } from '../state/vehicleStore';
import { AuthProvider } from '../domain/auth';
import {
  canAccessEtSim, ET_SIM_FEATURE,
  RACE_TOOLS_FEATURE,
  canAccessRunLogging, RUN_LOGGING_FEATURE,
  canAccessVehicles, VEHICLES_FEATURE,
} from '../domain/config/guards';
import { RunHistoryProvider } from '../shared/state/runHistoryStore';
import { PreferencesProvider } from '../shared/state/preferences';
import ViewAsBanner from '../domain/config/ViewAsBanner';
import Home from '../pages/Home';
import Predict from '../pages/Predict';
import SuspensionSim from '../pages/SuspensionSim';
import ClutchSim from '../pages/ClutchSim';
import ConverterSim from '../pages/ConverterSim';
import EngineSim from '../pages/EngineSim';
import { EngineSimDashboard } from '../pages/EngineSimDashboard';
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
import ResetPassword from '../pages/ResetPassword';
import TeamHub from '../pages/TeamHub';
import NotFound from '../pages/NotFound';
import Help from '../pages/Help';
import ThemeToggle from '../shared/components/ThemeToggle';
import ProtectedRoute from '../shared/components/ProtectedRoute';
import InternalRoute from '../shared/components/InternalRoute';
import { useAuth } from '../domain/auth';
import { useCapabilities } from '../domain/config/useCapabilities';
import { useSubscription } from '../domain/config/useSubscription';
import { getQuarterTier, getEngineTier } from '../domain/ui/programDisplayNames';
import { isInternalUser, buildVisibilityContext } from '../domain/ui/publicSurface';

// DevPortal - available in dev mode or to owner/admin in production
const DevPortal = lazy(() => import('../pages/DevPortal'));
const AdminPortal = lazy(() => import('../pages/AdminPortal'));
const ParityPortal = lazy(() => import('../pages/ParityPortal'));

function UserMenu() {
  const { user, isAuthenticated, logout } = useAuth();
  const { features: menuFeatures } = useSubscription();
  const [showMenu, setShowMenu] = useState(false);
  const visCtx = buildVisibilityContext(user?.roleId);
  
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
          {menuFeatures.teamManagement && isInternalUser(visCtx) && (
            <Link
              to="/team"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                color: 'var(--color-text)',
                textDecoration: 'none',
              }}
            >
              Team
            </Link>
          )}
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
  const { isAuthenticated, hasFeature, user } = useAuth();
  const { can } = useCapabilities();
  const [menuOpen, setMenuOpen] = useState(false);
  const [, forceUpdate] = useState(0);
  const menuRef = useRef<HTMLElement>(null);

  // Listen for products update event to re-render navigation
  useEffect(() => {
    const handleProductsUpdate = () => { forceUpdate(n => n + 1); };
    window.addEventListener('rsa-products-updated', handleProductsUpdate);
    return () => window.removeEventListener('rsa-products-updated', handleProductsUpdate);
  }, []);

  // Close menu on ESC key
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (active: boolean): React.CSSProperties => ({
    color: 'var(--color-header-text)',
    textDecoration: 'none',
    padding: '6px 10px',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
    fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  });

  const tierPill = (tier: string): React.CSSProperties => ({
    fontSize: '0.55rem',
    fontWeight: 700,
    padding: '1px 5px',
    borderRadius: '6px',
    backgroundColor: tier === 'Pro' ? 'rgba(220, 38, 38, 0.25)' : 'rgba(255, 255, 255, 0.1)',
    color: tier === 'Pro' ? '#fca5a5' : 'rgba(255, 255, 255, 0.6)',
    letterSpacing: '0.3px',
    textTransform: 'uppercase' as const,
    lineHeight: '1.4',
  });

  const isLoggedIn = isAuthenticated;
  const visCtxNav = buildVisibilityContext(user?.roleId);
  const isDevOrOwner = isInternalUser(visCtxNav);

  // Check access for each nav item (centralized guards)
  const canAccessVehiclesNav = isLoggedIn && canAccessVehicles({ hasFeature });
  const canAccessETSim = isLoggedIn && canAccessEtSim({ hasFeature });
  const canAccessEngineSim = isLoggedIn;
  const canAccessHistory = isLoggedIn && canAccessRunLogging({ hasFeature });
  const { features } = useSubscription();
  const canAccessTeam = isLoggedIn && features.teamManagement;

  const close = useCallback(() => setMenuOpen(false), []);

  // ── Primary links: always visible in desktop top bar ──
  const primaryLinks = (
    <>
      <Link to="/" style={navLinkStyle(isActive('/'))} onClick={close}>Home</Link>
      {canAccessVehiclesNav && (
        <Link to="/vehicles" style={navLinkStyle(isActive('/vehicles'))} onClick={close}>Vehicles</Link>
      )}
      {canAccessETSim && (
        <Link to="/et-sim" style={navLinkStyle(isActive('/et-sim'))} onClick={close}>
          Quarter <span style={tierPill(getQuarterTier(can))}>{getQuarterTier(can)}</span>
        </Link>
      )}
      {canAccessEngineSim && (
        <Link to="/engine-sim" style={navLinkStyle(isActive('/engine-sim'))} onClick={close}>
          Engine <span style={tierPill(getEngineTier(can))}>{getEngineTier(can)}</span>
        </Link>
      )}
    </>
  );

  // ── Secondary links: hamburger menu only ──
  const secondaryLinks = (
    <>
      <Link to="/calculators" style={navLinkStyle(isActive('/calculators'))} onClick={close}>Calculators</Link>
      {canAccessHistory && isDevOrOwner && (
        <Link to="/history" style={navLinkStyle(isActive('/history'))} onClick={close}>History</Link>
      )}
      {canAccessTeam && isDevOrOwner && (
        <Link to="/team" style={navLinkStyle(isActive('/team'))} onClick={close}>Team</Link>
      )}
      <Link to="/help" style={navLinkStyle(isActive('/help'))} onClick={close}>Help</Link>
      <Link to="/about" style={navLinkStyle(isActive('/about'))} onClick={close}>About</Link>
      {isDevOrOwner && (
        <>
          <AdminNavLink isActive={isActive} navLinkStyle={navLinkStyle} />
          <DevNavLink isActive={isActive} navLinkStyle={navLinkStyle} />
        </>
      )}
    </>
  );

  return (
    <>
      {/* Desktop nav — primary links only */}
      <nav className="rsa-desktop-nav" style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        {primaryLinks}
        {/* Hamburger for secondary items — always visible on desktop too */}
        <button
          className="rsa-more-btn"
          onClick={() => setMenuOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-header-text)',
            fontSize: '1.1rem',
            cursor: 'pointer',
            padding: '6px 8px',
            borderRadius: 'var(--radius-sm)',
            lineHeight: 1,
          }}
          aria-label="More menu"
          aria-expanded={menuOpen}
          title="More"
        >
          ☰
        </button>
      </nav>

      {/* Mobile hamburger button — replaces entire nav on small screens */}
      <button
        className="rsa-mobile-btn"
        onClick={() => setMenuOpen(o => !o)}
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
        aria-expanded={menuOpen}
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      {/* Backdrop — click outside to close */}
      {menuOpen && (
        <div
          data-testid="rsa-menu-backdrop"
          onClick={close}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
          }}
        />
      )}

      {/* Dropdown menu (shared by desktop "more" and mobile hamburger) */}
      {menuOpen && (
        <nav
          ref={menuRef}
          className="rsa-dropdown-nav"
          data-testid="rsa-dropdown-nav"
          style={{
            position: 'absolute',
            top: '100%',
            right: '1rem',
            minWidth: '180px',
            backgroundColor: 'var(--color-header-bg)',
            padding: '0.75rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            boxShadow: 'var(--shadow-lg)',
            borderRadius: '0 0 8px 8px',
            zIndex: 1000,
          }}
        >
          {/* On mobile, show primary links too */}
          <div className="rsa-dropdown-primary">
            {primaryLinks}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />
          </div>
          {secondaryLinks}
        </nav>
      )}

      {/* Responsive styles */}
      <style>{`
        /* Desktop: show desktop nav, hide mobile button */
        .rsa-mobile-btn { display: none !important; }
        .rsa-dropdown-primary { display: none; }

        /* ≤900px: hide desktop nav, show mobile button, show primary links in dropdown */
        @media (max-width: 900px) {
          .rsa-desktop-nav { display: none !important; }
          .rsa-mobile-btn { display: block !important; }
          .rsa-dropdown-primary { display: block; }
        }
      `}</style>
    </>
  );
}

function AdminNavLink({ isActive, navLinkStyle }: { isActive: (path: string) => boolean; navLinkStyle: (active: boolean) => React.CSSProperties }) {
  const { user } = useAuth();
  const isOwnerOrAdmin = user?.roleId === 'owner' || user?.roleId === 'admin';
  
  if (!isOwnerOrAdmin) {
    return null;
  }
  
  return (
    <Link to="/admin" style={navLinkStyle(isActive('/admin'))}>
      Admin
    </Link>
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
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', overflow: 'hidden' }}>
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
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/calcs" element={<Calculators />} />
            <Route path="/help" element={<Help />} />
            
            {/* Protected routes - require auth */}
            <Route path="/account" element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            } />
            
            {/* Quarter Jr/Pro features */}
            <Route path="/vehicles" element={
              <ProtectedRoute requireFeature={VEHICLES_FEATURE}>
                <Vehicles />
              </ProtectedRoute>
            } />
            <Route path="/et-sim" element={
              <ProtectedRoute requireFeature={ET_SIM_FEATURE}>
                <Predict />
              </ProtectedRoute>
            } />
            <Route path="/predict" element={
              <ProtectedRoute requireFeature={ET_SIM_FEATURE}>
                <Predict />
              </ProtectedRoute>
            } />
            <Route path="/log" element={
              <ProtectedRoute requireFeature={RUN_LOGGING_FEATURE}>
                <InternalRoute><Log /></InternalRoute>
              </ProtectedRoute>
            } />
            <Route path="/history" element={
              <ProtectedRoute requireFeature={RUN_LOGGING_FEATURE}>
                <InternalRoute><History /></InternalRoute>
              </ProtectedRoute>
            } />
            <Route path="/dial-in" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><DialIn /></InternalRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/opponents" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><Opponents /></InternalRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/race-day" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><RaceDay /></InternalRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/import" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><DataImport /></InternalRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/tech-card" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><TechCard /></InternalRoute>
              </ProtectedRoute>
            } />
            
            <Route path="/ladder" element={
              <ProtectedRoute requireFeature={RACE_TOOLS_FEATURE}>
                <InternalRoute><Ladder /></InternalRoute>
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
            
            {/* Engine Sim - available to all logged-in users (simple/advanced mode based on tier) */}
            <Route path="/engine-sim" element={
              <ProtectedRoute>
                <EngineSimDashboard />
              </ProtectedRoute>
            } />
            
            {/* Engine Sim (Legacy) - old three-column layout */}
            <Route path="/engine-sim-legacy" element={
              <ProtectedRoute>
                <EngineSim />
              </ProtectedRoute>
            } />
            
            {/* Engine Pro - VB6-accurate engine performance simulation */}
            <Route path="/engine-pro" element={
              <ProtectedRoute requireProduct="engine_pro">
                <EngineSimDashboard />
              </ProtectedRoute>
            } />
            
            
            {/* Four Link features */}
            <Route path="/suspension-sim" element={
              <ProtectedRoute requireProduct="fourlink">
                <SuspensionSim />
              </ProtectedRoute>
            } />
            
            {/* Team Hub - Tabbed Team Management (internal only) */}
            <Route path="/team" element={
              <ProtectedRoute>
                <InternalRoute><TeamHub /></InternalRoute>
              </ProtectedRoute>
            } />
            
            {/* Legacy routes redirect to team hub */}
            <Route path="/parts" element={
              <ProtectedRoute>
                <InternalRoute><TeamHub /></InternalRoute>
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <InternalRoute><TeamHub /></InternalRoute>
              </ProtectedRoute>
            } />
            <Route path="/maintenance" element={
              <ProtectedRoute>
                <InternalRoute><TeamHub /></InternalRoute>
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute>
                <InternalRoute><TeamHub /></InternalRoute>
              </ProtectedRoute>
            } />
            
            {/* Admin Portal - internal only (owner/admin) */}
            <Route path="/admin" element={
              <ProtectedRoute requireRole={['owner', 'admin']}>
                <InternalRoute>
                  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                    <AdminPortal />
                  </Suspense>
                </InternalRoute>
              </ProtectedRoute>
            } />
            
            {/* Dev Portal - internal only (owner/admin or DEV mode) */}
            <Route path="/dev" element={
              <ProtectedRoute requireRole={['owner', 'admin']}>
                <InternalRoute>
                  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                    <DevPortal />
                  </Suspense>
                </InternalRoute>
              </ProtectedRoute>
            } />

            {/* NHRA Tech Parity - internal only (owner/admin with nhra.parity) */}
            <Route path="/parity" element={
              <ProtectedRoute requireRole={['owner', 'admin']}>
                <InternalRoute>
                  <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
                    <ParityPortal />
                  </Suspense>
                </InternalRoute>
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
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
          Racing Systems Analysis © 2026
        </footer>
        <ViewAsBanner />
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
