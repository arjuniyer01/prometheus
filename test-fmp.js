
const FMP_KEY = "KauaxDN1EIMvDATv6wCnGQt7zAGtwwCy";

async function test() {
    console.log("Testing FMP URLs for TE...");

    const urls = [
        `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=TE&limit=30&apikey=${FMP_KEY}`,
        `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=NVDA&limit=30&apikey=${FMP_KEY}`,
        `https://financialmodelingprep.com/api/v3/historical-price-full/TE?timeseries=30&apikey=${FMP_KEY}`,
        `https://financialmodelingprep.com/api/v3/historical-price-full/TE?serietype=line&timeseries=30&apikey=${FMP_KEY}`
    ];

    const finnhubKey = "c2epf62ad3i9kmvstpsg";
    const to = Math.floor(Date.now() / 1000);
    const from = to - (30 * 24 * 60 * 60);

    const finnhubUrls = [
        `https://finnhub.io/api/v1/stock/candle?symbol=TE&resolution=D&from=${from}&to=${to}&token=${finnhubKey}`,
        `https://finnhub.io/api/v1/stock/candle?symbol=NVDA&resolution=D&from=${from}&to=${to}&token=${finnhubKey}`
    ];

    for (const url of [...urls, ...finnhubUrls]) {
        try {
            const res = await fetch(url);
            const data = await res.json();
            console.log(`URL: ${url}`);
            console.log(`Status: ${res.status}`);
            console.log(`Data Type: ${Array.isArray(data) ? 'Array' : typeof data}`);
            if (Array.isArray(data)) console.log(`Length: ${data.length}`);
            else if (data.historical) console.log(`Historical Length: ${data.historical.length}`);
            else console.log(`Keys: ${Object.keys(data).join(', ')}`);
            console.log("---");
        } catch (e) {
            console.log(`URL: ${url} - FAILED: ${e.message}`);
        }
    }
}

test();
