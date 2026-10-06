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
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatEventTime, formatEventTooltip, getSupportingSourceUrl } from '../../lib/formatEventTime';
import { formatPublishedTimestamp } from '../../lib/dateUtils';

interface FeedDetailsDrawerProps {
  isOpen: boolean;
  item: FeedItem | null;
  onClose: () => void;
  onToggleRead: (item: FeedItem) => void;
  onToggleSave: (item: FeedItem) => void;
  onDelete?: (item: FeedItem) => void;
  onViewStock?: (symbol: string) => void;
  initialTab?: string;
}

type TabType = 'happened' | 'why' | 'matters' | 'sources' | 'price' | 'alert';

export const FeedDetailsDrawer: React.FC<FeedDetailsDrawerProps> = ({
  isOpen,
  item,
  onClose,
  onToggleRead,
  onToggleSave,
  onDelete,
  onViewStock,
  initialTab = 'happened',
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab as TabType);
  const [details, setDetails] = useState<FeedItemDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [chartRange, setChartRange] = useState<'1D' | '1W' | '1M'>('1M');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

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
  const supportingUrl = getSupportingSourceUrl(item);

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
                <a
                  href={supportingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open supporting news or source website"
                  aria-label="Open supporting news or source website in new tab"
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-surface-hover border border-border/50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

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
                                <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                                  <Clock className="w-3 h-3 text-slate-500" />
                                  <span>{formatPublishedTimestamp(src.publishedAt)}</span>
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

                {/* 5. Tab: PRICE & CONTEXT */}
                {activeTab === 'price' && (
                  <div className="space-y-5 animate-fade-in">
                    {/* Range Buttons & Headline */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Price Action & Context
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Historical trend leading up to this event
                        </p>
                      </div>

                      <div className="flex items-center gap-1 p-1 bg-surface-subtle rounded-xl border border-border text-xs">
                        {(['1D', '1W', '1M'] as const).map((range) => (
                          <button
                            key={range}
                            type="button"
                            onClick={() => {
                              setChartRange(range);
                              setHoveredPointIndex(null);
                            }}
                            className={cn(
                              'px-3 py-1 rounded-lg font-semibold transition-colors cursor-pointer',
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

                    {(() => {
                      // Resolve Active Series Data
                      const rawData =
                        chartRange === '1D'
                          ? details.price.series1D
                          : chartRange === '1W'
                          ? details.price.series1W
                          : details.price.series1M;

                      const data = (rawData && rawData.length > 0)
                        ? rawData
                        : [
                            { timestamp: new Date(Date.now() - 30 * 86400000).toISOString(), price: (item.currentPrice ?? 100) * 0.95, volume: 100000 },
                            { timestamp: new Date().toISOString(), price: item.currentPrice ?? 100, volume: 150000 }
                          ];

                      const prices = data.map((d) => d.price);
                      const startPrice = prices[0];
                      const endPrice = prices[prices.length - 1];
                      const minPrice = Math.min(...prices);
                      const maxPrice = Math.max(...prices);
                      const priceDelta = endPrice - startPrice;
                      const periodReturn = startPrice > 0 ? (priceDelta / startPrice) * 100 : 0;
                      const isPeriodPositive = periodReturn >= 0;

                      // Active hovered point or last point
                      const activeIdx = hoveredPointIndex !== null && hoveredPointIndex < data.length ? hoveredPointIndex : data.length - 1;
                      const activePoint = data[activeIdx];
                      const activePrice = activePoint.price;
                      const activeDelta = activePrice - startPrice;
                      const activeReturn = startPrice > 0 ? (activeDelta / startPrice) * 100 : 0;

                      // SVG Dimensions
                      const width = 500;
                      const height = 180;
                      const padding = { top: 20, right: 65, bottom: 25, left: 15 };
                      const chartW = width - padding.left - padding.right;
                      const chartH = height - padding.top - padding.bottom;
                      const rangeVal = maxPrice - minPrice || 1;

                      // Coordinate mapper
                      const points = data.map((d, i) => {
                        const x = padding.left + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
                        const y = padding.top + chartH - ((d.price - minPrice) / rangeVal) * chartH;
                        return { x, y, ...d };
                      });

                      // SVG Line Path & Area Path
                      const linePath = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
                      const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

                      return (
                        <div className="space-y-4">
                          {/* 1. At-a-Glance Period Metrics Card */}
                          <div className="p-4 rounded-2xl bg-surface-subtle border border-border/80 space-y-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-[11px] text-slate-400 font-medium">
                                  {chartRange === '1D' ? '1-Day Range' : chartRange === '1W' ? '1-Week Trend' : '1-Month Trajectory'}
                                </span>
                                <div className="flex items-baseline gap-2 mt-0.5">
                                  <span className="text-xl font-bold font-mono text-slate-100">
                                    {formatMoney(activePrice, item.currency)}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-xs font-bold font-mono flex items-center gap-0.5',
                                      activeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                    )}
                                  >
                                    {activeReturn >= 0 ? '+' : ''}{activeReturn.toFixed(2)}% ({activeDelta >= 0 ? '+' : ''}{formatMoney(activeDelta, item.currency)})
                                  </span>
                                </div>
                              </div>

                              <div className="text-right text-xs space-y-0.5 font-mono">
                                <div className="text-slate-400">
                                  High: <span className="text-emerald-400 font-semibold">{formatMoney(maxPrice, item.currency)}</span>
                                </div>
                                <div className="text-slate-400">
                                  Low: <span className="text-rose-400 font-semibold">{formatMoney(minPrice, item.currency)}</span>
                                </div>
                              </div>
                            </div>

                            {/* 2. Interactive SVG Area Chart */}
                            <div className="relative pt-2">
                              <svg
                                viewBox={`0 0 ${width} ${height}`}
                                className="w-full h-44 select-none overflow-visible"
                                onMouseLeave={() => setHoveredPointIndex(null)}
                              >
                                <defs>
                                  <linearGradient id="feedPriceGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.35" />
                                    <stop offset="90%" stopColor={isPeriodPositive ? '#10b981' : '#f43f5e'} stopOpacity="0.0" />
                                  </linearGradient>
                                </defs>

                                {/* Horizontal Reference Gridlines */}
                                {[0, 0.5, 1].map((ratio, gIdx) => {
                                  const y = padding.top + chartH * ratio;
                                  const priceLabel = maxPrice - ratio * rangeVal;
                                  return (
                                    <g key={gIdx}>
                                      <line
                                        x1={padding.left}
                                        y1={y}
                                        x2={padding.left + chartW}
                                        y2={y}
                                        stroke="rgba(51, 65, 85, 0.4)"
                                        strokeDasharray="3 3"
                                      />
                                      <text
                                        x={padding.left + chartW + 6}
                                        y={y + 3.5}
                                        fill="#94a3b8"
                                        fontSize="9"
                                        fontFamily="monospace"
                                      >
                                        {formatMoney(priceLabel, item.currency)}
                                      </text>
                                    </g>
                                  );
                                })}

                                {/* Area fill */}
                                <path d={areaPath} fill="url(#feedPriceGrad)" />

                                {/* Main Curve Line */}
                                <path
                                  d={linePath}
                                  fill="none"
                                  stroke={isPeriodPositive ? '#10b981' : '#f43f5e'}
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />

                                {/* Interactive Touch / Hover Hotspots */}
                                {points.map((p, idx) => (
                                  <circle
                                    key={idx}
                                    cx={p.x}
                                    cy={p.y}
                                    r="8"
                                    fill="transparent"
                                    className="cursor-crosshair"
                                    onMouseEnter={() => setHoveredPointIndex(idx)}
                                    onTouchStart={() => setHoveredPointIndex(idx)}
                                  />
                                ))}

                                {/* Active Hover Marker / Guideline */}
                                {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                                  <g>
                                    <line
                                      x1={points[hoveredPointIndex].x}
                                      y1={padding.top}
                                      x2={points[hoveredPointIndex].x}
                                      y2={padding.top + chartH}
                                      stroke="#818cf8"
                                      strokeWidth="1.5"
                                      strokeDasharray="2 2"
                                    />
                                    <circle
                                      cx={points[hoveredPointIndex].x}
                                      cy={points[hoveredPointIndex].y}
                                      r="4.5"
                                      fill="#818cf8"
                                      stroke="#0f172a"
                                      strokeWidth="2"
                                    />
                                  </g>
                                )}

                                {/* X-axis Date Ticks */}
                                {points.length > 1 && (
                                  <>
                                    <text
                                      x={padding.left}
                                      y={height - 5}
                                      fill="#64748b"
                                      fontSize="9"
                                      fontFamily="sans-serif"
                                    >
                                      {new Date(data[0].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </text>
                                    <text
                                      x={padding.left + chartW}
                                      y={height - 5}
                                      fill="#64748b"
                                      fontSize="9"
                                      fontFamily="sans-serif"
                                      textAnchor="end"
                                    >
                                      {new Date(data[data.length - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                    </text>
                                  </>
                                )}
                              </svg>

                              {/* Hover Floating Info */}
                              {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                                <div className="text-[11px] font-mono text-center text-indigo-300 pt-1">
                                  Point: {new Date(points[hoveredPointIndex].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {formatMoney(points[hoveredPointIndex].price, item.currency)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3. Trading Ranges (Day & 52-Week Channels) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Day Range Channel */}
                            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-300">Day Range</span>
                                <span className="font-mono text-slate-400 text-[11px]">
                                  {formatMoney(details.happened.dayLow, item.currency)} - {formatMoney(details.happened.dayHigh, item.currency)}
                                </span>
                              </div>
                              {/* Range Visual Track */}
                              {details.happened.dayLow !== null && details.happened.dayHigh !== null && (
                                <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    style={{
                                      width: `${Math.max(5, Math.min(100, (((details.happened.currentPrice ?? activePrice) - details.happened.dayLow) / ((details.happened.dayHigh - details.happened.dayLow) || 1)) * 100))}%`
                                    }}
                                    className={cn(
                                      'h-full rounded-full',
                                      isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                                    )}
                                  />
                                </div>
                              )}
                            </div>

                            {/* 52-Week Range Channel */}
                            <div className="p-3.5 rounded-xl bg-surface-subtle border border-border space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-300">52-Week Range</span>
                                <span className="font-mono text-slate-400 text-[11px]">
                                  {formatMoney(details.happened.low52w, item.currency)} - {formatMoney(details.happened.high52w, item.currency)}
                                </span>
                              </div>
                              {/* 52W Visual Track */}
                              {details.happened.low52w !== null && details.happened.high52w !== null && (
                                <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    style={{
                                      width: `${Math.max(5, Math.min(100, (((details.happened.currentPrice ?? activePrice) - details.happened.low52w) / ((details.happened.high52w - details.happened.low52w) || 1)) * 100))}%`
                                    }}
                                    className="h-full bg-indigo-500 rounded-full"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
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

          {/* Sticky Drawer Footer with Primary Actions */}
          <div className="p-4 border-t border-border/80 bg-surface/95 backdrop-blur flex items-center justify-between gap-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => item && onToggleSave(item)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150',
                  item?.isSaved
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm'
                    : 'bg-surface-subtle border-border text-slate-300 hover:text-white hover:bg-surface-hover'
                )}
              >
                <Bookmark className={cn('w-4 h-4', item?.isSaved && 'fill-amber-400')} />
                <span>{item?.isSaved ? 'Saved in Memory' : 'Save for later'}</span>
              </button>

              <button
                type="button"
                onClick={() => item && onToggleRead(item)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-150',
                  !item?.isUnread
                    ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent shadow-sm'
                )}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{item?.isUnread ? 'Mark as read' : 'Read'}</span>
              </button>

              {onDelete && (
                <button
                  type="button"
                  onClick={() => item && onDelete(item)}
                  title="Delete update"
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold border border-border/80 bg-surface-subtle text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all duration-150"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {onViewStock && item && (
                <button
                  type="button"
                  onClick={() => onViewStock(item.stockSymbol)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-surface-subtle border border-border text-indigo-300 hover:text-white hover:bg-surface-hover transition-colors"
                >
                  View stock
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-surface-subtle transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
