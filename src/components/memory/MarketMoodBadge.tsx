import React from 'react';
import { TrendingUp, TrendingDown, Minus, Flame, Activity } from 'lucide-react';
import { cn } from '../../lib/utils';

export type MarketMoodType = 'EXTREME_GREED' | 'BULLISH' | 'NEUTRAL' | 'CHOPPY' | 'BEARISH';

interface MarketMoodBadgeProps {
  mood: MarketMoodType;
  className?: string;
  size?: 'sm' | 'md';
}

export const MarketMoodBadge: React.FC<MarketMoodBadgeProps> = ({
  mood,
  className,
  size = 'md',
}) => {
  const configs = {
    BULLISH: {
      label: 'Bullish Market',
      icon: TrendingUp,
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      glow: 'shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    },
    EXTREME_GREED: {
      label: 'Extreme Greed',
      icon: Flame,
      bg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
      glow: 'shadow-[0_0_10px_rgba(20,184,166,0.15)]',
    },
    NEUTRAL: {
      label: 'Neutral Consolidation',
      icon: Minus,
      bg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
      glow: '',
    },
    CHOPPY: {
      label: 'Choppy Volatility',
      icon: Activity,
      bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      glow: '',
    },
    BEARISH: {
      label: 'Bearish Correction',
      icon: TrendingDown,
      bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      glow: 'shadow-[0_0_10px_rgba(244,63,94,0.15)]',
    },
  };

  const config = configs[mood] || configs.NEUTRAL;
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5 gap-1'
      : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium rounded-full border tracking-wide',
        config.bg,
        config.glow,
        sizeClasses,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
    </span>
  );
};
