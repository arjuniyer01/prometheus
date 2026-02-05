"use client";

import { useMemo, useState, memo } from "react";
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
import { Maximize2, Loader2, X, BarChart3, Binary, Activity, Waves, ChevronDown, Check, Layers } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { RSI, MACD, BollingerBands, EMA, ADX, ATR, Stochastic, WilliamsR, MFI, OBV, TRIX, VWAP, CCI, ROC, KST, PSAR, ADL, ForceIndex, AwesomeOscillator } from "technicalindicators";

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

const IndicatorTooltip = memo(({ active, payload, suffix = "" }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const dateStr = new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-lg p-2 shadow-xl border-l-2 border-l-indigo-500">
            <div className="text-[8px] text-slate-500 font-black uppercase mb-1">{dateStr}</div>
            {payload.map((entry: any, index: number) => (
                <div key={index} className="flex items-center justify-between gap-4 mt-0.5">
                    <span className="text-[9px] font-bold uppercase" style={{ color: entry.stroke || entry.fill || '#fff' }}>
                        {entry.name || (typeof entry.dataKey === 'string' ? entry.dataKey.replace(/.*\./, '') : 'Value')}
                    </span>
                    <span className="text-[9px] font-mono text-white">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{suffix}</span>
                </div>
            ))}
        </div>
    );
});
IndicatorTooltip.displayName = "IndicatorTooltip";

const IndicatorChart = memo(({ title, color, dataKey, data, type = 'line', domain, ticks, name, secondaryKey, secondaryColor, tertiaryKey, tertiaryColor, barKey, barColor }: any) => {
    return (
        <div className="h-[140px] px-8 border-b border-white/5 relative bg-slate-950/20 group">
            <div className="absolute top-2 left-8 z-10 text-[8px] font-black uppercase tracking-widest transition-colors" style={{ color: `${color}88` }}>{title}</div>
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                    <XAxis dataKey="date" hide />
                    <YAxis orientation="right" domain={domain} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} ticks={ticks} />
                    <RechartsTooltip content={<IndicatorTooltip />} />
                    {barKey && <Bar dataKey={barKey} name={barKey.split('.').pop().toUpperCase()} fill={barColor || '#475569'} fillOpacity={0.4} />}
                    {type === 'line' && dataKey && <Line type="monotone" dataKey={dataKey} name={name || dataKey.split('.').pop().toUpperCase()} stroke={color} strokeWidth={1.5} dot={false} />}
                    {secondaryKey && <Line type="monotone" dataKey={secondaryKey} name={secondaryKey.split('.').pop().toUpperCase()} stroke={secondaryColor || '#f97316'} strokeWidth={1.5} dot={false} />}
                    {tertiaryKey && <Line type="monotone" dataKey={tertiaryKey} name={tertiaryKey.split('.').pop().toUpperCase()} stroke={tertiaryColor || '#f43f5e'} strokeWidth={1} strokeDasharray="3 3" dot={false} />}
                    {type === 'bar' && dataKey && <Bar dataKey={dataKey} name={name || dataKey.split('.').pop().toUpperCase()} fill={color} fillOpacity={0.4} />}
                    {type === 'area' && dataKey && <Area type="monotone" dataKey={dataKey} name={name || dataKey.split('.').pop().toUpperCase()} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1.5} dot={false} />}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
});
IndicatorChart.displayName = "IndicatorChart";

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
    const [showBB, setShowBB] = useState(true);
    const [showEMA, setShowEMA] = useState(false);
    const [showVWAP, setShowVWAP] = useState(false);
    const [showPSAR, setShowPSAR] = useState(true);
    const [isSensorsOpen, setIsSensorsOpen] = useState(false);

    const dataWithIndicators = useMemo(() => {
        if (!prices.length) return [];

        const closePrices = prices.map(p => p.close);
        const highPrices = prices.map(p => p.high);
        const lowPrices = prices.map(p => p.low);
        const volumes = prices.map(p => p.volume);

        // 1. SMA
        const sma20 = prices.map((p, idx) => {
            if (idx < 19) return null;
            const slice = prices.slice(idx - 19, idx + 1);
            return slice.reduce((acc, curr) => acc + curr.close, 0) / 20;
        });
        const sma50 = prices.map((p, idx) => {
            if (idx < 49) return null;
            const slice = prices.slice(idx - 49, idx + 1);
            return slice.reduce((acc, curr) => acc + curr.close, 0) / 50;
        });

        // 2. RSI
        const rsiValues = RSI.calculate({ values: closePrices, period: 14 });
        const paddedRSI = [...new Array(prices.length - rsiValues.length).fill(null), ...rsiValues];

        // 3. MACD
        const macdValues = MACD.calculate({
            values: closePrices,
            fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
            SimpleMAOscillator: false, SimpleMASignal: false
        });
        const paddedMACD = [...new Array(prices.length - macdValues.length).fill(null), ...macdValues];

        // 4. Bollinger Bands
        const bbValues = BollingerBands.calculate({ values: closePrices, period: 20, stdDev: 2 });
        const paddedBB = [...new Array(prices.length - bbValues.length).fill(null), ...bbValues];

        // 5. EMA
        const ema20 = EMA.calculate({ values: closePrices, period: 20 });
        const paddedEMA20 = [...new Array(prices.length - ema20.length).fill(null), ...ema20];
        const ema50 = EMA.calculate({ values: closePrices, period: 50 });
        const paddedEMA50 = [...new Array(prices.length - ema50.length).fill(null), ...ema50];

        // 6. ATR
        const atrValues = ATR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 14 });
        const paddedATR = [...new Array(prices.length - atrValues.length).fill(null), ...atrValues];

        // 7. ADX
        const adxValues = ADX.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 14 });
        const paddedADX = [...new Array(prices.length - adxValues.length).fill(null), ...adxValues];

        // 8. Stochastic
        const stochValues = Stochastic.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 14, signalPeriod: 3 });
        const paddedStoch = [...new Array(prices.length - stochValues.length).fill(null), ...stochValues];

        // 9. Williams %R
        const wrValues = WilliamsR.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 14 });
        const paddedWR = [...new Array(prices.length - wrValues.length).fill(null), ...wrValues];

        // 10. MFI
        const mfiValues = MFI.calculate({ high: highPrices, low: lowPrices, close: closePrices, volume: volumes, period: 14 });
        const paddedMFI = [...new Array(prices.length - mfiValues.length).fill(null), ...mfiValues];

        // 11. OBV
        const obvValues = OBV.calculate({ close: closePrices, volume: volumes });
        const paddedOBV = [...new Array(prices.length - obvValues.length).fill(null), ...obvValues];

        // 12. TRIX
        const trixValues = TRIX.calculate({ values: closePrices, period: 18 });
        const paddedTRIX = [...new Array(prices.length - trixValues.length).fill(null), ...trixValues];

        // 13. VWAP
        const vwapValues = VWAP.calculate({ high: highPrices, low: lowPrices, close: closePrices, volume: volumes });
        const paddedVWAP = [...new Array(prices.length - vwapValues.length).fill(null), ...vwapValues];

        // 14. CCI
        const cciValues = CCI.calculate({ high: highPrices, low: lowPrices, close: closePrices, period: 20 });
        const paddedCCI = [...new Array(prices.length - cciValues.length).fill(null), ...cciValues];

        // 15. ROC
        const rocValues = ROC.calculate({ values: closePrices, period: 12 });
        const paddedROC = [...new Array(prices.length - rocValues.length).fill(null), ...rocValues];

        // 16. KST
        const kstValues = KST.calculate({
            values: closePrices,
            ROCPer1: 10, ROCPer2: 15, ROCPer3: 20, ROCPer4: 30,
            SMAROCPer1: 10, SMAROCPer2: 10, SMAROCPer3: 10, SMAROCPer4: 15,
            signalPeriod: 9
        });
        const paddedKST = [...new Array(prices.length - kstValues.length).fill(null), ...kstValues];

        // 17. PSAR
        const psarValues = PSAR.calculate({ high: highPrices, low: lowPrices, step: 0.02, max: 0.2 });
        const paddedPSAR = [...new Array(prices.length - psarValues.length).fill(null), ...psarValues];

        // 18. ADL
        const adlValues = ADL.calculate({ high: highPrices, low: lowPrices, close: closePrices, volume: volumes });
        const paddedADL = [...new Array(prices.length - adlValues.length).fill(null), ...adlValues];

        // 19. Force Index
        const forceValues = ForceIndex.calculate({ close: closePrices, volume: volumes, period: 13 });
        const paddedForce = [...new Array(prices.length - forceValues.length).fill(null), ...forceValues];

        // 20. Awesome Oscillator
        const aoValues = AwesomeOscillator.calculate({ high: highPrices, low: lowPrices, fastPeriod: 5, slowPeriod: 34 });
        const paddedAO = [...new Array(prices.length - aoValues.length).fill(null), ...aoValues];

        return prices.map((p, idx) => {
            const bodyMin = Math.min(p.open, p.close);
            const bodyMax = Math.max(p.open, p.close);
            return {
                ...p,
                sma20: sma20[idx], sma50: sma50[idx], rsi: paddedRSI[idx], macd: paddedMACD[idx], bb: paddedBB[idx],
                ema20: paddedEMA20[idx], ema50: paddedEMA50[idx], atr: paddedATR[idx], adx: paddedADX[idx],
                stoch: paddedStoch[idx], wr: paddedWR[idx], mfi: paddedMFI[idx], obv: paddedOBV[idx],
                trix: paddedTRIX[idx], vwap: paddedVWAP[idx], cci: paddedCCI[idx], roc: paddedROC[idx],
                kst: paddedKST[idx], psar: paddedPSAR[idx], adl: paddedADL[idx], force: paddedForce[idx],
                ao: paddedAO[idx], bodyRange: [bodyMin, bodyMax]
            };
        });
    }, [prices]);

    const filteredPrices = useMemo(() => {
        if (!dataWithIndicators.length) return [];

        switch (chartTimeframe) {
            case '1M': return dataWithIndicators.slice(-22);
            case '6M': return dataWithIndicators.slice(-126);
            case '1Y': return dataWithIndicators.slice(-252);
            case '5Y':
            case 'MAX':
            default: return dataWithIndicators;
        }
    }, [dataWithIndicators, chartTimeframe]);



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
                    <div className="h-16 border-b border-white/5 bg-slate-900/40 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 relative z-50">
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
                            <div className="relative">
                                <button
                                    onClick={() => setIsSensorsOpen(!isSensorsOpen)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-1.5 text-[10px] font-black rounded-xl transition-all border shrink-0",
                                        isSensorsOpen
                                            ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-400"
                                            : "bg-white/[0.03] border-white/5 text-slate-400 hover:text-white"
                                    )}
                                >
                                    <Layers className="w-3.5 h-3.5" />
                                    <span>TECHNICAL SENSORS</span>
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", isSensorsOpen && "rotate-180")} />
                                </button>

                                {isSensorsOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setIsSensorsOpen(false)}
                                        />
                                        <div className="absolute top-full left-0 mt-2 w-72 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl z-20 p-2 grid grid-cols-2 gap-1 animate-in zoom-in-95 duration-200">
                                            {[
                                                { label: 'SMA', active: showSMA, onClick: () => setShowSMA(!showSMA) },
                                                { label: 'EMA', active: showEMA, onClick: () => setShowEMA(!showEMA) },
                                                { label: 'VWAP', active: showVWAP, onClick: () => setShowVWAP(!showVWAP) },
                                                { label: 'BB', active: showBB, onClick: () => setShowBB(!showBB) },
                                                { label: 'PSAR', active: showPSAR, onClick: () => setShowPSAR(!showPSAR) },
                                                { label: 'VOL', active: showVolume, onClick: () => setShowVolume(!showVolume) },
                                            ].map((btn) => (
                                                <button
                                                    key={btn.label}
                                                    onClick={btn.onClick}
                                                    className={cn(
                                                        "flex items-center justify-between px-3 py-2 rounded-lg transition-all",
                                                        btn.active
                                                            ? "bg-indigo-500/20 text-indigo-400"
                                                            : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                                                    )}
                                                >
                                                    <span className="text-[10px] font-black tracking-widest uppercase">{btn.label}</span>
                                                    {btn.active && <Check className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
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
                    <div className="flex-1 w-full bg-[#020617] relative flex flex-row overflow-hidden">
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Main Price Chart - Increased Height & Elevated Z-Index */}
                            <div className="h-[600px] shrink-0 pt-6 px-8 pb-2 overflow-visible bg-slate-950/20 relative z-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={filteredPrices} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorPriceFullScreen" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
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
                                                    const lows = filteredPrices.map(p => p.low).filter(v => v !== undefined && v !== null);
                                                    const min = lows.length ? Math.min(...lows) : dataMin;
                                                    return min * 0.995;
                                                },
                                                (dataMax: number) => {
                                                    const highs = filteredPrices.map(p => p.high).filter(v => v !== undefined && v !== null);
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
                                                if (!active || !payload || !payload.length || typeof document === 'undefined') return null;
                                                const data = payload[0].payload;
                                                const dateStr = new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                                                const vol = data.volume;

                                                return createPortal(
                                                    <div className="fixed top-24 left-8 z-[10001] bg-slate-950/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3 min-w-[260px] animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{dateStr}</span>
                                                            </div>
                                                            <div className="text-2xl font-black font-mono tracking-tighter mt-1 text-white">
                                                                {currencySymbol}{Number(data.close).toFixed(2)}
                                                            </div>
                                                        </div>

                                                        {chartType === 'candles' && (
                                                            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border-t border-white/5 pt-3">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Open</span>
                                                                    <span className="text-[10px] text-white font-mono">{currencySymbol}{data.open?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">High</span>
                                                                    <span className="text-[10px] text-white font-mono">{currencySymbol}{data.high?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Low</span>
                                                                    <span className="text-[10px] text-white font-mono">{currencySymbol}{data.low?.toFixed(2)}</span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] text-slate-500 font-bold uppercase">Vol</span>
                                                                    <span className="text-[10px] text-white font-mono">{(vol / 1000000).toFixed(1)}M</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                                                            {(showSMA || showEMA || showVWAP || showPSAR || showBB) && (
                                                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Overlay Sensors</div>
                                                            )}

                                                            {showSMA && (
                                                                <div className="flex flex-col gap-1">
                                                                    {data.sma20 && (
                                                                        <div className="flex items-center justify-between border-l-2 border-indigo-500/50 pl-2">
                                                                            <span className="text-[9px] text-indigo-400 font-black uppercase">SMA 20</span>
                                                                            <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.sma20.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    {data.sma50 && (
                                                                        <div className="flex items-center justify-between border-l-2 border-rose-500/50 pl-2">
                                                                            <span className="text-[9px] text-rose-400 font-black uppercase">SMA 50</span>
                                                                            <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.sma50.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {showEMA && (
                                                                <div className="flex flex-col gap-1">
                                                                    {data.ema20 && (
                                                                        <div className="flex items-center justify-between border-l-2 border-cyan-400/50 pl-2">
                                                                            <span className="text-[9px] text-cyan-400 font-black uppercase">EMA 20</span>
                                                                            <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.ema20.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                    {data.ema50 && (
                                                                        <div className="flex items-center justify-between border-l-2 border-orange-400/50 pl-2">
                                                                            <span className="text-[9px] text-orange-400 font-black uppercase">EMA 50</span>
                                                                            <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.ema50.toFixed(2)}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {showVWAP && data.vwap && (
                                                                <div className="flex items-center justify-between border-l-2 border-pink-500/50 pl-2">
                                                                    <span className="text-[9px] text-pink-500 font-black uppercase">VWAP</span>
                                                                    <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.vwap.toFixed(2)}</span>
                                                                </div>
                                                            )}

                                                            {showPSAR && data.psar && (
                                                                <div className="flex items-center justify-between border-l-2 border-yellow-400/50 pl-2">
                                                                    <span className="text-[9px] text-yellow-400 font-black uppercase">PSAR</span>
                                                                    <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.psar.toFixed(2)}</span>
                                                                </div>
                                                            )}

                                                            {showBB && data.bb && (
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between border-l-2 border-slate-500/50 pl-2">
                                                                        <span className="text-[9px] text-slate-400 font-black uppercase">BB Upper</span>
                                                                        <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.bb.upper.toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between border-l-2 border-slate-500/50 pl-2">
                                                                        <span className="text-[9px] text-slate-400 font-black uppercase">BB Lower</span>
                                                                        <span className="text-[9px] text-slate-300 font-mono">{currencySymbol}{data.bb.lower.toFixed(2)}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>


                                                    </div>,
                                                    document.body
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
                                                <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#818cf8" strokeWidth={2} dot={false} animationDuration={1200} />
                                                <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#fb7185" strokeWidth={2} dot={false} animationDuration={1500} />
                                            </>
                                        )}

                                        {showPSAR && (
                                            <Line yAxisId="price" type="monotone" dataKey="psar" name="PSAR" stroke="#facc15" strokeWidth={0} dot={{ r: 1.5, fill: '#facc15' }} animationDuration={1000} />
                                        )}

                                        {showVWAP && (
                                            <Line yAxisId="price" type="monotone" dataKey="vwap" stroke="#f472b6" strokeWidth={2} strokeDasharray="4 4" dot={false} animationDuration={1100} />
                                        )}

                                        {showEMA && (
                                            <>
                                                <Line yAxisId="price" type="monotone" dataKey="ema20" stroke="#22d3ee" strokeWidth={2} dot={false} animationDuration={1300} />
                                                <Line yAxisId="price" type="monotone" dataKey="ema50" stroke="#fb923c" strokeWidth={2} dot={false} animationDuration={1600} />
                                            </>
                                        )}

                                        {showBB && (
                                            <>
                                                <Line yAxisId="price" type="monotone" dataKey="bb.upper" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                                                <Line yAxisId="price" type="monotone" dataKey="bb.lower" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="5 5" dot={false} />
                                                <Area yAxisId="price" type="monotone" dataKey="bb.upper" stroke="none" fill="rgba(255,255,255,0.02)" />
                                            </>
                                        )}

                                        {showVolume && (
                                            <Bar yAxisId="volume" dataKey="volume" fill="#eab308" fillOpacity={0.4} radius={[1, 1, 0, 0]} animationDuration={500} />
                                        )}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Scrollable Indicator Chamber */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/10 border-t border-white/5 pb-12">
                                {/* RSI */}
                                {/* RSI */}
                                <IndicatorChart title="Relative Strength Index (14)" color="#f59e0b" dataKey="rsi" data={filteredPrices} domain={[0, 100]} ticks={[30, 70]} />
                                <IndicatorChart title="MACD Momentum Pulse" color="#0ea5e9" dataKey="macd.MACD" secondaryKey="macd.signal" barKey="macd.histogram" data={filteredPrices} />
                                <IndicatorChart title="Awesome Oscillator" color="#10b981" dataKey="ao" data={filteredPrices} type="bar" />
                                <IndicatorChart title="Force Index (13)" color="#f43f5e" dataKey="force" data={filteredPrices} type="area" />
                                <IndicatorChart title="KST Precision Oscillator" color="#6366f1" dataKey="kst.kst" secondaryKey="kst.signal" secondaryColor="#f43f5e" data={filteredPrices} />
                                <IndicatorChart title="Rate of Change (12)" color="#22d3ee" dataKey="roc" data={filteredPrices} />
                                <IndicatorChart title="Money Flow Index" color="#eab308" dataKey="mfi" data={filteredPrices} type="area" domain={[0, 100]} ticks={[20, 80]} />
                                <IndicatorChart title="Stochastic Momentum (%K/%D)" color="#a78bfa" dataKey="stoch.k" secondaryKey="stoch.d" secondaryColor="#f472b6" data={filteredPrices} domain={[0, 100]} ticks={[20, 80]} />
                                <IndicatorChart title="Williams %R Precision Range" color="#10b981" dataKey="wr" data={filteredPrices} domain={[-100, 0]} ticks={[-80, -20]} />
                                <IndicatorChart title="Commodity Channel Index" color="#2dd4bf" dataKey="cci" data={filteredPrices} />
                                <IndicatorChart title="On-Balance Volume Accumulation" color="#06b6d4" dataKey="obv" data={filteredPrices} type="area" />
                                <IndicatorChart title="Average Directional Index (ADX)" color="#818cf8" dataKey="adx.adx" secondaryKey="adx.pdi" secondaryColor="#10b981" tertiaryKey="adx.mdi" tertiaryColor="#f43f5e" data={filteredPrices} domain={[0, 100]} />
                                <IndicatorChart title="Average True Range (ATR)" color="#64748b" dataKey="atr" data={filteredPrices} type="area" />
                                <IndicatorChart title="Accumulation / Distribution Line" color="#f97316" dataKey="adl" data={filteredPrices} />
                                <IndicatorChart title="Triple Exponential Average (TRIX)" color="#ec4899" dataKey="trix" data={filteredPrices} />
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
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase">RSI (14)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase">ADX Trend</span>
                                    </div>
                                    {showVWAP && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-pink-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">VWAP</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase">MFI</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-violet-500/40" />
                                        <span className="text-[9px] font-black text-slate-500 uppercase">Stochastic</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-mono text-slate-600">PROMETHEUS_TA_ENGINE_v1.2</span>
                                    <span className="text-[9px] font-mono text-emerald-500/40">SENSORS_STABLE</span>
                                </div>
                            </div>
                        </div>

                        {/* Technical Intelligence Side Panel */}
                        <div className="w-80 border-l border-white/5 bg-slate-950/50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-500">
                            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-3 mb-1">
                                    <Binary className="w-4 h-4 text-indigo-400" />
                                    <h3 className="text-xs font-black text-white uppercase tracking-widest">Technical Intelligence</h3>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Active Indicators</h4>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {dataWithIndicators.length > 0 && (
                                            <>
                                                {[
                                                    { label: 'RSI (14)', value: dataWithIndicators[dataWithIndicators.length - 1].rsi?.toFixed(1), color: dataWithIndicators[dataWithIndicators.length - 1].rsi > 70 ? "text-rose-400" : dataWithIndicators[dataWithIndicators.length - 1].rsi < 30 ? "text-emerald-400" : "text-white" },
                                                    { label: 'MACD (12,26)', value: dataWithIndicators[dataWithIndicators.length - 1].macd?.MACD?.toFixed(2), color: "text-sky-400" },
                                                    { label: 'ADX Trend', value: dataWithIndicators[dataWithIndicators.length - 1].adx?.adx?.toFixed(1), color: dataWithIndicators[dataWithIndicators.length - 1].adx?.adx > 25 ? "text-indigo-400" : "text-slate-500" },
                                                    { label: 'Stoch %K', value: dataWithIndicators[dataWithIndicators.length - 1].stoch?.k?.toFixed(1), color: dataWithIndicators[dataWithIndicators.length - 1].stoch?.k > 80 ? "text-rose-400" : dataWithIndicators[dataWithIndicators.length - 1].stoch?.k < 20 ? "text-emerald-400" : "text-white" },
                                                    { label: 'MFI (14)', value: dataWithIndicators[dataWithIndicators.length - 1].mfi?.toFixed(0), color: dataWithIndicators[dataWithIndicators.length - 1].mfi > 70 ? "text-rose-400" : dataWithIndicators[dataWithIndicators.length - 1].mfi < 30 ? "text-emerald-400" : "text-white" },
                                                    { label: 'Will %R', value: dataWithIndicators[dataWithIndicators.length - 1].wr?.toFixed(1), color: dataWithIndicators[dataWithIndicators.length - 1].wr < -80 ? "text-emerald-400" : dataWithIndicators[dataWithIndicators.length - 1].wr > -20 ? "text-rose-400" : "text-white" },
                                                    { label: 'CCI (20)', value: dataWithIndicators[dataWithIndicators.length - 1].cci?.toFixed(0), color: Math.abs(dataWithIndicators[dataWithIndicators.length - 1].cci) > 100 ? "text-indigo-400" : "text-white" },
                                                    { label: 'ATR Range', value: `${currencySymbol}${dataWithIndicators[dataWithIndicators.length - 1].atr?.toFixed(2)}`, color: "text-slate-300" },
                                                ].map((item, idx) => (
                                                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-1 hover:bg-white/[0.05] transition-colors group">
                                                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-slate-400">{item.label}</span>
                                                        <span className={cn("text-[11px] font-black font-mono leading-none", item.color)}>
                                                            {item.value || '---'}
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="col-span-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between hover:bg-white/[0.05] transition-colors group">
                                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-slate-400">OBV Accumulation</span>
                                                    <span className="text-[11px] font-black font-mono text-cyan-400">
                                                        {(dataWithIndicators[dataWithIndicators.length - 1].obv / 1000000).toFixed(1)}M
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
