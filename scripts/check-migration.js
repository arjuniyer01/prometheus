
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

async function migrate() {
    console.log('Adding sync_status and sync_percent to tickers table...');

    // We use rpc or just try to update a non-existent column to see if it fails, 
    // but better to use a dedicated migration if possible.
    // Since we can't run arbitrary SQL easily without a pre-defined RPC,
    // we'll hope the user can run the SQL or we've already done it.

    // Actually, I can use the 'postgres' console if I have access, but I don't.
    // I will assume for now I can't run SQL.

    // Wait, I can try to 'upsert' with those columns. If it fails, they don't exist.
    const { error } = await supabase.from('tickers').select('sync_status').limit(1);
    if (error && error.code === '42703') {
        console.log('Columns do not exist. Please run the following SQL in your Supabase SQL Editor:');
        console.log(`
      ALTER TABLE public.tickers ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'IDLE';
      ALTER TABLE public.tickers ADD COLUMN IF NOT EXISTS sync_percent INTEGER DEFAULT 0;
    `);
    } else {
        console.log('Columns already exist or another error occurred:', error?.message || 'Success');
    }
}

migrate();
