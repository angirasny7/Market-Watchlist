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
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface FeedListCardProps {
  item: FeedItem;
  isSelected?: boolean;
  onSelect: (item: FeedItem) => void;
  onToggleRead: (item: FeedItem, e: React.MouseEvent) => void;
  onToggleSave: (item: FeedItem, e: React.MouseEvent) => void;
}

export const FeedListCard: React.FC<FeedListCardProps> = ({
  item,
  isSelected,
  onSelect,
  onToggleRead,
  onToggleSave,
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

  // Format date / relative time
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays === 0) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    } catch {
      return '';
    }
  };

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
        'group relative p-4 sm:p-5 rounded-2xl bg-surface border transition-all duration-200 cursor-pointer text-left focus:outline-none',
        isSelected
          ? 'border-indigo-500 ring-2 ring-indigo-500/30 bg-surface-subtle shadow-lg'
          : item.isUnread
          ? 'border-slate-700/80 hover:border-slate-600 bg-surface/90 hover:bg-surface-hover/80 shadow-sm'
          : 'border-border/60 hover:border-border bg-surface/50 hover:bg-surface/80 opacity-85 hover:opacity-100'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left column: Unread indicator + Main details */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Unread Status Dot */}
          <div className="pt-1 flex-shrink-0">
            {item.isUnread ? (
              <span
                title="Unread item"
                className="block w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-indigo-500/20"
              />
            ) : (
              <span className="block w-2.5 h-2.5 rounded-full bg-transparent" />
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            {/* Top row: Priority badge + Ticker + Company + Exchange + Date */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border text-[11px]',
                  pStyle.bg,
                  pStyle.text,
                  pStyle.border
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', pStyle.dot)} />
                {item.priorityLabel}
              </span>

              {item.isDemo && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Demo
                </span>
              )}

              {item.isNew && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  New
                </span>
              )}

              <span className="font-mono font-bold text-slate-100 text-sm tracking-wide">
                {item.stockSymbol}
              </span>

              <span className="text-slate-400 font-medium truncate max-w-[140px] sm:max-w-[220px]">
                {item.companyName}
              </span>

              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-subtle text-slate-400 border border-border/50">
                {item.exchange}
              </span>

              {item.isAlertTriggered && (
                <span title="Triggered your price alert" className="text-amber-400 flex items-center">
                  <Bell className="w-3.5 h-3.5 fill-amber-400/20" />
                </span>
              )}
            </div>

            {/* Dynamic Headline */}
            <h3 className={cn(
              'text-sm sm:text-base font-semibold text-slate-100 leading-snug group-hover:text-indigo-200 transition-colors',
              item.isUnread ? 'font-bold' : 'font-medium text-slate-200'
            )}>
              {item.headline}
            </h3>

            {/* Signal Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {item.signals.map((signal, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60"
                >
                  {signal.label}
                </span>
              ))}

              {item.extraSignalsCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800/40 text-slate-400 border border-slate-700/40">
                  +{item.extraSignalsCount} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Price / Change & Action Icons */}
        <div className="flex flex-col items-end justify-between gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm sm:text-base font-bold font-mono text-slate-100">
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

          {/* Timestamp and Quick Action buttons */}
          <div className="flex items-center gap-1.5 text-slate-400">
            <span className="text-[11px] font-medium text-slate-500 mr-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              {formatTime(item.date)}
            </span>

            {/* Save / Bookmark Button */}
            <button
              type="button"
              aria-label={item.isSaved ? 'Remove from saved' : 'Save for later'}
              title={item.isSaved ? 'Saved' : 'Save for later (s)'}
              onClick={(e) => onToggleSave(item, e)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                item.isSaved
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'bg-surface-subtle/60 border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
              )}
            >
              <Bookmark className={cn('w-3.5 h-3.5', item.isSaved && 'fill-amber-400')} />
            </button>

            {/* Mark Read/Unread Button */}
            <button
              type="button"
              aria-label={item.isUnread ? 'Mark as read' : 'Mark as unread'}
              title={item.isUnread ? 'Mark as read (r)' : 'Mark as unread (r)'}
              onClick={(e) => onToggleRead(item, e)}
              className={cn(
                'p-1.5 rounded-lg border transition-colors',
                !item.isUnread
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                  : 'bg-surface-subtle/60 border-border/60 text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
              )}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
