import { describe, it, expect } from 'vitest';
import { eventService } from '../src/services/eventService';
import { prisma } from '../src/config/prisma';

describe('Unread Count Single Source of Truth (F0.5)', () => {
  it('eventService.getUnreadFeedCount returns a numeric count for authenticated user', async () => {
    // When no watchlist or invalid user id, returns 0 gracefully
    const count = await eventService.getUnreadFeedCount('non-existent-user-id-0000');
    expect(count).toBe(0);
  });

  it('ensures unread count matches unread events in feed for existing user', async () => {
    const user = await prisma.user.findFirst({ where: { email: 'alex@example.com' } });
    if (!user) return;

    const { feedService } = await import('../src/services/feedService.js');
    const unreadCount = await eventService.getUnreadFeedCount(user.id);
    const feedRes = await feedService.getFeed(user.id, { limit: 1000 });
    const feedUnreadCount = feedRes.items.filter((e) => e.isUnread).length;

    expect(unreadCount).toBe(feedUnreadCount);
  });
});
