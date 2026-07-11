const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== VERIFICACAO MANGAS ===');
const mangasTotal = s.prepare("SELECT COUNT(*) as c FROM mangas").get();
console.log(`Total mangas: ${mangasTotal.c}`);

// Check for contamination patterns
const pats = [
  ['Subtítulo:', "synopsis LIKE '%Subtítulo:%'"],
  ['Sinopse:', "synopsis LIKE '%Sinopse:%'"],
  ['Classificação', "synopsis LIKE '%Classificação%'"],
  ['Avisos', "synopsis LIKE '%Avisos%'"],
  ['[From', "synopsis LIKE '%[From%'"],
  ['Frase de impacto', "synopsis LIKE '%Frase de impacto%'"],
  ['Público:', "synopsis LIKE '%Público:%'"],
  ['Tom:', "synopsis LIKE '%Tom:%'"],
  ['Tags:', "synopsis LIKE '%Tags:%'"],
  ['Status:', "synopsis LIKE '%Status:%'"],
  ['boilerplate original', "synopsis LIKE '%obra original Tomo Verso%'"],
  ['O diferencial', "synopsis LIKE '%O diferencial%'"],
];

for (const [name, condition] of pats) {
  try {
    const q = `SELECT COUNT(*) as c FROM mangas WHERE ${condition}`;
    const r = s.prepare(q).get();
    if (r.c > 0) console.log(`  ❌ ${name}: ${r.c} obras`);
  } catch(e) {
    // column might not exist
  }
}

console.log('\n✅ Mangas verification complete');
