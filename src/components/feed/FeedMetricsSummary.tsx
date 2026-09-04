import React from 'react';
import { Layers, ShieldCheck, Flame, Compass } from 'lucide-react';
import { MarketEvent } from '../../types/event';
import { Insight } from '../../types/insight';

interface FeedMetricsSummaryProps {
  visibleEvents: MarketEvent[];
  insights: Record<string, Insight>;
}

export const FeedMetricsSummary: React.FC<FeedMetricsSummaryProps> = ({
  visibleEvents,
  insights,
}) => {
  if (visibleEvents.length === 0) return null;

  // 1. Number of visible events
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

  // 3. Highest attention score
  const highestScore = Math.max(
    ...visibleEvents.map((e) => e.scoring?.finalScore || 0),
    0
  );

  // 4. Most common event category
  const categoryCounts = visibleEvents.reduce<Record<string, number>>((acc, e) => {
    const formatted = e.eventType.replace(/_/g, ' ');
    acc[formatted] = (acc[formatted] || 0) + 1;
    return acc;
  }, {});

  const mostCommonCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] || 'Mixed';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-subtle/80 border border-border/80">
      {/* 1. Visible Signals */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-surface border border-border text-slate-400">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400">
            Visible Signals
          </div>
          <div className="text-sm font-bold font-mono text-slate-100">
            {totalVisible} Items
          </div>
        </div>
      </div>

      {/* 2. Avg Causal Confidence */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-surface border border-border text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400">
            Avg Confidence
          </div>
          <div className="text-sm font-bold font-mono text-emerald-400">
            {avgConfidence.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 3. Highest Attention Score */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-surface border border-border text-slate-400">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
        </div>
        <div>
          <div className="text-[10px] uppercase font-mono text-slate-400">
            Peak Attention
          </div>
          <div className="text-sm font-bold font-mono text-rose-300">
            {highestScore.toFixed(1)}{' '}
            <span className="text-[10px] font-normal text-slate-400">/ 100</span>
          </div>
        </div>
      </div>

      {/* 4. Dominant Catalyst */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-surface border border-border text-slate-400">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="truncate">
          <div className="text-[10px] uppercase font-mono text-slate-400">
            Dominant Type
          </div>
          <div className="text-xs font-semibold text-slate-200 capitalize truncate">
            {mostCommonCategory.toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  );
};
