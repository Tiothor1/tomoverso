import { getDb } from "../src/lib/db";
import { importManga } from "../src/lib/manga/adapters/mangaonline";

async function main() {
  const db = getDb();
  
  // Mangas with page_count=0 (just reset)
  const mangas = db.prepare(`
    SELECT m.slug, m.title,
      (SELECT COUNT(*) FROM manga_chapters WHERE manga_id=m.id) AS ch
    FROM mangas m
    WHERE (SELECT SUM(page_count) FROM manga_chapters WHERE manga_id=m.id) = 0
      AND (SELECT COUNT(*) FROM manga_chapters WHERE manga_id=m.id) > 0
    ORDER BY m.title
  `).all() as {slug:string;title:string;ch:number}[];

  console.log(`\n📋 Re-importando ${mangas.length} mangás resetados...`);

  let totalPages = 0;
  let done = 0;

  for (const m of mangas) {
    done++;
    try {
      console.log(`[${done}/${mangas.length}] ${m.title} (${m.ch} caps)`);
      const r = await importManga(m.slug, {
        skipExistingPages: true,
        onProgress: (s: string) => {
          if (s.includes("adicionadas") || s.includes("erro"))
            console.log("  " + s);
        },
      });
      totalPages += r.pagesAdded;
      console.log(`  → ${r.pagesAdded} páginas`);
    } catch (e: any) {
      console.log(`  ❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n✅ Total: ${totalPages} páginas adicionadas em ${mangas.length} mangás`);
}

main().catch(e => { console.error(e); process.exit(1); });
