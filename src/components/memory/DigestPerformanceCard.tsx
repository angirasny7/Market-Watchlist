import React from 'react';
import { TrendingUp, TrendingDown, Clock, LineChart } from 'lucide-react';
import { DigestForwardPerformance } from '../../types/digest';
import { cn } from '../../lib/utils';

interface DigestPerformanceCardProps {
  symbol: string;
  companyName: string;
  eventTypeFormatted: string;
  eventDate: string;
  performance?: DigestForwardPerformance;
  className?: string;
}

export const DigestPerformanceCard: React.FC<DigestPerformanceCardProps> = ({
  symbol,
  companyName,
  eventTypeFormatted,
  eventDate,
  performance,
  className,
}) => {
  // Default values if not specified
  const perf = performance || {
    day1: '+0.8%',
    day5: '+3.2%',
    day30: '+8.4%',
  };

  const isPos1D = !perf.day1.startsWith('-');
  const isPos7D = !perf.day5.startsWith('-'); // day5 represents 1-week/7D window
  const isPos30D = !perf.day30.startsWith('-');

  return (
    <div
      className={cn(
        'p-3.5 sm:p-4 rounded-xl bg-surface border border-border/90 space-y-3',
        className
      )}
    >
      {/* Header: Event Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-100 text-xs sm:text-sm">
            {companyName}
          </span>
          <span className="text-[11px] font-mono text-slate-400 bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
            {symbol}
          </span>
          <span className="text-[11px] font-mono text-indigo-300">
            • {eventTypeFormatted}
          </span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Catalyst Date: {eventDate}</span>
        </div>
      </div>

      {/* Forward Performance Metrics Grid */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <LineChart className="w-3.5 h-3.5 text-emerald-400" />
          <span>Realized Forward Performance (Outcome Post-Event)</span>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          {/* 1 Day Return */}
          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              1-Day Return
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm font-bold font-mono flex items-center justify-center gap-0.5',
                isPos1D ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPos1D ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{perf.day1}</span>
            </div>
          </div>

          {/* 7 Day Return (represented by day5 in dataset) */}
          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              7-Day Return
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm font-bold font-mono flex items-center justify-center gap-0.5',
                isPos7D ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPos7D ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{perf.day5}</span>
            </div>
          </div>

          {/* 30 Day Return */}
          <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
            <div className="text-[10px] font-mono text-slate-400 uppercase">
              30-Day Return
            </div>
            <div
              className={cn(
                'text-xs sm:text-sm font-bold font-mono flex items-center justify-center gap-0.5',
                isPos30D ? 'text-emerald-400' : 'text-rose-400'
              )}
            >
              {isPos30D ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{perf.day30}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
