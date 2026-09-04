import Parser from 'rss-parser';
import crypto from 'crypto';
import { INewsProvider, NewsItem } from './newsProvider.js';

export class NewsApiProvider implements INewsProvider {
  readonly providerName = 'Real-Time Financial Media RSS & News Provider';
  private parser: Parser;

  // Name map to enhance RSS search accuracy
  private companyNameMap: Record<string, string> = {
    TATAMOTORS: 'Tata Motors',
    INFY: 'Infosys',
    TCS: 'Tata Consultancy Services',
    RELIANCE: 'Reliance Industries',
    HDFCBANK: 'HDFC Bank',
    ICICIBANK: 'ICICI Bank',
    LT: 'Larsen & Toubro',
    BHARTIARTL: 'Bharti Airtel',
    SBIN: 'State Bank of India',
    ITC: 'ITC Ltd',
    AAPL: 'Apple Inc',
    MSFT: 'Microsoft',
    NVDA: 'Nvidia',
    SUZLON: 'Suzlon Energy',
  };

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
  }

  /**
   * Generates a deterministic SHA-256 hash for headline deduplication
   */
  public generateHeadlineHash(headline: string): string {
    const normalized = headline
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }

  /**
   * Simple financial catalyst sentiment classifier
   */
  public analyzeSentiment(text: string): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
    const lower = text.toLowerCase();

    const bullishTerms = [
      'surge', 'surges', 'surged', 'jump', 'jumps', 'jumped', 'rally', 'rallies',
      'gain', 'gains', 'gained', 'profit', 'profits', 'beat', 'beats', 'beating',
      'record high', 'high', 'upgrade', 'upgrades', 'upgraded', 'outperform',
      'growth', 'grew', 'order win', 'deal', 'soar', 'soars', 'soared', 'bullish',
      'dividend', 'buyback', 'acquisition', 'boost', 'boosts', 'boosted', 'rise', 'rises'
    ];

    const bearishTerms = [
      'plunge', 'plunges', 'plunged', 'drop', 'drops', 'dropped', 'fall', 'falls',
      'fell', 'decline', 'declines', 'declined', 'slump', 'slumps', 'slumped',
      'loss', 'losses', 'miss', 'misses', 'missed', 'downgrade', 'downgrades',
      'penalty', 'fine', 'fraud', 'probe', 'investigation', 'crash', 'crashes',
      'bearish', 'cut', 'cuts', 'down', 'selloff', 'weak', 'sluggish', 'debt'
    ];

    let score = 0;
    for (const term of bullishTerms) {
      if (lower.includes(term)) score += 1;
    }
    for (const term of bearishTerms) {
      if (lower.includes(term)) score -= 1;
    }

    if (score >= 1) return 'BULLISH';
    if (score <= -1) return 'BEARISH';
    return 'NEUTRAL';
  }

  /**
   * Clean RSS headline string and extract source name if embedded
   */
  private parseTitleAndSource(rawTitle: string): { headline: string; sourceName: string } {
    // Google RSS headlines typically end with " - Publisher Name"
    const lastDash = rawTitle.lastIndexOf(' - ');
    if (lastDash !== -1 && lastDash > rawTitle.length / 3) {
      return {
        headline: rawTitle.substring(0, lastDash).trim(),
        sourceName: rawTitle.substring(lastDash + 3).trim(),
      };
    }
    return {
      headline: rawTitle.trim(),
      sourceName: 'Financial Media Network',
    };
  }

  /**
   * Strip HTML tags from summary / snippet
   */
  private cleanSummary(contentSnippet?: string, content?: string): string {
    const raw = contentSnippet || content || '';
    const stripped = raw.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    if (!stripped) return 'Comprehensive market summary and impact analysis regarding company developments.';
    return stripped.length > 280 ? `${stripped.substring(0, 277)}...` : stripped;
  }

  /**
   * Fetch news specifically for a stock symbol
   */
  async getNewsForStock(symbol: string, limit: number = 10): Promise<NewsItem[]> {
    const upper = symbol.trim().toUpperCase();
    const company = this.companyNameMap[upper] || upper;
    const query = `${company} stock financial news`;

    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const feed = await this.parser.parseURL(feedUrl);
      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      const items: NewsItem[] = [];
      const seenHashes = new Set<string>();

      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const { headline, sourceName } = this.parseTitleAndSource(item.title);
        const hash = this.generateHeadlineHash(headline);

        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);

        const summary = this.cleanSummary(item.contentSnippet, item.content);
        const sentiment = this.analyzeSentiment(`${headline} ${summary}`);
        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

        items.push({
          id: `news_${hash}`,
          stockSymbol: upper,
          headline,
          summary,
          sourceName: item.creator || sourceName,
          sourceUrl: item.link,
          publishedAt,
          sentiment,
        });

        if (items.length >= limit) break;
      }

      return items;
    } catch (err: any) {
      console.error(`[NewsApiProvider] Failed to fetch news for ${upper}: ${err.message}`);
      return [];
    }
  }

  /**
   * Alias satisfying INewsProvider
   */
  async getNewsBySymbol(symbol: string, limit: number = 10): Promise<NewsItem[]> {
    return this.getNewsForStock(symbol, limit);
  }

  /**
   * Fetch general broader market news
   */
  async getLatestNews(limit: number = 20): Promise<NewsItem[]> {
    const query = 'Indian stock market Sensex Nifty business financial news';
    const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

    try {
      const feed = await this.parser.parseURL(feedUrl);
      if (!feed.items || feed.items.length === 0) {
        return [];
      }

      const items: NewsItem[] = [];
      const seenHashes = new Set<string>();

      for (const item of feed.items) {
        if (!item.title || !item.link) continue;

        const { headline, sourceName } = this.parseTitleAndSource(item.title);
        const hash = this.generateHeadlineHash(headline);

        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);

        const summary = this.cleanSummary(item.contentSnippet, item.content);
        const sentiment = this.analyzeSentiment(`${headline} ${summary}`);
        const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

        items.push({
          id: `news_${hash}`,
          stockSymbol: 'NIFTY',
          headline,
          summary,
          sourceName: item.creator || sourceName,
          sourceUrl: item.link,
          publishedAt,
          sentiment,
        });

        if (items.length >= limit) break;
      }

      return items;
    } catch (err: any) {
      console.error(`[NewsApiProvider] Failed to fetch latest market news: ${err.message}`);
      return [];
    }
  }
}
