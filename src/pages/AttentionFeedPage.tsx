import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FeedListCard,
  FeedDetailsDrawer,
  FeedHeaderBar,
  FeedControlsBar,
} from '../components/feed';
import { feedApiService } from '../services/feedApiService';
import { feedStreamClient } from '../services/feedStreamClient';
import { useMarketStore } from '../store/useMarketStore';
import { useToastStore } from '../store/useToastStore';
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
  Lightbulb,
  X,
  Inbox,
  PlusCircle,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const AttentionFeedPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userWatchlists, fetchUserWatchlists } = useMarketStore();
  const { addToast } = useToastStore();

  // Read URL params (event deep link, symbol filter, or window override)
  const eventParam = searchParams.get('event');
  const symbolParam = searchParams.get('symbol');
  const windowParam = searchParams.get('window');

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

  // State: Filter controls (Defaults to sinceLastVisit when navigating to feed)
  const [selectedWindow, setSelectedWindow] = useState<FeedTimeWindow>(() => {
    if (windowParam && ['toReview', '24h', '7d', '30d', 'sinceLastVisit'].includes(windowParam)) {
      return windowParam as FeedTimeWindow;
    }
    return 'sinceLastVisit';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWatchlistId, setSelectedWatchlistId] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // State: Collapsible "Other updates" section
  const [isOtherSectionOpen, setIsOtherSectionOpen] = useState(false);

  // State: Dismissible Tip Banner
  const [isTipDismissed, setIsTipDismissed] = useState<boolean>(() => {
    return localStorage.getItem('smw_feed_tip_dismissed') === 'true';
  });

  // State: Details Drawer & Selection
  const [selectedItem, setSelectedItem] = useState<FeedItem | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // State: Screen reader announcement
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (windowParam && ['toReview', '24h', '7d', '30d', 'sinceLastVisit'].includes(windowParam)) {
      setSelectedWindow(windowParam as FeedTimeWindow);
    } else if (!windowParam) {
      // Always show 'sinceLastVisit' when returning from other pages without a window query param
      setSelectedWindow('sinceLastVisit');
    }
  }, [windowParam]);

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

  // Handle window change
  const handleSelectWindow = (w: FeedTimeWindow) => {
    setSelectedWindow(w);
  };

  const handleDismissTip = () => {
    setIsTipDismissed(true);
    localStorage.setItem('smw_feed_tip_dismissed', 'true');
  };

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
            q: searchQuery || undefined,
          }),
          resetCursor ? feedApiService.getSummary(selectedWindow) : Promise.resolve(null),
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
        feedApiService.getItemDetails(eventParam).then((res) => {
          if (res?.item) {
            setSelectedItem(res.item);
          }
        });
      }
    }
  }, [eventParam, items]);

  // 3-second page visibility timer for recording feed view (Stage B1)
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (document.visibilityState === 'visible') {
        feedApiService.recordFeedViewed().catch((err) => {
          console.debug('Failed to record feed viewed:', err);
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Real-time 45s summary polling (paused when document.hidden)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (document.hidden) return;

      try {
        const latestSummary = await feedApiService.getSummary(selectedWindow);
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
    }, 45000);

    // Real-time SSE Stream subscription for cross-device sync
    const unsubscribe = feedStreamClient.subscribe((event) => {
      if (
        event.action === 'mark_read' ||
        event.action === 'mark_item_read' ||
        event.action === 'save_item' ||
        event.action === 'unsave_item' ||
        event.action === 'delete_item' ||
        event.action === 'restore_item' ||
        event.action === 'undo' ||
        event.action === 'caught_up'
      ) {
        loadFeed(true);
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [summary, selectedWindow, loadFeed]);

  // Separate High/Medium items vs FYI/Low items for collapsed section
  const { primaryItems, fyiItems } = useMemo(() => {
    const primary: FeedItem[] = [];
    const fyi: FeedItem[] = [];
    for (const it of items) {
      if (it.priority === 'LOW' || it.priorityLabel === 'FYI') {
        fyi.push(it);
      } else {
        primary.push(it);
      }
    }
    return { primaryItems: primary, fyiItems: fyi };
  }, [items]);

  // Actions
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

  // Mark Read with Optimistic UI and Undo Toast
  const handleToggleRead = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetId = item.id;

    // Optimistically remove from unhandled feed if marking read
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    if (selectedItem?.id === targetId) {
      setSelectedItem(null);
      handleCloseDrawer();
    }

    if (summary) {
      setSummary({
        ...summary,
        unreadClusters: Math.max(0, summary.unreadClusters - 1),
        totalInWindow: Math.max(0, summary.totalInWindow - 1),
      });
    }

    setAriaAnnouncement(`${item.stockSymbol} update marked as read`);

    try {
      const res = await feedApiService.markItemRead(targetId);
      const undoToken = res?.undoToken;

      addToast(
        `Moved ${item.stockSymbol} to Market Memory · Read`,
        'success',
        15000,
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadFeed(true);
                addToast(`Restored ${item.stockSymbol} update to Attention Feed`, 'info', 3000);
              },
            }
          : undefined,
        {
          label: 'View in Memory',
          onClick: () => navigate('/memory'),
        }
      );
    } catch (err) {
      console.error('Failed to mark read:', err);
      loadFeed(true);
    }
  };

  // Save for Later with Optimistic UI and Undo Toast
  const handleToggleSave = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetId = item.id;

    // Optimistically remove from unhandled feed when saved
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    if (selectedItem?.id === targetId) {
      setSelectedItem(null);
      handleCloseDrawer();
    }

    if (summary) {
      setSummary({
        ...summary,
        unreadClusters: Math.max(0, summary.unreadClusters - 1),
        totalInWindow: Math.max(0, summary.totalInWindow - 1),
      });
    }

    setAriaAnnouncement(`${item.stockSymbol} saved to Market Memory`);

    try {
      const res = await feedApiService.saveItem(targetId);
      const undoToken = res?.undoToken;

      addToast(
        `Saved ${item.stockSymbol} to Market Memory`,
        'success',
        15000,
        {
          label: 'View in Memory',
          onClick: () => navigate('/memory'),
        },
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadFeed(true);
                addToast(`Restored ${item.stockSymbol} update to Attention Feed`, 'info', 3000);
              },
            }
          : undefined
      );
    } catch (err) {
      console.error('Failed to save item:', err);
      loadFeed(true);
    }
  };

  // Delete item with Optimistic UI and Undo Toast (Stage C2)
  const handleDeleteItem = async (item: FeedItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const targetId = item.id;

    // Optimistically remove from feed
    setItems((prev) => prev.filter((i) => i.id !== targetId));
    if (selectedItem?.id === targetId) {
      setSelectedItem(null);
      handleCloseDrawer();
    }

    if (summary) {
      setSummary({
        ...summary,
        unreadClusters: Math.max(0, summary.unreadClusters - 1),
        totalInWindow: Math.max(0, summary.totalInWindow - 1),
      });
    }

    setAriaAnnouncement(`${item.stockSymbol} update deleted`);

    try {
      const res = await feedApiService.deleteItem(targetId);
      const undoToken = res?.undoToken;

      addToast(
        `Deleted ${item.stockSymbol} update`,
        'success',
        15000,
        {
          label: 'View in Memory',
          onClick: () => navigate('/memory?tab=deleted'),
        },
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadFeed(true);
                addToast(`Restored ${item.stockSymbol} update to Attention Feed`, 'info', 3000);
              },
            }
          : undefined
      );
    } catch (err) {
      console.error('Failed to delete item:', err);
      loadFeed(true);
    }
  };


  const handleMarkCaughtUp = async () => {
    setIsMarkingCaughtUp(true);
    try {
      const res = await feedApiService.markCaughtUp();
      const count = res?.count || 0;
      const undoToken = res?.undoToken;

      setItems([]);
      if (summary) {
        setSummary({
          ...summary,
          unreadClusters: 0,
          totalInWindow: 0,
          headline: `You are all caught up · 0 unread updates across monitored stocks`,
        });
      }

      setAriaAnnouncement('You are all caught up');

      addToast(
        `You're all caught up (${count} updates marked read)`,
        'success',
        15000,
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadFeed(true);
                addToast('Restored updates to Attention Feed', 'info', 3000);
              },
            }
          : undefined,
        {
          label: 'View in Memory',
          onClick: () => navigate('/memory'),
        }
      );
    } catch (err) {
      console.error('Failed to mark caught up:', err);
    } finally {
      setIsMarkingCaughtUp(false);
    }
  };

  // Keyboard navigation (j/k, Enter/Space, r to toggle read, s to toggle save, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

      if (e.key === 'Escape' && selectedItem) {
        e.preventDefault();
        handleCloseDrawer();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(items.length - 1, prev + 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(0, prev - 1));
      } else if ((e.key === 'Enter' || e.key === ' ') && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(items[selectedIndex]);
      } else if (e.key === 'r' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleToggleRead(items[selectedIndex]);
      } else if (e.key === 's' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleToggleSave(items[selectedIndex]);
      } else if (e.key === 'd' && selectedIndex >= 0 && items[selectedIndex]) {
        e.preventDefault();
        handleDeleteItem(items[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex, selectedItem]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFeed(true);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedWatchlistId('all');
    setSelectedPriority('ALL');
    setSelectedType('ALL');
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
    selectedType !== 'ALL';

  const distinctStockCount = new Set(items.map((i) => i.stockSymbol)).size;
  const serverNowOffsetMs = summary?.serverNow
    ? new Date(summary.serverNow).getTime() - Date.now()
    : 0;

  return (
    <PageContainer>
      {/* Screen reader live announcement */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaAnnouncement}
      </div>

      <div className="w-full space-y-4 sm:space-y-5">
        {/* Real-time New Updates Floating Pill */}
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

        {/* 1. Feed Header & Session Strip */}
        <FeedHeaderBar
          summary={summary}
          selectedWindow={selectedWindow}
          onSelectWindow={handleSelectWindow}
          onMarkCaughtUp={handleMarkCaughtUp}
          isMarkingCaughtUp={isMarkingCaughtUp}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          stockCount={distinctStockCount}
          serverNowOffsetMs={serverNowOffsetMs}
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
          onResetFilters={handleResetFilters}
          isFiltered={isFiltered}
          totalFilteredCount={totalCount}
          totalUnfilteredCount={summary?.totalInWindow}
        />

        {/* 3. Dismissible Tip Banner */}
        {!isTipDismissed && (
          <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300">
            <div className="flex items-center gap-2 min-w-0">
              <Lightbulb className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="truncate">
                <span className="font-semibold">Tip:</span> Use <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px] text-slate-200">j</kbd> / <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px] text-slate-200">k</kbd> to navigate, <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px] text-slate-200">r</kbd> to mark read, <kbd className="px-1.5 py-0.5 rounded bg-surface border border-border font-mono text-[10px] text-slate-200">s</kbd> to save.
              </span>
            </div>
            <button
              type="button"
              onClick={handleDismissTip}
              aria-label="Dismiss tip"
              title="Dismiss tip"
              className="p-1 text-slate-400 hover:text-slate-200 rounded-md hover:bg-indigo-500/20 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 4. Feed List Stream */}
        <div className="space-y-3.5 pt-1">
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
              {/* Primary Feed Items (Urgent, Important, Worth a look) */}
              {primaryItems.map((item, idx) => (
                <FeedListCard
                  key={item.id}
                  item={item}
                  isSelected={selectedIndex === idx || selectedItem?.id === item.id}
                  onSelect={handleSelectItem}
                  onToggleRead={handleToggleRead}
                  onToggleSave={handleToggleSave}
                  onDelete={handleDeleteItem}
                />
              ))}

              {/* Collapsible Show All / Lower Priority Section */}
              {fyiItems.length > 0 && (
                <div className="pt-2">
                  {!isOtherSectionOpen ? (
                    <button
                      type="button"
                      onClick={() => setIsOtherSectionOpen(true)}
                      className="w-full p-3.5 rounded-2xl bg-surface/80 hover:bg-surface-hover border border-border/80 hover:border-slate-600 flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-all shadow-sm group cursor-pointer"
                    >
                      <ChevronDown className="w-4 h-4 text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
                      <span>Show all ({fyiItems.length} more update{fyiItems.length > 1 ? 's' : ''})</span>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1 pt-1 pb-1">
                        <span className="text-xs font-semibold text-slate-400">
                          Showing all {items.length} updates
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsOtherSectionOpen(false)}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline cursor-pointer"
                        >
                          Show fewer
                        </button>
                      </div>

                      {fyiItems.map((item, idx) => (
                        <FeedListCard
                          key={item.id}
                          item={item}
                          isSelected={selectedIndex === primaryItems.length + idx || selectedItem?.id === item.id}
                          onSelect={handleSelectItem}
                          onToggleRead={handleToggleRead}
                          onToggleSave={handleToggleSave}
                          onDelete={handleDeleteItem}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

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
            /* Distinct Empty States */
            <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-border text-center space-y-4">
              {userWatchlists.length === 0 ? (
                /* No stocks tracked state */
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <PlusCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No stocks tracked yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Add stocks to your watchlists to start monitoring real-time price anomalies, filings, and earnings.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/watchlist')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-md shadow-indigo-500/20"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Go to Watchlist</span>
                  </button>
                </div>
              ) : isFiltered ? (
                /* Filters match nothing state */
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
                /* All Caught Up state */
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    You're completely caught up!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {summary?.marketsClosed
                      ? 'Markets were closed during this period. No new anomalies detected for your watchlists.'
                      : 'No unhandled market anomalies require attention for your monitored stocks in this time window.'}
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/memory')}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface-subtle hover:bg-surface-hover border border-border text-xs font-semibold text-slate-200 transition-colors"
                    >
                      <Inbox className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Open Market Memory</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 5. Progressive Disclosure Right-Side Drawer */}
      <FeedDetailsDrawer
        isOpen={Boolean(selectedItem)}
        item={selectedItem}
        onClose={handleCloseDrawer}
        onToggleRead={handleToggleRead}
        onToggleSave={handleToggleSave}
        onDelete={handleDeleteItem}
        onViewStock={(sym) => navigate(`/watchlist?symbol=${sym}`)}
      />

    </PageContainer>
  );
};

export default AttentionFeedPage;
