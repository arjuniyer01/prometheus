import { inngest } from "./client";
import { supabase } from "@/lib/supabase";
import {
    getKeyMetrics,
    getFinancialRatios,
    getCompanyProfile,
    getSECSubmissions,
    getNews,
    getHistoricalPrices,
    getFinnhubFinancials,
    getIncomeStatement,
    getBalanceSheet,
    getQuote,
    getSectorPerformance,
    getHistoricalSectorPerformance,
    getSECProfile,
    getAnalystRecommendations,
    getTechnicalSMA,
    fetchFMP,
    getCashFlow,
    getFullAnalysis,
    getSustainability
} from "@/lib/scrapers";
// Gemini removed — Claude Code is now the AI engine via /analyze skill
import { getAnalysisVersion } from "@/lib/git-utils";
import { calculateDeterministicScore } from "@/lib/scoring-engine";

export const analyzeTicker = inngest.createFunction(
    { id: "analyze-ticker", name: "Analyze Ticker Full Workflow" },
    { event: "app/analyze.requested" },
    async ({ event, step }) => {
        const { ticker } = event.data;
        console.log(`Starting analysis for ticker: ${ticker}`);

        await step.run("clear-old-data", async () => {
            console.log(`Clearing old analysis data for ${ticker}...`);
            // Initialize sync status
            await supabase.from('tickers').upsert({
                symbol: ticker,
                sync_status: 'FETCHING',
                sync_percent: 5,
                market: 'US'
            }, { onConflict: 'symbol' });

            // Delete old insights, financials, and price history to ensure fresh scan
            await Promise.all([
                supabase.from('ai_insights').delete().eq('symbol', ticker).eq('market', 'US'),
                supabase.from('financials').delete().eq('symbol', ticker),
                supabase.from('market_data').delete().eq('symbol', ticker)
            ]);
        });

        const data = await step.run("fetch-financial-data", async () => {
            console.log(`Fetching FMP data for ${ticker}...`);
            const [
                profile,
                quote,
                metrics,
                ratios,
                historicalPrices,
                annualIncome,
                annualBalance,
                quarterlyIncome,
                quarterlyBalance
            ] = await Promise.all([
                getCompanyProfile(ticker),
                getQuote(ticker),
                getKeyMetrics(ticker),
                getFinancialRatios(ticker),
                getHistoricalPrices(ticker),
                getIncomeStatement(ticker, 'annual', 5),
                getBalanceSheet(ticker, 'annual', 5),
                getIncomeStatement(ticker, 'quarter', 5),
                getBalanceSheet(ticker, 'quarter', 5)
            ]);

            if (!profile) throw new Error(`Could not find profile for ticker ${ticker}`);

            // Fallback to Finnhub if key data is missing
            let finnhubMetrics = null;
            if (!metrics || !ratios) {
                console.log(`FMP metrics missing for ${ticker}, fetching Finnhub fallback...`);
                finnhubMetrics = await getFinnhubFinancials(ticker);
            }

            return {
                profile,
                quote,
                metrics,
                ratios,
                historicalPrices,
                finnhubMetrics,
                annualIncome,
                annualBalance,
                quarterlyIncome,
                quarterlyBalance
            };
        }) as any;

        await step.run("update-status-sec", async () => {
            await supabase.from('tickers').update({ sync_status: 'FETCHING', sync_percent: 30 }).eq('symbol', ticker);
        });

        const secData = await step.run("fetch-sec-data", async () => {
            console.log(`Fetching SEC data for ${ticker} via Yahoo...`);
            const filings = await getSECSubmissions(ticker);
            return {
                submissions: filings && filings.length > 0 ? filings : null,
                profile: null
            };
        });

        const newsData = await step.run("fetch-news", async () => {
            console.log(`Fetching News for ${ticker}...`);
            return await getNews(ticker);
        });

        const sectorData = await step.run("fetch-sector-performance", async () => {
            console.log(`Fetching Sector Performance for ${ticker}...`);
            const [current, historical, sectorETFHistory, analystRecs, sma50, sma200, cashFlow, sustainability, fullAnalysis] = await Promise.all([
                getSectorPerformance(),
                getHistoricalSectorPerformance(90),
                getSectorETFHistory(data.profile.sector),
                getAnalystRecommendations(ticker),
                getTechnicalSMA(ticker, 50),
                getTechnicalSMA(ticker, 200),
                getCashFlow(ticker, 'annual', 5),
                getSustainability(ticker),
                getFullAnalysis(ticker)
            ]);
            return { current, historical, sectorETFHistory, analystRecs, sma50, sma200, cashFlow, sustainability, fullAnalysis };
        });

        await step.run("update-status-analyzing", async () => {
            await supabase.from('tickers').update({ sync_status: 'ANALYZING', sync_percent: 60 }).eq('symbol', ticker);
        });

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // --- PRE-CALCULATE DETERMINISTIC SCORES ---
        let lastQuartersRevGrowth = 0;
        if (data.quarterlyIncome && data.quarterlyIncome.length >= 5) {
            try {
                lastQuartersRevGrowth = ((data.quarterlyIncome[0].revenue - data.quarterlyIncome[4].revenue) / data.quarterlyIncome[4].revenue);
            } catch (e) {
                lastQuartersRevGrowth = 0;
            }
        }

        // Fallback to metrics if manual calc fails (Yahoo often missing quarterly data now)
        if (!lastQuartersRevGrowth && data.metrics?.revenueGrowth) {
            lastQuartersRevGrowth = data.metrics.revenueGrowth;
        }

        const computedSma200 = (data.historicalPrices && data.historicalPrices.length >= 200)
            ? (data.historicalPrices.slice(0, 200).reduce((acc: number, val: any) => acc + val.close, 0) / 200)
            : 0;

        const deterministicScore = calculateDeterministicScore({
            roe: data.ratios?.roe || 0,
            netMargin: data.ratios?.netProfitMargin || 0,
            revenueGrowth: lastQuartersRevGrowth,
            debtToEquity: (data.ratios?.debtToEquity || 0) / 100, // Yahoo uses % (e.g. 150), we scrore on ratio (1.5)
            interestCoverage: data.ratios?.interestCoverage,
            currentPrice: data.quote?.price || 0,
            sma200: computedSma200,
            momentumAnalysis: {
                isOutperformingSector: (data.quote?.changesPercentage || 0) > (Array.isArray(sectorData.current) ? 0 : (sectorData.current as any)?.changesPercentage || 0),
                volumeBreakout: (data.quote?.volume || 0) > (data.quote?.avgVolume || 0)
            },
            market: 'US'
        });

        // AI analysis is now generated by Claude Code via /analyze skill.
        // This Inngest function is deprecated — kept for reference only.
        const aiAnalysis: any = await step.run("generate-ai-insights", async () => {
            throw new Error("Gemini removed. Use Claude Code /analyze skill instead.");
        });

        await step.run("update-status-persisting", async () => {
            await supabase.from('tickers').update({ sync_status: 'PERSISTING', sync_percent: 85 }).eq('symbol', ticker);
        });

        await step.run("persist-to-db", async () => {
            console.log(`Persisting results for ${ticker} to Supabase...`);
            // First ensure ticker exists
            const { error: tickerError } = await supabase.from('tickers').upsert({
                symbol: ticker,
                company_name: data.profile.companyName,
                sector: data.profile.sector,
                industry: data.profile.industry,
                market_cap: data.profile.mktCap,
                exchange: data.profile.exchange,
                market: 'US',
                sync_status: 'PERSISTING',
                sync_percent: 85
            });

            if (tickerError) throw tickerError;

            // Persist Historical Prices
            if (data.historicalPrices && data.historicalPrices.length > 0) {
                const priceRecords = data.historicalPrices.map((p: any) => ({
                    symbol: ticker,
                    timestamp: new Date(p.date || p.timestamp).toISOString(),
                    open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume
                }));
                const { error: priceError } = await supabase.from('market_data').upsert(priceRecords, { onConflict: 'symbol,timestamp' });
                if (priceError) console.error("Error persisting prices:", priceError);
            }

            // Persist Financial Statements (Annual & Quarterly)
            const statements = [
                ...(data.annualIncome || []).map((s: any) => ({ ...s, type: '10-K' })),
                ...(data.quarterlyIncome || []).map((s: any) => ({ ...s, type: '10-Q' })),
            ];

            if (statements.length > 0) {
                const financialRecords = statements.map((s: any) => {
                    const balanceSheet = s.type === '10-K'
                        ? [...(data.annualBalance || [])].find(b => b.date === s.date) || {}
                        : [...(data.quarterlyBalance || [])].find(b => b.date === s.date) || {};

                    // Normalize balance sheet keys for UI consistency
                    const normalizedBS = { ...balanceSheet };
                    if (normalizedBS.totalLiabilities && !normalizedBS.totalTotalLiabilities) {
                        normalizedBS.totalTotalLiabilities = normalizedBS.totalLiabilities;
                    }

                    return {
                        symbol: ticker,
                        period: s.date,
                        report_type: s.type,
                        income_statement: s,
                        balance_sheet: normalizedBS
                    };
                });

                const { error: finError } = await supabase.from('financials').upsert(financialRecords, { onConflict: 'symbol,period,report_type' });
                if (finError) console.error("Error persisting financials:", finError);
            }

            // Insert AI Insights
            const scores = {
                financial_score: deterministicScore.components.financial,
                trend_score: deterministicScore.components.technical,
                sec_score: 0,
                sentiment_score: 0,
                sector_score: 0,
                institutional_score: 0,
                ...aiAnalysis.score_breakdown
            };

            const finalScore = Math.round(
                ((scores.financial_score || 0) * 0.40) +
                ((scores.trend_score || 0) * 0.20) +
                ((scores.sec_score || 0) * 0.10) +
                ((scores.sentiment_score || 0) * 0.10) +
                ((scores.sector_score || 0) * 0.10) +
                ((scores.institutional_score || 0) * 0.10)
            );

            const { error: insightError } = await supabase.from('ai_insights').insert({
                symbol: ticker,
                summary_text: aiAnalysis.executive_summary,
                bull_case: aiAnalysis.bull_case,
                bear_case: aiAnalysis.bear_case,
                metrics: aiAnalysis.metrics,
                model_version: 'gemini-2.5-flash-lite',
                market: 'US',
                metadata: {
                    currency: data.quote?.currency || 'USD',
                    cik: sectorData.fullAnalysis?.cik || data.profile.cik,
                    price: data.quote?.price || data.profile.price,
                    changes: data.quote?.change || data.profile.changes,
                    changesPercentage: data.quote?.changesPercentage || data.profile.changesPercentage,
                    marketCap: data.quote?.marketCap,
                    analogy: aiAnalysis.layman_analogy,
                    sec_analysis: aiAnalysis.sec_analysis,
                    quarterly_analysis: aiAnalysis.quarterly_analysis,
                    annual_trends: aiAnalysis.annual_trends,
                    sector_analysis: aiAnalysis.sector_analysis,
                    institutional_analysis: aiAnalysis.institutional_analysis,
                    sentiment_summary: aiAnalysis.sentiment_summary,
                    sentiment_score: aiAnalysis.sentiment_score || 50,
                    prometheus_score: finalScore,
                    score_breakdown: scores,
                    financial_subscores: aiAnalysis.financial_subscores || { profitability: deterministicScore.breakdown.profitability, growth: deterministicScore.breakdown.growth, solvency: deterministicScore.breakdown.solvency },
                    trend_subscores: aiAnalysis.trend_subscores || { quarterly_momentum: deterministicScore.breakdown.trend, annual_stability: 0 },
                    sector_subscores: aiAnalysis.sector_subscores || { outperformance: 0, seasonality_strength: 0, rotation_inflow: 0 },
                    institutional_subscores: aiAnalysis.institutional_subscores || { analyst_conviction: 0, insider_signal: 0, earnings_reliability: 0 },
                    financial_formula: aiAnalysis.financial_formula || "Weighted aggregate of core fundamentals, regulatory risk, market sentiment, momentum, and sector intelligence",
                    financial_score_drivers: aiAnalysis.financial_score_drivers || [],
                    score_criteria: aiAnalysis.score_criteria || "Score pending analysis depth.",
                    intrinsic_value: aiAnalysis.intrinsic_value || 0,
                    valuation_analysis: aiAnalysis.valuation_analysis || "Valuation pending deep fundamental scan.",
                    last_sec_filing: (secData.submissions as any)?.[0]
                        ? `${(secData.submissions as any)[0].type} (${(secData.submissions as any)[0].date})`
                        : 'N/A',
                    top_headlines: (newsData || []).map((n: any) => ({
                        headline: n.title || n.headline,
                        url: n.url,
                        source: n.source,
                        date: n.date || n.datetime
                    })),
                    raw_research_dump: {
                        cash_flow: sectorData.cashFlow,
                        sustainability: sectorData.sustainability,
                        full_analysis: sectorData.fullAnalysis,
                        extended_profile: data.profile,
                        extended_metrics: data.metrics
                    },
                    analysis_version: getAnalysisVersion()
                }
            });

            if (insightError) throw insightError;

            // Mark as complete
            await supabase.from('tickers').update({ sync_status: 'IDLE', sync_percent: 100 }).eq('symbol', ticker);
        });

        console.log(`Analysis complete for ${ticker}`);
        return { success: true, ticker };
    }
);


async function getSectorETFHistory(sector: string) {
    const mapping: Record<string, string> = {
        'Technology': 'XLK',
        'Financial Services': 'XLF',
        'Healthcare': 'XLV',
        'Consumer Cyclical': 'XLY',
        'Communication Services': 'XLC',
        'Industrials': 'XLI',
        'Consumer Defensive': 'XLP',
        'Energy': 'XLE',
        'Utilities': 'XLU',
        'Real Estate': 'XLRE',
        'Basic Materials': 'XLB'
    };
    const etf = mapping[sector];
    if (!etf) return null;
    try {
        // Fetch 2 years of history for seasonality analysis
        const data = await fetchFMP(`historical-price-eod/full`, { symbol: etf });
        return data?.slice(0, 500) || null;
    } catch (e) {
        return null;
    }
}

export * from "./functions-india";

