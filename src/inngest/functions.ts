import { inngest } from "./client";
import { supabase } from "@/lib/supabase";
import { getKeyMetrics, getFinancialRatios, getCompanyProfile, getSECSubmissions, getNews } from "@/lib/scrapers";
import { generateStructuredAnalysis } from "@/lib/gemini";

export const analyzeTicker = inngest.createFunction(
    { id: "analyze-ticker", name: "Analyze Ticker Full Workflow" },
    { event: "app/analyze.requested" },
    async ({ event, step }) => {
        const { ticker } = event.data;
        console.log(`Starting analysis for ticker: ${ticker}`);

        const data = await step.run("fetch-financial-data", async () => {
            console.log(`Fetching FMP data for ${ticker}...`);
            const [profile, metrics, ratios] = await Promise.all([
                getCompanyProfile(ticker),
                getKeyMetrics(ticker),
                getFinancialRatios(ticker),
            ]);

            if (!profile) throw new Error(`Could not find profile for ticker ${ticker}`);

            return { profile, metrics, ratios };
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

        const aiAnalysis = await step.run("generate-ai-insights", async () => {
            console.log(`Generating Gemini insights for ${ticker}...`);
            const hasSEC = secData && typeof secData === 'object' && 'recent' in secData;
            const sec = secData as any;

            const prompt = `
        Analyze the following financial, regulatory, and news data for ${ticker} and act as a "Technical Copilot" for a retail investor.
        Identify if each key metric is positive or negative based on sector averages and historical context.
        
        DATA:
        Profile: ${JSON.stringify(data.profile)}
        Key Metrics: ${JSON.stringify(data.metrics)}
        Ratios: ${JSON.stringify(data.ratios)}
        SEC Filings: ${hasSEC ? JSON.stringify({
                last_filing: sec.recent.form[0],
                last_date: sec.recent.filingDate[0],
                recent_forms: sec.recent.form.slice(0, 5)
            }) : "No SEC data available"}
        News: ${JSON.stringify((newsData || []).slice(0, 5).map((n: any) => ({ headline: n.headline, summary: n.summary })))}
        
        Output as JSON with:
        - executive_summary: A 2-3 sentence overview of the company's current health.
        - layman_analogy: A creative analogy for their business model.
        - sec_analysis: A short 1-sentence assessment of the latest regulatory activity (e.g. "Recent 8-K indicates strong organic growth" or "High frequency of 4s suggest insider selling").
        - sentiment_summary: A 2-sentence synthesis of general news sentiment and market perception.
        - sentiment_score: A number from 0 to 100 representing overall market bullishness (0 being extreme fear/bearish, 100 being extreme greed/bullish).
        - metrics: array of 8-10 key financial metrics (e.g., ROE, Debt/Equity, P/E, Quick Ratio, etc.)
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
