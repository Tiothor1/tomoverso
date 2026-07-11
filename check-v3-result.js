const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== AMOSTRAS DE REESCRITAS ===\n');

// Show a few original novels
['a-chef-e-o-critico-desastrado','a-garota-que-consertava-constelacoes','o-que-eu-desenhei-existe','demon-king','cafe-preto-para-dois-coracoes'].forEach(slug => {
  const n = s.prepare("SELECT title,synopsis,tone,tagline,classification_rating,content_warnings,internal_notes FROM novels WHERE slug=?").get(slug);
  if (n) {
    console.log(`━━━ ${n.title} ━━━`);
    console.log(`Tone: ${n.tone}`);
    console.log(`Class: ${n.classification_rating || '-'}`);
    console.log(`Warnings: ${n.content_warnings || '-'}`);
    console.log(`Notes: ${n.internal_notes || '-'}`);
    console.log(n.synopsis);
    console.log();
  }
});

// Check what still has [From
console.log('=== AINDA COM [From/Edited ===');
const rem = s.prepare("SELECT slug,title,synopsis FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").all();
rem.forEach(n => {
  console.log(`\n--- ${n.title} ---`);
  console.log(n.synopsis.slice(-250));
});

s.close();
