import { describe, it, expect } from 'vitest';
import { MAIN_NAV_ITEMS } from '../navigation';

describe('Main Navigation Order and Configuration', () => {
  it('defines the exact required 5-item navigation order from top to bottom', () => {
    const order = MAIN_NAV_ITEMS.map((item) => ({
      name: item.name,
      path: item.path,
    }));

    expect(order).toEqual([
      { name: 'Dashboard', path: '/' },
      { name: 'Watchlist', path: '/watchlist' },
      { name: 'Attention Feed', path: '/feed' },
      { name: 'Market Memory', path: '/memory' },
      { name: 'Market Highlights', path: '/highlights' },
    ]);
  });

  it('contains valid shortLabels and icons for all navigation items', () => {
    expect(MAIN_NAV_ITEMS).toHaveLength(5);
    MAIN_NAV_ITEMS.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.shortLabel).toBeTruthy();
      expect(item.path.startsWith('/')).toBe(true);
      expect(item.icon).toBeDefined();
      expect(item.description).toBeTruthy();
    });
  });
});
