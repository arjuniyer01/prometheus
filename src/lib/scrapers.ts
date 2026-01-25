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

    const response = await fetch(url.toString());
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(`FMP API Error: ${response.statusText} - ${JSON.stringify(errData)}`);
    }
    return response.json();
}

export async function getCompanyProfile(symbol: string) {
    const data = await fetchFMP(`profile`, { symbol });
    return data[0];
}

export async function getKeyMetrics(symbol: string) {
    const data = await fetchFMP(`key-metrics`, { symbol, limit: '1' });
    return data[0];
}

export async function getFinancialRatios(symbol: string) {
    const data = await fetchFMP(`ratios`, { symbol, limit: '1' });
    return data[0];
}

export async function getFMPNews(symbol: string) {
    const url = `https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=10&apikey=${FMP_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return response.json();
}

export async function getNews(symbol: string) {
    // Current Finnhub implementation
    const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=2024-01-01&to=2026-01-25&token=${FINNHUB_API_KEY}`);
    if (!response.ok) {
        console.warn("Finnhub News failed, falling back to FMP");
        return getFMPNews(symbol);
    }
    return response.json();
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
export async function getHistoricalPrices(symbol: string) {
    // FMP Stable format for historical data: /stable/historical-price-eod/full?symbol={AAPL}
    const data = await fetchFMP(`historical-price-eod/full`, {
        symbol,
        limit: '30'
    });
    return data || []; // This endpoint often returns an array directly
}
