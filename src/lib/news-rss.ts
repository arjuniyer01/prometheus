import Parser from 'rss-parser';

const parser = new Parser();

export async function getGoogleNewsRSS(symbol: string) {
    try {
        // Clean symbol for RSS query (e.g. remove .NS from RELIANCE.NS for better search, though ticker operator might like it)
        const cleanSymbol = symbol.split('.')[0];
        const url = `https://news.google.com/rss/search?q=ticker:${cleanSymbol}&hl=en-US&gl=US&ceid=US:en`;

        const feed = await parser.parseURL(url);
        return feed.items.map(item => ({
            title: item.title,
            url: item.link,
            source: item.source || 'Google News',
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            snippet: item.contentSnippet || item.title
        }));
    } catch (error) {
        console.error(`Google News RSS failed for ${symbol}:`, error);
        return [];
    }
}

export async function getYahooNewsRSS(symbol: string) {
    try {
        const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${symbol}`;
        const feed = await parser.parseURL(url);

        return feed.items.map(item => ({
            title: item.title,
            url: item.link,
            source: 'Yahoo Finance',
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            snippet: item.contentSnippet || item.title
        }));
    } catch (error) {
        console.error(`Yahoo Finance RSS failed for ${symbol}:`, error);
        return [];
    }
}

export async function getAggregatedNews(symbol: string) {
    const [googleNews, yahooNews] = await Promise.all([
        getGoogleNewsRSS(symbol),
        getYahooNewsRSS(symbol)
    ]);

    // Merge and sort by date
    const allNews = [...googleNews, ...yahooNews].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Filter duplicates by URL or title
    const seen = new Set();
    return allNews.filter(n => {
        const key = n.url || n.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

export async function getNSEAnnouncements(symbol: string) {
    try {
        const url = 'https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml';
        const feed = await parser.parseURL(url);

        const cleanSymbol = symbol.split('.')[0].toUpperCase();

        // Filter items that mention the symbol in title or content
        const filtered = feed.items.filter(item => {
            const title = (item.title || '').toUpperCase();
            const snippet = (item.contentSnippet || '').toUpperCase();
            return title.includes(cleanSymbol) || snippet.includes(cleanSymbol);
        });

        return filtered.map(item => ({
            title: item.title,
            url: item.link,
            source: 'NSE India',
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            snippet: item.contentSnippet || item.title
        }));
    } catch (error) {
        console.error(`NSE Announcements RSS failed for ${symbol}:`, error);
        return [];
    }
}
