import { apiClient } from './apiClient';

export interface NewsArticle {
  id: string;
  stockSymbol: string;
  headline: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export class NewsService {
  async fetchNews(symbol?: string): Promise<NewsArticle[] | null> {
    const qs = symbol ? `?symbol=${symbol}` : '';
    const res = await apiClient.get<NewsArticle[]>(`/news${qs}`);

    if (res.success && res.data) {
      return res.data;
    }
    return null;
  }
}

export const newsService = new NewsService();
