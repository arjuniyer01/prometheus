# Prometheus

AI-powered financial intelligence terminal. Fetches fundamentals, market data, and news via Yahoo Finance, synthesizes institutional-grade analysis via Claude, and displays it in a Bloomberg-inspired dashboard. Supports US and Indian markets.

## Getting Started

```bash
npm install
npm run dev          # Dev server at http://localhost:3000
```

## AI Analysis via Claude Code

All stock analysis is driven through Claude Code slash commands. No admin dashboard needed.

### Analyze a stock

```
/analyze NVDA
```

Fetches all Yahoo Finance data, generates a full Prometheus analysis (executive summary, bull/bear case, 30+ metrics, qualitative scoring), and persists to the database.

### Analyze an Indian market stock

```
/analyze RELIANCE INDIA
```

### Analyze multiple stocks

```
/analyze AAPL MSFT GOOG
```

### Regenerate all existing analyses

```
/regen-all
```

Re-runs the full analysis pipeline for every ticker already in the database.

### Or just ask

You can also just say things like:
- "analyze Tesla"
- "run a fresh analysis on COST"
- "regenerate everything"

## Scoring

Prometheus Score (0-100) is a weighted composite:

| Component | Weight | Source |
|---|---|---|
| Financial Health | 40% | Deterministic (ROE, margins, growth, solvency) |
| Technical Momentum | 20% | Deterministic (price vs 200DMA, sector, volume) |
| SEC/Regulatory | 10% | Claude qualitative |
| Sentiment | 10% | Claude qualitative |
| Sector Intelligence | 10% | Claude qualitative |
| Institutional | 10% | Claude qualitative |

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind 4) on Vercel
- **Supabase** PostgreSQL with Realtime
- **Claude Code** for AI synthesis
- **Yahoo Finance** (`yahoo-finance2`) as universal data source
- **Recharts** for financial charting

## Environment

Copy `.env.local.example` to `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
