import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Skeleton } from '../src/components/ui/skeleton';
import { Chip } from '../src/components/ui/chip';
import { IconButton } from '../src/components/ui/icon-button';

// Tooltip uses Radix Tooltip which needs a Provider — mock it to just render children
vi.mock('@radix-ui/react-tooltip', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
  Root: ({ children }: { children: React.ReactNode }) => children,
  Trigger: ({ children }: { children: React.ReactNode }) => children,
  Portal: ({ children }: { children: React.ReactNode }) => children,
  Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Arrow: () => null,
}));

// ─── Skeleton ─────────────────────────────────────────────────────────────

describe('Skeleton', () => {
  it('renders with default dimensions', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe('100%');
    expect(div.style.height).toBe('16px');
  });

  it('renders with custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={40} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.width).toBe('200px');
    expect(div.style.height).toBe('40px');
  });

  it('renders with custom border radius', () => {
    const { container } = render(<Skeleton borderRadius="50%" />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.borderRadius).toBe('50%');
  });

  it('has aria-hidden attribute', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies shimmer animation', () => {
    const { container } = render(<Skeleton />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.animation).toContain('shimmer');
  });
});

// ─── Chip ─────────────────────────────────────────────────────────────────

describe('Chip', () => {
  it('renders children text', () => {
    render(<Chip>Status</Chip>);
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  it('renders as a span when no onClick is provided', () => {
    const { container } = render(<Chip>Tag</Chip>);
    const element = container.firstChild as HTMLElement;
    expect(element.tagName).toBe('SPAN');
  });

  it('renders as a button when onClick is provided', () => {
    render(<Chip onClick={() => {}}>Clickable</Chip>);
    const btn = screen.getByRole('button');
    expect(btn).toBeInTheDocument();
  });

  it('renders remove button when onRemove is provided', () => {
    render(<Chip onRemove={() => {}}>Removable</Chip>);
    expect(screen.getByLabelText('Remove')).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    const onRemove = vi.fn();
    render(<Chip onRemove={onRemove}>Tag</Chip>);
    fireEvent.click(screen.getByLabelText('Remove'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('applies custom height', () => {
    const { container } = render(<Chip height={30}>Tall</Chip>);
    const element = container.firstChild as HTMLElement;
    expect(element.style.height).toBe('30px');
  });

  it('applies color-based background when color prop is given', () => {
    const { container } = render(<Chip color="#ff0000">Red</Chip>);
    const element = container.firstChild as HTMLElement;
    // color-mix() may not parse in happy-dom, so check the raw style attribute
    const styleAttr = element.getAttribute('style') || '';
    expect(styleAttr).toContain('#ff0000');
  });
});

// ─── IconButton ───────────────────────────────────────────────────────────

describe('IconButton', () => {
  it('renders the icon', () => {
    render(
      <IconButton
        icon={<span data-testid="test-icon">X</span>}
        label="Close"
        tooltip={false}
      />,
    );
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('has the correct aria-label', () => {
    render(
      <IconButton
        icon={<span>X</span>}
        label="Delete"
        tooltip={false}
      />,
    );
    expect(screen.getByLabelText('Delete')).toBeInTheDocument();
  });

  it('applies default size of 28px', () => {
    render(
      <IconButton
        icon={<span>X</span>}
        label="Action"
        tooltip={false}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.width).toBe('28px');
    expect(btn.style.height).toBe('28px');
  });

  it('applies custom size', () => {
    render(
      <IconButton
        icon={<span>X</span>}
        label="Action"
        size={36}
        tooltip={false}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.width).toBe('36px');
    expect(btn.style.height).toBe('36px');
  });

  it('applies accent color when active', () => {
    render(
      <IconButton
        icon={<span>★</span>}
        label="Starred"
        active
        tooltip={false}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.color).toBe('var(--color-accent-primary)');
  });

  it('applies custom activeColor when provided', () => {
    render(
      <IconButton
        icon={<span>★</span>}
        label="Star"
        active
        activeColor="gold"
        tooltip={false}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.color).toBe('gold');
  });

  it('applies tertiary text color when inactive', () => {
    render(
      <IconButton
        icon={<span>X</span>}
        label="Inactive"
        tooltip={false}
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn.style.color).toBe('var(--color-text-tertiary)');
  });
});
