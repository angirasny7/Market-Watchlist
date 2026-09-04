import React, { useState, useMemo } from 'react';
import {
  MarketMemoryHeader,
  MemorySearchBar,
  MemoryTimeline,
  DigestDetailDrawer,
  MoodFilterType,
  MemoryCategoryFilterType,
} from '../components/memory';
import { useMarketStore } from '../store/useMarketStore';
import { HistoricalDigest } from '../types/digest';
import { SearchX, RotateCcw, Database } from 'lucide-react';

export const MarketMemoryPage: React.FC = () => {
  const { digests, getDigestEvents, getInsightsByEvent } = useMarketStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodFilterType>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategoryFilterType>('ALL');
  const [activeDigest, setActiveDigest] = useState<HistoricalDigest | null>(null);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedMood('ALL');
    setSelectedCategory('ALL');
  };

  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedMood !== 'ALL' ||
    selectedCategory !== 'ALL';

  // Multi-dimensional search and filter engine across digests, events, and insights
  const filteredDigests = useMemo(() => {
    return digests.filter((digest) => {
      // 1. Market Mood Filter
      if (selectedMood !== 'ALL' && digest.marketMood !== selectedMood) {
        return false;
      }

      // Retrieve events for this digest to inspect category & text
      const digestEvents = getDigestEvents(digest.id);

      // 2. Category Filter (checks if any event in this digest matches)
      if (selectedCategory !== 'ALL') {
        const hasMatchingCategory = digestEvents.some(
          (e) => e.eventType === selectedCategory
        );
        if (!hasMatchingCategory) return false;
      }

      // 3. Search Query Filter across:
      // - Digest title & executive summary
      // - Event headlines, symbols, and company names
      // - Insight explanations & whyItMatters
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();

        const matchDigestTitle = digest.title.toLowerCase().includes(q);
        const matchDigestSummary = digest.executiveSummary.toLowerCase().includes(q);

        const matchEvents = digestEvents.some(
          (e) =>
            e.headline.toLowerCase().includes(q) ||
            e.stockSymbol.toLowerCase().includes(q) ||
            e.companyName.toLowerCase().includes(q) ||
            e.whatHappened.toLowerCase().includes(q)
        );

        const matchInsights = digestEvents.some((e) => {
          const insights = getInsightsByEvent(e.id);
          return insights.some(
            (i) =>
              i.explanation.toLowerCase().includes(q) ||
              i.whyItMatters.toLowerCase().includes(q) ||
              i.sourceName.toLowerCase().includes(q)
          );
        });

        if (!matchDigestTitle && !matchDigestSummary && !matchEvents && !matchInsights) {
          return false;
        }
      }

      return true;
    });
  }, [digests, selectedMood, selectedCategory, searchQuery, getDigestEvents, getInsightsByEvent]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* 1. Market Memory Header */}
      <MarketMemoryHeader />

      {/* 2. Search & Multi-Factor Filter Bar */}
      <MemorySearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMood={selectedMood}
        onMoodChange={setSelectedMood}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        onResetFilters={handleResetFilters}
        isFiltered={isFiltered}
      />

      {/* 3. Chronological Timeline or Empty States */}
      {filteredDigests.length > 0 ? (
        <MemoryTimeline
          digests={filteredDigests}
          onInspect={setActiveDigest}
        />
      ) : (
        /* Empty State */
        <div className="p-10 sm:p-14 rounded-2xl bg-surface border border-border text-center space-y-4 shadow-sm">
          {digests.length === 0 ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No Historical Digests Yet
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Market Memory automatically records executive dossiers at the conclusion of each market session and absence period.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-subtle text-slate-400 border border-border flex items-center justify-center mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                No Historical Dossiers Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                No historical records matched your search query or active mood filters.
              </p>
              <button
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Memory Filters</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4. Deep-Dive Slide-Over Dossier Drawer */}
      <DigestDetailDrawer
        digest={activeDigest}
        onClose={() => setActiveDigest(null)}
      />
    </div>
  );
};

export default MarketMemoryPage;
