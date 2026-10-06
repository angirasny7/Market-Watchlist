import YahooFinance from 'yahoo-finance2';
import { NewsApiProvider } from '../src/providers/newsApiProvider.js';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function run() {
  console.log('Testing News via Yahoo Finance for symbols:');
  const symbols = ['^NSEI', 'RELIANCE.NS', 'AAPL'];
  for (const s of symbols) {
    try {
      const res: any = await yf.search(s, { newsCount: 5 });
      console.log(`Symbol ${s} news count: ${res?.news?.length || 0}`);
      if (res?.news?.length) {
        console.log(`  First: ${res.news[0].title} (${res.news[0].publisher}) -> ${res.news[0].link}`);
      }
    } catch(e: any) {
      console.log(`  Error on ${s}: ${e.message}`);
    }
  }

  console.log('\nTesting NewsAPI provider:');
  const newsApi = new NewsApiProvider();
  try {
    const articles = await newsApi.getMarketNews(5);
    console.log(`NewsAPI market news returned: ${articles.length}`);
    if (articles.length > 0) {
      console.log(`  First: ${articles[0].headline} (${articles[0].sourceName}) -> ${articles[0].sourceUrl}`);
    }
  } catch (err: any) {
    console.log(`NewsAPI error: ${err.message}`);
  }
}

run().catch(console.error);
