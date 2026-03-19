# Analyze Stock

Analyze a stock ticker and persist the results to the Prometheus database.

## Arguments
- $ARGUMENTS: The ticker symbol(s) and optional market. Examples: "NVDA", "RELIANCE INDIA", "AAPL MSFT GOOG"

## Instructions

You are the AI analysis engine for Prometheus. You replace Gemini. Follow this workflow exactly:

### Step 1: Parse Arguments
- Extract ticker symbol(s) from `$ARGUMENTS`
- If the word "INDIA" appears, set market to INDIA, otherwise US
- For Indian tickers, the user may omit .NS/.BO — that's fine, the scraper handles it

### Step 2: For each ticker, run the data fetch
```bash
npx tsx scripts/fetch-stock-data.ts <TICKER> <MARKET>
```
- Redirect stdout to `/tmp/prometheus-<TICKER>.json`
- This fetches all Yahoo Finance data and calculates deterministic scores

### Step 3: Read the fetched data
- Read `/tmp/prometheus-<TICKER>.json` to understand the company's financials

### Step 4: Generate the AI Analysis
You ARE the AI. Using the fetched data, generate a JSON object with this exact structure:

```json
{
  "executive_summary": "2-3 sentence overview of current health",
  "layman_analogy": "Creative analogy for the business model",
  "sec_analysis": "2-sentence synthesis of SEC filings / regulatory news",
  "quarterly_analysis": "3-sentence deep dive into last 5 quarters",
  "annual_trends": "3-sentence summary of 5-year trajectory",
  "sector_analysis": "3-sentence analysis vs sector, seasonality, rotation",
  "institutional_analysis": "3-sentence synthesis of analyst consensus, insider behavior, earnings",
  "sentiment_summary": "2-sentence synthesis of headlines",
  "sentiment_score": 0-100,
  "intrinsic_value": <fair value per share number>,
  "valuation_analysis": "2-sentence DCF/multiples explanation",
  "score_breakdown": {
    "financial_score": <use deterministic score>,
    "sec_score": 0-100,
    "sentiment_score": 0-100,
    "trend_score": <use deterministic score>,
    "sector_score": 0-100,
    "institutional_score": 0-100
  },
  "financial_subscores": { "profitability": 0-100, "growth": 0-100, "solvency": 0-100 },
  "trend_subscores": { "quarterly_momentum": 0-100, "annual_stability": 0-100 },
  "sector_subscores": { "outperformance": 0-100, "seasonality_strength": 0-100, "rotation_inflow": 0-100 },
  "institutional_subscores": { "analyst_conviction": 0-100, "insider_signal": 0-100, "earnings_reliability": 0-100 },
  "financial_formula": "financial + technical + Qualitative Alpha",
  "financial_score_drivers": [{ "label": "string", "impact": "positive|negative" }],
  "prometheus_score": "(financial_score * 0.40) + (trend_score * 0.20) + (sec_score * 0.10) + (sentiment_score * 0.10) + (sector_score * 0.10) + (institutional_score * 0.10)",
  "score_criteria": "Short explanation of why this score",
  "metrics": [
    { "label": "string", "value": "string", "status": "positive|neutral|negative", "shortExplanation": "string", "technicalDefinition": "string" }
  ],
  "bull_case": ["string"],
  "bear_case": ["string"]
}
```

**Scoring Rules:**
- `financial_score` and `trend_score` MUST come from the deterministic scores in the fetched data
- You score the qualitative 40%: sec_score, sentiment_score, sector_score, institutional_score
- `prometheus_score` = (financial_score * 0.40) + (trend_score * 0.20) + (sec_score * 0.10) + (sentiment_score * 0.10) + (sector_score * 0.10) + (institutional_score * 0.10)
- Be opinionated like a hedge fund analyst. Positive/negative, not neutral unless truly unremarkable.

**Metrics Array:** Include 25-30 metrics covering: Current Price, Market Cap, 52-Week High/Low, Revenue, Net Income, EPS, P/E, P/S, P/B, Dividend Yield, ROE, Revenue Growth, Current Ratio, Debt/Equity, Interest Coverage, Cash, Operating Margin, Net Margin, Institutional Holdings, 50/200 DMA, Latest Quarterly figures, Analyst Rating, Risk Category.

### Step 5: Persist
- Write the combined JSON to `/tmp/prometheus-<TICKER>-analysis.json` with structure: `{ "rawData": <fetched data>, "aiAnalysis": <your analysis> }`
- Run: `npx tsx scripts/persist-analysis.ts /tmp/prometheus-<TICKER>-analysis.json`

### Step 6: Report
- Show the user the Prometheus Score, executive summary, bull/bear case, and key metrics in a formatted output
- If multiple tickers, process them sequentially
