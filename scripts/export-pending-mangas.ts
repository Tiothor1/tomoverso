import Database from "better-sqlite3";
import { listCatalogMangas } from "../src/lib/manga/adapters/mangaonline";
import { writeFileSync } from "fs";

(async () => {
  const list = await listCatalogMangas(20);
  const c = new Database("data/tomoverso.db");
  const imported = new Set(
    (c.prepare("SELECT source_id FROM mangas WHERE source = ?").all("mangaonline.blue") as Array<{ source_id: string }>).map(
      (r) => r.source_id
    )
  );
  console.log(`Catálogo: ${list.length} | Já importados: ${imported.size}`);

  const pending = list.filter((m) => !imported.has(m.slug));
  console.log(`Pendentes: ${pending.length}`);

  const lines = pending.map((m) => m.slug).join("\n");
  writeFileSync("D:/manga-pending.txt", lines);
  console.log("Lista salva em D:/manga-pending.txt");
  process.exit(0);
})();