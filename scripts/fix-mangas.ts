/**
 * Corrige mangás problemáticos em batch silencioso.
 *
 * 1) Remove capítulos vazios (0 pages)
 * 2) Re-importa os 3 mangás sem capítulos
 * 3) Re-importa caps vazios nos 4 mangás afetados
 * 4) Adiciona +50 caps nos mangás com <=3 caps
 */

import Database from "better-sqlite3";
import { importManga } from "../src/lib/manga/adapters/mangaonline";

const c = new Database("data/tomoverso.db");

// PASSO 1: Deletar caps vazios
console.log("=== PASSO 1: Removendo capítulos vazios ===");
const emptyChapters = c.prepare(`
  SELECT mc.id, mc.chapter_number, m.slug FROM manga_chapters mc
  JOIN mangas m ON m.id = mc.manga_id
  LEFT JOIN manga_pages mp ON mp.chapter_id = mc.id
  WHERE mp.id IS NULL
`).all() as Array<{id: string; chapter_number: number; slug: string}>;
console.log(`  ${emptyChapters.length} caps vazios encontrados`);
for (const ch of emptyChapters) {
  c.prepare("DELETE FROM manga_pages WHERE chapter_id = ?").run(ch.id);
  c.prepare("DELETE FROM manga_chapters WHERE id = ?").run(ch.id);
  if (emptyChapters.length <= 20) { console.log(`  → removido cap ${ch.chapter_number} de ${ch.slug}`); }
}
console.log("  OK\n");

// PASSO 2: Re-importar os 3 mangás sem capítulos + corrigir os problemáticos
const FIX_LIST = [
  // Sem caps
  "anime-dan-da-dan",
  "im-a-mom",
  "rezero-kara-hajimeru-isekai-seikatsu",
  // Poucos caps
  "the-guy-she-was-interested-in-wasnt-a-guy-at-all",
  "han-dong-woo",
];

async function main() {
  console.log("=== PASSO 2: Re-importando mangás problemáticos ===");
  for (const slug of FIX_LIST) {
    const t0 = Date.now();
    try {
      const r = await importManga(slug, {
        maxChapters: 30,
        onProgress: () => {}, // silencioso
      });
      console.log(`  ✓ ${slug} | +${r.chaptersAdded} caps, +${r.pagesAdded} pages, ${r.errors.length} erros | ${((Date.now()-t0)/1000).toFixed(1)}s`);
    } catch(e: any) {
      console.log(`  ✗ ${slug} | ${e.message.slice(0,80)}`);
    }
  }

  // PASSO 3: Re-importar caps vazios nos 4 mangás afetados
  console.log("\n=== PASSO 3: Re-importando caps vazios ===");
  const EMPTY_MANGAS = [
    "demonio-da-lanca-incomparavel",
    "i-obtained-a-mythic-item",
    "infinite-level-up-in-murim",
    "the-beginning-after-the-end-novel",
  ];
  for (const slug of EMPTY_MANGAS) {
    const t0 = Date.now();
    try {
      // Pega onde parou (qual chapter_number foi o último não-vazio)
      const lastGood = c.prepare(`
        SELECT COALESCE(MAX(mc.chapter_number), 0) as n FROM manga_chapters mc
        JOIN mangas m ON m.id = mc.manga_id
        WHERE m.slug = ? AND mc.page_count > 0
      `).get(slug) as {n: number};
      const startFrom = lastGood.n + 1;
      console.log(`  → ${slug}: último cap bom é ${lastGood.n}, continuando de ${startFrom}`);
      const r = await importManga(slug, {
        startFromChapter: startFrom,
        skipExistingPages: true,
        onProgress: () => {},
      });
      console.log(`  ✓ ${slug} | +${r.chaptersAdded} caps, +${r.pagesAdded} pages`);
    } catch(e: any) {
      console.log(`  ✗ ${slug} | ${e.message.slice(0,80)}`);
    }
  }

  console.log("\n=== FIM ===");
  process.exit(0);
}

main().catch(console.error);
