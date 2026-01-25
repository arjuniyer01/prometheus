import { inngest } from "./client";
import { supabase } from "@/lib/supabase";
import { getKeyMetrics, getFinancialRatios, getCompanyProfile, getSECSubmissions, getNews, getHistoricalPrices } from "@/lib/scrapers";
import { generateStructuredAnalysis } from "@/lib/gemini";

export const analyzeTicker = inngest.createFunction(
    { id: "analyze-ticker", name: "Analyze Ticker Full Workflow" },
    { event: "app/analyze.requested" },
    async ({ event, step }) => {
        const { ticker } = event.data;
        console.log(`Starting analysis for ticker: ${ticker}`);

        await step.run("clear-old-data", async () => {
            console.log(`Clearing old analysis data for ${ticker}...`);
            const { error } = await supabase.from('ai_insights').delete().eq('symbol', ticker);
            if (error) throw error;
        });

        const data = await step.run("fetch-financial-data", async () => {
            console.log(`Fetching FMP data for ${ticker}...`);
            const [profile, metrics, ratios, historicalPrices] = await Promise.all([
                getCompanyProfile(ticker),
                getKeyMetrics(ticker),
                getFinancialRatios(ticker),
                getHistoricalPrices(ticker),
            ]);

            if (!profile) throw new Error(`Could not find profile for ticker ${ticker}`);

            return { profile, metrics, ratios, historicalPrices };
        }) as any;

        const secData = await step.run("fetch-sec-data", async () => {
            console.log(`Fetching SEC data for ${ticker} (CIK: ${data.profile.cik})...`);
            const sec = await getSECSubmissions(data.profile.cik);
            return sec && 'recent' in sec ? sec : null;
        });

        const newsData = await step.run("fetch-news", async () => {
            console.log(`Fetching News for ${ticker}...`);
            return await getNews(ticker);
        });

        const aiAnalysis = await step.run("generate-ai-insights", async () => {
            console.log(`Generating Gemini insights for ${ticker}...`);
            const hasSEC = secData && typeof secData === 'object' && 'recent' in secData;
            const sec = secData as any;

            const prompt = `
        Analyze the following financial, regulatory, and news data for ${ticker} and act as a "Technical Copilot" for a retail investor.
        
        CRITICAL INSTRUCTIONS:
        1. SEC SYNTHESIS: You MUST synthesize the last 5 filings provided. Do not just look at the most recent one. Look for patterns, recurring risks, or changes in reporting.
        2. MARKET PULSE: Provide a highly specific analysis of the news headlines for ${ticker}. Avoid general market commentary; focus on what these specific headlines mean for ${ticker}'s valuation and sentiment.
        3. BULL/BEAR: Ensure these are derived from a combination of the SEC filings and the news, not just the financial ratios.
        
        DATA:
        Profile: ${JSON.stringify(data.profile)}
        Key Metrics: ${JSON.stringify(data.metrics)}
        Ratios: ${JSON.stringify(data.ratios)}
        SEC Filings: ${hasSEC ? JSON.stringify({
                recent_forms: sec.recent.form.slice(0, 8),
                recent_dates: sec.recent.filingDate.slice(0, 8),
                recent_descriptions: sec.recent.primaryDocDescription.slice(0, 8)
            }) : "No SEC data available"}
        News Headlines: ${JSON.stringify((newsData || []).slice(0, 10).map((n: any) => ({ headline: n.headline, source: n.source })))}
        
        Output as JSON with:
        - executive_summary: A 2-3 sentence overview of the company's current health.
        - layman_analogy: A creative analogy for their business model.
        - sec_analysis: A 2-sentence synthesis of the last several regulatory filings (e.g. comparing the recent 8-Ks vs the last 10-Q).
        - sentiment_summary: A 2-sentence synthesis of SPECIFIC market headlines for ${ticker} and how they are impacting the "vibe" around the stock.
        - sentiment_score: A number from 0 to 100 representing overall market bullishness (0 being extreme fear/bearish, 100 being extreme greed/bullish).
        - score_breakdown: Object containing component scores (0-100): { financial_score, sec_score, sentiment_score }.
        - financial_subscores: Object with 0-100 scores: { profitability, growth, solvency }.
        - financial_formula: The exact formula used strings "Score = (0.4 * Profitability) + (0.4 * Growth) + (0.2 * Solvency)".
        - financial_score_drivers: Array of top 5 metrics driving the financial score. { label: string, impact: "positive" | "negative", weight: "high" | "medium" | "low" }.
        - prometheus_score: Calculate EXACTLY as: (0.4 * financial_score) + (0.3 * sec_score) + (0.3 * sentiment_score). Round to nearest integer.
        - score_criteria: A 1-sentence explanation of the breakdown (e.g. "High financial health (85) offsets moderate SEC risk (60)").
        - metrics: array of 15-20 key financial metrics covering ALL major categories:
             1. Valuation (P/E, PEG, Price/Book, Price/Sales, EV/EBITDA)
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
            });

            if (tickerError) throw tickerError;

            // Persist Historical Prices
            if (data.historicalPrices && data.historicalPrices.length > 0) {
                const priceRecords = data.historicalPrices.map((p: any) => ({
                    symbol: ticker,
                    timestamp: new Date(p.date).toISOString(),
                    open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume
                }));
                const { error: priceError } = await supabase.from('market_data').upsert(priceRecords, { onConflict: 'symbol,timestamp' });
                if (priceError) console.error("Error persisting prices:", priceError);
            }

            // Insert AI Insights
            const { error: insightError } = await supabase.from('ai_insights').insert({
                symbol: ticker,
                summary_text: aiAnalysis.executive_summary,
                bull_case: aiAnalysis.bull_case,
                bear_case: aiAnalysis.bear_case,
                metrics: aiAnalysis.metrics,
                model_version: 'gemini-2.5-flash-lite',
                metadata: {
                    price: data.profile.price,
                    changes: data.profile.changes,
                    changesPercentage: data.profile.changesPercentage,
                    analogy: aiAnalysis.layman_analogy,
                    sec_analysis: aiAnalysis.sec_analysis,
                    sentiment_summary: aiAnalysis.sentiment_summary,
                    sentiment_score: aiAnalysis.sentiment_score || 50,
                    prometheus_score: aiAnalysis.prometheus_score || 0,
                    score_breakdown: aiAnalysis.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0 },
                    financial_subscores: aiAnalysis.financial_subscores || { profitability: 0, growth: 0, solvency: 0 },
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
        });

        console.log(`Analysis complete for ${ticker}`);
        return { success: true, ticker };
    }
);
