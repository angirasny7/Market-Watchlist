import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Inbox,
  Clock,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Globe,
  Radio,
  Brain,
  Bookmark,
  Zap,
  Activity,
  Calendar,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { feedApiService } from '../../services/feedApiService';
import { marketHighlightsService } from '../../services/marketHighlightsService';
import { memoryService } from '../../services/memoryService';
import { feedStreamClient } from '../../services/feedStreamClient';
import { FeedItem, FeedSummary } from '../../types/feed';
import { MarketHighlightsData } from '../../types/market';
import { MemoryCounts, ArchivedMarketEvent } from '../../types/memory';
import { formatPrice } from '../../lib/utils';
import { getExchangeMarketStatus } from '../../lib/marketHours';
import { DashboardSkeleton, ErrorState } from '../common';

export const SimpleDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { watchlist, isLoading: isWatchlistLoading, refreshMarketData } = useMarketStore();
  const { addToast } = useToastStore();

  const [summary, setSummary] = useState<FeedSummary | null>(null);
  const [highPriorityItems, setHighPriorityItems] = useState<FeedItem[]>([]);
  const [highlights, setHighlights] = useState<MarketHighlightsData | null>(null);
  const [memoryCounts, setMemoryCounts] = useState<MemoryCounts | null>(null);
  const [recentMemoryItems, setRecentMemoryItems] = useState<ArchivedMarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const authenticatedName = user?.name || 'Investor';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadAllDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    try {
      setIsError(false);
      setErrorMessage(null);

      // Fetch all core project telemetry in parallel
      const [summaryRes, feedRes, highlightsRes, memoryCountsRes, memoryItemsRes] = await Promise.allSettled([
        feedApiService.getSummary('toReview'),
        feedApiService.getFeed({ window: 'toReview', limit: 20 }),
        marketHighlightsService.getMarketHighlights(),
        memoryService.fetchMemoryCounts(),
        memoryService.getMemory({ limit: 3, tab: 'SAVED' }),
      ]);

      if (summaryRes.status === 'fulfilled' && summaryRes.value) {
        setSummary(summaryRes.value);
      }

      if (feedRes.status === 'fulfilled' && feedRes.value?.items) {
        const topItems = feedRes.value.items
          .filter(
            (i) =>
              i.priority === 'CRITICAL' ||
              i.priority === 'HIGH' ||
              (typeof i.meaningfulnessScore === 'number' && i.meaningfulnessScore >= 70)
          )
          .slice(0, 3);
        setHighPriorityItems(topItems);
      }

      if (highlightsRes.status === 'fulfilled' && highlightsRes.value) {
        setHighlights(highlightsRes.value);
      }

      if (memoryCountsRes.status === 'fulfilled' && memoryCountsRes.value) {
        setMemoryCounts(memoryCountsRes.value);
      }

      if (memoryItemsRes.status === 'fulfilled' && memoryItemsRes.value?.items) {
        setRecentMemoryItems(memoryItemsRes.value.items.slice(0, 3));
      }
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setIsError(true);
      setErrorMessage(err?.message || 'Failed to load intelligence dashboard.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllDashboardData();

    // Subscribe to live SSE feed updates
    const unsubscribe = feedStreamClient.subscribe((event) => {
      if (event.action === 'feed:new_event' || event.action === 'feed:read' || event.action === 'feed:delete') {
        loadAllDashboardData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadAllDashboardData]);

  const handleRefresh = async () => {
    await Promise.all([loadAllDashboardData(true), refreshMarketData()]);
  };

  const handleDismissItem = async (eventId: string, stockSymbol: string) => {
    try {
      const res = await feedApiService.markItemRead(eventId);
      if (res?.success) {
        setHighPriorityItems((prev) => prev.filter((i) => i.id !== eventId && !i.memberEventIds?.includes(eventId)));
        if (summary) {
          setSummary({
            ...summary,
            unreadClusters: Math.max(0, summary.unreadClusters - 1),
            needAttentionCount: Math.max(0, summary.needAttentionCount - 1),
          });
        }
        if (memoryCounts) {
          setMemoryCounts({
            ...memoryCounts,
            readCount: memoryCounts.readCount + 1,
          });
        }
        addToast(
          `Marked update for ${stockSymbol} as read`,
          'success',
          8000,
          res.undoToken
            ? {
                label: 'Undo',
                onClick: async () => {
                  await feedApiService.undoAction(res.undoToken!);
                  loadAllDashboardData();
                },
              }
            : undefined
        );
      }
    } catch (err) {
      console.error('Failed to dismiss feed item:', err);
    }
  };

  const getPriorityStyle = (priority: string, score?: number | null) => {
    const s = score ?? 0;
    if (s >= 75 || priority === 'CRITICAL') {
      return { label: 'Urgent', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' };
    }
    if (s >= 50 || priority === 'HIGH') {
      return { label: 'Important', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' };
    }
    if (s >= 30 || priority === 'MEDIUM') {
      return { label: 'Worth a look', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
    }
    return { label: 'FYI', color: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' };
  };

  // Compile all major real-time ticker items (Indices, Global Cues, and Top Tracked Stocks)
  const tickerItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      subLabel?: string;
      price: number;
      changeAmount?: number;
      changePercent: number;
      currency?: string;
      isIndex?: boolean;
      link: string;
    }> = [];

    // 1. Major Benchmark Indices
    if (highlights?.indices) {
      for (const idx of highlights.indices) {
        if (idx.currentPrice > 0) {
          items.push({
            id: idx.symbol,
            label: idx.name,
            subLabel: idx.exchange || 'INDEX',
            price: idx.currentPrice,
            changeAmount: idx.changeAmount,
            changePercent: idx.changePercent,
            currency: idx.exchange === 'NSE' || idx.exchange === 'BSE' ? '₹' : '$',
            isIndex: true,
            link: '/highlights',
          });
        }
      }
    }

    // 2. India VIX
    if (highlights?.volatility && highlights.volatility.currentValue > 0) {
      items.push({
        id: '^INDIAVIX',
        label: 'INDIA VIX',
        subLabel: 'NSE',
        price: highlights.volatility.currentValue,
        changeAmount: highlights.volatility.changeAmount,
        changePercent: highlights.volatility.changePercent,
        currency: '',
        isIndex: true,
        link: '/highlights',
      });
    }

    // 3. Global Cues (Crude Oil, Gold, USD/INR, US 10-Yr)
    if (highlights?.globalCues) {
      for (const cue of highlights.globalCues) {
        if (cue.currentPrice > 0) {
          items.push({
            id: cue.symbol,
            label: cue.name,
            subLabel: cue.exchange || 'MACRO',
            price: cue.currentPrice,
            changeAmount: cue.changeAmount,
            changePercent: cue.changePercent,
            currency: cue.symbol === 'USDINR=X' ? '₹' : cue.symbol === 'CL=F' || cue.symbol === 'GC=F' ? '$' : '',
            isIndex: true,
            link: '/highlights',
          });
        }
      }
    }

    // 4. Tracked Watchlist Stocks (Top movers)
    if (watchlist && watchlist.length > 0) {
      for (const st of watchlist.slice(0, 10)) {
        if (st.currentPrice > 0) {
          items.push({
            id: st.symbol,
            label: st.symbol,
            subLabel: st.name,
            price: st.currentPrice,
            changeAmount: st.changeAmount,
            changePercent: st.changePercent,
            currency: st.currency || '₹',
            isIndex: false,
            link: '/watchlist',
          });
        }
      }
    }

    return items;
  }, [highlights, watchlist]);

  if (isLoading && !summary && watchlist.length === 0 && !highlights) {
    return <DashboardSkeleton />;
  }

  if (isError && !summary && !highlights) {
    return (
      <div className="py-8">
        <ErrorState
          title="Unable to load dashboard"
          message={errorMessage || 'Could not connect to market intelligence services.'}
          onRetry={handleRefresh}
          isRetrying={isRefreshing}
        />
      </div>
    );
  }

  // Portfolio calculations
  const totalWatched = watchlist.length;
  const avgChange =
    totalWatched > 0
      ? watchlist.reduce((acc, s) => acc + (s.changePercent || 0), 0) / totalWatched
      : 0;

  // Highlights indices
  const niftyQuote = highlights?.indices?.find((i) => i.symbol === '^NSEI');
  const sensexQuote = highlights?.indices?.find((i) => i.symbol === '^BSESN');
  const bankNiftyQuote = highlights?.indices?.find((i) => i.symbol === '^NSEBANK');
  const sp500Quote = highlights?.indices?.find((i) => i.symbol === '^GSPC');
  const nasdaqQuote = highlights?.indices?.find((i) => i.symbol === '^IXIC');
  const vixQuote = highlights?.volatility;

  // Breadth
  const breadth = highlights?.breadth || { advancers: 0, decliners: 0, unchanged: 0, total: 0, advancerPercent: 50 };
  const leadSector = highlights?.sectors && highlights.sectors.length > 0 ? highlights.sectors[0] : null;
  const upcomingCatalyst = highlights?.upcomingEvents && highlights.upcomingEvents.length > 0 ? highlights.upcomingEvents[0] : null;

  // Freshness & counts
  const unreadCount = summary?.unreadClusters ?? 0;
  const freshness = summary?.dataFreshness || (highlights?.freshness?.lastSyncedAt ? 'Live updates active' : 'Prices synced');
  const delayNotice = summary?.delayNotice || 'Delayed ~15m (NSE)';

  // Market open/closed status (dynamic calculation matching header)
  const nseStatus = getExchangeMarketStatus('NSE');
  const usStatus = getExchangeMarketStatus('NASDAQ');

  return (
    <div className="w-full space-y-6 pb-16 font-sans">
      {/* 0. CONTINUOUS MOVING MARKET TICKER (GROWW STYLE) */}
      {tickerItems.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl bg-surface/85 backdrop-blur-md border border-border/80 py-2.5 px-3 shadow-md">
          <div className="flex items-center gap-3">
            {/* Left Fixed Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold shrink-0 select-none shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="tracking-wider uppercase font-mono text-[11px] font-bold text-slate-200">Live Markets</span>
            </div>

            {/* Continuous Scrolling Tape with Seamless Duplicate Loop */}
            <div className="marquee-container flex-1 overflow-hidden">
              <div className="marquee-content flex items-center gap-3">
                {[...tickerItems, ...tickerItems].map((item, idx) => {
                  const isGain = item.changePercent >= 0;
                  const isVix = item.id === '^INDIAVIX';
                  const isGoodVix = isVix && item.price <= 20;

                  return (
                    <Link
                      key={`${item.id}-${idx}`}
                      to={item.link}
                      className="flex items-center gap-2 px-3 py-1 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border/60 hover:border-slate-600 transition-colors shrink-0 text-xs group"
                    >
                      <span className="font-bold text-slate-200 font-mono group-hover:text-emerald-400 transition-colors">
                        {item.label}
                      </span>
                      <span className="font-semibold text-slate-100 font-mono">
                        {item.currency ? (item.currency === '₹' || item.currency === '$' ? `${item.currency}${item.price.toLocaleString()}` : `${item.price.toLocaleString()} ${item.currency}`) : item.price.toLocaleString()}
                      </span>
                      <span
                        className={`flex items-center gap-0.5 font-bold font-mono text-[11px] px-1.5 py-0.5 rounded ${
                          isVix
                            ? isGoodVix
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : 'text-rose-400 bg-rose-500/10'
                            : isGain
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {isGain ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>
                          {isGain ? '+' : ''}
                          {item.changePercent.toFixed(2)}%
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 1. HERO HEADER & STATUS BAR */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface via-surface/90 to-surface-subtle border border-border/80 p-5 sm:p-6 shadow-lg shadow-black/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Live Intelligence Engine
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
              {getGreeting()}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200">{authenticatedName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {unreadCount > 0
                ? `${unreadCount} unhandled market anomalies require your attention.`
                : 'All caught up · Your tracked portfolio is trading within normal limits.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Market Status Pills */}
            <div className="flex items-center gap-2 bg-surface-subtle/80 px-3 py-1.5 rounded-xl border border-border/80 text-xs select-none">
              <div className="flex items-center gap-1.5" title={nseStatus.subtext}>
                <span className={`w-1.5 h-1.5 rounded-full ${nseStatus.isOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className={`${nseStatus.isOpen ? 'text-slate-300' : 'text-slate-400'} font-medium`}>
                  NSE: {nseStatus.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <span className="text-slate-600">·</span>
              <div className="flex items-center gap-1.5" title={usStatus.subtext}>
                <span className={`w-1.5 h-1.5 rounded-full ${usStatus.isOpen ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                <span className={`${usStatus.isOpen ? 'text-slate-300' : 'text-slate-400'} font-medium`}>
                  US: {usStatus.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isWatchlistLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium text-xs transition-all shadow-sm disabled:opacity-50"
              title="Refresh all market and feed data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh All'}</span>
            </button>
          </div>
        </div>

        {/* Status Sub-bar */}
        <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{freshness}</span>
            <span className="text-slate-600">·</span>
            <span>{delayNotice}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono hidden sm:block">
            Signals. Context. Insights.
          </div>
        </div>
      </section>

      {/* 2. FOUR CORE PROJECT PILLARS IN NAV ORDER: FEED -> WATCHLIST -> MEMORY -> HIGHLIGHTS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Attention Feed */}
        <Link
          to="/feed?window=toReview"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-surface to-surface border border-emerald-500/20 hover:border-emerald-500/40 p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-emerald-500/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Radio className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono font-medium border border-emerald-500/25">
              {unreadCount} Unhandled
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-emerald-300 transition-colors">
            Attention Feed
          </h3>
          <div className="text-xl font-bold text-slate-100 font-mono mt-1">
            {unreadCount > 0 ? `${unreadCount} Anomalies` : 'All Clear'}
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Causal AI detection explaining why your tracked stocks moved and what matters now.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-emerald-400 group-hover:text-emerald-300 font-medium">
            <span>Review Pending Feed</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pillar 2: Smart Watchlists */}
        <Link
          to="/watchlist"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500/10 via-surface to-surface border border-teal-500/20 hover:border-teal-500/40 p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-teal-500/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-4.5 h-4.5" />
            </div>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium border ${
                avgChange >= 0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}
            >
              {avgChange >= 0 ? '+' : ''}{avgChange.toFixed(1)}% Avg
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
            Smart Watchlists
          </h3>
          <div className="text-xl font-bold text-slate-100 font-mono mt-1">
            {totalWatched} Stocks Tracked
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Multi-watchlist tracking with 52W ranges, real-time quotes, sparklines and corporate events.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-teal-400 group-hover:text-teal-300 font-medium">
            <span>Manage Watchlists</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pillar 3: Market Memory */}
        <Link
          to="/memory"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-surface to-surface border border-amber-500/20 hover:border-amber-500/50 p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-amber-500/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
              <Brain className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-medium border border-amber-500/30">
              {memoryCounts?.savedCount ?? 0} Saved
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-amber-300 transition-colors">
            Market Memory
          </h3>
          <div className="text-xl font-bold text-slate-100 font-mono mt-1">
            {memoryCounts ? memoryCounts.savedCount + memoryCounts.readCount : 0} Archived
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Searchable knowledge base of handled causal insights, saved research notes and digests.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-amber-400 group-hover:text-amber-300 font-medium">
            <span>Browse Memory Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>

        {/* Pillar 4: Market Highlights */}
        <Link
          to="/highlights"
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 via-surface to-surface border border-cyan-500/20 hover:border-cyan-500/50 p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-cyan-500/10"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
              <Globe className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-medium border border-cyan-500/30">
              {breadth.advancers}A / {breadth.decliners}D
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
            Market Highlights
          </h3>
          <div className="text-xl font-bold text-slate-100 font-mono mt-1">
            {niftyQuote && typeof niftyQuote.currentPrice === 'number' ? `${niftyQuote.currentPrice.toLocaleString()}` : 'Macro View'}
          </div>
          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
            Sector heatmaps, top gainers/losers, India VIX volatility regime and global cues.
          </p>
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-cyan-400 group-hover:text-cyan-300 font-medium">
            <span>Explore Highlights</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </Link>
      </section>

      {/* 3. LIVE MAJOR BENCHMARK STRIP */}
      {highlights?.indices && highlights.indices.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Major Market Benchmarks</span>
            </h2>
            <Link to="/highlights" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 font-medium">
              <span>All 12 Benchmarks & Global Cues</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[niftyQuote, sensexQuote, bankNiftyQuote, sp500Quote, nasdaqQuote, vixQuote && typeof vixQuote.currentValue === 'number' ? {
              symbol: vixQuote.symbol,
              name: vixQuote.name,
              currentPrice: vixQuote.currentValue,
              changeAmount: vixQuote.changeAmount,
              changePercent: vixQuote.changePercent,
              exchange: 'NSE',
            } : null]
              .filter((x): x is NonNullable<typeof x> => Boolean(x && typeof x.currentPrice === 'number'))
              .map((idx: any, i) => {
                const isGain = (idx.changePercent ?? 0) >= 0;
                const isVix = idx.symbol === '^INDIAVIX';
                return (
                  <div
                    key={idx.symbol || i}
                    className="p-3 rounded-xl bg-surface border border-border/80 hover:border-slate-700 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-medium truncate">{idx.name}</span>
                      <span className="font-mono text-[10px] text-slate-500">{idx.exchange || 'INDEX'}</span>
                    </div>
                    <div className="text-sm font-bold text-slate-100 font-mono mt-1">
                      {typeof idx.currentPrice === 'number' && idx.currentPrice > 0 ? idx.currentPrice.toLocaleString() : '—'}
                    </div>
                    <div
                      className={`text-[11px] font-semibold font-mono flex items-center gap-0.5 mt-0.5 ${
                        isVix
                          ? (idx.currentPrice || 0) > 20
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                          : isGain
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isGain ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>
                        {isGain ? '+' : ''}
                        {(idx.changePercent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* 4. MAIN 12-COLUMN DASHBOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ATTENTION FEED & WATCHLIST SPOTLIGHT (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION A: NEEDS YOUR ATTENTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Needs Your Attention
                </h2>
                {highPriorityItems.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-mono font-medium">
                    {highPriorityItems.length}
                  </span>
                )}
              </div>
              <Link
                to="/feed?window=toReview"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>View Full Feed</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {highPriorityItems.length > 0 ? (
              <div className="space-y-3">
                {highPriorityItems.map((item) => {
                  const priorityStyle = getPriorityStyle(item.priority, item.meaningfulnessScore);
                  const isGain = item.changePercent >= 0;
                  const currency = item.currency || '₹';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl bg-surface border border-border/80 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${priorityStyle.color}`}>
                            {priorityStyle.label}
                          </span>
                          {typeof item.meaningfulnessScore === 'number' && (
                            <span className="text-[11px] font-mono font-medium px-1.5 py-0.2 rounded bg-surface-subtle text-slate-400 border border-border">
                              Score {item.meaningfulnessScore}
                            </span>
                          )}
                          <span className="font-semibold text-slate-100 text-sm">{item.companyName}</span>
                          <span className="text-xs font-mono text-slate-400 bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
                            {item.stockSymbol}
                          </span>
                        </div>

                        <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">
                          {item.headline}
                        </p>

                        {item.signals && item.signals.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {item.signals.map((sig, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded bg-surface-subtle text-slate-300 border border-border/80 font-mono"
                              >
                                {sig.label}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 border-border/50 pt-2 sm:pt-0">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-slate-100 font-mono">
                            {item.currentPrice ? formatPrice(item.currentPrice, currency) : '—'}
                          </div>
                          <div
                            className={`text-xs font-semibold font-mono flex items-center justify-end gap-0.5 ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <span>
                              {isGain ? '+' : ''}
                              {item.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDismissItem(item.id, item.stockSymbol)}
                            className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border transition-colors"
                            title="Mark as read"
                          >
                            Dismiss
                          </button>
                          <Link
                            to="/feed?window=toReview"
                            className="text-xs text-emerald-400 hover:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-colors flex items-center gap-0.5 font-medium"
                          >
                            <span>Analyze</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-surface/50 border border-border/60 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto stroke-[1.5]" />
                <p className="text-sm font-semibold text-slate-200">
                  No Critical Anomalies Requiring Attention
                </p>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  All your tracked stocks are operating within normal volatility boundaries. Review standard market events in the Attention Feed.
                </p>
                <div className="pt-1">
                  <Link
                    to="/feed?window=toReview"
                    className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    <span>Browse complete feed timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </section>

          {/* SECTION B: WATCHLIST SPOTLIGHT & 52-WEEK RANGE VISUALIZER */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <BarChart3 className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Watchlist Spotlight & Range
                </h2>
              </div>
              <Link
                to="/watchlist"
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors"
              >
                <span>Manage Watchlists ({watchlist.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {watchlist.length > 0 ? (
              <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {watchlist.slice(0, 6).map((stock) => {
                    const isGain = stock.changePercent >= 0;
                    const price = stock.currentPrice || 0;
                    const high52 = stock.high52w || price;
                    const low52 = stock.low52w || price;
                    const rangeSpan = high52 - low52;
                    const positionPct =
                      rangeSpan > 0 ? Math.max(0, Math.min(100, ((price - low52) / rangeSpan) * 100)) : 50;

                    return (
                      <Link
                        key={stock.symbol}
                        to="/watchlist"
                        className="p-3 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border/60 transition-all block group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-100 font-mono group-hover:text-emerald-400 transition-colors">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[110px]">{stock.name}</span>
                          </div>
                          <span
                            className={`text-xs font-mono font-bold ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isGain ? '+' : ''}
                            {stock.changePercent.toFixed(1)}%
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between mt-1">
                          <span className="text-sm font-bold text-slate-100 font-mono">
                            {formatPrice(stock.currentPrice, stock.currency || '₹')}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{stock.sector}</span>
                        </div>

                        {/* 52-Week Range Visual Progress Bar */}
                        <div className="mt-2.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                            <span>52W L: {low52.toFixed(0)}</span>
                            <span className="text-slate-400 font-semibold">{positionPct.toFixed(0)}%</span>
                            <span>52W H: {high52.toFixed(0)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden relative">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                              style={{ width: `${positionPct}%` }}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {watchlist.length > 6 && (
                  <div className="text-center pt-2 border-t border-border/50">
                    <Link
                      to="/watchlist"
                      className="text-xs text-slate-400 hover:text-emerald-300 transition-colors font-medium"
                    >
                      +{watchlist.length - 6} more stocks in your watchlist →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-surface border border-border/80 text-center space-y-2">
                <Inbox className="w-8 h-8 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No stocks in your watchlist yet</p>
                <p className="text-xs text-slate-400">Add companies to unlock real-time tracking, anomaly alerts, and price catalysts.</p>
                <Link
                  to="/watchlist"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors pt-1"
                >
                  <span>Add stocks to track</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: MARKET MEMORY (1ST) -> MARKET HIGHLIGHTS (2ND) -> PLATFORM NAVIGATION HUB (3RD) (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION C: MARKET MEMORY & RESEARCH REPOSITORY (FIRST) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bookmark className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Market Memory & Research
                </h2>
              </div>
              <Link to="/memory" className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium">
                <span>View Memory</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-sm">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-xl bg-surface-subtle border border-border/60">
                  <div className="text-xs text-slate-400">Saved</div>
                  <div className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                    {memoryCounts?.savedCount ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-surface-subtle border border-border/60">
                  <div className="text-xs text-slate-400">Read</div>
                  <div className="text-sm font-bold text-slate-200 font-mono mt-0.5">
                    {memoryCounts?.readCount ?? 0}
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-surface-subtle border border-border/60">
                  <div className="text-xs text-slate-400">Total Arch</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {memoryCounts ? memoryCounts.savedCount + memoryCounts.readCount : 0}
                  </div>
                </div>
              </div>

              {recentMemoryItems.length > 0 ? (
                <div className="space-y-2 pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Recent Bookmarked Insights
                  </span>
                  {recentMemoryItems.map((item) => (
                    <Link
                      key={item.id}
                      to="/memory?tab=SAVED"
                      className="p-2.5 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border/60 block transition-colors group"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200 font-mono group-hover:text-amber-300 transition-colors">
                          {item.stockSymbol}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(item.savedAt || item.readAt || item.occurredAt || item.timestamp || Date.now()).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{item.headline}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-2 text-xs text-slate-400">
                  Save important insights from the Attention Feed to keep them in permanent research memory.
                </div>
              )}
            </div>
          </section>

          {/* SECTION D: MARKET HIGHLIGHTS & MACRO BREADTH (SECOND) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Market Breadth & Macro
                </h2>
              </div>
              <Link to="/highlights" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium">
                <span>All Highlights</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border/80 space-y-4 shadow-sm">
              {/* Market Breadth Gauge */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">Nifty 50 Universe Breadth</span>
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    {breadth.advancers} Adv / {breadth.decliners} Dec
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 h-full transition-all"
                    style={{
                      width: `${breadth.total > 0 ? (breadth.advancers / breadth.total) * 100 : 50}%`,
                    }}
                    title={`${breadth.advancers} Advancing`}
                  />
                  <div
                    className="bg-slate-600 h-full transition-all"
                    style={{
                      width: `${breadth.total > 0 ? (breadth.unchanged / breadth.total) * 100 : 0}%`,
                    }}
                    title={`${breadth.unchanged} Unchanged`}
                  />
                  <div
                    className="bg-rose-500 h-full transition-all"
                    style={{
                      width: `${breadth.total > 0 ? (breadth.decliners / breadth.total) * 100 : 50}%`,
                    }}
                    title={`${breadth.decliners} Declining`}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                  <span className="text-emerald-400">🟢 {breadth.advancerPercent}% Advancing</span>
                  <span className="text-rose-400">🔴 {(100 - breadth.advancerPercent).toFixed(1)}% Declining</span>
                </div>
              </div>

              {/* Sector & Volatility Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                {/* Sector Leader */}
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Top Sector
                  </span>
                  <div className="text-xs font-bold text-slate-200 truncate">
                    {leadSector ? leadSector.sector : 'General'}
                  </div>
                  <div className="text-[11px] font-mono font-semibold text-emerald-400">
                    {leadSector && typeof leadSector.changePercent === 'number' ? `+${leadSector.changePercent.toFixed(2)}%` : '—'}
                  </div>
                </div>

                {/* India VIX Regime */}
                <div className="p-2.5 rounded-xl bg-surface-subtle border border-border/60 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    India VIX (Risk)
                  </span>
                  <div className="text-xs font-bold text-slate-200">
                    {vixQuote && typeof vixQuote.currentValue === 'number' ? `${vixQuote.currentValue.toFixed(2)}` : '—'}
                  </div>
                  <div
                    className={`text-[11px] font-mono font-semibold ${
                      vixQuote?.level === 'CALM'
                        ? 'text-emerald-400'
                        : vixQuote?.level === 'ELEVATED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {vixQuote?.level || 'NORMAL'} Regime
                  </div>
                </div>
              </div>

              {/* Upcoming Catalyst */}
              {upcomingCatalyst && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 font-semibold text-emerald-300">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Upcoming Catalyst</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 font-medium">
                      {new Date(upcomingCatalyst.eventDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 font-medium line-clamp-1">{upcomingCatalyst.title}</p>
                </div>
              )}
            </div>
          </section>

          {/* SECTION E: PROJECT ARCHITECTURE & FEATURE HUB */}
          <section className="p-4 rounded-2xl bg-gradient-to-br from-surface via-surface-subtle to-surface border border-border/80 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Platform Navigation Hub
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                to="/feed?window=toReview"
                className="p-2.5 rounded-xl bg-surface/80 hover:bg-emerald-500/10 border border-border hover:border-emerald-500/30 transition-all block group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-emerald-300">
                  📡 Attention Feed
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Causal AI reasoning</div>
              </Link>
              <Link
                to="/watchlist"
                className="p-2.5 rounded-xl bg-surface/80 hover:bg-teal-500/10 border border-border hover:border-teal-500/30 transition-all block group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-teal-300">
                  📊 Watchlists
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Multi-list manager</div>
              </Link>
              <Link
                to="/memory"
                className="p-2.5 rounded-xl bg-surface/80 hover:bg-amber-500/10 border border-border hover:border-amber-500/30 transition-all block group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-amber-300">
                  🗄️ Market Memory
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Digests & research notes</div>
              </Link>
              <Link
                to="/highlights"
                className="p-2.5 rounded-xl bg-surface/80 hover:bg-cyan-500/10 border border-border hover:border-cyan-500/30 transition-all block group"
              >
                <div className="font-semibold text-slate-200 group-hover:text-cyan-300">
                  🌍 Market Highlights
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Sector heatmaps & cues</div>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SimpleDashboard;
