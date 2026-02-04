
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
    ATR,
    KeltnerChannels
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

export function calculateDPO(close: number[], period: number = 20): (number | null)[] {
    const sma = SMA.calculate({ period, values: close });
    const shift = Math.floor(period / 2) + 1;
    const results: (number | null)[] = new Array(close.length).fill(null);

    // SMA starts at period - 1
    // DPO[i] = close[i - shift] - sma[i - period + 1] ??? 
    // Wait, the standard DPO(n) at time t = close(t - n/2 - 1) - SMA(n)(t)
    for (let i = period - 1; i < close.length; i++) {
        const smaValue = sma[i - period + 1];
        const lookbackIdx = i - shift;
        if (lookbackIdx >= 0) {
            results[i] = close[lookbackIdx] - smaValue;
        }
    }
    return results;
}

export function calculateKCW(high: number[], low: number[], close: number[], period: number = 20, multiplier: number = 2): (number | null)[] {
    const kc = KeltnerChannels.calculate({
        high,
        low,
        close,
        maPeriod: period,
        atrPeriod: period,
        multiplier,
        useSMA: false
    });
    const results: (number | null)[] = new Array(close.length).fill(null);
    const offset = close.length - kc.length;

    for (let i = 0; i < kc.length; i++) {
        const { upper, lower, middle } = kc[i];
        // KCW = (Upper - Lower) / Middle * 100
        results[i + offset] = ((upper - lower) / middle) * 100;
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

    // 14. Williams %R
    const wr = WilliamsR.calculate({ high, low, close, period: 14 });

    // 15. DPO
    const dpo = calculateDPO(close, 20);

    // 16. KCW
    const kcw = calculateKCW(high, low, close, 20, 2);

    // --- VALUES ---
    const getLast = (arr: any[]) => arr[arr.length - 1];
    const curPrice = close[idx];
    const curEMA20 = getLast(ema20);
    const curEMA50 = getLast(ema50);
    const curRSI = getLast(rsi);
    const curMACDHist = getLast(macd)?.histogram || 0;
    const curADX = getLast(adx)?.adx || 0;
    const curTRIX = getLast(trix);
    const curWR = getLast(wr);
    const curDPO = getLast(dpo);
    const curKCW = getLast(kcw);

    return {
        levels: calculateSRLevels(high, low, close, getLast(atr_vec) || 0),
        indicators: {
            rcl: curPrice,
            ema20: curEMA20,
            ema50: curEMA50,
            rsi: curRSI,
            macdHist: curMACDHist,
            adx: curADX,
            trix: curTRIX,
            cci: getLast(cci),
            fi: getLast(fi),
            roc: getLast(roc),
            wr: curWR,
            dpo: curDPO,
            kcw: curKCW
        }
    };
}

export function checkSemiReversalSignal(
    stockIndicators: any,
    smhPrices: Ohlc[]
): { active: boolean; confidence: number; reason?: string } {
    // 1. Sector Crash: SMH ETF < SMA50(SMH) * 0.90
    if (smhPrices.length < 50) return { active: false, confidence: 0 };

    const smhCloses = smhPrices.map(p => p.close);
    const smhSMA50 = SMA.calculate({ period: 50, values: smhCloses });
    const lastSMH = smhCloses[smhCloses.length - 1];
    const lastSMHSMA50 = smhSMA50[smhSMA50.length - 1];

    const isSectorCrash = lastSMH <= lastSMHSMA50 * 0.90;
    if (!isSectorCrash) return { active: false, confidence: 0, reason: "Sector (SMH) has not crashed sufficiently (< 10% below SMA50)" };

    // 2. Volatility Expansion: Stock KCW > 7.2
    const isVolExpansion = stockIndicators.kcw > 7.2;
    if (!isVolExpansion) return { active: false, confidence: 0, reason: "Stock volatility (KCW) is too low (< 7.2)" };

    // 3. Terminal Oversold: Williams %R < -81
    const isOversold = stockIndicators.wr < -81;
    if (!isOversold) return { active: false, confidence: 0, reason: "Stock is not yet in terminal oversold territory (Williams %R > -81)" };

    // 4. Price Stabilization: DPO > -0.31
    const isStabilized = stockIndicators.dpo > -0.31;
    if (!isStabilized) return { active: false, confidence: 0, reason: "Price decline hasn't flattened yet (DPO <= -0.31)" };

    return {
        active: true,
        confidence: 0.6989,
        reason: "Golden Reversal Signature Confirmed: Maximum Compression during Sector Bloodbath."
    };
}
