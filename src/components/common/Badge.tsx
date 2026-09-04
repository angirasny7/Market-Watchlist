import React from 'react';
import { cn } from '../../lib/utils';
import { Flame, AlertTriangle, Info, CheckCircle, TrendingUp, TrendingDown, DollarSign, Award } from 'lucide-react';
import { EventPriority, EventType } from '../../types/event';
import { ConfidenceLevel } from '../../types/insight';

interface PriorityBadgeProps {
  priority: EventPriority;
  className?: string;
  size?: 'sm' | 'md';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  className,
  size = 'md',
}) => {
  const configs = {
    CRITICAL: {
      bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
      icon: Flame,
      label: 'Critical',
      glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]',
    },
    HIGH: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      icon: AlertTriangle,
      label: 'High Priority',
      glow: 'shadow-[0_0_10px_rgba(245,158,11,0.2)]',
    },
    MEDIUM: {
      bg: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
      icon: Info,
      label: 'Medium',
      glow: '',
    },
    LOW: {
      bg: 'bg-slate-800/60 border-slate-700/60 text-slate-400',
      icon: CheckCircle,
      label: 'Low',
      glow: '',
    },
  };

  const config = configs[priority] || configs.LOW;
  const Icon = config.icon;

  const sizeClasses =
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border tracking-wide uppercase',
        config.bg,
        config.glow,
        sizeClasses,
        className
      )}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {config.label}
    </span>
  );
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
  score?: number;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  score,
  className,
}) => {
  const configs = {
    HIGH: {
      bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
      label: 'High Confidence',
      scoreText: score ? ` (${Math.round(score * 100)}%)` : '',
    },
    MEDIUM: {
      bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
      label: 'Medium Confidence',
      scoreText: score ? ` (${Math.round(score * 100)}%)` : '',
    },
    LOW: {
      bg: 'bg-slate-800/80 border-slate-700 text-slate-400',
      label: 'Low Confidence',
      scoreText: score ? ` (${Math.round(score * 100)}%)` : '',
    },
  };

  const config = configs[level] || configs.LOW;

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border',
        config.bg,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current animate-pulse" />
      {config.label}
      {config.scoreText}
    </span>
  );
};

interface EventTypeBadgeProps {
  eventType: EventType;
  className?: string;
}

export const EventTypeBadge: React.FC<EventTypeBadgeProps> = ({
  eventType,
  className,
}) => {
  const configs: Record<EventType, { label: string; icon: React.ElementType; color: string }> = {
    '52_WEEK_HIGH': {
      label: '52-Week High',
      icon: Award,
      color: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
    },
    FIFTY_TWO_WEEK_HIGH: {
      label: '52-Week High',
      icon: Award,
      color: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30',
    },
    '52_WEEK_LOW': {
      label: '52-Week Low',
      icon: TrendingDown,
      color: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
    },
    FIFTY_TWO_WEEK_LOW: {
      label: '52-Week Low',
      icon: TrendingDown,
      color: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
    },
    PRICE_SPIKE: {
      label: 'Price Surge',
      icon: TrendingUp,
      color: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
    },
    PRICE_SURGE: {
      label: 'Price Surge',
      icon: TrendingUp,
      color: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30',
    },
    PRICE_DROP: {
      label: 'Price Drop',
      icon: TrendingDown,
      color: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
    },
    VOLUME_SPIKE: {
      label: 'Volume Anomaly',
      icon: TrendingUp,
      color: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/30',
    },
    EARNINGS_RELEASE: {
      label: 'Earnings',
      icon: Award,
      color: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
    },
    EARNINGS_BEAT: {
      label: 'Earnings Beat',
      icon: Award,
      color: 'bg-purple-950/40 text-purple-300 border-purple-500/30',
    },
    EARNINGS_MISS: {
      label: 'Earnings Miss',
      icon: AlertTriangle,
      color: 'bg-rose-950/40 text-rose-300 border-rose-500/30',
    },
    DIVIDEND_ANNOUNCED: {
      label: 'Dividend',
      icon: DollarSign,
      color: 'bg-amber-950/40 text-amber-300 border-amber-500/30',
    },
    MACRO_POLICY: {
      label: 'Macro / RBI',
      icon: Info,
      color: 'bg-blue-950/40 text-blue-300 border-blue-500/30',
    },
  };

  const config = configs[eventType] || {
    label: eventType,
    icon: Info,
    color: 'bg-slate-900 text-slate-300 border-slate-700',
  };
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md border gap-1.5',
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

interface DeltaBadgeProps {
  value: number;
  currency?: string;
  isPercent?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DeltaBadge: React.FC<DeltaBadgeProps> = ({
  value,
  isPercent = true,
  className,
  size = 'md',
}) => {
  const isPositive = value >= 0;
  const sign = isPositive ? '+' : '';
  const text = isPercent ? `${sign}${value.toFixed(2)}%` : `${sign}${value.toFixed(2)}`;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-0.5',
    lg: 'text-base font-semibold px-2.5 py-1',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono tabular-nums rounded font-medium',
        isPositive
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
          : 'bg-rose-500/15 text-rose-400 border border-rose-500/20',
        sizeClasses,
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3.5 h-3.5 mr-1 inline" />
      ) : (
        <TrendingDown className="w-3.5 h-3.5 mr-1 inline" />
      )}
      {text}
    </span>
  );
};
