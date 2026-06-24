import { listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";

console.log("Listando catálogo mangaonline.blue...\n");
listCatalogMangas(3)
  .then((list) => {
    console.log(`Total encontrado: ${list.length}`);
    for (const m of list) {
      console.log(`  ${m.slug.padEnd(60)} — ${m.title}`);
    }
    process.exit(0);
  })
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  });