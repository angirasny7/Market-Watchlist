import React, { useState } from 'react';
import {
  IndexTickerRibbon,
  SectorHeatmap,
  MarketMoversGrid,
  MacroEventsSection,
  MarketLearningLayer,
  PatternAnalyticsSection,
  HistoricalDossiersSection,
} from '../components/highlights';
import { DigestDetailDrawer } from '../components/memory/DigestDetailDrawer';
import { PageContainer } from '../components/common';
import { useMarketStore } from '../store/useMarketStore';
import { HistoricalDigest } from '../types/digest';
import { ChevronDown, ChevronUp, Layers } from 'lucide-react';

export const MarketHighlightsPage: React.FC = () => {
  const { digests } = useMarketStore();
  const [activeDigest, setActiveDigest] = useState<HistoricalDigest | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <PageContainer>
      {/* 1. Clean Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          Market Highlights
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Benchmark indices, sector performance, and top movers across the market.
        </p>
      </div>

      {/* 2. SECTION 1: Benchmark Indices */}
      <section className="space-y-3">
        <IndexTickerRibbon />
      </section>

      {/* 3. SECTION 2: Sectors Performance */}
      <section className="space-y-3 pt-2">
        <SectorHeatmap />
      </section>

      {/* 4. SECTION 3: Top Movers */}
      <section className="space-y-3 pt-2">
        <MarketMoversGrid />
      </section>

      {/* 5. COLLAPSED SECTION: Advanced Market Context & Historical Dossiers */}
      <div className="pt-4 border-t border-border/60">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-surface border border-border hover:border-slate-700 text-xs sm:text-sm font-medium text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Advanced Market Context & Pattern Analytics</span>
          </div>
          <div className="flex items-center gap-1 text-slate-400 text-xs">
            <span>{showAdvanced ? 'Hide' : 'Show'}</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAdvanced && (
          <div className="mt-6 space-y-8 animate-fade-in">
            {/* Macro Events & Catalysts */}
            <MacroEventsSection />

            {/* Pattern Analytics */}
            <PatternAnalyticsSection />

            {/* Historical Dossiers */}
            <HistoricalDossiersSection
              digests={digests}
              onInspectDigest={setActiveDigest}
            />

            {/* Market Learning Layer */}
            <MarketLearningLayer />
          </div>
        )}
      </div>

      {/* Slide-Over Dossier Deep Dive Drawer */}
      <DigestDetailDrawer
        digest={activeDigest}
        onClose={() => setActiveDigest(null)}
      />
    </PageContainer>
  );
};

export default MarketHighlightsPage;
