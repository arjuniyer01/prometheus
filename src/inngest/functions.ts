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
    getQuote
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
            await supabase.from('tickers').update({ sync_status: 'FETCHING', sync_percent: 5 }).eq('symbol', ticker);
            const { error } = await supabase.from('ai_insights').delete().eq('symbol', ticker).eq('market', 'US');
            if (error) throw error;
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
            const sec = await getSECSubmissions(data.profile.cik);
            return sec && 'recent' in sec ? sec : null;
        });

        const newsData = await step.run("fetch-news", async () => {
            console.log(`Fetching News for ${ticker}...`);
            return await getNews(ticker);
        });

        await step.run("update-status-analyzing", async () => {
            await supabase.from('tickers').update({ sync_status: 'ANALYZING', sync_percent: 60 }).eq('symbol', ticker);
        });

        const aiAnalysis = await step.run("generate-ai-insights", async () => {
            console.log(`Generating Gemini insights for ${ticker}...`);
            const hasSEC = secData && typeof secData === 'object' && 'recent' in secData;
            const sec = secData as any;

            const prompt = `
        Analyze the following financial, regulatory, and news data for ${ticker} and act as a "Technical Copilot" for a retail investor.
        
        CRITICAL INSTRUCTIONS:
        1. SEC SYNTHESIS: You MUST synthesize the last 5 filings provided. Do not just look at the most recent one.
        2. QUARTERLY ANALYSIS: Analyze the last 5 quarterly income statements. Look for acceleration or deceleration in revenue, margin trends, and expense control.
        3. ANNUAL TRENDS: Summarize the 5-year trajectory of the P&L and Balance Sheet.
        4. MARKET PULSE: Provide a highly specific analysis of the news headlines.
        
        DATA:
        Profile: ${JSON.stringify(data.profile)}
        Quote (Real-time): ${JSON.stringify(data.quote)}
        Key Metrics (FMP): ${JSON.stringify(data.metrics)}
        Ratios (FMP): ${JSON.stringify(data.ratios)}
        Basic Financials (Finnhub Fallback): ${JSON.stringify(data.finnhubMetrics)}
        Annual Income (5yr): ${JSON.stringify(data.annualIncome)}
        Annual Balance Sheet (5yr): ${JSON.stringify(data.annualBalance)}
        Quarterly Income (Last 5): ${JSON.stringify(data.quarterlyIncome)}
        Quarterly Balance Sheet (Last 5): ${JSON.stringify(data.quarterlyBalance)}
        SEC Filings: ${hasSEC ? JSON.stringify({
                recent_forms: sec.recent.form.slice(0, 8),
                recent_dates: sec.recent.filingDate.slice(0, 8),
                recent_descriptions: sec.recent.primaryDocDescription.slice(0, 8)
            }) : "No SEC data available"}
        News Headlines: ${JSON.stringify((newsData || []).slice(0, 10).map((n: any) => ({ headline: n.headline, source: n.source })))}
        
        Output as JSON with:
        - executive_summary: A 2-3 sentence overview of company current health.
        - layman_analogy: A creative analogy for their business model.
        - sec_analysis: A 2-sentence synthesis of filings.
        - quarterly_analysis: A 3-sentence deep dive into the last 5 quarters of performance.
        - annual_trends: A 3-sentence summary of the 5-year financial trajectory.
        - sentiment_summary: A 2-sentence synthesis of headlines.
        - sentiment_score: 0-100
        - score_breakdown: { financial_score, sec_score, sentiment_score, trend_score }
        - financial_subscores: { profitability, growth, solvency }
        - trend_subscores: { 
            quarterly_momentum: 0-100 (based on revenue/margin acceleration in last 5 quarters), 
            annual_stability: 0-100 (based on 5-year consistency and balance sheet health) 
          }
        - financial_formula: string
        - financial_score_drivers: Array of top 5 specific metrics (e.g., "High Operating Margin") driving the score. 
          { label: string, impact: "positive" | "negative", weight: "high" | "low" }
        - prometheus_score: (0.35 * financial_score) + (0.25 * sec_score) + (0.2 * sentiment_score) + (0.2 * trend_score)
        - score_criteria: explanation of how trends influenced the final score.
        - metrics: array of 15-20 key financial metrics covering ALL major categories:
             1. Valuation (EPS, P/E, PEG, Price/Book, Price/Sales, EV/EBITDA)
             2. Profitability (Gross Margin, Operating Margin, Net Margin, ROE, ROA)
             3. Financial Strength (Current Ratio, Quick Ratio, Debt/Equity, Interest Coverage)
             4. Efficiency (Asset Turnover, Inventory Turnover)
             5. Growth (Revenue Growth, EPS Growth)
          Ensure you pick the most relevant ones.
          { 
            label: string, 
            value: string, 
            status: "positive" | "negative" | "neutral", 
            shortExplanation: "A 1-sentence explanation of why this value is good/bad for this specific company", 
            technicalDefinition: "A simple but accurate technical definition of the metric"
          }
        - bull_case: array of strings
        - bear_case: array of strings
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
                market: 'US'
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
                const financialRecords = statements.map((s: any) => ({
                    symbol: ticker,
                    period: s.date,
                    report_type: s.type,
                    income_statement: s,
                    balance_sheet: [...(data.annualBalance || [])].find(b => b.date === s.date) || {}
                }));

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
                    sentiment_summary: aiAnalysis.sentiment_summary,
                    sentiment_score: aiAnalysis.sentiment_score || 50,
                    prometheus_score: aiAnalysis.prometheus_score || 0,
                    score_breakdown: aiAnalysis.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0, trend_score: 0 },
                    financial_subscores: aiAnalysis.financial_subscores || { profitability: 0, growth: 0, solvency: 0 },
                    trend_subscores: aiAnalysis.trend_subscores || { quarterly_momentum: 0, annual_stability: 0 },
                    financial_formula: aiAnalysis.financial_formula || "Aggregated from weighted metrics",
                    financial_score_drivers: aiAnalysis.financial_score_drivers || [],
                    score_criteria: aiAnalysis.score_criteria || "Score pending analysis depth.",
                    last_sec_filing: (secData as any)?.recent?.form?.[0] || 'N/A',
                    top_headlines: (newsData || []).slice(0, 3).map((n: any) => ({
                        headline: n.headline,
                        url: n.url,
                        source: n.source,
                        datetime: n.datetime
                    }))
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


export * from "./functions-india";

