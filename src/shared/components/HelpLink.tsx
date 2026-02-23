import { Link } from 'react-router-dom';

interface HelpLinkProps {
  /** Which manual to open (matches Help page sidebar IDs) */
  manual?: 'quick-start' | 'quarter' | 'engine' | 'faq';
  /** Optional anchor within the manual */
  anchor?: string;
  /** Link text (default: "Help") */
  label?: string;
}

/**
 * Small contextual link to the Help Center.
 * Renders as a subtle inline link with a "?" icon.
 */
export default function HelpLink({ manual, anchor, label = 'Help' }: HelpLinkProps) {
  let to = '/help';
  if (manual) {
    to += `?doc=${manual}`;
    if (anchor) to += `#${anchor}`;
  }

  return (
    <Link
      to={to}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.75rem',
        color: 'var(--color-muted)',
        textDecoration: 'none',
        padding: '0.25rem 0.5rem',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        transition: 'color 0.15s, border-color 0.15s',
      }}
      title={`Open ${label} documentation`}
    >
      <span style={{ fontSize: '0.7rem', fontWeight: 700, width: '14px', height: '14px', borderRadius: '50%', border: '1.5px solid currentColor', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>?</span>
      {label}
    </Link>
  );
}
