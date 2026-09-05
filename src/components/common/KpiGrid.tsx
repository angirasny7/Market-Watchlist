import React from 'react';
import { cn } from '../../lib/utils';

export interface KpiGridProps {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}

const colMap = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

/**
 * Standardized Responsive KPI Grid
 * Desktop: 4 columns (default)
 * Tablet: 2 columns
 * Mobile: 1 column
 */
export const KpiGrid: React.FC<KpiGridProps> = ({
  children,
  cols = 4,
  className,
}) => {
  return (
    <div className={cn('grid gap-4 sm:gap-5', colMap[cols], className)}>
      {children}
    </div>
  );
};
