
const FMP_KEY = "KauaxDN1EIMvDATv6wCnGQt7zAGtwwCy";

async function test() {
    const symbols = ['AAPL', 'MSFT', 'NVDA'];
    const endpoints = [
        `api/v3/investor_presentation`,
        `api/v3/investor-presentation`,
        `api/v4/investor-presentation`,
        `api/v3/presentation`,
        `api/v4/presentation`
    ];

    for (const sym of symbols) {
        for (const ep of endpoints) {
            const url = `https://financialmodelingprep.com/${ep}?symbol=${sym}&apikey=${FMP_KEY}`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                console.log(`SYM: ${sym} | EP: ${ep} | STATUS: ${res.status}`);
                if (res.ok && Array.isArray(data) && data.length > 0) {
                    console.log(`>> FOUND DATA: ${data.length} items`);
                    break;
                }
            } catch (e) {
                // ignore
            }
        }
    }
}

test();
