import React from 'react';
import { FeedItem } from '../../types/feed';
import { formatMoney } from '../../lib/formatMoney';
import {
  Bookmark,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Bell,
  Clock,
  Sparkles,
  ChevronRight,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { formatEventTime, formatEventTooltip, getSupportingSourceUrl } from '../../lib/formatEventTime';

interface FeedListCardProps {
  item: FeedItem;
  isSelected?: boolean;
  onSelect: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleSave: (item: FeedItem, e: React.MouseEvent) => void;
  onDelete?: (item: FeedItem, e: React.MouseEvent) => void;
}

export const FeedListCard: React.FC<FeedListCardProps> = ({
  item,
  isSelected,
  onSelect,
  onToggleRead,
  onToggleSave,
  onDelete,
}) => {
  const isPositive = item.changePercent >= 0;

  // Priority chip styling
  const priorityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    Urgent: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
    },
    Important: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    'Worth a look': {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      dot: 'bg-sky-400',
    },
    FYI: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      dot: 'bg-slate-500',
    },
  };

  const pStyle = priorityStyles[item.priorityLabel] || priorityStyles.FYI;
  const timeLabel = formatEventTime(item);
  const timeTooltip = formatEventTooltip(item);
  const supportingUrl = getSupportingSourceUrl(item);

  // Secondary explanatory context to fill the card story
  const contextSnippet = item.whyShown || (item.signals.length > 0 ? `Triggered by ${item.signals.map(s => s.label).join(', ')}` : 'Market activity detected across monitored watchlist');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        'group relative p-4 rounded-xl bg-surface border transition-all duration-150 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-surface-subtle shadow-lg'
          : item.isUnread
          ? 'border-slate-700/90 hover:border-slate-600 bg-surface/95 hover:bg-surface-hover/90 shadow-sm'
          : 'border-border/60 hover:border-border bg-surface/60 hover:bg-surface/90 opacity-90 hover:opacity-100'
      )}
    >
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* 1. Left Section: Ticker, Headline, Explanation, and Badges */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Header Row: Priority + Symbol + Company + Badges */}
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {/* Unread Status Dot */}
            {item.isUnread ? (
              <span
                title="Unread item"
                className="w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30 shrink-0"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-transparent shrink-0" />
            )}

            {/* Priority Badge */}
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border text-[10px]',
                pStyle.bg,
                pStyle.text,
                pStyle.border
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', pStyle.dot)} />
              {item.priorityLabel}
            </span>

            {item.isDemo && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Demo
              </span>
            )}

            {item.isNew && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5" />
                New
              </span>
            )}

            {item.isUpdated && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Updated
              </span>
            )}

            {/* Stock Symbol */}
            <span className="font-mono font-bold text-slate-100 text-sm tracking-wide">
              {item.stockSymbol}
            </span>

            {/* Company Name */}
            <span className="text-slate-400 font-medium text-xs truncate max-w-[160px] sm:max-w-[260px]">
              {item.companyName}
            </span>

            {/* Exchange Pill */}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-slate-400 border border-border/50">
              {item.exchange}
            </span>

            {item.isAlertTriggered && (
              <span title="Triggered your price alert" className="text-amber-400 flex items-center">
                <Bell className="w-3.5 h-3.5 fill-amber-400/20" />
              </span>
            )}
          </div>

          {/* Headline */}
          <h3
            className={cn(
              'text-sm sm:text-base font-semibold text-slate-100 leading-snug group-hover:text-indigo-200 transition-colors',
              item.isUnread ? 'font-bold text-white' : 'font-semibold text-slate-200'
            )}
          >
            {item.headline}
          </h3>

          {/* Explanatory Context Subtitle */}
          <p className="text-xs text-slate-400 leading-relaxed line-clamp-1">
            {contextSnippet}
          </p>

          {/* Bottom Tags / Content Availability */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            {item.signals.map((signal, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/90 text-indigo-200 border border-slate-700/70 font-mono"
              >
                {signal.label}
              </span>
            ))}

            {item.extraSignalsCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-800/40 text-slate-400 border border-slate-700/40">
                +{item.extraSignalsCount} more
              </span>
            )}

            <div className="flex items-center gap-1 text-[10px] text-slate-500 ml-1">
              <span>Inside:</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border/50 text-slate-300">
                What happened
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border/50 text-slate-300">
                Why
              </span>
              <span className="px-1.5 py-0.5 rounded bg-surface-subtle border border-border/50 text-slate-300">
                Price chart
              </span>
              {item.isAlertTriggered && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium flex items-center gap-0.5">
                  <Bell className="w-2.5 h-2.5" /> Alert
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. Right Section: Price, Day Change, Timestamp & Quick Actions */}
        <div className="flex flex-col items-end justify-between gap-2.5 shrink-0 min-w-[140px]">
          {/* Price & Change */}
          <div className="text-right">
            <div className="text-base sm:text-lg font-bold font-mono text-slate-100 tracking-tight">
              {formatMoney(item.currentPrice ?? item.eventPrice, item.currency)}
            </div>
            <div
              className={cn(
                'inline-flex items-center gap-0.5 text-xs font-semibold font-mono mt-0.5',
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>
                {isPositive ? '+' : ''}
                {item.changePercent.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Timestamp & Action Buttons */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span
              title={timeTooltip}
              className="text-[11px] font-mono text-slate-400 hover:text-slate-300 mr-1 flex items-center gap-1 transition-colors cursor-help"
            >
              <Clock className="w-3 h-3 text-slate-400" />
              {timeLabel}
            </span>

            {/* External Source Link */}
            <a
              href={supportingUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open supporting news or market source website"
              aria-label="Open supporting news or market source website in new tab"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg border border-border/60 bg-surface-subtle/60 text-slate-400 hover:text-indigo-300 hover:bg-surface-hover hover:border-border transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Save / Bookmark Button */}
            <button
              type="button"
              aria-label={item.isSaved ? 'Remove from saved' : 'Save for later'}
              title={item.isSaved ? 'Saved to Market Memory' : 'Save for later (s)'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(item, e);
              }}
              className={cn(
                'p-1.5 rounded-lg border transition-all',
                item.isSaved
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-sm'
                  : 'bg-surface-subtle/60 border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover hover:border-border'
              )}
            >
              <Bookmark className={cn('w-3.5 h-3.5', item.isSaved && 'fill-amber-400')} />
            </button>

            {/* Mark Read/Unread Button */}
            <button
              type="button"
              aria-label={item.isUnread ? 'Mark as read' : 'Mark as unread'}
              title={item.isUnread ? 'Mark as read (r)' : 'Mark as unread (r)'}
              onClick={(e) => {
                e.stopPropagation();
                onToggleRead(item, e);
              }}
              className={cn(
                'p-1.5 rounded-lg border transition-all',
                !item.isUnread
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400 shadow-sm'
                  : 'bg-surface-subtle/60 border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover hover:border-border'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>

            {/* Delete Button */}
            {onDelete && (
              <button
                type="button"
                aria-label="Delete update"
                title="Delete update (d)"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item, e);
                }}
                className="p-1.5 rounded-lg border border-border/60 bg-surface-subtle/60 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Details Link */}
          <div className="flex items-center gap-0.5 text-xs text-indigo-400 group-hover:text-indigo-300 font-semibold transition-colors mt-0.5">
            <span>View details</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
