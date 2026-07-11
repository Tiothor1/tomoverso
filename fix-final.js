const live = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const backup = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.backup-v3-1783782857140.db');

// For each original novel, read original synopsis from backup, extract tone
console.log('=== EXTRAINDO TONE DO BOILERPLATE ORIGINAL ===\n');

const origs = live.prepare(`SELECT id,slug,title,internal_notes FROM novels WHERE is_original=1`).all();

const update = live.prepare(`UPDATE novels SET tone=? WHERE id=?`);

let fixed = 0, noMatch = 0;

// First, check if backup has the columns
const bCols = backup.prepare("SELECT COUNT(*) as c FROM pragma_table_info('novels') WHERE name='synopsis'").get();
console.log(`Backup has synopsis column: ${bCols.c > 0}`);

origs.forEach(n => {
  // Get ORIGINAL synopsis from backup (pre-rewrite)
  const origRec = backup.prepare("SELECT synopsis FROM novels WHERE id=?").get(n.id);
  if (!origRec) {
    // Try slug
    const bySlug = backup.prepare("SELECT synopsis FROM novels WHERE slug=?").get(n.slug);
    if (bySlug) {
      origRec = bySlug;
    }
  }
  
  if (!origRec || !origRec.synopsis) {
    noMatch++;
    return;
  }
  
  const orig = origRec.synopsis;
  
  // Extract tone: "Ao lado de [Nome], a história desenvolve um [GÊNERO]..."
  const tm = orig.match(/Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+(.+?)(\.\s*)?/i);
  let tone = tm ? tm[1].replace(/\.$/, '').trim() : null;
  
  // If still no tone, try "O diferencial da obra é [GÊNERO]" from notes
  if (!tone && n.internal_notes) {
    const diff = n.internal_notes.match(/O\s+diferencial\s+da\s+obra\s+é\s+(.+)/i);
    if (diff) {
      const d = diff[1].toLowerCase();
      if (d.includes('bl')) tone = 'romance BL';
      else if (d.includes('comédia') && d.includes('romântica')) tone = 'comédia romântica';
      else if (d.includes('comédia')) tone = 'comédia romântica';
      else if (d.includes('fantasia') || d.includes('drama')) tone = 'fantasia romântica';
      else if (d.includes('romance')) tone = 'romance';
      else tone = 'romance';
    }
  }
  
  if (tone) {
    update.run(tone, n.id);
    fixed++;
    if (fixed <= 3 || !(fixed % 10)) {
      console.log(`  [${fixed}] ${n.title} → "${tone}"`);
    }
  } else {
    noMatch++;
    console.log(`  ❌ ${n.title} — tone não encontrado`);
  }
});

console.log(`\n✅ ${fixed} tones extraídos do backup original`);
console.log(`❌ ${noMatch} sem match`);

// Now fix ". ." artifacts
console.log(`\n=== CORRIGINDO ARTEFATOS ===`);
const dots = live.prepare("SELECT id,slug,title,synopsis FROM novels WHERE synopsis LIKE '%. .%'").all();
const fixDot = live.prepare(`UPDATE novels SET synopsis=? WHERE id=?`);
let dotFix = 0;
dots.forEach(n => {
  let t = n.synopsis.replace(/\s*\.\s*\.\s*$/s, '');
  t = t.replace(/\n{4,}/g, '\n\n').trim();
  if (!/[.!?]$/.test(t)) t += '.';
  fixDot.run(t, n.id);
  dotFix++;
  console.log(`  ${n.title}`);
});

// Fix remaining [From]/[Edited]
console.log(`\n=== FONTES RESTANTES ===`);
const rem = live.prepare("SELECT id,slug,title,synopsis FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").all();
const fixSrc = live.prepare(`UPDATE novels SET synopsis=? WHERE id=?`);
let srcFix = 0;
rem.forEach(n => {
  let t = n.synopsis;
  t = t.replace(/\n*\s*\[(?:From|Edited\s+from|Based\s+on)\s*[^\]]*\]\s*$/i, '');
  t = t.replace(/\n*\s*The\s+game\s+also\s+has\s+[^.]*\.\s*$/i, '');
  t = t.replace(/\n{4,}/g, '\n\n').trim();
  fixSrc.run(t, n.id);
  srcFix++;
  console.log(`  ${n.title}`);
});

// FINAL VERIFICATION
console.log(`\n\n=== VERIFICAÇÃO FINAL ===`);
console.log(`Artefatos ". .": ${live.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%. .%'").get().c}`);
console.log(`[From/Edited: ${live.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").get().c}`);
console.log(`Sem tone (originais): ${live.prepare("SELECT COUNT(*) as c FROM novels WHERE is_original=1 AND tone IS NULL").get().c}`);

// Show final stats
const dataCols = ['tone','classification_rating','content_warnings'];
dataCols.forEach(c => {
  const cnt = live.prepare(`SELECT COUNT(*) as ct FROM novels WHERE ${c} IS NOT NULL`).get();
  console.log(`${c}: ${cnt.ct} obras`);
});

// Show 3 best synopses
console.log(`\n=== AMOSTRAS FINAIS ===`);
['a-chef-e-o-critico-desastrado','cafe-preto-para-dois-coracoes','demon-king'].forEach(slug => {
  const n = live.prepare("SELECT title,synopsis,tone,classification_rating,content_warnings FROM novels WHERE slug=?").get(slug);
  if (n) {
    console.log(`\n━━━ ${n.title} ━━━ (Tom: ${n.tone})`);
    console.log(n.synopsis.slice(0, 500));
    if (n.classification_rating) console.log(`Class: ${n.classification_rating}`);
    if (n.content_warnings) console.log(`Avisos: ${n.content_warnings}`);
  }
});

backup.close();
live.close();
