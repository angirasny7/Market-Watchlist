import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Clock, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react';
import {
  notificationService,
  NotificationItem,
} from '../../services/notificationService';
import { feedStreamClient } from '../../services/feedStreamClient';
import { formatRelativeTime } from '../../lib/dateUtils';

export const NotificationDropdown: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationService.getNotifications(30);
      // Filter to unread notifications so checked ones disappear
      const unreadList = (res.notifications || []).filter((n) => !n.isRead);
      setNotifications(unreadList);
      setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : unreadList.length);
    } catch {
      // Ignore background fetch error
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time SSE stream for instant badge and alert notifications
    const unsubscribe = feedStreamClient.subscribe((event) => {
      if (
        event.action === 'notification:new' ||
        event.action === 'notification_created' ||
        event.action === 'notification:updated' ||
        event.action === 'notification:cleared' ||
        event.action === 'feed_state_change'
      ) {
        if (event.data?.unreadCount !== undefined) {
          setUnreadCount(event.data.unreadCount);
        }
        fetchNotifications();
      }
    });

    // Fallback periodic poll every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLoading(true);
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismissItem = async (e: React.MouseEvent, notifId: string) => {
    e.stopPropagation();
    // Optimistically remove from list immediately and decrement count
    setNotifications((prev) => prev.filter((n) => n.id !== notifId));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationService.markAsRead(notifId);
    } catch {
      // Re-sync on failure
      fetchNotifications();
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    // Optimistically remove from list immediately so it disappears upon being checked
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      await notificationService.markAsRead(notif.id);
    } catch {
      // Continue navigation
    }

    setIsOpen(false);
    if (notif.stockSymbol) {
      navigate(`/feed?symbol=${encodeURIComponent(notif.stockSymbol)}`);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Notifications (${unreadCount} unread)`}
        title={unreadCount > 0 ? `${unreadCount} active alert notification${unreadCount === 1 ? '' : 's'}` : 'No new notifications'}
        className="relative p-2 rounded-lg border border-border bg-surface text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-md shadow-rose-500/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Recent notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#111622] border border-slate-700 shadow-2xl shadow-black/90 p-4 z-50 animate-fade-in flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-text-primary">Notifications</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {unreadCount} {unreadCount === 1 ? 'alert triggered' : 'alerts triggered'}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  All caught up
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={isLoading}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                title="Mark all as read"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Clear all</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto divide-y divide-border/40 my-1 -mx-2 px-2 max-h-96 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-text-muted text-xs">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                <p className="font-medium text-text-secondary">No unread notifications</p>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed max-w-[240px] mx-auto">
                  When your alert conditions are met, they will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="py-3 px-2.5 rounded-xl cursor-pointer transition-all duration-200 bg-rose-500/5 hover:bg-indigo-500/10 border border-rose-500/10 hover:border-indigo-500/30 group my-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0 animate-ping" />
                      {n.stockSymbol && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                          {n.stockSymbol}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-text-primary line-clamp-1 group-hover:text-white">
                        {n.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {formatRelativeTime(n.createdAt, true)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDismissItem(e, n.id)}
                        className="p-1 rounded hover:bg-surface-elevated text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Dismiss notification"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-text-secondary mt-1.5 pl-4 line-clamp-2 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="mt-2 pl-4 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 text-indigo-400 font-medium group-hover:text-indigo-300">
                      <Sparkles className="w-3 h-3" />
                      <span>Click to view details in Feed</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </div>
                    <span className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to check & dismiss
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
