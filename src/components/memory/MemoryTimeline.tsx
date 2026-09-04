import React from 'react';
import { HistoricalDigest } from '../../types/digest';
import { MemoryTimelineCard } from './MemoryTimelineCard';
import { BrainCircuit, Sparkles } from 'lucide-react';

interface MemoryTimelineProps {
  digests: HistoricalDigest[];
  onInspect: (digest: HistoricalDigest) => void;
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  digests,
  onInspect,
}) => {
  return (
    <div className="space-y-8">
      {/* Section 6: Market Learning Layer Prominent Hero Callout */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface to-surface border border-indigo-500/30 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-indigo-300">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-100">
            Market Learning Layer: What Usually Happens Next?
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Empirical Intelligence
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
          By indexing realized forward returns post-catalyst across past digests, Market Memory reveals persistent market tendencies:
        </p>

        {/* Observation Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              52W Breakouts + High Conf.
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              68.3% Positive @ 30D
            </div>
            <p className="text-[11px] text-slate-400">
              Institutional accumulation above key resistance historically sustained momentum into the monthly close.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              Earnings Beat &gt; 5% (IT)
            </div>
            <div className="text-sm font-bold text-emerald-400 font-mono">
              74.1% Forward Drift
            </div>
            <p className="text-[11px] text-slate-400">
              Guidance revisions in tech bluechips (Infosys, TCS) showed consistent post-announcement continuation.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-surface border border-border space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              RBI Liquidity Pauses
            </div>
            <div className="text-sm font-bold text-indigo-300 font-mono">
              +3.4% Bank Nifty 7D
            </div>
            <p className="text-[11px] text-slate-400">
              Absence of CRR tightening relaxed cost-of-funds for private lenders (HDFC Bank, ICICI) within 5 sessions.
            </p>
          </div>
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="space-y-1">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Chronological Intelligence Dossiers ({digests.length} Archives)</span>
        </div>

        <div className="relative">
          {digests.map((digest) => (
            <MemoryTimelineCard
              key={digest.id}
              digest={digest}
              onInspect={onInspect}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
