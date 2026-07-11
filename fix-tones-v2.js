const live = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const backup = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.backup-v3-1783782857140.db');

console.log('=== CORREÇÃO DEFINITIVA DOS TONES ===\n');

const origs = live.prepare(`SELECT id,slug,title FROM novels WHERE is_original=1`).all();
const update = live.prepare(`UPDATE novels SET tone=? WHERE id=?`);

let fixed = 0, missing = 0;

origs.forEach(n => {
  // Get original synopsis from backup
  const bk = backup.prepare("SELECT synopsis FROM novels WHERE id=?").get(n.id);
  if (!bk || !bk.synopsis) { missing++; return; }
  
  const orig = bk.synopsis;
  
  // Extract tone: everything between "desenvolve um " and " O diferencial" or end of string
  // Using greedy + that terminates at " O diferencial" or end
  let tone = null;
  
  // Method 1: direct extraction from boilerplate
  const m1 = orig.match(/desenvolve\s+um\s+(.+?)(?:\.\s*O\s+diferencial(?:$|\s))/i);
  if (m1) {
    tone = m1[1].trim();
  }
  
  // Method 2: if no "O diferencial", match until end
  if (!tone) {
    const m2 = orig.match(/desenvolve\s+um\s+(.+?)(?:\.\s*$|$)/i);
    if (m2) tone = m2[1].trim();
  }
  
  // Method 3: if still no match, try simpler approach
  if (!tone) {
    const m3 = orig.match(/Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+([^.]+)/i);
    if (m3) tone = m3[1].trim();
  }
  
  if (tone) {
    update.run(tone, n.id);
    fixed++;
    console.log(`  [${fixed}] ${n.title} → "${tone}"`);
  } else {
    missing++;
    console.log(`  ❌ ${n.title} — sem tone`);
  }
});

console.log(`\n✅ ${fixed} tones atualizados`);
console.log(`❌ ${missing} sem tone (esperado: 2 não-originais)`);

// VERIFY
console.log(`\n=== AMOSTRAS ===`);
['a-chef-e-o-critico-desastrado','a-garota-que-consertava-constelacoes','cafe-preto-para-dois-coracoes','o-calendario-dos-nossos-encontros'].forEach(slug => {
  const n = live.prepare("SELECT title,tone FROM novels WHERE slug=?").get(slug);
  if (n) console.log(`  ${n.title}: "${n.tone}"`);
});

// Also check still-remaining [From...]
const rem = live.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").get();
console.log(`\nAinda com [From/Edited: ${rem.c}`);

// Check no more ". ." 
const dots = live.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%. .%'").get();
console.log(`Ainda com ". .": ${dots.c}`);

backup.close();
live.close();
