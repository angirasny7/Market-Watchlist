import { PrismaClient, UserRole, Priority, EventType, NewsSentiment, MarketMood } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing records in reverse dependency order
  await prisma.digestInsight.deleteMany();
  await prisma.digestEvent.deleteMany();
  await prisma.digest.deleteMany();
  await prisma.insight.deleteMany();
  await prisma.event.deleteMany();
  await prisma.news.deleteMany();
  await prisma.stockPriceHistory.deleteMany();
  await prisma.watchlistStock.deleteMany();
  await prisma.watchlist.deleteMany();
  await prisma.userState.deleteMany();
  await prisma.user.deleteMany();
  await prisma.stock.deleteMany();

  console.log('✓ Cleaned existing tables');

  // 2. Seed Master Stocks
  const stocksData = [
    {
      symbol: 'TATAMOTORS',
      companyName: 'Tata Motors Ltd',
      sector: 'Automobile',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1145.20,
      changeAmount: 105.80,
      changePercent: 10.18,
      volume: BigInt(18450200),
      avgVolume20D: BigInt(5240000),
      marketCap: '₹4.22 Lakh Cr',
      peRatio: 16.4,
      high52w: 1145.20,
      low52w: 593.50,
      tags: ['Nifty 50', 'EV Leader', 'Auto', 'Breakout'],
      sparkline: [
        { date: 'Day -6', price: 1020 },
        { date: 'Day -5', price: 1032 },
        { date: 'Day -4', price: 1018 },
        { date: 'Day -3', price: 1045 },
        { date: 'Day -2', price: 1039 },
        { date: 'Yesterday', price: 1039.40 },
        { date: 'Today', price: 1145.20 },
      ],
    },
    {
      symbol: 'INFY',
      companyName: 'Infosys Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1942.50,
      changeAmount: 76.60,
      changePercent: 4.11,
      volume: BigInt(9840300),
      avgVolume20D: BigInt(4450000),
      marketCap: '₹8.05 Lakh Cr',
      peRatio: 28.2,
      high52w: 1980.00,
      low52w: 1358.35,
      tags: ['Nifty 50', 'IT Bluechip', 'Earnings Beat'],
      sparkline: [
        { date: 'Day -6', price: 1840 },
        { date: 'Day -5', price: 1855 },
        { date: 'Day -4', price: 1860 },
        { date: 'Day -3', price: 1848 },
        { date: 'Day -2', price: 1865 },
        { date: 'Yesterday', price: 1865.90 },
        { date: 'Today', price: 1942.50 },
      ],
    },
    {
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 4520.10,
      changeAmount: 342.50,
      changePercent: 8.19,
      volume: BigInt(6210000),
      avgVolume20D: BigInt(1750000),
      marketCap: '₹16.35 Lakh Cr',
      peRatio: 31.5,
      high52w: 4520.10,
      low52w: 3310.00,
      tags: ['Nifty 50', 'IT Giant', 'AI Contract', '52W High'],
      sparkline: [
        { date: 'Day -6', price: 4180 },
        { date: 'Day -5', price: 4175 },
        { date: 'Day -4', price: 4190 },
        { date: 'Day -3', price: 4160 },
        { date: 'Day -2', price: 4177 },
        { date: 'Yesterday', price: 4177.60 },
        { date: 'Today', price: 4520.10 },
      ],
    },
    {
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Ltd',
      sector: 'Energy & Petrochemicals',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 3042.80,
      changeAmount: 401.50,
      changePercent: 15.20,
      volume: BigInt(14500000),
      avgVolume20D: BigInt(5100000),
      marketCap: '₹20.58 Lakh Cr',
      peRatio: 27.8,
      high52w: 3217.90,
      low52w: 2220.30,
      tags: ['Nifty 50', 'Conglomerate', 'Multi-day Surge', 'Retail Expansion'],
      sparkline: [
        { date: 'Day -6', price: 2640 },
        { date: 'Day -5', price: 2710 },
        { date: 'Day -4', price: 2780 },
        { date: 'Day -3', price: 2850 },
        { date: 'Day -2', price: 2920 },
        { date: 'Yesterday', price: 2960.00 },
        { date: 'Today', price: 3042.80 },
      ],
    },
    {
      symbol: 'HDFCBANK',
      companyName: 'HDFC Bank Ltd',
      sector: 'Banking & Financial Services',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1654.00,
      changeAmount: 18.20,
      changePercent: 1.11,
      volume: BigInt(12400000),
      avgVolume20D: BigInt(11200000),
      marketCap: '₹12.58 Lakh Cr',
      peRatio: 18.9,
      high52w: 1794.00,
      low52w: 1363.55,
      tags: ['Nifty 50', 'Private Bank', 'Dividend'],
      sparkline: [
        { date: 'Day -6', price: 1630 },
        { date: 'Day -5', price: 1635 },
        { date: 'Day -4', price: 1640 },
        { date: 'Day -3', price: 1632 },
        { date: 'Day -2', price: 1638 },
        { date: 'Yesterday', price: 1635.80 },
        { date: 'Today', price: 1654.00 },
      ],
    },
    {
      symbol: 'AAPL',
      companyName: 'Apple Inc.',
      sector: 'Information Technology',
      exchange: 'NASDAQ',
      currency: '$',
      currentPrice: 228.60,
      changeAmount: 2.45,
      changePercent: 1.08,
      volume: BigInt(48500000),
      avgVolume20D: BigInt(52000000),
      marketCap: '$3.48 Trillion',
      peRatio: 33.4,
      high52w: 237.23,
      low52w: 164.08,
      tags: ['Nasdaq 100', 'Apple Intelligence', 'Mega-cap'],
      sparkline: [
        { date: 'Day -6', price: 222 },
        { date: 'Day -5', price: 224 },
        { date: 'Day -4', price: 225 },
        { date: 'Day -3', price: 224 },
        { date: 'Day -2', price: 226 },
        { date: 'Yesterday', price: 226.15 },
        { date: 'Today', price: 228.60 },
      ],
    },
    {
      symbol: 'SUZLON',
      companyName: 'Suzlon Energy Ltd',
      sector: 'Energy & Petrochemicals',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 84.50,
      changeAmount: 6.00,
      changePercent: 7.64,
      volume: BigInt(41200000),
      avgVolume20D: BigInt(10050000),
      marketCap: '₹1.15 Lakh Cr',
      peRatio: 48.2,
      high52w: 86.00,
      low52w: 24.50,
      tags: ['Renewable Energy', 'Turnaround', 'Order Win'],
      sparkline: [
        { date: 'Day -6', price: 77 },
        { date: 'Day -5', price: 78 },
        { date: 'Day -4', price: 78.5 },
        { date: 'Day -3', price: 79 },
        { date: 'Day -2', price: 78.5 },
        { date: 'Yesterday', price: 78.5 },
        { date: 'Today', price: 84.5 },
      ],
    },
    {
      symbol: 'ZOMATO',
      companyName: 'Zomato Ltd (Blinkit)',
      sector: 'Consumer Goods',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 268.40,
      changeAmount: 15.80,
      changePercent: 6.25,
      volume: BigInt(28500000),
      avgVolume20D: BigInt(12000000),
      marketCap: '₹2.36 Lakh Cr',
      peRatio: 112.5,
      high52w: 280.00,
      low52w: 98.00,
      tags: ['Quick Commerce', 'Blinkit', 'Growth'],
      sparkline: [
        { date: 'Day -6', price: 245 },
        { date: 'Day -5', price: 248 },
        { date: 'Day -4', price: 252 },
        { date: 'Day -3', price: 250 },
        { date: 'Day -2', price: 253 },
        { date: 'Yesterday', price: 252.60 },
        { date: 'Today', price: 268.40 },
      ],
    },
    {
      symbol: 'LT',
      companyName: 'Larsen & Toubro Ltd',
      sector: 'Conglomerate',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 3740.00,
      changeAmount: 52.30,
      changePercent: 1.42,
      volume: BigInt(2150000),
      avgVolume20D: BigInt(2400000),
      marketCap: '₹5.14 Lakh Cr',
      peRatio: 34.8,
      high52w: 3919.90,
      low52w: 2850.00,
      tags: ['Nifty 50', 'Infrastructure', 'Defense'],
      sparkline: [
        { date: 'Day -6', price: 3680 },
        { date: 'Day -5', price: 3695 },
        { date: 'Day -4', price: 3710 },
        { date: 'Day -3', price: 3690 },
        { date: 'Day -2', price: 3687 },
        { date: 'Yesterday', price: 3687.70 },
        { date: 'Today', price: 3740.00 },
      ],
    },
    {
      symbol: 'ITC',
      companyName: 'ITC Ltd',
      sector: 'Consumer Goods',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 512.40,
      changeAmount: -1.80,
      changePercent: -0.35,
      volume: BigInt(8700000),
      avgVolume20D: BigInt(9400000),
      marketCap: '₹6.41 Lakh Cr',
      peRatio: 29.1,
      high52w: 520.00,
      low52w: 399.30,
      tags: ['Nifty 50', 'FMCG', 'High Dividend'],
      sparkline: [
        { date: 'Day -6', price: 510 },
        { date: 'Day -5', price: 512 },
        { date: 'Day -4', price: 515 },
        { date: 'Day -3', price: 514 },
        { date: 'Day -2', price: 514 },
        { date: 'Yesterday', price: 514.20 },
        { date: 'Today', price: 512.40 },
      ],
    },
  ];

  for (const s of stocksData) {
    await prisma.stock.create({ data: s });
  }
  console.log(`✓ Seeded ${stocksData.length} master stocks`);

  // 3. Seed News Articles
  const newsData = [
    {
      id: 'news_001',
      stockSymbol: 'TATAMOTORS',
      headline: 'Tata Motors Commercial EV Dispatches Surge 15% Following Subsidy Clearance',
      summary: 'Heavy commercial vehicle subsidies received government signoff, boosting order dispatches across tier-1 logistics operators.',
      sourceName: 'Economic Times Auto',
      sourceUrl: 'https://economictimes.indiatimes.com/auto',
      publishedAt: new Date(Date.now() - 1000 * 60 * 45),
      sentiment: NewsSentiment.BULLISH,
    },
    {
      id: 'news_002',
      stockSymbol: 'INFY',
      headline: 'Infosys Posts Record Q2 Large Deal TCV of $3.2 Billion',
      summary: 'Digital transformation deals beat Street forecasts by 8%, leading to an upward revision in annual revenue guidance.',
      sourceName: 'Bloomberg Technology',
      sourceUrl: 'https://bloomberg.com/tech',
      publishedAt: new Date(Date.now() - 1000 * 60 * 120),
      sentiment: NewsSentiment.BULLISH,
    },
    {
      id: 'news_003',
      stockSymbol: 'TCS',
      headline: 'TCS Secures $1.2B European Banking Cloud Migration Mandate',
      summary: 'A major tier-1 European financial institution selected TCS as strategic partner for legacy mainframe cloud transition.',
      sourceName: 'BSE Corporate Announcement',
      sourceUrl: 'https://bseindia.com/corporates',
      publishedAt: new Date(Date.now() - 1000 * 60 * 180),
      sentiment: NewsSentiment.BULLISH,
    },
    {
      id: 'news_004',
      stockSymbol: 'HDFCBANK',
      headline: 'HDFC Bank Board Declares Special Interim Dividend Ahead of Record Date',
      summary: 'Board approved a payout of ₹19.50 per equity share following healthy net interest margin expansion.',
      sourceName: 'Moneycontrol Banking Desk',
      sourceUrl: 'https://moneycontrol.com/banking',
      publishedAt: new Date(Date.now() - 1000 * 60 * 360),
      sentiment: NewsSentiment.BULLISH,
    },
    {
      id: 'news_005',
      stockSymbol: 'RELIANCE',
      headline: 'Reliance Retail Expands Quick Commerce Blinkit Competition with 500 New Dark Stores',
      summary: 'Brokerages upgrade consolidated target to ₹3,400 citing rapid consumer tech margin accretions.',
      sourceName: 'Reuters Capital Markets',
      sourceUrl: 'https://reuters.com/business',
      publishedAt: new Date(Date.now() - 1000 * 60 * 480),
      sentiment: NewsSentiment.BULLISH,
    },
    {
      id: 'news_006',
      stockSymbol: 'SUZLON',
      headline: 'Suzlon Bags 380MW Renewable Energy Turnkey Project from Leading Utility',
      summary: 'Order execution to commence in Q3 with revenue recognition spanning next four quarters.',
      sourceName: 'BSE Corporate Announcement',
      sourceUrl: 'https://bseindia.com/corporates',
      publishedAt: new Date(Date.now() - 1000 * 60 * 600),
      sentiment: NewsSentiment.BULLISH,
    },
  ];

  for (const n of newsData) {
    await prisma.news.create({ data: n });
  }
  console.log(`✓ Seeded ${newsData.length} news disclosures`);

  // 4. Seed User, UserState & Watchlist
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Alex1@123', salt);

  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      id: 'usr_alex_001',
      email: 'alex1@example.com',
      passwordHash,
      name: 'Alex',
      role: UserRole.PRO,
      lastLoginAt: twoHoursAgo,
      previousLoginAt: fiveDaysAgo,
    },
  });

  await prisma.userState.create({
    data: {
      userId: user.id,
      lastLoginAt: twoHoursAgo,
      lastLogoutAt: twoHoursAgo,
      lastActivityAt: twoHoursAgo,
      previousSessionAt: twoHoursAgo,
      currentDeviceType: 'Desktop',
      currentDeviceName: 'Desktop',
      previousDeviceType: 'Mobile',
      previousDeviceName: 'Mobile',
      lastDigestViewedId: 'digest_002',
      lastDigestAcknowledgedId: 'digest_002',
    },
  });

  const watchlist = await prisma.watchlist.create({
    data: {
      id: 'wl_primary_001',
      userId: user.id,
      name: 'Primary Watchlist',
      isDefault: true,
    },
  });

  const watchedSymbols = [
    { symbol: 'TATAMOTORS', isPinned: true },
    { symbol: 'INFY', isPinned: true },
    { symbol: 'TCS', isPinned: false },
    { symbol: 'RELIANCE', isPinned: false },
    { symbol: 'HDFCBANK', isPinned: false },
    { symbol: 'AAPL', isPinned: false },
  ];

  for (const item of watchedSymbols) {
    await prisma.watchlistStock.create({
      data: {
        watchlistId: watchlist.id,
        stockSymbol: item.symbol,
        isPinned: item.isPinned,
      },
    });
  }
  console.log('✓ Seeded user, userState, and primary watchlist');

  // 5. Seed Events & Insights
  const eventTata = await prisma.event.create({
    data: {
      id: 'evt_001',
      stockSymbol: 'TATAMOTORS',
      eventType: EventType.FIFTY_TWO_WEEK_HIGH,
      priority: Priority.CRITICAL,
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
      read: false,
      acknowledged: false,
      metricsDelta: {
        currentPrice: 1145.20,
        previousPrice: 1039.40,
        changePercent: 10.18,
        volumeVsAvgRatio: 3.52,
        referenceValue: 1145.20,
      },
    },
  });

  await prisma.insight.create({
    data: {
      id: 'ins_001',
      relatedEventId: eventTata.id,
      stockSymbol: 'TATAMOTORS',
      headline: 'Commercial EV Subsidy Clearance & Record Export Dispatches',
      possibleExplanation: 'Heavy commercial vehicle subsidies received official government signoff, boosting Q3 delivery guidance by 15% across key fleet clients.',
      whyItMatters: 'Validates EV commercial transition thesis, pushing operating margins toward management target of 8.5%.',
      confidenceScore: 0.94,
      sources: [
        { name: 'Ministry of Heavy Industries Filing', url: 'https://bseindia.com', tier: 'OFFICIAL_REGULATORY' },
        { name: 'Economic Times Auto Desk', url: 'https://economictimes.indiatimes.com', tier: 'FINANCIAL_PRESS' },
      ],
      historicalPattern: 'Stocks breaking 52W high on regulatory volume spikes show positive 7-day drift 74% of the time.',
      forwardProbability: '74% positive 7D drift',
    },
  });

  const eventInfy = await prisma.event.create({
    data: {
      id: 'evt_002',
      stockSymbol: 'INFY',
      eventType: EventType.EARNINGS_BEAT,
      priority: Priority.HIGH,
      timestamp: new Date(Date.now() - 1000 * 60 * 110),
      read: false,
      acknowledged: false,
      metricsDelta: {
        currentPrice: 1942.50,
        previousPrice: 1865.90,
        changePercent: 4.11,
        volumeVsAvgRatio: 2.21,
        referenceValue: 1865.90,
      },
    },
  });

  await prisma.insight.create({
    data: {
      id: 'ins_002',
      relatedEventId: eventInfy.id,
      stockSymbol: 'INFY',
      headline: 'Q2 Revenue Beats Street Forecast by 8% with $3.2B TCV',
      possibleExplanation: 'Constant currency revenue grew 3.2% QoQ driven by strong financial services and cloud migration spend in North American banks.',
      whyItMatters: 'Signals recovery in discretionary enterprise IT budgets after four quarters of corporate spending slowdown.',
      confidenceScore: 0.88,
      sources: [
        { name: 'Infosys Press Release / BSE Filing', url: 'https://bseindia.com', tier: 'COMPANY_DISCLOSURE' },
        { name: 'Bloomberg Tech Desk', url: 'https://bloomberg.com', tier: 'FINANCIAL_PRESS' },
      ],
      historicalPattern: 'Post-earnings guidance beats historically drive 3-week institutional accumulation.',
      forwardProbability: '68% positive 30D drift',
    },
  });

  const eventTcs = await prisma.event.create({
    data: {
      id: 'evt_003',
      stockSymbol: 'TCS',
      eventType: EventType.PRICE_SURGE,
      priority: Priority.CRITICAL,
      timestamp: new Date(Date.now() - 1000 * 60 * 170),
      read: false,
      acknowledged: false,
      metricsDelta: {
        currentPrice: 4520.10,
        previousPrice: 4177.60,
        changePercent: 8.19,
        volumeVsAvgRatio: 3.55,
        referenceValue: 4177.60,
      },
    },
  });

  await prisma.insight.create({
    data: {
      id: 'ins_003',
      relatedEventId: eventTcs.id,
      stockSymbol: 'TCS',
      headline: 'Signs Landmark $1.2B European Banking AI Transformation Deal',
      possibleExplanation: 'Multi-year engagement to rebuild core core banking infrastructure utilizing generative AI and autonomous workflow models.',
      whyItMatters: 'Largest deal in IT sector this calendar year, insulating TCS from regional macroeconomic volatility.',
      confidenceScore: 0.96,
      sources: [
        { name: 'Exchange Regulatory Disclosure', url: 'https://bseindia.com', tier: 'OFFICIAL_REGULATORY' },
        { name: 'Reuters Technology Analysis', url: 'https://reuters.com', tier: 'FINANCIAL_PRESS' },
      ],
      historicalPattern: 'Mega-deals above $1B lead to sustained analyst upgrades over subsequent 60 days.',
      forwardProbability: '81% positive 30D drift',
    },
  });

  const eventHdfc = await prisma.event.create({
    data: {
      id: 'evt_004',
      stockSymbol: 'HDFCBANK',
      eventType: EventType.DIVIDEND_ANNOUNCED,
      priority: Priority.MEDIUM,
      timestamp: new Date(Date.now() - 1000 * 60 * 350),
      read: true,
      acknowledged: true,
      metricsDelta: {
        currentPrice: 1654.00,
        previousPrice: 1635.80,
        changePercent: 1.11,
        volumeVsAvgRatio: 1.10,
        referenceValue: 19.50,
      },
    },
  });

  await prisma.insight.create({
    data: {
      id: 'ins_004',
      relatedEventId: eventHdfc.id,
      stockSymbol: 'HDFCBANK',
      headline: 'Board Approves Special Dividend of ₹19.50 per Share',
      possibleExplanation: 'Capital adequacy ratio strengthened to 19.3% post-merger integration, permitting enhanced shareholder capital returns.',
      whyItMatters: 'Demonstrates merger synergy realization and provides 1.2% direct dividend yield before ex-date.',
      confidenceScore: 0.98,
      sources: [
        { name: 'BSE Corporate Action Filing', url: 'https://bseindia.com', tier: 'OFFICIAL_REGULATORY' },
      ],
      historicalPattern: 'High dividend announcements result in low downside volatility until ex-dividend date.',
      forwardProbability: '92% capital preservation rate',
    },
  });

  console.log('✓ Seeded events and relational insights');

  // 6. Seed Historical Intelligence Digests
  const digest1 = await prisma.digest.create({
    data: {
      id: 'digest_001',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12),
      timeRange: 'Sept 3 - Sept 4, 2026 (Past 24 Hours)',
      headline: 'Auto EV Breakouts, Landmark IT AI Deals, and Central Bank Policy Stance',
      executiveSummary: 'Indian equities surged across broad sectors led by Tata Motors breaking all-time 52-week highs (+10.2%) following EV commercial subsidy signoff, and TCS gaining +8.2% on a landmark $1.2B European banking AI contract. The RBI MPC kept repo rates steady at 6.50%, cementing accommodative liquidity.',
      marketMood: MarketMood.BULLISH,
      benchmarkCloses: {
        nifty50: 25418.50,
        niftyChange: 1.42,
        sensex: 83079.60,
        sensexChange: 1.35,
        nasdaq: 18240.20,
        nasdaqChange: 1.59,
      },
      forwardPerformanceMap: {
        TATAMOTORS: { day1: 2.4, day7: 5.8, day30: 9.6 },
        TCS: { day1: 1.8, day7: 4.2, day30: 7.5 },
        INFY: { day1: 1.1, day7: 3.4, day30: 5.2 },
      },
      read: false,
    },
  });

  await prisma.digestEvent.createMany({
    data: [
      { digestId: digest1.id, eventId: eventTata.id },
      { digestId: digest1.id, eventId: eventInfy.id },
      { digestId: digest1.id, eventId: eventTcs.id },
      { digestId: digest1.id, eventId: eventHdfc.id },
    ],
  });

  await prisma.digestInsight.createMany({
    data: [
      { digestId: digest1.id, insightId: 'ins_001' },
      { digestId: digest1.id, insightId: 'ins_002' },
      { digestId: digest1.id, insightId: 'ins_003' },
      { digestId: digest1.id, insightId: 'ins_004' },
    ],
  });

  const digest2 = await prisma.digest.create({
    data: {
      id: 'digest_002',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      timeRange: 'Aug 29 - Aug 31, 2026 (Weekend Briefing)',
      headline: 'Crude Drops to $72, Easing Operating Margins for Domestic Manufacturers',
      executiveSummary: 'Brent crude retreated 3.8% to $72.40 on non-OPEC inventory additions. High-volume accumulation observed across automotive, chemical, and paint manufacturers.',
      marketMood: MarketMood.NEUTRAL,
      benchmarkCloses: {
        nifty50: 25062.30,
        niftyChange: 0.35,
        sensex: 81971.20,
        sensexChange: 0.28,
      },
      forwardPerformanceMap: {
        TATAMOTORS: { day1: 1.5, day7: 4.2, day30: 8.8 },
      },
      read: true,
    },
  });

  console.log('✓ Seeded historical intelligence digests and junction links');
  console.log('🚀 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
