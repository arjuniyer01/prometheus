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
} from "recharts";
import { createPortal } from "react-dom";
import { Maximize2, Loader2, X, BarChart3, Binary, Activity, Waves, ChevronDown, Check, Layers, ScanEye, Download } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/utils";
import { RSI, MACD, BollingerBands, EMA, ADX, ATR, Stochastic, WilliamsR, MFI, OBV, TRIX, VWAP, CCI, ROC, KST, PSAR, ADL, ForceIndex, AwesomeOscillator } from "technicalindicators";


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
    showProjections: boolean;
    setShowProjections: (val: boolean) => void;
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
    showProjections,
    setShowProjections,
    getRawChanges
}: PriceChartProps) {
    const [showRSI, setShowRSI] = useState(true);
    const [showMACD, setShowMACD] = useState(true);
    const [showBB, setShowBB] = useState(true);
    const [showEMA, setShowEMA] = useState(true);
    const [showStoch, setShowStoch] = useState(true);
    const [showATR, setShowATR] = useState(true);
    const [showADX, setShowADX] = useState(true);
    const [showWR, setShowWR] = useState(true);
    const [showMFI, setShowMFI] = useState(true);
    const [showOBV, setShowOBV] = useState(true);
    const [showTRIX, setShowTRIX] = useState(true);
    const [showVWAP, setShowVWAP] = useState(true);
    const [showCCI, setShowCCI] = useState(true);
    const [showROC, setShowROC] = useState(true);
    const [showKST, setShowKST] = useState(true);
    const [showPSAR, setShowPSAR] = useState(true);
    const [showADL, setShowADL] = useState(true);
    const [showForce, setShowForce] = useState(true);
    const [showAO, setShowAO] = useState(true);
    const [showPatterns, setShowPatterns] = useState(false);
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
                pattern, patternY
            };
        });

        // Pass 2: Historical Trigger Mapping (Quantitative Architecture Implementation)
        const withLevels = data.map((p, idx) => {
            if (idx < 60) return { ...p, directionScore: 0, predictedDirection: "Neutral" }; // Wait for Z-score maturity

            // 1. Continuous Trend Component (Ts)
            // Normalized distance between Price and EMA20, and EMA20 and EMA50
            const emaSpread = (p.ema20 && p.ema50) ? (p.ema20 - p.ema50) / p.ema50 : 0;
            const priceDev = p.ema20 ? (p.close - p.ema20) / p.ema20 : 0;
            const Ts = Math.tanh((emaSpread * 10) + (priceDev * 15)) * (p.trix > 0 ? 1 : (p.trix < 0 ? -1 : 0.5));

            // 2. High-Sensitivity Momentum (Mz) 
            const macdSlice = data.slice(idx - 59, idx + 1).map(s => s.macd?.histogram || 0);
            const macdMean = macdSlice.reduce((a, b) => a + b, 0) / 60;
            const macdStd = Math.sqrt(macdSlice.reduce((a, b) => a + Math.pow(b - macdMean, 2), 0) / 60) || 0.0001;
            const macdZ = ((p.macd?.histogram || 0) - macdMean) / macdStd;
            const Mz = Math.tanh(macdZ); // Remove ADX scaling to prevent signal dampening

            // 3. Volume Conviction Vector (Vs)
            // Uses 13-period EMA of Force Index normalized via Z-Score
            const forceSlice = data.slice(idx - 59, idx + 1).map(s => s.force || 0);
            const forceMean = forceSlice.reduce((a, b) => a + b, 0) / 60;
            const forceStd = Math.sqrt(forceSlice.reduce((a, b) => a + Math.pow(b - forceMean, 2), 0) / 60) || 0.0001;
            const forceZ = ((p.force || 0) - forceMean) / forceStd;
            const Vs = Math.tanh(forceZ);

            // 4. Oscillator Component (Os) - Normalized RSI
            const Os = ((p.rsi || 50) - 50) / 50;

            // Final Weekly Prediction Bias (WPB V3)
            // Weights: Trend (0.3), Momentum (0.3), Volume (0.3), Oscillator (0.1)
            const wpb_std = (0.3 * Ts) + (0.3 * Mz) + (0.3 * Vs) + (0.1 * Os);

            // Sub-Strategy Variants
            const wpb_mom = (0.1 * Ts) + (0.6 * Mz) + (0.2 * Vs) + (0.1 * Os);
            const wpb_trn = (0.6 * Ts) + (0.1 * Mz) + (0.2 * Vs) + (0.1 * Os);

            // 4. Regime-Adaptive (VAM Logic)
            const adxVal = (p.adx?.adx || 0);
            const wpb_ada = adxVal > 25
                ? (0.2 * Ts) + (0.4 * Mz) + (0.4 * Vs) // Trending: Focus Momentum + Volume
                : (0.1 * Ts) + (0.1 * Mz) + (0.1 * Vs) + (0.7 * Os); // Ranging: Focus Oscillators

            const score = wpb_std * 100;
            const atr = p.atr || (p.close * 0.02);
            const slice = data.slice(idx - 19, idx + 1);
            const maxHigh = Math.max(...slice.map(s => s.high));
            const minLow = Math.min(...slice.map(s => s.low));

            // Sigma Multiplier Logic
            const sigma = 1.5 - ((wpb_std) * 0.5);
            const bullTrigger = Math.max(maxHigh, (p.ema20 || p.close) + (atr * sigma));
            const bearTrigger = Math.min(minLow, (p.ema20 || p.close) - (atr * sigma));

            const getDir = (val: number) => {
                if (val > 0.1) return "Bullish";
                if (val < -0.1) return "Bearish";
                return "Neutral";
            };

            return {
                ...p,
                bullTrigger, bearTrigger,
                predictedDirection: getDir(wpb_std),
                dirMom: getDir(wpb_mom),
                dirTrn: getDir(wpb_trn),
                dirAda: getDir(wpb_ada),
                directionScore: score,
                wpb: wpb_std,
                quantVersion: "3.0"
            };
        });

        // Pass 3: Backtest Lookahead (1 week = 5-7 days)
        return withLevels.map((p, idx) => {
            if (idx > withLevels.length - 8 || !p.bullTrigger) return p;

            // Base 1W Lookahead Data for Trigger Integrity
            const lookahead1w_data = withLevels.slice(idx + 1, idx + 6);
            if (!lookahead1w_data.length) return p;

            const maxFound = Math.max(...lookahead1w_data.map(l => l.high));
            const minFound = Math.min(...lookahead1w_data.map(l => l.low));
            const endPrice = lookahead1w_data[lookahead1w_data.length - 1].close;

            // Trigger Integrity (1W)
            const bullHit = maxFound >= p.bullTrigger;
            const bearHit = minFound <= p.bearTrigger;
            let bullAccuracy = 0;
            if (bullHit) {
                bullAccuracy = endPrice >= p.bullTrigger ? 100 : 0;
            } else {
                bullAccuracy = maxFound < p.bullTrigger ? 100 : 0;
            }

            let bearAccuracy = 0;
            if (bearHit) {
                bearAccuracy = endPrice <= p.bearTrigger ? 100 : 0;
            } else {
                bearAccuracy = minFound > p.bearTrigger ? 100 : 0;
            }

            // Multi-Horizon Benchmarking
            const calcAccHorizon = (pred: string, days: number) => {
                const horizonData = withLevels.slice(idx + 1, idx + days + 1);
                if (horizonData.length < Math.min(days, 2)) return undefined;
                const ePrice = horizonData[horizonData.length - 1].close;

                if (pred === "Bullish") return ePrice > p.close ? 100 : 0;
                if (pred === "Bearish") return ePrice < p.close ? 100 : 0;
                // Neutral prediction: Success if price stayed within +/- 1.5 ATR (Market Consolidation)
                const atr = p.atr || (p.close * 0.02);
                return Math.abs(ePrice - p.close) < (atr * 1.5) ? 100 : 0;
            };

            const acc3d = calcAccHorizon(p.predictedDirection, 3);
            const acc1w = calcAccHorizon(p.predictedDirection, 5);
            const acc2w = calcAccHorizon(p.predictedDirection, 10);
            const acc1m = calcAccHorizon(p.predictedDirection, 21);

            // Strategy Benchmarking (Current 1W baseline)
            const calcAcc = (pred: string) => {
                if (pred === "Bullish") return endPrice > p.close ? 100 : 0;
                if (pred === "Bearish") return endPrice < p.close ? 100 : 0;
                const atr = p.atr || (p.close * 0.02);
                return Math.abs(endPrice - p.close) < atr ? 100 : 0;
            };

            const directionAccuracy = calcAcc(p.predictedDirection);
            const accMom = calcAcc(p.dirMom);
            const accTrn = calcAcc(p.dirTrn);
            const accAda = calcAcc(p.dirAda);

            return { ...p, bullHit, bearHit, bullAccuracy, bearAccuracy, directionAccuracy, accMom, accTrn, accAda, acc3d, acc1w, acc2w, acc1m };
        });
    }, [prices]);

    const aggregateAccuracy = useMemo(() => {
        if (!dataWithIndicators.length) return { bull: 0, bear: 0, overall: 0 };

        const validPoints = dataWithIndicators.filter(p => p.bullAccuracy !== undefined);
        if (!validPoints.length) return { bull: 0, bear: 0, overall: 0 };

        const totalBull = validPoints.reduce((acc, p) => acc + (p.bullAccuracy || 0), 0);
        const totalBear = validPoints.reduce((acc, p) => acc + (p.bearAccuracy || 0), 0);
        const totalDirection = validPoints.reduce((acc, p) => acc + (p.directionAccuracy || 0), 0);

        const bullAvg = totalBull / validPoints.length;
        const bearAvg = totalBear / validPoints.length;
        const directionAvg = totalDirection / validPoints.length;

        const momAvg = validPoints.reduce((acc, p) => acc + (p.accMom || 0), 0) / validPoints.length;
        const trnAvg = validPoints.reduce((acc, p) => acc + (p.accTrn || 0), 0) / validPoints.length;
        const adaAvg = validPoints.reduce((acc, p) => acc + (p.accAda || 0), 0) / validPoints.length;

        const h3d = validPoints.filter(p => p.acc3d !== undefined);
        const h1w = validPoints.filter(p => p.acc1w !== undefined);
        const h2w = validPoints.filter(p => p.acc2w !== undefined);
        const h1m = validPoints.filter(p => p.acc1m !== undefined);

        return {
            bull: bullAvg,
            bear: bearAvg,
            direction: directionAvg,
            mom: momAvg,
            trn: trnAvg,
            ada: adaAvg,
            h3d: h3d.length ? (h3d.reduce((acc, p) => acc + p.acc3d, 0) / h3d.length) : 0,
            h1w: h1w.length ? (h1w.reduce((acc, p) => acc + p.acc1w, 0) / h1w.length) : 0,
            h2w: h2w.length ? (h2w.reduce((acc, p) => acc + p.acc2w, 0) / h2w.length) : 0,
            h1m: h1m.length ? (h1m.reduce((acc, p) => acc + p.acc1m, 0) / h1m.length) : 0,
            overall: (bullAvg + bearAvg + directionAvg) / 3
        };
    }, [dataWithIndicators]);

    const filteredPrices = useMemo(() => {
        if (!dataWithIndicators.length) return [];
        if (!isChartExpanded) return dataWithIndicators; // Mini Chart = Max Data

        switch (chartTimeframe) {
            case '1M': return dataWithIndicators.slice(-22);
            case '6M': return dataWithIndicators.slice(-126);
            case '1Y': return dataWithIndicators.slice(-252);
            // Cap Terminal at 1Y to prevent UI crash
            case '5Y':
            case 'MAX':
            default: return dataWithIndicators.slice(-252);
        }
    }, [dataWithIndicators, chartTimeframe, isChartExpanded]);

    const consensusEngine = useMemo(() => {
        if (!filteredPrices.length) return null;
        const last = filteredPrices[filteredPrices.length - 1];
        const price = last.close;

        const reasons: string[] = [];

        // 1. Continuous Trend Component (Ts)
        const emaSpread = (last.ema20 && last.ema50) ? (last.ema20 - last.ema50) / last.ema50 : 0;
        const priceDev = last.ema20 ? (price - last.ema20) / last.ema20 : 0;
        const Ts = Math.tanh((emaSpread * 10) + (priceDev * 15)) * (last.trix > 0 ? 1 : (last.trix < 0 ? -1 : 0.5));

        if (Math.abs(Ts) > 0.5) {
            reasons.push(Ts > 0 ? "Structural Trend: Continuous EMA stack confirms strong upside persistence." : "Structural Trend: Negative EMA divergence indicates sustained sell-side structural bias.");
        }

        // 2. High-Sensitivity Momentum (Mz)
        const macdSlice = filteredPrices.slice(-60).map(s => s.macd?.histogram || 0);
        const macdMean = macdSlice.reduce((a, b) => a + b, 0) / macdSlice.length;
        const macdStd = Math.sqrt(macdSlice.reduce((a, b) => a + Math.pow(b - macdMean, 2), 0) / macdSlice.length) || 0.0001;
        const macdZ = ((last.macd?.histogram || 0) - macdMean) / macdStd;
        const Mz = Math.tanh(macdZ);

        if (Math.abs(macdZ) > 1.0) {
            reasons.push(`Momentum Intensity: MACD is trading at ${macdZ.toFixed(1)}σ from its rolling mean.`);
        }

        // 3. Volume Conviction Vector (Vs)
        const forceSlice = filteredPrices.slice(-60).map(s => s.force || 0);
        const forceMean = forceSlice.reduce((a, b) => a + b, 0) / forceSlice.length;
        const forceStd = Math.sqrt(forceSlice.reduce((a, b) => a + Math.pow(b - forceMean, 2), 0) / forceSlice.length) || 0.0001;
        const forceZ = ((last.force || 0) - forceMean) / forceStd;
        const Vs = Math.tanh(forceZ);

        if (Math.abs(forceZ) > 1.0) {
            reasons.push(Vs > 0 ? "Volume Conviction: Positive Force Index Z-Score confirms capital in-flow." : "Volume Conviction: Negative Force Index delta indicates active institutional distribution.");
        }

        // 4. Oscillator Component (Os)
        const rsi = last.rsi || 50;
        const Os = (rsi - 50) / 50;
        if (rsi > 70) reasons.push("Mean Reversion: Oscillator levels suggest overbought exhaustion.");
        else if (rsi < 30) reasons.push("Mean Reversion: Deeply oversold conditions suggest potential structural bottoming.");

        // Final Weighted Composite (WPB V3)
        // Weights: Trend (0.3), Momentum (0.3), Volume (0.3), Oscillator (0.1)
        const wpb = (0.3 * Ts) + (0.3 * Mz) + (0.3 * Vs) + (0.1 * Os);
        const score = wpb * 100;

        let label = "Neutral";
        let color = "text-slate-400";
        if (wpb > 0.1) { label = "Bullish"; color = "text-emerald-500"; }
        else if (wpb < -0.1) { label = "Bearish"; color = "text-rose-500"; }

        // Trigger Synthesis using Adaptive Sigma Multiplier
        const atr = last.atr || (price * 0.02);
        const sigma = 1.5 - (wpb * 0.5);
        const bodySlice = filteredPrices.slice(-20);
        const maxHigh = Math.max(...bodySlice.map(s => s.high));
        const minLow = Math.min(...bodySlice.map(s => s.low));

        const bullLevel = Math.max(maxHigh, (last.ema20 || price) + (atr * sigma));
        const bearLevel = Math.min(minLow, (last.ema20 || price) - (atr * sigma));

        // Validation Logic Gates for Reason Logs
        if (last.vwap) {
            if (price > last.vwap) reasons.push("Institutional Anchor: Price relative to VWAP confirms active accumulation.");
            else reasons.push("Institutional Anchor: Price relative to VWAP indicates active distribution/selling.");
        }

        if (last.force > 0) reasons.push("Force Index: Conviction (Volume + Price Delta) supports Bullish trajectory.");
        if (last.ao > 0) reasons.push("Momentum Cycles: Awesome Oscillator confirms short-term velocity exceeds long-term trend.");

        return { score, label, color, reasons, bullLevel, bearLevel, wpb };
    }, [filteredPrices, currencySymbol]);

    const projectionData = useMemo(() => {
        if (!showProjections || !filteredPrices.length || !consensusEngine) return [];

        const lastPoint = filteredPrices[filteredPrices.length - 1];
        const lastDate = new Date(lastPoint.date);
        const bullLevel = consensusEngine.bullLevel;
        const bearLevel = consensusEngine.bearLevel;

        const projections = [];
        for (let i = 1; i <= 7; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);

            projections.push({
                date: nextDate.toISOString().split('T')[0],
                isProjection: true,
                bullTrigger: bullLevel,
                bearTrigger: bearLevel,
                close: null,
                open: null,
                high: null,
                low: null,
                volume: null,
                rsi: null,
                macd: null,
                adx: null,
                atr: null,
                stoch: null,
                mfi: null,
                wr: null,
                obv: null,
                cci: null,
                vwap: null
            });
        }

        return projections;
    }, [filteredPrices, showProjections, consensusEngine]);

    const combinedData = useMemo(() => {
        return [...filteredPrices, ...projectionData];
    }, [filteredPrices, projectionData]);

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
            "Pattern_Name", "Pattern_Type",
            "Bull_Trigger", "Bear_Trigger", "Bias_Score", "Predicted_Direction"
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
                p.pattern?.name || '', p.pattern?.type || '',
                p.bullTrigger, p.bearTrigger, p.directionScore, p.predictedDirection
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
                                {['1M', '6M', '1Y'].map((t) => (
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
                                                { label: 'RSI', active: showRSI, onClick: () => setShowRSI(!showRSI) },
                                                { label: 'MACD', active: showMACD, onClick: () => setShowMACD(!showMACD) },
                                                { label: 'STOCH', active: showStoch, onClick: () => setShowStoch(!showStoch) },
                                                { label: 'WR', active: showWR, onClick: () => setShowWR(!showWR) },
                                                { label: 'MFI', active: showMFI, onClick: () => setShowMFI(!showMFI) },
                                                { label: 'ADX', active: showADX, onClick: () => setShowADX(!showADX) },
                                                { label: 'CCI', active: showCCI, onClick: () => setShowCCI(!showCCI) },
                                                { label: 'ATR', active: showATR, onClick: () => setShowATR(!showATR) },
                                                { label: 'OBV', active: showOBV, onClick: () => setShowOBV(!showOBV) },
                                                { label: 'TRIX', active: showTRIX, onClick: () => setShowTRIX(!showTRIX) },
                                                { label: 'ROC', active: showROC, onClick: () => setShowROC(!showROC) },
                                                { label: 'KST', active: showKST, onClick: () => setShowKST(!showKST) },
                                                { label: 'PSAR', active: showPSAR, onClick: () => setShowPSAR(!showPSAR) },
                                                { label: 'ADL', active: showADL, onClick: () => setShowADL(!showADL) },
                                                { label: 'FORCE', active: showForce, onClick: () => setShowForce(!showForce) },
                                                { label: 'AO', active: showAO, onClick: () => setShowAO(!showAO) },
                                                { label: 'PROJ', active: showProjections, onClick: () => setShowProjections(!showProjections) },
                                                { label: 'VOL', active: showVolume, onClick: () => setShowVolume(!showVolume) },
                                                { label: 'PATTERNS', active: showPatterns, onClick: () => setShowPatterns(!showPatterns) },
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
                                                                {isProj && (
                                                                    <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Predictive Zone</span>
                                                                )}
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

                                                        {!isProj && data.bullTrigger !== undefined && (
                                                            <div className="flex flex-col gap-2 border-t border-white/10 pt-3">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em]">Signal Validation Profile (1W)</div>
                                                                    <span className="text-[7px] text-slate-600 font-mono tracking-tighter">V3.0 ENGINE</span>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn("w-1.5 h-1.5 rounded-full", data.bullAccuracy === 100 ? "bg-emerald-500" : "bg-rose-500")} />
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Upside Target Integrity</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-white font-mono">{data.bullAccuracy}%</span>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn("w-1.5 h-1.5 rounded-full", data.bearAccuracy === 100 ? "bg-emerald-500" : "bg-rose-500")} />
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Downside Floor Integrity</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-white font-mono">{data.bearAccuracy}%</span>
                                                                </div>

                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={cn("w-1.5 h-1.5 rounded-full", data.directionAccuracy === 100 ? "bg-indigo-500" : "bg-slate-500")} />
                                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Market Bias Precision ({data.predictedDirection})</span>
                                                                    </div>
                                                                    <span className="text-[9px] text-white font-mono">{data.directionAccuracy}%</span>
                                                                </div>

                                                                <div className="flex gap-2 mt-1">
                                                                    {data.bullHit && (
                                                                        <span className="text-[7px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 font-black uppercase">Resistance Breached</span>
                                                                    )}
                                                                    {data.bearHit && (
                                                                        <span className="text-[7px] bg-rose-500/10 text-rose-500 px-1.5 py-0.5 rounded border border-rose-500/20 font-black uppercase">Support Breached</span>
                                                                    )}
                                                                    {data.directionAccuracy === 100 && (
                                                                        <span className="text-[7px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black uppercase">Forecast Verified</span>
                                                                    )}
                                                                </div>
                                                                {!data.bullHit && !data.bearHit && (
                                                                    <div className="text-[7px] text-slate-600 font-mono italic">Predictive price bands held active.</div>
                                                                )}
                                                            </div>
                                                        )}
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

                                        {showProjections && projectionData.length > 0 && (
                                            <>
                                                <Line
                                                    yAxisId="price"
                                                    type="monotone"
                                                    dataKey="bullTrigger"
                                                    stroke="#10b981"
                                                    strokeWidth={2}
                                                    strokeDasharray="10 5"
                                                    dot={false}
                                                    animationDuration={2000}
                                                />
                                                <Line
                                                    yAxisId="price"
                                                    type="monotone"
                                                    dataKey="bearTrigger"
                                                    stroke="#f43f5e"
                                                    strokeWidth={2}
                                                    strokeDasharray="10 5"
                                                    dot={false}
                                                    animationDuration={2000}
                                                />
                                            </>
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
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Market Consensus</span>
                                        <span className={cn("text-[10px] font-black uppercase", consensusEngine?.color)}>
                                            {consensusEngine?.label || "Calculating..."}
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-1000",
                                                (consensusEngine?.score || 0) >= 0 ? "bg-emerald-500" : "bg-rose-500"
                                            )}
                                            style={{ width: `${Math.abs(consensusEngine?.score || 0)}%` }}
                                        />
                                    </div>
                                </div>

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

                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Waves className="w-3.5 h-3.5 text-indigo-400" />
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Decision Rationale</h4>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                                            <div className="space-y-4">
                                                <div className="flex flex-col gap-2 mb-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
                                                            Engine Integrity (V3.0)
                                                            <span className="text-[7px] text-indigo-400/50 bg-indigo-400/5 px-1 rounded border border-indigo-400/10">ADVANCED</span>
                                                        </span>
                                                        <span className="text-[10px] font-black font-mono text-indigo-400">{aggregateAccuracy.overall.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-indigo-500 transition-all duration-1000"
                                                            style={{ width: `${aggregateAccuracy.overall}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">Bullish {aggregateAccuracy.bull.toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">Bias {(aggregateAccuracy.direction || 0).toFixed(0)}%</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                            <span className="text-[8px] text-slate-400 font-bold uppercase">Bearish {aggregateAccuracy.bear.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                                                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Time Horizon Accuracy</span>
                                                            <span className="text-[8px] text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded font-bold uppercase">Backtest Log</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">3-Day</span>
                                                                <span className="text-[10px] font-black font-mono text-slate-300">{(aggregateAccuracy.h3d || 0).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">1-Week</span>
                                                                <span className="text-[10px] font-black font-mono text-indigo-400">{(aggregateAccuracy.h1w || 0).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">2-Week</span>
                                                                <span className="text-[10px] font-black font-mono text-slate-300">{(aggregateAccuracy.h2w || 0).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[9px] text-slate-500 font-bold uppercase">1-Month</span>
                                                                <span className="text-[10px] font-black font-mono text-slate-300">{(aggregateAccuracy.h1m || 0).toFixed(1)}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-[8px] text-slate-400 uppercase font-black">Predicted Bias (1W)</p>
                                                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", consensusEngine?.color || "text-slate-400")}>
                                                            {consensusEngine?.label || '---'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {showProjections && projectionData.length > 0 && (
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                            <p className="text-[8px] text-emerald-500 uppercase font-black">Bull Trigger</p>
                                                            <p className="text-xs font-mono font-bold text-white">{currencySymbol}{projectionData[0].bullTrigger?.toFixed(2)}</p>
                                                        </div>
                                                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                                            <p className="text-[8px] text-rose-500 uppercase font-black">Bear Trigger</p>
                                                            <p className="text-xs font-mono font-bold text-white">{currencySymbol}{projectionData[0].bearTrigger?.toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    {consensusEngine?.reasons.map((reason, idx) => (
                                                        <div key={idx} className="flex gap-2">
                                                            <div className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                                                            <p className="text-[9.5px] text-slate-400 leading-normal font-medium">{reason}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="pt-2 border-t border-white/5 mt-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase">Predictive Bias:</span>
                                                        <span className={cn("text-[9px] font-black uppercase tracking-widest", consensusEngine?.color)}>
                                                            {consensusEngine?.label}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
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
