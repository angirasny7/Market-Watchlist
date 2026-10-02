import React, { useRef } from 'react';
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

interface WatchlistTableProps {
  stocks: WatchlistStockItem[];
  onTogglePin: (symbol: string) => void;
  onRemoveStock: (stock: WatchlistStockItem) => void;
  onSelectStock: (stock: WatchlistStockItem) => void;
  onOpenAlerts?: (symbol: string) => void;
  onMoveCopyStock?: (symbol: string) => void;
}

export const WatchlistTable: React.FC<WatchlistTableProps> = ({
  stocks,
  onTogglePin,
  onRemoveStock,
  onSelectStock,
  onOpenAlerts,
  onMoveCopyStock,
}) => {
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  const handleRowKeyDown = (
    e: React.KeyboardEvent,
    index: number,
    stock: WatchlistStockItem
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(index + 1, stocks.length - 1);
      rowRefs.current[nextIndex]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(index - 1, 0);
      rowRefs.current[prevIndex]?.focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelectStock(stock);
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left border-collapse" role="table">
        <thead>
          <tr className="border-b border-border bg-surface-subtle/70 text-[11px] font-semibold text-slate-400 uppercase tracking-wider" role="row">
            <th role="columnheader" className="py-3 pl-4 pr-1 w-10 text-center">Pin</th>
            <th role="columnheader" className="py-3 px-3 min-w-[170px]">Company</th>
            <th role="columnheader" className="py-3 px-3 text-right min-w-[110px]">Market Price</th>
            <th role="columnheader" className="py-3 px-3 text-right min-w-[110px]">Day Change</th>
            <th role="columnheader" className="py-3 px-3 text-center min-w-[95px]">Attention</th>
            <th role="columnheader" className="py-3 px-3 text-center min-w-[85px]">Alerts</th>
            <th role="columnheader" className="py-3 px-3 text-center min-w-[95px]">Updates</th>
            <th role="columnheader" className="py-3 px-3 min-w-[130px] hidden md:table-cell">Next Event</th>
            <th role="columnheader" className="py-3 px-3 text-center min-w-[100px] hidden sm:table-cell">Trend</th>
            <th role="columnheader" className="py-3 pl-3 pr-4 text-right min-w-[100px]">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {stocks.map((stock, index) => {
            const isPositive = stock.changePercent >= 0;
            const changeGlyph = isPositive ? '▲ +' : '▼ ';
            const curr = stock.currency || '₹';

            return (
              <tr
                key={stock.symbol}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                tabIndex={0}
                role="row"
                aria-label={`${stock.symbol}, ${stock.companyName}, price ${curr}${stock.currentPrice.toFixed(2)}, day change ${stock.changePercent.toFixed(2)} percent`}
                onClick={() => onSelectStock(stock)}
                onKeyDown={(e) => handleRowKeyDown(e, index, stock)}
                className="group hover:bg-surface-hover/80 focus:bg-surface-hover/90 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 transition-colors cursor-pointer"
              >
                {/* 1. Pin Column */}
                <td
                  className="py-3.5 pl-4 pr-1 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(stock.symbol);
                  }}
                >
                  <button
                    type="button"
                    aria-label={stock.isPinned ? `Unpin ${stock.symbol}` : `Pin ${stock.symbol}`}
                    className={`p-1 rounded-md transition-colors ${
                      stock.isPinned
                        ? 'text-amber-400 hover:text-amber-300'
                        : 'text-slate-600 hover:text-slate-400 opacity-60 group-hover:opacity-100'
                    }`}
                  >
                    <Pin
                      className={`w-3.5 h-3.5 ${
                        stock.isPinned ? 'fill-amber-400 rotate-45' : ''
                      }`}
                    />
                  </button>
                </td>

                {/* 2. Company Column */}
                <td className="py-3.5 px-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                        {stock.symbol}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-subtle border border-border/80 text-slate-400">
                        {stock.exchange}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 truncate max-w-[180px]">
                      {stock.companyName}
                    </span>
                  </div>
                </td>

                {/* 3. Market Price */}
                <td className="py-3.5 px-3 text-right">
                  <div className="font-semibold text-sm text-slate-100 font-mono">
                    {curr}
                    {stock.currentPrice.toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {stock.sector}
                  </span>
                </td>

                {/* 4. Day Change */}
                <td className="py-3.5 px-3 text-right">
                  <div
                    className={`font-semibold font-mono text-xs flex items-center justify-end gap-1 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    <span>{changeGlyph}</span>
                    <span>
                      {Math.abs(stock.changePercent).toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {isPositive ? '+' : '-'}
                    {curr}
                    {Math.abs(stock.changeAmount).toFixed(2)}
                  </div>
                </td>

                {/* 5. Attention Badge */}
                <td className="py-3.5 px-3 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                </td>

                {/* 6. Alerts */}
                <td
                  className="py-3.5 px-3 text-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenAlerts) onOpenAlerts(stock.symbol);
                  }}
                >
                  {stock.activeAlertCount > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenAlerts) onOpenAlerts(stock.symbol);
                      }}
                      title={`${stock.activeAlertCount} active alert triggers - click to manage`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-medium hover:bg-indigo-500/25 transition-colors"
                    >
                      <Bell className="w-3 h-3 text-indigo-400 fill-indigo-400/30" />
                      <span>{stock.activeAlertCount} {stock.activeAlertCount === 1 ? 'alert' : 'alerts'}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenAlerts) onOpenAlerts(stock.symbol);
                      }}
                      aria-label={`Set alert for ${stock.symbol}`}
                      title="Set price or attention alert"
                      className="p-1 rounded text-slate-600 hover:text-indigo-400 opacity-40 group-hover:opacity-100 hover:bg-indigo-500/10 transition-all flex items-center justify-center mx-auto"
                    >
                      <span className="text-[11px] font-bold mr-0.5 hidden group-hover:inline">+</span>
                      <Bell className="w-3.5 h-3.5" />
                    </button>
                  )}
                </td>

                {/* 7. Unseen Updates */}
                <td
                  className="py-3.5 px-3 text-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {stock.unseenUpdatesCount > 0 ? (
                    <Link
                      to={`/feed?symbol=${encodeURIComponent(stock.symbol)}`}
                      title={`View ${stock.unseenUpdatesCount} unread events in feed`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium hover:bg-emerald-500/25 hover:text-emerald-300 transition-all"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      <span>{stock.unseenUpdatesCount} new</span>
                    </Link>
                  ) : (
                    <span className="text-slate-600 font-mono text-[11px]">—</span>
                  )}
                </td>

                {/* 8. Next Event */}
                <td className="py-3.5 px-3 hidden md:table-cell">
                  {stock.nextEvent ? (() => {
                    const daysAway = Math.max(
                      0,
                      Math.ceil(
                        (new Date(stock.nextEvent.date).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )
                    );
                    const isSoon = daysAway <= 3;

                    return (
                      <div
                        title={`${stock.nextEvent.label} (${new Date(stock.nextEvent.date).toLocaleDateString()})`}
                        className={`flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md w-max border ${
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
                        <span className="truncate max-w-[130px] font-medium">
                          {stock.nextEvent.label}
                        </span>
                        {stock.nextEvent.isDemo && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono shrink-0">Demo</span>
                        )}
                      </div>
                    );
                  })() : (
                    <span className="text-slate-600 font-mono text-[11px]">—</span>
                  )}
                </td>

                {/* 9. Sparkline */}
                <td className="py-3.5 px-3 text-center hidden sm:table-cell">
                  <Sparkline
                    points={stock.sparkline}
                    isPositive={isPositive}
                    width={90}
                    height={26}
                  />
                </td>

                {/* 10. Actions */}
                <td
                  className="py-3.5 pl-3 pr-4 text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (onOpenAlerts) onOpenAlerts(stock.symbol);
                      }}
                      aria-label={`Set alert for ${stock.symbol}`}
                      title="Set Alert"
                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </button>

                    {onMoveCopyStock && (
                      <button
                        type="button"
                        onClick={() => onMoveCopyStock(stock.symbol)}
                        aria-label={`Move or copy ${stock.symbol} to another watchlist`}
                        title="Move or copy to another watchlist"
                        className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      >
                        <FolderInput className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectStock(stock)}
                      className="px-2.5 py-1 rounded-lg bg-surface-subtle hover:bg-surface-active border border-border text-[11px] font-medium text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <span>Details</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onRemoveStock(stock)}
                      aria-label={`Remove ${stock.symbol} from watchlist`}
                      title="Remove from watchlist"
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
