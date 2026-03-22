/**
 * Persist a Claude-generated analysis to Supabase.
 * Reads JSON from a file passed as argument.
 *
 * Usage: npx tsx scripts/persist-analysis.ts <path-to-analysis.json>
 *
 * The JSON file must have: { rawData: {...}, aiAnalysis: {...} }
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: npx tsx scripts/persist-analysis.ts <analysis.json>');
    process.exit(1);
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function main() {
    const raw = readFileSync(filePath, 'utf-8');
    const { rawData, aiAnalysis } = JSON.parse(raw);

    const ticker = rawData.ticker;
    const market = rawData.market || 'US';
    const profile = rawData.profile;
    const quote = rawData.quote || profile;
    const deterministicScore = rawData.deterministicScore;

    console.log(`[PERSIST] Starting for ${ticker} (${market})...`);

    // 1. Clear old data
    await Promise.all([
        supabase.from('ai_insights').delete().eq('symbol', ticker).eq('market', market),
        supabase.from('financials').delete().eq('symbol', ticker),
        supabase.from('market_data').delete().eq('symbol', ticker)
    ]);
    console.log(`[PERSIST] Cleared old data`);

    // 2. Upsert ticker
    const { error: tickerError } = await supabase.from('tickers').upsert({
        symbol: ticker,
        company_name: profile.companyName,
        sector: profile.sector,
        industry: profile.industry,
        market_cap: profile.mktCap,
        exchange: profile.exchange,
        market: market,
        sync_status: 'PERSISTING',
        sync_percent: 85
    }, { onConflict: 'symbol' });
    if (tickerError) throw tickerError;
    console.log(`[PERSIST] Upserted ticker`);

    // 3. Persist historical prices
    const historicalPrices = rawData.historicalPrices || [];
    if (historicalPrices.length > 0) {
        const priceRecords = historicalPrices.map((p: any) => ({
            symbol: ticker,
            timestamp: new Date(p.date || p.timestamp).toISOString(),
            open: p.open, high: p.high, low: p.low, close: p.close, volume: p.volume
        }));
        const { error: priceError } = await supabase.from('market_data').upsert(priceRecords, { onConflict: 'symbol,timestamp' });
        if (priceError) console.error('[PERSIST] Price error:', priceError.message);
        else console.log(`[PERSIST] Persisted ${priceRecords.length} price records`);
    }

    // 4. Persist financial statements (US format)
    if (market === 'US') {
        const statements = [
            ...(rawData.annualIncome || []).map((s: any) => ({ ...s, type: '10-K' })),
            ...(rawData.quarterlyIncome || []).map((s: any) => ({ ...s, type: '10-Q' })),
        ];
        if (statements.length > 0) {
            const financialRecords = statements.map((s: any) => {
                const balanceSheet = s.type === '10-K'
                    ? [...(rawData.annualBalance || [])].find((b: any) => b.date === s.date) || {}
                    : [...(rawData.quarterlyBalance || [])].find((b: any) => b.date === s.date) || {};
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
            if (finError) console.error('[PERSIST] Financials error:', finError.message);
            else console.log(`[PERSIST] Persisted ${financialRecords.length} financial records`);
        }
    }

    // 5. Calculate final score
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

    console.log(`[PERSIST] Final Prometheus Score: ${finalScore}`);

    // 6. Insert AI insight
    let gitVersion = 'v0';
    try {
        const { execSync } = await import('child_process');
        gitVersion = execSync('git describe --tags --always --dirty', { encoding: 'utf8' }).trim();
    } catch {}

    const { error: insightError } = await supabase.from('ai_insights').insert({
        symbol: ticker,
        summary_text: aiAnalysis.executive_summary,
        bull_case: aiAnalysis.bull_case,
        bear_case: aiAnalysis.bear_case,
        metrics: aiAnalysis.metrics,
        model_version: 'claude-opus-4-6',
        market: market,
        metadata: {
            currency: market === 'INDIA' ? 'INR' : (quote?.currency || 'USD'),
            cik: rawData.fullAnalysis?.cik || null,
            price: quote?.price || profile?.price,
            changes: quote?.change || profile?.changes,
            changesPercentage: quote?.changesPercentage || profile?.changesPercentage,
            marketCap: quote?.marketCap || profile?.mktCap,
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
            financial_subscores: aiAnalysis.financial_subscores || {
                profitability: deterministicScore.breakdown.profitability,
                growth: deterministicScore.breakdown.growth,
                solvency: deterministicScore.breakdown.solvency,
                valuation: deterministicScore.breakdown.valuation,
                cashFlow: deterministicScore.breakdown.cashFlow
            },
            trend_subscores: aiAnalysis.trend_subscores || {
                quarterly_momentum: deterministicScore.breakdown.trend,
                annual_stability: 0
            },
            sector_subscores: aiAnalysis.sector_subscores || { outperformance: 0, seasonality_strength: 0, rotation_inflow: 0 },
            institutional_subscores: aiAnalysis.institutional_subscores || { analyst_conviction: 0, insider_signal: 0, earnings_reliability: 0 },
            financial_formula: aiAnalysis.financial_formula || "financial + technical + Qualitative Alpha",
            financial_score_drivers: aiAnalysis.financial_score_drivers || deterministicScore.flags || [],
            score_criteria: aiAnalysis.score_criteria || "Score pending analysis depth.",
            intrinsic_value: aiAnalysis.intrinsic_value || 0,
            valuation_analysis: aiAnalysis.valuation_analysis || "Valuation pending.",
            last_sec_filing: rawData.secFilings?.[0]
                ? `${rawData.secFilings[0].type} (${rawData.secFilings[0].date})`
                : 'N/A',
            top_headlines: rawData.news || [],
            raw_research_dump: {
                cash_flow: rawData.cashFlow,
                full_analysis: rawData.fullAnalysis,
                extended_profile: profile,
                extended_metrics: rawData.metrics
            },
            analysis_version: gitVersion
        }
    });

    if (insightError) throw insightError;
    console.log(`[PERSIST] AI insight saved`);

    // 7. Mark complete
    await supabase.from('tickers').update({ sync_status: 'IDLE', sync_percent: 100 }).eq('symbol', ticker);
    console.log(`[PERSIST] Done! ${ticker} is now live with Prometheus Score: ${finalScore}`);
}

main().catch(err => {
    console.error('[PERSIST] Fatal error:', err);
    process.exit(1);
});
