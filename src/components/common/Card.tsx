import React from 'react';
import { cn } from '../../lib/utils';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'primary' | 'analytics' | 'subtle';
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

const variantStyles = {
  primary: 'bg-surface/90 border-border/80 hover:border-border-strong',
  analytics: 'bg-surface/80 border-border/80 hover:border-border-strong',
  subtle: 'bg-surface-subtle/80 border-border/70',
};

/**
 * Standardized Card Component (Type A and Type B)
 * Shared 20px radius, 1px border, dark glass background, and 200ms ease transition.
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'primary',
  className,
  onClick,
  hoverEffect = true,
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-[20px] border shadow-sm transition-all duration-200 ease-out overflow-hidden',
        variantStyles[variant],
        hoverEffect && 'hover:shadow-md hover:-translate-y-0.5',
        isClickable && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};
