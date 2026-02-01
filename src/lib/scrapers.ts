const FMP_API_KEY = process.env.FMP_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

import {
    getYahooHistoricalPrices,
    getYahooIncomeStatement,
    getYahooBalanceSheet,
    getYahooQuote,
    getYahooProfile,
    getYahooMetrics,
    getYahooNews,
    getYahooRecommendations,
    getYahooCashFlow,
    getYahooAnalysis,
    getYahooSustainability,
    getYahooSECFilings
} from './yahoo-finance';

/**
 * FMP has moved to a 'stable' endpoint for new users (post Aug 2025).
 * URL format: https://financialmodelingprep.com/stable/{endpoint}?symbol={symbol}&apikey={key}
 */
export async function fetchFMP(endpoint: string, params: Record<string, string> = {}) {
    /* COMMENTED OUT FMP
    const url = new URL(`https://financialmodelingprep.com/stable/${endpoint}`);
    url.searchParams.append('apikey', FMP_API_KEY!);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    console.log(`[FMP FETCH]: ${url.toString().replace(FMP_API_KEY!, 'REDACTED')}`);
    const response = await fetch(url.toString(), { cache: 'no-store' });
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
        let errData = {};
        if (contentType && contentType.includes("application/json")) {
            errData = await response.json();
        }
        throw new Error(`FMP API Error: ${response.status} ${response.statusText} - ${JSON.stringify(errData)}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
        console.error(`FMP Error: Received non-JSON response from ${endpoint}`);
        return [];
    }

    return response.json();
    */
    return [];
}

export async function getCompanyProfile(symbol: string) {
    try {
        const yahooProfile = await getYahooProfile(symbol);
        if (yahooProfile) return yahooProfile;
        return null;
    } catch (error) {
        console.error(`Profile fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getQuote(symbol: string) {
    try {
        const yahooQuote = await getYahooQuote(symbol);
        if (yahooQuote) return yahooQuote;
        return null;
    } catch (error) {
        console.error(`Quote fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getKeyMetrics(symbol: string) {
    try {
        const yahooMetrics = await getYahooMetrics(symbol);
        if (yahooMetrics) return yahooMetrics;
        return null;
    } catch (error) {
        console.error(`Key metrics fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getFinancialRatios(symbol: string) {
    try {
        // Yahoo metrics includes ratios in our wrapper
        const yahooMetrics = await getYahooMetrics(symbol);
        if (yahooMetrics) return yahooMetrics;
        return null;
    } catch (error) {
        console.error(`Financial ratios fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getFinnhubFinancials(symbol: string) {
    /* COMMENTED OUT FINNHUB 
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.metric || null;
    } catch (error) {
        console.error(`Finnhub financials fetch failed for ${symbol}:`, error);
        return null;
    }
    */
    return getYahooMetrics(symbol);
}

import { getAggregatedNews } from './news-rss';

export async function getFMPNews(symbol: string) {
    return getAggregatedNews(symbol);
}

export async function getNews(symbol: string) {
    return getAggregatedNews(symbol);
}

/**
 * Fetch SEC Submissions (10-K, 10-Q, 8-K) for a given CIK.
 */
export async function getSECSubmissions(symbol: string) {
    try {
        return await getYahooSECFilings(symbol);
    } catch (error) {
        console.error(`SEC submissions fetch failed for ${symbol}:`, error);
        return [];
    }
}

/**
 * Fetch SEC Profile for a given symbol (Stable)
 */
export async function getSECProfile(symbol: string) {
    return null;
}

/**
 * Fetch historical daily prices for the last 30 days.
 */
export async function getFinnhubHistoricalPrices(symbol: string) {
    return getYahooHistoricalPrices(symbol);
}

export async function getHistoricalPrices(symbol: string) {
    return getYahooHistoricalPrices(symbol);
}

export async function getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    try {
        const yahooData = await getYahooIncomeStatement(symbol, period);
        if (yahooData && yahooData.length > 0) {
            return yahooData.slice(0, limit);
        }
    } catch (error) {
        console.warn(`[Yahoo Finance] Income statement failed for ${symbol}`);
    }

    return [];
}

export async function getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    try {
        const yahooData = await getYahooBalanceSheet(symbol, period);
        if (yahooData && yahooData.length > 0) {
            return yahooData.slice(0, limit);
        }
    } catch (error) {
        console.warn(`[Yahoo Finance] Balance sheet failed for ${symbol}`);
    }

    return [];
}

export async function getSectorPerformance() {
    // Yahoo doesn't give this as a simple list.
    return [];
}

export async function getHistoricalSectorPerformance(limit: number = 30) {
    return [];
}

export async function getAnalystRecommendations(symbol: string) {
    try {
        return await getYahooRecommendations(symbol);
    } catch (error) {
        return [];
    }
}

export async function getTechnicalSMA(symbol: string, period: number = 50) {
    return [];
}

export async function getCashFlow(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    try {
        const data = await getYahooCashFlow(symbol, period);
        return data.slice(0, limit);
    } catch (error) {
        return [];
    }
}

export async function getFullAnalysis(symbol: string) {
    return await getYahooAnalysis(symbol);
}

export async function getSustainability(symbol: string) {
    return await getYahooSustainability(symbol);
}
