import React from 'react';
import { NavLink } from 'react-router-dom';
import { useMarketStore } from '../../store/useMarketStore';
import { MAIN_NAV_ITEMS } from '../../config/navigation';

export const BottomTabBar: React.FC = () => {
  const { events } = useMarketStore();
  const unreadCount = Array.isArray(events) ? events.filter((e) => !e?.read).length : 0;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg"
    >
      {MAIN_NAV_ITEMS.map((tab) => {
        const Icon = tab.icon;
        const badge = tab.id === 'feed' && unreadCount > 0 ? unreadCount : undefined;
        const showDot = false;

        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            end={tab.path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[11px] font-medium transition-colors relative ${
                isActive
                  ? 'text-indigo-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <div className="relative">
              <Icon className="w-5 h-5 mb-0.5" />
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border border-surface">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
              {showDot && !badge && (
                <span
                  aria-label="Unacknowledged digest available"
                  className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-surface shrink-0"
                />
              )}
            </div>
            <span>{tab.shortLabel}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
