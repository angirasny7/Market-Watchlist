import { describe, it, expect } from 'vitest';
import { isEventDemo } from '../src/services/eventService';

describe('Demo and Out-of-Window Event Gating (F0.2)', () => {
  it('correctly identifies seeded and demo events by id prefix and metadata', () => {
    expect(isEventDemo({ id: 'evt_001', metricsDelta: {} })).toBe(true);
    expect(isEventDemo({ id: 'evt_002', metricsDelta: {} })).toBe(true);
    expect(isEventDemo({ id: 'evt_003', metricsDelta: {} })).toBe(true);
    expect(isEventDemo({ id: 'evt_004', metricsDelta: {} })).toBe(true);
    expect(isEventDemo({ id: 'demo_hist_volume_spike_TCS_1', metricsDelta: {} })).toBe(true);
    expect(isEventDemo({ id: 'uuid-1234', metricsDelta: { isDemo: true } })).toBe(true);
    expect(isEventDemo({ id: 'uuid-5678', metricsDelta: { detectionReason: 'Historical Demo Seed: PRICE_SURGE' } })).toBe(true);
    
    // Real production event
    expect(isEventDemo({ id: 'uuid-real-1', metricsDelta: { price: 1035, detectionReason: 'Price surged +6.2%' } })).toBe(false);
  });
});
