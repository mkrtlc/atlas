import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { api } from '../../../lib/api-client';
import type { WidgetDefinition, WidgetProps } from './types';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

function StocksWidgetComponent({ width, height }: WidgetProps) {
  const { t } = useTranslation();
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem('atlas_stock_quotes');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 5 * 60 * 1000 && parsed.data?.length) {
          setQuotes(parsed.data);
          setLoading(false);
          return;
        }
      } catch { /* ignore */ }
    }

    (async () => {
      try {
        const { data } = await api.get('/stocks/quotes');
        const fetched = (data.data || []) as StockQuote[];
        if (fetched.length > 0) {
          setQuotes(fetched);
          localStorage.setItem('atlas_stock_quotes', JSON.stringify({ ts: Date.now(), data: fetched }));
        }
      } catch { /* API unavailable */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TrendingUp size={20} color="rgba(255,255,255,0.3)" />
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-sm)' }}>
        {t('widgets.stocksNoData')}
      </div>
    );
  }

  return (
    <div style={{ width, height, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '14px 20px', gap: 10 }}>
      {quotes.slice(0, 3).map((q) => (
        <div key={q.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'rgba(255,255,255,0.95)', minWidth: 60 }}>
            {q.symbol}
          </span>
          <span style={{ fontSize: 'var(--font-size-lg)', color: 'rgba(255,255,255,0.7)', fontVariantNumeric: 'tabular-nums' }}>
            ${q.price.toFixed(2)}
          </span>
          <span style={{
            fontSize: 'var(--font-size-md)', fontWeight: 500, fontVariantNumeric: 'tabular-nums',
            color: q.change >= 0 ? 'rgba(134,239,172,0.9)' : 'rgba(251,113,133,0.9)',
          }}>
            {q.change >= 0 ? '+' : ''}{q.changePercent.toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}

export const stocksWidget: WidgetDefinition = {
  id: 'stocks',
  name: 'Stocks',
  description: 'Live stock prices (AAPL, GOOGL, MSFT, AMZN, TSLA)',
  icon: TrendingUp,
  defaultEnabled: false,
  component: StocksWidgetComponent,
};
