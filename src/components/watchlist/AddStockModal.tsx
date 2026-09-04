import React, { useState } from 'react';
import { Search, Plus, Check, CheckCircle2 } from 'lucide-react';
import { Modal, DeltaBadge } from '../common';
import { stockCatalog } from '../../data/mockStocks';
import { StockQuote, StockSector } from '../../types/stock';
import { formatPrice } from '../../lib/utils';
import { useMarketStore } from '../../store/useMarketStore';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { watchlist, addStock } = useMarketStore();
  const [catalogSearch, setCatalogSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'custom'>('catalog');
  const [addedFeedback, setAddedFeedback] = useState<string | null>(null);

  // Custom stock form states
  const [customSymbol, setCustomSymbol] = useState('');
  const [customName, setCustomName] = useState('');
  const [customSector, setCustomSector] = useState<StockSector>('Information Technology');
  const [customPrice, setCustomPrice] = useState('1500.00');

  const filteredCatalog = stockCatalog.filter((item) => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      item.symbol.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.sector.toLowerCase().includes(q)
    );
  });

  const handleAddStock = (stock: StockQuote) => {
    addStock(stock);
    setAddedFeedback(stock.symbol);
    setTimeout(() => {
      setAddedFeedback(null);
    }, 2000);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSymbol.trim() || !customName.trim()) return;

    const parsedPrice = parseFloat(customPrice) || 1000;
    const newStock: StockQuote = {
      symbol: customSymbol.toUpperCase().trim(),
      name: customName.trim(),
      currency: '₹',
      currentPrice: parsedPrice,
      changeAmount: 0,
      changePercent: 0,
      lastUpdated: 'Just added',
      sector: customSector,
      volume: 1000000,
      avgVolume20D: 1000000,
      marketCap: '₹1.0 Lakh Cr',
      peRatio: 25.0,
      high52w: parsedPrice * 1.15,
      low52w: parsedPrice * 0.85,
      tags: ['Custom', customSector],
      sparkline: [
        { date: 'Day -3', price: parsedPrice * 0.98 },
        { date: 'Day -2', price: parsedPrice * 0.99 },
        { date: 'Yesterday', price: parsedPrice },
        { date: 'Today', price: parsedPrice },
      ],
    };

    handleAddStock(newStock);
    setCustomSymbol('');
    setCustomName('');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Equities to Watchlist"
      subtitle="Select trending equities from catalog or register a custom instrument"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Tab switcher: Catalog vs Custom */}
        <div className="flex items-center p-1 rounded-xl bg-surface-subtle border border-border">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'catalog'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Catalog Discovery
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'custom'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Custom Symbol Entry
          </button>
        </div>

        {/* Success Toast Banner */}
        {addedFeedback && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-300 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Successfully added {addedFeedback} to your active watchlist!</span>
          </div>
        )}

        {/* TAB 1: CATALOG DISCOVERY */}
        {activeTab === 'catalog' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Filter catalog by ticker (e.g. AAPL, LT) or sector..."
                className="w-full pl-9 pr-4 py-2 bg-surface-subtle rounded-lg border border-border text-xs sm:text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredCatalog.map((item) => {
                const isAlreadyInWatchlist = watchlist.some(
                  (s) => s.symbol === item.symbol
                );

                return (
                  <div
                    key={item.symbol}
                    className="p-3 rounded-xl bg-surface-subtle border border-border flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {item.name}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          {item.symbol}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {item.sector}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-slate-100">
                          {formatPrice(item.currentPrice, item.currency)}
                        </div>
                        <DeltaBadge value={item.changePercent} size="sm" />
                      </div>

                      {isAlreadyInWatchlist ? (
                        <span className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[11px] font-mono text-slate-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Added</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddStock(item)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM SYMBOL ENTRY */}
        {activeTab === 'custom' && (
          <form onSubmit={handleAddCustom} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Ticker Symbol
                </label>
                <input
                  type="text"
                  required
                  value={customSymbol}
                  onChange={(e) => setCustomSymbol(e.target.value)}
                  placeholder="e.g. SBIN"
                  className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs sm:text-sm text-slate-100 uppercase focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-400 uppercase">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  step="0.05"
                  required
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  placeholder="850.00"
                  className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                Company Full Name
              </label>
              <input
                type="text"
                required
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-400 uppercase">
                Sector
              </label>
              <select
                value={customSector}
                onChange={(e) => setCustomSector(e.target.value as StockSector)}
                className="w-full px-3 py-2 rounded-lg bg-surface-subtle border border-border text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
              >
                <option value="Banking & Financial Services">Banking & Financial Services</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Automobile">Automobile</option>
                <option value="Energy & Petrochemicals">Energy & Petrochemicals</option>
                <option value="Consumer Goods">Consumer Goods</option>
                <option value="Conglomerate">Conglomerate</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register & Add Stock to Watchlist</span>
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};
