export interface ScoringInput {
    // Financials
    roe: number;
    netMargin: number;
    revenueGrowth: number;
    debtToEquity: number;
    interestCoverage?: number;

    // Technicals
    currentPrice: number;
    sma200: number;
    momentumAnalysis?: {
        isOutperformingSector: boolean;
        volumeBreakout: boolean;
    };

    // Market Context (for adjustments)
    market: 'US' | 'INDIA';
}

export interface CalculatedScore {
    total: number; // 0-100
    components: {
        financial: number; // 0-100 (40% weight)
        technical: number; // 0-100 (20% weight)
    };
    breakdown: {
        profitability: number;
        growth: number;
        solvency: number;
        trend: number;
    };
    flags: { label: string; impact: 'positive' | 'negative' }[];
}

export function calculateDeterministicScore(data: ScoringInput): CalculatedScore {
    let financialRaw = 0;
    let technicalRaw = 0;
    const flags: { label: string; impact: 'positive' | 'negative' }[] = [];

    // --- 1. FINANCIAL HEALTH (40% Weight) ---
    // A. Profitability (15%)
    let profitabilityScore = 0;
    if (data.roe > 0.15) { profitabilityScore = 100; flags.push({ label: "High ROE (>15%)", impact: 'positive' }); }
    else if (data.roe > 0.10) profitabilityScore = 75;
    else if (data.roe > 0) profitabilityScore = 50;
    else { profitabilityScore = 0; flags.push({ label: "Negative ROE", impact: 'negative' }); }

    if (data.netMargin > 0.20) {
        profitabilityScore = Math.min(100, profitabilityScore + 10);
        flags.push({ label: "High Margins (>20%)", impact: 'positive' });
    }

    // B. Growth (15%)
    let growthScore = 0;
    if (data.revenueGrowth > 0.25) { growthScore = 100; flags.push({ label: "Hypergrowth (>25%)", impact: 'positive' }); }
    else if (data.revenueGrowth > 0.10) growthScore = 75;
    else if (data.revenueGrowth > 0) growthScore = 50;
    else { growthScore = 0; flags.push({ label: "Declining Revenue", impact: 'negative' }); }

    // C. Solvency (10%)
    let solvencyScore = 0;
    if (data.debtToEquity < 0.5) { solvencyScore = 100; flags.push({ label: "Fortress Balance Sheet", impact: 'positive' }); }
    else if (data.debtToEquity < 1.5) solvencyScore = 50;
    else { solvencyScore = 0; flags.push({ label: "High Debt Load", impact: 'negative' }); }

    if (data.interestCoverage && data.interestCoverage > 5) {
        solvencyScore = Math.min(100, solvencyScore + 10);
    }

    // Weighted Financial Score
    // Profit (15/40) + Growth (15/40) + Solvency (10/40) -> Normalized to 0-100
    financialRaw = (profitabilityScore * 0.375) + (growthScore * 0.375) + (solvencyScore * 0.25);


    // --- 2. TECHNICAL MOMENTUM (20% Weight) ---
    let trendScore = 0;

    // Price vs SMA200 (Long term trend)
    if (data.currentPrice > data.sma200) {
        trendScore += 60;
        flags.push({ label: "Trading Above 200DMA", impact: 'positive' });
    } else {
        flags.push({ label: "Trading Below 200DMA", impact: 'negative' });
    }

    // Relative Strength
    if (data.momentumAnalysis?.isOutperformingSector) {
        trendScore += 30;
        flags.push({ label: "Sector Outperformer", impact: 'positive' });
    }

    // Volume Breakout
    if (data.momentumAnalysis?.volumeBreakout) {
        trendScore += 10;
        flags.push({ label: "Volume Breakout Detected", impact: 'positive' });
    }

    technicalRaw = Math.min(100, trendScore);


    // --- FINAL AGGREGATION ---
    // Note: This function only returns the deterministic parts. 
    // The LLM will add the Qualitative (40%) later.
    // However, to view a "preliminary" total, we can weight these sections against their own 60% slice.

    const weightedTotal = (financialRaw * 0.40) + (technicalRaw * 0.20);
    // This 'weightedTotal' is out of 60. The remaining 40 comes from AI.

    return {
        total: weightedTotal, // This is the base score / 60
        components: {
            financial: Math.round(financialRaw),
            technical: Math.round(technicalRaw)
        },
        breakdown: {
            profitability: Math.round(profitabilityScore),
            growth: Math.round(growthScore),
            solvency: Math.round(solvencyScore),
            trend: Math.round(technicalRaw)
        },
        flags
    };
}
