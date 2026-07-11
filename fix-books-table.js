const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const fs = require('fs');

console.log('═══════════════════════════════════════════');
console.log('  CORREÇÃO TABELA BOOKS');
console.log('═══════════════════════════════════════════\n');

// 1. Add extra columns to books table
const booksCols = ['subtitle', 'tagline', 'target_audience', 'tone', 'internal_notes', 'classification_rating', 'content_warnings'];
const existing = s.prepare("SELECT name FROM pragma_table_info('books')").all().map(r => r.name);

for (const col of booksCols) {
  if (!existing.includes(col)) {
    s.prepare(`ALTER TABLE books ADD COLUMN ${col} TEXT`).run();
    console.log(`✅ Coluna criada: books.${col}`);
  } else {
    console.log(`ℹ️  Coluna já existe: books.${col}`);
  }
}

// 2. Parse ALL books and extract metadata
const allBooks = s.prepare("SELECT id, slug, title, synopsis FROM books ORDER BY created_at DESC").all();

let cleaned = 0;
let withSubtitulo = 0;
let withClassIndicativa = 0;

for (const b of allBooks) {
  let text = b.synopsis || '';
  if (!text.trim()) continue;
  
  let subtitle = null;
  let tagline = null;
  let targetAudience = null;
  let tone = null;
  let classificationRating = null;
  let contentWarnings = null;
  let internalNotes = null;
  let changes = [];
  
  // Extract "Subtítulo: ..."
  const subM = text.match(/Subt[íi]tulo:\s*(.+?)(?:\s*(?:Sinopse|Frase de impacto|Público|Tom|Tags|Status|Classificação)\s*:|$)/i);
  if (subM) {
    subtitle = subM[1].trim();
    text = text.replace(subM[0], '').trim(); // Remove the matched subtitle section
    changes.push('subtítulo');
    withSubtitulo++;
  }
  
  // Extract "Sinopse: ..." (the actual synopsis)
  const synM = text.match(/Sinopse:\s*(.+?)(?:\s*(?:Frase de impacto|Público|Tom|Tags|Status|Classificação|Classificação indicativa|Avisos de conteúdo)\s*:|$)/i);
  if (synM) {
    text = synM[1].trim();
    changes.push('sinopse');
  }
  
  // Extract "Frase de impacto: ..."
  const tagM = text.match(/Frase\s+de\s+impacto:\s*(.+?)(?:\s*(?:Público|Tom|Tags|Status|Classificação)\s*:|$)/i);
  if (tagM) {
    tagline = tagM[1].trim();
    // Remove from text if it was matched from the original, not from already extracted sinopse
    text = text.replace(tagM[0], '').trim();
    changes.push('frase');
  }
  
  // Extract "Público: ..." -> target_audience
  const pubM = text.match(/P[úu]blico:\s*(.+?)(?:\s*(?:Tom|Tags|Status|Classificação)\s*:|$)/i);
  if (pubM) {
    targetAudience = pubM[1].trim();
    text = text.replace(pubM[0], '').trim();
    changes.push('público');
  }
  
  // Extract "Tom: ..." -> tone
  const tomM = text.match(/Tom:\s*(.+?)(?:\s*(?:Tags|Status|Classificação)\s*:|$)/i);
  if (tomM) {
    tone = tomM[1].trim();
    text = text.replace(tomM[0], '').trim();
    changes.push('tom');
  }
  
  // Extract "Tags: ..."
  const tagsM = text.match(/Tags:\s*(.+?)(?:\s*(?:Status|Classificação)\s*:|$)/i);
  if (tagsM) {
    // Save tags to internal_notes since books doesn't have a tags field
    internalNotes = tagsM[1].trim();
    text = text.replace(tagsM[0], '').trim();
    changes.push('tags');
  }
  
  // Extract "Status: ..."
  text = text.replace(/Status\s*:\s*[^.]*\.?\s*/i, '').trim();
  
  // Extract "Classificação: ..." -> classification_rating
  const classM = text.match(/Classificação\s*:\s*([^.\n]+)/i);
  if (classM) {
    classificationRating = classM[1].trim();
    text = text.replace(classM[0], '').trim();
    changes.push('classificação');
  }
  
  // Extract "Classificação indicativa: ..."
  const classIndM = text.match(/Classificação\s+indicativa\s*:\s*([^.\n]+)/i);
  if (classIndM) {
    classificationRating = classificationRating || classIndM[1].trim();
    text = text.replace(classIndM[0], '').trim();
    changes.push('class_ind');
    withClassIndicativa++;
  }
  
  // Extract "Avisos de conteúdo: ..."
  const avisosM = text.match(/Avisos\s+de\s+conteúdo\s*:\s*([^.\n]+)/i);
  if (avisosM) {
    contentWarnings = avisosM[1].trim();
    text = text.replace(avisosM[0], '').trim();
    changes.push('avisos');
  }
  
  // Clean up remaining whitespace and separators
  text = text.replace(/\.\s*\./g, '.').trim();
  text = text.replace(/^\s*[.·]\s*/, '').trim();
  
  // Remove leading/trailing dots and spaces
  text = text.replace(/^[.\s]+/, '').replace(/[.\s]+$/, '').trim();
  
  if (changes.length > 0 || text !== b.synopsis) {
    // Don't save internal_notes if not used
    s.prepare(`UPDATE books SET synopsis=?, subtitle=?, tagline=?, target_audience=?, tone=?, internal_notes=?, classification_rating=?, content_warnings=? WHERE id=?`)
      .run(text, subtitle, tagline, targetAudience, tone, changes.includes('tags') ? internalNotes : null, classificationRating, contentWarnings, b.id);
    cleaned++;
    console.log(`  ✅ ${b.title}: ${changes.join(', ')}`);
  }
}

console.log(`\n✅ Total books limpos: ${cleaned}`);
console.log(`   Com subtítulo: ${withSubtitulo}`);
console.log(`   Com classificação indicativa: ${withClassIndicativa}`);

// 3. Verify
console.log('\n=== VERIFICAÇÃO ===');
const v = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN synopsis LIKE '%Subtítulo:%' THEN 1 ELSE 0 END) as tem_sub,
    SUM(CASE WHEN synopsis LIKE '%Classificação indicativa:%' THEN 1 ELSE 0 END) as tem_class_ind,
    SUM(CASE WHEN synopsis LIKE '%Avisos de conteúdo:%' THEN 1 ELSE 0 END) as tem_avisos,
    SUM(CASE WHEN synopsis LIKE '%Sinopse:%' THEN 1 ELSE 0 END) as tem_sinopse_label,
    SUM(CASE WHEN synopsis LIKE '%Frase de impacto:%' THEN 1 ELSE 0 END) as tem_frase,
    SUM(CASE WHEN synopsis LIKE '%Público:%' THEN 1 ELSE 0 END) as tem_publico,
    SUM(CASE WHEN synopsis LIKE '%Tom:%' THEN 1 ELSE 0 END) as tem_tom,
    SUM(CASE WHEN synopsis LIKE '%Tags:%' THEN 1 ELSE 0 END) as tem_tags
  FROM books
`).get();
console.log(JSON.stringify(v, null, 2));
