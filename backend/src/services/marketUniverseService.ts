import { prisma } from '../config/prisma.js';
import {
  allUniverseConstituents,
  benchmarkDefinitions,
  UniverseConstituent,
} from '../data/marketUniverseData.js';
import { ProviderFactory } from '../providers/providerFactory.js';
import { isIndianMarketOpen, isUsMarketOpen } from '../utils/marketHours.js';

export interface MarketHighlightIndex {
  symbol: string;
  name: string;
  category: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  exchange: string | null;
  delayMinutes: number;
  sparkline: Array<{ date: string; price: number }>;
  lastSyncedAt: string;
}

export interface MarketBreadth {
  advancers: number;
  decliners: number;
  unchanged: number;
  total: number;
  advancerPercent: number;
  high52wCount: number;
  low52wCount: number;
}

export interface SectorSummary {
  sector: string;
  changePercent: number;
  stockCount: number;
  leadStock: string;
  leadStockChange: number;
  momentum: 'ACCELERATING' | 'STABLE' | 'WEAKENING';
}

export interface MarketMoverItem {
  symbol: string;
  companyName: string;
  currentPrice: number;
  changeAmount: number;
  changePercent: number;
  volume: number;
  avgVolume20D: number;
  volumeRatio: string;
  sector: string;
  exchange: string;
  isInWatchlist: boolean;
}

export interface MarketHighlightsResponse {
  pulse: {
    summarySentence: string;
    exchanges: Array<{
      exchange: string;
      region: 'India' | 'US';
      status: 'OPEN' | 'CLOSED';
      tradingHours: string;
    }>;
  };
  indices: MarketHighlightIndex[];
  breadth: MarketBreadth;
  sectors: SectorSummary[];
  movers: {
    india: {
      gainers: MarketMoverItem[];
      losers: MarketMoverItem[];
      mostActive: MarketMoverItem[];
    };
    us: {
      gainers: MarketMoverItem[];
      losers: MarketMoverItem[];
      mostActive: MarketMoverItem[];
    };
  };
  volatility: {
    symbol: string;
    name: string;
    currentValue: number;
    changeAmount: number;
    changePercent: number;
    level: 'CALM' | 'NORMAL' | 'ELEVATED';
    levelDescription: string;
    delayMinutes: number;
  };
  globalCues: MarketHighlightIndex[];
  upcomingEvents: Array<{
    id: string;
    stockSymbol: string;
    eventType: string;
    eventDate: string;
    title: string;
    details: string | null;
  }>;
  headlines: Array<{
    headline: string;
    publisher: string;
    url: string;
    publishedAt: string;
  }>;
  exposure: {
    watchedMoversCount: number;
    topSector: string | null;
    topSectorWeight: number;
    topSectorDayChange: number | null;
    summarySentence: string;
  } | null;
  freshness: {
    lastSyncedAt: string;
    delayMinutes: number;
    isStale: boolean;
    provider: string;
  };
}

let cachedHighlights: { data: MarketHighlightsResponse; timestamp: number } | null = null;
const CACHE_TTL_MS = 20 * 1000; // 20-second cache

export class MarketUniverseService {
  private isSyncing = false;
  private syncPromise: Promise<void> | null = null;

  /**
   * Idempotent seed/verification of the market universe
   */
  async ensureUniverseSeeded(): Promise<number> {
    let seeded = 0;
    for (const item of allUniverseConstituents) {
      await prisma.marketUniverseItem.upsert({
        where: {
          indexName_symbol: {
            indexName: item.indexName,
            symbol: item.symbol,
          },
        },
        update: {
          exchange: item.exchange,
          sector: item.sector,
          sourceUrl: item.sourceUrl,
          lastVerifiedAt: new Date(item.lastVerifiedDate),
        },
        create: {
          symbol: item.symbol,
          indexName: item.indexName,
          exchange: item.exchange,
          sector: item.sector,
          sourceUrl: item.sourceUrl,
          lastVerifiedAt: new Date(item.lastVerifiedDate),
        },
      });
      seeded++;
    }
    return seeded;
  }

  /**
   * Sync quotes for benchmark indices and macro indicators into market_index_quotes using batch concurrency
   */
  async syncBenchmarkQuotes(): Promise<void> {
    const provider = ProviderFactory.getMarketDataProvider();
    const BATCH_SIZE = 4;

    for (let i = 0; i < benchmarkDefinitions.length; i += BATCH_SIZE) {
      const batch = benchmarkDefinitions.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (def) => {
          try {
            const quote = await provider.getQuote(def.symbol);
            if (quote && typeof quote.price === 'number') {
              let sparkline: Array<{ date: string; price: number }> = [];
              try {
                const bars = await provider.getHistoricalBars(def.symbol, 7);
                if (bars && bars.length > 0) {
                  sparkline = bars.map((b) => ({
                    date: b.timestamp.toISOString().split('T')[0],
                    price: Number(b.close.toFixed(2)),
                  }));
                }
              } catch (e: any) {
                // Historical bars fallback
              }

              if (sparkline.length === 0) {
                sparkline = [
                  { date: 'Previous', price: +(quote.price - quote.changeAmount).toFixed(2) },
                  { date: 'Latest', price: quote.price },
                ];
              }

              await prisma.marketIndexQuote.upsert({
                where: { symbol: def.symbol },
                update: {
                  name: def.name,
                  category: def.category,
                  currentPrice: quote.price,
                  changeAmount: quote.changeAmount,
                  changePercent: quote.changePercent,
                  dayHigh: quote.high52w || quote.price,
                  dayLow: quote.low52w || quote.price,
                  exchange: def.exchange,
                  delayMinutes: def.delayMinutes,
                  sparkline,
                  lastSyncedAt: new Date(),
                },
                create: {
                  symbol: def.symbol,
                  name: def.name,
                  category: def.category,
                  currentPrice: quote.price,
                  changeAmount: quote.changeAmount,
                  changePercent: quote.changePercent,
                  dayHigh: quote.high52w || quote.price,
                  dayLow: quote.low52w || quote.price,
                  exchange: def.exchange,
                  delayMinutes: def.delayMinutes,
                  sparkline,
                  lastSyncedAt: new Date(),
                },
              });
            }
          } catch (err: any) {
            console.warn(`[MarketUniverseService] Failed syncing benchmark quote ${def.symbol}: ${err.message}`);
          }
        })
      );
    }
  }

  /**
   * Sync stock quotes for universe constituents into Stock table using batch concurrency
   */
  async syncUniverseStockQuotes(): Promise<number> {
    const constituents = await prisma.marketUniverseItem.findMany();
    if (constituents.length === 0) {
      await this.ensureUniverseSeeded();
    }

    const symbols = [...new Set(constituents.map((c) => c.symbol))];
    const provider = ProviderFactory.getMarketDataProvider();
    let updated = 0;
    const BATCH_SIZE = 8;

    for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
      const batch = symbols.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (sym) => {
          const quote = await provider.getQuote(sym);
          if (quote && typeof quote.price === 'number') {
            const constituent = constituents.find((c) => c.symbol === sym);
            await prisma.stock.upsert({
              where: { symbol: sym },
              update: {
                companyName: quote.companyName || sym,
                currentPrice: quote.price,
                changeAmount: quote.changeAmount,
                changePercent: quote.changePercent,
                volume: BigInt(quote.volume || 0),
                avgVolume20D: BigInt(quote.avgVolume20D || 0),
                high52w: quote.high52w,
                low52w: quote.low52w,
                exchange: quote.exchange || constituent?.exchange || 'NSE',
                currency: quote.currency || (constituent?.exchange === 'NSE' ? '₹' : '$'),
                updatedAt: new Date(),
              },
              create: {
                symbol: sym,
                companyName: quote.companyName || sym,
                sector: constituent?.sector || 'General',
                exchange: quote.exchange || constituent?.exchange || 'NSE',
                currency: quote.currency || (constituent?.exchange === 'NSE' ? '₹' : '$'),
                currentPrice: quote.price,
                changeAmount: quote.changeAmount,
                changePercent: quote.changePercent,
                volume: BigInt(quote.volume || 0),
                avgVolume20D: BigInt(quote.avgVolume20D || 0),
                marketCap: quote.marketCap || 'N/A',
                high52w: quote.high52w,
                low52w: quote.low52w,
                tags: [constituent?.indexName || 'Universe'],
                updatedAt: new Date(),
              },
            });
            return true;
          }
          return false;
        })
      );

      for (const res of results) {
        if (res.status === 'fulfilled' && res.value) {
          updated++;
        }
      }
    }

    return updated;
  }

  /**
   * Triggers non-blocking background quote refresh with in-flight mutex deduplication
   */
  async triggerBackgroundSync(): Promise<void> {
    if (this.isSyncing && this.syncPromise) {
      return this.syncPromise;
    }
    this.isSyncing = true;
    this.syncPromise = (async () => {
      try {
        await this.ensureUniverseSeeded();
        await this.syncBenchmarkQuotes();
        await this.syncUniverseStockQuotes();
        // Clear in-memory cache so subsequent reads pick up fresh database values
        cachedHighlights = null;
      } catch (err: any) {
        console.error('[MarketUniverseService] Background universe sync failed:', err.message);
      } finally {
        this.isSyncing = false;
        this.syncPromise = null;
      }
    })();
    return this.syncPromise;
  }

  /**
   * Generates the complete 10-section Market Highlights payload
   */
  async getMarketHighlights(userId?: string, forceRefresh = false): Promise<MarketHighlightsResponse> {
    const now = Date.now();
    let baseData: MarketHighlightsResponse;

    if (!forceRefresh && cachedHighlights && (now - cachedHighlights.timestamp) < CACHE_TTL_MS) {
      baseData = cachedHighlights.data;
    } else {
      baseData = await this.buildHighlightsPayload();
      cachedHighlights = { data: baseData, timestamp: now };
    }

    // Personalize the Exposure section for the specific requesting user
    let userExposure = null;
    if (userId) {
      userExposure = await this.computeUserExposure(userId, baseData);
    }

    return {
      ...baseData,
      exposure: userExposure,
    };
  }

  private async buildHighlightsPayload(): Promise<MarketHighlightsResponse> {
    // 1. Query benchmark quotes from database
    const dbIndexQuotes = await prisma.marketIndexQuote.findMany();
    const oldestAllowed = new Date(Date.now() - 2 * 60 * 1000);
    const hasStaleBenchmarks = dbIndexQuotes.length === 0 || dbIndexQuotes.some((q) => q.lastSyncedAt < oldestAllowed);
    
    // Map db quotes by symbol
    const quoteMap = new Map(dbIndexQuotes.map((q) => [q.symbol, q]));

    // Format index helper
    const formatIndexItem = (symbol: string, defaultName: string, category: string, exchange: string, delay: number): MarketHighlightIndex => {
      const q = quoteMap.get(symbol);
      const spark = Array.isArray(q?.sparkline) ? (q.sparkline as any) : [];
      return {
        symbol,
        name: q?.name || defaultName,
        category: q?.category || category,
        currentPrice: q ? Number(q.currentPrice) : 0,
        changeAmount: q ? Number(q.changeAmount) : 0,
        changePercent: q ? Number(q.changePercent) : 0,
        dayHigh: q?.dayHigh ? Number(q.dayHigh) : null,
        dayLow: q?.dayLow ? Number(q.dayLow) : null,
        exchange: q?.exchange || exchange,
        delayMinutes: q?.delayMinutes ?? delay,
        sparkline: spark,
        lastSyncedAt: q?.lastSyncedAt?.toISOString() || new Date().toISOString(),
      };
    };

    // Major Indices
    const indices: MarketHighlightIndex[] = [
      formatIndexItem('^NSEI', 'NIFTY 50', 'INDEX', 'NSE', 15),
      formatIndexItem('^BSESN', 'S&P BSE SENSEX', 'INDEX', 'BSE', 15),
      formatIndexItem('^NSEBANK', 'NIFTY BANK', 'INDEX', 'NSE', 15),
      formatIndexItem('^CNXIT', 'NIFTY IT', 'INDEX', 'NSE', 15),
      formatIndexItem('^GSPC', 'S&P 500', 'INDEX', 'SNP', 0),
      formatIndexItem('^IXIC', 'NASDAQ Composite', 'INDEX', 'NASDAQ', 0),
      formatIndexItem('^DJI', 'Dow Jones Industrial Average', 'INDEX', 'DJI', 0),
    ];

    // Volatility (India VIX)
    const vixQuote = quoteMap.get('^INDIAVIX');
    const vixVal = vixQuote ? Number(vixQuote.currentPrice) : 0;
    const vixChange = vixQuote ? Number(vixQuote.changeAmount) : 0;
    const vixChangePct = vixQuote ? Number(vixQuote.changePercent) : 0;

    let vixLevel: 'CALM' | 'NORMAL' | 'ELEVATED' = 'NORMAL';
    let vixDesc = 'Normal market volatility within historical range';
    if (vixVal > 0) {
      if (vixVal < 15) {
        vixLevel = 'CALM';
        vixDesc = 'Low systemic volatility, market conditions stable';
      } else if (vixVal > 20) {
        vixLevel = 'ELEVATED';
        vixDesc = 'Elevated volatility and options hedging activity';
      }
    }

    const volatility = {
      symbol: '^INDIAVIX',
      name: 'INDIA VIX',
      currentValue: vixVal,
      changeAmount: vixChange,
      changePercent: vixChangePct,
      level: vixLevel,
      levelDescription: vixDesc,
      delayMinutes: vixQuote?.delayMinutes ?? 15,
    };

    // Global Cues
    const globalCues: MarketHighlightIndex[] = [
      formatIndexItem('USDINR=X', 'USD / INR', 'CURRENCY', 'FOREX', 0),
      formatIndexItem('CL=F', 'Crude Oil (WTI)', 'COMMODITY', 'NYMEX', 10),
      formatIndexItem('GC=F', 'Gold Futures', 'COMMODITY', 'COMEX', 10),
      formatIndexItem('^TNX', 'US 10-Yr Yield', 'BOND', 'CGI', 0),
    ];

    // 2. Market Breadth & Universe Stocks (Query local database immediately)
    const universeItems = await prisma.marketUniverseItem.findMany();
    const universeSymbols = universeItems.map((u) => u.symbol);

    const stocks = await prisma.stock.findMany({
      where: { symbol: { in: universeSymbols } },
    });

    const hasStaleStocks = stocks.length < universeSymbols.length || stocks.some((s) => s.updatedAt < new Date(Date.now() - 5 * 60 * 1000));

    // Trigger non-blocking background synchronization if any quotes are stale or missing
    if (hasStaleBenchmarks || hasStaleStocks || universeItems.length === 0) {
      this.triggerBackgroundSync().catch((err) => {
        console.warn('[MarketUniverseService] Background sync trigger failed:', err.message);
      });
    }

    const stockSectorMap = new Map(universeItems.map((u) => [u.symbol, u.sector]));
    const stockExchangeMap = new Map(universeItems.map((u) => [u.symbol, u.exchange]));

    let advancers = 0;
    let decliners = 0;
    let unchanged = 0;
    let high52wCount = 0;
    let low52wCount = 0;

    for (const s of stocks) {
      const chg = Number(s.changePercent);
      const price = Number(s.currentPrice);
      const h52 = Number(s.high52w);
      const l52 = Number(s.low52w);

      if (chg > 0) advancers++;
      else if (chg < 0) decliners++;
      else unchanged++;

      if (h52 > 0 && price >= h52 * 0.985) high52wCount++;
      if (l52 > 0 && price <= l52 * 1.015) low52wCount++;
    }

    const totalBreadth = stocks.length;
    const breadth: MarketBreadth = {
      advancers,
      decliners,
      unchanged,
      total: totalBreadth,
      advancerPercent: totalBreadth > 0 ? parseFloat(((advancers / totalBreadth) * 100).toFixed(1)) : 0,
      high52wCount,
      low52wCount,
    };

    // 3. Sector Heatmap Calculation
    const sectorGroups = new Map<string, { totalChange: number; stocks: Array<{ symbol: string; changePercent: number }> }>();
    for (const s of stocks) {
      const sector = stockSectorMap.get(s.symbol) || s.sector || 'Other';
      if (!sectorGroups.has(sector)) {
        sectorGroups.set(sector, { totalChange: 0, stocks: [] });
      }
      const g = sectorGroups.get(sector)!;
      const chg = Number(s.changePercent);
      g.totalChange += chg;
      g.stocks.push({ symbol: s.symbol, changePercent: chg });
    }

    const sectors: SectorSummary[] = Array.from(sectorGroups.entries()).map(([sector, group]) => {
      const count = group.stocks.length;
      const avgChange = count > 0 ? parseFloat((group.totalChange / count).toFixed(2)) : 0;
      group.stocks.sort((a, b) => b.changePercent - a.changePercent);
      const lead = group.stocks[0] || { symbol: '—', changePercent: 0 };

      let momentum: 'ACCELERATING' | 'STABLE' | 'WEAKENING' = 'STABLE';
      if (avgChange >= 1.2) momentum = 'ACCELERATING';
      else if (avgChange <= -0.8) momentum = 'WEAKENING';

      return {
        sector,
        changePercent: avgChange,
        stockCount: count,
        leadStock: lead.symbol,
        leadStockChange: lead.changePercent,
        momentum,
      };
    });

    sectors.sort((a, b) => b.changePercent - a.changePercent);

    // 4. Movers (India vs US)
    const mapToMoverItem = (s: typeof stocks[0]): MarketMoverItem => {
      const vol = Number(s.volume);
      const avgVol = Number(s.avgVolume20D) || 1;
      const ratio = avgVol > 0 ? (vol / avgVol).toFixed(1) + 'x' : '1.0x';
      return {
        symbol: s.symbol,
        companyName: s.companyName,
        currentPrice: Number(s.currentPrice),
        changeAmount: Number(s.changeAmount),
        changePercent: Number(s.changePercent),
        volume: vol,
        avgVolume20D: avgVol,
        volumeRatio: ratio,
        sector: stockSectorMap.get(s.symbol) || s.sector,
        exchange: stockExchangeMap.get(s.symbol) || s.exchange,
        isInWatchlist: false, // will be evaluated per user
      };
    };

    const indiaStocks = stocks.filter((s) => (stockExchangeMap.get(s.symbol) || s.exchange) === 'NSE' || (stockExchangeMap.get(s.symbol) || s.exchange) === 'BSE');
    const usStocks = stocks.filter((s) => ['NASDAQ', 'NYSE'].includes(stockExchangeMap.get(s.symbol) || s.exchange));

    const sortGainers = (list: typeof stocks) => [...list].sort((a, b) => Number(b.changePercent) - Number(a.changePercent)).slice(0, 5).map(mapToMoverItem);
    const sortLosers = (list: typeof stocks) => [...list].sort((a, b) => Number(a.changePercent) - Number(b.changePercent)).slice(0, 5).map(mapToMoverItem);
    const sortActive = (list: typeof stocks) =>
      [...list]
        .sort((a, b) => {
          const rA = Number(a.avgVolume20D) > 0 ? Number(a.volume) / Number(a.avgVolume20D) : 0;
          const rB = Number(b.avgVolume20D) > 0 ? Number(b.volume) / Number(b.avgVolume20D) : 0;
          return rB - rA;
        })
        .slice(0, 5)
        .map(mapToMoverItem);

    const movers = {
      india: {
        gainers: sortGainers(indiaStocks),
        losers: sortLosers(indiaStocks),
        mostActive: sortActive(indiaStocks),
      },
      us: {
        gainers: sortGainers(usStocks),
        losers: sortLosers(usStocks),
        mostActive: sortActive(usStocks),
      },
    };

    // 5. Market Pulse Rule-based Sentence & Market Status
    const indianOpen = isIndianMarketOpen();
    const usOpen = isUsMarketOpen();

    const niftyQuote = quoteMap.get('^NSEI');
    const niftyChg = niftyQuote ? Number(niftyQuote.changePercent) : 0;
    const spQuote = quoteMap.get('^GSPC');
    const spChg = spQuote ? Number(spQuote.changePercent) : 0;

    let sentimentWord = 'steady';
    if (niftyChg >= 0.8) sentimentWord = 'firmly higher';
    else if (niftyChg > 0.2) sentimentWord = 'modestly higher';
    else if (niftyChg <= -0.8) sentimentWord = 'under pressure';
    else if (niftyChg < -0.2) sentimentWord = 'modestly lower';

    const pulseSummary = `Indian benchmark indices are trading ${sentimentWord} today with Nifty 50 at ${niftyChg >= 0 ? '+' : ''}${niftyChg.toFixed(2)}%, while US S&P 500 is ${spChg >= 0 ? '+' : ''}${spChg.toFixed(2)}% with India VIX at ${vixVal.toFixed(2)}.`;

    const pulse = {
      summarySentence: pulseSummary,
      exchanges: [
        {
          exchange: 'NSE / BSE',
          region: 'India' as const,
          status: indianOpen ? ('OPEN' as const) : ('CLOSED' as const),
          tradingHours: '09:15 - 15:30 IST',
        },
        {
          exchange: 'NYSE / NASDAQ',
          region: 'US' as const,
          status: usOpen ? ('OPEN' as const) : ('CLOSED' as const),
          tradingHours: '09:30 - 16:00 EST',
        },
      ],
    };

    // 6. Upcoming Real Corporate Events (Next 7 Days)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const corporateEvents = await prisma.corporateEvent.findMany({
      where: {
        stockSymbol: { in: universeSymbols },
        eventDate: {
          gte: new Date(),
          lte: sevenDaysFromNow,
        },
        isDemo: false,
      },
      orderBy: { eventDate: 'asc' },
      take: 5,
    });

    const upcomingEvents = corporateEvents.map((e) => ({
      id: e.id,
      stockSymbol: e.stockSymbol,
      eventType: e.eventType,
      eventDate: e.eventDate.toISOString(),
      title: e.title,
      details: e.details,
    }));

    // 7. Real Market Headlines (Serve from local database immediately without blocking)
    let headlines: Array<{ headline: string; publisher: string; url: string; publishedAt: string }> = [];
    try {
      const dbNews = await prisma.news.findMany({
        take: 5,
        orderBy: { publishedAt: 'desc' },
      });
      if (dbNews.length > 0) {
        headlines = dbNews.map((n) => ({
          headline: n.headline,
          publisher: n.sourceName,
          url: n.sourceUrl,
          publishedAt: n.publishedAt.toISOString(),
        }));
      } else {
        // Non-blocking background news ingestion if DB table is currently empty
        const provider = ProviderFactory.getMarketDataProvider();
        provider.getNews('^NSEI', 5).then(async (rawNews) => {
          const anchorStock = (await prisma.stock.findFirst({ select: { symbol: true } }))?.symbol || 'RELIANCE';
          for (const n of rawNews) {
            const existing = await prisma.news.findFirst({
              where: {
                OR: [{ sourceUrl: n.sourceUrl }, { headline: n.headline }],
              },
            });
            if (!existing) {
              await prisma.news.create({
                data: {
                  stockSymbol: anchorStock,
                  headline: n.headline,
                  summary: n.headline,
                  sourceName: n.sourceName,
                  sourceUrl: n.sourceUrl,
                  publishedAt: n.publishedAt,
                  sentiment: 'NEUTRAL',
                },
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    } catch (err: any) {
      console.warn(`[MarketUniverseService] Failed querying headlines: ${err.message}`);
    }

    const latestQuoteSync = dbIndexQuotes.reduce<Date | null>((latest, q) => {
      if (!latest || q.lastSyncedAt > latest) return q.lastSyncedAt;
      return latest;
    }, null);

    return {
      pulse,
      indices,
      breadth,
      sectors,
      movers,
      volatility,
      globalCues,
      upcomingEvents,
      headlines,
      exposure: null,
      freshness: {
        lastSyncedAt: latestQuoteSync ? latestQuoteSync.toISOString() : new Date().toISOString(),
        delayMinutes: 15,
        isStale: hasStaleBenchmarks || hasStaleStocks,
        provider: 'Yahoo Finance Real-Time Market Provider',
      },
    };
  }

  /**
   * Computes user-specific watchlist exposure against market trends
   */
  private async computeUserExposure(userId: string, baseData: MarketHighlightsResponse) {
    const watchlists = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        stocks: {
          include: {
            stock: true,
          },
        },
      },
    });

    const userWatchedSymbols = new Set<string>();
    const userSectorCounts = new Map<string, number>();

    const universeItems = await prisma.marketUniverseItem.findMany();
    const stockSectorMap = new Map(universeItems.map((u) => [u.symbol, u.sector]));

    for (const wl of watchlists) {
      for (const ws of wl.stocks) {
        userWatchedSymbols.add(ws.stockSymbol);
        const sector = stockSectorMap.get(ws.stockSymbol) || ws.stock.sector || 'General';
        userSectorCounts.set(sector, (userSectorCounts.get(sector) || 0) + 1);
      }
    }

    if (userWatchedSymbols.size === 0) {
      return null;
    }

    // Mark isInWatchlist on movers
    const markWatchlist = (mover: MarketMoverItem) => ({
      ...mover,
      isInWatchlist: userWatchedSymbols.has(mover.symbol),
    });

    baseData.movers.india.gainers = baseData.movers.india.gainers.map(markWatchlist);
    baseData.movers.india.losers = baseData.movers.india.losers.map(markWatchlist);
    baseData.movers.india.mostActive = baseData.movers.india.mostActive.map(markWatchlist);
    baseData.movers.us.gainers = baseData.movers.us.gainers.map(markWatchlist);
    baseData.movers.us.losers = baseData.movers.us.losers.map(markWatchlist);
    baseData.movers.us.mostActive = baseData.movers.us.mostActive.map(markWatchlist);

    // Count how many watched stocks are in movers
    const allMoversSymbols = new Set([
      ...baseData.movers.india.gainers.map((m) => m.symbol),
      ...baseData.movers.india.losers.map((m) => m.symbol),
      ...baseData.movers.india.mostActive.map((m) => m.symbol),
      ...baseData.movers.us.gainers.map((m) => m.symbol),
      ...baseData.movers.us.losers.map((m) => m.symbol),
      ...baseData.movers.us.mostActive.map((m) => m.symbol),
    ]);

    let watchedMoversCount = 0;
    for (const s of userWatchedSymbols) {
      if (allMoversSymbols.has(s)) watchedMoversCount++;
    }

    // Top sector exposure
    let topSector: string | null = null;
    let maxCount = 0;
    for (const [sector, count] of userSectorCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        topSector = sector;
      }
    }

    const topSectorWeight = userWatchedSymbols.size > 0 ? Math.round((maxCount / userWatchedSymbols.size) * 100) : 0;
    const sectorSummary = baseData.sectors.find((s) => s.sector === topSector);
    const topSectorDayChange = sectorSummary ? sectorSummary.changePercent : null;

    let summarySentence = '';
    if (watchedMoversCount > 0 && topSector) {
      summarySentence = `${watchedMoversCount} of your stocks are among today's top market movers. Your largest sector exposure is ${topSector} (${topSectorWeight}% of watchlist)${topSectorDayChange !== null ? `, which is ${topSectorDayChange >= 0 ? '+' : ''}${topSectorDayChange}% today` : ''}.`;
    } else if (topSector) {
      summarySentence = `Your largest sector exposure is ${topSector} (${topSectorWeight}% of watchlist)${topSectorDayChange !== null ? `, which is ${topSectorDayChange >= 0 ? '+' : ''}${topSectorDayChange}% today` : ''}.`;
    } else {
      summarySentence = `Monitoring ${userWatchedSymbols.size} stocks in your watchlist against current market trends.`;
    }

    return {
      watchedMoversCount,
      topSector,
      topSectorWeight,
      topSectorDayChange,
      summarySentence,
    };
  }
}

export const marketUniverseService = new MarketUniverseService();
