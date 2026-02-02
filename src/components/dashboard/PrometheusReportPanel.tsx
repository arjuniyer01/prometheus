"use client";

import { FileDown, Loader2 } from "lucide-react";
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
                        <AIGeminiCopilot
                            isAiOpen={isAiOpen}
                            setIsAiOpen={setIsAiOpen}
                            aiQuery={aiQuery}
                            setAiQuery={setAiQuery}
                            selectedSymbol={selectedSymbol}
                            onAsk={onAskAi}
                        />
                    )}
                </div>
            </div>

            <GlassCard className="p-6 border-white/5 bg-white/[0.02]">
                {insight ? (
                    <div className="space-y-6">
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
    );
}
