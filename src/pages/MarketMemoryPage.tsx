import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MarketMemoryHeader,
  MemorySearchBar,
  MemoryTimeline,
  MoodFilterType,
  MemoryCategoryFilterType,
} from '../components/memory';
import { useMarketStore } from '../store/useMarketStore';
import { ArchivedMarketEvent, DateRangePreset, MemoryTypeFilter } from '../types/memory';
import { memoryService } from '../services/memoryService';
import { PageContainer } from '../components/common';
import { SearchX, RotateCcw, Database, ArrowRight, Loader2 } from 'lucide-react';

export const MarketMemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { watchlist, convertSavedToArchived } = useMarketStore();

  const [selectedMemoryType, setSelectedMemoryType] = useState<MemoryTypeFilter>('ALL');
  const [archivedEvents, setArchivedEvents] = useState<ArchivedMarketEvent[]>([]);
  const [memoryCounts, setMemoryCounts] = useState<{
    archivedCount: number;
    savedCount: number;
    totalCount: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategoryFilterType>('ALL');
  const [dateRange, setDateRange] = useState<DateRangePreset>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stockScope, setStockScope] = useState('ALL');

  const watchlistSymbols = useMemo(() => {
    return watchlist.map((w) => w.symbol);
  }, [watchlist]);

  // Load live counts from backend
  const loadCounts = useCallback(async () => {
    try {
      const counts = await memoryService.fetchMemoryCounts();
      if (counts) {
        setMemoryCounts(counts);
      }
    } catch (err) {
      console.error('Failed to load memory counts:', err);
    }
  }, []);

  // Fetch archived memory events from backend
  const loadArchivedEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const isWatchlistOnly = stockScope === 'WATCHLIST';
      const specificSymbol = stockScope !== 'ALL' && stockScope !== 'WATCHLIST' ? stockScope : undefined;

      const results = await memoryService.fetchArchivedEvents({
        memoryType: selectedMemoryType,
        dateRange,
        startDate: dateRange === 'CUSTOM' ? startDate : undefined,
        endDate: dateRange === 'CUSTOM' ? endDate : undefined,
        symbol: specificSymbol,
        watchlistOnly: isWatchlistOnly,
        eventType: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        marketMood: selectedMood !== 'ALL' ? selectedMood : undefined,
        search: searchQuery.trim() !== '' ? searchQuery.trim() : undefined,
      });

      setArchivedEvents(results);
    } catch (err) {
      console.error('Failed to load archived market memories:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMemoryType, dateRange, startDate, endDate, stockScope, selectedCategory, selectedMood, searchQuery]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadArchivedEvents();
  }, [loadArchivedEvents]);

  // Instant UI conversion: Saved -> Archived
  const handleMarkRead = useCallback((eventId: string) => {
    setArchivedEvents((prev) =>
      prev
        .map((e) => {
          if (e.id === eventId) {
            return {
              ...e,
              memoryType: 'ARCHIVED' as const,
              read: true,
              readAt: new Date().toISOString(),
            };
          }
          return e;
        })
        .filter((e) => selectedMemoryType !== 'SAVED' || e.memoryType === 'SAVED')
    );
    convertSavedToArchived(eventId);
    loadCounts();
  }, [selectedMemoryType, convertSavedToArchived, loadCounts]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMood('ALL');
    setSelectedCategory('ALL');
    setDateRange('ALL');
    setStartDate('');
    setEndDate('');
    setStockScope('ALL');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedMood !== 'ALL' ||
    selectedCategory !== 'ALL' ||
    dateRange !== 'ALL' ||
    stockScope !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  // Metrics computation
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(archivedEvents.map((e) => e.stockSymbol?.toUpperCase()).filter(Boolean));
    return symbols.size;
  }, [archivedEvents]);

  const latestMemoryTimestamp = useMemo(() => {
    if (archivedEvents.length === 0) return null;
    const sorted = [...archivedEvents].sort((a, b) => {
      const timeA = new Date(a.savedAt || a.readAt || a.timestamp).getTime();
      const timeB = new Date(b.savedAt || b.readAt || b.timestamp).getTime();
      return timeB - timeA;
    });
    return sorted[0]?.savedAt || sorted[0]?.readAt || sorted[0]?.timestamp || null;
  }, [archivedEvents]);

  const totalPreserved = memoryCounts?.totalCount ?? archivedEvents.length;
  const totalSaved = memoryCounts?.savedCount ?? archivedEvents.filter((e) => e.memoryType === 'SAVED').length;
  const totalArchived = memoryCounts?.archivedCount ?? archivedEvents.filter((e) => e.memoryType === 'ARCHIVED').length;

  return (
    <PageContainer>
      {/* 1. Market Memory Header & 2. Standardized KPI Grid */}
      <MarketMemoryHeader
        totalCount={totalPreserved}
        savedCount={totalSaved}
        archivedCount={totalArchived}
        symbolsCoveredCount={uniqueSymbols}
        lastAddedAt={latestMemoryTimestamp}
      />

      {/* 3. Standardized Controls: Memory Type Tabs & Multi-Factor Filter Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface/90 border border-border w-fit">
          {(['ALL', 'ARCHIVED', 'SAVED'] as const).map((type) => {
            const label = type === 'ALL' ? 'All Memories' : type === 'ARCHIVED' ? 'Archived Signals' : 'Saved For Later';
            const isActive = selectedMemoryType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedMemoryType(type)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                }`}
              >
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <MemorySearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMood={selectedMood}
        onMoodChange={setSelectedMood}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        stockScope={stockScope}
        onStockScopeChange={setStockScope}
        watchlistSymbols={watchlistSymbols}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />
      </div>

      {/* 4. Chronological Timeline, Loading State, or Empty States */}
      {isLoading ? (
        <div className="p-14 rounded-2xl bg-surface border border-border text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
          <p className="text-xs sm:text-sm text-slate-400 font-mono">
            Accessing personal Market Memory vault...
          </p>
        </div>
      ) : archivedEvents.length > 0 ? (
        <MemoryTimeline
          events={archivedEvents}
          onMarkRead={handleMarkRead}
        />
      ) : (
        /* Empty States */
        <div className="p-10 sm:p-14 rounded-2xl bg-surface border border-border text-center space-y-4 shadow-sm">
          {totalPreserved === 0 || (!isFiltered && archivedEvents.length === 0) ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No saved or archived market intelligence yet.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Review events from the Attention Feed and preserve important catalysts for future reference.
              </p>
              <button
                onClick={() => navigate('/feed')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
              >
                <span>Go To Attention Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No matching memories found.
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                No memories matched your active search query or selected date/mood filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default MarketMemoryPage;
