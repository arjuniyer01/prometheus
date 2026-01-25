import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle2, AlertCircle, HelpCircle, Zap } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";

interface MetricCopilotProps {
    label: string;
    value: string | number;
    status: 'positive' | 'negative' | 'neutral';
    shortExplanation: string;
    technicalDefinition?: string;
    trend?: string;
}

export const MetricCopilot = ({
    label,
    value,
    status,
    shortExplanation,
    technicalDefinition,
    trend
}: MetricCopilotProps) => {
    const statusColors = {
        positive: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        negative: "text-red-400 bg-red-500/10 border-red-500/20",
        neutral: "text-slate-400 bg-slate-500/10 border-slate-500/20",
    };

    const Icons = {
        positive: CheckCircle2,
        negative: AlertCircle,
        neutral: HelpCircle,
    };

    const StatusIcon = Icons[status];

    return (
        <GlassCard className="p-4 flex flex-col gap-3 group/metric">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
                        {technicalDefinition && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-3 h-3 text-slate-600 hover:text-indigo-400 transition-colors" />
                                    </TooltipTrigger>
                                    <TooltipContent className="glass-morphism border-indigo-500/30 p-4 max-w-xs">
                                        <p className="text-xs leading-relaxed text-slate-300">
                                            <span className="font-bold text-indigo-400 block mb-1">Technical Definition:</span>
                                            {technicalDefinition}
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                    <div className="text-2xl font-bold font-outfit">{value}</div>
                </div>

                <div className={cn(
                    "px-2 py-1 rounded-lg border flex items-center gap-1.5 transition-all",
                    statusColors[status]
                )}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase">{status}</span>
                </div>
            </div>

            <div className="mt-auto">
                <div className="flex items-center gap-2 text-[11px] leading-relaxed text-slate-400 group-hover/metric:text-slate-200 transition-colors">
                    <Zap className="w-3 h-3 text-indigo-400 shrink-0" />
                    <p>{shortExplanation}</p>
                </div>

                {trend && (
                    <div className="mt-2 text-[9px] font-mono text-slate-600 uppercase tracking-tighter">
                        Trend: {trend}
                    </div>
                )}
            </div>

            {/* Visual background glow reflecting status */}
            <div className={cn(
                "absolute -bottom-4 -right-4 w-12 h-12 blur-2xl rounded-full opacity-20 transition-opacity group-hover/metric:opacity-40",
                status === 'positive' && "bg-emerald-500",
                status === 'negative' && "bg-red-500",
                status === 'neutral' && "bg-slate-500"
            )} />
        </GlassCard>
    );
};
