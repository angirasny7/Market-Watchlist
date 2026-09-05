import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ArrowRight, Bookmark, CheckCircle2, Calendar, Database } from 'lucide-react';
import { memoryService } from '../../services/memoryService';
import { ArchivedMarketEvent } from '../../types/memory';
import { useMarketStore } from '../../store/useMarketStore';

export const MarketMemoryPreview: React.FC = () => {
  const navigate = useNavigate();
  const { totalMemoryCount, archivedEventsCount, savedEventsCount } = useMarketStore();
  const [recentMemories, setRecentMemories] = useState<ArchivedMarketEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    memoryService
      .fetchArchivedEvents({ limit: 3 })
      .then((data) => {
        if (isMounted) {
          setRecentMemories(data.slice(0, 3));
        }
      })
      .catch((err) => console.error('Failed to fetch recent memories for preview:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [totalMemoryCount, archivedEventsCount, savedEventsCount]);

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'Recently';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasMemories = recentMemories.length > 0;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight">
              Market Memory (Personal Repository)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Your personal archive of saved catalysts and reviewed events from your watchlist
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

      {/* Cards or Personal Empty State */}
      {!isLoading && !hasMemories ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-surface border border-border text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100">
            No saved or archived market intelligence yet.
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Review events from the Attention Feed and preserve important catalysts for future reference.
          </p>
          <div className="pt-1">
            <button
              onClick={() => navigate('/feed')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-lg shadow-indigo-500/20"
            >
              <span>Review Attention Feed</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {recentMemories.map((memory) => {
            const isSaved = memory.memoryType === 'SAVED';
            const timestamp = memory.savedAt || memory.readAt || memory.timestamp;

            return (
              <div
                key={memory.id || memory.readId || memory.saveId}
                onClick={() => navigate('/memory')}
                className="p-4 rounded-xl bg-surface border border-border hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 cursor-pointer group shadow-sm"
              >
                <div className="space-y-2">
                  {/* Badge & Symbol Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isSaved
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Bookmark className="w-2.5 h-2.5" />
                          <span>Saved For Later</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Archived (Read)</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs font-mono font-bold text-slate-100 px-2 py-0.5 rounded bg-surface-subtle border border-border">
                      {memory.stockSymbol}
                    </span>
                  </div>

                  {/* Headline */}
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2 leading-snug">
                    {memory.headline}
                  </h4>
                </div>

                {/* Footer: Recorded Date */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{formatTimestamp(timestamp)}</span>
                  </span>
                  <span className="text-indigo-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Vault</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
