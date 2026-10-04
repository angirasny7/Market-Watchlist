import YahooFinance from 'yahoo-finance2';
import { IMarketDataProvider, MarketQuote, HistoricalBar } from './marketDataProvider.js';

export class YahooFinanceProvider implements IMarketDataProvider {
  readonly providerName = 'Yahoo Finance Real-Time Market Provider';
  private yf: InstanceType<typeof YahooFinance>;

  // Mapping known Indian symbols to their active Yahoo Finance tickers
  private symbolMap: Record<string, string> = {
    TATAMOTORS: 'TMCV.NS', // Tata Motors Commercial Vehicles (post-demerger primary ticker)
    TMPV: 'TMPV.NS',
    TMCV: 'TMCV.NS',
    INFY: 'INFY.NS',
    TCS: 'TCS.NS',
    RELIANCE: 'RELIANCE.NS',
    HDFCBANK: 'HDFCBANK.NS',
    ICICIBANK: 'ICICIBANK.NS',
    LT: 'LT.NS',
    BHARTIARTL: 'BHARTIARTL.NS',
    SBIN: 'SBIN.NS',
    ITC: 'ITC.NS',
    SUZLON: 'SUZLON.NS',
    ZOMATO: 'ETERNAL.NS',
    ETERNAL: 'ETERNAL.NS',
    NIFTY50: '^NSEI',
    NIFTY: '^NSEI',
    SENSEX: '^BSESN',
    INDIAVIX: '^INDIAVIX',
    VIX: '^INDIAVIX',
  };

  // Known US stocks
  private usTickers = new Set([
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ',
    'NFLX', 'AMD', 'INTC', 'CRM', 'ORCL', 'ADBE', 'JPM', 'WMT', 'DIS', 'BA',
    'BABA', 'NKE', 'HD', 'PG', 'JNJ', 'UNH', 'V', 'MA'
  ]);

  constructor() {
    // Suppress survey notices in stdout
    this.yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
  }

  /**
   * Normalizes an internal symbol to Yahoo Finance query ticker.
   */
  public resolveYahooTicker(symbol: string): string {
    const upper = symbol.trim().toUpperCase();

    if (this.symbolMap[upper]) {
      return this.symbolMap[upper];
    }

    if (upper.startsWith('^')) {
      return upper;
    }

    if (upper.includes('.') || upper.includes('=')) {
      return upper;
    }

    if (this.usTickers.has(upper)) {
      return upper;
    }

    // Default assume Indian NSE stock if not explicitly US
    return `${upper}.NS`;
  }

  /**
   * Format market cap into readable format
   */
  private formatMarketCap(cap?: number, currency?: string): string {
    if (!cap || isNaN(cap)) return 'N/A';
    if (currency === 'INR') {
      const crore = cap / 10000000;
      if (crore >= 100000) {
        return `₹${(crore / 100000).toFixed(2)} Lakh Cr`;
      }
      return `₹${crore.toFixed(0)} Cr`;
    }
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  }

  /**
   * Helper executing async operation with exponential backoff retry on 429 / network errors
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retries = 3,
    baseDelayMs = 200
  ): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await operation();
      } catch (err: any) {
        attempt++;
        const msg = String(err?.message || '');
        const isRateLimit = err?.status === 429 || msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate limit');
        const isNetwork = err?.code === 'ECONNRESET' || err?.code === 'ETIMEDOUT' || msg.includes('timeout') || msg.includes('socket hang up');

        if (attempt >= retries || (!isRateLimit && !isNetwork)) {
          throw err;
        }

        const jitter = Math.random() * 80;
        const delay = Math.min(2500, baseDelayMs * Math.pow(2, attempt) + jitter);
        console.warn(`[YahooFinanceProvider] ${operationName} hit retryable error (${msg}). Retrying in ${delay.toFixed(0)}ms (attempt ${attempt}/${retries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Fetch single quote with automatic ticker fallback
   */
  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const rawTicker = symbol.trim().toUpperCase();
    const yahooTicker = this.resolveYahooTicker(rawTicker);

    try {
      let q = await this.executeWithRetry(
        () => this.yf.quote(yahooTicker),
        `getQuote(${rawTicker})`
      );

      // Fallback for Tata Motors if TMCV.NS is unavailable
      if (!q && rawTicker === 'TATAMOTORS') {
        q = await this.executeWithRetry(
          () => this.yf.quote('TMPV.NS'),
          'getQuote(TATAMOTORS fallback TMPV)'
        );
      }

      if (!q || q.regularMarketPrice === undefined) {
        console.warn(`[YahooFinanceProvider] No valid quote data returned for ${rawTicker} (${yahooTicker})`);
        return null;
      }

      const isINR = q.currency === 'INR';
      const price = Number(q.regularMarketPrice || 0);
      const changeAmount = Number(q.regularMarketChange || 0);
      const changePercent = Number(q.regularMarketChangePercent || 0);
      const volume = Number(q.regularMarketVolume || 0);
      const avgVolume20D = Number(q.averageDailyVolume10Day || q.averageDailyVolume3Month || volume || 0);
      const high52w = Number(q.fiftyTwoWeekHigh || price);
      const low52w = Number(q.fiftyTwoWeekLow || price);
      const peRatio = q.trailingPE ? Number(q.trailingPE) : undefined;
      const marketCap = this.formatMarketCap(q.marketCap, q.currency);

      return {
        symbol: rawTicker,
        companyName: q.shortName || q.longName || rawTicker,
        price,
        changeAmount: parseFloat(changeAmount.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        volume,
        avgVolume20D,
        high52w: parseFloat(high52w.toFixed(2)),
        low52w: parseFloat(low52w.toFixed(2)),
        peRatio: peRatio ? parseFloat(peRatio.toFixed(1)) : undefined,
        marketCap,
        exchange: q.exchange || (isINR ? 'NSE' : 'NASDAQ'),
        currency: isINR ? '₹' : '$',
        timestamp: new Date(),
      };
    } catch (err: any) {
      console.error(`[YahooFinanceProvider] Failed to fetch quote for ${rawTicker} (${yahooTicker}): ${err.message}`);
      return null;
    }
  }

  /**
   * Batch fetch quotes with error isolation per symbol
   */
  async getBatchQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const results = await Promise.allSettled(
      symbols.map((sym) => this.getQuote(sym))
    );

    const quotes: MarketQuote[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value !== null) {
        quotes.push(r.value);
      }
    }
    return quotes;
  }

  /**
   * Fetch daily historical bars for charts and sparklines
   */
  async getHistoricalBars(symbol: string, days: number = 30): Promise<HistoricalBar[]> {
    const rawTicker = symbol.trim().toUpperCase();
    const yahooTicker = this.resolveYahooTicker(rawTicker);

    try {
      const startDate = new Date(Date.now() - (days + 7) * 24 * 60 * 60 * 1000);
      const chart = await this.yf.chart(yahooTicker, {
        period1: startDate,
        interval: '1d',
      });

      if (!chart || !chart.quotes || chart.quotes.length === 0) {
        return [];
      }

      return chart.quotes
        .filter((q) => q.close !== undefined && q.close !== null)
        .slice(-days)
        .map((q) => ({
          timestamp: new Date(q.date),
          open: Number(q.open || q.close),
          high: Number(q.high || q.close),
          low: Number(q.low || q.close),
          close: Number(q.close),
          volume: Number(q.volume || 0),
        }));
    } catch (err: any) {
      console.error(`[YahooFinanceProvider] Failed to fetch historical bars for ${rawTicker}: ${err.message}`);
      return [];
    }
  }

  /**
   * Fetch real news articles from Yahoo Finance for symbol
   */
  async getNews(symbol: string, count: number = 10): Promise<Array<{
    headline: string;
    summary: string;
    sourceName: string;
    sourceUrl: string;
    publishedAt: Date;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  }>> {
    const rawTicker = symbol.trim().toUpperCase();
    const yahooTicker = this.resolveYahooTicker(rawTicker);

    // Friendly names for better search discovery on Indian stocks
    const nameMap: Record<string, string> = {
      INFY: 'Infosys',
      TCS: 'Tata Consultancy Services',
      TATAMOTORS: 'Tata Motors',
      RELIANCE: 'Reliance Industries',
      HDFCBANK: 'HDFC Bank',
      ICICIBANK: 'ICICI Bank',
      BHARTIARTL: 'Bharti Airtel',
      SBIN: 'State Bank of India',
      ITC: 'ITC Limited',
      LT: 'Larsen Toubro',
    };

    const query = nameMap[rawTicker] || rawTicker;

    try {
      const res = await this.yf.search(query, { newsCount: count });
      const newsItems = res?.news || [];

      return newsItems
        .filter((n: any) => n.title && n.link && n.link.startsWith('http'))
        .map((n: any) => {
          const titleLower = (n.title || '').toLowerCase();
          let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
          if (titleLower.includes('surge') || titleLower.includes('jump') || titleLower.includes('rally') || titleLower.includes('gain') || titleLower.includes('beat') || titleLower.includes('profit') || titleLower.includes('growth')) {
            sentiment = 'BULLISH';
          } else if (titleLower.includes('drop') || titleLower.includes('fall') || titleLower.includes('plunge') || titleLower.includes('loss') || titleLower.includes('miss') || titleLower.includes('decline')) {
            sentiment = 'BEARISH';
          }

          return {
            headline: n.title.trim(),
            summary: n.summary || n.title.trim(),
            sourceName: n.publisher || 'Financial News',
            sourceUrl: n.link.trim(),
            publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime) : new Date(),
            sentiment,
          };
        });
    } catch (err: any) {
      console.warn(`[YahooFinanceProvider] News search error for ${rawTicker}: ${err.message}`);
      return [];
    }
  }

  /**
   * Alias satisfying requirements
   */
  async getHistoricalPrices(symbol: string, days: number = 30): Promise<HistoricalBar[]> {
    return this.getHistoricalBars(symbol, days);
  }
}
