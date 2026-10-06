import React, { useState } from 'react';
import { ArchivedMarketEvent } from '../../types/memory';
import { formatMoney } from '../../lib/formatMoney';
import {
  Bookmark,
  TrendingUp,
  TrendingDown,
  Clock,
  ChevronRight,
  Archive,
  FileText,
  Edit2,
  Check,
  Trash2,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MemoryEventCardProps {
  item: ArchivedMarketEvent;
  tab: 'saved' | 'read' | 'deleted';
  onSelect: (item: ArchivedMarketEvent) => void;
  onUnsave?: (item: ArchivedMarketEvent, e: React.MouseEvent) => void;
  onDelete?: (item: ArchivedMarketEvent, e: React.MouseEvent) => void;
  onUpdateNote?: (item: ArchivedMarketEvent, note: string | null) => Promise<void>;
}

export const MemoryEventCard: React.FC<MemoryEventCardProps> = ({
  item,
  tab,
  onSelect,
  onUnsave,
  onDelete,
  onUpdateNote,
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(item.note || '');
  const [isSavingNote, setIsSavingNote] = useState(false);

  const isPositive = (item.dayChangePercent ?? item.changePercent ?? 0) >= 0;

  const priorityStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    CRITICAL: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/30',
      dot: 'bg-rose-500',
    },
    HIGH: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
      dot: 'bg-amber-500',
    },
    MEDIUM: {
      bg: 'bg-sky-500/10',
      text: 'text-sky-400',
      border: 'border-sky-500/30',
      dot: 'bg-sky-400',
    },
    LOW: {
      bg: 'bg-slate-500/10',
      text: 'text-slate-400',
      border: 'border-slate-500/30',
      dot: 'bg-slate-500',
    },
  };

  const priorityKey = (item.priority || 'LOW').toString().toUpperCase();
  const pStyle = priorityStyles[priorityKey] || priorityStyles.LOW;

  const formatCardDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const day = d.toLocaleDateString('en-US', { day: 'numeric' });
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${weekday} ${day} ${month}, ${time}`;
  };

  const handledDateLabel =
    tab === 'saved'
      ? item.savedAt
        ? `Saved on ${formatCardDate(item.savedAt)}`
        : 'Saved'
      : tab === 'deleted'
      ? item.deletedAt
        ? `Deleted on ${formatCardDate(item.deletedAt)}`
        : 'Deleted'
      : item.readAt
      ? `Read on ${formatCardDate(item.readAt)}`
      : 'Read';

  const occurredDateLabel = item.timestamp || item.occurredAt
    ? `Occurred on ${formatCardDate(item.timestamp || item.occurredAt)}`
    : '';

  const isAutoArchived = item.readSource === 'auto';
  const currency = item.currency || item.stock?.currency || '₹';
  const currentPrice = item.currentPrice ?? item.stock?.currentPrice ?? item.price;
  const priceAtSave = item.priceAtSave;
  const priceChangeSinceSaved = item.priceChangeSinceSaved;

  const handleSaveNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateNote) return;
    setIsSavingNote(true);
    try {
      await onUpdateNote(item, noteText.trim() || null);
      setIsEditingNote(false);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleCancelNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteText(item.note || '');
    setIsEditingNote(false);
  };

  const handleDeleteNote = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateNote) return;
    setIsSavingNote(true);
    try {
      await onUpdateNote(item, null);
      setNoteText('');
      setIsEditingNote(false);
    } finally {
      setIsSavingNote(false);
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
      className="group relative p-4 sm:p-5 rounded-2xl bg-surface border border-border/80 hover:border-slate-600 transition-all duration-200 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-sm hover:shadow-md space-y-3"
    >
      {/* 1. Header Row: Left Metadata & Right Live Price */}
      <div className="flex items-start justify-between gap-3">
        {/* Left: Priority badge + Ticker + Company + Action timestamp */}
        <div className="flex flex-wrap items-center gap-2 text-xs min-w-0">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border text-[11px]',
              pStyle.bg,
              pStyle.text,
              pStyle.border
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', pStyle.dot)} />
            {item.priority === 'CRITICAL'
              ? 'Urgent'
              : item.priority === 'HIGH'
              ? 'Important'
              : item.priority === 'MEDIUM'
              ? 'Worth a look'
              : 'FYI'}
          </span>

          <span className="font-mono font-bold text-slate-100 text-sm tracking-wide">
            {item.stockSymbol}
          </span>

          <span className="text-slate-400 font-medium truncate max-w-[150px] sm:max-w-[240px]">
            {item.companyName}
          </span>

          {/* Handled Date / Auto-archived Badge */}
          {isAutoArchived ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
              <Archive className="w-3 h-3 text-slate-400" />
              Auto-archived
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              {handledDateLabel}
            </span>
          )}
        </div>

        {/* Right: Live Price & Day Change */}
        <div className="flex flex-col items-end shrink-0 text-right">
          <div className="text-sm sm:text-base font-bold font-mono text-slate-100">
            {formatMoney(currentPrice, currency)}
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
              {(item.dayChangePercent ?? item.changePercent ?? 0).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Middle Body: Headline, Summary & Note Details */}
      <div className="space-y-2">
        <h3 className="text-sm sm:text-base font-semibold text-slate-100 leading-snug group-hover:text-indigo-200 transition-colors">
          {item.headline || item.whatHappened}
        </h3>

        {item.whatHappened && item.whatHappened !== item.headline && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {item.whatHappened}
          </p>
        )}

        {/* Price at Save vs Current Price Comparison (Saved tab) */}
        {tab === 'saved' && priceAtSave && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400">Saved at:</span>
            <span className="font-mono font-semibold text-slate-200">
              {formatMoney(priceAtSave, currency)}
            </span>
            {currentPrice && (
              <>
                <span className="text-slate-500">→</span>
                <span className="font-mono font-semibold text-slate-100">
                  {formatMoney(currentPrice, currency)}
                </span>
                {priceChangeSinceSaved !== null && priceChangeSinceSaved !== undefined && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono',
                      priceChangeSinceSaved >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    )}
                  >
                    {priceChangeSinceSaved >= 0 ? '+' : ''}
                    {priceChangeSinceSaved.toFixed(2)}% since saved
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {/* Private Note Content / Editor (Saved Tab) */}
        {tab === 'saved' && isEditingNote && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="p-3 rounded-xl bg-slate-900/90 border border-indigo-500/40 space-y-2 mt-2"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1 text-indigo-300">
                <FileText className="w-3.5 h-3.5" />
                <span>Private Note</span>
              </span>
              <span>{noteText.length} / 500</span>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value.slice(0, 500))}
              placeholder="Add your notes or hypothesis about this event..."
              className="w-full h-20 p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              autoFocus
            />
            <div className="flex items-center justify-between pt-1">
              {item.note ? (
                <button
                  type="button"
                  onClick={handleDeleteNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete note</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelNote}
                  disabled={isSavingNote}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>{isSavingNote ? 'Saving...' : 'Save Note'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'saved' && !isEditingNote && item.note && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setIsEditingNote(true);
            }}
            className="group/note p-2.5 sm:p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40 transition-colors cursor-pointer space-y-1 mt-2"
          >
            <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
              <span className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span>Note</span>
              </span>
              <span className="opacity-0 group-hover/note:opacity-100 transition-opacity flex items-center gap-0.5 text-xs text-amber-300">
                <Edit2 className="w-3 h-3" />
                <span>Edit</span>
              </span>
            </div>
            <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
              {item.note}
            </p>
          </div>
        )}
      </div>

      {/* 3. Footer Row: Occurred Date + Action Toolbar + View Details */}
      <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs text-slate-400 gap-3 flex-wrap">
        <span className="text-slate-500 text-[11px]">
          {occurredDateLabel}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          {/* Add / Edit Note Button (Positioned to the left of Unsave in Saved tab) */}
          {tab === 'saved' && onUpdateNote && (
            <button
              type="button"
              aria-label={item.note ? 'Edit note' : 'Add note'}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingNote(true);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 text-xs font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{item.note ? 'Edit note' : '+ Add note'}</span>
            </button>
          )}

          {/* Unsave Button */}
          {tab === 'saved' && onUnsave && (
            <button
              type="button"
              aria-label="Unsave item"
              title="Remove from saved"
              onClick={(e) => onUnsave(item, e)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 fill-amber-300" />
              <span>Unsave</span>
            </button>
          )}

          {/* Delete Button (Saved/Read: Move to Deleted; Deleted tab: Delete Permanently) */}
          {onDelete && (
            <button
              type="button"
              aria-label={tab === 'deleted' ? 'Delete permanently' : 'Delete item'}
              title={tab === 'deleted' ? 'Permanently remove from archive' : 'Move to Deleted (stored for 30 days)'}
              onClick={(e) => onDelete(item, e)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{tab === 'deleted' ? 'Delete Permanently' : 'Delete'}</span>
            </button>
          )}

          {/* View Details Affordance */}
          <div className="flex items-center gap-1 text-indigo-400 group-hover:text-indigo-300 font-semibold transition-colors text-xs ml-1.5">
            <span>View details</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};
