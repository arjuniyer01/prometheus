
const FMP_KEY = "KauaxDN1EIMvDATv6wCnGQt7zAGtwwCy";

async function test() {
    console.log("Testing Stable Investor Presentation for AAPL...");
    const url = `https://financialmodelingprep.com/stable/investor_presentation?symbol=AAPL&apikey=${FMP_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Status:", res.status);
        console.log("Data Length:", Array.isArray(data) ? data.length : "Not an array");
        console.log("Sample Data:", JSON.stringify(data.slice(0, 1), null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
}

test();
