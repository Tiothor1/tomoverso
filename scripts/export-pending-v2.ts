import { listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";
import { writeFileSync } from "fs";
import Database from "better-sqlite3";

(async () => {
  // Pegar 50 páginas do catálogo pra ter a lista completa
  const list = await listCatalogMangas(50);
  const c = new Database("data/tomoverso.db");
  const imported = new Set(
    (c.prepare("SELECT source_id FROM mangas WHERE source = ?").all("mangaonline.blue") as Array<{ source_id: string }>).map(
      (r) => r.source_id
    )
  );
  const pending = list.filter((m) => !imported.has(m.slug));
  console.log(`Catálogo total: ${list.length} | Já importados: ${imported.size} | Pendentes: ${pending.length}`);
  writeFileSync("D:/manga-pending-v2.txt", pending.map((m) => m.slug).join("\n"));
  console.log("Lista salva em D:/manga-pending-v2.txt");
  process.exit(0);
})();