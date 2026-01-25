import { getHistoricalPrices } from "@/lib/scrapers";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;
    if (!symbol) return NextResponse.json({ error: "No symbol provided" }, { status: 400 });

    try {
        const prices = await getHistoricalPrices(symbol);
        return NextResponse.json(prices);
    } catch (error: any) {
        console.error("Price Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
