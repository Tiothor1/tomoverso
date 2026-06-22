/**
 * Smoke test do adapter JIKAN.
 *
 * Valida:
 * 1) Conexão com JIKAN API
 * 2) Parsing correto dos campos
 * 3) listNovels() retorna LNs + novels
 *
 * Rodar com: npx tsx scripts/test-jikan.ts
 */

import { JikanAdapter } from "../src/lib/ingest/adapters/jikan";

async function main() {
  const adapter = new JikanAdapter({ mangaType: "both" });

  console.log("\n=== TESTE 1: listNovels (página 1, top 25 lightnovels + 25 novels = ~50 itens) ===\n");
  const t0 = Date.now();
  const page = await adapter.listNovels({ limit: 50 });
  console.log(`Tempo: ${Date.now() - t0}ms`);
  console.log(`Itens recebidos: ${page.items.length}`);
  console.log(`Próxima página: ${page.nextCursor}`);

  console.log("\nPrimeiros 10:");
  for (const ln of page.items.slice(0, 10)) {
    console.log(`\n  [${ln.externalId}] ${ln.title}`);
    console.log(`    Tipo: ${ln.type}`);
    console.log(`    Score: ${ln.score ?? "?"}`);
    console.log(`    Status: ${ln.status}`);
    console.log(`    Chapters: ${ln.chapterCount ?? "?"} | Volumes: ${ln.volumeCount ?? "?"}`);
    console.log(`    Genres: ${ln.genres?.join(", ") || "(none)"}`);
    console.log(`    Tags: ${ln.tags?.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`    Cover: ${ln.coverUrl ? "yes" : "no"}`);
    console.log(`    Author: ${ln.author ?? "?"}`);
    console.log(`    URL: ${ln.sourceUrl}`);
    if (ln.alternativeTitles && ln.alternativeTitles.length > 0) {
      console.log(`    Alt: ${ln.alternativeTitles.slice(0, 2).join(", ")}`);
    }
  }

  // Validações
  console.log("\n=== VALIDAÇÕES ===");
  let passed = 0, failed = 0;
  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) { passed++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`); }
    else { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
  };

  check("~50 itens recebidos", page.items.length >= 40 && page.items.length <= 60, `recebido: ${page.items.length}`);
  check("todos externalId numéricos", page.items.every((ln) => /^\d+$/.test(ln.externalId)));
  check("todos com title não-vazio", page.items.every((ln) => ln.title.length > 0));
  check("todos com URL MAL", page.items.every((ln) => ln.sourceUrl.includes("myanimelist.net")));
  check("todos com type light-novel ou web-novel", page.items.every((ln) => ln.type === "light-novel" || ln.type === "web-novel"));
  check("mix de light-novel e web-novel", page.items.some((ln) => ln.type === "light-novel") && page.items.some((ln) => ln.type === "web-novel"));
  check("tem próxima página", page.nextCursor !== null);

  // Test 2: getNovel com Sword Art Online (mal_id=2)
  console.log("\n=== TESTE 2: getNovel('2') (Sword Art Online) ===\n");
  const sao = await adapter.getNovel("2");
  if (sao) {
    console.log(`  Título: ${sao.title}`);
    console.log(`  Tipo: ${sao.type}`);
    console.log(`  Score: ${sao.score}`);
    console.log(`  Chapters: ${sao.chapterCount} | Volumes: ${sao.volumeCount}`);
    console.log(`  Genres: ${sao.genres?.join(", ")}`);
    console.log(`  Author: ${sao.author}`);
    console.log(`  Synopsis (primeiros 200 chars):`);
    console.log(`    ${sao.synopsis?.slice(0, 200)}...`);
    check("SAO encontrado", sao.title.toLowerCase().includes("sword art"));
    check("SAO é light-novel", sao.type === "light-novel");
    check("SAO tem score > 7", (sao.score ?? 0) > 7);
    check("SAO tem author", !!sao.author);
  } else {
    check("SAO encontrado", false, "retornou null");
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  Passou: ${passed}`);
  console.log(`  Falhou: ${failed}`);
  console.log(failed === 0 ? "\n  ✅ JIKAN adapter funciona!\n" : "\n  ❌ Falhas no adapter\n");

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
