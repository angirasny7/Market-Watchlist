import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStore } from '../store/useMarketStore';
import { PageContainer, SearchInput } from '../components/common';
import { MarketMoodBadge } from '../components/memory/MarketMoodBadge';
import { MemoryTimeline } from '../components/memory/MemoryTimeline';
import { MemorySearchBar } from '../components/memory/MemorySearchBar';
import { ArchivedMarketEvent, DateRangePreset, MemoryTypeFilter } from '../types/memory';
import { MoodFilterType, MemoryCategoryFilterType } from '../components/memory';
import { memoryService } from '../services/memoryService';
import {
  Calendar,
  ChevronRight,
  CheckCircle2,
  Bookmark,
  Loader2,
} from 'lucide-react';

export const MarketMemoryPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    digests,
    openDigestDrawer,
    watchlist,
    convertSavedToArchived,
  } = useMarketStore();

  const [activeTab, setActiveTab] = useState<'digests' | 'saved'>('digests');
  const [digestSearchQuery, setDigestSearchQuery] = useState('');

  // Bookmarked / Saved Events State
  const [selectedMemoryType, setSelectedMemoryType] = useState<MemoryTypeFilter>('ALL');
  const [archivedEvents, setArchivedEvents] = useState<ArchivedMarketEvent[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [savedSearchQuery, setSavedSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategoryFilterType>('ALL');
  const [dateRange, setDateRange] = useState<DateRangePreset>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stockScope, setStockScope] = useState('ALL');

  const watchlistSymbols = useMemo(() => watchlist.map((w) => w.symbol), [watchlist]);

  // Fetch saved/archived events only if the saved tab is opened
  const loadArchivedEvents = useCallback(async () => {
    setIsLoadingSaved(true);
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
        search: savedSearchQuery.trim() !== '' ? savedSearchQuery.trim() : undefined,
      });
      setArchivedEvents(results);
    } catch (err) {
      console.error('Failed to load archived events:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [selectedMemoryType, dateRange, startDate, endDate, stockScope, selectedCategory, selectedMood, savedSearchQuery]);

  useEffect(() => {
    if (activeTab === 'saved') {
      loadArchivedEvents();
    }
  }, [activeTab, loadArchivedEvents]);

  // Filter Digests
  const filteredDigests = useMemo(() => {
    if (!digestSearchQuery.trim()) return digests;
    const q = digestSearchQuery.toLowerCase().trim();
    return digests.filter(
      (d) =>
        d.title.toLowerCase().includes(q) ||
        d.displayDate.toLowerCase().includes(q) ||
        d.executiveSummary.toLowerCase().includes(q)
    );
  }, [digests, digestSearchQuery]);

  const handleMarkRead = useCallback((eventId: string) => {
    setArchivedEvents((prev) =>
      prev
        .map((e) => (e.id === eventId ? { ...e, memoryType: 'ARCHIVED' as const, read: true } : e))
        .filter((e) => selectedMemoryType !== 'SAVED' || e.memoryType === 'SAVED')
    );
    convertSavedToArchived(eventId);
  }, [selectedMemoryType, convertSavedToArchived]);

  return (
    <PageContainer>
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Market Memory
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Historical digests and key developments while you were away.
          </p>
        </div>

        {/* View switcher tabs */}
        <div className="flex items-center p-1 rounded-xl bg-surface border border-border w-fit">
          <button
            onClick={() => setActiveTab('digests')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'digests'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Daily Digests ({digests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'saved'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Bookmarked Events</span>
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: DAILY DIGESTS (Core requirement) */}
      {activeTab === 'digests' && (
        <div className="space-y-4">
          {/* Search bar */}
          <SearchInput
            value={digestSearchQuery}
            onChange={setDigestSearchQuery}
            placeholder="Search digests by headline or date..."
            mobilePlaceholder="Search digests…"
            ariaLabel="Search digests"
          />

          {/* Simple Timeline List of Digests */}
          {filteredDigests.length > 0 ? (
            <div className="space-y-3">
              {filteredDigests.map((digest) => {
                const eventCount = digest.totalEventsCount || digest.eventIds?.length || 0;
                return (
                  <article
                    key={digest.id}
                    onClick={() => openDigestDrawer(digest.id)}
                    className="p-4 sm:p-5 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all cursor-pointer shadow-sm group space-y-2.5"
                  >
                    {/* Top Row: Date, Mood Badge, Acknowledged Status */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-300 font-mono">
                          {digest.displayDate}
                        </span>
                        {digest.marketMood && (
                          <MarketMoodBadge mood={digest.marketMood} size="sm" />
                        )}
                        {digest.isAcknowledged && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Reviewed</span>
                          </span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400 font-medium">
                        {eventCount} {eventCount === 1 ? 'event' : 'events'}
                      </span>
                    </div>

                    {/* Headline */}
                    <h3 className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                      {digest.title}
                    </h3>

                    {/* Executive Summary */}
                    {digest.executiveSummary && (
                      <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
                        {digest.executiveSummary}
                      </p>
                    )}

                    {/* Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                      <span className="text-slate-400">
                        Click to view full market dossier
                      </span>
                      <div className="inline-flex items-center gap-1 text-indigo-400 font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Open Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-3">
              <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm sm:text-base font-semibold text-slate-200">
                {digestSearchQuery ? 'No digests match your search' : 'No market digests generated yet'}
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                {digestSearchQuery
                  ? 'Try searching with a different term or clear the filter.'
                  : 'Digests are synthesized daily after market closes and when returning from an absence.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* 3. TAB CONTENT: BOOKMARKED EVENTS */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface border border-border w-fit text-xs">
            {(['ALL', 'SAVED', 'ARCHIVED'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedMemoryType(type)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedMemoryType === type
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'ALL' ? 'All' : type === 'SAVED' ? 'Saved' : 'Archived'}
              </button>
            ))}
          </div>

          <MemorySearchBar
            searchQuery={savedSearchQuery}
            onSearchChange={setSavedSearchQuery}
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
            onResetFilters={() => {
              setSavedSearchQuery('');
              setSelectedMood('ALL');
              setSelectedCategory('ALL');
              setDateRange('ALL');
              setStartDate('');
              setEndDate('');
              setStockScope('ALL');
            }}
            isFiltered={Boolean(savedSearchQuery || selectedMood !== 'ALL' || selectedCategory !== 'ALL')}
          />

          {isLoadingSaved ? (
            <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-2">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mx-auto" />
              <p className="text-xs text-slate-400">Loading saved events...</p>
            </div>
          ) : archivedEvents.length > 0 ? (
            <MemoryTimeline
              events={archivedEvents}
              onMarkRead={handleMarkRead}
            />
          ) : (
            <div className="p-10 rounded-2xl bg-surface border border-border text-center space-y-3">
              <Bookmark className="w-8 h-8 text-slate-500 mx-auto" />
              <h4 className="text-sm sm:text-base font-semibold text-slate-200">
                No bookmarked events found
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
                You can save interesting events from the Attention Feed to review them anytime here.
              </p>
              <button
                onClick={() => navigate('/feed')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Go to Attention Feed
              </button>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
};

export default MarketMemoryPage;
