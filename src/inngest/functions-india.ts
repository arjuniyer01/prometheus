import { inngest } from "./client";
import { supabase } from "@/lib/supabase";
import {
    getCompanyProfileIndia,
    getFinancialStatementsIndia,
    getNewsIndia,
    getCorporateActionsIndia,
    getHistoricalPricesIndia
} from "@/lib/scrapers-india";
import { generateStructuredAnalysis } from "@/lib/gemini";

/**
 * Helper to pivot Indian API column-based data into row-based data
 */
function pivotFinancials(data: any): any[] {
    if (!data || typeof data !== 'object') return [];

    const periods = new Set<string>();
    // Collect all periods
    Object.values(data).forEach((metrics: any) => {
        if (metrics && typeof metrics === 'object') {
            Object.keys(metrics).forEach(p => periods.add(p));
        }
    });

    // Map Indian labels to our standard keys
    const mapping: Record<string, string> = {
        'Sales': 'revenue',
        'Net Profit': 'netIncome',
        'Total Assets': 'totalAssets',
        'Total Liabilities': 'totalTotalLiabilities',
        'Equity Capital': 'commonStock',
        'Reserves': 'retainedEarnings'
    };

    const results = Array.from(periods).map(period => {
        const record: any = { period };
        Object.entries(data).forEach(([label, metrics]: [string, any]) => {
            const key = mapping[label] || label;
            const val = metrics[period];
            if (val !== undefined) {
                // Convert Crores to absolute INR
                const numericVal = typeof val === 'number' ? val : parseFloat(val);
                record[key] = isNaN(numericVal) ? 0 : numericVal * 1e7;
            }
        });
        return record;
    });

    return results.sort((a, b) => {
        // Simple sort for "Jun 2024" type strings
        return b.period.localeCompare(a.period);
    });
}

/**
 * Transforms the row-based financials found in the /stock (profile) response
 */
function transformRowFinancials(stockFinancialObj: any): any {
    if (!stockFinancialObj || !stockFinancialObj.stockFinancialMap) return null;

    const record: any = {
        period: stockFinancialObj.EndDate || stockFinancialObj.FiscalYear || 'Unknown',
        type: stockFinancialObj.Type
    };

    const mapping: Record<string, string> = {
        'Revenue': 'revenue',
        'Total Revenue': 'revenue',
        'Sales': 'revenue',
        'Net Income': 'netIncome',
        'Net Profit': 'netIncome',
        'Profit After Tax': 'netIncome',
        'Total Assets': 'totalAssets',
        'Total Liabilities': 'totalTotalLiabilities',
        'Total Current Assets': 'totalCurrentAssets',
        'Total Current Liabilities': 'totalCurrentLiabilities',
        'Total Equity': 'totalStockholdersEquity',
        'Equity Capital': 'commonStock',
        'Operating Income': 'operatingIncome',
        'Operating Profit': 'operatingIncome',
        'Gross Profit': 'grossProfit',
        'Common Stock Total': 'commonStock',
        'Retained Earnings( Accumulated Deficit) ': 'retainedEarnings',
        'Reserves': 'retainedEarnings',
        'Depreciation/ Amortization': 'depreciationAndAmortization',
        'Interest Inc( Exp) Net- Non- Op Total': 'interestExpense'
    };

    const maps = stockFinancialObj.stockFinancialMap;
    ['INC', 'BAL', 'CAS'].forEach(sheet => {
        if (maps[sheet]) {
            maps[sheet].forEach((item: any) => {
                const cleanKey = (item.key || item.displayName || '').trim();
                const standardKey = mapping[cleanKey] || cleanKey;
                const numericVal = parseFloat(item.value);
                if (!isNaN(numericVal)) {
                    // Convert Crores to absolute INR
                    record[standardKey] = numericVal * 1e7;
                }
            });
        }
    });

    return record;
}

export const analyzeTickerIndia = inngest.createFunction(
    {
        id: "analyze-ticker-india",
        name: "Analyze Indian Ticker Workflow",
        throttle: {
            limit: 1,
            period: "1s"
        }
    },
    { event: "app/analyze.requested.india" },

    async ({ event, step }) => {
        const { ticker } = event.data;
        console.log(`Starting Indian analysis for ticker: ${ticker}`);

        await step.run("clear-old-data", async () => {
            console.log(`Clearing old analysis data for ${ticker}...`);
            // Initialize sync status
            await supabase.from('tickers').update({ sync_status: 'FETCHING', sync_percent: 5 }).eq('symbol', ticker);
            const { error } = await supabase.from('ai_insights').delete().eq('symbol', ticker).eq('market', 'INDIA');
            if (error) throw error;
        });

        const profile = await step.run("fetch-profile", async () => {
            return await getCompanyProfileIndia(ticker);
        });
        if (!profile) throw new Error(`Could not find profile for ticker ${ticker}`);

        await step.sleep("wait-1", "1s");
        const financials = await step.run("fetch-financials", async () => {
            const [quarter, annual, balanceSheet] = await Promise.all([
                getFinancialStatementsIndia(ticker, 'quarter_results'),
                getFinancialStatementsIndia(ticker, 'yoy_results'),
                getFinancialStatementsIndia(ticker, 'balancesheet')
            ]);
            return { quarter, annual, balanceSheet };
        });

        await step.sleep("wait-2", "1s");
        const corporateActions = await step.run("fetch-corporate-actions", async () => {
            return await getCorporateActionsIndia(ticker);
        });

        await step.sleep("wait-3", "1s");
        const historicalPrices = await step.run("fetch-historical-prices", async () => {
            return await getHistoricalPricesIndia(ticker);
        });

        await step.sleep("wait-4", "1s");
        const news = await step.run("fetch-news", async () => {
            return await getNewsIndia(ticker);
        });

        await step.run("update-status-analyzing", async () => {
            await supabase.from('tickers').update({ sync_status: 'ANALYZING', sync_percent: 60 }).eq('symbol', ticker);
        });

        const data = { profile, financials, corporateActions, historicalPrices, news };


        const aiAnalysis = await step.run("generate-ai-insights-india", async () => {
            console.log(`Generating Gemini insights for ${ticker} (India)...`);

            const prompt = `
        Analyze the following financial and news data for ${ticker} on the NSE/BSE and act as a "Technical Copilot" for a retail investor.
        
        CRITICAL INSTRUCTIONS (INDIAN CONTEXT):
        1. TERMINOLOGY: Use Indian financial terminology (Crores, Lakhs). 1 Crore = 10,000,000; 1 Lakh = 100,000.
        2. STANDALONE vs CONSOLIDATED: Differentiate if provided. Usually Consolidated is preferred for group health.
        3. REGULATORY SEARCH: Since there is no direct EDGAR equivalent, synthesize the provided "Corporate Actions" and "News" to act as the regulatory pulse.
        4. FINANCIAL TRENDS: Analyze the P&L and Balance Sheet trends specifically for the Indian market context (high growth, inflationary environment, sector-specific tailwinds like Digital India).
        
        DATA:
        Profile: ${JSON.stringify(data.profile)}
        Financials: ${JSON.stringify(data.financials)}
        Corporate Actions: ${JSON.stringify(data.corporateActions)}
        News Headlines: ${JSON.stringify((data.news || []).slice(0, 15).map((n: any) => ({ headline: n.title, source: n.source, snippet: n.snippet })))}
        
        Output as JSON with:
        - executive_summary: A 2-3 sentence overview of company current health.
        - layman_analogy: A creative analogy for their business model.
        - sec_analysis: A 2-sentence synthesis of Corporate Actions & Regulatory News.
        - quarterly_analysis: A 3-sentence deep dive into recent performance.
        - annual_trends: A 3-sentence summary of the financial trajectory.
        - sentiment_summary: A 2-sentence synthesis of headlines.
        - sentiment_score: 0-100
        - score_breakdown: { financial_score, sec_score, sentiment_score, trend_score }
        - financial_subscores: { profitability, growth, solvency }
        - trend_subscores: { 
            quarterly_momentum: 0-100, 
            annual_stability: 0-100 
          }
        - financial_formula: string
        - financial_score_drivers: Array of top 5 specific metrics.
          { label: string, impact: "positive" | "negative", weight: "high" | "low" }
        - prometheus_score: (0.35 * financial_score) + (0.25 * sec_score) + (0.2 * sentiment_score) + (0.2 * trend_score)
        - score_criteria: explanation.
        - metrics: array of 15-20 key financial metrics (INR where applicable).
          { 
            label: string, 
            value: string, 
            status: "positive" | "negative" | "neutral", 
            shortExplanation: string, 
            technicalDefinition: string
          }
        - bull_case: array of strings
        - bear_case: array of strings
        `;

            return await generateStructuredAnalysis(prompt);
        });

        await step.run("update-status-persisting", async () => {
            await supabase.from('tickers').update({ sync_status: 'PERSISTING', sync_percent: 85 }).eq('symbol', ticker);
        });

        await step.run("persist-to-db-india", async () => {
            console.log(`Persisting Indian results for ${ticker} to Supabase...`);

            // Upsert Ticker
            const { error: tickerError } = await supabase.from('tickers').upsert({
                symbol: ticker,
                company_name: data.profile.companyName,
                sector: data.profile.sector,
                industry: data.profile.industry,
                market_cap: data.profile.mktCap,
                exchange: data.profile.exchange,
                is_active: true,
                market: 'INDIA'
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
                if (priceError) console.error("Error persisting Indian prices:", priceError);
            }

            // Persist Financial Statements to 'financials' table
            const financialRecords: any[] = [];

            if (data.financials?.annual) {
                const pivoted = pivotFinancials(data.financials.annual);
                pivoted.forEach((res: any) => {
                    financialRecords.push({
                        symbol: ticker,
                        period: res.period,
                        report_type: '10-K',
                        income_statement: res,
                        balance_sheet: pivotFinancials(data.financials.balanceSheet).find(b => b.period === res.period) || {},
                        market: 'INDIA'
                    });
                });
            }

            if (data.financials?.quarter) {
                const pivoted = pivotFinancials(data.financials.quarter);
                pivoted.forEach((res: any) => {
                    financialRecords.push({
                        symbol: ticker,
                        period: res.period,
                        report_type: '10-Q',
                        income_statement: res,
                        market: 'INDIA'
                    });
                });
            }

            if (financialRecords.length === 0 && data.profile.raw?.financials) {
                console.log(`Falling back to profile financials for ${ticker}...`);
                const rawFins = data.profile.raw.financials;
                rawFins.forEach((f: any) => {
                    const transformed = transformRowFinancials(f);
                    if (transformed) {
                        financialRecords.push({
                            symbol: ticker,
                            period: transformed.period,
                            report_type: f.Type === 'Annual' ? '10-K' : '10-Q',
                            income_statement: transformed,
                            balance_sheet: transformed, // In row format, they are often in the same map
                            market: 'INDIA'
                        });
                    }
                });
            }

            if (financialRecords.length > 0) {
                const { error: finError } = await supabase.from('financials').upsert(financialRecords, {
                    onConflict: 'symbol,period,report_type'
                });
                if (finError) console.error("Error persisting Indian financials:", finError);
            }

            // Insert AI Insights
            const { error: insightError } = await supabase.from('ai_insights').insert({
                symbol: ticker,
                summary_text: aiAnalysis.executive_summary,
                bull_case: aiAnalysis.bull_case,
                bear_case: aiAnalysis.bear_case,
                metrics: aiAnalysis.metrics,
                model_version: 'gemini-2.5-flash-lite',
                market: 'INDIA',

                metadata: {
                    price: data.profile.price,
                    currency: 'INR',
                    analogy: aiAnalysis.layman_analogy || "Synthesis pending...",
                    sec_analysis: aiAnalysis.sec_analysis || "Regulatory pulse update in progress...",
                    quarterly_analysis: aiAnalysis.quarterly_analysis || aiAnalysis.quarterly_analysis_summary || "Recent quarterly trajectory synthesis pending...",
                    annual_trends: aiAnalysis.annual_trends || aiAnalysis.annual_summary || "Long-term annual transformation synthesis pending...",
                    sentiment_summary: aiAnalysis.sentiment_summary || "Headline sentiment tracking initiated...",
                    sentiment_score: aiAnalysis.sentiment_score || 50,
                    prometheus_score: aiAnalysis.prometheus_score || 0,
                    score_breakdown: aiAnalysis.score_breakdown || { financial_score: 0, sec_score: 0, sentiment_score: 0, trend_score: 0 },
                    score_criteria: aiAnalysis.score_criteria || "Multidimensional synthesis of fundamental and market signals.",
                    financial_subscores: aiAnalysis.financial_subscores || { profitability: 0, growth: 0, solvency: 0 },
                    trend_subscores: aiAnalysis.trend_subscores || { quarterly_momentum: 0, annual_stability: 0 },
                    financial_score_drivers: aiAnalysis.financial_score_drivers || [],
                    financial_formula: aiAnalysis.financial_formula || "Weighted aggregate of core fundamentals",
                    top_headlines: (data.news || []).slice(0, 3).map((n: any) => ({
                        headline: n.title || n.headline,
                        url: n.url,
                        source: n.source,
                        date: n.date
                    }))
                }

            });

            if (insightError) throw insightError;

            // Mark as complete
            await supabase.from('tickers').update({ sync_status: 'IDLE', sync_percent: 100 }).eq('symbol', ticker);
        });

        console.log(`Indian Analysis complete for ${ticker}`);
        return { success: true, ticker };
    }
);
