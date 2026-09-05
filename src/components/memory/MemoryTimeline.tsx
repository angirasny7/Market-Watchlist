import React from 'react';
import { ArchivedMarketEvent } from '../../types/memory';
import { ArchivedEventCard } from './ArchivedEventCard';
import { Sparkles, Calendar } from 'lucide-react';

interface MemoryTimelineProps {
  events: ArchivedMarketEvent[];
  onMarkRead?: (eventId: string) => void;
}

interface GroupedArchivedEvents {
  dateKey: string;
  dateLabel: string;
  items: ArchivedMarketEvent[];
}

function groupEventsByDate(events: ArchivedMarketEvent[]): GroupedArchivedEvents[] {
  const groups: { [key: string]: { label: string; items: ArchivedMarketEvent[] } } = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  events.forEach((ev) => {
    const d = new Date(ev.savedAt || ev.readAt || ev.timestamp);
    const dateKey = isNaN(d.getTime()) ? 'unknown' : d.toISOString().split('T')[0];
    let label = isNaN(d.getTime())
      ? 'Market Memories'
      : d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

    if (!isNaN(d.getTime())) {
      if (d.toDateString() === today) {
        label = `Today • ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      } else if (d.toDateString() === yesterday) {
        label = `Yesterday • ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
      }
    }

    if (!groups[dateKey]) {
      groups[dateKey] = { label, items: [] };
    }
    groups[dateKey].items.push(ev);
  });

  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({
      dateKey: key,
      dateLabel: groups[key].label,
      items: groups[key].items,
    }));
}

export const MemoryTimeline: React.FC<MemoryTimelineProps> = ({
  events,
  onMarkRead,
}) => {
  const groupedEvents = React.useMemo(() => groupEventsByDate(events), [events]);

  return (
    <div className="space-y-6">
      {/* Grouped Chronological Archived Events Stream Header */}
      <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>Preserved Memories ({events.length} Items)</span>
        </div>
        <span className="text-[11px] text-slate-400 lowercase font-normal font-sans">
          grouped by date recorded
        </span>
      </div>

      {groupedEvents.map((group) => (
        <div key={group.dateKey} className="space-y-3">
          {/* Date Group Header */}
          <div className="flex items-center gap-2 text-xs font-mono text-indigo-300 bg-surface-subtle/80 px-3.5 py-1.5 rounded-lg border border-border/80 w-fit">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200">{group.dateLabel}</span>
            <span className="text-slate-400 font-normal">
              ({group.items.length} {group.items.length === 1 ? 'event' : 'events'})
            </span>
          </div>

          {/* Event Cards for this date group */}
          <div className="space-y-3.5">
            {group.items.map((event) => (
              <ArchivedEventCard
                key={event.id || event.readId || event.saveId}
                event={event}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
