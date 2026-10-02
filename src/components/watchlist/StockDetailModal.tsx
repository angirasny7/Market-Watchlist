import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Pin,
  Trash2,
  Plus,
  Bell,
  Sparkles,
  Activity,
  ExternalLink,
  CandlestickChart,
  AreaChart as AreaChartIcon,
} from 'lucide-react';
import { Modal } from '../common';
import { useMarketStore } from '../../store/useMarketStore';
import {
  stockService,
  StockChartRange,
  StockDetailsExtended,
  StockHistoryData,
} from '../../services/stockService';
import { StockInteractiveChart } from './StockInteractiveChart';

interface StockDetailModalProps {
  symbol: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenAlertModal?: (symbol: string) => void;
}

export const StockDetailModal: React.FC<StockDetailModalProps> = ({
  symbol,
  isOpen,
  onClose,
  onOpenAlertModal,
}) => {
  const navigate = useNavigate();
  const {
    watchlist,
    watchlistOverview,
    addStockToActiveWatchlist,
    removeStockFromActiveWatchlist,
    togglePinInActiveWatchlist,
  } = useMarketStore();

  const [timeframe, setTimeframe] = useState<StockChartRange>('1M');
  const [chartType, setChartType] = useState<'area' | 'candlestick'>('area');
  const [stockDetails, setStockDetails] = useState<StockDetailsExtended | null>(null);
  const [historyData, setHistoryData] = useState<StockHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load stock details when opened
  useEffect(() => {
    if (!isOpen || !symbol) {
      setStockDetails(null);
      setHistoryData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    stockService
      .getStockBySymbol(symbol)
      .then((data) => {
        if (isMounted) {
          setStockDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch stock details', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, symbol]);

  // Load chart history when timeframe changes
  const loadHistory = useCallback(
    (sym: string, range: StockChartRange) => {
      setLoadingHistory(true);
      stockService
        .getStockHistory(sym, range)
        .then((res) => {
          setHistoryData(res);
          setLoadingHistory(false);
        })
        .catch((err) => {
          console.error('Failed to fetch stock history', err);
          setLoadingHistory(false);
        });
    },
    []
  );

  useEffect(() => {
    if (isOpen && symbol) {
      loadHistory(symbol, timeframe);
    }
  }, [isOpen, symbol, timeframe, loadHistory]);

  if (!isOpen || !symbol) return null;

  // Determine membership and pin status from store
  const currentOverviewStock = watchlistOverview?.stocks.find((s) => s.symbol === symbol);
  const legacyStock = watchlist.find((s) => s.symbol === symbol);
  const isInWatchlist = Boolean(currentOverviewStock || legacyStock);
  const isPinned = Boolean(currentOverviewStock?.isPinned ?? legacyStock?.isPinned);

  const curr = stockDetails?.currency || currentOverviewStock?.currency || '₹';
  const price = stockDetails?.currentPrice ?? currentOverviewStock?.currentPrice ?? 0;
  const changePercent = stockDetails?.changePercent ?? currentOverviewStock?.changePercent ?? 0;
  const changeAmount = stockDetails?.changeAmount ?? currentOverviewStock?.changeAmount ?? 0;
  const isPositive = changePercent >= 0;
  const changeGlyph = isPositive ? '▲ +' : '▼ ';

  const handleToggleWatchlist = () => {
    if (isInWatchlist) {
      removeStockFromActiveWatchlist(symbol);
    } else {
      addStockToActiveWatchlist(symbol);
    }
  };

  const handleViewInFeed = () => {
    onClose();
    navigate(`/feed?symbol=${encodeURIComponent(symbol)}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="xl"
      title=""
    >
      <div className="space-y-5 -mt-2">
        {/* 1. Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-mono text-slate-100">{symbol}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle border border-border text-slate-300">
                {stockDetails?.exchange || currentOverviewStock?.exchange || 'NSE'}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {stockDetails?.sector || currentOverviewStock?.sector || 'General'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {loading && !stockDetails ? (
                <span className="text-slate-500">Loading details...</span>
              ) : (
                stockDetails?.name || currentOverviewStock?.companyName || symbol
              )}
            </div>
          </div>

          {/* Quick Actions (Pin & Watchlist toggle) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => togglePinInActiveWatchlist(symbol)}
              title={isPinned ? 'Unpin' : 'Pin to top'}
              className={`p-2 rounded-xl border text-xs transition-all ${
                isPinned
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                  : 'border-border text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
              }`}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-400 rotate-45' : ''}`} />
            </button>

            <button
              type="button"
              onClick={handleToggleWatchlist}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
                isInWatchlist
                  ? 'border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20'
                  : 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
              }`}
            >
              {isInWatchlist ? (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Track</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Real-Time Price & Day Delta */}
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100">
              {curr}
              {price.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <div
              className={`text-sm font-semibold font-mono flex items-center gap-1 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              <span>{changeGlyph}</span>
              <span>{Math.abs(changePercent).toFixed(2)}%</span>
              <span className="text-xs text-slate-500">
                ({isPositive ? '+' : '-'}{curr}{Math.abs(changeAmount).toFixed(2)})
              </span>
            </div>
          </div>

          {/* Timeframe & Chart Type Controls */}
          <div className="flex items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
              <button
                type="button"
                onClick={() => setChartType('area')}
                title="Area Chart"
                className={`p-1.5 rounded transition-all ${
                  chartType === 'area'
                    ? 'bg-slate-700 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <AreaChartIcon className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setChartType('candlestick')}
                title="Candlestick Chart"
                className={`p-1.5 rounded transition-all ${
                  chartType === 'candlestick'
                    ? 'bg-slate-700 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CandlestickChart className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Timeframe Switcher: 1D | 1W | 1M | 1Y | ALL */}
            <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border">
              {(['1D', '1W', '1M', '1Y', 'ALL'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setTimeframe(r)}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                    timeframe === r
                      ? 'bg-slate-700 text-emerald-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Interactive Lightweight Chart */}
        <div className="w-full relative">
          <StockInteractiveChart
            dataPoints={historyData?.dataPoints || []}
            currency={curr}
            chartType={chartType}
            height={280}
            isPositive={isPositive}
          />
          {loadingHistory && (
            <div className="absolute inset-0 bg-surface/50 backdrop-blur-[1px] flex items-center justify-center text-xs text-slate-300 font-medium z-10 rounded-xl">
              Updating chart...
            </div>
          )}
        </div>

        {/* 4. Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {[
            {
              label: '52W High',
              value: `${curr}${Number(stockDetails?.high52w || 0).toLocaleString('en-IN', {
                maximumFractionDigits: 2,
              })}`,
            },
            {
              label: '52W Low',
              value: `${curr}${Number(stockDetails?.low52w || 0).toLocaleString('en-IN', {
                maximumFractionDigits: 2,
              })}`,
            },
            {
              label: 'Volume',
              value: Number(stockDetails?.volume || 0).toLocaleString('en-IN'),
            },
            {
              label: '20D Avg Vol',
              value: Number(stockDetails?.avgVolume20D || 0).toLocaleString('en-IN'),
            },
            {
              label: 'Market Cap',
              value: stockDetails?.marketCap || 'N/A',
            },
            {
              label: 'P/E Ratio',
              value: stockDetails?.peRatio ? `${Number(stockDetails.peRatio).toFixed(1)}x` : 'N/A',
            },
          ].map((metric) => (
            <div
              key={metric.label}
              className="p-2.5 rounded-xl bg-surface-subtle/80 border border-border text-center"
            >
              <div className="text-[10px] text-slate-400 font-medium">{metric.label}</div>
              <div className="text-xs sm:text-sm font-bold font-mono text-slate-100 mt-0.5 truncate">
                {metric.value}
              </div>
            </div>
          ))}
        </div>

        {/* 5. Recent Anomalies & Intelligence Signals */}
        {stockDetails?.events && stockDetails.events.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>Recent Anomaly Events</span>
              </div>
              <button
                type="button"
                onClick={handleViewInFeed}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>View all in feed</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {stockDetails.events.slice(0, 3).map((ev) => (
                <div
                  key={ev.id}
                  className="p-2.5 rounded-xl bg-surface-subtle border border-border/80 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-slate-200">{ev.headline}</div>
                    {ev.insights && ev.insights[0] && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {ev.insights[0].explanation}
                      </p>
                    )}
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0 ${
                      ev.priority === 'CRITICAL'
                        ? 'bg-rose-500/15 text-rose-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {ev.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6. Footer Navigation / Quick Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onOpenAlertModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAlertModal(symbol);
                }}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-medium text-slate-300 hover:text-white transition-colors flex-1 sm:flex-initial"
              >
                <Bell className="w-3.5 h-3.5 text-indigo-400" />
                <span>Set Alert</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleViewInFeed}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-semibold text-indigo-300 transition-colors flex-1 sm:flex-initial"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Feed History</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
