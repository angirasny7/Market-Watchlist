import React from 'react';
import { History, Bookmark, CheckCircle2, Layers, Clock, Shield } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { PageHeader, KpiGrid, KpiCard } from '../common';

export interface MarketMemoryHeaderProps {
  totalCount?: number;
  savedCount?: number;
  archivedCount?: number;
  symbolsCoveredCount?: number;
  lastAddedAt?: string | null;
}

export const MarketMemoryHeader: React.FC<MarketMemoryHeaderProps> = ({
  totalCount: propTotal,
  savedCount: propSaved,
  archivedCount: propArchived,
  symbolsCoveredCount: propSymbols,
  lastAddedAt,
}) => {
  const { totalMemoryCount, savedEventsCount, archivedEventsCount } = useMarketStore();

  const total = propTotal !== undefined ? propTotal : totalMemoryCount;
  const saved = propSaved !== undefined ? propSaved : savedEventsCount;
  const archived = propArchived !== undefined ? propArchived : archivedEventsCount;
  const symbolsCount = propSymbols !== undefined ? propSymbols : 0;

  const formatLastAdded = (isoString?: string | null) => {
    if (!isoString) return 'None yet';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  };

  const statusBadges = (
    <>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border text-slate-300 font-mono">
        <Shield className="w-3.5 h-3.5 text-indigo-400" />
        <span>Vault:</span>
        <span className="text-emerald-400 font-semibold">Encrypted Storage</span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span>Latest: {formatLastAdded(lastAddedAt)}</span>
      </div>
    </>
  );

  return (
    <div className="space-y-6">
      {/* 1. Standardized Page Header */}
      <PageHeader
        icon={<History className="w-5 h-5" />}
        iconColor="indigo"
        tag="Personal Repository"
        tagColor="indigo"
        title="Market Memory"
        subtitle="Your immutable personal vault of saved market events, causal insights, and historical dossiers for longitudinal analysis."
        statusBadges={statusBadges}
      />

      {/* 2. Standardized KPI Grid */}
      <KpiGrid cols={4}>
        <KpiCard
          label="Total Memories"
          value={total}
          subtext="Cataloged intelligence items"
          icon={<History className="w-4 h-4" />}
          accent="indigo"
        />
        <KpiCard
          label="Saved For Later"
          value={saved}
          subtext="Bookmarked for review"
          icon={<Bookmark className="w-4 h-4" />}
          accent="amber"
        />
        <KpiCard
          label="Archived Signals"
          value={archived}
          subtext="Acknowledged developments"
          icon={<CheckCircle2 className="w-4 h-4" />}
          accent="emerald"
        />
        <KpiCard
          label="Symbols Covered"
          value={symbolsCount}
          subtext="Unique tracked equities"
          icon={<Layers className="w-4 h-4" />}
          accent="cyan"
        />
      </KpiGrid>
    </div>
  );
};
