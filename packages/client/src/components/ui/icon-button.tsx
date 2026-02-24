import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode } from 'react';
import { Tooltip } from './tooltip';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon element or any ReactNode */
  icon: ReactNode;
  /** Accessible label (also used for tooltip) */
  label: string;
  /** Button size in pixels. Defaults to 28 */
  size?: number;
  /** Show tooltip on hover */
  tooltip?: boolean;
  /** Tooltip side */
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
  /** Red color on hover */
  destructive?: boolean;
  /** Active/pressed state — uses accent color */
  active?: boolean;
  /** Override active color (e.g. star gold) */
  activeColor?: string;
  /** Scale down on press */
  pressEffect?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      label,
      size = 28,
      tooltip = true,
      tooltipSide = 'bottom',
      destructive = false,
      active = false,
      activeColor,
      pressEffect = false,
      style,
      ...props
    },
    ref,
  ) => {
    const resolvedColor = active
      ? activeColor || 'var(--color-accent-primary)'
      : 'var(--color-text-tertiary)';

    const baseStyle: CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: size,
      height: size,
      border: 'none',
      borderRadius: 'var(--radius-md)',
      background: 'transparent',
      color: resolvedColor,
      cursor: 'pointer',
      flexShrink: 0,
      padding: 0,
      transition:
        'background var(--transition-normal), color var(--transition-normal), transform 120ms ease',
      ...style,
    };

    const button = (
      <button
        ref={ref}
        aria-label={label}
        style={baseStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--color-surface-active)';
          if (destructive) {
            e.currentTarget.style.color = 'var(--color-error)';
          } else if (!active) {
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = resolvedColor;
          if (pressEffect) e.currentTarget.style.transform = 'scale(1)';
        }}
        onMouseDown={
          pressEffect
            ? (e) => {
                e.currentTarget.style.transform = 'scale(0.92)';
              }
            : undefined
        }
        onMouseUp={
          pressEffect
            ? (e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }
            : undefined
        }
        {...props}
      >
        {icon}
      </button>
    );

    if (tooltip) {
      return (
        <Tooltip content={label} side={tooltipSide}>
          {button}
        </Tooltip>
      );
    }

    return button;
  },
);

IconButton.displayName = 'IconButton';
