"use client";

import { useMemo } from 'react';
import { Calculator, TrendingUp, TrendingDown, Info, ShieldAlert } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DCFAnalysisProps {
    insight: any;
    tickerData: any;
}

export function DCFAnalysis({ insight, tickerData }: DCFAnalysisProps) {
    const dcfData = useMemo(() => {
        const metrics = insight?.metadata?.raw_research_dump?.extended_metrics;
        if (!metrics) return null;

        const fcf = metrics.freeCashFlow || 0;
        const growthRate = metrics.earningsGrowth || metrics.revenueGrowth || 0.1;
        const beta = metrics.beta || 1.0;
        const shares = metrics.sharesOutstanding || 1;
        const totalCash = metrics.totalCash || 0;
        const totalDebt = metrics.totalDebt || 0;
        const currentPrice = insight?.metadata?.price || 0;

        // Sensible limits for growth
        const cappedGrowth = Math.min(Math.max(growthRate, 0.02), 0.25);

        // Cost of Equity using CAPM: Rf + Beta * ERP
        const rf = 0.043; // 4.3% Treasury
        const erp = 0.055; // 5.5% Equity Risk Premium
        const wacc = Math.max(rf + beta * erp, 0.07); // Floor at 7%

        const terminalGrowth = 0.025; // 2.5% long-term

        // 5-Year Projections
        let totalPresentValue = 0;
        let currentFCF = fcf;
        const projections = [];

        for (let i = 1; i <= 5; i++) {
            currentFCF = currentFCF * (1 + cappedGrowth);
            const pv = currentFCF / Math.pow(1 + wacc, i);
            totalPresentValue += pv;
            projections.push({ year: i, fcf: currentFCF, pv });
        }

        // Terminal Value
        const terminalValue = (currentFCF * (1 + terminalGrowth)) / (wacc - terminalGrowth);
        const pvTerminalValue = terminalValue / Math.pow(1 + wacc, 5);

        const enterpriseValue = totalPresentValue + pvTerminalValue;
        const equityValue = enterpriseValue + totalCash - totalDebt;
        const intrinsicValue = equityValue / shares;

        const upside = ((intrinsicValue - currentPrice) / currentPrice) * 100;

        return {
            intrinsicValue,
            currentPrice,
            upside,
            wacc,
            growth: cappedGrowth,
            terminalGrowth,
            fcf,
            shares,
            totalCash,
            totalDebt
        };
    }, [insight]);

    if (!dcfData || dcfData.intrinsicValue <= 0) {
        return (
            <GlassCard className="p-6 border-white/5 bg-white/[0.01] flex flex-col items-center justify-center min-h-[200px] text-center">
                <ShieldAlert className="w-8 h-8 text-slate-700 mb-3" />
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">DCF Valuation Unavailable</h4>
                <p className="text-[10px] text-slate-600 mt-2 max-w-[200px]">Insufficient free cash flow or projection data to generate intrinsic value model.</p>
            </GlassCard>
        );
    }

    const isUndervalued = dcfData.upside > 0;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-indigo-400" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Discounted Cash Flow (DCF)</h2>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-slate-500 hover:text-white transition-colors" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-slate-900 border-white/10 text-[10px] max-w-xs p-3 leading-relaxed">
                            Intrinsic value calculated using a 5-year Free Cash Flow projection model.
                            Uses CAPM for WACC ({(dcfData.wacc * 100).toFixed(1)}%) and
                            historical growth trends ({(dcfData.growth * 100).toFixed(1)}%).
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            <GlassCard className={cn(
                "p-6 transition-all border-l-4",
                isUndervalued ? "border-l-emerald-500 bg-emerald-500/[0.02]" : "border-l-rose-500 bg-rose-500/[0.02]"
            )}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] block mb-1">Intrinsic Value</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-3xl font-black font-outfit text-white tracking-tighter">
                                    {dcfData.intrinsicValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className="text-xs font-bold text-slate-500 uppercase">{insight?.metadata?.currency || 'USD'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Market Price</span>
                                <span className="text-sm font-bold font-mono text-slate-300">
                                    {dcfData.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className={cn(
                                "p-3 rounded-2xl border flex flex-col justify-center",
                                isUndervalued ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"
                            )}>
                                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Potential Upside</span>
                                <div className="flex items-center gap-1">
                                    {isUndervalued ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                                    <span className={cn(
                                        "text-sm font-black font-mono",
                                        isUndervalued ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {dcfData.upside > 0 ? '+' : ''}{dcfData.upside.toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 md:pt-0 md:border-l md:border-white/5 md:pl-8">
                        <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Model Assumptions</h4>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between group">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">Discount Rate (WACC)</span>
                                <span className="text-[10px] font-mono font-bold text-white bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{(dcfData.wacc * 100).toFixed(2)}%</span>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">Est. Growth (5Y)</span>
                                <span className="text-[10px] font-mono font-bold text-white bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{(dcfData.growth * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between group">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors">Terminal Growth</span>
                                <span className="text-[10px] font-mono font-bold text-white bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{(dcfData.terminalGrowth * 100).toFixed(1)}%</span>
                            </div>
                            <div className="mt-4 p-3 rounded-xl bg-black/20 border border-white/5 space-y-2">
                                <div className="flex justify-between text-[8px] font-mono">
                                    <span className="text-slate-500">Net Cash/Debt</span>
                                    <span className={cn(dcfData.totalCash - dcfData.totalDebt >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {(dcfData.totalCash - dcfData.totalDebt >= 0 ? '+' : '')}
                                        {insight?.metadata?.currency === 'INR'
                                            ? `${((dcfData.totalCash - dcfData.totalDebt) / 1e7).toFixed(1)}Cr`
                                            : `${((dcfData.totalCash - dcfData.totalDebt) / 1e9).toFixed(1)}B`}
                                    </span>
                                </div>
                                <div className="flex justify-between text-[8px] font-mono">
                                    <span className="text-slate-500">Starting FCF</span>
                                    <span className="text-slate-300">
                                        {insight?.metadata?.currency === 'INR'
                                            ? `${(dcfData.fcf / 1e7).toFixed(1)}Cr`
                                            : `${(dcfData.fcf / 1e9).toFixed(1)}B`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </GlassCard>
        </div>
    );
}
