const live = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const backup = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.backup-v3-1783782857140.db');

// Show original text for the 3 remaining
const slugs = ['tres-minutos-antes-do-sim', 'a-loja-de-discos-do-meu-rival', 'o-piloto-que-nao-sabia-voltar'];

for (const slug of slugs) {
  const b = backup.prepare('SELECT title, synopsis FROM novels WHERE slug=?').get(slug);
  const l = live.prepare('SELECT synopsis, tone FROM novels WHERE slug=?').get(slug);
  console.log(`\n━━━ ${b?.title} ━━━`);
  console.log(`ORIGINAL:\n${b?.synopsis}`);
  console.log(`\nATUAL:\n${l?.synopsis}`);
}
