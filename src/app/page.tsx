"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCopilot } from "@/components/dashboard/MetricCopilot";
import { PrometheusScore } from "@/components/dashboard/PrometheusScore";
import { InstitutionalIntelligence } from "@/components/dashboard/InstitutionalIntelligence";
import { ExecutiveBench } from "@/components/dashboard/ExecutiveBench";
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
  Sparkles,
  FileDown,
  Copy,
  Check,
  BrainCircuit,
  SendHorizontal,
  Maximize2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

import { useToast } from "@/components/ui/use-toast";
import { createPortal } from "react-dom";

import {
  AreaChart,
  Area,
  Line,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Brush,
} from "recharts";

const Candle = (props: any) => {
  const { x, y, width, height, payload } = props;

  // 1. Safety Checks
  if (x == null || y == null || width == null || height == null || !payload) return null;
  const { open, close, high, low } = payload;
  if (open == null || close == null || high == null || low == null) return null;

  // 2. Determine Direction & Color
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';

  // 3. Calculate Scale Ratio (Pixels per Dollar)
  // 'height' is the pixel height of the candle BODY.
  // 'priceBodyDelta' is the dollar height of the candle BODY.
  const priceBodyDelta = Math.abs(open - close);

  let ratio = 0;
  if (priceBodyDelta > 0 && height > 0) {
    ratio = height / priceBodyDelta;
  }

  // 4. Calculate Coordinates
  // 'y' is the top pixel of the body rect.
  const bodyTop = y;
  const bodyBottom = y + height;
  const bodyHeight = Math.max(height, 1);

  // Wicks
  let yHighWick = bodyTop;
  let yLowWick = bodyBottom;

  if (ratio > 0) {
    const highDelta = high - Math.max(open, close);
    const lowDelta = Math.min(open, close) - low;

    yHighWick = bodyTop - (highDelta * ratio);
    yLowWick = bodyBottom + (lowDelta * ratio);
  }

  // 5. Centering
  // Make the candle fatter (0.85) to clearly distinguish body from wick
  const candleWidth = Math.max(width * 0.85, 3);
  const xOffset = (width - candleWidth) / 2;
  const centerX = x + width / 2;

  return (
    <g>
      {/* Wicks */}
      <line
        x1={centerX}
        y1={yHighWick}
        x2={centerX}
        y2={yLowWick}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Body */}
      <rect
        x={x + xOffset}
        y={y}
        width={candleWidth}
        height={bodyHeight}
        fill={color}
        stroke={color}
        strokeWidth={0}
        rx={1}
      />
    </g>
  );
};

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
  const [copied, setCopied] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState('5Y');
  const [showSMA, setShowSMA] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [chartType, setChartType] = useState<'area' | 'candles'>('candles');
  const { toast } = useToast();

  const filteredPrices = useMemo(() => {
    if (!prices.length) return [];

    // Calculate SMAs and prepare Candle Data
    const dataWithIndicators = prices.map((p, idx) => {
      let sma20 = null;
      let sma50 = null;

      if (idx >= 19) {
        const slice = prices.slice(idx - 19, idx + 1);
        sma20 = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
      }

      if (idx >= 49) {
        const slice = prices.slice(idx - 49, idx + 1);
        sma50 = slice.reduce((acc, curr) => acc + curr.close, 0) / 50;
      }

      // Pre-calculate body range for Recharts Bar
      // [min(open, close), max(open, close)]
      // This allows 'y' and 'height' in custom shape to correspond to the candle body exactly.
      const bodyMin = Math.min(p.open, p.close);
      const bodyMax = Math.max(p.open, p.close);

      return { ...p, sma20, sma50, bodyRange: [bodyMin, bodyMax] };
    });

    switch (chartTimeframe) {
      case '1M': return dataWithIndicators.slice(-22);
      case '6M': return dataWithIndicators.slice(-126);
      case '1Y': return dataWithIndicators.slice(-252);
      case '5Y':
      case 'MAX':
      default: return dataWithIndicators;
    }
  }, [prices, chartTimeframe]);

  const fetchTickers = useCallback(async () => {
    const { data } = await supabase
      .from('tickers')
      .select('*')
      .order('symbol', { ascending: true });



    if (data && data.length > 0) {
      setTickers(data);
      if (!selectedSymbol) {
        const hasAAPL = data.find(t => t.symbol === "AAPL");
        setSelectedSymbol(hasAAPL ? "AAPL" : data[0].symbol);
      }
    } else {
      setTickers([]);
    }
    setLoading(false);
  }, [selectedSymbol]);


  const fetchTickerDetails = useCallback(async (symbol: string) => {
    setInsight(null);
    setTickerData(null);
    setFinancials([]);

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

    // Live news now served via cached metadata in insights
    // fetchLiveNews(symbol);
  }, []);



  const fetchPrices = useCallback(async (symbol: string) => {
    setLoadingPrices(true);
    setPrices([]); // Reset prices to prevent stale chart display
    try {
      // Normalize Indian symbol for Yahoo Historical
      const isIndianStock = symbol.endsWith('.NS') || symbol.endsWith('.BO') || tickers.find(t => t.symbol === symbol)?.market === 'INDIA';
      let effectiveSymbol = symbol;
      if (isIndianStock && !symbol.includes('.')) {
        effectiveSymbol = `${symbol}.NS`;
      }

      // Fetch live from Yahoo via our API
      const response = await fetch(`/api/stock/historical/${effectiveSymbol}`);
      if (response.ok) {
        const livePrices = await response.json();
        if (livePrices && livePrices.length > 0) {
          setPrices(livePrices.map((p: any) => ({
            date: p.date,
            open: p.open,
            high: p.high,
            low: p.low,
            close: p.close,
            volume: p.volume
          })));
        }
      }
    } catch (e) {
      console.error(e);

    } finally {
      setLoadingPrices(false);
    }
  }, [tickers]);

  const getReportMarkdown = useCallback(() => {
    if (!insight || !tickerData) return null;

    const meta = insight.metadata;
    const isIndian = insight?.metadata?.currency === 'INR' || selectedSymbol?.endsWith('.NS') || selectedSymbol?.endsWith('.BO') || tickerData?.market === 'INDIA';
    const isIndianStock = isIndian; // Alias for consistency
    const currency = isIndianStock ? "₹" : "$";
    const name = tickerData.company_name || tickerData.name || selectedSymbol;
    const date = insight.created_at ? new Date(insight.created_at).toLocaleDateString() : new Date().toLocaleDateString();

    // Helper functions
    const formatFin = (val: number) => isIndianStock ? (val / 1e7).toFixed(1) + ' Cr' : (val / 1e9).toFixed(2) + 'B';
    const formatPrice = (val: any) => typeof val === 'number' ? (isIndianStock ? val.toFixed(2) : val.toFixed(2)) : val;
    const formatMktCap = (val: any) => typeof val === 'number' ? formatFin(val) : val;
    const formatPercent = (val: number) => (val * 100).toFixed(1) + '%';
    const formatPay = (val: number) => {
      if (!val) return '---';
      if (isIndian) return `₹${(val / 1e7).toFixed(2)} Cr`;
      if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
      return `$${(val / 1e3).toFixed(1)}K`;
    };
    const formatVal = (val: number) => {
      if (!val) return 'Gift/Grant';
      if (isIndian) return `₹${(val / 1e7).toFixed(2)} Cr`;
      return `$${(val / 1e6).toFixed(1)}M`;
    };

    let md = `# Prometheus Intelligence Report: ${name} (${selectedSymbol})\n`;
    md += `*Generated on ${date}*\n\n`;

    md += `## Executive Summary\n${insight.summary_text || meta.executive_summary || "No summary available."}\n\n`;

    if (meta.layman_analogy) {
      md += `## The "Explain Like I'm 5" Analogy\n> ${meta.layman_analogy}\n\n`;
    }

    md += `## Market Pulse\n`;
    md += `- **Current Price:** ${currency}${formatPrice(meta.price || meta.quote?.price || '---')}\n`;
    md += `- **Change:** ${meta.changesPercentage !== undefined ? (meta.changesPercentage && typeof meta.changesPercentage === 'object' ? (meta.changesPercentage.NSE || meta.changesPercentage.BSE) : meta.changesPercentage) + '%' : '---'}\n`;
    md += `- **Market Cap:** ${currency}${formatMktCap(meta.marketCap || '---')}\n`;
    md += `- **Volume:** ${meta.volume || '---'}\n`;
    md += `- **Next Earnings:** ${meta.nextEarnings || '---'}\n`;
    md += `- **Dividend Yield:** ${meta.dividendYield || '---'}\n\n`;

    md += `## Prometheus Score: ${meta.prometheus_score}/100\n`;
    md += `**Evaluation:** ${meta.score_criteria || "N/A"}\n\n`;

    if (meta.score_breakdown) {
      md += `### Score Breakdown & Sub-Weights\n`;
      md += `- **Financial Analysis:** ${meta.score_breakdown.financial_score}/100\n`;
      if (meta.financial_subscores) {
        md += `  - *Profitability:* ${meta.financial_subscores.profitability}/100\n`;
        md += `  - *Growth:* ${meta.financial_subscores.growth}/100\n`;
        md += `  - *Solvency:* ${meta.financial_subscores.solvency}/100\n`;
      }
      md += `- **Regulatory/SEC Pulse:** ${meta.score_breakdown.sec_score}/100\n`;
      md += `- **Market Sentiment:** ${meta.score_breakdown.sentiment_score}/100\n`;
      md += `- **Momentum & Trend:** ${meta.score_breakdown.trend_score}/100\n`;
      if (meta.trend_subscores) {
        md += `  - *Quarterly Momentum:* ${meta.trend_subscores.quarterly_momentum}/100\n`;
        md += `  - *Annual Stability:* ${meta.trend_subscores.annual_stability}/100\n`;
      }
      md += `- **Sector Relative Strength:** ${meta.score_breakdown.sector_score || 0}/100\n`;
      if (meta.sector_subscores) {
        md += `  - *Outperformance vs Peers:* ${meta.sector_subscores.outperformance}/100\n`;
        md += `  - *Seasonality Strength:* ${meta.sector_subscores.seasonality_strength}/100\n`;
        md += `  - *Rotation Inflow:* ${meta.sector_subscores.rotation_inflow}/100\n`;
      }
      md += `- **Institutional Intelligence:** ${meta.score_breakdown.institutional_score || 0}/100\n`;
      if (meta.institutional_subscores) {
        md += `  - *Analyst Conviction:* ${meta.institutional_subscores.analyst_conviction}/100\n`;
        md += `  - *Insider Signal:* ${meta.institutional_subscores.insider_signal}/100\n`;
        md += `  - *Earnings Reliability:* ${meta.institutional_subscores.earnings_reliability}/100\n`;
      }
      md += `\n`;
    }

    md += `## Key Investment Cases\n`;
    md += `### 🟢 Bull Case\n`;
    (insight.bull_case || []).forEach((c: string) => md += `- ${c}\n`);
    md += `\n### 🔴 Bear Case\n`;
    (insight.bear_case || []).forEach((c: string) => md += `- ${c}\n`);
    md += `\n`;

    md += `## Deep Analysis\n`;
    md += `### 📊 Quarterly Performance\n${meta.quarterly_analysis || "N/A"}\n\n`;
    md += `### 📈 5-Year Strategy & Trends\n${meta.annual_trends || "N/A"}\n\n`;
    md += `### 🌐 Sector Intelligence\n${meta.sector_analysis || "N/A"}\n\n`;
    md += `### 🏛️ Institutional Intelligence\n${meta.institutional_analysis || "N/A"}\n\n`;
    md += `### ${isIndian ? '🏢 Corporate Actions' : '⚖️ Regulatory Synthesis'}\n${meta.sec_analysis || "N/A"}\n\n`;
    md += `### 💬 Market Pulse & News\n${meta.sentiment_summary || "N/A"}\n\n`;

    if (meta.top_headlines && meta.top_headlines.length > 0) {
      md += `#### Analyzed Research Headlines\n`;
      meta.top_headlines.forEach((n: any) => {
        md += `- **${n.headline}** (${n.source} | ${n.date ? new Date(n.date).toLocaleDateString() : 'Recent'})\n`;
      });
      md += `\n`;
    }

    md += `## Key Metrics Copilot\n`;
    md += `| Metric | Value | Status | Insight |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    (insight.metrics || []).forEach((m: any) => {
      const val = (m.value && typeof m.value === 'object') ? (m.value.NSE || m.value.BSE) : (m.value ?? '---');
      md += `| ${m.label} | ${val} | ${m.status?.toUpperCase()} | ${m.shortExplanation} |\n`;
    });
    md += `\n`;

    if (meta.raw_research_dump?.extended_profile?.officers) {
      md += `## Executive Bench\n`;
      md += `| Name | Title | Age | Total Pay |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      meta.raw_research_dump.extended_profile.officers.forEach((o: any) => {
        md += `| ${o.name} | ${o.title} | ${o.age || '---'} | ${formatPay(o.totalPay)} |\n`;
      });
      md += `\n`;
    }

    if (meta.raw_research_dump?.full_analysis?.insiderTransactions) {
      md += `## Recent Insider Transactions\n`;
      md += `| Filer | Relation | Value | Date |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      meta.raw_research_dump.full_analysis.insiderTransactions.slice(0, 10).forEach((t: any) => {
        md += `| ${t.filerName} | ${t.filerRelation} | ${formatVal(t.value)} | ${new Date(t.startDate).toLocaleDateString()} |\n`;
      });
      md += `\n`;
    }

    md += `## Historical Financials\n`;

    if (financials.length > 0) {
      md += `### Annual (Last 5 Years)\n`;
      md += `| Period | Revenue | Net Income | Gross Margin | Net Margin | EPS | Assets | Liabilities |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      financials.filter(f => f.report_type === '10-K').slice(0, 5).forEach(f => {
        const rev = f.income_statement?.revenue || 0;
        const ni = f.income_statement?.netIncome || 0;
        const gp = f.income_statement?.grossProfit || 0;
        const gm = rev > 0 ? formatPercent(gp / rev) : '---';
        const nm = rev > 0 ? formatPercent(ni / rev) : '---';
        const eps = f.income_statement?.eps || f.income_statement?.earningsPerShare || '---';

        md += `| ${f.period} | ${currency}${formatFin(rev)} | ${currency}${formatFin(ni)} | ${gm} | ${nm} | ${eps} | ${currency}${formatFin(f.balance_sheet?.totalAssets || 0)} | ${currency}${formatFin(f.balance_sheet?.totalTotalLiabilities || 0)} |\n`;
      });
      md += `\n`;

      md += `### Quarterly (Last 5 Periods)\n`;
      md += `| Period | Revenue | Net Income | Gross Margin | Net Margin | EPS | Assets | Liabilities |\n`;
      md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
      financials.filter(f => f.report_type === '10-Q').slice(0, 5).forEach(f => {
        const rev = f.income_statement?.revenue || 0;
        const ni = f.income_statement?.netIncome || 0;
        const gp = f.income_statement?.grossProfit || 0;
        const gm = rev > 0 ? formatPercent(gp / rev) : '---';
        const nm = rev > 0 ? formatPercent(ni / rev) : '---';
        const eps = f.income_statement?.eps || f.income_statement?.earningsPerShare || '---';

        md += `| ${f.period} | ${currency}${formatFin(rev)} | ${currency}${formatFin(ni)} | ${gm} | ${nm} | ${eps} | ${currency}${formatFin(f.balance_sheet?.totalAssets || 0)} | ${currency}${formatFin(f.balance_sheet?.totalTotalLiabilities || 0)} |\n`;
      });
    } else {
      md += `*Historical financial data unavailable for this report.*\n`;
    }
    md += `\n`;

    md += `---\n*Disclaimer: This report is AI-generated for research purposes only. It does not constitute financial advice. Use as a technical co-pilot, not a sole decision maker.*`;

    return md;
  }, [insight, tickerData, selectedSymbol, financials]);

  const askAiQuestion = useCallback(() => {
    if (!aiQuery.trim()) return;

    const fullReportCtx = getReportMarkdown();
    const fullPrompt = `${fullReportCtx}\n\nUser Question: ${aiQuery}\n\nPlease provide a deep institutional-grade analysis based on the context above and your real-time knowledge.`;

    const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(fullPrompt)}`;
    window.open(url, '_blank');
    setAiQuery("");
    setIsAiOpen(false);

    toast({
      title: "Query Sent to Perplexity",
      description: "Opening in a new tab with full dashboard context.",
    });
  }, [aiQuery, getReportMarkdown, toast]);

  const downloadReport = useCallback(() => {
    const md = getReportMarkdown();
    if (!md) return;

    // Determine filename vars reusing logic is simplest by just re-accessing state, or extract from helper. 
    // But since download name is simple:
    const name = tickerData?.company_name || tickerData?.name || selectedSymbol;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Prometheus_Report_${selectedSymbol}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Report Generated",
      description: `Analysis for ${selectedSymbol} downloaded as Markdown.`,
    });
  }, [getReportMarkdown, tickerData, selectedSymbol, toast]);

  const copyRawDump = useCallback(() => {
    if (!insight?.metadata?.raw_research_dump) return;
    navigator.clipboard.writeText(JSON.stringify(insight.metadata.raw_research_dump, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to Clipboard",
      description: "Raw research dump has been copied as JSON.",
    });
  }, [insight, toast]);

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
            title: "Synthesis Ready",
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

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Currency Helper
  const isIndian = insight?.metadata?.currency === 'INR' || selectedSymbol?.endsWith('.NS') || selectedSymbol?.endsWith('.BO') || tickerData?.market === 'INDIA';
  const currencySymbol = isIndian ? '₹' : '$';

  const getRawChanges = () => {
    const cp = insight?.metadata?.changesPercentage;
    if (typeof cp === 'object' && cp !== null) {
      return parseFloat(cp.NSE || cp.BSE) || 0;
    }
    return cp || 0;
  };

  const chartColor = getRawChanges() >= 0 ? '#10b981' : '#ef4444';


  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="relative z-50">
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/30 transition-all">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent border-none outline-none text-white w-full text-sm font-medium uppercase tracking-wider"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
          />
          {selectedSymbol && (
            <div className="flex items-center gap-2 bg-white text-black px-3 py-1 rounded-lg text-[10px] font-bold">
              {selectedSymbol}
            </div>
          )}
        </div>

        {isSearchOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
            <GlassCard className="absolute top-full left-0 right-0 mt-2 p-2 border-white/10 bg-slate-950/90 backdrop-blur-3xl z-50 max-h-[300px] overflow-y-auto custom-scrollbar" hoverEffect={false}>
              <div className="flex flex-col gap-1">
                {tickers
                  .filter(t => t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || t.company_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(t => (
                    <button
                      key={t.symbol}
                      onClick={() => {
                        setSelectedSymbol(t.symbol);
                        setIsSearchOpen(false);
                        setSearchTerm("");
                      }}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl transition-all text-left group",
                        selectedSymbol === t.symbol ? "bg-white/10" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 font-mono font-bold text-white text-[10px]">
                          {t.symbol[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white font-mono">{t.symbol}</div>
                          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[200px]">{t.company_name}</div>
                        </div>
                      </div>
                      {selectedSymbol === t.symbol && <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />}
                    </button>
                  ))}
                {tickers.filter(t => t.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || t.company_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                  <div className="p-8 text-center text-slate-600 italic text-xs">
                    No matching assets found.
                  </div>
                )}
              </div>
            </GlassCard>
          </>
        )}
      </div>

      {selectedSymbol ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 items-start">

            {/* LEFT COLUMN: PROMETHEUS INTELLIGENCE */}
            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <div className="flex items-center justify-end mb-2">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    {insight?.created_at && (
                      <span className="text-[9px] text-slate-600 font-mono pr-1">
                        SYNTHESIZED: {new Date(insight.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {insight && (
                    <button
                      onClick={downloadReport}
                      className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                      title="Download Analysis Report"
                    >
                      <FileDown className="w-3 h-3 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                  {insight && (
                    <div className="relative">
                      <button
                        onClick={() => setIsAiOpen(!isAiOpen)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 group relative overflow-hidden",
                          isAiOpen
                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                            : "bg-slate-900/40 border-white/5 text-slate-400 hover:text-white hover:border-indigo-500/30 hover:bg-slate-800/60 shadow-xl"
                        )}
                        title="Ask Gemini Copilot"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 via-indigo-600/10 to-purple-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                        <BrainCircuit className={cn("w-3.5 h-3.5 transition-all duration-500 z-10", isAiOpen ? "rotate-[360deg] scale-110 text-indigo-400" : "group-hover:text-indigo-400")} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] z-10 relative whitespace-nowrap">
                          {isAiOpen ? 'Chatting' : 'ASK AI'}
                        </span>
                        {!isAiOpen && <div className="absolute -inset-1 bg-indigo-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />}
                      </button>

                      {isAiOpen && (
                        <div className="absolute top-full right-0 mt-4 w-80 p-1.5 rounded-[2rem] bg-slate-950/95 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300">
                          <div className="p-4 bg-gradient-to-b from-white/[0.03] to-transparent rounded-[1.75rem]">
                            <div className="flex items-start justify-between mb-3 px-1">
                              <h4 className="text-[9px] font-black text-amber-500/80 uppercase tracking-wider leading-tight">
                                DISCLAIMER: This request will go to the Perplexity AI website
                              </h4>
                            </div>

                            <div className="relative group/input">
                              <textarea
                                value={aiQuery}
                                autoFocus
                                onChange={(e) => setAiQuery(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    askAiQuestion();
                                  }
                                }}
                                placeholder={`Ask about ${selectedSymbol}'s strategy, competitive moats, or guidance...`}
                                className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none h-32 mb-3 transition-all custom-scrollbar leading-relaxed"
                              />
                              <div className="absolute inset-0 rounded-2xl border border-indigo-500/0 group-focus-within/input:border-indigo-500/20 pointer-events-none transition-all duration-500" />
                            </div>

                            <button
                              onClick={askAiQuestion}
                              disabled={!aiQuery.trim()}
                              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed group/btn shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] active:scale-[0.98]"
                            >
                              <span>Send</span>
                              <SendHorizontal className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>

                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          {(tickerData?.exchange && typeof tickerData?.exchange === 'object')
                            ? Object.keys(tickerData.exchange).join(' / ')
                            : (tickerData?.exchange || 'MARKET')}
                        </p>

                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-white">
                        {currencySymbol}{(insight?.metadata?.price && typeof insight?.metadata?.price === 'object')
                          ? (insight.metadata.price.NSE || insight.metadata.price.BSE || '---')
                          : (insight?.metadata?.price || '---')}
                      </div>

                      {insight?.metadata?.changesPercentage !== undefined && (
                        <div className={cn("text-xs font-bold",
                          (insight.metadata.changesPercentage && typeof insight.metadata.changesPercentage === 'object'
                            ? (parseFloat(insight.metadata.changesPercentage.NSE || insight.metadata.changesPercentage.BSE) || 0)
                            : insight.metadata.changesPercentage) >= 0 ? "text-emerald-500" : "text-red-500"
                        )}>
                          {(insight.metadata.changesPercentage && typeof insight.metadata.changesPercentage === 'object'
                            ? (parseFloat(insight.metadata.changesPercentage.NSE || insight.metadata.changesPercentage.BSE) || 0)
                            : insight.metadata.changesPercentage) >= 0 ? '+' : ''}
                          {insight.metadata.changesPercentage && typeof insight.metadata.changesPercentage === 'object'
                            ? (insight.metadata.changesPercentage.NSE || insight.metadata.changesPercentage.BSE)
                            : insight.metadata.changesPercentage}%
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setIsChartExpanded(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                    >
                      <Maximize2 className="w-3 h-3" />
                      Chart Analysis
                    </button>
                  </div>
                </div>

                <div className="h-[200px] w-full mt-4 relative px-2 group">
                  {loadingPrices && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] z-10">
                      <Loader2 className="w-6 h-6 animate-spin text-white/20" />
                    </div>
                  )}
                  {prices.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={filteredPrices} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
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
                                <span className="text-sm font-bold text-white font-mono tracking-tight">{currencySymbol}{priceStr}</span>
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
                      value={(m.value && typeof m.value === 'object')
                        ? (m.value.NSE || m.value.BSE || JSON.stringify(m.value))
                        : (m.value ?? '---')}

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
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-amber">
                  {isIndian ? 'Corporate Actions & Regulatory Insights' : 'SEC Regulatory Truth'}
                </h2>
              </div>

              <GlassCard className="p-6 border-amber-500/10 bg-amber-500/[0.02]">
                {insight?.metadata?.sec_analysis ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-bold text-amber-500/80 uppercase mb-2 tracking-wider">
                        {isIndian ? 'Regulatory Pulse' : 'SEC Synthesis'}
                      </h4>
                      <p className="text-sm leading-relaxed text-slate-300">{insight.metadata.sec_analysis}</p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">
                          {isIndian ? 'Exchange Source' : 'Last Filing'}
                        </span>
                        <span className="text-[9px] bg-amber-500/20 text-amber-200 px-2 py-0.5 rounded font-bold uppercase">
                          {isIndian ? (tickerData?.exchange || 'NSE/BSE') : insight.metadata.last_sec_filing}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <a
                        href={isIndian
                          ? `https://www.sebi.gov.in/search.html?searchval=${selectedSymbol}`
                          : `https://www.sec.gov/edgar/browse/index.html?cik=${insight.metadata?.cik || selectedSymbol}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2.5 rounded-xl bg-amber-500/10 hover:bg-white/10 text-amber-400 text-[10px] font-bold uppercase tracking-widest transition-all border border-amber-500/10"
                      >
                        {isIndian ? 'Search on SEBI' : 'View SEC History'}
                      </a>

                      {isIndian && (
                        <a
                          href="https://www.nseindia.com/companies-listing/corporate-filings-announcements"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block w-full text-center py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-widest transition-all border border-white/5"
                        >
                          NSE Corporate Filings
                        </a>
                      )}
                    </div>

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

                    <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Research Intelligence Feeds</h4>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 max-h-[400px]">
                        {insight.metadata.top_headlines && insight.metadata.top_headlines.length > 0 ? (
                          insight.metadata.top_headlines.map((news: any, i: number) => (
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
                                <span>
                                  {news.date
                                    ? new Date(news.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                    : 'Research Date'}
                                </span>
                              </div>
                            </a>
                          ))
                        ) : (
                          <div className="py-10 text-center">
                            <p className="text-[10px] text-slate-600 font-mono italic">No research headlines archived for this synthesis.</p>
                          </div>
                        )}
                      </div>
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

          {/* INSTITUTIONAL INTELLIGENCE SECTION */}
          {insight?.metadata?.raw_research_dump && (
            <div className="mt-6">
              <InstitutionalIntelligence
                rawDump={insight.metadata.raw_research_dump}
                analysis={insight.metadata.institutional_analysis}
                subscores={insight.metadata.institutional_subscores}
                isIndian={isIndian}
              />
            </div>
          )}

          {/* NEW BOTTOM SECTION: DEEP ANALYSIS & HISTORICALS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-emerald">Deep Fundamental Analysis</h2>
              </div>

              <GlassCard className="p-6 border-emerald-500/10 bg-emerald-500/[0.01] space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                    Quarterly Results Review
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {insight?.metadata?.quarterly_analysis || "Quarterly analysis pending deep scan..."}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-3 h-3" /> 5-Year Trajectory
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {insight?.metadata?.annual_trends || "Annual trend synthesis pending..."}
                  </p>
                </div>
                <div className="pt-4 border-t border-white/5">
                  <h4 className="text-[10px] font-bold text-rose-500 uppercase mb-2 tracking-wider flex items-center gap-2">
                    Sector Analysis
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {insight?.metadata?.sector_analysis || "Sector rotation and seasonality analysis pending..."}
                  </p>
                </div>
              </GlassCard>

              <div className="flex items-center gap-2 mb-2 mt-4">
                <Plus className="w-4 h-4 text-slate-400" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Investor Resources</h2>
              </div>
              <GlassCard className="p-6 border-white/5 bg-white/[0.01]">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-wider">Search for Presentations & Guidance</h4>
                <div className="grid grid-cols-1 gap-4">
                  <a
                    href={`https://www.google.com/search?q=${selectedSymbol}+investor+presentation`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-sky-500/30 transition-all group shadow-xl"
                  >
                    <Search className="w-8 h-8 text-slate-500 group-hover:text-sky-400 mb-3 transition-all duration-300" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-white uppercase tracking-widest transition-colors">Investor Decks</span>
                      <span className="text-[8px] text-slate-600 font-medium uppercase mt-1">Direct Google Search</span>
                    </div>
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
                              {currencySymbol}{isIndian
                                ? ((f.income_statement?.revenue || 0) / 1e7).toFixed(1) + ' Cr'
                                : ((f.income_statement?.revenue || 0) / 1e9).toFixed(2) + 'B'}
                            </td>
                            <td className="p-4 text-[11px] font-mono text-sky-400">
                              {currencySymbol}{isIndian
                                ? ((f.income_statement?.netIncome || 0) / 1e7).toFixed(1) + ' Cr'
                                : ((f.income_statement?.netIncome || 0) / 1e9).toFixed(2) + 'B'}
                            </td>
                            <td className="p-4 text-[11px] font-mono text-slate-300">
                              {currencySymbol}{isIndian
                                ? ((f.balance_sheet?.totalAssets || 0) / 1e7).toFixed(1) + ' Cr'
                                : ((f.balance_sheet?.totalAssets || 0) / 1e9).toFixed(2) + 'B'}
                            </td>
                            <td className="p-4 text-[11px] font-mono text-slate-300">
                              {currencySymbol}{isIndian
                                ? ((f.balance_sheet?.totalTotalLiabilities || 0) / 1e7).toFixed(1) + ' Cr'
                                : ((f.balance_sheet?.totalTotalLiabilities || 0) / 1e9).toFixed(2) + 'B'}
                            </td>


                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-slate-600 italic text-xs">
                            No data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </GlassCard>

              {/* EXECUTIVE BENCH SECTION */}
              {insight?.metadata?.raw_research_dump?.extended_profile?.officers && (
                <div className="mt-8">
                  <ExecutiveBench
                    officers={insight.metadata.raw_research_dump.extended_profile.officers}
                    isIndian={isIndian}
                  />
                </div>
              )}
            </div>
            {/* RAW RESEARCH DUMP (FOR DEBUGGING/HIDDEN DATA) */}
            <div className="mt-12 pt-12 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-6 flex items-center gap-3">
                <Zap className="w-3 h-3" /> Raw Research Engine Dump
              </h2>
              <GlassCard className="p-0 border-white/5 bg-black/20 overflow-hidden">
                <div className="p-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono text-slate-500">SYSTEM_RESEARCH_LOG_v2.5</span>
                    <span className="text-[9px] font-mono text-emerald-500/50 uppercase tracking-widest animate-pulse">Live Link Active</span>
                  </div>
                  <button
                    onClick={copyRawDump}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 group/copy"
                  >
                    {copied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 group-hover/copy:scale-110 transition-transform" />
                    )}
                    <span className="text-[9px] font-bold uppercase tracking-widest">
                      {copied ? "Copied" : "Copy Dump"}
                    </span>
                  </button>
                </div>
                <div className="p-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                  <pre className="text-[10px] font-mono leading-relaxed text-slate-500 whitespace-pre-wrap">
                    {insight?.metadata?.raw_research_dump
                      ? JSON.stringify(insight.metadata.raw_research_dump, null, 2)
                      : "// No raw research buffer detected for this asset.\n// Ensure deep scan is completed."}
                  </pre>
                </div>
              </GlassCard>
              <p className="mt-4 text-[9px] text-slate-600 font-mono italic">
                * This data is fetched directly from unmapped model endpoints and is provided for audit purposes.
              </p>
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
      {/* Full-Screen Engine Overlay */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
          {/* Header Bar */}
          <div className="h-16 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                    {tickerData?.company_name || selectedSymbol}
                  </h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Terminal</p>
                </div>
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                {['1M', '6M', '1Y', '5Y', 'MAX'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setChartTimeframe(t)}
                    className={cn(
                      "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                      t === chartTimeframe ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                {[
                  { id: 'area', label: 'AREA' },
                  { id: 'candles', label: 'CANDLES' },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setChartType(btn.id as any)}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border",
                      chartType === btn.id
                        ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                        : "text-slate-500 border-transparent hover:text-white"
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div className="h-8 w-px bg-white/5" />
              <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                {[
                  { label: 'SMA', active: showSMA, onClick: () => setShowSMA(!showSMA) },
                  { label: 'VOL', active: showVolume, onClick: () => setShowVolume(!showVolume) },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    onClick={btn.onClick}
                    className={cn(
                      "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border",
                      btn.active
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "text-slate-500 border-transparent hover:text-white"
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right mr-4 border-r border-white/5 pr-6">
                <div className="text-xl font-black text-white font-mono leading-none">
                  {currencySymbol}{prices[prices.length - 1]?.close}
                </div>
                <div className={cn("text-[10px] font-bold mt-1", getRawChanges() >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {getRawChanges() >= 0 ? '+' : ''}{getRawChanges().toFixed(2)}% <span className="text-slate-600 ml-1 uppercase">HISTORICAL TRAJECTORY</span>
                </div>
              </div>
              <button
                onClick={() => setIsChartExpanded(false)}
                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all hover:rotate-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chart Content Area */}
          <div className="flex-1 w-full bg-[#020617] relative flex flex-col">
            {/* The Chart Container */}
            <div className="flex-1 pt-6 pr-6 pb-2 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={filteredPrices} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPriceFullScreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    strokeDasharray="0"
                    vertical={false}
                    stroke="rgba(255,255,255,0.02)"
                  />

                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: '700' }}
                    minTickGap={100}
                    dy={10}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                    }}
                  />

                  <YAxis
                    yAxisId="price"
                    orientation="right"
                    domain={[
                      (dataMin: number) => {
                        const lows = filteredPrices.map(p => p.low).filter(v => v !== undefined);
                        const min = lows.length ? Math.min(...lows) : dataMin;
                        return min * 0.995;
                      },
                      (dataMax: number) => {
                        const highs = filteredPrices.map(p => p.high).filter(v => v !== undefined);
                        const max = highs.length ? Math.max(...highs) : dataMax;
                        return max * 1.005;
                      }
                    ]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#334155', fontSize: 10, fontWeight: '700' }}
                    tickFormatter={(val) => `${currencySymbol}${val > 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)}`}
                  />

                  <YAxis
                    yAxisId="volume"
                    orientation="left"
                    domain={[0, (dataMax: number) => dataMax * 1.5]}
                    tick={{ fill: '#4b5563', fontSize: 8 }}
                    tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                  />

                  <RechartsTooltip
                    cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const dateStr = new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                      const price = data.close;
                      const vol = data.volume;

                      return (
                        <div className="bg-slate-950 border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3 min-w-[220px]">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{dateStr}</span>
                            <div className="text-2xl font-black text-white font-mono tracking-tighter mt-1">
                              {currencySymbol}{Number(price).toFixed(3)}
                            </div>
                          </div>

                          {chartType === 'candles' && (
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-white/5 pt-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">O</span>
                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.open?.toFixed(3)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">H</span>
                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.high?.toFixed(3)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">L</span>
                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.low?.toFixed(3)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 font-bold uppercase">C</span>
                                <span className={cn("text-[9px] font-bold font-mono", data.close >= data.open ? "text-emerald-400" : "text-rose-400")}>{currencySymbol}{data.close?.toFixed(3)}</span>
                              </div>
                            </div>
                          )}

                          {(vol && showVolume) && (
                            <div className="flex items-center justify-between border-t border-white/5 pt-2">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Volume</span>
                              <span className="text-[10px] text-slate-400 font-mono">{(vol / 1000000).toFixed(2)}M</span>
                            </div>
                          )}

                          {showSMA && data.sma20 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-indigo-400 font-bold uppercase">SMA 20</span>
                              <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}{data.sma20.toFixed(2)}</span>
                            </div>
                          )}

                          {showSMA && data.sma50 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-rose-400 font-bold uppercase">SMA 50</span>
                              <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}{data.sma50.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />

                  <Brush
                    dataKey="date"
                    height={30}
                    stroke="#818cf8"
                    fill="#1e293b"
                    fillOpacity={0.6}
                    tickFormatter={() => ""}
                    travellerWidth={15}
                  />

                  {/* Volume Bars removed from here and moved to top layer */}

                  {chartType === 'area' ? (
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="close"
                      stroke={chartColor}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorPriceFullScreen)"
                      animationDuration={800}
                    />
                  ) : (
                    <Bar
                      yAxisId="price"
                      dataKey="bodyRange"
                      shape={Candle}
                      animationDuration={0}
                      isAnimationActive={false}
                    />
                  )}

                  {showSMA && (
                    <>
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="sma20"
                        stroke="#818cf8"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1200}
                      />
                      <Line
                        yAxisId="price"
                        type="monotone"
                        dataKey="sma50"
                        stroke="#fb7185"
                        strokeWidth={2}
                        dot={false}
                        animationDuration={1500}
                      />
                    </>
                  )}

                  {showVolume && (
                    <Bar
                      yAxisId="volume"
                      dataKey="volume"
                      fill="#eab308"
                      fillOpacity={0.4}
                      radius={[1, 1, 0, 0]}
                      animationDuration={500}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend / Status Bar */}
            <div className="h-10 bg-slate-900/20 border-t border-white/5 flex items-center justify-between px-20 shrink-0">
              <div className="flex gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border border-indigo-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Interactive Volume</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", getRawChanges() >= 0 ? "bg-emerald-500/40" : "bg-red-500/40")} />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Closing Average</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-mono text-slate-600">PROMETHEUS_ENGINE_v4.2</span>
                <span className="text-[9px] font-mono text-emerald-500/40">CONNECTION_STABLE</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
