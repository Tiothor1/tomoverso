const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== CORRECAO FINAL: TONE + SINOPSE ===\n');

// 1. Fix tone: strip boilerplate suffix
const allWithTone = s.prepare(`
  SELECT id, title, slug, tone, synopsis, subtitle, tagline
  FROM novels WHERE tone IS NOT NULL
`).all();

console.log(`Obras com tone: ${allWithTone.length}\n`);

let toneFixed = 0;
for (const n of allWithTone) {
  const orig = n.tone;
  // Strip " com conflito emocional..." or " com conflito..."
  const clean = n.tone.replace(/\s+com\s+conflito\s+.*$/i, '').trim();
  // Strip trailing boilerplate
  const clean2 = clean.replace(/\s*$/, '').trim();
  if (clean2 !== orig) {
    s.prepare('UPDATE novels SET tone=? WHERE id=?').run(clean2, n.id);
    toneFixed++;
    console.log(`  ${n.title}: "${orig}" → "${clean2}"`);
  }
}
console.log(`\n✅ Tone corrigido: ${toneFixed}\n`);

// 2. Fix synopses: remove grammar issues + generic ending
const allRewritten = s.prepare(`
  SELECT id, title, slug, synopsis, subtitle, tagline
  FROM novels WHERE synopsis LIKE '%nunca imaginou que%'
`).all();

console.log(`Obras com synopsis reescrita: ${allRewritten.length}\n`);

let synFixed = 0;
for (const n of allRewritten) {
  let syn = n.synopsis;
  
  // Extract the 3 parts from the template
  const lines = syn.split('\n\n');
  if (lines.length < 3) continue;
  
  let p1 = lines[0].trim();
  let p2 = lines[1].trim();
  let p3 = lines[2].trim();
  
  // Fix p1: "Nina Valença nunca imaginou que uma estação de trem desativada no interior do Rio — mas é ali que sua vida ganha um rumo inesperado."
  // → "Em uma estação de trem desativada no interior do Rio, Nina Valença descobre que sua vida está prestes a ganhar um rumo inesperado."
  const p1Match = p1.match(/^([^,]+?)\s+nunca\s+imaginou\s+que\s+(um|uma|o|a|os|as)\s+(.*?)\s*[—\-]\s*mas\s+é\s+ali\s+que\s+sua\s+vida\s+ganha\s+um\s+rumo\s+inesperado\.?$/i);
  if (p1Match) {
    const charName = p1Match[1].trim();
    const article = p1Match[2].trim();
    const location = p1Match[3].trim();
    
    // Determine article for "Em + article"
    const emArticle = (article === 'um' || article === 'uma') ? `${article} ` : '';
    const capitalArticle = article.charAt(0).toUpperCase() + article.slice(1);
    
    p1 = `Em ${emArticle}${location}, a vida de ${charName} está prestes a mudar.`;
    
    // Update synopsis
    syn = `${p1}\n\n${p2}`; // Remove p3 (generic ending)
    s.prepare('UPDATE novels SET synopsis=? WHERE id=?').run(syn, n.id);
    synFixed++;
    console.log(`  ${n.title}: fixed grammar + removed generic ending`);
  } else {
    console.log(`  ⚠ ${n.title}: regex nao casou -> "${p1.substring(0, 80)}..."`);
  }
}

console.log(`\n✅ Sinopses corrigidas: ${synFixed}\n`);

// 3. Verify no contamination remains
console.log('=== VERIFICACAO FINAL ===\n');
const v = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synopsis LIKE '%Classificação indicativa%' THEN 1 ELSE 0 END) as tem_class,
    SUM(CASE WHEN synopsis LIKE '%Avisos de conteúdo%' THEN 1 ELSE 0 END) as tem_avisos,
    SUM(CASE WHEN synopsis LIKE '%Status:%' THEN 1 ELSE 0 END) as tem_status,
    SUM(CASE WHEN synopsis LIKE '%O diferencial%' THEN 1 ELSE 0 END) as tem_diferencial,
    SUM(CASE WHEN synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%' THEN 1 ELSE 0 END) as tem_fonte,
    SUM(CASE WHEN synopsis LIKE '%nunca imaginou%' THEN 1 ELSE 0 END) as tem_template_grammar
  FROM novels
`).get();
console.log(JSON.stringify(v, null, 2));

// Show 3 final samples
console.log('\n=== AMOSTRAS FINAIS ===\n');
const finais = s.prepare(`
  SELECT n.title, n.synopsis, n.tone, n.classification_rating
  FROM novels n
  WHERE n.is_original = 1
  ORDER BY RANDOM() LIMIT 3
`).all();
for (const n of finais) {
  console.log(`━━━ ${n.title} ━━━`);
  console.log(`Tone: ${n.tone}`);
  console.log(`${n.synopsis}\n`);
}
