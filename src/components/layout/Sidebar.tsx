import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BellRing,
  ListOrdered,
  History,
  TrendingUp,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { cn } from '../../lib/utils';

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onItemClick }) => {
  const { watchlist, events, digests } = useMarketStore();

  const unreadEventsCount = events.filter((e) => !e.read).length;
  const criticalEventsCount = events.filter((e) => e.priority === 'CRITICAL').length;

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Attention Feed',
      path: '/feed',
      icon: BellRing,
      badge: unreadEventsCount > 0 ? `${unreadEventsCount} New` : null,
      badgeColor: criticalEventsCount > 0 ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      highlightBadge: criticalEventsCount > 0,
    },
    {
      name: 'Watchlist',
      path: '/watchlist',
      icon: ListOrdered,
      badge: `${watchlist.length}`,
      badgeColor: 'bg-surface-hover text-slate-400 border border-border',
    },
    {
      name: 'Market Memory',
      path: '/memory',
      icon: History,
      badge: `${digests.length}`,
      badgeColor: 'bg-surface-hover text-slate-400 border border-border',
    },
    {
      name: 'Market Highlights',
      path: '/highlights',
      icon: TrendingUp,
      badge: 'Macro',
      badgeColor: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
    },
  ];

  return (
    <aside
      className={cn(
        'w-64 h-screen bg-surface-subtle border-r border-border flex flex-col justify-between shrink-0 select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <Zap className="w-4 h-4 text-white fill-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
              Smart Market
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
                AI
              </span>
            </span>
            <p className="text-[11px] text-slate-400 tracking-normal font-normal">
              Market Assistant
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-surface-active text-slate-100 shadow-sm border border-border-strong'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-surface-hover'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={cn(
                          'w-4 h-4 transition-colors',
                          isActive
                            ? 'text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span>{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] font-mono font-medium px-2 py-0.5 rounded-full transition-all',
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Assistant Status Footer Box */}
      <div className="p-4 border-t border-border">
        <div className="p-3 rounded-xl bg-surface border border-border/80 text-xs">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Assistant Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Comparing market state against your last visit.
          </p>
        </div>
      </div>
    </aside>
  );
};
