/**
 * Market Data Provider Abstraction Layer
 * 
 * Defines standard interfaces for real-time market quotes and historical ticks,
 * allowing seamless plug-and-play integration with providers such as:
 * - Yahoo Finance
 * - Alpha Vantage
 * - Finnhub
 * - Twelve Data
 * - Polygon.io
 * without altering downstream core services or business logic.
 */
import { prisma } from '../config/prisma.js';

export interface MarketQuote {
  symbol: string;
  companyName: string;
  price: number;
  changeAmount: number;
  changePercent: number;
  volume: number;
  avgVolume20D: number;
  high52w: number;
  low52w: number;
  peRatio?: number;
  marketCap?: string;
  exchange: string;
  currency: string;
  timestamp: Date;
}

export interface HistoricalBar {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IMarketDataProvider {
  readonly providerName: string;
  getQuote(symbol: string): Promise<MarketQuote | null>;
  getBatchQuotes(symbols: string[]): Promise<MarketQuote[]>;
  getHistoricalBars(symbol: string, days?: number): Promise<HistoricalBar[]>;
}

/**
 * Built-in Simulated / Canonical Market Data Provider
 * Serves canonical high-fidelity quotes and prices when live market API keys are not supplied.
 */
export class SimulatedMarketDataProvider implements IMarketDataProvider {
  readonly providerName = 'Simulated / Canonical Provider';

  private mockCatalog: Record<string, MarketQuote> = {
    TATAMOTORS: {
      symbol: 'TATAMOTORS',
      companyName: 'Tata Motors Ltd',
      price: 1145.20,
      changeAmount: 105.80,
      changePercent: 10.18,
      volume: 18450200,
      avgVolume20D: 5240000,
      high52w: 1145.20,
      low52w: 593.50,
      peRatio: 16.4,
      marketCap: '₹4.22 Lakh Cr',
      exchange: 'NSE',
      currency: '₹',
      timestamp: new Date(),
    },
    INFY: {
      symbol: 'INFY',
      companyName: 'Infosys Ltd',
      price: 1942.50,
      changeAmount: 76.60,
      changePercent: 4.11,
      volume: 9840300,
      avgVolume20D: 4450000,
      high52w: 1980.00,
      low52w: 1358.35,
      peRatio: 28.2,
      marketCap: '₹8.05 Lakh Cr',
      exchange: 'NSE',
      currency: '₹',
      timestamp: new Date(),
    },
    TCS: {
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services',
      price: 4520.10,
      changeAmount: 342.50,
      changePercent: 8.19,
      volume: 6210000,
      avgVolume20D: 1750000,
      high52w: 4520.10,
      low52w: 3310.00,
      peRatio: 31.5,
      marketCap: '₹16.35 Lakh Cr',
      exchange: 'NSE',
      currency: '₹',
      timestamp: new Date(),
    },
    RELIANCE: {
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      price: 3042.80,
      changeAmount: 401.50,
      changePercent: 15.20,
      volume: 14500000,
      avgVolume20D: 5100000,
      high52w: 3217.90,
      low52w: 2220.30,
      peRatio: 27.8,
      marketCap: '₹20.58 Lakh Cr',
      exchange: 'NSE',
      currency: '₹',
      timestamp: new Date(),
    },
  };

  async getQuote(symbol: string): Promise<MarketQuote | null> {
    const sym = symbol.toUpperCase().trim();

    // Dynamically derive benchmark index quotes from catalog stocks
    if (sym === '^NSEI' || sym === 'NIFTY50' || sym === 'NIFTY') {
      try {
        const stocks = await prisma.stock.findMany({ select: { changePercent: true } });
        const avgChange = stocks.length > 0
          ? stocks.reduce((sum, s) => sum + Number(s.changePercent), 0) / stocks.length
          : 0.58;
        const baseClose = 24800.0;
        const changeAmount = +(baseClose * (avgChange / 100)).toFixed(2);
        const closePrice = +(baseClose + changeAmount).toFixed(2);
        return {
          symbol: sym,
          companyName: 'NIFTY 50 Index',
          price: closePrice,
          changeAmount,
          changePercent: +avgChange.toFixed(2),
          volume: 250000000,
          avgVolume20D: 240000000,
          high52w: 25500.0,
          low52w: 21000.0,
          exchange: 'NSE',
          currency: '₹',
          timestamp: new Date(),
        };
      } catch {}
    }

    if (sym === '^BSESN' || sym === 'SENSEX') {
      try {
        const stocks = await prisma.stock.findMany({ select: { changePercent: true } });
        const avgChange = stocks.length > 0
          ? stocks.reduce((sum, s) => sum + Number(s.changePercent), 0) / stocks.length
          : 0.57;
        const baseClose = 81200.0;
        const changeAmount = +(baseClose * (avgChange / 100)).toFixed(2);
        const closePrice = +(baseClose + changeAmount).toFixed(2);
        return {
          symbol: sym,
          companyName: 'BSE SENSEX Index',
          price: closePrice,
          changeAmount,
          changePercent: +avgChange.toFixed(2),
          volume: 150000000,
          avgVolume20D: 140000000,
          high52w: 83000.0,
          low52w: 70000.0,
          exchange: 'BSE',
          currency: '₹',
          timestamp: new Date(),
        };
      } catch {}
    }

    if (sym === '^INDIAVIX' || sym === 'INDIAVIX' || sym === 'VIX') {
      try {
        const stocks = await prisma.stock.findMany({ select: { changePercent: true } });
        const avgChange = stocks.length > 0
          ? stocks.reduce((sum, s) => sum + Number(s.changePercent), 0) / stocks.length
          : 0;
        const vixPct = +(-avgChange * 1.5).toFixed(2);
        const baseVix = 12.8;
        const changeAmount = +(baseVix * (vixPct / 100)).toFixed(2);
        const liveVix = +(baseVix + changeAmount).toFixed(2);
        return {
          symbol: sym,
          companyName: 'India VIX Volatility Index',
          price: liveVix,
          changeAmount,
          changePercent: vixPct,
          volume: 0,
          avgVolume20D: 0,
          high52w: 24.5,
          low52w: 9.8,
          exchange: 'NSE',
          currency: '₹',
          timestamp: new Date(),
        };
      } catch {}
    }

    const quote = this.mockCatalog[sym];
    if (quote) {
      // Apply subtle realistic intraday variation (-0.2% to +0.2%)
      const jitter = 1 + (Math.random() * 0.004 - 0.002);
      const livePrice = +(quote.price * jitter).toFixed(2);
      return {
        ...quote,
        price: livePrice,
        timestamp: new Date(),
      };
    }

    // Dynamic database fallback for all master stocks
    try {
      const stock = await prisma.stock.findUnique({
        where: { symbol: sym },
      });

      if (stock) {
        const basePrice = Number(stock.currentPrice);
        const jitter = 1 + (Math.random() * 0.004 - 0.002);
        const livePrice = +(basePrice * jitter).toFixed(2);
        const changeAmount = +(livePrice - basePrice + Number(stock.changeAmount)).toFixed(2);
        const changePercent = +((changeAmount / (basePrice || 1)) * 100).toFixed(2);

        return {
          symbol: stock.symbol,
          companyName: stock.companyName,
          price: livePrice,
          changeAmount,
          changePercent,
          volume: Number(stock.volume),
          avgVolume20D: Number(stock.avgVolume20D),
          high52w: Math.max(Number(stock.high52w), livePrice),
          low52w: Math.min(Number(stock.low52w), livePrice),
          peRatio: stock.peRatio ? Number(stock.peRatio) : undefined,
          marketCap: stock.marketCap,
          exchange: stock.exchange,
          currency: stock.currency,
          timestamp: new Date(),
        };
      }
    } catch (err) {
      console.error(`[SimulatedMarketDataProvider] Error querying stock ${sym}:`, err);
    }

    return null;
  }

  async getBatchQuotes(symbols: string[]): Promise<MarketQuote[]> {
    const results: MarketQuote[] = [];
    for (const sym of symbols) {
      const q = await this.getQuote(sym);
      if (q) results.push(q);
    }
    return results;
  }

  async getHistoricalBars(symbol: string, days = 7): Promise<HistoricalBar[]> {
    const sym = symbol.toUpperCase().trim();
    let base = this.mockCatalog[sym]?.price;
    if (!base) {
      try {
        const s = await prisma.stock.findUnique({ where: { symbol: sym } });
        if (s) base = Number(s.currentPrice);
      } catch {}
    }
    if (!base) base = 1000;

    const bars: HistoricalBar[] = [];
    const now = Date.now();

    for (let i = days; i >= 0; i--) {
      const t = new Date(now - i * 24 * 60 * 60 * 1000);
      const close = base * (1 - (i * 0.015) + (Math.random() * 0.01));
      bars.push({
        timestamp: t,
        open: close * 0.99,
        high: close * 1.01,
        low: close * 0.98,
        close: parseFloat(close.toFixed(2)),
        volume: 5000000 + Math.floor(Math.random() * 5000000),
      });
    }
    return bars;
  }
}

/**
 * Adapter Stubs for Future Real-Time External Market Providers
 */
export class YahooFinanceProvider implements IMarketDataProvider {
  readonly providerName = 'Yahoo Finance API';
  constructor(public apiKey?: string) {}

  async getQuote(_symbol: string): Promise<MarketQuote | null> {
    // Adapter integration point: fetch via Yahoo Finance v8 API endpoint
    throw new Error('Yahoo Finance integration requires active configuration. Using SimulatedProvider fallback.');
  }

  async getBatchQuotes(_symbols: string[]): Promise<MarketQuote[]> {
    throw new Error('Yahoo Finance batch quote adapter not configured.');
  }

  async getHistoricalBars(_symbol: string, _days?: number): Promise<HistoricalBar[]> {
    throw new Error('Yahoo Finance historical bars adapter not configured.');
  }
}

export class FinnhubProvider implements IMarketDataProvider {
  readonly providerName = 'Finnhub Stock API';
  constructor(public apiKey?: string) {}

  async getQuote(_symbol: string): Promise<MarketQuote | null> {
    throw new Error('Finnhub integration requires API key.');
  }
  async getBatchQuotes(_symbols: string[]): Promise<MarketQuote[]> {
    throw new Error('Finnhub integration requires API key.');
  }
  async getHistoricalBars(_symbol: string, _days?: number): Promise<HistoricalBar[]> {
    throw new Error('Finnhub integration requires API key.');
  }
}

export class AlphaVantageProvider implements IMarketDataProvider {
  readonly providerName = 'Alpha Vantage API';
  constructor(public apiKey?: string) {}

  async getQuote(_symbol: string): Promise<MarketQuote | null> {
    throw new Error('Alpha Vantage integration requires API key.');
  }
  async getBatchQuotes(_symbols: string[]): Promise<MarketQuote[]> {
    throw new Error('Alpha Vantage integration requires API key.');
  }
  async getHistoricalBars(_symbol: string, _days?: number): Promise<HistoricalBar[]> {
    throw new Error('Alpha Vantage integration requires API key.');
  }
}

export class PolygonProvider implements IMarketDataProvider {
  readonly providerName = 'Polygon.io API';
  constructor(public apiKey?: string) {}

  async getQuote(_symbol: string): Promise<MarketQuote | null> {
    throw new Error('Polygon integration requires API key.');
  }
  async getBatchQuotes(_symbols: string[]): Promise<MarketQuote[]> {
    throw new Error('Polygon integration requires API key.');
  }
  async getHistoricalBars(_symbol: string, _days?: number): Promise<HistoricalBar[]> {
    throw new Error('Polygon integration requires API key.');
  }
}

/**
 * Provider Factory
 */
export type MarketProviderType = 'SIMULATED' | 'YAHOO' | 'FINNHUB' | 'ALPHA_VANTAGE' | 'POLYGON';

export class MarketDataProviderFactory {
  static getProvider(type: MarketProviderType = 'SIMULATED', apiKey?: string): IMarketDataProvider {
    switch (type) {
      case 'YAHOO':
        return new YahooFinanceProvider(apiKey);
      case 'FINNHUB':
        return new FinnhubProvider(apiKey);
      case 'ALPHA_VANTAGE':
        return new AlphaVantageProvider(apiKey);
      case 'POLYGON':
        return new PolygonProvider(apiKey);
      case 'SIMULATED':
      default:
        return new SimulatedMarketDataProvider();
    }
  }
}
