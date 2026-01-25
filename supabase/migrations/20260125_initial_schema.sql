-- ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search on tickers

-- 1. TICKERS TABLE
CREATE TABLE public.tickers (
    symbol TEXT PRIMARY KEY,
    company_name TEXT NOT NULL,
    exchange TEXT, -- 'NASDAQ', 'NYSE', etc.
    sector TEXT,
    industry TEXT,
    description TEXT,
    website TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Cached fundamentals for quick filtering/sorting in the UI
    market_cap BIGINT,
    pe_ratio NUMERIC(10, 2),
    dividend_yield NUMERIC(5, 4)
);

-- Search Index
CREATE INDEX idx_tickers_search ON public.tickers USING GIN (symbol gin_trgm_ops, company_name gin_trgm_ops);

-- 2. MARKET DATA (Time-Series)
CREATE TABLE public.market_data (
    symbol TEXT NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ NOT NULL,
    open NUMERIC(15, 4),
    high NUMERIC(15, 4),
    low NUMERIC(15, 4),
    close NUMERIC(15, 4),
    volume BIGINT,
    vwap NUMERIC(15, 4),
    PRIMARY KEY (symbol, timestamp)
) PARTITION BY RANGE (timestamp);

-- 3. FINANCIALS (Unstructured/Hybrid)
CREATE TABLE public.financials (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    symbol TEXT NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,
    period DATE NOT NULL, -- Fiscal period end date
    report_type TEXT CHECK (report_type IN ('10-K', '10-Q', 'TTM')),
    
    income_statement JSONB DEFAULT '{}'::jsonb,
    balance_sheet JSONB DEFAULT '{}'::jsonb,
    cash_flow JSONB DEFAULT '{}'::jsonb,
    
    source_url TEXT, -- Link to the SEC filing
    crawled_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, period, report_type)
);

CREATE INDEX idx_financials_revenue ON public.financials USING gin ((income_statement->'revenue'));

-- 4. AI INSIGHTS
CREATE TABLE public.ai_insights (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    symbol TEXT NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    model_version TEXT DEFAULT 'gemini-2.5-flash-lite',
    
    summary_text TEXT,
    sentiment_score NUMERIC(3, 2), -- -1.0 to 1.0
    
    bull_case JSONB, -- ["Point 1", "Point 2"]
    bear_case JSONB,
    risk_factors JSONB,
    metrics JSONB, -- Array of objects: { label, value, status, shortExplanation, technicalDefinition }
    metadata JSONB DEFAULT '{}'::jsonb, -- { price, changes, changesPercentage, analogy }
    
    context_tokens_used INTEGER,
    execution_time_ms INTEGER
);

-- RLS POLICIES
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Tickers" ON public.tickers FOR SELECT USING (true);
CREATE POLICY "Public Insert Tickers" ON public.tickers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Tickers" ON public.tickers FOR UPDATE USING (true);

ALTER TABLE public.market_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Market Data" ON public.market_data FOR SELECT USING (true);

ALTER TABLE public.financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Financials" ON public.financials FOR SELECT USING (true);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read AI Insights" ON public.ai_insights FOR SELECT USING (true);
CREATE POLICY "Public Insert AI Insights" ON public.ai_insights FOR INSERT WITH CHECK (true);
