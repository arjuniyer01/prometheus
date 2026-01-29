const FMP_API_KEY = process.env.FMP_API_KEY;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

/**
 * FMP has moved to a 'stable' endpoint for new users (post Aug 2025).
 * URL format: https://financialmodelingprep.com/stable/{endpoint}?symbol={symbol}&apikey={key}
 */
export async function fetchFMP(endpoint: string, params: Record<string, string> = {}) {
    // Check if symbol is in params, if not we might need to handle it differently
    // but usually profile, ratios, metrics all take 'symbol' as a query param in 'stable'
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
}

export async function getCompanyProfile(symbol: string) {
    try {
        const data = await fetchFMP(`profile`, { symbol });
        return data?.[0] || null;
    } catch (error) {
        console.error(`Profile fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getQuote(symbol: string) {
    try {
        const data = await fetchFMP(`quote`, { symbol });
        return data?.[0] || null;
    } catch (error) {
        console.error(`Quote fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getKeyMetrics(symbol: string) {
    try {
        const data = await fetchFMP(`key-metrics`, { symbol, limit: '1' });
        return data?.[0] || null;
    } catch (error) {
        console.error(`Key metrics fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getFinancialRatios(symbol: string) {
    try {
        const data = await fetchFMP(`ratios`, { symbol, limit: '1' });
        return data?.[0] || null;
    } catch (error) {
        console.error(`Financial ratios fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getFinnhubFinancials(symbol: string) {
    try {
        const response = await fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${FINNHUB_API_KEY}`);
        if (!response.ok) return null;
        const data = await response.json();
        return data.metric || null;
    } catch (error) {
        console.error(`Finnhub financials fetch failed for ${symbol}:`, error);
        return null;
    }
}

export async function getFMPNews(symbol: string) {
    try {
        return await fetchFMP(`stock_news`, { tickers: symbol, limit: '10' });
    } catch (error) {
        console.error(`FMP News fetch failed for ${symbol}:`, error);
        return [];
    }
}

export async function getNews(symbol: string) {
    try {
        // 1. Try FMP News first (Priority)
        const fmpNews = await getFMPNews(symbol);
        if (fmpNews && fmpNews.length > 0) return fmpNews;

        console.warn(`FMP News empty for ${symbol}, falling back to Finnhub`);
    } catch (error) {
        console.warn(`FMP News failed for ${symbol}:`, error);
    }

    // 2. Fallback to Finnhub
    try {
        const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-01-01&to=2026-01-25&token=${FINNHUB_API_KEY}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("News fallback failed:", error);
        return [];
    }
}

/**
 * Fetch SEC Submissions (10-K, 10-Q, 8-K) for a given CIK.
 */
export async function getSECSubmissions(cik: string) {
    if (!cik) return null;
    const paddedCik = cik.padStart(10, '0');
    const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Prometheus Financial Intelligence (contact@example.com)'
        }
    });

    if (!response.ok) {
        if (response.status === 403) return { error: "SEC Rate Limited or Blocked" };
        throw new Error(`SEC API Error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        recent: data.filings.recent,
        name: data.name
    };
}

/**
 * Fetch SEC Profile for a given symbol (Stable)
 */
export async function getSECProfile(symbol: string) {
    try {
        const data = await fetchFMP(`sec-profile`, { symbol });
        return data?.[0] || null;
    } catch (error) {
        console.error(`SEC Profile fetch failed for ${symbol}:`, error);
        return null;
    }
}

/**
 * Fetch historical daily prices for the last 30 days.
 */
export async function getFinnhubHistoricalPrices(symbol: string) {
    try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (5 * 365 * 24 * 60 * 60);
        const res = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`);

        if (!res.ok) return [];
        const data = await res.json();

        if (data.s !== 'ok') {
            return [];
        }

        return data.t.map((timestamp: number, i: number) => ({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            close: data.c[i],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            volume: data.v[i],
            symbol: symbol
        })).reverse();
    } catch (error) {
        console.error(`Finnhub historical prices failed for ${symbol}:`, error);
        return [];
    }
}

export async function getHistoricalPrices(symbol: string) {
    try {
        // User prefers historical-chart/1day for stable
        const data = await fetchFMP(`historical-chart/1day/${symbol}`);
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
    } catch (error) {
        console.warn(`[FMP] Stable historical-chart unavailable for ${symbol}, trying eod/full fallback`);
    }

    try {
        const data = await fetchFMP(`historical-price-eod/full`, { symbol });
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
    } catch (error) {
        console.warn(`[FMP] Stable historical eod/full unavailable for ${symbol}`);
    }

    // Last resort: Finnhub
    return getFinnhubHistoricalPrices(symbol);
}

export async function getIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    try {
        return await fetchFMP(`income-statement`, { symbol, period, limit: limit.toString() });
    } catch (error) {
        console.error(`Income statement fetch failed for ${symbol}:`, error);
        return [];
    }
}

export async function getBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual', limit: number = 5) {
    try {
        return await fetchFMP(`balance-sheet-statement`, { symbol, period, limit: limit.toString() });
    } catch (error) {
        console.error(`Balance sheet fetch failed for ${symbol}:`, error);
        return [];
    }
}

export async function getSectorPerformance() {
    try {
        // use today's or yesterday's date for snapshot
        const today = new Date().toISOString().split('T')[0];
        return await fetchFMP(`sector-performance-snapshot`, { date: today });
    } catch (error) {
        console.warn("Sector performance snapshot failed for today, trying a few days ago...");
        // Fallback to a fixed relative date to ensure stability
        const date = new Date();
        date.setDate(date.getDate() - 3); // 3 days ago should have data
        const fallbackDate = date.toISOString().split('T')[0];
        try {
            return await fetchFMP(`sector-performance-snapshot`, { date: fallbackDate });
        } catch (e) {
            console.error("Sector performance fetch failed completely:", e);
            return [];
        }
    }
}

export async function getHistoricalSectorPerformance(limit: number = 30) {
    try {
        // User reports /v3/ is legacy, but /stable/historical-sectors-performance might be 404
        // We will try stable first as requested.
        return await fetchFMP(`historical-sectors-performance`, { limit: limit.toString() });
    } catch (error) {
        console.warn("Historical sector performance stable failed, no fallback available for this specific path.");
        return [];
    }
}
