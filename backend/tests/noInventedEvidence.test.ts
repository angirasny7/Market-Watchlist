import { describe, it, expect } from 'vitest';
import { contextEnrichmentService } from '../src/services/contextEnrichmentService';
import { Event, EventType, Priority } from '@prisma/client';

describe('No Invented Evidence Engine (F0.3)', () => {
  it('returns "No confirmed cause found" and empty sources/drivers when no real news exists', async () => {
    const fakeEvent: Event = {
      id: 'test_event_without_news_1',
      stockSymbol: 'UNKNOWN_TEST_SYMBOL_XYZ',
      eventType: EventType.PRICE_SURGE,
      priority: Priority.HIGH,
      timestamp: new Date(),
      read: false,
      acknowledged: false,
      metricsDelta: {
        changePercent: 6.5,
        volumeRatio: 2.1,
      },
      createdAt: new Date(),
    };

    const enrichment = await contextEnrichmentService.enrichEvent(fakeEvent, null);

    // Strict safety rules:
    // 1. Summary states "No confirmed cause found"
    expect(enrichment.summary).toContain('No confirmed cause found');
    // 2. Possible drivers are empty (no fabricated templates)
    expect(enrichment.possibleDrivers).toEqual([]);
    // 3. Evidence is empty
    expect(enrichment.evidence).toEqual([]);
    // 4. Confidence reflects real absence of evidence (Low)
    expect(enrichment.confidenceScore).toBeLessThanOrEqual(25);
  });
});
