const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const rest = s.prepare("SELECT id, slug, title, synopsis FROM novels WHERE synopsis LIKE '%nunca imaginou%'").all();
console.log(`Restantes: ${rest.length}`);
for (const n of rest) {
  console.log(`\n━━━ ${n.title} ━━━`);
  console.log(n.synopsis.substring(0, 200));
}
