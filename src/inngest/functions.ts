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
import { generateStructuredAnalysis } from "@/lib/gemini";

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
            console.log(`Fetching SEC data for ${ticker} (CIK: ${data.profile.cik})...`);
            const [sec, profile] = await Promise.all([
                getSECSubmissions(data.profile.cik),
                getSECProfile(ticker)
            ]);
            return {
                submissions: sec && 'recent' in sec ? sec : null,
                profile
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
        const aiAnalysis = await step.run("generate-ai-insights", async () => {
            console.log(`Generating Gemini insights for ${ticker}...`);

            const prompt = `
        Analyze the following financial, regulatory, and news data for ${ticker} and act as a "Technical Copilot" for a retail investor.
        
        CURRENT DATE: ${today}

        CRITICAL INSTRUCTIONS:
        1. SEC SYNTHESIS: You MUST synthesize the last 5 filings provided. Do not just look at the most recent one.
        2. QUARTERLY ANALYSIS: Analyze the last 5 quarterly income statements. Look for acceleration or deceleration in revenue, margin trends, and expense control.
        3. ANNUAL TRENDS: Summarize the 5-year trajectory of the P&L and Balance Sheet.
        4. MARKET PULSE: Provide a highly specific analysis of the news headlines.
        5. SECTOR INTELLIGENCE: 
           - Compare the stock's performance to its sector: ${data.profile.sector}.
           - Analyze sector seasonality (e.g., is this sector historically strong or weak this time of year?). Use ${today} to determine the current season.
           - Identify sector rotation signals (is capital moving into or out of ${data.profile.sector}?).
        
        6. OPINIONATED ANALYSIS: Do not be overly cautious. Act like a hedge fund analyst. If a metric is strong compared to peers or history, mark it "positive". If it's a risk, mark it "negative". Avoid "neutral" unless it's truly unremarkable.
        7. SCORE INTEGRITY: Do not default to 0 for sector subscores. If the stock is in a trending sector or showing relative strength in the sectorData snapshots, provide a representative score (0-100).
        
        DATA:
        Profile: ${JSON.stringify(data.profile)}
        Quote (Real-time): ${JSON.stringify(data.quote)}
        Sector Data: ${JSON.stringify(sectorData)}
        Analyst Recommendations: ${JSON.stringify(sectorData.analystRecs)}
        Technical Indicators: SMA50=${JSON.stringify(sectorData.sma50)}, SMA200=${JSON.stringify(sectorData.sma200)}
        Key Metrics (FMP): ${JSON.stringify(data.metrics)}
        Ratios (FMP): ${JSON.stringify(data.ratios)}
        Basic Financials (Finnhub Fallback): ${JSON.stringify(data.finnhubMetrics)}
        Annual Income (5yr): ${JSON.stringify(data.annualIncome)}
        Annual Balance Sheet (5yr): ${JSON.stringify(data.annualBalance)}
        Quarterly Income (Last 5): ${JSON.stringify(data.quarterlyIncome)}
        Quarterly Balance Sheet (Last 5): ${JSON.stringify(data.quarterlyBalance)}
        SEC Profile (FMP): ${JSON.stringify(secData.profile)}
        SEC Filings (Recent): ${secData.submissions ? JSON.stringify({
                recent_forms: (secData.submissions as any).recent.form.slice(0, 8),
                recent_dates: (secData.submissions as any).recent.filingDate.slice(0, 8),
                recent_descriptions: (secData.submissions as any).recent.primaryDocDescription.slice(0, 8)
            }) : "No SEC filing data available"}
        News Headlines: ${JSON.stringify((newsData || []).slice(0, 10).map((n: any) => ({ headline: n.headline, source: n.source })))}
        
        Output as JSON with:
        - executive_summary: A 2-3 sentence overview of company current health.
        - layman_analogy: A creative analogy for their business model.
        - sec_analysis: A 2-sentence synthesis of filings.
        - quarterly_analysis: A 3-sentence deep dive into the last 5 quarters of performance.
        - annual_trends: A 3-sentence summary of the 5-year financial trajectory.
        - sector_analysis: A 3-sentence analysis of performance vs sector, seasonality, and rotation. (CRITICAL: Do not put this in the metrics array).
        - sentiment_summary: A 2-sentence synthesis of headlines.
        - sentiment_score: 0-100
        - score_breakdown: { financial_score, sec_score, sentiment_score, trend_score, sector_score }
        - financial_subscores: { profitability, growth, solvency }
        - trend_subscores: { 
            quarterly_momentum: 0-100, 
            annual_stability: 0-100 
          }
        - sector_subscores: {
            outperformance: 0-100 (vs sector),
            seasonality_strength: 0-100,
            rotation_inflow: 0-100
          }
        - financial_formula: A short string explaining the weighted score formula.
        - financial_score_drivers: Array of objects { label, impact: 'positive'|'negative' }.
        - prometheus_score: (0.3 * financial_score) + (0.2 * sec_score) + (0.15 * sentiment_score) + (0.15 * trend_score) + (0.2 * sector_score)
        - score_criteria: A short explanation of why the company got this score.
        - metrics: An array of 25-30 objects { "label": string, "value": string, "status": "positive"|"neutral"|"negative", "shortExplanation": string, "technicalDefinition": string }. 
          REQUIRED METRICS (Exhaustive List): 
          1. Current Price, 2. Market Cap, 3. 52-Week High, 4. 52-Week Low, 5. Revenue (TTM & Recent Fiscal), 6. Net Income (TTM & Recent Fiscal), 7. EPS (TTM & Recent Fiscal), 8. Forecasted Revenue (FY25/Next), 9. Forecasted Net Income (FY25/Next), 10. P/E Ratio (TTM), 11. Price to Sales (TTM), 12. Price to Book, 13. Dividend Yield, 14. Return on Equity (ROE) & ROI, 15. Revenue Growth (TTM & 5-Year CAGR), 16. Current Ratio, 17. Quick Ratio, 18. Debt to Equity, 19. LT Debt to Equity, 20. Interest Coverage Ratio, 21. Cash & Short Term Investments, 22. Operating Profit Margin, 23. Net Profit Margin, 24. FII/Institutional Shareholding, 25. Mutual Fund Shareholding, 26. 50-Day Moving Average, 27. 200-Day Moving Average, 28. Latest Quarterly Revenue, 29. Latest Quarterly Net Profit, 30. Latest Quarterly EPS, 31. Analyst Rating, 32. Price Performance (52-Week), 33. Risk Category.
          DO NOT put sector analysis here. Be opinionated with the status based on performance vs history and peers.
        - bull_case: array of strings
        - bear_case: array of strings

        IMPORTANT: Ensure all string values are valid JSON (escape double quotes if they appear inside the analysis).
        Return ONLY valid JSON.
        `;

            return await generateStructuredAnalysis(prompt);
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
            const { error: insightError } = await supabase.from('ai_insights').insert({
                symbol: ticker,
                summary_text: aiAnalysis.executive_summary,
                bull_case: aiAnalysis.bull_case,
                bear_case: aiAnalysis.bear_case,
                metrics: aiAnalysis.metrics,
                model_version: 'gemini-2.5-flash-lite',
                market: 'US',
                metadata: {
                    cik: data.profile.cik,
                    price: data.quote?.price || data.profile.price,
                    changes: data.quote?.change || data.profile.changes,
                    changesPercentage: data.quote?.changesPercentage || data.profile.changesPercentage,
                    marketCap: data.quote?.marketCap,
                    analogy: aiAnalysis.layman_analogy,
                    sec_analysis: aiAnalysis.sec_analysis,
                    quarterly_analysis: aiAnalysis.quarterly_analysis,
                    annual_trends: aiAnalysis.annual_trends,
                    sector_analysis: aiAnalysis.sector_analysis,
                    sentiment_summary: aiAnalysis.sentiment_summary,
                    sentiment_score: aiAnalysis.sentiment_score || 50,
                    prometheus_score: aiAnalysis.prometheus_score || 0,
                    score_breakdown: aiAnalysis.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0, trend_score: 0, sector_score: 0 },
                    financial_subscores: aiAnalysis.financial_subscores || { profitability: 0, growth: 0, solvency: 0 },
                    trend_subscores: aiAnalysis.trend_subscores || { quarterly_momentum: 0, annual_stability: 0 },
                    sector_subscores: aiAnalysis.sector_subscores || { outperformance: 0, seasonality_strength: 0, rotation_inflow: 0 },
                    financial_formula: aiAnalysis.financial_formula || "Weighted aggregate of core fundamentals, regulatory risk, market sentiment, momentum, and sector intelligence",
                    financial_score_drivers: aiAnalysis.financial_score_drivers || [],
                    score_criteria: aiAnalysis.score_criteria || "Score pending analysis depth.",
                    last_sec_filing: (secData.submissions as any)?.recent?.form?.[0] || 'N/A',
                    top_headlines: (newsData || []).slice(0, 3).map((n: any) => ({
                        headline: n.headline,
                        url: n.url,
                        source: n.source,
                        datetime: n.datetime
                    })),
                    raw_research_dump: {
                        cash_flow: sectorData.cashFlow,
                        sustainability: sectorData.sustainability,
                        full_analysis: sectorData.fullAnalysis,
                        extended_profile: data.profile,
                        extended_metrics: data.metrics
                    }
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

