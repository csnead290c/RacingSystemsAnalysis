/**
 * Help Center — renders markdown manuals with sidebar navigation.
 * Manuals are fetched from /manuals/*.md (public folder).
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

/* ── Manual definitions ─────────────────────────────────── */

interface ManualEntry {
  id: string;
  label: string;
  file: string;
}

const MANUALS: ManualEntry[] = [
  { id: 'quick-start', label: 'Quick Start', file: 'SITE_QUICK_START.md' },
  { id: 'quarter',     label: 'Quarter Jr / Pro', file: 'QUARTER_JR_PRO.md' },
  { id: 'engine',      label: 'Engine Jr / Pro', file: 'ENGINE_JR_PRO.md' },
  { id: 'faq',         label: 'FAQ & Troubleshooting', file: 'FAQ_TROUBLESHOOTING.md' },
];

/* ── Heading ID generator (stable, matches anchor links) ── */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/* ── Custom markdown components for dark-theme styling ──── */

const mdComponents: Components = {
  h1: ({ children, ...props }) => {
    const id = slugify(String(children));
    return <h1 id={id} style={{ scrollMarginTop: '5rem' }} {...props}>{children}</h1>;
  },
  h2: ({ children, ...props }) => {
    const id = slugify(String(children));
    return (
      <h2
        id={id}
        style={{
          scrollMarginTop: '5rem',
          borderBottom: '1px solid var(--color-border)',
          paddingBottom: '0.5rem',
          marginTop: '2.5rem',
        }}
        {...props}
      >
        {children}
      </h2>
    );
  },
  h3: ({ children, ...props }) => {
    const id = slugify(String(children));
    return <h3 id={id} style={{ scrollMarginTop: '5rem', marginTop: '2rem' }} {...props}>{children}</h3>;
  },
  table: ({ children, ...props }) => (
    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '0.875rem',
        }}
        {...props}
      >
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th
      style={{
        textAlign: 'left',
        padding: '0.5rem 0.75rem',
        borderBottom: '2px solid var(--color-border)',
        backgroundColor: 'var(--color-surface)',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      style={{
        padding: '0.5rem 0.75rem',
        borderBottom: '1px solid var(--color-border)',
        verticalAlign: 'top',
      }}
      {...props}
    >
      {children}
    </td>
  ),
  code: ({ children, className, ...props }) => {
    const isBlock = className?.startsWith('language-');
    if (isBlock) {
      return (
        <pre
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            overflowX: 'auto',
            fontSize: '0.8125rem',
            lineHeight: 1.6,
          }}
        >
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    }
    return (
      <code
        style={{
          backgroundColor: 'var(--color-surface)',
          padding: '0.125rem 0.375rem',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85em',
        }}
        {...props}
      >
        {children}
      </code>
    );
  },
  blockquote: ({ children, ...props }) => (
    <blockquote
      style={{
        borderLeft: '3px solid var(--color-primary)',
        margin: '1rem 0',
        padding: '0.5rem 1rem',
        backgroundColor: 'rgba(59, 130, 246, 0.06)',
        borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      }}
      {...props}
    >
      {children}
    </blockquote>
  ),
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}
      {...props}
    >
      {children}
    </a>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '2rem 0' }} />
  ),
};

/* ── Help Center page ──────────────────────────────────── */

export default function Help() {
  const location = useLocation();
  const [activeId, setActiveId] = useState<string>(MANUALS[0].id);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse query param to determine which manual to show
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const docParam = searchParams.get('doc');
    if (docParam) {
      const matchedManual = MANUALS.find((m) => m.id === docParam);
      if (matchedManual) {
        setActiveId(matchedManual.id);
      }
    }
  }, [searchParams]);

  // Fetch markdown content when activeId changes
  const fetchContent = useCallback(async (manualId: string) => {
    const manual = MANUALS.find((m) => m.id === manualId);
    if (!manual) return;

    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/manuals/${manual.file}`);
      if (!resp.ok) throw new Error(`Failed to load ${manual.label}`);
      const text = await resp.text();
      setContent(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load manual');
      setContent('');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent(activeId);
    setSearchQuery(''); // Clear search when switching docs
  }, [activeId, fetchContent]);

  // Scroll to anchor after content loads
  useEffect(() => {
    if (loading || !content) return;
    const hash = location.hash.replace('#', '');
    if (!hash) return;

    // Small delay to let markdown render
    const timer = setTimeout(() => {
      // Try the full hash first, then strip the manual prefix
      let el = document.getElementById(hash);
      if (!el) {
        const stripped = hash.replace(/^(quick-start|quarter|engine|faq)-/, '');
        el = document.getElementById(stripped);
      }
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    return () => clearTimeout(timer);
  }, [loading, content, location.hash]);

  const handleNavClick = (id: string) => {
    setActiveId(id);
    setMobileSidebarOpen(false);
    // Update URL with query param
    navigate(`/help?doc=${id}`, { replace: true });
    // Scroll content to top
    if (contentRef.current?.scrollTo) contentRef.current.scrollTo(0, 0);
    if (window.scrollTo) window.scrollTo(0, 0);
  };

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 140px)' }}>
      {/* Mobile tab bar */}
      <div className="help-mobile-tabs" style={{ display: 'none' }}>
        <button
          className="help-mobile-toggle"
          onClick={() => setMobileSidebarOpen((o) => !o)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{MANUALS.find((m) => m.id === activeId)?.label ?? 'Help'}</span>
          <span style={{ fontSize: '0.75rem' }}>{mobileSidebarOpen ? '▲' : '▼'}</span>
        </button>
        {mobileSidebarOpen && (
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              marginTop: '0.25rem',
              overflow: 'hidden',
            }}
          >
            {MANUALS.map((m) => (
              <button
                key={m.id}
                onClick={() => handleNavClick(m.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.625rem 1rem',
                  textAlign: 'left',
                  border: 'none',
                  backgroundColor: m.id === activeId ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: m.id === activeId ? 'var(--color-primary)' : 'var(--color-text)',
                  fontWeight: m.id === activeId ? 600 : 400,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop sidebar */}
      <nav
        className="help-sidebar"
        style={{
          width: '220px',
          flexShrink: 0,
          borderRight: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '1.5rem 0',
        }}
      >
        <div style={{ padding: '0 1rem 1rem', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
          Help Center
        </div>
        {MANUALS.map((m) => (
          <button
            key={m.id}
            onClick={() => handleNavClick(m.id)}
            data-testid={`help-nav-${m.id}`}
            style={{
              display: 'block',
              width: '100%',
              padding: '0.5rem 1rem',
              textAlign: 'left',
              border: 'none',
              backgroundColor: m.id === activeId ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
              color: m.id === activeId ? 'var(--color-primary)' : 'var(--color-muted)',
              fontWeight: m.id === activeId ? 600 : 400,
              fontSize: '0.875rem',
              cursor: 'pointer',
              borderLeft: m.id === activeId ? '3px solid var(--color-primary)' : '3px solid transparent',
              transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </nav>

      {/* Main content */}
      <div
        ref={contentRef}
        className="help-content"
        style={{
          flex: 1,
          padding: '2rem 3rem',
          maxWidth: '900px',
          lineHeight: 1.7,
          fontSize: '0.9375rem',
          color: 'var(--color-text)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        {/* Search input */}
        {!loading && !error && (
          <div style={{ position: 'sticky', top: 0, backgroundColor: 'var(--color-bg)', paddingBottom: '0.5rem', zIndex: 10 }}>
            <input
              type="text"
              placeholder="Search headings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface)',
                color: 'var(--color-text)',
              }}
            />
          </div>
        )}

        {loading && (
          <div style={{ color: 'var(--color-muted)', padding: '2rem 0' }}>Loading…</div>
        )}
        {error && (
          <div style={{ color: '#dc2626', padding: '2rem 0' }}>{error}</div>
        )}
        {!loading && !error && (
          <div style={{ flex: 1 }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                ...mdComponents,
                h1: ({ children, ...props }) => {
                  const id = slugify(String(children));
                  const text = String(children).toLowerCase();
                  const query = searchQuery.toLowerCase();
                  const isVisible = !query || text.includes(query);
                  return (
                    <h1
                      id={id}
                      style={{
                        scrollMarginTop: '5rem',
                        display: isVisible ? 'block' : 'none',
                      }}
                      {...props}
                    >
                      {children}
                    </h1>
                  );
                },
                h2: ({ children, ...props }) => {
                  const id = slugify(String(children));
                  const text = String(children).toLowerCase();
                  const query = searchQuery.toLowerCase();
                  const isVisible = !query || text.includes(query);
                  return (
                    <h2
                      id={id}
                      style={{
                        scrollMarginTop: '5rem',
                        borderBottom: '1px solid var(--color-border)',
                        paddingBottom: '0.5rem',
                        marginTop: '2.5rem',
                        display: isVisible ? 'block' : 'none',
                      }}
                      {...props}
                    >
                      {children}
                    </h2>
                  );
                },
                h3: ({ children, ...props }) => {
                  const id = slugify(String(children));
                  const text = String(children).toLowerCase();
                  const query = searchQuery.toLowerCase();
                  const isVisible = !query || text.includes(query);
                  return (
                    <h3
                      id={id}
                      style={{
                        scrollMarginTop: '5rem',
                        marginTop: '2rem',
                        display: isVisible ? 'block' : 'none',
                      }}
                      {...props}
                    >
                      {children}
                    </h3>
                  );
                },
              }}
              disallowedElements={['script', 'iframe', 'object', 'embed']}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style>{`
        .help-mobile-tabs { display: none; }

        @media (max-width: 768px) {
          .help-sidebar { display: none !important; }
          .help-mobile-tabs {
            display: block !important;
            padding: 0.75rem 1rem 0;
          }
          .help-content {
            padding: 1rem !important;
          }
        }
      `}</style>
    </div>
  );
}
