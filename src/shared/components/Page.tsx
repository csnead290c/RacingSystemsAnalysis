import { ReactNode } from 'react';

interface PageProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Page component wrapper with consistent layout.
 * Provides a container with optional title and actions header.
 */
function Page({ title, actions, children }: PageProps) {
  return (
    <div className="container">
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
