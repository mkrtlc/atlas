import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import type { WidgetDefinition, WidgetProps } from './types';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const DEFAULT_TICKERS = ['AAPL', 'GOOGL', 'MSFT'];
const CACHE_KEY = 'atlasmail_stocks';
const CACHE_TTL = 5 * 60 * 1000;

function StocksWidgetComponent({ width, height }: WidgetProps) {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < CACHE_TTL) {
          setQuotes(parsed.data);
          return;
        }
      } catch { /* ignore */ }
    }

    async function fetchQuotes() {
      try {
        const results: StockQuote[] = [];
        for (const symbol of DEFAULT_TICKERS) {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`,
          );
          if (!res.ok) throw new Error('fetch failed');
          const json = await res.json();
          const meta = json.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const prevClose = meta.chartPreviousClose;
          const change = price - prevClose;
          const changePercent = (change / prevClose) * 100;
          results.push({ symbol, price, change, changePercent });
        }
        setQuotes(results);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: results }));
      } catch {
        // Fallback: show placeholder data
        setQuotes(DEFAULT_TICKERS.map((symbol) => ({
          symbol,
          price: 0,
          change: 0,
          changePercent: 0,
        })));
        setError(true);
      }
    }

    fetchQuotes();
  }, []);

  return (
    <div
      style={{
        width, height,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '6px 10px',
        gap: 3,
      }}
    >
      {quotes.length === 0 ? (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, textAlign: 'center' }}>
          Loading...
        </span>
      ) : (
        quotes.map((q) => (
          <div
            key={q.symbol}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 4,
            }}
          >
            <span style={{ fontSize: 9, fontWeight: 600, color: '#fff', minWidth: 36 }}>
              {q.symbol}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
              {error ? '—' : `$${q.price.toFixed(0)}`}
            </span>
            <span
              style={{
                fontSize: 8,
                fontWeight: 500,
                fontVariantNumeric: 'tabular-nums',
                color: error
                  ? 'rgba(255,255,255,0.4)'
                  : q.change >= 0
                    ? 'rgba(134,239,172,0.9)'
                    : 'rgba(251,113,133,0.9)',
              }}
            >
              {error ? '—' : `${q.change >= 0 ? '+' : ''}${q.changePercent.toFixed(1)}%`}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

export const stocksWidget: WidgetDefinition = {
  id: 'stocks',
  name: 'Stocks',
  description: 'Quick glance at stock prices for 3 default tickers',
  icon: TrendingUp,
  defaultEnabled: false,
  component: StocksWidgetComponent,
};
