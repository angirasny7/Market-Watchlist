import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FeedHeader,
  FeedFilterBar,
  FeedMetricsSummary,
  ConfidenceIndicator,
  TriadEventCard,
  PriorityFilter,
  CategoryFilter,
  StatusFilter,
} from '../components/feed';
import { useMarketStore } from '../store/useMarketStore';
import { CheckCircle2, RotateCcw, ShieldAlert, FilterX, ChevronDown, PlusCircle, Database } from 'lucide-react';

import { PageContainer } from '../components/common';

const PAGE_SIZE = 8;

export const AttentionFeedPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    watchlist,
    events,
    insights,
    feedFilter: storeFeedFilter,
    feedScope,
    setFeedScope,
    setFeedFilter: setStoreFeedFilter,
    markAllEventsRead,
    getInsightsByEvent,
  } = useMarketStore();

  // Local filter states for comprehensive multi-dimensional filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Sync store feedFilter (e.g. from Dashboard summary card navigation)
  useEffect(() => {
    if (storeFeedFilter === 'critical') {
      setPriorityFilter('CRITICAL');
    } else if (storeFeedFilter === 'high') {
      setPriorityFilter('HIGH');
    } else if (storeFeedFilter === 'earnings') {
      setCategoryFilter('EARNINGS_BEAT');
    } else if (storeFeedFilter === 'dividend') {
      setCategoryFilter('DIVIDEND_ANNOUNCED');
    } else if (storeFeedFilter === '52w') {
      setCategoryFilter('FIFTY_TWO_WEEK_HIGH');
    } else if (storeFeedFilter === 'unread') {
      setStatusFilter('UNREAD');
    }
  }, [storeFeedFilter]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setPriorityFilter('ALL');
    setCategoryFilter('ALL');
    setStatusFilter('ALL');
    setStoreFeedFilter('all');
    setFeedScope('all');
    setVisibleCount(PAGE_SIZE);
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    priorityFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    feedScope !== 'all';

  const unreadCount = useMemo(() => {
    return events.filter((e) => !e.read).length;
  }, [events]);

  // Filter and rank events
  const filteredEvents = useMemo(() => {
    return events
      .filter((e) => {
        // Watchlist Scope Filter
        if (feedScope === 'watchlist' && !e.inWatchlist) {
          return false;
        }

        // Priority filter
        if (priorityFilter !== 'ALL' && e.priority !== priorityFilter) {
          return false;
        }

        // Category filter (with backward compatible aliases)
        if (categoryFilter !== 'ALL') {
          if (categoryFilter === 'EARNINGS_BEAT' || categoryFilter === 'EARNINGS_RELEASE') {
            if (e.eventType !== 'EARNINGS_BEAT' && e.eventType !== 'EARNINGS_RELEASE') return false;
          } else if (categoryFilter === 'FIFTY_TWO_WEEK_HIGH' || categoryFilter === '52_WEEK_HIGH') {
            if (e.eventType !== 'FIFTY_TWO_WEEK_HIGH' && e.eventType !== '52_WEEK_HIGH') return false;
          } else if (categoryFilter === 'FIFTY_TWO_WEEK_LOW' || categoryFilter === '52_WEEK_LOW') {
            if (e.eventType !== 'FIFTY_TWO_WEEK_LOW' && e.eventType !== '52_WEEK_LOW') return false;
          } else if (categoryFilter === 'PRICE_SURGE' || categoryFilter === 'PRICE_SPIKE') {
            if (e.eventType !== 'PRICE_SURGE' && e.eventType !== 'PRICE_SPIKE') return false;
          } else if (e.eventType !== categoryFilter) {
            return false;
          }
        }

        // Status filter (Attention Feed only contains active actionable items)
        if (statusFilter === 'UNREAD' && e.read) {
          return false;
        }

        // Search query filter (matches ticker symbol, company name, or headline)
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchSymbol = e.stockSymbol.toLowerCase().includes(q);
          const matchCompany = e.companyName.toLowerCase().includes(q);
          const matchHeadline = e.headline.toLowerCase().includes(q);
          if (!matchSymbol && !matchCompany && !matchHeadline) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        // 1. Watchlist items surfaced first!
        if (a.inWatchlist && !b.inWatchlist) return -1;
        if (!a.inWatchlist && b.inWatchlist) return 1;

        // 2. Priority weight
        const priorityWeights = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const diff = priorityWeights[b.priority] - priorityWeights[a.priority];
        if (diff !== 0) return diff;

        // 3. Attention Score
        return (b.scoring?.finalScore || 0) - (a.scoring?.finalScore || 0);
      });
  }, [events, feedScope, priorityFilter, categoryFilter, statusFilter, searchQuery]);

  // Paginated slice
  const displayedEvents = useMemo(() => {
    return filteredEvents.slice(0, visibleCount);
  }, [filteredEvents, visibleCount]);

  // Insights associated with visible events for confidence metrics
  const visibleInsights = useMemo(() => {
    return displayedEvents
      .map((e) => getInsightsByEvent(e.id)[0])
      .filter((i): i is NonNullable<typeof i> => Boolean(i));
  }, [displayedEvents, getInsightsByEvent]);

  return (
    <PageContainer>
      {/* 1. Standardized Page Header */}
      <FeedHeader onMarkAllRead={markAllEventsRead} unreadCount={unreadCount} />

      {/* 2. Standardized KPI Grid */}
      <FeedMetricsSummary
        visibleEvents={filteredEvents}
        insights={insights}
      />

      {/* 3. Standardized Multi-Dimensional Filter Bar with Watchlist Scope */}
      <FeedFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedPriority={priorityFilter}
        onPriorityChange={setPriorityFilter}
        selectedCategory={categoryFilter}
        onCategoryChange={setCategoryFilter}
        selectedStatus={statusFilter}
        onStatusChange={setStatusFilter}
        selectedScope={feedScope}
        onScopeChange={setFeedScope}
        onMarkAllRead={markAllEventsRead}
        unreadCount={unreadCount}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* 4. Confidence Distribution Visualizer */}
      <ConfidenceIndicator insights={visibleInsights} />

      {/* 5. Main Content: Triad Cards Stream */}
      <div className="space-y-5">
        {displayedEvents.length > 0 ? (
          <>
            {displayedEvents.map((event) => {
              const eventInsights = getInsightsByEvent(event.id);
              const primaryInsight = eventInsights[0];

              return (
                <TriadEventCard
                  key={event.id}
                  event={event}
                  insight={primaryInsight}
                />
              );
            })}

            {/* Pagination / Load More */}
            {filteredEvents.length > visibleCount && (
              <div className="pt-4 flex items-center justify-center">
                <button
                  onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border hover:border-slate-600 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm"
                >
                  <ChevronDown className="w-4 h-4" />
                  <span>
                    Load More Signals ({filteredEvents.length - visibleCount} remaining)
                  </span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* 6. Intelligent Empty States */
          <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-border text-center space-y-4">
            {watchlist.length === 0 ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  No tracked stocks yet.
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Create your first watchlist to begin receiving critical alerts and market signals.
                </p>
                <button
                  onClick={() => navigate('/onboarding')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Watchlist</span>
                </button>
              </div>
            ) : feedScope === 'watchlist' && !searchQuery ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  No Active Watchlist Anomalies
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Your tracked watchlist stocks have no unhandled signals matching the selected criteria.
                </p>
                <button
                  onClick={() => setFeedScope('all')}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  View All Market Signals
                </button>
              </div>
            ) : events.length === 0 || (!searchQuery && priorityFilter === 'ALL' && categoryFilter === 'ALL') ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  You're all caught up.
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  No actionable signals require attention.
                </p>
                <button
                  onClick={() => navigate('/memory')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
                >
                  <Database className="w-4 h-4" />
                  <span>Go to Market Memory</span>
                </button>
              </div>
            ) : priorityFilter === 'CRITICAL' ? (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  No Critical Events Matching
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  No critical anomalies (score ≥ 85) match the current active filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                  <FilterX className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  No Signals Match Criteria
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Try broadening your search term, switching categories, or clearing priority filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default AttentionFeedPage;
