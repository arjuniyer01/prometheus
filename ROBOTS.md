# ROBOTS.md

## Project: Prometheus Financial Intelligence Platform

### Context
Prometheus is a high-performance financial intelligence platform designed to democratize institutional-grade analysis using Gemini 2.5 Flash Lite, Supabase, and Next.js.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Lucide React, Recharts.
- **Backend**: Supabase (Postgres, Realtime, Auth), Inngest (Serverless Workflows).
- **AI**: Google Gemini 2.5 Flash Lite (Structured Output).
- **Data**: Financial Modeling Prep (FMP), SEC EDGAR, Finnhub, IndianAPI.in (NSE/BSE).

### Development Rules & Lessons Learned
1. **Design System**: Use the Institutional Monochrome palette (Silver/Slate/Black). Sectional color accents are reserved for data categorization: Amber for SEC Regulatory data, Sky Blue for Market Pulse/Sentiment, and Emerald/Red for bull/bear cases.
2. **Layout**: Prioritize a fluid edge-to-edge layout (max-width: 1920px) to support modern browser configurations like vertical tabs.
3. **API Redundancy**: Always implement fallbacks for flaky or restricted endpoints. (Priority: FMP Primary, Finnhub Fallback). `getNews`, historical prices, and fundamental metrics default to FMP, falling back to Finnhub ONLY if data is missing or restricted.
4. **Branding**: Use high-fidelity SVG assets (`engineer.svg`) for branding to ensure sharp rendering as both logos and favicons. Declare SVG types in metadata for cross-browser favicon support.
5. **Realtime UX**: Use Supabase Realtime for instant UI updates. Display "Synthesizing" states clearly to manage user expectations during AI generation.
6. **Rate Limiting**: Adhere to SEC EDGAR limits (max 10 req/s). Use the provided `headers` with a valid User-Agent.
7. **Validation**: Maintain the integration testing suite in `src/__tests__/`. Run `npm test` before major builds to ensure API keys and endpoints (especially "stable" vs "v3") are functional.
8. **Build Safety**: Provide fallbacks for environment variables in SDK initialization files (e.g., `src/lib/supabase.ts`) to prevent build-time crashes during static analysis on Vercel.
9. **Dynamic Routing**: Mark all background API routes as `export const dynamic = 'force-dynamic'` to prevent Next.js from attempting to statically optimize paths that rely on runtime secrets.
10. **Inngest Production Keys**: Ensure `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in Vercel. These are required for event triggers and secure communication with the Inngest Cloud.
11. **FMP Stable API**: **CRITICAL**: Use the `/stable/` prefix for all FMP API calls. All `/api/v3/` and `/api/v4/` paths are legacy.
    - SEC Profile: `/stable/sec-profile?symbol={TICKER}`
    - Performance Snapshot: `/stable/sector-performance-snapshot?date={YYYY-MM-DD}` (Defaults to last closing date if today is unavailable)
    - Profile: `/stable/profile?symbol={TICKER}`
    - Historical Prices: `/stable/historical-price-eod/full?symbol={TICKER}` or `/stable/historical-chart/1day/{TICKER}`
    - Screener: `/stable/company-screener?sector={SECTOR}`
    - **Note**: `available-sectors` is a RESTRICTED (paid) endpoint; do not use it.
12. **IndianAPI Integration**: **CRITICAL**: Always use `x-api-key` header. Consult `indian-stock-api.json` for param names.
    - **Stock Profile**: `/stock?name={TICKER}` (Param is `name`)
    - **Financials**: `/statement?stock_name={TICKER}&stats={type}` (Param is `stock_name`)
    - **Historical Prices**: `/historical_data?stock_name={TICKER}&period=1yr&filter=price`
    - **Historical Stats**: `/historical_stats?stock_name={TICKER}&stats=ratios`
    - **Industry Peers**: `/industry_search?query={INDUSTRY_NAME}` (Param is `query`)
    - **Market Sentiment**: `/trending` and `/NSE_most_active` (No params)

### Sector Analysis Logic
- **FMP (US)**: Use Sector ETFs (e.g., XLK, XLF) with `/stable/historical-price-eod/full` to derive seasonality. Use `/stable/sector-performance` for real-time rotation.
- **IndianAPI (India)**: Use sectoral indices (e.g., NIFTY IT, NIFTY BANK) with `/historical_data` for seasonality. Monitor `/trending` and `/NSE_most_active` to proxy rotation signals.

### Completed Tasks
- [x] Institutional Monochrome UI Overhaul.
- [x] "Engineer" Monolith Branding & SVG Favicon.
- [x] Search-based navigation and scalable ticker selection.
- [x] Secured Admin Terminal (/admin) for stock generation.
- [x] Unified US/India Market Dashboard architecture.
- [x] **[NEW] Sector Intelligence Integration**: Added Outperformance, Seasonality, and Rotation scoring + UI.
- [x] **[FIX] API Stability**: Migrated all FMP calls to `/stable/` and strictly validated Indian API parameters.

### Pending Tasks
- [ ] Implement Upstox WebSocket for real-time NSE/BSE price ticks.
- [ ] Automated Bhavcopy Ingestion Engine for local Indian historical data.
- [ ] Implement Realtime websocket subscription for minute-by-minute price updates (US).
- [ ] Add PDF export for "Prometheus Briefings".
- [ ] Integrate deeper fundamental analysis (DCF models, Peer Comparison).
- [ ] Expand Social Sentiment to include Reddit/X via specialized scrapers.
- [ ] Historical Analysis: Comparison of current synthesis vs. 3 months ago.
