/**
 * Importador CLI — centralnovel.com (BR Light Novels)
 *
 * Site: https://centralnovel.com — novelas em PT-BR (não mangá)
 * Capítulos são texto, vão pra tabela novels/chapters.
 *
 * Uso:
 *   npx tsx scripts/import-centralnovel.ts <slug>                          # 1 novel
 *   npx tsx scripts/import-centralnovel.ts <slug> --max-chapters=5        # só 5 caps
 *   npx tsx scripts/import-centralnovel.ts --catalog --max=10              # top 10 do catálogo
 *   cat slugs.txt | npx tsx scripts/import-centralnovel.ts                 # stdin
 */

import { readFileSync } from "fs";
import { importNovel, listCatalogNovels } from "../src/lib/manga/adapters/centralnovel";

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => resolve(data));
    setTimeout(() => resolve(data), 100);
  });
}

function ts() {
  return new Date().toLocaleTimeString("pt-BR");
}

async function main() {
  const argv = process.argv.slice(2);
  let slug: string | null = null;
  let maxChapters: number | null = null;
  let catalog = false;
  let maxPages = 1;
  let maxFromCatalog: number | null = null;
  let filePath: string | null = null;

  for (const a of argv) {
    if (a.startsWith("--max-chapters=")) maxChapters = parseInt(a.split("=")[1], 10);
    else if (a === "--catalog") catalog = true;
    else if (a.startsWith("--max-pages=")) maxPages = parseInt(a.split("=")[1], 10);
    else if (a.startsWith("--max=")) maxFromCatalog = parseInt(a.split("=")[1], 10);
    else if (!a.startsWith("--")) {
      // Primeiro arg sem -- é slug OU arquivo. Se termina em .txt, é arquivo.
      if (a.endsWith(".txt") || a.includes("/") || a.includes("\\")) {
        filePath = a;
      } else {
        slug = a;
      }
    }
  }

  console.log(`\n[${ts()}] === Importador centralnovel.com ===`);
  console.log(`Args: catalog=${catalog} slug=${slug} maxChapters=${maxChapters}\n`);

  const targets: string[] = [];
  if (catalog) {
    console.log(`[${ts()}] Listando catálogo (max ${maxPages} páginas)...`);
    const list = await listCatalogNovels(maxPages);
    const take = maxFromCatalog ?? list.length;
    console.log(`[${ts()}] Encontradas ${list.length} novels (importando ${Math.min(take, list.length)}):`);
    for (const n of list.slice(0, take)) {
      console.log(`  - ${n.slug} — ${n.title}`);
      targets.push(n.slug);
    }
    console.log();
  } else if (slug) {
    targets.push(slug);
  } else if (filePath) {
    const data = readFileSync(filePath, "utf8");
    targets.push(
      ...data
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"))
    );
  } else if (!process.stdin.isTTY) {
    const data = await readStdin();
    targets.push(
      ...data
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("#"))
    );
  } else {
    console.error("ERRO: informe slug OU --catalog OU arquivo via stdin");
    process.exit(1);
  }

  let total = { novels: 0, chapters: 0, errors: 0 };
  for (const sl of targets) {
    console.log(`[${ts()}] → ${sl}`);
    try {
      const r = await importNovel(sl, {
        maxChapters,
        onProgress: (m) => console.log(`   ${m}`),
      });
      total.novels++;
      total.chapters += r.chaptersAdded;
      total.errors += r.errors.length;
      console.log(`[${ts()}] ✓ ${sl} — ${r.isNew ? "novo" : "atualizado"} | +${r.chaptersAdded} caps\n`);
    } catch (e: any) {
      console.error(`[${ts()}] ✗ ${sl} — ${e.message}\n`);
      total.errors++;
    }
  }

  console.log(`\n[${ts()}] === RESUMO ===`);
  console.log(`  Novels processadas: ${total.novels}`);
  console.log(`  Capítulos adicionados: ${total.chapters}`);
  console.log(`  Erros: ${total.errors}`);
  process.exit(total.errors > 0 ? 2 : 0);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});