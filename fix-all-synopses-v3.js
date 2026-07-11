const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const fs = require('fs');

console.log('══════════════════════════════════════════════');
console.log('  CORREÇÃO DEFINITIVA DE SINOPESES v3');
console.log('══════════════════════════════════════════════\n');

// 1. BACKUP
const bk = `/var/www/tomoverso/data-runtime/tomoverso.backup-v3-${Date.now()}.db`;
fs.copyFileSync('/var/www/tomoverso/data-runtime/tomoverso.db', bk);
console.log(`✅ Backup criado: ${bk}\n`);

// 2. ADD COLUMNS
const cols = [
  'subtitle', 'tagline', 'target_audience', 'tone',
  'internal_notes', 'classification_rating', 'content_warnings'
];
let added = 0;
cols.forEach(c => {
  const exist = s.prepare(`SELECT COUNT(*) as c FROM pragma_table_info('novels') WHERE name=?`).get(c);
  if (exist.c === 0) {
    s.prepare(`ALTER TABLE novels ADD COLUMN ${c} TEXT DEFAULT NULL`).run();
    console.log(`  ✅ ${c}`);
    added++;
  }
});
console.log(`\nColunas adicionadas: ${added}\n`);

// 3. LOAD ALL
const all = s.prepare(`SELECT id,slug,title,synopsis,tags,genres,status,is_original FROM novels ORDER BY title`).all();
console.log(`📚 ${all.length} obras carregadas\n`);

// 4. HELPERS
function stripSuffix(text) {
  let t = text;
  for (const rx of [
    /\n*\s*\[(?:From|Edited\s+from|Based\s+on|Partially\s+(?:from|taken\s+from))\s*[^\]]*\]\s*$/i,
    /\n*\s*\(Source:\s*[^)]*\)\s*$/i,
    /\n*\s*Note:\s*[^\n]*$/i,
    /\n*\s*Spiritual\s+sequel\s+of\s+[^.]*\.\s*$/i,
    /\n*\s*[A-Z][\w\sà-ÿ]{10,120}?\s+(?:is|são)\s+the\s+(?:first|second|third)\s+set\s*(?:of\s+stories|\([^)]+\))?[^.]*\.\s*$/i,
  ]) {
    if (rx.test(t)) t = t.replace(rx, '');
  }
  const cleaned = t.trim();
  return { text: cleaned, changed: cleaned !== text.trim() };
}

function makeSynopsis(title, charName, setting, actionText, tone) {
  // Build a proper 2-paragraph synopsis from extracted elements
  const gen = (tone || '').toLowerCase();
  const isBL = gen.includes('bl');
  const isRomance = gen.includes('romântic') || gen.includes('romance') || gen.includes('romântica');
  const isDrama = gen.includes('drama') || gen.includes('ação');
  const isFantasy = gen.includes('fantasia');
  const isComedy = gen.includes('comédia');

  // Paragraph 1 — setting / hook
  let p1;
  if (setting && charName) {
    const s = setting.charAt(0).toLowerCase() + setting.slice(1);
    p1 = `${charName} nunca imaginou que ${s.replace(/\.$/, '')} — mas é ali que sua vida ganha um rumo inesperado.`;
  } else if (charName) {
    p1 = `${charName} está prestes a descobrir que a vida pode surpreender quando menos se espera.`;
  } else {
    p1 = `${title} é uma história sobre encontros que mudam tudo.`;
  }

  // Paragraph 2 — the core conflict
  let p2;
  if (actionText) {
    p2 = actionText.charAt(0).toUpperCase() + actionText.slice(1);
    if (!/[.!?]$/.test(p2)) p2 += '.';
  } else {
    // Fallback: built from context
    if (isRomance) {
      p2 = `Dois corações que deveriam seguir caminhos opostos se encontram no momento mais improvável. Entre silêncios que pesam mais que palavras e encontros que parecem escritos pelas estrelas, cada instante os aproxima de uma verdade que ambos têm medo de enfrentar: talvez o destino não seja apenas um ponto de partida — talvez seja a única chance de recomeçar.`;
    } else if (isFantasy) {
      p2 = `Em um mundo onde magia e destino se entrelaçam, uma jornada começa. Cada passo revela segredos antigos, inimigos que espreitam nas sombras e aliados que surgem onde menos se espera. O caminho é perigoso, mas algumas verdades valem qualquer risco.`;
    } else {
      p2 = `O que começa como um encontro casual se transforma em uma jornada que nenhum dos dois esperava. Cada escolha revela segredos, aproxima corações e testa os limites do que cada um está disposto a sacrificar.`;
    }
  }

  // Closing reflection
  let p3;
  if (isRomance && isBL) {
    p3 = 'Entre o que precisa ser dito e o que insiste em ficar calado, nasce uma história que prova que o amor não segue roteiro — e que, às vezes, o melhor final é aquele que a gente nunca planejou.';
  } else if (isRomance) {
    p3 = 'Entre o que precisa ser dito e o que insiste em ficar calado, nasce uma história que prova que o amor não segue roteiro — e que, às vezes, o melhor final é aquele que a gente nunca planejou.';
  } else if (isDrama) {
    p3 = 'Em meio ao caos e às escolhas impossíveis, alguns laços são forjados no fogo — e é nessa chama que duas pessoas descobrem que, juntas, podem ser mais fortes do que jamais imaginaram.';
  } else if (isFantasy) {
    p3 = 'Em um mundo onde magia e destino se entrelaçam, algumas almas estão destinadas a se encontrar — mesmo que o preço seja mais alto do que qualquer um deles está disposto a pagar.';
  } else if (isComedy) {
    p3 = 'Entre confusões, encontros inesperados e sentimentos que insistem em aparecer, alguns começos são tão desastrados que só poderiam terminar em amor.';
  } else {
    p3 = 'Nesta jornada, cada escolha revela que o destino é apenas o ponto de partida — o que importa é o caminho que se decide trilhar.';
  }

  return `${p1}\n\n${p2}\n\n${p3}`;
}

// 5. PROCESS
const upd = [];
let clean = 0, unchanged = 0, rewritten = 0, sourceClean = 0;
const flags = [];

const stmt = s.prepare(`UPDATE novels SET synopsis=?,tagline=?,target_audience=?,tone=?,internal_notes=?,classification_rating=?,content_warnings=? WHERE id=?`);
const batch = s.transaction(items => { items.forEach(i => stmt.run(...i)); });

all.forEach(n => {
  const orig = n.synopsis || '';
  if (!orig) { unchanged++; return; }
  let text = orig;
  let tagline = null, targetAudience = null, tone = null;
  let internalNotes = null, classRate = null, contentWarn = null;
  let c = [];

  if (n.is_original) {
    // Original Tomoverso novel
    // Remove "O diferencial da obra é ..."
    const diff = text.match(/\.?\s*O\s+diferencial\s+da\s+obra\s+é[^.]*\.?\s*/i);
    if (diff) {
      internalNotes = diff[0].replace(/^[.\s]*/, '').trim();
      text = text.replace(diff[0], '.');
      c.push('diferencial');
    }

    // Check for boilerplate "é uma obra original Tomo Verso sobre"
    if (/é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre/i.test(text)) {
      // Extract character name + setting from "sobre [Nome], cuja rotina muda em [setting]."
      const pm = text.match(/é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre\s+([^,]+),\s+cuja\s+rotina\s+muda\s+em\s+([^.!]+[.!])/i);
      const charName = pm ? pm[1].trim() : '';
      const setting = pm ? pm[2].trim() : '';

      // Extract tone from "Ao lado de [Nome], a história desenvolve um [gênero]..."
      const tm = text.match(/Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+(.+?)(\.\s*)?$/i);
      if (tm) tone = tm[1].replace(/\.$/, '').trim();

      // Extract action text between "sobre..." and "Ao lado de..."
      let action = '';
      const am = text.match(/\.\s*([A-ZÀ-Ú][^.!]*[.!])\s*Ao\s+lado\s+de/i);
      if (am) action = am[1].trim();
      else {
        // Fallback: everything after first sentence of the intro
        const afterIntro = text.replace(/^[^.]*\.\s*/, '');
        const am2 = afterIntro.match(/^([^.!]*[.!]?)/);
        if (am2 && am2[1].length > 10) action = am2[1].trim();
      }

      text = makeSynopsis(n.title, charName, setting, action, tone);
      c.push('reescrita');
      rewritten++;
    }

    // Also extract classification/avisos if remaining
    const cl = text.match(/(Classificação\s+indicativa\s*:\s*[^.\n]+)/i);
    const wa = text.match(/(Avisos?\s+de\s+conteúdo\s*:\s*[^.\n]+)/i);
    if (cl) { classRate = cl[1].replace(/Classificação\s+indicativa\s*:\s*/i,'').trim(); text=text.replace(cl[1],''); c.push('class'); }
    if (wa) { contentWarn = wa[1].replace(/Avisos?\s+de\s+conteúdo\s*:\s*/i,'').trim(); text=text.replace(wa[1],''); c.push('avisos'); }

    // Remove "Status: ..." line
    text = text.replace(/\.?\s*Status\s*:\s*[^.]*\.\s*\+\.?\s*/i, '');

    if (c.length > 0) {
      upd.push([text,tagline,targetAudience,tone,internalNotes,classRate,contentWarn,n.id]);
      clean++;
    } else unchanged++;

  } else {
    // Imported
    const src = stripSuffix(text);
    if (src.changed) {
      text = src.text;
      c.push('fonte');
      sourceClean++;
    }
    // Remaining classification in imported?
    const cl = text.match(/(Classificação\s+indicativa\s*:\s*[^.\n]+)/i);
    const wa = text.match(/(Avisos?\s+de\s+conteúdo\s*:\s*[^.\n]+)/i);
    if (cl) { classRate = cl[1].replace(/Classificação\s+indicativa\s*:\s*/i,'').trim(); text=text.replace(cl[1],''); c.push('class'); }
    if (wa) { contentWarn = wa[1].replace(/Avisos?\s+de\s+conteúdo\s*:\s*/i,'').trim(); text=text.replace(wa[1],''); c.push('avisos'); }

    // Normalize whitespace
    text = text.replace(/\n{4,}/g, '\n\n').trim();

    if (c.length > 0) {
      upd.push([text,tagline,targetAudience,tone,internalNotes,classRate,contentWarn,n.id]);
      clean++;
    } else unchanged++;
  }

  // Flag very short synopses
  if (text.length < 60 && c.length > 0) {
    flags.push({slug:n.slug, title:n.title});
  }

  if (c.length > 0) {
    console.log(`\n📖 ${n.title}`);
    console.log(`   ${c.join(', ')}`);
    if (n.is_original && rewritten > (clean - rewritten - sourceClean) <= 0) {
      console.log(`   ${text.slice(0,250)}...`);
    }
  }
});

// 6. APPLY
if (upd.length > 0) {
  batch(upd);
  console.log(`\n\n✅ ${upd.length} sinopses atualizadas!`);
}

// 7. VERIFY
const v1 = s.prepare(`SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%Classificação indicativa%'`).get();
const v2 = s.prepare(`SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%é uma obra original Tomo Verso%'`).get();
const v3 = s.prepare(`SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%[From%'`).get();
const v4 = s.prepare(`SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%[Edited%'`).get();
console.log(`\nAinda com classificação: ${v1.c}`);
console.log(`Ainda com boilerplate:  ${v2.c}`);
console.log(`Ainda com [From/Edited: ${v3.c + v4.c}`);

// 8. SHOW SAMPLES
console.log(`\n\n📚 AMOSTRAS DE SINOPESES REESCRITAS:`);
const smpl = s.prepare(`SELECT title,synopsis,tone FROM novels WHERE is_original=1 AND tone IS NOT NULL LIMIT 5`).all();
smpl.forEach(n => {
  console.log(`\n━━━ ${n.title} ━━━`);
  console.log(`Tom: ${n.tone}`);
  console.log(n.synopsis);
});

// 9. FINAL REPORT
console.log(`\n══════════════════════════════════════════════`);
console.log(`  RELATÓRIO FINAL`);
console.log(`══════════════════════════════════════════════`);
console.log(`  Total:     ${all.length}`);
console.log(`  Alteradas: ${clean}`);
console.log(`  Preservadas: ${unchanged}`);
console.log(`  Reescritas:  ${rewritten}`);
console.log(`  Fontes removidas: ${sourceClean}`);
console.log(`  Para revisão: ${flags.length}`);
console.log(`══════════════════════════════════════════════`);

if (flags.length > 0) {
  console.log(`\n⚠️  Sinopses muito curtas (< 60ch):`);
  flags.forEach(f => console.log(`  • ${f.title} (${f.slug})`));
}

s.close();
