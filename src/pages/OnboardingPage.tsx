import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { stockService } from '../services/stockService';
import { watchlistService } from '../services/watchlistService';
import { useAuthStore } from '../store/useAuthStore';
import { useMarketStore } from '../store/useMarketStore';
import { STARTER_TEMPLATES, StarterWatchlistTemplate } from '../data/starterTemplates';
import { formatPrice } from '../lib/utils';
import { SearchInput } from '../components/common/SearchInput';
import {
  Check,
  X,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface CatalogStock {
  symbol: string;
  companyName: string;
  sector: string;
  currency: string;
  currentPrice: number;
  changePercent: number;
}

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { setOnboarded, logout } = useAuthStore();
  const { fetchMarketData } = useMarketStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [stocks, setStocks] = useState<CatalogStock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [watchlistName, setWatchlistName] = useState('Primary Watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
              currency: s.currency || (s.exchange === 'NASDAQ' || s.exchange === 'NYSE' ? '$' : '₹'),
              currentPrice: Number(s.currentPrice) || 0,
              changePercent: Number(s.dailyChangePercent ?? s.changePercent) || 0,
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

  // Filter catalog stocks
  const filteredStocks = useMemo(() => {
    if (!searchQuery.trim()) return stocks.slice(0, 24);
    const q = searchQuery.toLowerCase().trim();
    return stocks.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.companyName.toLowerCase().includes(q) ||
        s.sector.toLowerCase().includes(q)
    );
  }, [stocks, searchQuery]);

  // Toggle template
  const handleToggleTemplate = (template: StarterWatchlistTemplate) => {
    const templateHasAll = template.symbols.every((sym) => selectedSymbols.has(sym));
    const next = new Set(selectedSymbols);

    if (templateHasAll) {
      template.symbols.forEach((sym) => next.delete(sym));
    } else {
      template.symbols.forEach((sym) => {
        if (next.size < 50) next.add(sym);
      });
    }

    setSelectedSymbols(next);
    setErrorMessage(null);
  };

  const handleToggleStock = (symbol: string) => {
    const next = new Set(selectedSymbols);
    if (next.has(symbol)) {
      next.delete(symbol);
    } else {
      if (next.size >= 50) {
        setErrorMessage('You can track up to 50 stocks.');
        return;
      }
      next.add(symbol);
    }
    setSelectedSymbols(next);
    setErrorMessage(null);
  };

  const handleCompleteSetup = async () => {
    if (selectedSymbols.size < 1) {
      setErrorMessage('Please select at least 1 stock to track.');
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
        throw new Error('Failed to save watchlist');
      }

      setOnboarded(true);
      await fetchMarketData();
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving your watchlist.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-border/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
            Welcome to SignalLens
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Set up your monitored stocks in two quick steps.
          </p>
        </div>

        <button
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-slate-400 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Progress Indicator */}
      <div className="py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {step > 1 ? <Check className="w-3.5 h-3.5" /> : '1'}
            </span>
            <span
              className={`text-xs sm:text-sm font-medium ${
                step === 1 ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              Select Stocks
            </span>
          </div>

          <div className="flex-1 h-0.5 bg-border rounded-full" />

          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-surface-subtle text-slate-500 border border-border'
              }`}
            >
              2
            </span>
            <span
              className={`text-xs sm:text-sm font-medium ${
                step === 2 ? 'text-slate-100' : 'text-slate-400'
              }`}
            >
              Name & Confirm
            </span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs sm:text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* STEP 1: SELECT STOCKS */}
      {step === 1 && (
        <div className="space-y-6 flex-1">
          {/* Starter Packs */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Quick Starter Packs</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {STARTER_TEMPLATES.map((tmpl) => {
                const isSelected = tmpl.symbols.every((sym) => selectedSymbols.has(sym));
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleToggleTemplate(tmpl)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-slate-100 shadow-sm'
                        : 'bg-surface border-border hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-xs sm:text-sm">{tmpl.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {tmpl.symbols.length} stocks
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search & Stock Catalog */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Browse Stock Catalog
              </h3>
              <span className="text-xs font-mono text-slate-400">
                {selectedSymbols.size} of 50 selected
              </span>
            </div>

            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search stocks by name or ticker (e.g. TCS, RELIANCE, INFY)..."
              mobilePlaceholder="Search stocks…"
              ariaLabel="Search stock catalog"
            />

            {loadingStocks ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                Loading stocks...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
                {filteredStocks.map((stock) => {
                  const isChecked = selectedSymbols.has(stock.symbol);
                  return (
                    <div
                      key={stock.symbol}
                      onClick={() => handleToggleStock(stock.symbol)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                        isChecked
                          ? 'bg-indigo-600/10 border-indigo-500/50 text-slate-100'
                          : 'bg-surface border-border hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-xs truncate">{stock.symbol}</div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {stock.companyName}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-medium text-slate-200">
                          {formatPrice(stock.currentPrice, stock.currency)}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-500 text-white'
                              : 'bg-surface-subtle border-border text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: NAME & CONFIRM */}
      {step === 2 && (
        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Watchlist Name
            </label>
            <input
              type="text"
              value={watchlistName}
              onChange={(e) => setWatchlistName(e.target.value)}
              placeholder="e.g. Primary Watchlist"
              className="w-full max-w-md px-3.5 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Selected Stocks ({selectedSymbols.size})
              </span>
              <button
                onClick={() => setStep(1)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Add or remove stocks
              </button>
            </div>

            <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-surface border border-border max-h-60 overflow-y-auto">
              {Array.from(selectedSymbols).map((sym) => (
                <span
                  key={sym}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-subtle border border-border text-xs text-slate-200 font-mono"
                >
                  <span>{sym}</span>
                  <button
                    onClick={() => handleToggleStock(sym)}
                    className="text-slate-400 hover:text-rose-400"
                    aria-label={`Remove ${sym}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Actions */}
      <div className="pt-6 border-t border-border flex items-center justify-between gap-3 mt-6">
        {step === 2 ? (
          <button
            onClick={() => setStep(1)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-border bg-surface text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step === 1 ? (
          <button
            onClick={() => {
              if (selectedSymbols.size === 0) {
                setErrorMessage('Please select at least 1 stock to continue.');
                return;
              }
              setErrorMessage(null);
              setStep(2);
            }}
            disabled={selectedSymbols.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <span>Continue ({selectedSymbols.size} selected)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCompleteSetup}
            disabled={isSubmitting || selectedSymbols.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving watchlist...</span>
              </>
            ) : (
              <>
                <span>Complete Setup</span>
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
