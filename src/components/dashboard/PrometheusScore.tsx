import { GlassCard } from '@/components/ui/GlassCard';
import { Calculator, ShieldCheck, Zap, Newspaper, Gem, Users, BrainCircuit } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PrometheusScoreProps {
    metadata: any;
}

const ScoreCard = ({ label, score, weight, color, icon: Icon, subscores }: {
    label: string,
    score: number,
    weight: number,
    color: string,
    icon: any,
    subscores?: Record<string, number>
}) => {
    const colorVariants: Record<string, string> = {
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
        sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
        rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    };

    const barColors: Record<string, string> = {
        emerald: 'bg-emerald-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        sky: 'bg-sky-500',
        rose: 'bg-rose-500',
        orange: 'bg-orange-500',
    };

    return (
        <div className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex flex-col gap-4 group hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", colorVariants[color].split(' ').slice(1).join(' '))}>
                        <Icon className={cn("w-4 h-4", colorVariants[color].split(' ')[0])} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{label}</span>
                        <span className="text-[8px] font-mono text-slate-600">PROTOCOL WEIGHT: {weight}%</span>
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white leading-none">{score}</span>
                        <span className="text-[10px] font-bold text-slate-600">/100</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full transition-all duration-1000 ease-out", barColors[color])}
                        style={{ width: `${score}%` }}
                    />
                </div>

                {subscores && Object.keys(subscores).length > 0 && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
                        {Object.entries(subscores).map(([key, val]) => (
                            <div key={key} className="flex flex-col gap-0.5">
                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter leading-none">{key.replace(/_/g, ' ')}</span>
                                <span className="font-mono text-[10px] text-slate-300 font-black">{val}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export const PrometheusScore = ({ metadata }: PrometheusScoreProps) => {
    if (!metadata?.prometheus_score) return null;

    const breakdown = metadata.score_breakdown || {
        financial_score: 0,
        sec_score: 0,
        sentiment_score: 0,
        trend_score: 0,
        sector_score: 0,
        institutional_score: 0
    };

    const finSubscores = metadata.financial_subscores || { profitability: 0, growth: 0, solvency: 0 };
    const trendSubscores = metadata.trend_subscores || { momentum: 0, strength: 0 };
    const weights = { financial: 40, trend: 20, sec: 10, sentiment: 10, moat: 10, mgmt: 10 };

    const score = metadata.prometheus_score;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black font-outfit text-white tracking-tighter leading-none">{score}</span>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Alpha Score</span>
                </div>
                <div className={cn(
                    "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-xl transition-all duration-500",
                    score >= 60 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5" :
                        score >= 40 ? "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5" :
                            "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5"
                )}>
                    {score >= 60 ? "Overweight" : score >= 40 ? "Neutral" : "Underweight"}
                </div>
            </div>

            <div className="h-2.5 bg-white/5 rounded-full overflow-hidden w-full relative">
                <div
                    className={cn(
                        "h-full transition-all duration-700 ease-out relative z-10",
                        score >= 60 ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]" :
                            score >= 40 ? "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]" :
                                "bg-gradient-to-r from-rose-600 to-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                    )}
                    style={{ width: `${score}%` }}
                />
            </div>

            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[8px] font-bold text-slate-500 uppercase tracking-widest">
                        {metadata.sector || 'Engine Core'}
                    </div>
                </div>
                <span className="text-[8px] font-mono text-slate-600 italic">"Probabilistic Confidence High"</span>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4">
                <ScoreCard
                    label="Financials"
                    score={breakdown.financial_score}
                    weight={weights.financial}
                    color="emerald"
                    icon={Calculator}
                    subscores={finSubscores}
                />
                <ScoreCard
                    label="Momentum"
                    score={breakdown.trend_score}
                    weight={weights.trend}
                    color="purple"
                    icon={Zap}
                    subscores={{
                        'Market Trend': (metadata.trend_subscores as any)?.quarterly_momentum || 0,
                        'Relative Str': (metadata.trend_subscores as any)?.annual_stability || 0
                    }}
                />
                <ScoreCard
                    label="Regulatory"
                    score={breakdown.sec_score}
                    weight={weights.sec}
                    color="amber"
                    icon={ShieldCheck}
                />
                <ScoreCard
                    label="Sentiment"
                    score={breakdown.sentiment_score}
                    weight={weights.sentiment}
                    color="sky"
                    icon={Newspaper}
                />
                <ScoreCard
                    label="Moat"
                    score={breakdown.sector_score}
                    weight={weights.moat}
                    color="rose"
                    icon={Gem}
                />
                <ScoreCard
                    label="Management"
                    score={breakdown.institutional_score}
                    weight={weights.mgmt}
                    color="orange"
                    icon={Users}
                />
            </div>

            <div className="bg-indigo-500/[0.03] border border-indigo-500/10 p-4 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                        <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    </div>
                    <h5 className="text-[11px] font-black text-indigo-300 uppercase tracking-widest leading-none">Scoring Rationale</h5>
                </div>

                <div className="space-y-2">
                    <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                        {score >= 75 ? (
                            <span className="text-emerald-400">Elite Confluence: Exceptional alignment between fundamental value and technical momentum. Alpha probability is highly skewed to the upside.</span>
                        ) : score >= 60 ? (
                            <span className="text-emerald-300/80">Strong Bullish: Solid financials and supportive market signals. Risk-reward ratio remains favorable for accumulation.</span>
                        ) : score >= 40 ? (
                            <span className="text-amber-300/80">Neutral Context: Mixed signals from fundamentals and technicals. Waiting for a categorical breakout or fundamental catalyst.</span>
                        ) : (
                            <span className="text-rose-400">High Risk: Significant headwinds detected in core metrics or momentum profiles. Preservation of capital is the priority.</span>
                        )}
                    </p>
                    <p className="text-[9px] text-slate-500 leading-relaxed italic">
                        Hybrid scoring utilizing 60% deterministic financial-technical regression and 40% qualitative AI inference. Weights are dynamically fixed by the Prometheus protocol.
                    </p>
                </div>
            </div>
        </div>
    );
};


