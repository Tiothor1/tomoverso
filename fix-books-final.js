const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== LIMPEZA FINAL: BOOKS ===\n');

const all = s.prepare("SELECT id, title, synopsis, target_audience FROM books ORDER BY created_at DESC").all();
let fixed = 0;

for (const b of all) {
  let text = b.synopsis || '';
  const orig = text;
  
  // Extract "Leitores de..." (público/target audience)
  const leitoresM = text.match(/Leitores\s+de\s+(.+?)(?:\s*#|\s*$)/i);
  if (leitoresM) {
    // Save as target_audience if not already set
    if (!b.target_audience) {
      const audience = leitoresM[1].trim().replace(/[.。]+$/, '').trim();
      if (audience.length > 0) {
        s.prepare('UPDATE books SET target_audience=? WHERE id=?').run(audience, b.id);
      }
    }
    // Remove from synopsis
    text = text.replace(leitoresM[0], '').trim();
  }
  
  // Also try "Fãs de..." pattern
  const fasM = text.match(/F[ãa]s\s+de\s+(.+?)(?:\s*#|\s*$)/i);
  if (fasM) {
    if (!b.target_audience) {
      const audience = fasM[1].trim().replace(/[.。]+$/, '').trim();
      if (audience.length > 0) {
        s.prepare('UPDATE books SET target_audience=? WHERE id=?').run(audience, b.id);
      }
    }
    text = text.replace(fasM[0], '').trim();
  }
  
  // Remove #tags from end of synopsis
  text = text.replace(/\s*#[#\wÀ-ú]+(?:\s+#[#\wÀ-ú]+)*\s*$/i, '').trim();
  
  // Clean up extra whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();
  text = text.replace(/[.。]{2,}/g, '.').trim();
  text = text.replace(/^\s*[.·]+/, '').trim();
  
  if (text !== orig) {
    s.prepare('UPDATE books SET synopsis=? WHERE id=?').run(text, b.id);
    fixed++;
    console.log(`  ✅ ${b.title}`);
  }
}

console.log(`\n✅ Finalizados: ${fixed} books limpos`);

// Show 3 samples
console.log('\n=== AMOSTRAS FINAIS ===\n');
const finais = s.prepare("SELECT title, synopsis, tone, target_audience FROM books ORDER BY RANDOM() LIMIT 3").all();
for (const b of finais) {
  console.log(`━━━ ${b.title} ━━━`);
  console.log(`Tone: ${b.tone}`);
  console.log(`Público: ${b.target_audience}`);
  console.log(`${b.synopsis}\n`);
}
