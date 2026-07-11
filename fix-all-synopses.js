const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const fs = require('fs');

console.log('══════════════════════════════════════════════');
console.log('  CORREÇÃO COMPLETA DE SINOPESES — TOMOVERSEO');
console.log('══════════════════════════════════════════════\n');

// 1. BACKUP
const backupPath = `/var/www/tomoverso/data-runtime/tomoverso.backup-synopses-${Date.now()}.db`;
fs.copyFileSync('/var/www/tomoverso/data-runtime/tomoverso.db', backupPath);
console.log(`✅ Backup: ${backupPath}\n`);

// 2. ADD MISSING COLUMNS
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

// 3. FETCH ALL NOVELS
const allNovels = s.prepare("SELECT id, slug, title, type, synopsis, tags, genres, status, is_original FROM novels ORDER BY title").all();
console.log(`📚 Total obras auditadas: ${allNovels.length}\n`);

// 4. HELPER FUNCTIONS
function stripSourceNotes(text) {
  if (!text) return text;
  // [From ...], [Edited from ...], [Based on ...], [Partially from ...], [Partially taken from ...]
  // [From official site], [From MangaGamer], [From Steam], etc.
  let result = text.replace(/\n*\s*\[(?:From|Edited\s+from|Based\s+on|Partially\s+(?:from|taken\s+from))\s*[^\]]*\]\s*/gi, '');
  // (Source: ...)
  result = result.replace(/\n*\s*\(Source:\s*[^)]*\)\s*/gi, '');
  // Note: ...
  result = result.replace(/\n*\s*Note:\s*[^\n]*/gi, '');
  // "is the first/second set of stories" paragraphs
  result = result.replace(/\n*\s*[A-Z][a-zA-Z\s]+is\s+the\s+(?:first|second|third)\s+set\s+of\s+stories[^.]*\.\s*/gi, '');
  result = result.replace(/\n*\s*[A-Z][a-zA-Z\s]+is\s+the\s+(?:first|second|third)\s+set\s*\([^)]*\)[^.]*\.\s*/gi, '');
  // "Spiritual sequel of ..."
  result = result.replace(/\n*\s*Spiritual\s+sequel\s+of\s+[^.]*\.\s*/gi, '');
  // Empty brackets cleanup
  result = result.replace(/\s*\[\s*\]\s*/g, '');
  return result.trim();
}

function hasBoilerplatePrefix(text) {
  return /^\s*[A-ZÀ-Ú][a-zà-ú\s]*(?:é|e)\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre\s+/i.test(text);
}

function hasBoilerplateSuffix(text) {
  return /Ao\s+lado\s+de\s+[^,]+,\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+/i.test(text);
}

function extractBoilerplatePrefix(text) {
  // Matches: "Nome é uma obra original Tomo Verso sobre [pessoa], cuja [situação]."
  const match = text.match(/^(.{10,150}?)\s*é\s+uma\s+obra\s+original\s+Tomo\s+Verso\s+sobre\s+/i);
  if (!match) return { clean: text, title_match: '' };
  
  // Find the end of the boilerplate intro
  const afterMatch = text.slice(match[0].length);
  
  // Try to find the story part: after "sobre [pessoa], cuja [descrição]." 
  // The intro typically goes: "sobre [Nome], cuja [descrição]. [Nome] [continuação]."
  const introMatch = afterMatch.match(/^([^.!]+[.!])\s*/);
  if (introMatch) {
    const storyAfter = afterMatch.slice(introMatch[0].length);
    // But maybe the entire intro is just the first sentence
    return { clean: storyAfter || afterMatch, extracted: `obra original Tomo Verso sobre ${introMatch[1]}`, title_match: match[1] };
  }
  
  return { clean: afterMatch, title_match: match[1] };
}

function extractBoilerplateSuffix(text) {
  // Matches: "Ao lado de [nome], a história desenvolve um [gênero] com [descrição]."
  const match = text.match(/Ao\s+lado\s+de\s+([^,]+),\s+a\s+hist[óo]ria\s+desenvolve\s+um\s+(.+?)(\.\s*)?$/i);
  if (match) {
    return {
      clean: text.slice(0, match.index).trim(),
      characters: match[1],
      story_type: match[2].replace(/\.$/, '')
    };
  }
  return { clean: text, characters: '', story_type: '' };
}

// 5. PROCESS EACH NOVEL
const report = {
  total: allNovels.length,
  cleaned: 0,
  flagged: 0,
  unchanged: 0,
  source_notes_removed: 0,
  boilerplate_removed: 0,
  with_classification: 0,
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
  let flagNotes = [];
  
  // --- STEP 1: Strip classification / avisos (if any remain) ---
  const classMatch = text.match(/(Classificação\s+indicativa\s*:\s*[^.\n]+)/i);
  const warnMatch = text.match(/(Avisos?\s+de\s+conteúdo\s*:\s*[^.\n]+)/i);
  
  if (classMatch) {
    classificationRating = classMatch[1].replace(/Classificação\s+indicativa\s*:\s*/i, '').trim();
    text = text.replace(classMatch[1], '');
    report.with_classification++;
  }
  if (warnMatch) {
    contentWarnings = warnMatch[1].replace(/Avisos?\s+de\s+conteúdo\s*:\s*/i, '').trim();
    text = text.replace(warnMatch[1], '');
  }
  
  // --- STEP 2: Strip "Status: Em andamento. +." (if present) ---
  const statusMatch = text.match(/\.?\s*Status\s*:\s*[^.]*\.\s*\+\.?\s*/i);
  if (statusMatch) {
    text = text.replace(statusMatch[0], '.');
  }
  
  // --- STEP 3: Strip "O diferencial da obra é ..." (if present) ---
  const diffMatch = text.match(/\.?\s*O\s+diferencial\s+da\s+obra\s+é[^.]*\.?\s*/i);
  if (diffMatch) {
    internalNotes = diffMatch[0].replace(/^[.\s]*/, '').replace(/[.\s]*$/, '');
    text = text.replace(diffMatch[0], '.');
    report.boilerplate_removed++;
  }
  
  // --- STEP 4: Strip source notes [From...] / (Source:...) ---
  const hadSourceNotes = /\[(?:From|Edited|Based|Partially)|\(Source:|Note:/i.test(text);
  if (hadSourceNotes) {
    text = stripSourceNotes(text);
    report.source_notes_removed++;
  }
  
  // --- STEP 5: For original novels, strip TomoVerso boilerplate ---
  if (novel.is_original) {
    // Check for suffix "Ao lado de [nome], a história desenvolve um [gênero]..."
    const suffix = extractBoilerplateSuffix(text);
    if (suffix.story_type) {
      tone = suffix.story_type;
      text = suffix.clean;
      report.boilerplate_removed++;
    }
    
    // Check for prefix "Nome é uma obra original Tomo Verso sobre [pessoa]..."
    const prefix = extractBoilerplatePrefix(text);
    if (prefix.clean !== text && prefix.clean.length > 0) {
      text = prefix.clean;
      // If we got a tagline, save it
      if (prefix.extracted) {
        internalNotes = internalNotes 
          ? `${internalNotes} | ${prefix.extracted}`
          : prefix.extracted;
      }
      report.boilerplate_removed++;
    }
  }
  
  // --- STEP 6: Clean up whitespace ---
  text = text.replace(/\s{3,}/g, '\n\n').trim();
  text = text.replace(/^\s*[.,;:!?]\s*/, '').trim(); // leading punctuation
  text = text.replace(/\.{2,}$/, '.'); // trailing .. => .
  
  // --- STEP 7: If the synopsis is now very different, record the update ---
  const changed = text !== orig;
  const needsReview = text.length < 50 || /uma obra original Tomo Verso/i.test(text) || /Classificação indicativa/i.test(text);
  
  if (changed || needsReview) {
    updates.push([text, tagline, targetAudience, tone, internalNotes, classificationRating, contentWarnings, novel.id]);
    report.cleaned++;
    
    if (needsReview) {
      report.flagged++;
      report.flags.push({ slug: novel.slug, title: novel.title, reason: 'synopsis too short after cleaning' });
    }
    
    console.log(`\n📖 ${novel.title} (${novel.slug})`);
    if (orig.length < 300) {
      console.log(`   ANTES: ${orig}`);
    } else {
      console.log(`   ANTES: ${orig.slice(0,200)}...`);
    }
    if (text.length < 300) {
      console.log(`   DEPOIS: ${text}`);
    } else {
      console.log(`   DEPOIS: ${text.slice(0,200)}...`);
    }
    if (classificationRating) console.log(`   🏷️  Classificação: ${classificationRating}`);
    if (contentWarnings) console.log(`   ⚠️  Avisos: ${contentWarnings}`);
    if (tone) console.log(`   🎭  Tom: ${tone}`);
    if (needsReview) console.log(`   ⚑  REVISÃO MANUAL: ${flagNotes.join(', ')}`);
  } else {
    report.unchanged++;
  }
});

// 6. APPLY UPDATES
if (updates.length > 0) {
  updateAll(updates);
  console.log(`\n\n✅ ${updates.length} sinopses atualizadas no banco!`);
} else {
  console.log('\nℹ️  Nenhuma alteração necessária.');
}

// 7. VERIFY
const remaining = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%Classificação%' OR synopsis LIKE '%classificação%' OR synopsis LIKE '%Avisos%' OR synopsis LIKE '%avisos%'").get();
console.log(`Ainda com classificação/avisos: ${remaining.c}`);

const boilerplate = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%uma obra original Tomo Verso%'").get();
console.log(`Ainda com boilerplate TomoVerso: ${boilerplate.c}`);

const sourceNotes = s.prepare("SELECT COUNT(*) as c FROM novels WHERE synopsis LIKE '%\\[From%' OR synopsis LIKE '%(Source:%'").get();
console.log(`Ainda com notas de fonte: ${sourceNotes.c}`);

// 8. SUMMARY
console.log(`\n══════════════════════════════════════════════`);
console.log(`  RELATÓRIO FINAL`);
console.log(`══════════════════════════════════════════════`);
console.log(`  Total obras auditadas: ${report.total}`);
console.log(`  Sinopses alteradas:    ${report.cleaned}`);
console.log(`  Sinopses preservadas:  ${report.unchanged}`);
console.log(`  Notas de fonte removidas: ${report.source_notes_removed}`);
console.log(`  Boilerplate removido:  ${report.boilerplate_removed}`);
console.log(`  Classificação extraída: ${report.with_classification}`);
console.log(`  Obras para revisão:    ${report.flagged}`);
console.log(`══════════════════════════════════════════════\n`);

if (report.flags.length > 0) {
  console.log('Obras que precisam de revisão manual:');
  report.flags.forEach(f => {
    console.log(`  ⚑ https://tomoverso.studio/novels/${f.slug} — ${f.reason}`);
  });
}

s.close();
