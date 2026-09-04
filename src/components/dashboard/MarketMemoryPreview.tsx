import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowRight, BookOpen, Calendar, CheckCircle2 } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const MarketMemoryPreview: React.FC = () => {
  const navigate = useNavigate();
  const { digests, openDigestDrawer } = useMarketStore();
  const latestDigests = digests.slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Market Memory (Activity Archive)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Permanent historical knowledge base of market digests, catalysts, and realized outcomes
          </p>
        </div>

        <button
          onClick={() => navigate('/memory')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>Open Market Memory</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {latestDigests.map((digest) => (
          <div
            key={digest.id}
            className="p-5 rounded-xl bg-surface border border-border hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between space-y-4 group shadow-sm"
          >
            <div className="space-y-3">
              {/* Header: Date badge & Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-200">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{digest.displayDate}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Mood: {digest.marketMood}
                  </span>
                  {digest.isAcknowledged && (
                    <span title="Reviewed" className="text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                {digest.title}
              </h3>

              {/* Counts chips */}
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded bg-surface-subtle border border-border text-slate-300">
                  {digest.eventIds.length} Events
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  {digest.insightIds.length} Verified Insights
                </span>
              </div>

              {/* Executive Summary Snippet */}
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
                {digest.executiveSummary}
              </p>
            </div>

            {/* Inspect Button */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400">
                Nifty: +{digest.benchmarkIndices.nifty.changePercent}%
              </span>

              <button
                onClick={() => openDigestDrawer(digest.id)}
                className="px-3 py-1.5 rounded-lg bg-surface-subtle hover:bg-surface-hover border border-border text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <BookOpen className="w-3 h-3 text-indigo-400" />
                <span>Inspect Dossier</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
