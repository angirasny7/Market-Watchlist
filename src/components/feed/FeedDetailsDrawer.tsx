import React, { useState, useEffect } from 'react';
import {
  FeedItem,
  FeedItemDetails,
} from '../../types/feed';
import { feedApiService } from '../../services/feedApiService';
import { formatMoney } from '../../lib/formatMoney';
import {
  X,
  TrendingUp,
  TrendingDown,
  Bookmark,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Share2,
  Info,
  HelpCircle,
  FileText,
  Activity,
  Bell,
  BarChart2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatEventTime, formatEventTooltip } from '../../lib/formatEventTime';

interface FeedDetailsDrawerProps {
  isOpen: boolean;
  item: FeedItem | null;
  onClose: () => void;
  onToggleRead: (item: FeedItem) => void;
  onToggleSave: (item: FeedItem) => void;
  initialTab?: string;
}

type TabType = 'happened' | 'why' | 'matters' | 'sources' | 'price' | 'alert';

export const FeedDetailsDrawer: React.FC<FeedDetailsDrawerProps> = ({
  isOpen,
  item,
  onClose,
  onToggleRead,
  onToggleSave,
  initialTab = 'happened',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType);
  const [details, setDetails] = useState<FeedItemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M'>('1M');

  useEffect(() => {
    if (initialTab && ['happened', 'why', 'matters', 'sources', 'price', 'alert'].includes(initialTab)) {
      setActiveTab(initialTab as TabType);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !item) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    feedApiService
      .getItemDetails(item.id, 'all')
      .then((data) => {
        if (isMounted) {
          setDetails(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load feed item details:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const isPositive = item.changePercent >= 0;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/feed?event=${item.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'happened', label: 'What Happened', icon: <Activity className="w-4 h-4" /> },
    { id: 'why', label: 'Why Did It Move', icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'matters', label: 'Why It Matters', icon: <Info className="w-4 h-4" /> },
    { id: 'sources', label: 'Sources', icon: <FileText className="w-4 h-4" /> },
    { id: 'price', label: 'Price & Chart', icon: <BarChart2 className="w-4 h-4" /> },
    { id: 'alert', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-xl bg-surface border-l border-border shadow-2xl flex flex-col animate-slide-in-right outline-none">
          {/* Top Header */}
          <div className="p-5 sm:p-6 border-b border-border bg-surface-subtle/90 backdrop-blur space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg sm:text-xl text-slate-100">
                    {item.stockSymbol}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface text-slate-300 border border-border">
                    {item.exchange}
                  </span>
                  {item.isDemo && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Demo
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 font-medium truncate mt-0.5">
                  {item.companyName}
                </p>
              </div>

              {/* Actions & Close */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  title="Copy direct link"
                  onClick={handleCopyLink}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-hover border border-border/50 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  title={item.isSaved ? 'Saved' : 'Save for later'}
                  onClick={() => onToggleSave(item)}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    item.isSaved
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'border-border/50 text-slate-400 hover:text-slate-100 hover:bg-surface-hover'
                  )}
                >
                  <Bookmark className={cn('w-4 h-4', item.isSaved && 'fill-amber-400')} />
                </button>

                <button
                  type="button"
                  title={item.isUnread ? 'Mark read' : 'Mark unread'}
                  onClick={() => onToggleRead(item)}
                  className={cn(
                    'p-2 rounded-lg border transition-colors',
                    !item.isUnread
                      ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                      : 'border-border/50 text-slate-400 hover:text-slate-100 hover:bg-surface-hover'
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  aria-label="Close details"
                  onClick={onClose}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-surface-hover transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Price Row & Headline Banner */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xl sm:text-2xl font-bold font-mono text-slate-100">
                  {formatMoney(item.currentPrice ?? item.eventPrice, item.currency)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-sm font-semibold font-mono ml-2.5 px-2 py-0.5 rounded-md',
                    isPositive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                  )}
                >
                  {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  {isPositive ? '+' : ''}
                  {item.changePercent.toFixed(2)}%
                </span>
              </div>

              <div className="text-right flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-200">
                  {formatEventTime(item)}
                </span>
                <span
                  title={formatEventTooltip(item)}
                  className="text-[11px] text-slate-400 font-mono flex items-center gap-1 cursor-help mt-0.5"
                >
                  <Clock className="w-3 h-3 text-slate-400" />
                  {details?.happened.detectedAt
                    ? `Detected ${new Date(details.happened.detectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : `Delayed ~15 min (${item.exchange})`}
                </span>
              </div>
            </div>

            {isCopied && (
              <div className="text-[11px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 rounded-lg py-1 px-2.5 flex items-center gap-1.5 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Deep link copied to clipboard
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 px-4 sm:px-6 border-b border-border bg-surface overflow-x-auto no-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            {isLoading && !details ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-3/4" />
                <div className="h-24 bg-slate-800 rounded-xl" />
                <div className="h-40 bg-slate-800 rounded-xl" />
              </div>
            ) : details ? (
              <>
                {/* 1. Tab: WHAT HAPPENED */}
                {activeTab === 'happened' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Event Overview
                      </h4>
                      <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                        {item.headline}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">Move Magnitude</span>
                        <div
                          className={cn(
                            'text-base font-bold font-mono mt-1',
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {details.happened.movePercent.toFixed(2)}%
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">Price at Event</span>
                        <div className="text-base font-bold font-mono text-slate-100 mt-1">
                          {formatMoney(details.happened.priceAtEvent, item.currency)}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">Current Price</span>
                        <div className="text-base font-bold font-mono text-slate-100 mt-1">
                          {formatMoney(details.happened.currentPrice, item.currency)}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">Price Delta</span>
                        <div className="text-base font-bold font-mono text-slate-200 mt-1">
                          {details.happened.priceDelta !== null
                            ? `${details.happened.priceDelta >= 0 ? '+' : ''}${details.happened.priceDelta.toFixed(2)}`
                            : '—'}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">Volume Ratio</span>
                        <div className="text-base font-bold font-mono text-slate-100 mt-1">
                          {details.happened.volumeRatio.toFixed(1)}x
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-subtle border border-border/70">
                        <span className="text-[11px] text-slate-400 font-medium">52W Status</span>
                        <div className="text-xs font-semibold text-slate-200 mt-1.5">
                          {details.happened.is52wHigh
                            ? 'Near 52W High'
                            : details.happened.is52wLow
                            ? 'Near 52W Low'
                            : 'Within Range'}
                        </div>
                      </div>
                    </div>

                    {/* Day Range Breakdown */}
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Day Trading Range
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-slate-500 block">Open</span>
                          <span className="text-slate-200 font-semibold">
                            {formatMoney(details.happened.dayOpen, item.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">High</span>
                          <span className="text-emerald-400 font-semibold">
                            {formatMoney(details.happened.dayHigh, item.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Low</span>
                          <span className="text-rose-400 font-semibold">
                            {formatMoney(details.happened.dayLow, item.currency)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Close</span>
                          <span className="text-slate-200 font-semibold">
                            {formatMoney(details.happened.dayClose, item.currency)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Market Timing & Provenance */}
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        Market Timing & Detection
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-lg bg-surface border border-border/60">
                          <span className="text-slate-400 block text-[11px]">Market Trading Date</span>
                          <span className="text-slate-200 font-mono font-medium">
                            {details.happened.occurredOn
                              ? new Date(details.happened.occurredOn).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : new Date(details.happened.eventTimestamp).toLocaleDateString('en-GB', {
                                  weekday: 'short',
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                          </span>
                        </div>
                        {details.happened.periodStart && (
                          <div className="p-2.5 rounded-lg bg-surface border border-border/60">
                            <span className="text-slate-400 block text-[11px]">Cumulative Baseline (Since)</span>
                            <span className="text-slate-200 font-mono font-medium">
                              {new Date(details.happened.periodStart).toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        )}
                        <div className="p-2.5 rounded-lg bg-surface border border-border/60 sm:col-span-2">
                          <span className="text-slate-400 block text-[11px]">System Detection Timestamp</span>
                          <span className="text-slate-300 font-mono text-[11px]">
                            {details.happened.detectedAt
                              ? new Date(details.happened.detectedAt).toLocaleString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })
                              : new Date(details.happened.eventTimestamp).toLocaleString('en-GB')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Tab: WHY DID IT MOVE */}
                {activeTab === 'why' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Primary Catalyst
                        </h4>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border',
                            details.why.confidenceLevel === 'High'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : details.why.confidenceLevel === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-slate-500/10 text-slate-400 border-slate-500/30'
                          )}
                        >
                          {details.why.confidenceLevel === 'High' ? (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          )}
                          {details.why.confidenceLevel} Confidence ({details.why.confidenceScore}%)
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                        {details.why.cause}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Evidence Rationale
                      </h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {details.why.confidenceReason}
                      </p>
                    </div>

                    {details.why.possibleDrivers && details.why.possibleDrivers.length > 0 && (
                      <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Identified Drivers & Signals
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {details.why.possibleDrivers.map((driver, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                              <span>{driver}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Tab: WHY IT MATTERS */}
                {activeTab === 'matters' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Strategic Context
                      </h4>
                      <p className="text-sm font-medium text-slate-200 leading-relaxed">
                        {details.matters.summary}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Key Takeaways
                      </h4>
                      <ul className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                        {details.matters.bulletPoints.map((point, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                            <span className="leading-relaxed">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 4. Tab: SOURCES & EVIDENCE */}
                {activeTab === 'sources' && (
                  <div className="space-y-4 animate-fade-in">
                    {details.sources.length === 0 ? (
                      <div className="p-8 rounded-xl bg-surface-subtle border border-border text-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-200">
                          No External Sources Available
                        </h4>
                        <p className="text-xs text-slate-400">
                          No qualifying external corporate filings or confirmed news reports match this event window.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {details.sources.map((src, idx) => (
                          <a
                            key={idx}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 rounded-xl bg-surface-subtle border border-border hover:border-indigo-500/50 transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-indigo-400">
                                    {src.publisher}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-slate-400 border border-border">
                                    {src.sourceType}
                                  </span>
                                </div>
                                <h5 className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-indigo-200 transition-colors leading-snug">
                                  {src.title}
                                </h5>
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{new Date(src.publishedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Tab: PRICE & CHART */}
                {activeTab === 'price' && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Historical Trajectory
                      </h4>
                      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-lg border border-border text-xs">
                        {(['1D', '1W', '1M'] as const).map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() => setChartRange(range)}
                            className={cn(
                              'px-2.5 py-1 rounded font-semibold transition-colors',
                              chartRange === range
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-slate-200'
                            )}
                          >
                            {range}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mini Price Visualizer */}
                    <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                      {details.price.series1M && details.price.series1M.length > 0 ? (
                        <div className="h-44 flex items-end gap-1.5 pt-4 pb-2">
                          {(() => {
                            const data =
                              chartRange === '1D'
                                ? details.price.series1D
                                : chartRange === '1W'
                                ? details.price.series1W
                                : details.price.series1M;

                            const prices = data.map((d) => d.price);
                            const min = Math.min(...prices);
                            const max = Math.max(...prices);
                            const range = max - min || 1;

                            return data.map((d, i) => {
                              const heightPct = Math.max(10, Math.min(100, ((d.price - min) / range) * 90 + 10));
                              const isLast = i === data.length - 1;

                              return (
                                <div
                                  key={i}
                                  className="flex-1 flex flex-col items-center justify-end h-full group relative"
                                >
                                  {/* Tooltip on hover */}
                                  <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-100 whitespace-nowrap z-10 transition-opacity">
                                    {formatMoney(d.price, item.currency)}
                                  </div>
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={cn(
                                      'w-full rounded-t-sm transition-all',
                                      isLast
                                        ? 'bg-indigo-500'
                                        : 'bg-indigo-500/40 group-hover:bg-indigo-500/70'
                                    )}
                                  />
                                </div>
                              );
                            });
                          })()}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-xs text-slate-400">
                          Price chart data currently syncing.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. Tab: ALERTS */}
                {activeTab === 'alert' && (
                  <div className="space-y-5 animate-fade-in">
                    {details.alert ? (
                      <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <Bell className="w-4 h-4 fill-emerald-400/20" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            Active Price Alert Triggered
                          </h4>
                        </div>
                        <p className="text-xs text-slate-300">
                          Target threshold: {formatMoney(details.alert.threshold, item.currency)} ({details.alert.alertType})
                        </p>
                      </div>
                    ) : (
                      <div className="p-8 rounded-xl bg-surface-subtle border border-border text-center space-y-3">
                        <Bell className="w-8 h-8 text-slate-500 mx-auto" />
                        <h4 className="text-sm font-bold text-slate-200">
                          No Active Alerts for {item.stockSymbol}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Set up custom threshold alerts on the Watchlist page to get notified immediately when price surges or drops exceed limits.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-xs text-slate-400">
                Failed to load details.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
