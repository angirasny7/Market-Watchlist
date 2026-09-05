import React from 'react';
import { BellRing, CheckCheck, Clock } from 'lucide-react';
import { PageHeader } from '../common/PageHeader';
import { useMarketStore } from '../../store/useMarketStore';
import { useAuthStore } from '../../store/useAuthStore';
import { formatLastActiveTimestamp } from '../../lib/dateUtils';

interface FeedHeaderProps {
  onMarkAllRead?: () => void;
  unreadCount?: number;
}

export const FeedHeader: React.FC<FeedHeaderProps> = ({
  onMarkAllRead: propMarkAllRead,
  unreadCount: propUnreadCount,
}) => {
  const { events, markAllEventsRead, userState, dashboardData } = useMarketStore();
  const { user } = useAuthStore();

  const handleMarkAllRead = propMarkAllRead || markAllEventsRead;
  const unread = propUnreadCount !== undefined ? propUnreadCount : events.filter((e) => !e.read).length;

  const previousLogin =
    user?.previousLoginAt !== undefined
      ? user?.previousLoginAt
      : userState.previousLoginAt !== undefined
      ? userState.previousLoginAt
      : (dashboardData as any)?.previousLoginAt || null;

  const formattedPreviousLogin = formatLastActiveTimestamp(previousLogin);

  const statusBadges = (
    <>
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border text-slate-400 font-mono">
        <Clock className="w-3.5 h-3.5 text-slate-400" />
        <span>Last active:</span>
        <span className="text-slate-200">{formattedPreviousLogin}</span>
      </div>

      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>Active Surveillance</span>
      </div>
    </>
  );

  const actions = unread > 0 ? (
    <button
      onClick={handleMarkAllRead}
      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-active text-xs font-semibold text-slate-200 hover:text-white border border-border transition-all shadow-sm"
      title="Mark all events as read"
    >
      <CheckCheck className="w-4 h-4 text-emerald-400" />
      <span>Mark All Read ({unread})</span>
    </button>
  ) : undefined;

  return (
    <PageHeader
      icon={<BellRing className="w-5 h-5" />}
      iconColor="rose"
      tag="Core Surveillance"
      tagColor="rose"
      title="Attention Feed"
      subtitle="Important market developments prioritized by statistical significance, corroborated causal conviction, and your portfolio."
      statusBadges={statusBadges}
      actions={actions}
    />
  );
};
