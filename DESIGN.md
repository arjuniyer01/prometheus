# **Prometheus Financial Intelligence Platform: Architectural Design Specification**

## **1\. Executive Summary and Strategic Vision**

### **1.1 The Paradigm Shift in Financial Research**

The domain of financial market research has historically been characterized by a sharp bifurcation in access and capability. On one end of the spectrum lie institutional terminals—Bloomberg, FactSet, and Eikon—which offer exhaustive data, millisecond latency, and deep analytical tools, but command price points exceeding $25,000 annually per seat.1 On the other end are retail-focused platforms that prioritize simplified user interfaces over analytical depth, often presenting fragmented data without the necessary context to form a cohesive investment thesis.

The Prometheus Financial Intelligence Platform represents a distinct architectural evolution designed to bridge this chasm. By leveraging the convergence of three technological inflection points—serverless edge computing, commoditized real-time financial data, and frontier-class multimodal Artificial Intelligence—Prometheus aims to democratize institutional-grade analysis. The system is not merely a data aggregator; it is an *intelligence engine* designed to synthesize unlimited heterogeneous data sources (standardized financials, unstructured regulatory filings, news feeds, and social sentiment) into a unified, "Single View" dashboard.

The core value proposition of Prometheus rests on the integration of **Gemini 2.5 Flash Lite**, Google’s frontier multimodal model released in late 2025\.2 Unlike previous generations of Large Language Models (LLMs) that required complex Retrieval-Augmented Generation (RAG) pipelines to handle large documents, Gemini 2.5 Flash Lite’s 1 million token context window allows for the holistic ingestion of entire 10-K annual reports, earnings call transcripts, and months of news history in a single inference pass.4 This capability enables the system to produce "layman terms" summaries that identify second-order correlations—such as the link between a supply chain risk buried in a footnote and a sudden spike in negative social sentiment—that human analysts might miss due to information overload.

### **1.2 Design Philosophy: Aggregated Truth and Visual Clarity**

The architectural philosophy governing Prometheus is built upon the concept of "Aggregated Truth." In modern markets, price action is rarely a function of fundamental valuation alone; it is the vector sum of regulatory constraints, macroeconomic shifts, and mass psychology. Therefore, a research platform cannot isolate these vectors. The architecture must ingest data from **Financial Modeling Prep (FMP)** for hard numbers 5, the **SEC EDGAR** system for regulatory truth 6, **Finnhub** for news sentiment 7, and social aggregators for retail psychology.

To visualize this multi-dimensional dataset without overwhelming the user, the frontend employs an **Institutional Monochrome** design system. This is not a purely aesthetic choice but a functional one. Digital assets like the "Engineer" monolith (`engineer.svg`) provide a grounded, high-presence brand identity. By utilizing translucency, background blur, and depth hierarchies, the interface allows users to perceive data layering—seeing "through" the immediate price action to the underlying news or sentiment trends that support it. The "Single View" requirement mandates a Bento Grid layout where no critical information is hidden behind a scroll or a click, necessitating a high-performance rendering engine capable of managing dense information layouts without visual clutter.

### **1.3 Technical Stack Selection and Justification**

The technology stack for Prometheus is selected to optimize for scalability, developer velocity, and cost-efficiency in a high-concurrency environment.

* **Frontend Framework: Next.js (App Router)**: Selected for its hybrid rendering capabilities. The financial dashboard requires the SEO benefits of Server-Side Rendering (SSR) for public ticker pages, combined with the interactivity of Client-Side Rendering (CSR) for real-time charts. The App Router’s support for React Server Components allows for efficient data fetching directly from the edge, minimizing client bundle size.9  
* **Deployment Infrastructure: Vercel**: Vercel provides the optimal environment for Next.js, offering zero-configuration global edge scaling. However, the constraints of serverless functions (specifically the 10-60 second execution timeouts) necessitate a robust asynchronous architecture for long-running data ingestion tasks.10  
* **Backend Persistence: Supabase**: As an open-source Firebase alternative built on PostgreSQL, Supabase provides the relational integrity required for financial time-series data while offering jsonb flexibility for unstructured API responses.11 Its built-in Realtime engine (via PostgreSQL replication) replaces legacy polling mechanisms, pushing price and sentiment updates to the client instantly.9  
* **Orchestration: Inngest**: To circumvent Vercel’s timeout limits during intensive tasks—such as scraping and parsing a 200-page SEC XBRL filing—Inngest is utilized as a reliable event queue. It allows for "fan-out" workflows where a single user request triggers parallel fetching jobs that run asynchronously, updating the UI upon completion.12  
* **AI Intelligence: Gemini 2.5 Flash Lite**: Chosen over GPT-4o or Claude 3.5 Sonnet primarily for its cost-to-performance ratio in long-context tasks. At $0.50 per 1 million input tokens 13, Gemini 2.5 Flash Lite makes it economically viable to process full financial reports for every user request, a feat that would be cost-prohibitive with other models.

## ---

**2\. Comprehensive Data Strategy and Market Analysis**

### **2.1 The Financial Data Ecosystem: Vendor Selection**

The foundation of any research platform is the reliability and breadth of its data. The market for financial APIs in 2025 is crowded, necessitating a rigorous selection process based on data normalization, latency, coverage, and cost.

#### **2.1.1 Primary Fundamental Data: Financial Modeling Prep (FMP)**

For the core financial dataset—Income Statements, Balance Sheets, and Cash Flows—**Financial Modeling Prep (FMP)** is selected as the primary provider. While competitors like **Alpha Vantage** and **Polygon.io** offer robust services, FMP distinguishes itself through its focus on fundamental data standardization.5

* **Standardization Utility**: Raw data from SEC filings is often messy; companies use non-standard XBRL tags (e.g., "GrossRevenue" vs. "Revenues" vs. "Sales"). FMP’s standardization engine maps these disparate tags to a unified schema, ensuring that a "Revenue" query returns consistent data across Apple, Tesla, and a regional bank.  
* **Historical Depth**: FMP provides up to 30 years of historical data, which is critical for the AI model to identify long-term trends and cyclicality.5  
* **Cost Efficiency**: Compared to Bloomberg’s terminal fees, FMP’s enterprise tiers provide API access at a fraction of the cost, with generous rate limits suitable for a high-traffic SaaS application.

| Feature | Financial Modeling Prep | Polygon.io | Alpha Vantage | Decision for Prometheus |
| :---- | :---- | :---- | :---- | :---- |
| **Real-Time Prices** | Yes (NASDAQ/NYSE) | Yes (Ultra-low latency) | Yes (Delayed often) | **FMP** (Sufficient latency) |
| **Financial Statements** | Standardized, 30+ Years | Limited History | Basic, less standardized | **FMP** (Critical for analysis) |
| **WebSockets** | Supported | Best in Class | Limited | **FMP** (Good balance) |
| **Cost** | Mid-range | High ($199+/mo) | Low/Free | **FMP** (Best value) |
| **Institutional Focus** | High | High (Trading focus) | Low (Retail focus) | **FMP** |

#### **2.1.2 Real-Time Price Action and Market Data**

While FMP handles fundamentals, the system requires a high-velocity stream for price action. Although Polygon.io is the gold standard for tick-level data, the architectural complexity of integrating a second major provider for price alone is unnecessary for a *research* platform (vs. a *day trading* platform). FMP’s real-time endpoints, which offer 1-minute to daily intervals, provide sufficient granularity for research purposes.5 The system will implement a caching layer in Supabase to store these candles, creating a proprietary historical database over time.

### **2.2 Regulatory Truth: The SEC EDGAR Pipeline**

Reliance on third-party APIs for regulatory filings introduces a point of failure and a latency lag. Prometheus implements a direct ingestion pipeline from the **SEC EDGAR** system to ensure the highest fidelity of data.

* **Mechanism**: The system monitors the SEC’s RSS feeds (https://www.sec.gov/sec/edgar/feeds) for new filings (8-K, 10-K, 10-Q) in real-time.17  
* **XBRL Parsing**: Modern filings are submitted in Inline XBRL (iXBRL). The ingestion engine must parse these XML-based documents to extract specific "facts" (e.g., a sudden change in "LegalProceedings" text).  
* **Rate Limiting Constraints**: The SEC strictly enforces a rate limit of 10 requests per second.18 Exceeding this results in an immediate IP ban. This constraint dictates the backend architecture: individual user clients cannot fetch data directly from the SEC. Instead, a central "GovCloud" worker queue manages all SEC outgoing requests, strictly throttling them to 5-8 requests per second to maintain a safety buffer.19  
* **User-Agent Compliance**: To comply with SEC "Internet Security Policy," all requests must include a specific User-Agent header identifying the application and an administrative contact (e.g., User-Agent: PrometheusResearch admin@prometheus.com).20

### **2.3 News, Sentiment, and Social Signals**

To capture the "Psychology" vector, Prometheus aggregates unstructured text data from news and social platforms.

* **News Aggregation**: **Finnhub** is utilized for its curated "Market News" endpoint, which aggregates stories from major outlets (Bloomberg, CNBC, Reuters) and, crucially, provides a proprietary "News Sentiment" score.7 This pre-computed score allows the dashboard to display a "Bullish/Bearish" news meter without needing to run expensive NLP on every single article.  
* **Social Sentiment**: Retail sentiment is a powerful driver of volatility. The system integrates data from **StockTwits** and **Reddit** (via FMP’s social sentiment endpoints or specialized aggregators like ApeWisdom).21  
  * **Twitter/X Limitations**: The Twitter API v2 pricing is prohibitive for startup-scale academic research tiers ($100/mo for minimal access).22 Therefore, Prometheus relies on FMP’s aggregated social sentiment data, which acts as a proxy for Twitter activity, avoiding the direct cost and complexity of the X API.

### **2.4 Data Normalization and The "Hydra" Schema**

The ingestion system, internally codenamed "Hydra," is responsible for normalizing these disparate streams into a coherent internal schema.

* **Challenge**: FMP might call a field revenue, the SEC calls it Revenues, and a news article refers to "Top Line Sales."  
* **Solution**: The Hydra pipeline maps all incoming data to a canonical set of internal identifiers (prometheus\_id). For example, data from all sources for "Apple Inc." is mapped to ticker: AAPL.  
* **Storage Strategy**: Hard, structured data (price, P/E ratio) is stored in normalized PostgreSQL tables. Unstructured, variable data (financial statement line items, news bodies) is stored in jsonb columns. This "Hybrid Schema" allows for the flexibility of a NoSQL document store within the rigid safety of a relational database.11

## ---

**3\. The Intelligence Engine: Gemini 2.5 Flash Lite Integration**

### **3.1 The Strategic Advantage of Gemini 2.5 Flash Lite**

The release of **Gemini 2.5 Flash Lite** in late 2025 marked a pivotal moment for AI-driven financial analysis. Prior models faced a "Context Dilemma": high-intelligence models (like GPT-4) were too expensive and slow for full-document analysis, while fast models lacked the reasoning capabilities to interpret nuances in financial footnotes. Gemini 2.5 Flash Lite resolves this with three key attributes:

1. **1 Million Token Context Window**: This allows the system to ingest roughly 700,000 words of text in a single prompt.3 A typical 10-K annual report is 100,000 words. This means Prometheus can feed the model the last *five* years of annual reports plus recent news, all at once.  
2. **Cost Efficiency**: Priced at approximately $0.50 per 1 million input tokens 13, analyzing a full annual report costs roughly $0.05. This is orders of magnitude cheaper than equivalent processing with GPT-4o, making it feasible to offer this analysis to every user on demand.  
3. **Multimodal Capabilities**: Gemini 2.5 Flash Lite can ingest images and charts.24 This allows Prometheus to pass screenshots of complex price charts or investor presentation slides to the AI, enabling it to "see" technical patterns or visual data that isn't present in the text.

### **3.2 The "Death of RAG" in Financial Analysis**

Traditionally, building a "Chat with your Data" feature required **Retrieval-Augmented Generation (RAG)**. This involved:

1. Chunking a PDF into small paragraphs.  
2. Creating vector embeddings for each chunk.  
3. Retrieving the "top 5" most relevant chunks based on a user's question.  
4. Sending those chunks to the LLM.

**The Flaw in RAG for Finance**: RAG suffers from "retrieval loss." If a user asks "What are the risks?", the vector search might miss a critical risk factor buried in a footnote because it didn't share keywords with the query. **The Gemini 3 Solution**: With a 1M context window, we do not need RAG. We pass the *entire document*. The model can perform "needle in a haystack" retrieval with near-perfect accuracy.4 It can synthesize the *whole* picture, connecting a risk mentioned on page 5 with a financial table on page 105\. This holistic analysis is critical for regulatory compliance and accurate risk assessment.

### **3.3 Prompt Engineering for "Layman Terms"**

The core user requirement is to translate complex financial jargon into "layman terms." This requires sophisticated system prompting.

**System Prompt Structure**:

Role: You are an expert financial analyst and educator with a talent for explaining complex Wall Street concepts to Main Street investors.

Task: Analyze the provided 10-K filing, recent news, and financial ratios for {TICKER}.

Constraints:

1. Tone: Professional yet accessible. Use analogies (e.g., "Think of Free Cash Flow as the savings left over after paying the mortgage").  
2. Objectivity: Do not offer financial advice. State facts and risks.  
3. Clarity: If you use a term like "EBITDA", immediately define it in parentheses.

Output Requirement:

Produce a JSON object adhering to the schema provided. Do not output markdown or conversational text outside the JSON.

### **3.4 Structured Output and JSON Schema**

To ensure the AI's output can be rendered predictably by the Next.js frontend, we utilize Gemini's **Structured Output** feature (Controlled Generation).25 We pass a strict JSON schema to the API, forcing the model to respond in a format that perfectly matches our TypeScript interfaces.

**JSON Schema Definition**:

JSON

{  
  "type": "object",  
  "properties": {  
    "executive\_summary": { "type": "string" },  
    "layman\_analogy": { "type": "string", "description": "A simple analogy for the company's business model" },  
    "bull\_case": { "type": "array", "items": { "type": "string" } },  
    "bear\_case": { "type": "array", "items": { "type": "string" } },  
    "risk\_factors": {  
      "type": "array",  
      "items": {  
        "type": "object",  
        "properties": {  
          "risk": { "type": "string" },  
          "severity": { "type": "string", "enum": \["Low", "Medium", "High", "Critical"\] },  
          "source\_page": { "type": "integer" }  
        }  
      }  
    }  
  }  
}

This guarantees that the dashboard never breaks due to a hallucinated formatting error. For Prometheus, we have extended this to include a `sentiment_score` (0-100) and `top_headlines` mapping to drive the dynamic Market Pulse engine.

### **3.5 Context Caching for Cost Optimization**

While input tokens are cheap, re-sending the same 10-K (100k tokens) for every user request is inefficient. Gemini 2.5 Flash Lite supports **Context Caching**.13

* **Mechanism**: The system uploads the 10-K text to Gemini's cache once. A cache\_id is returned.  
* **Usage**: Subsequent requests for that ticker reference the cache\_id.  
* **Economics**: Cached input tokens are significantly cheaper (or free for a period) compared to fresh uploads, and latency is reduced because the model doesn't need to re-process the massive context. This is crucial for maintaining margins in a SaaS business model.

## ---

**4\. Backend Architecture: Supabase and Inngest**

### **4.1 The "Hybrid" Database Schema**

Financial data presents a dichotomy: market data is structured and rigid, while filings and news are unstructured and variable. Prometheus utilizes Supabase (PostgreSQL) to implement a hybrid schema that captures the best of both SQL and NoSQL worlds.

#### **4.1.1 Normalized Tables for Core Entities**

Core entities that require referential integrity and fast joins are strictly normalized.

**Table: public.tickers**

* symbol (Primary Key, Text): The stock ticker (e.g., AAPL).  
* company\_name (Text).  
* sector (Text).  
* industry (Text).  
* last\_updated\_at (Timestamp).

**Table: public.market\_data (Time-Series)**

* symbol (FK).  
* timestamp (Timestamp).  
* open, high, low, close (Numeric).  
* volume (BigInt).  
* **Partitioning**: This table is partitioned by month (e.g., market\_data\_2026\_01) to ensure query performance remains constant as the dataset grows into billions of rows.23

#### **4.1.2 JSONB for Flexible Data**

Financial statements are stored as jsonb. This allows the system to ingest the exact JSON response from FMP without needing to create columns for every possible accounting line item (which vary by industry).

**Table: public.financials**

* id (UUID).  
* symbol (FK).  
* period (Date): The fiscal quarter/year end.  
* report\_type (Enum: '10-K', '10-Q').  
* data (JSONB): The full JSON object from FMP (e.g., {"revenue": 100, "costOfRevenue": 60,...}).  
* **Indexing**: A GIN index is created on the data column to allow for high-performance querying of nested fields (e.g., SELECT \* FROM financials WHERE data-\>\>'revenue' \> '1000000').11

### **4.2 The Vercel Timeout Problem and Inngest Solution**

A critical architectural challenge in serverless environments like Vercel is the **Execution Timeout**.

* **Constraint**: Vercel functions have a hard limit of 10 seconds (Hobby) or 60 seconds (Pro).10  
* **Problem**: A comprehensive analysis workflow—fetching 10 years of data, scraping the SEC, and waiting for Gemini to generate a summary—can easily take 30-90 seconds. A synchronous API call would fail.  
* **Solution: Inngest**. Prometheus employs Inngest as a durable execution engine to handle these long-running workflows asynchronously.12

**The Workflow**:

1. **Trigger**: User clicks "Analyze AAPL".  
2. **API**: Next.js API route pushes an event analyze.requested to Inngest and immediately returns 202 Accepted to the client.  
3. **Inngest Worker**:  
   * **Step 1 (Parallel Fetch)**: Spawns parallel jobs to fetch FMP data, scrape SEC, and pull news.  
   * **Step 2 (Wait)**: Waits for all data to arrive.  
   * **Step 3 (AI)**: Sends consolidated data to Gemini 2.5 Flash Lite.  
   * **Step 4 (Persist)**: Saves the result to Supabase ai\_insights table.  
4. **Realtime Update**: Supabase detects the INSERT and pushes the new data to the client via WebSocket.

### **4.3 Supabase Realtime for "Alive" UX**

To create the feeling of a live trading terminal, the frontend subscribes to Supabase Realtime channels.

* **Channel**: realtime:market\_data listens for new price rows.  
* **Channel**: realtime:ai\_insights listens for the completion of AI analysis jobs. This eliminates the need for the client to poll the API ("Are you done yet?"), significantly reducing server load and improving the user experience.9

### **4.4 Edge Functions for Scraping**

To avoid IP bans from the SEC, scraping logic is deployed to **Supabase Edge Functions** (running on Deno).

* **IP Rotation**: Edge functions are distributed globally. While they don't offer built-in proxy rotation, they decouple the scraping IP from the main Vercel backend IP.  
* **Security**: These functions execute in a secure, isolated environment, protecting the main application from potential malicious code within scraped HTML content.26

## ---

**5\. Frontend Engineering: Next.js and Glassmorphism**

### **5.1 The "Single View" Dashboard Philosophy**

The user requirement specifies a "Single View" application. This dictates a **Bento Grid** layout—a dense, modular grid of information tiles that fills the viewport without requiring page scrolling. This design maximizes information density, allowing the user to correlate price charts, sentiment meters, and AI summaries in a single glance.

### **5.2 Next.js App Router Implementation**

The application is built using the **Next.js App Router** to leverage the latest React features.

* **Server Components**: The layout shell and static chart containers are React Server Components (RSC). This reduces the initial JavaScript bundle size sent to the client.  
* **Streaming & Suspense**: The dashboard is wrapped in \<Suspense\> boundaries. The layout loads instantly, while the data-heavy components (charts, AI summary) stream in as they become available. This prevents the "blank white screen" effect common in heavy SPAs.9  
* **Server Actions**: Form submissions (e.g., searching for a ticker) utilize Server Actions to trigger the Inngest workflow directly from the server, eliminating the need for separate API route handlers for simple mutations.

### **5.3 Implementing the Glassmorphism Design System**

Glassmorphism is the defining aesthetic of Prometheus. It conveys a sense of modernity and depth.

* **Tailwind CSS Configuration**: To achieve the effect, we extend the Tailwind theme with custom utilities.8  
  JavaScript  
  // tailwind.config.js  
  theme: {  
    extend: {  
      colors: {  
        'glass-surface': 'rgba(255, 255, 255, 0.05)',  
        'glass-border': 'rgba(255, 255, 255, 0.1)',  
      },  
      backdropBlur: {  
        'xs': '2px',  
        'xl': '20px',  
      }  
    }  
  }

* **The Glass Card**: The fundamental UI unit is the GlassCard.  
  JavaScript  
  \<div className="bg-glass-surface backdrop-blur-xl border border-glass-border rounded-2xl shadow-lg"\>  
    {children}  
  \</div\>

* **Layering Strategy**:  
  * **Background**: A deep, animated mesh gradient (aurora style) provides the light source.  
  * **Layer 1 (Base)**: The main dashboard grid.  
  * **Layer 2 (Overlay)**: Modals and dropdowns use a higher blur (backdrop-blur-2xl) and higher opacity to separate themselves from the base layer.  
* **Accessibility**: Glassmorphism can suffer from contrast issues. We strictly enforce WCAG AA standards by ensuring that text overlaying glass panels has sufficient contrast against the background gradient. White text on dark glass is the primary mode.

### **5.4 Advanced Data Visualization**

Standard charting libraries produce flat, opaque charts that clash with the glass aesthetic. We utilize **Recharts** with heavy customization to create "Neon Glass" charts.28

* **Gradients**: Area charts use SVG \<linearGradient\> definitions to fade the fill color from semi-transparent to fully transparent, blending seamlessly into the glass background.  
* **Glow Effects**: SVG filters (\<filter\>) are applied to the chart lines to create a "neon glow" effect, enhancing the futuristic feel.  
* **Custom Tooltips**: The chart tooltip is a custom React component styled as a mini GlassCard, floating above the data points.

## ---

**6\. Operational, Security, and Compliance Considerations**

### **6.1 Rate Limiting and Fair Usage**

To protect the system from abuse and stay within API vendor limits:

* **Global Rate Limit**: Implementing upstash/ratelimit (Redis-based) in the Next.js Middleware to limit users to a set number of analysis requests per hour (e.g., 50 requests/hour for Pro users).  
* **Queue Throttling**: The Inngest queues for FMP and SEC are configured with concurrency limits. Even if 1,000 users request data simultaneously, the system will only process 10 SEC requests per second, queuing the rest. This ensures strict compliance with the SEC's 10 req/s limit.19

### **6.2 Security Architecture**

* **Row Level Security (RLS)**: Supabase RLS is the primary defense line.  
  * public data (tickers, prices) is read-only for authenticated users.  
  * private data (user watchlists) is restricted to auth.uid() \= user\_id.  
* **Environment Variables**: All API keys (FMP, Gemini, Supabase Service Role) are stored in Vercel Encrypted Environment Variables and are never exposed to the client bundle.  
* **Input Validation**: Zod schemas are used to validate all user inputs (ticker symbols) to prevent SQL injection or command injection attacks.

### **6.3 Compliance and Attribution**

* **Data Attribution**: Per FMP and Finnhub terms of service, a "Data provided by..." footer is displayed on the dashboard.  
* **AI Disclaimer**: A prominent disclaimer is placed on all AI-generated content: "Generated by AI. Information may be inaccurate. Not financial advice." This is critical for liability mitigation.

## ---

**7\. Conclusion and Future Outlook**

### **7.1 The Commoditization of Analysis**

Prometheus represents a shift in the value chain of financial research. Historically, the value lay in *access* to data. Today, with data becoming a commodity (cheap APIs) and intelligence becoming accessible (Gemini 2.5 Flash Lite), the value shifts to **Synthesis** and **User Experience**. Prometheus captures this value by acting as the synthesis layer, converting raw data streams into actionable narratives.

### **7.2 Scalability and Roadmap**

The architecture is designed for scale.

* **Phase 1**: Current architecture (Supabase \+ Inngest).  
* **Phase 2 (Scale)**: As the dataset grows, the market\_data table can be migrated to a dedicated **TimescaleDB** instance or **ClickHouse** cluster for sub-millisecond analytical queries on billions of rows.29  
* **Agentic Future**: The next evolution involves "Agentic" workflows where the user doesn't just ask for a report but assigns tasks: "Monitor AAPL and alert me if the P/E ratio drops below 25 AND sentiment turns positive." The current Inngest infrastructure is perfectly positioned to support these long-running, stateful agent loops.

By fusing the transparency of Glassmorphism with the depth of Gemini 2.5 Flash Lite, Prometheus delivers a tool that is not only powerful but intuitive—a true "Heads-Up Display" for the modern market participant.

# ---

**Detailed Technical Specifications and Implementation Guide**

## **8\. Appendix A: Detailed Schema Definitions**

*(See Section 4.1 for core logic. This section expands on specific DDL statements.)*

SQL

\-- ENABLE EXTENSIONS  
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  
CREATE EXTENSION IF NOT EXISTS "pg\_trgm"; \-- For fuzzy search on tickers  
CREATE EXTENSION IF NOT EXISTS "vector"; \-- For future RAG capabilities (optional)

\-- 1\. TICKERS TABLE  
CREATE TABLE public.tickers (  
    symbol TEXT PRIMARY KEY,  
    company\_name TEXT NOT NULL,  
    exchange TEXT, \-- 'NASDAQ', 'NYSE', etc.  
    sector TEXT,  
    industry TEXT,  
    description TEXT,  
    website TEXT,  
    is\_active BOOLEAN DEFAULT TRUE,  
    last\_updated\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    \-- Cached fundamentals for quick filtering/sorting in the UI  
    market\_cap BIGINT,  
    pe\_ratio NUMERIC(10, 2),  
    dividend\_yield NUMERIC(5, 4)  
);

\-- Search Index  
CREATE INDEX idx\_tickers\_search ON public.tickers USING GIN (symbol gin\_trgm\_ops, company\_name gin\_trgm\_ops);

\-- 2\. MARKET DATA (Time-Series)  
\-- We use standard partitioning for scalability.  
CREATE TABLE public.market\_data (  
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

\-- Partitions for 2025-2026  
CREATE TABLE market\_data\_y2025m12 PARTITION OF public.market\_data  
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');  
CREATE TABLE market\_data\_y2026m01 PARTITION OF public.market\_data  
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');  
\-- (Script to auto-generate future partitions would be handled by a Supabase cron job)

\-- 3\. FINANCIALS (Unstructured/Hybrid)  
CREATE TABLE public.financials (  
    id UUID DEFAULT uuid\_generate\_v4() PRIMARY KEY,  
    symbol TEXT NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,  
    period DATE NOT NULL, \-- Fiscal period end date  
    report\_type TEXT CHECK (report\_type IN ('10-K', '10-Q', 'TTM')),  
      
    \-- We store the raw JSON from FMP here to avoid schema migrations for every new metric  
    income\_statement JSONB DEFAULT '{}'::jsonb,  
    balance\_sheet JSONB DEFAULT '{}'::jsonb,  
    cash\_flow JSONB DEFAULT '{}'::jsonb,  
      
    source\_url TEXT, \-- Link to the SEC filing  
    crawled\_at TIMESTAMPTZ DEFAULT NOW(),  
      
    UNIQUE(symbol, period, report\_type)  
);

\-- Indexing JSONB for performance  
\-- Example: Query for companies with revenue \> 1B  
CREATE INDEX idx\_financials\_revenue ON public.financials USING gin ((income\_statement\-\>'revenue'));

\-- 4\. AI INSIGHTS (The Intelligence Layer)  
CREATE TABLE public.ai\_insights (  
    id UUID DEFAULT uuid\_generate\_v4() PRIMARY KEY,  
    symbol TEXT NOT NULL REFERENCES public.tickers(symbol) ON DELETE CASCADE,  
    created\_at TIMESTAMPTZ DEFAULT NOW(),  
    model\_version TEXT DEFAULT 'gemini-3-flash',  
      
    \-- The Structured Output from Gemini  
    summary\_text TEXT, \-- "Layman's" summary  
    sentiment\_score NUMERIC(3, 2), \-- \-1.0 to 1.0  
      
    \-- Storing complex lists as JSONB  
    bull\_case JSONB, \-- \["Point 1", "Point 2"\]  
    bear\_case JSONB,  
    risk\_factors JSONB,  
      
    \-- Metadata  
    context\_tokens\_used INTEGER,  
    execution\_time\_ms INTEGER  
);

\-- RLS POLICIES  
ALTER TABLE public.tickers ENABLE ROW LEVEL SECURITY;  
CREATE POLICY "Public Read Tickers" ON public.tickers FOR SELECT USING (true);  
CREATE POLICY "Service Write Tickers" ON public.tickers FOR ALL TO service\_role USING (true);  
\-- (Similar policies for other tables)

## **9\. Appendix B: Inngest Workflow Configuration**

The following TypeScript code illustrates the Inngest function structure for the "Hydra" pipeline.

TypeScript

import { inngest } from "./client";  
import { supabase } from "./supabase";  
import { fetchFMP, scrapeSEC, getNews } from "./scrapers";  
import { generateGeminiInsight } from "./ai";

export const analyzeTicker \= inngest.createFunction(  
  { name: "Analyze Ticker Full Workflow" },  
  { event: "app/analyze.requested" },  
  async ({ event, step }) \=\> {  
    const { ticker } \= event.data;

    // Step 1: Fan-out fetching  
    // These run in parallel. Inngest handles retries for each independently.  
    const \[financials, secFilings, news\] \= await step.run(  
      "fetch-external-data",  
      async () \=\> {  
        return Promise.all();  
      }  
    );

    // Step 2: Prepare Context  
    // Consolidating data into a prompt context string  
    const context \= {  
      financials: financials.slice(0, 4), // Last 4 quarters  
      filing\_text: secFilings.latest\_10k\_text, // The massive string  
      news\_headlines: news.map(n \=\> n.title)  
    };

    // Step 3: AI Synthesis  
    // Sending to Gemini 2.5 Flash Lite  
    const insights \= await step.run("generate-ai-insight", async () \=\> {  
      return await generateGeminiInsight(context);  
    });

    // Step 4: Persist  
    // Writing back to Supabase to trigger Realtime updates  
    await step.run("persist-results", async () \=\> {  
      await supabase.from("ai\_insights").insert({  
        symbol: ticker,  
       ...insights  
      });  
    });

    return { status: "success", ticker };  
  }  
);

## **10\. Appendix C: Component Comparison \- Recharts vs Visx**

Comparison of charting libraries for the "Glass" dashboard.

| Feature | Recharts | Visx (Airbnb) | Choice |
| :---- | :---- | :---- | :---- |
| **API Style** | Declarative (Component-based) | Low-level (Primitives) | **Recharts** (Speed of Dev) |
| **Customizability** | High (via props/sub-components) | Extreme (D3 wrapper) | **Recharts** (Sufficient) |
| **Bundle Size** | Moderate | Modular/Small | **Visx** (Better, but marginal) |
| **Animation** | Built-in (Transitions) | Manual (React Spring) | **Recharts** (Easier) |
| **SVG Filters** | Supported (via defs) | Supported | **Both** |
| **Learning Curve** | Low | High | **Recharts** |

**Conclusion**: Recharts is selected for the MVP and V1 due to its declarative nature and ease of use. Visx is reserved as a fallback if extreme performance optimizations (e.g., rendering 10,000 candles) become necessary in V2.

## **11\. Appendix D: Cost Analysis Projection**

Hypothetical monthly cost for 1,000 active users running 10 analyses/day.

* **FMP API**: Enterprise Plan ($200/mo) \- Flat rate.  
* **Vercel Pro**: $20/seat \+ Bandwidth. Estimated $100/mo.  
* **Supabase Pro**: $25/mo \+ Usage. Estimated $50/mo.  
* **Inngest**: Free Tier (initially), then usage-based. Estimated $0.  
* **Gemini 2.5 Flash Lite**:  
  * 10 analyses \* 1,000 users \* 30 days \= 300,000 requests.  
  * Avg input tokens (cached context): 5,000 (queries \+ news) \* 300k \= 1.5 Billion tokens.  
  * Avg input tokens (fresh context 10%): 100,000 \* 30,000 \= 3 Billion tokens.  
  * Total Tokens: 4.5 Billion.  
  * Price: $0.50 / 1M.  
  * Total AI Cost: 4,500 \* $0.50 \= **$2,250/mo**.  
* **Optimization**: This AI cost is high.  
* **Mitigation Strategy**: Implement strict caching. If User A analyzes AAPL at 9:00 AM, and User B analyzes AAPL at 9:10 AM, serve the cached result. Do not re-run Gemini. With a 24-hour TTL on AI summaries, requests drop by 90% (assuming overlap in popular tickers).  
* **Revised AI Cost**: \~$225/mo.

This detailed cost model validates the feasibility of the architecture for a SaaS business model.

#### **Works cited**

1. JerBouma/FinanceDatabase: This is a database of 300.000+ symbols containing Equities, ETFs, Funds, Indices, Currencies, Cryptocurrencies and Money Markets. \- GitHub, accessed January 25, 2026, [https://github.com/JerBouma/FinanceDatabase](https://github.com/JerBouma/FinanceDatabase)  
2. Release notes | Gemini API \- Google AI for Developers, accessed January 25, 2026, [https://ai.google.dev/gemini-api/docs/changelog](https://ai.google.dev/gemini-api/docs/changelog)  
3. Gemini 3 Developer Guide | Gemini API \- Google AI for Developers, accessed January 25, 2026, [https://ai.google.dev/gemini-api/docs/gemini-3](https://ai.google.dev/gemini-api/docs/gemini-3)  
4. Long context | Gemini API \- Google AI for Developers, accessed January 25, 2026, [https://ai.google.dev/gemini-api/docs/long-context](https://ai.google.dev/gemini-api/docs/long-context)  
5. Free Stock Market API and Financial Statements API... | FMP, accessed January 25, 2026, [https://site.financialmodelingprep.com/developer/docs](https://site.financialmodelingprep.com/developer/docs)  
6. API Documentation \- SEC-API.io, accessed January 25, 2026, [https://sec-api.io/docs](https://sec-api.io/docs)  
7. Finnhub Stock APIs \- Real-time stock prices, Company fundamentals, Estimates, and Alternative data., accessed January 25, 2026, [https://finnhub.io/](https://finnhub.io/)  
8. How To Implement Glassmorphism With Tailwind CSS Easily? \- FlyonUI, accessed January 25, 2026, [https://flyonui.com/blog/glassmorphism-with-tailwind-css/](https://flyonui.com/blog/glassmorphism-with-tailwind-css/)  
9. Realtime Chart with Supabase and Tremor | by Varga György Márk | Shiwaforce \- Medium, accessed January 25, 2026, [https://medium.com/shiwaforce/realtime-chart-with-supabase-and-tremor-169600a99bf6](https://medium.com/shiwaforce/realtime-chart-with-supabase-and-tremor-169600a99bf6)  
10. How to solve Next.js timeouts \- Inngest Blog, accessed January 25, 2026, [https://www.inngest.com/blog/how-to-solve-nextjs-timeouts](https://www.inngest.com/blog/how-to-solve-nextjs-timeouts)  
11. Managing JSON and unstructured data | Supabase Docs, accessed January 25, 2026, [https://supabase.com/docs/guides/database/json](https://supabase.com/docs/guides/database/json)  
12. Next.js Quick Start \- Inngest Documentation, accessed January 25, 2026, [https://www.inngest.com/docs/getting-started/nextjs-quick-start](https://www.inngest.com/docs/getting-started/nextjs-quick-start)  
13. Gemini Developer API pricing, accessed January 25, 2026, [https://ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing)  
14. Best Real-Time Stock Market Data APIs in 2026 | Co... | FMP \- Financial Modeling Prep, accessed January 25, 2026, [https://site.financialmodelingprep.com/education/other/best-realtime-stock-market-data-apis-in-](https://site.financialmodelingprep.com/education/other/best-realtime-stock-market-data-apis-in-)  
15. Financial Data APIs 2025: Complete Guide & Comparison \- Kyle Redelinghuys, accessed January 25, 2026, [https://www.ksred.com/the-complete-guide-to-financial-data-apis-building-your-own-stock-market-data-pipeline-in-2025/](https://www.ksred.com/the-complete-guide-to-financial-data-apis-building-your-own-stock-market-data-pipeline-in-2025/)  
16. Alpha Vantage: Free Stock APIs in JSON & Excel, accessed January 25, 2026, [https://www.alphavantage.co/](https://www.alphavantage.co/)  
17. Developer Resources \- SEC.gov, accessed January 25, 2026, [https://www.sec.gov/about/developer-resources](https://www.sec.gov/about/developer-resources)  
18. Accessing EDGAR Data \- SEC.gov, accessed January 25, 2026, [https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data](https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data)  
19. SEC to apply new rate control limits to EDGAR websites, accessed January 25, 2026, [https://www.sec.gov/filergroup/announcements-old/new-rate-control-limits](https://www.sec.gov/filergroup/announcements-old/new-rate-control-limits)  
20. Webmaster Frequently Asked Questions \- SEC.gov, accessed January 25, 2026, [https://www.sec.gov/about/webmaster-frequently-asked-questions](https://www.sec.gov/about/webmaster-frequently-asked-questions)  
21. Historical Social Sentiment API \- Legacy \- Financial Modeling Prep, accessed January 25, 2026, [https://site.financialmodelingprep.com/developer/docs/social-sentiment-api](https://site.financialmodelingprep.com/developer/docs/social-sentiment-api)  
22. xdevplatform/getting-started-with-the-twitter-api-v2-for-academic-research \- GitHub, accessed January 25, 2026, [https://github.com/xdevplatform/getting-started-with-the-twitter-api-v2-for-academic-research](https://github.com/xdevplatform/getting-started-with-the-twitter-api-v2-for-academic-research)  
23. Postgres jsonb column or standard normalized table? \- Database Administrators Stack Exchange, accessed January 25, 2026, [https://dba.stackexchange.com/questions/221955/postgres-jsonb-column-or-standard-normalized-table](https://dba.stackexchange.com/questions/221955/postgres-jsonb-column-or-standard-normalized-table)  
24. Gemini 3 Flash: frontier intelligence built for speed \- Google Blog, accessed January 25, 2026, [https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/](https://blog.google/products-and-platforms/products/gemini/gemini-3-flash/)  
25. Structured outputs | Gemini API \- Google AI for Developers, accessed January 25, 2026, [https://ai.google.dev/gemini-api/docs/structured-output](https://ai.google.dev/gemini-api/docs/structured-output)  
26. Edge Functions | Supabase Docs, accessed January 25, 2026, [https://supabase.com/docs/guides/functions](https://supabase.com/docs/guides/functions)  
27. Glass-Morphism UI implementation in React.Js | by Suryank Singh | Medium, accessed January 25, 2026, [https://medium.com/@suryanksingh/glass-morphism-ui-implementation-in-react-js-b9238545869d](https://medium.com/@suryanksingh/glass-morphism-ui-implementation-in-react-js-b9238545869d)  
28. Awesome React Charts Tips: Gradients, Overlays and Responsive SSR in Recharts, accessed January 25, 2026, [https://leanylabs.com/blog/awesome-react-charts-tips/](https://leanylabs.com/blog/awesome-react-charts-tips/)  
29. timescaledb: Time-Series data | Supabase Docs, accessed January 25, 2026, [https://supabase.com/docs/guides/database/extensions/timescaledb](https://supabase.com/docs/guides/database/extensions/timescaledb)  
30. Adding Real Time Analytics to a Supabase Application With ClickHouse, accessed January 25, 2026, [https://clickhouse.com/blog/adding-real-time-analytics-to-a-supabase-application](https://clickhouse.com/blog/adding-real-time-analytics-to-a-supabase-application)