"use client";

import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCopilot } from "@/components/dashboard/MetricCopilot";
import { PrometheusScore } from "@/components/dashboard/PrometheusScore";
import { supabase } from "@/lib/supabase";
import {
  Plus,
  Zap,
  ShieldAlert,
  BarChart3,
  Loader2,
  RotateCcw,
  MessageSquare,
  Info,
  Search,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { createPortal } from "react-dom";

import {
  AreaChart,
  Area,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

export default function Home() {
  const [tickers, setTickers] = useState<any[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [insight, setInsight] = useState<any>(null);
  const [tickerData, setTickerData] = useState<any>(null);
  const [prices, setPrices] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any[]>([]);
  const [finView, setFinView] = useState<'annual' | 'quarterly'>('annual');
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [addingTicker, setAddingTicker] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTicker, setNewTicker] = useState("");
  const { toast } = useToast();

  const fetchTickers = useCallback(async () => {
    const { data } = await supabase
      .from('tickers')
      .select('*')
      .order('symbol', { ascending: true });

    if (data && data.length > 0) {
      setTickers(data);
      if (!selectedSymbol) setSelectedSymbol(data[0].symbol);
    }
    setLoading(false);
  }, [selectedSymbol]);

  const fetchTickerDetails = useCallback(async (symbol: string) => {
    const { data: insights } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('symbol', symbol)
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: profile } = await supabase
      .from('tickers')
      .select('*')
      .eq('symbol', symbol)
      .single();

    // Fetch deep financials
    const { data: finData } = await supabase
      .from('financials')
      .select('*')
      .eq('symbol', symbol)
      .order('period', { ascending: false })
      .limit(20);

    if (insights && insights.length > 0) setInsight(insights[0]);
    else setInsight(null);

    if (profile) setTickerData(profile);
    if (finData) setFinancials(finData);
  }, []);

  const fetchPrices = useCallback(async (symbol: string) => {
    setLoadingPrices(true);
    try {
      // 1. Try fetching from Supabase first (Task 6)
      const { data: dbPrices } = await supabase
        .from('market_data')
        .select('*')
        .eq('symbol', symbol)
        .order('timestamp', { ascending: true });

      if (dbPrices && dbPrices.length > 0) {
        setPrices(dbPrices.map(p => ({
          date: p.timestamp,
          close: p.close
        })));
        setLoadingPrices(false);
        return;
      }

      // 2. Fallback to API if not in DB yet (e.g. initial scan)
      const res = await fetch(`/api/prices/${symbol}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setPrices(data.reverse());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPrices(false);
    }
  }, []);

  useEffect(() => {
    fetchTickers();
    const channel = supabase
      .channel('global-tickers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickers' }, () => {
        fetchTickers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTickers]);

  useEffect(() => {
    if (!selectedSymbol) return;
    fetchTickerDetails(selectedSymbol);
    fetchPrices(selectedSymbol);

    const channel = supabase
      .channel(`ticker-specific-${selectedSymbol}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'ai_insights',
        filter: `symbol=eq.${selectedSymbol}`
      }, (payload) => {
        fetchTickerDetails(selectedSymbol);
        if (payload.eventType === 'INSERT') {
          toast({
            title: "Intelligence Ready",
            description: `Synthesis complete for ${selectedSymbol}.`,
          });
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickers',
        filter: `symbol=eq.${selectedSymbol}`
      }, () => {
        fetchTickerDetails(selectedSymbol);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSymbol, fetchTickerDetails, fetchPrices, toast]);

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker) return;

    setAddingTicker(true);
    const upperTicker = newTicker.toUpperCase();

    // Optimistic UI Update: Show the ticker immediately
    setTickers(prev => {
      if (prev.find(t => t.symbol === upperTicker)) return prev;
      return [...prev, { symbol: upperTicker, company_name: "Scanning..." }].sort((a, b) => a.symbol.localeCompare(b.symbol));
    });
    setSelectedSymbol(upperTicker);
    setInsight(null);
    setPrices([]);
    setIsDialogOpen(false);
    setNewTicker("");

    toast({
      title: "Analysis Started",
      description: `Engines ignited for ${upperTicker}. Waiting for data...`,
    });

    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: upperTicker })
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Analysis Failed",
        description: "Could not start analysis for " + upperTicker,
        variant: "destructive"
      });
      // Optional: Revert optimistic update here if critical
    } finally {
      setAddingTicker(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedSymbol) return;
    setInsight(null);
    try {
      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: selectedSymbol })
      });
      fetchPrices(selectedSymbol);
      toast({
        title: "Regeneration Started",
        description: `Re-synthesizing for ${selectedSymbol}...`,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && tickers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-slate-500 animate-spin" />
        <p className="text-slate-500 font-medium">Igniting engines...</p>
      </div>
    );
  }

  const chartColor = (insight?.metadata?.changesPercentage || 0) >= 0 ? '#10b981' : '#ef4444';

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-white/5">
        {tickers.map((t) => (
          <button
            key={t.symbol}
            onClick={() => setSelectedSymbol(t.symbol)}
            className={cn(
              "px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap border",
              selectedSymbol === t.symbol
                ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                : "bg-white/5 text-slate-500 border-white/5 hover:bg-white/10 hover:text-slate-300"
            )}
          >
            {t.symbol}
          </button>
        ))}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="p-2 rounded-xl bg-white/5 border border-dashed border-white/20 text-slate-500 hover:text-white hover:border-white/40 transition-all flex items-center justify-center min-w-[40px]">
              <Plus className="w-5 h-5" />
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-slate-950 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white">Add Ticker</DialogTitle>
              <DialogDescription className="text-slate-400">Initialize a deep synthesis for any stock or commodity.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddTicker} className="flex items-center space-x-2 py-4">
              <input
                placeholder="e.g. BTC, NVDA"
                className="h-12 flex-1 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:ring-1 focus:ring-white/50 uppercase"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                disabled={addingTicker || !newTicker}
                className="h-12 px-6 rounded-xl bg-white text-black font-bold transition-all disabled:opacity-50"
              >
                {addingTicker ? <Loader2 className="w-4 h-4 animate-spin" /> : "Analyze"}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedSymbol ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 items-start">

            {/* LEFT COLUMN: PROMETHEUS INTELLIGENCE */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-silver">Intelligence</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Regenerate</span>
                    </button>
                    {insight?.created_at && (
                      <span className="text-[9px] text-slate-600 font-mono mt-1 pr-1">
                        {new Date(insight.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                {insight ? (
                  <div className="space-y-6">
                    {/* Prometheus Score Section */}
                    <PrometheusScore metadata={insight.metadata} />

                    <div>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Synthesis Summary</h4>
                      <p className="text-sm leading-relaxed text-slate-300">{insight.summary_text}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                        <h4 className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Bull Case</h4>
                        <ul className="text-[11px] space-y-2 text-slate-400">
                          {insight.bull_case?.map((c: string, i: number) => <li key={i} className="flex gap-2"><span>•</span> {c}</li>)}
                        </ul>
                      </div>
                      <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                        <h4 className="text-[10px] font-bold text-red-400 uppercase mb-2">Bear Case</h4>
                        <ul className="text-[11px] space-y-2 text-slate-400">
                          {insight.bear_case?.map((c: string, i: number) => <li key={i} className="flex gap-2"><span>•</span> {c}</li>)}
                        </ul>
                      </div>
                    </div>

                    {insight.metadata?.analogy && (
                      <div className="pt-4 border-t border-white/5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Analogy Model</h4>
                        <p className="text-[11px] italic text-slate-500 leading-relaxed">"{insight.metadata.analogy}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Synthesizing Alpha...</p>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* CENTER COLUMN: LIVE DATA & METRICS */}
            <div className="flex flex-col gap-6">
              <GlassCard className="p-0 flex flex-col border-white/5 overflow-visible z-20">
                <div className="p-6 pb-2 flex items-center justify-between">
                  <div className="flex items-center gap-4">

                    <div>
                      <h3 className="font-bold text-lg">
                        {tickerData?.company_name || selectedSymbol}
                      </h3>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{tickerData?.exchange || 'MARKET'}</p>
                        {insight?.created_at && (
                          <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                            <span className="text-[9px] text-slate-400 font-mono uppercase">DATA AS OF {new Date(insight.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-white">${insight?.metadata?.price || '---'}</div>
                    {insight?.metadata?.changesPercentage !== undefined && (
                      <div className={cn("text-xs font-bold", insight.metadata.changesPercentage >= 0 ? "text-emerald-500" : "text-red-500")}>
                        {insight.metadata.changesPercentage >= 0 ? '+' : ''}{insight.metadata.changesPercentage}%
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-[50px] w-full mt-4 relative px-2">
                  {loadingPrices && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] z-10">
                      <Loader2 className="w-6 h-6 animate-spin text-white/20" />
                    </div>
                  )}
                  {prices.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={prices} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <RechartsTooltip
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                          content={({ active, payload }) => {
                            if (!active || !payload || !payload.length || typeof document === 'undefined') return null;

                            const dateStr = new Date(payload[0].payload.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                            const priceStr = payload[0].value;

                            return createPortal(
                              <div
                                className="pointer-events-none fixed z-[9999] top-24 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-6 py-2 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
                              >
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">{dateStr}</span>
                                <div className="h-3 w-px bg-white/10" />
                                <span className="text-sm font-bold text-white font-mono tracking-tight">${priceStr}</span>
                              </div>,
                              document.body
                            );
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="close"
                          stroke={chartColor}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorPrice)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full w-full flex items-center justify-center border-t border-white/5">
                      <p className="text-[10px] text-slate-600 font-mono italic">
                        {loadingPrices ? "Initializing Charting Engine..." : "Historical Charting Unavailable"}
                      </p>
                    </div>
                  )}
                </div>
              </GlassCard>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {insight?.metrics ? (
                  insight.metrics.map((m: any, i: number) => (
                    <MetricCopilot
                      key={i}
                      label={m.label}
                      value={m.value}
                      status={m.status}
                      shortExplanation={m.shortExplanation}
                      technicalDefinition={m.technicalDefinition}
                    />
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-28 glass-morphism rounded-3xl animate-pulse bg-white/5" />
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: SEC & SENTIMENT */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-amber">SEC Regulatory Truth</h2>
              </div>

              <GlassCard className="p-6 border-amber-500/10 bg-amber-500/[0.02]">
                {insight?.metadata?.sec_analysis ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-500/80 uppercase mb-2 tracking-wider">SEC Synthesis</h4>
                      <p className="text-sm leading-relaxed text-slate-300">{insight.metadata.sec_analysis}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Last Filing</span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded font-bold">{insight.metadata.last_sec_filing}</span>
                      </div>
                    </div>

                    <a
                      href={`https://www.sec.gov/cgi-bin/browse-edgar?CIK=${insight.metadata?.cik || selectedSymbol}&action=getcompany`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full text-center py-2.5 rounded-xl bg-amber-500/10 hover:bg-white/10 text-amber-400 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                      View SEC History
                    </a>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500/30" />
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest text-glow-amber">Parsing EDGAR...</p>
                  </div>
                )}
              </GlassCard>

              <div className="flex items-center gap-2 mb-2 mt-4">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-blue">Market Pulse</h2>
              </div>

              <GlassCard className="p-6 border-sky-500/10 bg-sky-500/[0.02] flex flex-col gap-6">
                {insight?.metadata?.sentiment_summary ? (
                  <>
                    <div className="space-y-4">
                      <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-sky-500/30 pl-4">
                        "{insight.metadata.sentiment_summary}"
                      </p>
                      <div className="flex items-center gap-4 pt-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-sky-500/40 transition-all duration-1000 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
                            style={{ width: `${insight.metadata.sentiment_score || 50}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-sky-500 uppercase">
                          {insight.metadata.sentiment_score > 70 ? 'Extreme Bullish' :
                            insight.metadata.sentiment_score > 55 ? 'Bullish Lean' :
                              insight.metadata.sentiment_score < 30 ? 'Extreme Bearish' :
                                insight.metadata.sentiment_score < 45 ? 'Bearish Lean' : 'Neutral Pulse'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">News Headlines</h4>
                      {insight.metadata.top_headlines?.map((news: any, i: number) => (
                        <a
                          key={i}
                          href={news.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-sky-500/20 transition-all group/news"
                        >
                          <p className="text-[11px] font-medium text-slate-400 group-hover/news:text-slate-200 line-clamp-2 leading-snug mb-1">
                            {news.headline}
                          </p>
                          <div className="flex items-center justify-between text-[8px] uppercase font-bold text-slate-600">
                            <span>{news.source}</span>
                            <span>{new Date(news.datetime * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </a>
                      ))}
                      {!insight.metadata.top_headlines && (
                        <p className="text-[10px] text-slate-600 italic">No recent headlines analyzed.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
                    <Loader2 className="w-8 h-8 animate-spin text-sky-500/30" />
                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest text-glow-blue">Aggregating Pulse...</p>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>

          {/* NEW BOTTOM SECTION: DEEP ANALYSIS & HISTORICALS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-emerald">Deep Fundamental Analysis</h2>
              </div>

              <GlassCard className="p-6 border-emerald-500/10 bg-emerald-500/[0.01] space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-wider">Quarterly Results Review</h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {insight?.metadata?.quarterly_analysis || "Quarterly analysis pending deep scan..."}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-wider">5-Year Strategy Trajectory</h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {insight?.metadata?.annual_trends || "Annual trend synthesis pending..."}
                  </p>
                </div>
              </GlassCard>

              <div className="flex items-center gap-2 mb-2 mt-4">
                <Plus className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Investor Intelligence</h2>
              </div>
              <GlassCard className="p-6 border-white/5 bg-white/[0.01]">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider">Search for Presentations & Guidance</h4>
                <div className="grid grid-cols-2 gap-4">
                  <a
                    href={`https://www.google.com/search?q=${selectedSymbol}+investor+presentation+filetype:pdf+OR+guidance+deck`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-sky-500/30 transition-all group shadow-xl"
                  >
                    <Search className="w-6 h-6 text-slate-500 group-hover:text-sky-400 mb-3 transition-all duration-300" />
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-white uppercase tracking-widest transition-colors">Google</span>
                  </a>

                  <a
                    href={`https://www.perplexity.ai/search?q=Find+the+latest+investor+presentation+and+investor+day+deck+for+${selectedSymbol}.+Summarize+the+full-year+guidance+and+key+strategic+pillars.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-indigo-500/[0.03] border border-indigo-500/10 hover:bg-indigo-500/[0.08] hover:border-indigo-500/40 transition-all group shadow-xl"
                  >
                    <Sparkles className="w-6 h-6 text-indigo-500/60 group-hover:text-indigo-400 mb-3 animate-pulse" />
                    <span className="text-[10px] font-bold text-indigo-400/80 group-hover:text-white uppercase tracking-widest transition-colors">Perplexity AI</span>
                  </a>
                </div>
              </GlassCard>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-400" />
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Historical Financials (P&L / Balance Sheet)</h2>
                </div>
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                  <button
                    onClick={() => setFinView('annual')}
                    className={cn(
                      "px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all",
                      finView === 'annual' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Annual
                  </button>
                  <button
                    onClick={() => setFinView('quarterly')}
                    className={cn(
                      "px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all",
                      finView === 'quarterly' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                    )}
                  >
                    Quarterly
                  </button>
                </div>
              </div>
              <GlassCard className="p-0 border-white/5 bg-white/[0.01] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.02]">
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Fiscal Period</th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Revenue</th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Net Income</th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Total Assets</th>
                        <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Total Liab.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {financials.length > 0 ? (
                        financials.filter(f => f.report_type === (finView === 'annual' ? '10-K' : '10-Q')).slice(0, 5).map((f: any, i: number) => (
                          <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-4 text-[11px] font-mono text-slate-400">{f.period}</td>
                            <td className="p-4 text-[11px] font-mono text-emerald-400">
                              ${((f.income_statement?.revenue || 0) / 1e9).toFixed(2)}B
                            </td>
                            <td className="p-4 text-[11px] font-mono text-sky-400">
                              ${((f.income_statement?.netIncome || 0) / 1e9).toFixed(2)}B
                            </td>
                            <td className="p-4 text-[11px] font-mono text-slate-300">
                              ${((f.balance_sheet?.totalAssets || 0) / 1e9).toFixed(2)}B
                            </td>
                            <td className="p-4 text-[11px] font-mono text-slate-300">
                              ${((f.balance_sheet?.totalTotalLiabilities || 0) / 1e9).toFixed(2)}B
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-600 italic text-xs">
                            Deep financial history scan in progress...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-dashed border-white/5 rounded-3xl">
          <BarChart3 className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 font-medium">No active analysis.</p>
        </div>
      )
      }
    </div >
  );
}
