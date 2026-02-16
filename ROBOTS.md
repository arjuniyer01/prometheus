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
    *   **Technical Analysis Engine**: `technicalindicators` (JS-native TA-Lib implementation for RSI, MACD, BB).
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
        *   `majorHoldersBreakdown` (Ownership structure - Critical for midcaps).
        *   `secFilings` (US Regulatory data).
    *   **Validation & Error Handling Protocol**:
        *   Yahoo's strict validation often fails on complex objects like `secFilings` (e.g., unknown filing types '8-K12B').
        *   **CRITICAL**: Always use `{ validate: false }` in config.
        *   **CRITICAL**: When fetching individual modules, wrap in try/catch and check `error.result`. The library often returns the valid data *inside* the error object even if validation fails.
            ```typescript
            try { 
                await yahoo.quoteSummary(...); 
            } catch (e) { 
                if (e.result) return e.result; // Use the "failed" data
            }
            ```

#### E. Handling Global Market Nuances (India/International)
Stocks outside the US (specifically India/NSE) operate differently. The system must adapt dynamically:

1.  **Ticker Identity & Suffixing (The "Duplicate" Trap)**:
    *   **Database**: Store the ticker **EXACTLY** as the user enters it (e.g., `63MOONS`, `RELIANCE`).
    *   **Frontend**: Do **NOT** auto-append `.NS` or `.BO` in the `admin/page.tsx` or `functions-india.ts`. This causes database duplication (`TICKER` vs `TICKER.NS`).
    *   **Scrapers**: Only append `.NS` at the *last mile* when calling the Yahoo Finance API.
    *   **UI**: Detect Indian stocks via `market === 'INDIA'` or `currency === 'INR'`, not just by checking for a dot suffix.

2.  **Regulatory & Institutional Data Fallbacks**:
    *   **SEC Filings**: Do NOT exist for Indian stocks. Do not query or display standard SEC components.
    *   **Insider Pulse Fallback**: Indian mid-caps often lack `insiderTransactions`. Fallback to **NSE/BSE Corporate Actions** (Announcements) to show regulatory activity.
    *   **Analyst Coverage Fallback**: If specific Buy/Sell ratings are missing, fallback to **Shareholding Patterns** (Promoters vs Institutions vs Public). High insider ownership (>50%) is a strong signal in India.

3.  **CIK & Identity (US Specific)**:
    *   Use **CIK** (Central Index Key) for robust SEC linking.
    *   If `profile.cik` is missing (common for recent IPOs or SPACs like 'TE'), extract it from the **Edgar URL** in `secFilings` (e.g., `.../data/0001992243/...`). Persist this CIK to Supabase metadata.

#### F. High-Fidelity Charting Engine (Recharts Deep Dive)
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

#### G. News & Sentiment Aggregation
We do not rely on standard API news endpoints (often delayed or limited).
*   **Dual-Pipe RSS**: We aggregate RSS feeds from:
    1.  **Google News**: `https://news.google.com/rss/search?q=ticker:{SYMBOL}` (High relevance).
    2.  **Yahoo Finance**: `https://feeds.finance.yahoo.com/rss/2.0/headline?s={SYMBOL}` (High speed).
*   **Deduplication**: The `news-rss.ts` utility merges these streams, filtering out duplicates based on flexible Levenshtein distance on titles or exact URL matching.

#### H. Analysis Versioning & Traceability
To track the evolution of the Prometheus "Alpha" narratives, every AI insight is tagged with a release version.
*   **Version Source**: The version is derived from `git describe --tags --always --dirty`.
*   **Storage**: The version is persisted in the `metadata.analysis_version` field within the `ai_insights` table.
*   **Legacy Data**: All analyses generated prior to the versioning implementation (Feb 16, 2026) are tagged as `v0`.
*   **UI Integration**: Both the **Report Panel** (Synthesis Summary) and the **Deep Fundamental Analysis** components display the "Engine Release" tag to help researchers distinguish between different iterations of the analysis engine.

### 4. Codebase Navigation
*   `src/app/page.tsx`: The main landing page featuring the **Market Leaderboard**.
*   `src/app/terminal/page.tsx`: The high-performance research terminal (formerly the main page).
*   `src/hooks/useStockDashboard.ts`: Centralizes state management, Supabase data fetching, and real-time updates for the terminal.
*   `src/components/dashboard/Leaderboard.tsx`: The main leaderboard UI with spotlight and search.
*   `src/components/dashboard/`: Contains modular UI components:
    *   `TickerSearch.tsx`: Search and asset selection.
    *   `PriceChart.tsx`: Recharts-based charting engine (Area/Candles).
    *   `PrometheusReportPanel.tsx`: Left column (Score, Summary, Bull/Bear cases).
    *   `RegulatorySentimentPanel.tsx`: Right column (SEC, News, Sentiment).
    *   `FinancialsTable.tsx`: Historical P&L and Balance Sheet.
    *   `DeepFundamentalAnalysis.tsx`: Strategy and trend analysis.
    *   `PrometheusScore.tsx`: Draggable priority knobs and score computation.
    *   `InstitutionalIntelligence.tsx`: Ownership and institutional data.
    *   `ExecutiveBench.tsx`: Management and compensation data.
*   `src/lib/formatters.ts`: Unified financial formatting utilities.
*   `src/lib/report-utils.ts`: Markdown report generation logic.
*   `src/lib/functions.ts`: Core data fetching logic for US Markets.
*   `src/lib/functions-india.ts`: Core data fetching logic for Indian Markets (maintains parity with US).
*   `src/lib/ai-prompt.ts`: The "Brain". Contains the massive, structured prompt sent to Gemini.
*   `src/inngest/`: Background job definitions for generating reports.
*   `active_users.json`: Tracks user sessions (Legacy/Simple Analytics).

### 5. Implementation Status Checklist

#### ✅ Completed & Stable
*   **Unified US/India Backend**: Seamless searching for `AAPL` or `TATASTEEL.NS`.
*   **Live Charting**: Real-time price updates (polling) with Candlestick/Area toggles.
*   **Prometheus Score Intelligence**: 
    *   *Fix*: Resolved `NaN` score display for Indian stocks by implementing `0` fallback for mixing US-specific metrics.
    *   *Fix*: UI now explicitly highlights "Data Unavailable" states rather than showing broken components.
*   **RSS News Engine**: Zero-latency news feed.
*   **Institutional Intelligence**: 
    *   Adaptive layout that prioritizes **Ownership Structure** for mid-caps.
    *   Fallback to **Regulatory Pulse** (Corporate Actions) when insider trades are missing.
*   **Zoom/Pan Charts**: Fully interactive historical data navigation.
*   **Market Leaderboard**: Central index of all analyzed assets with Prometheus Score ranking and search.

#### 🚧 In Progress / Roadmap
*   **DCF Modelling**: Logic exists in `scrapers.ts` (commented out) but need a cleaner UI implementation.
*   **PDF Export**: Users request "Download Report" functionality.
*   **Mobile Optimization**: The "Terminal" layout needs better responsiveness for vertical mobile screens.
*   **Historical Comparison**: Ability to "Diff" the current AI report against one generated 3 months ago.

### 6. Troubleshooting
*   **"Red Dot on Chart"**: This means the `Candle` component is receiving undefined `y` or `height` props. Ensure `dataKey="bodyRange"` is set on the generic `Bar` component logic in `page.tsx`.
*   **"Missing Live Chart for Indian Stocks"**: Check if `market === 'INDIA'`. The UI handles adding the `.NS` suffix for the *link* to Yahoo, but the internal symbol lookup might need the raw ID.
*   **"Synthesizing Forever"**: Check the Supabase `realtime` inspector. If Inngest fails silently, the UI may not receive the `completed` state. Check Vercel logs for timeout errors (Gemini taking >60s).
*   **"Missing Data columns"**: Verify `scripts/test-yahoo.ts`. Yahoo often changes the object structure of `financialData` or `secFilings`.
*   **"Duplicate Tickers (e.g. 63MOONS vs 63MOONS.NS)"**: You likely used a version of the admin panel that auto-suffixed the ticker. Run `scripts/cleanup-duplicates.ts` (if available) or manually delete the `.NS` variant from Supabase.
*   **"ReferenceError: Cannot access 'X' before initialization"**: In large `useCallback` hooks (like `downloadReport` in `page.tsx`), standard JavaScript scoping applies. Helper functions defined with `const` must be declared *before* they are used. They are not hoisted like `function` declarations.

---
*Last Updated: Feb 16, 2026 - System Version 2.4 (The "Alpha Discovery & Leaderboard" Update)*
