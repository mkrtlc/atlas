import type { Label } from '../../lib/labels';
import { CHIP_RADIUS } from '../ui/chip';

interface LabelChipProps {
  label: Label;
}

/**
 * Compact label chip with a colored dot and text.
 *
 * Usage:
 *   <LabelChip label={{ id: 'urgent', name: 'Urgent', color: '#dc2626' }} />
 */
export function LabelChip({ label }: LabelChipProps) {
  return (
    <span
      aria-label={`Label: ${label.name}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 'var(--font-size-xs)',
        lineHeight: 1,
        fontFamily: 'var(--font-family)',
        fontWeight: 500,
        padding: '2px 7px 2px 5px',
        borderRadius: CHIP_RADIUS,
        border: '1px solid var(--color-border-secondary)',
        background: 'var(--color-bg-elevated)',
        color: 'var(--color-text-secondary)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        letterSpacing: '0.01em',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: label.color,
          flexShrink: 0,
        }}
      />
      {label.name}
    </span>
  );
}
