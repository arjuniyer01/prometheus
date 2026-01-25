require('dotenv').config({ path: '.env.local' });
const { GoogleGenAI } = require("@google/genai");

async function validateAllAPIs() {
    console.log("🚀 Starting Full API Validation...");
    const fmpKey = process.env.FMP_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const finnhubKey = process.env.FINNHUB_API_KEY;

    const results = {
        fmp: false,
        gemini: false,
        finnhub: false
    };

    // 1. Validate FMP (Stable Endpoint)
    try {
        console.log("📡 Testing FMP (Stable Endpoint)...");
        const res = await fetch(`https://financialmodelingprep.com/stable/profile?symbol=AAPL&apikey=${fmpKey}`);
        const data = await res.json();
        if (data && data[0] && data[0].symbol === 'AAPL') {
            console.log("✅ FMP: SUCCESS (Retrieved Apple Profile)");
            results.fmp = true;
        } else {
            console.error("❌ FMP: FAILED", data);
        }
    } catch (e) {
        console.error("❌ FMP: ERROR", e.message);
    }

    // 2. Validate Gemini (2.5 Flash Lite)
    try {
        console.log("📡 Testing Gemini (2.5 Flash Lite)...");
        const ai = new GoogleGenAI({ apiKey: geminiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-lite",
            contents: "Say 'Gemini OK'",
        });
        if (response.text.includes("Gemini OK") || response.text.length > 0) {
            console.log(`✅ Gemini: SUCCESS (${response.text.trim()})`);
            results.gemini = true;
        } else {
            console.error("❌ Gemini: FAILED (Empty response)");
        }
    } catch (e) {
        console.error("❌ Gemini: ERROR", e.message);
    }

    // 3. Validate Finnhub
    try {
        console.log("📡 Testing Finnhub (News Endpoint)...");
        const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=AAPL&from=2024-01-01&to=2024-01-02&token=${finnhubKey}`);
        const data = await res.json();
        if (Array.isArray(data)) {
            console.log(`✅ Finnhub: SUCCESS (Found ${data.length} news items)`);
            results.finnhub = true;
        } else {
            console.error("❌ Finnhub: FAILED", data);
        }
    } catch (e) {
        console.error("❌ Finnhub: ERROR", e.message);
    }

    console.log("\n--- Final Status ---");
    console.log(`FMP: ${results.fmp ? '✅' : '❌'}`);
    console.log(`Gemini 2.5: ${results.gemini ? '✅' : '❌'}`);
    console.log(`Finnhub: ${results.finnhub ? '✅' : '❌'}`);

    if (Object.values(results).every(v => v)) {
        console.log("\n✨ ALL SYSTEMS GO. Engines at 100%.");
    } else {
        console.log("\n⚠️ SOME SYSTEMS FAILED. Check logs.");
    }
}

validateAllAPIs();
