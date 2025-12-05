import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { lazy } from 'react';
import { ThemeProvider } from '../shared/ui/theme';
import { Vb6FixtureProvider } from '../shared/state/vb6FixtureStore';
import { FlagsProvider } from '../domain/flags/store.tsx';
import { VehicleProvider } from '../state/vehicleStore';
import Home from '../pages/Home';
import Predict from '../pages/Predict';
import SuspensionSim from '../pages/SuspensionSim';
import Log from '../pages/Log';
import History from '../pages/History';
import Vehicles from '../pages/Vehicles';
import About from '../pages/About';
import ThemeToggle from '../shared/components/ThemeToggle';

// DEV-only imports (lazy loaded)
const DevPortal = import.meta.env.DEV
  ? lazy(() => import('../pages/DevPortal'))
  : null;

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
          </div>
        </header>

        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/et-sim" element={<Predict />} />
            <Route path="/predict" element={<Predict />} /> {/* Legacy redirect */}
            <Route path="/suspension-sim" element={<SuspensionSim />} />
            <Route path="/log" element={<Log />} />
            <Route path="/history" element={<History />} />
            <Route path="/about" element={<About />} />
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
      </FlagsProvider>
    </ThemeProvider>
  );
}

export default App;
