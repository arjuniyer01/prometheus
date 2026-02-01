import {
    getYahooHistoricalPrices,
    getYahooQuote,
    getYahooProfile,
    getYahooIncomeStatement,
    getYahooBalanceSheet,
    getYahooCashFlow,
    getYahooMetrics,
    getYahooNews,
    getYahooAnalysis,
    getYahooRecommendations
} from '../src/lib/yahoo-finance';

const symbols = ["AAPL", "RELIANCE.NS"];

async function runTest() {
    console.log("\x1b[36m%s\x1b[0m", "🚀 PROMETHEUS YAHOO FINANCE INTEGRATION TEST");
    console.log("\x1b[90m%s\x1b[0m", "Testing expanded endpoints for institutional-grade data ingestion.\n");

    for (const symbol of symbols) {
        console.log("\x1b[35m%s\x1b[0m", `\n--- TESTING SYMBOL: ${symbol} ---`);

        try {
            // 1. PRICE & QUOTE
            const [quote, prices] = await Promise.all([
                getYahooQuote(symbol),
                getYahooHistoricalPrices(symbol)
            ]);
            console.log(`✅ Quote: ${quote ? `Price: ${quote.price} | Change: ${quote.changesPercentage}%` : "FAILED"}`);
            console.log(`✅ Historical: ${prices.length > 0 ? `${prices.length} points fetched` : "FAILED"}`);

            // 2. PROFILE & METRICS
            const [profile, metrics] = await Promise.all([
                getYahooProfile(symbol),
                getYahooMetrics(symbol)
            ]);
            console.log(`✅ Profile: ${profile?.companyName || "FAILED"} (${profile?.sector || "N/A"})`);
            console.log(`✅ Metrics: ${metrics ? `PE: ${metrics.pe || 'N/A'} | Debt/Eq: ${metrics.debtToEquity || 'N/A'}` : "FAILED"}`);

            // 3. FINANCIALS
            const [inc, bal, cf] = await Promise.all([
                getYahooIncomeStatement(symbol),
                getYahooBalanceSheet(symbol),
                getYahooCashFlow(symbol)
            ]);
            console.log(`✅ Income Statement: ${inc.length > 0 ? `${inc.length} periods` : "FAILED"}`);
            console.log(`✅ Balance Sheet: ${bal.length > 0 ? `${bal.length} periods` : "FAILED"}`);
            console.log(`✅ Cash Flow: ${cf.length > 0 ? `${cf.length} periods` : "FAILED"}`);

            // 4. ANALYSIS & RECS
            const [analysis, recs, news] = await Promise.all([
                getYahooAnalysis(symbol),
                getYahooRecommendations(symbol),
                getYahooNews(symbol)
            ]);
            console.log(`✅ Analysis: Trends: ${analysis?.recommendationTrend?.length || 0} | Insiders: ${analysis?.insiders?.length || 0}`);
            console.log(`✅ Analyst Recs: ${recs.length > 0 ? `${recs.length} forecast rows` : "FAILED"}`);
            console.log(`✅ News Headlines: ${news.length > 0 ? `${news.length} articles` : "FAILED"}`);

        } catch (error: any) {
            console.error(`\x1b[31m❌ TEST FAILED FOR ${symbol}:\x1b[0m`, error.message);
        }
    }

    console.log("\x1b[32m%s\x1b[0m", "\n✨ Integration tests complete.");
}

runTest();
