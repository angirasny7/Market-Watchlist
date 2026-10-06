/**
 * benchmark1000Users.ts
 * 
 * Benchmark script demonstrating:
 * 1. Provider Quota Efficiency: O(distinct symbols) vs O(users * stocks).
 * 2. Feed Query Latency: p50, p90, p95, p99 across 1,000 users.
 * 3. State Overlay Resolution: Throughput of resolving Read/Saved/Deleted overlays across 1,000 users.
 * 
 * Safe execution: In-memory simulation with zero mutation of real database rows.
 */

interface BenchmarkUser {
  id: string;
  email: string;
  watchedSymbols: Set<string>;
  readEventIds: Set<string>;
  savedEventIds: Set<string>;
  deletedEventIds: Set<string>;
  lastVisitAt: Date;
}

interface BenchmarkEvent {
  id: string;
  stockSymbol: string;
  eventType: string;
  meaningfulnessScore: number;
  occurredAt: Date;
  isDemo: boolean;
  isDuplicate: boolean;
}

function generateStockUniverse(size: number = 300): string[] {
  const symbols: string[] = [];
  const prefixes = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'BRKB', 'JPM', 'V'];
  for (let i = 0; i < size; i++) {
    const base = prefixes[i % prefixes.length];
    symbols.push(i < prefixes.length ? base : `${base}_${Math.floor(i / prefixes.length)}`);
  }
  return symbols;
}

function generateEvents(symbols: string[], count: number = 2000): BenchmarkEvent[] {
  const eventTypes = ['PRICE_SURGE', 'PRICE_DROP', 'EARNINGS_BEAT', 'EARNINGS_MISS', 'ANALYST_UPGRADE', 'DIVIDEND_ANNOUNCED'];
  const events: BenchmarkEvent[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const symbol = symbols[i % symbols.length];
    const type = eventTypes[i % eventTypes.length];
    const ageHours = (i % 720); // within last 30 days
    events.push({
      id: `evt_${i + 1}`,
      stockSymbol: symbol,
      eventType: type,
      meaningfulnessScore: 20 + ((i * 17) % 80),
      occurredAt: new Date(now - ageHours * 3600 * 1000),
      isDemo: false,
      isDuplicate: false,
    });
  }
  return events;
}

function generate1000Users(symbols: string[], events: BenchmarkEvent[]): BenchmarkUser[] {
  const users: BenchmarkUser[] = [];
  const now = Date.now();

  for (let i = 0; i < 1000; i++) {
    const userId = `user_${i + 1}`;
    // Each user tracks between 15 to 45 stocks
    const stockCount = 15 + (i % 31);
    const watchedSymbols = new Set<string>();
    for (let s = 0; s < stockCount; s++) {
      const symbolIdx = (i * 7 + s * 13) % symbols.length;
      watchedSymbols.add(symbols[symbolIdx]);
    }

    // User handled some events
    const readEventIds = new Set<string>();
    const savedEventIds = new Set<string>();
    const deletedEventIds = new Set<string>();

    // simulate 5-20 read events, 1-5 saved, 1-3 deleted
    for (let r = 0; r < 10; r++) {
      const evtIdx = (i * 11 + r * 19) % events.length;
      readEventIds.add(events[evtIdx].id);
    }
    for (let sv = 0; sv < 3; sv++) {
      const evtIdx = (i * 13 + sv * 23) % events.length;
      savedEventIds.add(events[evtIdx].id);
    }
    for (let d = 0; d < 2; d++) {
      const evtIdx = (i * 17 + d * 29) % events.length;
      deletedEventIds.add(events[evtIdx].id);
    }

    users.push({
      id: userId,
      email: `benchmark_user_${i + 1}@example.com`,
      watchedSymbols,
      readEventIds,
      savedEventIds,
      deletedEventIds,
      lastVisitAt: new Date(now - (i % 48 + 1) * 3600 * 1000),
    });
  }

  return users;
}

function runBenchmark() {
  console.log('================================================================');
  console.log('       SMART MARKET WATCHLIST: 1,000-USER SCALE BENCHMARK       ');
  console.log('================================================================\n');

  const stockUniverse = generateStockUniverse(300);
  const events = generateEvents(stockUniverse, 2500);
  const users = generate1000Users(stockUniverse, events);

  // 1. PROVIDER QUOTA ANALYSIS
  let totalUserStockPairs = 0;
  const distinctMonitoredSymbols = new Set<string>();

  for (const user of users) {
    totalUserStockPairs += user.watchedSymbols.size;
    for (const sym of user.watchedSymbols) {
      distinctMonitoredSymbols.add(sym);
    }
  }

  const batchSize = 50;
  const naiveCalls = totalUserStockPairs; // If we called provider per user-watchlist
  const optimizedBatchedCalls = Math.ceil(distinctMonitoredSymbols.size / batchSize);
  const quotaReductionPercent = ((1 - optimizedBatchedCalls / naiveCalls) * 100).toFixed(2);

  console.log('--- 1. INGESTION PROVIDER EFFICIENCY ---');
  console.log(`Total Simulated Users:              1,000`);
  console.log(`Total User-Stock Watchlist Pairs:   ${totalUserStockPairs.toLocaleString()}`);
  console.log(`Distinct Monitored Symbols:         ${distinctMonitoredSymbols.size}`);
  console.log(`Naive Provider API Calls (per run): ${naiveCalls.toLocaleString()}`);
  console.log(`Batched API Calls (size=${batchSize}):        ${optimizedBatchedCalls}`);
  console.log(`API Quota Reduction:                ${quotaReductionPercent}% reduction\n`);

  // 2. FEED QUERY LATENCY BENCHMARK
  console.log('--- 2. ATTENTION FEED QUERY LATENCY (1,000 Users) ---');
  const latenciesMs: number[] = [];

  // Index events by symbol for fast retrieval
  const eventsBySymbol = new Map<string, BenchmarkEvent[]>();
  for (const evt of events) {
    if (!eventsBySymbol.has(evt.stockSymbol)) {
      eventsBySymbol.set(evt.stockSymbol, []);
    }
    eventsBySymbol.get(evt.stockSymbol)!.push(evt);
  }

  const startTime = performance.now();

  for (const user of users) {
    const qStart = performance.now();

    // Query simulation:
    // 1. Gather all events for user's watched symbols
    const candidates: BenchmarkEvent[] = [];
    for (const sym of user.watchedSymbols) {
      const symEvents = eventsBySymbol.get(sym);
      if (symEvents) {
        for (const ev of symEvents) {
          // Filter out read, deleted, demo, duplicate
          if (!user.readEventIds.has(ev.id) && !user.deletedEventIds.has(ev.id) && !ev.isDemo && !ev.isDuplicate) {
            candidates.push(ev);
          }
        }
      }
    }

    // 2. Sort by occurredAt desc, then score desc
    candidates.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.meaningfulnessScore - a.meaningfulnessScore);

    // 3. Take top 30
    const feedItems = candidates.slice(0, 30);

    const qEnd = performance.now();
    latenciesMs.push(qEnd - qStart);
  }

  const totalTime = performance.now() - startTime;
  latenciesMs.sort((a, b) => a - b);

  const p50 = latenciesMs[Math.floor(latenciesMs.length * 0.50)].toFixed(3);
  const p90 = latenciesMs[Math.floor(latenciesMs.length * 0.90)].toFixed(3);
  const p95 = latenciesMs[Math.floor(latenciesMs.length * 0.95)].toFixed(3);
  const p99 = latenciesMs[Math.floor(latenciesMs.length * 0.99)].toFixed(3);
  const avg = (latenciesMs.reduce((s, v) => s + v, 0) / latenciesMs.length).toFixed(3);
  const throughput = Math.round((1000 / totalTime) * 1000);

  console.log(`Total 1,000 Feeds Generated In:     ${totalTime.toFixed(2)} ms`);
  console.log(`Throughput:                         ${throughput.toLocaleString()} user feeds/sec`);
  console.log(`p50 Latency:                        ${p50} ms`);
  console.log(`p90 Latency:                        ${p90} ms`);
  console.log(`p95 Latency:                        ${p95} ms`);
  console.log(`p99 Latency:                        ${p99} ms`);
  console.log(`Mean Latency:                       ${avg} ms\n`);

  // 3. OVERLAY STATE RESOLUTION BENCHMARK
  console.log('--- 3. OVERLAY MUTATION & RETRIEVAL BENCHMARK ---');
  const overlayStart = performance.now();
  let totalOverlayChecks = 0;

  for (const user of users) {
    for (const evt of events) {
      const isRead = user.readEventIds.has(evt.id);
      const isSaved = user.savedEventIds.has(evt.id);
      const isDeleted = user.deletedEventIds.has(evt.id);
      if (isRead || isSaved || isDeleted) {
        totalOverlayChecks++;
      }
    }
  }

  const overlayTime = performance.now() - overlayStart;
  console.log(`Total Overlay State Checks:         ${(users.length * events.length).toLocaleString()}`);
  console.log(`Resolved In:                        ${overlayTime.toFixed(2)} ms`);
  console.log(`Throughput:                         ${Math.round(((users.length * events.length) / overlayTime) * 1000).toLocaleString()} checks/sec\n`);

  console.log('================================================================');
  console.log('                     SCALE BENCHMARK COMPLETE                   ');
  console.log('================================================================');
}

runBenchmark();
