// --- Sector-aware D/E thresholds ---
const SECTOR_DE_THRESHOLDS: Record<string, { low: number; high: number }> = {
    'Financial Services': { low: 2.0, high: 5.0 },
    'Real Estate': { low: 1.5, high: 3.0 },
    'Utilities': { low: 1.5, high: 3.0 },
    'Energy': { low: 0.8, high: 2.0 },
    'Industrials': { low: 0.6, high: 1.5 },
    'Consumer Defensive': { low: 0.5, high: 1.5 },
    'Healthcare': { low: 0.5, high: 1.5 },
    'Consumer Cyclical': { low: 0.5, high: 1.5 },
    'Communication Services': { low: 0.5, high: 1.5 },
    'Basic Materials': { low: 0.5, high: 1.5 },
    'Technology': { low: 0.3, high: 1.0 },
};
const DEFAULT_DE_THRESHOLDS = { low: 0.5, high: 1.5 };

export interface ScoringInput {
    // Financials
    roe: number;
    netMargin: number;
    revenueGrowth: number;
    debtToEquity: number;
    interestCoverage?: number;

    // Valuation
    peRatio?: number | null;
    evToEbitda?: number | null;

    // Cash Flow
    fcfYield?: number | null; // FCF / Market Cap

    // Technicals
    currentPrice: number;
    sma200: number | null; // null = no data available
    threeMonthReturn?: number | null; // stock's 3-month return
    sectorThreeMonthReturn?: number | null; // sector's 3-month return
    volumeRatio?: number | null; // today's volume / avg volume

    // Context
    sector?: string | null;
    marketCap?: number | null;
    market: 'US' | 'INDIA';
}

export interface CalculatedScore {
    total: number; // 0-60 (deterministic portion; AI adds remaining 40)
    components: {
        financial: number; // 0-100 (40% weight in final)
        technical: number; // 0-100 (20% weight in final)
    };
    breakdown: {
        profitability: number;
        growth: number;
        solvency: number;
        valuation: number;
        cashFlow: number;
        trend: number;
    };
    flags: { label: string; impact: 'positive' | 'negative' }[];
}

// --- Utility: continuous linear interpolation between anchors ---
function lerp(value: number, anchors: [number, number][], clampLow = 0, clampHigh = 100): number {
    if (anchors.length === 0) return clampLow;
    // Sort anchors by input value
    const sorted = [...anchors].sort((a, b) => a[0] - b[0]);

    if (value <= sorted[0][0]) return Math.max(clampLow, Math.min(clampHigh, sorted[0][1]));
    if (value >= sorted[sorted.length - 1][0]) return Math.max(clampLow, Math.min(clampHigh, sorted[sorted.length - 1][1]));

    for (let i = 0; i < sorted.length - 1; i++) {
        const [x0, y0] = sorted[i];
        const [x1, y1] = sorted[i + 1];
        if (value >= x0 && value <= x1) {
            const t = (value - x0) / (x1 - x0);
            return Math.max(clampLow, Math.min(clampHigh, y0 + t * (y1 - y0)));
        }
    }
    return clampLow;
}

export function calculateDeterministicScore(data: ScoringInput): CalculatedScore {
    const flags: { label: string; impact: 'positive' | 'negative' }[] = [];

    // =========================================================================
    // 1. FINANCIAL HEALTH (40% of final score)
    //    - Profitability  25%
    //    - Growth         25%
    //    - Solvency       20%
    //    - Valuation      15%
    //    - Cash Flow      15%
    // =========================================================================

    // --- A. Profitability (25% of financial) ---
    // ROE: continuous curve from -50% to +25%
    const roeScore = lerp(data.roe, [
        [-0.50, 0],
        [-0.10, 15],
        [0, 35],
        [0.05, 50],
        [0.10, 70],
        [0.15, 85],
        [0.25, 100],
    ]);

    // Net margin: continuous curve from -100% to +30%
    const marginScore = lerp(data.netMargin, [
        [-1.0, 0],
        [-0.20, 10],
        [0, 30],
        [0.05, 50],
        [0.10, 65],
        [0.20, 85],
        [0.30, 100],
    ]);

    const profitabilityScore = roeScore * 0.6 + marginScore * 0.4;

    if (data.roe > 0.15) flags.push({ label: `High ROE (${(data.roe * 100).toFixed(1)}%)`, impact: 'positive' });
    else if (data.roe < 0) flags.push({ label: `Negative ROE (${(data.roe * 100).toFixed(1)}%)`, impact: 'negative' });
    if (data.netMargin > 0.20) flags.push({ label: `High Margins (${(data.netMargin * 100).toFixed(1)}%)`, impact: 'positive' });
    else if (data.netMargin < 0) flags.push({ label: `Negative Margins (${(data.netMargin * 100).toFixed(1)}%)`, impact: 'negative' });

    // --- B. Growth (25% of financial) ---
    const growthScore = lerp(data.revenueGrowth, [
        [-0.30, 0],
        [-0.10, 15],
        [0, 40],
        [0.05, 55],
        [0.10, 70],
        [0.25, 90],
        [0.50, 100],
    ]);

    if (data.revenueGrowth > 0.25) flags.push({ label: `Hypergrowth (${(data.revenueGrowth * 100).toFixed(1)}%)`, impact: 'positive' });
    else if (data.revenueGrowth > 0.10) flags.push({ label: `Strong Growth (${(data.revenueGrowth * 100).toFixed(1)}%)`, impact: 'positive' });
    else if (data.revenueGrowth < -0.05) flags.push({ label: `Declining Revenue (${(data.revenueGrowth * 100).toFixed(1)}%)`, impact: 'negative' });

    // --- C. Solvency (20% of financial) ---
    // Sector-aware D/E scoring
    const sectorThresholds = SECTOR_DE_THRESHOLDS[data.sector || ''] || DEFAULT_DE_THRESHOLDS;
    const deScore = lerp(data.debtToEquity, [
        [0, 100],
        [sectorThresholds.low, 75],
        [sectorThresholds.low + (sectorThresholds.high - sectorThresholds.low) * 0.5, 50],
        [sectorThresholds.high, 25],
        [sectorThresholds.high * 2, 0],
    ]);

    // Interest coverage: continuous from 0 to 10x
    let icScore = 50; // neutral if unknown
    if (data.interestCoverage != null) {
        icScore = lerp(data.interestCoverage, [
            [0, 0],
            [1.5, 20],
            [3, 45],
            [5, 70],
            [8, 85],
            [15, 100],
        ]);
    }

    // Solvency: 65% D/E + 35% Interest Coverage
    const solvencyScore = deScore * 0.65 + icScore * 0.35;

    if (data.debtToEquity < sectorThresholds.low * 0.5) flags.push({ label: "Fortress Balance Sheet", impact: 'positive' });
    else if (data.debtToEquity > sectorThresholds.high) flags.push({ label: `High Debt Load (${data.debtToEquity.toFixed(1)}x D/E)`, impact: 'negative' });
    if (data.interestCoverage != null && data.interestCoverage < 2) flags.push({ label: `Weak Interest Coverage (${data.interestCoverage.toFixed(1)}x)`, impact: 'negative' });

    // --- D. Valuation (15% of financial) ---
    let valuationScore = 50; // neutral if no data
    let hasValuationData = false;

    if (data.peRatio != null && data.peRatio > 0) {
        hasValuationData = true;
        valuationScore = lerp(data.peRatio, [
            [5, 95],    // Very cheap
            [12, 80],
            [18, 60],
            [25, 45],
            [40, 25],
            [60, 10],
            [100, 0],
        ]);
        if (data.peRatio < 12) flags.push({ label: `Low P/E (${data.peRatio.toFixed(1)}x)`, impact: 'positive' });
        else if (data.peRatio > 40) flags.push({ label: `Expensive P/E (${data.peRatio.toFixed(1)}x)`, impact: 'negative' });
    }

    // If EV/EBITDA available, blend it in (or use as fallback)
    if (data.evToEbitda != null && data.evToEbitda > 0) {
        const evScore = lerp(data.evToEbitda, [
            [3, 95],
            [8, 75],
            [12, 55],
            [20, 30],
            [35, 10],
            [60, 0],
        ]);
        valuationScore = hasValuationData
            ? valuationScore * 0.6 + evScore * 0.4
            : evScore;
        hasValuationData = true;
    }

    if (!hasValuationData) {
        // Unprofitable companies with no valuation metrics get penalized, not neutral
        if (data.roe < 0 && data.netMargin < 0) {
            valuationScore = 20;
            flags.push({ label: "Unvaluable (Unprofitable)", impact: 'negative' });
        }
    }

    // --- E. Cash Flow (15% of financial) ---
    let cashFlowScore = 50; // neutral if no data
    if (data.fcfYield != null) {
        cashFlowScore = lerp(data.fcfYield, [
            [-0.20, 0],
            [-0.05, 15],
            [0, 35],
            [0.03, 55],
            [0.05, 70],
            [0.08, 85],
            [0.12, 100],
        ]);
        if (data.fcfYield > 0.06) flags.push({ label: `Strong FCF Yield (${(data.fcfYield * 100).toFixed(1)}%)`, impact: 'positive' });
        else if (data.fcfYield < -0.05) flags.push({ label: `Cash Burn (FCF Yield ${(data.fcfYield * 100).toFixed(1)}%)`, impact: 'negative' });
    }

    // Weighted Financial Score (0-100)
    const financialRaw =
        (profitabilityScore * 0.25) +
        (growthScore * 0.25) +
        (solvencyScore * 0.20) +
        (valuationScore * 0.15) +
        (cashFlowScore * 0.15);


    // =========================================================================
    // 2. TECHNICAL MOMENTUM (20% of final score)
    //    - Trend (SMA200)          50%
    //    - Relative Strength       35%
    //    - Volume                  15%
    // =========================================================================

    let trendComponent = 50; // neutral default
    let relativeStrengthComponent = 50; // neutral default
    let volumeComponent = 50; // neutral default

    // --- A. Trend: Price vs SMA200 ---
    if (data.sma200 != null && data.sma200 > 0) {
        const pctAboveSma = (data.currentPrice - data.sma200) / data.sma200;
        trendComponent = lerp(pctAboveSma, [
            [-0.30, 0],
            [-0.10, 20],
            [0, 50],
            [0.05, 65],
            [0.10, 75],
            [0.20, 90],
            [0.40, 100],
        ]);
        if (data.currentPrice > data.sma200) {
            flags.push({ label: `Trading Above 200DMA (+${(pctAboveSma * 100).toFixed(1)}%)`, impact: 'positive' });
        } else {
            flags.push({ label: `Trading Below 200DMA (${(pctAboveSma * 100).toFixed(1)}%)`, impact: 'negative' });
        }
    } else {
        // No SMA200 data — score neutral, flag it
        trendComponent = 50;
        flags.push({ label: "Insufficient Price History (no 200DMA)", impact: 'negative' });
    }

    // --- B. Relative Strength: 3-month return vs sector ---
    if (data.threeMonthReturn != null) {
        const sectorReturn = data.sectorThreeMonthReturn ?? 0;
        const excessReturn = data.threeMonthReturn - sectorReturn;
        relativeStrengthComponent = lerp(excessReturn, [
            [-0.30, 0],
            [-0.10, 20],
            [0, 50],
            [0.10, 75],
            [0.25, 90],
            [0.50, 100],
        ]);
        if (excessReturn > 0.05) flags.push({ label: "Sector Outperformer", impact: 'positive' });
        else if (excessReturn < -0.10) flags.push({ label: "Sector Underperformer", impact: 'negative' });
    }

    // --- C. Volume: requires 2x average for breakout ---
    if (data.volumeRatio != null) {
        volumeComponent = lerp(data.volumeRatio, [
            [0.3, 15],   // Very low volume
            [0.7, 35],
            [1.0, 50],   // Average
            [2.0, 75],   // Breakout threshold
            [4.0, 90],
            [8.0, 100],
        ]);
        if (data.volumeRatio >= 2.0) flags.push({ label: `Volume Breakout (${data.volumeRatio.toFixed(1)}x avg)`, impact: 'positive' });
        else if (data.volumeRatio < 0.5) flags.push({ label: "Low Volume", impact: 'negative' });
    }

    const technicalRaw = (trendComponent * 0.50) + (relativeStrengthComponent * 0.35) + (volumeComponent * 0.15);

    // =========================================================================
    // 3. MARKET CAP / LIQUIDITY PENALTY
    // =========================================================================
    let liquidityPenalty = 0;
    if (data.marketCap != null && data.marketCap > 0) {
        if (data.marketCap < 50_000_000) {
            // Micro-cap: up to -10 penalty on financial score
            liquidityPenalty = lerp(data.marketCap, [
                [1_000_000, 10],
                [10_000_000, 7],
                [50_000_000, 0],
            ]);
            flags.push({ label: `Micro-Cap Risk ($${(data.marketCap / 1e6).toFixed(0)}M)`, impact: 'negative' });
        } else if (data.marketCap < 300_000_000) {
            liquidityPenalty = lerp(data.marketCap, [
                [50_000_000, 3],
                [300_000_000, 0],
            ]);
            flags.push({ label: `Small-Cap ($${(data.marketCap / 1e6).toFixed(0)}M)`, impact: 'negative' });
        }
    }

    const adjustedFinancial = Math.max(0, Math.min(100, financialRaw - liquidityPenalty));
    const adjustedTechnical = Math.max(0, Math.min(100, technicalRaw));

    // =========================================================================
    // FINAL AGGREGATION
    // This returns the deterministic portion: financial × 0.40 + technical × 0.20
    // AI qualitative adds the remaining 40% later.
    // =========================================================================
    const weightedTotal = (adjustedFinancial * 0.40) + (adjustedTechnical * 0.20);

    return {
        total: Math.round(weightedTotal * 100) / 100, // out of 60 max
        components: {
            financial: Math.round(adjustedFinancial),
            technical: Math.round(adjustedTechnical)
        },
        breakdown: {
            profitability: Math.round(profitabilityScore),
            growth: Math.round(growthScore),
            solvency: Math.round(solvencyScore),
            valuation: Math.round(valuationScore),
            cashFlow: Math.round(cashFlowScore),
            trend: Math.round(adjustedTechnical)
        },
        flags
    };
}
