const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// Get first 10 original Tomoverso novels with full synopsis
const rows = s.prepare("SELECT id, slug, title, synopsis FROM novels WHERE is_original = 1 ORDER BY title LIMIT 5").all();

rows.forEach(r => {
  console.log(`\n═══════════════════════════════════════════`);
  console.log(`TÍTULO: ${r.title}`);
  console.log(`SLUG: ${r.slug}`);
  console.log(`═══════════════════════════════════════════`);
  console.log(r.synopsis);
  console.log(`═══════════════════════════════════════════`);
  console.log();
});

// Also check some non-original (imported) novels for source notes
const imp = s.prepare("SELECT slug, title, type, length(synopsis), synopsis FROM novels WHERE is_original != 1 AND type = 'light-novel' AND (synopsis LIKE '%\\[%' OR synopsis LIKE '%Source:%' OR synopsis LIKE '%Nota:%') LIMIT 3").all();
console.log(`\n\n=== IMPORTADOS COM NOTAS ===`);
imp.forEach(r => {
  console.log(`\n--- ${r.title} (${r.type}, ${r['length(synopsis)']}ch) ---`);
  console.log(r.synopsis.slice(-200));
});

// Check VNs for [From/Edited From] patterns
const vn = s.prepare("SELECT slug, title, type, synopsis FROM novels WHERE type = 'visual-novel' AND synopsis LIKE '%\\[From%' LIMIT 3").all();
console.log(`\n\n=== VISUAL NOVELS COM [From ...] ===`);
vn.forEach(r => {
  console.log(`\n--- ${r.title} ---`);
  // Show last 300 chars
  console.log(`...${r.synopsis.slice(-300)}`);
});

s.close();
