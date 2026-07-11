const s1 = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');
const s2 = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.backup-synopses-1783782437177.db');

// Check column count (schema difference)
const cols1 = s1.prepare("SELECT COUNT(*) as c FROM pragma_table_info('novels')").get();
const cols2 = s2.prepare("SELECT COUNT(*) as c FROM pragma_table_info('novels')").get();
console.log(`Colunas atuais: ${cols1.c}, Colunas backup: ${cols2.c}`);

// Check synopsis for one original novel in both DBs
const slug = 'a-chef-e-o-critico-desastrado';
const n1 = s1.prepare("SELECT synopsis FROM novels WHERE slug = ?").get(slug);
const n2 = s2.prepare("SELECT synopsis FROM novels WHERE slug = ?").get(slug);
console.log(`\nLIVE: ${n1?.synopsis.slice(0,300)}`);
console.log(`BACKUP: ${n2?.synopsis.slice(0,300)}`);

// Also check older backup
try {
  const s3 = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.backup-1783724965013.db');
  const cols3 = s3.prepare("SELECT COUNT(*) as c FROM pragma_table_info('novels')").get();
  const n3 = s3.prepare("SELECT synopsis FROM novels WHERE slug = ?").get(slug);
  console.log(`\nBackup-Jul10 cols: ${cols3.c}`);
  console.log(`Backup-Jul10 live: ${n3?.synopsis.slice(0,300)}`);
  s3.close();
} catch(e) { console.log("Backup-Jul10 not accessible:", e.message); }

s1.close();
s2.close();
