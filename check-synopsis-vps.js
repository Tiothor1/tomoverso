const sqlite3 = require('better-sqlite3');
const path = '/var/www/tomoverso/data-runtime/tomoverso.db';
const db = sqlite3(path);

// Check for classification/avisos in synopsis
const rows = db.prepare("SELECT slug, title, synopsis FROM novels WHERE synopsis LIKE '%Classificação%' OR synopsis LIKE '%classificação%' OR synopsis LIKE '%Avisos%' OR synopsis LIKE '%avisos%' OR synopsis LIKE '%indicativa%'").all();

console.log(`Found ${rows.length} novels with classification/avisos text\n`);

rows.forEach(r => {
  console.log(`--- ${r.title} (${r.slug}) ---`);
  // Show the last 200 chars to find the classification text
  const synopsis = r.synopsis;
  const match = synopsis.match(/Classificação|classificação|Avisos|avisos|indicativa/i);
  if (match) {
    const idx = match.index;
    console.log(`  Match at position ${idx}:`);
    console.log(`  ${synopsis.slice(Math.max(0, idx-100), idx)}`);
    console.log(`  >>> ${synopsis.slice(idx, idx+200)} <<<`);
  }
  console.log();
});

// Also check count of novels with very long synopses >500 chars
const longRows = db.prepare("SELECT COUNT(*) FROM novels WHERE length(synopsis) > 500").get();
console.log(`Novels with synopsis > 500 chars: ${JSON.stringify(longRows)}`);

db.close();
