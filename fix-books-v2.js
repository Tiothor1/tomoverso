const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== LIMPEZA FINAL V2: BOOKS ===\n');

const all = s.prepare("SELECT id, title, synopsis, target_audience FROM books").all();
let fixed = 0;

for (const b of all) {
  let text = b.synopsis || '';
  const orig = text;
  
  // 1. "Leitores X" (sem "de") e "Fãs X" (sem "de") patterns
  const leadPatterns = [
    /Leitores\s+(de\s+)?(.+?)(?:\s*[#\n]|\s*$)/i,
    /F[ãa]s\s+(de\s+)?(.+?)(?:\s*[#\n]|\s*$)/i,
    /P[úu]blico\s*:\s*(.+?)(?:\s*[#\n]|\s*$)/i,
    /P[úu]blico\s+(.+?)(?:\s*[#\n]|\s*$)/i,
  ];
  
  for (const pat of leadPatterns) {
    const m = text.match(pat);
    if (m) {
      const audience = (m[2] || m[1]).trim().replace(/[.。]+$/, '').trim();
      if (audience.length > 0 && !b.target_audience) {
        s.prepare('UPDATE books SET target_audience=? WHERE id=?').run(audience, b.id);
        b.target_audience = audience; // prevent overwrite
      }
      text = text.replace(pat, '').trim();
    }
  }
  
  // 2. Remove trailing words that are standalone tags (single words at end, lowercase, without spaces)
  //    e.g. "realidadevirtual", "multiverso", "bibliotecaescolar" (glued words without #)
  text = text.replace(/\s+[a-zà-ú]{10,}$/, '').trim();
  
  // 3. Remove any remaining #tags at end
  text = text.replace(/\s*#\S+(?:\s+#\S+)*\s*$/i, '').trim();
  
  // 4. Clean up whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();
  text = text.replace(/[.。]{2,}/g, '.').trim();
  text = text.replace(/^\s*[.·]+/, '').trim();
  
  // 5. Ensure ends with period
  if (text.length > 0 && !text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?') && !text.endsWith('…')) {
    text += '.';
  }
  
  if (text !== orig) {
    s.prepare('UPDATE books SET synopsis=? WHERE id=?').run(text, b.id);
    fixed++;
  }
}

console.log(`✅ Finalizados: ${fixed} books limpos`);

// Show samples and stats
console.log('\n=== AMOSTRAS FINAIS ===\n');
const samples = s.prepare("SELECT title, synopsis, tone, target_audience FROM books ORDER BY RANDOM() LIMIT 3").all();
for (const b of samples) {
  console.log(`━━━ ${b.title} ━━━\n${b.synopsis}\n  Tom: ${b.tone} | Público: ${b.target_audience}\n`);
}

// Full verification
const v = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synopsis LIKE '%Leitores%' THEN 1 ELSE 0 END) as leitores,
    SUM(CASE WHEN synopsis LIKE '%Fãs%' OR synopsis LIKE '%Fas%' THEN 1 ELSE 0 END) as fas,
    SUM(CASE WHEN synopsis LIKE '%#%' THEN 1 ELSE 0 END) as hashtag,
    SUM(CASE WHEN target_audience IS NOT NULL THEN 1 ELSE 0 END) as com_publico
  FROM books
`).get();
console.log('VERIFICACAO:', JSON.stringify(v, null, 2));
