import { AniListAdapter } from "../src/lib/ingest/adapters/anilist";

async function main() {
  const a = new AniListAdapter();

  console.log("\n=== TESTE 1: listNovels (página 1, top 20 light novels) ===\n");
  const t0 = Date.now();
  const page = await a.listNovels({ limit: 20 });
  console.log(`Tempo: ${Date.now() - t0}ms`);
  console.log(`Itens: ${page.items.length}`);
  console.log(`Total: ${page.total}`);
  console.log(`Next: ${page.nextCursor}`);

  for (const m of page.items.slice(0, 8)) {
    console.log(`\n  [${m.externalId}] ${m.title}`);
    console.log(`    Type: ${m.type} | Status: ${m.status}`);
    console.log(`    Score: ${m.score?.toFixed(1) ?? "?"}`);
    console.log(`    Chapters: ${m.chapterCount ?? "?"} | Volumes: ${m.volumeCount ?? "?"}`);
    console.log(`    Tags: ${m.tags?.slice(0, 4).join(", ") || "(none)"}`);
    console.log(`    Cover: ${m.coverUrl ? "yes" : "no"}`);
    console.log(`    Author: ${m.author ?? "?"}`);
    console.log(`    URL: ${m.sourceUrl}`);
  }

  let p = 0, f = 0;
  const c = (l: string, ok: boolean, d?: string) => { if (ok) { p++; console.log(`  ✓ ${l}`); } else { f++; console.log(`  ✗ ${l}${d ? ` — ${d}` : ""}`); } };
  console.log("\n=== VALIDAÇÕES ===");
  c("20 itens", page.items.length === 20, `recebido: ${page.items.length}`);
  c("todos externalId numéricos", page.items.every((m) => /^\d+$/.test(m.externalId)));
  c("todos com title", page.items.every((m) => m.title.length > 0));
  c("todos com URL anilist.co", page.items.every((m) => m.sourceUrl.includes("anilist.co")));
  c("todos type=light-novel", page.items.every((m) => m.type === "light-novel"));
  c("tem próxima página", page.nextCursor !== null);

  console.log(`\nPassou: ${p} | Falhou: ${f}`);
  process.exit(f === 0 ? 0 : 1);
}

main().catch((e) => { console.error("ERRO FATAL:", e); process.exit(1); });
