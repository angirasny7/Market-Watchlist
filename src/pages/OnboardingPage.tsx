import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockService } from '../services/stockService';
import { watchlistService } from '../services/watchlistService';
import { useAuthStore } from '../store/useAuthStore';
import { useMarketStore } from '../store/useMarketStore';
import { filterAndRankStocks, getStockAvatarDetails } from '../lib/stockSearch';
import { STARTER_TEMPLATES, StarterWatchlistTemplate } from '../data/starterTemplates';
import {
  Sparkles,
  Search,
  Check,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  LogOut,
  Globe,
  Layers,
  X,
  BarChart3,
  Crown,
  Cpu,
  Landmark,
  Zap,
  Car,
  HeartPulse,
} from 'lucide-react';

interface CatalogStock {
  symbol: string;
  companyName: string;
  sector: string;
  exchange: string;
  currency: string;
  currentPrice: number;
  changePercent: number;
  dailyChangePercent?: number;
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setOnboarded, logout } = useAuthStore();
  const { fetchMarketData } = useMarketStore();

  const [stocks, setStocks] = useState<CatalogStock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [manualSelectedSymbols, setManualSelectedSymbols] = useState<Set<string>>(new Set());
  const [activeTemplateIds, setActiveTemplateIds] = useState<Set<string>>(new Set());
  const [templateContributions, setTemplateContributions] = useState<Record<string, Set<string>>>({});
  const [watchlistName, setWatchlistName] = useState('Primary Watchlist');
  const [isCustomWatchlistName, setIsCustomWatchlistName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarket, setSelectedMarket] = useState<'ALL' | 'IN' | 'US'>('ALL');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'DEFAULT' | 'A-Z' | 'CHANGE_DESC' | 'PRICE_DESC'>('DEFAULT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedSymbols = useMemo(() => {
    const set = new Set(manualSelectedSymbols);
    for (const templateId of activeTemplateIds) {
      const contribs = templateContributions[templateId];
      if (contribs) {
        for (const sym of contribs) {
          set.add(sym);
        }
      }
    }
    return set;
  }, [manualSelectedSymbols, activeTemplateIds, templateContributions]);

  useEffect(() => {
    let isMounted = true;
    stockService
      .getAllStocks()
      .then((data) => {
        if (isMounted && data && Array.isArray(data)) {
          setStocks(
            data.map((s: any) => ({
              symbol: s.symbol,
              companyName: s.companyName || s.name || s.symbol,
              sector: s.sector || 'General',
              exchange: s.exchange || (s.currency === '$' ? 'NASDAQ' : 'NSE'),
              currency: s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? '$' : '₹'),
              currentPrice: Number(s.currentPrice) || 0,
              changePercent: Number(s.dailyChangePercent ?? s.changePercent) || 0,
              dailyChangePercent: Number(s.dailyChangePercent ?? s.changePercent) || 0,
            }))
          );
        }
      })
      .catch((err) => {
        console.error('Failed to load stock catalog:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingStocks(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const sectors = useMemo(() => {
    const set = new Set(stocks.map((s) => s.sector));
    return ['ALL', ...Array.from(set)];
  }, [stocks]);

  const filteredStocks = useMemo(() => {
    let list = filterAndRankStocks(stocks, {
      query: searchQuery,
      market: selectedMarket,
      sector: selectedSector,
      sortOrder: sortOrder === 'A-Z' ? 'A-Z' : 'DEFAULT',
    });

    if (!searchQuery) {
      if (sortOrder === 'CHANGE_DESC') {
        list = [...list].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      } else if (sortOrder === 'PRICE_DESC') {
        list = [...list].sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0));
      }
    }
    return list;
  }, [stocks, searchQuery, selectedMarket, selectedSector, sortOrder]);

  const toggleTemplate = (template: StarterWatchlistTemplate) => {
    const isActive = activeTemplateIds.has(template.id);

    if (isActive) {
      const nextActiveIds = new Set(activeTemplateIds);
      nextActiveIds.delete(template.id);
      setActiveTemplateIds(nextActiveIds);

      setTemplateContributions((prev) => {
        const next = { ...prev };
        delete next[template.id];
        return next;
      });

      if (!isCustomWatchlistName) {
        if (nextActiveIds.size === 0) {
          setWatchlistName('Primary Watchlist');
        } else if (nextActiveIds.size === 1) {
          const activeTmpl = STARTER_TEMPLATES.find((t) => nextActiveIds.has(t.id));
          if (activeTmpl) setWatchlistName(`${activeTmpl.name} Watchlist`);
        } else {
          const names = STARTER_TEMPLATES.filter((t) => nextActiveIds.has(t.id)).map((t) => t.name);
          setWatchlistName(`${names.join(' & ')} Watchlist`);
        }
      }

      setErrorMessage(null);
    } else {
      const newSymbols = template.symbols.filter((sym) => !selectedSymbols.has(sym));
      if (selectedSymbols.size + newSymbols.length > 50) {
        setErrorMessage(
          `Adding "${template.name}" (${newSymbols.length} new stocks) would exceed the 50 stock maximum (${50 - selectedSymbols.size} slots remaining).`
        );
        return;
      }

      const contribs = new Set(template.symbols.filter((sym) => !manualSelectedSymbols.has(sym)));

      const nextActiveIds = new Set(activeTemplateIds);
      nextActiveIds.add(template.id);
      setActiveTemplateIds(nextActiveIds);

      setTemplateContributions((prev) => ({
        ...prev,
        [template.id]: contribs,
      }));

      if (!isCustomWatchlistName) {
        if (nextActiveIds.size === 1) {
          setWatchlistName(`${template.name} Watchlist`);
        } else {
          const names = STARTER_TEMPLATES.filter((t) => nextActiveIds.has(t.id)).map((t) => t.name);
          setWatchlistName(`${names.join(' & ')} Watchlist`);
        }
      }

      setErrorMessage(null);
    }
  };

  const clearAllTemplates = () => {
    setActiveTemplateIds(new Set());
    setTemplateContributions({});
    if (!isCustomWatchlistName) {
      setWatchlistName('Primary Watchlist');
    }
    setErrorMessage(null);
  };

  const toggleStock = (symbol: string) => {
    if (selectedSymbols.has(symbol)) {
      setManualSelectedSymbols((prev) => {
        const next = new Set(prev);
        next.delete(symbol);
        return next;
      });

      setTemplateContributions((prev) => {
        const next = { ...prev };
        let updated = false;
        for (const tId of Object.keys(next)) {
          if (next[tId].has(symbol)) {
            const nextSet = new Set(next[tId]);
            nextSet.delete(symbol);
            next[tId] = nextSet;
            updated = true;
          }
        }
        return updated ? next : prev;
      });

      setActiveTemplateIds((prev) => {
        const next = new Set(prev);
        for (const tId of prev) {
          const tmpl = STARTER_TEMPLATES.find((t) => t.id === tId);
          if (tmpl) {
            const hasAnyRemaining = tmpl.symbols.some(
              (s) => s !== symbol && selectedSymbols.has(s)
            );
            if (!hasAnyRemaining) {
              next.delete(tId);
            }
          }
        }
        return next;
      });

      setErrorMessage(null);
    } else {
      if (selectedSymbols.size >= 50) {
        setErrorMessage('Choose up to 50 stocks.');
        return;
      }
      setManualSelectedSymbols((prev) => new Set(prev).add(symbol));
      setErrorMessage(null);
    }
  };

  const handleCompleteSetup = async () => {
    if (selectedSymbols.size < 1) {
      setErrorMessage('Select at least 1 stock.');
      return;
    }
    if (selectedSymbols.size > 50) {
      setErrorMessage('Choose up to 50 stocks.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const success = await watchlistService.setupWatchlist({
        name: watchlistName.trim() || 'Primary Watchlist',
        symbols: Array.from(selectedSymbols),
      });

      if (!success) {
        throw new Error('Failed to save watchlist configuration');
      }

      setOnboarded(true);
      await fetchMarketData();
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving your watchlist.');
      setIsSubmitting(false);
    }
  };

  const isSelectionValid = selectedSymbols.size >= 1 && selectedSymbols.size <= 50;

  const selectedStockObjects = useMemo(() => {
    return stocks.filter((s) => selectedSymbols.has(s.symbol));
  }, [stocks, selectedSymbols]);

  const coveredSectorsCount = useMemo(() => {
    const set = new Set(selectedStockObjects.map((s) => s.sector));
    return set.size;
  }, [selectedStockObjects]);

  const coveragePercent = useMemo(() => {
    if (stocks.length === 0) return 0;
    return Math.min(100, Math.round((selectedSymbols.size / stocks.length) * 100));
  }, [selectedSymbols.size, stocks.length]);

  const counterStyle = useMemo(() => {
    const count = selectedSymbols.size;
    if (count === 0) {
      return {
        badge: 'bg-slate-800/90 text-slate-400 border-slate-700',
        text: 'Select at least 1 stock',
        textColor: 'text-slate-400',
      };
    }
    if (count >= 45) {
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        text: count > 50 ? 'Exceeds 50 stock maximum' : 'Approaching 50 stock limit',
        textColor: 'text-amber-400',
      };
    }
    return {
      badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      text: 'Ready to launch',
      textColor: 'text-emerald-400',
    };
  }, [selectedSymbols.size]);

  const renderTemplateIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crown':
        return <Crown className="w-4 h-4" />;
      case 'Cpu':
        return <Cpu className="w-4 h-4" />;
      case 'Landmark':
        return <Landmark className="w-4 h-4" />;
      case 'Zap':
        return <Zap className="w-4 h-4" />;
      case 'Car':
        return <Car className="w-4 h-4" />;
      case 'HeartPulse':
        return <HeartPulse className="w-4 h-4" />;
      case 'Globe':
        return <Globe className="w-4 h-4" />;
      default:
        return <Layers className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-start py-4 sm:py-6 px-3 sm:px-6 lg:px-8 pb-32">
      <div className="w-full max-w-[1560px] space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/30">
                AI
              </div>
              <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
                Smart Market Watchlist
              </span>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Account Setup</span>
            </div>
          </div>

          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            title="Sign out of account"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
          <div className="space-y-1.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-mono font-semibold tracking-wider uppercase">
              <Sparkles className="w-3 h-3" />
              <span>GET STARTED</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Build Your Personalized{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Watchlist
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Select at least 1 stock or choose a curated template (up to 50 stocks). Your dashboard,
              anomaly feed, and market intelligence will be personalized to your selection.
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm shrink-0 max-w-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-white">Track what matters</div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Get real-time alerts, AI-powered insights, and personalized market intelligence.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-2xl backdrop-blur-sm overflow-hidden divide-y divide-slate-800/80">
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/40">
            <div className="flex-1 max-w-md">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Watchlist Name
              </label>
              <input
                type="text"
                value={watchlistName}
                onChange={(e) => {
                  setWatchlistName(e.target.value);
                  setIsCustomWatchlistName(true);
                }}
                placeholder="e.g., Primary Watchlist or Core Equities"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex flex-col sm:items-end">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Selected:</span>
                <span
                  className={`text-sm font-bold font-mono px-3 py-1 rounded-lg border transition-colors ${counterStyle.badge}`}
                >
                  {selectedSymbols.size} / 50
                </span>
              </div>
              <span className={`text-[11px] mt-1 ${counterStyle.textColor}`}>
                {counterStyle.text}
              </span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3 bg-slate-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Popular Starter Templates</span>
                <span className="text-slate-500 font-normal hidden sm:inline">
                  — Click to toggle template stocks on or off
                </span>
              </div>
              {activeTemplateIds.size > 0 && (
                <button
                  onClick={clearAllTemplates}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-medium"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear Templates ({activeTemplateIds.size})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
              {STARTER_TEMPLATES.map((tmpl) => {
                const isSelected = activeTemplateIds.has(tmpl.id);
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => toggleTemplate(tmpl)}
                    className={`p-3 rounded-xl text-left border transition-all duration-150 flex flex-col justify-between gap-2 select-none group ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-indigo-400 group-hover:bg-slate-700'
                          }`}
                        >
                          {renderTemplateIcon(tmpl.iconName)}
                        </div>
                        <span className="font-bold text-xs text-white truncate leading-tight">
                          {tmpl.name}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-semibold shrink-0 flex items-center gap-1 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Applied</span>
                          </>
                        ) : (
                          <span>{tmpl.symbols.length}</span>
                        )}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate w-full">
                      {tmpl.sampleConstituents || tmpl.symbols.slice(0, 3).join(', ') + ' & more'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3 bg-slate-900/50">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by symbol (e.g. TCS, NVDA, INFY) or company name..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto justify-center">
                <Globe className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5 shrink-0" />
                {(
                  [
                    { id: 'ALL', label: 'All Markets' },
                    { id: 'IN', label: 'India (NSE)' },
                    { id: 'US', label: 'US (NASDAQ/NYSE)' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMarket(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                      selectedMarket === m.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0 mr-1" />
              {sectors.map((sec) => (
                <button
                  key={sec}
                  onClick={() => setSelectedSector(sec)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedSector === sec
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {sec === 'ALL' ? 'All Sectors' : sec}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-3 bg-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">All Stocks</span>
                <span className="text-xs text-slate-400 font-mono">
                  {filteredStocks.length} available {selectedSector !== 'ALL' ? `• ${selectedSector}` : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 hidden sm:inline">Sort by:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="DEFAULT">Market Cap / Relevance</option>
                  <option value="A-Z">Symbol (A - Z)</option>
                  <option value="CHANGE_DESC">Highest Gainers (%)</option>
                  <option value="PRICE_DESC">Highest Price</option>
                </select>
              </div>
            </div>

            {loadingStocks ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-xs">Loading complete stock universe (130+ equities)...</p>
              </div>
            ) : filteredStocks.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <p className="text-sm font-semibold">No stocks found matching "{searchQuery}"</p>
                <p className="text-xs text-slate-500">
                  Try adjusting your search query, market, or sector filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[560px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                {filteredStocks.map((stock) => {
                  const isSelected = selectedSymbols.has(stock.symbol);
                  const { initials, style } = getStockAvatarDetails(stock.symbol, stock.sector);
                  const isPositive = stock.changePercent >= 0;

                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => toggleStock(stock.symbol)}
                      className={`p-3 sm:p-3.5 rounded-xl border cursor-pointer transition-all duration-150 flex items-center justify-between gap-3 select-none group ${
                        isSelected
                          ? 'bg-indigo-600/15 border-indigo-500 ring-1 ring-indigo-500/30 text-white shadow-md shadow-indigo-950/40'
                          : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold font-mono text-xs border shrink-0 shadow-sm ${style.bg} ${style.text} ${style.border}`}
                        >
                          {initials}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm tracking-wide text-white font-mono">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono border border-slate-700/50">
                              {stock.exchange}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate max-w-[125px] sm:max-w-[145px] lg:max-w-[160px]">
                            {stock.companyName}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="text-xs font-semibold text-slate-200 font-mono">
                              {stock.currency}
                              {stock.currentPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                            <span
                              className={`text-[11px] font-semibold flex items-center font-mono ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? (
                                <TrendingUp className="w-3 h-3 mr-0.5" />
                              ) : (
                                <TrendingDown className="w-3 h-3 mr-0.5" />
                              )}
                              {isPositive ? '+' : ''}
                              {stock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm'
                            : 'border-slate-700 bg-slate-900/80 text-transparent group-hover:border-slate-600'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/90 py-3 px-4 sm:px-6 lg:px-8 shadow-2xl">
        <div className="max-w-[1560px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full md:w-auto overflow-hidden">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400">Selected:</span>
              <span
                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${counterStyle.badge}`}
              >
                {selectedSymbols.size} / 50
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-md lg:max-w-lg">
              {Array.from(selectedSymbols).map((sym) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-medium shrink-0 group hover:border-indigo-400 transition-colors"
                >
                  <span>{sym}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStock(sym);
                    }}
                    className="hover:text-white transition-colors"
                    title={`Remove ${sym}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Watchlist:</span>
              <span className="font-semibold text-slate-200">
                {watchlistName.trim() || 'Primary Watchlist'}
              </span>
            </div>
            <span className="text-slate-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Estimated Coverage:</span>
              <span className="text-slate-300 font-medium font-mono">
                {coveredSectorsCount} {coveredSectorsCount === 1 ? 'Sector' : 'Sectors'} ({coveragePercent}% catalog)
              </span>
            </div>
            <span className="text-slate-700">•</span>
            <span className="text-[11px] text-slate-500">Edit anytime in dashboard</span>
          </div>

          <div className="w-full md:w-auto flex items-center justify-end shrink-0">
            <button
              onClick={handleCompleteSetup}
              disabled={isSubmitting || !isSelectionValid}
              className={`w-full md:w-auto px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 ${
                !isSelectionValid || isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/80'
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Configuring Intelligence Pipeline...</span>
                </>
              ) : selectedSymbols.size === 0 ? (
                <span>Select At Least 1 Stock</span>
              ) : (
                <>
                  <span>Launch Dashboard ({selectedSymbols.size} Stocks Selected)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
