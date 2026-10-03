import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, Trash2, AlertCircle } from 'lucide-react';
import { WatchlistStockItem } from '../../lib/watchlistFilters';
import { alertService, AlertItem, AlertType } from '../../services/alertService';

interface AlertFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSymbol?: string;
  stocks: WatchlistStockItem[];
  onAlertCreated?: () => void;
}

export const AlertFormModal: React.FC<AlertFormModalProps> = ({
  isOpen,
  onClose,
  targetSymbol,
  stocks,
  onAlertCreated,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState(targetSymbol || stocks[0]?.symbol || '');
  const [alertType, setAlertType] = useState<AlertType>('PRICE_ABOVE');
  const [targetValue, setTargetValue] = useState('');
  const [existingAlerts, setExistingAlerts] = useState<AlertItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);

  const activeStock = stocks.find((s) => s.symbol === selectedSymbol) || stocks[0];
  const currency = activeStock?.currency || '₹';

  // Synchronize selectedSymbol on targetSymbol change or modal open
  useEffect(() => {
    if (isOpen) {
      const initialSymbol = targetSymbol || stocks[0]?.symbol || '';
      setSelectedSymbol(initialSymbol);
      const stock = stocks.find((s) => s.symbol === initialSymbol);
      if (stock && stock.currentPrice !== null) {
        // Pre-fill target price slightly above current price
        setTargetValue((stock.currentPrice * 1.02).toFixed(2));
      } else {
        setTargetValue('');
      }
      setError(null);
      setSuccessMsg(null);
      loadExistingAlerts();
    }
  }, [isOpen, targetSymbol]);

  // Load user's alerts to show any existing alerts for the selected stock
  const loadExistingAlerts = async () => {
    try {
      const alerts = await alertService.getAlerts();
      setExistingAlerts(alerts);
    } catch {
      // Ignore background load error
    }
  };

  // Keyboard escape handler & focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleStockChange = (newSymbol: string) => {
    setSelectedSymbol(newSymbol);
    const stock = stocks.find((s) => s.symbol === newSymbol);
    if (stock) {
      if (alertType === 'PRICE_ABOVE') {
        setTargetValue(stock.currentPrice !== null ? (stock.currentPrice * 1.02).toFixed(2) : '');
      } else if (alertType === 'PRICE_BELOW') {
        setTargetValue(stock.currentPrice !== null ? (stock.currentPrice * 0.98).toFixed(2) : '');
      } else if (alertType === 'DAY_CHANGE_PCT') {
        setTargetValue('5.0');
      } else if (alertType === 'ATTENTION_LEVEL' || alertType === 'ATTENTION_SCORE') {
        setTargetValue('65');
      } else if (alertType === 'EARNINGS' || alertType === 'DIVIDEND' || alertType === 'AGM') {
        setTargetValue('3');
      }
    }
  };

  const handleTypeChange = (type: AlertType) => {
    setAlertType(type);
    if (!activeStock) return;
    if (type === 'PRICE_ABOVE') {
      setTargetValue(activeStock.currentPrice !== null ? (activeStock.currentPrice * 1.02).toFixed(2) : '');
    } else if (type === 'PRICE_BELOW') {
      setTargetValue(activeStock.currentPrice !== null ? (activeStock.currentPrice * 0.98).toFixed(2) : '');
    } else if (type === 'DAY_CHANGE_PCT') {
      setTargetValue('5.0');
    } else if (type === 'ATTENTION_LEVEL' || type === 'ATTENTION_SCORE') {
      setTargetValue('65');
    } else if (type === 'EARNINGS' || type === 'DIVIDEND' || type === 'AGM') {
      setTargetValue('3');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive target number.');
      return;
    }

    if (
      (alertType === 'ATTENTION_LEVEL' || alertType === 'ATTENTION_SCORE') &&
      (val < 1 || val > 100)
    ) {
      setError('Attention score must be between 1 and 100.');
      return;
    }

    if (
      (alertType === 'EARNINGS' || alertType === 'DIVIDEND' || alertType === 'AGM') &&
      (!Number.isInteger(val) || val < 1)
    ) {
      setError('Event notice days must be a whole number (e.g. 1, 3, or 7 days prior).');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await alertService.createAlert({
        stockSymbol: selectedSymbol,
        alertType,
        targetValue: val,
      });

      if (created) {
        setSuccessMsg(`Alert set for ${selectedSymbol}!`);
        await loadExistingAlerts();
        if (onAlertCreated) onAlertCreated();
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setError('Failed to create alert. Please try again.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error creating alert.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      const ok = await alertService.deleteAlert(alertId);
      if (ok) {
        setExistingAlerts((prev) => prev.filter((a) => a.id !== alertId));
        if (onAlertCreated) onAlertCreated();
      }
    } catch {
      setError('Failed to delete alert.');
    }
  };

  const stockAlerts = existingAlerts.filter((a) => a.stockSymbol === selectedSymbol);

  const getAlertDescription = (a: AlertItem) => {
    switch (a.alertType) {
      case 'PRICE_ABOVE':
        return `Price ≥ ${currency}${a.targetValue.toFixed(2)}`;
      case 'PRICE_BELOW':
        return `Price ≤ ${currency}${a.targetValue.toFixed(2)}`;
      case 'DAY_CHANGE_PCT':
        return `Day change ≥ ±${a.targetValue}%`;
      case 'ATTENTION_LEVEL':
      case 'ATTENTION_SCORE':
        return `Attention score ≥ ${a.targetValue}`;
      case 'EARNINGS':
        return `Earnings ${a.targetValue}d before`;
      case 'DIVIDEND':
        return `Dividend ${a.targetValue}d before`;
      case 'AGM':
        return `AGM ${a.targetValue}d before`;
      default:
        return `${a.alertType} ${a.targetValue}`;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg bg-surface border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-hover/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="alert-dialog-title" className="text-base font-semibold text-text-primary">
                Set Price & Attention Alert
              </h2>
              <p className="text-xs text-text-muted">
                Receive notifications when thresholds are crossed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Stock Selector */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Target Stock
            </label>
            <select
              value={selectedSymbol}
              onChange={(e) => handleStockChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-hover border border-border text-text-primary text-sm focus:outline-none focus:border-indigo-500"
            >
              {stocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.companyName} ({s.currency}{s.currentPrice !== null ? s.currentPrice.toFixed(2) : '—'})
                </option>
              ))}
            </select>
          </div>

          {/* Stock Reference Card */}
          {activeStock && (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-surface-subtle/50 border border-border/60 text-xs">
              <span className="text-text-muted">Current Market Price:</span>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-text-primary font-semibold">
                  {currency}{activeStock.currentPrice !== null ? activeStock.currentPrice.toFixed(2) : '—'}
                </span>
                {activeStock.changePercent !== null ? (
                  <span
                    className={
                      activeStock.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }
                  >
                    {activeStock.changePercent >= 0 ? '+' : ''}
                    {activeStock.changePercent.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </div>
            </div>
          )}

          {/* Alert Trigger Type */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Alert Condition
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'PRICE_ABOVE', label: 'Price rises above' },
                { type: 'PRICE_BELOW', label: 'Price falls below' },
                { type: 'DAY_CHANGE_PCT', label: 'Day change ≥ ±%' },
                { type: 'ATTENTION_SCORE', label: 'Attention score ≥' },
                { type: 'EARNINGS', label: 'Earnings notice' },
                { type: 'DIVIDEND', label: 'Dividend notice' },
                { type: 'AGM', label: 'AGM notice' },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleTypeChange(item.type as AlertType)}
                  className={`px-3 py-2 text-xs rounded-lg border text-left transition-all ${
                    alertType === item.type
                      ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium'
                      : 'border-border bg-surface-hover/40 text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Target Value
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-text-muted font-medium">
                {alertType === 'PRICE_ABOVE' || alertType === 'PRICE_BELOW'
                  ? currency
                  : alertType === 'DAY_CHANGE_PCT'
                  ? '%'
                  : alertType === 'ATTENTION_LEVEL' || alertType === 'ATTENTION_SCORE'
                  ? 'Score'
                  : 'Days'}
              </span>
              <input
                type="number"
                step={
                  alertType === 'DAY_CHANGE_PCT' ||
                  alertType === 'ATTENTION_LEVEL' ||
                  alertType === 'ATTENTION_SCORE' ||
                  alertType === 'EARNINGS' ||
                  alertType === 'DIVIDEND' ||
                  alertType === 'AGM'
                    ? '1'
                    : '0.05'
                }
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Enter value"
                required
                className="w-full pl-14 pr-4 py-2.5 rounded-lg bg-surface-hover border border-border text-text-primary text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            {(alertType === 'EARNINGS' || alertType === 'DIVIDEND' || alertType === 'AGM') && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-text-muted">Notice:</span>
                {[1, 3, 7].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setTargetValue(String(days))}
                    className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                      targetValue === String(days)
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium'
                        : 'border-border text-text-muted hover:text-text-primary hover:bg-surface-hover'
                    }`}
                  >
                    {days} day{days === 1 ? '' : 's'} prior
                  </button>
                ))}
              </div>
            )}
            <p className="mt-1 text-[11px] text-text-muted">
              {alertType === 'PRICE_ABOVE' && `Triggers when ${selectedSymbol} price reaches or crosses above target.`}
              {alertType === 'PRICE_BELOW' && `Triggers when ${selectedSymbol} price reaches or falls below target.`}
              {alertType === 'DAY_CHANGE_PCT' && `Triggers when absolute intraday move reaches ${targetValue || '0'}%.`}
              {(alertType === 'ATTENTION_LEVEL' || alertType === 'ATTENTION_SCORE') && `Triggers when composite attention score reaches ${targetValue || '65'} (0-100 scale).`}
              {alertType === 'EARNINGS' && `Notifies ${targetValue || '3'} day(s) before scheduled quarterly earnings release.`}
              {alertType === 'DIVIDEND' && `Notifies ${targetValue || '3'} day(s) before dividend or ex-dividend date.`}
              {alertType === 'AGM' && `Notifies ${targetValue || '3'} day(s) before Annual General Meeting.`}
            </p>
          </div>

          {/* Existing Alerts on this stock */}
          {stockAlerts.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <p className="text-xs font-medium text-text-secondary mb-2">
                Active alerts for {selectedSymbol} ({stockAlerts.length})
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {stockAlerts.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-subtle/50 border border-border/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          a.isActive ? 'bg-indigo-400' : 'bg-text-muted'
                        }`}
                      />
                      <span className="text-text-primary font-medium">
                        {getAlertDescription(a)}
                      </span>
                      {!a.isActive && (
                        <span className="text-[10px] text-text-muted bg-surface px-1.5 py-0.5 rounded">
                          Triggered
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAlert(a.id)}
                      className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Setting Alert...' : 'Set Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
