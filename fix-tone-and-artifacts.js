const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// 1. Fix tone for all original novels that were rewritten
console.log('=== CORRIGINDO TONE DAS REESCRITAS ===\n');
const origs = s.prepare(`SELECT id,slug,title,synopsis,internal_notes FROM novels WHERE is_original=1 AND internal_notes IS NOT NULL`).all();

const toneMap = {
  'romance': 'romance',
  'romântica': 'comédia romântica',
  'comédia romântica': 'comédia romântica',
  'romance bl': 'romance BL',
  'fantasia romântica': 'fantasia romântica',
  'drama/ação com romance': 'drama/ação com romance',
  'drama': 'drama',
  'comédia': 'comédia',
};

// Extract tone from internal_notes (diferencial text) or title
function guessTone(title, notes) {
  const t = title.toLowerCase();
  const n = (notes || '').toLowerCase();
  
  if (n.includes('bl') || t.includes('bl')) return 'romance BL';
  if (n.includes('comédia romântica') || n.includes('comédia')) {
    if (n.includes('bl')) return 'comédia romântica BL';
    return 'comédia romântica';
  }
  if (n.includes('fantasia') || t.includes('feiticeiro') || t.includes('dragões') || t.includes('dragão') || t.includes('rainha') || t.includes('princesa') || t.includes('príncipe') || t.includes('reino') || t.includes('safira')) return 'fantasia romântica';
  if (n.includes('drama') || n.includes('ação')) return 'drama/ação com romance';
  if (n.includes('romance')) {
    if (n.includes('bl')) return 'romance BL';
    return 'romance';
  }
  if (n.includes('bl')) return 'romance BL';
  
  return 'romance';
}

let fixed = 0;
const update = s.prepare(`UPDATE novels SET tone=? WHERE id=?`);

origs.forEach(n => {
  // Read original synopsis from backup to get the tone
  // Or guess from title + notes
  const tone = guessTone(n.title, n.internal_notes);
  update.run(tone, n.id);
  fixed++;
  console.log(`  ${n.title} → ${tone}`);
});

console.log(`\n✅ ${fixed} tones atualizados\n`);

// 2. Fix ". ." artifacts at the end of synopses
console.log('=== REMOVENDO ARTEFATOS ". ." ===\n');
const dots = s.prepare("SELECT id,slug,title,synopsis FROM novels WHERE synopsis LIKE '%. .%'").all();
let dotsFixed = 0;
const updateDot = s.prepare(`UPDATE novels SET synopsis=? WHERE id=?`);

dots.forEach(n => {
  let t = n.synopsis.replace(/\s*\.\s*\.\s*$/s, '');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  // Also strip any trailing ".." or "..."
  t = t.replace(/[.\s]{2,}$/, '');
  if (t.endsWith('.')) {
    // good, keep it
  } else {
    t = t + '.';
  }
  updateDot.run(t, n.id);
  dotsFixed++;
  console.log(`  ${n.title}`);
});

console.log(`\n✅ ${dotsFixed} sinopses com artefatos corrigidas\n`);

// 3. Strip remaining [From...] and [Edited from...] from 2 novels
console.log('=== REMOVENDO NOTAS DE FONTE RESTANTES ===\n');
const remain = s.prepare("SELECT id,slug,title,synopsis FROM novels WHERE synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").all();
let srcFixed = 0;
const updateSrc = s.prepare(`UPDATE novels SET synopsis=? WHERE id=?`);

remain.forEach(n => {
  let t = n.synopsis;
  // Remove [From ...] at end
  t = t.replace(/\n*\s*\[(?:From|Edited\s+from|Based\s+on|Partially\s+(?:from|taken\s+from))\s*[^\]]*\]\s*$/i, '');
  // Remove trailing "The game also..." lines
  t = t.replace(/\n*\s*The\s+game\s+also\s+has\s+[^.]*\.\s*$/i, '');
  t = t.replace(/\n{3,}/g, '\n\n').trim();
  updateSrc.run(t, n.id);
  srcFixed++;
  console.log(`  ${n.title}`);
});

console.log(`\n✅ ${srcFixed} fontes removidas\n`);

// 4. VERIFY
const v1 = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%. .%' OR synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%'").get();
console.log(`Ainda com artefatos/fontes: ${v1.c}`);

const noTone = s.prepare("SELECT COUNT(*) as c FROM novels WHERE is_original=1 AND tone IS NULL").get();
console.log(`Obras originais sem tone: ${noTone.c}`);

// 5. Show final samples
console.log(`\n\n=== AMOSTRAS FINAIS ===`);
const smpl = s.prepare("SELECT title,synopsis,tone FROM novels WHERE is_original=1 AND tone IS NOT NULL LIMIT 3").all();
smpl.forEach(n => {
  console.log(`\n━━━ ${n.title} ━━━`);
  console.log(`Tom: ${n.tone}`);
  console.log(n.synopsis);
});

// Clean novels that had class/avisos extracted
console.log(`\n\n=== OBRAS COM CLASSIFICAÇÃO EXTRAÍDA ===`);
const cl = s.prepare("SELECT title,classification_rating,content_warnings FROM novels WHERE classification_rating IS NOT NULL").all();
cl.forEach(n => console.log(`  ${n.title}: ${n.classification_rating} | ${n.content_warnings || '-'}`));

s.close();
