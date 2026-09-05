import React from 'react';
import { Layers, ShieldCheck, Flame, AlertTriangle } from 'lucide-react';
import { MarketEvent } from '../../types/event';
import { Insight } from '../../types/insight';
import { KpiGrid, KpiCard } from '../common';

interface FeedMetricsSummaryProps {
  visibleEvents: MarketEvent[];
  insights: Record<string, Insight>;
}

export const FeedMetricsSummary: React.FC<FeedMetricsSummaryProps> = ({
  visibleEvents,
  insights,
}) => {
  if (visibleEvents.length === 0) return null;

  // 1. Visible signals count
  const totalVisible = visibleEvents.length;

  // 2. Average confidence score across visible events' insights
  const visibleInsights = visibleEvents
    .map((e) => Object.values(insights).find((i) => i.relatedEventId === e.id))
    .filter((i): i is Insight => Boolean(i));

  const avgConfidence =
    visibleInsights.length > 0
      ? (
          visibleInsights.reduce((acc, curr) => acc + curr.confidenceScore, 0) /
          visibleInsights.length
        ) * 100
      : 0;

  // 3. Critical and High counts
  const criticalCount = visibleEvents.filter((e) => e.priority === 'CRITICAL').length;
  const highCount = visibleEvents.filter((e) => e.priority === 'HIGH').length;

  return (
    <KpiGrid cols={4}>
      <KpiCard
        label="Visible Signals"
        value={totalVisible}
        subtext="Filtered market anomalies"
        icon={<Layers className="w-4 h-4" />}
        accent="indigo"
      />
      <KpiCard
        label="Critical Alerts"
        value={criticalCount}
        subtext="Immediate portfolio impact"
        icon={<Flame className="w-4 h-4" />}
        accent="rose"
      />
      <KpiCard
        label="High Priority"
        value={highCount}
        subtext="Elevated catalyst momentum"
        icon={<AlertTriangle className="w-4 h-4" />}
        accent="amber"
      />
      <KpiCard
        label="Avg Conviction"
        value={`${avgConfidence.toFixed(0)}%`}
        subtext="Attributed evidence score"
        icon={<ShieldCheck className="w-4 h-4" />}
        accent="emerald"
      />
    </KpiGrid>
  );
};
