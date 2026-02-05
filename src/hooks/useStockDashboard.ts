"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

// Simple in-memory cache for stock data
const dashboardCache: Record<string, {
    insight: any;
    tickerData: any;
    financials: any[];
    timestamp: number;
}> = {};

const pricesCache: Record<string, {
    prices: any[];
    timestamp: number;
}> = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useStockDashboard() {
    const [tickers, setTickers] = useState<any[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [insight, setInsight] = useState<any>(null);
    const [tickerData, setTickerData] = useState<any>(null);
    const [prices, setPrices] = useState<any[]>([]);
    const [financials, setFinancials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPrices, setLoadingPrices] = useState(false);
    const { toast } = useToast();
    const fetchedSymbols = useRef<Set<string>>(new Set());

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
        // Check cache first
        const cached = dashboardCache[symbol];
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            setInsight(cached.insight);
            setTickerData(cached.tickerData);
            setFinancials(cached.financials);
            return;
        }

        const [insightsRes, profileRes, finDataRes] = await Promise.all([
            supabase
                .from('ai_insights')
                .select('*')
                .eq('symbol', symbol)
                .order('created_at', { ascending: false })
                .limit(1),
            supabase
                .from('tickers')
                .select('*')
                .eq('symbol', symbol)
                .single(),
            supabase
                .from('financials')
                .select('*')
                .eq('symbol', symbol)
                .order('period', { ascending: false })
                .limit(20)
        ]);

        const insights = insightsRes.data;
        const profile = profileRes.data;
        const finData = finDataRes.data;

        const insightVal = (insights && insights.length > 0) ? insights[0] : null;
        const profileVal = profile || null;
        const financialsVal = finData || [];

        setInsight(insightVal);
        setTickerData(profileVal);
        setFinancials(financialsVal);

        // Update cache
        dashboardCache[symbol] = {
            insight: insightVal,
            tickerData: profileVal,
            financials: financialsVal,
            timestamp: Date.now()
        };
    }, []);

    const fetchPrices = useCallback(async (symbol: string) => {
        // Check cache first
        const cached = pricesCache[symbol];
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
            setPrices(cached.prices);
            return;
        }

        setLoadingPrices(true);
        try {
            const isIndianStock = symbol.endsWith('.NS') || symbol.endsWith('.BO') || tickers.find(t => t.symbol === symbol)?.market === 'INDIA';
            let effectiveSymbol = symbol;
            if (isIndianStock && !symbol.includes('.')) {
                effectiveSymbol = `${symbol}.NS`;
            }

            const response = await fetch(`/api/stock/historical/${effectiveSymbol}`);
            if (response.ok) {
                const livePrices = await response.json();
                if (livePrices && livePrices.length > 0) {
                    const mappedPrices = livePrices.map((p: any) => ({
                        date: p.date,
                        open: p.open,
                        high: p.high,
                        low: p.low,
                        close: p.close,
                        volume: p.volume
                    }));
                    setPrices(mappedPrices);

                    // Update cache
                    pricesCache[symbol] = {
                        prices: mappedPrices,
                        timestamp: Date.now()
                    };
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingPrices(false);
        }
    }, [tickers]);

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
                // Clear cache on update to get fresh data
                delete dashboardCache[selectedSymbol];
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
                delete dashboardCache[selectedSymbol];
                fetchTickerDetails(selectedSymbol);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [selectedSymbol, fetchTickerDetails, fetchPrices, toast]);

    return {
        tickers,
        selectedSymbol,
        setSelectedSymbol,
        insight,
        tickerData,
        prices,
        financials,
        loading,
        loadingPrices
    };
}
