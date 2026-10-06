import React, { useEffect, useState, useCallback } from 'react';
import {
  MarketPulseCard,
  IndexTickerRibbon,
  MarketBreadthCard,
  SectorHeatmap,
  MarketMoversGrid,
  VolatilityCard,
  GlobalCuesCard,
  UpcomingEventsCard,
  MarketHeadlinesCard,
  UserExposureCard,
} from '../components/highlights';
import { PageContainer } from '../components/common';
import { marketHighlightsService } from '../services';
import { MarketHighlightsData } from '../types/market';
import { RefreshCw, AlertCircle } from 'lucide-react';

export const MarketHighlightsPage: React.FC = () => {
  const [data, setData] = useState<MarketHighlightsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHighlights = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      const res = await marketHighlightsService.getMarketHighlights();
      setData(res);
      setError(null);
    } catch (err: any) {
      console.error('[MarketHighlights] Failed fetching data:', err);
      if (!data) {
        setError(err?.response?.data?.error || err.message || 'Failed to load market highlights');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    fetchHighlights();

    // Set up auto-refresh interval (every 60s) paused when document is hidden
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchHighlights(false);
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchHighlights]);

  if (isLoading && !data) {
    return (
      <PageContainer>
        <div className="w-full space-y-6 animate-pulse">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <div className="h-7 w-48 bg-slate-800 rounded-lg" />
            <div className="h-4 w-96 bg-slate-800/60 rounded" />
          </div>

          {/* Pulse Card Skeleton */}
          <div className="h-28 bg-surface rounded-2xl border border-border" />

          {/* Indices Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-surface rounded-xl border border-border" />
            ))}
          </div>

          {/* Heatmap & Breadth Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 bg-surface rounded-2xl border border-border" />
            <div className="h-64 bg-surface rounded-2xl border border-border" />
          </div>
        </div>
      </PageContainer>
    );
  }

  if (error && !data) {
    return (
      <PageContainer>
        <div className="w-full py-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">Unable to load Market Highlights</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            onClick={() => fetchHighlights(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </PageContainer>
    );
  }

  if (!data) return null;

  return (
    <PageContainer>
      <div className="w-full space-y-6">
        {/* 1. Page Header with Refresh Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Market Highlights
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Benchmark indices, sector momentum, and top movers across the monitored market universe.
            </p>
          </div>

          <button
            onClick={() => fetchHighlights(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-slate-600 text-xs font-medium text-slate-300 hover:text-white transition-colors disabled:opacity-50 self-start sm:self-auto font-mono"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-400'}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Quotes'}</span>
          </button>
        </div>

        {/* 2. SECTION 1: Market Pulse & Exchange Status */}
        <MarketPulseCard pulse={data.pulse} freshness={data.freshness} />

        {/* 3. SECTION 10: Your Watchlist Exposure (if logged in & has watchlist) */}
        {data.exposure && <UserExposureCard exposure={data.exposure} />}

        {/* 4. SECTION 2: Benchmark Indices */}
        <section>
          <IndexTickerRibbon indices={data.indices} />
        </section>

        {/* 5. SECTION 3 & 6: Breadth & Volatility (Responsive 2-Col Grid) */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MarketBreadthCard breadth={data.breadth} />
          <VolatilityCard volatility={data.volatility} />
        </section>

        {/* 6. SECTION 4: Sector Heatmap */}
        <section>
          <SectorHeatmap sectors={data.sectors} />
        </section>

        {/* 7. SECTION 5: Significant Market Movers */}
        <section>
          <MarketMoversGrid movers={data.movers} />
        </section>

        {/* 8. SECTION 7: Global Cues */}
        <section>
          <GlobalCuesCard cues={data.globalCues} />
        </section>

        {/* 9. SECTION 8 & 9: Upcoming Corporate Events & Market Headlines */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UpcomingEventsCard events={data.upcomingEvents} />
          <MarketHeadlinesCard headlines={data.headlines} />
        </section>
      </div>
    </PageContainer>
  );
};

export default MarketHighlightsPage;
