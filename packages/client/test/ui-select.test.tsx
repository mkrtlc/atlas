import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Select, type SelectOption } from '../src/components/ui/select';

const options: SelectOption[] = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

describe('Select', () => {
  it('renders with placeholder when no value is selected', () => {
    render(<Select value="" onChange={() => {}} options={options} placeholder="Pick a fruit" />);
    expect(screen.getByText('Pick a fruit')).toBeInTheDocument();
  });

  it('renders the selected value label', () => {
    render(<Select value="banana" onChange={() => {}} options={options} />);
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('renders default placeholder when none is provided', () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    expect(screen.getByText('Select...')).toBeInTheDocument();
  });

  it('applies sm size height of 28px', () => {
    render(<Select value="" onChange={() => {}} options={options} size="sm" />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.height).toBe('28px');
  });

  it('applies md size height of 34px by default', () => {
    render(<Select value="" onChange={() => {}} options={options} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.height).toBe('34px');
  });

  it('applies lg size height of 40px', () => {
    render(<Select value="" onChange={() => {}} options={options} size="lg" />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.height).toBe('40px');
  });

  it('renders the chevron icon', () => {
    const { container } = render(
      <Select value="" onChange={() => {}} options={options} />,
    );
    // Lucide ChevronDown renders an SVG
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('disables the trigger button when disabled prop is true', () => {
    render(<Select value="" onChange={() => {}} options={options} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger).toBeDisabled();
  });

  it('applies opacity 0.6 when disabled', () => {
    render(<Select value="" onChange={() => {}} options={options} disabled />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.opacity).toBe('0.6');
  });

  it('renders with custom width when specified', () => {
    render(<Select value="" onChange={() => {}} options={options} width={200} />);
    const trigger = screen.getByRole('button');
    expect(trigger.style.width).toBe('200px');
  });

  it('renders selected option icon when option has an icon', () => {
    const optionsWithIcon: SelectOption[] = [
      { value: 'star', label: 'Star', icon: <span data-testid="star-icon">★</span> },
    ];
    render(<Select value="star" onChange={() => {}} options={optionsWithIcon} />);
    expect(screen.getByTestId('star-icon')).toBeInTheDocument();
  });
});
