const s = require('better-sqlite3')('/var/www/tomoverso/data-runtime/tomoverso.db');

// Get table info
const cols = s.prepare("PRAGMA table_info(novels)").all();
console.log("=== COLUNAS DA TABELA novels ===");
cols.forEach(c => {
  console.log(`${c.cid} | ${c.name.padEnd(30)} | ${c.type.padEnd(15)} | ${c.notnull ? 'NOT NULL' : 'nullable'}`);
});
console.log();

// Count total novels
const total = s.prepare("SELECT COUNT(*) as c FROM novels").get();
console.log(`Total novels: ${total.c}`);

// Check which metadata columns exist
const metaCols = ['subtitle','subtitle','target_audience','publico_alvo','tone','tom','tags','tagline','catchphrase','internal_notes','observacoes','classification','classificacao_indicativa','content_warnings','avisos_conteudo','status'];
metaCols.forEach(col => {
  const has = s.prepare(`SELECT COUNT(*) as c FROM pragma_table_info('novels') WHERE name='${col}'`).get();
  if (has.c === 0) {
    console.log(`  ❌ Coluna não existe: ${col}`);
  } else {
    console.log(`  ✅ Coluna existe: ${col}`);
  }
});

s.close();
