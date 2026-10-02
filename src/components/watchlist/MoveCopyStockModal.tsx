import React, { useState, useEffect } from 'react';
import { Copy, FolderInput, ArrowRight, AlertCircle } from 'lucide-react';
import { Modal } from '../common';
import { useMarketStore } from '../../store/useMarketStore';

interface MoveCopyStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stockSymbol: string | null;
  currentWatchlistId?: string;
}

export const MoveCopyStockModal: React.FC<MoveCopyStockModalProps> = ({
  isOpen,
  onClose,
  stockSymbol,
  currentWatchlistId,
}) => {
  const { userWatchlists, watchlistOverview, copyStockToWatchlist, moveStockToWatchlist } = useMarketStore();

  const [mode, setMode] = useState<'copy' | 'move'>('copy');
  const [targetWatchlistId, setTargetWatchlistId] = useState<string>('');
  const [sourceWatchlistId, setSourceWatchlistId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find stock's current watchlist memberships from overview
  const stockOverview = watchlistOverview?.stocks.find((s) => s.symbol === stockSymbol);
  const memberWatchlistIds = stockOverview?.watchlistIds || [];

  // Available destination watchlists (for copy, prefer lists where stock is not present)
  useEffect(() => {
    if (isOpen && stockSymbol) {
      setError(null);
      setIsSubmitting(false);

      // Determine initial source watchlist
      let initialSource = currentWatchlistId && currentWatchlistId !== 'all' ? currentWatchlistId : '';
      if (!initialSource && memberWatchlistIds.length > 0) {
        initialSource = memberWatchlistIds[0];
      }
      setSourceWatchlistId(initialSource);

      // Determine initial target watchlist
      const candidate = userWatchlists.find(
        (w) => w.id !== initialSource && !memberWatchlistIds.includes(w.id)
      );
      if (candidate) {
        setTargetWatchlistId(candidate.id);
      } else {
        const anyOther = userWatchlists.find((w) => w.id !== initialSource);
        setTargetWatchlistId(anyOther ? anyOther.id : '');
      }
    }
  }, [isOpen, stockSymbol, currentWatchlistId, userWatchlists]);

  if (!isOpen || !stockSymbol) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!targetWatchlistId) {
      setError('Please select a destination watchlist.');
      return;
    }

    if (mode === 'move') {
      const sourceId = currentWatchlistId && currentWatchlistId !== 'all' ? currentWatchlistId : sourceWatchlistId;
      if (!sourceId) {
        setError('Please select the source watchlist to move from.');
        return;
      }
      if (sourceId === targetWatchlistId) {
        setError('Source and destination watchlists must be different.');
        return;
      }

      setIsSubmitting(true);
      const success = await moveStockToWatchlist(stockSymbol, sourceId, targetWatchlistId);
      setIsSubmitting(false);
      if (success) onClose();
    } else {
      if (memberWatchlistIds.includes(targetWatchlistId)) {
        setError(`${stockSymbol} is already in the selected destination watchlist.`);
        return;
      }

      setIsSubmitting(true);
      const success = await copyStockToWatchlist(stockSymbol, targetWatchlistId);
      setIsSubmitting(false);
      if (success) onClose();
    }
  };

  const isCurrentViewAll = !currentWatchlistId || currentWatchlistId === 'all';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${mode === 'copy' ? 'Copy' : 'Move'} ${stockSymbol}`}
      subtitle="Organize equities across your custom watchlists"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Switcher: Copy vs Move */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-subtle border border-border">
          <button
            type="button"
            onClick={() => setMode('copy')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'copy'
                ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy to Watchlist</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('move')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'move'
                ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderInput className="w-3.5 h-3.5" />
            <span>Move to Watchlist</span>
          </button>
        </div>

        {/* Source Watchlist Selector (Only if in 'all' view and moving) */}
        {mode === 'move' && isCurrentViewAll && memberWatchlistIds.length > 1 && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Move from Watchlist:
            </label>
            <select
              value={sourceWatchlistId}
              onChange={(e) => setSourceWatchlistId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              {userWatchlists
                .filter((w) => memberWatchlistIds.includes(w.id))
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.isDefault ? '(Default)' : ''}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Target Destination Watchlist Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300">
            Destination Watchlist:
          </label>
          <select
            value={targetWatchlistId}
            onChange={(e) => setTargetWatchlistId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
          >
            <option value="" disabled>Select destination watchlist...</option>
            {userWatchlists.map((w) => {
              const isSource = w.id === (currentWatchlistId && currentWatchlistId !== 'all' ? currentWatchlistId : sourceWatchlistId);
              const alreadyMember = memberWatchlistIds.includes(w.id);
              return (
                <option key={w.id} value={w.id} disabled={mode === 'move' ? isSource : alreadyMember}>
                  {w.name} {w.isDefault ? '(Default)' : ''} ({w.stockCount}/50)
                  {alreadyMember ? ' — (Already added)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        <p className="text-[11px] text-slate-400">
          {mode === 'copy'
            ? `Adds ${stockSymbol} to the destination watchlist while keeping it in existing watchlists.`
            : `Transfers ${stockSymbol} to the destination watchlist and removes it from the current watchlist.`}
        </p>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !targetWatchlistId}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors shadow-sm"
          >
            <span>{mode === 'copy' ? 'Copy Stock' : 'Move Stock'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
