import { getDb } from "../src/lib/db";
import { importManga } from "../src/lib/manga/adapters/mangaonline";

const TARGETS = [
  "solo-leveling","sss-class-revival-hunter","tensei-shitara-slime-datta-ken-manga",
  "the-academys-genius-swordsman","kaijuu-8-gou-kaiju-no-8-manga-pt-br",
  "the-novels-extra","king-of-the-insects-rei-dos-insetos",
  "levei-um-fora-e-despertei-como-um-guerreiro-divino",
  "the-regressed-mercenarys-machinations","lookism","nano-machine-manhwa",
  "o-cavaleiro-prodigio-com-tempo-limitado",
];

async function main() {
  const db = getDb();
  let totalPages = 0;

  for (const slug of TARGETS) {
    const info = db.prepare(
      `SELECT title, (SELECT COUNT(*) FROM manga_chapters WHERE manga_id=m.id AND page_count=0) AS zero FROM mangas m WHERE slug=?`
    ).get(slug) as any;

    if (!info) { console.log(`${slug}: nao encontrado`); continue; }
    if (info.zero === 0) { console.log(`${slug}: 0 pendentes, pulando`); continue; }

    console.log(`\n== ${info.title} (${slug}) — ${info.zero} caps pendentes ==`);
    try {
      const r = await importManga(slug, {
        skipExistingPages: true,
        onProgress: (s: string) => {
          if (s.includes("adicionadas") || s.includes("erro")) console.log("  " + s);
        },
      });
      totalPages += r.pagesAdded;
      console.log(`  → ${r.pagesAdded} paginas`);
    } catch (e: any) {
      console.log(`  ERRO: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log(`\n✅ Total: ${totalPages} paginas adicionadas`);
}

main().catch((e) => { console.error(e); process.exit(1); });
