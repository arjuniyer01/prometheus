import { describe, it, expect, vi } from 'vitest';
import { getCompanyProfileIndia, getFinancialStatementsIndia, getNewsIndia } from '../lib/scrapers-india';

// Mocking fetch for testing if needed, or but since we need real API keys for dev test, 
// we will assume the dev is running with environment variables.

describe('Indian Market API Integration', () => {
    const testTicker = 'LENSKART';

    it('should fetch company profile for LENSKART', async () => {
        const profile = await getCompanyProfileIndia(testTicker);
        console.log('Profile:', JSON.stringify(profile, null, 2));
        expect(profile).not.toBeNull();
        expect(profile?.symbol).toBeDefined();
        expect(profile?.price).toBeDefined();
    }, 30000);


    it('should fetch financial statements for LENSKART', async () => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit 1 req/s
        const financials = await getFinancialStatementsIndia(testTicker);
        console.log('Financials:', JSON.stringify(financials, null, 2));
        expect(financials).not.toBeNull();
    }, 30000);

    it('should fetch news for LENSKART', async () => {
        await new Promise(resolve => setTimeout(resolve, 1100)); // Rate limit 1 req/s
        const news = await getNewsIndia(testTicker);
        console.log('News count:', news.length);
        expect(Array.isArray(news)).toBe(true);
    }, 30000);


});
