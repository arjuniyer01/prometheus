
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('example.txt', 'utf8'));

console.log('--- recentNews[0] keys ---');
if (data.recentNews && data.recentNews.length > 0) {
    console.log(Object.keys(data.recentNews[0]));
    console.log(data.recentNews[0]);
}
