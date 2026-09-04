import { config } from '../config/env.js';
import { IMarketDataProvider, SimulatedMarketDataProvider } from './marketDataProvider.js';
import { INewsProvider, SimulatedNewsProvider } from './newsProvider.js';
import { YahooFinanceProvider } from './yahooFinanceProvider.js';
import { NewsApiProvider } from './newsApiProvider.js';

/**
 * Decoupled Provider Factory
 * 
 * Provides unified singleton access to Market and News providers based on configuration.
 * Domain services and background jobs depend strictly on IMarketDataProvider and INewsProvider.
 */
export class ProviderFactory {
  private static marketProviderInstance: IMarketDataProvider | null = null;
  private static newsProviderInstance: INewsProvider | null = null;

  public static getMarketDataProvider(): IMarketDataProvider {
    if (!this.marketProviderInstance) {
      const type = config.marketProvider.toLowerCase();
      if (type === 'yahoo' || type === 'real') {
        this.marketProviderInstance = new YahooFinanceProvider();
      } else {
        this.marketProviderInstance = new SimulatedMarketDataProvider();
      }
      console.log(`[ProviderFactory] Initialized Market Provider: ${this.marketProviderInstance.providerName}`);
    }
    return this.marketProviderInstance;
  }

  public static getNewsProvider(): INewsProvider {
    if (!this.newsProviderInstance) {
      const type = config.newsProvider.toLowerCase();
      if (type === 'rss' || type === 'newsapi' || type === 'real') {
        this.newsProviderInstance = new NewsApiProvider();
      } else {
        this.newsProviderInstance = new SimulatedNewsProvider();
      }
      console.log(`[ProviderFactory] Initialized News Provider: ${this.newsProviderInstance.providerName}`);
    }
    return this.newsProviderInstance;
  }

  /**
   * Status check for operational health endpoint
   */
  public static async checkStatus(): Promise<{
    marketProvider: string;
    marketConnected: boolean;
    newsProvider: string;
    newsConnected: boolean;
  }> {
    const market = this.getMarketDataProvider();
    const news = this.getNewsProvider();

    let marketConnected = false;
    let newsConnected = false;

    try {
      const quote = await market.getQuote('RELIANCE');
      marketConnected = quote !== null && quote.price > 0;
    } catch {
      marketConnected = false;
    }

    try {
      const newsItems = await news.getLatestNews(1);
      newsConnected = newsItems !== null && newsItems.length > 0;
    } catch {
      newsConnected = false;
    }

    return {
      marketProvider: config.marketProvider,
      marketConnected,
      newsProvider: config.newsProvider,
      newsConnected,
    };
  }
}
