"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { formatFin } from "@/lib/formatters";

interface FinancialsTableProps {
    financials: any[];
    finView: 'annual' | 'quarterly';
    setFinView: (view: 'annual' | 'quarterly') => void;
    isIndian: boolean;
    currencySymbol: string;
}

export function FinancialsTable({
    financials,
    finView,
    setFinView,
    isIndian,
    currencySymbol
}: FinancialsTableProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Historical Financials (P&L / Balance Sheet)</h2>
                </div>
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/10">
                    <button
                        onClick={() => setFinView('annual')}
                        className={cn(
                            "px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all",
                            finView === 'annual' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        Annual
                    </button>
                    <button
                        onClick={() => setFinView('quarterly')}
                        className={cn(
                            "px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-md transition-all",
                            finView === 'quarterly' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        Quarterly
                    </button>
                </div>
            </div>
            <GlassCard className="p-0 border-white/5 bg-white/[0.01] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Fiscal Period</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Revenue</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Net Income</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Total Assets</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Total Liab.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {financials.length > 0 ? (
                                financials.filter(f => f.report_type === (finView === 'annual' ? '10-K' : '10-Q')).slice(0, 5).map((f: any, i: number) => (
                                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="p-4 text-[11px] font-mono text-slate-400">{f.period}</td>
                                        <td className="p-4 text-[11px] font-mono text-emerald-400">
                                            {currencySymbol}{formatFin(f.income_statement?.revenue || 0, isIndian)}
                                        </td>
                                        <td className="p-4 text-[11px] font-mono text-sky-400">
                                            {currencySymbol}{formatFin(f.income_statement?.netIncome || 0, isIndian)}
                                        </td>
                                        <td className="p-4 text-[11px] font-mono text-slate-300">
                                            {currencySymbol}{formatFin(f.balance_sheet?.totalAssets || 0, isIndian)}
                                        </td>
                                        <td className="p-4 text-[11px] font-mono text-slate-300">
                                            {currencySymbol}{formatFin(f.balance_sheet?.totalTotalLiabilities || 0, isIndian)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-10 text-center text-slate-600 italic text-xs">
                                        No data available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
