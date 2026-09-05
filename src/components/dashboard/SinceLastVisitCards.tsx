import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Award, DollarSign, TrendingUp, ChevronRight, Star, Clock } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { cn } from '../../lib/utils';
import { SectionHeader, KpiGrid, KpiCard } from '../common';

export const SinceLastVisitCards: React.FC = () => {
  const navigate = useNavigate();
  const { watchlist, events, setFeedFilter, setFeedScope } = useMarketStore();

  if (watchlist.length === 0) {
    return (
      <section className="p-8 rounded-[20px] bg-surface/85 backdrop-blur-md border border-border/80 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
          <Star className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-100">No watchlist found.</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Create your first watchlist to start receiving personalized market intelligence.
        </p>
        <button
          onClick={() => navigate('/onboarding')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md"
        >
          Create Watchlist
        </button>
      </section>
    );
  }

  // Watchlist-Centric: Strictly use watchlist events
  const sourceEvents = events.filter((e) => e.inWatchlist);
  const isWatchlistSourced = true;

  // 1. Stocks Requiring Attention (Critical & High)
  const attentionEvents = sourceEvents.filter(
    (e) => e.priority === 'CRITICAL' || e.priority === 'HIGH'
  );
  const criticalCount = sourceEvents.filter((e) => e.priority === 'CRITICAL').length;
  const highCount = sourceEvents.filter((e) => e.priority === 'HIGH').length;

  // 2. Earnings Released / Catalysts
  const earningsEvents = sourceEvents.filter(
    (e) =>
      e.eventType === 'EARNINGS_BEAT' ||
      e.eventType === 'EARNINGS_MISS' ||
      e.eventType === 'EARNINGS_RELEASE'
  );

  // 3. Dividends Announced
  const dividendEvents = sourceEvents.filter(
    (e) => e.eventType === 'DIVIDEND_ANNOUNCED'
  );

  // 4. Significant Movers (Price Surge or 52W High)
  const moverEvents = sourceEvents.filter(
    (e) =>
      e.eventType === 'PRICE_SURGE' ||
      e.eventType === 'PRICE_SPIKE' ||
      e.eventType === 'FIFTY_TWO_WEEK_HIGH' ||
      e.eventType === '52_WEEK_HIGH'
  );

  // Derive dynamic subtexts from real live data
  const attentionSubtext =
    attentionEvents.length > 0
      ? `${criticalCount} Critical • ${highCount} High Priority in active focus`
      : 'No high-priority alerts flagged in current session';

  const earningsSubtext =
    earningsEvents.length > 0
      ? `${earningsEvents[0].stockSymbol}: ${earningsEvents[0].headline}`
      : 'No earnings releases recorded during this window';

  const dividendSubtext =
    dividendEvents.length > 0
      ? `${dividendEvents[0].stockSymbol}: ${dividendEvents[0].headline}`
      : 'No capital distribution actions recorded during this window';

  const moverSubtext =
    moverEvents.length > 0
      ? moverEvents
          .slice(0, 2)
          .map((m) => `${m.stockSymbol} (${m.changePercent >= 0 ? '+' : ''}${m.changePercent.toFixed(1)}%)`)
          .join(', ')
      : 'Market volatility remained within baseline bands';

  const cards = [
    {
      id: 'attention',
      title: isWatchlistSourced ? 'Watchlist Attention Required' : 'Stocks Requiring Attention',
      count: attentionEvents.length,
      subtext: attentionSubtext,
      icon: AlertTriangle,
      tag: isWatchlistSourced ? 'Watchlist Focus' : 'Urgent Action',
      tagColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      filter: 'critical' as const,
      accent: 'rose' as const,
    },
    {
      id: 'earnings',
      title: 'Earnings Catalysts',
      count: earningsEvents.length,
      subtext: earningsSubtext,
      icon: Award,
      tag: 'Corporate Results',
      tagColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      filter: 'earnings' as const,
      accent: 'purple' as const,
    },
    {
      id: 'dividends',
      title: 'Dividends Announced',
      count: dividendEvents.length,
      subtext: dividendSubtext,
      icon: DollarSign,
      tag: 'Cash Payouts',
      tagColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      filter: 'dividend' as const,
      accent: 'amber' as const,
    },
    {
      id: 'movers',
      title: 'Significant Movers',
      count: moverEvents.length,
      subtext: moverSubtext,
      icon: TrendingUp,
      tag: 'Breakouts & Surges',
      tagColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      filter: '52w' as const,
      accent: 'emerald' as const,
    },
  ];

  const handleCardClick = (filter: 'critical' | 'earnings' | 'dividend' | '52w') => {
    setFeedFilter(filter);
    if (isWatchlistSourced) {
      setFeedScope('watchlist');
    }
    navigate('/feed');
  };

  return (
    <section className="space-y-4">
      <SectionHeader
        title={
          <span className="flex items-center gap-2">
            <span>Since Your Last Visit</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              (Summary Delta)
            </span>
          </span>
        }
        icon={<Clock className="w-4 h-4 text-indigo-400" />}
        iconColor="indigo"
        badge={
          isWatchlistSourced ? (
            <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
              <Star className="w-3 h-3 fill-amber-300" />
              <span>Watchlist Prioritized</span>
            </span>
          ) : undefined
        }
        description="Categorized overview of what developed across your portfolio while you were away"
      />

      <KpiGrid cols={4}>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <KpiCard
              key={card.id}
              label={card.title}
              value={card.count}
              subtext={
                <div className="flex items-center justify-between gap-1 text-[11px] text-slate-300 pt-1.5 border-t border-border/60 mt-1">
                  <span className="truncate">{card.subtext}</span>
                  <span className="text-slate-400 group-hover:text-indigo-400 transition-colors shrink-0 flex items-center">
                    <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              }
              icon={<Icon className="w-4 h-4" />}
              accent={card.accent}
              badge={
                <span
                  className={cn(
                    'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border',
                    card.tagColor
                  )}
                >
                  {card.tag}
                </span>
              }
              onClick={() => handleCardClick(card.filter)}
            />
          );
        })}
      </KpiGrid>
    </section>
  );
};
