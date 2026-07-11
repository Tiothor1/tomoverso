const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const fs = require('fs');

console.log('══════════════════════════════════════════════');
console.log('  CORREÇÃO COMPLETA DE SINOPESES v2 — TOMOVERSEO');
console.log('══════════════════════════════════════════════\n');

// 1. ADD MISSING COLUMNS
const newColumns = [
  { name: 'subtitle', type: 'TEXT DEFAULT NULL' },
  { name: 'tagline', type: 'TEXT DEFAULT NULL' },
  { name: 'target_audience', type: 'TEXT DEFAULT NULL' },
  { name: 'tone', type: 'TEXT DEFAULT NULL' },
  { name: 'internal_notes', type: 'TEXT DEFAULT NULL' },
  { name: 'classification_rating', type: 'TEXT DEFAULT NULL' },
  { name: 'content_warnings', type: 'TEXT DEFAULT NULL' },
];

let colsAdded = 0;
newColumns.forEach(col => {
  const exists = s.prepare(`SELECT COUNT(*) as c FROM pragma_table_info('novels') WHERE name='${col.name}'`).get();
  if (exists.c === 0) {
    s.prepare(`ALTER TABLE novels ADD COLUMN ${col.name} ${col.type}`).run();
    console.log(`  ✅ Coluna criada: ${col.name}`);
    colsAdded++;
  } else {
    console.log(`  ℹ️  Coluna já existe: ${col.name}`);
  }
});
console.log(`\nTotal colunas adicionadas: ${colsAdded}\n`);

// 2. FETCH ALL NOVELS
const allNovels = s.prepare("SELECT id, slug, title, type, synopsis, tags, genres, status, is_original FROM novels ORDER BY is_original DESC, title").all();
console.log(`📚 Total obras auditadas: ${allNovels.length}\n`);

// 3. HELPER FUNCTIONS

// Strip source notes safely - only at the END of the text
function stripSourceNotes(text) {
  if (!text) return text;
  let result = text;
  let changed = false;
  
  // Patterns that appear at the END of synopsis
  const endPatterns = [
    /\n*\s*\[(?:From|Edited\s+from|Based\s+on|Partially\s+(?:from|taken\s+from))\s*[^\]]*\]\s*$/i,
    /\n*\s*\(Source:\s*[^)]*\)\s*$/gi,
    /\n*\s*Note:\s*[^\n]*$/gi,
    /\n*\s*\[(?:From|Edited\s+from|Based\s+on)\s*[^\]]*\]\s*/gi,
    /\n*\s*Spiritual\s+sequel\s+of\s+[^.]*\.\s*$/gi,
    /\n*\s*[A-Z][a-zA-ZÀ-ÿ\s]{10,120}?(?:is|são)\s+the\s+(?:first|second|third)\s+set\s+(?:of\s+stories|\([^)]+\))[^.]*\.\s*$/gi,
    /\n*\s*[A-Z][a-zA-ZÀ-ÿ\s]{10,120}?(?:compreende|comprising|includes?)[^.]*\.\s*$/gi,
  ];
  
  for (const p of endPatterns) {
    if (p.test(result)) {
      result = result.replace(p, '');
      changed = true;
    }
  }
  
  return { text: result.trim(), changed };
}

// Rewrite original Tomoverso synopsis from its formula components
function rewriteOriginalSynopsis(title, originalText, extractedTone) {
  // Parse the original formula structure:
  // "[Title] é uma obra original Tomo Verso sobre [Personagem], cuja rotina muda em [setting]. [Personagem] [ação A] enquanto [outro] [ação B]. Ao lado de [outro], a história desenvolve um [gênero]..."
  
  let text = originalText;
  let tone = extractedTone;
  
  // Extract: "é uma obra original Tomo Verso sobre [Personagem], cuja rotina muda em [setting]."
  const charMatch = text.match(/é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre\s+([^,]+),\s+cuja\s+rotina\s+muda\s+em\s+([^.!]+[.!])/i);
  
  // Extract: "[Personagem] [ação A] enquanto [outro] [ação B]."
  const actionMatch = text.match(/\.\s*([A-ZÀ-Ú][^.!]+[.]?)\s*Ao\s+lado\s+de/i);
  
  // Extract: "Ao lado de [outro], a história desenvolve um [gênero]..."
  if (!tone) {
    const genreMatch = text.match(/Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+(.+?)(\.\s*)?$/i);
    if (genreMatch) {
      tone = genreMatch[1].replace(/\.$/, '');
    }
  }
  
  if (!charMatch && !actionMatch) {
    // Can't parse - return original text cleaned
    return { synopsis: text, tone, needReview: true };
  }
  
  const charName = charMatch ? charMatch[1].trim() : '';
  const setting = charMatch ? charMatch[2].trim() : '';
  
  let actionText = '';
  if (actionMatch) {
    actionText = actionMatch[1].replace(/^\.?\s*/, '').trim();
  } else {
    // Find text between "Tomo Verso sobre..." and "Ao lado de..."
    const between = text.match(/\.\s*([^.!]+[.!]?)\s*(?:Ao\s+lado\s+de|$)/i);
    if (between && between[1].length > 10) {
      actionText = between[1].trim();
    }
  }
  
  // Reconstruct a proper 2-paragraph synopsis
  // Paragraph 1: Set the scene
  let para1 = '';
  if (setting) {
    para1 = `${charName} nunca imaginou que ${setting.charAt(0).toLowerCase() + setting.slice(1)}`;
    para1 = para1.replace(/\.$/, '');
    para1 += ' — mas é exatamente ali que sua vida ganha um rumo inesperado.';
  } else {
    para1 = `${charName} está prestes a descobrir que a vida pode surpreender quando menos se espera.`;
  }
  
  // Paragraph 2: The conflict/premise
  let para2 = '';
  if (actionText) {
    // Make the action text flow naturally
    para2 = actionText.charAt(0).toUpperCase() + actionText.slice(1);
    if (!para2.endsWith('.') && !para2.endsWith('!') && !para2.endsWith('?')) {
      para2 += '.';
    }
  }
  
  // Add a closing line based on tone
  let closingLine = '';
  if (tone) {
    const toneLower = tone.toLowerCase();
    if (toneLower.includes('romântic') || toneLower.includes('romance')) {
      if (toneLower.includes('bl')) {
        closingLine = 'Entre o que precisa ser dito e o que insiste em ficar calado, nasce uma história que prova que o amor não segue roteiro — e que, às vezes, o melhor final é aquele que a gente nunca planejou.';
      } else {
        closingLine = 'Entre o que precisa ser dito e o que insiste em ficar calado, nasce uma história que prova que o amor não segue roteiro — e que, às vezes, o melhor final é aquele que a gente nunca planejou.';
      }
    } else if (toneLower.includes('drama') || toneLower.includes('ação')) {
      closingLine = 'Em meio ao caos e às escolhas impossíveis, alguns laços são forjados no fogo — e é nessa chama que duas pessoas descobrem que, juntas, podem ser mais fortes do que jamais imaginaram.';
    } else if (toneLower.includes('fantasia')) {
      closingLine = 'Em um mundo onde magia e destino se entrelaçam, algumas almas estão destinadas a se encontrar — mesmo que o preço seja mais alto do que qualquer um deles está disposto a pagar.';
    } else if (toneLower.includes('comédia')) {
      closingLine = 'Entre confusões, encontros inesperados e sentimentos que insistem em aparecer, alguns começos são tão desastrados que só poderiam terminar em amor.';
    } else {
      closingLine = 'Nesta jornada, cada escolha revela que o destino é apenas o ponto de partida — o que importa é o caminho que se decide trilhar.';
    }
  } else {
    closingLine = 'Nesta jornada, cada escolha revela que o destino é apenas o ponto de partida — o que importa é o caminho que se decide trilhar.';
  }
  
  let newSynopsis = para1 + '\n\n' + para2;
  if (para2) {
    newSynopsis += '\n\n' + closingLine;
  } else {
    newSynopsis += '\n\n' + closingLine;
  }
  
  return { synopsis: newSynopsis, tone, needReview: false };
}

// 4. PROCESS EACH NOVEL
const report = {
  total: allNovels.length,
  cleaned: 0,
  unchanged: 0,
  source_notes_removed: 0,
  boilerplate_removed: 0,
  rewritten: 0,
  flags: []
};

const updateStmt = s.prepare(`
  UPDATE novels SET 
    synopsis = ?, tagline = ?, target_audience = ?, tone = ?,
    internal_notes = ?, classification_rating = ?, content_warnings = ?
  WHERE id = ?
`);

const updateAll = s.transaction((items) => {
  for (const item of items) {
    updateStmt.run(...item);
  }
});

const updates = [];

allNovels.forEach(novel => {
  const orig = novel.synopsis || '';
  if (!orig) {
    report.unchanged++;
    return;
  }
  
  let text = orig;
  let tagline = null;
  let targetAudience = null;
  let tone = null;
  let internalNotes = null;
  let classificationRating = null;
  let contentWarnings = null;
  let needReview = false;
  let changes = [];

  if (novel.is_original) {
    // === ORIGINAL TOMOVERSO NOVELS ===
    
    // Strip "Status: Em andamento. +."  
    text = text.replace(/\.?\s*Status\s*:\s*[^.]*\.\s*\+\.?\s*/i, '');
    
    // Extract "O diferencial da obra é ..."
    const diffMatch = text.match(/\.?\s*O\s+diferencial\s+da\s+obra\s+é[^.]*\.?\s*/i);
    if (diffMatch) {
      internalNotes = diffMatch[0].replace(/^[.\s]*/, '').trim();
      text = text.replace(diffMatch[0], '.');
      changes.push('diferencial extraído');
    }
    
    // Extract "Classificação indicativa" and "Avisos de conteúdo"
    const classMatch = text.match(/(Classificação\s+indicativa\s*:\s*[^.\n]+)/i);
    const warnMatch = text.match(/(Avisos?\s+de\s+conteúdo\s*:\s*[^.\n]+)/i);
    
    if (classMatch) {
      classificationRating = classMatch[1].replace(/Classificação\s+indicativa\s*:\s*/i, '').trim();
      text = text.replace(classMatch[1], '');
      changes.push('classificação extraída');
    }
    if (warnMatch) {
      contentWarnings = warnMatch[1].replace(/Avisos?\s+de\s+conteúdo\s*:\s*/i, '').trim();
      text = text.replace(warnMatch[1], '');
      changes.push('avisos extraídos');
    }
    
    // Check if this has the TomoVerso boilerplate formula
    if (/é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre/i.test(text)) {
      // Extract tone first
      const genreMatch = text.match(/Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+(.+?)(\.\s*)?$/i);
      if (genreMatch) {
        tone = genreMatch[1].replace(/\.$/, '').trim();
      }
      
      // Rewrite the synopsis
      const result = rewriteOriginalSynopsis(novel.title, text, tone);
      text = result.synopsis;
      tone = result.tone || tone;
      needReview = result.needReview;
      changes.push('reescrita automática');
      report.rewritten++;
    }
    
    if (changes.length > 0) {
      updates.push([text, tagline, targetAudience, tone, internalNotes, classificationRating, contentWarnings, novel.id]);
      report.cleaned++;
      report.boilerplate_removed++;
    } else {
      report.unchanged++;
    }
    
  } else {
    // === IMPORTED NOVELS ===
    
    // Strip source notes
    const result = stripSourceNotes(text);
    if (result.changed) {
      text = result.text;
      changes.push('notas de fonte removidas');
      report.source_notes_removed++;
    }
    
    // Also check for classification remaining
    const classMatch = text.match(/(Classificação\s+indicativa\s*:\s*[^.\n]+)/i);
    const warnMatch = text.match(/(Avisos?\s+de\s+conteúdo\s*:\s*[^.\n]+)/i);
    
    if (classMatch || warnMatch) {
      if (classMatch) {
        classificationRating = classMatch[1].replace(/Classificação\s+indicativa\s*:\s*/i, '').trim();
        text = text.replace(classMatch[1], '');
      }
      if (warnMatch) {
        contentWarnings = warnMatch[1].replace(/Avisos?\s+de\s+conteúdo\s*:\s*/i, '').trim();
        text = text.replace(warnMatch[1], '');
      }
      changes.push('classificação/avisos extraídos');
    }
    
    // Clean up whitespace
    text = text.replace(/\n{4,}/g, '\n\n').trim();
    
    if (changes.length > 0) {
      updates.push([text, tagline, targetAudience, tone, internalNotes, classificationRating, contentWarnings, novel.id]);
      report.cleaned++;
      changes.forEach(c => {
        if (c === 'notas de fonte removidas') report.source_notes_removed++;
      });
    } else {
      report.unchanged++;
    }
  }
  
  // Log if anything changed
  if (changes.length > 0) {
    console.log(`\n📖 ${novel.title} (${novel.slug}) [${changes.join(', ')}]`);
    if (orig.length < 300) {
      console.log(`   ANTES: ${orig}`);
    } else {
      console.log(`   ANTES: ${orig.slice(0,200)}...${orig.slice(-100)}`);
    }
    if (text !== orig) {
      if (text.length < 400) {
        console.log(`   DEPOIS: ${text}`);
      } else {
        console.log(`   DEPOIS: ${text.slice(0,250)}...${text.slice(-100)}`);
      }
    }
  }
});

// 5. APPLY UPDATES
if (updates.length > 0) {
  updateAll(updates);
  console.log(`\n\n✅ ${updates.length} sinopses atualizadas no banco!`);
} else {
  console.log('\nℹ️  Nenhuma alteração necessária.');
}

// 6. VERIFY
const remainingClass = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%Classificação indicativa%' OR synopsis LIKE '%classificação indicativa%'").get();
console.log(`\nAinda com classificação indicativa: ${remainingClass.c}`);

const remainingAvisos = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%Avisos de conteúdo%' OR synopsis LIKE '%avisos de conteúdo%'").get();
console.log(`Ainda com avisos de conteúdo: ${remainingAvisos.c}`);

const remainingBoiler = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%uma obra original Tomo Verso%'").get();
console.log(`Ainda com boilerplate TomoVerso: ${remainingBoiler.c}`);

const remainingSource = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%\\[From%' OR synopsis LIKE '%(Source:%'").get();
console.log(`Ainda com notas de fonte: ${remainingSource.c}`);

// 7. SAMPLE SPOT CHECK - show a few cleaned synopses
console.log(`\n\n--- AMOSTRAS DE SINOPESES CORRIGIDAS ---`);

const originals = s.prepare("SELECT title, synopsis, tone FROM novels WHERE is_original = 1 AND tone IS NOT NULL LIMIT 5").all();
console.log(`\n📚 Obras originais TomoVerso (amostra):`);
originals.forEach(n => {
  console.log(`\n--- ${n.title} ---`);
  console.log(`Tom: ${n.tone}`);
  console.log(n.synopsis);
});

// 8. SUMMARY
console.log(`\n══════════════════════════════════════════════`);
console.log(`  RELATÓRIO FINAL`);
console.log(`══════════════════════════════════════════════`);
console.log(`  Total obras auditadas:    ${report.total}`);
console.log(`  Sinopses alteradas:       ${report.cleaned}`);
console.log(`  Sinopses preservadas:     ${report.unchanged}`);
console.log(`  Notas de fonte removidas: ${report.source_notes_removed}`);
console.log(`  Sinopses reescritas:      ${report.rewritten}`);
console.log(`  Status restante no banco: `);
console.log(`    Classificação indicativa: ${remainingClass.c}`);
console.log(`    Avisos de conteúdo:       ${remainingAvisos.c}`);
console.log(`    Boilerplate TomoVerso:    ${remainingBoiler.c}`);
console.log(`    Notas de fonte:           ${remainingSource.c}`);
console.log(`══════════════════════════════════════════════`);

s.close();
