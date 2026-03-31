import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
router.use(authMiddleware);

// In-memory cache (5 minute TTL)
let cache: { data: StockQuote[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

const SYMBOLS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA'];

async function fetchQuotes(): Promise<StockQuote[]> {
  // Use Yahoo Finance v8 API (no key required, server-side only)
  const results: StockQuote[] = [];

  try {
    const symbols = SYMBOLS.join(',');
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`,
      { headers: { 'User-Agent': 'Atlas/1.0' } }
    );

    if (!res.ok) throw new Error(`Yahoo API ${res.status}`);

    const json = await res.json() as any;
    const quotes = json?.quoteResponse?.result || [];

    for (const q of quotes) {
      results.push({
        symbol: q.symbol,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
      });
    }
  } catch (err) {
    logger.debug({ err }, 'Failed to fetch stock quotes from Yahoo');

    // Fallback: try finnhub (free, no key for basic quotes)
    try {
      for (const symbol of SYMBOLS.slice(0, 3)) {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=demo`);
        if (res.ok) {
          const q = await res.json() as any;
          if (q.c) {
            results.push({
              symbol,
              price: q.c,
              change: q.d ?? 0,
              changePercent: q.dp ?? 0,
            });
          }
        }
      }
    } catch {
      // Both APIs failed — return empty
    }
  }

  return results;
}

router.get('/quotes', async (_req: Request, res: Response) => {
  try {
    // Return cached data if fresh
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      res.json({ success: true, data: cache.data });
      return;
    }

    const quotes = await fetchQuotes();
    if (quotes.length > 0) {
      cache = { data: quotes, ts: Date.now() };
    }

    res.json({ success: true, data: quotes });
  } catch (error) {
    logger.error({ error }, 'Failed to get stock quotes');
    res.status(500).json({ success: false, error: 'Failed to fetch stock data' });
  }
});

export default router;
