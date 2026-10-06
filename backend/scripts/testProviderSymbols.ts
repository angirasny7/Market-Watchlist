import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const symbols = [
  '^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^INDIAVIX',
  '^GSPC', '^IXIC', '^DJI', '^TNX', 'USDINR=X', 'CL=F', 'GC=F'
];

async function run() {
  console.log('Testing symbols with YahooFinance:');
  for (const s of symbols) {
    try {
      const q: any = await yf.quote(s);
      if (q && q.regularMarketPrice !== undefined) {
        console.log(`OK: ${s} -> Price: ${q.regularMarketPrice}, Change: ${q.regularMarketChange} (${q.regularMarketChangePercent?.toFixed(2)}%), Name: ${q.shortName || q.longName}, Exchange: ${q.exchange}, Delay: ${q.exchangeDataDelayedBy ?? 15}min`);
      } else {
        console.log(`FAIL (no price): ${s}`);
      }
    } catch (err: any) {
      console.log(`ERROR: ${s} -> ${err.message}`);
    }
  }

  console.log('\nTesting Market News from YahooFinance:');
  try {
    const newsRes: any = await yf.search('India Stock Market', { newsCount: 5 });
    console.log(`News count returned: ${newsRes?.news?.length || 0}`);
    if (newsRes?.news?.length) {
      console.log('Sample news item:', newsRes.news[0].title, '| Publisher:', newsRes.news[0].publisher, '| Link:', newsRes.news[0].link);
    }
  } catch (err: any) {
    console.log('News error:', err.message);
  }
}

run().catch(console.error);
