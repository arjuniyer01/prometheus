# Database Schema

Quick reference for Supabase PostgreSQL tables. Full schema in `supabase/migrations/20260125_initial_schema.sql`.

## Tables

### tickers (Core Entity)
| Column | Type | Notes |
|--------|------|-------|
| symbol | TEXT PK | Stock ticker (e.g., AAPL, RELIANCE.NS) |
| company_name | TEXT | |
| exchange | TEXT | NYSE, NASDAQ, NSE, BSE |
| sector | TEXT | |
| industry | TEXT | |
| description | TEXT | |
| website | TEXT | |
| market_cap | NUMERIC | Cached fundamental |
| pe_ratio | NUMERIC | |
| dividend_yield | NUMERIC | |
| is_active | BOOLEAN | |
| last_updated_at | TIMESTAMPTZ | |

Index: Trigram search on symbol + company_name

### market_data (Time-Series, Partitioned by Month)
| Column | Type | Notes |
|--------|------|-------|
| symbol | TEXT FK | |
| timestamp | TIMESTAMPTZ PK | |
| open | NUMERIC | |
| high | NUMERIC | |
| low | NUMERIC | |
| close | NUMERIC | |
| volume | BIGINT | |
| vwap | NUMERIC | |

### financials (Hybrid JSON)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| symbol | TEXT FK | |
| period | DATE | Fiscal date |
| report_type | TEXT | 10-K, 10-Q, TTM |
| income_statement | JSONB | |
| balance_sheet | JSONB | |
| cash_flow | JSONB | |
| source_url | TEXT | |
| crawled_at | TIMESTAMPTZ | |

### ai_insights (AI Output)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| symbol | TEXT FK | |
| created_at | TIMESTAMPTZ | |
| summary_text | TEXT | Layman's summary |
| sentiment_score | FLOAT | -1.0 (bear) to +1.0 (bull) |
| bull_case | JSONB[] | Array of bullish theses |
| bear_case | JSONB[] | Array of bearish risks |
| risk_factors | JSONB[] | Ranked by severity |
| metrics | JSONB[] | {label, value, status, explanation} |
| metadata | JSONB | {price, changes, analogy, prometheus_score} |
| context_tokens_used | INTEGER | |
| execution_time_ms | INTEGER | |

## Security

- RLS enabled on all tables
- Public SELECT on all tables
- Public INSERT on `tickers`, `ai_insights`
- Realtime enabled on `ai_insights`, `tickers`, `market_data`
