# ROBOTS.md

## Project: Prometheus Financial Intelligence Platform

### Context
Prometheus is a high-performance financial intelligence platform designed to democratize institutional-grade analysis using Gemini 2.5 Flash Lite, Supabase, and Next.js.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Lucide React, Recharts.
- **Backend**: Supabase (Postgres, Realtime, Auth), Inngest (Serverless Workflows).
- **AI**: Google Gemini 2.5 Flash Lite (Structured Output).
- **Data**: Yahoo Finance (Primary for Financials, News, and SEC Filings). RSS Feeds for live sentiment. FMP, Finnhub, and IndianAPI.in are legacy/fallback only.

### Development Rules & Lessons Learned
1. **Design System**: Use the Institutional Monochrome palette (Silver/Slate/Black). Sectional color accents are reserved for data categorization: Amber for SEC Regulatory data, Sky Blue for Market Pulse/Sentiment, and Emerald/Red for bull/bear cases.
2. **Layout**: Prioritize a fluid edge-to-edge layout (max-width: 1920px) to support modern browser configurations like vertical tabs.
3. **Yahoo Finance Migration**: **CRITICAL**: The platform has fully migrated to Yahoo Finance for both US and Indian markets.
    - **Symbol Handling**: All Indian stocks MUST include the `.NS` (NSE) or `.BO` (BSE) suffix when calling the library. US stocks use standard uppercase symbols.
    - **Module Usage**: Leverage `quoteSummary` with modules: `assetProfile`, `price`, `summaryDetail`, `defaultKeyStatistics`, `financialData`, `earningsTrend`, `indexTrend`, `majorHoldersBreakdown`, `insiderTransactions`.
    - **Historical Data**: Use `yahooFinance.historical` with explicit `period1` and `period2` Date objects.
    - **News**: **CRITICAL**: Switched from `yahooFinance.search` headlines to a dual **RSS-based Live Aggregator** (Google News + Yahoo Finance RSS).
        - **Precision**: Use `ticker:SYMBOL` syntax for Google News RSS to minimize headline noise.
        - **Latency**: Fetched live via `/api/news/[symbol]` to bypass CORS and ensure real-time hydration without database stale-datedness.
        - **Deduplication**: Multi-source feeds are merged and deduplicated by URL/Title in `src/lib/news-rss.ts`.
4. **Data Stewardship**: Always fetch and persist the `raw_research_dump` in `ai_insights.metadata`. This includes unmapped data like Cash Flow statements, ESG scores (when available), and detailed insider logs for future UI expansion.
5. **Realtime UX**: Use Supabase Realtime for instant UI updates. Display "Synthesizing" states clearly to manage user expectations during AI generation.
6. **Rate Limiting**: Yahoo Finance is generally permissive for reasonable polling intervals. Avoid aggressive loops without delay. For SEC EDGAR, maintain < 10 req/s with a professional User-Agent header.
7. **Validation**: Maintain the integration testing suite in `scripts/test-yahoo.ts`. Run `npm run test:yahoo` after modifying data fetching logic to ensure cross-market parity.
8. **Build Safety**: Provide fallbacks for environment variables (e.g., `process.env.SUPABASE_URL || ''`) to prevent build-time crashes during Vercel's static analysis.
9. **Legacy APIs (FMP/Finnhub/IndianAPI)**: These are preserved in `scrapers.ts` and `scrapers-india.ts` as commented-out reference code. DO NOT re-enable them unless Yahoo Finance is completely deprecated or unreachable.
10. **Metric Consistency**: **CRITICAL**: Reports must display an exhaustive set of metrics including PE, Forward PE, Debt-to-Equity, Net Margin, and ROE.
    - **Historical Parity**: Both US and Indian financial tables MUST include Gross Margin, Net Margin, and EPS columns, calculated from Yahoo Finance statement dumps.
11. **Analyst Intelligence**: Use the `recommendationTrend` and `earningsHistory` modules from Yahoo Finance to proxy institutional sentiment.
12. **Indian Market Parity**: Ensure `functions-india.ts` maintains 100% logic parity with US workflows. Recent fix: Institutional Intelligence (Insiders/Analysts) was missing and is now integrated into the Indian AI prompt and persistence layer.
13. **RSS Parser Integration**: Use `rss-parser` for consistent XML transformation. Always provide a snippet fallback from the `title` or `contentSnippet` if the description is missing.

### Sector Analysis Logic
- **Benchmarks**: Use `^GSPC` (S&P 500) or `^NSEI` (Nifty 50) as primary benchmarks for relative strength analysis.
- **Seasonality**: Derive from 5-year historical price actions fetched via YF.
- **Rotation**: Proxy rotation signals by comparing sectoral indices (e.g., `^CNXIT` for India IT) against broader market movement.

### Completed Tasks
- [x] Institutional Monochrome UI Overhaul.
- [x] Unified US/India Market Dashboard architecture via Yahoo Finance.
- [x] **[NEW] Comprehensive Yahoo Finance Integration**: All data categories (Income, Balance, Cash Flow, Estimates, Insider Trades) integrated.
- [x] **[NEW] Raw Research Dump**: Implemented persistent logging and a "System Dump" UI for advanced financial data.
- [x] **[FIX] API Migration**: Successfully replaced FMP, Finnhub, and IndianAPI.in with a unified Yahoo Finance backend.
- [x] **[NEW] Integration Test Suite**: Added `npm run test:yahoo` for validating multi-market data health.
- [x] **[NEW] Institutional Intelligence**: Mapped `raw_research_dump` fields (Analysts, Insiders, Earnings history) to premium dashboard widgets and integrated into the scoring engine (US & INDIA).
- [x] **[FIX] Live News Aggregator**: Implemented a real-time RSS engine (Google + Yahoo) with a scrollable UI and Next.js API proxy to replace limited library news.
- [x] **[FIX] Indian Market Parity**: Retrofitted `functions-india.ts` with Institutional Intelligence and Sector Rotation analysis.

### Pending Tasks
- [ ] Map `raw_research_dump` fields to dedicated UI widgets (e.g., Insider Trades timeline, ESG meter).
- [ ] Fix specific financial statement key mapping (Total Assets / Operating Cash Flow) for newer YF schema versions.
- [ ] Implement PDF export for "Prometheus Briefings".
- [ ] Integrate deeper fundamental analysis (DCF models).
- [ ] Expand Social Sentiment to include Reddit/X via specialized scrapers.
- [ ] Historical Comparison: Compare current synthesis vs. 3 months ago.
