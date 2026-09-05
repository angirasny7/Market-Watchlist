import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionHeaderProps {
  icon?: React.ReactNode;
  iconColor?: 'emerald' | 'cyan' | 'indigo' | 'rose' | 'amber' | 'purple' | 'slate';
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const iconStyles = {
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  slate: 'bg-surface-hover text-slate-300 border-border',
};

/**
 * Standardized Section Header
 * Enforces uniform Section Icon + Title + Optional Badge + Description structure.
 */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon,
  iconColor = 'indigo',
  title,
  description,
  badge,
  actions,
  className,
}) => {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4', className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div
              className={cn(
                'w-7 h-7 rounded-lg border flex items-center justify-center transition-colors',
                iconStyles[iconColor]
              )}
            >
              {icon}
            </div>
          )}
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl pl-0 sm:pl-0.5">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
