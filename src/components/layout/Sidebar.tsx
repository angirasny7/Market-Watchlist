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
  const { watchlist, events, totalMemoryCount, archivedEventsCount, savedEventsCount, digests } = useMarketStore();

  const activeEventsCount = events.length;
  const criticalEventsCount = events.filter((e) => e.priority === 'CRITICAL').length;
  const memoryCount = totalMemoryCount > 0 ? totalMemoryCount : (archivedEventsCount + savedEventsCount);

  const navItems = [
    {
      name: 'Dashboard',
      path: '/',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
      description: 'Unified command center and personalized market delta summary',
    },
    {
      name: 'Attention Feed',
      path: '/feed',
      icon: BellRing,
      badge: activeEventsCount > 0 ? `${activeEventsCount}` : null,
      badgeColor: criticalEventsCount > 0 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
      highlightBadge: criticalEventsCount > 0,
      description: 'Actionable real-time catalysts and events requiring investor attention',
    },
    {
      name: 'Watchlist',
      path: '/watchlist',
      icon: ListOrdered,
      badge: `${watchlist.length}`,
      badgeColor: 'bg-slate-800/80 text-slate-400 border border-slate-700/60',
      description: 'Monitored portfolio equities with causal delta insights',
    },
    {
      name: 'Market Memory',
      path: '/memory',
      icon: History,
      badge: memoryCount > 0 ? `${memoryCount}` : null,
      badgeColor: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30',
      description: 'Personal repository of saved and archived market events.',
    },
    {
      name: 'Market Highlights',
      path: '/highlights',
      icon: TrendingUp,
      badge: digests.length > 0 ? `${digests.length}` : null,
      badgeColor: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
      description: 'Autonomous market intelligence hub.',
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
                title={item.description}
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
                          'text-[10px] font-mono font-semibold px-1.5 py-0.5 min-w-[20px] h-5 rounded-full inline-flex items-center justify-center text-center transition-all shrink-0 whitespace-nowrap leading-none',
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
