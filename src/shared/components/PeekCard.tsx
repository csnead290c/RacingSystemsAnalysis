import type { Tier } from '../../domain/config/entitlements';

interface PeekCardProps {
  title: string;
  tier: Tier;
  description: string;
  onLearnMore?: () => void;
}

/**
 * PeekCard component for locked/premium features.
 * Shows a preview of features available in higher tiers.
 */
function PeekCard({ title, tier, description, onLearnMore }: PeekCardProps) {
  const tierColors: Record<Tier, string> = {
    FREE: 'var(--color-muted)',
    JUNIOR: '#3b82f6',
    PRO: '#8b5cf6',
    NITRO: '#f59e0b',
  };

  const tierColor = tierColors[tier];

  return (
    <div
      className="card"
      style={{
        position: 'relative',
        opacity: 0.85,
        cursor: onLearnMore ? 'pointer' : 'default',
        transition: 'opacity 0.2s, transform 0.2s',
      }}
      onClick={onLearnMore}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.85';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Lock icon */}
      <div
        style={{
          position: 'absolute',
          top: 'var(--space-4)',
          right: 'var(--space-4)',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface)',
          borderRadius: '50%',
          border: '1px solid var(--color-border)',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>

      {/* Tier badge */}
      <div
        style={{
          display: 'inline-block',
          padding: 'var(--space-1) var(--space-3)',
          backgroundColor: tierColor,
          color: 'white',
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.75rem',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-3)',
        }}
      >
        {tier}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: 'var(--color-text)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-muted"
        style={{
          fontSize: '0.875rem',
          lineHeight: '1.5',
          marginBottom: onLearnMore ? 'var(--space-4)' : 0,
        }}
      >
        {description}
      </p>

      {/* CTA */}
      {onLearnMore && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            color: tierColor,
            fontSize: '0.875rem',
            fontWeight: '500',
          }}
        >
          <span>Learn more</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </div>
      )}
    </div>
  );
}

export default PeekCard;
