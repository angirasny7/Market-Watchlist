import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../store/useMarketStore';
import { useToastStore } from '../store/useToastStore';
import { PageContainer, SearchInput, FeedSkeleton } from '../components/common';
import { MemoryEventCard } from '../components/memory/MemoryEventCard';
import { FeedDetailsDrawer } from '../components/feed/FeedDetailsDrawer';
import { feedApiService } from '../services/feedApiService';
import { feedStreamClient } from '../services/feedStreamClient';
import { memoryService } from '../services/memoryService';
import { stockService, watchlistService } from '../services';
import { ArchivedMarketEvent, DateRangePreset, MemoryTab, MemorySortOption } from '../types/memory';
import { FeedItem } from '../types/feed';
import {
  CheckCircle2,
  Bookmark,
  Inbox,
  Search,
  RotateCcw,
  Archive,
  Trash2,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';

export const MarketMemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { userWatchlists, fetchUserWatchlists } = useMarketStore();
  const { addToast } = useToastStore();

  // Tab State: 'saved' | 'read' | 'deleted'
  const [activeTab, setActiveTab] = useState<MemoryTab>('SAVED');

  // Counts State
  const [memoryCounts, setMemoryCounts] = useState<{
    savedCount: number;
    readCount: number;
    deletedCount: number;
    totalCount: number;
  }>({
    savedCount: 0,
    readCount: 0,
    deletedCount: 0,
    totalCount: 0,
  });

  // Events & Loading State
  const [events, setEvents] = useState<ArchivedMarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStock, setSelectedStock] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedEventType, setSelectedEventType] = useState('ALL');
  const [dateRange, setDateRange] = useState<DateRangePreset>('ALL');
  const [hasNoteOnly, setHasNoteOnly] = useState(false);
  const [sortBy, setSortBy] = useState<MemorySortOption>('recent_action');

  // Selected Item for Details Drawer
  const [selectedFeedItem, setSelectedFeedItem] = useState<FeedItem | null>(null);

  // 200ms debounce for search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Dynamic Stock Universe for Filters
  const [availableStocks, setAvailableStocks] = useState<Array<{ symbol: string; name?: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    const loadStockUniverse = async () => {
      try {
        const [allStocksData, overviewData] = await Promise.all([
          stockService.getAllStocks(),
          watchlistService.fetchOverview('all'),
        ]);

        if (!isMounted) return;

        const stockMap = new Map<string, string>();
        if (Array.isArray(allStocksData)) {
          allStocksData.forEach((s) => {
            if (s.symbol) stockMap.set(s.symbol.toUpperCase(), s.name || (s as any).companyName || s.symbol);
          });
        }
        if (overviewData?.stocks) {
          overviewData.stocks.forEach((s) => {
            if (s.symbol) stockMap.set(s.symbol.toUpperCase(), s.companyName || s.symbol);
          });
        }

        const list = Array.from(stockMap.entries()).map(([symbol, name]) => ({
          symbol,
          name,
        }));
        list.sort((a, b) => a.symbol.localeCompare(b.symbol));
        setAvailableStocks(list);
      } catch (err) {
        console.error('Failed to load stock list for memory filter:', err);
      }
    };

    loadStockUniverse();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (userWatchlists.length === 0) {
      fetchUserWatchlists();
    }
  }, [userWatchlists.length, fetchUserWatchlists]);

  // Fetch memory counts
  const loadCounts = useCallback(async () => {
    try {
      const data = await memoryService.fetchMemoryCounts();
      if (data) {
        setMemoryCounts({
          savedCount: data.savedCount || 0,
          readCount: data.readCount || 0,
          deletedCount: data.deletedCount || 0,
          totalCount: data.totalCount || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load memory counts:', err);
    }
  }, []);

  // Load events for active tab
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const results = await memoryService.getMemory({
        tab: activeTab,
        search: debouncedSearch.trim() !== '' ? debouncedSearch.trim() : undefined,
        stock: selectedStock !== 'ALL' ? selectedStock : undefined,
        priority: selectedPriority !== 'ALL' ? selectedPriority : undefined,
        eventType: selectedEventType !== 'ALL' ? selectedEventType : undefined,
        hasNote: hasNoteOnly ? true : undefined,
        sortBy,
        dateRange,
        limit: 100,
      });

      setEvents(results.items);
      if (results.counts) {
        setMemoryCounts(results.counts);
      }
    } catch (err) {
      console.error('Failed to fetch memory events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, debouncedSearch, selectedStock, selectedPriority, selectedEventType, hasNoteOnly, sortBy, dateRange]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Real-time SSE Stream listener for memory changes
  useEffect(() => {
    const unsubscribe = feedStreamClient.subscribe(() => {
      loadCounts();
      loadEvents();
    });
    return () => unsubscribe();
  }, [loadCounts, loadEvents]);

  // Action: Unsave item
  const handleUnsave = async (item: ArchivedMarketEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = item.id;

    setEvents((prev) => prev.filter((it) => it.id !== targetId));
    setMemoryCounts((prev) => ({ ...prev, savedCount: Math.max(0, prev.savedCount - 1) }));

    try {
      const res = await feedApiService.unsaveItem(targetId);
      const undoToken = res?.undoToken;

      addToast(
        `Removed ${item.stockSymbol} from Saved`,
        'success',
        15000,
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadEvents();
                loadCounts();
                addToast(`Restored ${item.stockSymbol} to Saved`, 'info', 3000);
              },
            }
          : undefined,
        {
          label: 'Open Attention Feed',
          onClick: () => navigate('/feed'),
        }
      );
    } catch (err) {
      console.error('Failed to unsave item:', err);
      loadEvents();
    }
  };

  // Action: Delete item (Saved/Read: moves to Deleted tab for 30 days; Deleted: permanent deletion)
  const handleDelete = async (item: ArchivedMarketEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = item.id;

    // Optimistically update list and counts
    setEvents((prev) => prev.filter((it) => it.id !== targetId));

    if (activeTab === 'DELETED') {
      setMemoryCounts((prev) => ({
        ...prev,
        deletedCount: Math.max(0, prev.deletedCount - 1),
      }));

      try {
        await memoryService.permanentlyDeleteItem(targetId);
        addToast(`Permanently deleted ${item.stockSymbol} event`, 'info', 4000);
      } catch (err) {
        console.error('Failed to permanently delete item:', err);
        loadEvents();
        loadCounts();
      }
      return;
    }

    if (activeTab === 'SAVED') {
      setMemoryCounts((prev) => ({
        ...prev,
        savedCount: Math.max(0, prev.savedCount - 1),
        deletedCount: prev.deletedCount + 1,
      }));
    } else if (activeTab === 'READ') {
      setMemoryCounts((prev) => ({
        ...prev,
        readCount: Math.max(0, prev.readCount - 1),
        deletedCount: prev.deletedCount + 1,
      }));
    }

    try {
      const res = await feedApiService.deleteItem(targetId);
      const undoToken = res?.undoToken;

      addToast(
        `Moved ${item.stockSymbol} to Deleted (stored for 30 days)`,
        'success',
        15000,
        undoToken
          ? {
              label: 'Undo',
              onClick: async () => {
                await feedApiService.undoAction(undoToken);
                loadEvents();
                loadCounts();
                addToast(`Restored ${item.stockSymbol}`, 'info', 3000);
              },
            }
          : undefined
      );
    } catch (err) {
      console.error('Failed to delete item from memory:', err);
      loadEvents();
      loadCounts();
    }
  };

  // Action: Update private note
  const handleUpdateNote = async (item: ArchivedMarketEvent, note: string | null) => {
    try {
      await memoryService.updateNote(item.id, note);
      setEvents((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, note } : it))
      );
      addToast(note ? 'Note saved' : 'Note removed', 'success', 3000);
    } catch (err) {
      console.error('Failed to update note:', err);
      addToast('Failed to save note', 'error', 4000);
    }
  };

  // Convert ArchivedMarketEvent to FeedItem for Details Drawer
  const handleSelectMemoryItem = (item: ArchivedMarketEvent) => {
    const feedItem: FeedItem = {
      id: item.id,
      stockSymbol: item.stockSymbol,
      companyName: item.companyName || item.stock?.companyName || item.stockSymbol,
      exchange: item.exchange || item.stock?.exchange || 'NSE',
      currency: item.currency || item.stock?.currency || '₹',
      date: item.timestamp,
      occurredAt: item.occurredAt || item.timestamp,
      detectedAt: item.detectedAt || item.timestamp,
      priority: (item.priority as any) || 'LOW',
      priorityLabel:
        item.priority === 'CRITICAL'
          ? 'Urgent'
          : item.priority === 'HIGH'
          ? 'Important'
          : item.priority === 'MEDIUM'
          ? 'Worth a look'
          : 'FYI',
      isUnread: false,
      isSaved: activeTab === 'SAVED',
      isNew: false,
      isAlertTriggered: false,
      isDemo: false,
      changePercent: item.changePercent || 0,
      eventPrice: item.eventPrice ?? item.price ?? null,
      currentPrice: item.currentPrice ?? (item.stock?.currentPrice ? Number(item.stock.currentPrice) : item.price ?? null),
      dayChangePercent: item.dayChangePercent ?? (item.stock?.changePercent ? Number(item.stock.changePercent) : null),
      signals: item.signals && item.signals.length > 0 ? item.signals : [{ type: (item.eventType as string) || 'PRICE_SURGE', label: ((item.eventType as string) || '').replace(/_/g, ' ') }],
      extraSignalsCount: 0,
      headline: item.headline || item.whatHappened,
      memberEventIds: [item.id],
    };

    setSelectedFeedItem(feedItem);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedStock('ALL');
    setSelectedPriority('ALL');
    setSelectedEventType('ALL');
    setDateRange('ALL');
    setHasNoteOnly(false);
    setSortBy('recent_action');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedStock !== 'ALL' ||
    selectedPriority !== 'ALL' ||
    selectedEventType !== 'ALL' ||
    dateRange !== 'ALL' ||
    hasNoteOnly;

  // Extract unique stock symbols from entire stock universe + watchlists + loaded events
  const stockOptions = useMemo(() => {
    const map = new Map<string, string>();
    availableStocks.forEach((s) => map.set(s.symbol, s.name || s.symbol));
    events.forEach((e) => {
      if (e.stockSymbol && !map.has(e.stockSymbol.toUpperCase())) {
        map.set(e.stockSymbol.toUpperCase(), e.companyName || e.stockSymbol);
      }
    });
    return Array.from(map.entries())
      .map(([symbol, name]) => ({ symbol, name }))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [availableStocks, events]);

  return (
    <PageContainer>
      <div className="w-full space-y-6">
        {/* 1. Header & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2.5">
              <Inbox className="w-6 h-6 text-emerald-400" />
              <span>Market Memory</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Personal library of your saved events, read history, and private notes.
            </p>
          </div>

          {/* View switcher tabs with live single-source-of-truth counts */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border w-fit shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab('SAVED')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'SAVED'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved ({memoryCounts.savedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('READ')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'READ'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Read ({memoryCounts.readCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DELETED')}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
                activeTab === 'DELETED'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Deleted ({memoryCounts.deletedCount})</span>
            </button>
          </div>
        </div>

        {/* 2. Controls, Search, Filter & Sort */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={`Search ${activeTab.toLowerCase()} by ticker, headline, note...`}
              mobilePlaceholder="Search…"
              ariaLabel={`Search ${activeTab.toLowerCase()} items`}
              containerClassName="flex-1 min-w-[220px] w-full"
            />

            {/* Stock Selector */}
            <select
              value={selectedStock}
              onChange={(e) => setSelectedStock(e.target.value)}
              aria-label="Filter by stock symbol"
              className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer max-w-[200px]"
            >
              <option value="ALL">All Stocks</option>
              {stockOptions.map((stock) => (
                <option key={stock.symbol} value={stock.symbol}>
                  {stock.symbol} {stock.name && stock.name !== stock.symbol ? `· ${stock.name.slice(0, 16)}` : ''}
                </option>
              ))}
            </select>

            {/* Priority Selector */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              aria-label="Filter by priority"
              className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Urgent</option>
              <option value="HIGH">Important</option>
              <option value="MEDIUM">Worth a look</option>
              <option value="LOW">FYI</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as MemorySortOption)}
              aria-label="Sort memory items"
              className="h-10 px-3 rounded-lg bg-surface border border-border text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors shrink-0 cursor-pointer"
            >
              <option value="recent_action">Recent {activeTab === 'SAVED' ? 'Saved' : activeTab === 'DELETED' ? 'Deleted' : 'Read'}</option>
              <option value="event_date_desc">Event Date (Newest)</option>
              <option value="event_date_asc">Event Date (Oldest)</option>
              <option value="priority">Priority (Highest)</option>
              <option value="stock_name">Stock Name (A-Z)</option>
              {activeTab === 'SAVED' && (
                <option value="change_since_saved">Price Change Since Saved</option>
              )}
            </select>
          </div>

          {/* Sub-controls: Has Note toggle + Active filter chips */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {activeTab === 'SAVED' && (
                <button
                  type="button"
                  onClick={() => setHasNoteOnly(!hasNoteOnly)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-colors',
                    hasNoteOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-surface border-border text-slate-400 hover:text-slate-200'
                  )}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Has Note</span>
                </button>
              )}

              {isFiltered && (
                <>
                  <span className="text-slate-400 font-medium">Active filters:</span>
                  {selectedStock !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                      Stock: {selectedStock}
                    </span>
                  )}
                  {selectedPriority !== 'ALL' && (
                    <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                      Priority: {selectedPriority}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold text-xs ml-1"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Showing {events.length} of {activeTab === 'SAVED' ? memoryCounts.savedCount : activeTab === 'READ' ? memoryCounts.readCount : memoryCounts.deletedCount} {activeTab.toLowerCase()} items
            </div>
          </div>
        </div>

        {/* 3. Event Cards List */}
        <div className="space-y-3 pt-1">
          {isLoading ? (
            <FeedSkeleton />
          ) : events.length > 0 ? (
            events.map((item) => (
              <MemoryEventCard
                key={item.id}
                item={item}
                tab={activeTab === 'SAVED' ? 'saved' : activeTab === 'DELETED' ? 'deleted' : 'read'}
                onSelect={handleSelectMemoryItem}
                onUnsave={activeTab === 'SAVED' ? handleUnsave : undefined}
                onDelete={handleDelete}
                onUpdateNote={activeTab === 'SAVED' ? handleUpdateNote : undefined}
              />
            ))
          ) : (
            /* Designed Empty State */
            <div className="p-8 sm:p-12 rounded-2xl bg-surface border border-border text-center space-y-4">
              {isFiltered ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No {activeTab.toLowerCase()} events match your filters
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Try adjusting your search terms or resetting the active filters.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                </div>
              ) : activeTab === 'SAVED' ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No saved items yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    When you bookmark an update in your Attention Feed, it will be preserved permanently in this vault.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/feed')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-md shadow-indigo-600/20"
                  >
                    <span>Open Attention Feed</span>
                  </button>
                </div>
              ) : activeTab === 'DELETED' ? (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No deleted items
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Items you delete remain archived here for 30 days before being permanently removed.
                  </p>
                </div>
              ) : (
                <div className="max-w-md mx-auto space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                    <Archive className="w-6 h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100">
                    No read history yet
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Updates you mark as read or catch up on are stored here so you can always review what happened.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progressive Disclosure Details Drawer */}
      <FeedDetailsDrawer
        isOpen={Boolean(selectedFeedItem)}
        item={selectedFeedItem}
        onClose={() => setSelectedFeedItem(null)}
        onToggleRead={() => {}}
        onToggleSave={() => {}}
      />
    </PageContainer>
  );
};

export default MarketMemoryPage;

