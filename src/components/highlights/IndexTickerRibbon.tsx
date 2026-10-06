import React, { useState } from 'react';
import { Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketHighlightIndex } from '../../types/market';
import { DeltaBadge } from '../common';

interface IndexTickerRibbonProps {
  indices: MarketHighlightIndex[];
}

export const IndexTickerRibbon: React.FC<IndexTickerRibbonProps> = ({ indices }) => {
  const [range, setRange] = useState<'1D' | '1W' | '1M'>('1D');

  const getExchangeTag = (symbol: string) => {
    switch (symbol) {
      case '^NSEI':
        return { label: 'NSE India', flag: '🇮🇳' };
      case '^BSESN':
        return { label: 'BSE India', flag: '🇮🇳' };
      case '^NSEBANK':
        return { label: 'NSE Banking', flag: '🇮🇳' };
      case '^CNXIT':
        return { label: 'NSE IT', flag: '🇮🇳' };
      case '^GSPC':
        return { label: 'US S&P 500', flag: '🇺🇸' };
      case '^IXIC':
        return { label: 'US NASDAQ', flag: '🇺🇸' };
      case '^DJI':
        return { label: 'US Dow Jones', flag: '🇺🇸' };
      default:
        return { label: 'Index', flag: '🌐' };
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Benchmark Indices
          </h2>
        </div>

        {/* Range Toggle */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-0.5">
          {(['1D', '1W', '1M'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded transition-colors ${
                range === r
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {indices.map((index) => {
          const exchange = getExchangeTag(index.symbol);
          const isPos = index.changePercent >= 0;
          const dayLow = index.dayLow || (index.currentPrice * 0.99);
          const dayHigh = index.dayHigh || (index.currentPrice * 1.01);
          const rangeSpan = Math.max(dayHigh - dayLow, 1);
          const currentPosPercent = Math.min(
            100,
            Math.max(0, ((index.currentPrice - dayLow) / rangeSpan) * 100)
          );

          return (
            <div
              key={index.symbol}
              className="p-4 rounded-xl bg-surface border border-border hover:border-slate-700 transition-all hover:shadow-md flex flex-col justify-between space-y-3 overflow-hidden"
            >
              {/* Top row: Symbol, Exchange & Delta Badge */}
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs shrink-0">{exchange.flag}</span>
                    <span className="text-[11px] font-semibold text-slate-400 truncate font-mono">
                      {exchange.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 mt-0.5 truncate">
                    {index.name}
                  </h3>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  <DeltaBadge value={index.changePercent} size="sm" className="shrink-0" />
                </div>
              </div>

              {/* Price and Point Change */}
              <div className="flex items-baseline justify-between pt-1 border-t border-border/50">
                <span className="text-lg sm:text-xl font-bold font-mono text-slate-100">
                  {index.currentPrice > 0
                    ? index.currentPrice.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })
                    : '—'}
                </span>
                <span
                  className={`text-xs font-mono font-medium flex items-center gap-0.5 ${
                    isPos ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isPos ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  {index.changeAmount > 0 ? '+' : ''}
                  {index.changeAmount.toFixed(2)}
                </span>
              </div>

              {/* Day Range Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>L: {dayLow.toFixed(1)}</span>
                  <span className="text-slate-500">Range ({range})</span>
                  <span>H: {dayHigh.toFixed(1)}</span>
                </div>
                <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isPos ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${currentPosPercent}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
