# CLAUDE.md

Guidance for Claude Code working in this repository.

To Claude - Refine this doc as you see fit when you see fit.

## What This Is

**Prometheus** — AI-powered financial intelligence terminal. Fetches fundamentals, market data, and news via Yahoo Finance, synthesizes institutional-grade analysis via Claude Code (you!), and displays it in a Bloomberg-inspired dashboard. Supports US and Indian markets.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind 4) deployed on **Vercel**
- **Supabase** PostgreSQL (RLS enabled, Realtime on `ai_insights`/`tickers`/`market_data`)
- **Inngest** for async orchestration (deprecated for AI — kept for reference)
- **Claude Code** (you) for financial synthesis via `/analyze` and `/regen-all` skills
- **Yahoo Finance** (`yahoo-finance2`) as universal data source
- **Recharts** for candlestick/financial charting
- **technicalindicators** for RSI, MACD, Bollinger Bands
- **Radix UI** primitives (dialog, slider, tabs, toast, tooltip)
- **Zod 4** for validation, **Vitest** for testing

## Common Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest
```

## Architecture

```
src/
  app/
    layout.tsx                          # Root layout, header/footer
    page.tsx                            # Home — Leaderboard (ranked by prometheus_score)
    admin/page.tsx                      # DEPRECATED — use /analyze and /regen-all skills
    terminal/page.tsx                   # Terminal view
    api/
      analyze/route.ts                  # POST — triggers Inngest US analysis
      analyze/india/route.ts            # POST — triggers Inngest India analysis
      inngest/route.ts                  # Inngest webhook handler
      news/[symbol]/route.ts            # GET — RSS news aggregation
      stock/historical/[symbol]/route.ts # GET — 5yr OHLCV via Yahoo Finance
      admin/auth/route.ts               # POST — admin password check
  components/
    ui/                                 # Radix primitives + custom
    admin/                              # Admin-specific components
    dashboard/
      Leaderboard.tsx                   # Main ranked stock list
      PriceChart.tsx                    # Recharts candlestick + MAs
      PrometheusReportPanel.tsx         # Bull/bear case + score
      FinancialsTable.tsx               # Income/balance/cash flow
      TickerSearch.tsx                   # Typeahead search
      ExecutiveBench.tsx                # Company profile
      AIGeminiCopilot.tsx               # AI chat interface (legacy naming)
      DCFAnalysis.tsx                   # Discounted cash flow
      PrometheusScore.tsx               # 0-100 composite score
      DeepFundamentalAnalysis.tsx       # Detailed metrics
      InstitutionalIntelligence.tsx     # Analyst recs, insider holdings
      RegulatorySentimentPanel.tsx      # SEC filings sentiment
      MetricCopilot.tsx
  inngest/
    client.ts                           # Inngest client setup
    functions.ts                        # analyzeTicker workflow (US)
    functions-india.ts                  # India-specific workflow
  hooks/
    useStockDashboard.ts                # Dashboard state management
  lib/
    # gemini.ts removed — Claude Code is the AI engine now
    supabase.ts                         # Supabase client init
    yahoo-finance.ts                    # Yahoo Finance wrappers
    news-rss.ts                         # RSS news aggregation
    scrapers.ts                         # Data fetching orchestration (US)
    scrapers-india.ts                   # India-specific scrapers
    scoring-engine.ts                   # Deterministic scoring (40/20/40 split)
    formatters.ts / utils.ts / report-utils.ts
  __tests__/                            # Vitest tests
supabase/
  migrations/20260125_initial_schema.sql
scripts/                                # Integration test utilities
```

## Data Flow (Claude Code Pipeline)

1. **Trigger** — User runs `/analyze TICKER` in Claude Code
2. **Fetch** — `scripts/fetch-stock-data.ts` fetches all Yahoo Finance data → JSON to `/tmp/`
3. **Analyze** — Claude Code reads the data and generates structured analysis JSON
4. **Score** — `scoring-engine.ts` computes deterministic 60% (Financial 40% + Technical 20%), Claude scores qualitative 40%
5. **Persist** — `scripts/persist-analysis.ts` stores results in Supabase
6. **Push** — Supabase Realtime notifies connected clients
7. **Display** — Leaderboard ranks all tickers by prometheus_score

### Available Skills
- `/analyze TICKER [MARKET]` — Full analysis for one or more tickers (e.g., `/analyze NVDA`, `/analyze RELIANCE INDIA`)
- `/regen-all` — Regenerate analyses for all tickers in the database

## Database (see `.claude/database.md`)

4 tables: `tickers`, `market_data` (partitioned by month), `financials` (JSONB), `ai_insights`. RLS public read. Realtime enabled on key tables.

## Indian Market Support

- NSE tickers: append `.NS` (e.g., `RELIANCE.NS`)
- BSE tickers: append `.BO` (e.g., `63MOONS.BO`)
- Separate analysis pipeline: `/api/analyze/india` → `functions-india.ts` → `scrapers-india.ts`

## Core Rules

1. **Yahoo Finance Only** — Universal data source. No FMP/Finnhub (legacy, commented out).
2. **Claude Code is the AI Engine** — Analysis runs via `/analyze` skill. Inngest is deprecated.
3. **Deterministic + AI Scoring** — 60% deterministic (health + momentum), 40% AI qualitative. Never fully AI-driven.
4. **Structured AI Output** — Claude must return JSON: summary, bull_case[], bear_case[], metrics[], sentiment_score, analogy, score_breakdown.
5. **No Editorialization** — AI explains financials in layman's terms but doesn't recommend buy/sell.
6. **Atomic Commits** — One logical change per commit, independently revertable.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY  # Frontend + scripts read from .env.local
```

## Path Alias

`@/*` → `./src/*` (tsconfig)
