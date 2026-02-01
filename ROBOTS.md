# ROBOTS.md

## Project: Prometheus Financial Intelligence Platform

### 1. System Overview & Architecture
Prometheus is a high-performance, institutional-grade financial intelligence terminal. It is designed to act as an AI-powered Senior Equity Analyst, capable of synthesizing vast amounts of raw market data into actionable "Alpha" (narratives, valuations, and risks).

**Core Data Flow:**
1.  **Trigger**: User requests analysis for a ticker (e.g., `AAPL` or `RELIANCE.NS`).
2.  **Orchestration**: Next.js API endpoint pushes the job to **Inngest** (Serverless Queue).
3.  **Data Acquisition**:
    *   **Financials**: `yahoo-finance2` fetches 9+ distinct modules (Income, Balance, Cash, Estimations, etc.).
    *   **Sentiment**: Live RSS aggregation from Google News & Yahoo Finance feeds.
    *   **Market Data**: Real-time prices via Yahoo Finance quote endpoint.
4.  **Synthesis**: **Gemini 2.5 Flash Lite** processes the structured JSON dump. It uses "Chain of Thought" reasoning to produce a comprehensive report.
5.  **Persistence**: The resulting JSON and Markdown report are stored in **Supabase** (Postgres).
6.  **Delivery**: **Supabase Realtime** pushes updates to the client in milliseconds.

### 2. Technology Stack
*   **Frontend Framework**: Next.js 15 (App Router).
*   **Styling**: Tailwind CSS v4.
    *   *Design System*: "Institutional Monochrome" (Slate/Zinc/Black).
    *   *Utilities*: `lucide-react` (Icons), `clsx`/`tailwind-merge` (Class management).
*   **Visualization**: Recharts (Customized for High-Frequency Trading aesthetics).
*   **Backend Services**:
    *   **Database**: Supabase (PostgreSQL with RLS policies).
    *   **Queue/Jobs**: Inngest (Reliable serverless function orchestration).
    *   **AI Model**: Google Gemini 2.5 Flash Lite (via Vercel AI SDK or Google Generative AI).
*   **Data Providers**:
    *   **Primary**: Yahoo Finance (`yahoo-finance2` library).
    *   **News**: Custom RSS Aggregator (`rss-parser`).
    *   **Legacy/Fallback**: Financial Modeling Prep (FMP), Finnhub, IndianAPI.in (Code exists but is dormant).

### 3. Development Rules & "The Prometheus Way"

#### A. Design Philosophy: "The Terminal Aesthetic"
*   **Visual Language**: The UI must resemble a Bloomberg Terminal or FactSet workstation.
    *   Use **Jet Black** (`bg-slate-950`) backgrounds.
    *   Use **1px borders** (`border-white/10`) for separation.
    *   **Typography**: `Geist Mono` or standard Monospace for numbers. `Inter/Geist Sans` for narrative text.
    *   **Color Semantics**:
        *   **Emerald (#10b981)**: Bullish/Positive/Profit.
        *   **Rose (#f43f5e)**: Bearish/Negative/Loss.
        *   **Amber (#f59e0b)**: Warning/Regulatory/Hold.
        *   **Indigo (#6366f1)**: Analysis/Neural/AI Actions.
        *   **Sky (#0ea5e9)**: Market Pulse/News/Sentiment.

#### B. The Yahoo Finance Migration (Critical Protocol)
We have standardized on Yahoo Finance to support global markets (US & India) with a single API surface.
*   **Symbol Normalization**:
    *   **US**: `AAPL`, `MSFT`.
    *   **India**: Must append suffix. `RELIANCE.NS` (NSE) is preferred over `.BO` (BSE) for liquidity.
*   **Data Fetching Strategy**:
    *   Use `quoteSummary` with the following modules for a complete picture:
        *   `assetProfile` (Business summary, sector).
        *   `financialData` (Target price, margins).
        *   `defaultKeyStatistics` (Enterprise Value, PEG, Beta).
        *   `indexTrend` (PE ratios, estimates).
        *   `earningsTrend` (Growth estimates).
        *   `insiderTransactions` (Management faith).
        *   `recommendationTrend` (Analyst buy/sell ratings).
*   **Testing**: ALWAYS run `npm run test:yahoo` after touching `functions.ts` or `scrapers.ts`. This script validates specific tickers to ensure no regression in data shape.

#### C. High-Fidelity Charting Engine (Recharts Deep Dive)
We use a highly customized implementation of Recharts to achieve financial-grade visualization.
1.  **The "DataRange" Pattern**:
    *   Recharts `Bar` component expects a single value.
    *   We pass `[min(open, close), max(open, close)]` as the `dataKey="bodyRange"`.
    *   This forces Recharts to calculate the `y` and `height` props corresponding exactly to the candle body, bypassing complex axis scaling arithmetic.
2.  **Self-Contained Candle Component**:
    *   The proprietary `Candle` component (`src/app/page.tsx`) uses a **Reverse-Engineering Scale** technique.
    *   It calculates the "Pixels-Per-Dollar" ratio internally: `ratio = props.height / Math.abs(open - close)`.
    *   It uses this ratio to draw the `High` and `Low` wicks relative to the body's `y` coordinate.
    *   *Why?* This decouples the aesthetic rendering from the library's internal state, preventing "Red Dot" or "Missing Scale" errors.
3.  **Interaction Guidelines**:
    *   **Zooms**: Managed via a styled `<Brush>` component (Height: 30px, Handle: 15px).
    *   **Tooltips**: Use 3-decimal precision (`.toFixed(3)`) for all tooltip metrics.
    *   **Controls**: dedicated "Chart Analysis" button for expanding the view; do not use hover-overlay icons.

#### D. News & Sentiment Aggregation
We do not rely on standard API news endpoints (often delayed or limited).
*   **Dual-Pipe RSS**: We aggregate RSS feeds from:
    1.  **Google News**: `https://news.google.com/rss/search?q=ticker:{SYMBOL}` (High relevance).
    2.  **Yahoo Finance**: `https://feeds.finance.yahoo.com/rss/2.0/headline?s={SYMBOL}` (High speed).
*   **Deduplication**: The `news-rss.ts` utility merges these streams, filtering out duplicates based on flexible Levenshtein distance on titles or exact URL matching.

### 4. Codebase Navigation
*   `src/app/page.tsx`: The monolithic "Dashboard". Contains state management, UI composition, and chart rendering.
*   `src/lib/functions.ts`: Core data fetching logic for US Markets.
*   `src/lib/functions-india.ts`: Core data fetching logic for Indian Markets (maintains parity with US).
*   `src/lib/ai-prompt.ts`: The "Brain". Contains the massive, structured prompt sent to Gemini.
*   `src/inngest/`: Background job definitions for generating reports.
*   `active_users.json`: Tracks user sessions (Legacy/Simple Analytics).

### 5. Implementation Status Checklist

#### ✅ Completed & Stable
*   **Unified US/India Backend**: Seamless searching for `AAPL` or `TATASTEEL.NS`.
*   **Live Charting**: Real-time price updates (polling) with Candlestick/Area toggles.
    *   *Fix*: Auto-appends `.NS` suffix for Indian stocks in both the admin panel and dashboard fetchers to ensure Yahoo Finance compatibility.
*   **Prometheus Score Intelligence**: 
    *   *Fix*: Resolved `NaN` score display for Indian stocks by implementing `0` fallback for missing US-specific metrics (like SEC/Regulatory scores) during recalculation.
    *   *UI Fix*: Enhanced tooltip contrast by explicitly setting light text colors against dark backgrounds for subscore breakdowns.
*   **RSS News Engine**: Zero-latency news feed.
*   **Institutional Intelligence**: Integration of "Insider Trades" and "Analyst Ratings" into the AI synthesis.
*   **Zoom/Pan Charts**: Fully interactive historical data navigation.

#### 🚧 In Progress / Roadmap
*   **DCF Modelling**: Logic exists in `scrapers.ts` (commented out) but need a cleaner UI implementation.
*   **PDF Export**: Users request "Download Report" functionality.
*   **Mobile Optimization**: The "Terminal" layout needs better responsiveness for vertical mobile screens.
*   **Historical Comparison**: Ability to "Diff" the current AI report against one generated 3 months ago.

### 6. Troubleshooting
*   **"Red Dot on Chart"**: This means the `Candle` component is receiving undefined `y` or `height` props. Ensure `dataKey="bodyRange"` is set on the generic `Bar` component logic in `page.tsx`.
*   **"Missing Live Chart for Indian Stocks"**: Ensure the symbol has the `.NS` suffix in the database. The system now auto-normalizes this, but check legacy entries if they fail.
*   **"Synthesizing Forever"**: Check the Supabase `realtime` inspector. If Inngest fails silently, the UI may not receive the `completed` state. Check Vercel logs for timeout errors (Gemini taking >60s).
*   **"Missing Data columns"**: Verify `scripts/test-yahoo.ts`. Yahoo often changes the object structure of `financialData`.

---
*Last Updated: Feb 01, 2026 - System Version 2.2 (The "Indian Normalization" Fix)*
