import { ReactNode } from 'react';

interface PageProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Use full width layout (for pages that need more horizontal space) */
  wide?: boolean;
}

/**
 * Page component wrapper with consistent layout.
 * Provides a container with optional title and actions header.
 */
function Page({ title, actions, children, wide = false }: PageProps) {
  return (
    <div 
      className={wide ? undefined : "container"}
      style={wide ? { padding: 'var(--space-6)', maxWidth: '1800px', margin: '0 auto' } : undefined}
    >
      {(title || actions) && (
        <div
          className="flex items-center justify-between mb-6"
          style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}
        >
          {title && (
            <h1 style={{ margin: 0, color: 'var(--color-text)' }}>{title}</h1>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Page;
