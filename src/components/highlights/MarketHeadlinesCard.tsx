import React from 'react';
import { Newspaper, ExternalLink, Clock } from 'lucide-react';
import { MarketHighlightsData } from '../../types/market';

interface MarketHeadlinesCardProps {
  headlines: MarketHighlightsData['headlines'];
}

export const MarketHeadlinesCard: React.FC<MarketHeadlinesCardProps> = ({ headlines }) => {
  if (!headlines || headlines.length === 0) {
    return null;
  }

  const formatTimeAgo = (iso: string) => {
    try {
      const diffMs = Date.now() - new Date(iso).getTime();
      const hours = Math.floor(diffMs / 3600000);
      if (hours <= 0) {
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        return `${mins}m ago`;
      }
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recent';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3.5">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Newspaper className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Market Headlines
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified financial press coverage and market commentary
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {headlines.slice(0, 5).map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-surface-subtle hover:bg-slate-800/80 border border-border hover:border-slate-600 transition-all flex items-start justify-between gap-3 group"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-medium text-slate-100 group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
                {item.headline}
              </h3>
              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                <span className="text-slate-300 font-semibold">{item.publisher}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  {formatTimeAgo(item.publishedAt)}
                </span>
              </div>
            </div>

            <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors shrink-0 mt-0.5" />
          </a>
        ))}
      </div>
    </div>
  );
};
