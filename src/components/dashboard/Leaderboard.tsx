"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/GlassCard";
import {
    Trophy,
    TrendingUp,
    TrendingDown,
    BarChart3,
    Search,
    ArrowUpRight,
    Clock,
    Zap
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardItem {
    symbol: string;
    company_name: string;
    sector: string;
    score: number;
    last_analyzed: string;
    sentiment: "bullish" | "bearish" | "neutral";
    exchange?: string;
    currency?: string;
    analysis_version?: string;
}

export function Leaderboard() {
    const [items, setItems] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [market, setMarket] = useState<'US' | 'INDIA'>('US');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all tickers and their latest insights
                const { data: tickersData, error: tickersError } = await supabase
                    .from('tickers')
                    .select('symbol, company_name, sector, exchange');

                if (tickersError) throw tickersError;

                // Fetch latest insights for each ticker
                const { data: insightsData, error: insightsError } = await supabase
                    .from('ai_insights')
                    .select('symbol, metadata, created_at')
                    .order('created_at', { ascending: false });

                if (insightsError) throw insightsError;

                const latestInsights: Record<string, any> = {};
                insightsData.forEach(insight => {
                    if (!latestInsights[insight.symbol]) {
                        latestInsights[insight.symbol] = insight;
                    }
                });

                const leaderboard: LeaderboardItem[] = (tickersData || [])
                    .map(ticker => {
                        const insight = latestInsights[ticker.symbol];
                        if (!insight) return null;

                        const score = insight.metadata?.prometheus_score || 0;
                        let sentiment: LeaderboardItem['sentiment'] = "neutral";
                        if (score >= 60) sentiment = "bullish";
                        else if (score <= 40) sentiment = "bearish";

                        const item: LeaderboardItem = {
                            symbol: ticker.symbol,
                            company_name: ticker.company_name,
                            sector: ticker.sector || "Unknown",
                            score: score,
                            last_analyzed: insight.created_at,
                            sentiment,
                            exchange: ticker.exchange,
                            currency: insight.metadata?.currency,
                            analysis_version: insight.metadata?.analysis_version
                        };
                        return item;
                    })
                    .filter((item): item is LeaderboardItem => item !== null)
                    .sort((a, b) => (b.score || 0) - (a.score || 0));

                setItems(leaderboard);
            } catch (err) {
                console.error("Error fetching leaderboard:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredItems = items.filter(item => {
        const matchesSearch = item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.company_name.toLowerCase().includes(searchTerm.toLowerCase());

        const isIndian = item.symbol.endsWith('.NS') ||
            item.symbol.endsWith('.BO') ||
            item.exchange === 'NSE' ||
            item.exchange === 'BSE' ||
            item.currency === 'INR';
        const matchesMarket = market === 'INDIA' ? isIndian : !isIndian;

        return matchesSearch && matchesMarket;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
        >
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black font-outfit tracking-tighter text-white sm:text-5xl">
                        Prometheus <span className="text-slate-500">Leaderboard</span>
                    </h1>
                    <div className="mt-6 flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5 w-fit">
                        <button
                            onClick={() => setMarket('US')}
                            className={cn(
                                "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                                market === 'US' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                            )}
                        >
                            US MARKET
                        </button>
                        <button
                            onClick={() => setMarket('INDIA')}
                            className={cn(
                                "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                                market === 'INDIA' ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                            )}
                        >
                            INDIAN MARKET
                        </button>
                    </div>
                    <p className="mt-4 text-slate-400 max-w-2xl text-sm leading-relaxed">
                        Top-rated assets synthesized from fundamental health, sentiment flows, and institutional signals.
                        Updated in real-time as the engine crawls global markets.
                    </p>
                </div>

                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search assets or selectors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Top 3 Spotlight */}
            <AnimatePresence mode="wait">
                {!searchTerm && filteredItems.length >= 3 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {filteredItems.slice(0, 3).map((item, idx) => (
                            <Link href={`/terminal?ticker=${item.symbol}`} key={item.symbol} className="block">
                                <GlassCard className={cn(
                                    "group relative h-full",
                                    idx === 0 ? "border-indigo-500/30 ring-1 ring-indigo-500/20" :
                                        idx === 1 ? "border-slate-400/20" : "border-slate-600/10"
                                )}>
                                    <div className="absolute top-4 right-4 text-[10px] font-black text-slate-700 uppercase tracking-widest">
                                        #{idx + 1}
                                    </div>

                                    <div className="flex flex-col h-full">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border",
                                                idx === 0 ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                                                    idx === 1 ? "bg-slate-400/10 border-slate-400/20 text-slate-400" :
                                                        "bg-slate-600/10 border-slate-600/20 text-slate-600"
                                            )}>
                                                {item.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="text-xl font-black text-white">{item.symbol}</div>
                                                <div className="text-xs text-slate-500 font-medium truncate max-w-[150px]">{item.company_name}</div>
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <div className="flex items-end justify-between mb-2">
                                                <div className="text-4xl font-black font-outfit text-white">
                                                    {item.score}<span className="text-xs text-slate-600">/100</span>
                                                </div>
                                                <div className={cn(
                                                    "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider",
                                                    item.sentiment === "bullish" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                                        item.sentiment === "bearish" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                                            "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                                )}>
                                                    {item.sentiment}
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-1000",
                                                        item.sentiment === "bullish" ? "bg-emerald-500" :
                                                            item.sentiment === "bearish" ? "bg-rose-500" : "bg-amber-500"
                                                    )}
                                                    style={{ width: `${item.score}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </GlassCard>
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* List Table */}
            <GlassCard className="p-0 border-white/5 overflow-visible">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sector</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Prometheus Score</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Release</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {loading ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8">
                                            <div className="h-4 bg-white/5 rounded w-full" />
                                        </td>
                                    </tr>
                                ))
                            ) : filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <BarChart3 className="w-8 h-8 text-slate-700" />
                                            <p className="text-sm font-bold text-slate-600 uppercase tracking-widest">No matching assets found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.slice(searchTerm ? 0 : 3).map((item) => (
                                    <tr
                                        key={item.symbol}
                                        className="hover:bg-white/[0.02] group/row transition-all"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center font-bold text-xs text-slate-400 group-hover/row:bg-indigo-500/10 group-hover/row:text-indigo-400 transition-colors">
                                                    {item.symbol[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white group-hover/row:text-indigo-400 transition-colors flex items-center gap-2">
                                                        {item.symbol}
                                                        {item.score > 80 && <Trophy className="w-3 h-3 text-amber-400" />}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-medium truncate max-w-[150px]">{item.company_name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-1 rounded uppercase tracking-wider">
                                                {item.sector}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-black text-white w-8">{item.score}</span>
                                                <div className="flex-1 h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-500",
                                                            item.sentiment === "bullish" ? "bg-emerald-500" :
                                                                item.sentiment === "bearish" ? "bg-rose-500" : "bg-amber-500"
                                                        )}
                                                        style={{ width: `${item.score}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Zap className="w-3 h-3 text-indigo-400/50" />
                                                <span className="text-[10px] font-mono font-bold text-indigo-400/70">
                                                    {item.analysis_version || 'v0'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/terminal?ticker=${item.symbol}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 text-slate-400 hover:text-white transition-all group/btn"
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">Review Alpha</span>
                                                <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Footer Insight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GlassCard className="bg-indigo-500/5 border-indigo-500/10">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10">
                            <TrendingUp className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Market Drift Analysis</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Our engine detects a higher concentration of "Bullish" signals in the technology sector this week. Institutional accumulation patterns are appearing in Indian mid-caps.
                            </p>
                        </div>
                    </div>
                </GlassCard>
                <GlassCard className="bg-emerald-500/5 border-emerald-500/10">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10">
                            <BarChart3 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider">Top Sector: Technology</h3>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Tech stocks are currently showing an average Prometheus Score of 74, driven by strong quarterly momentum and low regulatory risk scores.
                            </p>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </motion.div>
    );
}
