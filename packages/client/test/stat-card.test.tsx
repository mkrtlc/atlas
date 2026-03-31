import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard, InfoCard } from '../src/components/ui/stat-card';
import { Users, DollarSign, Briefcase } from 'lucide-react';

describe('StatCard', () => {
  it('renders label text', () => {
    render(<StatCard label="Total revenue" value="$42,000" />);
    expect(screen.getByText('Total revenue')).toBeDefined();
  });

  it('renders value text', () => {
    render(<StatCard label="Deals" value="128" />);
    expect(screen.getByText('128')).toBeDefined();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard label="Revenue" value="$10k" subtitle="+12% from last month" />);
    expect(screen.getByText('+12% from last month')).toBeDefined();
  });

  it('does not render subtitle when not provided', () => {
    const { container } = render(<StatCard label="Revenue" value="$10k" />);
    // The subtitle text should simply not appear in the DOM
    expect(container.textContent).not.toContain('+12%');
    // Only label and value text should be present
    expect(container.textContent).toContain('Revenue');
    expect(container.textContent).toContain('$10k');
  });

  it('applies custom color to value', () => {
    const { container } = render(<StatCard label="Status" value="Active" color="#f97316" />);
    // Find the value element by its text content
    const valueEl = screen.getByText('Active');
    expect(valueEl.style.color).toBe('#f97316');
  });

  it('renders icon when provided', () => {
    const { container } = render(<StatCard label="Users" value="50" icon={Users} />);
    // The icon is rendered as an SVG
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render icon SVG when not provided', () => {
    const { container } = render(<StatCard label="Count" value="7" />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBe(0);
  });
});

describe('InfoCard', () => {
  const sampleRows = [
    { label: 'Total files', value: '1,204' },
    { label: 'Storage used', value: '4.2 GB' },
    { label: 'Last upload', value: '2 hours ago' },
  ];

  it('renders title text', () => {
    render(<InfoCard title="Storage info" rows={sampleRows} />);
    expect(screen.getByText('Storage info')).toBeDefined();
  });

  it('renders all row labels', () => {
    render(<InfoCard title="Stats" rows={sampleRows} />);
    expect(screen.getByText('Total files')).toBeDefined();
    expect(screen.getByText('Storage used')).toBeDefined();
    expect(screen.getByText('Last upload')).toBeDefined();
  });

  it('renders all row values', () => {
    render(<InfoCard title="Stats" rows={sampleRows} />);
    expect(screen.getByText('1,204')).toBeDefined();
    expect(screen.getByText('4.2 GB')).toBeDefined();
    expect(screen.getByText('2 hours ago')).toBeDefined();
  });

  it('renders icon when provided', () => {
    const { container } = render(<InfoCard title="Info" rows={sampleRows} icon={Briefcase} />);
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders correct number of row pairs', () => {
    render(<InfoCard title="Data" rows={sampleRows} />);
    // Each row renders both a label and a value, so all 3 rows are present
    expect(screen.getByText('Total files')).toBeDefined();
    expect(screen.getByText('Storage used')).toBeDefined();
    expect(screen.getByText('Last upload')).toBeDefined();
    expect(screen.getByText('1,204')).toBeDefined();
    expect(screen.getByText('4.2 GB')).toBeDefined();
    expect(screen.getByText('2 hours ago')).toBeDefined();
  });

  it('handles empty rows array', () => {
    const { container } = render(<InfoCard title="Empty" rows={[]} />);
    expect(screen.getByText('Empty')).toBeDefined();
    // With no rows, only the title text should be in the card
    expect(container.textContent).toBe('Empty');
  });
});
