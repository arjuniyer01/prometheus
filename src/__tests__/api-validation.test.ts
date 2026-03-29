import { describe, it, expect } from 'vitest';
import { getHistoricalPrices } from "../lib/scrapers";

describe('External API Validation', () => {
    const fmpKey = process.env.FMP_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;

    it('FMP API should be accessible and return valid data', async () => {
        expect(fmpKey, 'FMP_API_KEY is missing').toBeDefined();

        // Using the stable endpoint format validated earlier
        const res = await fetch(`https://financialmodelingprep.com/stable/profile?symbol=AAPL&apikey=${fmpKey}`);
        const data = await res.json();

        expect(res.ok).toBe(true);
        expect(Array.isArray(data)).toBe(true);
        expect(data[0].symbol).toBe('AAPL');
        expect(data[0].companyName).toBe('Apple Inc.');
    });

    it('Finnhub API should return valid news structure for UI', async () => {
        expect(finnhubKey, 'FINNHUB_API_KEY is missing').toBeDefined();

        // Testing with a recent range
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2025-01-01&to=2025-01-10&token=${finnhubKey}`);
        const data = await res.json();

        expect(res.ok).toBe(true);
        expect(Array.isArray(data)).toBe(true);
        if (data.length > 0) {
            expect(data[0].headline).toBeDefined();
            expect(data[0].url).toBeDefined();
            expect(data[0].source).toBeDefined();
            expect(data[0].datetime).toBeDefined();
        }
    });

    it('Supabase should be accessible and have the correct schema', async () => {
        const { supabase } = await import('@/lib/supabase');

        // Check connection by querying the tickers table
        const { data, error } = await supabase.from('tickers').select('count');

        expect(error).toBeNull();
        expect(data).toBeDefined();
    });

    it('SEC EDGAR API should be reachable (Rate Limited)', async () => {
        // Apple's CIK with leading zeros
        const cik = "0000320193";
        const res = await fetch(`https://data.sec.gov/submissions/CIK${cik}.json`, {
            headers: {
                'User-Agent': 'Prometheus Financial Intelligence (contact@example.com)'
            }
        });

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.entityType).toBe('operating');
        expect(data.name).toContain('Apple Inc.');
    });

    it('FMP Historical Price API should return time-series data', async () => {
        expect(fmpKey, 'FMP_API_KEY is missing').toBeDefined();
        // Use the function directly to validate its logic
        const data = await getHistoricalPrices('AAPL');
        console.log('Test Data for AAPL:', JSON.stringify(data.slice(0, 1)));
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThan(0);
        expect(data[0].close).toBeDefined();
        expect(data[0].date).toBeDefined();
    });
});
