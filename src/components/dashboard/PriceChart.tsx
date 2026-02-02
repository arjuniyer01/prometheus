"use client";

import { useMemo } from "react";
import {
    AreaChart,
    Area,
    Line,
    Bar,
    ComposedChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Brush,
} from "recharts";
import { createPortal } from "react-dom";
import { Maximize2, Loader2, X, BarChart3 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";

// Candle component extracted internally for now or could be a separate file
const Candle = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (x == null || y == null || width == null || height == null || !payload) return null;
    const { open, close, high, low } = payload;
    if (open == null || close == null || high == null || low == null) return null;

    const isUp = close >= open;
    const color = isUp ? '#10b981' : '#f43f5e';
    const priceBodyDelta = Math.abs(open - close);

    let ratio = 0;
    if (priceBodyDelta > 0 && height > 0) {
        ratio = height / priceBodyDelta;
    }

    const bodyTop = y;
    const bodyBottom = y + height;
    const bodyHeight = Math.max(height, 1);

    let yHighWick = bodyTop;
    let yLowWick = bodyBottom;

    if (ratio > 0) {
        const highDelta = high - Math.max(open, close);
        const lowDelta = Math.min(open, close) - low;
        yHighWick = bodyTop - (highDelta * ratio);
        yLowWick = bodyBottom + (lowDelta * ratio);
    }

    const candleWidth = Math.max(width * 0.85, 3);
    const xOffset = (width - candleWidth) / 2;
    const centerX = x + width / 2;

    return (
        <g>
            <line
                x1={centerX}
                y1={yHighWick}
                x2={centerX}
                y2={yLowWick}
                stroke={color}
                strokeWidth={1.5}
            />
            <rect
                x={x + xOffset}
                y={y}
                width={candleWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth={0}
                rx={1}
            />
        </g>
    );
};

interface PriceChartProps {
    prices: any[];
    loadingPrices: boolean;
    chartColor: string;
    currencySymbol: string;
    tickerData: any;
    selectedSymbol: string | null;
    isChartExpanded: boolean;
    setIsChartExpanded: (val: boolean) => void;
    chartTimeframe: string;
    setChartTimeframe: (val: string) => void;
    chartType: 'area' | 'candles';
    setChartType: (val: 'area' | 'candles') => void;
    showSMA: boolean;
    setShowSMA: (val: boolean) => void;
    showVolume: boolean;
    setShowVolume: (val: boolean) => void;
    getRawChanges: () => number;
}

export function PriceChart({
    prices,
    loadingPrices,
    chartColor,
    currencySymbol,
    tickerData,
    selectedSymbol,
    isChartExpanded,
    setIsChartExpanded,
    chartTimeframe,
    setChartTimeframe,
    chartType,
    setChartType,
    showSMA,
    setShowSMA,
    showVolume,
    setShowVolume,
    getRawChanges
}: PriceChartProps) {
    const filteredPrices = useMemo(() => {
        if (!prices.length) return [];

        const dataWithIndicators = prices.map((p, idx) => {
            let sma20 = null;
            let sma50 = null;

            if (idx >= 19) {
                const slice = prices.slice(idx - 19, idx + 1);
                sma20 = slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
            }

            if (idx >= 49) {
                const slice = prices.slice(idx - 49, idx + 1);
                sma50 = slice.reduce((acc, curr) => acc + curr.close, 0) / 50;
            }

            const bodyMin = Math.min(p.open, p.close);
            const bodyMax = Math.max(p.open, p.close);

            return { ...p, sma20, sma50, bodyRange: [bodyMin, bodyMax] };
        });

        switch (chartTimeframe) {
            case '1M': return dataWithIndicators.slice(-22);
            case '6M': return dataWithIndicators.slice(-126);
            case '1Y': return dataWithIndicators.slice(-252);
            case '5Y':
            case 'MAX':
            default: return dataWithIndicators;
        }
    }, [prices, chartTimeframe]);

    const currentPrice = prices.length > 0 ? prices[prices.length - 1].close : null;

    return (
        <>
            <GlassCard className="p-0 flex flex-col border-white/5 overflow-visible z-20">
                <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="font-bold text-lg">
                                {tickerData?.company_name || selectedSymbol}
                            </h3>
                            <div className="flex items-center gap-2">
                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                                    {(tickerData?.exchange && typeof tickerData?.exchange === 'object')
                                        ? Object.keys(tickerData.exchange).join(' / ')
                                        : (tickerData?.exchange || 'MARKET')}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                        <div className="text-right">
                            <div className="text-2xl font-bold font-mono text-white">
                                {currencySymbol}{currentPrice || '---'}
                            </div>
                            <div className={cn("text-xs font-bold", getRawChanges() >= 0 ? "text-emerald-500" : "text-red-500")}>
                                {getRawChanges() >= 0 ? '+' : ''}{getRawChanges().toFixed(2)}%
                            </div>
                        </div>

                        <button
                            onClick={() => setIsChartExpanded(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 hover:border-indigo-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all"
                        >
                            <Maximize2 className="w-3 h-3" />
                            Chart Analysis
                        </button>
                    </div>
                </div>

                <div className="h-[200px] w-full mt-4 relative px-2 group">
                    {loadingPrices && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/20 backdrop-blur-[2px] z-10">
                            <Loader2 className="w-6 h-6 animate-spin text-white/20" />
                        </div>
                    )}
                    {prices.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={filteredPrices} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.2} />
                                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>

                                <RechartsTooltip
                                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                                    content={({ active, payload }) => {
                                        if (!active || !payload || !payload.length || typeof document === 'undefined') return null;

                                        const dateStr = new Date(payload[0].payload.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        const priceStr = payload[0].value;

                                        return createPortal(
                                            <div
                                                className="pointer-events-none fixed z-[9999] top-24 left-1/2 -translate-x-1/2 bg-slate-950/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl px-6 py-2 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200"
                                            >
                                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider text-center">{dateStr}</span>
                                                <div className="h-3 w-px bg-white/10" />
                                                <span className="text-sm font-bold text-white font-mono tracking-tight">{currencySymbol}{priceStr}</span>
                                            </div>,
                                            document.body
                                        );
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorPrice)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full w-full flex items-center justify-center border-t border-white/5">
                            <p className="text-[10px] text-slate-600 font-mono italic">
                                {loadingPrices ? "Initializing Charting Engine..." : "Historical Charting Unavailable"}
                            </p>
                        </div>
                    )}
                </div>
            </GlassCard>

            {/* Full-Screen Engine Overlay */}
            {isChartExpanded && (
                <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col animate-in fade-in duration-500 overflow-hidden">
                    {/* Header Bar */}
                    <div className="h-16 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-8 shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-white uppercase tracking-tight leading-none">
                                        {tickerData?.company_name || selectedSymbol}
                                    </h2>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Terminal</p>
                                </div>
                            </div>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                                {['1M', '6M', '1Y', '5Y', 'MAX'].map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setChartTimeframe(t)}
                                        className={cn(
                                            "px-4 py-1.5 text-[10px] font-black rounded-lg transition-all",
                                            t === chartTimeframe ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" : "text-slate-500 hover:text-white"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                                {[
                                    { id: 'area', label: 'AREA' },
                                    { id: 'candles', label: 'CANDLES' },
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        onClick={() => setChartType(btn.id as any)}
                                        className={cn(
                                            "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border",
                                            chartType === btn.id
                                                ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                                                : "text-slate-500 border-transparent hover:text-white"
                                        )}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                            <div className="h-8 w-px bg-white/5" />
                            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
                                {[
                                    { label: 'SMA', active: showSMA, onClick: () => setShowSMA(!showSMA) },
                                    { label: 'VOL', active: showVolume, onClick: () => setShowVolume(!showVolume) },
                                ].map((btn) => (
                                    <button
                                        key={btn.label}
                                        onClick={btn.onClick}
                                        className={cn(
                                            "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border",
                                            btn.active
                                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                : "text-slate-500 border-transparent hover:text-white"
                                        )}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="text-right mr-4 border-r border-white/5 pr-6">
                                <div className="text-xl font-black text-white font-mono leading-none">
                                    {currencySymbol}{prices[prices.length - 1]?.close}
                                </div>
                                <div className={cn("text-[10px] font-bold mt-1", getRawChanges() >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                    {getRawChanges() >= 0 ? '+' : ''}{getRawChanges().toFixed(2)}% <span className="text-slate-600 ml-1 uppercase">HISTORICAL TRAJECTORY</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsChartExpanded(false)}
                                className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 transition-all hover:rotate-90"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Chart Content Area */}
                    <div className="flex-1 w-full bg-[#020617] relative flex flex-col">
                        <div className="flex-1 pt-6 pr-6 pb-2 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={filteredPrices} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorPriceFullScreen" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="0"
                                        vertical={false}
                                        stroke="rgba(255,255,255,0.02)"
                                    />

                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#334155', fontSize: 10, fontWeight: '700' }}
                                        minTickGap={100}
                                        dy={10}
                                        tickFormatter={(str) => {
                                            const date = new Date(str);
                                            return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                                        }}
                                    />

                                    <YAxis
                                        yAxisId="price"
                                        orientation="right"
                                        domain={[
                                            (dataMin: number) => {
                                                const lows = filteredPrices.map(p => p.low).filter(v => v !== undefined);
                                                const min = lows.length ? Math.min(...lows) : dataMin;
                                                return min * 0.995;
                                            },
                                            (dataMax: number) => {
                                                const highs = filteredPrices.map(p => p.high).filter(v => v !== undefined);
                                                const max = highs.length ? Math.max(...highs) : dataMax;
                                                return max * 1.005;
                                            }
                                        ]}
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#334155', fontSize: 10, fontWeight: '700' }}
                                        tickFormatter={(val) => `${currencySymbol}${val > 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0)}`}
                                    />

                                    <YAxis
                                        yAxisId="volume"
                                        orientation="left"
                                        domain={[0, (dataMax: number) => dataMax * 1.5]}
                                        tick={{ fill: '#4b5563', fontSize: 8 }}
                                        tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                                    />

                                    <RechartsTooltip
                                        cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
                                        content={({ active, payload }) => {
                                            if (!active || !payload || !payload.length) return null;
                                            const data = payload[0].payload;
                                            const dateStr = new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                                            const price = data.close;
                                            const vol = data.volume;

                                            return (
                                                <div className="bg-slate-950 border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3 min-w-[220px]">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{dateStr}</span>
                                                        <div className="text-2xl font-black text-white font-mono tracking-tighter mt-1">
                                                            {currencySymbol}{Number(price).toFixed(3)}
                                                        </div>
                                                    </div>

                                                    {chartType === 'candles' && (
                                                        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-white/5 pt-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">O</span>
                                                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.open?.toFixed(3)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">H</span>
                                                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.high?.toFixed(3)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">L</span>
                                                                <span className="text-[9px] text-slate-400 font-mono">{currencySymbol}{data.low?.toFixed(3)}</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">C</span>
                                                                <span className={cn("text-[9px] font-bold font-mono", data.close >= data.open ? "text-emerald-400" : "text-rose-400")}>{currencySymbol}{data.close?.toFixed(3)}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {(vol && showVolume) && (
                                                        <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                                            <span className="text-[10px] text-slate-500 font-bold uppercase">Volume</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{(vol / 1000000).toFixed(2)}M</span>
                                                        </div>
                                                    )}

                                                    {showSMA && data.sma20 && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-indigo-400 font-bold uppercase">SMA 20</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}{data.sma20.toFixed(2)}</span>
                                                        </div>
                                                    )}

                                                    {showSMA && data.sma50 && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] text-rose-400 font-bold uppercase">SMA 50</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{currencySymbol}{data.sma50.toFixed(2)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }}
                                    />

                                    <Brush
                                        dataKey="date"
                                        height={30}
                                        stroke="#818cf8"
                                        fill="#1e293b"
                                        fillOpacity={0.6}
                                        tickFormatter={() => ""}
                                        travellerWidth={15}
                                    />

                                    {chartType === 'area' ? (
                                        <Area
                                            yAxisId="price"
                                            type="monotone"
                                            dataKey="close"
                                            stroke={chartColor}
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorPriceFullScreen)"
                                            animationDuration={800}
                                        />
                                    ) : (
                                        <Bar
                                            yAxisId="price"
                                            dataKey="bodyRange"
                                            shape={Candle}
                                            animationDuration={0}
                                            isAnimationActive={false}
                                        />
                                    )}

                                    {showSMA && (
                                        <>
                                            <Line
                                                yAxisId="price"
                                                type="monotone"
                                                dataKey="sma20"
                                                stroke="#818cf8"
                                                strokeWidth={2}
                                                dot={false}
                                                animationDuration={1200}
                                            />
                                            <Line
                                                yAxisId="price"
                                                type="monotone"
                                                dataKey="sma50"
                                                stroke="#fb7185"
                                                strokeWidth={2}
                                                dot={false}
                                                animationDuration={1500}
                                            />
                                        </>
                                    )}

                                    {showVolume && (
                                        <Bar
                                            yAxisId="volume"
                                            dataKey="volume"
                                            fill="#eab308"
                                            fillOpacity={0.4}
                                            radius={[1, 1, 0, 0]}
                                            animationDuration={500}
                                        />
                                    )}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="h-10 bg-slate-900/20 border-t border-white/5 flex items-center justify-between px-20 shrink-0">
                            <div className="flex gap-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full border border-indigo-500" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Interactive Volume</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", getRawChanges() >= 0 ? "bg-emerald-500/40" : "bg-red-500/40")} />
                                    <span className="text-[9px] font-black text-slate-500 uppercase">Closing Average</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-mono text-slate-600">PROMETHEUS_ENGINE_v4.2</span>
                                <span className="text-[9px] font-mono text-emerald-500/40">CONNECTION_STABLE</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
