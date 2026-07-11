const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

console.log('=== AMOSTRAS DE SINOPSES REESCRITAS ===\n');
const samples = s.prepare(`
  SELECT n.title, n.slug, n.synopsis, n.tone, n.classification_rating, n.content_warnings, n.is_original
  FROM novels n
  WHERE n.tone IS NOT NULL
  ORDER BY n.created_at DESC
  LIMIT 5
`).all();

for (const n of samples) {
  console.log(`━━━ ${n.title} ━━━`);
  console.log(`Tone: ${n.tone}`);
  if (n.classification_rating) console.log(`Class: ${n.classification_rating}`);
  if (n.content_warnings) console.log(`Avisos: ${n.content_warnings}`);
  console.log(`\n${n.synopsis}\n`);
}

console.log('\n=== VERIFICACAO: sinopses limpas (sem contaminacao) ===\n');
const checks = s.prepare(`
  SELECT COUNT(*) as total,
    SUM(CASE WHEN synopsis LIKE '%Classificação indicativa%' THEN 1 ELSE 0 END) as tem_class,
    SUM(CASE WHEN synopsis LIKE '%Avisos de conteúdo%' THEN 1 ELSE 0 END) as tem_avisos,
    SUM(CASE WHEN synopsis LIKE '%Status:%' THEN 1 ELSE 0 END) as tem_status,
    SUM(CASE WHEN synopsis LIKE '%O diferencial%' THEN 1 ELSE 0 END) as tem_diferencial,
    SUM(CASE WHEN synopsis LIKE '%, cuja rotina%' THEN 1 ELSE 0 END) as tem_boilerplate,
    SUM(CASE WHEN synopsis LIKE '%[From%' OR synopsis LIKE '%[Edited%' THEN 1 ELSE 0 END) as tem_fonte,
    SUM(CASE WHEN synopsis REGEXP '^\\.\\s*\\.' THEN 1 ELSE 0 END) as tem_ponto_artefato
  FROM novels
`).get();

console.log(JSON.stringify(checks, null, 2));

console.log('\n=== STATS ===\n');
const stats = s.prepare(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN tone IS NOT NULL THEN 1 ELSE 0 END) as com_tone,
    SUM(CASE WHEN tagline IS NOT NULL THEN 1 ELSE 0 END) as com_tagline,
    SUM(CASE WHEN classification_rating IS NOT NULL THEN 1 ELSE 0 END) as com_classificacao,
    SUM(CASE WHEN content_warnings IS NOT NULL THEN 1 ELSE 0 END) as com_avisos,
    SUM(CASE WHEN subtitle IS NOT NULL THEN 1 ELSE 0 END) as com_subtitulo
  FROM novels
`).get();

console.log(JSON.stringify(stats, null, 2));
