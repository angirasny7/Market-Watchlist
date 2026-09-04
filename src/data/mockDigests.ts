import { HistoricalDigest } from '../types/digest';

export const mockDigests: HistoricalDigest[] = [
  {
    id: 'digest_2026_09_15',
    digestDate: '2026-09-15',
    displayDate: 'September 15, 2026',
    title: 'Tata Motors 52W Breakout & Tech Sector AI Rally',
    executiveSummary: 'Indian equities staged a broad-based rally led by Auto and IT. Tata Motors broke out to an all-time high on robust commercial EV deliveries, while IT heavyweights TCS and Infosys surged following large multi-year enterprise contract wins.',
    totalEventsCount: 4,
    highPriorityCount: 3,
    marketMood: 'BULLISH',
    isAcknowledged: false,
    benchmarkIndices: {
      nifty: { close: 25418.50, changePercent: 1.42 },
      sensex: { close: 83079.60, changePercent: 1.35 },
    },
    catalysts: [
      { title: 'Commercial EV Subsidy Expansion', impact: 'BULLISH', affectedSectors: ['Automobile'] },
      { title: 'Enterprise Cloud AI Modernization Cycle', impact: 'BULLISH', affectedSectors: ['Information Technology'] },
      { title: 'Crude Oil Drops Below $74/bbl', impact: 'BULLISH', affectedSectors: ['Paints', 'Aviation', 'Oil Marketing'] },
    ],
    // Explicit normalized references
    eventIds: [
      'evt_tata_52w',
      'evt_tcs_contract',
      'evt_infy_earnings',
      'evt_reliance_dividend',
    ],
    insightIds: [
      'ins_tata_52w',
      'ins_tcs_contract',
      'ins_infy_earnings',
      'ins_reliance_dividend',
    ],
    forwardPerformanceMap: {
      'TATAMOTORS': { day1: '+1.8%', day5: '+6.2%', day30: '+14.5%' },
      'TCS': { day1: '+0.9%', day5: '+3.4%', day30: '+7.8%' },
      'INFY': { day1: '+1.2%', day5: '+4.1%', day30: '+9.2%' },
      'RELIANCE': { day1: '+0.3%', day5: '+1.9%', day30: '+4.2%' },
    },
  },
  {
    id: 'digest_2026_09_10',
    digestDate: '2026-09-10',
    displayDate: 'September 10, 2026',
    title: 'Retail Sector Expansion & IT Pre-Earnings Accumulation',
    executiveSummary: 'Markets exhibited steady consolidation with selective outperformance in conglomerate retail arms and defensive IT positioning ahead of quarterly preview announcements.',
    totalEventsCount: 2,
    highPriorityCount: 1,
    marketMood: 'NEUTRAL',
    isAcknowledged: true,
    benchmarkIndices: {
      nifty: { close: 25062.20, changePercent: 0.28 },
      sensex: { close: 81920.10, changePercent: 0.22 },
    },
    catalysts: [
      { title: 'Global Semiconductor Supply Recovery', impact: 'BULLISH', affectedSectors: ['Automobile', 'Electronics'] },
      { title: 'Domestic Inflation Cools to 3.6%', impact: 'BULLISH', affectedSectors: ['FMCG', 'Banking'] },
    ],
    // Explicit normalized references
    eventIds: [
      'evt_reliance_retail_sep10',
      'evt_infy_deals_sep10',
    ],
    insightIds: [
      'ins_reliance_retail_sep10',
      'ins_infy_deals_sep10',
    ],
    forwardPerformanceMap: {
      'RELIANCE': { day1: '+0.8%', day5: '+2.1%', day30: '+5.4%' },
      'INFY': { day1: '+0.5%', day5: '+4.1%', day30: '+10.2%' },
    },
  },
  {
    id: 'digest_2026_09_05',
    digestDate: '2026-09-05',
    displayDate: 'September 5, 2026',
    title: 'RBI MPC Holds Rates; Auto Sales Momentum Continues',
    executiveSummary: 'The Reserve Bank of India Monetary Policy Committee maintained status quo on the benchmark repo rate at 6.50% while reiterating its withdrawal of accommodation stance. Rate-sensitive Auto and Banking stocks gained on liquidity easing.',
    totalEventsCount: 3,
    highPriorityCount: 2,
    marketMood: 'BULLISH',
    isAcknowledged: true,
    benchmarkIndices: {
      nifty: { close: 24985.40, changePercent: 0.85 },
      sensex: { close: 81650.90, changePercent: 0.79 },
    },
    catalysts: [
      { title: 'RBI Holds Repo Rate at 6.50%', impact: 'BULLISH', affectedSectors: ['Banking', 'Real Estate', 'Auto'] },
      { title: 'Monsoon Dispatches Normal across Rural Belts', impact: 'BULLISH', affectedSectors: ['Auto', 'Agri-Inputs'] },
    ],
    // Explicit normalized references
    eventIds: [
      'evt_tata_sales_sep05',
      'evt_hdfc_rbi_sep05',
      'evt_tcs_genai_sep05',
    ],
    insightIds: [
      'ins_tata_sales_sep05',
      'ins_hdfc_rbi_sep05',
      'ins_tcs_genai_sep05',
    ],
    forwardPerformanceMap: {
      'TATAMOTORS': { day1: '+1.4%', day5: '+5.8%', day30: '+15.2%' },
      'HDFCBANK': { day1: '+0.4%', day5: '+1.5%', day30: '+3.8%' },
      'TCS': { day1: '+0.2%', day5: '+2.4%', day30: '+8.1%' },
    },
  },
];
