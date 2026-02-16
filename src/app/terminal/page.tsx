"use client";

import { useState, useCallback, Suspense, lazy } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  Zap,
  BarChart3,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useStockDashboard } from "@/hooks/useStockDashboard";
import { TickerSearch } from "@/components/dashboard/TickerSearch";
import { getReportMarkdown } from "@/lib/report-utils";

// Lazy load heavy components
const PrometheusReportPanel = lazy(() => import("@/components/dashboard/PrometheusReportPanel").then(m => ({ default: m.PrometheusReportPanel })));
const PriceChart = lazy(() => import("@/components/dashboard/PriceChart").then(m => ({ default: m.PriceChart })));
const RegulatorySentimentPanel = lazy(() => import("@/components/dashboard/RegulatorySentimentPanel").then(m => ({ default: m.RegulatorySentimentPanel })));
const MetricCopilot = lazy(() => import("@/components/dashboard/MetricCopilot").then(m => ({ default: m.MetricCopilot })));
const InstitutionalIntelligence = lazy(() => import("@/components/dashboard/InstitutionalIntelligence").then(m => ({ default: m.InstitutionalIntelligence })));
const DeepFundamentalAnalysis = lazy(() => import("@/components/dashboard/DeepFundamentalAnalysis").then(m => ({ default: m.DeepFundamentalAnalysis })));
const FinancialsTable = lazy(() => import("@/components/dashboard/FinancialsTable").then(m => ({ default: m.FinancialsTable })));
const ExecutiveBench = lazy(() => import("@/components/dashboard/ExecutiveBench").then(m => ({ default: m.ExecutiveBench })));
const DCFAnalysis = lazy(() => import("@/components/dashboard/DCFAnalysis").then(m => ({ default: m.DCFAnalysis })));

export default function Home() {
  const {
    tickers,
    selectedSymbol,
    setSelectedSymbol,
    insight,
    tickerData,
    prices,
    financials,
    loading,
    loadingPrices
  } = useStockDashboard();

  const [finView, setFinView] = useState<'annual' | 'quarterly'>('annual');
  const [copied, setCopied] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState('5Y');
  const [showSMA, setShowSMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);

  const [chartType, setChartType] = useState<'area' | 'candles'>('candles');
  const [showRawDump, setShowRawDump] = useState(false);
  const { toast } = useToast();

  const isIndian = insight?.metadata?.currency === 'INR' || selectedSymbol?.endsWith('.NS') || selectedSymbol?.endsWith('.BO') || tickerData?.market === 'INDIA';
  const currencySymbol = isIndian ? '₹' : '$';

  const getRawChanges = useCallback(() => {
    const cp = insight?.metadata?.changesPercentage;
    if (typeof cp === 'object' && cp !== null) {
      return parseFloat(cp.NSE || cp.BSE) || 0;
    }
    return cp || 0;
  }, [insight]);

  const chartColor = getRawChanges() >= 0 ? '#10b981' : '#ef4444';

  const handleAskAiQuestion = useCallback(() => {
    if (!aiQuery.trim()) return;

    const fullReportCtx = getReportMarkdown({ insight, tickerData, selectedSymbol, financials });
    const fullPrompt = `${fullReportCtx}\n\nUser Question: ${aiQuery}\n\nPlease provide a deep institutional-grade analysis based on the context above and your real-time knowledge.`;

    const url = `https://www.perplexity.ai/search?q=${encodeURIComponent(fullPrompt)}`;
    window.open(url, '_blank');
    setAiQuery("");
    setIsAiOpen(false);

    toast({
      title: "Query Sent to Perplexity",
      description: "Opening in a new tab with full dashboard context.",
    });
  }, [aiQuery, insight, tickerData, selectedSymbol, financials, toast]);

  const handleDownloadReport = useCallback(() => {
    const md = getReportMarkdown({ insight, tickerData, selectedSymbol, financials });
    if (!md) return;

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
  }, [insight, tickerData, selectedSymbol, financials, toast]);

  const handleCopyRawDump = useCallback(() => {
    if (!insight?.metadata?.raw_research_dump) return;
    navigator.clipboard.writeText(JSON.stringify(insight.metadata.raw_research_dump, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to Clipboard",
      description: "Raw research dump has been copied as JSON.",
    });
  }, [insight, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Waking Prometheus Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TickerSearch
        tickers={tickers}
        selectedSymbol={selectedSymbol}
        onSelect={setSelectedSymbol}
      />

      {selectedSymbol ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 items-start">
            <Suspense fallback={<div className="h-[400px] glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
              <PrometheusReportPanel
                insight={insight}
                selectedSymbol={selectedSymbol}
                downloadReport={handleDownloadReport}
                isAiOpen={isAiOpen}
                setIsAiOpen={setIsAiOpen}
                aiQuery={aiQuery}
                setAiQuery={setAiQuery}
                onAskAi={handleAskAiQuestion}
              />
            </Suspense>

            <div className="flex flex-col gap-6">
              <Suspense fallback={<div className="h-[400px] glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
                <PriceChart
                  prices={prices}
                  loadingPrices={loadingPrices}
                  chartColor={chartColor}
                  currencySymbol={currencySymbol}
                  tickerData={tickerData}
                  selectedSymbol={selectedSymbol}
                  isChartExpanded={isChartExpanded}
                  setIsChartExpanded={setIsChartExpanded}
                  chartTimeframe={chartTimeframe}
                  setChartTimeframe={setChartTimeframe}
                  chartType={chartType}
                  setChartType={setChartType}
                  showSMA={showSMA}
                  setShowSMA={setShowSMA}
                  showVolume={showVolume}
                  setShowVolume={setShowVolume}

                  getRawChanges={getRawChanges}
                />
              </Suspense>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {insight?.metrics ? (
                  insight.metrics.map((m: any, i: number) => (
                    <Suspense key={i} fallback={<div className="h-28 glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
                      <MetricCopilot
                        label={m.label}
                        value={(m.value && typeof m.value === 'object')
                          ? (m.value.NSE || m.value.BSE || JSON.stringify(m.value))
                          : (m.value ?? '---')}
                        status={m.status}
                        shortExplanation={m.shortExplanation}
                        technicalDefinition={m.technicalDefinition}
                      />
                    </Suspense>
                  ))
                ) : (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-28 glass-morphism rounded-3xl animate-pulse bg-white/5" />
                  ))
                )}
              </div>
            </div>

            <Suspense fallback={<div className="h-[400px] glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
              <RegulatorySentimentPanel
                insight={insight}
                tickerData={tickerData}
                selectedSymbol={selectedSymbol}
                isIndian={isIndian}
              />
            </Suspense>
          </div>

          {insight?.metadata?.raw_research_dump && (
            <div className="mt-6">
              <Suspense fallback={<div className="h-[300px] glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
                <InstitutionalIntelligence
                  rawDump={insight.metadata.raw_research_dump}
                  analysis={insight.metadata.institutional_analysis}
                  subscores={insight.metadata.institutional_subscores}
                  isIndian={isIndian}
                />
              </Suspense>
            </div>
          )}

          <Suspense fallback={<div className="h-[600px] glass-morphism rounded-3xl animate-pulse bg-white/5" />}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-6">
                <DeepFundamentalAnalysis insight={insight} selectedSymbol={selectedSymbol} />
                <DCFAnalysis insight={insight} tickerData={tickerData} />
              </div>

              <div className="space-y-6">
                <FinancialsTable
                  financials={financials}
                  finView={finView}
                  setFinView={setFinView}
                  isIndian={isIndian}
                  currencySymbol={currencySymbol}
                />

                {insight?.metadata?.raw_research_dump?.extended_profile?.officers && (
                  <div className="mt-8">
                    <ExecutiveBench
                      officers={insight.metadata.raw_research_dump.extended_profile.officers}
                      isIndian={isIndian}
                    />
                  </div>
                )}
              </div>
            </div>
          </Suspense>

          <div className="mt-12 pt-12 border-t border-white/5 opacity-40 hover:opacity-100 transition-opacity col-span-full">
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
                  onClick={handleCopyRawDump}
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
                {showRawDump ? (
                  <pre className="text-[10px] font-mono leading-relaxed text-slate-500 whitespace-pre-wrap">
                    {insight?.metadata?.raw_research_dump
                      ? JSON.stringify(insight.metadata.raw_research_dump, null, 2)
                      : "// No raw research buffer detected for this asset.\n// Ensure deep scan is completed."}
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Research buffer is compressed</p>
                    <button
                      onClick={() => setShowRawDump(true)}
                      className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-[0.2em]"
                    >
                      Expand Research Buffer
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[40vh] border border-dashed border-white/5 rounded-3xl">
          <BarChart3 className="w-12 h-12 text-slate-700 mb-4" />
          <p className="text-slate-500 font-medium">No active analysis.</p>
        </div>
      )}
    </div>
  );
}
