"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

interface TickerSearchProps {
    tickers: any[];
    selectedSymbol: string | null;
    onSelect: (symbol: string) => void;
}

export function TickerSearch({ tickers, selectedSymbol, onSelect }: TickerSearchProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    return (
        <div className="relative z-50">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/30 transition-all">
                <Search className="w-5 h-5 text-slate-500" />
                <input
                    type="text"
                    placeholder="Search Assets"
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
                                            onSelect(t.symbol);
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
    );
}
