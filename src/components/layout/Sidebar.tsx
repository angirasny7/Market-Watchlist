import React, { useState, useCallback, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { GripVertical } from 'lucide-react';
import { useMarketStore } from '../../store/useMarketStore';
import { cn } from '../../lib/utils';
import { MAIN_NAV_ITEMS } from '../../config/navigation';

const DEFAULT_WIDTH = 256;
const MIN_WIDTH = 190;
const MAX_WIDTH = 450;

interface SidebarProps {
  className?: string;
  onItemClick?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className, onItemClick }) => {
  const { events } = useMarketStore();

  const [width, setWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('smw_sidebar_width');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_WIDTH;
  });

  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, moveEvent.clientX));
      setWidth(newWidth);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      const finalWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, upEvent.clientX));
      try {
        localStorage.setItem('smw_sidebar_width', finalWidth.toString());
      } catch {
        // ignore
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;
    setIsDragging(true);
    isDraggingRef.current = true;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!isDraggingRef.current || !moveEvent.touches[0]) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, moveEvent.touches[0].clientX));
      setWidth(newWidth);
    };

    const handleTouchEnd = (endEvent: TouchEvent) => {
      isDraggingRef.current = false;
      setIsDragging(false);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);

      const lastTouch = endEvent.changedTouches[0];
      if (lastTouch) {
        const finalWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, lastTouch.clientX));
        try {
          localStorage.setItem('smw_sidebar_width', finalWidth.toString());
        } catch {
          // ignore
        }
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  }, []);

  const handleDoubleClick = () => {
    setWidth(DEFAULT_WIDTH);
    try {
      localStorage.setItem('smw_sidebar_width', DEFAULT_WIDTH.toString());
    } catch {
      // ignore
    }
  };

  const unreadFeedCount = Array.isArray(events) ? events.filter((e) => !e?.read).length : 0;
  const feedBadgeText = unreadFeedCount > 99 ? '99+' : `${unreadFeedCount}`;

  const navItems = MAIN_NAV_ITEMS.map((item) => {
    if (item.id === 'feed') {
      return {
        ...item,
        badge: unreadFeedCount > 0 ? feedBadgeText : null,
        badgeAriaLabel: `${unreadFeedCount} unread updates`,
        badgeColor: 'bg-rose-500/15 text-rose-400 border border-rose-500/30 font-mono',
        showDot: false,
      };
    }
    if (item.id === 'memory') {
      return {
        ...item,
        badge: null,
        badgeAriaLabel: undefined,
        badgeColor: undefined,
        showDot: false,
      };
    }
    return {
      ...item,
      badge: null,
      badgeAriaLabel: undefined,
      badgeColor: undefined,
      showDot: false,
    };
  });

  return (
    <aside
      style={{ width: `${width}px` }}
      className={cn(
        'relative h-screen bg-surface-subtle border-r border-border flex flex-col justify-between shrink-0 select-none transition-[width] duration-75',
        isDragging && 'transition-none select-none',
        className
      )}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-border overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-inner shrink-0">
            <div className="flex items-end gap-0.5 h-4">
              <span className="w-1 h-2.5 bg-emerald-400 rounded-xs" />
              <span className="w-1 h-4 bg-emerald-400 rounded-xs" />
              <span className="w-1 h-3 bg-emerald-400 rounded-xs" />
            </div>
          </div>
          <div className="min-w-0">
            <span className="font-extrabold text-sm tracking-tight text-white truncate block">
              SignalLens
            </span>
            <p className="text-[10px] text-slate-400 tracking-tight font-medium truncate">
              Market Change Intelligence
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={item.description}
                onClick={onItemClick}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all group relative',
                    isActive
                      ? 'bg-[#101721] text-emerald-300 font-semibold shadow-sm border border-emerald-500/25'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0D131A]'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-emerald-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </div>

                    {item.badge && (
                      <span
                        aria-label={item.badgeAriaLabel}
                        className={cn(
                          'text-[10px] font-mono font-semibold px-1.5 py-0.5 min-w-[20px] h-5 rounded-full inline-flex items-center justify-center text-center transition-all shrink-0 whitespace-nowrap leading-none',
                          item.badgeColor
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {item.showDot && !item.badge && (
                      <span
                        aria-label="Unacknowledged digest available"
                        className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"
                      />
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

      {/* Resizer Handle on Right Edge */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize navigation sidebar"
        title="Drag to resize navigation (Double-click to reset)"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'absolute top-0 -right-1 w-3 h-full cursor-col-resize z-30 flex items-center justify-center transition-colors group touch-none',
          isDragging ? 'bg-indigo-500/20' : 'hover:bg-indigo-500/10'
        )}
      >
        {/* Subtle visual drag divider line */}
        <div
          className={cn(
            'w-[2px] h-full transition-all duration-150',
            isDragging
              ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]'
              : 'bg-transparent group-hover:bg-indigo-400/80'
          )}
        />
        {/* Center grab indicator */}
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-3.5 h-7 rounded-full flex items-center justify-center pointer-events-none transition-all duration-150 border border-border shadow-md',
            isDragging
              ? 'opacity-100 bg-indigo-600 text-white border-indigo-400 scale-105'
              : 'opacity-0 group-hover:opacity-100 bg-[#1e2433] text-slate-400 group-hover:text-slate-200'
          )}
        >
          <GripVertical className="w-3 h-3" />
        </div>
      </div>
    </aside>
  );
};
