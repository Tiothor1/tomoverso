/**
 * Importador CLI — mangaonline.blue
 *
 * Uso:
 *   npx tsx scripts/import-mangaonline.ts <slug>                        # importa 1 mangá
 *   npx tsx scripts/import-mangaonline.ts <slug> --max-chapters=5      # só primeiros 5 caps
 *   npx tsx scripts/import-mangaonline.ts <slug> --start-from=10       # a partir do cap 10
 *   npx tsx scripts/import-mangaonline.ts --catalog --max-pages=3     # importa N páginas do catálogo
 *   npx tsx scripts/import-mangaonline.ts --catalog --max=10           # importa top 10 do catálogo
 *
 * Exit codes: 0 sucesso / 1 erro fatal / 2 partial success
 */

import { importManga, listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";

interface Args {
  slug: string | null;
  maxChapters: number | null;
  startFrom: number;
  catalog: boolean;
  maxPages: number;
  maxFromCatalog: number | null;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const args: Args = {
    slug: null,
    maxChapters: null,
    startFrom: 1,
    catalog: false,
    maxPages: 1,
    maxFromCatalog: null,
  };
  for (const a of argv) {
    if (a.startsWith("--max-chapters=")) args.maxChapters = parseInt(a.split("=")[1], 10);
    else if (a.startsWith("--start-from=")) args.startFrom = parseFloat(a.split("=")[1]);
    else if (a === "--catalog") args.catalog = true;
    else if (a.startsWith("--max-pages=")) args.maxPages = parseInt(a.split("=")[1], 10);
    else if (a.startsWith("--max=")) args.maxFromCatalog = parseInt(a.split("=")[1], 10);
    else if (!a.startsWith("--")) args.slug = a;
  }
  return args;
}

function ts() {
  return new Date().toLocaleTimeString("pt-BR");
}

async function main() {
  const args = parseArgs();

  console.log(`\n[${ts()}] === Importador mangaonline.blue ===`);
  console.log(`Args: ${JSON.stringify(args)}\n`);

  const targets: string[] = [];
  if (args.catalog) {
    console.log(`[${ts()}] Listando catálogo (max ${args.maxPages} páginas)...`);
    const list = await listCatalogMangas(args.maxPages);
    console.log(`[${ts()}] Encontrados ${list.length} mangás no catálogo:`);
    for (const m of list.slice(0, args.maxFromCatalog ?? list.length)) {
      console.log(`  - ${m.slug} — ${m.title}`);
      targets.push(m.slug);
    }
    console.log();
  } else if (args.slug) {
    targets.push(args.slug);
  } else {
    console.error("ERRO: informe <slug> OU --catalog");
    process.exit(1);
  }

  let totalMangas = 0;
  let totalChapters = 0;
  let totalPages = 0;
  let totalErrors = 0;

  for (const slug of targets) {
    console.log(`[${ts()}] → Importando: ${slug}`);
    try {
      const result = await importManga(slug, {
        maxChapters: args.maxChapters,
        startFromChapter: args.startFrom,
        onProgress: (m) => console.log(`  ${m}`),
      });
      totalMangas++;
      totalChapters += result.chaptersAdded;
      totalPages += result.pagesAdded;
      totalErrors += result.errors.length;

      console.log(
        `\n[${ts()}] ✓ ${slug} — ${result.isNew ? "novo" : "atualizado"} | +${result.chaptersAdded} caps, +${result.pagesAdded} pages, ${result.errors.length} erros\n`
      );
    } catch (e: any) {
      console.error(`[${ts()}] ✗ ${slug} — ERRO FATAL: ${e.message}\n`);
      totalErrors++;
    }
  }

  console.log(`\n[${ts()}] === RESUMO ===`);
  console.log(`  Mangás processados: ${totalMangas}`);
  console.log(`  Capítulos adicionados: ${totalChapters}`);
  console.log(`  Páginas adicionadas: ${totalPages}`);
  console.log(`  Erros: ${totalErrors}`);
  console.log();

  process.exit(totalErrors > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});