import React from 'react';
import {
  WelcomeBanner,
  SinceLastVisitCards,
  TopInsightsSection,
  AttentionFeedPreview,
  QuickMarketOverview,
  MarketHighlightsPreview,
  MarketMemoryPreview,
} from '../components/dashboard';

export const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-8 pb-12 animate-fade-in max-w-7xl mx-auto">
      {/* Section 1: Hero Welcome Banner */}
      <WelcomeBanner />

      {/* Section 2: Since Your Last Visit Summary Cards */}
      <SinceLastVisitCards />

      {/* Section 3: Top Insights Since Your Last Visit (Most Important Section) */}
      <TopInsightsSection />

      {/* Section 4: Attention Feed Preview */}
      <AttentionFeedPreview />

      {/* Section 5: Quick Market Overview */}
      <QuickMarketOverview />

      {/* Section 6: Market Highlights Preview */}
      <MarketHighlightsPreview />

      {/* Section 7: Market Memory Preview */}
      <MarketMemoryPreview />
    </div>
  );
};

export default DashboardPage;
