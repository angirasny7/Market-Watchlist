import React from 'react';
import { cn } from '../../lib/utils';

export interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: 'emerald' | 'cyan' | 'indigo' | 'rose' | 'amber' | 'purple' | 'slate';
  badge?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
}

const accentIconStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  slate: 'bg-surface-hover text-slate-400 border-border',
};

const accentCardHover = {
  emerald: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_-4px_rgba(16,185,129,0.12)]',
  cyan: 'hover:border-cyan-500/40 hover:shadow-[0_0_20px_-4px_rgba(6,182,212,0.12)]',
  indigo: 'hover:border-indigo-500/40 hover:shadow-[0_0_20px_-4px_rgba(99,102,241,0.12)]',
  rose: 'hover:border-rose-500/40 hover:shadow-[0_0_20px_-4px_rgba(244,63,94,0.12)]',
  amber: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.12)]',
  purple: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_-4px_rgba(168,85,247,0.12)]',
  slate: 'hover:border-border-strong',
};

/**
 * Standardized KPI Card Component
 * Shared 20px radius, uniform padding, 36px metric typography, and subtle hover physics.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = 'slate',
  badge,
  onClick,
  className,
  valueClassName,
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative rounded-[20px] bg-surface/85 backdrop-blur-md border border-border/80 p-5 sm:p-6 transition-all duration-200 ease-out flex flex-col justify-between min-h-[135px] shadow-sm overflow-hidden',
        accentCardHover[accent],
        isClickable && 'cursor-pointer hover:-translate-y-0.5 hover:bg-surface/95',
        className
      )}
    >
      {/* Top Header: Label & Icon/Badge */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate">
          {label}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          {icon && (
            <div
              className={cn(
                'w-8 h-8 rounded-xl border flex items-center justify-center transition-colors shrink-0',
                accentIconStyles[accent]
              )}
            >
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="space-y-1 min-w-0">
        <div
          className={cn(
            'text-2xl sm:text-3xl lg:text-4xl font-mono font-bold text-slate-100 tabular-numbers tracking-tight truncate',
            typeof value === 'string' && value.length > 8 && 'text-xl sm:text-2xl lg:text-[24px] font-sans tracking-normal',
            valueClassName
          )}
        >
          {value}
        </div>

        {/* Bottom Subtext / Delta */}
        {subtext && (
          <div className="text-xs text-slate-400 font-normal leading-normal truncate pt-0.5">
            {subtext}
          </div>
        )}
      </div>
    </div>
  );
};
