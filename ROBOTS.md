# ROBOTS.md

## Project: Prometheus Financial Intelligence Platform

### Context
Prometheus is a high-performance financial intelligence platform designed to democratize institutional-grade analysis using Gemini 2.5 Flash Lite, Supabase, and Next.js.

### Tech Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Lucide React, Recharts.
- **Backend**: Supabase (Postgres, Realtime, Auth), Inngest (Serverless Workflows).
- **AI**: Google Gemini 2.5 Flash Lite (Structured Output).
- **Data**: Financial Modeling Prep (FMP), SEC EDGAR, Finnhub.

### Development Rules & Lessons Learned
1. **Design System**: Use the Institutional Monochrome palette (Silver/Slate/Black). Sectional color accents are reserved for data categorization: Amber for SEC Regulatory data, Sky Blue for Market Pulse/Sentiment, and Emerald/Red for bull/bear cases.
2. **Layout**: Prioritize a fluid edge-to-edge layout (max-width: 1920px) to support modern browser configurations like vertical tabs.
3. **API Redundancy**: Always implement fallbacks for flaky or restricted endpoints. (e.g., `getNews` defaults to Finnhub but falls back to FMP V3).
4. **Branding**: Use high-fidelity SVG assets (`engineer.svg`) for branding to ensure sharp rendering as both logos and favicons. Declare SVG types in metadata for cross-browser favicon support.
5. **Realtime UX**: Use Supabase Realtime for instant UI updates. Display "Synthesizing" states clearly to manage user expectations during AI generation.
6. **Rate Limiting**: Adhere to SEC EDGAR limits (max 10 req/s). Use the provided `headers` with a valid User-Agent.
7. **Validation**: Maintain the integration testing suite in `src/__tests__/`. Run `npm test` before major builds to ensure API keys and endpoints (especially "stable" vs "v3") are functional.
8. **Build Safety**: Provide fallbacks for environment variables in SDK initialization files (e.g., `src/lib/supabase.ts`) to prevent build-time crashes during static analysis on Vercel.
9. **Dynamic Routing**: Mark all background API routes as `export const dynamic = 'force-dynamic'` to prevent Next.js from attempting to statically optimize paths that rely on runtime secrets.
10. **Inngest Production Keys**: Ensure `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in Vercel. These are required for event triggers and secure communication with the Inngest Cloud.

### Completed Tasks
- [x] Institutional Monochrome UI Overhaul (Silver/Slate/Black).
- [x] "Engineer" Monolith Branding & SVG Favicon implementation.
- [x] Recharts integration with human-readable date tooltips.
- [x] Functional SEC EDGAR archive linking.
- [x] Inngest workflow for multi-source data synthesis (FMP + SEC + News).
- [x] Market Pulse section with live headline feeds and dynamic sentiment scoring (0-100).
- [x] Redundant News API scraper (Finnhub with FMP fallback).
- [x] Edge-to-edge fluid layout optimization (Ultrawide & Vertical Tab support).
- [x] API Validation suite (`npm test`) reaching 100% green status.
- [x] Sentiment-aware UI elements (dynamic progress bars and labels).
- [x] UI Cleanup: Removed redundant stock avatars, blinking pulse, and info icons.
- [x] Historical Price Caching: Implemented Supabase persistence for price data to reduce API load.
- [x] Enhanced Synthesis: Prompt engineering to include multiple SEC filings and stock-specific market pulse.
- [x] UX Polish: More prominent "Regenerate" button with better labeling.

### Pending Tasks
- [ ] Implement Realtime websocket subscription for minute-by-minute price updates.
- [ ] Add PDF export for "Prometheus Briefings".
- [ ] Integrate deeper fundamental analysis (DCF models, Peer Comparison).
- [ ] Expand Social Sentiment to include Reddit/X via specialized scrapers.
- [ ] Historical Analysis: Comparison of current synthesis vs. 3 months ago.
