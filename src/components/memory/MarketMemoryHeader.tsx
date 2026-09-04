import React from 'react';
import { History, Calendar, ShieldCheck, Database, BookmarkCheck } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const MarketMemoryHeader: React.FC = () => {
  const { digests, insights } = useMarketStore();

  const totalDigests = digests.length;

  // Calculate unique events referenced across digests
  const allDigestEventIds = Array.from(
    new Set(digests.flatMap((d) => d.eventIds))
  );
  const totalEventsInDigests = allDigestEventIds.length;

  // Calculate unique insights referenced across digests
  const allDigestInsightIds = Array.from(
    new Set(digests.flatMap((d) => d.insightIds))
  );
  const totalInsightsInDigests = allDigestInsightIds.length;

  // Average confidence score across all stored insights
  const allInsightsList = Object.values(insights);
  const avgConfidence =
    allInsightsList.length > 0
      ? (
          allInsightsList.reduce((acc, curr) => acc + curr.confidenceScore, 0) /
          allInsightsList.length
        ) * 100
      : 92.4;

  // Date range determination
  const dates = digests.map((d) => new Date(d.digestDate).getTime()).sort();
  const earliest = digests.find((d) => new Date(d.digestDate).getTime() === dates[0])?.displayDate.split(',')[0] || 'Sep 5';
  const latest = digests.find((d) => new Date(d.digestDate).getTime() === dates[dates.length - 1])?.displayDate.split(',')[0] || 'Sep 15';

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      {/* Title & Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <History className="w-4 h-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
              Market Memory
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
              Permanent Knowledge Base
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Historical intelligence timeline storing every market digest, causal explanation, and realized outcome.
          </p>
        </div>

        {/* Date Range Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>Timeline:</span>
          <span className="text-slate-100 font-semibold">{earliest} – {latest}, 2026</span>
        </div>
      </div>

      {/* Hero Summary Narrative Box */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-surface via-surface-subtle to-surface border border-border flex items-center justify-between gap-4 text-xs sm:text-sm text-slate-300">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 hidden sm:flex">
            <Database className="w-4 h-4" />
          </div>
          <p className="leading-relaxed">
            Your market memory contains{' '}
            <span className="text-slate-100 font-bold font-mono">
              {totalEventsInDigests} historical events
            </span>
            ,{' '}
            <span className="text-emerald-400 font-bold font-mono">
              {totalInsightsInDigests} verified insights
            </span>
            , and{' '}
            <span className="text-indigo-300 font-bold font-mono">
              {totalDigests} comprehensive digests
            </span>{' '}
            permanently preserved for retrospective review.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400">Total Digests</div>
          <div className="font-mono text-base font-bold text-slate-100">
            {totalDigests} Archives
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Preserved Events</span>
          </div>
          <div className="font-mono text-base font-bold text-indigo-300">
            {totalEventsInDigests} Events
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Avg Confidence</span>
          </div>
          <div className="font-mono text-base font-bold text-emerald-400">
            {avgConfidence.toFixed(1)}%
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Time Depth</span>
          </div>
          <div className="font-mono text-base font-bold text-slate-200">
            10 Trading Days
          </div>
        </div>
      </div>
    </div>
  );
};
