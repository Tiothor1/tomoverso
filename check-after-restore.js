const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const cols = s.prepare("SELECT COUNT(*) as c FROM pragma_table_info('novels')").get();
console.log(`Columns: ${cols.c}`);

// Check synopsis
['a-chef-e-o-critico-desastrado', 'a-garota-que-consertava-constelacoes', 'solo-leveling', 'clannad'].forEach(slug => {
  const n = s.prepare("SELECT title, synopsis FROM novels WHERE slug = ?").get(slug);
  if (n) {
    const syn = n.synopsis || '';
    console.log(`\n--- ${n.title} (${syn.length}ch) ---`);
    console.log(syn.slice(0, 400));
  }
});
s.close();
