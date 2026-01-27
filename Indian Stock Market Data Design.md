This specialized design document focuses on the data architecture and API integration required to pivot your platform for the **Indian Stock Market (NSE/BSE)** while maintaining a low cost-to-entry.

# **DESIGN\_INDIA.MD: Indian Financial Intelligence Platform**

## **1\. Data Strategy: The "Zero-Cost" Indian Stack**

The primary challenge with Indian market data is that global aggregators (FMP, Finnhub) treat it as a "Global" premium tier. To build this cost-effectively, the architecture pivots to **local Indian broker APIs** and specialized **domestic aggregators** that offer free or significantly cheaper developer tiers.

### **1.1 Primary Data Providers**

| Data Type | Primary Source | Cost | Key Advantage |
| :---- | :---- | :---- | :---- |
| **Real-time & Historical Prices** | **Upstox API v3** | **Free** | 50 req/sec limit; includes WebSocket for live ticks. |
| **Alternative Price Source** | **Angel One SmartAPI** | **Free** | Easy integration; no subscription cost for market data. |
| **Financials (P\&L, Balance Sheet)** | **IndianAPI.in** | **Free Tier** | Detailed financial data specifically for BSE/NSE listed companies. |
| **Corporate Filings & Actions** | **FinEdge API** | **Free/Cheap** | Covers 5000+ companies; provides structured P\&L and Balance Sheets. |
| **News & Sentiment** | **Marketaux** | **Free Tier** | Includes global and Indian news with pre-calculated sentiment scores. |

## ---

**2\. Technical Architecture: Data Pipeline Adjustments**

### **2.1 The "Bhavcopy" Ingestion Engine**

Unlike US markets, the Indian exchange (NSE) releases a daily "Bhavcopy" (a comprehensive file of all trade data).

* **Pipeline Logic**: Instead of calling 5,000 individual stock endpoints, the system will use a **Supabase Edge Function** triggered at 4:30 PM IST (post-market) to download the Bhavcopy.  
* **Implementation**: Use Upstox or Angel One's instrument master list to map symbols to instrument\_keys.

### **2.2 Handling Indian Financials (The "Statement" Challenge)**

Indian companies report in a specific format (Standalone vs. Consolidated). The AI must be tuned to differentiate these.

* **API Endpoint**: Use https://stock.indianapi.in/statement to fetch structured P\&L and Cash Flow data.  
* **Format Conversion**: Data from IndianAPI.in often returns as JSON; this is fed directly into **Gemini 3 Flash** for summarization, bypassing the need for complex internal parsers.

### **2.3 SEBI Filings and Announcements**

SEBI (Securities and Exchange Board of India) does not currently offer an EDGAR-equivalent REST API for free.

* **Aggregation Strategy**: Use the **Indian Stock Market API** "Recent Announcements" endpoint to track corporate disclosures.  
* **Intelligence Layer**: Use Gemini 3 Flash's **web grounding** to "search" for the latest PDF links of annual reports if they are not yet in the structured database.

## ---

**3\. Implementation Details for Gemini 3 Flash**

### **3.1 Prompting for Indian Context**

Gemini 3 Flash must be instructed on Indian-specific financial terminology (e.g., "Crores" vs "Millions", "Lakhs", "Standalone vs Consolidated").

**System Prompt Snippet**:

Role: Indian Equity Research Analyst.

Context: You are analyzing stocks on the NSE/BSE.

Constraints:

1. Convert all 'Crore' and 'Lakh' values to standard numeric format if requested, but keep them in Indian notation for the UI.  
2. Differentiate between 'Standalone' results (just the parent company) and 'Consolidated' (includes subsidiaries).  
3. Use the 'layman terms' requirement to explain Indian-specific taxes (GST) or regulations (SEBI mandates).

### **3.2 Context Caching for Cost Efficiency**

Since Indian retail investors often follow the same 50 "blue chip" stocks (Nifty 50), implement **Gemini Context Caching**.

* Cache the full Annual Report (PDF/Text) of Nifty 50 companies for 24 hours.  
* Reduces token costs by \~90% for subsequent user requests for the same stock.

## ---

**4\. API Endpoints for Coding Assistant**

Provide these specific URLs to your coding assistant for the data pipeline:

1. **Ticker Search**: https://stock.indianapi.in/search?query={symbol}  
2. **Market Quote**: https://api.upstox.com/v3/market-quote/quotes  
3. **Financial Statements**: https://stock.indianapi.in/statement?symbol={symbol}  
4. **News & Sentiment**: https://api.marketaux.com/v1/news/all?symbols={symbol}\&filter\_entities=true  
5. **Corporate Actions**: https://stock.indianapi.in/corporate-actions?symbol={symbol}

## ---

**5\. Deployment & Scalability on Vercel**

* **Rate Limit Protection**: Indian broker APIs (like Upstox) are generous (50 req/sec) but strict. Use **Inngest** to throttle requests during peak morning hours (9:15 AM \- 10:00 AM IST).  
* **Caching Layer**: Store all financials responses in a Supabase jsonb column with a valid\_until timestamp. Only trigger a new API call if the data is \> 24 hours old.

## **6\. Summary of Key Differences from US Design**

* **Currency Handling**: UI must handle INR (₹) symbols and Indian numbering systems (1,00,000).  
* **Broker Dependency**: Moves away from pure data providers (FMP) to Broker-as-a-Service (Upstox/Angel One) to get free data.  
* **Bhavcopy Integration**: Adds a scheduled task to ingest daily exchange files for local historical data storage.