import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Compass,
  Lightbulb,
  ExternalLink,
  BrainCircuit,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Drawer, DeltaBadge, PriorityBadge, ConfidenceBadge, EventTypeBadge } from '../common';
import { HistoricalDigest } from '../../types/digest';
import { MarketMoodBadge } from './MarketMoodBadge';
import { DigestPerformanceCard } from './DigestPerformanceCard';
import { useMarketStore } from '../../store/useMarketStore';

interface DigestDetailDrawerProps {
  digest: HistoricalDigest | null;
  onClose: () => void;
}

export const DigestDetailDrawer: React.FC<DigestDetailDrawerProps> = ({
  digest,
  onClose,
}) => {
  const { getDigestEvents, getInsightsByEvent, acknowledgeDigest } = useMarketStore();

  if (!digest) return null;

  const events = getDigestEvents(digest.id);
  const performanceEntries = Object.entries(digest.forwardPerformanceMap || {}).filter(
    ([_, p]) => p && (p.day1 || p.day5 || p.day30)
  );

  return (
    <Drawer
      isOpen={Boolean(digest)}
      onClose={onClose}
      title={digest.title}
      subtitle={`Market Memory Dossier • ${digest.displayDate}`}
      width="xl"
      footer={
        <div className="w-full flex items-center justify-between text-xs font-mono">
          <span className="text-slate-400">
            {events.length} verified events preserved in permanent memory
          </span>
          <button
            onClick={() => {
              acknowledgeDigest(digest.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Reviewed</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* 1. EXECUTIVE RETROSPECTIVE & MOOD HEADER */}
        <div className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                Executive Retrospective Brief
              </span>
            </div>
            <MarketMoodBadge mood={digest.marketMood} size="sm" />
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {digest.executiveSummary}
          </p>

          {/* Benchmark Indices Performance Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="text-[11px] font-mono text-slate-400">NIFTY 50 Close</div>
              {digest.benchmarkIndices.nifty ? (
                <div className="text-base sm:text-lg font-bold font-mono text-slate-100 flex items-baseline justify-between mt-0.5">
                  <span>{digest.benchmarkIndices.nifty.close.toLocaleString()}</span>
                  <span className={`text-xs ${digest.benchmarkIndices.nifty.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {digest.benchmarkIndices.nifty.changePercent >= 0 ? '+' : ''}
                    {digest.benchmarkIndices.nifty.changePercent}%
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-1 font-mono">Unavailable</div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-surface border border-border">
              <div className="text-[11px] font-mono text-slate-400">SENSEX Close</div>
              {digest.benchmarkIndices.sensex ? (
                <div className="text-base sm:text-lg font-bold font-mono text-slate-100 flex items-baseline justify-between mt-0.5">
                  <span>{digest.benchmarkIndices.sensex.close.toLocaleString()}</span>
                  <span className={`text-xs ${digest.benchmarkIndices.sensex.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {digest.benchmarkIndices.sensex.changePercent >= 0 ? '+' : ''}
                    {digest.benchmarkIndices.sensex.changePercent}%
                  </span>
                </div>
              ) : (
                <div className="text-xs text-slate-500 italic mt-1 font-mono">Unavailable</div>
              )}
            </div>
          </div>

          {/* Catalysts Tags Strip */}
          {digest.catalysts && digest.catalysts.length > 0 && (
            <div className="pt-2 border-t border-border/60 space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-400" />
                <span>Primary Market Catalysts Identified</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {digest.catalysts.map((cat, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300"
                  >
                    ⚡ {cat.title} ({cat.affectedSectors.join(', ')})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. SECTION 6: MARKET LEARNING LAYER ("WHAT USUALLY HAPPENS NEXT?") */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/30 via-surface to-surface border border-indigo-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-indigo-300">
            <BrainCircuit className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider">
              Market Learning Layer: What Usually Happens Next?
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-surface/80 p-3.5 rounded-xl border border-border">
            {performanceEntries.length > 0 ? (
              <>
                <p>
                  <strong className="text-slate-100">Historical Empirical Observation:</strong> Realized post-event tracking is active for <span className="text-emerald-400 font-bold font-mono">{performanceEntries.length}</span> {performanceEntries.length === 1 ? 'catalyst' : 'catalysts'} in this digest. See detailed forward performance dossiers below for 1-day, 7-day, and 30-day realized returns.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-400 border-t border-border/60">
                  <span>Tracked Symbols: {performanceEntries.map(([s]) => s).join(', ')}</span>
                  <span>•</span>
                  <span className="text-indigo-300">Empirical Returns</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-400">
                  <strong className="text-slate-200">Historical Empirical Observation:</strong> Not enough historical forward data yet to establish empirical post-event tendencies for this session.
                </p>
                <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-slate-500 border-t border-border/60">
                  <span>Status: Insufficient Historical Sample (&lt;5 events)</span>
                  <span>•</span>
                  <span className="text-slate-400">Awaiting Additional Market Cycles</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 3. DETAILED EVENT DOSSIERS LIST */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">
              Enriched Events Included in this Digest ({events.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              Permanent Triad Records
            </span>
          </div>

          <div className="space-y-5">
            {events.map((event) => {
              const insights = getInsightsByEvent(event.id);
              const insight = insights[0];
              const forwardPerf = digest.forwardPerformanceMap?.[event.stockSymbol];

              return (
                <div
                  key={event.id}
                  className="p-4 sm:p-5 rounded-2xl bg-surface-subtle border border-border space-y-4 shadow-sm"
                >
                  {/* Event Top Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={event.priority} size="sm" />
                      <EventTypeBadge eventType={event.eventType} />
                      <span className="text-sm font-bold text-slate-100">
                        {event.companyName}
                      </span>
                      <span className="text-xs font-mono text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-border">
                        {event.stockSymbol}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        {event.timestamp}
                      </span>
                      <DeltaBadge value={event.changePercent} size="sm" />
                    </div>
                  </div>

                  {/* Level 1: WHAT HAPPENED */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                      <BarChart3 className="w-3 h-3 text-slate-400" />
                      <span>What Happened</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-100">
                      {event.headline}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {event.whatHappened}
                    </p>
                  </div>

                  {/* Level 2: WHY IT HAPPENED (Enriched Insight) */}
                  {insight && (
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/25 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-indigo-300 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                          <Compass className="w-3.5 h-3.5 text-indigo-400" />
                          Why It Happened
                        </span>
                        <ConfidenceBadge
                          level={insight.confidenceLevel}
                          score={insight.confidenceScore}
                        />
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed">
                        {insight.explanation}
                      </p>

                      <div className="pt-1.5 text-[11px] text-slate-400 flex items-center justify-between border-t border-indigo-500/15 font-mono">
                        <span>Source: {insight.sourceName}</span>
                        <a
                          href={insight.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]"
                        >
                          <span>Original Citation</span>
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Level 3: WHY IT MATTERS */}
                  {insight && (
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        <span>Why It Matters</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {insight.whyItMatters}
                      </p>
                    </div>
                  )}

                  {/* Level 4: FORWARD PERFORMANCE TRACKING (Key Differentiator) */}
                  <DigestPerformanceCard
                    symbol={event.stockSymbol}
                    companyName={event.companyName}
                    eventTypeFormatted={event.eventType.replace(/_/g, ' ')}
                    eventDate={digest.displayDate.split(',')[0]}
                    performance={forwardPerf}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Drawer>
  );
};
