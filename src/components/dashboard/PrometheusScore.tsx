import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChevronDown, ChevronUp, Calculator, Settings2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface PrometheusScoreProps {
    metadata: any;
}

export const PrometheusScore = ({ metadata }: PrometheusScoreProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [weights, setWeights] = useState({ financial: 40, sec: 30, sentiment: 30 });

    if (!metadata?.prometheus_score) return null;

    const breakdown = metadata.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0 };
    const drivers = metadata.financial_score_drivers || [];
    const finSubscores = metadata.financial_subscores;

    const adjustWeights = (category: 'financial' | 'sec' | 'sentiment', val: number) => {
        const diff = val - weights[category];
        const remaining = 100 - val;

        // If adjusting to 100, others become 0
        if (remaining === 0) {
            setWeights({
                financial: category === 'financial' ? 100 : 0,
                sec: category === 'sec' ? 100 : 0,
                sentiment: category === 'sentiment' ? 100 : 0
            });
            return;
        }

        // Get current values of the OTHER two
        const otherKeys = Object.keys(weights).filter(k => k !== category) as ('financial' | 'sec' | 'sentiment')[];
        const k1 = otherKeys[0];
        const k2 = otherKeys[1];
        const sumOthers = weights[k1] + weights[k2];

        let newK1 = 0;
        let newK2 = 0;

        if (sumOthers === 0) {
            // Split evenly if they were both 0
            newK1 = Math.floor(remaining / 2);
            newK2 = remaining - newK1;
        } else {
            // Distribute proportionally
            newK1 = Math.round(remaining * (weights[k1] / sumOthers));
            newK2 = remaining - newK1;
        }

        setWeights(prev => ({
            ...prev,
            [category]: val,
            [k1]: newK1,
            [k2]: newK2
        }));
    };

    // Recalculate score based on user weights
    const totalWeight = weights.financial + weights.sec + weights.sentiment;
    const computedScore = Math.round(
        ((breakdown.financial_score * weights.financial) +
            (breakdown.sec_score * weights.sec) +
            (breakdown.sentiment_score * weights.sentiment)) / totalWeight
    );

    return (
        <div className="pb-6 border-b border-white/5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Prometheus Score</h4>
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
                <div className="mt-4 p-4 rounded-xl bg-slate-950/50 border border-white/5 space-y-4 animate-in slide-in-from-top-2 fade-in duration-300">
                    <div className="space-y-2">
                        <p className="text-[10px] text-slate-400 font-mono">
                            <span className="text-indigo-400">Score</span> = ({weights.financial}% × <span className="text-emerald-400">Financials</span>) + ({weights.sec}% × <span className="text-amber-400">SEC</span>) + ({weights.sentiment}% × <span className="text-sky-400">Sentiment</span>)
                        </p>
                        <div className="flex items-center gap-2 text-xs font-mono text-white">
                            <span>{computedScore}</span>
                            <span>=</span>
                            <span>({(breakdown.financial_score * weights.financial / 100).toFixed(1)})</span>
                            <span>+</span>
                            <span>({(breakdown.sec_score * weights.sec / 100).toFixed(1)})</span>
                            <span>+</span>
                            <span>({(breakdown.sentiment_score * weights.sentiment / 100).toFixed(1)})</span>
                        </div>
                    </div>

                    {/* Weight Sliders */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Settings2 className="w-3 h-3" /> Adjust Weights
                        </h5>
                        <div className="space-y-3">
                            <div>
                                <div className="flex justify-between text-[10px] mb-1.5">
                                    <span className="text-emerald-400">Financials</span>
                                    <span className="text-slate-400">{weights.financial}%</span>
                                </div>
                                <Slider
                                    value={[weights.financial]}
                                    max={100}
                                    step={5}
                                    className="[&>.bg-primary]:bg-emerald-500"
                                    onValueChange={(val: number[]) => adjustWeights('financial', val[0])}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] mb-1.5">
                                    <span className="text-amber-400">SEC Risk</span>
                                    <span className="text-slate-400">{weights.sec}%</span>
                                </div>
                                <Slider
                                    value={[weights.sec]}
                                    max={100}
                                    step={5}
                                    className="[&>.bg-primary]:bg-amber-500"
                                    onValueChange={(val: number[]) => adjustWeights('sec', val[0])}
                                />
                            </div>
                            <div>
                                <div className="flex justify-between text-[10px] mb-1.5">
                                    <span className="text-sky-400">Market Sentiment</span>
                                    <span className="text-slate-400">{weights.sentiment}%</span>
                                </div>
                                <Slider
                                    value={[weights.sentiment]}
                                    max={100}
                                    step={5}
                                    className="[&>.bg-primary]:bg-sky-500"
                                    onValueChange={(val: number[]) => adjustWeights('sentiment', val[0])}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Deep Financial Formula */}
                    {finSubscores && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase">Financial Logic Engine</h5>
                            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/10">
                                <div className="text-[10px] text-emerald-100/70 font-mono mb-2">
                                    {metadata.financial_formula || "Financial Score = (0.4 × Profit) + (0.4 × Growth) + (0.2 × Solvency)"}
                                </div>
                                <div className="flex justify-between gap-1 text-[9px] font-bold uppercase text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <span className="text-emerald-400 text-base">{finSubscores.profitability}</span>
                                        <span>Profitability</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-emerald-400 text-base">{finSubscores.growth}</span>
                                        <span>Growth</span>
                                    </div>
                                    <div className="flex flex-col items-center">
                                        <span className="text-emerald-400 text-base">{finSubscores.solvency}</span>
                                        <span>Solvency</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Breakdown */}
                    {drivers.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase">Financial Drivers</h5>
                            <div className="space-y-1">
                                {drivers.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-300">{d.label}</span>
                                        <span className={d.impact === 'positive' ? 'text-emerald-400' : 'text-red-400'}>
                                            {d.impact === 'positive' ? '+' : '-'}{d.weight === 'high' ? 'High' : 'Low'} Impact
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 pt-4 border-t border-white/5">
                        <h5 className="text-[10px] font-bold text-slate-500 uppercase">Analysis Logic</h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed italic">
                            "{metadata.score_criteria}"
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
