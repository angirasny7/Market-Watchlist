import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { Insight } from '../../types/insight';

interface ConfidenceIndicatorProps {
  insights: Insight[];
}

export const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  insights,
}) => {
  if (!insights || insights.length === 0) return null;

  const total = insights.length;
  const highCount = insights.filter((i) => i.confidenceLevel === 'HIGH').length;
  const mediumCount = insights.filter((i) => i.confidenceLevel === 'MEDIUM').length;
  const lowCount = insights.filter((i) => i.confidenceLevel === 'LOW').length;

  const highPercent = Math.round((highCount / total) * 100);
  const mediumPercent = Math.round((mediumCount / total) * 100);
  const lowPercent = Math.round((lowCount / total) * 100);

  return (
    <div className="p-4 rounded-xl bg-surface border border-border space-y-2.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
            Context Engine Confidence Distribution
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <span className="text-emerald-400 font-medium">
            High: {highCount} ({highPercent}%)
          </span>
          <span className="text-amber-400 font-medium">
            Medium: {mediumCount} ({mediumPercent}%)
          </span>
          {lowCount > 0 && (
            <span className="text-slate-400 font-medium">
              Low: {lowCount} ({lowPercent}%)
            </span>
          )}
        </div>
      </div>

      {/* Visual Multi-Segment Confidence Progress Bar */}
      <div className="h-2 w-full rounded-full bg-surface-subtle overflow-hidden flex">
        {highPercent > 0 && (
          <div
            style={{ width: `${highPercent}%` }}
            className="h-full bg-emerald-500 transition-all duration-500"
            title={`High Confidence: ${highPercent}%`}
          />
        )}
        {mediumPercent > 0 && (
          <div
            style={{ width: `${mediumPercent}%` }}
            className="h-full bg-amber-500 transition-all duration-500"
            title={`Medium Confidence: ${mediumPercent}%`}
          />
        )}
        {lowPercent > 0 && (
          <div
            style={{ width: `${lowPercent}%` }}
            className="h-full bg-slate-600 transition-all duration-500"
            title={`Low Confidence: ${lowPercent}%`}
          />
        )}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        <Info className="w-3 h-3 text-slate-400 shrink-0" />
        <span>
          High confidence signals are directly corroborated by official regulatory filings (BSE/NSE) or consensus financial press.
        </span>
      </div>
    </div>
  );
};
