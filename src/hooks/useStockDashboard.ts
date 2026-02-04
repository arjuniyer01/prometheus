"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";

export function useStockDashboard() {
    const [tickers, setTickers] = useState<any[]>([]);
    const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
    const [insight, setInsight] = useState<any>(null);
    const [tickerData, setTickerData] = useState<any>(null);
    const [prices, setPrices] = useState<any[]>([]);
    const [smhPrices, setSmhPrices] = useState<any[]>([]);
    const [financials, setFinancials] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingPrices, setLoadingPrices] = useState(false);
    const { toast } = useToast();

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
        const { data: insights } = await supabase
            .from('ai_insights')
            .select('*')
            .eq('symbol', symbol)
            .order('created_at', { ascending: false })
            .limit(1);

        const { data: profile } = await supabase
            .from('tickers')
            .select('*')
            .eq('symbol', symbol)
            .single();

        const { data: finData } = await supabase
            .from('financials')
            .select('*')
            .eq('symbol', symbol)
            .order('period', { ascending: false })
            .limit(20);

        if (insights && insights.length > 0) setInsight(insights[0]);
        else setInsight(null);

        if (profile) {
            setTickerData(profile);
            // If it's a semiconductor company, ensure we have SMH prices for technical analysis
            const semiIndustries = ["Semiconductors", "Semiconductor Equipment & Materials", "Semiconductor Equipment"];
            if (semiIndustries.includes(profile.industry)) {
                fetchPrices("SMH", true);
            }
        }
        if (finData) setFinancials(finData);
    }, []);

    const fetchPrices = useCallback(async (symbol: string, isSectorBenchmark: boolean = false) => {
        if (!isSectorBenchmark) {
            setLoadingPrices(true);
            setPrices([]);
        }
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
                    const formattedPrices = livePrices.map((p: any) => ({
                        date: p.date,
                        open: p.open,
                        high: p.high,
                        low: p.low,
                        close: p.close,
                        volume: p.volume
                    }));

                    if (isSectorBenchmark) {
                        setSmhPrices(formattedPrices);
                    } else {
                        setPrices(formattedPrices);
                    }
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (!isSectorBenchmark) {
                setLoadingPrices(false);
            }
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
        loadingPrices,
        smhPrices
    };
}
