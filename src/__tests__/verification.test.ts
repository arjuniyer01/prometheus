import { describe, it, expect } from 'vitest';
import {
    getAnalystRecommendations,
    getTechnicalSMA
} from '../lib/scrapers';
import {
    getHistoricalStatsIndia,
    getStockForecastsIndia,
    getStockTargetPriceIndia,
    getRecentAnnouncementsIndia
} from '../lib/scrapers-india';

describe('New Metrics Endpoint Verification', () => {

    // US Endpoints
    describe('US Market (FMP)', () => {
        const symbol = 'AAPL';

        it('should fetch Analyst Recommendations', async () => {
            const data = await getAnalystRecommendations(symbol);
            console.log(`[US] Analyst Recs for ${symbol}:`, data ? 'Success' : 'Failed');
            expect(data).toBeDefined();
        });

        it('should fetch Technical SMA 50', async () => {
            const data = await getTechnicalSMA(symbol, 50);
            console.log(`[US] SMA 50 for ${symbol}:`, data ? (Array.isArray(data) ? `Found ${data.length} pts` : 'Object Recv') : 'Failed');
            expect(data).toBeDefined();
        });
    });

    // India Endpoints
    describe('India Market (IndianAPI)', () => {
        const symbol = 'IXIGO'; // One of the reference tickers

        it('should fetch Historical Stats (Ratios)', async () => {
            await new Promise(resolve => setTimeout(resolve, 1100));
            const data = await getHistoricalStatsIndia(symbol, 'ratios');
            console.log(`[India] Ratios for ${symbol}:`, data ? 'Success' : 'Failed');
            expect(data).not.toBeNull();
        });

        it('should fetch Stock Forecasts', async () => {
            await new Promise(resolve => setTimeout(resolve, 1100));
            const data = await getStockForecastsIndia(symbol, 'EPS');
            console.log(`[India] Forecasts for ${symbol}:`, data ? 'Success' : 'Failed');
            expect(data).not.toBeNull();
        });

        it('should fetch Target Prices', async () => {
            await new Promise(resolve => setTimeout(resolve, 1100));
            const data = await getStockTargetPriceIndia(symbol);
            console.log(`[India] Target Prices for ${symbol}:`, data ? 'Success' : 'Failed');
            expect(data).not.toBeNull();
        });

        it('should fetch Recent Announcements', async () => {
            await new Promise(resolve => setTimeout(resolve, 1100));
            const data = await getRecentAnnouncementsIndia(symbol);
            console.log(`[India] Announcements for ${symbol}:`, data ? 'Success' : 'Failed');
            expect(data).not.toBeNull();
        });
    });
});
