import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Drawer, ConfidenceBadge, EventTypeBadge, DeltaBadge } from '../common';
import { useMarketStore } from '../../store/useMarketStore';
import { ExternalLink, CheckCircle2, Sparkles } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const {
    isDigestDrawerOpen,
    closeDigestDrawer,
    selectedDigestId,
    digests,
    acknowledgeDigest,
    getDigestEvents,
    getInsightsByEvent,
    fetchMarketData,
  } = useMarketStore();

  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  const activeDigest = digests.find((d) => d.id === selectedDigestId);
  const digestEvents = activeDigest ? getDigestEvents(activeDigest.id) : [];

  return (
    <div className="min-h-screen bg-background text-slate-100 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <Sidebar
            className="relative z-50 animate-slide-in-right"
            onItemClick={() => setIsMobileSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <Outlet />
        </main>
      </div>

      {/* Global Slide-Over Drawer for Market Memory Historical Dossiers */}
      {activeDigest && (
        <Drawer
          isOpen={isDigestDrawerOpen}
          onClose={closeDigestDrawer}
          title={activeDigest.title}
          subtitle={`Market Memory Dossier • ${activeDigest.displayDate}`}
          width="xl"
          footer={
            <div className="w-full flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {digestEvents.length} verified historical events preserved
              </span>
              <button
                onClick={() => {
                  acknowledgeDigest(activeDigest.id);
                  closeDigestDrawer();
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Dossier Reviewed</span>
              </button>
            </div>
          }
        >
          {/* Executive Summary & Macro Mood Banner */}
          <div className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Executive Retrospective
              </span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Mood: {activeDigest.marketMood}
              </span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activeDigest.executiveSummary}
            </p>

            {/* Benchmark Indices Snapshot */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
              <div className="p-2.5 rounded-lg bg-surface border border-border/60">
                <div className="text-[11px] text-slate-400">NIFTY 50 Close</div>
                {activeDigest.benchmarkIndices.nifty ? (
                  <div className="text-base font-bold font-mono text-slate-100 flex items-baseline justify-between">
                    <span>{activeDigest.benchmarkIndices.nifty.close.toLocaleString()}</span>
                    <span className={`text-xs ${activeDigest.benchmarkIndices.nifty.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeDigest.benchmarkIndices.nifty.changePercent >= 0 ? '+' : ''}
                      {activeDigest.benchmarkIndices.nifty.changePercent}%
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic mt-1">Unavailable</div>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-surface border border-border/60">
                <div className="text-[11px] text-slate-400">SENSEX Close</div>
                {activeDigest.benchmarkIndices.sensex ? (
                  <div className="text-base font-bold font-mono text-slate-100 flex items-baseline justify-between">
                    <span>{activeDigest.benchmarkIndices.sensex.close.toLocaleString()}</span>
                    <span className={`text-xs ${activeDigest.benchmarkIndices.sensex.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeDigest.benchmarkIndices.sensex.changePercent >= 0 ? '+' : ''}
                      {activeDigest.benchmarkIndices.sensex.changePercent}%
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic mt-1">Unavailable</div>
                )}
              </div>
            </div>
          </div>

          {/* Triad Items List */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Enriched Events & Attributions ({digestEvents.length})
            </h4>

            {digestEvents.map((event) => {
              const eventInsights = getInsightsByEvent(event.id);
              const primaryInsight = eventInsights[0];
              const forwardPerformance =
                activeDigest.forwardPerformanceMap?.[event.stockSymbol];

              return (
                <div
                  key={event.id}
                  className="p-4 rounded-xl bg-surface-subtle border border-border space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">
                          {event.companyName}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          ({event.stockSymbol})
                        </span>
                        <EventTypeBadge eventType={event.eventType} />
                      </div>
                    </div>
                    <DeltaBadge value={event.changePercent} />
                  </div>

                  {/* What Happened */}
                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-slate-400 mr-1.5 uppercase text-[10px] tracking-wider">
                      What Happened:
                    </span>
                    {event.whatHappened}
                  </div>

                  {/* Why It Happened (Enriched Insight) */}
                  {primaryInsight && (
                    <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-500/25 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-indigo-300 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3 text-indigo-400" />
                          Why It Changed (Source: {primaryInsight.sourceName})
                        </span>
                        <ConfidenceBadge
                          level={primaryInsight.confidenceLevel}
                          score={primaryInsight.confidenceScore}
                        />
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {primaryInsight.explanation}
                      </p>
                    </div>
                  )}

                  {/* Why It Matters */}
                  {primaryInsight && (
                    <div className="text-xs text-slate-400">
                      <span className="font-semibold text-slate-400 mr-1.5 uppercase text-[10px] tracking-wider">
                        Why It Matters:
                      </span>
                      {primaryInsight.whyItMatters}
                    </div>
                  )}

                  {/* Subsequent Forward Performance */}
                  {forwardPerformance && (forwardPerformance.day1 || forwardPerformance.day5 || forwardPerformance.day30) ? (
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-400">Forward Realized Returns:</span>
                      <div className="flex items-center gap-3">
                        {forwardPerformance.day1 ? (
                          <span>
                            1D: <span className={forwardPerformance.day1.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{forwardPerformance.day1}</span>
                          </span>
                        ) : null}
                        {forwardPerformance.day5 ? (
                          <span>
                            5D: <span className={forwardPerformance.day5.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{forwardPerformance.day5}</span>
                          </span>
                        ) : null}
                        {forwardPerformance.day30 ? (
                          <span>
                            30D: <span className={forwardPerformance.day30.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}>{forwardPerformance.day30}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Drawer>
      )}
    </div>
  );
};
