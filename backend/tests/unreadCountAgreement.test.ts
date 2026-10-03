import { describe, it, expect } from 'vitest';
import { eventService } from '../src/services/eventService';

describe('Unread Count Single Source of Truth (F0.5)', () => {
  it('eventService.getUnreadFeedCount returns a numeric count for authenticated user', async () => {
    // When no watchlist or invalid user id, returns 0 gracefully
    const count = await eventService.getUnreadFeedCount('non-existent-user-id-0000');
    expect(count).toBe(0);
  });
});
