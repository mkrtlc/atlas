import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SettingsSection,
  SettingsRow,
  SettingsToggle,
  SettingsSelect,
  SelectableCard,
  RadioOption,
} from '../src/components/settings/settings-primitives';

describe('SettingsSection', () => {
  it('renders the title text', () => {
    render(
      <SettingsSection title="General">
        <div>Content</div>
      </SettingsSection>,
    );
    expect(screen.getByText('General')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <SettingsSection title="Theme" description="Choose your preferred theme">
        <div>Content</div>
      </SettingsSection>,
    );
    expect(screen.getByText('Choose your preferred theme')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <SettingsSection title="Section">
        <span>Child element</span>
      </SettingsSection>,
    );
    expect(screen.getByText('Child element')).toBeInTheDocument();
  });

  it('renders title as an h3 element', () => {
    render(
      <SettingsSection title="Heading">
        <div>Body</div>
      </SettingsSection>,
    );
    const heading = screen.getByText('Heading');
    expect(heading.tagName).toBe('H3');
  });

  it('does not render description paragraph when not provided', () => {
    const { container } = render(
      <SettingsSection title="NoDesc">
        <div>Body</div>
      </SettingsSection>,
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

describe('SettingsRow', () => {
  it('renders the label', () => {
    render(
      <SettingsRow label="Dark mode">
        <input type="checkbox" />
      </SettingsRow>,
    );
    expect(screen.getByText('Dark mode')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <SettingsRow label="Notifications" description="Enable push notifications">
        <input type="checkbox" />
      </SettingsRow>,
    );
    expect(screen.getByText('Enable push notifications')).toBeInTheDocument();
  });

  it('renders children (the control)', () => {
    render(
      <SettingsRow label="Setting">
        <button>Toggle</button>
      </SettingsRow>,
    );
    expect(screen.getByText('Toggle')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    const { container } = render(
      <SettingsRow label="Simple">
        <span>Control</span>
      </SettingsRow>,
    );
    // Only the label div and the control span
    const innerDivs = container.querySelectorAll('div > div');
    // No description div should exist after the label
    const descDiv = Array.from(innerDivs).find(
      (el) => el.textContent === 'Enable push notifications',
    );
    expect(descDiv).toBeUndefined();
  });
});

describe('SettingsToggle', () => {
  it('renders as a switch role', () => {
    render(<SettingsToggle checked={false} onChange={() => {}} label="Toggle" />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('reflects checked state via aria-checked', () => {
    render(<SettingsToggle checked={true} onChange={() => {}} label="On" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('reflects unchecked state via aria-checked', () => {
    render(<SettingsToggle checked={false} onChange={() => {}} label="Off" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onChange with toggled value on click', () => {
    const onChange = vi.fn();
    render(<SettingsToggle checked={false} onChange={onChange} label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange with false when currently checked', () => {
    const onChange = vi.fn();
    render(<SettingsToggle checked={true} onChange={onChange} label="Toggle" />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('has the correct aria-label', () => {
    render(<SettingsToggle checked={false} onChange={() => {}} label="Animations" />);
    expect(screen.getByLabelText('Animations')).toBeInTheDocument();
  });
});

describe('SettingsSelect', () => {
  const options = [
    { value: 'en', label: 'English' },
    { value: 'tr', label: 'Turkish' },
    { value: 'de', label: 'German' },
  ];

  it('renders the currently selected option label', () => {
    render(<SettingsSelect value="en" options={options} onChange={() => {}} />);
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows dropdown options when clicked', () => {
    render(<SettingsSelect value="en" options={options} onChange={() => {}} />);
    // Click the trigger button
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    // All options should now be visible
    expect(screen.getByText('Turkish')).toBeInTheDocument();
    expect(screen.getByText('German')).toBeInTheDocument();
  });

  it('calls onChange with the selected option value', () => {
    const onChange = vi.fn();
    render(<SettingsSelect value="en" options={options} onChange={onChange} />);
    // Open dropdown
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    // Click on Turkish
    fireEvent.click(screen.getByText('Turkish'));
    expect(onChange).toHaveBeenCalledWith('tr');
  });
});

describe('SelectableCard', () => {
  it('renders children content', () => {
    render(
      <SelectableCard selected={false} onClick={() => {}}>
        <span>Card content</span>
      </SelectableCard>,
    );
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(
      <SelectableCard selected={false} onClick={onClick}>
        <span>Click me</span>
      </SelectableCard>,
    );
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('RadioOption', () => {
  it('renders the label', () => {
    render(<RadioOption selected={false} onClick={() => {}} label="Option A" />);
    expect(screen.getByText('Option A')).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <RadioOption
        selected={false}
        onClick={() => {}}
        label="Option A"
        description="Description of option A"
      />,
    );
    expect(screen.getByText('Description of option A')).toBeInTheDocument();
  });

  it('has aria-checked true when selected', () => {
    render(<RadioOption selected={true} onClick={() => {}} label="Selected" />);
    const radio = screen.getByRole('radio');
    expect(radio).toHaveAttribute('aria-checked', 'true');
  });
});
