export interface UniverseConstituent {
  symbol: string;
  name: string;
  indexName: 'NIFTY 50' | 'DOW 30' | 'S&P 500';
  exchange: 'NSE' | 'BSE' | 'NASDAQ' | 'NYSE';
  sector: string;
  sourceUrl: string;
  lastVerifiedDate: string;
}

export interface MarketBenchmarkDef {
  symbol: string;
  name: string;
  category: 'INDEX' | 'VOLATILITY' | 'COMMODITY' | 'CURRENCY' | 'BOND';
  exchange: string;
  delayMinutes: number;
}

export const benchmarkDefinitions: MarketBenchmarkDef[] = [
  // Indian Indices
  { symbol: '^NSEI', name: 'NIFTY 50', category: 'INDEX', exchange: 'NSE', delayMinutes: 15 },
  { symbol: '^BSESN', name: 'S&P BSE SENSEX', category: 'INDEX', exchange: 'BSE', delayMinutes: 15 },
  { symbol: '^NSEBANK', name: 'NIFTY BANK', category: 'INDEX', exchange: 'NSE', delayMinutes: 15 },
  { symbol: '^CNXIT', name: 'NIFTY IT', category: 'INDEX', exchange: 'NSE', delayMinutes: 15 },
  { symbol: '^INDIAVIX', name: 'INDIA VIX', category: 'VOLATILITY', exchange: 'NSE', delayMinutes: 15 },

  // US Benchmark Indices
  { symbol: '^GSPC', name: 'S&P 500', category: 'INDEX', exchange: 'SNP', delayMinutes: 0 },
  { symbol: '^IXIC', name: 'NASDAQ Composite', category: 'INDEX', exchange: 'NASDAQ', delayMinutes: 0 },
  { symbol: '^DJI', name: 'Dow Jones Industrial Average', category: 'INDEX', exchange: 'DJI', delayMinutes: 0 },

  // Global Cues & Macro Indicators
  { symbol: '^TNX', name: 'US 10-Yr Yield', category: 'BOND', exchange: 'CGI', delayMinutes: 0 },
  { symbol: 'USDINR=X', name: 'USD / INR', category: 'CURRENCY', exchange: 'FOREX', delayMinutes: 0 },
  { symbol: 'CL=F', name: 'Crude Oil (WTI)', category: 'COMMODITY', exchange: 'NYMEX', delayMinutes: 10 },
  { symbol: 'GC=F', name: 'Gold Futures', category: 'COMMODITY', exchange: 'COMEX', delayMinutes: 10 },
];

// Official 50 constituents of Nifty 50 (NSE India)
// Source: https://www.niftyindices.com/indices/equity/broad-based-indices/nifty-50
// Last verified: 2026-10-06
export const nifty50Constituents: UniverseConstituent[] = [
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Metals & Mining', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Services & Logistics', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Healthcare', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BAJAJ-AUTO', name: 'Bajaj Auto Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BEL', name: 'Bharat Electronics Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Capital Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BPCL', name: 'Bharat Petroleum Corporation Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Oil Gas & Consumable Fuels', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Telecommunication', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'BRITANNIA', name: 'Britannia Industries Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'CIPLA', name: 'Cipla Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Healthcare', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Oil Gas & Consumable Fuels', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'DRREDDY', name: "Dr. Reddy's Laboratories Ltd", indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Healthcare', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'EICHERMOT', name: 'Eicher Motors Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'GRASIM', name: 'Grasim Industries Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Construction Materials', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Information Technology', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HDFCLIFE', name: 'HDFC Life Insurance Co Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HINDALCO', name: 'Hindalco Industries Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Metals & Mining', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ITC', name: 'ITC Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'INDUSINDBK', name: 'IndusInd Bank Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'INFY', name: 'Infosys Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Information Technology', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Metals & Mining', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Construction', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'NTPC', name: 'NTPC Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Power', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corporation Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Oil Gas & Consumable Fuels', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation of India Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Power', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Oil Gas & Consumable Fuels', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'SBILIFE', name: 'SBI Life Insurance Co Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'SHRIRAMFIN', name: 'Shriram Finance Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'SBIN', name: 'State Bank of India', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Financial Services', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Healthcare', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Information Technology', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TATACONSUM', name: 'Tata Consumer Products Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Automobile', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Metals & Mining', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TECHM', name: 'Tech Mahindra Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Information Technology', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TITAN', name: 'Titan Company Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TRENT', name: 'Trent Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Consumer Goods', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Construction Materials', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', indexName: 'NIFTY 50', exchange: 'NSE', sector: 'Information Technology', sourceUrl: 'https://www.niftyindices.com', lastVerifiedDate: '2026-10-06' },
];

// Top US Constituents (S&P 500 / Dow Jones)
// Source: https://www.spglobal.com/spdji/en/indices/equity/sp-500/
// Last verified: 2026-10-06
export const usMajorConstituents: UniverseConstituent[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Information Technology', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Information Technology', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Information Technology', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Communication Services', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Consumer Discretionary', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'META', name: 'Meta Platforms Inc.', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Communication Services', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'TSLA', name: 'Tesla Inc.', indexName: 'S&P 500', exchange: 'NASDAQ', sector: 'Automobile', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', indexName: 'DOW 30', exchange: 'NYSE', sector: 'Financial Services', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'WMT', name: 'Walmart Inc.', indexName: 'DOW 30', exchange: 'NYSE', sector: 'Consumer Goods', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', indexName: 'DOW 30', exchange: 'NYSE', sector: 'Healthcare', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'V', name: 'Visa Inc.', indexName: 'DOW 30', exchange: 'NYSE', sector: 'Financial Services', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', indexName: 'DOW 30', exchange: 'NYSE', sector: 'Consumer Goods', sourceUrl: 'https://www.spglobal.com', lastVerifiedDate: '2026-10-06' },
];

export const allUniverseConstituents: UniverseConstituent[] = [
  ...nifty50Constituents,
  ...usMajorConstituents,
];
