const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// Find remaining [From/Edited 
const rem = s.prepare("SELECT id,slug,title,synopsis FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").all();
console.log(`Remaining with [From/Edited: ${rem.length}`);
rem.forEach(n => {
  console.log(`\n--- ${n.title} ---`);
  console.log(n.synopsis.slice(-300));
});

// Also check for any other contamination  
const checks = [
  ['Classificação indicativa', "synopsis LIKE '%Classificação indicativa%'"],
  ['Avisos de conteúdo', "synopsis LIKE '%Avisos de conteúdo%'"],
  ['boilerplate', "synopsis LIKE '%obra original Tomo Verso%'"],
  ['Status: Em andamento', "synopsis LIKE '%Status:%'"],
  ['diferencial da obra', "synopsis LIKE '%diferencial da obra%'"],
];
console.log(`\n\n=== OUTROS CONTAMINANTES ===`);
checks.forEach(([name, sql]) => {
  const c = s.prepare(`SELECT COUNT(*) as c FROM novels WHERE ${sql}`).get();
  if (c.c > 0) console.log(`⚠️  ${name}: ${c.c}`);
  else console.log(`✅ ${name}: 0`);
});

// Fix remaining [From/Edited
const fix = s.prepare(`UPDATE novels SET synopsis=? WHERE id=?`);
rem.forEach(n => {
  let t = n.synopsis;
  t = t.replace(/\n*\s*\[(?:From|Edited\s+from)\s*[^\]]*\]\s*$/i, '');
  t = t.replace(/\n*\s*The\s+game\s+also\s+has\s+[^.]*\.\s*$/i, '');
  t = t.replace(/\n{4,}/g, '\n\n').trim();
  fix.run(t, n.id);
  console.log(`\nFixed: ${n.title}`);
});

const still = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").get();
console.log(`\nStill remaining: ${still.c}`);

s.close();
