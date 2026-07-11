const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const rows = s.prepare("SELECT id, slug, title, type, synopsis, tags, genres, status FROM novels ORDER BY is_original DESC, title").all();

console.log(`Total obras: ${rows.length}\n`);

// Patterns to detect contamination
const patterns = [
  { name: 'Classificação indicativa', regex: /classificação\s+indicativa/i },
  { name: 'Avisos de conteúdo', regex: /avisos?\s+de\s+conteúdo/i },
  { name: 'Status:', regex: /Status\s*:/ },
  { name: 'Tag:', regex: /Tags?\s*:/i },
  { name: 'Tom:', regex: /Tom\s*:/i },
  { name: 'Público-alvo:', regex: /Público[-\s]alvo\s*:/i },
  { name: 'Subtítulo:', regex: /Subt[íi]tulo\s*:/i },
  { name: 'Frase de impacto/tagline', regex: /Frase\s+de\s+impacto/i },
  { name: 'Observações internas', regex: /Observa[çc][ãa]o/i },
  { name: 'Sinopse:', regex: /^Sinopse\s*:/im },
  { name: '▶', regex: /▶/ },
  { name: 'O diferencial da obra', regex: /[Oo]\s+diferencial\s+da\s+obra/i },
  { name: 'Sinopse original', regex: /sinopse\s+original/i },
];

rows.forEach(r => {
  const s = r.synopsis || '';
  const issues = patterns
    .filter(p => p.regex.test(s))
    .map(p => p.name);

  if (issues.length > 0 || s.length > 600) {
    console.log(`[${r.id.slice(0,6)}] ${r.title}`);
    console.log(`  type=${r.type}  len=${s.length}`);
    if (issues.length > 0) console.log(`  ⚠️  ${issues.join(', ')}`);
    console.log(`  INÍCIO: ${s.slice(0,200)}...`);
    // Show the last 300 chars to see what's at the end
    const tail = s.slice(-300);
    if (s.length > 300) {
      console.log(`  ...FINAL: ${tail}`);
    }
    console.log();
  }
});

s.close();
