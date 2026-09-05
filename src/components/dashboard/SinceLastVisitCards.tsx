import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Award, DollarSign, TrendingUp, ChevronRight, Star } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { cn } from '../../lib/utils';

export const SinceLastVisitCards: React.FC = () => {
  const navigate = useNavigate();
  const { watchlist, events, setFeedFilter, setFeedScope } = useMarketStore();

  if (watchlist.length === 0) {
    return (
      <section className="p-8 rounded-2xl bg-surface border border-border text-center space-y-3">
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
      color: 'from-rose-500/10 to-amber-500/5',
      borderColor: 'hover:border-rose-500/40',
      iconColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      tag: isWatchlistSourced ? 'Watchlist Focus' : 'Urgent Action',
      tagColor: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
      filter: 'critical' as const,
    },
    {
      id: 'earnings',
      title: 'Earnings Catalysts',
      count: earningsEvents.length,
      subtext: earningsSubtext,
      icon: Award,
      color: 'from-purple-500/10 to-indigo-500/5',
      borderColor: 'hover:border-purple-500/40',
      iconColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      tag: 'Corporate Results',
      tagColor: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      filter: 'earnings' as const,
    },
    {
      id: 'dividends',
      title: 'Dividends Announced',
      count: dividendEvents.length,
      subtext: dividendSubtext,
      icon: DollarSign,
      color: 'from-amber-500/10 to-yellow-500/5',
      borderColor: 'hover:border-amber-500/40',
      iconColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      tag: 'Cash Payouts',
      tagColor: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      filter: 'dividend' as const,
    },
    {
      id: 'movers',
      title: 'Significant Movers',
      count: moverEvents.length,
      subtext: moverSubtext,
      icon: TrendingUp,
      color: 'from-emerald-500/10 to-teal-500/5',
      borderColor: 'hover:border-emerald-500/40',
      iconColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      tag: 'Breakouts & Surges',
      tagColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      filter: '52w' as const,
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
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <span>Since Your Last Visit</span>
            {isWatchlistSourced && (
              <span className="inline-flex items-center gap-1 text-xs font-mono font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Star className="w-3 h-3 fill-amber-300" />
                <span>Watchlist Prioritized</span>
              </span>
            )}
            <span className="text-xs font-mono font-normal text-slate-400">
              (Summary Delta)
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Categorized overview of what developed across your portfolio while you were away
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(card.filter)}
              className={cn(
                'relative bg-surface p-5 rounded-xl border border-border transition-all duration-200 cursor-pointer group hover:bg-surface-hover shadow-sm',
                card.borderColor
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className={cn(
                    'p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105',
                    card.iconColor
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={cn(
                    'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border',
                    card.tagColor
                  )}
                >
                  {card.tag}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-medium text-slate-400">
                  {card.title}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-extrabold font-sans text-slate-100 tabular-numbers tracking-tight">
                    {card.count}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center group-hover:text-indigo-400 transition-colors">
                    <span>View items</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5 transform group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-border/60 text-[11px] text-slate-300 line-clamp-1">
                {card.subtext}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
