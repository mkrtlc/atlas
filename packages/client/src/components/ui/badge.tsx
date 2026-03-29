import type { ReactNode, CSSProperties } from 'react';
import { Chip } from './chip';

interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  children: ReactNode;
}

const VARIANT_COLORS: Record<NonNullable<BadgeProps['variant']>, string | undefined> = {
  default: undefined,
  primary: 'var(--color-accent-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  const color = VARIANT_COLORS[variant];

  return (
    <Chip
      color={color}
      height={20}
      style={{
        padding: '0 var(--spacing-xs)',
        fontWeight: 'var(--font-weight-medium)' as CSSProperties['fontWeight'],
        ...(variant === 'default' && {
          background: 'var(--color-bg-elevated)',
          color: 'var(--color-text-secondary)',
          borderColor: 'var(--color-border-primary)',
        }),
      }}
    >
      {children}
    </Chip>
  );
}
