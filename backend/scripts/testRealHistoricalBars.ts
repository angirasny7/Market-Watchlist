import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function testHistorical() {
  const symbols = ['^NSEI', '^BSESN', '^GSPC', '^INDIAVIX', 'CL=F', 'USDINR=X'];
  for (const s of symbols) {
    try {
      const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const res: any = await yf.chart(s, { period1: startDate, interval: '1d' });
      const quotes = res?.quotes || [];
      console.log(`Symbol ${s} historical bars count: ${quotes.length}`);
      if (quotes.length > 0) {
        const last = quotes[quotes.length - 1];
        console.log(`  Latest close: ${last.close} on ${last.date}`);
      }
    } catch (err: any) {
      console.error(`  Error on ${s}: ${err.message}`);
    }
  }
}

testHistorical().catch(console.error);
