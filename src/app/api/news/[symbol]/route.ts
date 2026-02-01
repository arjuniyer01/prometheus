import { NextRequest, NextResponse } from 'next/server';
import { getAggregatedNews } from '@/lib/news-rss';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ symbol: string }> }
) {
    const { symbol } = await params;

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    try {
        const news = await getAggregatedNews(symbol);
        return NextResponse.json(news);
    } catch (error) {
        console.error(`Live news fetch failed for ${symbol}:`, error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
