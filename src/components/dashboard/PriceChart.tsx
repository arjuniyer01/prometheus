"use client";

import { useMemo, useState, useRef } from "react";
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
    Scatter,
    ReferenceLine,
    Label,
} from "recharts";
import { createPortal } from "react-dom";
import { Maximize2, Loader2, X, BarChart3, Binary, Activity, Waves, ChevronDown, Check, Layers, ScanEye, Download, Calendar } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { SMA, RSI, MACD, BollingerBands, EMA, ADX, ATR, Stochastic, WilliamsR, MFI, OBV, TRIX, VWAP, CCI, ROC, KST, PSAR, ADL, ForceIndex, AwesomeOscillator } from "technicalindicators";
import { calculateSRLevels, checkSemiReversalSignal, calculateDPO, calculateKCW } from "@/lib/technical-analysis";


const PatternShape = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.pattern) return null;

    const isBull = payload.pattern.type === 'bull';
    const isBear = payload.pattern.type === 'bear';
    const color = isBull ? '#10b981' : (isBear ? '#f43f5e' : '#fbbf24');

    return (
        <g transform={`translate(${cx},${cy})`}>
            <circle r={3} fill={color} strokeWidth={0} />
            <circle r={5} fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
        </g>
    );
};

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
    smhPrices?: any[];
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
    getRawChanges,
    smhPrices = []
}: PriceChartProps) {
    const [showRSI, setShowRSI] = useState(true);
    const [showMACD, setShowMACD] = useState(true);
    const [showBB, setShowBB] = useState(true);
    const [showEMA, setShowEMA] = useState(false);
    const [showStoch, setShowStoch] = useState(true);
    const [showATR, setShowATR] = useState(true);
    const [showADX, setShowADX] = useState(true);
    const [showWR, setShowWR] = useState(true);
    const [showMFI, setShowMFI] = useState(true);
    const [showOBV, setShowOBV] = useState(true);
    const [showTRIX, setShowTRIX] = useState(true);
    const [showVWAP, setShowVWAP] = useState(false);
    const [showCCI, setShowCCI] = useState(true);
    const [showROC, setShowROC] = useState(true);
    const [showKST, setShowKST] = useState(true);
    const [showPSAR, setShowPSAR] = useState(false);
    const [showADL, setShowADL] = useState(true);
    const [showForce, setShowForce] = useState(true);
    const [showAO, setShowAO] = useState(true);
    const [showSR, setShowSR] = useState(true);
    const [showPatterns, setShowPatterns] = useState(false);
    const [showStrategyDetails, setShowStrategyDetails] = useState(false);
    const terminalChartRef = useRef<HTMLDivElement>(null);

    const IndicatorTooltip = ({ active, payload, suffix = "" }: any) => {
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
    };

    const [isSensorsOpen, setIsSensorsOpen] = useState(false);

    const dataWithIndicators = useMemo(() => {
        if (!prices.length) return [];

        const closePrices = prices.map(p => p.close);
        const highPrices = prices.map(p => p.high);
        const lowPrices = prices.map(p => p.low);
        const volumes = prices.map(p => p.volume);

        // 1. SMA
        const sma20Values = SMA.calculate({ values: closePrices, period: 20 });
        const sma20 = [...new Array(prices.length - sma20Values.length).fill(null), ...sma20Values];
        const sma50Values = SMA.calculate({ values: closePrices, period: 50 });
        const sma50 = [...new Array(prices.length - sma50Values.length).fill(null), ...sma50Values];

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

        const aoValues = AwesomeOscillator.calculate({ high: highPrices, low: lowPrices, fastPeriod: 5, slowPeriod: 34 });
        const paddedAO = [...new Array(prices.length - aoValues.length).fill(null), ...aoValues];

        // 21. DPO and KCW for Strategy detection
        const dpoValues = calculateDPO(closePrices, 20);
        const kcwValues = calculateKCW(highPrices, lowPrices, closePrices, 20, 2);

        // Pre-calculate date strings for backtest speed
        const dateStrings = prices.map(p => {
            try {
                return new Date(p.date).toISOString().split('T')[0];
            } catch (e) {
                return "";
            }
        });

        const data = prices.map((p, idx) => {
            const bodyMin = Math.min(p.open, p.close);
            const bodyMax = Math.max(p.open, p.close);

            let pattern = null;
            let patternY = null;

            if (idx > 0) {
                const prev = prices[idx - 1];
                const O = p.open; const H = p.high; const L = p.low; const C = p.close;
                const pO = prev.open; const pC = prev.close;
                const body = Math.abs(C - O);
                const range = H - L;
                const upperWick = H - Math.max(C, O);
                const lowerWick = Math.min(C, O) - L;
                const isGreen = C > O;
                const isRed = C < O;
                const isPrevRed = pC < pO;
                const isPrevGreen = pC > pO;

                // Doji (Indecision)
                if (body <= range * 0.1 && range > 0) {
                    pattern = { name: "Doji", type: "neutral" };
                    patternY = H * 1.002;
                }
                // Bullish Engulfing
                else if (isPrevRed && isGreen && C > pO && O < pC) {
                    pattern = { name: "Bull Engulf", type: "bull" };
                    patternY = L * 0.998;
                }
                // Bearish Engulfing
                else if (isPrevGreen && isRed && C < pO && O > pC) {
                    pattern = { name: "Bear Engulf", type: "bear" };
                    patternY = H * 1.002;
                }
                // Hammer
                else if (lowerWick > body * 2 && upperWick < body * 0.5) {
                    pattern = { name: "Hammer", type: "bull" };
                    patternY = L * 0.998;
                }
                // Shooting Star
                else if (upperWick > body * 2 && lowerWick < body * 0.5) {
                    pattern = { name: "Shooting Star", type: "bear" };
                    patternY = H * 1.002;
                }
            }

            return {
                ...p,
                sma20: sma20[idx], sma50: sma50[idx], rsi: paddedRSI[idx], macd: paddedMACD[idx], bb: paddedBB[idx],
                ema20: paddedEMA20[idx], ema50: paddedEMA50[idx], atr: paddedATR[idx], adx: paddedADX[idx],
                stoch: paddedStoch[idx], wr: paddedWR[idx], mfi: paddedMFI[idx], obv: paddedOBV[idx],
                trix: paddedTRIX[idx], vwap: paddedVWAP[idx], cci: paddedCCI[idx], roc: paddedROC[idx],
                kst: paddedKST[idx], psar: paddedPSAR[idx], adl: paddedADL[idx], force: paddedForce[idx],
                ao: paddedAO[idx], bodyRange: [bodyMin, bodyMax],
                pattern, patternY,
                dpo: dpoValues[idx],
                kcw: kcwValues[idx],
                dateStr: dateStrings[idx]
            };
        });

        // 21. Support and Resistance Levels
        const latestATR = paddedATR[paddedATR.length - 1] || 0;
        const srLevels = calculateSRLevels(highPrices, lowPrices, closePrices, latestATR);


        // Attach SR Levels to the last data point for display
        if (data.length > 0) {
            // @ts-ignore
            data[data.length - 1].srLevels = srLevels;
        }
        return data;
    }, [prices]);

    const strategyBacktest = useMemo(() => {
        if (!prices.length || !smhPrices.length || !dataWithIndicators.length) return null;

        // 1. Prepare benchmark data (Date map for O(1) lookup)
        const smhCloses = smhPrices.map(p => p.close);
        const smhSMA50 = SMA.calculate({ period: 50, values: smhCloses });
        const smhSMA50Padded = [...new Array(smhPrices.length - smhSMA50.length).fill(null), ...smhSMA50];
        const benchmarkMap = new Map();
        smhPrices.forEach((p, i) => {
            try {
                const dateStr = typeof p.date === 'string' ? p.date.split('T')[0] : new Date(p.date).toISOString().split('T')[0];
                benchmarkMap.set(dateStr, { close: p.close, sma50: smhSMA50Padded[i] });
            } catch (e) {
                // Ignore invalid dates
            }
        });

        let totalSignals = 0;
        let successfulSignals = 0;
        let totalReturns = 0;

        const signals = dataWithIndicators.map((point, i) => {
            const dateStr = point.dateStr;
            if (!dateStr) return { ...point, strategySignal: false };
            const bench = benchmarkMap.get(dateStr);

            if (!bench || !bench.sma50) return { ...point, strategySignal: false };

            const isSectorCrash = bench.close <= bench.sma50 * 0.90;
            const isVolExpansion = (point.kcw || 0) > 7.2;
            const isOversold = (point.wr || 0) < -81;
            const isStabilized = (point.dpo || 0) > -0.31;

            const isSignal = isSectorCrash && isVolExpansion && isOversold && isStabilized;

            if (isSignal) {
                totalSignals++;
                if (i < dataWithIndicators.length - 3) {
                    const entryPrice = point.close;
                    const maxPriceNext3Days = Math.max(
                        dataWithIndicators[i + 1].high || dataWithIndicators[i + 1].close,
                        dataWithIndicators[i + 2].high || dataWithIndicators[i + 2].close,
                        dataWithIndicators[i + 3].high || dataWithIndicators[i + 3].close
                    );
                    const returnPct = ((maxPriceNext3Days - entryPrice) / entryPrice) * 100;
                    totalReturns += returnPct;
                    if (returnPct >= 6.0) successfulSignals++;
                }
            }

            return { ...point, strategySignal: isSignal };
        });

        const lastPoint = dataWithIndicators[dataWithIndicators.length - 1];
        const lastDateStr = lastPoint ? new Date(lastPoint.date).toISOString().split('T')[0] : '';
        const lastBench = benchmarkMap.get(lastDateStr);

        console.log(`[Backtest] ${totalSignals} signals found for ${prices.length} points. SMH data points: ${smhPrices.length}`);

        return {
            signals,
            active: signals[signals.length - 1]?.strategySignal || false,
            stats: {
                total: totalSignals,
                success: successfulSignals,
                precision: totalSignals > 0 ? (successfulSignals / Math.max(1, totalSignals - (signals[signals.length - 1].strategySignal ? 3 : 0))) * 100 : 0,
                avgReturn: totalSignals > 0 ? totalReturns / totalSignals : 0
            },
            currentPillars: {
                sectorCrash: lastBench?.close <= lastBench?.sma50 * 0.90,
                volExpansion: (lastPoint?.kcw || 0) > 7.2,
                oversold: (lastPoint?.wr || 0) < -81,
                stabilization: (lastPoint?.dpo || 0) > -0.31
            }
        };
    }, [dataWithIndicators, smhPrices, prices]);

    const semiReversalSignal = useMemo(() => {
        if (!strategyBacktest) return null;
        return {
            active: strategyBacktest.active,
            confidence: 0.6989, // From model
            stats: strategyBacktest.stats,
            pillars: strategyBacktest.currentPillars,
            dates: strategyBacktest.signals
                .filter(s => s.strategySignal)
                .map(s => s.dateStr || new Date(s.date).toISOString().split('T')[0])
        };
    }, [strategyBacktest]);

    const filteredPrices = useMemo(() => {
        if (!dataWithIndicators.length) return [];
        if (!isChartExpanded) return dataWithIndicators.slice(-1260); // Mini Chart = 5Y Data (approx 252 * 5)

        switch (chartTimeframe) {
            case '1M': return dataWithIndicators.slice(-22);
            case '6M': return dataWithIndicators.slice(-126);
            case '1Y': return dataWithIndicators.slice(-252);
            case '5Y': return dataWithIndicators.slice(-1260);
            case 'MAX': return dataWithIndicators;
            default: return dataWithIndicators.slice(-252);
        }
    }, [dataWithIndicators, chartTimeframe, isChartExpanded]);


    const combinedData = useMemo(() => {
        return filteredPrices;
    }, [filteredPrices]);

    const handleDownloadCSV = () => {
        if (!dataWithIndicators.length) return;

        const headers = [
            "Date", "Open", "High", "Low", "Close", "Volume",
            "SMA20", "SMA50", "EMA20", "EMA50", "VWAP", "PSAR",
            "RSI", "MACD", "MACD_Signal", "MACD_Hist",
            "BB_Upper", "BB_Lower", "BB_Middle",
            "ADX", "ADX_PDI", "ADX_MDI",
            "Stoch_K", "Stoch_D",
            "ATR", "MFI", "OBV", "TRIX", "CCI", "ROC", "KST", "ADL", "Force", "AO", "WilliamsR",
            "Pattern_Name", "Pattern_Type"
        ];

        const rows = dataWithIndicators.map(p => {
            const date = new Date(p.date).toISOString().split('T')[0];
            return [
                date, p.open, p.high, p.low, p.close, p.volume,
                p.sma20, p.sma50, p.ema20, p.ema50, p.vwap, p.psar,
                p.rsi, p.macd?.MACD, p.macd?.signal, p.macd?.histogram,
                p.bb?.upper, p.bb?.lower, p.bb?.middle,
                p.adx?.adx, p.adx?.pdi, p.adx?.mdi,
                p.stoch?.k, p.stoch?.d,
                p.atr, p.mfi, p.obv, p.trix, p.cci, p.roc, p.kst?.kst, p.adl, p.force, p.ao, p.wr,
                p.pattern?.name || '', p.pattern?.type || ''
            ].map(v => v === undefined || v === null ? '' : v).join(',');
        });

        const csvContent = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${tickerData?.ticker || selectedSymbol}_FULL_DATA.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                                <YAxis hide />
                                <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke={chartColor}
                                    strokeWidth={2}
                                    fillOpacity={1}
                                    fill="url(#colorPrice)"
                                />



                                <Scatter
                                    data={filteredPrices.filter((s: any) => s.strategySignal)}
                                    shape={(props: any) => {
                                        const { cx, cy } = props;
                                        if (!cx || !cy) return null;
                                        return (
                                            <g transform={`translate(${cx},${cy})`}>
                                                <circle r={3} fill="#10b981" />
                                                <circle r={6} stroke="#10b981" strokeWidth={1} fill="none" opacity={0.5} className="animate-pulse" />
                                            </g>
                                        );
                                    }}
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

                {/* Semi-Reversal Signal Banner */}
                {tickerData?.industry?.toLowerCase().includes("semiconductor") && (
                    <div className={cn(
                        "mx-6 mb-6 rounded-2xl border transition-all overflow-hidden",
                        semiReversalSignal?.active
                            ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.1)]"
                            : "bg-white/[0.02] border-white/5"
                    )}>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center border",
                                    semiReversalSignal?.active
                                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                                        : "bg-slate-800/50 border-white/5 text-slate-500"
                                )}>
                                    <Binary className={cn("w-5 h-5", semiReversalSignal?.active && "animate-pulse")} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className={cn("text-xs font-black uppercase tracking-widest", semiReversalSignal?.active ? "text-emerald-400" : "text-slate-400")}>
                                            Semi-Reversal Strategy
                                        </h4>
                                        {semiReversalSignal?.active && (
                                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500 text-black text-[8px] font-black uppercase tracking-tighter">
                                                Signal Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-1 font-medium italic">
                                        {semiReversalSignal?.active
                                            ? "Golden Reversal Signature Confirmed: Maximum Compression during Sector Bloodbath."
                                            : "Analyzing sector signals for mean-reversion signature..."}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                {semiReversalSignal?.active && (
                                    <div className="text-right">
                                        <div className="text-xl font-black text-emerald-500 font-mono tracking-tighter">
                                            {(semiReversalSignal.confidence * 100).toFixed(2)}%
                                        </div>
                                        <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Confidence Score</div>
                                    </div>
                                )}
                                <button
                                    onClick={() => setShowStrategyDetails(!showStrategyDetails)}
                                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    {showStrategyDetails ? "Hide Intel" : "Strategy Intel"}
                                    <ChevronDown className={cn("w-3 h-3 transition-transform", showStrategyDetails && "rotate-180")} />
                                </button>
                            </div>
                        </div>

                        {showStrategyDetails && (
                            <div className="border-t border-white/5 bg-black/20 p-6 animate-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Strategy Rules */}
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <Layers className="w-3 h-3" /> Detection Pillars
                                        </h5>
                                        <div className="space-y-3">
                                            {[
                                                { label: "1. Sector Crash", rule: "SMH ETF < SMA50 by 10%", icon: Waves, active: semiReversalSignal?.pillars?.sectorCrash },
                                                { label: "2. Vol Expansion", rule: "Stock KCW > 7.2", icon: Activity, active: semiReversalSignal?.pillars?.volExpansion },
                                                { label: "3. Terminal Oversold", rule: "Williams %R < -81", icon: ChevronDown, active: semiReversalSignal?.pillars?.oversold },
                                                { label: "4. Stabilization", rule: "DPO > -0.31", icon: Check, active: semiReversalSignal?.pillars?.stabilization },
                                            ].map((pillar, idx) => (
                                                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/5">
                                                    <div className="flex items-center gap-3">
                                                        <pillar.icon className={cn("w-3 h-3 transition-colors", pillar.active ? "text-emerald-500" : "text-slate-600")} />
                                                        <div>
                                                            <div className={cn("text-[9px] font-bold uppercase transition-colors", pillar.active ? "text-slate-200" : "text-slate-400")}>{pillar.label}</div>
                                                            <div className="text-[9px] font-mono text-slate-500">{pillar.rule}</div>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter transition-all",
                                                        pillar.active ? "bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-slate-800 text-slate-600"
                                                    )}>
                                                        {pillar.active ? "PASS" : "WAIT"}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Recent Signals List */}
                                        {semiReversalSignal?.dates && semiReversalSignal.dates.length > 0 && (
                                            <div className="mt-4 pt-4 border-t border-white/5">
                                                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3" /> Signal History (Last 5)
                                                </h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {semiReversalSignal.dates.slice(-5).reverse().map((date: string, idx: number) => (
                                                        <span key={idx} className="px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                                                            {date}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Diagnostic Intel */}
                                        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", smhPrices.length > 0 ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
                                                    Benchmark Sync: {smhPrices.length > 0 ? `Active (${smhPrices.length}d)` : "Disconnected"}
                                                </span>
                                            </div>
                                            <span className="text-[8px] font-bold text-slate-700 uppercase">Engine v2.5.0</span>
                                        </div>
                                    </div>

                                    {/* Backtest Intel */}
                                    <div>
                                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <ScanEye className="w-3 h-3" /> Live Backtest Analysis
                                        </h5>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                                <div className="text-xl font-black text-white font-mono">{semiReversalSignal?.stats?.precision.toFixed(2)}%</div>
                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Live Accuracy</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                                                <div className="text-xl font-black text-slate-400 font-mono">{semiReversalSignal?.stats?.success} / {semiReversalSignal?.stats?.total}</div>
                                                <div className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1">Success Count</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                                                <div className="text-xl font-black text-emerald-500 font-mono">+{semiReversalSignal?.stats?.avgReturn.toFixed(1)}%</div>
                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Avg Max Return</div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
                                                <div className="text-xl font-black text-indigo-400 font-mono">3 Days</div>
                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Hold Period</div>
                                            </div>
                                        </div>
                                        <p className="mt-4 text-[9px] text-slate-600 italic leading-relaxed">
                                            * Backtest executed in real-time using {prices.length} historical data points. "Success" defined as hitting +6% target within 3 trading days of signal.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
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
                                                { label: 'PATTERNS', active: showPatterns, onClick: () => setShowPatterns(!showPatterns) },
                                                { label: 'S/R', active: showSR, onClick: () => setShowSR(!showSR) },
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
                            <div ref={terminalChartRef} className="h-[600px] shrink-0 pt-6 pr-6 pb-2 overflow-visible bg-slate-950/20 relative z-20">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={combinedData} margin={{ top: 20, right: 20, left: 20, bottom: 0 }}>
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
                                                    const lows = combinedData.map(p => p.low || p.projectionLower).filter(v => v !== undefined && v !== null);
                                                    const min = lows.length ? Math.min(...lows) : dataMin;
                                                    return min * 0.995;
                                                },
                                                (dataMax: number) => {
                                                    const highs = combinedData.map(p => p.high || p.projectionUpper).filter(v => v !== undefined && v !== null);
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
                                            content={({ active, payload, coordinate }) => {
                                                if (!active || !payload || !payload.length || typeof document === 'undefined') return null;
                                                const data = payload[0].payload;
                                                const dateStr = new Date(data.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                                                const vol = data.volume;
                                                const isProj = data.isProjection;
                                                const isSignal = data.strategySignal;

                                                const rect = terminalChartRef.current?.getBoundingClientRect();
                                                const x = (rect?.left || 0) + (coordinate?.x ?? 0);
                                                const y = (rect?.top || 0) + (coordinate?.y ?? 0);

                                                return createPortal(
                                                    <div
                                                        style={{
                                                            position: 'fixed',
                                                            left: x > window.innerWidth - 300 ? (x - 280) : (x + 20),
                                                            top: y > window.innerHeight - 300 ? (y - 120) : (y + 20),
                                                            pointerEvents: 'none',
                                                            transition: 'all 0.1s ease-out'
                                                        }}
                                                        className="z-[10001] bg-slate-950/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-3 min-w-[260px] animate-in fade-in zoom-in-95 duration-200"
                                                    >
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{dateStr}</span>
                                                            </div>
                                                            {!isProj && (
                                                                <div className="text-2xl font-black font-mono tracking-tighter mt-1 text-white">
                                                                    {Number(data.close).toFixed(2)}
                                                                </div>
                                                            )}

                                                            {data.pattern && (
                                                                <div className={cn("mt-2 px-2 py-1 rounded bg-white/5 border flex items-center gap-2",
                                                                    data.pattern.type === 'bull' ? "border-emerald-500/30 text-emerald-400" :
                                                                        data.pattern.type === 'bear' ? "border-rose-500/30 text-rose-400" :
                                                                            "border-amber-500/30 text-amber-400"
                                                                )}>
                                                                    <ScanEye className="w-3 h-3" />
                                                                    <span className="text-[9px] font-black uppercase tracking-wider">{data.pattern.name} Detected</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {chartType === 'candles' && !isProj && (
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

                                        {/* Strategy Signal Vertical Lines */}
                                        {combinedData.filter((s: any) => s.strategySignal).map((signal: any, idx: number) => {
                                            // Ensure we match the categorical XAxis which is typically date string or index
                                            // The XAxis dataKey="date" typically refers to the formatted date string or timestamp depending on setup
                                            // Since XAxis uses "date" and tickFormatter parses it, let's use the exact value from the data payload
                                            return (
                                                <ReferenceLine
                                                    key={`signal-line-${idx}`}
                                                    yAxisId="price"
                                                    x={signal.date}
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    strokeDasharray="3 3"
                                                    opacity={1}
                                                    label={{ position: 'insideTop', value: 'SIGNAL', fill: '#10b981', fontSize: 10, fontWeight: 'bold' }}
                                                />
                                            );
                                        })}

                                        {/* Strategy Signal Dots */}
                                        <Scatter
                                            yAxisId="price"
                                            data={combinedData.filter((s: any) => s.strategySignal)}
                                            shape={(props: any) => {
                                                const { cx, cy } = props;
                                                if (!cx || !cy) return null;
                                                return (
                                                    <g transform={`translate(${cx},${cy})`}>
                                                        <circle r={6} fill="#10b981" />
                                                        <circle r={12} stroke="#10b981" strokeWidth={1} fill="none" opacity={0.5} className="animate-pulse" />
                                                        <text x={0} y={-15} textAnchor="middle" fill="#10b981" fontSize="10" fontWeight="900" className="uppercase tracking-tighter shadow-sm">SIGNAL</text>
                                                    </g>
                                                );
                                            }}
                                        />


                                        {showSMA && (
                                            <>
                                                <Line yAxisId="price" type="monotone" dataKey="sma20" stroke="#818cf8" strokeWidth={2} dot={false} animationDuration={1200} />
                                                <Line yAxisId="price" type="monotone" dataKey="sma50" stroke="#fb7185" strokeWidth={2} dot={false} animationDuration={1500} />
                                            </>
                                        )}

                                        {showSR && filteredPrices.length > 0 && filteredPrices[filteredPrices.length - 1]?.srLevels?.map((level: any, i: number) => (
                                            <ReferenceLine
                                                key={`sr-${i}`}
                                                yAxisId="price"
                                                y={level.price}
                                                stroke={level.type === 'support' ? '#10b981' : '#f43f5e'}
                                                strokeDasharray="3 3"
                                                strokeOpacity={0.4 + (level.strength * 0.4)}
                                                strokeWidth={1}
                                            >
                                                <Label
                                                    value={`${level.type === 'support' ? 'SUP' : 'RES'} ${level.price}`}
                                                    position="insideRight"
                                                    fill={level.type === 'support' ? '#10b981' : '#f43f5e'}
                                                    fontSize={7}
                                                    fontWeight="bold"
                                                    offset={5}
                                                />
                                            </ReferenceLine>
                                        ))}

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
                                        {showPatterns && (
                                            <Scatter
                                                yAxisId="price"
                                                dataKey="patternY"
                                                shape={<PatternShape />}
                                                isAnimationActive={false}
                                            />
                                        )}

                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Scrollable Indicator Chamber */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/10 border-t border-white/5 pb-12">
                                {/* RSI */}
                                {showRSI && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-amber-500/50 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Relative Strength Index (14)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} ticks={[30, 70]} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="rsi" name="RSI" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* MACD */}
                                {showMACD && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-sky-500/50 uppercase tracking-widest group-hover:text-sky-500 transition-colors">MACD Momentum Pulse</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Bar dataKey="macd.histogram" name="Histogram" fill="#475569" fillOpacity={0.4} />
                                                <Line type="monotone" dataKey="macd.MACD" name="MACD" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                                                <Line type="monotone" dataKey="macd.signal" name="Signal" stroke="#f97316" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Awesome Oscillator */}
                                {showAO && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-emerald-500/50 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Awesome Oscillator</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Bar dataKey="ao" name="AO" fill="#10b981" fillOpacity={0.4} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Force Index */}
                                {showForce && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-rose-500/50 uppercase tracking-widest group-hover:text-rose-500 transition-colors">Force Index (13)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Area type="monotone" dataKey="force" name="Force Index" fill="#f43f5e" fillOpacity={0.1} stroke="#f43f5e" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Know Sure Thing (KST) */}
                                {showKST && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-indigo-500/50 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">KST Precision Oscillator</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="kst.kst" name="KST" stroke="#6366f1" strokeWidth={1.5} dot={false} />
                                                <Line type="monotone" dataKey="kst.signal" name="Signal" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Rate of Change (ROC) */}
                                {showROC && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-cyan-500/50 uppercase tracking-widest group-hover:text-cyan-500 transition-colors">Rate of Change (12)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="roc" name="ROC" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* MFI */}
                                {showMFI && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-yellow-500/50 uppercase tracking-widest group-hover:text-yellow-500 transition-colors">Money Flow Index</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} ticks={[20, 80]} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Area type="monotone" dataKey="mfi" name="MFI" fill="#eab308" fillOpacity={0.1} stroke="#eab308" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Stochastic */}
                                {showStoch && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-violet-500/50 uppercase tracking-widest group-hover:text-violet-500 transition-colors">Stochastic Momentum (%K/%D)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} ticks={[20, 80]} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="stoch.k" name="Stoch %K" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                                                <Line type="monotone" dataKey="stoch.d" name="Stoch %D" stroke="#f472b6" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* Williams %R */}
                                {showWR && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-emerald-500/50 uppercase tracking-widest group-hover:text-emerald-500 transition-colors">Williams %R Precision Range</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" domain={[-100, 0]} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} ticks={[-80, -20]} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="wr" name="Williams %R" stroke="#10b981" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* CCI */}
                                {showCCI && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-teal-500/50 uppercase tracking-widest group-hover:text-teal-500 transition-colors">Commodity Channel Index</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="cci" name="CCI" stroke="#2dd4bf" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* OBV */}
                                {showOBV && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-cyan-500/50 uppercase tracking-widest group-hover:text-cyan-500 transition-colors">On-Balance Volume Accumulation</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" hide />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Area type="monotone" dataKey="obv" name="OBV" fill="#06b6d4" fillOpacity={0.1} stroke="#06b6d4" strokeWidth={1} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* ADX */}
                                {showADX && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-indigo-500/50 uppercase tracking-widest group-hover:text-indigo-500 transition-colors">Average Directional Index (ADX)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="adx.adx" name="ADX" stroke="#818cf8" strokeWidth={2} dot={false} />
                                                <Line type="monotone" dataKey="adx.pdi" name="+DI" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                                <Line type="monotone" dataKey="adx.mdi" name="-DI" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* ATR */}
                                {showATR && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-slate-500/50 uppercase tracking-widest group-hover:text-slate-400 transition-colors">Average True Range (ATR)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Area type="monotone" dataKey="atr" name="ATR" fill="#64748b" fillOpacity={0.1} stroke="#64748b" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* ADL */}
                                {showADL && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-orange-500/50 uppercase tracking-widest group-hover:text-orange-500 transition-colors">Accumulation / Distribution Line</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" hide />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="adl" name="ADL" stroke="#f97316" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}

                                {/* TRIX */}
                                {showTRIX && (
                                    <div className="h-[140px] pr-6 border-b border-white/5 relative bg-slate-950/20 group">
                                        <div className="absolute top-2 left-6 z-10 text-[8px] font-black text-pink-500/50 uppercase tracking-widest group-hover:text-pink-500 transition-colors">Triple Exponential Average (TRIX)</div>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={combinedData} margin={{ top: 25, right: 20, left: 20, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(255,255,255,0.02)" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#334155', fontSize: 8 }} />
                                                <RechartsTooltip content={<IndicatorTooltip />} />
                                                <Line type="monotone" dataKey="trix" name="TRIX" stroke="#ec4899" strokeWidth={1.5} dot={false} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
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
                                    {showRSI && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">RSI (14)</span>
                                        </div>
                                    )}
                                    {showADX && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">ADX Trend</span>
                                        </div>
                                    )}
                                    {showVWAP && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-pink-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">VWAP</span>
                                        </div>
                                    )}
                                    {showMFI && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-yellow-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">MFI</span>
                                        </div>
                                    )}
                                    {showStoch && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-violet-500/40" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Stochastic</span>
                                        </div>
                                    )}
                                </div>
                                <div className="h-8 w-px bg-white/5" />
                                <button
                                    onClick={handleDownloadCSV}
                                    className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-black rounded-xl transition-all border shrink-0 bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>EXPORT DATA</span>
                                </button>

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

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Signal Status */}
                                {/* Signal Status Section Removed (Prediction Logic) */}

                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-3.5 h-3.5 text-slate-400" />
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Active Indicators</h4>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        {dataWithIndicators.length > 0 && (
                                            <>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">RSI (14)</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        dataWithIndicators[dataWithIndicators.length - 1].rsi > 70 ? "text-rose-400" :
                                                            dataWithIndicators[dataWithIndicators.length - 1].rsi < 30 ? "text-emerald-400" : "text-white"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].rsi?.toFixed(2) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">MACD</span>
                                                        <span className="text-[8px] text-slate-600 font-bold uppercase">12, 26, 9</span>
                                                    </div>
                                                    <span className="text-[10px] font-black font-mono text-sky-400">
                                                        {dataWithIndicators[dataWithIndicators.length - 1].macd?.MACD?.toFixed(3) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">ADX Trend</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        dataWithIndicators[dataWithIndicators.length - 1].adx?.adx > 25 ? "text-indigo-400" : "text-slate-500"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].adx?.adx?.toFixed(1) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Stoch %K</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        dataWithIndicators[dataWithIndicators.length - 1].stoch?.k > 80 ? "text-rose-400" :
                                                            dataWithIndicators[dataWithIndicators.length - 1].stoch?.k < 20 ? "text-emerald-400" : "text-white"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].stoch?.k?.toFixed(1) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">MFI (14)</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        dataWithIndicators[dataWithIndicators.length - 1].mfi > 70 ? "text-rose-400" :
                                                            dataWithIndicators[dataWithIndicators.length - 1].mfi < 30 ? "text-emerald-400" : "text-white"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].mfi?.toFixed(0) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Williams %R</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        dataWithIndicators[dataWithIndicators.length - 1].wr < -80 ? "text-emerald-400" :
                                                            dataWithIndicators[dataWithIndicators.length - 1].wr > -20 ? "text-rose-400" : "text-white"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].wr?.toFixed(1) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">CCI (20)</span>
                                                    <span className={cn("text-[10px] font-black font-mono",
                                                        Math.abs(dataWithIndicators[dataWithIndicators.length - 1].cci) > 100 ? "text-indigo-400" : "text-white"
                                                    )}>
                                                        {dataWithIndicators[dataWithIndicators.length - 1].cci?.toFixed(1) || '---'}
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">OBV Trend</span>
                                                    <span className="text-[10px] font-black font-mono text-cyan-400">
                                                        {(dataWithIndicators[dataWithIndicators.length - 1].obv / 1000000).toFixed(1)}M
                                                    </span>
                                                </div>
                                                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">ATR Range</span>
                                                    <span className="text-[10px] font-black font-mono text-slate-300">
                                                        {currencySymbol}{dataWithIndicators[dataWithIndicators.length - 1].atr?.toFixed(2) || '---'}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {/* Decision Rationale and Projections Removed */}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
