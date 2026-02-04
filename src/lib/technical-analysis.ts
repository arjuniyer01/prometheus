
import {
    SMA,
    EMA,
    BollingerBands,
    RSI,
    MACD,
    ADX,
    Stochastic,
    TRIX,
    CCI,
    ROC,
    OBV,
    ADL,
    AwesomeOscillator,
    PSAR,
    ForceIndex,
    MFI,
    WilliamsR,
    ATR
} from 'technicalindicators';

export interface Ohlc {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface SRLevel {
    price: number;
    type: 'support' | 'resistance';
    strength: number;
}

export interface TechnicalAnalysisResult {
    predictionBias: {
        score: number;
        label: 'Strong Bullish' | 'Bullish' | 'Neutral' | 'Bearish' | 'Strong Bearish';
        components: {
            trend: number;
            momentum: number;
            oscillator: number;
        };
    };
    bullRunTrigger: {
        triggered: boolean;
        conditions: {
            squeeze: boolean;
            breakout: boolean;
            momentum: boolean;
            velocity: boolean;
        };
    };
    bearTrigger: {
        triggered: boolean;
        conditions: {
            supportFailure: boolean;
            distribution: boolean;
            momentumDeterioration: boolean;
            distributionConfirmation: boolean;
        };
    };
    levels: SRLevel[];
    indicators: any;
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------

function calculateZScore(value: number, history: number[]): number {
    if (history.length === 0) return 0;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
    const stdDev = Math.sqrt(variance);
    return stdDev === 0 ? 0 : (value - mean) / stdDev;
}

function calculateDonchian(highs: number[], lows: number[], period: number) {
    const results = [];
    for (let i = 0; i < highs.length; i++) {
        if (i < period - 1) {
            results.push({ upper: null, lower: null, middle: null });
            continue;
        }
        const sliceHigh = highs.slice(i - period + 1, i + 1);
        const sliceLow = lows.slice(i - period + 1, i + 1);
        const upper = Math.max(...sliceHigh);
        const lower = Math.min(...sliceLow);
        results.push({ upper, lower, middle: (upper + lower) / 2 });
    }
    return results;
}

export function calculateSRLevels(highs: number[], lows: number[], closes: number[], atr: number): SRLevel[] {
    const window = 2;
    const pivots: { price: number; type: 'support' | 'resistance' }[] = [];

    for (let i = window; i < highs.length - window; i++) {
        const h = highs[i];
        const l = lows[i];

        if (h > highs[i - 1] && h > highs[i - 2] && h >= highs[i + 1] && h >= highs[i + 2]) {
            pivots.push({ price: h, type: 'resistance' });
        }
        if (l < lows[i - 1] && l < lows[i - 2] && l <= lows[i + 1] && l <= lows[i + 2]) {
            pivots.push({ price: l, type: 'support' });
        }
    }

    if (pivots.length === 0) {
        const recentHighs = highs.slice(-50);
        const recentLows = lows.slice(-50);
        return [
            { price: Math.max(...recentHighs), type: 'resistance' as const, strength: 1 },
            { price: Math.min(...recentLows), type: 'support' as const, strength: 1 }
        ].map(l => ({ ...l, price: Number(l.price.toFixed(2)) }));
    }

    const currentPrice = closes[closes.length - 1];
    const proximity = atr > 0 ? atr * 0.75 : currentPrice * 0.01;
    const clusters: { price: number; type: 'support' | 'resistance'; count: number }[] = [];

    pivots.forEach(pivot => {
        let found = false;
        for (const cluster of clusters) {
            if (Math.abs(cluster.price - pivot.price) < proximity && cluster.type === pivot.type) {
                cluster.price = (cluster.price * cluster.count + pivot.price) / (cluster.count + 1);
                cluster.count++;
                found = true;
                break;
            }
        }
        if (!found) {
            clusters.push({ price: pivot.price, type: pivot.type, count: 1 });
        }
    });

    const maxCount = Math.max(...clusters.map(c => c.count));

    return clusters
        .map(c => ({
            price: Number(c.price.toFixed(2)),
            type: c.type,
            strength: c.count / maxCount
        }))
        .sort((a, b) => Math.abs(a.price - currentPrice) - Math.abs(b.price - currentPrice))
        .slice(0, 10);
}

// ----------------------------------------------------------------------
// BACKTESTING INTERFACES & LOGIC
// ----------------------------------------------------------------------

export interface BacktestResult {
    winRate: number;      // 0-100
    totalSignals: number;
    wins: number;
    losses: number;
    directionalBiasAccuracy: number; // 0-100
    bullTriggerAccuracy: number;     // 0-100
    bearTriggerAccuracy: number;     // 0-100
    score: number;        // Global Integrity Score (0-100)
    dataPoints: {
        date: string;
        price: number;
        wpb: number;
        predictedLabel: string;
        bullTriggerLevel: number;
        bearTriggerLevel: number;
        outcome: 'Win' | 'Loss' | 'Pending';
        details: string;
    }[];
}

/**
 * Calculates a rolling backtest over the provided historical data.
 * @param prices Chronological array of daily OHLC
 */
export function runBacktest(prices: Ohlc[]): BacktestResult {
    // Need enough history for initial indicators (at least 60-100 days).
    const minHistory = 100;
    if (prices.length < minHistory + 5) {
        return {
            winRate: 0, totalSignals: 0, wins: 0, losses: 0,
            directionalBiasAccuracy: 0, bullTriggerAccuracy: 0, bearTriggerAccuracy: 0, score: 0,
            dataPoints: []
        };
    }

    const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const close = sortedPrices.map(p => p.close);
    const high = sortedPrices.map(p => p.high);
    const low = sortedPrices.map(p => p.low);

    // Calculate Indicators for entire series
    const ema20 = EMA.calculate({ period: 20, values: close });
    const ema50 = EMA.calculate({ period: 50, values: close });
    const atr = ATR.calculate({ high, low, close, period: 14 });
    const donchian = calculateDonchian(high, low, 20);
    const macd = MACD.calculate({ values: close, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
    const rsi = RSI.calculate({ period: 14, values: close });
    const trix = TRIX.calculate({ values: close, period: 15 });
    const adx = ADX.calculate({ high, low, close, period: 14 });

    // Alignment: Most indicators start generating values after 'period'.
    // We iterate from 'minHistory' to 'length - 5'.

    let totalWins = 0;
    let totalSignals = 0;
    let bullWins = 0;
    let bullSignals = 0;
    let bearWins = 0;
    let bearSignals = 0;

    const dataPoints = [];

    // Helper to safely get value at index i (handling offset of indicator results)
    // Indicator results usually start at index (Period - 1). 
    // Example: EMA20 result[0] corresponds to prices[19].
    // So result[k] corresponds to prices[k + (Period - 1)].
    // Better way: Align Arrays relative to price array.
    // We'll create aligned arrays padded with nulls.

    const pad = (arr: any[], padCount: number) => [...Array(padCount).fill(null), ...arr];

    const alignedEMA20 = pad(ema20, 19);
    const alignedEMA50 = pad(ema50, 49);
    const alignedATR = pad(atr, 13);
    const alignedDonchian = pad(donchian, 19);
    const alignedMACD = pad(macd, 25);
    const alignedRSI = pad(rsi, 13);
    const alignedTRIX = pad(trix, 14); // TRIX 15 period? actually calculation logic inside technicalindicators might vary. Usually n-1. 
    // TRIX uses TRIPLE EMA so lag is roughly 3*period. Let's rely on array matching logic:
    // result.length = input.length - lag. i-th result => input[i+lag].
    // Lag = input.length - result.length.

    const align = (res: any[], inputLen: number) => {
        const lag = inputLen - res.length;
        return [...Array(lag).fill(null), ...res];
    };

    const _ema20 = align(ema20, close.length);
    const _ema50 = align(ema50, close.length);
    const _atr = align(atr, close.length);
    const _donchian = align(donchian, close.length);
    const _macd = align(macd, close.length);
    const _rsi = align(rsi, close.length);
    const _trix = align(trix, close.length);
    const _adx = align(adx, close.length);

    for (let i = minHistory; i < close.length - 5; i++) {
        // 1. Calculate WPB
        const p = close[i];
        const e20 = _ema20[i];
        const e50 = _ema50[i];
        const t = _trix[i];

        if (e20 == null || e50 == null || t == null) continue;

        let trendScore = 0;
        if (p > e20 && e20 > e50 && t > 0) trendScore = 1;
        else if (p < e20 && e20 < e50 && t < 0) trendScore = -1;

        // Momentum
        // Rolling 60-day MACD Z-score.
        // Slice relevant history from aligned array
        const macdSlice = _macd.slice(i - 60, i + 1).map((m: any) => m?.histogram).filter((v: any) => v != null);
        if (macdSlice.length < 2) continue;

        const curHist = macdSlice[macdSlice.length - 1];
        const zScore = calculateZScore(curHist, macdSlice);
        const curADX = _adx[i]?.adx || 0;
        const momentumScore = Math.tanh(zScore) * (curADX / 100);

        // Oscillator
        const curRSI = _rsi[i] || 50;
        const oscillatorScore = (curRSI - 50) / 50;

        const wpb = (0.4 * trendScore) + (0.4 * momentumScore) + (0.2 * oscillatorScore);

        // Label
        let label = 'Neutral';
        if (wpb > 0.15) label = 'Bullish';
        else if (wpb < -0.15) label = 'Bearish';

        // 2. Calculate Sigma & Triggers
        const sigma = 1.5 - (wpb * 0.5); // Range [1.0, 2.0] if wpb in [-1, 1]
        const curATR = _atr[i] || 0;
        const donchianHigh = _donchian[i]?.upper || 0;
        const donchianLow = _donchian[i]?.lower || 0;

        const bullTrigger = Math.max(donchianHigh, e20 + (curATR * sigma));
        const bearTrigger = Math.min(donchianLow, e20 - (curATR * sigma));

        // 3. Evaluate Outcome (5-day Lookahead)
        const next5Days = close.slice(i + 1, i + 6);
        const futureClose = next5Days[next5Days.length - 1];
        const futureHighs = high.slice(i + 1, i + 6);
        const futureLows = low.slice(i + 1, i + 6);
        const maxHigh = Math.max(...futureHighs);
        const minLow = Math.min(...futureLows);

        let outcome: 'Win' | 'Loss' = 'Loss';

        // Metric: Prediction Bias Validation
        if (label === 'Bullish') {
            if (futureClose > p) outcome = 'Win';
        } else if (label === 'Bearish') {
            if (futureClose < p) outcome = 'Win';
        } else { // Neutral
            // Success: Variance within +/- 1 ATR.
            // i.e. MaxHigh < p + ATR AND MinLow > p - ATR
            if (maxHigh < (p + curATR) && minLow > (p - curATR)) {
                outcome = 'Win';
            }
        }

        if (outcome === 'Win') totalWins++;
        totalSignals++;

        dataPoints.push({
            date: sortedPrices[i].date,
            price: p,
            wpb,
            predictedLabel: label,
            bullTriggerLevel: bullTrigger,
            bearTriggerLevel: bearTrigger,
            outcome,
            details: `Pred: ${label}, Close: ${p.toFixed(2)} -> ${futureClose.toFixed(2)}`
        });
    }

    const winRate = totalSignals > 0 ? (totalWins / totalSignals) * 100 : 0;

    return {
        winRate,
        totalSignals,
        wins: totalWins,
        losses: totalSignals - totalWins,
        directionalBiasAccuracy: winRate,
        bullTriggerAccuracy: 0, // Placeholder
        bearTriggerAccuracy: 0, // Placeholder
        score: winRate, // Placeholder score
        dataPoints
    };
}

// ----------------------------------------------------------------------
// MAIN EXPORT
// ----------------------------------------------------------------------

export function calculateTechnicalAnalysis(prices: Ohlc[]): TechnicalAnalysisResult {
    // Need at least ~200 data points for reliable 200 SMA, but let's work with what we have.
    // Ensure chronological order
    const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Extract arrays
    const close = sortedPrices.map(p => p.close);
    const high = sortedPrices.map(p => p.high);
    const low = sortedPrices.map(p => p.low);
    const volume = sortedPrices.map(p => p.volume);

    // Current index (latest)
    const idx = close.length - 1;

    // --- INDICATOR CALCULATIONS ---

    // 1. EMAs
    const ema20 = EMA.calculate({ period: 20, values: close });
    const ema50 = EMA.calculate({ period: 50, values: close });

    // 2. MACD
    const macd = MACD.calculate({
        values: close,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false
    });

    // 3. RSI
    const rsi = RSI.calculate({ period: 14, values: close });

    // 4. Stochastic
    const stoch = Stochastic.calculate({
        high: high,
        low: low,
        close: close,
        period: 14,
        signalPeriod: 3
    });

    // 5. TRIX
    const trix = TRIX.calculate({ values: close, period: 15 });

    // 6. ADX
    const adx = ADX.calculate({ high, low, close, period: 14 });

    // 7. Bollinger Bands
    const bb = BollingerBands.calculate({ period: 20, values: close, stdDev: 2 });

    // NEW: ATR for SR Proximity
    const atr_vec = ATR.calculate({ high, low, close, period: 14 });

    // 8. Force Index
    const fi = ForceIndex.calculate({ close, volume, period: 13 });

    // 9. ROC
    const roc = ROC.calculate({ values: close, period: 10 });

    // 10. CCI
    const cci = CCI.calculate({ high, low, close, period: 20 });

    // 11. VWAP 
    const vwap20 = sortedPrices.slice(-20).reduce((sum, p) => sum + (p.close * p.volume), 0) / sortedPrices.slice(-20).reduce((sum, p) => sum + p.volume, 0);

    // 12. ADL
    const adl = ADL.calculate({ high, low, close, volume });

    // 13. Donchian
    const donchian = calculateDonchian(high, low, 20);

    // --- PREDICTION BIAS CALCULATIONS ---

    const getLast = (arr: any[]) => arr[arr.length - 1];
    const getPrev = (arr: any[], n = 1) => arr[arr.length - 1 - n];

    // Values
    const curPrice = close[idx];
    const curEMA20 = getLast(ema20);
    const curEMA50 = getLast(ema50);
    const curTRIX = getLast(trix);
    const curMACDHist = getLast(macd)?.histogram || 0;
    const curRSI = getLast(rsi);
    const curADX = getLast(adx)?.adx || 0;

    // Step 1: Trend Score
    let trendScore = 0;
    if (curPrice > curEMA20 && curEMA20 > curEMA50 && curTRIX > 0) {
        trendScore = 1.0;
    } else if (curPrice < curEMA20 && curEMA20 < curEMA50 && curTRIX < 0) {
        trendScore = -1.0;
    }

    // Step 2: Momentum Z-Score
    const macdHistHistory = macd.slice(-60).map(m => m.histogram || 0);
    const macdZ = calculateZScore(curMACDHist, macdHistHistory);
    const adxNorm = curADX / 100;
    const momentumScore = Math.tanh(macdZ) * adxNorm;

    // Step 3: Oscillator Score
    const rsiNorm = (curRSI - 50) / 50;
    const oscillatorScore = rsiNorm;

    // Final Bias
    const predictionBias = (0.4 * momentumScore) + (0.4 * trendScore) + (0.2 * oscillatorScore);

    let biasLabel: TechnicalAnalysisResult['predictionBias']['label'] = 'Neutral';
    if (predictionBias > 0.15) biasLabel = 'Bullish';
    else if (predictionBias < -0.15) biasLabel = 'Bearish';

    // Override strong if excessive
    if (predictionBias > 0.5) biasLabel = 'Strong Bullish';
    if (predictionBias < -0.5) biasLabel = 'Strong Bearish';

    // --- BULL RUN TRIGGER ---

    const curBB = getLast(bb);
    const bandwidth = (curBB.upper - curBB.lower) / curBB.middle;
    const bbHistory = bb.slice(-126);
    const avgBandwidth = bbHistory.reduce((sum, b) => sum + ((b.upper - b.lower) / b.middle), 0) / bbHistory.length;

    const isSqueeze = bandwidth < avgBandwidth;

    const curUpperDonchian = getLast(donchian).upper;
    const isBreakout = curPrice > curUpperDonchian;

    const prevADX = getPrev(adx)?.adx || 0;
    const isADXRising = curADX > prevADX;

    const curFI = getLast(fi) || 0;
    const isFIPositive = curFI > 0;

    const curROC = getLast(roc);
    const isROCPositive = curROC > 0;

    const ao = AwesomeOscillator.calculate({ high, low, fastPeriod: 5, slowPeriod: 34 });
    const curAO = getLast(ao);
    const isAOPositive = curAO > 0;

    const bullTrigger = isBreakout && isADXRising && isFIPositive && isROCPositive && isAOPositive;

    // --- BEAR TRIGGER ---

    const curLowerDonchian = getLast(donchian).lower;
    const isSupportFailure = curPrice < curLowerDonchian;
    const isBelowVWAP = curPrice < vwap20;

    // Momentum Deterioration
    const isTrixNeg = curTRIX < 0;
    const curCCI = getLast(cci);
    const isCCIBear = curCCI < -100;

    // Distribution
    const adlSlice = adl.slice(-5);
    const adlTrendingDown = adlSlice[adlSlice.length - 1] < adlSlice[0];

    const bearTrigger = isSupportFailure && isBelowVWAP && (isTrixNeg || isCCIBear) && adlTrendingDown;

    return {
        predictionBias: {
            score: predictionBias,
            label: biasLabel,
            components: {
                trend: trendScore,
                momentum: momentumScore,
                oscillator: oscillatorScore
            }
        },
        bullRunTrigger: {
            triggered: bullTrigger,
            conditions: {
                squeeze: isSqueeze,
                breakout: isBreakout,
                momentum: isADXRising && isFIPositive && isAOPositive,
                velocity: isROCPositive
            }
        },
        bearTrigger: {
            triggered: bearTrigger,
            conditions: {
                supportFailure: isSupportFailure,
                distribution: isBelowVWAP,
                momentumDeterioration: (isTrixNeg || isCCIBear),
                distributionConfirmation: adlTrendingDown
            }
        },
        levels: calculateSRLevels(high, low, close, getLast(atr_vec) || 0),
        indicators: {
            rcl: curPrice,
            ema20: curEMA20,
            ema50: curEMA50,
            rsi: curRSI,
            macdHist: curMACDHist,
            adx: curADX,
            trix: curTRIX,
            cci: curCCI,
            fi: curFI,
            roc: curROC
        }
    };
}
