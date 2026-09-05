import React from 'react';
import { BrainCircuit, Compass, ArrowUpRight } from 'lucide-react';

export const MarketLearningLayer: React.FC = () => {
  const learningObservations = [
    {
      id: 'breakout',
      category: 'PRICE BREAKOUT',
      title: '52W Breakouts + High Conf.',
      stat: '68.3% Positive @ 30D',
      trend: 'BULLISH CONTINUATION',
      trendColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description:
        'Institutional accumulation above key multi-month resistance historically sustained momentum into the monthly close across liquid large-cap equities.',
      sampleSymbols: ['RELIANCE', 'TCS', 'BHARTIARTL'],
    },
    {
      id: 'earnings',
      category: 'EARNINGS REACTION',
      title: 'Earnings Beat > 5% (IT)',
      stat: '74.1% Forward Drift',
      trend: 'POST-EARNINGS DRIFT',
      trendColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      description:
        'Revenue beat coupled with positive guidance revisions in tech bluechips (Infosys, TCS, HCL Tech) demonstrated consistent continuation over 3-week windows.',
      sampleSymbols: ['INFY', 'TCS', 'HCLTECH'],
    },
    {
      id: 'liquidity',
      category: 'MONETARY POLICY',
      title: 'RBI Liquidity Pauses',
      stat: '+3.4% Bank Nifty 7D',
      trend: 'SECTOR ROTATION',
      trendColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
      description:
        'Absence of CRR tightening relaxed net cost-of-funds for private lenders (HDFC Bank, ICICI Bank) within 5 sessions of MPC announcement.',
      sampleSymbols: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    },
    {
      id: 'fed-pivot',
      category: 'MACRO TAILWIND',
      title: 'Fed Yield Compression',
      stat: '+4.2% IT Exporters 14D',
      trend: 'VALUATION RE-RATING',
      trendColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      description:
        'US 10-year Treasury yield pullbacks under 4.10% historically trigger FII allocation inflows into Indian Tier-1 IT services equities.',
      sampleSymbols: ['WIPRO', 'LTIM', 'TECHM'],
    },
  ];

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-surface to-surface border border-indigo-500/30 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold font-mono uppercase tracking-wider text-slate-100">
              Market Learning Layer: What Usually Happens Next?
            </h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Empirical Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
            By analyzing historical causal events and realized subsequent returns, the Autonomous Intelligence Engine surfaces empirical tendencies across market regimes.
          </p>
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-slate-300">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pattern Confidence:</span>
          <span className="text-emerald-400 font-bold">High (p &lt; 0.05)</span>
        </div>
      </div>

      {/* Observation Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {learningObservations.map((obs) => (
          <div
            key={obs.id}
            className="p-4 rounded-xl bg-surface border border-border hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3 group shadow-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  {obs.category}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${obs.trendColor}`}>
                  {obs.trend}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors">
                {obs.title}
              </h3>

              <div className="flex items-baseline gap-2 pt-0.5">
                <div className="text-lg font-mono font-bold text-emerald-400">
                  {obs.stat}
                </div>
                <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {obs.description}
              </p>
            </div>

            <div className="pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>Historical Beneficiaries:</span>
              <span className="text-slate-200 font-semibold">{obs.sampleSymbols.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
