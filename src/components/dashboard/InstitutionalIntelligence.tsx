import { GlassCard } from '@/components/ui/GlassCard';
import {
    TrendingUp,
    TrendingDown,
    Users,
    UserCheck,
    Target,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

interface InstitutionalIntelligenceProps {
    rawDump: any;
    analysis: string;
    subscores: any;
    isIndian?: boolean;
}

export const InstitutionalIntelligence = ({ rawDump, analysis, subscores, isIndian }: InstitutionalIntelligenceProps) => {
    const fullAnalysis = rawDump?.full_analysis || {};
    const recTrend = fullAnalysis.recommendationTrend || [];
    const earnsHistory = fullAnalysis.earningsHistory || [];
    const insiders = fullAnalysis.insiders || [];

    // Prepare Recommendation Chart Data
    const recData = [...recTrend].reverse().map(item => ({
        period: item.period === '0m' ? 'Current' : item.period,
        Buy: item.buy + item.strongBuy,
        Hold: item.hold,
        Sell: item.sell + item.strongSell
    }));

    // Prepare Earnings History Data
    const earnsData = earnsHistory.map((item: any) => ({
        quarter: new Date(item.quarter).toLocaleDateString([], { month: 'short', year: '2-digit' }),
        Actual: item.epsActual,
        Estimate: item.epsEstimate,
        surprise: item.surprisePercent * 100
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-orange-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-orange">Institutional Intelligence</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Analyst Consensus Card */}
                <GlassCard className="p-6 border-orange-500/10 bg-orange-500/[0.02]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-1">Analyst Consensus</h4>
                            <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">Quarterly Trajectory</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-white">{subscores?.analyst_conviction || 0}<span className="text-[10px] text-slate-500 ml-1">/100</span></div>
                        </div>
                    </div>

                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={recData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="period"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                />
                                <Bar dataKey="Buy" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="Hold" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} barSize={20} />
                                <Bar dataKey="Sell" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 flex items-center gap-4 justify-center">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[9px] font-bold text-slate-500 uppercase">Buy</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[9px] font-bold text-slate-500 uppercase">Hold</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[9px] font-bold text-slate-500 uppercase">Sell</span></div>
                    </div>
                </GlassCard>

                {/* Earnings Reliability Card */}
                <GlassCard className="p-6 border-sky-500/10 bg-sky-500/[0.02]">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h4 className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1">Earnings Reliability</h4>
                            <p className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase">Actual vs Estimates</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-white">{subscores?.earnings_reliability || 0}<span className="text-[10px] text-slate-500 ml-1">/100</span></div>
                        </div>
                    </div>

                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={earnsData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                <XAxis
                                    dataKey="quarter"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                                />
                                <Bar dataKey="Estimate" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} barSize={15} />
                                <Bar dataKey="Actual" radius={[4, 4, 0, 0]} barSize={15}>
                                    {earnsData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.Actual >= entry.Estimate ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="mt-4 flex items-center justify-between px-2">
                        {earnsData.slice(-4).map((d: any, i: number) => (
                            <div key={i} className="text-center">
                                <div className={cn("text-[10px] font-bold", d.surprise >= 0 ? "text-emerald-500" : "text-red-500")}>
                                    {d.surprise >= 0 ? '+' : ''}{d.surprise.toFixed(1)}%
                                </div>
                                <div className="text-[8px] text-slate-600 uppercase font-black">Surprise</div>
                            </div>
                        ))}
                    </div>
                </GlassCard>
            </div>

            {/* Insider Pulse & Model Synthesis */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
                <GlassCard className="p-6 border-white/5 bg-white/[0.01]">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                <UserCheck className="w-4 h-4 text-orange-400" />
                            </div>
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Insider Pulse</h4>
                                <p className="text-[9px] text-slate-500 font-mono tracking-tighter">RECENT EXECUTIVE TRANSACTIONS</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Signal Score: <span className="text-white ml-2 text-sm">{subscores?.insider_signal || 0}</span></div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {insiders.slice(0, 5).map((trade: any, i: number) => {
                            const isSell = trade.transactionText?.toLowerCase().includes('sale') || trade.value > 0;
                            return (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px]",
                                            isSell ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20")}>
                                            {isSell ? 'S' : 'B'}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">{trade.filerName}</div>
                                            <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">{trade.filerRelation} • {new Date(trade.startDate).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-mono font-bold text-slate-300">{trade.shares.toLocaleString()} <span className="text-[9px] text-slate-500">SHARES</span></div>
                                        <div className="text-[9px] text-slate-500 font-mono tracking-tighter">
                                            {trade.value > 0
                                                ? (isIndian
                                                    ? `₹${(trade.value / 1e7).toFixed(2)} Cr Total`
                                                    : `$${(trade.value / 1e6).toFixed(1)}M Total`)
                                                : 'Gift/Grant'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {insiders.length === 0 && (
                            <div className="py-10 text-center text-[10px] text-slate-600 font-mono italic">
                                No recent insider transactions found in the research buffer.
                            </div>
                        )}
                    </div>
                </GlassCard>

                <GlassCard className="p-6 border-indigo-500/10 bg-indigo-500/[0.02] flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                            <Target className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-1">Research Synthesis</h4>
                            <p className="text-[9px] text-slate-500 font-mono tracking-tighter">INSTITUTIONAL MODEL OUTPUT</p>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4">
                        <p className="text-sm text-slate-300 leading-relaxed italic relative">
                            <span className="absolute -left-3 top-0 bottom-0 w-0.5 bg-indigo-500/30 rounded-full" />
                            {analysis || "Institutional data currently being synthesized by the Prometheus Engine..."}
                        </p>

                        <div className="grid grid-cols-1 gap-3 pt-4">
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Analyst Conviction</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-orange-500" style={{ width: `${subscores?.analyst_conviction || 0}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white">{subscores?.analyst_conviction || 0}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Insider Alignment</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{ width: `${subscores?.insider_signal || 0}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white">{subscores?.insider_signal || 0}</span>
                                </div>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Beat Consistency</span>
                                <div className="flex items-center gap-2">
                                    <div className="h-1 w-12 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-sky-500" style={{ width: `${subscores?.earnings_reliability || 0}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-white">{subscores?.earnings_reliability || 0}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
};
