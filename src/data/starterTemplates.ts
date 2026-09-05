export interface StarterWatchlistTemplate {
  id: string;
  name: string;
  description: string;
  iconName: string;
  symbols: string[];
  sampleConstituents?: string;
}

export const STARTER_TEMPLATES: StarterWatchlistTemplate[] = [
  {
    id: 'nifty-leaders',
    name: 'Nifty Leaders',
    description: 'India top mega-cap bluechips across banking, tech, energy & auto',
    iconName: 'Crown',
    symbols: ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'LT', 'ITC', 'SBIN', 'BHARTIARTL', 'TATAMOTORS'],
    sampleConstituents: 'RELIANCE, TCS, HDFC & more',
  },
  {
    id: 'ai-tech',
    name: 'AI & Technology',
    description: 'Global AI semiconductor giants & India premier digital engineering firms',
    iconName: 'Cpu',
    symbols: ['NVDA', 'MSFT', 'GOOGL', 'AAPL', 'TCS', 'INFY', 'WIPRO', 'HCLTECH', 'LTIM', 'PERSISTENT'],
    sampleConstituents: 'NVDA, MSFT, TCS, INFY & more',
  },
  {
    id: 'banking-finance',
    name: 'Banking & Finance',
    description: 'Tier-1 private banks, public sector powerhouses & leading NBFCs',
    iconName: 'Landmark',
    symbols: ['HDFCBANK', 'ICICIBANK', 'AXISBANK', 'KOTAKBANK', 'SBIN', 'BAJFINANCE', 'BAJAJFINSV', 'CHOLAFIN'],
    sampleConstituents: 'HDFC, ICICI, SBI, AXIS & more',
  },
  {
    id: 'energy-utilities',
    name: 'Energy & Utilities',
    description: 'Oil refining titans, green hydrogen innovators & national power transmission',
    iconName: 'Zap',
    symbols: ['RELIANCE', 'ONGC', 'BPCL', 'NTPC', 'POWERGRID', 'TATAPOWER', 'SUZLON', 'ADANIGREEN'],
    sampleConstituents: 'Reliance, ONGC, NTPC & more',
  },
  {
    id: 'automobile',
    name: 'Automobile',
    description: 'Commercial vehicle champions, EV pioneers, 2-wheelers & auto components',
    iconName: 'Car',
    symbols: ['TATAMOTORS', 'M&M', 'MARUTI', 'BAJAJ-AUTO', 'EICHERMOT', 'TVSMOTOR', 'HEROMOTOCO', 'BHARATFORG'],
    sampleConstituents: 'Tata Motors, M&M, Maruti & more',
  },
  {
    id: 'healthcare-pharma',
    name: 'Healthcare & Pharma',
    description: 'Global formulations, active ingredients (APIs), biosimilars & hospital chains',
    iconName: 'HeartPulse',
    symbols: ['SUNPHARMA', 'DRREDDY', 'CIPLA', 'DIVISLAB', 'LUPIN', 'APOLLOHOSP', 'MAXHEALTH', 'MANKIND'],
    sampleConstituents: 'Sun Pharma, Dr. Reddy\'s & more',
  },
  {
    id: 'us-mega-caps',
    name: 'US Mega Caps',
    description: 'Trillion-dollar American tech leaders & retail bellwethers',
    iconName: 'Globe',
    symbols: ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NFLX', 'AMD', 'WMT'],
    sampleConstituents: 'AAPL, MSFT, NVDA, AMZN & more',
  },
];
