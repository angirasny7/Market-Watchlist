import React from 'react';
import { Link } from 'react-router-dom';
import {
  Pin,
  Trash2,
  ExternalLink,
  Bell,
  Sparkles,
  Calendar,
  FolderInput,
} from 'lucide-react';
import { WatchlistStockItem } from '../../lib/watchlistFilters';
import { Sparkline } from './Sparkline';
import { FlashingPrice } from './FlashingPrice';

import { UserWatchlist } from '../../services';

interface WatchlistGridProps {
  stocks: WatchlistStockItem[];
  onTogglePin: (symbol: string) => void;
  onRemoveStock: (stock: WatchlistStockItem) => void;
  onSelectStock: (stock: WatchlistStockItem) => void;
  onOpenAlerts?: (symbol: string) => void;
  onMoveCopyStock?: (symbol: string) => void;
  isAllWatchlists?: boolean;
  userWatchlists?: UserWatchlist[];
}

export const WatchlistGrid: React.FC<WatchlistGridProps> = ({
  stocks,
  onTogglePin,
  onRemoveStock,
  onSelectStock,
  onOpenAlerts,
  onMoveCopyStock,
  isAllWatchlists = false,
  userWatchlists = [],
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {stocks.map((stock) => {
        const isPositive = (stock.changePercent ?? 0) >= 0;
        const changeGlyph = isPositive ? '▲ +' : '▼ ';
        const curr = stock.currency || '₹';

        return (
          <div
            key={stock.symbol}
            onClick={() => onSelectStock(stock)}
            className="group relative flex flex-col justify-between p-4 rounded-2xl border border-border bg-surface hover:border-slate-700/80 hover:bg-surface-hover/80 transition-all shadow-sm cursor-pointer"
          >
            {/* 1. Header: Symbol, Company, Sector, Pin */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base text-slate-100 group-hover:text-emerald-400 transition-colors">
                    {stock.symbol}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-subtle border border-border/80 text-slate-400">
                    {stock.exchange}
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {stock.companyName}
                </div>
                {isAllWatchlists && stock.watchlistIds && stock.watchlistIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {stock.watchlistIds.map((wId) => {
                      const w = userWatchlists.find((uw) => uw.id === wId);
                      if (!w) return null;
                      return (
                        <span
                          key={wId}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-surface-subtle text-slate-400 border border-border/70"
                        >
                          {w.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => onTogglePin(stock.symbol)}
                  aria-label={stock.isPinned ? `Unpin ${stock.symbol}` : `Pin ${stock.symbol}`}
                  className={`p-1.5 rounded-lg border transition-all ${
                    stock.isPinned
                      ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                      : 'border-border/60 text-slate-500 hover:text-slate-300 hover:bg-surface-subtle'
                  }`}
                >
                  <Pin className={`w-3.5 h-3.5 ${stock.isPinned ? 'fill-amber-400 rotate-45' : ''}`} />
                </button>
              </div>
            </div>

            {/* 2. Middle Row: Price, Day Change & Mini Sparkline */}
            <div className="flex items-end justify-between gap-2 my-2 py-2 border-y border-border/60">
              <div>
                <FlashingPrice
                  price={stock.currentPrice}
                  currency={curr}
                  className="text-lg text-slate-100"
                  isDelayed={true}
                />
                {stock.changePercent !== null ? (
                  <div
                    className={`text-xs font-semibold font-mono flex items-center gap-1 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    <span>{changeGlyph}</span>
                    <span>{Math.abs(stock.changePercent).toFixed(2)}%</span>
                    {stock.changeAmount !== null && (
                      <span className="text-[10px] text-slate-500">
                        ({isPositive ? '+' : '-'}{curr}{Math.abs(stock.changeAmount).toFixed(2)})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 font-mono">—</div>
                )}
              </div>

              <div className="shrink-0">
                <Sparkline
                  points={stock.sparkline}
                  isPositive={isPositive}
                  width={96}
                  height={28}
                />
              </div>
            </div>

            {/* 3. Badges Row: Attention, Alerts, Feed, Next Event */}
            <div className="flex items-center gap-2 flex-wrap text-[10px] my-2">
              {/* Attention Badge */}
              <span
                className={`px-2 py-0.5 rounded-full font-semibold border ${
                  stock.attentionLevel === 'CRITICAL'
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : stock.attentionLevel === 'HIGH'
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : stock.attentionLevel === 'MEDIUM'
                    ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
                }`}
              >
                {stock.attentionLevel}
              </span>

              {/* Unseen Updates Link */}
              {stock.unseenUpdatesCount > 0 && (
                <Link
                  to={`/feed?symbol=${encodeURIComponent(stock.symbol)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium hover:bg-emerald-500/25 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>{stock.unseenUpdatesCount} new</span>
                </Link>
              )}

              {/* Active Alerts */}
              {stock.activeAlertCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenAlerts) onOpenAlerts(stock.symbol);
                  }}
                  title={`${stock.activeAlertCount} active alerts - click to manage`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-medium hover:bg-indigo-500/25 transition-colors"
                >
                  <Bell className="w-3 h-3 text-indigo-400 fill-indigo-400/30" />
                  <span>{stock.activeAlertCount}</span>
                </button>
              )}

              {/* Next Event */}
              {stock.nextEvent && (() => {
                const daysAway = Math.max(
                  0,
                  Math.ceil(
                    (new Date(stock.nextEvent.date).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                  )
                );
                const isSoon = daysAway <= 3;

                const eventType = stock.nextEvent.label?.replace(/^(EARNINGS|DIVIDEND|EX_DIVIDEND|AGM)$/i, (m) =>
                  m.charAt(0).toUpperCase() + m.slice(1).toLowerCase().replace('_', '-')
                ) || 'Event';
                const relativeText =
                  daysAway === 0 ? `${eventType} today` :
                  daysAway === 1 ? `${eventType} tomorrow` :
                  `${eventType} in ${daysAway}d`;

                return (
                  <div
                    title={`${stock.nextEvent.label} on ${new Date(stock.nextEvent.date).toLocaleDateString()}`}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-md border ${
                      isSoon
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20'
                    }`}
                  >
                    {isSoon ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    ) : (
                      <Calendar className="w-3 h-3 shrink-0" />
                    )}
                    <span className="truncate max-w-[110px] font-medium">{relativeText}</span>
                    {stock.nextEvent.isDemo && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">Demo</span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* 4. Footer Actions */}
            <div
              className="flex items-center justify-between pt-2.5 mt-1 border-t border-border/50 text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onSelectStock(stock)}
                  className="text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Details</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </button>

                {onMoveCopyStock && (
                  <button
                    type="button"
                    onClick={() => onMoveCopyStock(stock.symbol)}
                    title="Move or copy to another watchlist"
                    aria-label={`Move or copy ${stock.symbol} to another watchlist`}
                    className="text-slate-400 hover:text-indigo-400 font-medium flex items-center gap-0.5 transition-colors"
                  >
                    <FolderInput className="w-3 h-3" />
                    <span>Move</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => onRemoveStock(stock)}
                aria-label={`Remove ${stock.symbol} from watchlist`}
                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
