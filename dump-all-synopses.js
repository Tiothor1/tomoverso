const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const rows = s.prepare("SELECT id, slug, title, type, substr(synopsis,1,1200) as synopsis FROM novels ORDER BY is_original DESC, title").all();

rows.forEach((r, i) => {
  console.log(`\n=== [${i+1}] ${r.title} (${r.slug}) | type=${r.type} | id=${r.id.slice(0,8)} ===`);
  console.log(r.synopsis);
});
s.close();
