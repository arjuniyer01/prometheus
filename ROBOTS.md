# ROBOTS.md

## Project: Prometheus Financial Intelligence Platform

### Context
Prometheus is a high-performance financial intelligence platform designed to democratize institutional-grade analysis using Gemini 3 Flash, Supabase, and Next.js.

### Tech Stack
- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide React, Recharts.
- **Backend**: Supabase (Postgres, Realtime, Auth), Inngest (Workflows).
- **AI**: Google Gemini 3 Flash.
- **Data**: Financial Modeling Prep (FMP), SEC EDGAR, Finnhub.

### Development Rules
1. **Design First**: Adhere to the Glassmorphism design system defined in `DESIGN.md`. Use high-end aesthetics (glows, blurs, gradients).
2. **Safety**: Follow strict rate-limiting for SEC EDGAR (max 10 req/s, use a 5-8 req/s safety buffer).
3. **Structured AI**: Use Gemini's Structured Output feature for all AI insights to ensure frontend compatibility.
4. **Asynchronicity**: Long-running tasks (fetching > 10s) MUST use Inngest workflows.
5. **Realtime**: Use Supabase Realtime for price updates and AI job completion notifications.
6. **Accessibility**: Maintain WCAG AA contrast standards even with Glassmorphism.
7. **Testing**: Maintain the integration testing suite in `src/__tests__/`. Run `npm test` to validate all external API connections (FMP, Gemini, Finnhub).

### Completed Tasks
- [x] Consultation of `DESIGN.md`.
- [x] Initial `ROBOTS.md` creation.
- [x] Initialize Next.js project (App Router, Tailwind v4).
- [x] Setup Tailwind configuration for Glassmorphism.
- [x] Create core Supabase schema (DDL).
- [x] Implement initial Dashboard mockup with Glassmorphism.
- [x] Implement `MetricCopilot` component with technical explanations.
- [x] Setup Inngest workflow for ticker analysis (Gemini Technical Copilot).
- [x] Implement Ticker Tab selection system with Supabase Realtime sync.
- [x] Implement initial FMP/Finnhub scrapers.
- [x] Setup integration testing suite for API validation (`npm test`).

### Pending Tasks
- [ ] Implement Realtime subscription for sub-metric price updates.
- [ ] Integrate Recharts for real-time price visualization.
- [ ] Implement SEC EDGAR scraper with rate control.
- [ ] Implement Social Sentiment (StockTwits/Reddit) aggregation.
