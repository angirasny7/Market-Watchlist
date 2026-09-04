import React from 'react';
import {
  HighlightsHeader,
  IndexTickerRibbon,
  SectorHeatmap,
  MacroEventsSection,
  MarketMoversGrid,
} from '../components/highlights';

export const MarketHighlightsPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header with Breadth Metrics & Central Bank Stance */}
      <HighlightsHeader />

      {/* 2. Benchmark Indices Ribbon with Day Range Bars */}
      <IndexTickerRibbon />

      {/* 3. Sector Rotation Heatmap & Relative Performance Bars */}
      <SectorHeatmap />

      {/* 4. Macro Policy Signals & Why It Matters Insights */}
      <MacroEventsSection />

      {/* 5. Outlier Market Movers & Discovery Integration */}
      <MarketMoversGrid />
    </div>
  );
};
