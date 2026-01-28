
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('example.txt', 'utf8'));
console.log('Top Level Keys:', Object.keys(data));
if (data.news) {
    console.log('News Count:', data.news.length);
    console.log('Sample News:', data.news[0]);
} else {
    // Search for any key that might be news
    const newsKeys = Object.keys(data).filter(k => k.toLowerCase().includes('news') || k.toLowerCase().includes('headline'));
    console.log('Potential News Keys:', newsKeys);
}

if (data.corporate_actions) {
    console.log('Corp Actions Count:', data.corporate_actions.length);
} else {
    const corpKeys = Object.keys(data).filter(k => k.toLowerCase().includes('corp') || k.toLowerCase().includes('action') || k.toLowerCase().includes('dividend'));
    console.log('Potential Corp Keys:', corpKeys);
}
