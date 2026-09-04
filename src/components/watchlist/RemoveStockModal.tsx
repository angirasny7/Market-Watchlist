import React from 'react';
import { AlertTriangle, Trash2, History } from 'lucide-react';
import { Modal } from '../common';
import { StockQuote } from '../../types/stock';
import { useMarketStore } from '../../store/useMarketStore';

interface RemoveStockModalProps {
  stock: StockQuote | null;
  onClose: () => void;
}

export const RemoveStockModal: React.FC<RemoveStockModalProps> = ({
  stock,
  onClose,
}) => {
  const { removeStock } = useMarketStore();

  if (!stock) return null;

  const handleConfirm = () => {
    removeStock(stock.symbol);
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(stock)}
      onClose={onClose}
      title="Remove from Watchlist"
      subtitle={`Confirming removal of ${stock.name} (${stock.symbol})`}
      maxWidth="md"
      footer={
        <div className="w-full flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Remove</span>
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs sm:text-sm">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-slate-100">
              You are removing {stock.name} ({stock.symbol}) from active tracking.
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              This will un-monitor real-time price anomalies for this equity on your personal dashboard and attention feed.
            </p>
          </div>
        </div>

        {/* Market Memory preservation guarantee note */}
        <div className="p-3.5 rounded-xl bg-surface-subtle border border-border flex items-start gap-2.5 text-xs text-slate-400">
          <History className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-200">Historical Context Preserved:</strong> Historical Market Memory entries, causal insights, and past digests referencing {stock.symbol} will remain permanently preserved and searchable.
          </p>
        </div>
      </div>
    </Modal>
  );
};
