"use client";

import { FileDown, Loader2, Activity } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { PrometheusScore } from "./PrometheusScore";
import { AIGeminiCopilot } from "./AIGeminiCopilot";
import { cn } from "@/lib/utils";

interface PrometheusReportPanelProps {
    insight: any;
    selectedSymbol: string | null;
    downloadReport: () => void;
    isAiOpen: boolean;
    setIsAiOpen: (val: boolean) => void;
    aiQuery: string;
    setAiQuery: (val: string) => void;
    onAskAi: () => void;
}

export function PrometheusReportPanel({
    insight,
    selectedSymbol,
    downloadReport,
    isAiOpen,
    setIsAiOpen,
    aiQuery,
    setAiQuery,
    onAskAi
}: PrometheusReportPanelProps) {
    return (
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
            <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                {insight ? (
                    <div className="space-y-8">
                        <PrometheusScore metadata={insight.metadata} />

                        <div className="bg-indigo-500/[0.02] border border-indigo-500/10 p-6 rounded-2xl relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/40 group-hover:bg-indigo-500 transition-colors" />
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Activity className="w-3 h-3" /> Synthesis Summary
                            </h4>
                            <p className="text-sm leading-relaxed text-slate-200 font-medium selection:bg-indigo-500/30">
                                {insight.summary_text}
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div className="p-4 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 hover:bg-emerald-500/[0.04] transition-all">
                                <h4 className="text-[10px] font-black text-emerald-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    Bull Case
                                </h4>
                                <ul className="space-y-3">
                                    {insight.bull_case?.map((c: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-[11px] leading-relaxed text-slate-300">
                                            <span className="text-emerald-500/50 font-bold shrink-0">•</span>
                                            <span>{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-rose-500/[0.02] border border-rose-500/10 hover:bg-rose-500/[0.04] transition-all">
                                <h4 className="text-[10px] font-black text-rose-400 uppercase mb-3 tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                    Bear Case
                                </h4>
                                <ul className="space-y-3">
                                    {insight.bear_case?.map((c: string, i: number) => (
                                        <li key={i} className="flex gap-3 text-[11px] leading-relaxed text-slate-300">
                                            <span className="text-rose-500/50 font-bold shrink-0">•</span>
                                            <span>{c}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {insight.metadata?.analogy && (
                            <div className="pt-6 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Analogy Model</h4>
                                <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 italic">
                                    <p className="text-[11px] text-slate-400 leading-relaxed">"{insight.metadata.analogy}"</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-8 border-t border-white/5 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    {insight?.created_at && (
                                        <span className="text-[9px] text-slate-600 font-mono">
                                            {insight?.metadata?.analysis_version && (
                                                <span className="text-indigo-400/60 font-black mr-2">[{insight.metadata.analysis_version}]</span>
                                            )}
                                            SYNTHESIZED: {new Date(insight.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={downloadReport}
                                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                                        title="Download Analysis Report"
                                    >
                                        <FileDown className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    </button>
                                    <AIGeminiCopilot
                                        isAiOpen={isAiOpen}
                                        setIsAiOpen={setIsAiOpen}
                                        aiQuery={aiQuery}
                                        setAiQuery={setAiQuery}
                                        selectedSymbol={selectedSymbol}
                                        onAsk={onAskAi}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                        <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Synthesizing Alpha...</p>
                    </div>
                )}
            </GlassCard>
        </div>
    );
}
