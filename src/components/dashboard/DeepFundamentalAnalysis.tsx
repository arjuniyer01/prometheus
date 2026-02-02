"use client";

import { BarChart3, Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";

interface DeepFundamentalAnalysisProps {
    insight: any;
    selectedSymbol: string | null;
}

export function DeepFundamentalAnalysis({ insight, selectedSymbol }: DeepFundamentalAnalysisProps) {
    return (
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
    );
}
