import React from 'react';
import { SparklinePoint } from '../../types/stock';
import { cn } from '../../lib/utils';

interface SparklineProps {
  data: SparklinePoint[];
  width?: number;
  height?: number;
  className?: string;
  isPositive?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  width = 120,
  height = 36,
  className,
  isPositive,
}) => {
  if (!data || data.length < 2) {
    return <div className={cn('h-8 w-24 bg-surface-subtle rounded', className)} />;
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  // Determine trend if not explicitly passed
  const positive =
    typeof isPositive === 'boolean'
      ? isPositive
      : prices[prices.length - 1] >= prices[0];

  const strokeColor = positive ? '#10B981' : '#F43F5E';
  const fillGradientId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  // Convert points to SVG coordinates with small padding
  const paddingX = 4;
  const paddingY = 4;
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;

  const points = data.map((d, index) => {
    const x = paddingX + (index / (data.length - 1)) * usableWidth;
    const y =
      paddingY + usableHeight - ((d.price - minPrice) / range) * usableHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `${pathD} L ${width - paddingX},${height} L ${paddingX},${height} Z`;

  return (
    <div className={cn('relative flex items-center', className)}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={strokeColor}
              stopOpacity={positive ? '0.28' : '0.22'}
            />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient fill underneath */}
        <path d={areaD} fill={`url(#${fillGradientId})`} />

        {/* Line stroke */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Ending endpoint dot */}
        <circle
          cx={width - paddingX}
          cy={
            paddingY +
            usableHeight -
            ((prices[prices.length - 1] - minPrice) / range) * usableHeight
          }
          r="2.5"
          fill={strokeColor}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};
