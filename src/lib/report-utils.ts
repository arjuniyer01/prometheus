import { formatFin, formatPrice, formatMktCap, formatPercent, formatPay, formatVal } from "./formatters";

interface ReportOptions {
    insight: any;
    tickerData: any;
    selectedSymbol: string | null;
    financials: any[];
}

export const getReportMarkdown = ({
    insight,
    tickerData,
    selectedSymbol,
    financials
}: ReportOptions) => {
    if (!insight || !tickerData) return null;

    const meta = insight.metadata;
    const isIndian = insight?.metadata?.currency === 'INR' || selectedSymbol?.endsWith('.NS') || selectedSymbol?.endsWith('.BO') || tickerData?.market === 'INDIA';
    const isIndianStock = isIndian; // Alias for consistency
    const currency = isIndianStock ? "₹" : "$";
    const name = tickerData.company_name || tickerData.name || selectedSymbol;
    const date = insight.created_at ? new Date(insight.created_at).toLocaleDateString() : new Date().toLocaleDateString();

    let md = `# Prometheus Intelligence Report: ${name} (${selectedSymbol})\n`;
    md += `*Generated on ${date}*\n\n`;

    md += `## Executive Summary\n${insight.summary_text || meta.executive_summary || "No summary available."}\n\n`;

    if (meta.layman_analogy) {
        md += `## The "Explain Like I'm 5" Analogy\n> ${meta.layman_analogy}\n\n`;
    }

    md += `## Market Pulse\n`;
    md += `- **Current Price:** ${currency}${formatPrice(meta.price || meta.quote?.price || '---')}\n`;
    md += `- **Change:** ${meta.changesPercentage !== undefined ? (meta.changesPercentage && typeof meta.changesPercentage === 'object' ? (meta.changesPercentage.NSE || meta.changesPercentage.BSE) : meta.changesPercentage) + '%' : '---'}\n`;
    md += `- **Market Cap:** ${currency}${formatMktCap(meta.marketCap || '---', isIndianStock)}\n`;
    md += `- **Volume:** ${meta.volume || '---'}\n`;
    md += `- **Next Earnings:** ${meta.nextEarnings || '---'}\n`;
    md += `- **Dividend Yield:** ${meta.dividendYield || '---'}\n\n`;

    md += `## Prometheus Score: ${meta.prometheus_score}/100\n`;
    md += `**Evaluation:** ${meta.score_criteria || "N/A"}\n\n`;

    if (meta.score_breakdown) {
        md += `### Score Breakdown & Sub-Weights\n`;
        md += `- **Financial Analysis:** ${meta.score_breakdown.financial_score}/100\n`;
        if (meta.financial_subscores) {
            md += `  - *Profitability:* ${meta.financial_subscores.profitability}/100\n`;
            md += `  - *Growth:* ${meta.financial_subscores.growth}/100\n`;
            md += `  - *Solvency:* ${meta.financial_subscores.solvency}/100\n`;
        }
        md += `- **Regulatory/SEC Pulse:** ${meta.score_breakdown.sec_score}/100\n`;
        md += `- **Market Sentiment:** ${meta.score_breakdown.sentiment_score}/100\n`;
        md += `- **Momentum & Trend:** ${meta.score_breakdown.trend_score}/100\n`;
        if (meta.trend_subscores) {
            md += `  - *Quarterly Momentum:* ${meta.trend_subscores.quarterly_momentum}/100\n`;
            md += `  - *Annual Stability:* ${meta.trend_subscores.annual_stability}/100\n`;
        }
        md += `- **Sector Relative Strength:** ${meta.score_breakdown.sector_score || 0}/100\n`;
        if (meta.sector_subscores) {
            md += `  - *Outperformance vs Peers:* ${meta.sector_subscores.outperformance}/100\n`;
            md += `  - *Seasonality Strength:* ${meta.sector_subscores.seasonality_strength}/100\n`;
            md += `  - *Rotation Inflow:* ${meta.sector_subscores.rotation_inflow}/100\n`;
        }
        md += `- **Institutional Intelligence:** ${meta.score_breakdown.institutional_score || 0}/100\n`;
        if (meta.institutional_subscores) {
            md += `  - *Analyst Conviction:* ${meta.institutional_subscores.analyst_conviction}/100\n`;
            md += `  - *Insider Signal:* ${meta.institutional_subscores.insider_signal}/100\n`;
            md += `  - *Earnings Reliability:* ${meta.institutional_subscores.earnings_reliability}/100\n`;
        }
        md += `\n`;
    }

    md += `## Key Investment Cases\n`;
    md += `### 🟢 Bull Case\n`;
    (insight.bull_case || []).forEach((c: string) => md += `- ${c}\n`);
    md += `\n### 🔴 Bear Case\n`;
    (insight.bear_case || []).forEach((c: string) => md += `- ${c}\n`);
    md += `\n`;

    md += `## Deep Analysis\n`;
    md += `### 📊 Quarterly Performance\n${meta.quarterly_analysis || "N/A"}\n\n`;
    md += `### 📈 5-Year Strategy & Trends\n${meta.annual_trends || "N/A"}\n\n`;
    md += `### 🌐 Sector Intelligence\n${meta.sector_analysis || "N/A"}\n\n`;
    md += `### 🏛️ Institutional Intelligence\n${meta.institutional_analysis || "N/A"}\n\n`;
    md += `### ${isIndian ? '🏢 Corporate Actions' : '⚖️ Regulatory Synthesis'}\n${meta.sec_analysis || "N/A"}\n\n`;
    md += `### 💬 Market Pulse & News\n${meta.sentiment_summary || "N/A"}\n\n`;

    if (meta.top_headlines && meta.top_headlines.length > 0) {
        md += `#### Analyzed Research Headlines\n`;
        meta.top_headlines.forEach((n: any) => {
            md += `- **${n.headline}** (${n.source} | ${n.date ? new Date(n.date).toLocaleDateString() : 'Recent'})\n`;
        });
        md += `\n`;
    }

    md += `## Key Metrics Copilot\n`;
    md += `| Metric | Value | Status | Insight |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;
    (insight.metrics || []).forEach((m: any) => {
        const val = (m.value && typeof m.value === 'object') ? (m.value.NSE || m.value.BSE) : (m.value ?? '---');
        md += `| ${m.label} | ${val} | ${m.status?.toUpperCase()} | ${m.shortExplanation} |\n`;
    });
    md += `\n`;

    if (meta.raw_research_dump?.extended_profile?.officers) {
        md += `## Executive Bench\n`;
        md += `| Name | Title | Age | Total Pay |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        meta.raw_research_dump.extended_profile.officers.forEach((o: any) => {
            md += `| ${o.name} | ${o.title} | ${o.age || '---'} | ${formatPay(o.totalPay, isIndian)}\n`;
        });
        md += `\n`;
    }

    if (meta.raw_research_dump?.full_analysis?.insiderTransactions) {
        md += `## Recent Insider Transactions\n`;
        md += `| Filer | Relation | Value | Date |\n`;
        md += `| :--- | :--- | :--- | :--- |\n`;
        meta.raw_research_dump.full_analysis.insiderTransactions.slice(0, 10).forEach((t: any) => {
            md += `| ${t.filerName} | ${t.filerRelation} | ${formatVal(t.value, isIndian)} | ${new Date(t.startDate).toLocaleDateString()} |\n`;
        });
        md += `\n`;
    }

    md += `## Historical Financials\n`;

    if (financials.length > 0) {
        md += `### Annual (Last 5 Years)\n`;
        md += `| Period | Revenue | Net Income | Gross Margin | Net Margin | EPS | Assets | Liabilities |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        financials.filter(f => f.report_type === '10-K').slice(0, 5).forEach(f => {
            const rev = f.income_statement?.revenue || 0;
            const ni = f.income_statement?.netIncome || 0;
            const gp = f.income_statement?.grossProfit || 0;
            const gm = rev > 0 ? formatPercent(gp / rev) : '---';
            const nm = rev > 0 ? formatPercent(ni / rev) : '---';
            const eps = f.income_statement?.eps || f.income_statement?.earningsPerShare || '---';

            md += `| ${f.period} | ${currency}${formatFin(rev, isIndian)} | ${currency}${formatFin(ni, isIndian)} | ${gm} | ${nm} | ${eps} | ${currency}${formatFin(f.balance_sheet?.totalAssets || 0, isIndian)} | ${currency}${formatFin(f.balance_sheet?.totalTotalLiabilities || 0, isIndian)} |\n`;
        });
        md += `\n`;

        md += `### Quarterly (Last 5 Periods)\n`;
        md += `| Period | Revenue | Net Income | Gross Margin | Net Margin | EPS | Assets | Liabilities |\n`;
        md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
        financials.filter(f => f.report_type === '10-Q').slice(0, 5).forEach(f => {
            const rev = f.income_statement?.revenue || 0;
            const ni = f.income_statement?.netIncome || 0;
            const gp = f.income_statement?.grossProfit || 0;
            const gm = rev > 0 ? formatPercent(gp / rev) : '---';
            const nm = rev > 0 ? formatPercent(ni / rev) : '---';
            const eps = f.income_statement?.eps || f.income_statement?.earningsPerShare || '---';

            md += `| ${f.period} | ${currency}${formatFin(rev, isIndian)} | ${currency}${formatFin(ni, isIndian)} | ${gm} | ${nm} | ${eps} | ${currency}${formatFin(f.balance_sheet?.totalAssets || 0, isIndian)} | ${currency}${formatFin(f.balance_sheet?.totalTotalLiabilities || 0, isIndian)} |\n`;
        });
    } else {
        md += `*Historical financial data unavailable for this report.*\n`;
    }
    md += `\n`;

    md += `---\n*Disclaimer: This report is AI-generated for research purposes only. It does not constitute financial advice. Use as a technical co-pilot, not a sole decision maker.*`;

    return md;
};
