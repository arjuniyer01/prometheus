
const INDIAN_API_KEY = 'sk-live-rZpvK9j9Ae6pLsoEKqQIHgvmz0lSXCrLL0B7PvVD';

async function fetchIndianAPI(endpoint, params = {}) {
    const url = new URL(`https://stock.indianapi.in/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
        headers: { 'x-api-key': INDIAN_API_KEY, 'Content-Type': 'application/json' }
    });
    if (!response.ok) return null;
    return response.json();
}

async function test() {
    const symbol = 'LENSKART';
    console.log(`--- Checking /statement for ${symbol} ---`);
    const quarter = await fetchIndianAPI('statement', { stock_name: symbol, stats: 'quarter_results' });
    console.log('Quarter Result:', quarter ? 'Found' : 'Null');
    if (quarter) console.log('Keys:', Object.keys(quarter).slice(0, 5));

    console.log(`\n--- Checking /stock for ${symbol} ---`);
    const stock = await fetchIndianAPI('stock', { name: symbol });
    console.log('Stock Profile:', stock ? 'Found' : 'Null');
    if (stock && stock.financials) {
        console.log('Financials in /stock count:', stock.financials.length);
        console.log('First entry EndDate:', stock.financials[0].EndDate);
    }
}

test();
