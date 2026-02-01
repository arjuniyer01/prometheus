import { NextRequest, NextResponse } from 'next/server';
import { getYahooHistoricalPrices } from '@/lib/yahoo-finance';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const prices = await getYahooHistoricalPrices(symbol);
        return NextResponse.json(prices);
    } catch (error) {
        console.error(`Error fetching historical prices for ${symbol}:`, error);
        return NextResponse.json({ error: 'Failed to fetch historical prices' }, { status: 500 });
    }
}
