const http = require('http');
const url = 'http://ccmixter.org/api/query?datasource=tracks&f=json&search=lofi&limit=1';

console.log('NODE_OPTIONS:', process.env.NODE_OPTIONS);
console.log('maxHeaderSize:', http.maxHeaderSize);

http.get(url, (res) => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => {
    const data = JSON.parse(body);
    console.log('Results:', data.length);
  });
}).on('error', e => console.log('ERR:', e.message));
