/**
 * Fetch all financial data for a ticker from Yahoo Finance.
 * Outputs structured JSON to stdout for Claude to analyze.
 *
 * Usage: npx tsx scripts/fetch-stock-data.ts AAPL [US|INDIA]
 */

// Capture the real stdout.write BEFORE any imports can pollute it
const realStdoutWrite = process.stdout.write.bind(process.stdout);

// Hijack stdout to prevent dotenv/yahoo-finance2 notices from polluting JSON output
process.stdout.write = (chunk: any, ...args: any[]) => {
    return process.stderr.write(chunk, ...(args as [any]));
};

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const symbol = process.argv[2];
const market = (process.argv[3] || 'US').toUpperCase();

if (!symbol) {
    console.error('Usage: npx tsx scripts/fetch-stock-data.ts <SYMBOL> [US|INDIA]');
    process.exit(1);
}

async function main() {
    // Dynamic imports to handle the module resolution
    const yahooFinance = await import('../src/lib/yahoo-finance');
    const newsRss = await import('../src/lib/news-rss');
    const scoringEngine = await import('../src/lib/scoring-engine');

    if (market === 'INDIA') {
        const scrapersIndia = await import('../src/lib/scrapers-india');
        await fetchIndiaData(symbol, scrapersIndia, yahooFinance, scoringEngine);
    } else {
        await fetchUSData(symbol, yahooFinance, newsRss, scoringEngine);
    }
}

/**
 * Compute 3-month return from historical prices.
 * Expects prices sorted newest-first.
 */
function computeThreeMonthReturn(prices: any[]): number | null {
    if (!prices || prices.length < 63) return null;
    const current = prices[0]?.close;
    const threeMonthsAgo = prices[Math.min(62, prices.length - 1)]?.close;
    if (!current || !threeMonthsAgo || threeMonthsAgo === 0) return null;
    return (current - threeMonthsAgo) / threeMonthsAgo;
}

/**
 * Compute SMA200 from historical prices (newest-first).
 * Returns null if insufficient data.
 */
function computeSma200(prices: any[]): number | null {
    if (!prices || prices.length < 200) return null;
    const sum = prices.slice(0, 200).reduce((acc: number, val: any) => acc + (val.close || 0), 0);
    return sum / 200;
}

async function fetchUSData(ticker: string, yf: any, newsRss: any, scoring: any) {
    console.error(`[FETCH] Starting US data fetch for ${ticker}...`);

    const [profile, quote, metrics, historicalPrices, annualIncome, annualBalance, quarterlyIncome, quarterlyBalance] = await Promise.all([
        yf.getYahooProfile(ticker),
        yf.getYahooQuote(ticker),
        yf.getYahooMetrics(ticker),
        yf.getYahooHistoricalPrices(ticker),
        yf.getYahooIncomeStatement(ticker, 'annual'),
        yf.getYahooBalanceSheet(ticker, 'annual'),
        yf.getYahooIncomeStatement(ticker, 'quarter'),
        yf.getYahooBalanceSheet(ticker, 'quarter'),
    ]);

    if (!profile) {
        console.error(`[FETCH] Could not find profile for ${ticker}`);
        process.exit(1);
    }

    console.error(`[FETCH] Got profile: ${profile.companyName}`);

    const [secFilings, news, analystRecs, cashFlow, fullAnalysis] = await Promise.all([
        yf.getYahooSECFilings(ticker),
        newsRss.getAggregatedNews(ticker),
        yf.getYahooRecommendations(ticker),
        yf.getYahooCashFlow(ticker, 'annual'),
        yf.getYahooAnalysis(ticker),
    ]);

    console.error(`[FETCH] Got all supplementary data`);

    // --- Revenue growth: prefer quarterly YoY, fallback to metrics ---
    let lastQuartersRevGrowth = 0;
    if (quarterlyIncome && quarterlyIncome.length >= 5) {
        try {
            const currentRev = quarterlyIncome[0].revenue;
            const yearAgoRev = quarterlyIncome[4].revenue;
            if (yearAgoRev && yearAgoRev !== 0) {
                lastQuartersRevGrowth = (currentRev - yearAgoRev) / yearAgoRev;
            }
        } catch { lastQuartersRevGrowth = 0; }
    }
    if (!lastQuartersRevGrowth && metrics?.revenueGrowth) {
        lastQuartersRevGrowth = metrics.revenueGrowth;
    }

    // --- SMA200: null if insufficient data ---
    const sma200 = computeSma200(historicalPrices);

    // --- 3-month return ---
    const threeMonthReturn = computeThreeMonthReturn(historicalPrices);

    // --- Volume ratio ---
    const volumeRatio = (quote?.volume && quote?.avgVolume && quote.avgVolume > 0)
        ? quote.volume / quote.avgVolume
        : null;

    // --- FCF Yield ---
    let fcfYield: number | null = null;
    const mktCap = quote?.marketCap || profile?.mktCap;
    if (metrics?.freeCashFlow && mktCap && mktCap > 0) {
        fcfYield = metrics.freeCashFlow / mktCap;
    }

    // --- P/E and EV/EBITDA ---
    const peRatio = metrics?.pe || profile?.trailingPE || null;
    const evToEbitda = metrics?.enterpriseToEbitda || null;

    // --- D/E: Yahoo returns as percentage (e.g. 150 = 1.5x ratio) ---
    const debtToEquity = (metrics?.debtToEquity || 0) / 100;

    const deterministicScore = scoring.calculateDeterministicScore({
        roe: metrics?.roe || 0,
        netMargin: metrics?.netProfitMargin || 0,
        revenueGrowth: lastQuartersRevGrowth,
        debtToEquity,
        interestCoverage: metrics?.interestCoverage || undefined,
        peRatio,
        evToEbitda,
        fcfYield,
        currentPrice: quote?.price || 0,
        sma200,
        threeMonthReturn,
        sectorThreeMonthReturn: null, // TODO: fetch sector ETF return
        volumeRatio,
        sector: profile?.sector || null,
        marketCap: mktCap || null,
        market: 'US'
    });

    console.error(`[FETCH] Deterministic score: Financial=${deterministicScore.components.financial}, Technical=${deterministicScore.components.technical}`);

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const output = {
        ticker,
        market: 'US',
        fetchedAt: new Date().toISOString(),
        today,
        profile,
        quote,
        metrics,
        historicalPrices,
        annualIncome: annualIncome?.slice(0, 5) || [],
        annualBalance: annualBalance?.slice(0, 5) || [],
        quarterlyIncome: quarterlyIncome?.slice(0, 5) || [],
        quarterlyBalance: quarterlyBalance?.slice(0, 5) || [],
        secFilings: secFilings?.slice(0, 10) || [],
        news: (news || []).map((n: any) => ({ headline: n.title || n.headline, source: n.source, date: n.date || n.datetime, url: n.url })),
        analystRecs,
        cashFlow,
        fullAnalysis,
        deterministicScore
    };

    // Output to stdout (logs go to stderr)
    realStdoutWrite(JSON.stringify(output, null, 2));
    console.error(`[FETCH] Done. Output ${JSON.stringify(output).length} bytes.`);
}

async function fetchIndiaData(ticker: string, scrapers: any, yf: any, scoring: any) {
    console.error(`[FETCH] Starting India data fetch for ${ticker}...`);

    const profile = await scrapers.getCompanyProfileIndia(ticker);
    if (!profile) {
        console.error(`[FETCH] Could not find profile for ${ticker}`);
        process.exit(1);
    }
    console.error(`[FETCH] Got profile: ${profile.companyName}`);

    // Fetch metrics (ROE, margins, D/E, P/E, etc.) via Yahoo metrics
    let indiaMetrics: any = null;
    try {
        indiaMetrics = await scrapers.getHistoricalStatsIndia(ticker, 'ratios');
    } catch (e) {
        console.error(`[FETCH] Could not fetch India metrics, using fallback: ${e}`);
    }

    const [financials, historicalPrices, news, cashFlow, fullAnalysis] = await Promise.all([
        Promise.all([
            scrapers.getFinancialStatementsIndia(ticker, 'quarter_results'),
            scrapers.getFinancialStatementsIndia(ticker, 'yoy_results'),
            scrapers.getFinancialStatementsIndia(ticker, 'balancesheet')
        ]).then(([quarter, annual, balanceSheet]: any) => ({ quarter, annual, balanceSheet })),
        scrapers.getHistoricalPricesIndia(ticker),
        scrapers.getNewsIndia(ticker),
        scrapers.getCashFlowIndia(ticker, 'annual', 5),
        scrapers.getFullAnalysisIndia(ticker),
    ]);

    const [corporateActions, targets, announcements, sustainability] = await Promise.all([
        scrapers.getCorporateActionsIndia(ticker),
        scrapers.getStockTargetPriceIndia(ticker),
        scrapers.getRecentAnnouncementsIndia(ticker),
        scrapers.getSustainabilityIndia(ticker),
    ]);

    // --- Extract metrics for scoring (from Yahoo metrics or fallback) ---
    const roe = indiaMetrics?.roe || 0;
    const netMargin = indiaMetrics?.netProfitMargin || 0;
    const revenueGrowth = indiaMetrics?.revenueGrowth || 0;
    const debtToEquity = (indiaMetrics?.debtToEquity || 0) / 100;
    const peRatio = indiaMetrics?.pe || profile?.trailingPE || null;
    const evToEbitda = indiaMetrics?.enterpriseToEbitda || null;

    // FCF yield
    let fcfYield: number | null = null;
    const mktCap = profile?.mktCap;
    if (indiaMetrics?.freeCashFlow && mktCap && mktCap > 0) {
        fcfYield = indiaMetrics.freeCashFlow / mktCap;
    }

    // SMA200 and 3-month return
    const sma200 = computeSma200(historicalPrices);
    const threeMonthReturn = computeThreeMonthReturn(historicalPrices);

    // Volume ratio
    const volumeRatio = (profile?.volume && profile?.averageVolume && profile.averageVolume > 0)
        ? profile.volume / profile.averageVolume
        : null;

    console.error(`[FETCH] India metrics: ROE=${roe}, Margin=${netMargin}, Growth=${revenueGrowth}, D/E=${debtToEquity}`);

    const deterministicScore = scoring.calculateDeterministicScore({
        roe,
        netMargin,
        revenueGrowth,
        debtToEquity,
        interestCoverage: undefined,
        peRatio,
        evToEbitda,
        fcfYield,
        currentPrice: profile?.price || 0,
        sma200,
        threeMonthReturn,
        sectorThreeMonthReturn: null,
        volumeRatio,
        sector: profile?.sector || null,
        marketCap: mktCap || null,
        market: 'INDIA'
    });

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const output = {
        ticker,
        market: 'INDIA',
        fetchedAt: new Date().toISOString(),
        today,
        profile,
        metrics: indiaMetrics,
        financials,
        historicalPrices,
        news: (news || []).map((n: any) => ({ headline: n.title, source: n.source, date: n.date, url: n.url })),
        corporateActions,
        targets,
        announcements,
        cashFlow,
        fullAnalysis,
        sustainability,
        deterministicScore
    };

    realStdoutWrite(JSON.stringify(output, null, 2));
    console.error(`[FETCH] Done. Output ${JSON.stringify(output).length} bytes.`);
}

main().catch(err => {
    console.error('[FETCH] Fatal error:', err);
    process.exit(1);
});
