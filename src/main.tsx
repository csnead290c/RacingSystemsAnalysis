import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { ThemeProvider } from './shared/ui/theme';
import { ErrorBoundary } from './app/ErrorBoundary';
import './index.css';
import './shared/ui/tokens.css';
import './shared/ui/atoms.css';
import './shared/ui/layout.css';

// VB6 Interpreter test - exposes testVB6Interpreter() to console (DEV only, non-fatal)
// Path built via variable to prevent Vite from statically resolving a missing module
if (import.meta.env.DEV) {
  const mod = './domain/physics/vb6/' + 'testVB6Console';
  import(/* @vite-ignore */ mod).catch(() => {});
}

// One-time Clerk cleanup — Clerk has been removed from the app.
// Remove stale Clerk localStorage keys so they don't confuse legacy auth.
const CLERK_KEYS_TO_REMOVE = [
  'rsa.auth.clerkToken',
  'rsa.auth.clerkSession',
];
for (const key of CLERK_KEYS_TO_REMOVE) {
  localStorage.removeItem(key);
}
// If currentUser is a Clerk user (id starts with "clerk_"), remove it
// so authStore doesn't try to trust it.
try {
  const cu = localStorage.getItem('rsa.auth.currentUser');
  if (cu && cu.includes('"clerk_')) {
    localStorage.removeItem('rsa.auth.currentUser');
    localStorage.removeItem('rsa.auth.apiProducts');
    console.log('[Auth] Removed stale Clerk user from localStorage');
  }
} catch { /* ignore */ }

// Service worker cleanup — unregister stale SWs that may serve old cached JS.
// The CDN cached sw.js with immutable headers, so users may have a stale SW.
// This runs on every page load to ensure stale SWs are cleaned up.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister().then(ok => {
        if (ok) console.log('[SW] Unregistered stale service worker:', registration.scope);
      });
    }
  });
  // Clear all SW caches to remove stale precached assets
  caches.keys().then(names => {
    for (const name of names) {
      caches.delete(name);
      console.log('[SW] Deleted cache:', name);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
