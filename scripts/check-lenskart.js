
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
    const symbol = 'LENSKART';

    console.log(`--- Checking Data for ${symbol} ---`);

    const { data: ticker } = await supabase.from('tickers').select('*').eq('symbol', symbol).single();
    console.log('Ticker:', ticker);

    const { data: financials } = await supabase.from('financials').select('*').eq('symbol', symbol);
    console.log('Financials Count:', financials?.length || 0);
    if (financials?.length > 0) {
        console.log('Sample Financial (Period):', financials[0].period);
        console.log('Sample Income Statement Keys:', Object.keys(financials[0].income_statement || {}));
    }

    const { data: marketData } = await supabase.from('market_data').select('*').eq('symbol', symbol).limit(5);
    console.log('Market Data (Historical) Count:', marketData?.length || 0);

    const { data: insights } = await supabase.from('ai_insights').select('*').eq('symbol', symbol).order('created_at', { ascending: false }).limit(1);
    console.log('AI Insights metadata top_headlines exist:', !!insights?.[0]?.metadata?.top_headlines);
    if (insights?.[0]?.metadata?.top_headlines) {
        console.log('Sample Headline:', insights[0].metadata.top_headlines[0]);
    }
}

checkData();
