
const FMP_KEY = "KauaxDN1EIMvDATv6wCnGQt7zAGtwwCy";

async function test() {
    console.log("Testing Stable News/Press Releases for AAPL...");
    const url = `https://financialmodelingprep.com/stable/news/press-releases?symbol=AAPL&limit=10&apikey=${FMP_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        console.log("Status:", res.status);
        if (res.ok && Array.isArray(data)) {
            console.log("Found", data.length, "press releases");
            const presentations = data.filter(n =>
                n.title.toLowerCase().includes('presentation') ||
                n.title.toLowerCase().includes('investor day') ||
                n.title.toLowerCase().includes('guidance')
            );
            console.log("Found", presentations.length, "matching presentations in news.");
            if (presentations.length > 0) console.log("Sample:", presentations[0].title);
        }
    } catch (e) {
        console.log("Error:", e.message);
    }
}

test();
