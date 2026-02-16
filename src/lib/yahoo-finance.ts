import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)();

// Helper to safely extract raw value from Yahoo Finance objects
function toRaw(val: any): any {
    if (val === null || val === undefined) return val;
    if (typeof val === 'object' && 'raw' in val) return val.raw;
    return val;
}

if (typeof (yahooFinance as any).setGlobalConfig === 'function') {
    (yahooFinance as any).setGlobalConfig({
        validation: {
            logErrors: false,
            throwErrors: false
        }
    });
}

export async function getYahooHistoricalPrices(symbol: string) {
    try {
        const queryOptions = {
            period1: new Date(new Date().setFullYear(new Date().getFullYear() - 5)),
            period2: new Date(),
            interval: '1d' as const,
        };

        const results = (await yahooFinance.historical(symbol, queryOptions)) as any;

        return results.map((quote: any) => ({
            date: quote.date instanceof Date ? quote.date.toISOString().split('T')[0] : quote.date,
            close: quote.close,
            open: quote.open,
            high: quote.high,
            low: quote.low,
            volume: quote.volume,
            symbol: symbol
        }));
    } catch (error) {
        console.error(`Yahoo Finance historical prices failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooQuote(symbol: string) {
    try {
        const quote: any = await yahooFinance.quote(symbol);
        if (!quote) return null;

        return {
            price: quote.regularMarketPrice,
            change: quote.regularMarketChange,
            changesPercentage: quote.regularMarketChangePercent,
            marketCap: quote.marketCap,
            dayLow: quote.regularMarketDayLow,
            dayHigh: quote.regularMarketDayHigh,
            yearLow: quote.fiftyTwoWeekLow,
            yearHigh: quote.fiftyTwoWeekHigh,
            volume: quote.regularMarketVolume,
            avgVolume: quote.averageDailyVolume3Month,
            pe: quote.trailingPE,
            eps: quote.trailingEps,
            currency: quote.currency,
            timestamp: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : new Date().toISOString()
        };
    } catch (error) {
        console.error(`Yahoo Finance quote failed for ${symbol}:`, error);
        return null;
    }
}

export async function getYahooProfile(symbol: string) {
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: ['assetProfile', 'price', 'summaryDetail']
        }, { validate: false });

        const profile = summary.assetProfile || {};
        const price = summary.price || {};
        const detail = summary.summaryDetail || {};

        return {
            symbol: symbol,
            companyName: price.longName || price.shortName || symbol,
            exchange: price.exchangeName,
            industry: profile.industry,
            sector: profile.sector,
            description: profile.longBusinessSummary,
            website: profile.website,
            mktCap: price.marketCap,
            price: price.regularMarketPrice,
            changes: price.regularMarketChange,
            changesPercentage: price.regularMarketChangePercent,
            fullAddress: `${profile.address1 || ''}, ${profile.city || ''}, ${profile.state || ''}, ${profile.zip || ''}, ${profile.country || ''}`,
            phone: profile.phone,
            employees: profile.fullTimeEmployees,
            isIndia: symbol.endsWith('.NS') || symbol.endsWith('.BO'),
            // New metadata
            officers: profile.companyOfficers || [],
            maxAge: detail.maxAge,
            dividendRate: detail.dividendRate,
            dividendYield: detail.dividendYield,
            exDividendDate: detail.exDividendDate,
            fiveYearAvgDividendYield: detail.fiveYearAvgDividendYield,
            beta: detail.beta,
            trailingPE: detail.trailingPE,
            forwardPE: detail.forwardPE,
            volume: detail.volume,
            averageVolume: detail.averageVolume,
            bid: detail.bid,
            ask: detail.ask,
            dayLow: detail.dayLow,
            dayHigh: detail.dayHigh,
            fiftyTwoWeekLow: detail.fiftyTwoWeekLow,
            fiftyTwoWeekHigh: detail.fiftyTwoWeekHigh
        };
    } catch (error) {
        console.error(`Yahoo Finance profile failed for ${symbol}:`, error);
        return null;
    }
}

export async function getYahooIncomeStatement(symbol: string, period: 'annual' | 'quarter' = 'annual') {
    try {
        const module = period === 'annual' ? 'incomeStatementHistory' : 'incomeStatementHistoryQuarterly';
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: [module]
        }, { validate: false });

        const history = (period === 'annual'
            ? summary.incomeStatementHistory?.incomeStatementHistory
            : summary.incomeStatementHistoryQuarterly?.incomeStatementHistory) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            revenue: toRaw(item.totalRevenue),
            netIncome: toRaw(item.netIncome),
            operatingIncome: toRaw(item.operatingIncome),
            costOfRevenue: toRaw(item.costOfRevenue),
            grossProfit: toRaw(item.grossProfit),
            ebitda: toRaw(item.ebitda),
            eps: toRaw(item.netIncome) / (toRaw(item.totalRevenue) || 1),
        }));
    } catch (error) {
        console.error(`Yahoo Finance income statement failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooBalanceSheet(symbol: string, period: 'annual' | 'quarter' = 'annual') {
    try {
        const module = period === 'annual' ? 'balanceSheetHistory' : 'balanceSheetHistoryQuarterly';
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: [module]
        }, { validate: false });

        const history = (period === 'annual'
            ? summary.balanceSheetHistory?.balanceSheetStatements
            : summary.balanceSheetHistoryQuarterly?.balanceSheetStatements) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            totalAssets: toRaw(item.totalAssets),
            totalLiabilities: toRaw(item.totalLiabilitiesNetMinorityInterest),
            totalStockholdersEquity: toRaw(item.totalEquityGrossMinorityInterest),
            cashAndCashEquivalents: toRaw(item.cashAndCashEquivalents),
            totalDebt: (toRaw(item.shortLongTermDebt) || 0) + (toRaw(item.longTermDebt) || 0),
        }));
    } catch (error) {
        console.error(`Yahoo Finance balance sheet failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooCashFlow(symbol: string, period: 'annual' | 'quarter' = 'annual') {
    try {
        const module = period === 'annual' ? 'cashflowStatementHistory' : 'cashflowStatementHistoryQuarterly';
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: [module]
        }, { validate: false });

        const history = (period === 'annual'
            ? summary.cashflowStatementHistory?.cashflowStatements
            : summary.cashflowStatementHistoryQuarterly?.cashflowStatements) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            netIncome: toRaw(item.netIncome),
            operatingCashFlow: toRaw(item.totalCashFromOperatingActivities),
            investingCashFlow: toRaw(item.totalCashflowsFromInvestingActivities),
            financingCashFlow: toRaw(item.totalCashFromFinancingActivities),
            capitalExpenditures: toRaw(item.capitalExpenditures),
            freeCashFlow: (toRaw(item.totalCashFromOperatingActivities) || 0) + (toRaw(item.capitalExpenditures) || 0)
        }));
    } catch (error) {
        console.error(`Yahoo Finance cash flow failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooMetrics(symbol: string) {
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: ['defaultKeyStatistics', 'financialData', 'earningsTrend']
        }, { validate: false });

        const stats = summary.defaultKeyStatistics || {};
        const financialData = summary.financialData || {};
        const trend = summary.earningsTrend || {};

        return {
            symbol: symbol,
            pe: toRaw(financialData.trailingPE || stats.trailingPE),
            forwardPe: toRaw(financialData.forwardPE || stats.forwardPE),
            psRatio: toRaw(stats.priceToSalesTrailing12Months),
            pbRatio: toRaw(stats.priceToBook),
            dividendYield: toRaw(stats.dividendYield),
            roe: toRaw(financialData.returnOnEquity),
            roa: toRaw(financialData.returnOnAssets),
            debtToEquity: toRaw(financialData.debtToEquity),
            currentRatio: toRaw(financialData.currentRatio),
            quickRatio: toRaw(financialData.quickRatio),
            netProfitMargin: toRaw(financialData.profitMargins),
            operatingMargin: toRaw(financialData.operatingMargins),
            revenueGrowth: toRaw(financialData.revenueGrowth),
            earningsGrowth: toRaw(financialData.earningsGrowth),
            freeCashFlow: toRaw(financialData.freeCashflow),
            totalCash: toRaw(financialData.totalCash),
            totalDebt: toRaw(financialData.totalDebt),
            bookValue: toRaw(stats.bookValue),
            beta: toRaw(stats.beta),
            // Expanded stats
            enterpriseValue: toRaw(stats.enterpriseValue),
            enterpriseToRevenue: toRaw(stats.enterpriseToRevenue),
            enterpriseToEbitda: toRaw(stats.enterpriseToEbitda),
            sharesOutstanding: toRaw(stats.sharesOutstanding),
            floatShares: toRaw(stats.floatShares),
            heldPercentInsiders: toRaw(stats.heldPercentInsiders),
            heldPercentInstitutions: toRaw(stats.heldPercentInstitutions),
            shortRatio: toRaw(stats.shortRatio),
            shortPercentOfFloat: toRaw(stats.shortPercentOfFloat),
            earningsTrend: trend.trend || []
        };
    } catch (error) {
        console.error(`Yahoo Finance metrics failed for ${symbol}:`, error);
        return null;
    }
}

export async function getYahooNews(symbol: string) {
    try {
        const results: any = await yahooFinance.search(symbol, { newsCount: 50 });
        return (results.news || []).map((n: any) => ({
            title: n.title,
            url: n.link,
            source: n.publisher,
            date: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null,
            snippet: n.title
        }));
    } catch (error) {
        console.error(`Yahoo Finance news failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooAnalysis(symbol: string) {
    const modules: any = [
        'recommendationTrend',
        'earningsHistory',
        'majorHoldersBreakdown',
        'insiderTransactions',
        'calendarEvents',
        'indexTrend',
        'earningsTrend',
        'secFilings'
    ];

    const results: any = {};

    // Attempt to fetch all at once first (fastest)
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, { modules }, { validate: false });
        Object.assign(results, summary);
    } catch (error: any) {
        console.warn(`Yahoo Finance batch analysis failed for ${symbol}, falling back to individual module fetch. Error: ${error.message}`);

        // If batch fails (common for internal-error on certain modules), try them one by one
        await Promise.all(modules.map(async (mod: string) => {
            try {
                const res = await yahooFinance.quoteSummary(symbol, { modules: [mod] }, { validate: false });
                results[mod] = res[mod];
            } catch (e: any) {
                // IMPORTANT: If validation fails, the data might still be in e.result
                if (e.result && e.result[mod]) {
                    results[mod] = e.result[mod];
                }
            }
        }));
    }

    const summary = results;
    const filings = summary.secFilings?.filings || [];
    let cik = null;
    if (filings.length > 0 && filings[0].edgarUrl) {
        const match = filings[0].edgarUrl.match(/_(\d+)$/);
        if (match) cik = match[1];
    }

    return {
        recommendationTrend: summary.recommendationTrend?.trend || [],
        earningsHistory: summary.earningsHistory?.history || [],
        majorHolders: summary.majorHoldersBreakdown || {},
        insiders: summary.insiderTransactions?.transactions || [],
        calendar: summary.calendarEvents || {},
        indexTrend: summary.indexTrend || {},
        earningsTrend: summary.earningsTrend?.trend || [],
        secFilings: filings,
        cik: cik
    };
}

export async function getYahooSECFilings(symbol: string) {
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: ['secFilings']
        }, { validate: false });
        return summary.secFilings?.filings || [];
    } catch (error: any) {
        console.error(`Yahoo Finance SEC filings failed for ${symbol}:`, error.message);
        if (error.result) {
            return error.result.secFilings?.filings || [];
        }
        return [];
    }
}

export async function getYahooSustainability(symbol: string) {
    return null;
}

export async function getYahooRecommendations(symbol: string) {
    try {
        const summary: any = await yahooFinance.quoteSummary(symbol, {
            modules: ['recommendationTrend']
        }, { validate: false });
        return summary.recommendationTrend?.trend || [];
    } catch (error) {
        return [];
    }
}
