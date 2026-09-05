import React, { useState } from 'react';
import {
  HighlightsHeader,
  IndexTickerRibbon,
  SectorHeatmap,
  MacroEventsSection,
  MarketMoversGrid,
  MarketLearningLayer,
  PatternAnalyticsSection,
  HistoricalDossiersSection,
} from '../components/highlights';
import { DigestDetailDrawer } from '../components/memory/DigestDetailDrawer';
import { useMarketStore } from '../store/useMarketStore';
import { HistoricalDigest } from '../types/digest';

export const MarketHighlightsPage: React.FC = () => {
  const { digests } = useMarketStore();
  const [activeDigest, setActiveDigest] = useState<HistoricalDigest | null>(null);

  return (
    <div className="space-y-8 pb-16 animate-fade-in max-w-7xl mx-auto">
      {/* 1. Header with Breadth Metrics, Policy Stance & Sync Indicator */}
      <HighlightsHeader />

      {/* 2. Benchmark Indices Ribbon with Day Range Bars */}
      <IndexTickerRibbon />

      {/* 3. Market Learning Layer: What Usually Happens Next? */}
      <MarketLearningLayer />

      {/* 4. Pattern Analytics & Forward Return Analysis */}
      <PatternAnalyticsSection />

      {/* 5. Sector Rotation Intelligence & Momentum Heatmap */}
      <SectorHeatmap />

      {/* 6. Historical Market Dossiers */}
      <HistoricalDossiersSection
        digests={digests}
        onInspectDigest={setActiveDigest}
      />

      {/* 7. Macro Events & Policy Signals (Why It Matters) */}
      <MacroEventsSection />

      {/* 8. Outlier Market Movers & Discovery Integration */}
      <MarketMoversGrid />

      {/* 9. Slide-Over Dossier Deep Dive Drawer */}
      <DigestDetailDrawer
        digest={activeDigest}
        onClose={() => setActiveDigest(null)}
      />
    </div>
  );
};

export default MarketHighlightsPage;
