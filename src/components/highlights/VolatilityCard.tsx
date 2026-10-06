import React, { useState } from 'react';
import { Gauge, HelpCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { MarketHighlightsData } from '../../types/market';

interface VolatilityCardProps {
  volatility: MarketHighlightsData['volatility'];
}

export const VolatilityCard: React.FC<VolatilityCardProps> = ({ volatility }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getLevelColor = (level: MarketHighlightsData['volatility']['level']) => {
    switch (level) {
      case 'CALM':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'NORMAL':
        return 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30';
      case 'ELEVATED':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      default:
        return 'text-slate-300 bg-slate-800 border-slate-700';
    }
  };

  const isPos = volatility.changePercent >= 0;

  return (
    <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Gauge className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Volatility Index (India VIX)
          </h2>
        </div>

        {/* Tooltip */}
        <div className="relative">
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 font-mono transition-colors"
            aria-label="How to read India VIX"
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline text-[11px]">How to read</span>
          </button>

          {showTooltip && (
            <div className="absolute right-0 top-6 z-20 w-64 sm:w-72 p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 shadow-xl space-y-1.5 animate-fade-in">
              <div className="font-semibold text-slate-100">About India VIX:</div>
              <p className="leading-relaxed">
                Represents annualized expected market volatility over the next 30 days based on NIFTY options pricing. Readings under 15 indicate calm, stable conditions; 15-20 reflect normal variance; readings over 20 signal elevated hedging demand.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Metric */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="space-y-1">
          <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-100">
            {volatility.currentValue > 0 ? volatility.currentValue.toFixed(2) : '—'}
          </div>
          <div
            className={`text-xs font-mono font-medium flex items-center gap-1 ${
              isPos ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {isPos ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {volatility.changeAmount > 0 ? '+' : ''}
              {volatility.changeAmount.toFixed(2)} ({volatility.changePercent >= 0 ? '+' : ''}
              {volatility.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <span
          className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${getLevelColor(
            volatility.level
          )}`}
        >
          {volatility.level}
        </span>
      </div>

      {/* Plain Language Interpretation */}
      <div className="pt-2 border-t border-border/50 text-xs text-slate-400 leading-relaxed font-mono">
        {volatility.levelDescription}
      </div>
    </div>
  );
};
