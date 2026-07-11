const sqlite3 = require('better-sqlite3');
const path = '/var/www/tomoverso/data-runtime/tomoverso.db';

console.log('=== Limpeza de Sinopses ===\n');

// Backup
const fs = require('fs');
const backup = path.replace('.db', `.backup-${Date.now()}.db`);
fs.copyFileSync(path, backup);
console.log(`Backup criado: ${backup}\n`);

const db = sqlite3(path);
const rows = db.prepare("SELECT id, title, synopsis FROM novels WHERE synopsis LIKE '%Classificação%' OR synopsis LIKE '%classificação%' OR synopsis LIKE '%Avisos%' OR synopsis LIKE '%Status:%'").all();

console.log(`Encontradas ${rows.length} obras para limpar\n`);

let cleaned = 0;
let errors = 0;

const cleanSynopsis = (text) => {
  if (!text) return text;
  
  let result = text;
  
  // 1. Remove "Status: Em andamento." (or similar) and everything after
  result = result.replace(/\.?\s*Status:\s*[^.]*\.\s*\+\.?\s*/gi, '.');
  
  // 2. Remove "O diferencial da obra é ..." pattern
  result = result.replace(/\.?\s*O\s+diferencial\s+da\s+obra\s+é[^.]+\./gi, '.');
  
  // 3. Remove "Classificação indicativa: ..." and everything after
  result = result.replace(/\n*\s*Classificação\s+indicativa[:.].*/gi, '');
  
  // 4. Remove "Avisos de conteúdo: ..."
  result = result.replace(/Avisos?\s+de\s+conteúdo[:.].*/gi, '');
  
  // 5. Remove trailing "(+.)" patterns
  result = result.replace(/\s*\+\.\s*/g, '');
  
  // 6. Clean up double spaces, trailing punctuation
  result = result.replace(/\s{2,}/g, ' ').trim();
  result = result.replace(/\.\.$/, '.'); // Double period
  result = result.replace(/\s+\.$/, '.'); // Space before period
  
  // Remove leading/trailing whitespace and ensure ends with period
  result = result.trim();
  if (result && !result.endsWith('.') && !result.endsWith('!') && !result.endsWith('?')) {
    result += '.';
  }
  
  return result;
};

// First, show what will be cleaned
const updateStmt = db.prepare("UPDATE novels SET synopsis = ? WHERE id = ?");
const updateMany = db.transaction((items) => {
  for (const [id, synopsis] of items) {
    updateStmt.run(synopsis, id);
  }
});

const updates = [];

for (const r of rows) {
  const original = r.synopsis;
  const cleanedText = cleanSynopsis(original);
  
  if (original !== cleanedText) {
    console.log(`✅ ${r.title} (${r.id})`);
    console.log(`   ANTES: ${original.slice(0, 100)}...`);
    console.log(`   DEPOIS: ${cleanedText.slice(0, 100)}...`);
    console.log();
    updates.push([r.id, cleanedText]);
    cleaned++;
  }
}

if (updates.length > 0) {
  updateMany(updates);
  console.log(`\n${updates.length} sinopses atualizadas!`);
} else {
  console.log("Nenhuma sinopse precisou de alteração.");
}

db.close();
