import YahooFinance from 'yahoo-finance2';

const yahooFinance = new (YahooFinance as any)({
    suppressNotices: ['ripHistorical', 'yahooSurvey']
});

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
        const quote = await yahooFinance.quote(symbol);
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
            timestamp: quote.regularMarketTime ? new Date(quote.regularMarketTime).getTime() / 1000 : Math.floor(Date.now() / 1000)
        };
    } catch (error) {
        console.error(`Yahoo Finance quote failed for ${symbol}:`, error);
        return null;
    }
}

export async function getYahooProfile(symbol: string) {
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: ['assetProfile', 'price', 'summaryDetail']
        });

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
        });

        const history = (period === 'annual'
            ? summary.incomeStatementHistory?.incomeStatementHistory
            : summary.incomeStatementHistoryQuarterly?.incomeStatementHistory) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            revenue: item.totalRevenue,
            netIncome: item.netIncome,
            operatingIncome: item.operatingIncome,
            costOfRevenue: item.costOfRevenue,
            grossProfit: item.grossProfit,
            ebitda: item.ebitda,
            eps: item.netIncome / (item.totalRevenue || 1),
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
        });

        const history = (period === 'annual'
            ? summary.balanceSheetHistory?.balanceSheetStatements
            : summary.balanceSheetHistoryQuarterly?.balanceSheetStatements) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            totalAssets: item.totalAssets,
            totalLiabilities: item.totalLiabilitiesNetMinorityInterest,
            totalStockholdersEquity: item.totalEquityGrossMinorityInterest,
            cashAndCashEquivalents: item.cashAndCashEquivalents,
            totalDebt: (item.shortLongTermDebt || 0) + (item.longTermDebt || 0),
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
        });

        const history = (period === 'annual'
            ? summary.cashflowStatementHistory?.cashflowStatements
            : summary.cashflowStatementHistoryQuarterly?.cashflowStatements) || [];

        return history.map((item: any) => ({
            date: item.endDate instanceof Date ? item.endDate.toISOString().split('T')[0] : item.endDate,
            symbol: symbol,
            netIncome: item.netIncome,
            operatingCashFlow: item.totalCashFromOperatingActivities,
            investingCashFlow: item.totalCashflowsFromInvestingActivities,
            financingCashFlow: item.totalCashFromFinancingActivities,
            capitalExpenditures: item.capitalExpenditures,
            freeCashFlow: (item.totalCashFromOperatingActivities || 0) + (item.capitalExpenditures || 0)
        }));
    } catch (error) {
        console.error(`Yahoo Finance cash flow failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooMetrics(symbol: string) {
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: ['defaultKeyStatistics', 'financialData', 'earningsTrend']
        });

        const stats = summary.defaultKeyStatistics || {};
        const financialData = summary.financialData || {};
        const trend = summary.earningsTrend || {};

        return {
            symbol: symbol,
            pe: financialData.trailingPE || stats.trailingPE,
            forwardPe: financialData.forwardPE || stats.forwardPE,
            psRatio: stats.priceToSalesTrailing12Months,
            pbRatio: stats.priceToBook,
            dividendYield: stats.dividendYield,
            roe: financialData.returnOnEquity,
            roa: financialData.returnOnAssets,
            debtToEquity: financialData.debtToEquity,
            currentRatio: financialData.currentRatio,
            quickRatio: financialData.quickRatio,
            netProfitMargin: financialData.profitMargins,
            operatingMargin: financialData.operatingMargins,
            revenueGrowth: financialData.revenueGrowth,
            earningsGrowth: financialData.earningsGrowth,
            freeCashFlow: financialData.freeCashflow,
            totalCash: financialData.totalCash,
            totalDebt: financialData.totalDebt,
            bookValue: stats.bookValue,
            beta: stats.beta,
            // Expanded stats
            enterpriseValue: stats.enterpriseValue,
            enterpriseToRevenue: stats.enterpriseToRevenue,
            enterpriseToEbitda: stats.enterpriseToEbitda,
            sharesOutstanding: stats.sharesOutstanding,
            floatShares: stats.floatShares,
            heldPercentInsiders: stats.heldPercentInsiders,
            heldPercentInstitutions: stats.heldPercentInstitutions,
            shortRatio: stats.shortRatio,
            shortPercentOfFloat: stats.shortPercentOfFloat,
            earningsTrend: trend.trend || []
        };
    } catch (error) {
        console.error(`Yahoo Finance metrics failed for ${symbol}:`, error);
        return null;
    }
}

export async function getYahooNews(symbol: string) {
    try {
        const results = await yahooFinance.search(symbol, { newsCount: 15 });
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
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: [
                'recommendationTrend',
                'earningsHistory',
                'majorHoldersBreakdown',
                'insiderTransactions',
                'calendarEvents',
                'indexTrend',
                'earningsTrend',
                'secFilings'
            ]
        });

        return {
            recommendationTrend: summary.recommendationTrend?.trend || [],
            earningsHistory: summary.earningsHistory?.history || [],
            majorHolders: summary.majorHoldersBreakdown || {},
            insiders: summary.insiderTransactions?.transactions || [],
            calendar: summary.calendarEvents || {},
            indexTrend: summary.indexTrend || {},
            earningsTrend: summary.earningsTrend?.trend || [],
            secFilings: summary.secFilings?.filings || []
        };
    } catch (error) {
        console.error(`Yahoo Finance analysis failed for ${symbol}:`, error);
    }
}

export async function getYahooSECFilings(symbol: string) {
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: ['secFilings']
        });
        return summary.secFilings?.filings || [];
    } catch (error) {
        console.error(`Yahoo Finance SEC filings failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooSustainability(symbol: string) {
    return null;
}

export async function getYahooRecommendations(symbol: string) {
    try {
        const summary = await yahooFinance.quoteSummary(symbol, {
            modules: ['recommendationTrend']
        });
        return summary.recommendationTrend?.trend || [];
    } catch (error) {
        return [];
    }
}
