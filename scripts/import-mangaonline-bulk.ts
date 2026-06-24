/**
 * Bulk import mangaonline.blue com checkpoint.
 *
 * Lê uma lista de slugs de stdin (1 por linha) OU de um arquivo passado como arg.
 * Pra cada mangá:
 *   - Verifica se já existe no DB (pula metadados, só checa páginas)
 *   - Importa capas faltantes + todos os capítulos
 *   - Em caso de falha, marca e continua
 *
 * Uso:
 *   cat slugs.txt | npx tsx scripts/import-mangaonline-bulk.ts
 *   npx tsx scripts/import-mangaonline-bulk.ts slugs.txt
 *   npx tsx scripts/import-mangaonline-bulk.ts slugs.txt --max-chapters=10
 *   npx tsx scripts/import-mangaonline-bulk.ts slugs.txt --start-from=5
 */

import { readFileSync } from "fs";
import { importManga } from "../src/lib/manga/adapters/mangaonline";

function ts() {
  return new Date().toLocaleTimeString("pt-BR");
}

async function readStdin(): Promise<string> {
  // Read all of stdin synchronously
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 100);
  });
}

async function main() {
  const argv = process.argv.slice(2);
  let slugs: string[] = [];
  let maxChapters: number | null = null;
  let startFrom = 1;

  // Parse args
  let filePath: string | null = null;
  for (const a of argv) {
    if (a.startsWith("--max-chapters=")) maxChapters = parseInt(a.split("=")[1], 10);
    else if (a.startsWith("--start-from=")) startFrom = parseFloat(a.split("=")[1]);
    else if (!a.startsWith("--")) filePath = a;
  }

  if (filePath) {
    const content = readFileSync(filePath, "utf8");
    slugs = content
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"));
    console.log(`[${ts()}] Lidos ${slugs.length} slugs de ${filePath}`);
  } else if (!process.stdin.isTTY) {
    const data = await readStdin();
    slugs = data
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("#"));
    console.log(`[${ts()}] Lidos ${slugs.length} slugs do stdin`);
  } else {
    console.error("ERRO: informe arquivo com slugs OU pipe via stdin");
    process.exit(1);
  }

  if (slugs.length === 0) {
    console.log("Nenhum slug pra processar.");
    process.exit(0);
  }

  console.log(
    `[${ts()}] Processando ${slugs.length} mangás | max-chapters=${
      maxChapters ?? "todos"
    } | start-from=${startFrom}\n`
  );

  let total = { mangas: 0, chapters: 0, pages: 0, errors: 0, skipped: 0 };
  const t0 = Date.now();

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`[${ts()}] [${i + 1}/${slugs.length}] (+${elapsed}s) → ${slug}`);

    try {
      const r = await importManga(slug, {
        maxChapters,
        startFromChapter: startFrom,
        onProgress: (msg) => console.log(`   ${msg}`),
      });
      total.mangas++;
      total.chapters += r.chaptersAdded;
      total.pages += r.pagesAdded;
      total.errors += r.errors.length;
      console.log(
        `[${ts()}] ✓ ${slug} — ${r.isNew ? "novo" : "atualizado"} | +${r.chaptersAdded} caps, +${r.pagesAdded} pages, ${r.errors.length} erros`
      );
    } catch (e: any) {
      console.error(`[${ts()}] ✗ ${slug} — ERRO FATAL: ${e.message}`);
      total.errors++;
    }

    // Checkpoint a cada 5 mangás
    if ((i + 1) % 5 === 0) {
      console.log(
        `\n[CHECKPOINT ${i + 1}/${slugs.length}] mangas=${total.mangas} caps=${total.chapters} pages=${total.pages} erros=${total.errors}\n`
      );
    }
  }

  console.log(`\n[${ts()}] === RESUMO FINAL ===`);
  console.log(`  Mangás processados: ${total.mangas}`);
  console.log(`  Capítulos adicionados: ${total.chapters}`);
  console.log(`  Páginas adicionadas: ${total.pages}`);
  console.log(`  Erros: ${total.errors}`);
  console.log(`  Tempo total: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  process.exit(total.errors > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});