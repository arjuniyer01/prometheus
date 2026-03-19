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

import { resolve } from 'path';

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

    // Calculate deterministic score
    let lastQuartersRevGrowth = 0;
    if (quarterlyIncome && quarterlyIncome.length >= 5) {
        try {
            lastQuartersRevGrowth = ((quarterlyIncome[0].revenue - quarterlyIncome[4].revenue) / quarterlyIncome[4].revenue);
        } catch { lastQuartersRevGrowth = 0; }
    }
    if (!lastQuartersRevGrowth && metrics?.revenueGrowth) {
        lastQuartersRevGrowth = metrics.revenueGrowth;
    }

    const computedSma200 = (historicalPrices && historicalPrices.length >= 200)
        ? (historicalPrices.slice(0, 200).reduce((acc: number, val: any) => acc + val.close, 0) / 200)
        : 0;

    const deterministicScore = scoring.calculateDeterministicScore({
        roe: metrics?.roe || 0,
        netMargin: metrics?.netProfitMargin || 0,
        revenueGrowth: lastQuartersRevGrowth,
        debtToEquity: (metrics?.debtToEquity || 0) / 100,
        interestCoverage: undefined,
        currentPrice: quote?.price || 0,
        sma200: computedSma200,
        momentumAnalysis: {
            isOutperformingSector: (quote?.changesPercentage || 0) > 0,
            volumeBreakout: (quote?.volume || 0) > (quote?.avgVolume || 0)
        },
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

    // Deterministic score
    const deterministicScore = scoring.calculateDeterministicScore({
        roe: 0,
        netMargin: 0,
        revenueGrowth: 0,
        debtToEquity: 0,
        currentPrice: profile?.price || 0,
        sma200: (historicalPrices && historicalPrices.length > 200)
            ? (historicalPrices.slice(0, 200).reduce((acc: number, val: any) => acc + val.close, 0) / 200)
            : 0,
        momentumAnalysis: {
            isOutperformingSector: (profile?.changesPercentage || 0) > 0,
            volumeBreakout: (profile?.volume || 0) > (profile?.averageVolume || 0)
        },
        market: 'INDIA'
    });

    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const output = {
        ticker,
        market: 'INDIA',
        fetchedAt: new Date().toISOString(),
        today,
        profile,
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
