import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy, useState } from 'react';
import { ThemeProvider } from '../shared/ui/theme';
import { Vb6FixtureProvider } from '../shared/state/vb6FixtureStore';
import { FlagsProvider } from '../domain/flags/store.tsx';
import { VehicleProvider } from '../state/vehicleStore';
import { AuthProvider } from '../domain/auth';
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
import { useAuth } from '../domain/auth';

// DEV-only imports (lazy loaded)
const DevPortal = import.meta.env.DEV
  ? lazy(() => import('../pages/DevPortal'))
  : null;

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

  const isActive = (path: string) => location.pathname === path;

  const navLinkStyle = (active: boolean) => ({
    color: 'var(--color-header-text)',
    textDecoration: 'none',
    padding: 'var(--space-2) var(--space-3)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
    transition: 'background-color 0.2s',
  });

  return (
    <nav style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
      <Link to="/" style={navLinkStyle(isActive('/'))}>
        Home
      </Link>
      <Link to="/vehicles" style={navLinkStyle(isActive('/vehicles'))}>
        Vehicles
      </Link>
      <Link to="/et-sim" style={navLinkStyle(isActive('/et-sim'))}>
        ET Sim
      </Link>
      <Link to="/suspension-sim" style={navLinkStyle(isActive('/suspension-sim'))}>
        Susp Sim
      </Link>
      <Link to="/clutch-sim" style={navLinkStyle(isActive('/clutch-sim'))}>
        Clutch Sim
      </Link>
      <Link to="/engine-sim" style={navLinkStyle(isActive('/engine-sim'))}>
        Engine Sim
      </Link>
      <Link to="/calculators" style={navLinkStyle(isActive('/calculators'))}>
        Calcs
      </Link>
      <Link to="/log" style={navLinkStyle(isActive('/log'))}>
        Log
      </Link>
      <Link to="/history" style={navLinkStyle(isActive('/history'))}>
        History
      </Link>
      <Link to="/about" style={navLinkStyle(isActive('/about'))}>
        About
      </Link>
      {/* DEV-only link */}
      {import.meta.env.DEV && (
        <Link to="/dev" style={navLinkStyle(isActive('/dev'))}>
          Dev
        </Link>
      )}
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider>
      <FlagsProvider>
        <AuthProvider>
          <VehicleProvider>
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
            padding: 'var(--space-4) var(--space-6)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-4)',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            Racing Systems Analysis
          </h1>
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
            <Navigation />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/et-sim" element={<Predict />} />
            <Route path="/predict" element={<Predict />} /> {/* Legacy redirect */}
            <Route path="/suspension-sim" element={<SuspensionSim />} />
            <Route path="/clutch-sim" element={<ClutchSim />} />
            <Route path="/engine-sim" element={<EngineSim />} />
            <Route path="/calculators" element={<Calculators />} />
            <Route path="/log" element={<Log />} />
            <Route path="/history" element={<History />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            {/* DEV-only route */}
            {import.meta.env.DEV && DevPortal && (
              <Route path="/dev" element={<DevPortal />} />
            )}
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
          </VehicleProvider>
        </AuthProvider>
      </FlagsProvider>
    </ThemeProvider>
  );
}

export default App;
