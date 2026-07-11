const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== CORRECAO DOS 3 RESTANTES ===\n');

// Find the 4 with old template grammar
const rest = s.prepare("SELECT id, title, slug, synopsis FROM novels WHERE synopsis LIKE '%nunca imaginou%'").all();

for (const n of rest) {
  const syn = n.synopsis;
  
  // More flexible regex: setting can be anything after "que "
  const p1Match = syn.match(/^([^,]+?)\s+nunca\s+imaginou\s+que\s+(.*?)\s*[—\-]\s*mas\s+é\s+ali\s+que\s+sua\s+vida\s+ganha\s+um\s+rumo\s+inesperado\.?$/i);
  const p1Match2 = syn.match(/^([^,]+?)\s+nunca\s+imaginou\s+que\s+(.*?)\s*[—\-]\s*mas\s+é\s+ali\s+que/i);
  
  let setting = null;
  let charName = null;
  
  if (p1Match) {
    charName = p1Match[1].trim();
    setting = p1Match[2].trim();
  } else if (p1Match2) {
    charName = p1Match2[1].trim();
    setting = p1Match2[2].trim();
  }
  
  if (!setting || !charName) {
    console.log(`  ⚠ ${n.title}: nao foi possivel extrair setting. Manual fix needed.`);
    console.log(`     Syn: ${syn.substring(0, 100)}...`);
    continue;
  }
  
  // Capitalize setting first letter
  const settingCap = setting.charAt(0).toUpperCase() + setting.slice(1);
  
  // Handle "cuja rotina muda em " leftover
  let cleanSetting = settingCap;
  // Remove "cuja rotina muda em " or "cuja rotina muda "
  cleanSetting = cleanSetting.replace(/^[Cc]uja\s+rotina\s+muda\s+(em\s+)?/i, '').trim();
  cleanSetting = cleanSetting.charAt(0).toUpperCase() + cleanSetting.slice(1);
  
  const newSyn = `Em ${cleanSetting}, a vida de ${charName} está prestes a mudar.\n\n${n.title.split(' ').slice(0, 2).join(' ')}...`;
  
  s.prepare('UPDATE novels SET synopsis=? WHERE id=?').run(
    `Em ${cleanSetting}, a vida de ${charName} está prestes a mudar.\n\n${charName.split(' ')[0]} encontra seu destino reescrito neste lugar onde o impossível parece possível.`,
    n.id
  );
  console.log(`  ✅ ${n.title}: "${cleanSetting.substring(0, 50)}..."`);
}

// Verify
const check = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%nunca imaginou%'").get();
console.log(`\n✅ Ainda com template antigo: ${check.c}`);
console.log('✅ Contaminacao total: ', JSON.stringify(s.prepare(`
  SELECT 
    SUM(CASE WHEN synopsis LIKE '%Classificação indicativa%' THEN 1 ELSE 0 END) as class,
    SUM(CASE WHEN synopsis LIKE '%Avisos de conteúdo%' THEN 1 ELSE 0 END) as avisos,
    SUM(CASE WHEN synopsis LIKE '%Status:%' THEN 1 ELSE 0 END) as status,
    SUM(CASE WHEN synopsis LIKE '%O diferencial%' THEN 1 ELSE 0 END) as dif,
    SUM(CASE WHEN synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%' THEN 1 ELSE 0 END) as fonte
  FROM novels
`).get(), null, 2));

// Show final quality check
console.log('\n=== QUALIDADE FINAL: 5 amostras ===\n');
const finalSamples = s.prepare('SELECT title, synopsis, tone FROM novels WHERE is_original=1 ORDER BY RANDOM() LIMIT 5').all();
for (const n of finalSamples) {
  console.log(`━━━ ${n.title} [${n.tone}] ━━━`);
  console.log(`${n.synopsis}\n`);
}
