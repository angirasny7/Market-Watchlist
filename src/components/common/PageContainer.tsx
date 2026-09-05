import React from 'react';
import { cn } from '../../lib/utils';

export interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Standardized Global Page Container
 * Enforces uniform max-width (max-w-7xl), responsive padding, vertical rhythm, and enter animation.
 */
export const PageContainer: React.FC<PageContainerProps> = ({ children, className }) => {
  return (
    <div className={cn('max-w-7xl mx-auto space-y-8 pb-16 animate-fade-in', className)}>
      {children}
    </div>
  );
};
