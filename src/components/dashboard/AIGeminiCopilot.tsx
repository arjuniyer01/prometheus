"use client";

import { BrainCircuit, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIGeminiCopilotProps {
    isAiOpen: boolean;
    setIsAiOpen: (val: boolean) => void;
    aiQuery: string;
    setAiQuery: (val: string) => void;
    selectedSymbol: string | null;
    onAsk: () => void;
}

export function AIGeminiCopilot({
    isAiOpen,
    setIsAiOpen,
    aiQuery,
    setAiQuery,
    selectedSymbol,
    onAsk
}: AIGeminiCopilotProps) {
    return (
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
                                        onAsk();
                                    }
                                }}
                                placeholder={`Ask about ${selectedSymbol}'s strategy, competitive moats, or guidance...`}
                                className="w-full bg-black/60 border border-white/5 rounded-2xl p-4 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-none h-32 mb-3 transition-all custom-scrollbar leading-relaxed"
                            />
                            <div className="absolute inset-0 rounded-2xl border border-indigo-500/0 group-focus-within/input:border-indigo-500/20 pointer-events-none transition-all duration-500" />
                        </div>

                        <button
                            onClick={onAsk}
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
    );
}
