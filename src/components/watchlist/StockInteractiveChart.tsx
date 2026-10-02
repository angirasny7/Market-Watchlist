import React, { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  ColorType,
  IChartApi,
  ISeriesApi,
  Time,
} from 'lightweight-charts';
import { StockHistoryDataPoint } from '../../services/stockService';

interface StockInteractiveChartProps {
  dataPoints: StockHistoryDataPoint[];
  currency?: string;
  chartType?: 'candlestick' | 'area';
  height?: number;
  isPositive?: boolean;
}

export const StockInteractiveChart: React.FC<StockInteractiveChartProps> = ({
  dataPoints,
  currency = '₹',
  chartType = 'area',
  height = 320,
  isPositive = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Initialize TradingView lightweight chart instance
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
      },
      crosshair: {
        vertLine: {
          color: '#64748b',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#64748b',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.6)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.6)',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) =>
          `${currency}${price.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
    });

    chartRef.current = chart;

    // 2. Add series based on chartType
    const strokeColor = isPositive ? '#10b981' : '#f43f5e';
    const topColor = isPositive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)';
    const bottomColor = isPositive ? 'rgba(16, 185, 129, 0.0)' : 'rgba(244, 63, 94, 0.0)';

    if (chartType === 'candlestick') {
      const candlestickSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#f43f5e',
        borderUpColor: '#10b981',
        borderDownColor: '#f43f5e',
        wickUpColor: '#10b981',
        wickDownColor: '#f43f5e',
      });
      seriesRef.current = candlestickSeries;
    } else {
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: strokeColor,
        topColor,
        bottomColor,
        lineWidth: 2,
      });
      seriesRef.current = areaSeries;
    }

    // 3. Populate data
    if (dataPoints.length > 0) {
      if (chartType === 'candlestick') {
        const candleData = dataPoints.map((dp) => ({
          time: dp.time as Time,
          open: dp.open,
          high: dp.high,
          low: dp.low,
          close: dp.close,
        }));
        seriesRef.current?.setData(candleData);
      } else {
        const areaData = dataPoints.map((dp) => ({
          time: dp.time as Time,
          value: dp.close,
        }));
        seriesRef.current?.setData(areaData);
      }
      chart.timeScale().fitContent();
    }

    // 4. Responsive Auto-Resizing via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0 || !chartRef.current) return;
      const { width: containerWidth } = entries[0].contentRect;
      chartRef.current.applyOptions({ width: containerWidth });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [dataPoints, currency, chartType, height, isPositive]);

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-surface-subtle/50 border border-border/80 p-2">
      <div
        ref={chartContainerRef}
        className="w-full relative min-h-[280px]"
        style={{ height }}
      />
      {dataPoints.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">
          No historical tick data available for this timeframe
        </div>
      )}
    </div>
  );
};
