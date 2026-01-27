
import { getHistoricalPrices } from "./src/lib/scrapers";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function debug() {
    console.log("Deep checking TE historical prices...");
    try {
        const prices = await getHistoricalPrices("TE");
        console.log(`Final Result length: ${prices.length}`);
        if (prices.length > 0) {
            console.log("Sample Data Point:", JSON.stringify(prices[0]));
            // Check for required fields by Charting engine
            console.log("Has 'close'?", typeof prices[0].close);
            console.log("Has 'date'?", typeof prices[0].date);
        } else {
            console.log("Prices array is EMPTY.");
        }
    } catch (e) {
        console.error("Critical Error:", e);
    }
}

debug();
