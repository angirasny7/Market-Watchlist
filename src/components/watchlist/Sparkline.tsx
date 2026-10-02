import React, { useMemo } from 'react';

interface SparklineProps {
  points: number[];
  isPositive: boolean;
  width?: number;
  height?: number;
  className?: string;
  ariaLabel?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({
  points,
  isPositive,
  width = 100,
  height = 32,
  className = '',
  ariaLabel,
}) => {
  const { pathData, areaData, min, max, lastPrice } = useMemo(() => {
    if (!points || points.length === 0) {
      return { pathData: '', areaData: '', min: 0, max: 0, lastPrice: 0 };
    }

    const validPoints = points.filter((p) => typeof p === 'number' && !isNaN(p));
    if (validPoints.length === 0) {
      return { pathData: '', areaData: '', min: 0, max: 0, lastPrice: 0 };
    }

    const min = Math.min(...validPoints);
    const max = Math.max(...validPoints);
    const range = max - min || 1;
    const padding = 4;
    const innerHeight = height - padding * 2;
    const stepX = width / Math.max(1, validPoints.length - 1);

    const coords = validPoints.map((val, idx) => {
      const x = Number((idx * stepX).toFixed(1));
      const normalizedY = 1 - (val - min) / range;
      const y = Number((padding + normalizedY * innerHeight).toFixed(1));
      return { x, y };
    });

    const pathData = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
    }, '');

    const areaData = `${pathData} L ${width},${height} L 0,${height} Z`;

    return {
      pathData,
      areaData,
      min,
      max,
      lastPrice: validPoints[validPoints.length - 1],
    };
  }, [points, width, height]);

  if (!pathData) {
    return (
      <div
        className={`h-8 w-24 flex items-center justify-center text-[10px] text-slate-500 font-mono ${className}`}
        aria-hidden="true"
      >
        —
      </div>
    );
  }

  const strokeColor = isPositive ? '#10b981' : '#f43f5e';
  const gradientId = useMemo(
    () => `sparkline-grad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substring(2, 7)}`,
    [isPositive]
  );
  const defaultLabel = `Mini chart showing price movement between ${min} and ${max}, ending at ${lastPrice}`;

  return (
    <div
      role="img"
      aria-label={ariaLabel || defaultLabel}
      className={`inline-block overflow-hidden ${className}`}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient area beneath sparkline */}
        <path d={areaData} fill={`url(#${gradientId})`} />

        {/* Sparkline curve */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
