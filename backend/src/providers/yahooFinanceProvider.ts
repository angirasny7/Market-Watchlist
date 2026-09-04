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
  };

  // Known US stocks
  private usTickers = new Set(['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'SPY', 'QQQ']);

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
   * Fetch single quote with automatic ticker fallback
   */
  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const rawTicker = symbol.trim().toUpperCase();
    const yahooTicker = this.resolveYahooTicker(rawTicker);

    try {
      let q = await this.yf.quote(yahooTicker);

      // Fallback for Tata Motors if TMCV.NS is unavailable
      if (!q && rawTicker === 'TATAMOTORS') {
        q = await this.yf.quote('TMPV.NS');
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
   * Alias satisfying requirements
   */
  async getHistoricalPrices(symbol: string, days: number = 30): Promise<HistoricalBar[]> {
    return this.getHistoricalBars(symbol, days);
  }
}
