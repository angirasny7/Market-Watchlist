import { prisma } from '../config/prisma.js';

export class NewsService {
  async getNews(options?: { symbol?: string; limit?: number }) {
    const where: any = {};

    if (options?.symbol) {
      where.stockSymbol = options.symbol.toUpperCase();
    }

    return prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: options?.limit || 20,
      include: { stock: true },
    });
  }

  async getNewsById(id: string) {
    const item = await prisma.news.findUnique({
      where: { id },
      include: { stock: true },
    });

    if (!item) {
      const error: any = new Error(`News item ${id} not found`);
      error.statusCode = 404;
      throw error;
    }

    return item;
  }
}

export const newsService = new NewsService();
