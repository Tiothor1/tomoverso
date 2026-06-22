/**
 * Smoke test do adapter VNDB.
 *
 * Valida:
 * 1) Conexão com a API VNDB
 * 2) Parsing correto dos campos principais
 * 3) listNovels() com limit pequeno (5 VNs)
 * 4) getNovel() por ID específico
 *
 * Rodar com: npx tsx scripts/test-vndb.ts
 *
 * ATENÇÃO: Este script NÃO grava no banco. Apenas verifica parsing.
 */

import { VndbAdapter } from "../src/lib/ingest/adapters/vndb";

async function main() {
  const adapter = new VndbAdapter();

  console.log("\n=== TESTE 1: listNovels (top 5) ===\n");
  const page1 = await adapter.listNovels({ limit: 5 });

  console.log(`Recebidos: ${page1.items.length} itens`);
  console.log(`Total conhecido: ${page1.total}`);
  console.log(`Próxima página: ${page1.nextCursor ?? "(null)"}`);

  console.log("\nPrimeiras 5 VNs:");
  for (const vn of page1.items) {
    console.log(`\n  [${vn.externalId}] ${vn.title}`);
    console.log(`    Score: ${vn.score ?? "?"}`);
    console.log(`    Status: ${vn.status}`);
    console.log(`    Released: ${vn.releasedAt ?? "?"}`);
    console.log(`    Genres: ${vn.genres?.join(", ") || "(none)"}`);
    console.log(`    Tags: ${vn.tags?.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`    Cover: ${vn.coverUrl ? "yes" : "no"}`);
    console.log(`    Synopsis length: ${vn.synopsis?.length ?? 0} chars`);
    console.log(`    URL: ${vn.sourceUrl}`);
    if (vn.alternativeTitles && vn.alternativeTitles.length > 0) {
      console.log(`    Alt titles: ${vn.alternativeTitles.slice(0, 2).join(", ")}`);
    }
  }

  // Validações
  console.log("\n=== VALIDAÇÕES ===");
  let passed = 0, failed = 0;
  const check = (label: string, ok: boolean, detail?: string) => {
    if (ok) { passed++; console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`); }
    else { failed++; console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
  };

  check("5 VNs recebidas", page1.items.length === 5, `recebido: ${page1.items.length}`);
  check("todas têm externalId", page1.items.every((vn) => vn.externalId.startsWith("v")));
  check("todas têm title não-vazio", page1.items.every((vn) => vn.title.length > 0));
  check("todas têm sourceUrl VNDB", page1.items.every((vn) => vn.sourceUrl.includes("vndb.org")));
  check("todas têm type='visual-novel'", page1.items.every((vn) => vn.type === "visual-novel"));
  check("score > 0 (vn populares)", page1.items.every((vn) => (vn.score ?? 0) > 5));
  check("tem próxima página", page1.nextCursor !== null);

  // Test 2: getNovel
  console.log("\n=== TESTE 2: getNovel('v17') (Fate/stay night) ===\n");
  const fate = await adapter.getNovel("v17");
  if (fate) {
    console.log(`  Título: ${fate.title}`);
    console.log(`  Score: ${fate.score}`);
    console.log(`  Released: ${fate.releasedAt}`);
    console.log(`  Genres: ${fate.genres?.join(", ")}`);
    console.log(`  Author: ${fate.author}`);
    console.log(`  Synopsis (primeiros 200 chars):`);
    console.log(`    ${fate.synopsis?.slice(0, 200)}...`);
    check("Fate/stay night encontrada", fate.title.toLowerCase().includes("fate"));
    check("Score razoável", (fate.score ?? 0) > 7);
    check("Tem synopsis", (fate.synopsis?.length ?? 0) > 100);
  } else {
    check("Fate/stay night encontrada", false, "retornou null");
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  Passou: ${passed}`);
  console.log(`  Falhou: ${failed}`);
  console.log(failed === 0 ? "\n  ✅ VNDB adapter funciona!\n" : "\n  ❌ Falhas no adapter\n");

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("ERRO FATAL:", e);
  process.exit(1);
});
