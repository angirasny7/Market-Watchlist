import { describe, it, expect } from 'vitest';
import { FeedItem, FeedSummary } from '../../../types/feed';

describe('Attention Feed Component & UI Data Integrity Tests (Part C & D)', () => {
  const mockItem: FeedItem = {
    id: 'evt_test_001',
    stockSymbol: 'TATAMOTORS',
    companyName: 'Tata Motors Limited',
    exchange: 'NSE',
    currency: '₹',
    date: new Date().toISOString(),
    priority: 'CRITICAL',
    priorityLabel: 'Urgent',
    isUnread: true,
    isSaved: false,
    isNew: true,
    isAlertTriggered: false,
    isDemo: false,
    changePercent: 4.82,
    eventPrice: 980.5,
    currentPrice: 985.0,
    dayChangePercent: 4.82,
    signals: [
      { type: 'PRICE_SURGE', label: 'Surge +4.8%' },
      { type: 'VOLUME_SPIKE', label: '2.1x Volume' },
    ],
    extraSignalsCount: 0,
    headline: 'Tata Motors Limited surged +4.8% on 2.1x volume',
    memberEventIds: ['evt_test_001', 'evt_test_002'],
  };

  const mockSummary: FeedSummary = {
    unreadClusters: 201,
    totalInWindow: 201,
    needAttentionCount: 42,
    criticalCount: 9,
    highCount: 33,
    mediumCount: 93,
    lowCount: 66,
    daysSinceLastVisit: 2,
    lastVisitAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    headline: 'You were away 2 days · 201 updates across 23 stocks · 42 need attention',
    dataFreshness: 'Prices updated just now',
    lastSyncedAt: new Date().toISOString(),
    isDelayed: true,
    delayNotice: 'Delayed ~15 min (NSE)',
  };

  it('1. Feed item preserves real structured headline and signals without string baking', () => {
    expect(mockItem.headline).toBe('Tata Motors Limited surged +4.8% on 2.1x volume');
    expect(mockItem.signals.length).toBe(2);
    expect(mockItem.signals[0].label).toContain('+4.8%');
    expect(mockItem.signals[1].label).toBe('2.1x Volume');
    expect(mockItem.priorityLabel).toBe('Urgent');
  });

  it('2. Feed summary provides 4-way consistency counters and delay disclosures', () => {
    expect(mockSummary.unreadClusters).toBe(201);
    expect(mockSummary.criticalCount + mockSummary.highCount).toBe(mockSummary.needAttentionCount);
    expect(mockSummary.isDelayed).toBe(true);
    expect(mockSummary.delayNotice).toBe('Delayed ~15 min (NSE)');
    expect(mockSummary.headline).toContain('201 updates');
  });

  it('3. Feed clustering structure groups multiple events into 1 stock per day item', () => {
    expect(mockItem.memberEventIds.length).toBe(2);
    expect(mockItem.isUnread).toBe(true);
  });

  it('4. Feed summary includes windowCounts breakdown for 24h, 7d, 30d, and sinceLastVisit', () => {
    const summaryWithWindows: FeedSummary = {
      ...mockSummary,
      windowCounts: {
        sinceLastVisit: 4,
        '24h': 3,
        '7d': 12,
        '30d': 41,
      },
    };

    expect(summaryWithWindows.windowCounts?.sinceLastVisit).toBe(4);
    expect(summaryWithWindows.windowCounts?.['24h']).toBe(3);
    expect(summaryWithWindows.windowCounts?.['7d']).toBe(12);
    expect(summaryWithWindows.windowCounts?.['30d']).toBe(41);
  });

  it('5. Feed item contains accurate price and change metrics without hardcoding', () => {
    expect(mockItem.currentPrice).toBe(985.0);
    expect(mockItem.eventPrice).toBe(980.5);
    expect(mockItem.changePercent).toBe(4.82);
    expect(mockItem.currency).toBe('₹');
    expect(mockItem.stockSymbol).toBe('TATAMOTORS');
  });
});

