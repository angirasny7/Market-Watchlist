import React, { useState } from 'react';
import { Plus, MoreVertical, Edit2, Trash2, Layers } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { UserWatchlist } from '../../services/watchlistService';
import { PopoverMenu } from '../common';
import {
  CreateWatchlistModal,
  RenameWatchlistModal,
  DeleteWatchlistModal,
} from './WatchlistManageModals';

interface WatchlistTabsProps {
  totalStocksCount: number;
  onWatchlistCreated?: (newWatchlistId: string) => void;
}

export const WatchlistTabs: React.FC<WatchlistTabsProps> = ({
  totalStocksCount,
  onWatchlistCreated,
}) => {
  const {
    userWatchlists,
    activeWatchlistId,
    setActiveWatchlistId,
  } = useMarketStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renamingWatchlist, setRenamingWatchlist] = useState<UserWatchlist | null>(null);
  const [deletingWatchlist, setDeletingWatchlist] = useState<UserWatchlist | null>(null);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-border/80 pb-2 mb-4 overflow-x-auto no-scrollbar">
        {/* Tab Buttons Container */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
          {/* 1. All Stocks Union Tab */}
          <button
            type="button"
            onClick={() => setActiveWatchlistId('all')}
            title={`${totalStocksCount} unique stocks across ${userWatchlists.length} ${userWatchlists.length === 1 ? 'list' : 'lists'}`}
            aria-label={`${totalStocksCount} unique stocks across ${userWatchlists.length} ${userWatchlists.length === 1 ? 'list' : 'lists'}`}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeWatchlistId === 'all'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Watchlists</span>
          </button>

          {/* 2. Individual Watchlist Tabs */}
          {userWatchlists.map((wl) => {
            const isActive = activeWatchlistId === wl.id;
            const menuItems = [
              {
                label: 'Rename',
                icon: <Edit2 className="w-3.5 h-3.5 text-slate-400" />,
                onClick: () => setRenamingWatchlist(wl),
              },
              ...(!wl.isDefault && userWatchlists.length > 1
                ? [
                    {
                      label: 'Delete',
                      icon: <Trash2 className="w-3.5 h-3.5 text-rose-400" />,
                      onClick: () => setDeletingWatchlist(wl),
                      variant: 'danger' as const,
                    },
                  ]
                : []),
            ];

            return (
              <div
                key={wl.id}
                className={`flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover border border-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setActiveWatchlistId(wl.id)}
                  className="flex items-center gap-1.5 sm:gap-2 text-left outline-none"
                >
                  <span className="max-w-[130px] sm:max-w-[180px] truncate">{wl.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-semibold ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-200'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {wl.stockCount}
                  </span>
                </button>

                {/* Actions ⋯ Button via PopoverMenu Portal */}
                {(!wl.isDefault || userWatchlists.length > 0) && (
                  <PopoverMenu
                    ariaLabel={`Settings for ${wl.name}`}
                    align="left"
                    trigger={({ ref, onClick, 'aria-haspopup': ariaHasPopup, 'aria-expanded': ariaExpanded }) => (
                      <button
                        ref={ref}
                        type="button"
                        onClick={onClick}
                        aria-haspopup={ariaHasPopup}
                        aria-expanded={ariaExpanded}
                        aria-label={`Settings for ${wl.name}`}
                        title="Watchlist settings"
                        className="p-1 rounded hover:bg-surface-active text-slate-400 hover:text-slate-200 transition-colors shrink-0"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    )}
                    items={menuItems}
                  />
                )}
              </div>
            );
          })}

          {/* 3. + New Watchlist Button */}
          {userWatchlists.length < 10 && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-dashed border-border hover:border-emerald-500/30 transition-all shrink-0"
              title="Create a new watchlist (max 10)"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New list</span>
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateWatchlistModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={onWatchlistCreated}
      />

      <RenameWatchlistModal
        watchlist={renamingWatchlist}
        isOpen={Boolean(renamingWatchlist)}
        onClose={() => setRenamingWatchlist(null)}
      />

      <DeleteWatchlistModal
        watchlist={deletingWatchlist}
        isOpen={Boolean(deletingWatchlist)}
        onClose={() => setDeletingWatchlist(null)}
      />
    </>
  );
};
