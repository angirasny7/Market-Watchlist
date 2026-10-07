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
    {
      symbol: 'BHARTIARTL',
      companyName: 'Bharti Airtel Ltd',
      sector: 'Telecommunications',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1720.50,
      changeAmount: 18.30,
      changePercent: 1.07,
      volume: BigInt(6500000),
      avgVolume20D: BigInt(5800000),
      marketCap: '₹9.80 Lakh Cr',
      peRatio: 52.4,
      high52w: 1750.00,
      low52w: 920.00,
      tags: ['Nifty 50', '5G Leader', 'ARPU Expansion'],
    },
    {
      symbol: 'MPHASIS',
      companyName: 'Mphasis Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 2310.00,
      changeAmount: 42.50,
      changePercent: 1.87,
      volume: BigInt(1850000),
      avgVolume20D: BigInt(1420000),
      marketCap: '₹43,500 Cr',
      peRatio: 28.6,
      high52w: 3120.00,
      low52w: 2100.00,
      tags: ['Midcap IT', 'Cloud Migration', 'Banking Tech'],
    },
    {
      symbol: 'HCLTECH',
      companyName: 'HCL Technologies Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1845.00,
      changeAmount: 25.00,
      changePercent: 1.37,
      volume: BigInt(3200000),
      avgVolume20D: BigInt(2900000),
      marketCap: '₹5.01 Lakh Cr',
      peRatio: 27.1,
      high52w: 1890.00,
      low52w: 1220.00,
      tags: ['Nifty 50', 'Engineering Services', 'AI Deals'],
    },
    {
      symbol: 'SBILIFE',
      companyName: 'SBI Life Insurance Company Ltd',
      sector: 'Banking & Financial Services',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1680.00,
      changeAmount: 12.00,
      changePercent: 0.72,
      volume: BigInt(1400000),
      avgVolume20D: BigInt(1250000),
      marketCap: '₹1.68 Lakh Cr',
      peRatio: 78.4,
      high52w: 1930.00,
      low52w: 1380.00,
      tags: ['Nifty 50', 'Life Insurance', 'Bancassurance'],
    },
    {
      symbol: 'TSLA',
      companyName: 'Tesla, Inc.',
      sector: 'Automobile',
      exchange: 'NASDAQ',
      currency: '$',
      currentPrice: 245.50,
      changeAmount: 8.20,
      changePercent: 3.45,
      volume: BigInt(85000000),
      avgVolume20D: BigInt(78000000),
      marketCap: '$780 Billion',
      peRatio: 64.2,
      high52w: 271.00,
      low52w: 138.80,
      tags: ['Nasdaq 100', 'EV Leader', 'Autonomous Driving'],
    },
    {
      symbol: 'COFORGE',
      companyName: 'Coforge Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 7420.00,
      changeAmount: 110.00,
      changePercent: 1.50,
      volume: BigInt(850000),
      avgVolume20D: BigInt(720000),
      marketCap: '₹46,200 Cr',
      peRatio: 44.8,
      high52w: 7800.00,
      low52w: 4300.00,
      tags: ['Midcap IT', 'Travel Tech', 'Insurance Solutions'],
    },
    {
      symbol: 'ABB',
      companyName: 'ABB India Ltd',
      sector: 'Infrastructure & Capital Goods',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 7850.00,
      changeAmount: 145.00,
      changePercent: 1.88,
      volume: BigInt(620000),
      avgVolume20D: BigInt(510000),
      marketCap: '₹1.66 Lakh Cr',
      peRatio: 88.2,
      high52w: 9200.00,
      low52w: 4100.00,
      tags: ['Electrification', 'Robotics', 'Smart Grid'],
    },
    {
      symbol: 'NFLX',
      companyName: 'Netflix Inc.',
      sector: 'Communication Services',
      exchange: 'NASDAQ',
      currency: '$',
      currentPrice: 710.00,
      changeAmount: 14.50,
      changePercent: 2.08,
      volume: BigInt(3400000),
      avgVolume20D: BigInt(3100000),
      marketCap: '$305 Billion',
      peRatio: 42.1,
      high52w: 730.00,
      low52w: 360.00,
      tags: ['Streaming Leader', 'Ad Tier Growth', 'Global Reach'],
    },
    {
      symbol: 'TATACONSUM',
      companyName: 'Tata Consumer Products Ltd',
      sector: 'Consumer Goods',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 1120.00,
      changeAmount: 8.50,
      changePercent: 0.76,
      volume: BigInt(2100000),
      avgVolume20D: BigInt(1850000),
      marketCap: '₹1.05 Lakh Cr',
      peRatio: 68.5,
      high52w: 1269.00,
      low52w: 830.00,
      tags: ['Nifty 50', 'FMCG', 'Tata Sampann'],
    },
    {
      symbol: 'MANKIND',
      companyName: 'Mankind Pharma Ltd',
      sector: 'Healthcare & Pharma',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 2480.00,
      changeAmount: 32.00,
      changePercent: 1.31,
      volume: BigInt(1100000),
      avgVolume20D: BigInt(950000),
      marketCap: '₹99,400 Cr',
      peRatio: 51.2,
      high52w: 2680.00,
      low52w: 1650.00,
      tags: ['Domestic Pharma', 'Consumer Health', 'High Margin'],
    },
    {
      symbol: 'AMD',
      companyName: 'Advanced Micro Devices, Inc.',
      sector: 'Information Technology',
      exchange: 'NASDAQ',
      currency: '$',
      currentPrice: 155.00,
      changeAmount: 4.80,
      changePercent: 3.20,
      volume: BigInt(52000000),
      avgVolume20D: BigInt(48000000),
      marketCap: '$251 Billion',
      peRatio: 110.5,
      high52w: 227.30,
      low52w: 94.00,
      tags: ['Semiconductor', 'AI Accelerators', 'Data Center'],
    },
    {
      symbol: 'HDFCLIFE',
      companyName: 'HDFC Life Insurance Company Ltd',
      sector: 'Banking & Financial Services',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 715.00,
      changeAmount: 6.20,
      changePercent: 0.87,
      volume: BigInt(3500000),
      avgVolume20D: BigInt(3100000),
      marketCap: '₹1.54 Lakh Cr',
      peRatio: 84.1,
      high52w: 760.00,
      low52w: 560.00,
      tags: ['Nifty 50', 'Life Insurance', 'Retirement Planning'],
    },
    {
      symbol: 'LTIM',
      companyName: 'LTIMindtree Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 5950.00,
      changeAmount: 85.00,
      changePercent: 1.45,
      volume: BigInt(650000),
      avgVolume20D: BigInt(580000),
      marketCap: '₹1.76 Lakh Cr',
      peRatio: 37.8,
      high52w: 6500.00,
      low52w: 4500.00,
      tags: ['Nifty 50', 'Tier-1 IT', 'Enterprise Cloud'],
    },
    {
      symbol: 'SIEMENS',
      companyName: 'Siemens Ltd',
      sector: 'Infrastructure & Capital Goods',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 7200.00,
      changeAmount: 120.00,
      changePercent: 1.70,
      volume: BigInt(480000),
      avgVolume20D: BigInt(410000),
      marketCap: '₹2.56 Lakh Cr',
      peRatio: 82.3,
      high52w: 8100.00,
      low52w: 3300.00,
      tags: ['Industrial Automation', 'Railways', 'Energy Grid'],
    },
    {
      symbol: 'FORTIS',
      companyName: 'Fortis Healthcare Ltd',
      sector: 'Healthcare & Pharma',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 764.00,
      changeAmount: 5.50,
      changePercent: 0.72,
      volume: BigInt(1250000),
      avgVolume20D: BigInt(1100000),
      marketCap: '₹57,600 Cr',
      peRatio: 55.0,
      high52w: 1104.30,
      low52w: 745.35,
      tags: ['Hospitals', 'Diagnostics', 'Bed Capacity'],
    },
    {
      symbol: 'PERSISTENT',
      companyName: 'Persistent Systems Ltd',
      sector: 'Information Technology',
      exchange: 'NSE',
      currency: '₹',
      currentPrice: 5200.00,
      changeAmount: 95.00,
      changePercent: 1.86,
      volume: BigInt(780000),
      avgVolume20D: BigInt(690000),
      marketCap: '₹80,200 Cr',
      peRatio: 52.4,
      high52w: 5600.00,
      low52w: 3200.00,
      tags: ['Software Engineering', 'Generative AI', 'Healthcare Tech'],
    },
    {
      symbol: 'GOOGL',
      companyName: 'Alphabet Inc. (Google)',
      sector: 'Communication Services',
      exchange: 'NASDAQ',
      currency: '$',
      currentPrice: 178.50,
      changeAmount: 3.20,
      changePercent: 1.82,
      volume: BigInt(24000000),
      avgVolume20D: BigInt(22000000),
      marketCap: '$2.21 Trillion',
      peRatio: 24.8,
      high52w: 191.75,
      low52w: 120.20,
      tags: ['Mega-cap', 'Search & Cloud', 'Gemini AI'],
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

  // 4. Seed User, UserState & Watchlists (Alex N Profile)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Alex@123', salt);

  const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const user = await prisma.user.create({
    data: {
      id: 'usr_alex_001',
      email: 'alex@example.com',
      passwordHash,
      name: 'Alex N',
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

  // Seed all 5 watchlists for Alex N
  const watchlistDefinitions = [
    {
      id: 'wl_primary_001',
      name: 'Primary Watchlist',
      isDefault: true,
      stocks: [
        { symbol: 'TCS', isPinned: true },
        { symbol: 'ITC', isPinned: false },
        { symbol: 'BHARTIARTL', isPinned: false },
        { symbol: 'RELIANCE', isPinned: false },
        { symbol: 'MPHASIS', isPinned: false },
        { symbol: 'INFY', isPinned: true },
        { symbol: 'TATAMOTORS', isPinned: true },
        { symbol: 'HCLTECH', isPinned: false },
        { symbol: 'SBILIFE', isPinned: false },
        { symbol: 'TSLA', isPinned: false },
        { symbol: 'COFORGE', isPinned: false },
        { symbol: 'ABB', isPinned: false },
      ],
    },
    {
      id: 'wl_my_001',
      name: 'My Watchlist',
      isDefault: false,
      stocks: [
        { symbol: 'INFY', isPinned: false },
        { symbol: 'NFLX', isPinned: false },
        { symbol: 'HDFCBANK', isPinned: false },
        { symbol: 'MPHASIS', isPinned: false },
      ],
    },
    {
      id: 'wl_trial_001',
      name: 'Trial Watchlist',
      isDefault: false,
      stocks: [
        { symbol: 'TATACONSUM', isPinned: false },
        { symbol: 'MANKIND', isPinned: false },
        { symbol: 'HCLTECH', isPinned: false },
        { symbol: 'HDFCBANK', isPinned: false },
        { symbol: 'SBILIFE', isPinned: false },
      ],
    },
    {
      id: 'wl_trial_2_001',
      name: 'Trial 2',
      isDefault: false,
      stocks: [
        { symbol: 'TSLA', isPinned: false },
        { symbol: 'MPHASIS', isPinned: false },
        { symbol: 'INFY', isPinned: false },
        { symbol: 'AMD', isPinned: false },
        { symbol: 'HDFCLIFE', isPinned: false },
        { symbol: 'COFORGE', isPinned: false },
        { symbol: 'LTIM', isPinned: false },
        { symbol: 'SIEMENS', isPinned: false },
        { symbol: 'FORTIS', isPinned: false },
        { symbol: 'ABB', isPinned: false },
        { symbol: 'NFLX', isPinned: false },
      ],
    },
    {
      id: 'wl_trial_3_001',
      name: 'Trial 3',
      isDefault: false,
      stocks: [
        { symbol: 'PERSISTENT', isPinned: false },
        { symbol: 'GOOGL', isPinned: false },
        { symbol: 'MPHASIS', isPinned: false },
        { symbol: 'TSLA', isPinned: false },
      ],
    },
  ];

  for (const wl of watchlistDefinitions) {
    const createdWl = await prisma.watchlist.create({
      data: {
        id: wl.id,
        userId: user.id,
        name: wl.name,
        isDefault: wl.isDefault,
      },
    });

    for (const item of wl.stocks) {
      await prisma.watchlistStock.create({
        data: {
          watchlistId: createdWl.id,
          stockSymbol: item.symbol,
          isPinned: item.isPinned,
        },
      });
    }
  }

  // Seed Custom Alerts for Alex N
  await prisma.alert.createMany({
    data: [
      {
        userId: user.id,
        stockSymbol: 'MPHASIS',
        alertType: 'PRICE_ABOVE',
        targetValue: 2295.2,
        isActive: false,
      },
      {
        userId: user.id,
        stockSymbol: 'TCS',
        alertType: 'DAY_CHANGE_PCT',
        targetValue: 5,
        isActive: true,
      },
    ],
  });

  console.log('✓ Seeded user Alex N with 5 watchlists, stocks, and alerts');

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
        isDemo: true,
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
        isDemo: true,
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
        isDemo: true,
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
        isDemo: true,
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
