export interface RankableStock {
  symbol: string;
  companyName: string;
  sector: string;
  exchange?: string;
  currency?: string;
  currentPrice: number;
  changePercent: number;
  dailyChangePercent?: number;
}

export function computeStockSearchScore(stock: { symbol: string; companyName: string }, query: string): number {
  const q = query.trim().toUpperCase();
  if (!q) return 0;

  const symbol = stock.symbol.toUpperCase();
  const name = stock.companyName.toUpperCase();

  // Priority 1: Exact symbol match
  if (symbol === q) return 1;

  // Priority 2: Symbol prefix match
  if (symbol.startsWith(q)) return 2;

  // Priority 3: Company name prefix match
  if (name.startsWith(q)) return 3;

  // Priority 4: Word prefix match in company name
  const words = name.split(/[\s\-&,.]+/).filter(Boolean);
  if (words.some((w) => w.startsWith(q))) return 4;

  // Priority 5: Substring match
  if (symbol.includes(q) || name.includes(q)) return 5;

  // No match
  return 999;
}

export function filterAndRankStocks<T extends { symbol: string; companyName: string; sector: string; exchange?: string }>(
  stocks: T[],
  options: {
    query?: string;
    market?: 'ALL' | 'IN' | 'US';
    sector?: string;
    sortOrder?: 'DEFAULT' | 'A-Z' | 'Z-A';
  }
): T[] {
  const { query = '', market = 'ALL', sector = 'ALL', sortOrder = 'DEFAULT' } = options;
  const q = query.trim();

  return stocks
    .map((stock) => ({
      stock,
      score: q ? computeStockSearchScore(stock, q) : 0,
    }))
    .filter(({ stock, score }) => {
      // Exclude non-matching search results if query is provided
      if (q && score === 999) return false;

      // Market filter: ALL, India (NSE), US (NASDAQ/NYSE)
      if (market === 'IN') {
        if (stock.exchange && stock.exchange.toUpperCase() !== 'NSE') return false;
      } else if (market === 'US') {
        const ex = (stock.exchange || '').toUpperCase();
        if (ex !== 'NASDAQ' && ex !== 'NYSE') return false;
      }

      // Sector filter
      if (sector && sector !== 'ALL' && stock.sector !== sector) {
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      // 1. Search relevance rank (if searching)
      if (q && a.score !== b.score) {
        return a.score - b.score;
      }

      // 2. Alphabetical sort if chosen
      if (sortOrder === 'A-Z') {
        return a.stock.symbol.localeCompare(b.stock.symbol);
      }
      if (sortOrder === 'Z-A') {
        return b.stock.symbol.localeCompare(a.stock.symbol);
      }

      // Default order: keep original or alphabetical if searching
      return q ? a.stock.symbol.localeCompare(b.stock.symbol) : 0;
    })
    .map(({ stock }) => stock);
}

/**
 * Generates an accessible, deterministic stylized monogram and background palette
 * based on the stock's symbol and sector.
 */
export function getStockAvatarDetails(symbol: string, sector: string) {
  const cleanSymbol = symbol.trim().toUpperCase();
  const initials = cleanSymbol.slice(0, 2);

  const sectorColorMap: Record<string, { bg: string; text: string; border: string }> = {
    'Information Technology': { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
    'Banking & Financial Services': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    'Energy & Utilities': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'Energy & Petrochemicals': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
    'Automobile': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
    'Consumer Goods': { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/30' },
    'Healthcare & Pharma': { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30' },
    'Metals & Mining': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
    'Infrastructure & Capital Goods': { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
    'Telecom & Media': { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30' },
    'US Mega Caps': { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  };

  const style = sectorColorMap[sector] || {
    bg: 'bg-slate-800',
    text: 'text-slate-300',
    border: 'border-slate-700',
  };

  return { initials, style };
}
