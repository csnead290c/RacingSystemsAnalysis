import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from '../shared/ui/theme';
import Home from '../pages/Home';
import Predict from '../pages/Predict';
import Log from '../pages/Log';
import History from '../pages/History';
import Vehicles from '../pages/Vehicles';
import About from '../pages/About';
import ThemeToggle from '../shared/components/ThemeToggle';

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
      <Link to="/predict" style={navLinkStyle(isActive('/predict'))}>
        Predict
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
    </nav>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
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
            <Route path="/predict" element={<Predict />} />
            <Route path="/log" element={<Log />} />
            <Route path="/history" element={<History />} />
            <Route path="/about" element={<About />} />
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
    </ThemeProvider>
  );
}

export default App;
