import { listCatalogNovels, importNovel } from "../src/lib/manga/adapters/centralnovel";
import { writeFileSync } from "fs";

(async () => {
  console.log("Listando centralnovel catalog (10 páginas)...");
  const list = await listCatalogNovels(10);
  console.log(`Total encontrados: ${list.length}`);
  console.log("Primeiros 10:");
  for (const n of list.slice(0, 10)) console.log(`  ${n.slug.padEnd(50)} — ${n.title}`);
  writeFileSync("D:/centralnovel-pending.txt", list.map((n) => n.slug).join("\n"));
  console.log(`Lista salva em D:/centralnovel-pending.txt`);
  process.exit(0);
})();