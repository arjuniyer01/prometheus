import { GlassCard } from '@/components/ui/GlassCard';
import {
    Users,
    Briefcase,
    Calendar,
    DollarSign,
    Award
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface ExecutiveBenchProps {
    officers: any[];
    isIndian?: boolean;
}

export const ExecutiveBench = ({ officers, isIndian }: ExecutiveBenchProps) => {
    if (!officers || officers.length === 0) return null;

    const formatCurrency = (val: number) => {
        if (!val) return '---';
        if (isIndian) {
            return `₹${(val / 1e7).toFixed(2)} Cr`;
        }
        if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
        if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
        return `$${val}`;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                < Award className="w-4 h-4 text-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300 text-glow-emerald">Executive Bench</h2>
            </div>

            <GlassCard className="p-0 border-white/5 bg-white/[0.01] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Executive</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase">Title</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-center">Age</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-right">Total Pay</th>
                                <th className="p-4 text-[10px] font-bold text-slate-500 uppercase text-center">Fiscal Year</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {officers.map((officer: any, i: number) => (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/5 font-bold text-[10px] text-slate-400">
                                                {officer.name?.split(' ').pop()?.[0] || 'E'}
                                            </div>
                                            <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{officer.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <Briefcase className="w-3 h-3 text-slate-600" />
                                            <span className="text-[12px] text-slate-400 font-medium">{officer.title}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="text-[11px] font-mono text-slate-500">{officer.age || 'N/A'}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-1 font-mono">
                                            <span className="text-emerald-400 font-bold text-sm">{formatCurrency(officer.totalPay)}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-slate-500 font-mono">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {officer.fiscalYear || '---'}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
            <p className="text-[9px] text-slate-600 font-mono italic">
                * Compensation data based on the latest available proxy statements and regulatory filings.
            </p>
        </div>
    );
};
