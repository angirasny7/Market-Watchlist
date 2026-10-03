import React from 'react';
import {
  Layers,
  AlertTriangle,
  Calendar,
  Bell,
  Sparkles,
  Check,
} from 'lucide-react';
import { WatchlistQuickFilter } from '../../lib/watchlistFilters';
import { WatchlistOverviewSummary } from '../../services/watchlistService';

interface WatchlistSummaryCardsProps {
  summary: WatchlistOverviewSummary;
  activeFilter: WatchlistQuickFilter;
  onSelectFilter: (filter: WatchlistQuickFilter) => void;
  isAllWatchlists?: boolean;
  watchlistsCount?: number;
}

export const WatchlistSummaryCards: React.FC<WatchlistSummaryCardsProps> = ({
  summary,
  activeFilter,
  onSelectFilter,
  isAllWatchlists = true,
  watchlistsCount = 1,
}) => {
  const cards: Array<{
    id: WatchlistQuickFilter;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    accentColor: string;
    activeBorder: string;
    badgeText?: string;
  }> = [
    {
      id: 'ALL',
      label: 'Total Stocks',
      count: summary.totalStocks,
      icon: Layers,
      accentColor: 'text-slate-400 group-hover:text-slate-200',
      activeBorder: 'border-slate-400 bg-slate-800/60 ring-2 ring-slate-400/30',
      badgeText: isAllWatchlists
        ? `across ${watchlistsCount} ${watchlistsCount === 1 ? 'list' : 'lists'}`
        : 'in this list',
    },
    {
      id: 'NEED_ATTENTION',
      label: 'Need Attention',
      count: summary.needAttention,
      icon: AlertTriangle,
      accentColor: 'text-amber-400 group-hover:text-amber-300',
      activeBorder: 'border-amber-400 bg-amber-950/30 ring-2 ring-amber-400/40 shadow-lg shadow-amber-500/10',
      badgeText: 'high priority',
    },
    {
      id: 'UPCOMING_EVENTS',
      label: 'Upcoming Events',
      count: summary.upcomingEvents,
      icon: Calendar,
      accentColor: 'text-cyan-400 group-hover:text-cyan-300',
      activeBorder: 'border-cyan-400 bg-cyan-950/30 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/10',
      badgeText: 'in the next 14 days',
    },
    {
      id: 'ACTIVE_ALERTS',
      label: 'Active Alerts',
      count: summary.activeAlerts,
      icon: Bell,
      accentColor: 'text-indigo-400 group-hover:text-indigo-300',
      activeBorder: 'border-indigo-400 bg-indigo-950/30 ring-2 ring-indigo-400/40 shadow-lg shadow-indigo-500/10',
      badgeText: 'active triggers',
    },
    {
      id: 'UNSEEN_UPDATES',
      label: 'Unseen Updates',
      count: summary.unseenUpdates,
      icon: Sparkles,
      accentColor: 'text-violet-400 group-hover:text-violet-300',
      activeBorder: 'border-violet-400 bg-violet-950/30 ring-2 ring-violet-400/40 shadow-lg shadow-violet-500/10',
      badgeText: 'unread updates',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 mb-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeFilter === card.id;

        return (
          <button
            key={card.id}
            type="button"
            role="button"
            aria-pressed={isActive}
            onClick={() => {
              if (isActive && card.id !== 'ALL') {
                onSelectFilter('ALL');
              } else {
                onSelectFilter(card.id);
              }
            }}
            className={`group relative p-3 sm:p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
              isActive
                ? card.activeBorder
                : 'border-border bg-surface hover:border-slate-700/80 hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] font-medium transition-colors ${
                isActive ? 'text-slate-200 font-semibold' : 'text-slate-400 group-hover:text-slate-300'
              }`}>
                {card.label}
              </span>
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-100' : card.accentColor} transition-colors`} />
            </div>

            <div className="flex items-baseline justify-between gap-1">
              <span className="text-lg sm:text-xl font-bold font-mono tracking-tight text-slate-100">
                {card.count}
              </span>

              {isActive && card.id !== 'ALL' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm animate-in fade-in duration-200">
                  <Check className="w-2.5 h-2.5" />
                  <span>Filtered</span>
                </span>
              ) : isActive && card.id === 'ALL' ? (
                <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/60">
                  {card.badgeText}
                </span>
              ) : card.badgeText ? (
                <span className="text-[10px] text-slate-500 group-hover:text-slate-400 font-medium transition-colors">
                  {card.badgeText}
                </span>
              ) : null}
            </div>

            {isActive && (
              <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-60" />
            )}
          </button>
        );
      })}
    </div>
  );
};
