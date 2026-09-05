import React from 'react';
import { cn } from '../../lib/utils';

export interface PageHeaderProps {
  icon?: React.ReactNode;
  iconColor?: 'emerald' | 'cyan' | 'indigo' | 'rose' | 'amber' | 'purple' | 'slate';
  tag?: string;
  tagColor?: 'emerald' | 'cyan' | 'indigo' | 'rose' | 'amber' | 'purple' | 'slate';
  title: React.ReactNode;
  subtitle: React.ReactNode;
  statusBadges?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const iconColorMap = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  slate: 'bg-surface-hover text-slate-300 border-border',
};

const tagColorMap = {
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  slate: 'bg-surface-hover text-slate-300 border-border',
};

/**
 * Standardized Page Header
 * Typography: Title 48px (font-bold), Subtitle 18px (opacity 0.75), unified badge cluster and action buttons.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  iconColor = 'indigo',
  tag,
  tagColor = 'indigo',
  title,
  subtitle,
  statusBadges,
  actions,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-4 pb-6 border-b border-border/80', className)}>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        {/* Left Column: Icon, Tag, Title, Subtitle, Status Badges */}
        <div className="space-y-3 max-w-4xl">
          {/* Top Tag & Context Row */}
          {(icon || tag || statusBadges) && (
            <div className="flex flex-wrap items-center gap-2.5">
              {icon && (
                <div
                  className={cn(
                    'w-9 h-9 rounded-xl border flex items-center justify-center transition-colors',
                    iconColorMap[iconColor]
                  )}
                >
                  {icon}
                </div>
              )}

              {tag && (
                <span
                  className={cn(
                    'text-[11px] font-mono font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border',
                    tagColorMap[tagColor]
                  )}
                >
                  {tag}
                </span>
              )}

              {statusBadges}
            </div>
          )}

          {/* Standardized 48px Title */}
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold tracking-tight text-slate-100 leading-tight">
            {title}
          </h1>

          {/* Standardized 18px Subtitle */}
          <p className="text-base sm:text-[17px] text-slate-400/90 font-normal leading-relaxed max-w-3xl">
            {subtitle}
          </p>

          {/* Optional inline children (e.g. metadata or session chips) */}
          {children && <div className="pt-1">{children}</div>}
        </div>

        {/* Right Column: Page-Level Actions */}
        {actions && (
          <div className="flex items-center gap-3 flex-wrap lg:self-start pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
