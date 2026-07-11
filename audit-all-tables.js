const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

const tables = ['novels', 'books', 'mangas'];

for (const table of tables) {
  console.log(`\n=== TABELA: ${table} ===`);
  
  // Count total
  const total = s.prepare(`SELECT COUNT(*) as c FROM ${table}`).get();
  console.log(`Total obras: ${total.c}`);
  
  // Check contamination patterns
  const patterns = [
    ['status contaminado', "synopsis LIKE '%Classificação indicativa%'"],
    ['avisos', "synopsis LIKE '%Avisos de conteúdo%'"],
    ['status embedado', "synopsis LIKE '%Status:%'"],
    ['diferencial', "synopsis LIKE '%O diferencial%'"],
    ['fonte [From', "synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'"],
    ['subtitulo embedado', "synopsis LIKE '%Subtítulo:%'"],
    ['frase impacto', "synopsis LIKE '%Frase de impacto:%'"],
    ['publico embedado', "synopsis LIKE '%Público:%'"],
    ['tom embedado', "synopsis LIKE '%Tom:%'"],
    ['tags embedadas', "synopsis LIKE '%Tags:%'"],
  ];
  
  for (const [name, condition] of patterns) {
    const q = `SELECT COUNT(*) as c FROM ${table} WHERE ${condition}`;
    const r = s.prepare(q).get();
    if (r.c > 0) console.log(`  ❌ ${name}: ${r.c}`);
  }
  
  // Show top 3 most contaminated
  const worst = s.prepare(`
    SELECT id, slug, title, SUBSTR(synopsis, 1, 150) as s
    FROM ${table} 
    WHERE synopsis LIKE '%Subtítulo:%' OR synopsis LIKE '%Classificação indicativa%'
    ORDER BY LENGTH(synopsis) DESC LIMIT 3
  `).all();
  
  if (worst.length > 0) {
    console.log(`  Piores casos:`);
    for (const w of worst) {
      console.log(`    📖 ${w.title}`);
      console.log(`       ${w.s}`);
    }
  }
}
