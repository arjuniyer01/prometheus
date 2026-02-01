import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChevronDown, ChevronUp, Calculator, Settings2, Info } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface PrometheusScoreProps {
    metadata: any;
}

const WeightKnob = ({ label, value, color, onChange }: { label: string, value: number, color: string, onChange: (v: number) => void }) => {
    const colorMap: Record<string, string> = {
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };

    const barColorMap: Record<string, string> = {
        emerald: 'bg-emerald-500/40',
        amber: 'bg-amber-500/40',
        sky: 'bg-sky-500/40',
        purple: 'bg-purple-500/40',
        rose: 'bg-rose-500/40',
        orange: 'bg-orange-500/40',
    };

    return (
        <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-2 pr-3 rounded-2xl group transition-all hover:bg-white/[0.04]">
            <div className={cn("w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-[10px]", colorMap[color])}>
                {value}%
            </div>
            <div className="flex-1">
                <div className="flex justify-between text-[8px] mb-1">
                    <span className="text-slate-500 uppercase font-black tracking-[0.15em]">{label}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-500", barColorMap[color])}
                        style={{ width: `${value}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(Math.max(0, value - 5))}
                    className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-slate-400 active:scale-95 transition-all text-xs"
                >
                    -
                </button>
                <button
                    onClick={() => onChange(Math.min(100, value + 5))}
                    className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center hover:bg-indigo-500/20 hover:text-white text-slate-200 font-bold active:scale-95 transition-all text-xs"
                >
                    +
                </button>
            </div>
        </div>
    );
};

export const PrometheusScore = ({ metadata }: PrometheusScoreProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [weights, setWeights] = useState({ financial: 25, sec: 15, sentiment: 15, trend: 15, sector: 15, institutional: 15 });

    // Reset weights based on market context when metadata changes
    useEffect(() => {
        if (metadata?.currency === 'INR' || metadata?.symbol?.endsWith('.NS') || metadata?.symbol?.endsWith('.BO')) {
            setWeights({
                financial: 30,
                sec: 0,
                sentiment: 15,
                trend: 15,
                sector: 20,
                institutional: 20
            });
        } else {
            setWeights({
                financial: 25,
                sec: 15,
                sentiment: 15,
                trend: 15,
                sector: 15,
                institutional: 15
            });
        }
    }, [metadata?.currency, metadata?.symbol]);

    if (!metadata?.prometheus_score) return null;

    const breakdown = metadata.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0, trend_score: 0, sector_score: 0, institutional_score: 0 };
    const drivers = metadata.financial_score_drivers || [];
    const finSubscores = metadata.financial_subscores || { profitability: 0, growth: 0, solvency: 0 };
    const trendSubscores = metadata.trend_subscores || { quarterly_momentum: 0, annual_stability: 0 };
    const sectorSubscores = metadata.sector_subscores || { outperformance: 0, seasonality_strength: 0, rotation_inflow: 0 };
    const institutionalSubscores = metadata.institutional_subscores || { analyst_conviction: 0, insider_signal: 0, earnings_reliability: 0 };

    const adjustWeights = (category: keyof typeof weights, val: number) => {
        const remaining = 100 - val;
        const otherKeys = (Object.keys(weights) as (keyof typeof weights)[]).filter(k => k !== category);
        const sumOthers = otherKeys.reduce((acc, k) => acc + weights[k], 0);

        let newWeights = { ...weights, [category]: val };

        if (sumOthers === 0) {
            const share = Math.floor(remaining / otherKeys.length);
            otherKeys.forEach((k, i) => {
                newWeights[k] = i === otherKeys.length - 1 ? remaining - (share * (otherKeys.length - 1)) : share;
            });
        } else {
            let currentSum = 0;
            otherKeys.forEach((k, i) => {
                const newVal = i === otherKeys.length - 1
                    ? remaining - currentSum
                    : Math.round(remaining * (weights[k] / sumOthers));
                newWeights[k] = newVal;
                currentSum += newVal;
            });
        }
        setWeights(newWeights);
    };

    const totalWeight = weights.financial + weights.sec + weights.sentiment + weights.trend + weights.sector + weights.institutional;
    const computedScore = Math.round(
        (((breakdown.financial_score || 0) * weights.financial) +
            ((breakdown.sec_score || 0) * weights.sec) +
            ((breakdown.sentiment_score || 0) * weights.sentiment) +
            ((breakdown.trend_score || 0) * weights.trend) +
            ((breakdown.sector_score || 0) * weights.sector) +
            ((breakdown.institutional_score || 0) * weights.institutional)) / totalWeight
    ) || 0;

    return (
        <div className="pb-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Prometheus Score</h4>
                    <div className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[7px] font-black text-indigo-300">
                        {metadata.sector || 'GENERAL'}
                    </div>
                </div>
                <div className="text-2xl font-bold font-outfit text-white">{computedScore}<span className="text-sm text-slate-500">/100</span></div>
            </div>

            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden w-full mb-4">
                <div
                    className={cn(
                        "h-full transition-all duration-300",
                        computedScore >= 70 ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                            computedScore >= 40 ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                                "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                    )}
                    style={{ width: `${computedScore}%` }}
                />
            </div>

            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
            >
                <Calculator className="w-3 h-3" />
                <span>View Formula & Replicate</span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isExpanded && (
                <TooltipProvider>
                    <div className="mt-4 p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                <span>Weighted Algorithm</span>
                                <span className="flex items-center gap-1 text-slate-500">
                                    <Info className="w-3 h-3" />
                                    Hover for details
                                </span>
                            </div>

                            <p className="text-[12px] text-slate-300 font-mono leading-relaxed flex flex-wrap items-center">
                                <span className="text-indigo-400 font-black mr-2">Score =</span>
                                <span className="inline-flex items-center whitespace-nowrap">
                                    <span className="text-slate-500">(</span>{weights.financial}% ×
                                    <Tooltip>
                                        <TooltipTrigger className="mx-1 text-emerald-400 underline decoration-emerald-500/30 underline-offset-4">Fin</TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-emerald-500/20 text-slate-200">
                                            <div className="text-xs space-y-1">
                                                <div className="font-bold border-b border-white/10 pb-1 mb-1">Financial Score: {breakdown.financial_score}</div>
                                                <div className="flex justify-between gap-4"><span>Profitability:</span> <span>{finSubscores.profitability}</span></div>
                                                <div className="flex justify-between gap-4"><span>Growth:</span> <span>{finSubscores.growth}</span></div>
                                                <div className="flex justify-between gap-4"><span>Solvency:</span> <span>{finSubscores.solvency}</span></div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-slate-500">)</span>
                                </span>
                                {metadata?.currency !== 'INR' && (
                                    <>
                                        <span className="mx-1 text-slate-600">+</span>
                                        <span className="inline-flex items-center whitespace-nowrap">
                                            <span className="text-slate-500">(</span>{weights.sec}% ×
                                            <Tooltip>
                                                <TooltipTrigger className="mx-1 text-amber-400 underline decoration-amber-500/30 underline-offset-4">Regl</TooltipTrigger>
                                                <TooltipContent className="bg-slate-900 border-amber-500/20 text-xs text-slate-200">
                                                    <div className="font-bold border-b border-white/10 pb-1 mb-1">Regulatory Score: {breakdown.sec_score}</div>
                                                    <p className="w-32">Risk analysis of recent SEC filings and corporate actions.</p>
                                                </TooltipContent>
                                            </Tooltip>
                                            <span className="text-slate-500">)</span>
                                        </span>
                                    </>
                                )}
                                <span className="mx-1 text-slate-600">+</span>
                                <span className="inline-flex items-center whitespace-nowrap">
                                    <span className="text-slate-500">(</span>{weights.sentiment}% ×
                                    <Tooltip>
                                        <TooltipTrigger className="mx-1 text-sky-400 underline decoration-sky-500/30 underline-offset-4">Sent</TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-sky-500/20 text-xs text-slate-200">
                                            <div className="font-bold border-b border-white/10 pb-1 mb-1">Sentiment Score: {breakdown.sentiment_score}</div>
                                            <p className="w-32">AI synthesis of news headlines and market tone.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-slate-500">)</span>
                                </span>
                                <span className="mx-1 text-slate-600">+</span>
                                <span className="inline-flex items-center whitespace-nowrap">
                                    <span className="text-slate-500">(</span>{weights.trend}% ×
                                    <Tooltip>
                                        <TooltipTrigger className="mx-1 text-purple-400 underline decoration-purple-500/30 underline-offset-4">Trend</TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-purple-500/20 text-xs space-y-1 text-slate-200">
                                            <div className="font-bold border-b border-white/10 pb-1 mb-1">Trend Score: {breakdown.trend_score}</div>
                                            <div className="flex justify-between gap-4"><span>Momentum:</span> <span>{trendSubscores.quarterly_momentum}</span></div>
                                            <div className="flex justify-between gap-4"><span>Stability:</span> <span>{trendSubscores.annual_stability}</span></div>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-slate-500">)</span>
                                </span>
                                <span className="mx-1 text-slate-600">+</span>
                                <span className="inline-flex items-center whitespace-nowrap">
                                    <span className="text-slate-500">(</span>{weights.sector}% ×
                                    <Tooltip>
                                        <TooltipTrigger className="mx-1 text-rose-400 underline decoration-rose-500/30 underline-offset-4">Sect</TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-rose-500/20 text-xs space-y-1 text-slate-200">
                                            <div className="font-bold border-b border-white/10 pb-1 mb-1">Sector Score: {breakdown.sector_score}</div>
                                            <div className="flex justify-between gap-4"><span>Vs Sector:</span> <span>{sectorSubscores.outperformance}</span></div>
                                            <div className="flex justify-between gap-4"><span>Seasonality:</span> <span>{sectorSubscores.seasonality_strength}</span></div>
                                            <div className="flex justify-between gap-4"><span>Rotation:</span> <span>{sectorSubscores.rotation_inflow}</span></div>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-slate-500">)</span>
                                </span>
                                <span className="mx-1 text-slate-600">+</span>
                                <span className="inline-flex items-center whitespace-nowrap">
                                    <span className="text-slate-500">(</span>{weights.institutional}% ×
                                    <Tooltip>
                                        <TooltipTrigger className="mx-1 text-orange-400 underline decoration-orange-500/30 underline-offset-4">Intel</TooltipTrigger>
                                        <TooltipContent className="bg-slate-900 border-orange-500/20 text-xs space-y-1 text-slate-200">
                                            <div className="font-bold border-b border-white/10 pb-1 mb-1">Institutional Score: {breakdown.institutional_score}</div>
                                            <div className="flex justify-between gap-4"><span>Analysts:</span> <span>{institutionalSubscores.analyst_conviction}</span></div>
                                            <div className="flex justify-between gap-4"><span>Insiders:</span> <span>{institutionalSubscores.insider_signal}</span></div>
                                            <div className="flex justify-between gap-4"><span>Surprises:</span> <span>{institutionalSubscores.earnings_reliability}</span></div>
                                        </TooltipContent>
                                    </Tooltip>
                                    <span className="text-slate-500">)</span>
                                </span>
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white bg-black/20 p-2 rounded-lg border border-white/5">
                                <span className="text-indigo-300">{computedScore}</span>
                                <span className="text-slate-600">=</span>
                                <span className="text-emerald-300/80">({((breakdown.financial_score || 0) * weights.financial / 100).toFixed(1)})</span>
                                {metadata?.currency !== 'INR' && (
                                    <>
                                        <span className="text-slate-600">+</span>
                                        <span className="text-amber-300/80">({((breakdown.sec_score || 0) * weights.sec / 100).toFixed(1)})</span>
                                    </>
                                )}
                                <span className="text-slate-600">+</span>
                                <span className="text-sky-300/80">({((breakdown.sentiment_score || 0) * weights.sentiment / 100).toFixed(1)})</span>
                                <span className="text-slate-600">+</span>
                                <span className="text-purple-300/80">({((breakdown.trend_score || 0) * weights.trend / 100).toFixed(1)})</span>
                                <span className="text-slate-600">+</span>
                                <span className="text-rose-300/80">({((breakdown.sector_score || 0) * weights.sector / 100).toFixed(1)})</span>
                                <span className="text-slate-600">+</span>
                                <span className="text-orange-300/80">({((breakdown.institutional_score || 0) * weights.institutional / 100).toFixed(1)})</span>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                    <Settings2 className="w-3 h-3" /> Priority Knobs
                                </h5>
                                <div className="flex gap-2">
                                    {[
                                        { label: 'Bal', w: { financial: 20, sec: 15, sentiment: 15, trend: 15, sector: 15, institutional: 20 } },
                                        { label: 'Value', w: { financial: 40, sec: 15, sentiment: 5, trend: 10, sector: 15, institutional: 15 } },
                                        { label: 'Intel', w: { financial: 10, sec: 10, sentiment: 10, trend: 10, sector: 10, institutional: 50 } },
                                    ].map((preset) => (
                                        <button
                                            key={preset.label}
                                            onClick={() => setWeights(preset.w)}
                                            className="text-[8px] font-black uppercase px-2 py-1 rounded bg-white/5 border border-white/5 hover:bg-indigo-500/20 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 transition-all"
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                                <WeightKnob label="Financials" value={weights.financial} color="emerald" onChange={(v) => adjustWeights('financial', v)} />
                                {metadata?.currency !== 'INR' && (
                                    <WeightKnob label="Regulatory" value={weights.sec} color="amber" onChange={(v) => adjustWeights('sec', v)} />
                                )}
                                <WeightKnob label="Sentiment" value={weights.sentiment} color="sky" onChange={(v) => adjustWeights('sentiment', v)} />
                                <WeightKnob label="Momentum" value={weights.trend} color="purple" onChange={(v) => adjustWeights('trend', v)} />
                                <WeightKnob label="Sector" value={weights.sector} color="rose" onChange={(v) => adjustWeights('sector', v)} />
                                <WeightKnob label="Intelligence" value={weights.institutional} color="orange" onChange={(v) => adjustWeights('institutional', v)} />
                            </div>
                        </div>
                    </div>
                </TooltipProvider>
            )}
        </div>
    );
};
