import { MangaDexAdapter } from "../src/lib/ingest/adapters/mangadex";

async function main() {
  const a = new MangaDexAdapter();
  const t0 = Date.now();
  const page = await a.listNovels({ limit: 5 });
  console.log(`\nTempo: ${Date.now() - t0}ms`);
  console.log(`Itens: ${page.items.length} | Total estimado: ${page.total}`);
  console.log(`Next cursor: ${page.nextCursor}`);

  for (const m of page.items) {
    console.log(`\n[${m.externalId}] ${m.title}`);
    console.log(`  Type: ${m.type} | Status: ${m.status}`);
    console.log(`  Author: ${m.author ?? "?"}`);
    console.log(`  Genres: ${m.genres?.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`  Tags: ${m.tags?.slice(0, 3).join(", ") || "(none)"}`);
    console.log(`  Cover: ${m.coverUrl ? "yes" : "no"}`);
    console.log(`  Synop: ${m.synopsis?.slice(0, 120)}...`);
  }

  // Validações
  console.log("\n=== VALIDAÇÕES ===");
  let p = 0, f = 0;
  const c = (l: string, ok: boolean, d?: string) => { if (ok) { p++; console.log(`  ✓ ${l}${d ? ` — ${d}` : ""}`); } else { f++; console.log(`  ✗ ${l}${d ? ` — ${d}` : ""}`); } };
  c("5 itens", page.items.length === 5);
  c("todos externalId UUID-like", page.items.every((m) => /^[a-f0-9-]{36}$/.test(m.externalId)));
  c("todos com title", page.items.every((m) => m.title.length > 0));
  c("todos com URL mangadex.org", page.items.every((m) => m.sourceUrl.includes("mangadex.org")));
  c("tem next cursor", page.nextCursor !== null);

  console.log(`\nPassou: ${p} | Falhou: ${f}`);
  process.exit(f === 0 ? 0 : 1);
}

main().catch((e) => { console.error("ERRO:", e); process.exit(1); });
