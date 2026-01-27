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
    const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=10&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return response.json();
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
        // Map Finnhub structure to match the frontend expectations if needed, 
        // but current UI handles both via the synthesis step.
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
    // CIK must be 10 digits padded with zeros
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
 * Fetch historical daily prices for the last 30 days.
 */
export async function getFinnhubHistoricalPrices(symbol: string) {
    try {
        const to = Math.floor(Date.now() / 1000);
        const from = to - (5 * 365 * 24 * 60 * 60); // 5 years ago for Finnhub fallback
        const res = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`);

        if (!res.ok) return [];
        const data = await res.json();

        if (data.s !== 'ok') {
            console.warn(`[FINNHUB] No data for ${symbol}. Status: ${data.s}`);
            return [];
        }

        // Map Finnhub [t, c, o, h, l, v] arrays to FMP-style objects
        return data.t.map((timestamp: number, i: number) => ({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            close: data.c[i],
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            volume: data.v[i],
            symbol: symbol
        })).reverse(); // Reverse to match FMP's newest-first order
    } catch (error) {
        console.error(`Finnhub historical prices failed for ${symbol}:`, error);
        return [];
    }
}

export async function getHistoricalPrices(symbol: string) {
    // 1. Try FMP Stable (Newest, clean array format)
    try {
        const data = await fetchFMP(`historical-price-eod/full`, {
            symbol
            // No limit passed to get full history
        });
        if (Array.isArray(data) && data.length > 0) {
            return data;
        }
    } catch (error) {
        console.warn(`[FMP] Stable historical unavailable for ${symbol}`);
    }

    // 2. Try FMP V3 Legacy (Different URL path and object structure)
    try {
        const v3Url = `https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${FMP_API_KEY}`;
        const res = await fetch(v3Url, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data.historical && data.historical.length > 0) {
                console.log(`[FMP] Successfully retrieved legacy historical data for ${symbol}`);
                return data.historical;
            }
        }
    } catch (error) {
        console.warn(`[FMP] Legacy V3 historical failed for ${symbol}`);
    }

    // 3. Fallback to Finnhub (Last resort)
    console.warn(`[FMP] Exhausted FMP options for ${symbol}, falling back to Finnhub`);
    return getFinnhubHistoricalPrices(symbol);
}
