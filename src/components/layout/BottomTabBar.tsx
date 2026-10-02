import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Bell, List, BookOpen, TrendingUp } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';

export const BottomTabBar: React.FC = () => {
  const { events } = useMarketStore();
  const unreadCount = events.filter((e) => !e.read).length;

  const tabs = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/feed', label: 'Feed', icon: Bell, badge: unreadCount },
    { to: '/watchlist', label: 'Watchlist', icon: List },
    { to: '/memory', label: 'Memory', icon: BookOpen },
    { to: '/highlights', label: 'Highlights', icon: TrendingUp },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-lg border-t border-border px-2 py-1.5 flex items-center justify-around shadow-lg"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
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
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-indigo-500 text-white font-mono text-[9px] font-bold flex items-center justify-center border border-surface">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BottomTabBar;
