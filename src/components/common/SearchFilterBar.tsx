import React from 'react';
import { cn } from '../../lib/utils';
import { Search, X } from 'lucide-react';

export interface SearchFilterBarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Standardized Search & Filter Bar Container
 * Same height (h-12), 16px radius, border, and unified icon placement across all views.
 */
export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  leftSlot,
  rightSlot,
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-[16px] bg-surface/90 border border-border p-2 sm:p-2.5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3',
        className
      )}
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        {leftSlot}

        {onSearchChange && (
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-10 pl-9 pr-8 rounded-xl bg-surface-subtle border border-border text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-sans"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-surface-hover transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {children}
      </div>

      {rightSlot && (
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
          {rightSlot}
        </div>
      )}
    </div>
  );
};
