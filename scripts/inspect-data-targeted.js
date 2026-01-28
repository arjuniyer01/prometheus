
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('example.txt', 'utf8'));

console.log('--- recentNews ---');
if (data.recentNews) {
    console.log('Count:', data.recentNews.length);
    data.recentNews.slice(0, 2).forEach((n, i) => {
        console.log(`News ${i}:`, n.title, n.date, n.sourceName);
    });
}

console.log('\n--- stockTechnicalData ---');
if (data.stockTechnicalData) {
    console.log('Count:', data.stockTechnicalData.length);
    console.log('First 3 entries:', data.stockTechnicalData.slice(0, 3));
}

console.log('\n--- financials sample ---');
if (data.financials && data.financials.length > 0) {
    const f = data.financials[0];
    console.log('Period:', f.EndDate, f.Type);
    console.log('First 3 Income keys:', f.stockFinancialMap.INC.slice(0, 3).map(m => m.displayName));
}
