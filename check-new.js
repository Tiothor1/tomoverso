const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// Search for recent or matching works
const fuzzy = s.prepare("SELECT id, slug, title, synopsis, subtitle, tone, classification_rating, content_warnings, is_original FROM novels WHERE LOWER(synopsis) LIKE '%chefe final%' OR LOWER(synopsis) LIKE '%theo%' OR LOWER(subtitle) LIKE '%jogo acabou%'").all();

if (fuzzy.length === 0) {
  console.log('⚠️ Nenhuma obra encontrada com "chefe final" ou "theo"');
  
  // Check for novels without tone (likely new/unprocessed)
  const withoutTone = s.prepare("SELECT COUNT(*) as c FROM novels WHERE tone IS NULL").get();
  console.log(`Obras sem tone (nao processadas): ${withoutTone.c}`);
  
  // Show 5 recent ones
  const recent = s.prepare("SELECT id, slug, title, SUBSTR(synopsis, 1, 120) as synopsis_preview FROM novels WHERE tone IS NULL ORDER BY created_at DESC LIMIT 5").all();
  for (const n of recent) {
    console.log(`\n📖 ${n.title} (${n.slug})`);
    console.log(`   ${n.synopsis_preview}...`);
  }
} else {
  for (const n of fuzzy) {
    console.log(`\n━━━ ${n.title} (${n.slug}) ━━━`);
    console.log(`Subtitle: ${n.subtitle}`);
    console.log(`Tone: ${n.tone}`);
    console.log(`Class: ${n.classification_rating}`);
    console.log(`Avisos: ${n.content_warnings}`);
    console.log(`\nSYNOPSIS:\n${n.synopsis}`);
  }
}

// Also check total count
const total = s.prepare("SELECT COUNT(*) as c FROM novels").get();
console.log(`\nTotal obras: ${total.c}`);
