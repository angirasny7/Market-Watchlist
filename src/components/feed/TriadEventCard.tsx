import React, { useState } from 'react';
import {
  Clock,
  Compass,
  Lightbulb,
  ExternalLink,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  BarChart3,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';
import { MarketEvent } from '../../types/event';
import { Insight } from '../../types/insight';
import { PriorityBadge, EventTypeBadge, DeltaBadge, ConfidenceBadge, Modal } from '../common';
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
  const { markEventRead, acknowledgeEvent } = useMarketStore();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isAMZN = event.stockSymbol === 'AMZN';
  const currency = isAMZN ? '$' : '₹';

  return (
    <>
      <article
        className={`rounded-2xl border bg-surface transition-all duration-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-700 ${
          !event.read
            ? 'border-indigo-500/40 shadow-[0_0_20px_-5px_rgba(99,102,241,0.12)]'
            : 'border-border'
        }`}
      >
        {/* CARD HEADER */}
        <div className="p-4 sm:p-5 border-b border-border/80 bg-surface-subtle/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Priority, Event Type, Symbol, Company */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <PriorityBadge priority={event.priority} size="sm" />
            <EventTypeBadge eventType={event.eventType} />

            <div className="flex items-center gap-1.5 ml-0.5">
              <span className="font-extrabold text-sm sm:text-base text-slate-100 tracking-tight">
                {event.companyName}
              </span>
              <span className="text-xs font-mono font-medium text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-border">
                {event.stockSymbol}
              </span>
            </div>
          </div>

          {/* Right: Timestamp & Attention Score Meter */}
          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono">
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{event.timestamp}</span>
            </div>

            {/* Score Pill */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-border text-[11px]"
              title="Attention Score computed by multi-factor engine"
            >
              <span className="text-slate-400">Score:</span>
              <span
                className={`font-bold ${
                  event.scoring.finalScore >= 85
                    ? 'text-rose-400'
                    : event.scoring.finalScore >= 70
                    ? 'text-amber-400'
                    : 'text-indigo-300'
                }`}
              >
                {event.scoring.finalScore.toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* CARD BODY: THE TRIAD */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* 1. WHAT HAPPENED SECTION */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
                <span>What Happened</span>
              </div>

              {/* Price & Delta */}
              <div className="flex items-center gap-2 font-mono">
                <span className="text-sm sm:text-base font-bold text-slate-100 tabular-numbers">
                  {formatPrice(event.price, currency)}
                </span>
                <DeltaBadge value={event.changePercent} size="sm" />
              </div>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
              {event.headline}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {event.whatHappened}
            </p>

            {/* Event Metrics Chips Strip */}
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-[11px]">
              {event.metrics.volumeRatio && (
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                  ⚡ {event.metrics.volumeRatio}x 20D Avg Volume
                </span>
              )}
              {event.metrics.dayHigh && (
                <span className="px-2 py-0.5 rounded-md bg-surface-subtle border border-border text-slate-300">
                  High: {formatPrice(event.metrics.dayHigh, currency)}
                </span>
              )}
              {event.metrics.revenueSurprisePercent && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  Revenue Beat: +{event.metrics.revenueSurprisePercent}%
                </span>
              )}
              {event.metrics.dividendAmount && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  Dividend: ₹{event.metrics.dividendAmount}/sh
                </span>
              )}
              {event.metrics.contractValue && (
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  Deal Value: {event.metrics.contractValue}
                </span>
              )}
            </div>
          </section>

          {/* 2. POSSIBLE EXPLANATION SECTION (JOINED FROM INSIGHT) */}
          {insight ? (
            <section className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/25 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-300">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Possible Explanation</span>
                </div>

                <div className="flex items-center gap-2">
                  <ConfidenceBadge
                    level={insight.confidenceLevel}
                    score={insight.confidenceScore}
                  />
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                {insight.explanation}
              </p>

              {/* Source Link & Verification Citation */}
              <div className="pt-2 border-t border-indigo-500/15 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">
                  Attributed Source:{' '}
                  <span className="text-slate-200 font-medium">
                    {insight.sourceName}
                  </span>
                </span>
                <a
                  href={insight.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-indigo-300 hover:text-indigo-200 flex items-center gap-1 text-[11px] font-mono"
                >
                  <span>Verify Source</span>
                  <ExternalLink className="w-3 h-3 text-indigo-400" />
                </a>
              </div>
            </section>
          ) : (
            <section className="p-3.5 rounded-xl bg-surface-subtle border border-border text-xs text-slate-400">
              <span>Context Enrichment Engine searching filings for catalyst verification...</span>
            </section>
          )}

          {/* 3. WHY IT MATTERS SECTION */}
          {insight && (
            <section className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <span>Why It Matters</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {insight.whyItMatters}
              </p>
            </section>
          )}
        </div>

        {/* CARD FOOTER ACTIONS */}
        <div className="p-4 bg-surface-subtle/80 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* Mark Read Toggle */}
            <button
              onClick={() => markEventRead(event.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                event.read
                  ? 'bg-surface text-slate-400 border-border hover:bg-surface-hover'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{event.read ? 'Marked Read' : 'Mark as Read'}</span>
            </button>

            {/* Save / Acknowledge Toggle */}
            <button
              onClick={() => acknowledgeEvent(event.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                event.acknowledged
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-surface hover:bg-surface-hover text-slate-400 hover:text-slate-200 border-border'
              }`}
            >
              {event.acknowledged ? (
                <BookmarkCheck className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{event.acknowledged ? 'Saved' : 'Save for Later'}</span>
            </button>
          </div>

          {/* View Details CTA */}
          <button
            onClick={() => setIsDetailModalOpen(true)}
            className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-surface hover:bg-surface-hover text-xs font-medium text-slate-200 hover:text-white border border-border transition-colors ml-auto"
          >
            <span>View Details</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </article>

      {/* DETAIL MODAL FOR THIS EVENT */}
      {isDetailModalOpen && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`${event.companyName} (${event.stockSymbol})`}
          subtitle={`Detailed Event & Attention Scoring Breakdown • ID: ${event.id}`}
          maxWidth="lg"
          footer={
            <div className="w-full flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400">
                Timestamp: {event.timestamp}
              </span>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Header info */}
            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-center justify-between">
              <div>
                <div className="text-base font-bold text-slate-100">
                  {event.headline}
                </div>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Price: {formatPrice(event.price, currency)} (
                  {event.changePercent >= 0 ? '+' : ''}
                  {event.changePercent}%)
                </div>
              </div>
              <PriorityBadge priority={event.priority} />
            </div>

            {/* Scoring Breakdown Grid */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Attention Scoring Breakdown (0–100 Scale)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400">Event Base</div>
                  <div className="font-bold text-slate-100 mt-0.5">
                    {event.scoring.eventTypeScore}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400">Price Move</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {event.scoring.priceMagnitudeScore}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400">Volume Spike</div>
                  <div className="font-bold text-cyan-400 mt-0.5">
                    {event.scoring.volumeSpikeScore}
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-surface border border-border">
                  <div className="text-[10px] text-slate-400">Catalyst Boost</div>
                  <div className="font-bold text-indigo-400 mt-0.5">
                    {event.scoring.catalystConfidenceScore}
                  </div>
                </div>
              </div>
            </div>

            {/* Possible explanation if available */}
            {insight && (
              <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                  <span>Causal Explanation</span>
                  <ConfidenceBadge
                    level={insight.confidenceLevel}
                    score={insight.confidenceScore}
                  />
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  {insight.explanation}
                </p>
                <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-indigo-500/20">
                  <span>Source: {insight.sourceName}</span>
                  <a
                    href={insight.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <span>Filing Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Strategic Impact */}
            {insight && (
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Why It Matters
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {insight.whyItMatters}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};
