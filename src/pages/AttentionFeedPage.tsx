import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FeedListCard,
  FeedDetailsDrawer,
  FeedHeaderBar,
  FeedControlsBar,
} from '../components/feed';
import { feedApiService } from '../services/feedApiService';
import { useMarketStore } from '../store/useMarketStore';
import {
  FeedItem,
  FeedSummary,
  FeedTimeWindow,
} from '../types/feed';
import {
  PageContainer,
  FeedSkeleton,
  ErrorState,
} from '../components/common';
import {
  CheckCircle2,
  Sparkles,
  ChevronDown,
  RotateCcw,
  Search,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AttentionFeedPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userWatchlists, fetchUserWatchlists } = useMarketStore();

  // State: Data
  const [items, setItems] = useState<FeedItem[]>([]);
  const [summary, setSummary] = useState<FeedSummary | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // State: Loading & Errors
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMarkingCaughtUp, setIsMarkingCaughtUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State: Real-time update pill
  const [newUpdatesAvailable, setNewUpdatesAvailable] = useState(0);

  // State: Filter controls
  const [selectedWindow, setSelectedWindow] = useState<FeedTimeWindow>('sinceLastVisit');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);

  // State: Details Drawer & Selection
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Read URL params (event deep link or symbol filter)
  const eventParam = searchParams.get('event');
  const symbolParam = searchParams.get('symbol');

  useEffect(() => {
    if (userWatchlists.length === 0) {
      fetchUserWatchlists();
    }
  }, [userWatchlists.length, fetchUserWatchlists]);

  useEffect(() => {
    if (symbolParam) {
      setSearchQuery(symbolParam);
    }
  }, [symbolParam]);

  // Initial and window/filter change loader
  const loadFeed = useCallback(
    async (resetCursor = true) => {
      if (resetCursor) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const [feedData, summaryData] = await Promise.all([
          feedApiService.getFeed({
            cursor: resetCursor ? undefined : nextCursor || undefined,
            limit: 20,
            window: selectedWindow,
            watchlistId: selectedWatchlistId,
            symbol: undefined,
            priority: selectedPriority,
            type: selectedType,
            unreadOnly,
            savedOnly,
            q: searchQuery || undefined,
          }),
          resetCursor ? feedApiService.getSummary() : Promise.resolve(null),
        ]);

        if (feedData) {
          if (resetCursor) {
            setItems(feedData.items);
          } else {
            setItems((prev) => [...prev, ...feedData.items]);
          }
          setNextCursor(feedData.nextCursor);
          setHasMore(feedData.hasMore);
          setTotalCount(feedData.total);
          setNewUpdatesAvailable(0);
        }

        if (summaryData) {
          setSummary(summaryData);
        }
      } catch (err: any) {
        console.error('Error fetching attention feed:', err);
        setError(err.message || 'Failed to connect to market signal engine.');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        setIsRefreshing(false);
      }
    },
    [
      selectedWindow,
      selectedWatchlistId,
      selectedPriority,
      selectedType,
      unreadOnly,
      savedOnly,
      searchQuery,
      nextCursor,
    ]
  );

  // Trigger load whenever primary filters change
  useEffect(() => {
    loadFeed(true);
  }, [
    selectedWindow,
    selectedWatchlistId,
    selectedPriority,
    selectedType,
    unreadOnly,
    savedOnly,
    searchQuery,
  ]);

  // Open drawer if ?event=<id> is in URL
  useEffect(() => {
    if (eventParam && items.length > 0) {
      const found = items.find((i) => i.id === eventParam);
      if (found) {
        setSelectedItem(found);
        setSelectedIndex(items.indexOf(found));
      } else {
        // Fetch specific event details lazily if not in current page list
        feedApiService.getItemDetails(eventParam).then((res) => {
          if (res?.item) {
            setSelectedItem(res.item);
          }
        });
      }
    }
  }, [eventParam, items]);

  // Part D: 60s summary polling for real-time updates
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const latestSummary = await feedApiService.getSummary();
        if (latestSummary && summary) {
          if (latestSummary.unreadClusters > summary.unreadClusters) {
            const diff = latestSummary.unreadClusters - summary.unreadClusters;
            setNewUpdatesAvailable(diff);
          }
          setSummary(latestSummary);
        }
      } catch {
        // Silent poll error
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [summary]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If active element is input, only handle Escape
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.min(items.length - 1, prev + 1);
          return next;
        });
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => {
          const next = Math.max(0, prev - 1);
          return next;
        });
      } else if ((e.key === 'Enter' || e.key === ' ') && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(items[selectedIndex]);
      } else if (e.key === 'r' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleToggleRead(items[selectedIndex]);
      } else if (e.key === 's' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleToggleSave(items[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex]);

  // Item Actions
  const handleSelectItem = (item: FeedItem) => {
    setSelectedItem(item);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('event', item.id);
    setSearchParams(newParams, { replace: true });
  };

  const handleCloseDrawer = () => {
    setSelectedItem(null);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('event');
    setSearchParams(newParams, { replace: true });
  };

  const handleToggleRead = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Optimistic toggle
    const newIsUnread = !item.isUnread;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isUnread: newIsUnread } : i))
    );
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => (prev ? { ...prev, isUnread: newIsUnread } : null));
    }

    if (summary) {
      setSummary({
        ...summary,
        unreadClusters: Math.max(0, summary.unreadClusters + (newIsUnread ? 1 : -1)),
      });
    }

    if (!newIsUnread) {
      await feedApiService.markItemRead(item.id);
    }
  };

  const handleToggleSave = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const newIsSaved = !item.isSaved;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isSaved: newIsSaved } : i))
    );
    if (selectedItem?.id === item.id) {
      setSelectedItem((prev) => (prev ? { ...prev, isSaved: newIsSaved } : null));
    }

    await feedApiService.toggleSave(item.id);
  };

  const handleMarkCaughtUp = async () => {
    setIsMarkingCaughtUp(true);
    try {
      const res = await feedApiService.markCaughtUp();
      if (res?.success) {
        setItems((prev) => prev.map((i) => ({ ...i, isUnread: false })));
        if (summary) {
          setSummary({
            ...summary,
            unreadClusters: 0,
            headline: `You are all caught up · 0 unread updates across monitored stocks`,
          });
        }
      }
    } catch (err) {
      console.error('Failed to mark caught up:', err);
    } finally {
      setIsMarkingCaughtUp(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeed(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedWatchlistId('all');
    setSelectedPriority('ALL');
    setSelectedType('ALL');
    setUnreadOnly(false);
    setSavedOnly(false);
    if (symbolParam) {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('symbol');
      setSearchParams(newParams, { replace: true });
    }
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedWatchlistId !== 'all' ||
    selectedPriority !== 'ALL' ||
    selectedType !== 'ALL' ||
    unreadOnly ||
    savedOnly;

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Real-time New Updates Floating Pill (Part D) */}
        {newUpdatesAvailable > 0 && (
          <div className="sticky top-20 z-30 flex justify-center animate-fade-in">
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-500/30 border border-indigo-400/30 transition-transform transform hover:scale-105"
            >
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>
                {newUpdatesAvailable} new update{newUpdatesAvailable > 1 ? 's' : ''} available — Click to refresh
              </span>
            </button>
          </div>
        )}

        {/* 1. Header Bar */}
        <FeedHeaderBar
          summary={summary}
          selectedWindow={selectedWindow}
          onSelectWindow={setSelectedWindow}
          onMarkCaughtUp={handleMarkCaughtUp}
          isMarkingCaughtUp={isMarkingCaughtUp}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* 2. Controls & Search Bar */}
        <FeedControlsBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          watchlists={userWatchlists}
          selectedWatchlistId={selectedWatchlistId}
          onSelectWatchlist={setSelectedWatchlistId}
          selectedPriority={selectedPriority}
          onSelectPriority={setSelectedPriority}
          selectedType={selectedType}
          onSelectType={setSelectedType}
          unreadOnly={unreadOnly}
          onToggleUnreadOnly={() => setUnreadOnly((prev) => !prev)}
          savedOnly={savedOnly}
          onToggleSavedOnly={() => setSavedOnly((prev) => !prev)}
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
          totalFilteredCount={totalCount}
          totalUnfilteredCount={summary?.totalInWindow}
        />

        {/* 3. Feed List Stream */}
        <div className="space-y-3">
          {isLoading && items.length === 0 ? (
            <FeedSkeleton />
          ) : error ? (
            <ErrorState
              title="Unable to load attention feed"
              message={error}
              onRetry={() => loadFeed(true)}
              isRetrying={isLoading}
            />
          ) : items.length > 0 ? (
            <>
              {items.map((item, idx) => (
                <FeedListCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIndex === idx || selectedItem?.id === item.id}
                  onSelect={handleSelectItem}
                  onToggleRead={handleToggleRead}
                  onToggleSave={handleToggleSave}
                />
              ))}

              {/* Cursor-based "Load more" button */}
              {hasMore && (
                <div className="pt-4 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => loadFeed(false)}
                    disabled={isLoadingMore}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-surface border border-border hover:border-slate-600 text-xs font-semibold text-slate-200 hover:text-white transition-all shadow-sm disabled:opacity-50"
                  >
                    <ChevronDown className={cn('w-4 h-4', isLoadingMore && 'animate-spin')} />
                    <span>{isLoadingMore ? 'Loading more...' : 'Load more updates'}</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-border text-center space-y-4">
              {isFiltered ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No signals match your filters
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Try adjusting your search terms, changing priority tiers, or clearing active filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-md shadow-indigo-500/20"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    You're completely caught up!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    No unhandled market anomalies require attention for your monitored stocks in this time window.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Progressive Disclosure Right-Side Drawer */}
      <FeedDetailsDrawer
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        onClose={handleCloseDrawer}
        onToggleRead={handleToggleRead}
        onToggleSave={handleToggleSave}
      />
    </PageContainer>
  );
};

export default AttentionFeedPage;
