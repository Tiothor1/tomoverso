import { listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";
import { writeFileSync } from "fs";

listCatalogMangas(20)
  .then((list) => {
    console.log(`Catálogo total: ${list.length}`);
    const lines = list.map((m) => m.slug).join("\n");
    writeFileSync("D:/tmp-manga-list.txt", lines);
    console.log(`Lista salva em D:/tmp-manga-list.txt (${list.length} slugs)`);
    process.exit(0);
  })
  .catch((e) => {
    console.error("ERRO:", e);
    process.exit(1);
  });