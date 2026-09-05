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
import { PageContainer } from '../components/common';

export const DashboardPage: React.FC = () => {
  return (
    <PageContainer>
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
    </PageContainer>
  );
};

export default DashboardPage;
