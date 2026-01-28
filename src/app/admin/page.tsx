"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { GlassCard } from "@/components/ui/GlassCard";
import { Loader2, Plus, RotateCcw, ShieldCheck, LogOut, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function AdminPage() {
    const [password, setPassword] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newTicker, setNewTicker] = useState("");
    const [addingTicker, setAddingTicker] = useState(false);
    const [tickers, setTickers] = useState<any[]>([]);
    const { toast } = useToast();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Fetch the fixed password from Supabase
            // Assuming a table 'admin_config' with config_key='admin_password'
            const { data, error } = await supabase
                .from('admin_config')
                .select('config_value')
                .eq('config_key', 'admin_password')
                .single();

            if (error || !data) {
                // If table doesn't exist, we might want to check an env var or show an error
                console.error("Supabase error or no data:", error);
                toast({
                    title: "Configuration Error",
                    description: "Admin password not found in Supabase. Ensure 'admin_config' table exists with 'admin_password' key.",
                    variant: "destructive",
                });
                setLoading(false);
                return;
            }

            if (password === data.config_value) {
                setIsAuthorized(true);
                sessionStorage.setItem("admin_auth_prometheus", "true");
                toast({
                    title: "Access Granted",
                    description: "Welcome back, Commander.",
                });
            } else {
                toast({
                    title: "Invalid Access Key",
                    description: "The provided password does not match our records.",
                    variant: "destructive",
                });
            }
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Connection Error",
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionStorage.getItem("admin_auth_prometheus") === "true") {
            setIsAuthorized(true);
        }
    }, []);

    useEffect(() => {
        if (isAuthorized) {
            const fetchTickers = async () => {
                const { data } = await supabase.from('tickers').select('*').order('symbol');
                if (data) setTickers(data);
            };
            fetchTickers();

            const channel = supabase
                .channel('admin-ticker-updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tickers' }, () => {
                    fetchTickers();
                })
                .subscribe();

            return () => { supabase.removeChannel(channel); };
        }
    }, [isAuthorized]);

    const [market, setMarket] = useState<'US' | 'INDIA'>('US');

    const handleAddTicker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTicker) return;

        setAddingTicker(true);
        const upperTicker = newTicker.toUpperCase();

        try {
            const endpoint = market === 'INDIA' ? '/api/analyze/india' : '/api/analyze';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: upperTicker })
            });

            if (!res.ok) throw new Error("Failed to trigger analysis");

            // Optimistic update for new ticker
            const tempTicker = {
                symbol: upperTicker,
                company_name: 'Initializing...',
                market: market,
                sync_status: 'QUEUED',
                sync_percent: 1
            };
            setTickers(prev => [...prev, tempTicker].sort((a, b) => a.symbol.localeCompare(b.symbol)));

            toast({

                title: `${market} Analysis Initialized`,
                description: `Deep scan for ${upperTicker} is now in the queue.`,
            });
            setNewTicker("");
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Operation Failed",
                description: err.message,
                variant: "destructive"
            });
        } finally {
            setAddingTicker(false);
        }
    };


    const handleRegenerate = async (symbol: string) => {
        const ticker = tickers.find(t => t.symbol === symbol);
        const tickerMarket = ticker?.market || 'US';

        try {
            const endpoint = tickerMarket === 'INDIA' ? '/api/analyze/india' : '/api/analyze';
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker: symbol })
            });

            if (!res.ok) throw new Error("Failed to trigger regeneration");

            // Optimistic update
            setTickers(prev => prev.map(t => t.symbol === symbol ? { ...t, sync_status: 'QUEUED', sync_percent: 1 } : t));

            toast({

                title: "Regeneration Started",
                description: `Forcing fresh ${tickerMarket} synthesis for ${symbol}...`,
            });
        } catch (err: any) {
            console.error(err);
            toast({
                title: "Regeneration Failed",
                description: err.message,
                variant: "destructive"
            });
        }
    };


    const handleLogout = () => {
        sessionStorage.removeItem("admin_auth_prometheus");
        setIsAuthorized(false);
        toast({
            title: "Logged Out",
            description: "Admin session terminated.",
        });
    };

    if (!isAuthorized) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <div className="mb-8 flex flex-col items-center">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Prometheus Admin</h1>
                    <p className="text-slate-500 text-sm mt-2">Authorization required for system overrides</p>
                </div>

                <GlassCard className="p-8 w-full max-w-md border-white/10 bg-white/[0.02]" hoverEffect={false}>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Access Key</label>
                            <input
                                type="password"
                                placeholder="••••••••••••"
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all text-center tracking-[0.5em] text-lg"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-14 bg-white text-black font-bold rounded-2xl hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-sm uppercase tracking-widest"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
                        </button>

                        <Link href="/" className="block text-center text-xs text-slate-600 hover:text-slate-400 underline underline-offset-4 decoration-slate-800">
                            Return to Public Dashboard
                        </Link>
                    </form>
                </GlassCard>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-6 space-y-12">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">System Control</h1>
                        <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mt-1">Operational Environment</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase tracking-widest transition-all border border-white/5">
                        Public View
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase tracking-widest transition-all border border-red-500/20"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Plus className="w-4 h-4 text-slate-400" />
                        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Initialize Analysis</h2>
                    </div>

                    <GlassCard className="p-6 border-white/5 bg-white/[0.02]" hoverEffect={false}>
                        <form onSubmit={handleAddTicker} className="space-y-4">
                            <p className="text-xs text-slate-500 leading-relaxed mb-6">
                                Enter a ticker symbol to begin deep synthesis. This will trigger the market-specific workflow.
                            </p>

                            <div className="flex bg-white/5 rounded-xl p-1 mb-4 border border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setMarket('US')}
                                    className={cn(
                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                        market === 'US' ? "bg-white text-black shadow-lg" : "text-slate-500 hover:text-white"
                                    )}
                                >
                                    US Market
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMarket('INDIA')}
                                    className={cn(
                                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
                                        market === 'INDIA' ? "bg-emerald-500 text-black shadow-lg" : "text-slate-500 hover:text-emerald-400"
                                    )}
                                >
                                    India Market
                                </button>
                            </div>

                            <input
                                placeholder={market === 'US' ? "e.g. NVDA, AAPL" : "e.g. LENSKART, RELIANCE"}
                                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white focus:outline-none focus:ring-1 focus:ring-white/50 uppercase text-lg font-mono font-bold"
                                value={newTicker}
                                onChange={(e) => setNewTicker(e.target.value)}
                            />

                            <button
                                type="submit"
                                disabled={addingTicker || !newTicker}
                                className="w-full h-14 rounded-2xl bg-white text-black font-bold hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                {addingTicker ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Analysis</>}
                            </button>
                        </form>
                    </GlassCard>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <RotateCcw className="w-4 h-4 text-slate-400" />
                            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Universe Management</h2>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 bg-white/5 px-2 py-0.5 rounded uppercase tracking-wider">
                            {tickers.length} Assets Tracked
                        </span>
                    </div>

                    <GlassCard className="p-0 border-white/5 bg-white/[0.02] overflow-hidden" hoverEffect={false}>
                        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-white/5">
                                {tickers.length > 0 ? tickers.map(t => (
                                    <div key={t.symbol} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center border border-white/5 font-mono font-bold text-white text-sm">
                                                {t.symbol[0]}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="text-base font-bold text-white font-mono leading-none">{t.symbol}</div>
                                                    <div className={cn(
                                                        "text-[8px] font-bold px-1.5 py-0.5 rounded border",
                                                        t.market === 'INDIA' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/10 border-white/20 text-slate-400"
                                                    )}>
                                                        {t.market || 'US'}
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider truncate max-w-[200px]">{t.company_name}</div>

                                                {t.sync_status && t.sync_status !== 'IDLE' && (
                                                    <div className="mt-2 w-full max-w-[150px] space-y-1">
                                                        <div className="flex justify-between text-[8px] font-bold uppercase tracking-tighter text-slate-400">
                                                            <span>{t.sync_status}</span>
                                                            <span>{t.sync_percent}%</span>
                                                        </div>
                                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-white transition-all duration-500 shadow-[0_0_8px_white]"
                                                                style={{ width: `${t.sync_percent}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleRegenerate(t.symbol)}

                                                disabled={t.sync_status && t.sync_status !== 'IDLE'}
                                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 transition-all text-[10px] font-bold uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t.sync_status && t.sync_status !== 'IDLE' ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <RotateCcw className="w-3 h-3" />
                                                )}
                                                {t.sync_status && t.sync_status !== 'IDLE' ? t.sync_status : 'Force Re-Sync'}
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-20 text-center text-slate-600 italic text-sm">
                                        No assets found in the registry.
                                    </div>
                                )}
                            </div>
                        </div>
                    </GlassCard>

                    <p className="text-[10px] text-slate-600 text-center uppercase tracking-[0.2em] font-medium">
                        Warning: Regeneration consumes Gemini & FMP API credits.
                    </p>
                </div>
            </div >
        </div >
    );
}
