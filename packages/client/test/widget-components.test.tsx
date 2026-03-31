import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the settings store used by EmptyState and animations
vi.mock('../src/stores/settings-store', () => ({
  useSettingsStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({ sendAnimation: false }),
}));

// Mock animation helpers that inject CSS into document head
vi.mock('../src/lib/animations', () => ({
  injectKeyframes: vi.fn(),
  injectInboxZero: vi.fn(),
}));

// Mock navigator.geolocation for weather widget
vi.stubGlobal('navigator', {
  ...globalThis.navigator,
  geolocation: {
    getCurrentPosition: vi.fn((_success, reject) => reject(new Error('denied'))),
  },
});

// Mock fetch for weather widget
vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

import { widgetRegistry } from '../src/components/home/widgets/registry';

// ─── Widget Registry ──────────────────────────────────────────────────────

describe('Widget Registry', () => {
  it('has at least 3 widgets registered', () => {
    expect(widgetRegistry.length).toBeGreaterThanOrEqual(3);
  });

  it('contains the quote widget', () => {
    const quote = widgetRegistry.find((w) => w.id === 'quote');
    expect(quote).toBeDefined();
    expect(quote!.name).toBe('Quote of the day');
  });

  it('contains the weather widget', () => {
    const weather = widgetRegistry.find((w) => w.id === 'weather');
    expect(weather).toBeDefined();
    expect(weather!.name).toBe('3-day forecast');
  });

  it('every widget has required fields (id, name, description, component)', () => {
    for (const widget of widgetRegistry) {
      expect(widget.id).toBeTruthy();
      expect(widget.name).toBeTruthy();
      expect(widget.description).toBeTruthy();
      expect(widget.component).toBeDefined();
      expect(widget.icon).toBeDefined();
      expect(typeof widget.defaultEnabled).toBe('boolean');
    }
  });

  it('widget IDs are unique', () => {
    const ids = widgetRegistry.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── QuoteWidget ──────────────────────────────────────────────────────────

describe('QuoteWidget', () => {
  it('renders a quote with text', () => {
    const QuoteWidget = widgetRegistry.find((w) => w.id === 'quote')!.component;
    const { container } = render(<QuoteWidget width={240} height={160} />);
    // Quote text is rendered inside a <p> tag
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph!.textContent!.length).toBeGreaterThan(0);
  });

  it('renders an author attribution', () => {
    const QuoteWidget = widgetRegistry.find((w) => w.id === 'quote')!.component;
    const { container } = render(<QuoteWidget width={240} height={160} />);
    // Author is rendered in a <span> starting with "—"
    const spans = container.querySelectorAll('span');
    const authorSpan = Array.from(spans).find((s) =>
      s.textContent?.startsWith('—'),
    );
    expect(authorSpan).toBeDefined();
  });

  it('renders within the specified dimensions', () => {
    const QuoteWidget = widgetRegistry.find((w) => w.id === 'quote')!.component;
    const { container } = render(<QuoteWidget width={300} height={200} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('300px');
    expect(wrapper.style.height).toBe('200px');
  });

  it('applies italic font style to the quote text', () => {
    const QuoteWidget = widgetRegistry.find((w) => w.id === 'quote')!.component;
    const { container } = render(<QuoteWidget width={240} height={160} />);
    const paragraph = container.querySelector('p');
    expect(paragraph!.style.fontStyle).toBe('italic');
  });
});

// ─── WeatherWidget ────────────────────────────────────────────────────────

describe('WeatherWidget', () => {
  it('shows a loading state initially', () => {
    // Clear any cached weather data
    localStorage.removeItem('atlasmail_weather_forecast');

    const WeatherWidget = widgetRegistry.find((w) => w.id === 'weather')!.component;
    const { container } = render(<WeatherWidget width={240} height={160} />);
    // In loading state, a Wind icon SVG is shown with pulse animation
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders within the specified dimensions wrapper', () => {
    localStorage.removeItem('atlasmail_weather_forecast');

    const WeatherWidget = widgetRegistry.find((w) => w.id === 'weather')!.component;
    const { container } = render(<WeatherWidget width={240} height={160} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.width).toBe('240px');
    expect(wrapper.style.height).toBe('160px');
  });

  it('displays forecast data when cached data is available', () => {
    const cachedData = {
      ts: Date.now(),
      data: [
        { date: '2026-03-30', high: 22, low: 12, code: 0 },
        { date: '2026-03-31', high: 20, low: 10, code: 1 },
        { date: '2026-04-01', high: 18, low: 9, code: 3 },
      ],
    };
    localStorage.setItem('atlasmail_weather_forecast', JSON.stringify(cachedData));

    const WeatherWidget = widgetRegistry.find((w) => w.id === 'weather')!.component;
    const { container } = render(<WeatherWidget width={240} height={160} />);
    // Should render temperature numbers
    expect(container.textContent).toContain('22°');
    expect(container.textContent).toContain('12°');

    localStorage.removeItem('atlasmail_weather_forecast');
  });
});
