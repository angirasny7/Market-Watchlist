import { describe, it, expect } from 'vitest';
import { adaptBackendEventToMarketEvent } from '../dataAdapters';

describe('Price Consistency & Single Source of Truth (F0.1)', () => {
  it('prioritizes stored stock.currentPrice over historical delta.price for the current price display', () => {
    const backendEvent = {
      id: 'evt_infy_1',
      stockSymbol: 'INFY',
      eventType: 'PRICE_SURGE',
      priority: 'HIGH',
      timestamp: new Date().toISOString(),
      stock: {
        symbol: 'INFY',
        companyName: 'Infosys Ltd',
        currentPrice: 1035.0, // Stored quote
        changeAmount: 12.5,
        changePercent: 1.22,
      },
      metricsDelta: {
        price: 1942.5, // Historical bar price from old event
        priceAtSince: 1035.0,
        changePercent: 87.7,
      },
    };

    const adapted = adaptBackendEventToMarketEvent(backendEvent);

    // Current price must come from stock.currentPrice (single source of truth with Watchlist)
    expect(adapted.price).toBe(1035.0);
    expect(adapted.changePercent).toBe(1.22);
    // Historical event price is preserved in metrics
    expect(adapted.metrics.priceAtEvent).toBe(1942.5);
    expect(adapted.metrics.priceAtSince).toBe(1035.0);
  });
});
