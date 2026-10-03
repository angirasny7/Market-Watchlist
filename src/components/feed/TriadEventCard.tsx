import React, { useState } from 'react';
import {
  Clock,
  Compass,
  Lightbulb,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  BarChart3,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { MarketEvent } from '../../types/event';
import { Insight } from '../../types/insight';
import { formatPrice } from '../../lib/utils';
import { useMarketStore } from '../../store/useMarketStore';

interface TriadEventCardProps {
  event: MarketEvent;
  insight?: Insight;
}

export const TriadEventCard: React.FC<TriadEventCardProps> = ({
  event,
  insight,
}) => {
  const { markEventRead, saveEventForLater, watchlist, allStocks } = useMarketStore();
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic currency from stock catalog
  const matchedStock =
    watchlist.find((s) => s.symbol === event.stockSymbol) ||
    allStocks.find((s) => s.symbol === event.stockSymbol);
  const currency = matchedStock?.currency || (event as any).currency || '₹';

  // Attention Score translated to plain-English label
  const score = event.scoring?.finalScore ?? 50;
  const getScoreBadge = (sc: number, pri: string) => {
    if (sc >= 85 || pri === 'CRITICAL') {
      return { label: 'Urgent', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' };
    }
    if (sc >= 65 || pri === 'HIGH') {
      return { label: 'Important', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    if (sc >= 40 || pri === 'MEDIUM') {
      return { label: 'Worth a look', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
    }
    return { label: 'FYI', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' };
  };
  const scoreInfo = getScoreBadge(score, event.priority);

  const isGain = event.changePercent >= 0;
  const enrichment = event.enrichment;
  const evidenceList = enrichment?.evidence || [];
  const hasEvidence = evidenceList.length > 0;
  const confidenceScore =
    enrichment?.confidenceScore ?? (insight ? Math.round(insight.confidenceScore * 100) : Math.round(score));

  const oneLineWhy =
    insight?.explanation ||
    enrichment?.summary ||
    enrichment?.possibleDrivers?.[0] ||
    event.whatHappened;

  return (
    <article className="rounded-xl border border-border bg-surface hover:border-slate-700 transition-all overflow-hidden shadow-sm">
      {/* 1. COLLAPSED CARD HEADER & SUMMARY (Always Visible) */}
      <div className="p-4 sm:p-5 space-y-3">
        {/* Top Line: Priority, Instrument, Timestamp, Price & Change */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${scoreInfo.color}`}
              title={`Attention score: ${score.toFixed(1)} / 100`}
            >
              {scoreInfo.label}
            </span>

            {Boolean((event as any).isDemo) && (
              <span
                className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20"
                title="Demonstration Event"
              >
                Demo
              </span>
            )}

            <span className="font-semibold text-slate-100 text-sm sm:text-base">
              {event.companyName}
            </span>

            <span className="text-xs font-mono text-slate-400 bg-surface-subtle px-1.5 py-0.2 rounded border border-border/70">
              {event.stockSymbol}
            </span>

            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono ml-auto sm:ml-2">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{event.timestamp}</span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 font-mono text-right">
            <span className="text-sm sm:text-base font-semibold text-slate-100">
              {formatPrice(event.price, currency)}
            </span>
            <span
              className={`text-xs font-medium flex items-center gap-0.5 ${
                isGain ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{isGain ? '▲ +' : '▼ '}</span>
              <span>{Math.abs(event.changePercent).toFixed(2)}%</span>
            </span>
          </div>
        </div>

        {/* Headline */}
        <h2 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug">
          {event.headline}
        </h2>

        {/* One-Line "Why" */}
        <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
          <span className="text-slate-300 font-medium">Why: </span>
          {oneLineWhy}
        </p>

        {/* Collapsed Actions Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => markEventRead(event.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover text-slate-300 hover:text-slate-100 border border-border/70 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mark as read</span>
            </button>

            <button
              onClick={() => saveEventForLater(event.id)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-hover text-slate-300 hover:text-slate-100 border border-border/70 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <span>Save for later</span>
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 font-medium text-indigo-400 hover:text-indigo-300 transition-colors py-1 px-2 rounded hover:bg-surface-hover"
          >
            <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. EXPANDED DETAILS (What Happened / Why It Happened / Why It Matters / Evidence) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 border-t border-border/80 bg-surface-subtle/40 space-y-4 animate-fade-in text-xs sm:text-sm">
          {/* Detailed What Happened */}
          <section className="space-y-1.5">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
              <span>What Happened</span>
            </div>
            <p className="text-slate-300 leading-relaxed">{event.whatHappened}</p>

            {/* Metrics Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              {event.metrics?.volumeRatio && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  Volume: {event.metrics.volumeRatio}x 20D Avg
                </span>
              )}
              {event.metrics?.dayHigh && (
                <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                  Day High: {formatPrice(event.metrics.dayHigh, currency)}
                </span>
              )}
              {event.metrics?.dayLow && (
                <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                  Day Low: {formatPrice(event.metrics.dayLow, currency)}
                </span>
              )}
              {event.metrics?.priceAtEvent !== undefined && Number(event.metrics.priceAtEvent) !== event.price && (
                <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                  Price at Event: {formatPrice(Number(event.metrics.priceAtEvent), currency)}
                </span>
              )}
              {event.metrics?.priceAtSince !== undefined && (
                <span className="px-2 py-0.5 rounded bg-surface border border-border text-slate-300">
                  Baseline (Last Visit): {formatPrice(Number(event.metrics.priceAtSince), currency)}
                </span>
              )}
            </div>
          </section>

          {/* Why It Happened / Drivers */}
          <section className="space-y-1.5">
            <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>Why It Happened</span>
            </div>
            {enrichment?.possibleDrivers && enrichment.possibleDrivers.length > 0 ? (
              <ul className="space-y-1 text-slate-300">
                {enrichment.possibleDrivers.map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-indigo-400 mt-1">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-300 leading-relaxed">{oneLineWhy}</p>
            )}
          </section>

          {/* Why It Matters / Impact */}
          {insight?.whyItMatters && (
            <section className="space-y-1.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-slate-400" />
                <span>Why It Matters</span>
              </div>
              <p className="text-slate-300 leading-relaxed">{insight.whyItMatters}</p>
            </section>
          )}

          {/* Sources & Verification Evidence */}
          <section className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Sources & Evidence</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Confidence: {confidenceScore}%</span>
              </span>
            </div>

            {hasEvidence ? (
              <div className="space-y-1.5">
                {evidenceList.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-surface border border-border/80 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-200 truncate block">{ev.title}</span>
                      <span className="text-[11px] text-slate-400">{ev.source}</span>
                    </div>
                    {ev.url ? (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 shrink-0 p-1"
                        title="View source"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-surface/50 border border-border/60 text-xs text-slate-400 italic flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span>No source available</span>
              </div>
            )}
          </section>
        </div>
      )}
    </article>
  );
};

export default TriadEventCard;
