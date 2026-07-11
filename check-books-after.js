const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

const samples = s.prepare(`
  SELECT title, slug, synopsis, subtitle, tagline, tone, classification_rating, content_warnings, target_audience
  FROM books ORDER BY RANDOM() LIMIT 4
`).all();

for (const b of samples) {
  console.log(`━━━ ${b.title} ━━━`);
  console.log(`Subtitle: ${b.subtitle}`);
  console.log(`Tagline: ${b.tagline}`);
  console.log(`Tone: ${b.tone}`);
  console.log(`Class: ${b.classification_rating}`);
  console.log(`Avisos: ${b.content_warnings}`);
  console.log(`Publico: ${b.target_audience}`);
  console.log(`\nSYNOPSIS:\n${b.synopsis}\n`);
}

// Check if any books have classification
const stats = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN classification_rating IS NOT NULL THEN 1 ELSE 0 END) as com_class,
    SUM(CASE WHEN content_warnings IS NOT NULL THEN 1 ELSE 0 END) as com_avisos,
    SUM(CASE WHEN subtitle IS NOT NULL THEN 1 ELSE 0 END) as com_sub,
    SUM(CASE WHEN tagline IS NOT NULL THEN 1 ELSE 0 END) as com_tagline,
    SUM(CASE WHEN tone IS NOT NULL THEN 1 ELSE 0 END) as com_tone,
    SUM(CASE WHEN target_audience IS NOT NULL THEN 1 ELSE 0 END) as com_publico
  FROM books
`).get();
console.log('STATS:', JSON.stringify(stats, null, 2));
