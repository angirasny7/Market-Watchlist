/**
 * News & Regulatory Disclosures Provider Abstraction Layer
 * 
 * Defines standard interfaces for financial media and regulatory filings ingestion,
 * allowing future plug-and-play integrations with:
 * - NewsAPI
 * - Financial Modeling Prep News
 * - Exchange XBRL Feeds (BSE / NSE)
 * - Benzinga News API
 * without altering downstream Context Enrichment Engine logic.
 */

export interface NewsItem {
  id: string;
  stockSymbol: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: Date;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface INewsProvider {
  readonly providerName: string;
  getLatestNews(limit?: number): Promise<NewsItem[]>;
  getNewsBySymbol(symbol: string, limit?: number): Promise<NewsItem[]>;
  getNewsForStock(symbol: string, limit?: number): Promise<NewsItem[]>;
}

/**
 * Built-in Simulated / Regulatory Disclosure Provider
 */
export class SimulatedNewsProvider implements INewsProvider {
  readonly providerName = 'Simulated Financial Media & BSE/NSE Disclosure Provider';

  async getNewsForStock(symbol: string, limit?: number): Promise<NewsItem[]> {
    return this.getNewsBySymbol(symbol, limit);
  }

  private newsArchive: NewsItem[] = [

    {
      id: 'news_001',
      stockSymbol: 'TATAMOTORS',
      headline: 'Tata Motors Commercial EV Dispatches Surge 15% Following Subsidy Clearance',
      summary: 'Heavy commercial vehicle subsidies received official government signoff, boosting Q3 delivery guidance by 15% across key fleet clients.',
      sourceName: 'Economic Times Auto Desk',
      sourceUrl: 'https://economictimes.indiatimes.com/auto',
      publishedAt: new Date(Date.now() - 1000 * 60 * 45),
      sentiment: 'BULLISH',
    },
    {
      id: 'news_002',
      stockSymbol: 'INFY',
      headline: 'Infosys Posts Record Q2 Large Deal TCV of $3.2 Billion',
      summary: 'Digital transformation deals beat Street forecasts by 8%, leading to an upward revision in annual revenue guidance.',
      sourceName: 'Bloomberg Technology Desk',
      sourceUrl: 'https://bloomberg.com/tech',
      publishedAt: new Date(Date.now() - 1000 * 60 * 120),
      sentiment: 'BULLISH',
    },
    {
      id: 'news_003',
      stockSymbol: 'TCS',
      headline: 'TCS Secures $1.2B European Banking Cloud Migration Mandate',
      summary: 'A major tier-1 European financial institution selected TCS as strategic partner for legacy mainframe cloud transition.',
      sourceName: 'BSE Corporate Announcement',
      sourceUrl: 'https://bseindia.com/corporates',
      publishedAt: new Date(Date.now() - 1000 * 60 * 180),
      sentiment: 'BULLISH',
    },
    {
      id: 'news_004',
      stockSymbol: 'HDFCBANK',
      headline: 'HDFC Bank Board Declares Special Interim Dividend Ahead of Record Date',
      summary: 'Board approved a payout of ₹19.50 per equity share following healthy net interest margin expansion.',
      sourceName: 'Moneycontrol Banking Desk',
      sourceUrl: 'https://moneycontrol.com/banking',
      publishedAt: new Date(Date.now() - 1000 * 60 * 360),
      sentiment: 'BULLISH',
    },
    {
      id: 'news_005',
      stockSymbol: 'RELIANCE',
      headline: 'Reliance Retail Expands Quick Commerce Blinkit Competition with 500 New Dark Stores',
      summary: 'Brokerages upgrade consolidated target to ₹3,400 citing rapid consumer tech margin accretions.',
      sourceName: 'Reuters Capital Markets',
      sourceUrl: 'https://reuters.com/business',
      publishedAt: new Date(Date.now() - 1000 * 60 * 480),
      sentiment: 'BULLISH',
    },
  ];

  async getLatestNews(limit = 20): Promise<NewsItem[]> {
    return this.newsArchive.slice(0, limit);
  }

  async getNewsBySymbol(symbol: string, limit = 10): Promise<NewsItem[]> {
    return this.newsArchive
      .filter((n) => n.stockSymbol.toUpperCase() === symbol.toUpperCase())
      .slice(0, limit);
  }
}

/**
 * Adapter Stubs for Future Real-Time External News APIs
 */
export class NewsAPIProvider implements INewsProvider {
  readonly providerName = 'NewsAPI.org Provider';
  constructor(public apiKey?: string) {}

  async getLatestNews(_limit?: number): Promise<NewsItem[]> {
    throw new Error('NewsAPI integration requires valid API key. Using SimulatedNewsProvider.');
  }

  async getNewsBySymbol(_symbol: string, _limit?: number): Promise<NewsItem[]> {
    throw new Error('NewsAPI integration requires valid API key.');
  }

  async getNewsForStock(symbol: string, limit?: number): Promise<NewsItem[]> {
    return this.getNewsBySymbol(symbol, limit);
  }
}

export class ExchangeDisclosureProvider implements INewsProvider {
  readonly providerName = 'BSE/NSE Direct XBRL Scraper';

  async getLatestNews(_limit?: number): Promise<NewsItem[]> {
    throw new Error('Exchange Direct Scraper requires dedicated worker service.');
  }

  async getNewsBySymbol(_symbol: string, _limit?: number): Promise<NewsItem[]> {
    throw new Error('Exchange Direct Scraper requires dedicated worker service.');
  }

  async getNewsForStock(symbol: string, limit?: number): Promise<NewsItem[]> {
    return this.getNewsBySymbol(symbol, limit);
  }
}


export type NewsProviderType = 'SIMULATED' | 'NEWS_API' | 'EXCHANGE_SCRAPER';

export class NewsProviderFactory {
  static getProvider(type: NewsProviderType = 'SIMULATED', apiKey?: string): INewsProvider {
    switch (type) {
      case 'NEWS_API':
        return new NewsAPIProvider(apiKey);
      case 'EXCHANGE_SCRAPER':
        return new ExchangeDisclosureProvider();
      case 'SIMULATED':
      default:
        return new SimulatedNewsProvider();
    }
  }
}
