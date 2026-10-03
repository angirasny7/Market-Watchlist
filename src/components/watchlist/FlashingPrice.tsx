import React, { useEffect, useRef, useState } from 'react';

interface FlashingPriceProps {
  price: number | null;
  currency: string;
  className?: string;
  isDelayed?: boolean;
}

export const FlashingPrice: React.FC<FlashingPriceProps> = ({
  price,
  currency,
  className = '',
  isDelayed = true,
}) => {
  const prevPriceRef = useRef<number | null>(price);
  const [flashColor, setFlashColor] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (
      price !== null &&
      prevPriceRef.current !== null &&
      prevPriceRef.current !== price &&
      price > 0 &&
      prevPriceRef.current > 0
    ) {
      const color = price > prevPriceRef.current ? 'up' : 'down';
      setFlashColor(color);
      const timer = setTimeout(() => {
        setFlashColor(null);
      }, 1200);
      prevPriceRef.current = price;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = price;
  }, [price]);

  if (price === null || price === undefined || isNaN(price) || price <= 0) {
    return (
      <div
        title="Price unavailable"
        className={`font-mono text-sm text-slate-500 flex items-center justify-end gap-1 ${className}`}
      >
        <span>—</span>
        <span className="text-amber-400 text-xs">⚠️</span>
      </div>
    );
  }

  const flashClass =
    flashColor === 'up'
      ? 'bg-emerald-500/20 text-emerald-300 rounded px-1 transition-colors duration-500 motion-reduce:transition-none'
      : flashColor === 'down'
      ? 'bg-rose-500/20 text-rose-300 rounded px-1 transition-colors duration-500 motion-reduce:transition-none'
      : 'transition-colors duration-500';

  return (
    <div
      title={isDelayed ? 'Yahoo Finance quote (delayed ~15m for NSE/BSE)' : 'Market quote'}
      className={`font-semibold font-mono inline-block ${flashClass} ${className}`}
    >
      {currency}
      {price.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}
    </div>
  );
};
