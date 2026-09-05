import React from 'react';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { HistoricalDigest } from '../../types/digest';
import { MemoryTimelineCard } from '../memory/MemoryTimelineCard';

interface HistoricalDossiersSectionProps {
  digests: HistoricalDigest[];
  onInspectDigest: (digest: HistoricalDigest) => void;
}

export const HistoricalDossiersSection: React.FC<HistoricalDossiersSectionProps> = ({
  digests,
  onInspectDigest,
}) => {
  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BookOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
              Historical Market Dossiers
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {digests.length} Sessions Cataloged
            </span>
          </div>
          <p className="text-xs text-slate-400">
            End-of-day intelligence dossiers preserving benchmark impacts, verified causal links, and multi-week forward returns.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Institutional Grade Archive</span>
        </div>
      </div>

      {/* Dossiers Stream */}
      {digests.length > 0 ? (
        <div className="relative pt-2">
          {digests.map((digest) => (
            <MemoryTimelineCard
              key={digest.id}
              digest={digest}
              onInspect={onInspectDigest}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-surface border border-border text-center space-y-2">
          <p className="text-sm font-semibold text-slate-300">
            No Historical Dossiers available for current filter.
          </p>
          <p className="text-xs text-slate-400">
            Historical intelligence dossiers compile automatically upon session close.
          </p>
        </div>
      )}
    </section>
  );
};
