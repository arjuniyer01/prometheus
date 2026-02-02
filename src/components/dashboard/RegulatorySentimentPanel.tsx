"use client";

import { ShieldAlert, MessageSquare, Loader2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface RegulatorySentimentPanelProps {
    insight: any;
    tickerData: any;
    selectedSymbol: string | null;
    isIndian: boolean;
}

export function RegulatorySentimentPanel({
    insight,
    tickerData,
    selectedSymbol,
    isIndian
}: RegulatorySentimentPanelProps) {
    return (
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
    );
}
