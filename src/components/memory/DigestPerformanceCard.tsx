import React from 'react';
import { TrendingUp, TrendingDown, Clock, LineChart } from 'lucide-react';
import { DigestForwardPerformance } from '../../types/digest';
import { cn } from '../../lib/utils';

interface DigestPerformanceCardProps {
  symbol: string;
  companyName: string;
  eventTypeFormatted: string;
  eventDate: string;
  performance?: DigestForwardPerformance | null;
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
  const hasAnyData = Boolean(
    performance && (performance.day1 || performance.day5 || performance.day30)
  );

  const renderMetric = (label: string, value?: string | null) => {
    if (!value) {
      return (
        <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">
            {label}
          </div>
          <div className="text-xs sm:text-sm font-mono text-slate-500 flex items-center justify-center">
            Unavailable
          </div>
        </div>
      );
    }

    const isPos = !value.startsWith('-');
    return (
      <div className="p-2.5 rounded-lg bg-surface-subtle border border-border/80 space-y-1">
        <div className="text-[10px] font-mono text-slate-400 uppercase">
          {label}
        </div>
        <div
          className={cn(
            'text-xs sm:text-sm font-bold font-mono flex items-center justify-center gap-0.5',
            isPos ? 'text-emerald-400' : 'text-rose-400'
          )}
        >
          {isPos ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          <span>{value}</span>
        </div>
      </div>
    );
  };

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
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <LineChart className="w-3.5 h-3.5 text-emerald-400" />
            <span>Realized Forward Performance (Outcome Post-Event)</span>
          </div>
          {performance?.sampleSize !== undefined && (
            <span className="text-[10px] text-slate-500 font-mono normal-case">
              (Sample: {performance.sampleSize} {performance.sampleSize === 1 ? 'event' : 'events'})
            </span>
          )}
        </div>

        {!hasAnyData ? (
          <div className="p-3.5 rounded-lg bg-surface-subtle border border-border/80 text-center">
            <p className="text-xs font-mono text-slate-400">
              Not enough historical forward data yet
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Requires past events with sufficient subsequent trading sessions to compute realized returns.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            {renderMetric('1-Day Return', performance?.day1)}
            {renderMetric('7-Day Return', performance?.day5)}
            {renderMetric('30-Day Return', performance?.day30)}
          </div>
        )}
      </div>
    </div>
  );
};
