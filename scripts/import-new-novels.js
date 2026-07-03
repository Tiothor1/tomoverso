/**
 * Importa novas novels do centralnovel.com em lote.
 * Uso: node scripts/import-new-novels.js
 */
const { listCatalogNovels, importNovel } = require("../src/lib/manga/adapters/centralnovel");
const path = require("path");
const fs = require("fs");

async function main() {
  console.log("=== Buscando catálogo centralnovel... ===\n");
  const catalog = await listCatalogNovels(10);
  console.log(`Total no catálogo: ${catalog.length}\n`);

  // Load existing slugs from DB
  const Database = require("better-sqlite3");
  const db = new Database(path.join(process.cwd(), "data", "tomoverso.db"));
  const existing = db.prepare("SELECT source_id FROM novels WHERE source='centralnovel'").all().map(r => r.source_id);
  db.close();

  const newOnes = catalog.filter(n => !existing.includes(n.slug));
  console.log(`Já importados: ${existing.length}`);
  console.log(`Novos para importar: ${newOnes.length}\n`);

  if (newOnes.length === 0) {
    console.log("Nenhuma novel nova encontrada.");
    return;
  }

  newOnes.forEach((n, i) => console.log(`  ${i+1}. ${n.slug} — ${n.title}`));
  console.log();

  let imported = 0;
  let errors = 0;

  for (const novel of newOnes) {
    const idx = imported + errors + 1;
    console.log(`[${idx}/${newOnes.length}] ${novel.slug}...`);
    try {
      const result = await importNovel(novel.slug, { maxChapters: null });
      console.log(`  → "${result.title}" — ${result.chaptersAdded} capítulos, ${result.pagesAdded} páginas`);
      imported++;
    } catch (e) {
      console.log(`  → ERRO: ${e.message}`);
      errors++;
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Finalizado! ${imported} importados, ${errors} erros ===`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
