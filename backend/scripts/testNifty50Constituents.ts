import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

// Official Nifty 50 constituents (NSE India)
const nifty50Symbols = [
  'ADANIENT', 'ADANIPORTS', 'APOLLOHOSP', 'ASIANPAINT', 'AXISBANK',
  'BAJAJ-AUTO', 'BAJFINANCE', 'BAJAJFINSV', 'BEL', 'BPCL',
  'BHARTIARTL', 'BRITANNIA', 'CIPLA', 'COALINDIA', 'DRREDDY',
  'EICHERMOT', 'GRASIM', 'HCLTECH', 'HDFCBANK', 'HDFCLIFE',
  'HEROMOTOCO', 'HINDALCO', 'HINDUNILVR', 'ICICIBANK', 'ITC',
  'INDUSINDBK', 'INFY', 'JSWSTEEL', 'KOTAKBANK', 'LT',
  'M&M', 'MARUTI', 'NESTLEIND', 'NTPC', 'ONGC',
  'POWERGRID', 'RELIANCE', 'SBILIFE', 'SHRIRAMFIN', 'SBIN',
  'SUNPHARMA', 'TCS', 'TATACONSUM', 'TATAMOTORS', 'TATASTEEL',
  'TECHM', 'TITAN', 'TRENT', 'ULTRACEMCO', 'WIPRO'
];

async function testNifty50() {
  console.log(`Testing ${nifty50Symbols.length} Nifty 50 constituents...`);
  let success = 0;
  let failed: string[] = [];

  for (const sym of nifty50Symbols) {
    const yahooTicker = sym === 'TATAMOTORS' ? 'TMCV.NS' : (sym.includes('.') ? sym : `${sym}.NS`);
    try {
      const q: any = await yf.quote(yahooTicker);
      if (q && q.regularMarketPrice !== undefined) {
        success++;
      } else {
        failed.push(sym);
      }
    } catch (e: any) {
      failed.push(`${sym} (${e.message})`);
    }
  }

  console.log(`Results: ${success}/${nifty50Symbols.length} succeeded.`);
  if (failed.length > 0) {
    console.log('Failed:', failed.join(', '));
  }
}

testNifty50().catch(console.error);
