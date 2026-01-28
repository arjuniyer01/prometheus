import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ChevronDown, ChevronUp, Calculator, Settings2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";

interface PrometheusScoreProps {
    metadata: any;
}

const WeightKnob = ({ label, value, color, onChange }: { label: string, value: number, color: string, onChange: (v: number) => void }) => {
    const colorMap: Record<string, string> = {
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 fill-emerald-500/40',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20 fill-amber-500/40',
        sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20 fill-sky-500/40',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20 fill-purple-500/40',
    };

    const barColorMap: Record<string, string> = {
        emerald: 'bg-emerald-500/40',
        amber: 'bg-amber-500/40',
        sky: 'bg-sky-500/40',
        purple: 'bg-purple-500/40',
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
                    onClick={() => onChange(value - 5)}
                    className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 text-slate-400 active:scale-95 transition-all text-xs"
                >
                    -
                </button>
                <button
                    onClick={() => onChange(value + 5)}
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
    const [weights, setWeights] = useState({ financial: 35, sec: 25, sentiment: 20, trend: 20 });

    if (!metadata?.prometheus_score) return null;

    const breakdown = metadata.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0, trend_score: 0 };
    const drivers = metadata.financial_score_drivers || [];
    const finSubscores = metadata.financial_subscores;
    const trendSubscores = metadata.trend_subscores;

    const adjustWeights = (category: 'financial' | 'sec' | 'sentiment' | 'trend', val: number) => {
        const diff = val - weights[category];
        const remaining = 100 - val;

        // If adjusting to 100, others become 0
        if (remaining === 0) {
            setWeights({
                financial: category === 'financial' ? 100 : 0,
                sec: category === 'sec' ? 100 : 0,
                sentiment: category === 'sentiment' ? 100 : 0,
                trend: category === 'trend' ? 100 : 0
            });
            return;
        }

        // Get current values of the OTHER three
        const otherKeys = Object.keys(weights).filter(k => k !== category) as ('financial' | 'sec' | 'sentiment' | 'trend')[];
        const k1 = otherKeys[0];
        const k2 = otherKeys[1];
        const k3 = otherKeys[2];
        const sumOthers = weights[k1] + weights[k2] + weights[k3];

        let newK1 = 0;
        let newK2 = 0;
        let newK3 = 0;

        if (sumOthers === 0) {
            // Split evenly if they were all 0
            newK1 = Math.floor(remaining / 3);
            newK2 = Math.floor(remaining / 3);
            newK3 = remaining - newK1 - newK2;
        } else {
            // Distribute proportionally
            newK1 = Math.round(remaining * (weights[k1] / sumOthers));
            newK2 = Math.round(remaining * (weights[k2] / sumOthers));
            newK3 = remaining - newK1 - newK2;
        }

        setWeights(prev => ({
            ...prev,
            [category]: val,
            [k1]: newK1,
            [k2]: newK2,
            [k3]: newK3
        }));
    };

    // Recalculate score based on user weights
    const totalWeight = weights.financial + weights.sec + weights.sentiment + weights.trend;
    const computedScore = Math.round(
        ((breakdown.financial_score * weights.financial) +
            (breakdown.sec_score * weights.sec) +
            (breakdown.sentiment_score * weights.sentiment) +
            (breakdown.trend_score * weights.trend)) / totalWeight
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
                            <span className="text-indigo-400">Score</span> = ({weights.financial}% × <span className="text-emerald-400">Fin</span>) + ({weights.sec}% × <span className="text-amber-400">Regl</span>) + ({weights.sentiment}% × <span className="text-sky-400">Sent</span>) + ({weights.trend}% × <span className="text-purple-400">Trend</span>)
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-white">
                            <span>{computedScore}</span>
                            <span>=</span>
                            <span>({(breakdown.financial_score * weights.financial / 100).toFixed(1)})</span>
                            <span>+</span>
                            <span>({(breakdown.sec_score * weights.sec / 100).toFixed(1)})</span>
                            <span>+</span>
                            <span>({(breakdown.sentiment_score * weights.sentiment / 100).toFixed(1)})</span>
                            <span>+</span>
                            <span>({(breakdown.trend_score * weights.trend / 100).toFixed(1)})</span>
                        </div>
                    </div>

                    {/* Precision Weight Controls */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Priority Knobs
                            </h5>
                            <div className="flex gap-2">
                                {[
                                    { label: 'Bal', w: { financial: 25, sec: 25, sentiment: 25, trend: 25 } },
                                    { label: 'Value', w: { financial: 50, sec: 30, sentiment: 10, trend: 10 } },
                                    { label: 'Risk', w: { financial: 20, sec: 50, sentiment: 10, trend: 20 } },
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
                            <WeightKnob
                                label="Financials"
                                value={weights.financial}
                                color="emerald"
                                onChange={(v) => adjustWeights('financial', v)}
                            />
                            <WeightKnob
                                label="Regulatory"
                                value={weights.sec}
                                color="amber"
                                onChange={(v) => adjustWeights('sec', v)}
                            />
                            <WeightKnob
                                label="Sentiment"
                                value={weights.sentiment}
                                color="sky"
                                onChange={(v) => adjustWeights('sentiment', v)}
                            />
                            <WeightKnob
                                label="Momentum"
                                value={weights.trend}
                                color="purple"
                                onChange={(v) => adjustWeights('trend', v)}
                            />
                        </div>
                    </div>

                    {/* Deep Financial Formula */}
                    {finSubscores && (
                        <div className="space-y-3 pt-4 border-t border-white/5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inference Engines</h5>
                            <div className="grid grid-cols-1 gap-4">
                                {/* FUNDAMENTAL ENGINE */}
                                <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 group transition-all hover:bg-white/[0.04]">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
                                    <div className="flex items-center justify-between mb-4">
                                        <h6 className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em]">Fundamental Engine</h6>
                                        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-bold text-emerald-400">CORE</div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-2xl font-bold text-emerald-400 font-outfit tracking-tighter">{finSubscores.profitability}</span>
                                            <span className="text-[7px] uppercase text-slate-500 font-black tracking-wide mt-1">Profitability</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-2xl font-bold text-emerald-400 font-outfit tracking-tighter">{finSubscores.growth}</span>
                                            <span className="text-[7px] uppercase text-slate-500 font-black tracking-wide mt-1">Growth</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-2xl font-bold text-emerald-400 font-outfit tracking-tighter">{finSubscores.solvency}</span>
                                            <span className="text-[7px] uppercase text-slate-500 font-black tracking-wide mt-1">Solvency</span>
                                        </div>
                                    </div>
                                </div>

                                {/* MOMENTUM ENGINE */}
                                <div className="relative overflow-hidden rounded-2xl bg-white/[0.02] border border-white/5 p-5 group transition-all hover:bg-white/[0.04]">
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-purple-500/0 via-purple-500/40 to-purple-500/0" />
                                    <div className="flex items-center justify-between mb-4">
                                        <h6 className="text-[9px] font-bold text-purple-500 uppercase tracking-[0.2em]">Momentum Engine</h6>
                                        <div className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] font-bold text-purple-400">TREND</div>
                                    </div>
                                    <div className="flex items-center justify-around">
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-2xl font-bold text-purple-400 font-outfit tracking-tighter">{trendSubscores?.quarterly_momentum ?? '0'}</span>
                                            <span className="text-[7px] uppercase text-slate-500 font-black tracking-wide mt-1">Quarterly</span>
                                        </div>
                                        <div className="w-px h-8 bg-white/5" />
                                        <div className="flex-1 flex flex-col items-center">
                                            <span className="text-2xl font-bold text-purple-400 font-outfit tracking-tighter">{trendSubscores?.annual_stability ?? '0'}</span>
                                            <span className="text-[7px] uppercase text-slate-500 font-black tracking-wide mt-1">Annual</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Financial Breakdown */}
                    {drivers.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-white/5">
                            <h5 className="text-[10px] font-bold text-slate-500 uppercase">Financial Drivers</h5>
                            <div className="grid grid-cols-1 gap-1.5">
                                {drivers.map((d: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                        <span className="text-slate-300 font-medium">{d.label || "Key Fundamental Metric"}</span>
                                        <span className={cn(
                                            "font-bold uppercase text-[8px] px-1.5 py-0.5 rounded",
                                            d.impact === 'positive' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                                        )}>
                                            {d.impact === 'positive' ? '+' : '-'}{d.weight === 'high' ? 'High' : 'Low'}
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
