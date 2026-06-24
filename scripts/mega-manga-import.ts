import { writeFileSync } from "fs";
import { join } from "path";
import { getDb } from "../src/lib/db";
import { listCatalogMangas, importManga } from "../src/lib/manga/adapters/mangaonline";

const argv = process.argv.slice(2);
const maxPages = parseInt(argv.find((a) => a.startsWith("--pages="))?.split("=")[1] || "20", 10);
const maxChaptersArg = argv.find((a) => a.startsWith("--max-chapters="));
const maxChapters = maxChaptersArg ? parseInt(maxChaptersArg.split("=")[1], 10) : null;
const resume = argv.includes("--resume");

function ts() { return new Date().toLocaleTimeString("pt-BR"); }

async function main() {
  const db = getDb();
  const existing = new Set(
    (db.prepare("SELECT source_id FROM mangas WHERE source='mangaonline.blue'").all() as any[])
      .map((r) => r.source_id)
  );
  console.log(`[${ts()}] Mangas ja no DB: ${existing.size}`);

  console.log(`[${ts()}] Raspando catalogo (${maxPages} paginas)...`);
  const catalog = await listCatalogMangas(maxPages);
  console.log(`[${ts()}] Catalogo: ${catalog.length} mangas`);

  const slugs = catalog.map((m) => m.slug);
  const slugsToImport = resume ? slugs.filter((s) => !existing.has(s)) : slugs;
  const skipped = slugs.length - slugsToImport.length;

  console.log(`[${ts()}] Ja importados: ${skipped} | Pendentes: ${slugsToImport.length}`);

  if (slugsToImport.length === 0) {
    console.log("Nada a fazer.");
    process.exit(0);
  }

  writeFileSync(join(process.cwd(), "data", "pending-slugs.txt"), slugsToImport.join("\n"), "utf8");
  console.log(`[${ts()}] Lista salva em data/pending-slugs.txt`);

  let totalMangas = 0;
  let totalChapters = 0;
  let totalPages = 0;
  let totalErrors = 0;
  const t0 = Date.now();

  for (let i = 0; i < slugsToImport.length; i++) {
    const slug = slugsToImport[i];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`\n[${ts()}] [${i + 1}/${slugsToImport.length}] (+${elapsed}s) -> ${slug}`);

    try {
      const result = await importManga(slug, {
        maxChapters,
        startFromChapter: 1,
        onProgress: (msg) => console.log("   " + msg),
      });
      totalMangas++;
      totalChapters += result.chaptersAdded;
      totalPages += result.pagesAdded;
      totalErrors += result.errors.length;
      const kind = result.isNew ? "NOVO" : "ATUALIZADO";
      console.log(`[${ts()}] OK ${kind} +${result.chaptersAdded} caps +${result.pagesAdded} pags ${result.errors.length} erros`);
    } catch (e) {
      console.error(`[${ts()}] ERRO: ${e.message || e}`);
      totalErrors++;
    }

    if ((i + 1) % 5 === 0) {
      const elapsedTotal = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`\n[CHECKPOINT ${i + 1}/${slugsToImport.length}] +${totalMangas} mangas +${totalChapters} caps +${totalPages} pags ${totalErrors} erros (${elapsedTotal}s)\n`);
    }
  }

  const finalMangas = (db.prepare("SELECT COUNT(*) AS c FROM mangas").get()).c;
  const finalChapters = (db.prepare("SELECT COUNT(*) AS c FROM manga_chapters").get()).c;
  const finalPages = (db.prepare("SELECT COUNT(*) AS c FROM manga_pages").get()).c;
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  console.log("\n" + "=".repeat(60));
  console.log("RESUMO FINAL");
  console.log("=".repeat(60));
  console.log("  Mangas adicionados:   " + totalMangas);
  console.log("  Capitulos:            " + totalChapters);
  console.log("  Paginas:              " + totalPages);
  console.log("  Erros:                " + totalErrors);
  console.log("  Tempo:                " + elapsed + "s");
  console.log("");
  console.log("  TOTAL NO BANCO AGORA:");
  console.log("  Mangas:               " + finalMangas);
  console.log("  Capitulos de manga:   " + finalChapters);
  console.log("  Paginas de manga:     " + finalPages);
  console.log("=".repeat(60));

  process.exit(totalErrors > 50 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
