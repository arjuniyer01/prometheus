
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('example.txt', 'utf8'));

console.log('--- recentNews ---');
if (data.recentNews) {
    console.log('Count:', data.recentNews.length);
    console.log('Sample News:', JSON.stringify(data.recentNews[0], null, 2));
}

console.log('\n--- stockTechnicalData ---');
if (data.stockTechnicalData) {
    console.log('Count:', data.stockTechnicalData.length);
    console.log('First 3 entries:', JSON.stringify(data.stockTechnicalData.slice(0, 3), null, 2));
}

console.log('\n--- currentPrice ---');
console.log(data.currentPrice);

console.log('\n--- financials (first entry) ---');
if (data.financials && data.financials.length > 0) {
    console.log(JSON.stringify(data.financials[0], null, 2));
}
