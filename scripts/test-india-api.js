
const INDIAN_API_KEY = 'sk-live-rZpvK9j9Ae6pLsoEKqQIHgvmz0lSXCrLL0B7PvVD';

async function fetchIndianAPI(endpoint, params = {}) {
    const url = new URL(`https://stock.indianapi.in/${endpoint}`);
    Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), {
        headers: {
            'x-api-key': INDIAN_API_KEY,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) return null;
    return response.json();
}

async function test() {
    const symbol = 'LENSKART';
    console.log(`Checking API for ${symbol}...`);

    const historical = await fetchIndianAPI('historical_data', { stock_name: symbol, period: '1mo', filter: 'price' });
    console.log('Historical Sample:', historical?.[0]);

    const statement = await fetchIndianAPI('statement', { stock_name: symbol, stats: 'quarter_results' });
    if (statement) {
        const firstKey = Object.keys(statement)[0];
        console.log('Statement Metrics:', Object.keys(statement));
        console.log('Sample Period:', Object.keys(statement[firstKey] || {})[0]);
    }
}

test();
