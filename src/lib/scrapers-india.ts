const INDIAN_API_KEY = process.env.INDIAN_API_KEY;

// Commented out for future exploration:
// const UPSTOX_API_KEY = process.env.UPSTOX_API_KEY;
// const MARKETAUX_API_KEY = process.env.MARKETAUX_API_KEY;

/**
 * Fetch data from IndianAPI.in
 */
export async function fetchIndianAPI(endpoint: string, params: Record<string, string> = {}) {
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
}


/**
 * [FUTURE EXPLORATION] Fetch data from Upstox API v3
 */
/*
export async function fetchUpstox(endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`https://api.upstox.com/v3/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    console.log(`[UPSTOX FETCH]: ${url.toString()}`);
    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${UPSTOX_API_KEY}`
        },
        cache: 'no-store'
    });

    if (!response.ok) {
        return null;
    }

    return response.json();
}
*/

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
        // Doc says /stock uses 'name' parameter
        const data = await fetchIndianAPI('stock', { name: symbol });
        if (data) {
            return {
                symbol: data.symbol || symbol,
                companyName: data.companyName || data.name || symbol,
                exchange: typeof data.exchange === 'object'
                    ? Object.keys(data.exchange).join(' / ')
                    : (data.exchange || 'NSE'),

                industry: data.industry || 'Unknown',
                sector: data.sector || 'Unknown',
                mktCap: extractValue(data.marketCap),
                price: extractValue(data.currentPrice),
                changes: extractValue(data.change),
                changesPercentage: extractValue(data.changePercentage),
                cik: null,
                isIndia: true,
                raw: data // Keep raw for AI synthesis
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
        const data = await fetchIndianAPI('stock', { name: symbol });
        if (data) {
            return {
                price: extractValue(data.currentPrice),
                change: extractValue(data.change),
                changesPercentage: extractValue(data.changePercentage),
                marketCap: extractValue(data.marketCap),
                low: extractValue(data.low),
                high: extractValue(data.high)
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
        // Valid stats: cashflow, yoy_results, quarter_results, balancesheet
        const data = await fetchIndianAPI('statement', { stock_name: symbol, stats });
        return data || null;

    } catch (error) {
        console.error(`Financials fetch failed for ${symbol} (India):`, error);
        return null;
    }
}

export async function getCorporateActionsIndia(symbol: string) {
    try {
        // Doc says /corporate_actions (with underscore) and uses 'stock_name'
        const data = await fetchIndianAPI('corporate_actions', { stock_name: symbol });
        return data || null;
    } catch (error) {
        console.error(`Corporate actions fetch failed for ${symbol} (India):`, error);
        return null;
    }
}

export async function getNewsIndia(symbol: string) {
    try {
        // IndianAPI.in /stock handles news, but let's check recent_announcements too
        const data = await fetchIndianAPI('stock', { name: symbol });
        if (data && data.recentNews) {
            return data.recentNews.map((n: any) => ({
                title: n.headline || n.title,
                url: n.url,
                source: n.sourceName || n.source || 'LiveMint/Internal',
                date: n.date
            }));
        }
        return [];
    } catch (error) {
        console.error(`News fetch failed for ${symbol} (India):`, error);
        return [];
    }
}

/**
 * [FUTURE EXPLORATION] News from Marketaux
 */
/*
export async function getNewsMarketaux(symbol: string) {
    try {
        const url = `https://api.marketaux.com/v1/news/all?symbols=${symbol}&filter_entities=true&api_token=${MARKETAUX_API_KEY}`;
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error(`News fetch failed for ${symbol} (India):`, error);
        return [];
    }
}
*/

export async function getHistoricalPricesIndia(symbol: string) {
    try {
        const data = await fetchIndianAPI('historical_data', {
            stock_name: symbol,
            period: '1yr',
            filter: 'price'
        });
        if (data && data.datasets && data.datasets[0] && data.datasets[0].values) {
            return data.datasets[0].values.map((v: any[]) => ({
                date: v[0],
                close: parseFloat(v[1]),
                open: parseFloat(v[1]),
                high: parseFloat(v[1]),
                low: parseFloat(v[1]),
                volume: 0
            }));
        }
        return [];
    } catch (error) {
        console.error(`Historical prices fetch failed for ${symbol} (India):`, error);
        return [];
    }
}

/**
 * Fetch trending stocks to proxy sector rotation
 */
export async function getTrendingIndia() {
    try {
        return await fetchIndianAPI('trending');
    } catch (error) {
        console.error("Trending stocks fetch failed (India):", error);
        return [];
    }
}

/**
 * Fetch most active stocks to proxy capital flow
 */
export async function getNSEMostActiveIndia() {
    try {
        return await fetchIndianAPI('NSE_most_active');
    } catch (error) {
        console.error("NSE Most Active fetch failed:", error);
        return [];
    }
}

/**
 * Search peers in industry to aggregate sector performance
 */
export async function searchIndustryIndia(industry: string) {
    try {
        return await fetchIndianAPI('industry_search', { query: industry });
    } catch (error) {
        console.error(`Industry search failed for ${industry}:`, error);
        return [];
    }
}

/**
 * Fetch various historical stats (e.g., ratios)
 */
export async function getHistoricalStatsIndia(symbol: string, stats: string = 'ratios') {
    try {
        return await fetchIndianAPI('historical_stats', { stock_name: symbol, stats });
    } catch (error) {
        console.error(`Historical stats fetch failed for ${symbol}:`, error);
        return null;
    }
}
