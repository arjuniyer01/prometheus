const INDIAN_API_KEY = process.env.INDIAN_API_KEY;

import {
    getYahooHistoricalPrices,
    getYahooIncomeStatement,
    getYahooBalanceSheet,
    getYahooQuote,
    getYahooProfile,
    getYahooMetrics,
    getYahooNews,
    getYahooCashFlow,
    getYahooAnalysis,
    getYahooSustainability
} from './yahoo-finance';

/**
 * Fetch data from IndianAPI.in
 */
export async function fetchIndianAPI(endpoint: string, params: Record<string, string> = {}) {
    /* COMMENTED OUT INDIAN_API
    const url = new URL(`https://stock.indianapi.in/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    console.log(`[INDIAN_API FETCH]: ${url.toString()}`);
    const response = await fetch(url.toString(), {
        headers: {
            'x-api-key': INDIAN_API_KEY || '',
            'Content-Type': 'application/json'
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        console.error(`[INDIAN_API ERROR]: ${response.status} ${response.statusText}`);
        return null;
    }

    return response.json();
    */
    return null;
}

/**
 * Helper to extract a single numeric value from IndianAPI's dual BSE/NSE objects
 */
function extractValue(val: any): number {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || 0;
    if (typeof val === 'object' && val !== null) {
        // Prefer NSE, fallback to BSE
        return parseFloat(val.NSE || val.BSE) || 0;
    }
    return 0;
}

export async function getCompanyProfileIndia(symbol: string) {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        const yahooProfile = await getYahooProfile(yahooSymbol);
        if (yahooProfile) {
            return {
                ...yahooProfile,
                raw: yahooProfile // Keep for compatibility
            };
        }
        return null;
    } catch (error) {
        console.error(`Profile fetch failed for ${symbol} (India):`, error);
        return null;
    }
}

export async function getQuoteIndia(symbol: string) {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        const yahooQuote = await getYahooQuote(yahooSymbol);
        if (yahooQuote) {
            return {
                price: yahooQuote.price,
                change: yahooQuote.change,
                changesPercentage: yahooQuote.changesPercentage,
                marketCap: yahooQuote.marketCap,
                low: yahooQuote.dayLow,
                high: yahooQuote.dayHigh
            };
        }
        return null;
    } catch (error) {
        console.error(`Quote fetch failed for ${symbol} (India):`, error);
        return null;
    }
}

export async function getFinancialStatementsIndia(symbol: string, stats: string = 'quarter_results') {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        if (stats === 'quarter_results' || stats === 'yoy_results') {
            const period = stats === 'quarter_results' ? 'quarter' : 'annual';
            const yahooData = await getYahooIncomeStatement(yahooSymbol, period);
            if (yahooData && yahooData.length > 0) {
                // Map Yahoo format back to IndianAPI format (metric -> period -> value)
                const mapped: Record<string, Record<string, number>> = {
                    'Sales': {},
                    'Net Profit': {},
                    'Operating Profit': {},
                    'Gross Profit': {},
                    'EPS': {}
                };

                yahooData.forEach((item: any) => {
                    const p = item.date;
                    if (item.revenue) mapped['Sales'][p] = item.revenue / 1e7; // Store as Crores
                    if (item.netIncome) mapped['Net Profit'][p] = item.netIncome / 1e7;
                    if (item.operatingIncome) mapped['Operating Profit'][p] = item.operatingIncome / 1e7;
                    if (item.grossProfit) mapped['Gross Profit'][p] = item.grossProfit / 1e7;
                    if (item.eps) mapped['EPS'][p] = item.eps;
                });
                return mapped;
            }
        } else if (stats === 'balancesheet') {
            const yahooData = await getYahooBalanceSheet(yahooSymbol, 'annual');
            if (yahooData && yahooData.length > 0) {
                const mapped: Record<string, Record<string, number>> = {
                    'Total Assets': {},
                    'Total Liabilities': {},
                    'Equity Capital': {},
                    'Borrowings': {}
                };
                yahooData.forEach((item: any) => {
                    const p = item.date;
                    if (item.totalAssets) mapped['Total Assets'][p] = item.totalAssets / 1e7;
                    if (item.totalLiabilities) mapped['Total Liabilities'][p] = item.totalLiabilities / 1e7;
                    if (item.totalStockholdersEquity) mapped['Equity Capital'][p] = item.totalStockholdersEquity / 1e7;
                    if (item.totalDebt) mapped['Borrowings'][p] = item.totalDebt / 1e7;
                });
                return mapped;
            }
        }
    } catch (error) {
        console.warn(`[Yahoo Finance] Financials failed for ${symbol} (India)`);
    }

    return null;
}

export async function getCorporateActionsIndia(symbol: string) {
    // Yahoo search results don't have corporate actions in a clean format
    return null;
}

export async function getNewsIndia(symbol: string) {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        return await getYahooNews(yahooSymbol);
    } catch (error) {
        console.error(`News fetch failed for ${symbol} (India):`, error);
        return [];
    }
}

export async function getHistoricalPricesIndia(symbol: string) {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        const yahooData = await getYahooHistoricalPrices(yahooSymbol);
        if (yahooData && yahooData.length > 0) {
            return yahooData;
        }
    } catch (error) {
        console.warn(`[Yahoo Finance] Historical prices failed for ${symbol} (India)`);
    }

    return [];
}

/**
 * Fetch trending stocks to proxy sector rotation
 */
export async function getTrendingIndia() {
    return [];
}

/**
 * Fetch most active stocks to proxy capital flow
 */
export async function getNSEMostActiveIndia() {
    return [];
}

/**
 * Search peers in industry to aggregate sector performance
 */
export async function searchIndustryIndia(industry: string) {
    return [];
}

/**
 * Fetch various historical stats (e.g., ratios)
 */
export async function getHistoricalStatsIndia(symbol: string, stats: string = 'ratios') {
    try {
        const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
        return await getYahooMetrics(yahooSymbol);
    } catch (error) {
        console.error(`Historical stats fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getStockForecastsIndia(symbol: string, measure: string = 'EPS') {
    return null;
}

export async function getStockTargetPriceIndia(symbol: string) {
    return null;
}

export async function getRecentAnnouncementsIndia(symbol: string) {
    return null;
}

export async function getCashFlowIndia(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    try {
        const data = await getYahooCashFlow(yahooSymbol, period);
        return data.slice(0, limit);
    } catch (error) {
        return [];
    }
}

export async function getFullAnalysisIndia(symbol: string) {
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    return await getYahooAnalysis(yahooSymbol);
}

export async function getSustainabilityIndia(symbol: string) {
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    return await getYahooSustainability(yahooSymbol);
}
