import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  subtext?: string;
  trend?: 'up' | 'down' | 'neutral';
  accent?: 'green' | 'rose' | 'amber' | 'indigo' | 'slate';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  change,
  changeLabel,
  icon: Icon,
  subtext,
  accent = 'slate',
  onClick,
  className,
}) => {
  const accentGlow = {
    green: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_-3px_rgba(16,185,129,0.15)]',
    rose: 'hover:border-rose-500/40 hover:shadow-[0_0_20px_-3px_rgba(244,63,94,0.15)]',
    amber: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_-3px_rgba(245,158,11,0.15)]',
    indigo: 'hover:border-indigo-500/40 hover:shadow-[0_0_20px_-3px_rgba(99,102,241,0.15)]',
    slate: 'hover:border-slate-700',
  }[accent];

  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-surface p-4 sm:p-5 rounded-xl border border-border transition-all duration-200 group overflow-hidden',
        accentGlow,
        isClickable && 'cursor-pointer hover:bg-surface-hover',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
        <span className="text-xs sm:text-sm font-medium text-slate-400 truncate">
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-lg bg-surface-hover text-slate-300 group-hover:text-indigo-400 transition-colors shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline justify-between gap-2 sm:gap-3 min-w-0">
        <span className="text-2xl sm:text-3xl font-bold font-sans text-slate-100 tabular-numbers tracking-tight truncate">
          {value}
        </span>

        {typeof change === 'number' && (
          <div
            className={cn(
              'flex items-center text-xs font-mono font-medium px-2 py-0.5 rounded whitespace-nowrap shrink-0',
              change >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            )}
          >
            {change >= 0 ? (
              <TrendingUp className="w-3 h-3 mr-1 inline shrink-0" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1 inline shrink-0" />
            )}
            {change >= 0 ? '+' : ''}
            {change.toFixed(2)}%
          </div>
        )}
      </div>

      {(subtext || changeLabel) && (
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400 border-t border-border-subtle pt-2">
          {subtext && <span>{subtext}</span>}
          {changeLabel && <span className="font-mono text-slate-400">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
};
