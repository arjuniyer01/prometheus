# Regenerate All Analyses

Regenerate Prometheus analyses for all existing tickers in the database.

## Instructions

### Step 1: Fetch all tickers from Supabase
Run this to get the list:
```bash
npx tsx -e "
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
const { data } = await supabase.from('tickers').select('symbol, market').order('symbol');
console.log(JSON.stringify(data));
"
```

### Step 2: For each ticker, run `/analyze`
- Parse the ticker list
- For each one, run the full `/analyze` workflow (fetch data, generate analysis, persist)
- Process them sequentially to avoid rate limiting Yahoo Finance
- Report progress: "Analyzing X of Y: TICKER..."

### Step 3: Summary
- Show a final summary table with all tickers and their new Prometheus Scores
